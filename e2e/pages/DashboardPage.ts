/**
 * Page Object Model for Dashboard Page
 */

import { expect, type Page, type Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly activeSessionCard: Locator;
  readonly lastCompletedCard: Locator;
  readonly createManualButton: Locator;
  readonly generateAIButton: Locator;
  readonly startSessionButton: Locator;
  readonly completeSessionButton: Locator;
  readonly failSessionButton: Locator;
  readonly editSessionButton: Locator;
  readonly deleteSessionButton: Locator;
  readonly aiQuotaBadge: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.activeSessionCard = page.locator('[data-testid="active-session-card"]');
    this.lastCompletedCard = page.locator('[data-testid="last-completed-card"]');
    this.createManualButton = page.locator('[data-testid="create-manual-session"]');
    this.generateAIButton = page.locator('[data-testid="generate-ai-session"]');
    this.startSessionButton = page.locator('[data-testid="start-session"]');
    this.completeSessionButton = page.locator('[data-testid="complete-session"]');
    this.failSessionButton = page.locator('[data-testid="fail-session"]');
    this.editSessionButton = page.locator('[data-testid="edit-session"]');
    this.deleteSessionButton = page.locator('[data-testid="delete-session"]');
    this.aiQuotaBadge = page.locator('[data-testid="ai-quota-badge"]');
    this.logoutButton = page.locator('[data-testid="logout-button"]');
  }

  async goto() {
    await this.page.goto("/dashboard");
    await this.page.waitForLoadState("networkidle");
  }

  async hasActiveSession(): Promise<boolean> {
    try {
      await this.activeSessionCard.waitFor({ state: "visible", timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  async hasCompletedSession(): Promise<boolean> {
    try {
      await this.lastCompletedCard.waitFor({ state: "visible", timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  async clickCreateManual() {
    await this.createManualButton.click();
    // Wait for navigation or modal
    await this.page.waitForTimeout(500);
  }

  async clickStartSession() {
    await this.startSessionButton.click();
    // Wait for success toast
    await this.expectSuccessToast();
  }

  async clickCompleteSession() {
    await this.completeSessionButton.click();
    // Complete dialog should appear
    await expect(this.page.locator('[data-testid="complete-dialog"]')).toBeVisible();
  }

  async fillCompleteDialog(rpe: number, notes?: string) {
    const rpeInput = this.page.locator('[data-testid="rpe-input"]');
    await rpeInput.fill(rpe.toString());

    if (notes) {
      const notesInput = this.page.locator('[data-testid="notes-input"]');
      await notesInput.fill(notes);
    }

    await this.page.locator('[data-testid="confirm-complete"]').click();
    await this.expectSuccessToast();
  }

  async clickFailSession() {
    await this.failSessionButton.click();
    // Confirm dialog should appear
    await expect(this.page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
  }

  async confirmAction() {
    await this.page.locator('[data-testid="confirm-action"]').click();
    await this.expectSuccessToast();
  }

  async clickEditSession() {
    await this.editSessionButton.click();
    // Edit dialog should appear
    await expect(this.page.locator('[data-testid="edit-dialog"]')).toBeVisible();
  }

  async fillEditDialog(sets: number[], notes?: string) {
    // Clear existing sets first
    const setsContainer = this.page.locator('[data-testid="sets-container"]');
    await setsContainer.waitFor({ state: "visible" });

    // Fill new sets
    for (let i = 0; i < sets.length; i++) {
      const setInput = this.page.locator(`[data-testid="set-input-${i}"]`);
      await setInput.fill(sets[i].toString());
    }

    if (notes) {
      const notesInput = this.page.locator('[data-testid="edit-notes-input"]');
      await notesInput.fill(notes);
    }

    await this.page.locator('[data-testid="save-edit"]').click();
  }

  async clickDeleteSession() {
    await this.deleteSessionButton.click();
    // Confirm dialog should appear
    await expect(this.page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
  }

  async expectSuccessToast() {
    const toast = this.page.locator('[data-testid="toast-success"]').or(this.page.locator(".toast")).first();
    await expect(toast).toBeVisible({ timeout: 5000 });
  }

  async expectErrorToast() {
    const toast = this.page.locator('[data-testid="toast-error"]').or(this.page.locator(".toast")).first();
    await expect(toast).toBeVisible({ timeout: 5000 });
  }

  async expectETagConflictDialog() {
    const dialog = this.page.locator('[data-testid="etag-conflict-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
  }

  async refreshETagConflict() {
    await this.page.locator('[data-testid="refresh-etag"]').click();
    await this.page.waitForTimeout(1000);
  }

  async getAIQuotaText(): Promise<string> {
    return this.aiQuotaBadge.textContent() || "";
  }

  async logout() {
    await this.logoutButton.click();
    await expect(this.page).toHaveURL(/\/(login)?$/, { timeout: 5000 });
  }
}
