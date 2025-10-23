import { test, expect } from "@playwright/test";
import { HistoryPage } from "./pages/HistoryPage";
import { ManualSessionPage } from "./pages/ManualSessionPage";
import { TEST_USER } from "./helpers/test-data";
import { login } from "./helpers/auth";
import { cleanupUserSessions } from "./helpers/db-cleanup";

test.describe.configure({ mode: "serial" });

test.describe("History View", () => {
  test.beforeEach(async ({ page }) => {
    // Cleanup before each test to ensure clean state
    await cleanupUserSessions(TEST_USER.id, TEST_USER.email, TEST_USER.password);

    // Login before each test
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test.afterEach(async () => {
    // Cleanup sessions after each test
    await cleanupUserSessions(TEST_USER.id, TEST_USER.email, TEST_USER.password);
  });

  test("should navigate to history page and display heading", async ({ page }) => {
    const historyPage = new HistoryPage(page);

    await historyPage.goto();
    await historyPage.waitForLoad();

    // Verify heading is visible
    await expect(historyPage.heading).toBeVisible();
  });

  test("should display list of sessions", async ({ page }) => {
    const manualSessionPage = new ManualSessionPage(page);

    // Create 3 sessions with different dates using UTC to avoid timezone issues
    const today = new Date();
    const yesterday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1));
    const twoDaysAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 2));

    const todayDate = today.toISOString().split("T")[0];
    const yesterdayDate = yesterday.toISOString().split("T")[0];
    const twoDaysAgoDate = twoDaysAgo.toISOString().split("T")[0];

    // Create today's session (planned)
    await manualSessionPage.goto();
    await manualSessionPage.createSession(todayDate, [10, 12, 10, 10, 11]);

    // Create yesterday's session (completed)
    await manualSessionPage.goto();
    await manualSessionPage.fillDate(yesterdayDate);
    await manualSessionPage.fillAllSets([15, 12, 10, 8, 10]);

    // Wait for form to react to date change
    await page.waitForTimeout(500);

    // For past dates, select completed status
    const statusSelect = page.locator("#status");
    await statusSelect.waitFor({ state: "visible", timeout: 5000 });
    await statusSelect.click();
    await page.locator('[role="option"]:has-text("Completed")').click();

    // Wait for status selection to be applied
    await page.waitForTimeout(300);

    // Check for and dismiss any validation warnings
    let ignoreRestWarningCheckbox = page.locator('input[type="checkbox"]#ignoreRestWarning');
    if (await ignoreRestWarningCheckbox.isVisible().catch(() => false)) {
      await ignoreRestWarningCheckbox.check();
      await page.waitForTimeout(500);
    }

    await manualSessionPage.clickSubmit();
    await manualSessionPage.waitForRedirect();

    // Create session from 2 days ago (completed)
    await manualSessionPage.goto();
    await manualSessionPage.fillDate(twoDaysAgoDate);
    await manualSessionPage.fillAllSets([12, 10, 9, 8, 8]);

    // Wait for form to react to date change
    await page.waitForTimeout(500);

    await statusSelect.waitFor({ state: "visible", timeout: 5000 });
    await statusSelect.click();
    await page.locator('[role="option"]:has-text("Completed")').click();

    // Wait for status selection to be applied
    await page.waitForTimeout(300);

    // Check for and dismiss any validation warnings
    ignoreRestWarningCheckbox = page.locator('input[type="checkbox"]#ignoreRestWarning');
    if (await ignoreRestWarningCheckbox.isVisible().catch(() => false)) {
      await ignoreRestWarningCheckbox.check();
      await page.waitForTimeout(500);
    }

    await manualSessionPage.clickSubmit();
    await manualSessionPage.waitForRedirect();

    // Navigate to history page
    const historyPage = new HistoryPage(page);
    await historyPage.goto();
    await historyPage.waitForLoad();

    // Verify 3 sessions are visible
    const sessionCount = await historyPage.getSessionCardsCount();
    expect(sessionCount).toBe(3);
  });

  test("should filter sessions by status", async ({ page }) => {
    const manualSessionPage = new ManualSessionPage(page);

    const today = new Date();

    // Create 1 planned session
    const futureDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 3));
    const futureDateStr = futureDate.toISOString().split("T")[0];

    await manualSessionPage.goto();
    await manualSessionPage.createSession(futureDateStr, [10, 10, 10, 10, 10]);

    // Create 2 completed sessions (past dates with completed status)
    for (let i = 1; i <= 2; i++) {
      const pastDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
      const pastDateStr = pastDate.toISOString().split("T")[0];

      await manualSessionPage.goto();
      await manualSessionPage.fillDate(pastDateStr);
      await manualSessionPage.fillAllSets([10, 10, 10, 10, 10]);

      // Wait for form to react to date change
      await page.waitForTimeout(800);

      const statusSelect = page.locator("#status");
      await statusSelect.waitFor({ state: "visible", timeout: 5000 });
      await statusSelect.click();
      await page.locator('[role="option"]:has-text("Completed")').click();

      // Wait for status selection to be applied
      await page.waitForTimeout(500);

      // Check for and dismiss any validation warnings
      const ignoreRestWarningCheckbox = page.locator('input[type="checkbox"]#ignoreRestWarning');
      if (await ignoreRestWarningCheckbox.isVisible().catch(() => false)) {
        await ignoreRestWarningCheckbox.check();
        await page.waitForTimeout(500);
      }

      // clickSubmit already waits for the button to be enabled
      await manualSessionPage.clickSubmit();
      await manualSessionPage.waitForRedirect();
    }

    // Navigate to history page
    const historyPage = new HistoryPage(page);
    await historyPage.goto();
    await historyPage.waitForLoad();

    // Verify all 3 sessions are visible initially
    let sessionCount = await historyPage.getSessionCardsCount();
    expect(sessionCount).toBe(3);

    // Filter by "Completed" status
    await historyPage.filterByStatus("completed");

    // Verify only 2 sessions are visible
    sessionCount = await historyPage.getSessionCardsCount();
    expect(sessionCount).toBe(2);

    // Clear filters
    await historyPage.clearFilters();

    // Verify all 3 sessions are visible again
    sessionCount = await historyPage.getSessionCardsCount();
    expect(sessionCount).toBe(3);
  });

  test("should paginate sessions when more than 10 exist", async ({ page }) => {
    test.setTimeout(120000); // Increase timeout for creating many sessions in CI

    const manualSessionPage = new ManualSessionPage(page);

    // Create 11 HISTORICAL sessions (all past dates to avoid blocking active session)
    const today = new Date();
    for (let i = 1; i <= 11; i++) {
      // Start from 1 day ago, not today, to avoid creating active sessions
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
      const dateStr = date.toISOString().split("T")[0];

      await manualSessionPage.goto();
      await manualSessionPage.fillDate(dateStr);
      await manualSessionPage.fillAllSets([10, 10, 10, 10, 10]);

      // Wait for form to react to date change
      await page.waitForTimeout(600);

      // All sessions are past dates, so set status to completed
      const statusSelect = page.locator("#status");

      // Wait for status select to be visible
      await statusSelect.waitFor({ state: "visible", timeout: 5000 });

      // Click status select
      await statusSelect.click();

      // Wait for dropdown to fully render
      await page.waitForTimeout(200);

      // Click the Completed option
      const completedOption = page.locator('[role="option"]').filter({ hasText: "Completed" });
      await completedOption.waitFor({ state: "visible", timeout: 5000 });
      await completedOption.click({ force: true });

      // Wait for selection to be applied
      await page.waitForTimeout(300);

      // Check for and dismiss any validation warnings
      const ignoreRestWarningCheckbox = page.locator('input[type="checkbox"]#ignoreRestWarning');
      if (await ignoreRestWarningCheckbox.isVisible().catch(() => false)) {
        await ignoreRestWarningCheckbox.check();
        await page.waitForTimeout(400);
      }

      // clickSubmit already waits for the button to be enabled
      await manualSessionPage.clickSubmit();
      await manualSessionPage.waitForRedirect();

      // Add small delay between session creations
      await page.waitForTimeout(500);
    }

    // Navigate to history page
    const historyPage = new HistoryPage(page);
    await historyPage.goto();
    await historyPage.waitForLoad();

    // Verify 10 sessions visible on page 1
    let sessionCount = await historyPage.getSessionCardsCount();
    expect(sessionCount).toBe(10);

    // Verify page indicator shows "Page 1 of 2"
    let pageText = await historyPage.getCurrentPageText();
    expect(pageText).toContain("1");
    expect(pageText).toContain("2");

    // Go to next page
    await historyPage.goToNextPage();

    // Verify 1 session visible on page 2
    sessionCount = await historyPage.getSessionCardsCount();
    expect(sessionCount).toBe(1);

    // Verify page indicator shows "Page 2 of 2"
    pageText = await historyPage.getCurrentPageText();
    expect(pageText).toContain("2");
  });
});
