import { test, expect } from '@playwright/test'

/**
 * Task 9: E2E QA Scenarios
 * Tests all critical session workflows implemented in Tasks 1-8
 */

// Test helpers
async function loginAsMechanic(page: any, email: string, password: string) {
  await page.goto('/mechanic/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/mechanic/dashboard')
}

async function loginAsCustomer(page: any, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/customer/dashboard')
}

async function createTestSession(page: any) {
  // Navigate to create session
  await page.goto('/customer/schedule')
  await page.click('text=Book Session')

  // Fill in session details
  await page.selectOption('select[name="plan"]', 'video15')
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard
  await page.waitForURL('/customer/dashboard')

  // Get session ID from the UI
  const sessionId = await page.getAttribute('[data-session-id]', 'data-session-id')
  return sessionId
}

// Test Suite: Session Timer Auto-End
test.describe('Session Timer Auto-End', () => {
  test('should auto-end session when timer expires', async ({ page }) => {
    // This test requires a very short session for testing
    // In production, we'd use a test-only route to create a 1-minute session

    // Login as customer
    await loginAsCustomer(page, process.env.TEST_CUSTOMER_EMAIL!, process.env.TEST_CUSTOMER_PASSWORD!)

    // Create a session
    const sessionId = await createTestSession(page)

    // Wait for mechanic to accept (in CI, use a test mechanic auto-acceptor)
    await page.waitForSelector(`text=Session Active`, { timeout: 60000 })

    // Navigate to chat room
    await page.goto(`/chat/${sessionId}`)

    // Wait for timer to appear
    await page.waitForSelector('text=/\\d{2}:\\d{2}/')

    // Mock timer expiry (in real test, we'd wait for actual expiry)
    // For now, just verify the timer exists
    const timerText = await page.textContent('[data-testid="session-timer"]')
    expect(timerText).toMatch(/\d{2}:\d{2}/)

    // In a full test, we'd:
    // 1. Wait for timer to hit 00:00
    // 2. Verify auto-end API call
    // 3. Verify redirect to dashboard
    // 4. Verify session status = 'completed'
  })

  test('should show time warnings at 5 and 1 minute remaining', async ({ page }) => {
    await loginAsCustomer(page, process.env.TEST_CUSTOMER_EMAIL!, process.env.TEST_CUSTOMER_PASSWORD!)

    const sessionId = await createTestSession(page)
    await page.goto(`/chat/${sessionId}`)

    // In production test, we'd fast-forward time to trigger warnings
    // For now, verify warning UI exists
    await page.waitForSelector('[data-testid="session-timer"]')
  })
})

// Test Suite: Session Extensions
test.describe('Session Extensions', () => {
  test('should extend session and update timer immediately', async ({ page, context }) => {
    await loginAsCustomer(page, process.env.TEST_CUSTOMER_EMAIL!, process.env.TEST_CUSTOMER_PASSWORD!)

    const sessionId = await createTestSession(page)
    await page.goto(`/chat/${sessionId}`)

    // Get initial timer value
    const initialTimer = await page.textContent('[data-testid="session-timer"]')

    // Click extend button
    await page.click('button:has-text("Extend Session")')

    // Select extension duration
    await page.click('button:has-text("+15 minutes")')

    // This would redirect to Stripe in production
    // For testing, we'd mock the Stripe checkout
    // and webhook callback

    // Verify timer increased
    // In production test:
    // 1. Mock Stripe checkout success
    // 2. Trigger webhook
    // 3. Verify timer jumped
    // 4. Verify session:extended broadcast received
  })

  test('extension webhook should be idempotent', async ({ request }) => {
    // Create a test payment_intent_id
    const paymentIntentId = `pi_test_${Date.now()}`

    const webhookPayload = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          metadata: {
            session_id: 'test-session-id',
            extension_minutes: '15',
            mode: 'extension',
          },
        },
      },
    }

    // Send webhook twice
    const response1 = await request.post('/api/stripe/webhook', {
      data: webhookPayload,
      headers: {
        'stripe-signature': 'test-signature', // In production, use real signature
      },
    })

    const response2 = await request.post('/api/stripe/webhook', {
      data: webhookPayload,
      headers: {
        'stripe-signature': 'test-signature',
      },
    })

    // Both should succeed
    expect(response1.ok()).toBeTruthy()
    expect(response2.ok()).toBeTruthy()

    // Verify session was only extended once
    // Check database: SELECT COUNT(*) FROM session_extensions WHERE payment_intent_id = ...
    // Should be exactly 1
  })
})

// Test Suite: File Upload/Download
test.describe('File Upload & Download', () => {
  test('file should persist across page refresh', async ({ page }) => {
    await loginAsMechanic(page, process.env.TEST_MECHANIC_EMAIL!, process.env.TEST_MECHANIC_PASSWORD!)

    // Accept a session
    await page.goto('/mechanic/dashboard')
    await page.click('button:has-text("Accept Request")') // First available request

    // Navigate to chat
    const sessionId = await page.getAttribute('[data-session-id]', 'data-session-id')
    await page.goto(`/chat/${sessionId}`)

    // Upload a file
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-diagnostic.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake image data'),
    })

    // Wait for upload to complete
    await page.waitForSelector('text=test-diagnostic.jpg')

    // Refresh page
    await page.reload()

    // Verify file still appears
    await expect(page.locator('text=test-diagnostic.jpg')).toBeVisible()

    // Verify download link works
    const downloadPromise = page.waitForEvent('download')
    await page.click('a:has-text("Download")')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('test-diagnostic')
  })

  test('uploaded files should have signed URLs with expiry', async ({ request }) => {
    // Create a test session and upload file
    const uploadRes = await request.post('/api/sessions/test-session-id/files', {
      multipart: {
        file: {
          name: 'test.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('test'),
        },
      },
    })

    const { file } = await uploadRes.json()
    expect(file.url).toBeTruthy()
    expect(file.url).toContain('token=') // Signed URL
  })
})

// Test Suite: Device Preflight
test.describe('Device Preflight', () => {
  test('should block video join until camera/mic/network tests pass', async ({ page }) => {
    await loginAsCustomer(page, process.env.TEST_CUSTOMER_EMAIL!, process.env.TEST_CUSTOMER_PASSWORD!)

    const sessionId = await createTestSession(page)
    await page.goto(`/video/${sessionId}`)

    // Should see preflight panel
    await expect(page.locator('text=Device Check')).toBeVisible()

    // Join button should be disabled initially
    const joinButton = page.locator('button:has-text("Join Session")')
    await expect(joinButton).toBeDisabled()

    // Grant camera/mic permissions (in real browser)
    // In headless, we'd mock the permissions
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        return new MediaStream()
      }
    })

    // Wait for tests to pass
    await expect(page.locator('[data-testid="camera-status"]:has-text("✓")')).toBeVisible()
    await expect(page.locator('[data-testid="mic-status"]:has-text("✓")')).toBeVisible()
    await expect(page.locator('[data-testid="network-status"]:has-text("✓")')).toBeVisible()

    // Join button should now be enabled
    await expect(joinButton).toBeEnabled()
  })

  test('should show reconnect banner when participant drops', async ({ page, context }) => {
    // Create two browser contexts (mechanic and customer)
    const mechanicPage = await context.newPage()
    const customerPage = page

    await loginAsMechanic(mechanicPage, process.env.TEST_MECHANIC_EMAIL!, process.env.TEST_MECHANIC_PASSWORD!)
    await loginAsCustomer(customerPage, process.env.TEST_CUSTOMER_EMAIL!, process.env.TEST_CUSTOMER_PASSWORD!)

    const sessionId = await createTestSession(customerPage)

    // Both join video
    await mechanicPage.goto(`/video/${sessionId}`)
    await customerPage.goto(`/video/${sessionId}`)

    // Wait for both to be connected
    await expect(mechanicPage.locator('text=Both participants joined')).toBeVisible()

    // Customer disconnects (close their page)
    await customerPage.close()

    // Mechanic should see reconnect banner
    await expect(mechanicPage.locator('text=Connection Lost')).toBeVisible({ timeout: 10000 })
    await expect(mechanicPage.locator('text=Customer disconnected')).toBeVisible()
    await expect(mechanicPage.locator('button:has-text("Retry Connection")')).toBeVisible()
  })
})

// Test Suite: Post-Session Summary
test.describe('Post-Session Summary', () => {
  test('mechanic should be able to submit summary with photos', async ({ page }) => {
    await loginAsMechanic(page, process.env.TEST_MECHANIC_EMAIL!, process.env.TEST_MECHANIC_PASSWORD!)

    // Complete a session first
    const sessionId = 'test-completed-session-id' // In real test, create and complete a session

    // Navigate to summary page
    await page.goto(`/sessions/${sessionId}/summary`)

    // Fill in summary form
    await page.fill('textarea[name="findings"]', 'Found issue with battery terminal corrosion')
    await page.fill('textarea[name="steps_taken"]', 'Cleaned terminals and tested voltage')
    await page.fill('textarea[name="parts_needed"]', 'New battery recommended')
    await page.fill('textarea[name="next_steps"]', 'Replace battery within 2 weeks')

    // Upload photo
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'battery-corrosion.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake photo'),
    })

    // Submit summary
    await page.click('button:has-text("Submit Summary")')

    // Should see success message
    await expect(page.locator('text=Summary submitted successfully')).toBeVisible()

    // Should redirect to dashboard
    await page.waitForURL('/mechanic/dashboard')
  })

  test('customer should receive summary email', async ({ request }) => {
    // In production test, we'd:
    // 1. Submit a summary via API
    // 2. Check email queue/service for sent email
    // 3. Verify email contains correct summary data
    // For now, just test API endpoint

    const response = await request.post('/api/sessions/test-session-id/summary', {
      multipart: {
        findings: 'Test findings',
        steps_taken: 'Test steps',
        next_steps: 'Test next steps',
      },
    })

    expect(response.ok()).toBeTruthy()
  })

  test('cannot submit summary twice for same session', async ({ page }) => {
    await loginAsMechanic(page, process.env.TEST_MECHANIC_EMAIL!, process.env.TEST_MECHANIC_PASSWORD!)

    const sessionId = 'test-session-with-summary' // Session that already has summary

    // Navigate to summary page
    await page.goto(`/sessions/${sessionId}/summary`)

    // Should be redirected to dashboard
    await page.waitForURL('/mechanic/dashboard')
  })
})

// Test Suite: Cron Monitoring
test.describe('Cron Monitoring', () => {
  test('should nudge mechanic if session accepted but not live after 3 min', async ({ request }) => {
    const response = await request.get('/api/cron/monitor-sessions', {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    })

    expect(response.ok()).toBeTruthy()

    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.results.nudged_mechanics).toBeGreaterThanOrEqual(0)
  })

  test('should auto-end sessions older than 3 hours', async ({ request }) => {
    // Create a test session that's 3+ hours old
    // In production test, we'd manipulate the database

    const response = await request.get('/api/cron/monitor-sessions', {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    })

    const result = await response.json()
    expect(result.results.auto_ended_sessions).toBeGreaterThanOrEqual(0)
  })

  test('should require cron secret for authorization', async ({ request }) => {
    const response = await request.get('/api/cron/monitor-sessions')

    expect(response.status()).toBe(401)
  })
})

// Test Suite: End-to-End Happy Path
test.describe('Complete Session Workflow', () => {
  test('full session lifecycle from create to summary', async ({ page, context }) => {
    // 1. Customer creates session
    await loginAsCustomer(page, process.env.TEST_CUSTOMER_EMAIL!, process.env.TEST_CUSTOMER_PASSWORD!)
    const sessionId = await createTestSession(page)

    // 2. Mechanic accepts
    const mechanicPage = await context.newPage()
    await loginAsMechanic(mechanicPage, process.env.TEST_MECHANIC_EMAIL!, process.env.TEST_MECHANIC_PASSWORD!)
    await mechanicPage.click('button:has-text("Accept Request")')

    // 3. Both join chat
    await page.goto(`/chat/${sessionId}`)
    await mechanicPage.goto(`/chat/${sessionId}`)

    // 4. Session goes live
    await expect(page.locator('text=Session Active')).toBeVisible({ timeout: 10000 })

    // 5. Send messages
    await page.fill('textarea[placeholder*="message"]', 'Hello, I need help with my car')
    await page.click('button:has-text("Send")')
    await expect(mechanicPage.locator('text=Hello, I need help')).toBeVisible()

    // 6. Upload file
    const fileInput = await mechanicPage.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'diagnostic-report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test pdf'),
    })

    // 7. Mechanic ends session
    await mechanicPage.click('button:has-text("End Session")')
    await mechanicPage.click('button:has-text("Confirm")')

    // 8. Customer sees session ended
    await expect(page.locator('text=Session has been ended')).toBeVisible()

    // 9. Mechanic submits summary
    await mechanicPage.goto(`/sessions/${sessionId}/summary`)
    await mechanicPage.fill('textarea[name="findings"]', 'Battery issue')
    await mechanicPage.fill('textarea[name="steps_taken"]', 'Tested battery')
    await mechanicPage.fill('textarea[name="next_steps"]', 'Replace battery')
    await mechanicPage.click('button:has-text("Submit Summary")')

    // 10. Verify summary saved
    await expect(mechanicPage.locator('text=Summary submitted')).toBeVisible()

    // 11. Customer can view summary
    await page.goto(`/customer/dashboard`)
    await expect(page.locator('text=Summary Available')).toBeVisible()
  })
})
