import { describe, expect, it, vi } from "vitest";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import { createSession } from "./createSession";
import { createSessionSchema } from "@/lib/validation/sessions/createSession.schema";
import type { SessionInsert, SessionRow } from "@/types";

interface ChainResult<T> {
  data: T;
  error: unknown;
}

function makeSessionRow(overrides: Partial<SessionRow> = {}): SessionRow {
  const now = new Date().toISOString();
  return {
    id: "session-id",
    user_id: "user-id",
    status: "planned",
    session_date: now,
    updated_at: now,
    created_at: now,
    total_reps: 0,
    rpe: null,
    is_ai_generated: false,
    is_modified: false,
    ai_comment: null,
    set_1: null,
    set_2: null,
    set_3: null,
    set_4: null,
    set_5: null,
    ...overrides,
  };
}

function createActiveSessionChain(result: ChainResult<SessionRow | null>) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        in: vi.fn(() => ({
          maybeSingle: vi.fn(async () => result),
        })),
      })),
    })),
  };
}

function createLastSessionsChain(result: ChainResult<SessionRow[]>) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(async () => result),
          })),
        })),
      })),
    })),
  };
}

function createSameDayChain(result: { count: number; error: unknown }) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        gte: vi.fn(() => ({
          lt: vi.fn(async () => result),
        })),
      })),
    })),
  };
}

function createInsertChain(result: ChainResult<SessionRow>, onInsert: (payload: SessionInsert) => void) {
  return {
    insert: vi.fn((payload: SessionInsert) => {
      onInsert(payload);
      return {
        select: vi.fn(() => ({
          single: vi.fn(async () => result),
        })),
      };
    }),
  };
}

function createEventInsertChain(onInsert: (payload: Record<string, unknown>) => void) {
  return {
    insert: vi.fn(async (payload: Record<string, unknown>) => {
      onInsert(payload);
      return { error: null };
    }),
  };
}

type SupabaseStub = Pick<SupabaseClient<Database>, "from">;

interface SupabaseMockOptions {
  sessionChains: (() => Record<string, unknown>)[];
  eventChains: (() => Record<string, unknown>)[];
}

function createSupabaseMock({ sessionChains, eventChains }: SupabaseMockOptions): SupabaseStub {
  let sessionIndex = 0;
  let eventIndex = 0;

  const fromMock = vi.fn((table: string) => {
    if (table === "sessions") {
      const factory = sessionChains[sessionIndex++];
      if (!factory) {
        throw new Error(`Unexpected sessions call at index ${sessionIndex - 1}`);
      }
      return factory();
    }

    if (table === "events") {
      const factory = eventChains[eventIndex++];
      if (!factory) {
        throw new Error(`Unexpected events call at index ${eventIndex - 1}`);
      }
      return factory();
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    from: fromMock,
  } as unknown as SupabaseStub;
}

const USER_ID = "user-123";

describe("createSession service", () => {
  it("creates a session and returns rest warnings", async () => {
    const sessionDate = new Date();
    sessionDate.setUTCMinutes(0, 0, 0);
    sessionDate.setUTCDate(sessionDate.getUTCDate() + 5);
    sessionDate.setUTCHours(10);

    const lastSessionDate = new Date(sessionDate);
    lastSessionDate.setUTCDate(lastSessionDate.getUTCDate() - 1);
    lastSessionDate.setUTCHours(16);

    const insertedSession = makeSessionRow({
      id: "new-session",
      user_id: USER_ID,
      session_date: sessionDate.toISOString(),
      updated_at: sessionDate.toISOString(),
      total_reps: 10,
      set_1: 10,
    });

    const capturedInserts: SessionInsert[] = [];
    const capturedEvents: Record<string, unknown>[] = [];

    const supabase = createSupabaseMock({
      sessionChains: [
        () => createActiveSessionChain({ data: null, error: null }),
        () =>
          createLastSessionsChain({
            data: [
              makeSessionRow({
                id: "recent-session",
                user_id: USER_ID,
                status: "completed",
                session_date: lastSessionDate.toISOString(),
                updated_at: lastSessionDate.toISOString(),
              }),
            ],
            error: null,
          }),
        () => createSameDayChain({ count: 0, error: null }),
        () =>
          createInsertChain({ data: insertedSession, error: null }, (payload) => {
            capturedInserts.push(payload);
          }),
      ],
      eventChains: [() => createEventInsertChain((payload) => capturedEvents.push(payload))],
    });

    const command = createSessionSchema.parse({
      sessionDate: sessionDate.toISOString(),
      sets: [10, null, null, null, null],
    });

    const result = await createSession({ supabase: supabase as unknown as SupabaseClient<Database> }, USER_ID, command);

    expect(result.session).toEqual(insertedSession);
    const expectedHours = ((sessionDate.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60)).toFixed(1);
    expect(result.warnings).toEqual([
      {
        code: "REST_PERIOD",
        message: `Last session ended ${expectedHours} hours ago`,
      },
    ]);

    expect(capturedInserts).toHaveLength(1);
    expect(capturedInserts[0]).toMatchObject({
      user_id: USER_ID,
      total_reps: 10,
      set_1: 10,
      status: "planned",
    });

    expect(capturedEvents).toHaveLength(1);
    expect(capturedEvents[0]).toMatchObject({
      user_id: USER_ID,
      event_type: "session_created",
    });

    const eventData = capturedEvents[0]?.event_data as Record<string, unknown>;
    expect(eventData).toBeDefined();
    expect(eventData?.warnings).toEqual(result.warnings);
    expect((eventData?.restInfo as { sameDayCount: number }).sameDayCount).toBe(0);
  });

  it("throws when active session exists and startNow is requested", async () => {
    const sessionDate = new Date();
    sessionDate.setUTCMinutes(0, 0, 0);
    sessionDate.setUTCDate(sessionDate.getUTCDate() + 3);
    sessionDate.setUTCHours(9);

    const supabase = createSupabaseMock({
      sessionChains: [
        () =>
          createActiveSessionChain({
            data: makeSessionRow({ id: "existing-session" }),
            error: null,
          }),
      ],
      eventChains: [],
    });

    const command = createSessionSchema.parse({
      sessionDate: sessionDate.toISOString(),
      sets: [5, null, null, null, null],
      startNow: true,
    });

    await expect(
      createSession({ supabase: supabase as unknown as SupabaseClient<Database> }, USER_ID, command)
    ).rejects.toMatchObject({ status: 409, code: "ACTIVE_SESSION_CONFLICT" });
  });
});
