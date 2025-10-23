import { Page, Locator } from "@playwright/test";

export class ManualSessionPage {
  readonly page: Page;
  readonly dateInput: Locator;
  readonly submitButton: Locator;
  readonly startNowSwitch: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dateInput = page.getByTestId("session-date");
    this.submitButton = page.getByTestId("session-submit");
    this.startNowSwitch = page.locator("#startNow");
  }

  async goto() {
    await this.page.goto("/sessions/new", { waitUntil: "networkidle" });

    // Wait for React to hydrate and form to be ready
    await this.submitButton.waitFor({ state: "visible", timeout: 10000 });
    await this.page.waitForTimeout(500);

    // Verify we're not redirected to login (auth check)
    await this.page.waitForTimeout(200);
    const url = this.page.url();
    if (url.includes("/login")) {
      throw new Error("Authentication failed - redirected to login page");
    }
  }

  async fillDate(date: string) {
    await this.dateInput.fill(date);
  }

  async fillSet(index: number, reps: number) {
    const setInput = this.page.getByTestId(`session-set-${index}`);
    await setInput.fill(String(reps));
    // Trigger blur to ensure React Hook Form updates
    await setInput.blur();
  }

  async fillAllSets(reps: number[]) {
    if (reps.length !== 5) {
      throw new Error("Must provide exactly 5 rep counts");
    }
    for (let i = 0; i < 5; i++) {
      await this.fillSet(i, reps[i]);
    }
  }

  async getTotalReps(): Promise<string> {
    const totalElement = this.page.locator("text=Total Reps").locator("..").locator("span").last();
    return (await totalElement.textContent()) || "0";
  }

  async clickStartNow() {
    await this.startNowSwitch.click();
  }

  async clickSubmit() {
    // Wait for button to be visible
    await this.submitButton.waitFor({ state: "visible" });

    // Wait for button to be enabled (validation might be running)
    // Use waitForFunction to actively wait instead of fixed timeout
    await this.page.waitForFunction(
      () => {
        const button = document.querySelector('[data-testid="session-submit"]');
        return button && !button.hasAttribute("disabled");
      },
      { timeout: 10000 }
    );

    await this.submitButton.click();
  }

  async waitForRedirect() {
    await this.page.waitForURL("/dashboard", { timeout: 15000 });
  }

  async createSession(date: string, sets: number[], startNow = false) {
    await this.fillDate(date);
    await this.fillAllSets(sets);

    // Wait for validation to complete after filling
    await this.page.waitForTimeout(1500);

    // Wait for any loading indicators to disappear
    const loadingIndicator = this.page.locator('[role="status"]');
    if (await loadingIndicator.isVisible().catch(() => false)) {
      await loadingIndicator.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {
        // Ignore timeout - indicator may have already disappeared
      });
    }

    if (startNow) {
      await this.clickStartNow();
      await this.page.waitForTimeout(500);
    }

    await this.clickSubmit();

    // Wait for navigation to complete
    await this.waitForRedirect();
  }

  async waitForSuccessToast() {
    await this.page.waitForSelector('[data-sonner-toast][data-type="success"]', { timeout: 5000 });
  }
}
