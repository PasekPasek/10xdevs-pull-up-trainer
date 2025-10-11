import { describe, expect, it } from "vitest";

import { mockGenerateSession } from "./mockLlm";

describe("mockLlm", () => {
  it("should generate valid session for beginner (maxPullups < 5)", async () => {
    const result = await mockGenerateSession({ maxPullups: 3, model: "gpt-4o-mini" });

    expect(result.sets).toHaveLength(5);
    expect(result.sets.every((s) => s >= 1 && s <= 60)).toBe(true);
    expect(result.comment).toContain("Great start");
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it("should generate valid session for intermediate (maxPullups 10-15)", async () => {
    const result = await mockGenerateSession({ maxPullups: 12, model: "gpt-4o-mini" });

    expect(result.sets).toHaveLength(5);
    expect(result.sets.every((s) => s >= 1 && s <= 60)).toBe(true);
    expect(result.comment).toContain("Excellent progress");
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it("should generate valid session for advanced (maxPullups 15-20)", async () => {
    const result = await mockGenerateSession({ maxPullups: 18, model: "gpt-4o-mini" });

    expect(result.sets).toHaveLength(5);
    expect(result.sets.every((s) => s >= 1 && s <= 60)).toBe(true);
    expect(result.comment).toContain("Advanced level");
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it("should generate valid session for elite (maxPullups >= 20)", async () => {
    const result = await mockGenerateSession({ maxPullups: 25, model: "gpt-4o-mini" });

    expect(result.sets).toHaveLength(5);
    expect(result.sets.every((s) => s >= 1 && s <= 60)).toBe(true);
    expect(result.comment).toContain("Elite performance");
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it("should generate progressive sets (descending reps)", async () => {
    const result = await mockGenerateSession({ maxPullups: 20, model: "gpt-4o-mini" });

    // Each set should be less than or equal to the previous
    for (let i = 1; i < result.sets.length; i++) {
      expect(result.sets[i]).toBeLessThanOrEqual(result.sets[i - 1]);
    }
  });

  it("should include total reps in comment", async () => {
    const result = await mockGenerateSession({ maxPullups: 15, model: "gpt-4o-mini" });

    const totalReps = result.sets.reduce((sum, reps) => sum + reps, 0);
    expect(result.comment).toContain(`Total volume: ${totalReps} reps`);
  });

  it("should simulate realistic duration (1-3 seconds)", async () => {
    const result = await mockGenerateSession({ maxPullups: 10, model: "gpt-4o-mini" });

    expect(result.durationMs).toBeGreaterThanOrEqual(1000);
    expect(result.durationMs).toBeLessThanOrEqual(3500);
  });
});
