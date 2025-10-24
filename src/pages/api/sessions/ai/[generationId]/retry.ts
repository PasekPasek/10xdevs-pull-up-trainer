import type { APIRoute } from "astro";
import { z } from "zod";

import { buildErrorResponse, createHttpError } from "../../../../../lib/utils/httpError";
import { generateAiSession, fetchRecentSessionsForUser } from "../../../../../lib/services/ai/generateSession";
import { getQuota } from "../../../../../lib/services/ai/getQuota";
import { mapSessionRowToDTO } from "../../../../../lib/services/sessions/mappers";
import { requireFeature } from "../../../../../features";

export const prerender = false;

const paramsSchema = z.object({
  generationId: z.string().uuid("Invalid generation ID format"),
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

    const user = context.locals.user;

    if (!user) {
      throw createHttpError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
        details: { requestId },
      });
    }

    // Check feature flag
    requireFeature("ENABLE_GENERATING_AI_SESSIONS");

    // Validate params
    const paramsResult = paramsSchema.safeParse(context.params);

    if (!paramsResult.success) {
      throw createHttpError({
        status: 400,
        code: "INVALID_PARAMS",
        message: "Invalid generation ID",
        details: { requestId, issues: paramsResult.error },
      });
    }

    const { generationId } = paramsResult.data;

    // Fetch original generation
    const { data: generation, error: generationError } = await supabase
      .from("generations")
      .select("*")
      .eq("id", generationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (generationError) {
      throw createHttpError({
        status: 500,
        code: "FETCH_GENERATION_FAILED",
        message: "Failed to fetch generation",
        details: { hint: generationError.message },
      });
    }

    if (!generation) {
      throw createHttpError({
        status: 404,
        code: "GENERATION_NOT_FOUND",
        message: "Generation not found",
        details: { generationId },
      });
    }

    const recentSessions = await fetchRecentSessionsForUser(supabase, user.id);
    const isNewUser = recentSessions.length === 0;

    let maxPullups: number | undefined;

    if (isNewUser) {
      const promptData = generation.prompt_data as { maxPullups?: number } | null;
      maxPullups = promptData?.maxPullups;

      if (typeof maxPullups !== "number") {
        throw createHttpError({
          status: 400,
          code: "INVALID_PROMPT_DATA",
          message: "Original generation missing maxPullups data",
          details: { generationId },
        });
      }
    }

    // Get runtime environment variables from Cloudflare context
    const runtime = context.locals.runtime as { env?: Record<string, string> } | undefined;
    const apiKey = runtime?.env?.OPENROUTER_API_KEY;

    const { session, generation: newGeneration } = await generateAiSession(
      { supabase, apiKey },
      user.id,
      maxPullups,
      generation.model,
      false
    );

    // Get updated quota
    const quota = await getQuota({ supabase }, user.id);

    // Map to DTOs
    const sessionDto = mapSessionRowToDTO(session);

    const generationDto = {
      id: newGeneration.id,
      model: newGeneration.model,
      durationMs: newGeneration.duration_ms,
      status: newGeneration.status,
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
