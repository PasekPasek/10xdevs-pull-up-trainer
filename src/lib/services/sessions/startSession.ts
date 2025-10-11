import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import type { SessionRow } from "../../../types";
import { createHttpError } from "../../utils/httpError";
import { getSession } from "./getSession";

interface StartSessionDependencies {
  supabase: SupabaseClient<Database>;
}

export async function startSession(
  dependencies: StartSessionDependencies,
  userId: string,
  sessionId: string
): Promise<SessionRow> {
  const { supabase } = dependencies;

  // Fetch session to validate
  const session = await getSession(dependencies, userId, sessionId);

  // Check if status allows starting
  if (session.status !== "planned") {
    throw createHttpError({
      status: 422,
      code: "INVALID_SESSION_STATUS",
      message: "Only planned sessions can be started",
      details: { sessionId, currentStatus: session.status },
    });
  }

  // Update status to in_progress
  const { data, error } = await supabase
    .from("sessions")
    .update({ status: "in_progress" })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    throw createHttpError({
      status: 500,
      code: "START_SESSION_FAILED",
      message: "Failed to start session",
      details: { hint: error?.message },
    });
  }

  // Create event
  await supabase.from("events").insert({
    user_id: userId,
    event_type: "session_started",
    event_data: { sessionId },
  });

  return data;
}
