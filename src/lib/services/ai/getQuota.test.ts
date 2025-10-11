import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import { getQuota } from "./getQuota";

describe("getQuota", () => {
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient<Database>;
  });

  it("should return full quota when no generations exist", async () => {
    // First query: count successful generations
    const gteMock1 = vi.fn().mockResolvedValue({ count: 0, error: null });
    const eqMock2_1 = vi.fn().mockReturnValue({ gte: gteMock1 });
    const eqMock1_1 = vi.fn().mockReturnValue({ eq: eqMock2_1 });
    const selectMock1 = vi.fn().mockReturnValue({ eq: eqMock1_1 });

    // Second query: find earliest generation
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const limitMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const gteMock2 = vi.fn().mockReturnValue({ order: orderMock });
    const eqMock2_2 = vi.fn().mockReturnValue({ gte: gteMock2 });
    const eqMock1_2 = vi.fn().mockReturnValue({ eq: eqMock2_2 });
    const selectMock2 = vi.fn().mockReturnValue({ eq: eqMock1_2 });

    let callCount = 0;
    mockSupabase.from = vi.fn(() => {
      callCount++;
      return {
        select: callCount === 1 ? selectMock1 : selectMock2,
      };
    }) as unknown as typeof mockSupabase.from;

    const result = await getQuota({ supabase: mockSupabase }, "test-user-id");

    expect(result.remaining).toBe(5);
    expect(result.limit).toBe(5);
    expect(result.nextWindowSeconds).toBeGreaterThan(0);
  });

  it("should return reduced quota when generations exist", async () => {
    // First query: count successful generations (3 used)
    const gteMock1 = vi.fn().mockResolvedValue({ count: 3, error: null });
    const eqMock2_1 = vi.fn().mockReturnValue({ gte: gteMock1 });
    const eqMock1_1 = vi.fn().mockReturnValue({ eq: eqMock2_1 });
    const selectMock1 = vi.fn().mockReturnValue({ eq: eqMock1_1 });

    // Second query: find earliest generation
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const limitMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const gteMock2 = vi.fn().mockReturnValue({ order: orderMock });
    const eqMock2_2 = vi.fn().mockReturnValue({ gte: gteMock2 });
    const eqMock1_2 = vi.fn().mockReturnValue({ eq: eqMock2_2 });
    const selectMock2 = vi.fn().mockReturnValue({ eq: eqMock1_2 });

    let callCount = 0;
    mockSupabase.from = vi.fn(() => {
      callCount++;
      return {
        select: callCount === 1 ? selectMock1 : selectMock2,
      };
    }) as unknown as typeof mockSupabase.from;

    const result = await getQuota({ supabase: mockSupabase }, "test-user-id");

    expect(result.remaining).toBe(2); // 5 - 3
    expect(result.limit).toBe(5);
  });

  it("should return zero quota when limit reached", async () => {
    // First query: count successful generations (5 used - at limit)
    const gteMock1 = vi.fn().mockResolvedValue({ count: 5, error: null });
    const eqMock2_1 = vi.fn().mockReturnValue({ gte: gteMock1 });
    const eqMock1_1 = vi.fn().mockReturnValue({ eq: eqMock2_1 });
    const selectMock1 = vi.fn().mockReturnValue({ eq: eqMock1_1 });

    // Second query: find earliest generation (23 hours ago)
    const earliestDate = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: { created_at: earliestDate },
      error: null,
    });
    const limitMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const gteMock2 = vi.fn().mockReturnValue({ order: orderMock });
    const eqMock2_2 = vi.fn().mockReturnValue({ gte: gteMock2 });
    const eqMock1_2 = vi.fn().mockReturnValue({ eq: eqMock2_2 });
    const selectMock2 = vi.fn().mockReturnValue({ eq: eqMock1_2 });

    let callCount = 0;
    mockSupabase.from = vi.fn(() => {
      callCount++;
      return {
        select: callCount === 1 ? selectMock1 : selectMock2,
      };
    }) as unknown as typeof mockSupabase.from;

    const result = await getQuota({ supabase: mockSupabase }, "test-user-id");

    expect(result.remaining).toBe(0);
    expect(result.limit).toBe(5);
    expect(result.nextWindowSeconds).toBeLessThan(24 * 3600);
    expect(result.nextWindowSeconds).toBeGreaterThan(0);
  });
});
