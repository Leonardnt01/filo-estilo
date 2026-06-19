import { test, expect } from '@playwright/test';

const clientEmail = process.env.BDD_CLIENT_EMAIL;
const clientPassword = process.env.BDD_CLIENT_PASSWORD;
const adminEmail = process.env.BDD_ADMIN_EMAIL;
const adminPassword = process.env.BDD_ADMIN_PASSWORD;

test.describe('Modulo de Autenticacion - Filo y Estilo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Funcionalidad 1: Mostrar error ante credenciales invalidas', async ({ page }) => {
    await page.getByPlaceholder('tu@email.com').fill('correo-falso@gmail.com');
    await page.locator('input[type="password"]').fill('claveErronea123');
    await page.getByRole('button', { name: /Iniciar sesion/i }).click();

    const alertaError = page.locator('.alert-error');
    await expect(alertaError).toBeVisible({ timeout: 10000 });
    await expect(alertaError).toContainText(/credenciales|incorrectas|correo no confirmado|iniciar sesion/i);
  });

  test('Funcionalidad 2: Login exitoso como Cliente', async ({ page }) => {
    test.skip(!clientEmail || !clientPassword, 'Faltan BDD_CLIENT_EMAIL y BDD_CLIENT_PASSWORD');

    await page.getByPlaceholder('tu@email.com').fill(clientEmail!);
    await page.locator('input[type="password"]').fill(clientPassword!);
    await page.getByRole('button', { name: /Iniciar sesion/i }).click();

    await page.waitForURL('**/mis-citas', { timeout: 10000 });
    await expect(page).toHaveURL(/.*mis-citas/);
  });

  test('Funcionalidad 3: Login exitoso como Administrador', async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, 'Faltan BDD_ADMIN_EMAIL y BDD_ADMIN_PASSWORD');

    await page.getByPlaceholder('tu@email.com').fill(adminEmail!);
    await page.locator('input[type="password"]').fill(adminPassword!);
    await page.getByRole('button', { name: /Iniciar sesion/i }).click();

    await page.waitForURL('**/admin', { timeout: 10000 });
    await expect(page).toHaveURL(/.*admin/);
  });

  test('Funcionalidad 4: Alternar visibilidad de contrasena y medidor de fuerza', async ({ page }) => {
    const inputContrasena = page.getByPlaceholder('********');

    await inputContrasena.fill('Prueba123');
    await expect(inputContrasena).toHaveAttribute('type', 'password');

    const medidorFuerza = page.locator('.password-meter-fill');
    await expect(medidorFuerza).toBeVisible({ timeout: 10000 });

    await page.getByLabel(/Mostrar contrasena/i).click();
    await expect(inputContrasena).toHaveAttribute('type', 'text');
  });
});
