import { Page, ConsoleMessage, Request, Response } from '@playwright/test';

export interface ConsoleError {
  type: string;
  text: string;
  location?: string;
  timestamp: number;
}

export interface NetworkError {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  errorText?: string;
  timestamp: number;
}

export interface ErrorCollector {
  consoleErrors: ConsoleError[];
  networkErrors: NetworkError[];
}

/**
 * Sets up console and network error collection for a page
 */
export function setupErrorCollection(page: Page): ErrorCollector {
  const collector: ErrorCollector = {
    consoleErrors: [],
    networkErrors: [],
  };

  // Collect console errors and warnings
  page.on('console', (msg: ConsoleMessage) => {
    const type = msg.type();

    if (type === 'error' || type === 'warning') {
      collector.consoleErrors.push({
        type,
        text: msg.text(),
        location: msg.location().url,
        timestamp: Date.now(),
      });
    }
  });

  // Collect failed requests
  page.on('requestfailed', (request: Request) => {
    const failure = request.failure();
    collector.networkErrors.push({
      url: request.url(),
      method: request.method(),
      errorText: failure?.errorText || 'Request failed',
      timestamp: Date.now(),
    });
  });

  // Collect 4xx and 5xx responses
  page.on('response', (response: Response) => {
    const status = response.status();

    if (status >= 400) {
      collector.networkErrors.push({
        url: response.url(),
        method: response.request().method(),
        status,
        statusText: response.statusText(),
        timestamp: Date.now(),
      });
    }
  });

  // Collect page errors (uncaught exceptions)
  page.on('pageerror', (error: Error) => {
    collector.consoleErrors.push({
      type: 'pageerror',
      text: error.message,
      timestamp: Date.now(),
    });
  });

  return collector;
}

/**
 * Filters out known/expected errors
 */
export function filterKnownErrors(collector: ErrorCollector, filters?: {
  ignoreConsolePatterns?: RegExp[];
  ignoreNetworkUrls?: RegExp[];
}): ErrorCollector {
  const { ignoreConsolePatterns = [], ignoreNetworkUrls = [] } = filters || {};

  return {
    consoleErrors: collector.consoleErrors.filter(
      (error) => !ignoreConsolePatterns.some((pattern) => pattern.test(error.text))
    ),
    networkErrors: collector.networkErrors.filter(
      (error) => !ignoreNetworkUrls.some((pattern) => pattern.test(error.url))
    ),
  };
}

/**
 * Asserts no severe errors occurred during the test
 */
export function assertNoSevereErrors(collector: ErrorCollector, options?: {
  allowWarnings?: boolean;
  ignoreConsolePatterns?: RegExp[];
  ignoreNetworkUrls?: RegExp[];
}): void {
  const filtered = filterKnownErrors(collector, options);

  const severeConsoleErrors = options?.allowWarnings
    ? filtered.consoleErrors.filter((e) => e.type === 'error' || e.type === 'pageerror')
    : filtered.consoleErrors;

  const criticalNetworkErrors = filtered.networkErrors.filter(
    (e) => (e.status && e.status >= 500) || e.errorText
  );

  const errors: string[] = [];

  if (severeConsoleErrors.length > 0) {
    errors.push(
      `Console errors (${severeConsoleErrors.length}):\n  - ${severeConsoleErrors.map((e) => e.text).join('\n  - ')}`
    );
  }

  if (criticalNetworkErrors.length > 0) {
    errors.push(
      `Network errors (${criticalNetworkErrors.length}):\n  - ${criticalNetworkErrors.map((e) => `${e.method} ${e.url} (${e.status || e.errorText})`).join('\n  - ')}`
    );
  }

  if (errors.length > 0) {
    throw new Error(`Severe errors detected:\n\n${errors.join('\n\n')}`);
  }
}

/**
 * Gets a summary of collected errors
 */
export function getErrorSummary(collector: ErrorCollector): string {
  const consoleErrorCount = collector.consoleErrors.filter(
    (e) => e.type === 'error' || e.type === 'pageerror'
  ).length;
  const consoleWarningCount = collector.consoleErrors.filter((e) => e.type === 'warning').length;
  const networkErrorCount = collector.networkErrors.filter((e) => e.status && e.status >= 500).length;
  const networkWarningCount = collector.networkErrors.filter(
    (e) => e.status && e.status >= 400 && e.status < 500
  ).length;

  const parts: string[] = [];

  if (consoleErrorCount > 0) parts.push(`${consoleErrorCount} console error(s)`);
  if (consoleWarningCount > 0) parts.push(`${consoleWarningCount} console warning(s)`);
  if (networkErrorCount > 0) parts.push(`${networkErrorCount} network error(s)`);
  if (networkWarningCount > 0) parts.push(`${networkWarningCount} network warning(s)`);

  return parts.length > 0 ? parts.join(', ') : 'No errors';
}

/**
 * Attaches error collection to test report
 */
export async function attachErrors(collector: ErrorCollector, testInfo: any): Promise<void> {
  if (collector.consoleErrors.length > 0 || collector.networkErrors.length > 0) {
    await testInfo.attach('errors', {
      body: JSON.stringify(collector, null, 2),
      contentType: 'application/json',
    });
  }
}
