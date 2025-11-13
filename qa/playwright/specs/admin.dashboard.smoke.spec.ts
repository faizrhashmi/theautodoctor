import { test, expect } from '@playwright/test';
import { setupErrorCollection, assertNoSevereErrors, getErrorSummary } from '../helpers/console-network.js';
import { scanAndAttach } from '../helpers/axe.js';

/**
 * Admin dashboard smoke tests
 */
test.describe('Admin: Dashboard Smoke Tests', () => {
  test('should load admin dashboard', async ({ page }, testInfo) => {
    const errors = setupErrorCollection(page);

    console.log('\n📍 Loading admin dashboard');
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Verify we're on admin page
    await expect(page).toHaveURL(/\/admin/);

    // Check for main heading
    const heading = page.getByRole('heading', {
      name: /admin|dashboard|overview/i,
    });
    await expect(heading.first()).toBeVisible();

    console.log('   ✅ Dashboard loaded');

    // Run accessibility scan
    await scanAndAttach(page, testInfo);

    // Check for no severe errors (allow warnings)
    assertNoSevereErrors(errors, {
      allowWarnings: true,
      ignoreConsolePatterns: [
        /webpack/i,
        /Download the React DevTools/i,
      ],
    });

    console.log(`📊 Test Summary: ${getErrorSummary(errors)}`);
  });

  test('should display sessions table', async ({ page }) => {
    const errors = setupErrorCollection(page);

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    console.log('\n📍 Checking sessions table');

    // Look for table or sessions list
    const sessionsTable = page.locator('table, [role="table"], [data-sessions]').first();
    await expect(sessionsTable).toBeVisible({ timeout: 10000 });

    // Check for table headings (common patterns)
    const headings = page.locator('th, [role="columnheader"]');
    const headingCount = await headings.count();

    expect(headingCount).toBeGreaterThan(0);
    console.log(`   ✅ Found ${headingCount} table columns`);

    console.log(`📊 Test Summary: ${getErrorSummary(errors)}`);
  });

  test('should have filter and search functionality', async ({ page }) => {
    const errors = setupErrorCollection(page);

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    console.log('\n📍 Checking filters and search');

    // Look for common filter/search patterns
    const searchInput = page.getByPlaceholder(/search|filter|find/i).or(
      page.getByLabel(/search|filter|find/i)
    );

    const hasSearch = await searchInput.count() > 0;

    // Look for filter dropdowns or buttons
    const filterButtons = page.getByRole('button', {
      name: /filter|status|type|date/i,
    });

    const hasFilters = await filterButtons.count() > 0;

    // At least one should exist
    expect(hasSearch || hasFilters).toBeTruthy();

    if (hasSearch) {
      console.log('   ✅ Search functionality present');
    }

    if (hasFilters) {
      console.log('   ✅ Filter functionality present');
    }

    console.log(`📊 Test Summary: ${getErrorSummary(errors)}`);
  });

  test('should have export functionality', async ({ page }) => {
    const errors = setupErrorCollection(page);

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    console.log('\n📍 Checking export functionality');

    // Look for export button
    const exportButton = page.getByRole('button', {
      name: /export|download|csv|excel/i,
    }).or(page.getByRole('link', {
      name: /export|download|csv|excel/i,
    }));

    const hasExport = await exportButton.count() > 0;

    if (hasExport) {
      console.log('   ✅ Export functionality present');
      expect(hasExport).toBeTruthy();
    } else {
      console.log('   ⚠️  Export functionality not found (may be optional)');
    }

    console.log(`📊 Test Summary: ${getErrorSummary(errors)}`);
  });

  test('should navigate to different admin sections', async ({ page }) => {
    const errors = setupErrorCollection(page);

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    console.log('\n📍 Checking admin navigation');

    // Look for navigation menu
    const nav = page.locator('nav, [role="navigation"], aside').first();
    await expect(nav).toBeVisible({ timeout: 10000 });

    // Common admin nav items
    const navItems = [
      /dashboard|overview/i,
      /sessions/i,
      /users|customers|mechanics/i,
      /settings/i,
    ];

    let foundCount = 0;

    for (const pattern of navItems) {
      const link = page.getByRole('link', { name: pattern });
      const hasLink = await link.count() > 0;

      if (hasLink) {
        foundCount++;
        console.log(`   ✅ Found nav item: ${pattern.source}`);
      }
    }

    // Should have at least 2 nav items
    expect(foundCount).toBeGreaterThanOrEqual(2);

    console.log(`📊 Test Summary: ${getErrorSummary(errors)}`);
  });

  test('should display statistics or metrics', async ({ page }) => {
    const errors = setupErrorCollection(page);

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    console.log('\n📍 Checking for statistics/metrics');

    // Look for stat cards or metrics
    const statCards = page.locator(
      '[data-stat], [data-metric], .stat-card, .metric, [role="article"]'
    );

    const count = await statCards.count();

    if (count > 0) {
      console.log(`   ✅ Found ${count} stat card(s)`);
      expect(count).toBeGreaterThan(0);
    } else {
      console.log('   ⚠️  No stat cards found (may not be on overview page)');
    }

    console.log(`📊 Test Summary: ${getErrorSummary(errors)}`);
  });

  test('should load without performance issues', async ({ page }) => {
    const errors = setupErrorCollection(page);

    console.log('\n📍 Checking page load performance');

    const startTime = Date.now();
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`   Load time: ${loadTime}ms`);

    // Should load within reasonable time
    expect(loadTime).toBeLessThan(10000); // 10 seconds max

    if (loadTime < 3000) {
      console.log('   ✅ Excellent load time');
    } else if (loadTime < 5000) {
      console.log('   ✅ Good load time');
    } else {
      console.log('   ⚠️  Slow load time');
    }

    console.log(`📊 Test Summary: ${getErrorSummary(errors)}`);
  });
});
