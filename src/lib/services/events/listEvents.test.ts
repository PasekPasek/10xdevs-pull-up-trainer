import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import { listEvents } from "./listEvents";

describe("listEvents", () => {
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient<Database>;
  });

  it("should list events with default pagination", async () => {
    const mockEvents = [
      {
        id: "event-1",
        user_id: "test-user-id",
        event_type: "session_created",
        event_data: { session_id: "session-1" },
        created_at: "2025-10-11T16:00:00Z",
      },
      {
        id: "event-2",
        user_id: "test-user-id",
        event_type: "session_started",
        event_data: { session_id: "session-1" },
        created_at: "2025-10-11T17:00:00Z",
      },
    ];

    const rangeMock = vi.fn().mockResolvedValue({ data: mockEvents, error: null, count: 2 });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    mockSupabase.from = vi.fn(() => ({
      select: selectMock,
    })) as unknown as typeof mockSupabase.from;

    const result = await listEvents({ supabase: mockSupabase }, "test-user-id", {});

    expect(result.events).toHaveLength(2);
    expect(result.events[0].eventType).toBe("session_created");
    expect(result.pagination.totalItems).toBe(2);
  });

  it("should filter events by type", async () => {
    const mockEvents = [
      {
        id: "event-1",
        user_id: "test-user-id",
        event_type: "session_created",
        event_data: { session_id: "session-1" },
        created_at: "2025-10-11T16:00:00Z",
      },
    ];

    let inCalled = false;
    const rangeMock = vi.fn().mockResolvedValue({ data: mockEvents, error: null, count: 1 });
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

    const result = await listEvents({ supabase: mockSupabase }, "test-user-id", {
      eventType: ["session_created"],
    });

    expect(inCalled).toBe(true);
    expect(result.events).toHaveLength(1);
  });

  it("should handle empty results", async () => {
    const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    mockSupabase.from = vi.fn(() => ({
      select: selectMock,
    })) as unknown as typeof mockSupabase.from;

    const result = await listEvents({ supabase: mockSupabase }, "test-user-id", {});

    expect(result.events).toHaveLength(0);
    expect(result.pagination.totalItems).toBe(0);
  });
});
