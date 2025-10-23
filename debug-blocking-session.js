/**
 * Debug the specific session blocking customer from starting new sessions
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

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const sessionId = 'e30bdba7-be1e-4dd9-aeb7-720fa0972194'

async function debugBlockingSession() {
  console.log('\n🔍 Debugging Blocking Session\n')
  console.log('Session ID:', sessionId)
  console.log('━'.repeat(60))

  // Get full session details
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (sessionError) {
    console.log('❌ Error fetching session:', sessionError)
    return
  }

  console.log('\n📊 Session Details:')
  console.log('Status:', session.status)
  console.log('Type:', session.type)
  console.log('Plan:', session.plan)
  console.log('Created:', new Date(session.created_at).toLocaleString())
  console.log('Started:', session.started_at ? new Date(session.started_at).toLocaleString() : 'Never started')
  console.log('Ended:', session.ended_at ? new Date(session.ended_at).toLocaleString() : 'Not ended')
  console.log('Customer ID:', session.customer_user_id)
  console.log('Mechanic ID:', session.mechanic_id)

  if (session.metadata) {
    console.log('\nMetadata:')
    console.log(JSON.stringify(session.metadata, null, 2))
  }

  console.log('\n━'.repeat(60))
  console.log('ANALYSIS:')
  console.log('━'.repeat(60))

  const now = new Date()
  const created = new Date(session.created_at)
  const ageMinutes = Math.floor((now - created) / 1000 / 60)

  console.log(`\n⏱️  Session age: ${ageMinutes} minutes`)
  console.log(`📍 Current status: ${session.status}`)

  // Check what the status SHOULD be based on timeout policies
  if (!session.started_at) {
    if (ageMinutes > 120) {
      console.log('❌ PROBLEM: Session should be "expired" (>120 min, never started)')
      console.log('   Current status:', session.status)
      console.log('   Expected status: expired')
    } else if (ageMinutes > 5) {
      console.log('⚠️  PROBLEM: Session should be "unattended" (>5 min, never started)')
      console.log('   Current status:', session.status)
      console.log('   Expected status: unattended')
    }
  }

  // Check if it's showing in dashboard
  const excludedStatuses = ['completed', 'cancelled', 'unattended', 'expired']
  const wouldShowInDashboard = !excludedStatuses.includes(session.status.toLowerCase())

  console.log(`\n🖥️  Shows in customer dashboard: ${wouldShowInDashboard ? 'YES ❌' : 'NO ✅'}`)
  console.log(`   (Excluded statuses: ${excludedStatuses.join(', ')})`)

  if (wouldShowInDashboard) {
    console.log('\n💡 SOLUTION:')
    console.log('   This session needs to be marked as "unattended" or "expired"')
    console.log('   to stop blocking the customer from starting new sessions.')
    console.log('')
    console.log('   Options:')
    console.log('   1. Run cleanup script to auto-mark old sessions')
    console.log('   2. Manually update this session status to "expired"')
  }

  // Check session_requests table for related request
  const { data: request, error: requestError } = await supabaseAdmin
    .from('session_requests')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (request) {
    console.log('\n📝 Related Session Request:')
    console.log('Request ID:', request.id)
    console.log('Status:', request.status)
    console.log('Created:', new Date(request.created_at).toLocaleString())
    console.log('Accepted:', request.accepted_at ? new Date(request.accepted_at).toLocaleString() : 'Not accepted')
  }

  console.log('\n')
}

debugBlockingSession().catch(console.error)
