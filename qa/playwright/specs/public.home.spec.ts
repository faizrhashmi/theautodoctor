import { test, expect } from '@playwright/test';
import { setupErrorCollection, assertNoSevereErrors } from '../helpers/console-network.js';
import { scanAndAttach } from '../helpers/axe.js';

test.describe('Public: Home Page', () => {
  test('should display hero section and primary CTA', async ({ page }, testInfo) => {
    const errors = setupErrorCollection(page);

    // Navigate to home page
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check for hero section - adjust selectors based on your actual homepage
    const hero = page.locator('h1, [role="heading"][aria-level="1"]').first();
    await expect(hero).toBeVisible();

    // Check for primary CTA (common patterns)
    const cta = page.getByRole('link', {
      name: /get started|book now|find mechanic|start|begin/i,
    }).or(page.getByRole('button', {
      name: /get started|book now|find mechanic|start|begin/i,
    }));

    await expect(cta.first()).toBeVisible();

    // Run accessibility scan
    await scanAndAttach(page, testInfo);

    // Assert no severe console/network errors
    assertNoSevereErrors(errors, {
      allowWarnings: true,
      ignoreConsolePatterns: [
        /webpack/i,
        /Download the React DevTools/i,
      ],
    });
  });

  test('should have valid navigation menu', async ({ page }) => {
    await page.goto('/');

    // Check for navigation links (adjust based on your actual nav structure)
    const nav = page.getByRole('navigation').first();
    await expect(nav).toBeVisible();

    // Common navigation items - adjust based on your app
    const expectedLinks = [
      /home/i,
      /pricing|plans/i,
      /how it works|about/i,
      /login|sign in/i,
    ];

    for (const pattern of expectedLinks) {
      const link = nav.getByRole('link', { name: pattern });
      // Use soft assertion to continue checking other links
      await expect.soft(link).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.goto('/');

    // Check mobile menu toggle (hamburger menu)
    const mobileMenuButton = page.getByRole('button', {
      name: /menu|navigation/i,
    }).or(page.locator('[aria-label*="menu"]'));

    // Mobile menu should exist
    const menuExists = await mobileMenuButton.count() > 0;
    expect(menuExists).toBeTruthy();

    // Hero should still be visible on mobile
    const hero = page.locator('h1').first();
    await expect(hero).toBeVisible();
  });

  test('should load without layout shift', async ({ page }) => {
    await page.goto('/');

    // Wait for initial render
    await page.waitForLoadState('domcontentloaded');

    // Take initial screenshot
    const initialBox = await page.locator('body').boundingBox();

    // Wait for network idle
    await page.waitForLoadState('networkidle');

    // Take final screenshot
    const finalBox = await page.locator('body').boundingBox();

    // Body height shouldn't change dramatically (indicating layout shift)
    if (initialBox && finalBox) {
      const heightDiff = Math.abs(finalBox.height - initialBox.height);
      expect(heightDiff).toBeLessThan(200); // Allow some reasonable difference
    }
  });
});
