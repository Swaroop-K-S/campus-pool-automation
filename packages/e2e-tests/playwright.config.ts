import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,  // serial – we want to watch sequentially
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost',   // Docker nginx on port 80
    trace: 'on',
    video: 'on',
    screenshot: 'on',
    headless: false,               // headed so we can watch the ghost in the machine
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer block – frontend is already live in Docker
});
