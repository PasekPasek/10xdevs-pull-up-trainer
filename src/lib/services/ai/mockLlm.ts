/**
 * MOCK LLM SERVICE - Does NOT make real API calls to OpenRouter
 * This is a placeholder implementation for testing and development
 */

interface MockLlmRequest {
  maxPullups: number;
  model: string;
}

interface MockLlmResponse {
  sets: [number, number, number, number, number];
  comment: string;
  durationMs: number;
}

/**
 * Mock LLM generation service.
 * Generates deterministic training plans based on maxPullups.
 * DOES NOT call real OpenRouter API.
 */
export async function mockGenerateSession(request: MockLlmRequest): Promise<MockLlmResponse> {
  // Simulate network delay
  const startTime = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

  const { maxPullups } = request;

  // Generate progressive sets based on maxPullups
  // Strategy: Start at ~80% of max, decrease by 10-15% each set
  const set1 = Math.max(1, Math.floor(maxPullups * 0.8));
  const set2 = Math.max(1, Math.floor(maxPullups * 0.7));
  const set3 = Math.max(1, Math.floor(maxPullups * 0.65));
  const set4 = Math.max(1, Math.floor(maxPullups * 0.6));
  const set5 = Math.max(1, Math.floor(maxPullups * 0.55));

  // Generate contextual comment
  let comment = "";
  const totalReps = set1 + set2 + set3 + set4 + set5;

  if (maxPullups < 5) {
    comment = "Great start! Focus on maintaining proper form throughout each rep. Take 2-3 minutes rest between sets.";
  } else if (maxPullups < 10) {
    comment =
      "Solid foundation! You're progressing well. Remember to engage your core and control the descent. Rest 90-120 seconds between sets.";
  } else if (maxPullups < 15) {
    comment =
      "Excellent progress! You're hitting intermediate volume. Focus on explosive pull-ups and controlled negatives. Rest 60-90 seconds between sets.";
  } else if (maxPullups < 20) {
    comment =
      "Advanced level! Mix tempo variations and consider weighted pull-ups for continued growth. Rest 60 seconds between sets.";
  } else {
    comment =
      "Elite performance! Consider periodization and weighted progressions. Your volume tolerance is exceptional. Rest 45-60 seconds between sets.";
  }

  comment += ` Total volume: ${totalReps} reps. Aim to complete this within 15-20 minutes.`;

  const durationMs = Date.now() - startTime;

  return {
    sets: [set1, set2, set3, set4, set5],
    comment,
    durationMs,
  };
}

/**
 * Simulate potential LLM failures for testing.
 * Randomly fails ~5% of the time to test error handling.
 */
export async function mockGenerateSessionWithFailures(request: MockLlmRequest): Promise<MockLlmResponse> {
  // 5% chance of random failure
  if (Math.random() < 0.05) {
    throw new Error("MOCK_LLM_TIMEOUT: Simulated timeout error");
  }

  if (Math.random() < 0.03) {
    throw new Error("MOCK_LLM_INVALID_RESPONSE: Simulated invalid response error");
  }

  return mockGenerateSession(request);
}
