import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import type {
  GenerationInsert,
  GenerationRow,
  HistoricalSessionDTO,
  SessionInsert,
  SessionRow,
  SessionStatus,
} from "../../../types";
import { createHttpError } from "../../utils/httpError";
import { getQuota } from "./getQuota";
import { getOpenRouterService } from "./openrouterSingleton";
import type { AiGenerationNewUserResult, AiStructuredResponseExisting } from "./openrouter";
import { OpenRouterError, mapOpenRouterErrorToHttpStatus } from "./openrouter";

interface GenerateSessionDependencies {
  supabase: SupabaseClient<Database>;
}

export interface GenerateSessionResult {
  session: SessionRow;
  generation: GenerationRow;
}

/**
 * Generate AI session using OpenRouter LLM.
 * Enforces rate limits, creates session + generation records transactionally.
 */
export async function generateAiSession(
  dependencies: GenerateSessionDependencies,
  userId: string,
  maxPullups: number | undefined,
  model: string,
  startNow = false
): Promise<GenerateSessionResult> {
  const { supabase } = dependencies;

  const quota = await getQuota(dependencies, userId);

  if (quota.remaining === 0) {
    throw createHttpError({
      status: 403,
      code: "AI_LIMIT_REACHED",
      message: `AI session limit reached (${quota.limit}/${quota.limit}). Resets in ${Math.ceil(quota.nextWindowSeconds / 3600)} hours.`,
      details: {
        limit: quota.limit,
        resetsAt: quota.resetsAt,
        nextWindowSeconds: quota.nextWindowSeconds,
      },
    });
  }

  const startedAt = Date.now();
  const openRouter = getOpenRouterService();

  const recentSessions = await getRecentSessions(supabase, userId);
  const isNewUser = recentSessions.length === 0;
  const todayIso = new Date().toISOString();

  const promptMetadata = buildPromptMetadata({
    isNewUser,
    maxPullups,
    todayIso,
    sessions: recentSessions,
  });

  const openRouterSessions: HistoricalSessionDTO[] = recentSessions.map(({ id: _id, ...session }) => ({
    sessionDate: session.sessionDate,
    sets: session.sets,
    status: session.status,
    totalReps: session.totalReps,
    rpe: session.rpe,
  }));

  let llmResponse: AiGenerationNewUserResult | AiStructuredResponseExisting;
  const maxPullupsForNewUser = promptMetadata.mode === "new_user" ? promptMetadata.maxPullups : undefined;
  let loggingIssues: Record<string, unknown> | undefined;

  try {
    if (isNewUser) {
      if (maxPullupsForNewUser === undefined) {
        throw createHttpError({
          status: 400,
          code: "MAX_PULLUPS_REQUIRED",
          message: "Max pull-ups is required for new users",
          details: {},
        });
      }

      llmResponse = await openRouter.generateForNewUser({
        maxPullups: maxPullupsForNewUser,
        model,
      });
    } else {
      llmResponse = await openRouter.generateForExistingUser({
        sessions: openRouterSessions,
        todayIso,
        model,
      });
    }
  } catch (error) {
    const durationMs = computeDurationMs(startedAt);
    loggingIssues = await handleGenerationFailure({
      supabase,
      userId,
      model,
      durationMs,
      error,
      promptMetadata,
    });

    if (error instanceof OpenRouterError) {
      const details: Record<string, unknown> = { ...error.meta };
      if (loggingIssues) {
        details.logging = loggingIssues;
      }

      throw createHttpError({
        status: mapOpenRouterErrorToHttpStatus(error),
        code: error.code,
        message: error.message,
        details,
        cause: error,
      });
    }

    const details: Record<string, unknown> = {};
    if (loggingIssues) {
      details.logging = loggingIssues;
    }

    throw createHttpError({
      status: 502,
      code: "AI_NETWORK_ERROR",
      message: "Failed to contact AI provider",
      details,
      cause: error,
    });
  }

  const durationMs = computeDurationMs(startedAt);
  const normalized = normalizeResponse(llmResponse, isNewUser);

  return persistSessionAndGeneration({
    supabase,
    userId,
    model,
    startNow,
    durationMs,
    llm: normalized,
    promptMetadata,
  });
}

export async function fetchRecentSessionsForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<HistoricalSessionForPrompt[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, session_date, status, total_reps, rpe, set_1, set_2, set_3, set_4, set_5")
    .eq("user_id", userId)
    .in("status", ["completed", "failed"] satisfies SessionStatus[])
    .order("session_date", { ascending: false })
    .limit(10);

  if (error) {
    throw createHttpError({
      status: 500,
      code: "FETCH_HISTORY_FAILED",
      message: "Failed to fetch recent sessions for AI generation",
      details: { hint: error.message },
    });
  }

  return (data ?? []).map(
    (row) =>
      ({
        id: row.id,
        sessionDate: ensureIso(row.session_date),
        sets: sanitizeSessionSets(row),
        status: row.status,
        totalReps: deriveTotalReps(row),
        rpe: row.rpe ?? undefined,
      }) satisfies HistoricalSessionForPrompt
  );
}

async function getRecentSessions(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<HistoricalSessionForPrompt[]> {
  return fetchRecentSessionsForUser(supabase, userId);
}

type HistoricalSessionRow = Pick<
  SessionRow,
  "id" | "session_date" | "status" | "total_reps" | "rpe" | "set_1" | "set_2" | "set_3" | "set_4" | "set_5"
>;

interface HistoricalSessionForPrompt extends HistoricalSessionDTO {
  id: string;
}

interface PromptMetadataNewUser {
  mode: "new_user";
  maxPullups: number;
}

interface PromptMetadataExistingUser {
  mode: "existing_user";
  sessionIds: string[];
  todayIso: string;
}

type PromptMetadata = PromptMetadataNewUser | PromptMetadataExistingUser;

interface NormalizedGenerationResult {
  sets: [number, number, number, number, number];
  comment: string;
  sessionDate: string;
  responseData: Record<string, unknown>;
}

interface PersistSessionOptions {
  supabase: SupabaseClient<Database>;
  userId: string;
  model: string;
  startNow: boolean;
  durationMs: number;
  llm: NormalizedGenerationResult;
  promptMetadata: PromptMetadata;
}

interface HandleGenerationFailureOptions {
  supabase: SupabaseClient<Database>;
  userId: string;
  model: string;
  durationMs: number;
  error: unknown;
  promptMetadata: PromptMetadata;
}

function sanitizeSessionSets(row: HistoricalSessionRow): HistoricalSessionDTO["sets"] {
  const sets = [row.set_1, row.set_2, row.set_3, row.set_4, row.set_5].map(sanitizeHistoricalSetValue);
  return [sets[0], sets[1], sets[2], sets[3], sets[4]] as HistoricalSessionDTO["sets"];
}

function deriveTotalReps(row: HistoricalSessionRow): number {
  const sets = sanitizeSessionSets(row);
  const sum = sets.reduce((acc, value) => acc + value, 0);
  return row.total_reps ?? sum;
}

function sanitizeHistoricalSetValue(value: number | null): number {
  if (value == null) {
    return 0;
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  const rounded = Math.round(numeric);

  if (rounded < 0) {
    return 0;
  }

  if (rounded > 60) {
    return 60;
  }

  return rounded;
}

function buildPromptMetadata(args: {
  isNewUser: boolean;
  maxPullups: number | undefined;
  todayIso: string;
  sessions: HistoricalSessionForPrompt[];
}): PromptMetadata {
  if (args.isNewUser) {
    if (!Number.isFinite(args.maxPullups)) {
      throw createHttpError({
        status: 400,
        code: "MAX_PULLUPS_REQUIRED",
        message: "Max pull-ups is required for new users",
        details: {},
      });
    }

    return {
      mode: "new_user",
      maxPullups: Math.max(1, Math.min(60, Math.round(args.maxPullups!))),
    } satisfies PromptMetadataNewUser;
  }

  return {
    mode: "existing_user",
    sessionIds: args.sessions.map((session) => session.id),
    todayIso: args.todayIso,
  } satisfies PromptMetadataExistingUser;
}

function normalizeResponse(response: AiGenerationNewUserResult, isNewUser: boolean): NormalizedGenerationResult {
  const sets = response.sets.map((value) => clampRepValue(value)) as [number, number, number, number, number];

  const comment = response.comment.trim();
  const sessionDate = ensureIso("sessionDate" in response ? response.sessionDate : new Date().toISOString());

  const responseData = isNewUser ? { sets, comment } : { sets, comment, sessionDate };

  return {
    sets,
    comment,
    sessionDate,
    responseData,
  } satisfies NormalizedGenerationResult;
}

function clampRepValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  const rounded = Math.round(value);
  if (rounded < 1) {
    return 1;
  }

  if (rounded > 60) {
    return 60;
  }

  return rounded;
}

async function persistSessionAndGeneration(options: PersistSessionOptions): Promise<GenerateSessionResult> {
  const { supabase, userId, model, startNow, durationMs, llm, promptMetadata } = options;

  const status: SessionStatus = startNow ? "in_progress" : "planned";
  const totalReps = llm.sets.reduce((sum, value) => sum + value, 0);

  const sessionInsert: SessionInsert = {
    user_id: userId,
    status,
    session_date: llm.sessionDate,
    set_1: llm.sets[0],
    set_2: llm.sets[1],
    set_3: llm.sets[2],
    set_4: llm.sets[3],
    set_5: llm.sets[4],
    total_reps: totalReps,
    rpe: null,
    is_ai_generated: true,
    is_modified: false,
    ai_comment: llm.comment,
  };

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert(sessionInsert)
    .select()
    .single();

  if (sessionError || !session) {
    throw createHttpError({
      status: 500,
      code: "CREATE_SESSION_FAILED",
      message: "Failed to create AI-generated session",
      details: { hint: sessionError?.message },
    });
  }

  const generationInsert: GenerationInsert = {
    user_id: userId,
    model,
    status: "success",
    duration_ms: Math.round(durationMs),
    prompt_data: promptMetadata,
    response_data: llm.responseData,
    session_id: session.id,
  };

  const { data: generation, error: generationError } = await supabase
    .from("generations")
    .insert(generationInsert)
    .select()
    .single();

  if (generationError || !generation) {
    await supabase.from("sessions").delete().eq("id", session.id);

    throw createHttpError({
      status: 500,
      code: "CREATE_GENERATION_FAILED",
      message: "Failed to record AI generation",
      details: { hint: generationError?.message },
    });
  }

  await supabase.from("events").insert({
    user_id: userId,
    event_type: startNow ? "session_started" : "session_created",
    event_data: {
      session_id: session.id,
      is_ai_generated: true,
      generation_id: generation.id,
      session_status: session.status,
      scheduled_at: llm.sessionDate,
    },
  });

  return {
    session,
    generation,
  } satisfies GenerateSessionResult;
}

async function handleGenerationFailure(
  options: HandleGenerationFailureOptions
): Promise<Record<string, unknown> | undefined> {
  const { supabase, userId, model, durationMs, error, promptMetadata } = options;
  const isTimeout = error instanceof OpenRouterError && error.code === "AI_TIMEOUT";
  const status = isTimeout ? "timeout" : "error";
  const errorType = error instanceof OpenRouterError ? error.code : "AI_NETWORK_ERROR";
  const errorMessage = error instanceof Error ? error.message : "Unknown error";

  try {
    const failedGenerationInsert: GenerationInsert = {
      user_id: userId,
      model,
      status,
      duration_ms: Math.round(durationMs),
      prompt_data: promptMetadata,
      response_data: null,
      session_id: null,
    };

    const { data: generation, error: generationInsertError } = await supabase
      .from("generations")
      .insert(failedGenerationInsert)
      .select("id")
      .single();

    if (generationInsertError) {
      return { generationInsertError: generationInsertError.message };
    }

    const generationId = generation?.id ?? null;

    const { error: logError } = await supabase.from("generation_error_logs").insert({
      user_id: userId,
      generation_id: generationId,
      error_type: errorType,
      error_message: errorMessage,
      error_stack: error instanceof Error ? (error.stack ?? null) : null,
    });

    if (logError) {
      return { generationLogError: logError.message };
    }
  } catch (loggingError) {
    if (loggingError instanceof Error) {
      return { loggingFailure: loggingError.message };
    }

    return { loggingFailure: String(loggingError) };
  }

  return undefined;
}

function ensureIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function computeDurationMs(startedAt: number): number {
  const elapsed = Date.now() - startedAt;
  return elapsed < 0 ? 0 : elapsed;
}
