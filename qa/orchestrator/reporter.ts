import { readFile, writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { postWebhook } from './utils/http.js';
import type { BrokenLink, CrawlResult } from './crawler.js';
import type { FuzzerSummary } from './fuzzer.js';

export interface PlaywrightResult {
  suites: any[];
  stats: {
    startTime: string;
    duration: number;
    expected: number;
    unexpected: number;
    flaky: number;
    skipped: number;
  };
}

export interface A11yViolation {
  id: string;
  impact: string;
  description: string;
  nodes: number;
}

export interface ReportSummary {
  timestamp: string;
  baseUrl: string;
  duration: number;
  playwright: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
  };
  crawler: {
    pagesVisited: number;
    brokenLinks: number;
  };
  fuzzer: {
    pagesTesteed: number;
    findings: number;
  };
  accessibility: {
    violations: number;
    criticalIssues: number;
  };
  topIssues: {
    brokenLinks: BrokenLink[];
    consoleErrors: string[];
    a11yViolations: A11yViolation[];
  };
}

export interface ReporterOptions {
  baseUrl: string;
  playwrightResultsPath?: string;
  brokenLinksPath?: string;
  fuzzerResultsPath?: string;
  a11yResultsPath?: string;
  outputDir?: string;
  slackWebhookUrl?: string;
}

/**
 * Generates HTML and JSON summary reports from all QA artifacts
 */
export async function generateReports(options: ReporterOptions): Promise<void> {
  const {
    baseUrl,
    playwrightResultsPath = resolve(process.cwd(), 'reports/results.json'),
    brokenLinksPath = resolve(process.cwd(), 'reports/broken-links.json'),
    fuzzerResultsPath = resolve(process.cwd(), 'reports/fuzzer.json'),
    outputDir = resolve(process.cwd(), 'reports'),
    slackWebhookUrl,
  } = options;

  console.log('\n📊 Generating reports...');

  await mkdir(outputDir, { recursive: true });

  // Load all results
  const playwrightResults = await loadJson<PlaywrightResult>(playwrightResultsPath);
  const brokenLinks = await loadJson<BrokenLink[]>(brokenLinksPath);
  const fuzzerResults = await loadJson<FuzzerSummary>(fuzzerResultsPath);

  // Build summary
  const summary: ReportSummary = {
    timestamp: new Date().toISOString(),
    baseUrl,
    duration: playwrightResults?.stats?.duration || 0,
    playwright: {
      total:
        (playwrightResults?.stats?.expected || 0) +
        (playwrightResults?.stats?.unexpected || 0) +
        (playwrightResults?.stats?.skipped || 0),
      passed: playwrightResults?.stats?.expected || 0,
      failed: playwrightResults?.stats?.unexpected || 0,
      skipped: playwrightResults?.stats?.skipped || 0,
      flaky: playwrightResults?.stats?.flaky || 0,
    },
    crawler: {
      pagesVisited: 0,
      brokenLinks: brokenLinks?.length || 0,
    },
    fuzzer: {
      pagesTesteed: fuzzerResults?.testedPages?.length || 0,
      findings: fuzzerResults?.findings?.length || 0,
    },
    accessibility: {
      violations: 0,
      criticalIssues: 0,
    },
    topIssues: {
      brokenLinks: (brokenLinks || []).slice(0, 10),
      consoleErrors: extractTopConsoleErrors(fuzzerResults),
      a11yViolations: [],
    },
  };

  // Save JSON summary
  const jsonPath = resolve(outputDir, 'summary.json');
  await writeFile(jsonPath, JSON.stringify(summary, null, 2));
  console.log(`   ✅ JSON summary: ${jsonPath}`);

  // Generate HTML summary
  const htmlPath = resolve(outputDir, 'summary.html');
  const html = generateHtmlReport(summary);
  await writeFile(htmlPath, html);
  console.log(`   ✅ HTML summary: ${htmlPath}`);

  // Post to Slack if webhook URL provided
  if (slackWebhookUrl) {
    await postSlackSummary(slackWebhookUrl, summary);
  }
}

async function loadJson<T>(path: string): Promise<T | null> {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function extractTopConsoleErrors(fuzzerResults: FuzzerSummary | null): string[] {
  if (!fuzzerResults?.findings) return [];

  const errors = new Map<string, number>();

  fuzzerResults.findings.forEach((finding) => {
    finding.consoleErrors.forEach((err) => {
      errors.set(err, (errors.get(err) || 0) + 1);
    });
  });

  return Array.from(errors.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([err, count]) => `${err} (${count}x)`);
}

function generateHtmlReport(summary: ReportSummary): string {
  const { playwright, crawler, fuzzer, accessibility } = summary;

  const passRate =
    playwright.total > 0
      ? ((playwright.passed / playwright.total) * 100).toFixed(1)
      : '0';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Report - ${new Date(summary.timestamp).toLocaleString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f5f5;
      padding: 2rem;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header h1 { color: #333; margin-bottom: 0.5rem; }
    .header .meta { color: #666; font-size: 0.9rem; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat-card h3 {
      font-size: 0.9rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }
    .stat-card .value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #333;
    }
    .stat-card .sub { color: #666; font-size: 0.9rem; margin-top: 0.5rem; }
    .stat-card.success .value { color: #10b981; }
    .stat-card.error .value { color: #ef4444; }
    .stat-card.warning .value { color: #f59e0b; }
    .section {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .section h2 {
      color: #333;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e5e7eb;
    }
    .issue-list { list-style: none; }
    .issue-list li {
      padding: 0.75rem;
      margin: 0.5rem 0;
      background: #f9fafb;
      border-left: 3px solid #ef4444;
      border-radius: 4px;
    }
    .issue-list li strong { color: #333; }
    .issue-list li .detail { color: #666; font-size: 0.9rem; margin-top: 0.25rem; }
    .empty-state {
      text-align: center;
      color: #10b981;
      padding: 2rem;
      font-size: 1.1rem;
    }
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 1rem;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #059669);
      transition: width 0.3s ease;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>QA Report</h1>
      <div class="meta">
        <div><strong>Base URL:</strong> ${summary.baseUrl}</div>
        <div><strong>Generated:</strong> ${new Date(summary.timestamp).toLocaleString()}</div>
        <div><strong>Duration:</strong> ${(summary.duration / 1000 / 60).toFixed(1)} minutes</div>
      </div>
    </div>

    <div class="stats">
      <div class="stat-card ${playwright.failed === 0 ? 'success' : 'error'}">
        <h3>Playwright Tests</h3>
        <div class="value">${playwright.passed}/${playwright.total}</div>
        <div class="sub">${passRate}% pass rate</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${passRate}%"></div>
        </div>
      </div>

      <div class="stat-card ${crawler.brokenLinks === 0 ? 'success' : 'warning'}">
        <h3>Broken Links</h3>
        <div class="value">${crawler.brokenLinks}</div>
        <div class="sub">${crawler.pagesVisited} pages crawled</div>
      </div>

      <div class="stat-card ${fuzzer.findings === 0 ? 'success' : 'warning'}">
        <h3>Fuzzer Findings</h3>
        <div class="value">${fuzzer.findings}</div>
        <div class="sub">${fuzzer.pagesTesteed} pages tested</div>
      </div>

      <div class="stat-card ${accessibility.violations === 0 ? 'success' : 'error'}">
        <h3>A11y Violations</h3>
        <div class="value">${accessibility.violations}</div>
        <div class="sub">${accessibility.criticalIssues} critical</div>
      </div>
    </div>

    ${
      playwright.failed > 0
        ? `
    <div class="section">
      <h2>⚠️ Failed Tests</h2>
      <p style="color: #666; margin-bottom: 1rem;">
        ${playwright.failed} test(s) failed. View detailed report in Playwright HTML reporter.
      </p>
      <a href="../playwright/playwright-report/index.html"
         style="display: inline-block; background: #3b82f6; color: white; padding: 0.75rem 1.5rem;
                text-decoration: none; border-radius: 4px; font-weight: 500;">
        View Playwright Report
      </a>
    </div>
    `
        : ''
    }

    <div class="section">
      <h2>🔗 Broken Links</h2>
      ${
        summary.topIssues.brokenLinks.length > 0
          ? `
        <ul class="issue-list">
          ${summary.topIssues.brokenLinks
            .map(
              (link) => `
            <li>
              <strong>${link.url}</strong> (${link.status} ${link.statusText})
              <div class="detail">Found on: ${link.referrers.join(', ')}</div>
            </li>
          `
            )
            .join('')}
        </ul>
      `
          : '<div class="empty-state">✅ No broken links found</div>'
      }
    </div>

    <div class="section">
      <h2>🐛 Top Console Errors</h2>
      ${
        summary.topIssues.consoleErrors.length > 0
          ? `
        <ul class="issue-list">
          ${summary.topIssues.consoleErrors.map((err) => `<li>${err}</li>`).join('')}
        </ul>
      `
          : '<div class="empty-state">✅ No console errors detected</div>'
      }
    </div>

    <div class="section">
      <h2>📋 Summary</h2>
      <ul style="list-style: none;">
        <li>✅ <strong>${playwright.passed}</strong> tests passed</li>
        <li>${
          playwright.failed > 0 ? '❌' : '✅'
        } <strong>${playwright.failed}</strong> tests failed</li>
        <li>⏭️ <strong>${playwright.skipped}</strong> tests skipped</li>
        <li>${
          crawler.brokenLinks > 0 ? '⚠️' : '✅'
        } <strong>${crawler.brokenLinks}</strong> broken links</li>
        <li>${
          fuzzer.findings > 0 ? '⚠️' : '✅'
        } <strong>${fuzzer.findings}</strong> fuzzer findings</li>
        <li>${
          accessibility.violations > 0 ? '❌' : '✅'
        } <strong>${accessibility.violations}</strong> accessibility violations</li>
      </ul>
    </div>
  </div>
</body>
</html>`;
}

async function postSlackSummary(webhookUrl: string, summary: ReportSummary): Promise<void> {
  const { playwright, crawler, fuzzer, accessibility } = summary;

  const statusEmoji =
    playwright.failed === 0 && crawler.brokenLinks === 0 && accessibility.violations === 0
      ? ':white_check_mark:'
      : ':warning:';

  const message = {
    text: `${statusEmoji} QA Report - ${new Date(summary.timestamp).toLocaleString()}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji} QA Report`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Base URL:*\n${summary.baseUrl}`,
          },
          {
            type: 'mrkdwn',
            text: `*Duration:*\n${(summary.duration / 1000 / 60).toFixed(1)} minutes`,
          },
        ],
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Playwright Tests:*\n${playwright.passed}/${playwright.total} passed`,
          },
          {
            type: 'mrkdwn',
            text: `*Broken Links:*\n${crawler.brokenLinks} found`,
          },
          {
            type: 'mrkdwn',
            text: `*Fuzzer:*\n${fuzzer.findings} findings`,
          },
          {
            type: 'mrkdwn',
            text: `*Accessibility:*\n${accessibility.violations} violations`,
          },
        ],
      },
    ],
  };

  try {
    await postWebhook(webhookUrl, message);
    console.log('   ✅ Slack summary posted');
  } catch (error) {
    const err = error as Error;
    console.log(`   ⚠️  Failed to post Slack summary: ${err.message}`);
  }
}
