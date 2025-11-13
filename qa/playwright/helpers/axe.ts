import { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export interface AxeResults {
  violations: AxeViolation[];
  passes: number;
  incomplete: number;
}

export interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: number;
}

/**
 * Runs axe accessibility scan on the current page
 */
export async function runAxeScan(page: Page): Promise<AxeResults> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  return {
    violations: results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact as AxeViolation['impact'],
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.length,
    })),
    passes: results.passes.length,
    incomplete: results.incomplete.length,
  };
}

/**
 * Asserts no critical or serious accessibility violations
 */
export async function assertAccessibility(page: Page, options?: {
  ignoredRules?: string[];
  maxViolations?: number;
}): Promise<void> {
  const results = await runAxeScan(page);

  const criticalViolations = results.violations.filter(
    (v) =>
      (v.impact === 'critical' || v.impact === 'serious') &&
      !options?.ignoredRules?.includes(v.id)
  );

  const maxViolations = options?.maxViolations ?? 0;

  if (criticalViolations.length > maxViolations) {
    const messages = criticalViolations.map(
      (v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes} node(s))\n  Fix: ${v.help}\n  More info: ${v.helpUrl}`
    );

    throw new Error(
      `Found ${criticalViolations.length} critical/serious accessibility violation(s):\n\n${messages.join('\n\n')}`
    );
  }
}

/**
 * Scans page and attaches results to test report
 */
export async function scanAndAttach(page: Page, testInfo: any): Promise<AxeResults> {
  const results = await runAxeScan(page);

  // Attach results to test report
  await testInfo.attach('accessibility-scan', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  // Log summary
  console.log(`   A11y: ${results.violations.length} violations, ${results.passes} passes`);

  return results;
}
