import type { APIRoute } from "astro";
import { z } from "zod";

import { buildErrorResponse, createHttpError } from "../../../../lib/utils/httpError";
import { completeSession } from "../../../../lib/services/sessions/completeSession";
import { mapSessionRowToDTO } from "../../../../lib/services/sessions/mappers";

export const prerender = false;

const paramsSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
});

const bodySchema = z.object({
  sets: z.array(z.number().int().min(1).max(60).nullable()).length(5).optional(),
  rpe: z.number().int().min(1).max(10).optional(),
});

export const POST: APIRoute = async (context) => {
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

    const authHeader = context.request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;

    if (!token) {
      throw createHttpError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
        details: { requestId },
      });
    }

    const { data: userResult, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userResult?.user) {
      throw createHttpError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
        details: { requestId },
        cause: userError,
      });
    }

    const paramsResult = paramsSchema.safeParse(context.params);

    if (!paramsResult.success) {
      throw createHttpError({
        status: 400,
        code: "INVALID_PARAMS",
        message: "Invalid session ID",
        details: { requestId, issues: paramsResult.error },
      });
    }

    const rawBody = await context.request.json().catch(() => ({}));
    const bodyResult = bodySchema.safeParse(rawBody);

    if (!bodyResult.success) {
      throw createHttpError({
        status: 400,
        code: "INVALID_PAYLOAD",
        message: "Payload validation failed",
        details: { requestId, issues: bodyResult.error },
      });
    }

    const { sessionId } = paramsResult.data;

    const session = await completeSession({ supabase }, userResult.user.id, sessionId, bodyResult.data);

    const sessionDto = mapSessionRowToDTO(session);

    const body = JSON.stringify({
      data: { session: sessionDto },
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
