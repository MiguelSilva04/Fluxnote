import { Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/dashboard.page';
import { EditorPage } from '../pages/editor.page';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: cria um documento, escreve conteúdo, navega para fora (cria versão)
// e volta ao documento. Retorna o EditorPage já carregado.
// ─────────────────────────────────────────────────────────────────────────────
async function createDocWithOneVersion(
  page: Page,
  docTitle: string,
  teamName: string,
  content = 'Content for version test',
): Promise<EditorPage> {
  const dashboard = new DashboardPage(page);
  const editor = new EditorPage(page);

  await dashboard.createDocumentWithNewTeam(docTitle, teamName);
  await expect(page).toHaveURL(/\/editor\/\d+/, { timeout: 15_000 });
  await editor.waitForLoad();
  await editor.typeContent(content);

  // Navegar para fora → dispara disconnect → cria versão no servidor
  await editor.goBack();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

  // Aguardar que o servidor processe o disconnect e guarde a versão
  await page.waitForTimeout(2_500);

  // Voltar ao documento
  await page.getByText(docTitle).first().click();
  await expect(page).toHaveURL(/\/editor\/\d+/, { timeout: 15_000 });
  await editor.waitForLoad();

  return editor;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: cria um segundo ciclo de edição (cria a versão 2)
// ─────────────────────────────────────────────────────────────────────────────
async function addSecondVersion(
  page: Page,
  docTitle: string,
  content = 'Extra content for version 2',
): Promise<EditorPage> {
  const editor = new EditorPage(page);
  await editor.typeContent(content);

  await editor.goBack();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  await page.waitForTimeout(2_500);

  await page.getByText(docTitle).first().click();
  await expect(page).toHaveURL(/\/editor\/\d+/, { timeout: 15_000 });
  await editor.waitForLoad();

  return editor;
}

// ─────────────────────────────────────────────────────────────────────────────
// Testes
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Version History – panel', () => {
  test('should open the version history panel', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    const ts = Date.now();
    await dashboard.createDocumentWithNewTeam(`VH Panel ${ts}`, `VH Team ${ts}`);
    await expect(page).toHaveURL(/\/editor\/\d+/, { timeout: 15_000 });

    const editor = new EditorPage(page);
    await editor.waitForLoad();

    await editor.openVersionHistory();
    await expect(editor.versionHistoryPanel).toBeVisible();
  });

  test('should close the version history panel via X button', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    const ts = Date.now();
    await dashboard.createDocumentWithNewTeam(`VH Close ${ts}`, `VH Close Team ${ts}`);
    await expect(page).toHaveURL(/\/editor\/\d+/, { timeout: 15_000 });

    const editor = new EditorPage(page);
    await editor.waitForLoad();

    await editor.openVersionHistory();
    await expect(editor.versionHistoryPanel).toBeVisible();

    await editor.closeVersionHistory();
    await expect(editor.versionHistoryPanel).not.toBeVisible();
  });

  test('should show empty state when document has no versions', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    const ts = Date.now();
    await dashboard.createDocumentWithNewTeam(`VH Empty ${ts}`, `VH Empty Team ${ts}`);
    await expect(page).toHaveURL(/\/editor\/\d+/, { timeout: 15_000 });

    const editor = new EditorPage(page);
    await editor.waitForLoad();

    await editor.openVersionHistory();
    await expect(page.getByText('No versions yet')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Version History – version list', () => {
  test('should show a version after editing and navigating away', async ({ authenticatedPage: page }) => {
    test.setTimeout(45_000);
    const ts = Date.now();
    const editor = await createDocWithOneVersion(page, `VH List ${ts}`, `VH List Team ${ts}`);

    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 8_000 });
  });

  test('should show the author name and summary in the version card', async ({ authenticatedPage: page }) => {
    test.setTimeout(45_000);
    const ts = Date.now();
    const editor = await createDocWithOneVersion(page, `VH Author ${ts}`, `VH Author Team ${ts}`);

    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 8_000 });
    // Summary contains "Session by"
    await expect(page.getByText(/Session by/)).toBeVisible({ timeout: 5_000 });
  });

  test('should show two versions after two editing sessions', async ({ authenticatedPage: page }) => {
    test.setTimeout(75_000);
    const ts = Date.now();
    const docTitle = `VH Two ${ts}`;
    const editor = await createDocWithOneVersion(page, docTitle, `VH Two Team ${ts}`);
    await addSecondVersion(page, docTitle);

    await editor.openVersionHistory();
    await expect(page.getByText('Version 2')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Version History – preview', () => {
  test('should open version preview when clicking View', async ({ authenticatedPage: page }) => {
    test.setTimeout(45_000);
    const ts = Date.now();
    const editor = await createDocWithOneVersion(page, `VH Preview ${ts}`, `VH Preview Team ${ts}`);

    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 8_000 });

    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();
    await expect(editor.versionPreviewOverlay).toBeVisible();
  });

  test('should show "Read only" badge in preview', async ({ authenticatedPage: page }) => {
    test.setTimeout(45_000);
    const ts = Date.now();
    const editor = await createDocWithOneVersion(page, `VH RO ${ts}`, `VH RO Team ${ts}`);

    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 8_000 });
    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();

    // Badge "Read only" confirma que estamos em modo somente leitura
    await expect(page.getByText('Read only').first()).toBeVisible();
  });

  test('should close preview and return to history panel', async ({ authenticatedPage: page }) => {
    test.setTimeout(45_000);
    const ts = Date.now();
    const editor = await createDocWithOneVersion(page, `VH Close Preview ${ts}`, `VH CP Team ${ts}`);

    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 8_000 });
    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();

    await editor.closeVersionPreview();

    // Preview desaparece, painel volta a estar visível
    await expect(editor.versionPreviewOverlay).not.toBeVisible({ timeout: 5_000 });
    await expect(editor.versionHistoryPanel).toBeVisible();
  });
});

test.describe('Version History – diff view (Changes tab)', () => {
  test('should default to Full version tab for the first (only) version', async ({ authenticatedPage: page }) => {
    test.setTimeout(45_000);
    const ts = Date.now();
    const editor = await createDocWithOneVersion(page, `VH First ${ts}`, `VH First Team ${ts}`);

    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 8_000 });
    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();

    // Para a primeira versão, o modo activo deve ser "Full version" (sem anterior para comparar)
    await expect(editor.fullVersionTab).toHaveClass(/bg-white/);
  });

  test('should disable the Changes tab for the first (only) version', async ({ authenticatedPage: page }) => {
    test.setTimeout(45_000);
    const ts = Date.now();
    const editor = await createDocWithOneVersion(page, `VH Changes Disabled ${ts}`, `VH CD Team ${ts}`);

    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 8_000 });
    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();

    await expect(editor.changesTab).toBeDisabled();
  });

  test('should enable the Changes tab for non-first versions', async ({ authenticatedPage: page }) => {
    test.setTimeout(75_000);
    const ts = Date.now();
    const docTitle = `VH Changes Enabled ${ts}`;
    const editor = await createDocWithOneVersion(page, docTitle, `VH CE Team ${ts}`);
    await addSecondVersion(page, docTitle);

    await editor.openVersionHistory();
    await expect(page.getByText('Version 2')).toBeVisible({ timeout: 8_000 });

    // Clicar em View na versão mais recente (índice 0 na lista descendente)
    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();

    // Changes deve estar habilitado e activo (tem versão anterior)
    await expect(editor.changesTab).not.toBeDisabled();
    await expect(editor.changesTab).toHaveClass(/bg-white/);
  });

  test('should toggle between Changes and Full version tabs', async ({ authenticatedPage: page }) => {
    test.setTimeout(75_000);
    const ts = Date.now();
    const docTitle = `VH Toggle ${ts}`;
    const editor = await createDocWithOneVersion(page, docTitle, `VH Toggle Team ${ts}`);
    await addSecondVersion(page, docTitle);

    await editor.openVersionHistory();
    await expect(page.getByText('Version 2')).toBeVisible({ timeout: 8_000 });
    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();

    // Começa em Changes (versão com anterior)
    await expect(editor.changesTab).toHaveClass(/bg-white/);

    // Mudar para Full version
    await editor.fullVersionTab.click();
    await expect(editor.fullVersionTab).toHaveClass(/bg-white/);
    await expect(editor.changesTab).not.toHaveClass(/bg-white/);

    // Voltar para Changes
    await editor.changesTab.click();
    await expect(editor.changesTab).toHaveClass(/bg-white/);
    await expect(editor.fullVersionTab).not.toHaveClass(/bg-white/);
  });

  test('should show diff legend (Added/Modified/Removed) in Changes tab', async ({ authenticatedPage: page }) => {
    test.setTimeout(75_000);
    const ts = Date.now();
    const docTitle = `VH Diff Legend ${ts}`;
    const editor = await createDocWithOneVersion(page, docTitle, `VH DL Team ${ts}`);
    await addSecondVersion(page, docTitle);

    await editor.openVersionHistory();
    await expect(page.getByText('Version 2')).toBeVisible({ timeout: 8_000 });
    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();

    // No modo Changes, a legenda deve estar visível
    await expect(page.getByText('Added')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Modified')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Removed')).toBeVisible({ timeout: 5_000 });
  });
});
