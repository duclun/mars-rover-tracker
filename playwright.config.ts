import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5174',
    // headless: false required on this machine -- WebGL disabled in headless sandbox (M0 finding)
    headless: false,
    launchOptions: {
      args: ['--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox'],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
  },
});
