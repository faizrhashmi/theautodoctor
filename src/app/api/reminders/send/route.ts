/**
 * API endpoint to trigger email reminders
 *
 * Can be called by:
 * 1. Cron job (e.g., Vercel Cron, GitHub Actions)
 * 2. Manual trigger for testing
 * 3. External scheduler
 *
 * POST /api/reminders/send
 * Body: { type: '24h' | '1h' | '15min' | 'all' }
 * Auth: Requires CRON_SECRET or service role
 */

import { NextRequest, NextResponse } from 'next/server'
import { processReminders, processAllReminders } from '@/lib/emailReminders'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const cronSecret = request.headers.get('x-cron-secret')

    const isAuthorized =
      cronSecret === process.env.CRON_SECRET ||
      authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid credentials' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { type } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Missing required field: type' },
        { status: 400 }
      )
    }

    if (!['24h', '1h', '15min', 'all'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid reminder type. Must be: 24h, 1h, 15min, or all' },
        { status: 400 }
      )
    }

    console.log(`[API] Processing ${type} reminders...`)

    let results

    if (type === 'all') {
      results = await processAllReminders()
    } else {
      results = await processReminders(type as '24h' | '1h' | '15min')
    }

    console.log(`[API] Reminders processed successfully:`, results)

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[API] Error processing reminders:', error)
    return NextResponse.json(
      {
        error: 'Failed to process reminders',
        message: error.message
      },
      { status: 500 }
    )
  }
}

// Also support GET for health check
export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'Email Reminders',
    status: 'ready',
    endpoints: {
      POST: {
        description: 'Trigger reminder emails',
        body: {
          type: '24h | 1h | 15min | all'
        },
        auth: 'x-cron-secret header or Bearer token'
      }
    }
  })
}
