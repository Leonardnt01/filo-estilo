import { test, expect } from '@playwright/test';

test.describe('Flujo de Reservas - Filo y Estilo', () => {

  test('Debería completar una reserva con pago en Efectivo de forma exitosa', async ({ page }) => {

    // =========================================================================
    // 0. LOGIN PREVIO
    // =========================================================================
    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill('pmlc171peru@gmail.com');
    await page.locator('input[type="password"]').fill('123456789');
    await page.getByRole('button', { name: /Iniciar sesion/i }).click();
    await page.waitForURL('**/mis-citas');

    await page.goto('/reservar');

    // =========================================================================
    // ETAPA 1: Sede y Servicio
    // =========================================================================

    // Esperar a que cargue el catálogo
    await expect(page.locator('section.glass-card h2:has-text("Elige sede")')).toBeVisible({ timeout: 8000 });

    // Clic en la primera card de sede
    const sedeCards = page.locator('section.glass-card .grid button[class*="rounded-xl"]');
    await sedeCards.first().click();

    // Esperar a que aparezca la sección de servicios y seleccionar el primero
    const servicioCards = page.locator('p:has-text("Servicios de la sede elegida") ~ div button[class*="rounded-xl"]');
    await expect(servicioCards.first()).toBeVisible({ timeout: 5000 });
    await servicioCards.first().click();

    // Avanzar al siguiente paso
    await page.getByRole('button', { name: 'Continuar' }).click();

    // =========================================================================
    // ETAPA 2: Barbero y Horario
    // =========================================================================

    // Esperar a que cargue el encabezado de la etapa 2
    await expect(page.locator('h2:has-text("Barbero y horario")')).toBeVisible({ timeout: 8000 });

    // --- Seleccionar barbero ---
    // Los botones de barbero tienen imagen circular (rounded-full) y nombre del barbero
    const barberoCards = page.locator('section.glass-card .grid button:has(img.rounded-full)');
    await expect(barberoCards.first()).toBeVisible({ timeout: 5000 });
    await barberoCards.first().click();

    // --- Seleccionar fecha en el calendario ---
    const diasCalendario = page.locator('div.grid.grid-cols-7 button.h-8:not([disabled])');
    await expect(diasCalendario.first()).toBeVisible({ timeout: 5000 });
    await diasCalendario.first().click(); 
    //await diasCalendario.nth(4).click();

    // --- Esperar a que carguen los slots ---
    await expect(page.locator('div:has-text("Disponibles")').last()).not.toContainText('Actualizando...', { timeout: 10000 });

    // --- Seleccionar el slot de hora ---
    const slotButtons = page.locator('div.grid.grid-cols-3 button, div.grid.grid-cols-4 button').filter({
      hasText: /^\d{1,2}:\d{2}$/,
    });
    await expect(slotButtons.first()).toBeVisible({ timeout: 8000 });
    await slotButtons.first().click();

    // =========================================================================
    // SECCIÓN GRUPO: Verificar card de servicios y acompañantes
    // =========================================================================

    // Esperar a que aparezca la card de grupo (tiene el título "Servicios y Asistentes del Grupo")
    await expect(page.locator('h3:has-text("Servicios y Asistentes del Grupo")')).toBeVisible({ timeout: 5000 });

    // El primer asistente ya está pre-seleccionado con el servicio elegido en etapa 1.
    // Opcionales: editar servicio del asistente principal abriendo el modal flotante.
    const botonesEdicionServicio = page.locator('button:has(img.rounded-lg):has(svg path[d*="m8.25 4.5 7.5"])');
    await expect(botonesEdicionServicio.first()).toBeVisible({ timeout: 5000 });
    await botonesEdicionServicio.first().click();

    // --- Modal de selección de servicios ---
    const modalServicio = page.locator('div[class*="max-h-"][class*="rounded-2xl"]').filter({
      has: page.locator('h3:has-text("Seleccionar Servicio")'),
    });
    await expect(modalServicio).toBeVisible({ timeout: 5000 });

    // Seleccionar el primer servicio del modal
    const serviciosEnModal = modalServicio.locator('div.grid button[class*="rounded-xl"]');
    await expect(serviciosEnModal.first()).toBeVisible({ timeout: 5000 });
    await serviciosEnModal.first().click();

    // Verificar que el modal se cerró
    await expect(modalServicio).toBeHidden({ timeout: 5000 });

    // --- Avanzar a pago ---
    await page.getByRole('button', { name: 'Ir a pago' }).click();

    // =========================================================================
    // ETAPA 3: Pago y Confirmación
    // =========================================================================

    // Esperar a que cargue el resumen del ticket
    await expect(page.locator('h2:has-text("Resumen del Ticket")')).toBeVisible({ timeout: 8000 });

    // Seleccionar método de pago: Efectivo
    await page.getByRole('button', { name: 'Efectivo' }).click();

    // Verificar que aparezca el bloque informativo del pago físico
    await expect(page.locator('h4:has-text("Pago Físico en Establecimiento")')).toBeVisible({ timeout: 5000 });

    // Confirmar la reserva
    await page.getByRole('button', { name: 'Confirmar y Registrar Cita' }).click();

    // =========================================================================
    // 4. VERIFICACIÓN FINAL
    // =========================================================================

    // Esperar el modal de éxito con el checkmark
    await expect(page.locator('h3:has-text("¡Reserva Confirmada!")')).toBeVisible({ timeout: 12000 });

    // Esperar redirección automática
    await page.waitForURL('**/mis-citas?created=1', { timeout: 8000 });
    await expect(page).toHaveURL(/.*created=1/);
  });

});