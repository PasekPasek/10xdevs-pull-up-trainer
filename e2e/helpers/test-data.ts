// Test user credentials from environment
export const TEST_USER = {
  id: process.env.E2E_USERNAME_ID ?? "",
  email: process.env.E2E_USERNAME ?? "",
  password: process.env.E2E_PASSWORD ?? "",
};

// Helper to generate test session data
export function generateTestSessionData(overrides?: { sets?: number[]; sessionDate?: string; status?: string }) {
  return {
    sets: overrides?.sets || [10, 12, 10, 10, 11],
    sessionDate: overrides?.sessionDate || new Date().toISOString().split("T")[0],
    status: overrides?.status || "planned",
  };
}

// Get today's date in local format (YYYY-MM-DD)
export function getTodayLocalDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
