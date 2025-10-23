import { Page, expect } from "@playwright/test";

/**
 * Helper to perform login
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "networkidle" });

  // Wait for React to hydrate
  await page.waitForTimeout(500);

  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();

  // Wait for redirect to dashboard
  await page.waitForURL("/dashboard", { timeout: 10000 });

  // Wait for dashboard to load and session to be fully established
  await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });
  await page.waitForTimeout(500); // Ensure cookies are propagated
}

/**
 * Helper to perform logout
 */
export async function logout(page: Page) {
  await page.getByTestId("header-logout").click();

  // Wait for redirect to login page
  await page.waitForURL("/login", { timeout: 10000 });
}

/**
 * Check if user is logged in by checking if we're on a protected route
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();
  return url.includes("/dashboard") || url.includes("/history") || url.includes("/sessions");
}
