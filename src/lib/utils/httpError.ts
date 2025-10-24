interface HttpErrorOptions {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class HttpError extends Error {
  readonly status: number;

  readonly code: string;

  readonly details: Record<string, unknown>;

  constructor(options: HttpErrorOptions) {
    super(options.message);
    this.name = "HttpError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details ?? {};

    if (options.cause !== undefined) {
      // Node >= 16 supports the `cause` property; assign manually for compatibility.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).cause = options.cause;
    }
  }
}

export function createHttpError(options: HttpErrorOptions): HttpError {
  return new HttpError(options);
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

interface ErrorResponseMeta {
  requestId?: string;
}

interface NormalisedError {
  status: number;
  code: string;
  message: string;
  details: Record<string, unknown>;
}

function normaliseError(error: unknown): NormalisedError {
  if (isHttpError(error)) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  // Handle FeatureDisabledError (has status and message properties)
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    "message" in error &&
    typeof error.status === "number" &&
    typeof error.message === "string"
  ) {
    return {
      status: error.status,
      code: "name" in error && typeof error.name === "string" ? error.name.toUpperCase() : "FEATURE_DISABLED",
      message: error.message,
      details: "flag" in error ? { flag: error.flag } : {},
    };
  }

  return {
    status: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "Unexpected error occurred",
    details: {},
  };
}

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
} as const;

export function buildErrorResponse(error: unknown, meta: ErrorResponseMeta = {}): Response {
  const normalised = normaliseError(error);
  const details = { ...normalised.details };

  if (meta.requestId) {
    details.requestId = meta.requestId;
  }

  const body = JSON.stringify({
    error: {
      code: normalised.code,
      message: normalised.message,
      details,
    },
  });

  return new Response(body, {
    status: normalised.status,
    headers: DEFAULT_HEADERS,
  });
}

export async function createApiRequest<TData>(input: RequestInfo, init?: RequestInit): Promise<TData> {
  const response = await fetch(input, init);

  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw createHttpError({
        status: response.status,
        code: "HTTP_ERROR",
        message: response.statusText || "Request failed",
        details: { cause: error },
      });
    }

    if (typeof payload === "object" && payload !== null && "error" in payload) {
      const apiError = payload.error as { code?: string; message?: string; details?: Record<string, unknown> };
      throw createHttpError({
        status: response.status,
        code: apiError.code ?? "HTTP_ERROR",
        message: apiError.message ?? response.statusText ?? "Request failed",
        details: apiError.details ?? {},
      });
    }

    throw createHttpError({
      status: response.status,
      code: "HTTP_ERROR",
      message: response.statusText || "Request failed",
      details: { payload },
    });
  }

  // Handle 204 No Content - no body to parse
  if (response.status === 204) {
    return undefined as TData;
  }

  // Check if response has content
  const contentType = response.headers.get("content-type");
  const hasJsonContent = contentType?.includes("application/json");

  if (!hasJsonContent) {
    // If no JSON content, return empty response
    return undefined as TData;
  }

  try {
    return (await response.json()) as TData;
  } catch (error) {
    throw createHttpError({
      status: 500,
      code: "INVALID_RESPONSE",
      message: "Failed to parse server response",
      details: { cause: error },
    });
  }
}
