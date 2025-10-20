/**
 * Page Object Model for History Page
 */

import { expect, type Page, type Locator } from "@playwright/test";

export class HistoryPage {
  readonly page: Page;
  readonly sessionList: Locator;
  readonly filterPanel: Locator;
  readonly statusFilter: Locator;
  readonly dateFromInput: Locator;
  readonly dateToInput: Locator;
  readonly applyFiltersButton: Locator;
  readonly clearFiltersButton: Locator;
  readonly paginationNext: Locator;
  readonly paginationPrev: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sessionList = page.locator('[data-testid="session-list"]');
    this.filterPanel = page.locator('[data-testid="filter-panel"]');
    this.statusFilter = page.locator('[data-testid="status-filter"]');
    this.dateFromInput = page.locator('[data-testid="date-from-input"]');
    this.dateToInput = page.locator('[data-testid="date-to-input"]');
    this.applyFiltersButton = page.locator('[data-testid="apply-filters"]');
    this.clearFiltersButton = page.locator('[data-testid="clear-filters"]');
    this.paginationNext = page.locator('[data-testid="pagination-next"]');
    this.paginationPrev = page.locator('[data-testid="pagination-prev"]');
    this.emptyState = page.locator('[data-testid="empty-state"]');
  }

  async goto() {
    await this.page.goto("/history");
    await this.page.waitForLoadState("networkidle");
  }

  async filterByStatus(status: "planned" | "in_progress" | "completed" | "failed") {
    await this.statusFilter.click();
    await this.page.locator(`[data-testid="status-option-${status}"]`).click();
    await this.applyFiltersButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  async filterByDateRange(from: string, to: string) {
    await this.dateFromInput.fill(from);
    await this.dateToInput.fill(to);
    await this.applyFiltersButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  async clearFilters() {
    await this.clearFiltersButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  async getSessionCount(): Promise<number> {
    const sessions = await this.page.locator('[data-testid^="session-item-"]').count();
    return sessions;
  }

  async clickSession(index: number) {
    await this.page.locator(`[data-testid="session-item-${index}"]`).click();
  }

  async clickNextPage() {
    await this.paginationNext.click();
    await this.page.waitForLoadState("networkidle");
  }

  async clickPrevPage() {
    await this.paginationPrev.click();
    await this.page.waitForLoadState("networkidle");
  }

  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }

  async expectSessionsVisible() {
    await expect(this.sessionList).toBeVisible();
    const count = await this.getSessionCount();
    expect(count).toBeGreaterThan(0);
  }
}
