import type { APIRoute } from "astro";
import { z } from "zod";

import { buildErrorResponse, createHttpError } from "../../../../lib/utils/httpError";
import { generateAiSession } from "../../../../lib/services/ai/generateSession";
import { getQuota } from "../../../../lib/services/ai/getQuota";
import { mapSessionRowToDTO } from "../../../../lib/services/sessions/mappers";

export const prerender = false;

const generateAiSessionSchema = z.object({
  startNow: z.boolean().optional().default(false),
  maxPullups: z.number().int().min(1).max(60),
  model: z.string().min(1).default("gpt-4o-mini"),
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
    const bodyResult = generateAiSessionSchema.safeParse(requestBody);

    if (!bodyResult.success) {
      throw createHttpError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid request body",
        details: { requestId, issues: bodyResult.error },
      });
    }

    const { startNow, maxPullups, model } = bodyResult.data;

    // Generate AI session (with MOCK LLM)
    const { session, generation } = await generateAiSession(
      { supabase },
      userResult.user.id,
      maxPullups,
      model,
      startNow
    );

    // Get updated quota
    const quota = await getQuota({ supabase }, userResult.user.id);

    // Map to DTOs
    const sessionDto = mapSessionRowToDTO(session);

    const generationDto = {
      id: generation.id,
      model: generation.model,
      durationMs: generation.duration_ms,
      status: generation.status,
    };

    const body = JSON.stringify({
      data: {
        session: sessionDto,
        generation: generationDto,
      },
      meta: {
        requestId,
        quota,
      },
    });

    return new Response(body, {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return buildErrorResponse(error, { requestId });
  }
};
