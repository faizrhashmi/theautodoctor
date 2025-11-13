import { Page } from '@playwright/test';

/**
 * Supabase helper utilities for QA tests
 * These functions provide safe stubs that skip gracefully if Supabase env vars are missing
 */

export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
  serviceRoleKey?: string;
}

/**
 * Checks if Supabase is configured
 */
export function isSupabaseAvailable(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

/**
 * Gets Supabase config from environment
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  if (!isSupabaseAvailable()) {
    return null;
  }

  return {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

/**
 * Checks if Supabase client is initialized in the app
 */
export async function isSupabaseInitialized(page: Page): Promise<boolean> {
  if (!isSupabaseAvailable()) {
    console.log('   ⏭️  Supabase not configured, skipping initialization check');
    return false;
  }

  try {
    const isInitialized = await page.evaluate(() => {
      // Check for common Supabase client instances
      return (
        typeof (window as any).supabase !== 'undefined' ||
        typeof (window as any).supabaseClient !== 'undefined' ||
        document.querySelector('meta[name="supabase-url"]') !== null
      );
    });

    if (isInitialized) {
      console.log('   ✅ Supabase client initialized');
    } else {
      console.log('   ⚠️  Supabase client not detected');
    }

    return isInitialized;
  } catch (error) {
    console.log('   ⚠️  Could not check Supabase initialization');
    return false;
  }
}

/**
 * Waits for Supabase auth state to be ready
 */
export async function waitForAuthReady(
  page: Page,
  options?: {
    timeout?: number;
  }
): Promise<boolean> {
  if (!isSupabaseAvailable()) {
    console.log('   ⏭️  Supabase not configured, skipping auth ready check');
    return false;
  }

  const timeout = options?.timeout || 10000;
  const startTime = Date.now();

  try {
    while (Date.now() - startTime < timeout) {
      const isReady = await page.evaluate(() => {
        return (window as any).__supabaseAuthReady === true;
      });

      if (isReady) {
        console.log('   ✅ Supabase auth ready');
        return true;
      }

      await page.waitForTimeout(500);
    }

    console.log('   ⚠️  Supabase auth ready timeout');
    return false;
  } catch (error) {
    console.log('   ⚠️  Could not check Supabase auth state');
    return false;
  }
}

/**
 * Gets current user from Supabase session
 */
export async function getCurrentUser(page: Page): Promise<any | null> {
  if (!isSupabaseAvailable()) {
    console.log('   ⏭️  Supabase not configured, skipping user check');
    return null;
  }

  try {
    const user = await page.evaluate(async () => {
      const supabase = (window as any).supabase || (window as any).supabaseClient;

      if (!supabase) {
        return null;
      }

      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    });

    if (user) {
      console.log(`   ✅ Current user: ${user.email}`);
    } else {
      console.log('   ⚠️  No authenticated user');
    }

    return user;
  } catch (error) {
    console.log('   ⚠️  Could not get current user');
    return null;
  }
}

/**
 * Checks if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  if (!isSupabaseAvailable()) {
    console.log('   ⏭️  Supabase not configured, skipping auth check');
    return false;
  }

  try {
    const authenticated = await page.evaluate(async () => {
      const supabase = (window as any).supabase || (window as any).supabaseClient;

      if (!supabase) {
        return false;
      }

      const { data } = await supabase.auth.getSession();
      return !!data?.session;
    });

    console.log(`   ${authenticated ? '✅' : '⚠️'} User ${authenticated ? 'is' : 'is not'} authenticated`);
    return authenticated;
  } catch (error) {
    console.log('   ⚠️  Could not check authentication status');
    return false;
  }
}

/**
 * Signs out the current user
 */
export async function signOut(page: Page): Promise<boolean> {
  if (!isSupabaseAvailable()) {
    console.log('   ⏭️  Supabase not configured, skipping sign out');
    return false;
  }

  try {
    await page.evaluate(async () => {
      const supabase = (window as any).supabase || (window as any).supabaseClient;

      if (supabase) {
        await supabase.auth.signOut();
      }
    });

    console.log('   ✅ Signed out');
    return true;
  } catch (error) {
    console.log('   ⚠️  Could not sign out');
    return false;
  }
}

/**
 * Waits for realtime subscription to be established
 */
export async function waitForRealtimeSubscription(
  page: Page,
  channelName: string,
  options?: {
    timeout?: number;
  }
): Promise<boolean> {
  if (!isSupabaseAvailable()) {
    console.log('   ⏭️  Supabase not configured, skipping realtime check');
    return false;
  }

  const timeout = options?.timeout || 10000;

  try {
    const subscribed = await page.evaluate(
      async ({ channelName, timeout }) => {
        const supabase = (window as any).supabase || (window as any).supabaseClient;

        if (!supabase) {
          return false;
        }

        // Check if a channel with this name exists and is subscribed
        const channels = (supabase as any).getChannels?.() || [];
        const channel = channels.find((c: any) => c.topic === channelName);

        return channel?.state === 'joined';
      },
      { channelName, timeout }
    );

    if (subscribed) {
      console.log(`   ✅ Realtime subscription active: ${channelName}`);
    } else {
      console.log(`   ⚠️  Realtime subscription not found: ${channelName}`);
    }

    return subscribed;
  } catch (error) {
    console.log('   ⚠️  Could not check realtime subscription');
    return false;
  }
}

/**
 * Smoke test for Supabase integration
 */
export async function smokeTestSupabase(page: Page): Promise<boolean> {
  if (!isSupabaseAvailable()) {
    console.log('   ⏭️  Supabase smoke test skipped (not configured)');
    return false;
  }

  try {
    // Check if Supabase is loaded and functional
    const isWorking = await page.evaluate(async () => {
      const supabase = (window as any).supabase || (window as any).supabaseClient;

      if (!supabase) {
        return false;
      }

      // Try a simple query (should work even without auth)
      try {
        await supabase.from('_non_existent_table_').select('*').limit(0);
        // If we get here, the client is working (even if table doesn't exist)
        return true;
      } catch (error: any) {
        // If error is about table not existing, client is working
        return error?.message?.includes('relation') || error?.code === '42P01';
      }
    });

    if (isWorking) {
      console.log('   ✅ Supabase client functional');
    } else {
      console.log('   ⚠️  Supabase client not functional');
    }

    return isWorking;
  } catch (error) {
    console.log('   ⚠️  Supabase smoke test failed');
    return false;
  }
}

/**
 * Validates that we're not using production database
 */
export function validateNotProduction(): void {
  const url = process.env.SUPABASE_URL;

  if (url && !url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('staging')) {
    const isProd = !url.includes('test') && !url.includes('dev');

    if (isProd) {
      console.warn(
        '⚠️  WARNING: Supabase URL appears to be production. Ensure you are using a test/staging database for QA.'
      );
    }
  }
}

/**
 * Performs a simple database query to verify connectivity
 */
export async function testDatabaseConnectivity(page: Page): Promise<boolean> {
  if (!isSupabaseAvailable()) {
    console.log('   ⏭️  Supabase not configured, skipping connectivity test');
    return false;
  }

  try {
    const connected = await page.evaluate(async () => {
      const supabase = (window as any).supabase || (window as any).supabaseClient;

      if (!supabase) {
        return false;
      }

      // Try to query a simple SQL function
      const { error } = await supabase.rpc('ping').single().throwOnError(false);

      // If function doesn't exist, that's OK - it means we connected
      return !error || error.code === '42883'; // 42883 = function does not exist
    });

    if (connected) {
      console.log('   ✅ Database connectivity verified');
    } else {
      console.log('   ⚠️  Database connectivity failed');
    }

    return connected;
  } catch (error) {
    console.log('   ⚠️  Could not test database connectivity');
    return false;
  }
}
