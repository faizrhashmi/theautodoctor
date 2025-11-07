/**
 * Test the exact query used by the API endpoint
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { supabaseAdmin } from './src/lib/supabaseAdmin.ts'

const ACTIVE_STATUSES = ['pending', 'waiting', 'live', 'scheduled']
const USER_ID = '0af3d300-cbca-4019-baa6-e92e402ccd1b'

async function testQuery() {
  console.log('Testing API query for user:', USER_ID)
  console.log('ACTIVE_STATUSES:', ACTIVE_STATUSES)
  console.log('')

  // This is the EXACT query from the API endpoint
  const { data: rows, error } = await supabaseAdmin
    .from('sessions')
    .select('id, type, status, plan, created_at, started_at, ended_at, scheduled_start, scheduled_end, mechanic_id, customer_user_id')
    .eq('customer_user_id', USER_ID)
    .in('status', ACTIVE_STATUSES)
    .is('ended_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  console.log('Query error:', error)
  console.log('Query result:', { rowCount: rows?.length, rows })
  console.log('')

  if (rows && rows.length > 0) {
    console.log('SUCCESS: Found session')
    console.log('Session ID:', rows[0].id)
    console.log('Status:', rows[0].status)
  } else {
    console.log('FAILED: No session found')
    console.log('')
    console.log('Trying without type casting...')

    // Try without the type casting that's in the API
    const { data: rows2, error: error2 } = await supabaseAdmin
      .from('sessions')
      .select('id, type, status, plan, created_at, started_at, ended_at')
      .eq('customer_user_id', USER_ID)
      .is('ended_at', null)
      .order('created_at', { ascending: false })
      .limit(1)

    console.log('Without status filter - error:', error2)
    console.log('Without status filter - result:', { rowCount: rows2?.length, rows2 })
  }
}

testQuery().catch(console.error)
