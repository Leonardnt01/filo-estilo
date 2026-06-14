import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  /* AJUSTE DE TIMEOUTS PARA LA NUBE */
  timeout: process.env.CI ? 45000 : 30000, // Le damos 45 segundos a cada test completo en CI
  expect: {
    timeout: process.env.CI ? 10000 : 5000, // Le damos 10 segundos a cada expect visual en CI
  },

  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    actionTimeout: process.env.CI ? 15000 : 0, // Tolerancia para escribir y dar clics en la nube
    navigationTimeout: process.env.CI ? 20000 : 0, // Tolerancia para las redirecciones de Supabase
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
  ],

  // Configuración del servidor interno para que el "robot" de CI pueda levantar la app de Next.js de forma autónoma
  webServer: {
    command: 'npm run start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // Le damos 2 min máximo para levantar por si la hidratación de React 19 tarda en CI
  },
});