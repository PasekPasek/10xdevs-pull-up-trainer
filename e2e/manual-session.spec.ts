import { test, expect } from "@playwright/test";
import { ManualSessionPage } from "./pages/ManualSessionPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TEST_USER, getTodayLocalDate } from "./helpers/test-data";
import { login } from "./helpers/auth";
import { cleanupUserSessions } from "./helpers/db-cleanup";

test.describe.configure({ mode: "serial" });

test.describe("Manual Session Creation", () => {
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

  test("should create manual session with all sets", async ({ page }) => {
    const manualSessionPage = new ManualSessionPage(page);

    await manualSessionPage.goto();
    await manualSessionPage.createSession(getTodayLocalDate(), [10, 12, 10, 10, 11]);

    // Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard");

    // Verify we're on the dashboard (session was created successfully)
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });

  test("should calculate total reps correctly", async ({ page }) => {
    const manualSessionPage = new ManualSessionPage(page);

    await manualSessionPage.goto();
    await manualSessionPage.fillDate(getTodayLocalDate());
    await manualSessionPage.fillAllSets([10, 12, 10, 10, 11]);

    // Wait for React Hook Form to update by checking if the last set input has the expected value
    await expect(page.getByTestId("session-set-4")).toHaveValue("11");

    // Wait for total to calculate
    await page.waitForFunction(
      () => {
        const totalElement = document.evaluate(
          "//span[contains(text(), 'Total Reps')]/ancestor::div//span[@class='text-2xl font-bold']",
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
        return totalElement && totalElement.textContent !== "0";
      },
      { timeout: 3000 }
    );

    // Verify total reps calculation
    const totalReps = await manualSessionPage.getTotalReps();
    expect(totalReps).toBe("53");
  });

  test("should create and start session immediately", async ({ page }) => {
    const manualSessionPage = new ManualSessionPage(page);

    await manualSessionPage.goto();
    await manualSessionPage.fillDate(getTodayLocalDate());
    await manualSessionPage.fillAllSets([10, 12, 10, 10, 11]);

    // Enable start now
    await manualSessionPage.clickStartNow();

    await manualSessionPage.clickSubmit();
    await manualSessionPage.waitForRedirect();

    // Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard");

    // Active session card should show "In progress" status
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.waitForLoad();

    const activeSessionCard = await dashboardPage.getActiveSessionCard();
    await expect(activeSessionCard).toBeVisible();
    await expect(activeSessionCard.locator("text=In progress")).toBeVisible();
  });

  test("should validate required fields", async ({ page }) => {
    const manualSessionPage = new ManualSessionPage(page);

    await manualSessionPage.goto();

    // Try to submit without filling any fields
    await manualSessionPage.clickSubmit();

    // Should not redirect (stay on form)
    await expect(page).toHaveURL("/sessions/new");
  });

  test("should redirect to dashboard after creation", async ({ page }) => {
    const manualSessionPage = new ManualSessionPage(page);

    await manualSessionPage.goto();
    await manualSessionPage.createSession(getTodayLocalDate(), [15, 12, 10, 10, 13]);

    // Verify redirect to dashboard
    await expect(page).toHaveURL("/dashboard");

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.waitForLoad();
  });

  test("should delete a planned session from dashboard", async ({ page }) => {
    // Create a session first
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

    // Click delete button
    await dashboardPage.clickDeleteSession();

    // Confirm deletion in dialog
    await dashboardPage.confirmDelete();

    // Wait for success toast
    await dashboardPage.waitForSuccessToast();

    // Active session card should no longer be visible
    await expect(activeSessionCard).not.toBeVisible();
  });
});
