import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import { listSessions } from "./listSessions";

describe("listSessions", () => {
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient<Database>;
  });

  it("should list sessions with default pagination", async () => {
    const mockSessions = [
      {
        id: "session-1",
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
      },
      {
        id: "session-2",
        user_id: "test-user-id",
        status: "planned",
        session_date: "2025-10-16T10:00:00Z",
        set_1: 12,
        set_2: 10,
        set_3: null,
        set_4: null,
        set_5: null,
        total_reps: 22,
        rpe: null,
        is_ai_generated: false,
        is_modified: false,
        ai_comment: null,
        created_at: "2025-10-12T16:00:00Z",
        updated_at: "2025-10-12T16:00:00Z",
      },
    ];

    const rangeMock = vi.fn().mockResolvedValue({ data: mockSessions, error: null, count: 2 });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    mockSupabase.from = vi.fn(() => ({
      select: selectMock,
    })) as unknown as typeof mockSupabase.from;

    const result = await listSessions({ supabase: mockSupabase }, "test-user-id", {});

    expect(result.sessions).toHaveLength(2);
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 10,
      totalPages: 1,
      totalItems: 2,
    });
    expect(selectMock).toHaveBeenCalledWith("*", { count: "exact" });
  });

  it("should filter sessions by status", async () => {
    const mockSessions = [
      {
        id: "session-1",
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
      },
    ];

    let inCalled = false;
    const rangeMock = vi.fn().mockResolvedValue({ data: mockSessions, error: null, count: 1 });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const inMock = vi.fn(() => {
      inCalled = true;
      return { order: orderMock };
    });
    const eqMock = vi.fn().mockReturnValue({ in: inMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    mockSupabase.from = vi.fn(() => ({
      select: selectMock,
    })) as unknown as typeof mockSupabase.from;

    const result = await listSessions({ supabase: mockSupabase }, "test-user-id", {
      status: ["completed"],
    });

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].status).toBe("completed");
    expect(inCalled).toBe(true);
    expect(result.filters.status).toEqual(["completed"]);
  });

  it("should filter sessions by date range", async () => {
    const mockSessions = [
      {
        id: "session-1",
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
      },
    ];

    let gteCalled = false;
    let lteCalled = false;
    const rangeMock = vi.fn().mockResolvedValue({ data: mockSessions, error: null, count: 1 });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const lteMock = vi.fn(() => {
      lteCalled = true;
      return { order: orderMock };
    });
    const gteMock = vi.fn(() => {
      gteCalled = true;
      return { lte: lteMock };
    });
    const eqMock = vi.fn().mockReturnValue({ gte: gteMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    mockSupabase.from = vi.fn(() => ({
      select: selectMock,
    })) as unknown as typeof mockSupabase.from;

    const result = await listSessions({ supabase: mockSupabase }, "test-user-id", {
      dateFrom: "2025-10-01T00:00:00Z",
      dateTo: "2025-10-31T23:59:59Z",
    });

    expect(gteCalled).toBe(true);
    expect(lteCalled).toBe(true);
    expect(result.sessions).toHaveLength(1);
  });

  it("should apply custom pagination", async () => {
    const mockSessions = [
      {
        id: "session-1",
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
      },
    ];

    const rangeMock = vi.fn().mockResolvedValue({ data: mockSessions, error: null, count: 25 });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    mockSupabase.from = vi.fn(() => ({
      select: selectMock,
    })) as unknown as typeof mockSupabase.from;

    const result = await listSessions({ supabase: mockSupabase }, "test-user-id", {
      page: 2,
      pageSize: 5,
    });

    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 5,
      totalPages: 5,
      totalItems: 25,
    });
    expect(rangeMock).toHaveBeenCalledWith(5, 9); // page 2, size 5 = offset 5-9
  });

  it("should handle empty results", async () => {
    const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    mockSupabase.from = vi.fn(() => ({
      select: selectMock,
    })) as unknown as typeof mockSupabase.from;

    const result = await listSessions({ supabase: mockSupabase }, "test-user-id", {});

    expect(result.sessions).toHaveLength(0);
    expect(result.pagination.totalItems).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });
});
