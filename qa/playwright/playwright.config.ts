import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'path';

/**
 * Playwright configuration for The Auto Doctor QA suite
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './specs',

  /* Maximum time one test can run */
  timeout: 90_000,

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', {
      outputFolder: resolve(process.cwd(), 'playwright/playwright-report'),
      open: 'never',
    }],
    ['json', {
      outputFile: resolve(process.cwd(), 'reports/results.json'),
    }],
    ['list'],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.QA_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'retain-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Maximum time each action can take */
    actionTimeout: 15_000,

    /* Navigation timeout */
    navigationTimeout: 30_000,
  },

  /* Configure projects for major browsers and devices */
  projects: [
    // Setup projects for authentication
    {
      name: 'setup-customer',
      testMatch: /auth\.login\.customer\.setup\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-mechanic',
      testMatch: /auth\.login\.mechanic\.setup\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-admin',
      testMatch: /auth\.login\.admin\.setup\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Desktop Chrome - Public
    {
      name: 'chrome-public',
      testMatch: /public\..*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Desktop Chrome - Authenticated (depends on setup)
    {
      name: 'chrome-customer',
      testMatch: /customer\..*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: resolve(process.cwd(), 'playwright/fixtures/auth.storage.customer.json'),
      },
      dependencies: ['setup-customer'],
    },
    {
      name: 'chrome-mechanic',
      testMatch: /mechanic\..*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: resolve(process.cwd(), 'playwright/fixtures/auth.storage.mechanic.json'),
      },
      dependencies: ['setup-mechanic'],
    },
    {
      name: 'chrome-admin',
      testMatch: /admin\..*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: resolve(process.cwd(), 'playwright/fixtures/auth.storage.admin.json'),
      },
      dependencies: ['setup-admin'],
    },

    // Mobile Chrome (Pixel 7) - Public only
    {
      name: 'mobile-public',
      testMatch: /public\..*\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: resolve(process.cwd(), 'playwright/test-results'),
});
