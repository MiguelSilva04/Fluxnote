import { Page, Locator } from '@playwright/test';

export class EditorPage {
  readonly page: Page;
  readonly title: Locator;
  readonly titleInput: Locator;
  readonly backButton: Locator;
  readonly shareButton: Locator;
  readonly aiButton: Locator;
  readonly editorArea: Locator;
  readonly viewOnlyBadge: Locator;
  readonly lastEditedText: Locator;

  // Version history
  readonly historyButton: Locator;
  readonly versionHistoryPanel: Locator;
  readonly versionPreviewOverlay: Locator;
  readonly changesTab: Locator;
  readonly fullVersionTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('header h1');
    this.titleInput = page.locator('header input[type="text"]');
    this.backButton = page.locator('header button').first();
    this.shareButton = page.getByRole('button', { name: 'Share' });
    this.aiButton = page.getByRole('button', { name: 'AI Assistance' });
    this.editorArea = page.locator('.ql-editor');
    this.viewOnlyBadge = page.getByText('View only');
    this.lastEditedText = page.locator('header').getByText('Last edited');

    // Version history
    this.historyButton = page.getByRole('button', { name: /History/i }).first();
    this.versionHistoryPanel = page.locator('aside').filter({ has: page.getByText('Version History') });
    this.versionPreviewOverlay = page.locator('span').filter({ hasText: 'Read only' }).first();
    this.changesTab = page.getByRole('button', { name: 'Changes' });
    this.fullVersionTab = page.getByRole('button', { name: 'Full version' });
  }

  async waitForLoad() {
    // Esperar que o spinner de carregamento desapareça e o título apareça
    await this.page.waitForSelector('header h1', { timeout: 15_000 });
  }

  async editTitle(newTitle: string) {
    await this.title.click();
    await this.titleInput.fill(newTitle);
    await this.titleInput.press('Enter');
  }

  async typeContent(text: string) {
    await this.editorArea.click();
    await this.editorArea.pressSequentially(text, { delay: 50 });
  }

  async getContent(): Promise<string> {
    return this.editorArea.innerText();
  }

  async goBack() {
    await this.backButton.click();
  }

  async openVersionHistory() {
    await this.historyButton.click();
    await this.versionHistoryPanel.waitFor({ state: 'visible', timeout: 5_000 });
  }

  async closeVersionHistory() {
    // X button is inside the panel header (the only button in that flex row with the title)
    await this.versionHistoryPanel.locator('div').first().getByRole('button').click();
    await this.versionHistoryPanel.waitFor({ state: 'hidden', timeout: 5_000 });
  }

  async clickVersionView(index: number) {
    const viewButtons = this.versionHistoryPanel.getByRole('button', { name: 'View' });
    await viewButtons.nth(index).click();
  }

  async closeVersionPreview() {
    // The preview overlay is a fixed full-screen div (div.fixed.inset-0)
    // Its first button is the back arrow (the main header back button is outside this div)
    await this.page.locator('div.fixed.inset-0').getByRole('button').first().click();
  }

  async waitForVersionPreview() {
    await this.versionPreviewOverlay.waitFor({ state: 'visible', timeout: 10_000 });
  }

  async isChangesTabDisabled(): Promise<boolean> {
    return this.changesTab.isDisabled();
  }
}
