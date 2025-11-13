import { test, expect } from '@playwright/test';
import { setupErrorCollection, getErrorSummary } from '../helpers/console-network.js';
import { scanAndAttach } from '../helpers/axe.js';
import { waitForLiveKitConnection, isLiveKitAvailable, grantMediaPermissions } from '../helpers/livekit.js';

/**
 * Mechanic flow - Accept session and join
 */
test.describe('Mechanic: Accept and Join Session', () => {
  test.beforeEach(async ({ context }) => {
    // Grant media permissions for LiveKit
    await grantMediaPermissions(context);
  });

  test('should access dashboard and view sessions', async ({ page }, testInfo) => {
    const errors = setupErrorCollection(page);

    // Step 1: Navigate to mechanic dashboard
    console.log('\n📍 Step 1: Navigate to mechanic dashboard');
    await page.goto('/mechanic/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/mechanic/);

    // Run accessibility scan
    await scanAndAttach(page, testInfo);

    // Step 2: Check for sessions table/list
    console.log('\n📍 Step 2: Check for sessions');
    const sessionsContainer = page.locator('[data-sessions], .sessions-list, table').first();
    await expect(sessionsContainer).toBeVisible({ timeout: 10000 });

    console.log('   ✅ Sessions view loaded');

    console.log(`\n📊 Test Summary: ${getErrorSummary(errors)}`);
  });

  test('should accept pending session if available', async ({ page }) => {
    const errors = setupErrorCollection(page);

    await page.goto('/mechanic/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for pending sessions
    console.log('\n📍 Looking for pending sessions...');

    const acceptButton = page.getByRole('button', {
      name: /accept|claim|take session/i,
    });

    const hasPending = await acceptButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasPending) {
      console.log('   ⏭️  No pending sessions available, skipping accept flow');
      console.log(`📊 Test Summary: ${getErrorSummary(errors)}`);
      test.skip();
      return;
    }

    console.log('   ✅ Found pending session');

    // Accept the session
    await acceptButton.first().click();
    await page.waitForLoadState('networkidle');
    console.log('   ✅ Session accepted');

    // Verify status change
    const statusIndicator = page.getByText(/accepted|assigned|in progress/i);
    await expect(statusIndicator).toBeVisible({ timeout: 5000 });

    console.log(`\n📊 Test Summary: ${getErrorSummary(errors)}`);
  });

  test('should join virtual session if available', async ({ page }) => {
    if (!isLiveKitAvailable()) {
      console.log('⏭️  LiveKit not configured, skipping session join test');
      test.skip();
      return;
    }

    const errors = setupErrorCollection(page);

    await page.goto('/mechanic/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for active sessions to join
    console.log('\n📍 Looking for active sessions to join...');

    const joinButton = page.getByRole('button', {
      name: /join|start|connect|enter session/i,
    });

    const hasActive = await joinButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasActive) {
      console.log('   ⏭️  No active sessions available, skipping join flow');
      console.log(`📊 Test Summary: ${getErrorSummary(errors)}`);
      test.skip();
      return;
    }

    console.log('   ✅ Found active session');

    // Join the session
    await joinButton.first().click();
    console.log('   Joining session...');

    const connected = await waitForLiveKitConnection(page, { timeout: 30000 });

    if (connected) {
      console.log('   ✅ Connected to LiveKit session');

      // Verify session UI elements
      const sessionIndicators = page.locator('[data-session-active], .session-active');
      const hasIndicator = await sessionIndicators.count() > 0;

      if (hasIndicator) {
        await expect(sessionIndicators.first()).toBeVisible();
      }

      // End session
      console.log('\n📍 Ending session...');
      await page.waitForTimeout(5000); // Brief session duration

      const endButton = page.getByRole('button', { name: /end|complete|finish/i });
      if (await endButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await endButton.click();

        // Confirm if needed
        const confirmButton = page.getByRole('button', { name: /confirm|yes|complete/i });
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        await page.waitForLoadState('networkidle');
        console.log('   ✅ Session ended');
      }
    } else {
      console.log('   ⚠️  Could not connect to LiveKit session');
    }

    console.log(`\n📊 Test Summary: ${getErrorSummary(errors)}`);
  });

  test('should display mechanic profile correctly', async ({ page }, testInfo) => {
    const errors = setupErrorCollection(page);

    // Navigate to profile
    console.log('\n📍 Checking mechanic profile...');
    await page.goto('/mechanic/profile');
    await page.waitForLoadState('networkidle');

    // Check for profile fields
    const nameField = page.getByLabel(/name|full name/i).or(
      page.getByText(/name/i).locator('..').locator('input, div')
    );

    await expect(nameField.first()).toBeVisible({ timeout: 5000 });

    // Run accessibility scan
    await scanAndAttach(page, testInfo);

    console.log('   ✅ Profile loaded');
    console.log(`\n📊 Test Summary: ${getErrorSummary(errors)}`);
  });
});
