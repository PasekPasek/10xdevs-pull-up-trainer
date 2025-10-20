/**
 * Database cleanup helpers for E2E tests
 * Ensures test data is cleaned up after each test run
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const testUserId = process.env.E2E_USERNAME_ID!;

if (!supabaseUrl || !supabaseKey || !testUserId) {
  throw new Error("Missing required environment variables for E2E tests. Check .env.test file.");
}

/**
 * Create a Supabase client for cleanup operations
 * Uses service role to bypass RLS for cleanup
 */
export function createCleanupClient() {
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Delete all sessions created by the test user
 */
export async function cleanupTestSessions(userId: string = testUserId) {
  const client = createCleanupClient();

  const { error } = await client.from("sessions").delete().eq("user_id", userId);

  if (error) {
    console.error("Error cleaning up test sessions:", error);
    throw error;
  }
}

/**
 * Delete all events created by the test user
 */
export async function cleanupTestEvents(userId: string = testUserId) {
  const client = createCleanupClient();

  const { error } = await client.from("events").delete().eq("user_id", userId);

  if (error) {
    console.error("Error cleaning up test events:", error);
    throw error;
  }
}

/**
 * Delete all generations created by the test user
 */
export async function cleanupTestGenerations(userId: string = testUserId) {
  const client = createCleanupClient();

  const { error } = await client.from("generations").delete().eq("user_id", userId);

  if (error) {
    console.error("Error cleaning up test generations:", error);
    throw error;
  }
}

/**
 * Cleanup all test data for the test user
 * Deletes sessions, events, and generations
 */
export async function cleanupAllTestData(userId: string = testUserId) {
  // Delete in correct order due to foreign key constraints
  await cleanupTestGenerations(userId);
  await cleanupTestEvents(userId);
  await cleanupTestSessions(userId);
}

/**
 * Get test user credentials from environment
 */
export function getTestUserCredentials() {
  return {
    id: process.env.E2E_USERNAME_ID!,
    email: process.env.E2E_USERNAME!,
    password: process.env.E2E_PASSWORD!,
  };
}

/**
 * Create a test session via API
 * Returns the created session with its ID
 */
export async function createTestSession(
  token: string,
  data: {
    status: "planned" | "in_progress" | "completed" | "failed";
    sessionDate: string;
    sets: number[];
    notes?: string;
    rpe?: number;
  },
) {
  const response = await fetch(`${process.env.BASE_URL || "http://localhost:4321"}/api/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create test session: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
