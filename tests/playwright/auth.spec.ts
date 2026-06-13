import { test, expect } from '@playwright/test';

test.describe('Módulo de Autenticación - Filo y Estilo', () => {
  // Se ejecuta antes de cada test: nos asegura estar en la página correcta
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Funcionalidad 1: Mostrar error ante credenciales inválidas', async ({ page }) => {
    // Usamos datos falsos a propósito para obligar al sistema a lanzar el error 401
    await page.getByPlaceholder('tu@email.com').fill('correo-falso@gmail.com');
    await page.locator('input[type="password"]').fill('claveErronea123');

    // Usamos expresiones regulares (/.../i) para que encuentre el botón sin importar tildes o mayúsculas
    await page.getByRole('button', { name: /Iniciar sesion/i }).click();

    // Validamos que aparezca la alerta de error que maneja tu componente
    const alertaError = page.locator('.alert-error');
    await expect(alertaError).toBeVisible();
0  });

  test('Funcionalidad 2: Login exitoso como Cliente', async ({ page }) => {
    await page.getByPlaceholder('tu@email.com').fill('pmlc171peru@gmail.com');
    await page.locator('input[type="password"]').fill('123456789');
    await page.getByRole('button', { name: /Iniciar sesion/i }).click();

    // Si no es admin, tu código redirige a "/mis-citas"
    await page.waitForURL('**/mis-citas');
    await expect(page).toHaveURL(/.*mis-citas/);
  });

  test('Funcionalidad 3: Login exitoso como Administrador', async ({ page }) => {
    await page.getByPlaceholder('tu@email.com').fill('jgonzalezchaca@gmail.com');
    await page.locator('input[type="password"]').fill('Jefferson159753');

    await page.getByRole('button', { name: /Iniciar sesion/i }).click();

    // Si es admin, tu código redirige a "/admin"
    await page.waitForURL('**/admin');
    await expect(page).toHaveURL(/.*admin/);
  });

  test('Funcionalidad 4: Alternar visibilidad de contraseña y medidor de fuerza', async ({ page }) => {
    // Actualizado al nuevo placeholder de asteriscos "********"
    const inputContraseña = page.getByPlaceholder('********');
    
    // Escribir en el campo y validar que por defecto oculta el texto (type="password")
    await inputContraseña.fill('Prueba123');
    await expect(inputContraseña).toHaveAttribute('type', 'password');

    // Verificar que el medidor de fuerza (password-meter) aparece en el DOM
    const medidorFuerza = page.locator('.password-meter-fill');
    await expect(medidorFuerza).toBeVisible();

    // Hacer clic en el botón del ojo usando el nuevo aria-label sin tilde: 'Mostrar contrasena'
    await page.getByLabel(/Mostrar contrasena/i).click();

    // Validar que el tipo de input cambió a text (ahora es visible el texto)
    await expect(inputContraseña).toHaveAttribute('type', 'text');
  });
});