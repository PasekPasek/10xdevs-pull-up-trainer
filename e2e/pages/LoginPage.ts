/**
 * Page Object Model for Login Page
 */

import { expect, type Page, type Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly submitButton: Locator;
  readonly loginForm: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginForm = page.locator('[data-testid="login-form"]');
    this.emailInput = page.locator('[data-testid="email-input"]');
    this.passwordInput = page.locator('[data-testid="password-input"]');
    this.rememberMeCheckbox = page.locator('[data-testid="remember-me-checkbox"]');
    this.submitButton = page.locator('[data-testid="login-submit"]');
    this.registerLink = page.locator('[data-testid="register-link"]');
  }

  async goto() {
    await this.page.goto("/login");
    await this.loginForm.waitFor({ state: "visible" });
  }

  async login(email: string, password: string, rememberMe: boolean = true) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    if (rememberMe) {
      const isChecked = await this.rememberMeCheckbox.isChecked();
      if (!isChecked) {
        await this.rememberMeCheckbox.check();
      }
    } else {
      const isChecked = await this.rememberMeCheckbox.isChecked();
      if (isChecked) {
        await this.rememberMeCheckbox.uncheck();
      }
    }

    await this.submitButton.click();
  }

  async expectLoginSuccess() {
    await expect(this.page).toHaveURL("/dashboard", { timeout: 10000 });
  }

  async expectLoginError() {
    // Check for error toast or error message
    const errorToast = this.page.locator('[data-testid="toast-error"]');
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  }

  async goToRegister() {
    await this.registerLink.click();
    await expect(this.page).toHaveURL("/register");
  }
}
