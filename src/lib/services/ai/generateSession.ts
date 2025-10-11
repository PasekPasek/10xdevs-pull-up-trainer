import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import type { GenerationRow, SessionRow } from "../../../types";
import { createHttpError } from "../../utils/httpError";
import { getQuota } from "./getQuota";
import { mockGenerateSession } from "./mockLlm";

interface GenerateSessionDependencies {
  supabase: SupabaseClient<Database>;
}

export interface GenerateSessionResult {
  session: SessionRow;
  generation: GenerationRow;
}

/**
 * Generate AI session using MOCKED LLM (not real OpenRouter).
 * Enforces rate limits, creates session + generation records transactionally.
 */
export async function generateAiSession(
  dependencies: GenerateSessionDependencies,
  userId: string,
  maxPullups: number,
  model: string,
  startNow = false
): Promise<GenerateSessionResult> {
  const { supabase } = dependencies;

  // Check quota
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

  // Generate session using MOCK LLM
  const startTime = Date.now();
  let llmResponse;

  try {
    llmResponse = await mockGenerateSession({ maxPullups, model });
  } catch (error) {
    // Log generation failure
    const durationMs = Date.now() - startTime;

    const generationPayload = {
      user_id: userId,
      model,
      status: "error" as const,
      duration_ms: durationMs,
      prompt_data: { maxPullups },
      response_data: null,
      session_id: null,
    };

    await supabase.from("generations").insert(generationPayload);

    // Log error details
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await supabase.from("generation_error_logs").insert({
      user_id: userId,
      generation_id: null,
      error_type: errorMessage.includes("TIMEOUT") ? "timeout" : "invalid_response",
      error_message: errorMessage,
      error_stack: error instanceof Error ? (error.stack ?? null) : null,
    });

    throw createHttpError({
      status: 500,
      code: "AI_GENERATION_FAILED",
      message: "Failed to generate AI session",
      details: { hint: errorMessage },
      cause: error,
    });
  }

  // Validate generated sets
  const { sets, comment, durationMs } = llmResponse;

  if (!sets || sets.length !== 5 || sets.some((s) => s < 1 || s > 60)) {
    throw createHttpError({
      status: 500,
      code: "AI_INVALID_RESPONSE",
      message: "AI generated invalid session data",
      details: { sets },
    });
  }

  // Calculate session date (now or future)
  const sessionDate = new Date();
  if (!startNow) {
    sessionDate.setHours(sessionDate.getHours() + 1); // Schedule 1 hour in future
  }

  const totalReps = sets.reduce((sum, reps) => sum + reps, 0);

  // Create session
  const sessionPayload = {
    user_id: userId,
    status: startNow ? ("in_progress" as const) : ("planned" as const),
    session_date: sessionDate.toISOString(),
    set_1: sets[0],
    set_2: sets[1],
    set_3: sets[2],
    set_4: sets[3],
    set_5: sets[4],
    total_reps: totalReps,
    rpe: null,
    is_ai_generated: true,
    is_modified: false,
    ai_comment: comment,
  };

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert(sessionPayload)
    .select()
    .single();

  if (sessionError) {
    throw createHttpError({
      status: 500,
      code: "CREATE_SESSION_FAILED",
      message: "Failed to create AI-generated session",
      details: { hint: sessionError.message },
    });
  }

  // Create generation record
  const generationPayload = {
    user_id: userId,
    model,
    status: "success" as const,
    duration_ms: durationMs,
    prompt_data: { maxPullups },
    response_data: { sets, comment },
    session_id: session.id,
  };

  const { data: generation, error: generationError } = await supabase
    .from("generations")
    .insert(generationPayload)
    .select()
    .single();

  if (generationError) {
    // Roll back session creation
    await supabase.from("sessions").delete().eq("id", session.id);

    throw createHttpError({
      status: 500,
      code: "CREATE_GENERATION_FAILED",
      message: "Failed to record AI generation",
      details: { hint: generationError.message },
    });
  }

  // Create event
  await supabase.from("events").insert({
    user_id: userId,
    event_type: startNow ? "session_started" : "session_created",
    event_data: {
      session_id: session.id,
      is_ai_generated: true,
      generation_id: generation.id,
    },
  });

  return {
    session,
    generation,
  };
}
