/**
 * E2E Tests for Manual Session Creation
 * Tests creating sessions manually through the UI
 */

import { test, expect } from "@playwright/test";
import { getTestUserCredentials, cleanupAllTestData } from "./helpers/db-cleanup";
import { loginViaUI } from "./helpers/auth";

test.describe("Sessions - Manual Creation", () => {
  const testUser = getTestUserCredentials();

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginViaUI(page, testUser.email, testUser.password);
  });

  test.afterEach(async () => {
    // Clean up test data
    await cleanupAllTestData();
  });

  test("should navigate to session creation form from dashboard", async ({ page }) => {
    // From dashboard, click "Create Manual Session" button
    await page.click('[data-testid="create-manual-session"]');

    // Should navigate to /sessions/new
    await expect(page).toHaveURL(/\/sessions\/new/);
  });

  test("should create a planned session with future date", async ({ page }) => {
    // Navigate to session creation form
    await page.goto("/sessions/new");

    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Fill in session details
    await page.fill('[data-testid="session-date-input"]', tomorrowStr);
    await page.selectOption('[data-testid="session-status-select"]', "planned");

    // Add sets
    await page.fill('[data-testid="set-input-0"]', "10");
    await page.fill('[data-testid="set-input-1"]', "8");
    await page.fill('[data-testid="set-input-2"]', "8");

    // Add notes (optional)
    await page.fill('[data-testid="session-notes-input"]', "Test planned session");

    // Submit form
    await page.click('[data-testid="save-session"]');

    // Should redirect back to dashboard
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });

    // Should show success message
    await expect(page.locator("text=/session created|success/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should create a completed session with RPE", async ({ page }) => {
    // Navigate to session creation form
    await page.goto("/sessions/new");

    // Use today's date
    const today = new Date().toISOString().split("T")[0];

    // Fill in session details
    await page.fill('[data-testid="session-date-input"]', today);
    await page.selectOption('[data-testid="session-status-select"]', "completed");

    // Add sets
    await page.fill('[data-testid="set-input-0"]', "12");
    await page.fill('[data-testid="set-input-1"]', "10");
    await page.fill('[data-testid="set-input-2"]', "9");
    await page.fill('[data-testid="set-input-3"]', "8");

    // For completed session, RPE is required
    await page.fill('[data-testid="session-rpe-input"]', "7");

    // Add notes
    await page.fill('[data-testid="session-notes-input"]', "Great workout!");

    // Submit form
    await page.click('[data-testid="save-session"]');

    // Should redirect back to dashboard
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
  });

  test("should validate required fields", async ({ page }) => {
    // Navigate to session creation form
    await page.goto("/sessions/new");

    // Try to submit without filling anything
    await page.click('[data-testid="save-session"]');

    // Should show validation errors
    await expect(page.locator("text=/required|must be/i").first()).toBeVisible();

    // Should stay on the same page
    await expect(page).toHaveURL(/\/sessions\/new/);
  });

  test("should require RPE for completed sessions", async ({ page }) => {
    // Navigate to session creation form
    await page.goto("/sessions/new");

    const today = new Date().toISOString().split("T")[0];

    // Fill in session as completed but without RPE
    await page.fill('[data-testid="session-date-input"]', today);
    await page.selectOption('[data-testid="session-status-select"]', "completed");
    await page.fill('[data-testid="set-input-0"]', "10");

    // Try to submit
    await page.click('[data-testid="save-session"]');

    // Should show RPE required error
    await expect(page.locator("text=/rpe.*required/i")).toBeVisible();
  });

  test("should add and remove sets dynamically", async ({ page }) => {
    // Navigate to session creation form
    await page.goto("/sessions/new");

    // Initially should have some set inputs
    await expect(page.locator('[data-testid="set-input-0"]')).toBeVisible();

    // Click "Add Set" button
    await page.click('[data-testid="add-set-button"]');

    // Should have more set inputs
    await expect(page.locator('[data-testid="set-input-4"]')).toBeVisible();

    // Remove a set
    await page.click('[data-testid="remove-set-3"]');

    // Set should be removed
    await expect(page.locator('[data-testid="set-input-4"]')).not.toBeVisible();
  });

  test("should cancel session creation and return to dashboard", async ({ page }) => {
    // Navigate to session creation form
    await page.goto("/sessions/new");

    // Click cancel button
    await page.click('[data-testid="cancel-session"]');

    // Should redirect back to dashboard
    await expect(page).toHaveURL("/dashboard");
  });

  test("should create session with start now option", async ({ page }) => {
    // Navigate to session creation form
    await page.goto("/sessions/new");

    const today = new Date().toISOString().split("T")[0];

    // Fill in session details
    await page.fill('[data-testid="session-date-input"]', today);
    await page.selectOption('[data-testid="session-status-select"]', "planned");

    // Add sets
    await page.fill('[data-testid="set-input-0"]', "10");
    await page.fill('[data-testid="set-input-1"]', "8");
    await page.fill('[data-testid="set-input-2"]', "8");

    // Check "Start Now" checkbox
    await page.check('[data-testid="start-now-checkbox"]');

    // Submit form
    await page.click('[data-testid="save-session"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });

    // Session should be in "in_progress" status on dashboard
    await expect(page.locator('[data-testid="active-session-card"]')).toBeVisible();
    await expect(page.locator("text=/in progress/i")).toBeVisible();
  });

  test("should show total reps calculation", async ({ page }) => {
    // Navigate to session creation form
    await page.goto("/sessions/new");

    // Add sets
    await page.fill('[data-testid="set-input-0"]', "10");
    await page.fill('[data-testid="set-input-1"]', "8");
    await page.fill('[data-testid="set-input-2"]', "7");

    // Should show total reps (10 + 8 + 7 = 25)
    await expect(page.locator('[data-testid="total-reps-display"]')).toContainText("25");
  });
});
