import { describe, expect, it } from "vitest";

import { __test as openRouterHelpers } from "./openrouter";

describe("openrouter helpers", () => {
  it("clamps max pullups to bounds", () => {
    expect(openRouterHelpers.MIN_REPS).toBe(1);
    expect(openRouterHelpers.MAX_REPS).toBe(60);
  });

  it("exposes constants for prompt validation", () => {
    expect(openRouterHelpers.SETS_REQUIRED).toBe(5);
    expect(openRouterHelpers.MIN_COMMENT_LENGTH).toBeGreaterThan(0);
    expect(openRouterHelpers.MAX_COMMENT_LENGTH).toBeGreaterThan(openRouterHelpers.MIN_COMMENT_LENGTH);
  });
});

