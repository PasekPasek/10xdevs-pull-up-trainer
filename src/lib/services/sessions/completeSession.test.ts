import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import { completeSession } from "./completeSession";

describe("completeSession", () => {
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient<Database>;
  });

  it("should complete in_progress session successfully", async () => {
    const mockSession = {
      id: "test-session-id",
      user_id: "test-user-id",
      status: "in_progress",
      session_date: "2025-10-15T10:00:00Z",
      set_1: 10,
      set_2: 8,
      set_3: 8,
      set_4: 7,
      set_5: 6,
      total_reps: 39,
      rpe: null,
      is_ai_generated: false,
      is_modified: false,
      ai_comment: null,
      created_at: "2025-10-11T16:00:00Z",
      updated_at: "2025-10-11T16:00:00Z",
    };

    const completedSession = { ...mockSession, status: "completed" as const, rpe: 7, total_reps: 49 };

    const singleMock = vi.fn().mockResolvedValue({ data: completedSession, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const eqMock2 = vi.fn().mockReturnValue({ select: selectMock });
    const eqMock1 = vi.fn().mockReturnValue({ eq: eqMock2 });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock1 });
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    mockSupabase.from = vi.fn((table) => {
      if (table === "sessions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockSession,
                  error: null,
                }),
              })),
            })),
          })),
          update: updateMock,
        };
      }
      if (table === "events") {
        return {
          insert: insertMock,
        };
      }
      return {};
    }) as unknown as typeof mockSupabase.from;

    const result = await completeSession({ supabase: mockSupabase }, "test-user-id", "test-session-id", {
      sets: [12, 10, 10, 9, 8],
      rpe: 7,
    });

    expect(result.status).toBe("completed");
    expect(updateMock).toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalled();
  });

  it("should throw 422 when trying to complete non-in_progress session", async () => {
    const mockSession = {
      id: "test-session-id",
      user_id: "test-user-id",
      status: "planned",
      session_date: "2025-10-15T10:00:00Z",
      set_1: 10,
      set_2: 8,
      set_3: 8,
      set_4: 7,
      set_5: 6,
      total_reps: 39,
      rpe: null,
      is_ai_generated: false,
      is_modified: false,
      ai_comment: null,
      created_at: "2025-10-11T16:00:00Z",
      updated_at: "2025-10-11T16:00:00Z",
    };

    mockSupabase.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          })),
        })),
      })),
    })) as unknown as typeof mockSupabase.from;

    await expect(
      completeSession({ supabase: mockSupabase }, "test-user-id", "test-session-id", { rpe: 7 })
    ).rejects.toThrow("Only in-progress sessions can be completed");
  });

  it("should throw 400 when all sets are zero", async () => {
    const mockSession = {
      id: "test-session-id",
      user_id: "test-user-id",
      status: "in_progress",
      session_date: "2025-10-15T10:00:00Z",
      set_1: 10,
      set_2: 8,
      set_3: 8,
      set_4: 7,
      set_5: 6,
      total_reps: 39,
      rpe: null,
      is_ai_generated: false,
      is_modified: false,
      ai_comment: null,
      created_at: "2025-10-11T16:00:00Z",
      updated_at: "2025-10-11T16:00:00Z",
    };

    mockSupabase.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          })),
        })),
      })),
    })) as unknown as typeof mockSupabase.from;

    await expect(
      completeSession({ supabase: mockSupabase }, "test-user-id", "test-session-id", { sets: [0, 0, 0, 0, 0], rpe: 7 })
    ).rejects.toThrow("At least one set must be greater than 0");
  });

  it("should use existing sets if none provided", async () => {
    const mockSession = {
      id: "test-session-id",
      user_id: "test-user-id",
      status: "in_progress",
      session_date: "2025-10-15T10:00:00Z",
      set_1: 10,
      set_2: 8,
      set_3: 8,
      set_4: 7,
      set_5: 6,
      total_reps: 39,
      rpe: null,
      is_ai_generated: false,
      is_modified: false,
      ai_comment: null,
      created_at: "2025-10-11T16:00:00Z",
      updated_at: "2025-10-11T16:00:00Z",
    };

    const completedSession = { ...mockSession, status: "completed" as const, rpe: 7 };

    const singleMock = vi.fn().mockResolvedValue({ data: completedSession, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const eqMock2 = vi.fn().mockReturnValue({ select: selectMock });
    const eqMock1 = vi.fn().mockReturnValue({ eq: eqMock2 });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock1 });
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    mockSupabase.from = vi.fn((table) => {
      if (table === "sessions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockSession,
                  error: null,
                }),
              })),
            })),
          })),
          update: updateMock,
        };
      }
      if (table === "events") {
        return {
          insert: insertMock,
        };
      }
      return {};
    }) as unknown as typeof mockSupabase.from;

    const result = await completeSession({ supabase: mockSupabase }, "test-user-id", "test-session-id", { rpe: 7 });

    expect(result.status).toBe("completed");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        set_1: 10,
        set_2: 8,
        set_3: 8,
        set_4: 7,
        set_5: 6,
        total_reps: 39,
        rpe: 7,
      })
    );
  });
});
