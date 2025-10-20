/**
 * E2E Tests for Authentication
 * Tests login, logout, and protected route access
 */

import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { getTestUserCredentials, cleanupAllTestData } from "./helpers/db-cleanup";

test.describe("Authentication", () => {
  const testUser = getTestUserCredentials();

  test.beforeEach(async ({ page }) => {
    // Ensure we start logged out
    await page.context().clearCookies();
  });

  test.afterEach(async () => {
    // Clean up any test data created during the test
    await cleanupAllTestData();
  });

  test("should login successfully with valid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await loginPage.expectLoginSuccess();

    // Verify we're on the dashboard
    await expect(page).toHaveURL("/dashboard");
  });

  test("should show error with invalid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login("wrong@example.com", "wrongpassword");

    // Should stay on login page and show error
    await expect(page).toHaveURL(/\/login/);

    // Check for error message
    const errorMessage = page.locator("text=/Invalid email or password|Invalid credentials/i");
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test("should show validation error for empty email", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();

    // Try to submit with empty email
    await loginPage.passwordInput.fill("somepassword");
    await loginPage.submitButton.click();

    // Should show validation error (zod schema shows "Please enter a valid email address")
    await expect(page.locator("text=/please enter a valid email|invalid email/i")).toBeVisible();
  });

  test("should logout successfully", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Login first
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await loginPage.expectLoginSuccess();

    // Then logout
    await dashboardPage.logout();

    // Verify we're redirected to home or login
    await expect(page).toHaveURL(/\/(login)?$/);
  });

  test("should redirect to login when accessing protected route without auth", async ({ page }) => {
    await page.goto("/dashboard");

    // Should redirect to login with redirect query param
    await expect(page).toHaveURL(/\/login\?redirect=/);
  });

  test("should redirect to intended page after login", async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Try to access history without being logged in
    await page.goto("/history");

    // Should redirect to login with redirect param
    await expect(page).toHaveURL(/\/login\?redirect=.*history/);

    // Login
    await loginPage.login(testUser.email, testUser.password);

    // Should redirect to history page
    await expect(page).toHaveURL("/history");
  });

  test("should remember login when 'remember me' is checked", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password, true);
    await loginPage.expectLoginSuccess();

    // Close and reopen browser context (simulate closing browser)
    const cookies = await page.context().cookies();
    await page.context().clearCookies();
    await page.context().addCookies(cookies);

    // Navigate to dashboard - should still be logged in
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/dashboard");
  });

  test("should redirect to dashboard if already logged in and accessing login page", async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Login first
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await loginPage.expectLoginSuccess();

    // Try to access login page again
    await page.goto("/login");

    // Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard");
  });
});
