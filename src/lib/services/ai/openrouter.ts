import type { AiStructuredResponseExisting, AiStructuredResponseNew, HistoricalSessionDTO } from "../../../types";

export type { AiStructuredResponseExisting };

type FetchImpl = typeof fetch;

export interface JsonSchema<TPayload = Record<string, unknown>> {
  readonly type: "json_schema";
  readonly json_schema: {
    readonly name: string;
    readonly strict: true;
    readonly schema: TPayload;
  };
}

export interface ModelParams {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface AiGenerationNewUserResult extends AiStructuredResponseNew {
  sessionDate: string;
}

export type OpenRouterErrorCode =
  | "PROVIDER_AUTH_FAILED"
  | "AI_TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_BAD_REQUEST"
  | "AI_INVALID_OUTPUT"
  | "RATE_LIMITED"
  | "AI_NETWORK_ERROR"
  | "SCHEMA_VIOLATION";

export class OpenRouterError extends Error {
  readonly code: OpenRouterErrorCode;

  readonly status: number;

  readonly meta: Record<string, unknown>;

  constructor(code: OpenRouterErrorCode, message: string, status: number, meta: Record<string, unknown> = {}) {
    super(message);
    this.name = "OpenRouterError";
    this.code = code;
    this.status = status;
    this.meta = meta;
  }
}

export interface CallArgs {
  model?: string;
  messages: { role: "system" | "user"; content: string }[];
  responseSchema: JsonSchema;
  params?: ModelParams;
  timeoutMs?: number;
}

export interface OpenRouterServiceDependencies {
  apiKey: string;
  fetchImpl?: FetchImpl;
  baseUrl?: string;
  defaultModel?: string;
  defaultParams?: ModelParams;
  logger?: {
    debug?: (message: string, meta?: Record<string, unknown>) => void;
    info?: (message: string, meta?: Record<string, unknown>) => void;
    warn?: (message: string, meta?: Record<string, unknown>) => void;
    error?: (message: string, meta?: Record<string, unknown>) => void;
  };
  now?: () => Date;
  clockToleranceMs?: number;
  referer?: string;
  title?: string;
}

interface OpenRouterChatMessageContentPart {
  type: string;
  text?: string;
  json?: unknown;
  data?: unknown;
}

interface OpenRouterChatMessage {
  role: string;
  content?: string | OpenRouterChatMessageContentPart[];
}

interface OpenRouterChatChoice {
  index: number;
  message?: OpenRouterChatMessage;
  finish_reason?: string | null;
}

interface OpenRouterChatCompletionResponse {
  id?: string;
  choices?: OpenRouterChatChoice[];
  usage?: Record<string, unknown>;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_COMMENT_LENGTH = 400;
const MIN_COMMENT_LENGTH = 10;
const SETS_REQUIRED = 5;
const MIN_REPS = 1;
const MAX_REPS = 60;

export class OpenRouterService {
  readonly fetchImpl: FetchImpl;

  readonly apiKey: string;

  readonly baseUrl: string;

  readonly defaultModel: string;

  readonly defaultParams: ModelParams;

  readonly logger?: OpenRouterServiceDependencies["logger"];

  readonly now: () => Date;

  readonly clockToleranceMs: number;

  readonly referer: string;

  readonly title: string;

  readonly schemas = {
    newUser: {
      type: "json_schema",
      json_schema: {
        name: "pullup_session_new_v1",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["sets", "comment"],
          properties: {
            sets: {
              type: "array",
              items: { type: "integer", minimum: MIN_REPS, maximum: MAX_REPS },
              minItems: SETS_REQUIRED,
              maxItems: SETS_REQUIRED,
            },
            comment: { type: "string", minLength: MIN_COMMENT_LENGTH, maxLength: MAX_COMMENT_LENGTH },
          },
        },
      },
    } as const satisfies JsonSchema,
    existingUser: {
      type: "json_schema",
      json_schema: {
        name: "pullup_session_existing_v1",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["sets", "sessionDate", "comment"],
          properties: {
            sets: {
              type: "array",
              items: { type: "integer", minimum: MIN_REPS, maximum: MAX_REPS },
              minItems: SETS_REQUIRED,
              maxItems: SETS_REQUIRED,
            },
            sessionDate: { type: "string", format: "date-time" },
            comment: { type: "string", minLength: MIN_COMMENT_LENGTH, maxLength: MAX_COMMENT_LENGTH },
          },
        },
      },
    } as const satisfies JsonSchema,
  };

  constructor(options: OpenRouterServiceDependencies) {
    if (!options.apiKey) {
      throw new Error("OpenRouterService requires apiKey");
    }

    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://openrouter.ai/api/v1";
    this.defaultModel = options.defaultModel ?? "gpt-4o-mini";
    this.defaultParams = options.defaultParams ?? { temperature: 0.7, top_p: 1, max_tokens: 300 };
    this.logger = options.logger;
    this.now = options.now ?? (() => new Date());
    this.clockToleranceMs = options.clockToleranceMs ?? 250;
    this.referer = options.referer ?? "https://10xdevs-pull-up-trainer.app";
    this.title = options.title ?? "10xDevs Pull-Up Trainer";
  }

  buildSystemPromptNewUser(maxPullups: number): string {
    const sanitized = this._sanitizeMaxPullups(maxPullups);

    return [
      "Jesteś trenerem generującym plan podciągnięć.",
      "Zwracasz wyłącznie JSON zgodny ze schematem.",
      "Zaplanuj 5 serii (1–60) oraz krótki komentarz (2–3 zdania, 40–60 słów).",
      "Nie zwracaj daty. Data sesji zostanie ustawiona przez system na dzisiaj (UTC ISO).",
      "Użyj następujących przykładów jako punktu odniesienia (dopasuj wolumen do przedziału maksymalnych powtórzeń; nie kopiuj 1:1):",
      "- 21–25 max: [12, 16, 12, 12, 15] = 67 total reps",
      "- 26–30 max: [16, 18, 15, 15, 17] = 81 total reps",
      `Maksymalny wynik referencyjny użytkownika to ${sanitized}. Dostosuj intensywność odpowiednio do poziomu.`,
    ].join("\n");
  }

  buildSystemPromptExistingUser(todayIso: string): string {
    return [
      "Jesteś trenerem analizującym historię (max 10 sesji).",
      "Zwracasz wyłącznie JSON zgodny ze schematem.",
      "Zaproponuj 5 serii (1–60), datę następnej sesji oraz komentarz.",
      `Data nie może być wcześniejsza niż ${todayIso}. Unikaj przeszłości względem dnia dzisiejszego.`,
    ].join("\n");
  }

  buildUserMessageNewUser(maxPullups: number): string {
    const sanitized = this._sanitizeMaxPullups(maxPullups);
    return `Maksymalna liczba podciągnięć użytkownika: ${sanitized}. Zaproponuj odpowiedni wolumen rozłożony na 5 serii.`;
  }

  buildUserMessageExistingUser(sessions: HistoricalSessionDTO[], todayIso?: string): string {
    const effectiveToday = todayIso ?? this._todayIso();
    const lines: string[] = ["Ostatnie sesje (ISO UTC):"];

    sessions.slice(0, 10).forEach((session) => {
      const safeDate = this._sanitizeIso(session.sessionDate);
      const normalizedSets = this._normalizeSets(session.sets).sets;
      const status = session.status;
      const totalReps = session.totalReps ?? normalizedSets.reduce((sum, value) => sum + value, 0);
      const rpePart = session.rpe != null ? `, rpe=${session.rpe}` : "";
      lines.push(`${safeDate}: [${normalizedSets.join(",")}], total=${totalReps}, status=${status}${rpePart}`);
    });

    lines.push(`Dzisiejsza data: ${effectiveToday}. Zaproponuj następny trening nie wcześniej niż dzisiaj.`);

    return lines.join("\n");
  }

  async generateForNewUser(input: {
    maxPullups: number;
    model?: string;
    params?: ModelParams;
    timeoutMs?: number;
  }): Promise<AiGenerationNewUserResult> {
    const systemMessage = this.buildSystemPromptNewUser(input.maxPullups);
    const userMessage = this.buildUserMessageNewUser(input.maxPullups);

    const response = await this.callOpenRouter<AiStructuredResponseNew>({
      model: input.model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      responseSchema: this.schemas.newUser,
      params: input.params,
      timeoutMs: input.timeoutMs,
    });

    const normalized = this._validateAndNormalizeNew(response);

    return {
      sets: normalized.sets,
      comment: normalized.comment,
      sessionDate: this._todayIso(),
    };
  }

  async generateForExistingUser(input: {
    sessions: HistoricalSessionDTO[];
    todayIso?: string;
    model?: string;
    params?: ModelParams;
    timeoutMs?: number;
  }): Promise<AiStructuredResponseExisting> {
    if (!Array.isArray(input.sessions) || input.sessions.length === 0) {
      throw new OpenRouterError(
        "PROVIDER_BAD_REQUEST",
        "Historical sessions are required to generate plan for existing user",
        400,
        { reason: "EMPTY_HISTORY" }
      );
    }

    const todayIso = input.todayIso ?? this._todayIso();
    const sanitizedToday = this._sanitizeIso(todayIso);

    const limitedSessions = [...input.sessions].filter((session) => Boolean(session)).slice(0, 10);

    const systemMessage = this.buildSystemPromptExistingUser(sanitizedToday);
    const userMessage = this.buildUserMessageExistingUser(limitedSessions, sanitizedToday);

    const response = await this.callOpenRouter<AiStructuredResponseExisting>({
      model: input.model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      responseSchema: this.schemas.existingUser,
      params: input.params,
      timeoutMs: input.timeoutMs,
    });

    return this._validateAndNormalizeExisting(response, sanitizedToday);
  }

  async callOpenRouter<TResponse>(args: CallArgs): Promise<TResponse> {
    const mergedParams = { ...this.defaultParams, ...(args.params ?? {}) };
    const body: Record<string, unknown> = {
      model: args.model ?? this.defaultModel,
      messages: args.messages,
      response_format: args.responseSchema,
    };

    for (const [key, value] of Object.entries(mergedParams)) {
      if (value !== undefined) {
        body[key] = value;
      }
    }

    const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const startTime = Date.now();

    try {
      const rawResponse = await this._request<OpenRouterChatCompletionResponse>("/chat/completions", body, timeoutMs);

      const parsed = this._extractStructuredContent<TResponse>(rawResponse);
      this._logDebug("callOpenRouter.success", {
        durationMs: Date.now() - startTime,
        model: body.model,
        usage: rawResponse.usage,
      });
      return parsed;
    } catch (error) {
      if (error instanceof OpenRouterError) {
        this._logError("callOpenRouter.error", {
          code: error.code,
          status: error.status,
          durationMs: Date.now() - startTime,
          meta: error.meta,
        });
        throw error;
      }

      this._logError("callOpenRouter.unexpected", { error });
      throw new OpenRouterError("AI_NETWORK_ERROR", "Unexpected error while calling OpenRouter", 500, {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async _request<TResponse>(endpoint: string, body: unknown, timeoutMs: number): Promise<TResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs + this.clockToleranceMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: this._headers(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this._handleHttpError(response);
      }

      const json = (await response.json()) as TResponse;
      return json;
    } catch (error) {
      if (error instanceof OpenRouterError) {
        throw error;
      }

      if ((error as Error)?.name === "AbortError") {
        throw new OpenRouterError("AI_TIMEOUT", "OpenRouter request timed out", 408);
      }

      throw new OpenRouterError("AI_NETWORK_ERROR", "Failed to reach OpenRouter", 502, {
        cause: error instanceof Error ? error.message : String(error),
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async _handleHttpError(response: Response): Promise<never> {
    const status = response.status;
    let payload: unknown;

    try {
      payload = await response.json();
    } catch (error) {
      payload = { parseError: error instanceof Error ? error.message : String(error) };
    }

    if (status === 401 || status === 403) {
      throw new OpenRouterError("PROVIDER_AUTH_FAILED", "OpenRouter authentication failed", 502, {
        status,
        payload,
      });
    }

    if (status === 408) {
      throw new OpenRouterError("AI_TIMEOUT", "OpenRouter timed out", 408, { payload });
    }

    if (status === 429) {
      throw new OpenRouterError("RATE_LIMITED", "OpenRouter rate limit reached", 429, { payload });
    }

    if (status >= 500) {
      throw new OpenRouterError("PROVIDER_UNAVAILABLE", "OpenRouter is unavailable", 502, {
        status,
        payload,
      });
    }

    throw new OpenRouterError("PROVIDER_BAD_REQUEST", "OpenRouter rejected the request", 400, {
      status,
      payload,
    });
  }

  private _extractStructuredContent<TResponse>(raw: OpenRouterChatCompletionResponse): TResponse {
    if (!raw || !Array.isArray(raw.choices) || raw.choices.length === 0) {
      throw new OpenRouterError("AI_INVALID_OUTPUT", "No choices returned from OpenRouter", 502, { raw });
    }

    const message = raw.choices[0]?.message;

    if (!message) {
      throw new OpenRouterError("AI_INVALID_OUTPUT", "Missing assistant message in OpenRouter response", 502, { raw });
    }

    const content = message.content;

    if (typeof content === "string") {
      return this._parseJsonContent<TResponse>(content);
    }

    if (!Array.isArray(content)) {
      throw new OpenRouterError("AI_INVALID_OUTPUT", "Unsupported message content format", 502, { content });
    }

    for (const part of content) {
      if (part?.type === "json" && part.json !== undefined) {
        return part.json as TResponse;
      }

      if (part?.type === "output_json" && part.data !== undefined) {
        return part.data as TResponse;
      }

      if (part?.type === "text" && part.text) {
        try {
          return this._parseJsonContent<TResponse>(part.text);
        } catch (error) {
          this._logWarn("extractStructuredContent.parseFallbackFailed", { error });
        }
      }
    }

    throw new OpenRouterError("AI_INVALID_OUTPUT", "Unable to extract JSON payload from OpenRouter response", 502, {
      content,
    });
  }

  private _parseJsonContent<TResponse>(input: string): TResponse {
    try {
      return JSON.parse(input) as TResponse;
    } catch (error) {
      throw new OpenRouterError("AI_INVALID_OUTPUT", "Failed to parse JSON from OpenRouter response", 502, {
        input,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private _validateAndNormalizeNew(response: AiStructuredResponseNew): AiStructuredResponseNew {
    const { sets, adjustments } = this._normalizeSets(response.sets);

    if (adjustments) {
      this._logWarn("validateNew.setsAdjusted", { adjustments });
    }

    const comment = this._normalizeComment(response.comment);

    return {
      sets,
      comment,
    };
  }

  private _validateAndNormalizeExisting(
    response: AiStructuredResponseExisting,
    todayIso: string
  ): AiStructuredResponseExisting {
    const base = this._validateAndNormalizeNew(response);
    const sessionDate = this._sanitizeIso(response.sessionDate);

    if (sessionDate < todayIso) {
      throw new OpenRouterError("AI_INVALID_OUTPUT", "AI proposed session date in the past", 502, {
        sessionDate,
        todayIso,
      });
    }

    return {
      ...base,
      sessionDate,
    };
  }

  private _normalizeSets(values: unknown): {
    sets: [number, number, number, number, number];
    adjustments?: Record<string, unknown>;
  } {
    if (!Array.isArray(values)) {
      throw new OpenRouterError("SCHEMA_VIOLATION", "Sets must be an array", 502, { values });
    }

    if (values.length !== SETS_REQUIRED) {
      throw new OpenRouterError("SCHEMA_VIOLATION", `Sets must contain exactly ${SETS_REQUIRED} entries`, 502, {
        values,
      });
    }

    const adjustments: Record<string, unknown> = {};
    const normalized = values.map((value, index) => {
      const numeric = Number(value);

      if (!Number.isFinite(numeric)) {
        throw new OpenRouterError("SCHEMA_VIOLATION", "Set value must be a number", 502, {
          index,
          value,
        });
      }

      const rounded = Math.round(numeric);
      const clipped = Math.min(MAX_REPS, Math.max(MIN_REPS, rounded));

      if (clipped !== rounded) {
        adjustments[`set_${index + 1}`] = { original: numeric, adjusted: clipped };
      }

      return clipped;
    }) as [number, number, number, number, number];

    return {
      sets: normalized,
      adjustments: Object.keys(adjustments).length > 0 ? adjustments : undefined,
    };
  }

  private _normalizeComment(value: unknown): string {
    if (typeof value !== "string") {
      throw new OpenRouterError("SCHEMA_VIOLATION", "Comment must be a string", 502, { value });
    }

    const trimmed = value.trim();

    if (trimmed.length < MIN_COMMENT_LENGTH) {
      throw new OpenRouterError("SCHEMA_VIOLATION", "Comment is too short", 502, { length: trimmed.length });
    }

    if (trimmed.length <= MAX_COMMENT_LENGTH) {
      return trimmed;
    }

    this._logWarn("normalizeComment.truncated", { originalLength: trimmed.length });
    return trimmed.slice(0, MAX_COMMENT_LENGTH);
  }

  private _sanitizeIso(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      this._logWarn("sanitizeIso.invalid", { value });
      return this._todayIso();
    }
    return date.toISOString();
  }

  private _sanitizeMaxPullups(value: number): number {
    if (!Number.isFinite(value)) {
      return MIN_REPS;
    }

    const rounded = Math.round(value);
    return Math.min(MAX_REPS, Math.max(MIN_REPS, rounded));
  }

  private _todayIso(): string {
    const now = this.now();
    if (!(now instanceof Date)) {
      return new Date().toISOString();
    }

    return now.toISOString();
  }

  private _headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": this.referer,
      "X-Title": this.title,
    };
  }

  private _logDebug(message: string, meta?: Record<string, unknown>): void {
    this.logger?.debug?.(message, meta);
  }

  private _logWarn(message: string, meta?: Record<string, unknown>): void {
    this.logger?.warn?.(message, meta);
  }

  private _logError(message: string, meta?: Record<string, unknown>): void {
    this.logger?.error?.(message, meta);
  }
}

export function mapOpenRouterErrorToHttpStatus(error: OpenRouterError): number {
  switch (error.code) {
    case "AI_TIMEOUT":
      return 408;
    case "RATE_LIMITED":
      return 429;
    case "PROVIDER_BAD_REQUEST":
      return 400;
    case "PROVIDER_AUTH_FAILED":
    case "PROVIDER_UNAVAILABLE":
    case "AI_INVALID_OUTPUT":
    case "SCHEMA_VIOLATION":
      return 502;
    case "AI_NETWORK_ERROR":
    default:
      return 500;
  }
}

export function createOpenRouterService(
  overrides: Partial<Omit<OpenRouterServiceDependencies, "apiKey">> = {}
): OpenRouterService {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  return new OpenRouterService({
    apiKey,
    ...overrides,
  });
}
