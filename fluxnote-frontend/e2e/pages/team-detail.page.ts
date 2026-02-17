import { Page, Locator } from '@playwright/test';

export class TeamDetailPage {
  readonly page: Page;
  readonly teamName: Locator;
  readonly membersSection: Locator;
  readonly shareButton: Locator;
  readonly dangerZone: Locator;
  readonly deleteTeamButton: Locator;

  // Ações de pasta
  readonly createFolderButton: Locator;
  readonly folderNameInput: Locator;
  readonly confirmCreateFolder: Locator;

  constructor(page: Page) {
    this.page = page;
    this.teamName = page.locator('h1').first();
    this.membersSection = page.locator('[data-tour="team-members-section"]');
    this.shareButton = page.locator('[data-tour="share-btn"]');
    this.dangerZone = page.locator('[data-tour="danger-zone"]');
    this.deleteTeamButton = page.getByRole('button', { name: 'Delete Team' });

    // Pasta
    this.createFolderButton = page.getByRole('button', { name: 'Create Folder' }).first();
    this.folderNameInput = page.getByPlaceholder('e.g. Marketing Documents');
    this.confirmCreateFolder = page.locator('app-modal').getByRole('button', { name: 'Create Folder' });
  }

  async waitForLoad() {
    await this.page.waitForSelector('[data-tour="team-members-section"]', { timeout: 15_000 });
  }

  async createFolder(name: string) {
    await this.createFolderButton.click();
    await this.folderNameInput.fill(name);
    await this.confirmCreateFolder.click();
  }

  async getMemberCount(): Promise<number> {
    return this.membersSection.locator('[data-tour="member-role"]').count();
  }
}
