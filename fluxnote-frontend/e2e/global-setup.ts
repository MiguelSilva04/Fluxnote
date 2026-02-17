import { test as setup, expect } from '@playwright/test';

const TEST_USER = {
  fullName: 'E2E Test User',
  email: 'e2e-test@fluxnote.dev',
  password: 'Test@12345',
};

setup('create test user and authenticate', async ({ page }) => {
  // Tentar registar o utilizador de teste (pode já existir)
  const registerResponse = await page.request.post('/api/auth/register', {
    data: {
      fullName: TEST_USER.fullName,
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
  });

  if (registerResponse.ok()) {
    console.log('Utilizador de teste registado, a confirmar email via endpoint dev...');

    // Em ambiente dev, usar o endpoint dev para obter o link de confirmação
    const devLinkResponse = await page.request.get(
      `/api/auth/dev/last-confirmation-link?email=${encodeURIComponent(TEST_USER.email)}`
    );

    if (devLinkResponse.ok()) {
      const { confirmationLink } = await devLinkResponse.json();
      if (confirmationLink) {
        // Visitar o link de confirmação para ativar a conta
        await page.goto(confirmationLink);
        console.log('Email confirmado com sucesso');
        await page.waitForTimeout(1000);
      }
    } else {
      console.warn('Não foi possível obter o link de confirmação dev, o email pode precisar de confirmação manual');
    }
  } else {
    console.log('Utilizador de teste já existe ou registo falhou, a prosseguir com login');
  }

  // Login via UI (interface)
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();

  // Esperar pela navegação para o dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  // Guardar estado de autenticação
  await page.context().storageState({ path: './e2e/.auth/user.json' });
});
