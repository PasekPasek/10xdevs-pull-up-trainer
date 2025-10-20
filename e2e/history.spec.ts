/**
 * E2E Tests for History Page
 * Tests session history viewing, filtering, and pagination
 */

import { test, expect } from "@playwright/test";
import { HistoryPage } from "./pages/HistoryPage";
import { getTestUserCredentials, cleanupAllTestData } from "./helpers/db-cleanup";
import { loginViaUI } from "./helpers/auth";

test.describe("History - Session Viewing and Filtering", () => {
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

  test("should display empty state when no sessions exist", async ({ page }) => {
    const historyPage = new HistoryPage(page);
    await historyPage.goto();

    // Should show empty state
    await historyPage.expectEmptyState();
  });

  test("should display list of sessions", async ({ page, request }) => {
    // Create multiple sessions via API
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Create sessions with different statuses
    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "completed",
        sessionDate: yesterday.toISOString(),
        sets: [10, 8, 8],
        rpe: 7,
        notes: "Session 1",
      },
    });

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "completed",
        sessionDate: twoDaysAgo.toISOString(),
        sets: [9, 8, 7],
        rpe: 8,
        notes: "Session 2",
      },
    });

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "planned",
        sessionDate: today.toISOString(),
        sets: [10, 10, 9],
        notes: "Planned session",
      },
    });

    const historyPage = new HistoryPage(page);
    await historyPage.goto();

    // Should show sessions
    await historyPage.expectSessionsVisible();

    // Should have at least 3 sessions
    const count = await historyPage.getSessionCount();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("should filter sessions by status - completed", async ({ page, request }) => {
    // Create sessions with different statuses
    const today = new Date();

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "completed",
        sessionDate: today.toISOString(),
        sets: [10, 8, 8],
        rpe: 7,
      },
    });

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "planned",
        sessionDate: today.toISOString(),
        sets: [10, 10, 9],
      },
    });

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "failed",
        sessionDate: today.toISOString(),
        sets: [5, 4],
      },
    });

    const historyPage = new HistoryPage(page);
    await historyPage.goto();

    // Initial count should be 3
    let count = await historyPage.getSessionCount();
    expect(count).toBe(3);

    // Filter by completed
    await historyPage.filterByStatus("completed");

    // Should only show completed sessions
    count = await historyPage.getSessionCount();
    expect(count).toBe(1);
  });

  test("should filter sessions by status - planned", async ({ page, request }) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create planned and completed sessions
    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "planned",
        sessionDate: tomorrow.toISOString(),
        sets: [10, 10, 9],
      },
    });

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "planned",
        sessionDate: today.toISOString(),
        sets: [8, 8, 7],
      },
    });

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "completed",
        sessionDate: today.toISOString(),
        sets: [10, 8, 8],
        rpe: 7,
      },
    });

    const historyPage = new HistoryPage(page);
    await historyPage.goto();

    // Filter by planned
    await historyPage.filterByStatus("planned");

    // Should only show planned sessions
    const count = await historyPage.getSessionCount();
    expect(count).toBe(2);
  });

  test("should filter sessions by date range", async ({ page, request }) => {
    // Create sessions on different dates
    const today = new Date();
    const fiveDaysAgo = new Date(today);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const tenDaysAgo = new Date(today);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "completed",
        sessionDate: today.toISOString(),
        sets: [10, 8, 8],
        rpe: 7,
      },
    });

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "completed",
        sessionDate: fiveDaysAgo.toISOString(),
        sets: [9, 8, 7],
        rpe: 8,
      },
    });

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "completed",
        sessionDate: tenDaysAgo.toISOString(),
        sets: [8, 7, 6],
        rpe: 6,
      },
    });

    const historyPage = new HistoryPage(page);
    await historyPage.goto();

    // Filter to last 7 days
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await historyPage.filterByDateRange(sevenDaysAgo.toISOString().split("T")[0], today.toISOString().split("T")[0]);

    // Should only show sessions from last 7 days (2 sessions)
    const count = await historyPage.getSessionCount();
    expect(count).toBe(2);
  });

  test("should clear filters", async ({ page, request }) => {
    // Create sessions
    const today = new Date();

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "completed",
        sessionDate: today.toISOString(),
        sets: [10, 8, 8],
        rpe: 7,
      },
    });

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "planned",
        sessionDate: today.toISOString(),
        sets: [10, 10, 9],
      },
    });

    const historyPage = new HistoryPage(page);
    await historyPage.goto();

    // Initial count
    const initialCount = await historyPage.getSessionCount();

    // Apply filter
    await historyPage.filterByStatus("completed");

    // Count should be less
    let filteredCount = await historyPage.getSessionCount();
    expect(filteredCount).toBeLessThan(initialCount);

    // Clear filters
    await historyPage.clearFilters();

    // Count should return to initial
    const clearedCount = await historyPage.getSessionCount();
    expect(clearedCount).toBe(initialCount);
  });

  test("should paginate through sessions", async ({ page, request }) => {
    // Create more than one page of sessions (assuming pageSize is 10-20)
    const today = new Date();

    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      await request.post("/api/sessions", {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          status: "completed",
          sessionDate: date.toISOString(),
          sets: [10, 8, 8],
          rpe: 7,
          notes: `Session ${i}`,
        },
      });
    }

    const historyPage = new HistoryPage(page);
    await historyPage.goto();

    // Get first page count
    const firstPageCount = await historyPage.getSessionCount();

    // Check if pagination next button exists and is enabled
    const hasNextButton = await historyPage.paginationNext.isVisible();

    if (hasNextButton) {
      // Click next page
      await historyPage.clickNextPage();

      // Should show different sessions (possibly fewer on last page)
      const secondPageCount = await historyPage.getSessionCount();
      expect(secondPageCount).toBeGreaterThan(0);

      // Click previous page
      await historyPage.clickPrevPage();

      // Should return to first page
      const backToFirstCount = await historyPage.getSessionCount();
      expect(backToFirstCount).toBe(firstPageCount);
    }
  });

  test("should display session details when clicked", async ({ page, request }) => {
    // Create a session
    const today = new Date();

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "completed",
        sessionDate: today.toISOString(),
        sets: [10, 8, 8],
        rpe: 7,
        notes: "Test session details",
      },
    });

    const historyPage = new HistoryPage(page);
    await historyPage.goto();

    // Click first session
    await historyPage.clickSession(0);

    // Should navigate to session detail page or show modal
    await page.waitForTimeout(1000);

    const url = page.url();
    const hasModal = await page.locator('[role="dialog"]').count();

    expect(url.includes("/sessions/") || hasModal > 0).toBe(true);
  });

  test("should handle empty results after filtering", async ({ page, request }) => {
    // Create only completed sessions
    const today = new Date();

    await request.post("/api/sessions", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "completed",
        sessionDate: today.toISOString(),
        sets: [10, 8, 8],
        rpe: 7,
      },
    });

    const historyPage = new HistoryPage(page);
    await historyPage.goto();

    // Filter by a status that doesn't exist
    await historyPage.filterByStatus("failed");

    // Should show empty state or no results message
    const count = await historyPage.getSessionCount();
    expect(count).toBe(0);
  });
});
