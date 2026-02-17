import { Page, Locator } from '@playwright/test';

export class TeamsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly createTeamButton: Locator;
  readonly teamCards: Locator;

  // Modal de criar equipa
  readonly teamNameInput: Locator;
  readonly confirmCreateButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'My Teams' });
    this.searchInput = page.getByPlaceholder('Search teams...');
    // Usar first() para obter o botão da página, não o do modal
    this.createTeamButton = page.getByRole('button', { name: 'Create Team' }).first();
    this.teamCards = page.locator('app-card');

    // Modal
    this.teamNameInput = page.getByLabel('Team Name');
    this.confirmCreateButton = page.locator('app-modal').getByRole('button', { name: 'Create Team' });
  }

  async goto() {
    await this.page.goto('/teams');
  }

  async createTeam(name: string) {
    await this.createTeamButton.click();
    await this.teamNameInput.fill(name);
    await this.confirmCreateButton.click();
  }

  async expandTeam(teamName: string) {
    // Clicar no botão dentro do card da equipa
    const card = this.page.locator('app-card').filter({ hasText: teamName });
    await card.locator('button:has(lucide-icon[name="chevron-down"])').click();
  }

  async viewTeamDetails(teamName: string) {
    // Clicar no botão "View Team Details" dentro do card da equipa
    const card = this.page.locator('app-card').filter({ hasText: teamName });
    await card.getByRole('button', { name: 'View Team Details' }).click();
  }

  async searchTeams(query: string) {
    await this.searchInput.fill(query);
  }
}
