/**
 * E2E Tests for Dashboard and Session CRUD
 * Tests session management, state transitions, and UI interactions
 */

import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { getTestUserCredentials, cleanupAllTestData, createTestSession } from "./helpers/db-cleanup";
import { loginViaUI } from "./helpers/auth";

test.describe("Dashboard - Session Management", () => {
  const testUser = getTestUserCredentials();
  let authToken: string;

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginViaUI(page, testUser.email, testUser.password);

    // Get auth token for API calls
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c) => c.name.includes("sb-") || c.name.includes("auth"));
    authToken = authCookie?.value || "";
  });

  test.afterEach(async () => {
    // Clean up test data
    await cleanupAllTestData();
  });

  test("should display empty dashboard when no sessions exist", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();

    // Should not have active or completed sessions
    const hasActive = await dashboardPage.hasActiveSession();
    const hasCompleted = await dashboardPage.hasCompletedSession();

    expect(hasActive).toBe(false);
    expect(hasCompleted).toBe(false);

    // Should show create buttons
    await expect(dashboardPage.createManualButton).toBeVisible();
  });

  test("should display active planned session", async ({ page, request }) => {
    // Create a planned session via API
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "planned",
        sessionDate: tomorrow.toISOString(),
        sets: [10, 8, 8, 7, 6],
        notes: "Test planned session",
      },
    });

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Should display active session
    const hasActive = await dashboardPage.hasActiveSession();
    expect(hasActive).toBe(true);

    // Should show start button
    await expect(dashboardPage.startSessionButton).toBeVisible();
  });

  test("should start a planned session", async ({ page, request }) => {
    // Create a planned session
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "planned",
        sessionDate: tomorrow.toISOString(),
        sets: [10, 8, 8],
        notes: "Session to start",
      },
    });

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Click start button
    await dashboardPage.clickStartSession();

    // Wait for page to update
    await page.waitForTimeout(1000);

    // Complete button should now be visible
    await expect(dashboardPage.completeSessionButton).toBeVisible();
  });

  test("should complete an in-progress session", async ({ page, request }) => {
    // Create an in-progress session
    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "in_progress",
        sessionDate: new Date().toISOString(),
        sets: [10, 8, 8],
        notes: "Session to complete",
      },
    });

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Click complete button
    await dashboardPage.clickCompleteSession();

    // Fill complete dialog
    await dashboardPage.fillCompleteDialog(8, "Great session!");

    // Wait for completion
    await page.waitForTimeout(1000);

    // Should show in last completed card
    const hasCompleted = await dashboardPage.hasCompletedSession();
    expect(hasCompleted).toBe(true);
  });

  test("should fail an in-progress session", async ({ page, request }) => {
    // Create an in-progress session
    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "in_progress",
        sessionDate: new Date().toISOString(),
        sets: [10, 8, 8],
        notes: "Session to fail",
      },
    });

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Click fail button
    await dashboardPage.clickFailSession();

    // Confirm action
    await dashboardPage.confirmAction();

    // Wait for action to complete
    await page.waitForTimeout(1000);

    // Active session should be gone
    const hasActive = await dashboardPage.hasActiveSession();
    expect(hasActive).toBe(false);
  });

  test("should delete a session", async ({ page, request }) => {
    // Create a planned session
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "planned",
        sessionDate: tomorrow.toISOString(),
        sets: [10, 8, 8],
        notes: "Session to delete",
      },
    });

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Click delete button
    await dashboardPage.clickDeleteSession();

    // Confirm deletion
    await dashboardPage.confirmAction();

    // Wait for deletion
    await page.waitForTimeout(1000);

    // Session should be gone
    const hasActive = await dashboardPage.hasActiveSession();
    expect(hasActive).toBe(false);
  });

  test("should edit a session", async ({ page, request }) => {
    // Create a planned session
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "planned",
        sessionDate: tomorrow.toISOString(),
        sets: [10, 8, 8],
        notes: "Original notes",
      },
    });

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Click edit button
    await dashboardPage.clickEditSession();

    // Edit the session
    await dashboardPage.fillEditDialog([12, 10, 9], "Updated notes");

    // Wait for update
    await page.waitForTimeout(1000);

    // Verify changes (would need to check the UI or make API call)
    await dashboardPage.expectSuccessToast();
  });

  test("should display AI quota badge", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // AI quota badge should be visible
    await expect(dashboardPage.aiQuotaBadge).toBeVisible();

    // Get quota text
    const quotaText = await dashboardPage.getAIQuotaText();
    expect(quotaText).toBeTruthy();
  });

  test("should prevent invalid state transitions", async ({ page, request }) => {
    // Create a completed session
    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "completed",
        sessionDate: new Date().toISOString(),
        sets: [10, 8, 8],
        rpe: 8,
        notes: "Already completed",
      },
    });

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Should NOT show action buttons for completed session in active card
    // (completed sessions should only appear in last completed card)
    const hasActive = await dashboardPage.hasActiveSession();
    expect(hasActive).toBe(false);

    const hasCompleted = await dashboardPage.hasCompletedSession();
    expect(hasCompleted).toBe(true);
  });

  test("should display last completed session", async ({ page, request }) => {
    // Create a completed session
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "completed",
        sessionDate: yesterday.toISOString(),
        sets: [10, 9, 8, 7],
        rpe: 7,
        notes: "Yesterday's session",
      },
    });

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Should show in last completed card
    const hasCompleted = await dashboardPage.hasCompletedSession();
    expect(hasCompleted).toBe(true);
  });

  test("should handle session creation from manual button", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Click create manual session
    await dashboardPage.clickCreateManual();

    // Should navigate to session creation page or open modal
    // Wait for URL change or modal to appear
    await page.waitForTimeout(1000);

    // Check if we navigated to /sessions/new or modal appeared
    const url = page.url();
    const hasModal = await page.locator('[role="dialog"]').count();

    expect(url.includes("/sessions/new") || hasModal > 0).toBe(true);
  });
});
