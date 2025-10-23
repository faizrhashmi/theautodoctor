/**
 * Fix the stuck session blocking customer
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

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const sessionId = 'e30bdba7-be1e-4dd9-aeb7-720fa0972194'

async function fixStuckSession() {
  console.log('\n🔧 Fixing Stuck Session\n')
  console.log('Session ID:', sessionId)
  console.log('━'.repeat(60))

  // Mark as expired
  const { error } = await supabaseAdmin
    .from('sessions')
    .update({
      status: 'expired',
      ended_at: new Date().toISOString(),
      metadata: {
        expired_reason: 'Session timed out - never started (manual cleanup)',
        expired_at: new Date().toISOString()
      }
    })
    .eq('id', sessionId)

  if (error) {
    console.log('❌ Error updating session:', error)
    return
  }

  console.log('✅ Session marked as expired')
  console.log('   Status: pending → expired')
  console.log('   Ended at:', new Date().toLocaleString())
  console.log('')
  console.log('🔄 REFRESH YOUR BROWSER - you should now be able to start a new session!')
  console.log('')

  // Also check for any related session request
  const { data: request } = await supabaseAdmin
    .from('session_requests')
    .select('id, status')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (request && request.status !== 'cancelled') {
    const { error: reqError } = await supabaseAdmin
      .from('session_requests')
      .update({ status: 'cancelled' })
      .eq('id', request.id)

    if (!reqError) {
      console.log('✅ Related request also cancelled')
    }
  }
}

fixStuckSession().catch(console.error)
