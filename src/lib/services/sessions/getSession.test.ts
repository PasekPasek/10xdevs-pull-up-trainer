import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import { getSession } from "./getSession";

describe("getSession", () => {
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
      })),
    } as unknown as SupabaseClient<Database>;
  });

  it("should return session when found", async () => {
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

    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: mockSession,
      error: null,
    });

    mockSupabase.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: maybeSingleMock,
          })),
        })),
      })),
    })) as unknown as typeof mockSupabase.from;

    const result = await getSession({ supabase: mockSupabase }, "test-user-id", "test-session-id");

    expect(result).toEqual(mockSession);
    expect(mockSupabase.from).toHaveBeenCalledWith("sessions");
  });

  it("should throw 404 when session not found", async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    mockSupabase.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: maybeSingleMock,
          })),
        })),
      })),
    })) as unknown as typeof mockSupabase.from;

    await expect(getSession({ supabase: mockSupabase }, "test-user-id", "test-session-id")).rejects.toThrow(
      "Session not found"
    );
  });

  it("should throw 500 on database error", async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Database connection failed" },
    });

    mockSupabase.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: maybeSingleMock,
          })),
        })),
      })),
    })) as unknown as typeof mockSupabase.from;

    await expect(getSession({ supabase: mockSupabase }, "test-user-id", "test-session-id")).rejects.toThrow(
      "Failed to fetch session"
    );
  });
});
