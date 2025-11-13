import { Page } from '@playwright/test';

/**
 * Stripe helper utilities for QA tests
 * These functions provide safe stubs that skip gracefully if Stripe env vars are missing
 */

export interface StripeConfig {
  secretKey?: string;
}

// Test card numbers for Stripe
export const STRIPE_TEST_CARDS = {
  SUCCESS: '4242424242424242',
  DECLINE: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
  REQUIRE_3DS: '4000002500003155',
};

/**
 * Checks if Stripe is configured
 */
export function isStripeAvailable(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Gets Stripe config from environment
 */
export function getStripeConfig(): StripeConfig | null {
  if (!isStripeAvailable()) {
    return null;
  }

  return {
    secretKey: process.env.STRIPE_SECRET_KEY,
  };
}

/**
 * Fills Stripe card element with test card details
 */
export async function fillStripeCard(
  page: Page,
  options?: {
    cardNumber?: string;
    expiry?: string;
    cvc?: string;
    postalCode?: string;
  }
): Promise<boolean> {
  if (!isStripeAvailable()) {
    console.log('   ⏭️  Stripe not configured, skipping card fill');
    return false;
  }

  const {
    cardNumber = STRIPE_TEST_CARDS.SUCCESS,
    expiry = '12/34',
    cvc = '123',
    postalCode = '12345',
  } = options || {};

  try {
    // Wait for Stripe iframe to load
    const cardFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();

    // Fill card number
    await cardFrame.locator('[name="cardnumber"], [placeholder*="Card number"]').fill(cardNumber);

    // Fill expiry
    await cardFrame.locator('[name="exp-date"], [placeholder*="MM"], [placeholder*="Expiry"]').fill(expiry);

    // Fill CVC
    await cardFrame.locator('[name="cvc"], [placeholder*="CVC"], [placeholder*="CVV"]').fill(cvc);

    // Fill postal code (if present)
    const postalField = cardFrame.locator('[name="postal"], [placeholder*="ZIP"]');
    if (await postalField.count() > 0) {
      await postalField.fill(postalCode);
    }

    console.log('   ✅ Stripe card details filled');
    return true;
  } catch (error) {
    console.log('   ⚠️  Could not fill Stripe card details:', (error as Error).message);
    return false;
  }
}

/**
 * Fills Stripe Elements (newer integration)
 */
export async function fillStripeElements(
  page: Page,
  options?: {
    cardNumber?: string;
    expiry?: string;
    cvc?: string;
    postalCode?: string;
  }
): Promise<boolean> {
  if (!isStripeAvailable()) {
    console.log('   ⏭️  Stripe not configured, skipping elements fill');
    return false;
  }

  const {
    cardNumber = STRIPE_TEST_CARDS.SUCCESS,
    expiry = '1234',
    cvc = '123',
    postalCode = '12345',
  } = options || {};

  try {
    // Try to find and fill Stripe Elements inputs
    // These are often rendered as iframes or custom elements

    // Method 1: Look for Stripe iframes
    const frames = page.frames();
    const stripeFrame = frames.find(
      (f) => f.url().includes('stripe') || f.name().includes('stripe')
    );

    if (stripeFrame) {
      await stripeFrame.locator('[name="cardnumber"]').fill(cardNumber);
      await stripeFrame.locator('[name="exp-date"]').fill(expiry);
      await stripeFrame.locator('[name="cvc"]').fill(cvc);

      const postalField = stripeFrame.locator('[name="postal"]');
      if (await postalField.count() > 0) {
        await postalField.fill(postalCode);
      }

      console.log('   ✅ Stripe Elements filled (iframe method)');
      return true;
    }

    // Method 2: Look for regular input fields with Stripe-like attributes
    const cardInput = page.locator('input[name*="card"], input[placeholder*="Card"]').first();
    if (await cardInput.isVisible({ timeout: 5000 })) {
      await cardInput.fill(cardNumber);

      await page.locator('input[name*="exp"], input[placeholder*="Expiry"]').fill(expiry);
      await page.locator('input[name*="cvc"], input[placeholder*="CVC"]').fill(cvc);

      const postalInput = page.locator('input[name*="postal"], input[name*="zip"]');
      if (await postalInput.count() > 0) {
        await postalInput.fill(postalCode);
      }

      console.log('   ✅ Stripe Elements filled (direct method)');
      return true;
    }

    console.log('   ⚠️  Could not locate Stripe card inputs');
    return false;
  } catch (error) {
    console.log('   ⚠️  Could not fill Stripe Elements:', (error as Error).message);
    return false;
  }
}

/**
 * Waits for payment processing to complete
 */
export async function waitForPaymentSuccess(
  page: Page,
  options?: {
    timeout?: number;
  }
): Promise<boolean> {
  if (!isStripeAvailable()) {
    console.log('   ⏭️  Stripe not configured, skipping payment wait');
    return false;
  }

  const timeout = options?.timeout || 30000;

  try {
    // Wait for success indicators
    await page.waitForSelector(
      '[data-payment-success="true"], .payment-success, [aria-label*="success" i]',
      {
        timeout,
        state: 'visible',
      }
    ).catch(() => {
      // Alternative: wait for URL change to success page
      return page.waitForURL(/\/success|\/confirmation|\/complete/, { timeout });
    });

    console.log('   ✅ Payment successful');
    return true;
  } catch (error) {
    console.log('   ⚠️  Payment success timeout');
    return false;
  }
}

/**
 * Handles 3D Secure authentication if it appears
 */
export async function handle3DSecure(page: Page): Promise<boolean> {
  if (!isStripeAvailable()) {
    return false;
  }

  try {
    // Wait for 3DS iframe
    const threeDSFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();
    const completeButton = threeDSFrame.getByRole('button', { name: /complete|authenticate/i });

    if (await completeButton.isVisible({ timeout: 5000 })) {
      await completeButton.click();
      console.log('   ✅ 3D Secure completed');
      return true;
    }

    return false;
  } catch (error) {
    // 3DS not required
    return false;
  }
}

/**
 * Smoke test for Stripe integration
 */
export async function smokeTestStripe(page: Page): Promise<boolean> {
  if (!isStripeAvailable()) {
    console.log('   ⏭️  Stripe smoke test skipped (not configured)');
    return false;
  }

  try {
    // Check if Stripe.js is loaded
    const hasStripe = await page.evaluate(() => {
      return typeof (window as any).Stripe !== 'undefined';
    });

    if (hasStripe) {
      console.log('   ✅ Stripe.js detected');
      return true;
    } else {
      console.log('   ⚠️  Stripe.js not detected');
      return false;
    }
  } catch (error) {
    console.log('   ⚠️  Stripe smoke test failed');
    return false;
  }
}

/**
 * Checks if we're in Stripe test mode
 */
export function isStripeTestMode(): boolean {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return !!secretKey && secretKey.startsWith('sk_test_');
}

/**
 * Validates that we're using test keys (safety check)
 */
export function validateTestMode(): void {
  if (isStripeAvailable() && !isStripeTestMode()) {
    throw new Error(
      'DANGER: Stripe production key detected! QA tests must only use test keys (sk_test_...)'
    );
  }
}
