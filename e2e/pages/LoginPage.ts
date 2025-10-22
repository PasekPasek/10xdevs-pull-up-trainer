import { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("login-email");
    this.passwordInput = page.getByTestId("login-password");
    this.submitButton = page.getByTestId("login-submit");
    this.registerLink = page.getByRole("link", { name: /sign up/i });
  }

  async goto() {
    await this.page.goto("/login", { waitUntil: "networkidle" });
    // Wait for React to hydrate - check if button is actually interactive
    await this.submitButton.waitFor({ state: "visible" });
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async clickSubmit() {
    // Wait a bit to ensure React has hydrated
    await this.page.waitForTimeout(500);
    await this.submitButton.click();
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  async waitForErrorMessage() {
    // Wait for toast error message to appear
    await this.page.waitForSelector('[data-sonner-toast][data-type="error"]', { timeout: 5000 });
  }
}
