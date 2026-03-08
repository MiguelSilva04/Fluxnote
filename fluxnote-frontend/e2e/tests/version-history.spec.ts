import { Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/dashboard.page';
import { EditorPage } from '../pages/editor.page';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos mínimos para os dados fake
// ─────────────────────────────────────────────────────────────────────────────
interface FakeVersion {
  id: number;
  documentId: number;
  authorName: string;
  createdAt: string;
  summary: string;
}

interface FakeVersionDetail extends FakeVersion {
  contentHtml: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Cria um documento e devolve o seu ID extraído da URL */
async function createDocAndGetId(page: Page, docTitle: string, teamName: string): Promise<number> {
  const dashboard = new DashboardPage(page);
  await dashboard.createDocumentWithNewTeam(docTitle, teamName);
  await expect(page).toHaveURL(/\/editor\/\d+/, { timeout: 15_000 });
  const match = page.url().match(/\/editor\/(\d+)/);
  return parseInt(match![1], 10);
}

/** Mocka as APIs de histórico de versões para um documento específico */
async function mockVersionsApi(
  page: Page,
  docId: number,
  versions: FakeVersion[],
  details: Map<number, FakeVersionDetail>,
): Promise<void> {
  await page.route(`**/api/documents/${docId}/versions`, (route) => {
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(versions) });
  });
  for (const [id, detail] of details) {
    await page.route(`**/api/documents/${docId}/versions/${id}`, (route) => {
      route.fulfill({ contentType: 'application/json', body: JSON.stringify(detail) });
    });
  }
}

function makeVersion(id: number, docId: number, offsetMs = 0): FakeVersion {
  return {
    id,
    documentId: docId,
    authorName: 'E2E Test User',
    createdAt: new Date(Date.now() - offsetMs).toISOString(),
    summary: 'Session by E2E Test User',
  };
}

function makeDetail(v: FakeVersion, contentHtml: string | null): FakeVersionDetail {
  return { ...v, contentHtml };
}

// ─────────────────────────────────────────────────────────────────────────────
// Testes – Painel de histórico
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Version History – panel', () => {
  test('should open the version history panel', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH Panel ${ts}`, `VH Team ${ts}`);
    await mockVersionsApi(page, docId, [], new Map());

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(editor.versionHistoryPanel).toBeVisible();
  });

  test('should close the version history panel via X button', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH Close ${ts}`, `VH Close Team ${ts}`);
    await mockVersionsApi(page, docId, [], new Map());

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(editor.versionHistoryPanel).toBeVisible();
    await editor.closeVersionHistory();
    await expect(editor.versionHistoryPanel).not.toBeVisible();
  });

  test('should show empty state when document has no versions', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH Empty ${ts}`, `VH Empty Team ${ts}`);
    await mockVersionsApi(page, docId, [], new Map());

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('No versions yet')).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Testes – Lista de versões
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Version History – version list', () => {
  test('should show a version in the history panel', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH List ${ts}`, `VH List Team ${ts}`);
    const v1 = makeVersion(1, docId);
    await mockVersionsApi(page, docId, [v1], new Map([[1, makeDetail(v1, '<p>Hello</p>')]]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 5_000 });
  });

  test('should show the author name and summary in the version card', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH Author ${ts}`, `VH Author Team ${ts}`);
    const v1 = makeVersion(1, docId);
    await mockVersionsApi(page, docId, [v1], new Map([[1, makeDetail(v1, '<p>Hello</p>')]]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Session by E2E Test User/)).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText('E2E Test User').first()).toBeVisible({ timeout: 3_000 });
  });

  test('should show two versions in the history panel', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH Two ${ts}`, `VH Two Team ${ts}`);
    const v1 = makeVersion(1, docId, 60_000);
    const v2 = makeVersion(2, docId, 0);
    // API devolve em ordem DESC (mais recente primeiro)
    await mockVersionsApi(page, docId, [v2, v1], new Map([
      [1, makeDetail(v1, '<p>First content</p>')],
      [2, makeDetail(v2, '<p>First content second version</p>')],
    ]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 2')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 3_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Testes – Preview de versão
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Version History – preview', () => {
  test('should open version preview when clicking View', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH Preview ${ts}`, `VH Preview Team ${ts}`);
    const v1 = makeVersion(1, docId);
    await mockVersionsApi(page, docId, [v1], new Map([[1, makeDetail(v1, '<p>Preview content</p>')]]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 5_000 });
    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();
    await expect(editor.versionPreviewOverlay).toBeVisible();
  });

  test('should show "Read only" badge in preview', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH RO ${ts}`, `VH RO Team ${ts}`);
    const v1 = makeVersion(1, docId);
    await mockVersionsApi(page, docId, [v1], new Map([[1, makeDetail(v1, '<p>Read only content</p>')]]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 5_000 });
    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();
    await expect(page.getByText('Read only').first()).toBeVisible();
  });

  test('should close preview and return to history panel', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH Close Preview ${ts}`, `VH CP Team ${ts}`);
    const v1 = makeVersion(1, docId);
    await mockVersionsApi(page, docId, [v1], new Map([[1, makeDetail(v1, '<p>Close preview</p>')]]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 5_000 });
    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();

    await editor.closeVersionPreview();
    await expect(editor.versionPreviewOverlay).not.toBeVisible({ timeout: 5_000 });
    await expect(editor.versionHistoryPanel).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Testes – Vista de diferenças (aba Changes)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Version History – diff view (Changes tab)', () => {
  test('should default to Full version tab for the first (only) version', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH First ${ts}`, `VH First Team ${ts}`);
    const v1 = makeVersion(1, docId);
    await mockVersionsApi(page, docId, [v1], new Map([[1, makeDetail(v1, '<p>First</p>')]]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 5_000 });
    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();

    // Primeira versão: sem anterior → modo padrão deve ser "Full version"
    await expect(editor.fullVersionTab).toHaveClass(/bg-white/);
  });

  test('should disable the Changes tab for the first (only) version', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH Disabled ${ts}`, `VH Disabled Team ${ts}`);
    const v1 = makeVersion(1, docId);
    await mockVersionsApi(page, docId, [v1], new Map([[1, makeDetail(v1, '<p>Only version</p>')]]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 5_000 });
    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();

    await expect(editor.changesTab).toBeDisabled();
  });

  test('should enable the Changes tab for non-first versions', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH Enabled ${ts}`, `VH Enabled Team ${ts}`);
    const v1 = makeVersion(1, docId, 60_000);
    const v2 = makeVersion(2, docId, 0);
    await mockVersionsApi(page, docId, [v2, v1], new Map([
      [1, makeDetail(v1, '<p>First version content</p>')],
      [2, makeDetail(v2, '<p>First version content with changes</p>')],
    ]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 2')).toBeVisible({ timeout: 5_000 });

    // Clicar em View na versão mais recente (índice 0 na lista DESC)
    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();

    // Versão 2 tem versão anterior → Changes deve estar habilitado e activo
    await expect(editor.changesTab).not.toBeDisabled();
    await expect(editor.changesTab).toHaveClass(/bg-white/);
  });

  test('should toggle between Changes and Full version tabs', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH Toggle ${ts}`, `VH Toggle Team ${ts}`);
    const v1 = makeVersion(1, docId, 60_000);
    const v2 = makeVersion(2, docId, 0);
    await mockVersionsApi(page, docId, [v2, v1], new Map([
      [1, makeDetail(v1, '<p>Original text here</p>')],
      [2, makeDetail(v2, '<p>Original text with new words here</p>')],
    ]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 2')).toBeVisible({ timeout: 5_000 });
    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();

    // Começa em Changes
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
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH Legend ${ts}`, `VH Legend Team ${ts}`);
    const v1 = makeVersion(1, docId, 60_000);
    const v2 = makeVersion(2, docId, 0);
    await mockVersionsApi(page, docId, [v2, v1], new Map([
      [1, makeDetail(v1, '<p>Original text</p>')],
      [2, makeDetail(v2, '<p>Original text with new words</p>')],
    ]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 2')).toBeVisible({ timeout: 5_000 });
    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();

    // Legenda deve estar visível na aba Changes
    await expect(page.getByText('Added').first()).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText('Modified').first()).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText('Removed').first()).toBeVisible({ timeout: 3_000 });
  });

  test('should show content in Full version tab', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH Full ${ts}`, `VH Full Team ${ts}`);
    const v1 = makeVersion(1, docId);
    const contentHtml = '<p>This is the full version content visible here</p>';
    await mockVersionsApi(page, docId, [v1], new Map([[1, makeDetail(v1, contentHtml)]]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 5_000 });
    await editor.clickVersionView(0);
    await editor.waitForVersionPreview();

    // Já em Full version (primeira versão → sem Changes)
    await expect(page.getByText('This is the full version content visible here')).toBeVisible({ timeout: 3_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Testes – Restaurar versão
// ─────────────────────────────────────────────────────────────────────────────

/** Mocka o endpoint de restauro de uma versão específica */
async function mockRestoreApi(page: Page, docId: number, versionId: number): Promise<void> {
  await page.route(`**/api/documents/${docId}/versions/${versionId}/restore`, (route) => {
    route.fulfill({ status: 204, body: '' });
  });
}

test.describe('Version History – restore', () => {
  test('should NOT show Restore button on the most recent version', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH RestoreBtn ${ts}`, `VH RestoreBtn Team ${ts}`);
    const v1 = makeVersion(1, docId, 60_000);
    const v2 = makeVersion(2, docId, 0);
    // v2 é o mais recente (índice 0), v1 é o mais antigo (índice 1)
    await mockVersionsApi(page, docId, [v2, v1], new Map([
      [1, makeDetail(v1, '<p>Old content</p>')],
      [2, makeDetail(v2, '<p>New content</p>')],
    ]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 2')).toBeVisible({ timeout: 5_000 });

    // O cartão da versão mais recente (Version 2) não deve ter botão de restauro
    const cards = editor.versionHistoryPanel.locator('div.p-4.border-2');
    const firstCard = cards.first();
    await expect(firstCard.getByRole('button', { name: /Restore/i })).not.toBeVisible();
  });

  test('should show Restore button on older versions', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH RestoreOld ${ts}`, `VH RestoreOld Team ${ts}`);
    const v1 = makeVersion(1, docId, 60_000);
    const v2 = makeVersion(2, docId, 0);
    await mockVersionsApi(page, docId, [v2, v1], new Map([
      [1, makeDetail(v1, '<p>Old content</p>')],
      [2, makeDetail(v2, '<p>New content</p>')],
    ]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 5_000 });

    // O cartão da versão mais antiga (Version 1, índice 1) deve ter o botão de restauro
    const cards = editor.versionHistoryPanel.locator('div.p-4.border-2');
    const secondCard = cards.nth(1);
    await expect(secondCard.getByRole('button', { name: /Restore/i })).toBeVisible({ timeout: 3_000 });
  });

  test('should open the restore confirmation modal when clicking Restore', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH RestoreModal ${ts}`, `VH RestoreModal Team ${ts}`);
    const v1 = makeVersion(1, docId, 60_000);
    const v2 = makeVersion(2, docId, 0);
    await mockVersionsApi(page, docId, [v2, v1], new Map([
      [1, makeDetail(v1, '<p>Old</p>')],
      [2, makeDetail(v2, '<p>New</p>')],
    ]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 5_000 });

    // Clicar no botão Restore da versão mais antiga (índice 0 dos botões Restore)
    await editor.clickVersionRestore(0);
    await editor.waitForRestoreModal();
    await expect(editor.restoreModal).toBeVisible();
  });

  test('should have the Restore button disabled until checkbox is checked', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH RestoreDisabled ${ts}`, `VH RestoreDisabled Team ${ts}`);
    const v1 = makeVersion(1, docId, 60_000);
    const v2 = makeVersion(2, docId, 0);
    await mockVersionsApi(page, docId, [v2, v1], new Map([
      [1, makeDetail(v1, '<p>Old</p>')],
      [2, makeDetail(v2, '<p>New</p>')],
    ]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 5_000 });

    await editor.clickVersionRestore(0);
    await editor.waitForRestoreModal();

    // Antes de marcar o checkbox, o botão de confirmar deve estar desativado
    await expect(editor.restoreConfirmButton).toBeDisabled();

    // Após marcar o checkbox, o botão fica ativo
    await editor.restoreConfirmCheckbox.check();
    await expect(editor.restoreConfirmButton).not.toBeDisabled();
  });

  test('should close the modal when clicking Cancel', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH RestoreCancel ${ts}`, `VH RestoreCancel Team ${ts}`);
    const v1 = makeVersion(1, docId, 60_000);
    const v2 = makeVersion(2, docId, 0);
    await mockVersionsApi(page, docId, [v2, v1], new Map([
      [1, makeDetail(v1, '<p>Old</p>')],
      [2, makeDetail(v2, '<p>New</p>')],
    ]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 5_000 });

    await editor.clickVersionRestore(0);
    await editor.waitForRestoreModal();
    await expect(editor.restoreModal).toBeVisible();

    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(editor.restoreModal).not.toBeVisible({ timeout: 3_000 });
  });

  test('should call the restore API and close modal on confirm', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH RestoreConfirm ${ts}`, `VH RestoreConfirm Team ${ts}`);
    const v1 = makeVersion(1, docId, 60_000);
    const v2 = makeVersion(2, docId, 0);
    await mockVersionsApi(page, docId, [v2, v1], new Map([
      [1, makeDetail(v1, '<p>Old content</p>')],
      [2, makeDetail(v2, '<p>New content</p>')],
    ]));
    await mockRestoreApi(page, docId, v1.id);

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();
    await expect(page.getByText('Version 1')).toBeVisible({ timeout: 5_000 });

    // Monitorizar o pedido de restauro
    const restoreRequest = page.waitForRequest(
      req => req.url().includes(`/api/documents/${docId}/versions/${v1.id}/restore`) && req.method() === 'POST'
    );

    await editor.clickVersionRestore(0);
    await editor.waitForRestoreModal();
    await editor.confirmRestore();

    // Verificar que o pedido foi feito
    await restoreRequest;

    // Modal deve fechar após o restauro
    await expect(editor.restoreModal).not.toBeVisible({ timeout: 5_000 });
  });

  test('should show translated summary RESTORED_BY for a restored version', async ({ authenticatedPage: page }) => {
    const ts = Date.now();
    const docId = await createDocAndGetId(page, `VH RestoreSummary ${ts}`, `VH RestoreSummary Team ${ts}`);

    const restoreVersion: FakeVersion = {
      id: 10,
      documentId: docId,
      authorName: 'Test Owner',
      createdAt: new Date(Date.now() - 5_000).toISOString(),
      summary: 'RESTORED_BY|Test Owner',
    };
    const v1 = makeVersion(1, docId, 120_000);

    await mockVersionsApi(page, docId, [restoreVersion, v1], new Map([
      [1,  makeDetail(v1, '<p>Original</p>')],
      [10, makeDetail(restoreVersion, '<p>Original</p>')],
    ]));

    const editor = new EditorPage(page);
    await editor.waitForLoad();
    await editor.openVersionHistory();

    // O summary deve aparecer traduzido, não como chave bruta
    await expect(page.getByText('RESTORED_BY|Test Owner')).not.toBeVisible({ timeout: 3_000 });
    await expect(page.getByText(/Restored by Test Owner|Restaurado por Test Owner/)).toBeVisible({ timeout: 3_000 });
  });
});
