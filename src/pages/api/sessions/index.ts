import type { APIRoute } from "astro";

import type { CreateSessionInput } from "../../../lib/validation/sessions/createSession.schema";
import { mapSessionRowToDTO, mapWarnings } from "../../../lib/services/sessions/mappers";
import { createSession } from "../../../lib/services/sessions/createSession";
import { buildErrorResponse, createHttpError } from "../../../lib/utils/httpError";
import { createSessionSchema } from "../../../lib/validation/sessions/createSession.schema";

export const prerender = false;

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

    const rawBody = await context.request.json().catch(() => {
      throw createHttpError({
        status: 400,
        code: "INVALID_JSON",
        message: "Request body must be valid JSON",
        details: { requestId },
      });
    });

    let payload: CreateSessionInput;

    try {
      payload = createSessionSchema.parse(rawBody);
    } catch (parseError) {
      throw createHttpError({
        status: 400,
        code: "INVALID_PAYLOAD",
        message: "Payload validation failed",
        details: { requestId, issues: parseError },
        cause: parseError,
      });
    }

    const { session, warnings } = await createSession({ supabase }, userResult.user.id, payload);

    const sessionDto = mapSessionRowToDTO(session);
    const mappedWarnings = mapWarnings(warnings);

    const headers = new Headers({
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });

    if (sessionDto.updatedAt) {
      headers.set("ETag", sessionDto.updatedAt);
    }

    const body = JSON.stringify({
      data: { session: sessionDto },
      meta: {
        requestId,
        warnings: mappedWarnings,
      },
    });

    return new Response(body, {
      status: 201,
      headers,
    });
  } catch (error) {
    return buildErrorResponse(error, { requestId });
  }
};
