import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import { deleteSession } from "./deleteSession";

describe("deleteSession", () => {
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(),
            })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(),
          })),
        })),
      })),
    } as unknown as SupabaseClient<Database>;
  });

  it("should delete planned session successfully", async () => {
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

    let deleteEqCalled = false;
    const eqMock2 = vi.fn().mockResolvedValue({ error: null });
    const eqMock1 = vi.fn(() => {
      deleteEqCalled = true;
      return { eq: eqMock2 };
    });

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
          delete: vi.fn(() => ({ eq: eqMock1 })),
        };
      }
      return {};
    }) as unknown as typeof mockSupabase.from;

    await deleteSession({ supabase: mockSupabase }, "test-user-id", "test-session-id");

    expect(mockSupabase.from).toHaveBeenCalledWith("sessions");
    expect(deleteEqCalled).toBe(true);
  });

  it("should delete in_progress session successfully", async () => {
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

    let deleteEqCalled = false;
    const eqMock2 = vi.fn().mockResolvedValue({ error: null });
    const eqMock1 = vi.fn(() => {
      deleteEqCalled = true;
      return { eq: eqMock2 };
    });

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
          delete: vi.fn(() => ({ eq: eqMock1 })),
        };
      }
      return {};
    }) as unknown as typeof mockSupabase.from;

    await deleteSession({ supabase: mockSupabase }, "test-user-id", "test-session-id");

    expect(deleteEqCalled).toBe(true);
  });

  it("should throw 403 when trying to delete completed session", async () => {
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

    await expect(deleteSession({ supabase: mockSupabase }, "test-user-id", "test-session-id")).rejects.toThrow(
      "Cannot delete completed or failed sessions"
    );
  });

  it("should throw 403 when trying to delete failed session", async () => {
    const mockSession = {
      id: "test-session-id",
      user_id: "test-user-id",
      status: "failed",
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

    await expect(deleteSession({ supabase: mockSupabase }, "test-user-id", "test-session-id")).rejects.toThrow(
      "Cannot delete completed or failed sessions"
    );
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

    await expect(deleteSession({ supabase: mockSupabase }, "test-user-id", "test-session-id")).rejects.toThrow(
      "Session not found"
    );
  });
});
