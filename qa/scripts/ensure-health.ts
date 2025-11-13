import axios from 'axios';

interface HealthCheckOptions {
  url: string;
  timeoutMs?: number;
  intervalMs?: number;
}

/**
 * Polls the given URL until it returns a 2xx status or timeout is reached
 */
export async function ensureHealth({
  url,
  timeoutMs = 60000,
  intervalMs = 2000,
}: HealthCheckOptions): Promise<void> {
  const startTime = Date.now();
  let lastError: Error | null = null;

  console.log(`⏳ Waiting for ${url} to become healthy...`);
  console.log(`   Timeout: ${timeoutMs / 1000}s, Poll interval: ${intervalMs / 1000}s`);

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      if (response.status >= 200 && response.status < 400) {
        console.log(`✅ ${url} is healthy (${response.status})`);
        return;
      }
    } catch (error) {
      lastError = error as Error;
      // Connection errors are expected while server is starting
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      process.stdout.write(`\r   Attempt at ${elapsed}s...`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  console.error(`\n❌ Health check timeout after ${timeoutMs / 1000}s`);
  if (lastError) {
    console.error(`   Last error: ${lastError.message}`);
  }
  throw new Error(`Server at ${url} did not become healthy within ${timeoutMs / 1000}s`);
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.QA_BASE_URL || 'http://localhost:3000';

  ensureHealth({ url })
    .then(() => {
      console.log('Health check passed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Health check failed:', error.message);
      process.exit(1);
    });
}
