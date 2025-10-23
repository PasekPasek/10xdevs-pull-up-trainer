import { test, expect } from "@playwright/test";
import { DashboardPage } from "./pages/DashboardPage";
import { ManualSessionPage } from "./pages/ManualSessionPage";
import { TEST_USER, getTodayLocalDate } from "./helpers/test-data";
import { login } from "./helpers/auth";
import { cleanupUserSessions } from "./helpers/db-cleanup";

test.describe.configure({ mode: "serial" });

test.describe("Dashboard", () => {
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

  test("should display dashboard after login", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await dashboardPage.waitForLoad();

    // Verify dashboard heading
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });

  test("should show create manual button", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await dashboardPage.waitForLoad();

    // Verify create manual button is visible
    const createManualButton = await dashboardPage.getCreateManualButton();
    await expect(createManualButton).toBeVisible();
  });

  test("should navigate to create manual session page", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await dashboardPage.waitForLoad();

    // Click create manual button
    await dashboardPage.clickCreateManual();

    // Should navigate to sessions/new
    await expect(page).toHaveURL("/sessions/new");
    await expect(page.locator('h1:has-text("Create Training Session")')).toBeVisible();
  });

  test("should display active session card when session exists", async ({ page }) => {
    // First create a session
    const manualSessionPage = new ManualSessionPage(page);
    await manualSessionPage.goto();
    await manualSessionPage.createSession(getTodayLocalDate(), [10, 12, 10, 10, 11]);

    // Wait for redirect to dashboard
    await page.waitForURL("/dashboard");

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.waitForLoad();

    // Verify active session card is visible
    const activeSessionCard = await dashboardPage.getActiveSessionCard();
    await expect(activeSessionCard).toBeVisible();
  });

  test("should display last completed session when exists", async ({ page }) => {
    // Create and complete a session first
    const manualSessionPage = new ManualSessionPage(page);
    await manualSessionPage.goto();

    // Get yesterday's date using UTC to avoid timezone issues
    const today = new Date();
    const yesterday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1));
    const yesterdayDate = yesterday.toISOString().split("T")[0];

    await manualSessionPage.fillDate(yesterdayDate);
    await manualSessionPage.fillAllSets([10, 12, 10, 10, 11]);

    // Wait for form to react to date change and show status selector
    await page.waitForTimeout(500);

    // For past dates, we need to select status as completed
    // The form should automatically show status selector for past dates
    const statusSelect = page.locator("#status");
    await statusSelect.waitFor({ state: "visible", timeout: 5000 });
    await statusSelect.click();
    await page.locator('[role="option"]:has-text("Completed")').click();

    // Wait for status selection to be applied
    await page.waitForTimeout(300);

    // Check for and dismiss any validation warnings
    const ignoreRestWarningCheckbox = page.locator('input[type="checkbox"]#ignoreRestWarning');
    if (await ignoreRestWarningCheckbox.isVisible().catch(() => false)) {
      await ignoreRestWarningCheckbox.check();
      await page.waitForTimeout(500);
    }

    await manualSessionPage.clickSubmit();
    await manualSessionPage.waitForRedirect();

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.waitForLoad();

    // Verify last completed card is visible
    const lastCompletedCard = await dashboardPage.getLastCompletedCard();
    await expect(lastCompletedCard).toBeVisible();
  });
});
