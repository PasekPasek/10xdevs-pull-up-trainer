import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import type { SessionRow, UpdateSessionCommand } from "../../../types";
import { createHttpError } from "../../utils/httpError";
import { getSession } from "./getSession";
import { computeTotal } from "@/lib/utils/session";

interface UpdateSessionDependencies {
  supabase: SupabaseClient<Database>;
}

/**
 * Update an existing session (planned or in_progress only).
 * Implements optimistic locking via lastUpdatedAt comparison.
 * Automatically marks AI sessions as modified when sets change.
 */
export async function updateSession(
  dependencies: UpdateSessionDependencies,
  userId: string,
  sessionId: string,
  command: UpdateSessionCommand,
  lastUpdatedAt: string
): Promise<SessionRow> {
  const { supabase } = dependencies;

  // Fetch current session
  const existingSession = await getSession(dependencies, userId, sessionId);

  // Check optimistic lock
  if (existingSession.updated_at !== lastUpdatedAt) {
    throw createHttpError({
      status: 409,
      code: "OPTIMISTIC_LOCK_FAILURE",
      message: "Session has been modified by another request. Please refresh and try again.",
      details: {
        current: existingSession.updated_at,
        provided: lastUpdatedAt,
      },
    });
  }

  // Validate that session can be edited
  if (existingSession.status === "completed" || existingSession.status === "failed") {
    throw createHttpError({
      status: 422,
      code: "SESSION_IMMUTABLE",
      message: "Cannot edit completed or failed sessions",
      details: { status: existingSession.status },
    });
  }

  // Build update payload
  const updatePayload: Partial<SessionRow> = {};

  if (command.sessionDate !== undefined) {
    updatePayload.session_date = command.sessionDate;
  }

  if (command.sets !== undefined) {
    const [set1, set2, set3, set4, set5] = command.sets;
    updatePayload.set_1 = set1;
    updatePayload.set_2 = set2;
    updatePayload.set_3 = set3;
    updatePayload.set_4 = set4;
    updatePayload.set_5 = set5;

    // Recalculate totalReps
    updatePayload.total_reps = computeTotal(command.sets);

    // Check if sets changed for AI sessions
    const setsChanged =
      existingSession.set_1 !== set1 ||
      existingSession.set_2 !== set2 ||
      existingSession.set_3 !== set3 ||
      existingSession.set_4 !== set4 ||
      existingSession.set_5 !== set5;

    if (existingSession.is_ai_generated && setsChanged) {
      updatePayload.is_modified = true;
    }
  }

  if (command.aiComment !== undefined) {
    // Only allow aiComment changes for AI-generated sessions
    if (!existingSession.is_ai_generated) {
      throw createHttpError({
        status: 400,
        code: "INVALID_AI_COMMENT",
        message: "Cannot set aiComment on non-AI-generated sessions",
      });
    }
    updatePayload.ai_comment = command.aiComment;
  }

  if (command.markAsModified === true && existingSession.is_ai_generated) {
    updatePayload.is_modified = true;
  }

  // Update session
  const { data, error } = await supabase
    .from("sessions")
    .update(updatePayload)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw createHttpError({
      status: 500,
      code: "UPDATE_SESSION_FAILED",
      message: "Failed to update session",
      details: { hint: error.message },
    });
  }

  // Create session_updated event
  if (command.notes) {
    const eventPayload = {
      user_id: userId,
      event_type: "session_updated" as const,
      event_data: {
        session_id: sessionId,
        notes: command.notes,
        changes: Object.keys(updatePayload),
      },
    };

    const { error: eventError } = await supabase.from("events").insert(eventPayload);

    if (eventError) {
      // Log but don't fail the request
      // Note: Event creation failure is non-critical for session updates
      void eventError;
    }
  }

  return data;
}
