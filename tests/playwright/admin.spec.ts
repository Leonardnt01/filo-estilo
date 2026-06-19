import { test, expect } from '@playwright/test';

const adminEmail = process.env.BDD_ADMIN_EMAIL;
const adminPassword = process.env.BDD_ADMIN_PASSWORD;

test.describe('Modulo Administrativo - Filo y Estilo', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!adminEmail || !adminPassword, 'Faltan BDD_ADMIN_EMAIL y BDD_ADMIN_PASSWORD');

    const isolatedClientIp = `pw-admin-${testInfo.title.replace(/\s+/g, '-').toLowerCase()}`;

    await page.route('**/api/auth/login', async (route) => {
      await route.continue({
        headers: {
          ...route.request().headers(),
          'x-forwarded-for': isolatedClientIp,
        },
      });
    });
  });

  test('Deberia navegar por el dashboard interactivo revisando todas las sedes con scrolls', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill(adminEmail!);
    await page.locator('input[type="password"]').fill(adminPassword!);
    await page.getByRole('button', { name: /Iniciar sesion/i }).click();

    await page.waitForURL('**/admin', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Panel de Control/i })).toBeVisible({ timeout: 15000 });

    const tarjetaPendientes = page.locator('p:has-text("Pendientes") + p');
    await expect(tarjetaPendientes).not.toContainText('--', { timeout: 15000 });

    const botonVistaGeneral = page.getByRole('button', { name: /Vista General/i });
    const botonSedePrincipal = page.getByRole('button', { name: /Sede Principal/i });
    const botonSedeNorte = page.getByRole('button', { name: /Sede Norte/i });
    const headingAcciones = page.getByRole('heading', { name: /Acciones R[aá]pidas del Administrador/i });

    await botonVistaGeneral.click();
    await expect(botonVistaGeneral).toHaveClass(/shadow-xl/, { timeout: 8000 });
    await expect(page.locator('text=Global').first()).toBeVisible({ timeout: 8000 });
    await headingAcciones.scrollIntoViewIfNeeded();
    await expect(headingAcciones).toBeVisible({ timeout: 8000 });
    await page.getByRole('heading', { name: /Panel de Control/i }).scrollIntoViewIfNeeded();

    await botonSedePrincipal.click();
    await expect(botonSedePrincipal).toHaveClass(/shadow-xl/, { timeout: 8000 });
    await expect(botonVistaGeneral).not.toHaveClass(/shadow-xl/, { timeout: 8000 });
    await headingAcciones.scrollIntoViewIfNeeded();
    await expect(headingAcciones).toBeVisible({ timeout: 8000 });
    await page.getByRole('heading', { name: /Panel de Control/i }).scrollIntoViewIfNeeded();

    await botonSedeNorte.click();
    await expect(botonSedeNorte).toHaveClass(/shadow-xl/, { timeout: 8000 });
    await expect(botonVistaGeneral).not.toHaveClass(/shadow-xl/, { timeout: 8000 });
    await headingAcciones.scrollIntoViewIfNeeded();
    await expect(headingAcciones).toBeVisible({ timeout: 8000 });

    await expect(botonSedeNorte).toHaveClass(/shadow-xl/, { timeout: 8000 });
  });
});
