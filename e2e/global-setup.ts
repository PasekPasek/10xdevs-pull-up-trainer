/* eslint-disable no-console */
import { config } from "dotenv";
import { cleanupUserSessions } from "./helpers/db-cleanup";
import { TEST_USER } from "./helpers/test-data";

// Load environment variables from .env.test
config({ path: ".env.test" });

/**
 * Global setup that runs once before all tests
 * Cleans up any leftover sessions from previous test runs
 */
async function globalSetup() {
  console.log("🧹 Running global setup - cleaning up test user sessions...");

  try {
    await cleanupUserSessions(TEST_USER.id, TEST_USER.email, TEST_USER.password);
    console.log("✅ Global setup completed successfully");
  } catch (error) {
    console.error("❌ Global setup failed:", error);
    // Don't throw - let tests proceed even if cleanup fails
    // Individual tests have their own beforeEach cleanup
  }
}

export default globalSetup;
