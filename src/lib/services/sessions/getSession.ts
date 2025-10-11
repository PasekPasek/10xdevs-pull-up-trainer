import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import type { SessionRow } from "../../../types";
import { createHttpError } from "../../utils/httpError";

interface GetSessionDependencies {
  supabase: SupabaseClient<Database>;
}

export async function getSession(
  dependencies: GetSessionDependencies,
  userId: string,
  sessionId: string
): Promise<SessionRow> {
  const { supabase } = dependencies;

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw createHttpError({
      status: 500,
      code: "FETCH_SESSION_FAILED",
      message: "Failed to fetch session",
      details: { hint: error.message },
    });
  }

  if (!data) {
    throw createHttpError({
      status: 404,
      code: "SESSION_NOT_FOUND",
      message: "Session not found",
      details: { sessionId },
    });
  }

  return data;
}
