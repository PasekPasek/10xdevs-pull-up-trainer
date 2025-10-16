import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import type { GenerationInsert, GenerationRow, SessionInsert, SessionRow } from "../../../types";
import type { AiGenerationNewUserResult, AiStructuredResponseExisting, OpenRouterService } from "./openrouter";
import { HttpError } from "../../utils/httpError";

vi.mock("./getQuota", () => ({
  getQuota: vi.fn(),
}));

vi.mock("./openrouterSingleton", () => ({
  getOpenRouterService: vi.fn(),
}));

import { getQuota } from "./getQuota";
import { getOpenRouterService } from "./openrouterSingleton";
import * as generateSessionModule from "./generateSession";

const helpers = generateSessionModule.__test;
const mockedGetQuota = vi.mocked(getQuota);
const mockedGetOpenRouterService = vi.mocked(getOpenRouterService);

type RawSessionRow = Pick<
  SessionRow,
  "id" | "session_date" | "status" | "total_reps" | "rpe" | "set_1" | "set_2" | "set_3" | "set_4" | "set_5"
>;

function createSupabaseStub(sessionRow: SessionRow, generationRow: GenerationRow, recentSessionRows: RawSessionRow[]) {
  const sessionPayloads: SessionInsert[] = [];
  const generationPayloads: GenerationInsert[] = [];
  const eventPayloads: Record<string, unknown>[] = [];

  const sessionInsertMock = vi.fn((payload: SessionInsert) => {
    sessionPayloads.push(payload);
    return {
      select: () => ({
        single: () => Promise.resolve({ data: sessionRow, error: null }),
      }),
    };
  });

  const generationInsertMock = vi.fn((payload: GenerationInsert) => {
    generationPayloads.push(payload);
    return {
      select: () => ({
        single: () => Promise.resolve({ data: generationRow, error: null }),
      }),
    };
  });

  const eventsInsertMock = vi.fn((payload: Record<string, unknown>) => {
    eventPayloads.push(payload);
    return Promise.resolve({ error: null });
  });

  const sessionDeleteEqMock = vi.fn();

  const limitMock = vi.fn().mockResolvedValue({ data: recentSessionRows, error: null });
  const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
  const inMock = vi.fn().mockReturnValue({ order: orderMock });
  const eqMock = vi.fn().mockReturnValue({ in: inMock });
  const sessionsSelectMock = vi.fn(() => ({ eq: eqMock }));

  const fromMock = vi.fn((table: string) => {
    if (table === "sessions") {
      return {
        insert: sessionInsertMock,
        select: sessionsSelectMock,
        delete: () => ({ eq: sessionDeleteEqMock }),
      };
    }

    if (table === "generations") {
      return {
        insert: generationInsertMock,
        select: vi.fn(),
      };
    }

    if (table === "events") {
      return {
        insert: eventsInsertMock,
      };
    }

    throw new Error(`Unexpected table access: ${table}`);
  });

  const supabase = {
    from: fromMock,
  } as unknown as SupabaseClient<Database> & {
    from: typeof fromMock;
  };

  return {
    supabase,
    sessionPayloads,
    generationPayloads,
    eventPayloads,
    sessionInsertMock,
    generationInsertMock,
    eventsInsertMock,
    sessionSelectMock: sessionsSelectMock,
    sessionLimitMock: limitMock,
  };
}

describe("generateSession helpers", () => {
  it("clamps rep values to acceptable bounds", () => {
    expect(helpers.clampRepValue(0)).toBe(1);
    expect(helpers.clampRepValue(61)).toBe(60);
    expect(helpers.clampRepValue(NaN)).toBe(1);
    expect(helpers.clampRepValue(24.6)).toBe(25);
  });

  it("builds new user prompt metadata with sanitized max pull-ups", () => {
    const todayIso = new Date("2025-03-01T00:00:00Z").toISOString();

    const metadata = helpers.buildPromptMetadata({
      isNewUser: true,
      maxPullups: 72.4,
      todayIso,
      sessions: [],
    });

    expect(metadata).toEqual({ mode: "new_user", maxPullups: 60 });
  });

  it("throws when new user metadata lacks max pull-ups", () => {
    const todayIso = new Date("2025-03-01T00:00:00Z").toISOString();

    expect(() =>
      helpers.buildPromptMetadata({
        isNewUser: true,
        maxPullups: undefined,
        todayIso,
        sessions: [],
      })
    ).toThrowError(HttpError);
  });

  it("builds existing user metadata with session identifiers", () => {
    const todayIso = new Date("2025-03-01T00:00:00Z").toISOString();

    const metadata = helpers.buildPromptMetadata({
      isNewUser: false,
      maxPullups: undefined,
      todayIso,
      sessions: [
        {
          id: "session-1",
          sessionDate: todayIso,
          sets: [10, 12, 14, 16, 18],
          status: "completed",
          totalReps: 70,
          rpe: 7,
        },
      ],
    });

    expect(metadata).toEqual({
      mode: "existing_user",
      sessionIds: ["session-1"],
      todayIso,
    });
  });

  it("normalizes response payloads for new users", () => {
    const response: AiGenerationNewUserResult = {
      sets: [0, 61, 12, 8, 5],
      comment: "  Świetny progres!  ",
      sessionDate: "2025-03-01",
    };

    const normalized = helpers.normalizeResponse(response, true);

    expect(normalized.sets).toEqual([1, 60, 12, 8, 5]);
    expect(normalized.comment).toBe("Świetny progres!");
    expect(normalized.responseData).toEqual({ sets: [1, 60, 12, 8, 5], comment: "Świetny progres!" });
  });

  it("normalizes response payloads for existing users", () => {
    const response: AiStructuredResponseExisting = {
      sets: [15, 20, 18, 17, 16],
      comment: "Gotowy na kolejny krok",
      sessionDate: "2025-03-05",
    };

    const normalized = helpers.normalizeResponse(response, false);

    expect(normalized.responseData).toEqual({
      sets: [15, 20, 18, 17, 16],
      comment: "Gotowy na kolejny krok",
      sessionDate: new Date("2025-03-05").toISOString(),
    });
  });
});

describe("generateAiSession", () => {
  const userId = "user-123";
  const quota = {
    remaining: 5,
    limit: 5,
    resetsAt: new Date("2025-03-01T00:00:00Z").toISOString(),
    nextWindowSeconds: 24 * 3600,
  };

  beforeEach(() => {
    mockedGetQuota.mockReset();
    mockedGetOpenRouterService.mockReset();
    vi.clearAllMocks();
  });

  it("rejects when the user has exhausted the AI quota", async () => {
    mockedGetQuota.mockResolvedValue({ ...quota, remaining: 0 });

    const supabase = { from: vi.fn() } as unknown as SupabaseClient<Database>;

    await expect(
      generateSessionModule.generateAiSession({ supabase }, userId, 20, "gpt-4o-mini", false)
    ).rejects.toMatchObject({ code: "AI_LIMIT_REACHED", status: 403 });
  });

  it("creates session and generation records for a new user", async () => {
    const sessionRow = {
      id: "session-new",
      user_id: userId,
      status: "in_progress",
      session_date: "2025-03-02T00:00:00Z",
      set_1: 10,
      set_2: 12,
      set_3: 14,
      set_4: 16,
      set_5: 18,
      total_reps: 70,
      rpe: null,
      is_ai_generated: true,
      is_modified: false,
      ai_comment: "Świetny progres!",
      created_at: "2025-03-02T00:00:00Z",
      updated_at: "2025-03-02T00:00:00Z",
    } as unknown as SessionRow;

    const generationRow = {
      id: "generation-new",
      user_id: userId,
      model: "gpt-4o",
      status: "success",
      duration_ms: 1200,
      prompt_data: {},
      response_data: {},
      session_id: "session-new",
      created_at: "2025-03-02T00:00:00Z",
      updated_at: "2025-03-02T00:00:00Z",
    } as unknown as GenerationRow;

    const { supabase, sessionPayloads, generationPayloads, eventPayloads } = createSupabaseStub(
      sessionRow,
      generationRow,
      []
    );

    mockedGetQuota.mockResolvedValue(quota);

    const fetchRecentSessionsSpy = vi.spyOn(generateSessionModule, "fetchRecentSessionsForUser").mockResolvedValue([]);

    const generateForNewUserMock = vi.fn();

    generateForNewUserMock.mockResolvedValue({
      sets: [8, 10, 12, 14, 16],
      comment: "  Zacznij spokojnie ",
      sessionDate: "2025-03-02",
    });

    mockedGetOpenRouterService.mockReturnValue({
      generateForNewUser: generateForNewUserMock,
      generateForExistingUser: vi.fn(),
    } as unknown as OpenRouterService);

    const result = await generateSessionModule.generateAiSession({ supabase }, userId, 22.6, "gpt-4o", true);

    expect(generateForNewUserMock).toHaveBeenCalledWith({ maxPullups: 23, model: "gpt-4o" });

    expect(result.session).toBe(sessionRow);
    expect(result.generation).toBe(generationRow);

    expect(sessionPayloads).toHaveLength(1);
    expect(sessionPayloads[0]).toMatchObject({
      status: "in_progress",
      total_reps: 8 + 10 + 12 + 14 + 16,
      ai_comment: "Zacznij spokojnie",
      is_ai_generated: true,
    });

    expect(generationPayloads).toHaveLength(1);
    expect(generationPayloads[0]).toMatchObject({
      status: "success",
      model: "gpt-4o",
      session_id: sessionRow.id,
    });

    expect(generationPayloads[0].prompt_data).toEqual({ mode: "new_user", maxPullups: 23 });
    expect(typeof generationPayloads[0].duration_ms).toBe("number");

    expect(eventPayloads).toHaveLength(1);
    expect(eventPayloads[0]).toMatchObject({
      user_id: userId,
      event_type: "session_started",
      event_data: expect.objectContaining({ session_id: sessionRow.id, is_ai_generated: true }),
    });

    fetchRecentSessionsSpy.mockRestore();
  });

  it("creates planned session for existing users using historical data", async () => {
    const sessionRow = {
      id: "session-existing",
      user_id: userId,
      status: "planned",
      session_date: "2025-03-03T00:00:00Z",
      set_1: 12,
      set_2: 12,
      set_3: 12,
      set_4: 12,
      set_5: 12,
      total_reps: 60,
      rpe: null,
      is_ai_generated: true,
      is_modified: false,
      ai_comment: "Plan AI",
      created_at: "2025-03-03T00:00:00Z",
      updated_at: "2025-03-03T00:00:00Z",
    } as unknown as SessionRow;

    const generationRow = {
      id: "generation-existing",
      user_id: userId,
      model: "gpt-4o-mini",
      status: "success",
      duration_ms: 980,
      prompt_data: {},
      response_data: {},
      session_id: "session-existing",
      created_at: "2025-03-03T00:00:00Z",
      updated_at: "2025-03-03T00:00:00Z",
    } as unknown as GenerationRow;

    const recentSessions = [
      {
        id: "historical-1",
        sessionDate: "2025-02-27T00:00:00Z",
        sets: [10, 11, 12, 13, 14],
        status: "completed",
        totalReps: 60,
        rpe: 7,
      },
    ];

    const { supabase, sessionPayloads, generationPayloads, eventPayloads } = createSupabaseStub(
      sessionRow,
      generationRow,
      recentSessions.map((session) => ({
        id: session.id,
        session_date: session.sessionDate,
        status: session.status,
        total_reps: session.totalReps,
        rpe: session.rpe ?? null,
        set_1: session.sets[0],
        set_2: session.sets[1],
        set_3: session.sets[2],
        set_4: session.sets[3],
        set_5: session.sets[4],
      }))
    );

    mockedGetQuota.mockResolvedValue(quota);

    const fetchRecentSessionsSpy = vi
      .spyOn(generateSessionModule, "fetchRecentSessionsForUser")
      .mockResolvedValue(recentSessions);

    const generateForExistingUserMock = vi.fn();
    const generatedResponse: AiStructuredResponseExisting = {
      sets: [14, 14, 15, 15, 16],
      comment: "Skup się na jakości",
      sessionDate: "2025-03-03",
    };

    generateForExistingUserMock.mockResolvedValue(generatedResponse);

    mockedGetOpenRouterService.mockReturnValue({
      generateForNewUser: vi.fn(),
      generateForExistingUser: generateForExistingUserMock,
    } as unknown as OpenRouterService);

    const result = await generateSessionModule.generateAiSession({ supabase }, userId, undefined, "gpt-4o-mini", false);

    expect(result.session).toBe(sessionRow);
    expect(result.generation).toBe(generationRow);

    const openRouterCall = generateForExistingUserMock.mock.calls[0][0];

    expect(openRouterCall.sessions).toEqual([
      {
        sessionDate: new Date("2025-02-27T00:00:00Z").toISOString(),
        sets: [10, 11, 12, 13, 14],
        status: "completed",
        totalReps: 60,
        rpe: 7,
      },
    ]);
    expect(openRouterCall.model).toBe("gpt-4o-mini");
    expect(typeof openRouterCall.todayIso).toBe("string");

    expect(sessionPayloads[0]).toMatchObject({
      status: "planned",
      total_reps: 14 + 14 + 15 + 15 + 16,
      ai_comment: "Skup się na jakości",
    });

    expect(generationPayloads[0].prompt_data).toEqual({
      mode: "existing_user",
      sessionIds: ["historical-1"],
      todayIso: openRouterCall.todayIso,
    });

    expect(eventPayloads[0]).toMatchObject({ event_type: "session_created" });

    fetchRecentSessionsSpy.mockRestore();
  });

  it("requires max pull-ups for new users", async () => {
    mockedGetQuota.mockResolvedValue(quota);

    const sessionRow = {
      id: "session-new",
      user_id: userId,
      status: "planned",
      session_date: "2025-03-02T00:00:00Z",
      set_1: 10,
      set_2: 12,
      set_3: 14,
      set_4: 16,
      set_5: 18,
      total_reps: 70,
      rpe: null,
      is_ai_generated: true,
      is_modified: false,
      ai_comment: null,
      created_at: "2025-03-02T00:00:00Z",
      updated_at: "2025-03-02T00:00:00Z",
    } as unknown as SessionRow;

    const generationRow = {
      id: "generation-new",
      user_id: userId,
      model: "gpt-4o-mini",
      status: "success",
      duration_ms: 1200,
      prompt_data: {},
      response_data: {},
      session_id: "session-new",
      created_at: "2025-03-02T00:00:00Z",
      updated_at: "2025-03-02T00:00:00Z",
    } as unknown as GenerationRow;

    const { supabase } = createSupabaseStub(sessionRow, generationRow, []);
    const fetchRecentSessionsSpy = vi.spyOn(generateSessionModule, "fetchRecentSessionsForUser").mockResolvedValue([]);

    mockedGetOpenRouterService.mockReturnValue({
      generateForNewUser: vi.fn(),
      generateForExistingUser: vi.fn(),
    } as unknown as OpenRouterService);

    await expect(
      generateSessionModule.generateAiSession({ supabase }, userId, undefined, "gpt-4o-mini", false)
    ).rejects.toMatchObject({ code: "MAX_PULLUPS_REQUIRED", status: 400 });
    fetchRecentSessionsSpy.mockRestore();
  });
});
