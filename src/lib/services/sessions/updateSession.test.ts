import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import { updateSession } from "./updateSession";

describe("updateSession", () => {
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn(),
      },
    } as unknown as SupabaseClient<Database>;
  });

  it("should update planned session successfully", async () => {
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

    const updatedSession = {
      ...mockSession,
      set_1: 12,
      set_2: 10,
      total_reps: 40,
      updated_at: "2025-10-11T17:00:00Z",
    };

    const singleMock = vi.fn().mockResolvedValue({ data: updatedSession, error: null });
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

    const result = await updateSession(
      { supabase: mockSupabase },
      "test-user-id",
      "test-session-id",
      { sets: [12, 10, 8, 7, 6] },
      "2025-10-11T16:00:00Z"
    );

    expect(result.set_1).toBe(12);
    expect(result.set_2).toBe(10);
    expect(result.total_reps).toBe(40);
    expect(updateMock).toHaveBeenCalled();
  });

  it("should throw 409 on optimistic lock failure", async () => {
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
      updated_at: "2025-10-11T17:00:00Z", // Different from provided
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
      updateSession(
        { supabase: mockSupabase },
        "test-user-id",
        "test-session-id",
        { sets: [12, 10, 8, 7, 6] },
        "2025-10-11T16:00:00Z" // Old timestamp
      )
    ).rejects.toThrow("Session has been modified by another request");
  });

  it("should throw 422 when trying to update completed session", async () => {
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

    await expect(
      updateSession(
        { supabase: mockSupabase },
        "test-user-id",
        "test-session-id",
        { sets: [12, 10, 8, 7, 6] },
        "2025-10-11T16:00:00Z"
      )
    ).rejects.toThrow("Cannot edit completed or failed sessions");
  });

  it("should mark AI session as modified when sets change", async () => {
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
      is_ai_generated: true,
      is_modified: false,
      ai_comment: "AI suggested plan",
      created_at: "2025-10-11T16:00:00Z",
      updated_at: "2025-10-11T16:00:00Z",
    };

    const updatedSession = {
      ...mockSession,
      set_1: 12,
      total_reps: 41,
      is_modified: true,
      updated_at: "2025-10-11T17:00:00Z",
    };

    const singleMock = vi.fn().mockResolvedValue({ data: updatedSession, error: null });
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

    const result = await updateSession(
      { supabase: mockSupabase },
      "test-user-id",
      "test-session-id",
      { sets: [12, 8, 8, 7, 6] },
      "2025-10-11T16:00:00Z"
    );

    expect(result.is_modified).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        is_modified: true,
      })
    );
  });

  it("should throw 400 when trying to set aiComment on non-AI session", async () => {
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
      updateSession(
        { supabase: mockSupabase },
        "test-user-id",
        "test-session-id",
        { aiComment: "Custom comment" },
        "2025-10-11T16:00:00Z"
      )
    ).rejects.toThrow("Cannot set aiComment on non-AI-generated sessions");
  });
});
