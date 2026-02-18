import { test as base, expect, Page, request as apiRequest } from '@playwright/test';

export const TEST_USER = {
  fullName: 'E2E Test User',
  email: 'e2e-test@fluxnote.dev',
  password: 'Test@12345',
};

const BASE_URL = 'http://localhost:4200';

/**
 * Elimina todos os documentos (ativos + trash) do utilizador de teste via uma sessão API independente.
 * Usa o seu próprio request context com JWT Bearer para não interferir com os cookies do browser.
 */
async function cleanupDocuments() {
  const context = await apiRequest.newContext({ baseURL: BASE_URL });

  // Login para obter o JWT access token
  const loginResponse = await context.post('/api/auth/login', {
    data: { email: TEST_USER.email, password: TEST_USER.password },
  });
  if (!loginResponse.ok()) {
    await context.dispose();
    return;
  }

  const { accessToken } = await loginResponse.json();
  const authHeader = { Authorization: `Bearer ${accessToken}` };

  // Soft-delete de todos os documentos ativos
  const docsResponse = await context.get('/api/documents', { headers: authHeader });
  if (docsResponse.ok()) {
    const docs = await docsResponse.json();
    for (const doc of docs) {
      await context.delete(`/api/documents/${doc.id}`, { headers: authHeader });
    }
  }

  // Eliminação permanente de tudo no trash
  const trashResponse = await context.get('/api/documents/trash', { headers: authHeader });
  if (trashResponse.ok()) {
    const trashDocs = await trashResponse.json();
    for (const doc of trashDocs) {
      await context.delete(`/api/documents/${doc.id}/permanent`, { headers: authHeader });
    }
  }

  await context.dispose();
}

type AuthFixtures = {
  authenticatedPage: Page;
};

/**
 * Estende o test base com uma fixture de página autenticada.
 * Faz login via API antes de cada teste para obter um refresh token novo,
 * evitando problemas de token rotation com cookies storageState obsoletos.
 * Também faz cleanup de documentos antes de cada teste para não atingir o limite de 10 documentos.
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Cleanup de documentos usando uma sessão API separada (não afeta os cookies do browser)
    await cleanupDocuments();

    // Login via API para obter uma sessão nova para o browser
    const response = await page.request.post('/api/auth/login', {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    });

    if (!response.ok()) {
      throw new Error(`Login failed with status ${response.status()}`);
    }

    // Navegar para o dashboard — o cookie de refresh token novo vai acionar o initAuth()
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
    await use(page);
  },
});

export { expect };
