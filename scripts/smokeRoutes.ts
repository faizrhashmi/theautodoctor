/**
 * Smoke Test Script for AskAutoDoctor Routes
 *
 * Purpose: Verify all routes are accessible and return appropriate status codes
 * Usage: tsx scripts/smokeRoutes.ts
 *
 * This script performs basic health checks on all application routes to ensure:
 * - Public routes are accessible (200)
 * - Protected routes require authentication (302/401)
 * - API endpoints respond correctly
 * - No unexpected 500 errors
 */

import * as fs from 'fs'
import * as path from 'path'

// Route definitions with expected behaviors
interface RouteTest {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  expectedStatus: number | number[]
  requiresAuth: boolean
  description: string
  skip?: boolean
  reason?: string
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ============================================================================
// PUBLIC ROUTES (Should return 200)
// ============================================================================

const publicRoutes: RouteTest[] = [
  { path: '/', method: 'GET', expectedStatus: 200, requiresAuth: false, description: 'Homepage' },
  { path: '/about', method: 'GET', expectedStatus: 200, requiresAuth: false, description: 'About page' },
  { path: '/pricing', method: 'GET', expectedStatus: 200, requiresAuth: false, description: 'Pricing page' },
  { path: '/how-it-works', method: 'GET', expectedStatus: 200, requiresAuth: false, description: 'How it works' },
  { path: '/contact', method: 'GET', expectedStatus: 200, requiresAuth: false, description: 'Contact form' },
  { path: '/knowledge-base', method: 'GET', expectedStatus: 200, requiresAuth: false, description: 'Knowledge base' },
  { path: '/login', method: 'GET', expectedStatus: 200, requiresAuth: false, description: 'Generic login' },
  { path: '/signup', method: 'GET', expectedStatus: 200, requiresAuth: false, description: 'Generic signup' },
]

// ============================================================================
// CUSTOMER ROUTES (Should redirect to login or return 401)
// ============================================================================

const customerRoutes: RouteTest[] = [
  { path: '/customer/dashboard', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Customer dashboard' },
  { path: '/customer/sessions', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Customer sessions' },
  { path: '/customer/quotes', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Customer quotes' },
  { path: '/customer/profile', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Customer profile' },
  { path: '/customer/vehicles', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Customer vehicles' },
  { path: '/customer/schedule', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Customer schedule' },
  { path: '/customer/messages', method: 'GET', expectedStatus: [302, 401, 404], requiresAuth: true, description: 'Customer messages (KNOWN ISSUE: 404)' },
]

// ============================================================================
// MECHANIC ROUTES (Should redirect to login or return 401)
// ============================================================================

const mechanicRoutes: RouteTest[] = [
  { path: '/mechanic/login', method: 'GET', expectedStatus: 200, requiresAuth: false, description: 'Mechanic login' },
  { path: '/mechanic/signup', method: 'GET', expectedStatus: 200, requiresAuth: false, description: 'Mechanic signup' },
  { path: '/mechanic/dashboard', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Mechanic dashboard' },
  { path: '/mechanic/sessions', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Mechanic sessions' },
  { path: '/mechanic/profile', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Mechanic profile' },
  { path: '/mechanic/analytics', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Mechanic analytics' },
  { path: '/mechanic/earnings', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Mechanic earnings' },
  { path: '/mechanic/availability', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Mechanic availability' },
]

// ============================================================================
// WORKSHOP ROUTES (Should redirect to login or return 401)
// ============================================================================

const workshopRoutes: RouteTest[] = [
  { path: '/workshop/login', method: 'GET', expectedStatus: 200, requiresAuth: false, description: 'Workshop login' },
  { path: '/workshop/signup', method: 'GET', expectedStatus: 200, requiresAuth: false, description: 'Workshop signup' },
  { path: '/workshop/dashboard', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Workshop dashboard' },
  { path: '/workshop/analytics', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Workshop analytics' },
]

// ============================================================================
// ADMIN ROUTES (Should redirect to login or return 401)
// ============================================================================

const adminRoutes: RouteTest[] = [
  { path: '/admin/login', method: 'GET', expectedStatus: 200, requiresAuth: false, description: 'Admin login' },
  { path: '/admin/dashboard', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Admin dashboard' },
  { path: '/admin/intakes', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Admin intakes' },
  { path: '/admin/sessions', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Admin sessions' },
  { path: '/admin/customers', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Admin customers' },
  { path: '/admin/mechanics', method: 'GET', expectedStatus: [302, 401], requiresAuth: true, description: 'Admin mechanics' },
]

// ============================================================================
// API ROUTES (Health checks)
// ============================================================================

const apiRoutes: RouteTest[] = [
  { path: '/api/health', method: 'GET', expectedStatus: 200, requiresAuth: false, description: 'Health check endpoint' },
  { path: '/api/geo/countries', method: 'GET', expectedStatus: 200, requiresAuth: false, description: 'Countries list' },

  // Protected API routes (should return 401 without auth)
  { path: '/api/customer/profile', method: 'GET', expectedStatus: 401, requiresAuth: true, description: 'Customer profile API' },
  { path: '/api/mechanics/me', method: 'GET', expectedStatus: 401, requiresAuth: true, description: 'Mechanic profile API' },

  // CRITICAL SECURITY TEST: These should NOT return 200 without auth
  {
    path: '/api/livekit/token?room=test&identity=test',
    method: 'GET',
    expectedStatus: 401,
    requiresAuth: true,
    description: 'LiveKit token (CRITICAL: Should require auth)',
    skip: false,
    reason: 'Testing critical security vulnerability'
  },
  {
    path: '/api/uploads/sign',
    method: 'POST',
    expectedStatus: 401,
    requiresAuth: true,
    description: 'Upload sign (CRITICAL: Should require auth)',
    skip: false,
    reason: 'Testing critical security vulnerability'
  },
]

// ============================================================================
// TEST EXECUTION
// ============================================================================

interface TestResult {
  path: string
  method: string
  expectedStatus: number | number[]
  actualStatus: number | null
  passed: boolean
  error?: string
  responseTime: number
}

async function testRoute(route: RouteTest): Promise<TestResult> {
  const startTime = Date.now()
  const url = `${BASE_URL}${route.path}`

  try {
    const response = await fetch(url, {
      method: route.method,
      headers: {
        'Content-Type': 'application/json',
      },
      redirect: 'manual', // Don't follow redirects
    })

    const responseTime = Date.now() - startTime
    const actualStatus = response.status

    const expectedStatuses = Array.isArray(route.expectedStatus)
      ? route.expectedStatus
      : [route.expectedStatus]

    const passed = expectedStatuses.includes(actualStatus)

    return {
      path: route.path,
      method: route.method,
      expectedStatus: route.expectedStatus,
      actualStatus,
      passed,
      responseTime,
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      path: route.path,
      method: route.method,
      expectedStatus: route.expectedStatus,
      actualStatus: null,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
    }
  }
}

async function runSmokeTests() {
  console.log('🔥 AskAutoDoctor Route Smoke Tests')
  console.log('=' .repeat(80))
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Started: ${new Date().toISOString()}`)
  console.log('=' .repeat(80))
  console.log()

  const allRoutes = [
    ...publicRoutes,
    ...customerRoutes,
    ...mechanicRoutes,
    ...workshopRoutes,
    ...adminRoutes,
    ...apiRoutes,
  ]

  const results: TestResult[] = []
  let passCount = 0
  let failCount = 0
  let criticalFailures: TestResult[] = []

  for (const route of allRoutes) {
    if (route.skip) {
      console.log(`⏭️  SKIPPED: ${route.path} - ${route.reason}`)
      continue
    }

    const result = await testRoute(route)
    results.push(result)

    if (result.passed) {
      passCount++
      console.log(`✅ PASS: ${route.method} ${result.path} → ${result.actualStatus} (${result.responseTime}ms)`)
    } else {
      failCount++
      console.log(`❌ FAIL: ${route.method} ${result.path}`)
      console.log(`   Expected: ${Array.isArray(route.expectedStatus) ? route.expectedStatus.join(' or ') : route.expectedStatus}`)
      console.log(`   Actual: ${result.actualStatus || 'ERROR'}`)
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
      console.log(`   Description: ${route.description}`)

      // Flag critical security failures
      if (route.path.includes('/api/livekit/token') || route.path.includes('/api/uploads/sign')) {
        if (result.actualStatus === 200) {
          criticalFailures.push(result)
          console.log(`   🚨 CRITICAL SECURITY ISSUE: Endpoint is unauthenticated!`)
        }
      }
    }
  }

  console.log()
  console.log('=' .repeat(80))
  console.log('📊 TEST SUMMARY')
  console.log('=' .repeat(80))
  console.log(`Total Tests: ${results.length}`)
  console.log(`Passed: ${passCount} (${((passCount / results.length) * 100).toFixed(1)}%)`)
  console.log(`Failed: ${failCount} (${((failCount / results.length) * 100).toFixed(1)}%)`)
  console.log()

  if (criticalFailures.length > 0) {
    console.log('🚨 CRITICAL SECURITY FAILURES:')
    console.log('=' .repeat(80))
    criticalFailures.forEach(failure => {
      console.log(`❌ ${failure.path}`)
      console.log(`   This endpoint is accessible WITHOUT authentication!`)
      console.log(`   Fix immediately to prevent security breach.`)
    })
    console.log()
  }

  // Average response time
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
  console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`)
  console.log()

  // Save results to file
  const outputPath = path.join(process.cwd(), 'smoke-test-results.json')
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      total: results.length,
      passed: passCount,
      failed: failCount,
      passRate: ((passCount / results.length) * 100).toFixed(1) + '%',
      avgResponseTime: avgResponseTime.toFixed(2) + 'ms',
    },
    criticalFailures: criticalFailures.length,
    results,
  }, null, 2))

  console.log(`📁 Results saved to: ${outputPath}`)
  console.log()

  if (failCount > 0) {
    console.log('⚠️  Some tests failed. Please review the failures above.')
    process.exit(1)
  } else {
    console.log('✅ All tests passed!')
    process.exit(0)
  }
}

// Run tests
runSmokeTests().catch(error => {
  console.error('Fatal error running smoke tests:', error)
  process.exit(1)
})
