import type { APIRoute } from "astro";
import { z } from "zod";

import { buildErrorResponse, createHttpError } from "../../../../../lib/utils/httpError";
import { generateAiSession } from "../../../../../lib/services/ai/generateSession";
import { getQuota } from "../../../../../lib/services/ai/getQuota";
import { mapSessionRowToDTO } from "../../../../../lib/services/sessions/mappers";

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
      .eq("user_id", userResult.user.id)
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

    // Check if generation already succeeded
    if (generation.status === "success") {
      throw createHttpError({
        status: 409,
        code: "GENERATION_ALREADY_SUCCEEDED",
        message: "Generation already succeeded. Cannot retry.",
        details: { generationId },
      });
    }

    // Extract maxPullups from prompt_data
    const promptData = generation.prompt_data as Record<string, unknown> | null;
    const maxPullups = promptData?.maxPullups;

    if (typeof maxPullups !== "number") {
      throw createHttpError({
        status: 400,
        code: "INVALID_PROMPT_DATA",
        message: "Original generation missing maxPullups data",
        details: { generationId },
      });
    }

    // Retry generation (note: retries don't count against quota for failed attempts)
    const { session, generation: newGeneration } = await generateAiSession(
      { supabase },
      userResult.user.id,
      maxPullups,
      generation.model,
      false
    );

    // Get updated quota
    const quota = await getQuota({ supabase }, userResult.user.id);

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
