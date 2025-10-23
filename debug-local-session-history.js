/**
 * Debug why session history shows in production but not in local dev
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Manually load .env.local
const envPath = path.join(__dirname, '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim()
    process.env[key] = value
  }
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function debugLocalSessionHistory() {
  console.log('\n🔍 Debugging Local Dev Session History\n')
  console.log('━'.repeat(50))

  // Show which environment we're connected to
  console.log('\n📡 Environment Check:')
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('Is production URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co'))

  const mechanicId = '1daec681-04cf-4640-9b98-d5369361e366'

  console.log('\n👤 Mechanic Info:')
  console.log('Mechanic ID:', mechanicId)

  // Check what sessions exist for this mechanic
  console.log('\n━'.repeat(50))
  console.log('TEST 1: All sessions for this mechanic')
  console.log('━'.repeat(50))

  const { data: allSessions, error: allError } = await supabase
    .from('sessions')
    .select('id, status, type, created_at, mechanic_id')
    .eq('mechanic_id', mechanicId)
    .order('created_at', { ascending: false })

  if (allError) {
    console.log('❌ Error:', allError)
  } else {
    console.log(`✅ Found ${allSessions.length} total sessions`)
    allSessions.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.type} - ${s.status} (${new Date(s.created_at).toLocaleString()})`)
    })
  }

  // Check completed/cancelled sessions (what the UI queries for)
  console.log('\n━'.repeat(50))
  console.log('TEST 2: Session History Query (same as UI)')
  console.log('━'.repeat(50))

  const { data: historyData, error: historyError } = await supabase
    .from('sessions')
    .select('id, status, plan, type, scheduled_start, scheduled_end, scheduled_for, started_at, ended_at, duration_minutes, metadata')
    .eq('mechanic_id', mechanicId)
    .in('status', ['completed', 'cancelled'])
    .order('created_at', { ascending: false })

  if (historyError) {
    console.log('❌ Error:', historyError)
  } else {
    console.log(`✅ Found ${historyData.length} history sessions (completed/cancelled)`)
    historyData.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.type} - ${s.status} - plan: ${s.plan || 'null'}`)
    })
  }

  // Check the sessions table structure
  console.log('\n━'.repeat(50))
  console.log('TEST 3: Check one session details')
  console.log('━'.repeat(50))

  if (allSessions && allSessions.length > 0) {
    const { data: sampleSession, error: sampleError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', allSessions[0].id)
      .single()

    if (sampleError) {
      console.log('❌ Error:', sampleError)
    } else {
      console.log('Sample session columns:')
      console.log(Object.keys(sampleSession).join(', '))
      console.log('\nSample session data:')
      console.log(JSON.stringify(sampleSession, null, 2))
    }
  }

  // Check if there's a database view or different table
  console.log('\n━'.repeat(50))
  console.log('TEST 4: Check database schema')
  console.log('━'.repeat(50))

  const { data: tables, error: tablesError } = await supabase
    .from('sessions')
    .select('*')
    .limit(1)

  console.log('Sessions table accessible:', !tablesError)

  console.log('\n━'.repeat(50))
  console.log('DIAGNOSIS')
  console.log('━'.repeat(50))

  if (allSessions && allSessions.length > 0 && historyData && historyData.length === 0) {
    console.log('⚠️  ISSUE FOUND: Sessions exist but none are completed/cancelled')
    console.log('This means your local dev sessions are in a different status.')
    console.log('Status breakdown:')
    const statusCounts = {}
    allSessions.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1
    })
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`)
    })
    console.log('\n💡 SOLUTION: Your local sessions need to be marked as completed/cancelled')
    console.log('   Production likely has completed sessions, local dev does not.')
  } else if (allSessions && allSessions.length === 0) {
    console.log('⚠️  ISSUE FOUND: No sessions at all for this mechanic')
    console.log('This means:')
    console.log('   1. You\'re connected to a different database than production')
    console.log('   2. Or this mechanic ID doesn\'t exist in local dev database')
    console.log('\n💡 SOLUTION: Check your .env.local and make sure you\'re using production database')
  } else if (historyData && historyData.length > 0) {
    console.log('✅ Session history data IS available!')
    console.log('This means the issue is in the frontend rendering, not the database.')
    console.log('\n💡 SOLUTION: Check browser console for JavaScript errors')
    console.log('   Or the component state might not be updating correctly.')
  }
}

debugLocalSessionHistory().catch(console.error)
