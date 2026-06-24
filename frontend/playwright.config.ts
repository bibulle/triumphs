import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'fs';

// Chromium pré-installé dans le container de dev — ignoré en CI
const DEV_CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const useDevChrome = existsSync(DEV_CHROME);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    launchOptions: {
      ...(useDevChrome && { executablePath: DEV_CHROME }),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
