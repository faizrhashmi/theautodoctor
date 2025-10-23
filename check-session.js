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

async function checkSession() {
  const sessionId = '97d67bfd-7ebd-430f-827c-d76b561a58b0'

  console.log('Checking session:', sessionId)
  console.log('')

  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (!session) {
    console.log('❌ SESSION NOT FOUND IN DATABASE')
    console.log('')
    console.log('This session does not exist. It may have been:')
    console.log('  1. Cleaned up due to expiration (orphaned waiting sessions > 60 min)')
    console.log('  2. Deleted manually')
    console.log('  3. Never created in the first place')
    console.log('')

    // Check if there's a session_request for this
    const { data: request } = await supabase
      .from('session_requests')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    if (request) {
      console.log('📋 Found matching session_request:')
      console.log(`   Status: ${request.status}`)
      console.log(`   Created: ${request.created_at}`)
      console.log(`   Accepted: ${request.accepted_at || 'N/A'}`)
    }
  } else {
    console.log('✅ SESSION FOUND:')
    console.log(`   ID: ${session.id}`)
    console.log(`   Type: ${session.type}`)
    console.log(`   Status: ${session.status}`)
    console.log(`   Plan: ${session.plan}`)
    console.log(`   Created: ${session.created_at}`)
    console.log(`   Started: ${session.started_at || 'N/A'}`)
    console.log(`   Ended: ${session.ended_at || 'N/A'}`)
    console.log('')
    console.log('Full session data:')
    console.log(JSON.stringify(session, null, 2))
  }
}

checkSession()
  .catch(console.error)
  .finally(() => process.exit())
