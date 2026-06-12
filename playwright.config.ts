import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    /* 1. DESCOMENTA Y CONFIGURA LA BASE URL */
    // Esto evita que tengas que escribir "http://localhost:3000/login" en cada test. 
    // Ahora solo escribirás "/login".
    baseURL: 'http://localhost:3000', 

    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* 2. DESCOMENTA Y ADAPTA EL WEBSERVER PARA NEXT.JS */
  // Cambiamos 'npm run start' por 'npm run dev' para que Playwright levante tu 
  // servidor de desarrollo de Next.js automáticamente cuando lances las pruebas.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // Le damos 2 min máximo para levantar por si la hidratación de React 19 tarda en CI
  },
});