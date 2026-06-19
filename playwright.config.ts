import { existsSync, readFileSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

function loadLocalEnvFile() {
  const envPath = '.env.local';

  if (!existsSync(envPath)) {
    return;
  }

  const raw = readFileSync(envPath, 'utf8');

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadLocalEnvFile();

const baseURL = process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3000';
const usesLocalServer = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(baseURL);

if (usesLocalServer && !process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY) {
  process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY = 'pk_test_playwright';
}

export default defineConfig({
  testDir: './tests/playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  timeout: process.env.CI ? 45000 : 30000,
  expect: {
    timeout: process.env.CI ? 10000 : 5000,
  },

  use: {
    baseURL,
    trace: 'on-first-retry',
    actionTimeout: process.env.CI ? 15000 : 0,
    navigationTimeout: process.env.CI ? 20000 : 0,
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

  webServer: usesLocalServer
    ? {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      }
    : undefined,
});
