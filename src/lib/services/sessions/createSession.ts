import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import type { SessionInsert, SessionRow, SessionSets, SessionStatus } from "../../../types";
import { createHttpError } from "../../utils/httpError";
import type { WarningPayload } from "./mappers";
import type { CreateSessionInput } from "../../validation/sessions/createSession.schema";

export type CreateSessionWarnings = WarningPayload[];

interface CreateSessionDependencies {
  supabase: SupabaseClient<Database>;
}

type NormalizedCreateSessionCommand = CreateSessionInput;

interface RestInfo {
  lastRecentSession?: {
    id: string;
    endedAt: string;
    hoursSince: number;
    status: SessionStatus;
  };
  sameDayCount: number;
}

interface CreateSessionResult {
  session: SessionRow;
  warnings: CreateSessionWarnings;
}

function mapSetsToInsert(sets: SessionSets): Pick<SessionInsert, "set_1" | "set_2" | "set_3" | "set_4" | "set_5"> {
  return {
    set_1: sets[0] ?? null,
    set_2: sets[1] ?? null,
    set_3: sets[2] ?? null,
    set_4: sets[3] ?? null,
    set_5: sets[4] ?? null,
  };
}

async function fetchActiveSession(supabase: SupabaseClient<Database>, userId: string): Promise<SessionRow | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["planned", "in_progress"])
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw createHttpError({
      status: 500,
      code: "FETCH_ACTIVE_SESSION_FAILED",
      message: "Failed to check active session",
      details: { hint: error.message },
    });
  }

  return data ?? null;
}

function getSessionDayBounds(sessionDate: string) {
  const target = new Date(sessionDate);

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const start = new Date(target);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

async function fetchRestInfo(
  supabase: SupabaseClient<Database>,
  userId: string,
  sessionDate: string
): Promise<RestInfo> {
  const dayBounds = getSessionDayBounds(sessionDate);

  const lastSessionsPromise = supabase
    .from("sessions")
    .select("id, status, session_date, updated_at")
    .eq("user_id", userId)
    .in("status", ["completed", "failed"])
    .order("updated_at", { ascending: false })
    .limit(1);

  const sameDayPromise = (async (): Promise<{ count: number; error: PostgrestError | null }> => {
    if (!dayBounds) {
      return { count: 0, error: null };
    }

    const { count, error } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("session_date", dayBounds.startIso)
      .lt("session_date", dayBounds.endIso);

    return { count: count ?? 0, error };
  })();

  const [{ data: lastSessions, error: restError }, sameDayResult] = await Promise.all([
    lastSessionsPromise,
    sameDayPromise,
  ]);

  if (restError) {
    throw createHttpError({
      status: 500,
      code: "FETCH_REST_INFO_FAILED",
      message: "Failed to evaluate rest policy",
      details: { hint: restError.message },
    });
  }

  if (sameDayResult.error) {
    throw createHttpError({
      status: 500,
      code: "FETCH_SAME_DAY_INFO_FAILED",
      message: "Failed to evaluate same-day session policy",
      details: { hint: sameDayResult.error.message },
    });
  }

  const restInfo: RestInfo = { sameDayCount: sameDayResult.count };

  const [lastSession] = lastSessions ?? [];

  if (!lastSession) {
    return restInfo;
  }

  const targetDate = new Date(sessionDate);
  const lastSessionEnd = new Date(lastSession.updated_at ?? lastSession.session_date);
  const diffMs = targetDate.getTime() - lastSessionEnd.getTime();
  const hoursSince = diffMs / (1000 * 60 * 60);

  if (Number.isFinite(hoursSince) && hoursSince >= 0 && hoursSince < 24) {
    restInfo.lastRecentSession = {
      id: lastSession.id,
      endedAt: lastSessionEnd.toISOString(),
      hoursSince,
      status: lastSession.status as SessionStatus,
    };
  }

  return restInfo;
}

async function insertSession(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: SessionInsert
): Promise<SessionRow> {
  const { data, error } = await supabase.from("sessions").insert(payload).select("*").single();

  if (error?.code === "23505") {
    throw createHttpError({
      status: 409,
      code: "ACTIVE_SESSION_CONFLICT",
      message: "An active session already exists",
      details: { hint: error.message },
    });
  }

  if (error || !data) {
    throw createHttpError({
      status: 500,
      code: "INSERT_SESSION_FAILED",
      message: "Failed to create session",
      details: { hint: error?.message },
    });
  }

  return data;
}

async function insertEvent(
  supabase: SupabaseClient<Database>,
  userId: string,
  eventType: string,
  eventData: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("events").insert({
    user_id: userId,
    event_type: eventType,
    event_data: eventData,
  });

  if (error) {
    throw createHttpError({
      status: 500,
      code: "INSERT_EVENT_FAILED",
      message: "Failed to log session event",
      details: { hint: error.message },
    });
  }
}

function buildWarnings(restInfo: RestInfo): CreateSessionWarnings {
  const warnings: CreateSessionWarnings = [];

  if (restInfo.lastRecentSession) {
    warnings.push({
      code: "REST_PERIOD",
      message: `Last session ended ${restInfo.lastRecentSession.hoursSince.toFixed(1)} hours ago`,
    });
  }

  if (restInfo.sameDayCount > 0) {
    warnings.push({
      code: "MULTIPLE_SAME_DAY",
      message: "Another session is planned for the same day",
    });
  }

  return warnings;
}

export async function createSession(
  dependencies: CreateSessionDependencies,
  userId: string,
  command: NormalizedCreateSessionCommand
): Promise<CreateSessionResult> {
  const { supabase } = dependencies;

  const activeSession = await fetchActiveSession(supabase, userId);

  if (activeSession && (command.startNow || command.status === "planned")) {
    throw createHttpError({
      status: 409,
      code: "ACTIVE_SESSION_CONFLICT",
      message: "An active session already exists",
      details: { sessionId: activeSession.id },
    });
  }

  const restInfo = await fetchRestInfo(supabase, userId, command.sessionDate);
  const warnings = buildWarnings(restInfo);

  const initialStatus: SessionStatus = command.startNow ? "planned" : command.status;
  const insertPayload: SessionInsert = {
    user_id: userId,
    status: initialStatus,
    session_date: command.sessionDate,
    rpe: command.status === "completed" ? (command.rpe ?? null) : null,
    total_reps: command.sets.reduce((sum, value) => sum + (value ?? 0), 0),
    is_ai_generated: false,
    is_modified: false,
    ai_comment: null,
    ...mapSetsToInsert(command.sets),
  };

  const session = await insertSession(supabase, userId, insertPayload);

  await insertEvent(supabase, userId, "session_created", {
    sessionId: session.id,
    notes: command.notes ?? null,
    status: command.status,
    warnings,
    restInfo,
  });

  if (command.startNow) {
    const { data, error } = await supabase
      .from("sessions")
      .update({ status: "in_progress" })
      .eq("id", session.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error || !data) {
      throw createHttpError({
        status: 500,
        code: "START_SESSION_FAILED",
        message: "Failed to mark session as in progress",
        details: { hint: error?.message },
      });
    }

    await insertEvent(supabase, userId, "session_started", {
      sessionId: data.id,
      warnings,
      restInfo,
    });

    return { session: data, warnings };
  }

  return { session, warnings };
}
