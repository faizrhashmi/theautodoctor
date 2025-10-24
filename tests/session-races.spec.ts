/**
 * G2: INTEGRATION TESTS - Session Races & FSM
 *
 * Tests for:
 * 1. Two mechanics accept same request → only one succeeds
 * 2. Accept hydrates sessionId → Start button enabled
 * 3. Cleanup releases mechanic & session; second accept allowed
 * 4. FSM rejects illegal transitions (returns 409)
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Session Race Conditions', () => {
  test('Two mechanics accept same request - only one succeeds', async ({ browser }) => {
    // Create two browser contexts (simulating two mechanics)
    const mechanic1Context = await browser.newContext()
    const mechanic2Context = await browser.newContext()

    const page1 = await mechanic1Context.newPage()
    const page2 = await mechanic2Context.newPage()

    // TODO: Login as mechanic 1
    // TODO: Login as mechanic 2

    // Both mechanics navigate to dashboard
    await page1.goto(`${BASE_URL}/mechanic/dashboard`)
    await page2.goto(`${BASE_URL}/mechanic/dashboard`)

    // Wait for pending requests to load
    await page1.waitForSelector('[data-testid="pending-request"]')
    await page2.waitForSelector('[data-testid="pending-request"]')

    // Get the first request ID
    const requestId = await page1.getAttribute('[data-testid="pending-request"]', 'data-request-id')

    // Both mechanics click "Accept" simultaneously
    const [response1, response2] = await Promise.all([
      page1.click(`[data-request-id="${requestId}"] [data-testid="accept-button"]`),
      page2.click(`[data-request-id="${requestId}"] [data-testid="accept-button"]`),
    ])

    // Wait for responses
    await page1.waitForTimeout(1000)
    await page2.waitForTimeout(1000)

    // One should succeed, one should fail
    const successCount = await page1.locator('[data-testid="accept-success"]').count() +
                         await page2.locator('[data-testid="accept-success"]').count()

    const errorCount = await page1.locator('[data-testid="accept-error"]').count() +
                       await page2.locator('[data-testid="accept-error"]').count()

    expect(successCount).toBe(1)
    expect(errorCount).toBe(1)

    // The mechanic who succeeded should see "Start Session" button
    const startButtonCount = await page1.locator('[data-testid="start-session-button"]').count() +
                              await page2.locator('[data-testid="start-session-button"]').count()

    expect(startButtonCount).toBe(1)

    await mechanic1Context.close()
    await mechanic2Context.close()
  })

  test('Accept hydrates sessionId - Start button enabled', async ({ page }) => {
    // TODO: Login as mechanic
    await page.goto(`${BASE_URL}/mechanic/dashboard`)

    // Wait for pending requests
    await page.waitForSelector('[data-testid="pending-request"]')

    // Click Accept
    await page.click('[data-testid="accept-button"]:first-of-type')

    // Wait for success response
    await page.waitForSelector('[data-testid="accept-success"]')

    // Verify Start Session button is enabled
    const startButton = page.locator('[data-testid="start-session-button"]:first-of-type')
    await expect(startButton).toBeEnabled()

    // Verify button is not in loading state
    await expect(startButton).not.toHaveAttribute('disabled')
  })
})

test.describe('Cleanup & Reassignment', () => {
  test('Cleanup releases mechanic - second accept allowed', async ({ page }) => {
    // TODO: Create a test request
    // TODO: Login as mechanic 1
    // TODO: Accept request
    // TODO: Wait 5+ minutes (or trigger cleanup manually via API)
    // TODO: Verify session cancelled, request reset to pending
    // TODO: Login as mechanic 2
    // TODO: Verify can accept the same request

    test.skip('Requires manual cleanup trigger or time-based setup')
  })
})

test.describe('FSM Validation', () => {
  test('FSM rejects illegal state transitions (409)', async ({ request }) => {
    // TODO: Create a session in 'waiting' status
    const sessionId = 'test-session-id'

    // Try illegal transition: waiting → completed (should fail)
    const response = await request.patch(`${BASE_URL}/api/sessions/${sessionId}/status`, {
      data: {
        status: 'completed',
      },
    })

    expect(response.status()).toBe(409)

    const body = await response.json()
    expect(body.error).toBe('Invalid state transition')
    expect(body.current).toBe('waiting')
    expect(body.requested).toBe('completed')
  })

  test('FSM allows legal state transitions', async ({ request }) => {
    // TODO: Create a session in 'waiting' status
    const sessionId = 'test-session-id'

    // Legal transition: waiting → live (should succeed)
    const response = await request.patch(`${BASE_URL}/api/sessions/${sessionId}/status`, {
      data: {
        status: 'live',
      },
    })

    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.session.status).toBe('live')
  })
})

test.describe('API Race Conditions', () => {
  test('Concurrent accept requests - only one succeeds', async ({ request }) => {
    const requestId = 'test-request-id'

    // Simulate two concurrent POST requests
    const [response1, response2] = await Promise.all([
      request.post(`${BASE_URL}/api/mechanic/accept`, {
        data: { requestId },
      }),
      request.post(`${BASE_URL}/api/mechanic/accept`, {
        data: { requestId },
      }),
    ])

    // One should succeed (200), one should fail (409)
    const statuses = [response1.status(), response2.status()].sort()
    expect(statuses).toEqual([200, 409])

    // The 409 response should indicate the request is already assigned
    const failedResponse = response1.status() === 409 ? response1 : response2
    const failedBody = await failedResponse.json()
    expect(failedBody.error).toContain('already assigned')
  })
})
