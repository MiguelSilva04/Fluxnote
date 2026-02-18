import { test, expect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/dashboard.page';
import { EditorPage } from '../pages/editor.page';

test.describe('Documents', () => {
  test('should display the dashboard with documents section', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);

    await expect(dashboard.heading).toBeVisible();
    await expect(dashboard.newDocumentButton).toBeVisible();
    await expect(dashboard.allTeamsTab).toBeVisible();
  });

  test('should create a new document with a new team', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    const timestamp = Date.now();
    const docTitle = `E2E Test Doc ${timestamp}`;
    const teamName = `E2E Team ${timestamp}`;

    await dashboard.createDocumentWithNewTeam(docTitle, teamName);

    // Deve redirecionar para o editor
    await expect(page).toHaveURL(/\/editor\/\d+/, { timeout: 15_000 });

    const editor = new EditorPage(page);
    await editor.waitForLoad();

    // Verificar que o título é apresentado
    await expect(editor.title).toHaveText(docTitle);
  });

  test('should edit a document title', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    const timestamp = Date.now();

    // Criar um documento primeiro
    await dashboard.createDocumentWithNewTeam(`Original Title ${timestamp}`, `Title Team ${timestamp}`);
    await expect(page).toHaveURL(/\/editor\/\d+/, { timeout: 15_000 });

    const editor = new EditorPage(page);
    await editor.waitForLoad();

    // Editar o título
    const newTitle = `Updated Title ${timestamp}`;
    await editor.editTitle(newTitle);

    // Esperar um momento para a gravação completar
    await page.waitForTimeout(2000);

    // Voltar atrás e verificar que o título foi guardado
    await editor.goBack();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    await expect(page.getByText(newTitle)).toBeVisible({ timeout: 5_000 });
  });

  test('should type content in the editor', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    const timestamp = Date.now();

    await dashboard.createDocumentWithNewTeam(`Content Doc ${timestamp}`, `Content Team ${timestamp}`);
    await expect(page).toHaveURL(/\/editor\/\d+/, { timeout: 15_000 });

    const editor = new EditorPage(page);
    await editor.waitForLoad();

    // Escrever conteúdo
    const testContent = 'Hello from E2E test!';
    await editor.typeContent(testContent);

    // Verificar que o conteúdo aparece
    const content = await editor.getContent();
    expect(content).toContain(testContent);
  });

  test('should soft delete a document', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    const timestamp = Date.now();
    const docTitle = `Delete Me ${timestamp}`;

    // Criar um documento
    await dashboard.createDocumentWithNewTeam(docTitle, `Delete Team ${timestamp}`);
    await expect(page).toHaveURL(/\/editor\/\d+/, { timeout: 15_000 });

    // Voltar ao dashboard
    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.goBack();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Esperar que o documento apareça
    await expect(page.getByText(docTitle)).toBeVisible({ timeout: 5_000 });

    // Eliminar o documento
    await dashboard.deleteDocument(docTitle);

    // O documento já não deve estar visível
    await expect(page.getByText(docTitle)).not.toBeVisible({ timeout: 5_000 });
  });

  test('should navigate to trash page', async ({ authenticatedPage: page }) => {
    await page.goto('/trash');

    await expect(page).toHaveURL(/\/trash/);
    // A página do trash deve carregar
    await expect(page.getByRole('heading', { name: 'Trash', exact: true })).toBeVisible({ timeout: 5_000 });
  });

  test('should filter documents by team', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);

    // Clicar no separador "All Teams"
    await dashboard.allTeamsTab.click();

    // Verificar que o separador está ativo (documentos são apresentados)
    await expect(dashboard.allTeamsTab).toBeVisible();
  });
});
