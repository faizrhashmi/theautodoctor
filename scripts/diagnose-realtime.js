/**
 * Diagnose Real-time Issues
 *
 * This script helps debug why real-time subscriptions work in development but not production.
 * Run this in production environment to identify issues.
 */

const { createClient } = require('@supabase/supabase-js')

// IMPORTANT: Use your PRODUCTION Supabase credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Supabase Realtime Diagnostics')
console.log('=' .repeat(50))
console.log('Environment:', process.env.NODE_ENV)
console.log('Supabase URL:', SUPABASE_URL)
console.log('Anon Key (first 20 chars):', SUPABASE_ANON_KEY?.substring(0, 20) + '...')
console.log('=' .repeat(50))
console.log('')

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ ERROR: Missing Supabase credentials!')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

async function runDiagnostics() {
  console.log('✓ Step 1: Checking Supabase connection...')

  try {
    // Test basic connectivity
    const { data, error } = await supabase.from('session_assignments').select('count', { count: 'exact', head: true })

    if (error) {
      console.error('❌ Connection test failed:', error.message)
      return
    }

    console.log('✓ Step 1 PASSED: Basic connection works')
    console.log('')
  } catch (err) {
    console.error('❌ Step 1 FAILED:', err.message)
    return
  }

  console.log('✓ Step 2: Testing RLS policies...')

  try {
    // Test if we can read from session_assignments
    const { data, error } = await supabase
      .from('session_assignments')
      .select('id, status, session_id')
      .limit(1)

    if (error) {
      console.error('❌ RLS test failed:', error.message)
      console.error('   This means your RLS policies are blocking reads')
      console.error('   You need to allow anonymous/public reads or authenticate first')
      return
    }

    console.log('✓ Step 2 PASSED: RLS policies allow reads')
    console.log('')
  } catch (err) {
    console.error('❌ Step 2 FAILED:', err.message)
    return
  }

  console.log('✓ Step 3: Testing realtime subscription...')
  console.log('   (This will listen for 30 seconds)')
  console.log('   Try creating a session request in another window...')
  console.log('')

  let eventReceived = false

  const channel = supabase
    .channel('diagnostic-test')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'session_assignments',
      },
      (payload) => {
        eventReceived = true
        console.log('✅ REALTIME EVENT RECEIVED!')
        console.log('   Event type:', payload.eventType)
        console.log('   Record:', payload.new || payload.old)
        console.log('')
      }
    )
    .subscribe((status) => {
      console.log('   Subscription status:', status)

      if (status === 'SUBSCRIBED') {
        console.log('   ✓ Successfully subscribed to realtime channel')
      } else if (status === 'CHANNEL_ERROR') {
        console.log('   ❌ Channel error - realtime is NOT working!')
        console.log('   Common causes:')
        console.log('   1. Realtime not enabled in Supabase dashboard')
        console.log('   2. Table does not have replica identity set to FULL')
        console.log('   3. RLS policies blocking realtime events')
      } else if (status === 'TIMED_OUT') {
        console.log('   ❌ Connection timed out')
      } else if (status === 'CLOSED') {
        console.log('   ⚠️  Channel closed')
      }
    })

  // Wait 30 seconds
  await new Promise(resolve => setTimeout(resolve, 30000))

  if (eventReceived) {
    console.log('✅ Step 3 PASSED: Realtime events are working!')
  } else {
    console.log('❌ Step 3 FAILED: No realtime events received in 30 seconds')
    console.log('')
    console.log('💡 TROUBLESHOOTING STEPS:')
    console.log('')
    console.log('1. Check Supabase Dashboard > Settings > API')
    console.log('   - Make sure "Realtime" is enabled')
    console.log('')
    console.log('2. Check table replica identity:')
    console.log('   Run this SQL in Supabase SQL Editor:')
    console.log('   ')
    console.log('   SELECT tablename, ')
    console.log('          CASE relreplident')
    console.log('            WHEN \'d\' THEN \'default\'')
    console.log('            WHEN \'n\' THEN \'nothing\'')
    console.log('            WHEN \'f\' THEN \'full\'')
    console.log('            WHEN \'i\' THEN \'index\'')
    console.log('          END AS replica_identity')
    console.log('   FROM pg_class')
    console.log('   JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace')
    console.log('   WHERE nspname = \'public\'')
    console.log('   AND relname IN (\'sessions\', \'session_assignments\', \'repair_quotes\');')
    console.log('')
    console.log('   All tables should show "full" for replica_identity')
    console.log('   If not, run: ALTER TABLE session_assignments REPLICA IDENTITY FULL;')
    console.log('')
    console.log('3. Check RLS policies allow mechanics to SELECT:')
    console.log('   Run this SQL:')
    console.log('   ')
    console.log('   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual')
    console.log('   FROM pg_policies')
    console.log('   WHERE tablename = \'session_assignments\';')
    console.log('')
    console.log('4. Make sure you\'re logged in as a mechanic when testing')
    console.log('')
  }

  await supabase.removeChannel(channel)
  console.log('')
  console.log('🏁 Diagnostics complete')
  process.exit(0)
}

runDiagnostics()
