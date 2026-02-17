import { test, expect } from '../fixtures/auth.fixture';
import { TeamsPage } from '../pages/teams.page';
import { DashboardPage } from '../pages/dashboard.page';

test.describe('Teams', () => {
  test('should display the teams page', async ({ authenticatedPage: page }) => {
    const teamsPage = new TeamsPage(page);
    await teamsPage.goto();

    await expect(teamsPage.heading).toBeVisible();
    await expect(teamsPage.createTeamButton).toBeVisible();
  });

  test('should create a new team', async ({ authenticatedPage: page }) => {
    const teamsPage = new TeamsPage(page);
    await teamsPage.goto();

    const timestamp = Date.now();
    const teamName = `E2E New Team ${timestamp}`;

    await teamsPage.createTeam(teamName);

    // Esperar que a equipa apareça na lista
    await expect(page.getByText(teamName)).toBeVisible({ timeout: 10_000 });
  });

  test('should search for a team', async ({ authenticatedPage: page }) => {
    const teamsPage = new TeamsPage(page);
    await teamsPage.goto();

    const timestamp = Date.now();
    const teamName = `Searchable Team ${timestamp}`;

    // Criar uma equipa primeiro
    await teamsPage.createTeam(teamName);
    await expect(page.getByText(teamName)).toBeVisible({ timeout: 10_000 });

    // Pesquisar pela equipa
    await teamsPage.searchTeams(teamName);

    // A equipa deve continuar visível
    await expect(page.getByText(teamName)).toBeVisible();
  });

  test('should navigate to team details', async ({ authenticatedPage: page }) => {
    const teamsPage = new TeamsPage(page);
    await teamsPage.goto();

    const timestamp = Date.now();
    const teamName = `Detail Team ${timestamp}`;

    // Criar equipa
    await teamsPage.createTeam(teamName);
    await expect(page.getByText(teamName)).toBeVisible({ timeout: 10_000 });

    // Navegar para os detalhes
    await teamsPage.viewTeamDetails(teamName);

    await expect(page).toHaveURL(/\/team-detail\/\d+/, { timeout: 10_000 });
  });

  test('should create a document inside a team from the dashboard', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    const timestamp = Date.now();
    const teamName = `Doc Team ${timestamp}`;
    const docTitle = `Team Doc ${timestamp}`;

    // Criar documento com uma nova equipa
    await dashboard.createDocumentWithNewTeam(docTitle, teamName);

    await expect(page).toHaveURL(/\/editor\/\d+/, { timeout: 15_000 });
  });

  test('should create a folder inside a team from the dashboard', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    const timestamp = Date.now();
    const teamName = `Folder Team ${timestamp}`;
    const docTitle = `Folder Doc ${timestamp}`;

    // Criar um documento com uma nova equipa primeiro
    await dashboard.createDocumentWithNewTeam(docTitle, teamName);
    await expect(page).toHaveURL(/\/editor\/\d+/, { timeout: 15_000 });

    // Voltar ao dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Selecionar o separador da equipa
    await dashboard.selectTeamTab(teamName);

    // Criar uma pasta
    await dashboard.newFolderButton.click();
    await dashboard.folderNameInput.fill(`E2E Folder ${timestamp}`);
    await dashboard.createFolderButton.click();

    // Verificar que a pasta aparece
    await expect(page.getByText(`E2E Folder ${timestamp}`)).toBeVisible({ timeout: 5_000 });
  });
});
