import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly createManualButton: Locator;
  readonly createAIButton: Locator;
  readonly activeSessionCard: Locator;
  readonly lastCompletedCard: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createManualButton = page.getByTestId('create-manual-button');
    this.createAIButton = page.getByTestId('create-ai-button');
    this.activeSessionCard = page.getByTestId('active-session-card');
    this.lastCompletedCard = page.getByTestId('last-completed-card');
    this.logoutButton = page.getByTestId('header-logout');
  }

  async goto() {
    await this.page.goto('/dashboard', { waitUntil: 'networkidle' });
  }

  async waitForLoad() {
    // Wait for dashboard heading to be visible and React to hydrate
    await this.page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });
    await this.page.waitForTimeout(500);
  }

  async getCreateManualButton() {
    return this.createManualButton;
  }

  async getActiveSessionCard() {
    return this.activeSessionCard;
  }

  async getLastCompletedCard() {
    return this.lastCompletedCard;
  }

  async clickCreateManual() {
    await this.createManualButton.click();
    await this.page.waitForURL('/sessions/new', { timeout: 10000 });
  }

  async clickStartSession() {
    const startButton = this.page.getByTestId('session-start-button');
    await startButton.click();
    // Wait for the session state to update
    await this.page.waitForTimeout(1000);
  }

  async clickCompleteSession() {
    const completeButton = this.page.getByTestId('session-complete-button');
    await completeButton.click();
    // Wait for dialog to open
    await this.page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  }

  async clickDeleteSession() {
    const deleteButton = this.page.getByTestId('session-delete-button');
    await deleteButton.click();
    // Wait for confirmation dialog to open
    await this.page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
  }

  async confirmDelete() {
    const confirmButton = this.page.getByTestId('confirm-dialog-confirm');
    await confirmButton.click();
    // Wait for the action to complete
    await this.page.waitForTimeout(1000);
  }

  async clickLogout() {
    await this.logoutButton.click();
  }

  async waitForSuccessToast() {
    await this.page.waitForSelector('[data-sonner-toast][data-type="success"]', { timeout: 5000 });
  }
}

