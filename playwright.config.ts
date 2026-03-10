import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  webServer: {
    command: 'ALLOW_TEST_AUTH=true DEV_AUTH_USER_ID= npm run build && ALLOW_TEST_AUTH=true DEV_AUTH_USER_ID= npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:4173',
  },
});
