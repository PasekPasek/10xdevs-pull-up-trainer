import type { APIRoute } from "astro";
import { z } from "zod";

import { buildErrorResponse, createHttpError } from "../../../lib/utils/httpError";
import { getSession } from "../../../lib/services/sessions/getSession";
import { deleteSession } from "../../../lib/services/sessions/deleteSession";
import { updateSession } from "../../../lib/services/sessions/updateSession";
import { mapSessionRowToDetailDTO } from "../../../lib/services/sessions/mappers";
import { updateSessionSchema } from "../../../lib/validation/sessions/updateSession.schema";

export const prerender = false;

const paramsSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
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

    // Validate params
    const paramsResult = paramsSchema.safeParse(context.params);

    if (!paramsResult.success) {
      throw createHttpError({
        status: 400,
        code: "INVALID_PARAMS",
        message: "Invalid session ID",
        details: { requestId, issues: paramsResult.error },
      });
    }

    const { sessionId } = paramsResult.data;

    // Fetch session
    const session = await getSession({ supabase }, userResult.user.id, sessionId);

    // Map to detail DTO
    const sessionDto = mapSessionRowToDetailDTO(session);

    const headers = new Headers({
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });

    if (sessionDto.updatedAt) {
      headers.set("ETag", `"${sessionDto.updatedAt}"`);
    }

    const body = JSON.stringify({
      data: { session: sessionDto },
      meta: { requestId },
    });

    return new Response(body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return buildErrorResponse(error, { requestId });
  }
};

export const PATCH: APIRoute = async (context) => {
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

    // Validate params
    const paramsResult = paramsSchema.safeParse(context.params);

    if (!paramsResult.success) {
      throw createHttpError({
        status: 400,
        code: "INVALID_PARAMS",
        message: "Invalid session ID",
        details: { requestId, issues: paramsResult.error },
      });
    }

    const { sessionId } = paramsResult.data;

    // Check If-Match header for optimistic locking
    const ifMatch = context.request.headers.get("if-match");
    if (!ifMatch) {
      throw createHttpError({
        status: 428,
        code: "PRECONDITION_REQUIRED",
        message: "If-Match header is required for session updates",
        details: { requestId },
      });
    }

    const lastUpdatedAt = ifMatch.replace(/^"|"$/g, ""); // Remove quotes

    // Parse request body
    let requestBody;
    try {
      requestBody = await context.request.json();
    } catch {
      throw createHttpError({
        status: 400,
        code: "INVALID_JSON",
        message: "Request body must be valid JSON",
        details: { requestId },
      });
    }

    // Validate body
    const bodyResult = updateSessionSchema.safeParse(requestBody);

    if (!bodyResult.success) {
      throw createHttpError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid request body",
        details: { requestId, issues: bodyResult.error },
      });
    }

    // Build command
    const command = {
      sessionDate: bodyResult.data.sessionDate,
      sets: bodyResult.data.sets,
      notes: bodyResult.data.notes,
      aiComment: bodyResult.data.aiComment,
      markAsModified: bodyResult.data.markAsModified,
    };

    // Update session
    const updatedSession = await updateSession({ supabase }, userResult.user.id, sessionId, command, lastUpdatedAt);

    // Map to DTO
    const sessionDto = mapSessionRowToDetailDTO(updatedSession);

    const headers = new Headers({
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });

    if (sessionDto.updatedAt) {
      headers.set("ETag", `"${sessionDto.updatedAt}"`);
    }

    const body = JSON.stringify({
      data: { session: sessionDto },
      meta: { requestId },
    });

    return new Response(body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return buildErrorResponse(error, { requestId });
  }
};

export const DELETE: APIRoute = async (context) => {
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

    // Validate params
    const paramsResult = paramsSchema.safeParse(context.params);

    if (!paramsResult.success) {
      throw createHttpError({
        status: 400,
        code: "INVALID_PARAMS",
        message: "Invalid session ID",
        details: { requestId, issues: paramsResult.error },
      });
    }

    const { sessionId } = paramsResult.data;

    // Delete session
    await deleteSession({ supabase }, userResult.user.id, sessionId);

    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    return buildErrorResponse(error, { requestId });
  }
};
