#!/usr/bin/env node

import { spawn, ChildProcess } from 'child_process';
import { resolve } from 'path';
import { getEnv, getServiceStatus } from './env.js';
import { ensureHealth } from '../scripts/ensure-health.js';
import { crawlSite } from './crawler.js';
import { fuzzSite } from './fuzzer.js';
import { generateReports } from './reporter.js';
import { existsSync } from 'fs';

/**
 * Main QA orchestrator entry point
 * Coordinates: dev server startup, Playwright tests, crawler, fuzzer, and reporting
 */
async function main() {
  console.log('🚀 QA Orchestrator Starting...\n');

  const env = getEnv();
  const serviceStatus = getServiceStatus();

  console.log('📋 Configuration:');
  console.log(`   Base URL: ${env.QA_BASE_URL}`);
  console.log(`   Start dev server: ${env.QA_START_DEV ? 'Yes' : 'No'}`);
  console.log(`   Slack notifications: ${env.QA_SLACK_WEBHOOK_URL ? 'Enabled' : 'Disabled'}`);
  console.log('\n📦 Service availability:');
  console.log(`   Supabase: ${serviceStatus.supabase ? '✅' : '⏭️  (will skip)'}`);
  console.log(`   Stripe: ${serviceStatus.stripe ? '✅' : '⏭️  (will skip)'}`);
  console.log(`   LiveKit: ${serviceStatus.livekit ? '✅' : '⏭️  (will skip)'}`);
  console.log('\n👤 Test credentials:');
  console.log(`   Customer: ${serviceStatus.customerCreds ? '✅' : '⏭️  (will skip)'}`);
  console.log(`   Mechanic: ${serviceStatus.mechanicCreds ? '✅' : '⏭️  (will skip)'}`);
  console.log(`   Admin: ${serviceStatus.adminCreds ? '✅' : '⏭️  (will skip)'}`);

  let devServer: ChildProcess | null = null;

  try {
    // Step 1: Start dev server if requested
    if (env.QA_START_DEV) {
      console.log('\n🔧 Starting dev server...');
      devServer = await startDevServer();
      await ensureHealth({ url: env.QA_BASE_URL, timeoutMs: 60000 });
    } else {
      console.log('\n🔍 Checking server health...');
      await ensureHealth({ url: env.QA_BASE_URL, timeoutMs: 10000 });
    }

    // Step 2: Run Playwright tests
    console.log('\n🎭 Running Playwright tests...');
    await runPlaywrightTests();

    // Step 3: Run crawler
    const customerStoragePath = resolve(
      process.cwd(),
      'playwright/fixtures/auth.storage.customer.json'
    );
    const useCustomerAuth = existsSync(customerStoragePath);

    await crawlSite({
      baseUrl: env.QA_BASE_URL,
      storageStatePath: useCustomerAuth ? customerStoragePath : undefined,
      maxPages: 100,
    });

    // Step 4: Run fuzzer
    const fuzzPages = ['/', '/login'];
    if (useCustomerAuth) {
      fuzzPages.push('/customer/dashboard');
    }

    await fuzzSite({
      baseUrl: env.QA_BASE_URL,
      storageStatePath: useCustomerAuth ? customerStoragePath : undefined,
      pages: fuzzPages,
    });

    // Step 5: Generate reports
    await generateReports({
      baseUrl: env.QA_BASE_URL,
      slackWebhookUrl: env.QA_SLACK_WEBHOOK_URL,
    });

    console.log('\n✅ QA orchestration complete!');
    console.log('\n📊 Reports available at:');
    console.log(`   HTML Summary: ${resolve(process.cwd(), 'reports/summary.html')}`);
    console.log(`   JSON Summary: ${resolve(process.cwd(), 'reports/summary.json')}`);
    console.log(
      `   Playwright Report: ${resolve(process.cwd(), 'playwright/playwright-report/index.html')}`
    );
    console.log('\n💡 Open Playwright report with: pnpm report:open\n');

    process.exit(0);
  } catch (error) {
    const err = error as Error;
    console.error('\n❌ QA orchestration failed:', err.message);
    process.exit(1);
  } finally {
    // Clean up dev server
    if (devServer) {
      console.log('\n🛑 Stopping dev server...');
      devServer.kill('SIGTERM');

      // Give it 5 seconds to shut down gracefully
      await new Promise((resolve) => setTimeout(resolve, 5000));

      if (!devServer.killed) {
        devServer.kill('SIGKILL');
      }
    }
  }
}

/**
 * Starts the Next.js dev server in the parent directory
 */
async function startDevServer(): Promise<ChildProcess> {
  const rootDir = resolve(process.cwd(), '..');

  return new Promise((resolve, reject) => {
    // Use pnpm dev from the root directory
    const proc = spawn('pnpm', ['dev'], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    proc.stdout?.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(`   [dev] ${output}`);
    });

    proc.stderr?.on('data', (data) => {
      const output = data.toString();
      process.stderr.write(`   [dev] ${output}`);
    });

    proc.on('error', (error) => {
      reject(new Error(`Failed to start dev server: ${error.message}`));
    });

    proc.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Dev server exited with code ${code}`));
      }
    });

    // Give the process a moment to start
    setTimeout(() => resolve(proc), 2000);
  });
}

/**
 * Runs Playwright tests programmatically
 */
async function runPlaywrightTests(): Promise<void> {
  const rootDir = resolve(process.cwd());

  return new Promise((resolve, reject) => {
    const proc = spawn('pnpm', ['test'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
    });

    proc.on('error', (error) => {
      reject(new Error(`Failed to run Playwright tests: ${error.message}`));
    });

    proc.on('exit', (code) => {
      // Playwright may exit with non-zero if tests fail, but we still want to continue
      // to generate reports
      if (code === 0 || code === 1) {
        console.log(`\n   Playwright tests completed (exit code: ${code})`);
        resolve();
      } else {
        reject(new Error(`Playwright exited with unexpected code ${code}`));
      }
    });
  });
}

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
