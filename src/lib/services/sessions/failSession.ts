import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import type { SessionRow } from "../../../types";
import { createHttpError } from "../../utils/httpError";
import { getSession } from "./getSession";

interface FailSessionDependencies {
  supabase: SupabaseClient<Database>;
}

interface FailSessionCommand {
  reason?: string;
}

export async function failSession(
  dependencies: FailSessionDependencies,
  userId: string,
  sessionId: string,
  command: FailSessionCommand
): Promise<SessionRow> {
  const { supabase } = dependencies;

  // Fetch session to validate
  const session = await getSession(dependencies, userId, sessionId);

  // Check if status allows failure
  if (session.status !== "in_progress") {
    throw createHttpError({
      status: 422,
      code: "INVALID_SESSION_STATUS",
      message: "Only in-progress sessions can be marked as failed",
      details: { sessionId, currentStatus: session.status },
    });
  }

  // Update status to failed
  const { data, error } = await supabase
    .from("sessions")
    .update({ status: "failed" })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    throw createHttpError({
      status: 500,
      code: "FAIL_SESSION_FAILED",
      message: "Failed to mark session as failed",
      details: { hint: error?.message },
    });
  }

  // Create event
  await supabase.from("events").insert({
    user_id: userId,
    event_type: "session_failed",
    event_data: { sessionId, reason: command.reason },
  });

  return data;
}
