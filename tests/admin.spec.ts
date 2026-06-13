import { test, expect } from '@playwright/test';

test.describe('Módulo Administrativo - Filo y Estilo', () => {

  test('Debería navegar por el Dashboard interactivo revisando todas las sedes con scrolls', async ({ page }) => {
    // =========================================================================
    // 1. INICIO DE SESIÓN COMPLETO
    // =========================================================================
    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill('jgonzalezchaca@gmail.com');
    await page.getByPlaceholder('••••••••').fill('Jefferson159753');
    await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
    
    // Esperamos la redirección al panel de control
    await page.waitForURL('**/admin');

    // Validar que el encabezado del panel esté visible en pantalla
    await expect(page.locator('h2:has-text("Panel de Control")')).toBeVisible({ timeout: 8000 });

    // Sincronización de APIs: Esperar a que las métricas dejen de estar en carga ("--")
    const tarjetaPendientes = page.locator('p:has-text("Pendientes") + p');
    await expect(tarjetaPendientes).not.toContainText('--', { timeout: 10000 });

    // =========================================================================
    // 2. LOGICA DE SCROLL COMPLETO (Utilidad interna)
    // =========================================================================
    // Ejecutamos scripts directos en el navegador para bajar y subir limpiamente
    const ejecutarScrollCompleto = async () => {
      // Scroll hacia abajo hasta el final de la página
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500); // Pausa de 1.5s para apreciar los gráficos inferiores
      
      // Scroll de regreso hacia el tope de la página
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1000); // Pausa de 1s antes de la siguiente acción
    };

    // =========================================================================
    // 3. INTERACCIÓN Y REVISIÓN DE LAS 3 SEDES (Flujo solicitado)
    // =========================================================================
    // --- 1. Todas las Sedes ---
    // Ubicamos el botón global usando el texto Todas las sedes
    const botonTodasLasSedes = page.locator('button:has-text("Todas las Sedes"), button:has-text("Vista General")').first();
    await botonTodasLasSedes.click();
    await expect(page.locator('span:has-text("Global")').first()).toBeVisible({ timeout: 4000 });
    
    // Primer scroll inspeccionando la vista global
    await ejecutarScrollCompleto();


    // --- 2. Sede Principal ---
    // Ubicamos la pestaña que contiene el texto de la Sede Principal
    const botonSedePrincipal = page.locator('button:has-text("Sede Principal")').first();
    await botonSedePrincipal.click();
    
    // Esperamos que el estado de carga condicional de tu React se estabilice
    await page.waitForTimeout(1000);
    
    // Segundo scroll inspeccionando el rendimiento de la sede principal
    await ejecutarScrollCompleto();


    // --- 3. Sede Norte ---
    // Ubicamos la pestaña que contiene el texto de la Sede Norte
    const botonSedeNorte = page.locator('button:has-text("Sede Norte")').first();
    await botonSedeNorte.click();
    
    // Esperamos la actualización reactiva de las métricas en Supabase
    await page.waitForTimeout(1000);
    
    // Tercer y último scroll inspeccionando los gráficos de la sede norte
    await ejecutarScrollCompleto();

    // =========================================================================
    // VERIFICACIÓN FINAL
    // =========================================================================
    // Aseguramos que tras toda la navegación el botón de la Sede Norte permanezca seleccionado
    await expect(botonSedeNorte).toHaveClass(/.*shadow-xl.*/);
  });
});