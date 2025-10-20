/**
 * Authentication helpers for E2E tests
 */

import { expect, type Page } from "@playwright/test";
import { getTestUserCredentials } from "./db-cleanup";

/**
 * Login via UI
 */
export async function loginViaUI(page: Page, email?: string, password?: string) {
  const credentials = getTestUserCredentials();
  const loginEmail = email || credentials.email;
  const loginPassword = password || credentials.password;

  await page.goto("/login", { waitUntil: "domcontentloaded" });

  // Wait for form to be present
  await page.waitForSelector('[data-testid="login-form"]', { state: "visible", timeout: 10000 });

  // Wait for button and ensure it's not disabled (indicating React has hydrated)
  const submitButton = page.locator('[data-testid="login-submit"]');

  // Wait for button to be enabled (React hydration complete)
  await submitButton.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('[data-testid="login-submit"]') as HTMLButtonElement;
      return btn && !btn.disabled && !btn.textContent?.includes("...");
    },
    { timeout: 15000 }
  );

  // Fill in credentials using type instead of fill for better reliability
  const emailInput = page.locator('[data-testid="email-input"]');
  const passwordInput = page.locator('[data-testid="password-input"]');

  await emailInput.click();
  await emailInput.clear();
  await emailInput.fill(loginEmail);

  await passwordInput.click();
  await passwordInput.clear();
  await passwordInput.fill(loginPassword);

  // Verify values are set
  await expect(emailInput).toHaveValue(loginEmail);
  await expect(passwordInput).toHaveValue(loginPassword);

  // Click submit and wait for navigation
  await Promise.all([
    page.waitForURL("/dashboard", { timeout: 30000 }),
    submitButton.click()
  ]);

  // Verify we're logged in
  await expect(page).toHaveURL("/dashboard");
}

/**
 * Login via API and save storage state
 * This is faster than UI login and can be used for authentication setup
 */
export async function loginViaAPI(page: Page, email?: string, password?: string) {
  const credentials = getTestUserCredentials();
  const loginEmail = email || credentials.email;
  const loginPassword = password || credentials.password;

  const response = await page.request.post("/api/auth/login", {
    data: {
      email: loginEmail,
      password: loginPassword,
      rememberMe: true,
    },
  });

  expect(response.ok()).toBeTruthy();

  // The cookies are automatically set by the API response
  // Navigate to dashboard to verify login
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/dashboard");
}

/**
 * Logout via UI
 */
export async function logoutViaUI(page: Page) {
  await page.click('[data-testid="logout-button"]');

  // Wait for redirect to home or login
  await page.waitForURL(/\/(login)?$/, { timeout: 5000 });
}

/**
 * Logout via API
 */
export async function logoutViaAPI(page: Page) {
  await page.request.post("/api/auth/logout");

  // Clear any remaining session data
  await page.context().clearCookies();
}

/**
 * Check if user is logged in by attempting to access dashboard
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  await page.goto("/dashboard");
  const url = page.url();
  return url.includes("/dashboard");
}

/**
 * Get access token from cookies (if available)
 * This is useful for making authenticated API calls
 */
export async function getAccessToken(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(
    (c) => c.name.includes("auth-token") || c.name.includes("sb-") || c.name.includes("supabase"),
  );

  return authCookie?.value || null;
}
