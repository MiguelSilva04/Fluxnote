import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newDocumentButton: Locator;
  readonly allTeamsTab: Locator;
  readonly documentCards: Locator;

  // Modal de criar documento
  readonly documentTitleInput: Locator;
  readonly existingTeamTab: Locator;
  readonly createTeamTab: Locator;
  readonly newTeamNameInput: Locator;
  readonly createDocumentButton: Locator;
  readonly cancelButton: Locator;

  // Modal de criar pasta
  readonly newFolderButton: Locator;
  readonly folderNameInput: Locator;
  readonly createFolderButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'My Documents' });
    this.newDocumentButton = page.locator('[data-tour="create-document-btn"]');
    this.allTeamsTab = page.getByRole('button', { name: 'All Teams' });
    this.documentCards = page.locator('app-card');

    // Modal de criar documento
    this.documentTitleInput = page.getByPlaceholder('e.g., Weekly Report...');
    this.existingTeamTab = page.getByRole('button', { name: 'Existing Team' });
    this.createTeamTab = page.getByRole('button', { name: 'Create New Team', exact: true });
    this.newTeamNameInput = page.getByPlaceholder('e.g., Project Alpha...');
    this.createDocumentButton = page.locator('div.fixed').filter({ hasText: 'New Document' }).getByRole('button', { name: 'Create Document' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    // Pasta
    this.newFolderButton = page.getByRole('button', { name: 'New Folder' });
    this.folderNameInput = page.getByPlaceholder('e.g. Marketing Documents');
    this.createFolderButton = page.locator('app-modal').getByRole('button', { name: 'Create Folder' });
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async createDocumentWithNewTeam(title: string, teamName: string) {
    await this.newDocumentButton.click();
    await this.documentTitleInput.fill(title);
    await this.createTeamTab.click();
    await this.newTeamNameInput.fill(teamName);
    await this.createDocumentButton.click();
  }

  async createDocumentInExistingTeam(title: string, teamName: string) {
    await this.newDocumentButton.click();
    await this.documentTitleInput.fill(title);
    await this.existingTeamTab.click();
    // Selecionar a equipa pelo nome
    await this.page.getByRole('button', { name: teamName }).click();
    await this.createDocumentButton.click();
  }

  async selectTeamTab(teamName: string) {
    await this.page.locator('[data-tour="team-filter-tabs"]').getByRole('button', { name: teamName }).click();
  }

  async clickDocument(title: string) {
    await this.page.locator('app-card').filter({ hasText: title }).click();
  }

  async deleteDocument(title: string) {
    const card = this.page.locator('app-card').filter({ hasText: title });
    // Abrir o menu de contexto (três pontos)
    await card.locator('button').filter({ has: this.page.locator('lucide-icon[name="ellipsis-vertical"]') }).click();
    await this.page.getByRole('button', { name: 'Delete', exact: true }).click();
    // Confirmar eliminação no modal
    await this.page.locator('app-modal').getByRole('button', { name: 'Delete' }).click();
  }

  async getDocumentCount(): Promise<number> {
    return this.documentCards.count();
  }
}
