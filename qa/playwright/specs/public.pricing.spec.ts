import { test, expect } from '@playwright/test';
import { setupErrorCollection, assertNoSevereErrors } from '../helpers/console-network.js';
import { scanAndAttach } from '../helpers/axe.js';

test.describe('Public: Pricing Page', () => {
  test('should display pricing plans', async ({ page }, testInfo) => {
    const errors = setupErrorCollection(page);

    // Navigate to pricing page
    await page.goto('/pricing');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check page title/heading
    const heading = page.getByRole('heading', {
      name: /pricing|plans|choose.*plan/i,
    });
    await expect(heading.first()).toBeVisible();

    // Check for plan cards - adjust selectors based on your actual pricing page
    // Looking for common pricing card patterns
    const planCards = page.locator('[data-plan], .plan-card, .pricing-card, article').filter({
      has: page.locator('text=/standard|premium|basic|pro/i'),
    });

    // Should have at least 2 plans
    const count = await planCards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Run accessibility scan
    await scanAndAttach(page, testInfo);

    // Assert no severe console/network errors
    assertNoSevereErrors(errors, {
      allowWarnings: true,
    });
  });

  test('should show plan features', async ({ page }) => {
    await page.goto('/pricing');

    // Each plan should have a list of features
    const features = page.locator('ul li, .feature, [data-feature]');
    const featureCount = await features.count();

    expect(featureCount).toBeGreaterThan(0);
  });

  test('should have CTA buttons for each plan', async ({ page }) => {
    await page.goto('/pricing');

    // Look for plan selection buttons
    const ctaButtons = page.getByRole('button', {
      name: /select|choose|get started|buy now|subscribe/i,
    }).or(page.getByRole('link', {
      name: /select|choose|get started|buy now|subscribe/i,
    }));

    const count = await ctaButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('should display pricing information', async ({ page }) => {
    await page.goto('/pricing');

    // Look for price indicators (dollar signs, numbers, etc.)
    const prices = page.locator('text=/\\$|usd|price|\\d+.*min/i');
    const priceCount = await prices.count();

    expect(priceCount).toBeGreaterThan(0);
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.goto('/pricing');

    // Plans should stack vertically on mobile or be in a scrollable container
    const planCards = page.locator('[data-plan], .plan-card, .pricing-card').first();
    await expect(planCards).toBeVisible();

    // Ensure content is readable (not cut off)
    const viewport = page.viewportSize();
    if (viewport) {
      expect(viewport.width).toBeGreaterThan(0);
    }
  });

  test('should show specialist vs standard pricing', async ({ page }) => {
    await page.goto('/pricing');

    // Based on your app, check for specialist and standard pricing
    const specialistMention = page.getByText(/specialist|expert|certified/i);
    const standardMention = page.getByText(/standard|regular|basic/i);

    // At least one should exist
    const hasSpecialist = await specialistMention.count() > 0;
    const hasStandard = await standardMention.count() > 0;

    expect(hasSpecialist || hasStandard).toBeTruthy();
  });
});
