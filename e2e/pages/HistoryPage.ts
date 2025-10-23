import type { Page, Locator } from "@playwright/test";

export class HistoryPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly sessionList: Locator;
  readonly clearFiltersButton: Locator;
  readonly nextPageButton: Locator;
  readonly previousPageButton: Locator;
  readonly pageIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1:has-text("Session History")');
    this.sessionList = page.locator('[role="list"][aria-label="Session history"]');
    this.clearFiltersButton = page.getByTestId("clear-filters-button");
    this.nextPageButton = page.getByTestId("pagination-next");
    this.previousPageButton = page.getByTestId("pagination-previous");
    this.pageIndicator = page.getByTestId("pagination-info");
  }

  async goto() {
    await this.page.goto("/history", { waitUntil: "networkidle" });
  }

  async waitForLoad() {
    // Wait for heading to be visible and React to hydrate
    await this.heading.waitFor({ state: "visible", timeout: 10000 });
    await this.page.waitForTimeout(500);
  }

  async getSessionCards() {
    // Get all session card links within the session list
    return this.page.locator('[role="list"][aria-label="Session history"] a');
  }

  async getSessionCardsCount(): Promise<number> {
    const cards = await this.getSessionCards();
    return cards.count();
  }

  async filterByStatus(status: string) {
    // Click the checkbox for the specified status
    const checkbox = this.page.locator(`#status-${status}`);
    await checkbox.click();
    // Wait for the filter to be applied
    await this.page.waitForTimeout(500);
  }

  async clearFilters() {
    await this.clearFiltersButton.click();
    // Wait for filters to be cleared
    await this.page.waitForTimeout(500);
  }

  async goToNextPage() {
    await this.nextPageButton.click();
    // Wait for page to load and scroll to complete
    await this.page.waitForTimeout(1000);
  }

  async goToPreviousPage() {
    await this.previousPageButton.click();
    // Wait for page to load and scroll to complete
    await this.page.waitForTimeout(1000);
  }

  async getCurrentPageText(): Promise<string> {
    // Get the full page indicator text (e.g., "Page 1 of 2")
    return (await this.pageIndicator.textContent()) || "";
  }
}
