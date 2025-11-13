import { chromium, Browser, Page } from '@playwright/test';
import { writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { normalizeUrl, isSameOrigin } from './utils/http.js';

export interface BrokenLink {
  url: string;
  status: number;
  statusText: string;
  referrers: string[];
}

export interface CrawlResult {
  visited: string[];
  brokenLinks: BrokenLink[];
  totalLinks: number;
  totalPages: number;
  duration: number;
}

export interface CrawlOptions {
  baseUrl: string;
  storageStatePath?: string;
  maxPages?: number;
  outputPath?: string;
}

/**
 * Crawls the site starting from baseUrl, discovering all same-origin links
 * and detecting broken links with their referrers.
 */
export async function crawlSite(options: CrawlOptions): Promise<CrawlResult> {
  const {
    baseUrl,
    storageStatePath,
    maxPages = 100,
    outputPath = resolve(process.cwd(), 'reports/broken-links.json'),
  } = options;

  console.log('\n🕷️  Starting site crawler...');
  console.log(`   Base URL: ${baseUrl}`);
  if (storageStatePath) {
    console.log(`   Using auth: ${storageStatePath}`);
  }

  const startTime = Date.now();
  const visited = new Set<string>();
  const queue: string[] = [baseUrl];
  const linkMap = new Map<string, Set<string>>(); // URL -> Set of referrers
  const brokenLinks: BrokenLink[] = [];

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext(
      storageStatePath ? { storageState: storageStatePath } : {}
    );
    page = await context.newPage();

    while (queue.length > 0 && visited.size < maxPages) {
      const currentUrl = queue.shift()!;
      const normalizedUrl = normalizeUrl(currentUrl);

      if (visited.has(normalizedUrl)) {
        continue;
      }

      visited.add(normalizedUrl);
      console.log(`   [${visited.size}/${maxPages}] Crawling: ${normalizedUrl}`);

      try {
        const response = await page.goto(normalizedUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        const status = response?.status() || 0;

        // Track broken links
        if (status >= 400) {
          const referrers = linkMap.get(normalizedUrl) || new Set([baseUrl]);
          brokenLinks.push({
            url: normalizedUrl,
            status,
            statusText: response?.statusText() || 'Unknown',
            referrers: Array.from(referrers),
          });
        }

        // Only discover links from successful pages
        if (status >= 200 && status < 400) {
          // Extract all links
          const links = await page.$$eval('a[href]', (anchors) =>
            anchors.map((a) => (a as HTMLAnchorElement).href)
          );

          for (const link of links) {
            const normalizedLink = normalizeUrl(link);

            // Only crawl same-origin links
            if (isSameOrigin(normalizedLink, baseUrl)) {
              // Track referrer
              if (!linkMap.has(normalizedLink)) {
                linkMap.set(normalizedLink, new Set());
              }
              linkMap.get(normalizedLink)!.add(normalizedUrl);

              // Add to queue if not visited
              if (!visited.has(normalizedLink)) {
                queue.push(normalizedLink);
              }
            }
          }
        }
      } catch (error) {
        const err = error as Error;
        const referrers = linkMap.get(normalizedUrl) || new Set([baseUrl]);
        brokenLinks.push({
          url: normalizedUrl,
          status: 0,
          statusText: err.message,
          referrers: Array.from(referrers),
        });
        console.log(`   ⚠️  Error: ${err.message}`);
      }

      // Small delay to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } finally {
    await page?.close();
    await browser?.close();
  }

  const duration = Date.now() - startTime;

  const result: CrawlResult = {
    visited: Array.from(visited),
    brokenLinks,
    totalLinks: linkMap.size,
    totalPages: visited.size,
    duration,
  };

  // Save broken links report
  if (brokenLinks.length > 0) {
    await mkdir(resolve(process.cwd(), 'reports'), { recursive: true });
    await writeFile(outputPath, JSON.stringify(brokenLinks, null, 2));
    console.log(`\n   📄 Broken links saved to: ${outputPath}`);
  }

  console.log(`\n✅ Crawler finished in ${(duration / 1000).toFixed(1)}s`);
  console.log(`   Pages visited: ${result.totalPages}`);
  console.log(`   Total links found: ${result.totalLinks}`);
  console.log(`   Broken links: ${brokenLinks.length}`);

  return result;
}
