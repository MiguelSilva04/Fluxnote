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
}
