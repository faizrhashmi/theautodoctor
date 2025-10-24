#!/usr/bin/env node

/**
 * Render Cron Job Runner
 * This script runs as a Render Cron Job and calls the monitoring endpoint
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

const url = new URL('/api/cron/monitor-sessions', APP_URL)
const isHttps = url.protocol === 'https:'
const httpModule = isHttps ? https : http

console.log(`[${new Date().toISOString()}] Running session monitoring cron...`)
console.log(`Calling: ${url.toString()}`)

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
    console.log(`Status: ${res.statusCode}`)

    try {
      const result = JSON.parse(data)
      console.log('Response:', JSON.stringify(result, null, 2))

      if (res.statusCode === 200) {
        console.log('✓ Cron job completed successfully')
        console.log(`  - Mechanics nudged: ${result.results?.nudged_mechanics || 0}`)
        console.log(`  - Support alerts: ${result.results?.support_alerts || 0}`)
        console.log(`  - Sessions auto-ended: ${result.results?.auto_ended_sessions || 0}`)

        if (result.results?.errors?.length > 0) {
          console.warn('⚠ Errors occurred:', result.results.errors)
        }

        process.exit(0)
      } else {
        console.error('✗ Cron job failed with status:', res.statusCode)
        console.error('Response:', data)
        process.exit(1)
      }
    } catch (err) {
      console.error('Failed to parse response:', err)
      console.error('Raw response:', data)
      process.exit(1)
    }
  })
})

req.on('error', (err) => {
  console.error('Request failed:', err.message)
  process.exit(1)
})

req.on('timeout', () => {
  console.error('Request timed out after 30 seconds')
  req.destroy()
  process.exit(1)
})

req.end()
