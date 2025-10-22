import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TEST_USER } from "./helpers/test-data";
import { login, logout } from "./helpers/auth";

test.describe("Authentication", () => {
  test("should login with valid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);

    console.log("TEST_USER credentials:", { email: TEST_USER.email, password: TEST_USER.password });

    // Listen to console messages to debug
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

    // Listen to requests
    page.on("request", (request) => {
      if (request.url().includes("/api/auth/login")) {
        console.log("Login API request:", request.method(), request.url());
        console.log("Login API request body:", request.postData());
      }
    });

    // Listen to responses to see if login API is called
    page.on("response", async (response) => {
      if (response.url().includes("/api/auth/login")) {
        console.log("Login API response:", response.status(), response.statusText());
        try {
          const body = await response.json();
          console.log("Login API response body:", JSON.stringify(body, null, 2));
        } catch (e) {
          console.log("Could not parse response body");
        }
      }
    });

    await loginPage.goto();
    await loginPage.login(TEST_USER.email, TEST_USER.password);

    // Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard");
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });

  test("should show error with invalid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login("invalid@example.com", "wrongpassword");

    // Should show error toast
    await loginPage.waitForErrorMessage();

    // Should still be on login page
    await expect(page).toHaveURL("/login");
  });

  test("should redirect to dashboard after login", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login(TEST_USER.email, TEST_USER.password);

    // Verify we're on dashboard
    await expect(page).toHaveURL("/dashboard");
    await dashboardPage.waitForLoad();
  });

  test("should logout successfully", async ({ page }) => {
    // Login first
    await login(page, TEST_USER.email, TEST_USER.password);

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.waitForLoad();

    // Logout
    await dashboardPage.clickLogout();

    // Should redirect to login page
    await expect(page).toHaveURL("/login");
  });

  test("should redirect to login when accessing protected route without auth", async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto("/dashboard");

    // Should redirect to login
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });
});
