import type { APIRoute } from "astro";
import { z } from "zod";

import { buildErrorResponse, createHttpError } from "../../../lib/utils/httpError";
import { validateSession } from "../../../lib/services/sessions/validateSession";
import type { SessionStatus } from "../../../types";

export const prerender = false;

const querySchema = z.object({
  sessionDate: z.string().datetime({ message: "sessionDate must be a valid ISO 8601 datetime" }),
  status: z
    .string()
    .refine((val): val is SessionStatus => ["planned", "in_progress", "completed", "failed"].includes(val), {
      message: "status must be a valid session status",
    }),
  ignoreRestWarning: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

export const GET: APIRoute = async (context) => {
  const requestId = crypto.randomUUID();

  try {
    const supabase = context.locals.supabase;

    if (!supabase) {
      throw createHttpError({
        status: 500,
        code: "SUPABASE_CLIENT_MISSING",
        message: "Supabase client is not available in the request context",
        details: { requestId },
      });
    }

    const user = context.locals.user;

    if (!user) {
      throw createHttpError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
        details: { requestId },
      });
    }

    // Parse query params
    const url = new URL(context.request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const queryResult = querySchema.safeParse(queryParams);

    if (!queryResult.success) {
      throw createHttpError({
        status: 400,
        code: "INVALID_QUERY",
        message: "Invalid query parameters",
        details: { requestId, issues: queryResult.error },
      });
    }

    const { sessionDate, status, ignoreRestWarning } = queryResult.data;

    // Validate session
    const result = await validateSession({ supabase }, user.id, sessionDate, status, ignoreRestWarning);

    const body = JSON.stringify({
      data: result,
      meta: { requestId },
    });

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return buildErrorResponse(error, { requestId });
  }
};
