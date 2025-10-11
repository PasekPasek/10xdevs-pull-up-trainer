import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import type { ApiWarning, SessionStatus, SessionValidationOutcomeDTO } from "../../../types";
import { createHttpError } from "../../utils/httpError";

interface ValidateSessionDependencies {
  supabase: SupabaseClient<Database>;
}

const REST_PERIOD_WARNING_HOURS = 24;

/**
 * Validate prospective session creation without persisting.
 * Checks for conflicts and rest period warnings.
 */
export async function validateSession(
  dependencies: ValidateSessionDependencies,
  userId: string,
  sessionDate: string,
  status: SessionStatus,
  ignoreRestWarning?: boolean
): Promise<SessionValidationOutcomeDTO> {
  const { supabase } = dependencies;

  const warnings: ApiWarning[] = [];
  let blocking = false;

  const parsedDate = new Date(sessionDate);

  // Check for active session (planned or in_progress)
  if (status === "planned" || status === "in_progress") {
    const { data: activeSessions, error: activeError } = await supabase
      .from("sessions")
      .select("id, status")
      .eq("user_id", userId)
      .in("status", ["planned", "in_progress"])
      .limit(1);

    if (activeError) {
      throw createHttpError({
        status: 500,
        code: "VALIDATION_FAILED",
        message: "Failed to validate session",
        details: { hint: activeError.message },
      });
    }

    if (activeSessions && activeSessions.length > 0) {
      warnings.push({
        code: "ACTIVE_SESSION_EXISTS",
        message: `You already have an active session (${activeSessions[0].status})`,
      });
      blocking = true;
    }
  }

  // Check for multiple sessions on same day
  const startOfDay = new Date(parsedDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(parsedDate);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: sameDaySessions, error: sameDayError } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("user_id", userId)
    .gte("session_date", startOfDay.toISOString())
    .lte("session_date", endOfDay.toISOString())
    .limit(1);

  if (sameDayError) {
    throw createHttpError({
      status: 500,
      code: "VALIDATION_FAILED",
      message: "Failed to validate session",
      details: { hint: sameDayError.message },
    });
  }

  if (sameDaySessions && sameDaySessions.length > 0) {
    warnings.push({
      code: "MULTIPLE_SAME_DAY",
      message: `You already have a session on ${parsedDate.toISOString().split("T")[0]}`,
    });
  }

  // Check rest period
  if (!ignoreRestWarning) {
    const restPeriodStart = new Date(parsedDate);
    restPeriodStart.setHours(restPeriodStart.getHours() - REST_PERIOD_WARNING_HOURS);

    const { data: recentSessions, error: recentError } = await supabase
      .from("sessions")
      .select("id, session_date, status")
      .eq("user_id", userId)
      .in("status", ["completed", "failed"])
      .gte("session_date", restPeriodStart.toISOString())
      .lt("session_date", parsedDate.toISOString())
      .order("session_date", { ascending: false })
      .limit(1);

    if (recentError) {
      throw createHttpError({
        status: 500,
        code: "VALIDATION_FAILED",
        message: "Failed to validate session",
        details: { hint: recentError.message },
      });
    }

    if (recentSessions && recentSessions.length > 0) {
      const lastSession = recentSessions[0];
      const lastSessionDate = new Date(lastSession.session_date);
      const hoursSince = Math.floor((parsedDate.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60));

      warnings.push({
        code: "REST_PERIOD",
        message: `Last session was ${hoursSince} hours ago. Consider resting for at least 24 hours.`,
      });
    }
  }

  // Fetch last completed session for context
  const { data: lastCompletedSessions } = await supabase
    .from("sessions")
    .select("id, session_date")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("session_date", { ascending: false })
    .limit(1);

  let lastCompletedSession = undefined;
  if (lastCompletedSessions && lastCompletedSessions.length > 0) {
    const session = lastCompletedSessions[0];
    const sessionDate = new Date(session.session_date);
    const hoursSince = Math.floor((Date.now() - sessionDate.getTime()) / (1000 * 60 * 60));

    lastCompletedSession = {
      id: session.id,
      hoursSince,
    };
  }

  return {
    blocking,
    warnings,
    lastCompletedSession,
  };
}
