import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';

test.describe('Authentication', () => {
  test.describe('Login', () => {
    // Estes testes precisam de um browser não autenticado (sem auth state guardado)
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login('e2e-test@fluxnote.dev', 'Test@12345');

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    });

    test('should show error with invalid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login('wrong@email.com', 'WrongPassword1!');

      // Deve permanecer na página de login e mostrar toast de erro
      await expect(page).toHaveURL(/\/login/);
      // Esperar que o toast de erro apareça
      await expect(page.getByText(/failed|invalid|error/i)).toBeVisible({ timeout: 5_000 });
    });

    test('should display login form elements correctly', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.rememberMeCheckbox).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
      await expect(loginPage.googleButton).toBeVisible();
      await expect(loginPage.microsoftButton).toBeVisible();
      await expect(loginPage.forgotPasswordLink).toBeVisible();
      await expect(loginPage.createAccountLink).toBeVisible();
    });

    test('should navigate to register page', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.createAccountLink.click();

      await expect(page).toHaveURL(/\/register/);
    });
  });

  test.describe('Register', () => {
    // Estes testes precisam de um browser não autenticado (sem auth state guardado)
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should display register form elements correctly', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      await expect(registerPage.fullNameInput).toBeVisible();
      await expect(registerPage.emailInput).toBeVisible();
      await expect(registerPage.passwordInput).toBeVisible();
      await expect(registerPage.confirmPasswordInput).toBeVisible();
      await expect(registerPage.submitButton).toBeVisible();
    });

    test('should show password validation indicators', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      // Escrever uma password que cumpre todos os critérios
      await registerPage.passwordInput.fill('StrongPass1!');

      await expect(page.getByText('Min 8 characters')).toBeVisible();
      await expect(page.getByText('At least one number')).toBeVisible();
      await expect(page.getByText('One special char')).toBeVisible();
    });

    test('should show password mismatch error', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      await registerPage.passwordInput.fill('StrongPass1!');
      await registerPage.confirmPasswordInput.fill('DifferentPass1!');

      await expect(page.getByText('Passwords do not match')).toBeVisible();
    });

    test('should show error when registering with existing email', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      await registerPage.register('Duplicate User', 'e2e-test@fluxnote.dev', 'Test@12345');

      // Deve mostrar erro sobre email já existente
      await expect(page.getByText('Email is already registered.')).toBeVisible({ timeout: 5_000 });
    });

    test('should navigate to login page', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      await registerPage.loginLink.click();

      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Logout', () => {
    test('should redirect to login after logout', async ({ browser }) => {
      // Criar um novo contexto com auth state guardado
      const context = await browser.newContext({
        storageState: './e2e/.auth/user.json',
      });
      const page = await context.newPage();

      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

      // Clicar no botão de Logout na sidebar
      await page.getByRole('button', { name: 'Logout' }).click();

      // Confirmar no modal de logout
      await expect(page.getByText('Are you sure that want to logout of your session?')).toBeVisible();
      // Clicar no botão "Logout" dentro do modal (não o da sidebar)
      await page.locator('app-modal').getByRole('button', { name: 'Logout' }).click();

      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

      await context.close();
    });
  });
});
