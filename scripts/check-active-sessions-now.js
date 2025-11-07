/**
 * Check Active Sessions in Database
 * Quick diagnostic to see if any customer has active sessions
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { supabaseAdmin } from '../src/lib/supabaseAdmin.ts'

const ACTIVE_STATUSES = ['pending', 'waiting', 'live', 'scheduled']

async function checkActiveSessions() {
  console.log('CHECKING ACTIVE SESSIONS IN DATABASE')
  console.log('='.repeat(80))

  // Get all active sessions
  const { data: sessions, error, count } = await supabaseAdmin
    .from('sessions')
    .select('id, customer_user_id, mechanic_id, type, status, plan, created_at, started_at, ended_at, scheduled_start, scheduled_end', { count: 'exact' })
    .in('status', ACTIVE_STATUSES)
    .is('ended_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error querying sessions:', error)
    return
  }

  console.log('\nTotal active sessions found:', count || 0, '\n')

  if (!sessions || sessions.length === 0) {
    console.log('No active sessions found in database')
    console.log('\nPossible reasons:')
    console.log('  1. No customer has an active session right now')
    console.log('  2. All sessions have ended_at set')
    console.log('  3. All sessions have status "completed" or "cancelled"')
    return
  }

  console.log('Found', sessions.length, 'active session(s):\n')

  for (const session of sessions) {
    console.log('-'.repeat(80))
    console.log('Session ID:', session.id)
    console.log('  Customer User ID:', session.customer_user_id)
    console.log('  Mechanic ID:', session.mechanic_id || 'Not assigned')
    console.log('  Type:', session.type)
    console.log('  Status:', session.status)
    console.log('  Plan:', session.plan)
    console.log('  Created:', session.created_at)
    console.log('  Started:', session.started_at || 'Not started')
    console.log('  Ended:', session.ended_at || 'Not ended (active)')
    if (session.scheduled_start) {
      console.log('  Scheduled Start:', session.scheduled_start)
    }
    if (session.scheduled_end) {
      console.log('  Scheduled End:', session.scheduled_end)
    }
    console.log('')
  }

  console.log('='.repeat(80))
  console.log('\nCheck complete!')
}

checkActiveSessions().catch(console.error)
