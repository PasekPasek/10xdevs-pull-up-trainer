import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import { createHttpError } from "../../utils/httpError";
import { getSession } from "./getSession";

interface DeleteSessionDependencies {
  supabase: SupabaseClient<Database>;
}

export async function deleteSession(
  dependencies: DeleteSessionDependencies,
  userId: string,
  sessionId: string
): Promise<void> {
  const { supabase } = dependencies;

  // First, fetch the session to check if it exists and validate permissions
  const session = await getSession(dependencies, userId, sessionId);

  // Check if session is immutable (completed or failed)
  if (session.status === "completed" || session.status === "failed") {
    throw createHttpError({
      status: 403,
      code: "SESSION_IMMUTABLE",
      message: "Cannot delete completed or failed sessions",
      details: { sessionId, status: session.status },
    });
  }

  // Delete the session
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId).eq("user_id", userId);

  if (error) {
    throw createHttpError({
      status: 500,
      code: "DELETE_SESSION_FAILED",
      message: "Failed to delete session",
      details: { hint: error.message },
    });
  }
}
