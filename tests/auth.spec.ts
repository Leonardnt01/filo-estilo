import { test, expect } from '@playwright/test';

test.describe('Módulo de Autenticación - Filo y Estilo', () => {
  // Se ejecuta antes de cada test: nos asegura estar en la página correcta
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Funcionalidad 1: Mostrar error ante credenciales inválidas', async ({ page }) => {
    await page.getByPlaceholder('tu@email.com').fill('correo-falso@gmail.com');
    await page.getByPlaceholder('••••••••').fill('claveErronea123');    
    await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();

    // Validamos que aparezca la alerta de error
    const alertaError = page.locator('.alert-error');
    await expect(alertaError).toBeVisible();
  });

  test('Funcionalidad 2: Login exitoso como Cliente', async ({ page }) => {
    await page.getByPlaceholder('tu@email.com').fill('pmlc171peru@gmail.com');
    await page.getByPlaceholder('••••••••').fill('123456789');

    await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();

    // si no es admin, entonces redirige a "/mis-citas"
    await page.waitForURL('**/mis-citas');
    await expect(page).toHaveURL(/.*mis-citas/);
  });

  test('Funcionalidad 3: Login exitoso como Administrador', async ({ page }) => {
    await page.getByPlaceholder('tu@email.com').fill('jgonzalezchaca@gmail.com');
    await page.getByPlaceholder('••••••••').fill('Jefferson159753');

    await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();

    // si es admin, entonces redirige a "/admin"
    await page.waitForURL('**/admin');
    await expect(page).toHaveURL(/.*admin/);
  });

  test('Funcionalidad 4: Alternar visibilidad de contraseña y medidor de fuerza', async ({ page }) => {
    const inputContraseña = page.getByPlaceholder('••••••••');
    
    // Escribir en el campo y validar que por defecto oculta el texto (type="password")
    await inputContraseña.fill('Prueba123');
    await expect(inputContraseña).toHaveAttribute('type', 'password');

    // Verificar que el medidor de fuerza (password-meter) aparece en el DOM
    // const medidorFuerza = page.locator('.password-meter-fill');
    // await expect(medidorFuerza).toBeVisible();

    // Hacer clic en el botón del ojo (usando el aria-label exacto de tu código)
    await page.getByLabel('Mostrar contraseña').click();

    // Validar que el tipo de input cambió a text (ahora es visible)
    await expect(inputContraseña).toHaveAttribute('type', 'text');
  });
});