/**
 * E2E Tests for Middleware and Route Protection
 * Tests authentication middleware, redirects, and access control
 */

import { test, expect } from "@playwright/test";
import { getTestUserCredentials, cleanupAllTestData } from "./helpers/db-cleanup";
import { loginViaUI } from "./helpers/auth";

test.describe("Middleware - Route Protection", () => {
  const testUser = getTestUserCredentials();

  test.beforeEach(async ({ page }) => {
    // Clear cookies before each test
    await page.context().clearCookies();
  });

  test.afterEach(async () => {
    await cleanupAllTestData();
  });

  test.describe("Public Routes", () => {
    test("should allow access to home page without auth", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL("/");
    });

    test("should allow access to login page without auth", async ({ page }) => {
      await page.goto("/login");
      await expect(page).toHaveURL("/login");
    });

    test("should allow access to register page without auth", async ({ page }) => {
      await page.goto("/register");
      await expect(page).toHaveURL("/register");
    });

    test("should redirect to dashboard when accessing login page while authenticated", async ({ page }) => {
      // Login first
      await loginViaUI(page, testUser.email, testUser.password);

      // Try to access login page
      await page.goto("/login");

      // Should redirect to dashboard
      await expect(page).toHaveURL("/dashboard");
    });

    test("should redirect to dashboard when accessing register page while authenticated", async ({ page }) => {
      // Login first
      await loginViaUI(page, testUser.email, testUser.password);

      // Try to access register page
      await page.goto("/register");

      // Should redirect to dashboard
      await expect(page).toHaveURL("/dashboard");
    });
  });

  test.describe("Protected Routes - Pages", () => {
    test("should redirect to login when accessing dashboard without auth", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login\?redirect=/);
    });

    test("should redirect to login when accessing history without auth", async ({ page }) => {
      await page.goto("/history");
      await expect(page).toHaveURL(/\/login\?redirect=.*history/);
    });

    test("should redirect to login when accessing sessions without auth", async ({ page }) => {
      await page.goto("/sessions/new");
      await expect(page).toHaveURL(/\/login\?redirect=/);
    });

    test("should allow access to dashboard when authenticated", async ({ page }) => {
      await loginViaUI(page, testUser.email, testUser.password);
      await page.goto("/dashboard");
      await expect(page).toHaveURL("/dashboard");
    });

    test("should allow access to history when authenticated", async ({ page }) => {
      await loginViaUI(page, testUser.email, testUser.password);
      await page.goto("/history");
      await expect(page).toHaveURL("/history");
    });
  });

  test.describe("Protected Routes - API", () => {
    test("should return 401 when accessing sessions API without auth", async ({ request }) => {
      const response = await request.get("/api/sessions");
      expect(response.status()).toBe(401);

      // Check Cache-Control header
      const cacheControl = response.headers()["cache-control"];
      expect(cacheControl).toContain("no-store");
    });

    test("should return 401 when creating session without auth", async ({ request }) => {
      const response = await request.post("/api/sessions", {
        data: {
          status: "planned",
          sessionDate: new Date().toISOString(),
          sets: [10, 8, 8],
        },
      });
      expect(response.status()).toBe(401);
    });

    test("should allow API access when authenticated", async ({ page, request }) => {
      // Login to get auth cookies
      await loginViaUI(page, testUser.email, testUser.password);

      // Get cookies
      const cookies = await page.context().cookies();
      const authCookie = cookies.find((c) => c.name.includes("sb-") || c.name.includes("auth"));

      // Make API request with auth
      const response = await request.get("/api/sessions", {
        headers: {
          Authorization: `Bearer ${authCookie?.value}`,
        },
      });

      expect(response.status()).toBe(200);
    });

    test("should return Cache-Control: no-store header on all API responses", async ({ page, request }) => {
      await loginViaUI(page, testUser.email, testUser.password);

      const cookies = await page.context().cookies();
      const authCookie = cookies.find((c) => c.name.includes("sb-") || c.name.includes("auth"));

      const response = await request.get("/api/sessions", {
        headers: {
          Authorization: `Bearer ${authCookie?.value}`,
        },
      });

      const cacheControl = response.headers()["cache-control"];
      expect(cacheControl).toContain("no-store");
    });
  });

  test.describe("Session Persistence", () => {
    test("should maintain session across page navigation", async ({ page }) => {
      // Login
      await loginViaUI(page, testUser.email, testUser.password);
      await expect(page).toHaveURL("/dashboard");

      // Navigate to history
      await page.goto("/history");
      await expect(page).toHaveURL("/history");

      // Navigate back to dashboard
      await page.goto("/dashboard");
      await expect(page).toHaveURL("/dashboard");

      // Should still be authenticated
      await page.reload();
      await expect(page).toHaveURL("/dashboard");
    });

    test("should maintain session after page reload", async ({ page }) => {
      await loginViaUI(page, testUser.email, testUser.password);
      await expect(page).toHaveURL("/dashboard");

      // Reload page
      await page.reload();

      // Should still be on dashboard
      await expect(page).toHaveURL("/dashboard");
    });
  });

  test.describe("Redirect Flow", () => {
    test("should preserve redirect parameter through login", async ({ page }) => {
      // Try to access history without auth
      await page.goto("/history");

      // Should redirect to login with redirect param
      await expect(page).toHaveURL(/\/login\?redirect=.*history/);

      // Login
      const loginForm = page.locator('[data-testid="login-form"]');
      await loginForm.waitFor({ state: "visible" });

      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-submit"]');

      // Should redirect to history page
      await expect(page).toHaveURL("/history", { timeout: 10000 });
    });

    test("should redirect to dashboard by default after login", async ({ page }) => {
      await page.goto("/login");

      // Login without redirect param
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
    });
  });

  test.describe("Admin Routes", () => {
    test("should block access to admin page for non-admin users", async ({ page }) => {
      // Login as regular user
      await loginViaUI(page, testUser.email, testUser.password);

      // Try to access admin page
      await page.goto("/admin");

      // Should redirect to dashboard or show 403
      await page.waitForTimeout(1000);
      const url = page.url();

      // Should not be on admin page
      expect(url).not.toContain("/admin");
      expect(url.includes("/dashboard") || url.includes("403")).toBe(true);
    });

    // Note: Testing admin access would require an admin test user
    // which should be configured separately
  });
});
