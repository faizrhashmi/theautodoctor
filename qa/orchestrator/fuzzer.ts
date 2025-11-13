import { chromium, Browser, Page } from '@playwright/test';
import { writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';

export interface FuzzResult {
  url: string;
  formIndex: number;
  testCase: string;
  consoleErrors: string[];
  networkErrors: string[];
  validationMessages: string[];
  httpStatus?: number;
}

export interface FuzzerSummary {
  testedPages: string[];
  totalTests: number;
  findings: FuzzResult[];
  duration: number;
}

export interface FuzzOptions {
  baseUrl: string;
  storageStatePath?: string;
  pages?: string[];
  outputPath?: string;
}

const FUZZ_INPUTS = [
  { name: 'empty', value: '' },
  { name: 'very-long', value: 'A'.repeat(10000) },
  { name: 'invalid-email', value: 'not-an-email' },
  { name: 'sql-injection', value: "'; DROP TABLE users; --" },
  { name: 'xss-attempt', value: '<script>alert("xss")</script>' },
  { name: 'null-byte', value: 'test\0test' },
  { name: 'special-chars', value: '!@#$%^&*()_+-=[]{}|;:,.<>?' },
];

/**
 * Fuzzes forms on key pages to detect validation issues, JS errors, and server errors
 */
export async function fuzzSite(options: FuzzOptions): Promise<FuzzerSummary> {
  const {
    baseUrl,
    storageStatePath,
    pages = ['/', '/login', '/customer/dashboard'],
    outputPath = resolve(process.cwd(), 'reports/fuzzer.json'),
  } = options;

  console.log('\n🔧 Starting fuzzer...');
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Pages to fuzz: ${pages.join(', ')}`);

  const startTime = Date.now();
  const findings: FuzzResult[] = [];
  const testedPages: string[] = [];

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext(
      storageStatePath ? { storageState: storageStatePath } : {}
    );

    for (const pagePath of pages) {
      const url = new URL(pagePath, baseUrl).toString();
      console.log(`\n   Testing: ${url}`);

      const page = await context.newPage();

      // Collect console errors
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Collect network errors
      const networkErrors: string[] = [];
      page.on('response', (response) => {
        if (response.status() >= 400) {
          networkErrors.push(`${response.status()} ${response.url()}`);
        }
      });
      page.on('requestfailed', (request) => {
        networkErrors.push(`Failed: ${request.url()} - ${request.failure()?.errorText}`);
      });

      try {
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        if (!response || response.status() >= 400) {
          console.log(`   ⚠️  Page not accessible (${response?.status()})`);
          await page.close();
          continue;
        }

        testedPages.push(url);

        // Find all forms on the page
        const forms = await page.$$('form');
        console.log(`   Found ${forms.length} form(s)`);

        for (let formIndex = 0; formIndex < forms.length; formIndex++) {
          const form = forms[formIndex];

          // Get all inputs in this form
          const inputs = await form.$$('input:not([type="hidden"]), textarea, select');

          if (inputs.length === 0) {
            console.log(`   Form ${formIndex}: No inputs found`);
            continue;
          }

          console.log(`   Form ${formIndex}: Testing with ${inputs.length} input(s)`);

          for (const fuzzInput of FUZZ_INPUTS) {
            // Reset page state for each test
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            const freshForm = await page.$$('form').then((forms) => forms[formIndex]);

            if (!freshForm) continue;

            const freshInputs = await freshForm.$$('input:not([type="hidden"]), textarea, select');
            const consoleErrorsBefore = consoleErrors.length;
            const networkErrorsBefore = networkErrors.length;

            try {
              // Fill all inputs with the fuzz value
              for (const input of freshInputs) {
                const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
                const type = await input.evaluate((el) =>
                  el.getAttribute('type')?.toLowerCase()
                );

                if (tagName === 'select') {
                  // For selects, just click (don't try to fill)
                  continue;
                } else if (type === 'checkbox' || type === 'radio') {
                  // For checkboxes/radios, just click
                  await input.click().catch(() => {});
                } else {
                  // For text inputs, fill with fuzz value
                  await input.fill(fuzzInput.value).catch(() => {});
                }
              }

              // Try to submit
              await freshForm.evaluate((f) => (f as HTMLFormElement).submit());

              // Wait a bit for any async validation or navigation
              await page.waitForTimeout(1000);

              // Collect validation messages
              const validationMessages = await page
                .$$eval('[role="alert"], .error, .invalid-feedback', (elements) =>
                  elements.map((el) => el.textContent?.trim() || '')
                )
                .catch(() => []);

              // Check for new errors
              const newConsoleErrors = consoleErrors.slice(consoleErrorsBefore);
              const newNetworkErrors = networkErrors.slice(networkErrorsBefore);

              if (
                newConsoleErrors.length > 0 ||
                newNetworkErrors.length > 0 ||
                validationMessages.length > 0
              ) {
                findings.push({
                  url,
                  formIndex,
                  testCase: fuzzInput.name,
                  consoleErrors: newConsoleErrors,
                  networkErrors: newNetworkErrors,
                  validationMessages: validationMessages.filter(Boolean),
                });
              }
            } catch (error) {
              // Form submission errors are expected
            }
          }
        }
      } catch (error) {
        const err = error as Error;
        console.log(`   ❌ Error testing page: ${err.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser?.close();
  }

  const duration = Date.now() - startTime;

  const summary: FuzzerSummary = {
    testedPages,
    totalTests: findings.length,
    findings,
    duration,
  };

  // Save fuzzer report
  await mkdir(resolve(process.cwd(), 'reports'), { recursive: true });
  await writeFile(outputPath, JSON.stringify(summary, null, 2));

  console.log(`\n✅ Fuzzer finished in ${(duration / 1000).toFixed(1)}s`);
  console.log(`   Pages tested: ${testedPages.length}`);
  console.log(`   Total findings: ${findings.length}`);
  console.log(`   Report saved to: ${outputPath}`);

  return summary;
}
