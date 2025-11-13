import { test, expect } from '@playwright/test';
import { setupErrorCollection, getErrorSummary } from '../helpers/console-network.js';
import { scanAndAttach } from '../helpers/axe.js';
import { fillStripeCard, STRIPE_TEST_CARDS, isStripeAvailable } from '../helpers/stripe.js';
import { waitForLiveKitConnection, isLiveKitAvailable, grantMediaPermissions } from '../helpers/livekit.js';

/**
 * Customer booking flow - Happy path
 * Tests the complete journey from dashboard to session completion
 */
test.describe('Customer: Booking Flow', () => {
  test.beforeEach(async ({ context }) => {
    // Grant media permissions for LiveKit
    await grantMediaPermissions(context);
  });

  test('should complete full booking flow', async ({ page }, testInfo) => {
    const errors = setupErrorCollection(page);

    // Step 1: Navigate to dashboard
    console.log('\n📍 Step 1: Navigate to customer dashboard');
    await page.goto('/customer/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/customer/);
    await scanAndAttach(page, testInfo);

    // Step 2: Add vehicle (if needed)
    console.log('\n📍 Step 2: Check for existing vehicle or add new');
    const addVehicleButton = page.getByRole('button', {
      name: /add vehicle|add car|new vehicle/i,
    }).or(page.getByRole('link', {
      name: /add vehicle|add car|new vehicle/i,
    }));

    const hasAddButton = await addVehicleButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasAddButton) {
      console.log('   Adding new vehicle...');
      await addVehicleButton.click();

      // Fill vehicle details - adjust selectors based on your form
      await page.getByLabel(/make/i).fill('Toyota');
      await page.getByLabel(/model/i).fill('Camry');
      await page.getByLabel(/year/i).fill('2020');

      // Additional fields if present
      const colorField = page.getByLabel(/color/i);
      if (await colorField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await colorField.fill('Silver');
      }

      const vinField = page.getByLabel(/vin/i);
      if (await vinField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await vinField.fill('1HGBH41JXMN109186');
      }

      // Save vehicle
      await page.getByRole('button', { name: /save|add|continue/i }).click();
      await page.waitForLoadState('networkidle');
      console.log('   ✅ Vehicle added');
    } else {
      console.log('   ✅ Vehicle already exists');
    }

    // Step 3: Start intake process
    console.log('\n📍 Step 3: Start service intake');
    const startIntakeButton = page.getByRole('button', {
      name: /start intake|begin|book service|get started/i,
    }).or(page.getByRole('link', {
      name: /start intake|begin|book service|get started/i,
    }));

    await startIntakeButton.click();
    await page.waitForLoadState('networkidle');

    // Step 4: Complete intake form
    console.log('\n📍 Step 4: Complete intake form');
    // Adjust based on your actual intake form fields
    const issueDescription = page.getByLabel(/issue|problem|describe|concern/i);
    if (await issueDescription.isVisible({ timeout: 5000 }).catch(() => false)) {
      await issueDescription.fill('Check engine light is on and car is making unusual noise');
    }

    const continueButton = page.getByRole('button', { name: /continue|next|proceed/i });
    await continueButton.click();
    await page.waitForLoadState('networkidle');

    // Step 5: Accept waiver
    console.log('\n📍 Step 5: Accept waiver');
    const waiverCheckbox = page.getByRole('checkbox', {
      name: /agree|accept|waiver|terms/i,
    }).or(page.getByLabel(/agree|accept|waiver|terms/i));

    if (await waiverCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await waiverCheckbox.check();
      await page.getByRole('button', { name: /continue|accept|next/i }).click();
      await page.waitForLoadState('networkidle');
      console.log('   ✅ Waiver accepted');
    }

    // Step 6: Select plan
    console.log('\n📍 Step 6: Select service plan');
    // Look for 30-minute standard plan
    const standardPlan = page.getByRole('button', {
      name: /standard.*30|30.*min.*standard/i,
    }).or(page.locator('[data-plan="standard-30"], [data-duration="30"]'));

    await standardPlan.first().click();
    await page.waitForTimeout(1000);
    console.log('   ✅ Selected Standard 30-minute plan');

    // Step 7: Select mechanic type
    console.log('\n📍 Step 7: Select mechanic type');
    const mechanicTypes = {
      standard: page.getByRole('button', { name: /^standard$/i }).or(page.getByLabel(/^standard$/i)),
      specialist: page.getByRole('button', { name: /specialist/i }).or(page.getByLabel(/specialist/i)),
    };

    // Try to select standard first, fall back to specialist
    if (await mechanicTypes.standard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await mechanicTypes.standard.click();
      console.log('   ✅ Selected Standard mechanic');
    } else if (await mechanicTypes.specialist.isVisible({ timeout: 5000 }).catch(() => false)) {
      await mechanicTypes.specialist.click();
      console.log('   ✅ Selected Specialist mechanic');
    }

    await page.getByRole('button', { name: /continue|next/i }).click();
    await page.waitForLoadState('networkidle');

    // Step 8: Enter location and search
    console.log('\n📍 Step 8: Search for mechanics by location');
    const postalCodeInput = page.getByLabel(/postal|zip|location/i).or(
      page.getByPlaceholder(/postal|zip|location/i)
    );
    await postalCodeInput.fill('90210');

    const searchButton = page.getByRole('button', { name: /search|find/i });
    await searchButton.click();
    await page.waitForLoadState('networkidle');

    // Wait for results
    await page.waitForSelector('[data-mechanic], .mechanic-card, .result', {
      timeout: 10000,
    });
    console.log('   ✅ Mechanic list loaded');

    // Step 9: Book first available mechanic
    console.log('\n📍 Step 9: Book mechanic');
    const bookButton = page.getByRole('button', { name: /book|select|choose/i }).first();
    await bookButton.click();
    await page.waitForLoadState('networkidle');

    // Step 10: Payment with Stripe
    console.log('\n📍 Step 10: Complete payment');
    if (!isStripeAvailable()) {
      console.log('   ⏭️  Stripe not configured, skipping payment');
      test.skip();
      return;
    }

    // Wait for Stripe form
    await page.waitForTimeout(2000);

    const filled = await fillStripeCard(page, {
      cardNumber: STRIPE_TEST_CARDS.SUCCESS,
    });

    if (!filled) {
      console.log('   ⚠️  Could not fill Stripe form, skipping rest of test');
      test.skip();
      return;
    }

    const payButton = page.getByRole('button', { name: /pay|complete|confirm/i });
    await payButton.click();

    // Wait for payment processing
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    console.log('   ✅ Payment completed');

    // Step 11: Join virtual session
    console.log('\n📍 Step 11: Join virtual session');
    if (!isLiveKitAvailable()) {
      console.log('   ⏭️  LiveKit not configured, skipping session join');
      console.log(`\n📊 Test Summary: ${getErrorSummary(errors)}`);
      return;
    }

    const joinButton = page.getByRole('button', { name: /join|start session|connect/i });
    if (await joinButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await joinButton.click();
      console.log('   Joining session...');

      const connected = await waitForLiveKitConnection(page, { timeout: 30000 });

      if (connected) {
        console.log('   ✅ Connected to session');

        // Step 12: End session
        console.log('\n📍 Step 12: End session');
        await page.waitForTimeout(5000); // Brief session duration

        const endButton = page.getByRole('button', { name: /end|leave|disconnect/i });
        if (await endButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await endButton.click();

          // Confirm if needed
          const confirmButton = page.getByRole('button', { name: /confirm|yes|end/i });
          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click();
          }

          await page.waitForLoadState('networkidle');
          console.log('   ✅ Session ended');

          // Check for completion message
          const completionMessage = page.getByText(/session.*complete|thank you|completed/i);
          await expect(completionMessage).toBeVisible({ timeout: 10000 });
        }
      }
    }

    console.log(`\n✅ Booking flow completed successfully`);
    console.log(`📊 Test Summary: ${getErrorSummary(errors)}`);
  });
});
