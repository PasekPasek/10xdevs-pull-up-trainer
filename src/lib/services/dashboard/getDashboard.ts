import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import type { DashboardSnapshotDTO } from "../../../types";
import { createHttpError } from "../../utils/httpError";
import { mapSessionRowToDetailDTO, mapSessionRowToDTO } from "../sessions/mappers";
import { getQuota } from "../ai/getQuota";

interface GetDashboardDependencies {
  supabase: SupabaseClient<Database>;
}

/**
 * Get dashboard snapshot with active session, last completed session,
 * AI quota, and recommended actions.
 */
export async function getDashboard(
  dependencies: GetDashboardDependencies,
  userId: string
): Promise<DashboardSnapshotDTO> {
  const { supabase } = dependencies;

  // Fetch active session (planned or in_progress)
  const { data: activeSessions, error: activeError } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["planned", "in_progress"])
    .order("session_date", { ascending: true })
    .limit(1);

  if (activeError) {
    throw createHttpError({
      status: 500,
      code: "FETCH_DASHBOARD_FAILED",
      message: "Failed to fetch dashboard data",
      details: { hint: activeError.message },
    });
  }

  const activeSession = activeSessions && activeSessions.length > 0 ? activeSessions[0] : undefined;

  // Fetch last completed session
  const { data: completedSessions, error: completedError } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("session_date", { ascending: false })
    .limit(1);

  if (completedError) {
    throw createHttpError({
      status: 500,
      code: "FETCH_DASHBOARD_FAILED",
      message: "Failed to fetch dashboard data",
      details: { hint: completedError.message },
    });
  }

  const lastCompletedSession = completedSessions && completedSessions.length > 0 ? completedSessions[0] : undefined;

  // Fetch AI quota
  const aiQuota = await getQuota(dependencies, userId);

  // Determine primary CTA
  let primaryCta = "Create with AI";
  let secondaryCta = "Create manually";

  if (activeSession) {
    if (activeSession.status === "planned") {
      primaryCta = "Start session";
      secondaryCta = "Edit session";
    } else if (activeSession.status === "in_progress") {
      primaryCta = "Complete session";
      secondaryCta = "Fail session";
    }
  } else if (aiQuota.remaining === 0) {
    primaryCta = "Create manually";
    secondaryCta = "View history";
  }

  return {
    activeSession: activeSession ? mapSessionRowToDetailDTO(activeSession) : undefined,
    lastCompletedSession: lastCompletedSession ? mapSessionRowToDTO(lastCompletedSession) : undefined,
    aiQuota,
    cta: {
      primary: primaryCta,
      secondary: secondaryCta,
    },
  };
}
