import { test as setup, expect } from '@playwright/test';
import { resolve } from 'path';

const authFile = resolve(process.cwd(), 'playwright/fixtures/auth.storage.admin.json');

/**
 * Setup test: Records admin authentication session
 * Run this manually with: pnpm record:admin
 */
setup('authenticate as admin', async ({ page }) => {
  const email = process.env.QA_ADMIN_EMAIL;
  const password = process.env.QA_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('⏭️  Admin credentials not set, skipping authentication setup');
    setup.skip();
    return;
  }

  console.log(`\n🔐 Logging in as admin: ${email}`);

  // Navigate to admin login page
  await page.goto('/admin/login');

  // Wait for login form to be visible
  await page.waitForLoadState('networkidle');

  // Fill in credentials - adjust selectors based on your actual login form
  const emailInput = page.getByLabel(/email/i).or(
    page.getByPlaceholder(/email/i)
  );
  await emailInput.fill(email);

  const passwordInput = page.getByLabel(/password/i).or(
    page.getByPlaceholder(/password/i)
  );
  await passwordInput.fill(password);

  // Click sign in button
  const signInButton = page.getByRole('button', {
    name: /sign in|log in|login|continue/i,
  });
  await signInButton.click();

  // Wait for navigation to complete
  // Adjust the URL pattern based on where your app redirects after login
  await page.waitForURL(/\/admin/, {
    timeout: 30000,
  }).catch(async () => {
    // If URL doesn't change, check for success indicators
    await page.waitForSelector('[data-authenticated="true"], [data-user-type="admin"]', {
      timeout: 10000,
    });
  });

  // Verify we're logged in by checking for user-specific elements
  // Adjust based on your app's post-login UI
  const userIndicator = page.getByRole('button', {
    name: /profile|account|logout|sign out/i,
  }).or(page.locator('[data-user-menu], [data-user-avatar]'));

  await expect(userIndicator.first()).toBeVisible({ timeout: 10000 });

  console.log('✅ Admin authentication successful');

  // Save authentication state
  await page.context().storageState({ path: authFile });

  console.log(`✅ Session saved to: ${authFile}`);

  // TODO: If your app uses magic links or OTP:
  // 1. Comment out the password flow above
  // 2. Implement email/OTP handling here
  // 3. Or manually complete login and save state with:
  //    await page.pause(); // Then manually login
  //    await page.context().storageState({ path: authFile });
});
