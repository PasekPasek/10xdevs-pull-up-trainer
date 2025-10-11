import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import { failSession } from "./failSession";

describe("failSession", () => {
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient<Database>;
  });

  it("should fail in_progress session successfully", async () => {
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

    const failedSession = { ...mockSession, status: "failed" as const };

    const singleMock = vi.fn().mockResolvedValue({ data: failedSession, error: null });
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

    const result = await failSession({ supabase: mockSupabase }, "test-user-id", "test-session-id", {
      reason: "Feeling unwell",
    });

    expect(result.status).toBe("failed");
    expect(updateMock).toHaveBeenCalledWith({ status: "failed" });
    expect(insertMock).toHaveBeenCalled();
  });

  it("should throw 422 when trying to fail non-in_progress session", async () => {
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

    await expect(failSession({ supabase: mockSupabase }, "test-user-id", "test-session-id", {})).rejects.toThrow(
      "Only in-progress sessions can be marked as failed"
    );
  });

  it("should throw 422 when trying to fail completed session", async () => {
    const mockSession = {
      id: "test-session-id",
      user_id: "test-user-id",
      status: "completed",
      session_date: "2025-10-15T10:00:00Z",
      set_1: 10,
      set_2: 8,
      set_3: 8,
      set_4: 7,
      set_5: 6,
      total_reps: 39,
      rpe: 8,
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

    await expect(failSession({ supabase: mockSupabase }, "test-user-id", "test-session-id", {})).rejects.toThrow(
      "Only in-progress sessions can be marked as failed"
    );
  });

  it("should fail session without reason", async () => {
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

    const failedSession = { ...mockSession, status: "failed" as const };

    const singleMock = vi.fn().mockResolvedValue({ data: failedSession, error: null });
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

    const result = await failSession({ supabase: mockSupabase }, "test-user-id", "test-session-id", {});

    expect(result.status).toBe("failed");
  });

  it("should throw 404 when session not found", async () => {
    mockSupabase.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          })),
        })),
      })),
    })) as unknown as typeof mockSupabase.from;

    await expect(failSession({ supabase: mockSupabase }, "test-user-id", "test-session-id", {})).rejects.toThrow(
      "Session not found"
    );
  });
});
