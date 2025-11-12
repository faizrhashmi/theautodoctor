#!/usr/bin/env node

/**
 * Render Cron Job Runner
 * This script runs as a Render Cron Job and calls multiple monitoring endpoints
 */

const https = require('https')
const http = require('http')

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
const CRON_SECRET = process.env.CRON_SECRET

if (!APP_URL) {
  console.error('ERROR: APP_URL environment variable is not set')
  process.exit(1)
}

if (!CRON_SECRET) {
  console.error('ERROR: CRON_SECRET environment variable is not set')
  process.exit(1)
}

console.log(`[${new Date().toISOString()}] Running cron jobs...`)

// Helper function to call an endpoint
async function callEndpoint(path, description) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, APP_URL)
    const isHttps = url.protocol === 'https:'
    const httpModule = isHttps ? https : http

    console.log(`\n[${description}] Calling: ${url.toString()}`)

    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'User-Agent': 'Render-Cron-Job',
      },
      timeout: 30000, // 30 second timeout
    }

    const req = httpModule.request(url, options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        console.log(`  Status: ${res.statusCode}`)

        try {
          const result = JSON.parse(data)

          if (res.statusCode === 200) {
            console.log(`  ✓ ${description} completed successfully`)
            console.log(`  Response:`, JSON.stringify(result, null, 2))
            resolve(result)
          } else {
            console.error(`  ✗ ${description} failed with status: ${res.statusCode}`)
            console.error(`  Response:`, data)
            reject(new Error(`${description} failed with status ${res.statusCode}`))
          }
        } catch (err) {
          console.error(`  Failed to parse response:`, err.message)
          console.error(`  Raw response:`, data)
          reject(err)
        }
      })
    })

    req.on('error', (err) => {
      console.error(`  Request failed:`, err.message)
      reject(err)
    })

    req.on('timeout', () => {
      console.error(`  Request timed out after 30 seconds`)
      req.destroy()
      reject(new Error('Request timeout'))
    })

    req.end()
  })
}

// Main execution
async function main() {
  const results = {
    monitor_sessions: null,
    release_reservations: null,
    errors: []
  }

  try {
    // 1. Monitor scheduled sessions
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Task 1: Monitor Scheduled Sessions')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    try {
      results.monitor_sessions = await callEndpoint(
        '/api/cron/monitor-sessions',
        'Session Monitor'
      )
    } catch (err) {
      console.error(`Failed: ${err.message}`)
      results.errors.push({ task: 'monitor-sessions', error: err.message })
    }

    // 2. Release expired slot reservations
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Task 2: Release Expired Reservations')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    try {
      results.release_reservations = await callEndpoint(
        '/api/cron/release-expired-reservations',
        'Reservation Cleanup'
      )
    } catch (err) {
      console.error(`Failed: ${err.message}`)
      results.errors.push({ task: 'release-reservations', error: err.message })
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Cron Job Summary')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    if (results.monitor_sessions) {
      console.log('✓ Session Monitor: SUCCESS')
      console.log(`  - Mechanics nudged: ${results.monitor_sessions.results?.nudged_mechanics || 0}`)
      console.log(`  - Support alerts: ${results.monitor_sessions.results?.support_alerts || 0}`)
      console.log(`  - Sessions auto-ended: ${results.monitor_sessions.results?.auto_ended_sessions || 0}`)
    } else {
      console.log('✗ Session Monitor: FAILED')
    }

    if (results.release_reservations) {
      console.log('✓ Reservation Cleanup: SUCCESS')
      console.log(`  - Expired reservations released: ${results.release_reservations.released_count || 0}`)
    } else {
      console.log('✗ Reservation Cleanup: FAILED')
    }

    if (results.errors.length > 0) {
      console.log(`\n⚠ ${results.errors.length} task(s) failed:`)
      results.errors.forEach(err => {
        console.log(`  - ${err.task}: ${err.error}`)
      })
      process.exit(1)
    } else {
      console.log('\n✓ All tasks completed successfully')
      process.exit(0)
    }

  } catch (err) {
    console.error('\n✗ Cron job failed:', err.message)
    process.exit(1)
  }
}

main()
