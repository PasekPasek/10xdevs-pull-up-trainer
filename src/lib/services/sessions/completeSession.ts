import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import type { SessionRow, SessionSets } from "../../../types";
import { createHttpError } from "../../utils/httpError";
import { getSession } from "./getSession";

interface CompleteSessionDependencies {
  supabase: SupabaseClient<Database>;
}

interface CompleteSessionCommand {
  sets?: SessionSets;
  rpe?: number;
}

export async function completeSession(
  dependencies: CompleteSessionDependencies,
  userId: string,
  sessionId: string,
  command: CompleteSessionCommand
): Promise<SessionRow> {
  const { supabase } = dependencies;

  // Fetch session to validate
  const session = await getSession(dependencies, userId, sessionId);

  // Check if status allows completion
  if (session.status !== "in_progress") {
    throw createHttpError({
      status: 422,
      code: "INVALID_SESSION_STATUS",
      message: "Only in-progress sessions can be completed",
      details: { sessionId, currentStatus: session.status },
    });
  }

  // Use provided sets or existing ones
  const finalSets = command.sets ?? [session.set_1, session.set_2, session.set_3, session.set_4, session.set_5];

  // Validate at least one rep > 0
  const hasPositiveRep = finalSets.some((set) => (set ?? 0) > 0);
  if (!hasPositiveRep) {
    throw createHttpError({
      status: 400,
      code: "INVALID_SETS",
      message: "At least one set must be greater than 0",
      details: { sets: finalSets },
    });
  }

  const totalReps = finalSets.reduce((sum, value) => sum + (value ?? 0), 0);

  // Update session
  const { data, error } = await supabase
    .from("sessions")
    .update({
      status: "completed",
      set_1: finalSets[0] ?? null,
      set_2: finalSets[1] ?? null,
      set_3: finalSets[2] ?? null,
      set_4: finalSets[3] ?? null,
      set_5: finalSets[4] ?? null,
      total_reps: totalReps,
      rpe: command.rpe ?? null,
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    throw createHttpError({
      status: 500,
      code: "COMPLETE_SESSION_FAILED",
      message: "Failed to complete session",
      details: { hint: error?.message },
    });
  }

  // Create event
  await supabase.from("events").insert({
    user_id: userId,
    event_type: "session_completed",
    event_data: { sessionId, sets: finalSets, rpe: command.rpe },
  });

  return data;
}
