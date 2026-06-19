import { test, expect } from '@playwright/test';

const clientEmail = process.env.BDD_CLIENT_EMAIL;
const clientPassword = process.env.BDD_CLIENT_PASSWORD;

test.describe('Flujo de Reservas - Filo y Estilo', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!clientEmail || !clientPassword, 'Faltan BDD_CLIENT_EMAIL y BDD_CLIENT_PASSWORD');

    const isolatedClientIp = `pw-booking-${testInfo.title.replace(/\s+/g, '-').toLowerCase()}`;

    await page.route('**/api/auth/login', async (route) => {
      await route.continue({
        headers: {
          ...route.request().headers(),
          'x-forwarded-for': isolatedClientIp,
        },
      });
    });

    await page.addInitScript(() => {
      class MockCulqiCheckout {
        token: Record<string, string> | undefined;
        error: { user_message?: string; merchant_message?: string } | undefined;
        culqi?: () => void | Promise<void>;

        constructor() {
          this.token = undefined;
          this.error = undefined;
        }

        open() {
          this.token = {
            id: 'tok_test_playwright',
            email: 'playwright@filoestilo.test',
            number_phone: '999999999',
            card_number: '4111111111111111',
            last_four: '1111',
          };

          setTimeout(() => {
            void this.culqi?.();
          }, 50);
        }

        close() {}
      }

      (window as Window & { CulqiCheckout?: unknown }).CulqiCheckout = MockCulqiCheckout;
    });

    await page.route('**/api/payments/culqi/charge', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          charge_id: 'charge_test_playwright',
          items: [
            {
              id: 'appt_test_playwright',
              status: 'confirmed',
            },
          ],
        }),
      });
    });
  });

  test('Deberia completar una reserva con pago Yape de forma exitosa', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill(clientEmail!);
    await page.locator('input[type="password"]').fill(clientPassword!);
    await page.getByRole('button', { name: /Iniciar sesion/i }).click();
    await page.waitForURL('**/mis-citas', { timeout: 15000 });

    await page.goto('/reservar');

    await expect(page.locator('section.glass-card h2:has-text("Elige sede")')).toBeVisible({ timeout: 10000 });

    const sedeCards = page.locator('section.glass-card .grid button[class*="rounded-xl"]');
    await sedeCards.first().click();

    const servicioCards = page.locator('p:has-text("Servicios de la sede elegida") ~ div button[class*="rounded-xl"]');
    await expect(servicioCards.first()).toBeVisible({ timeout: 8000 });
    await servicioCards.first().click();

    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(page.locator('h2:has-text("Barbero y horario")')).toBeVisible({ timeout: 10000 });

    const barberoCards = page.locator('section.glass-card .grid button:has(img.rounded-full)');
    await expect(barberoCards.first()).toBeVisible({ timeout: 8000 });
    await barberoCards.first().click();

    const diasCalendario = page.locator('div.grid.grid-cols-7 button.h-8:not([disabled])');
    await expect(diasCalendario.first()).toBeVisible({ timeout: 8000 });
    await diasCalendario.first().click();

    await expect(page.locator('div:has-text("Disponibles")').last()).not.toContainText('Actualizando...', {
      timeout: 12000,
    });

    const slotButtons = page
      .locator('div.grid.grid-cols-3 button, div.grid.grid-cols-4 button')
      .filter({ hasText: /^\d{1,2}:\d{2}$/ });
    await expect(slotButtons.first()).toBeVisible({ timeout: 10000 });
    await slotButtons.first().click();

    await expect(page.locator('h3:has-text("Servicios y Asistentes del Grupo")')).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: 'Ir a pago' }).click();

    await expect(page.locator('h2:has-text("Resumen del Ticket")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Paga con Yape')).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Pagar Ahora' })).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: 'Pagar Ahora' }).click();

    await expect(page.locator('h3').filter({ hasText: /Reserva Confirmada/i })).toBeVisible({ timeout: 15000 });
    await page.waitForURL('**/mis-citas?created=1', { timeout: 10000 });
    await expect(page).toHaveURL(/.*created=1/);
  });
});
