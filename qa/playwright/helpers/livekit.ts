import { Page } from '@playwright/test';

/**
 * LiveKit helper utilities for QA tests
 * These functions provide safe stubs that skip gracefully if LiveKit env vars are missing
 */

export interface LiveKitConfig {
  apiKey?: string;
  apiSecret?: string;
}

/**
 * Checks if LiveKit is configured
 */
export function isLiveKitAvailable(): boolean {
  return !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
}

/**
 * Gets LiveKit config from environment
 */
export function getLiveKitConfig(): LiveKitConfig | null {
  if (!isLiveKitAvailable()) {
    return null;
  }

  return {
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
  };
}

/**
 * Waits for LiveKit video session to connect
 * Skips gracefully if LiveKit is not configured
 */
export async function waitForLiveKitConnection(
  page: Page,
  options?: {
    timeout?: number;
  }
): Promise<boolean> {
  if (!isLiveKitAvailable()) {
    console.log('   ⏭️  LiveKit not configured, skipping connection check');
    return false;
  }

  const timeout = options?.timeout || 30000;

  try {
    // Wait for common LiveKit UI indicators
    await page.waitForSelector('[data-livekit-connected="true"]', {
      timeout,
      state: 'visible',
    }).catch(() => {
      // Try alternative selectors
      return page.waitForSelector('.livekit-connected, [aria-label*="Connected"]', {
        timeout,
        state: 'visible',
      });
    });

    console.log('   ✅ LiveKit connected');
    return true;
  } catch (error) {
    console.log('   ⚠️  LiveKit connection timeout');
    return false;
  }
}

/**
 * Checks if video is playing in the session
 */
export async function isVideoPlaying(page: Page): Promise<boolean> {
  if (!isLiveKitAvailable()) {
    console.log('   ⏭️  LiveKit not configured, skipping video check');
    return false;
  }

  try {
    // Check for video elements that are actually playing
    const isPlaying = await page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      return videos.some(
        (video) => !video.paused && !video.ended && video.readyState >= 2
      );
    });

    console.log(`   ${isPlaying ? '✅' : '⚠️'} Video ${isPlaying ? 'playing' : 'not playing'}`);
    return isPlaying;
  } catch (error) {
    console.log('   ⚠️  Could not check video status');
    return false;
  }
}

/**
 * Waits for participant count to reach expected value
 */
export async function waitForParticipantCount(
  page: Page,
  expectedCount: number,
  options?: {
    timeout?: number;
  }
): Promise<boolean> {
  if (!isLiveKitAvailable()) {
    console.log('   ⏭️  LiveKit not configured, skipping participant check');
    return false;
  }

  const timeout = options?.timeout || 30000;
  const startTime = Date.now();

  try {
    while (Date.now() - startTime < timeout) {
      const count = await page.evaluate(() => {
        // Look for participant indicators in the UI
        const participantElements = document.querySelectorAll(
          '[data-livekit-participant], .participant, [aria-label*="participant"]'
        );
        return participantElements.length;
      });

      if (count >= expectedCount) {
        console.log(`   ✅ ${count} participant(s) connected`);
        return true;
      }

      await page.waitForTimeout(1000);
    }

    console.log(`   ⚠️  Timeout waiting for ${expectedCount} participant(s)`);
    return false;
  } catch (error) {
    console.log('   ⚠️  Could not check participant count');
    return false;
  }
}

/**
 * Ends LiveKit session by clicking the end button
 */
export async function endLiveKitSession(page: Page): Promise<void> {
  if (!isLiveKitAvailable()) {
    console.log('   ⏭️  LiveKit not configured, skipping end session');
    return;
  }

  try {
    // Try common patterns for ending sessions
    const endButton = page.getByRole('button', {
      name: /end|leave|disconnect|exit|close/i,
    });

    if (await endButton.isVisible({ timeout: 5000 })) {
      await endButton.click();
      console.log('   ✅ LiveKit session ended');
    } else {
      console.log('   ⚠️  Could not find end session button');
    }
  } catch (error) {
    console.log('   ⚠️  Could not end LiveKit session');
  }
}

/**
 * Grants browser permissions for camera and microphone
 */
export async function grantMediaPermissions(context: any): Promise<void> {
  if (!isLiveKitAvailable()) {
    return;
  }

  try {
    await context.grantPermissions(['camera', 'microphone']);
    console.log('   ✅ Media permissions granted');
  } catch (error) {
    console.log('   ⚠️  Could not grant media permissions');
  }
}

/**
 * Smoke test for LiveKit integration
 * Returns true if LiveKit is working, false if skipped/failed
 */
export async function smokeTestLiveKit(page: Page): Promise<boolean> {
  if (!isLiveKitAvailable()) {
    console.log('   ⏭️  LiveKit smoke test skipped (not configured)');
    return false;
  }

  try {
    // Basic check: verify LiveKit SDK is loaded
    const hasLiveKit = await page.evaluate(() => {
      return typeof (window as any).LiveKit !== 'undefined' ||
             typeof (window as any).livekit !== 'undefined';
    });

    if (hasLiveKit) {
      console.log('   ✅ LiveKit SDK detected');
      return true;
    } else {
      console.log('   ⚠️  LiveKit SDK not detected');
      return false;
    }
  } catch (error) {
    console.log('   ⚠️  LiveKit smoke test failed');
    return false;
  }
}
