const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local file
const envPath = path.join(__dirname, '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1]] = match[2]
  }
})

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

async function debugLocalhost() {
  console.log('🔍 Debugging localhost mechanic dashboard issues...\n')

  // Get your mechanic ID (assuming you're logged in as the first mechanic)
  const { data: mechanics } = await supabase
    .from('mechanics')
    .select('id, name, email')
    .limit(5)

  if (!mechanics || mechanics.length === 0) {
    console.log('❌ No mechanics found in database')
    return
  }

  console.log('Found mechanics:')
  mechanics.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.name || m.email} (ID: ${m.id})`)
  })

  const mechanicId = mechanics[0].id
  console.log(`\n🔧 Checking data for mechanic: ${mechanics[0].name || mechanics[0].email}`)
  console.log(`   ID: ${mechanicId}\n`)

  // Check 1: Active Sessions
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('CHECK 1: Active Sessions (blocking accepts)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const { data: activeSessions } = await supabase
    .from('sessions')
    .select('id, status, type, created_at, started_at, mechanic_id')
    .eq('mechanic_id', mechanicId)
    .in('status', ['waiting', 'live', 'scheduled'])

  if (activeSessions && activeSessions.length > 0) {
    console.log(`❌ FOUND ${activeSessions.length} active session(s) blocking you:\n`)
    activeSessions.forEach((s, i) => {
      console.log(`   ${i + 1}. Session ID: ${s.id}`)
      console.log(`      Type: ${s.type}`)
      console.log(`      Status: ${s.status}`)
      console.log(`      Created: ${new Date(s.created_at).toLocaleString()}`)
      console.log(`      Started: ${s.started_at || 'Not started'}`)
      console.log('')
    })
    console.log('   💡 These sessions are preventing you from accepting new requests.')
    console.log('   🔧 To fix: Run cleanup or manually set status to "completed"\n')
  } else {
    console.log('✅ No active sessions found\n')
  }

  // Check 2: Accepted Requests
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('CHECK 2: Accepted Requests (blocking accepts)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const { data: acceptedRequests } = await supabase
    .from('session_requests')
    .select('id, status, session_type, created_at, accepted_at')
    .eq('mechanic_id', mechanicId)
    .eq('status', 'accepted')

  if (acceptedRequests && acceptedRequests.length > 0) {
    console.log(`❌ FOUND ${acceptedRequests.length} accepted request(s) blocking you:\n`)
    acceptedRequests.forEach((r, i) => {
      console.log(`   ${i + 1}. Request ID: ${r.id}`)
      console.log(`      Type: ${r.session_type}`)
      console.log(`      Created: ${new Date(r.created_at).toLocaleString()}`)
      console.log(`      Accepted: ${new Date(r.accepted_at).toLocaleString()}`)
      console.log('')
    })
    console.log('   💡 These accepted requests are preventing you from accepting new ones.')
    console.log('   🔧 To fix: Run cleanup or manually set status to "cancelled"\n')
  } else {
    console.log('✅ No accepted requests found\n')
  }

  // Check 3: Session History
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('CHECK 3: Session History')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const { data: completedSessions } = await supabase
    .from('sessions')
    .select('id, status, type, created_at, started_at, ended_at')
    .eq('mechanic_id', mechanicId)
    .in('status', ['completed', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(10)

  if (completedSessions && completedSessions.length > 0) {
    console.log(`✅ Found ${completedSessions.length} completed session(s):\n`)
    completedSessions.forEach((s, i) => {
      console.log(`   ${i + 1}. Session ID: ${s.id}`)
      console.log(`      Type: ${s.type}`)
      console.log(`      Status: ${s.status}`)
      console.log(`      Created: ${new Date(s.created_at).toLocaleString()}`)
      console.log(`      Ended: ${s.ended_at ? new Date(s.ended_at).toLocaleString() : 'N/A'}`)
      console.log('')
    })
  } else {
    console.log('⚠️  No completed sessions found')
    console.log('   This is why session history is empty\n')
  }

  // Check 4: All Sessions (for debugging)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('CHECK 4: All Sessions for This Mechanic')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const { data: allSessions } = await supabase
    .from('sessions')
    .select('id, status, type, created_at')
    .eq('mechanic_id', mechanicId)
    .order('created_at', { ascending: false })

  if (allSessions && allSessions.length > 0) {
    console.log(`Found ${allSessions.length} total session(s):\n`)
    const statusCounts = {}
    allSessions.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1
    })
    Object.keys(statusCounts).forEach(status => {
      console.log(`   ${status}: ${statusCounts[status]}`)
    })
    console.log('')
  } else {
    console.log('⚠️  No sessions found at all for this mechanic\n')
  }

  // Offer cleanup
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('CLEANUP OPTIONS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('To fix blocking issues, you can:')
  console.log('')
  console.log('1. Run automatic cleanup:')
  console.log('   node run-cleanup.js')
  console.log('')
  console.log('2. Manually complete active sessions:')
  if (activeSessions && activeSessions.length > 0) {
    activeSessions.forEach(s => {
      console.log(`   UPDATE sessions SET status = 'completed' WHERE id = '${s.id}';`)
    })
  }
  console.log('')
  console.log('3. Manually cancel accepted requests:')
  if (acceptedRequests && acceptedRequests.length > 0) {
    acceptedRequests.forEach(r => {
      console.log(`   UPDATE session_requests SET status = 'cancelled' WHERE id = '${r.id}';`)
    })
  }
  console.log('')
}

debugLocalhost()
  .catch(console.error)
  .finally(() => process.exit())
