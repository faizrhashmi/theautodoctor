const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSession(sessionId) {
  console.log('\n🔍 Checking Session:', sessionId)
  console.log('='.repeat(60))

  // Get the session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    console.error('❌ Session not found:', sessionError?.message)
    return
  }

  console.log('\n📋 Session Details:')
  console.log('   ID:', session.id)
  console.log('   Status:', session.status)
  console.log('   Type:', session.type)
  console.log('   Plan:', session.plan)
  console.log('   Customer ID:', session.customer_user_id)
  console.log('   Mechanic ID:', session.mechanic_id || '(not assigned)')
  console.log('   Created:', session.created_at)
  console.log('   Started:', session.started_at || '(not started)')

  // Check if this session would appear in active sessions query
  const activeStatuses = ['pending', 'live', 'waiting', 'scheduled']
  const wouldAppearInActive = activeStatuses.includes(session.status)

  console.log('\n🎯 Active Sessions Eligibility:')
  console.log('   Current status:', session.status)
  console.log('   Active statuses:', activeStatuses.join(', '))
  console.log('   Would appear in active sessions?', wouldAppearInActive ? '✅ YES' : '❌ NO')

  if (!wouldAppearInActive) {
    console.log('   ⚠️  Session status is NOT in active list!')
    console.log('   💡 Change status to "waiting", "pending", "live", or "scheduled" to show in active sessions')
  }

  // Get session request
  const { data: request, error: requestError } = await supabase
    .from('session_requests')
    .select('*')
    .eq('parent_session_id', sessionId)
    .single()

  if (request) {
    console.log('\n📝 Session Request:')
    console.log('   ID:', request.id)
    console.log('   Status:', request.status)
    console.log('   Customer ID:', request.customer_id)
    console.log('   Mechanic ID:', request.mechanic_id || '(not assigned)')
    console.log('   Created:', request.created_at)
    console.log('   Accepted:', request.accepted_at || '(not accepted)')
  } else {
    console.log('\n⚠️  No session_request found for this session')
  }

  // If mechanic assigned, check what they would see
  if (session.mechanic_id) {
    console.log('\n👨‍🔧 Mechanic Dashboard Check:')
    console.log('   Mechanic ID:', session.mechanic_id)

    const { data: mechanicSessions, error: mechError } = await supabase
      .from('sessions')
      .select('id, status, type, plan, created_at')
      .eq('mechanic_id', session.mechanic_id)
      .in('status', ['pending', 'live', 'waiting', 'scheduled'])

    if (mechError) {
      console.error('   ❌ Error fetching mechanic sessions:', mechError.message)
    } else {
      console.log('   Active sessions for this mechanic:', mechanicSessions?.length || 0)
      if (mechanicSessions && mechanicSessions.length > 0) {
        mechanicSessions.forEach(s => {
          const isCurrent = s.id === sessionId
          console.log(`   ${isCurrent ? '→' : ' '} ${s.id} - ${s.status} (${s.type})`)
        })
      }
    }
  }

  // If customer assigned, check what they would see
  if (session.customer_user_id) {
    console.log('\n👤 Customer Dashboard Check:')
    console.log('   Customer ID:', session.customer_user_id)

    const { data: customerSessions, error: custError } = await supabase
      .from('sessions')
      .select('id, status, type, plan, created_at')
      .eq('customer_user_id', session.customer_user_id)
      .in('status', ['pending', 'live', 'waiting', 'scheduled'])

    if (custError) {
      console.error('   ❌ Error fetching customer sessions:', custError.message)
    } else {
      console.log('   Active sessions for this customer:', customerSessions?.length || 0)
      if (customerSessions && customerSessions.length > 0) {
        customerSessions.forEach(s => {
          const isCurrent = s.id === sessionId
          console.log(`   ${isCurrent ? '→' : ' '} ${s.id} - ${s.status} (${s.type})`)
        })
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n💡 Summary:')
  if (wouldAppearInActive && session.mechanic_id && session.customer_user_id) {
    console.log('   ✅ Session should appear in both dashboards')
    console.log('   ✅ Mechanic should see it in their active sessions')
    console.log('   ✅ Customer should see it in their active sessions')
  } else {
    if (!wouldAppearInActive) {
      console.log('   ❌ Session status prevents it from appearing in active sessions')
    }
    if (!session.mechanic_id) {
      console.log('   ❌ No mechanic assigned - won\'t appear in mechanic dashboard')
    }
    if (!session.customer_user_id) {
      console.log('   ❌ No customer assigned - won\'t appear in customer dashboard')
    }
  }

  console.log('\n🔧 Recommended Actions:')
  if (session.status === 'completed' || session.status === 'cancelled') {
    console.log('   - Session is ended, start a new session')
  } else if (!session.mechanic_id) {
    console.log('   - Assign a mechanic to this session')
  } else if (session.status !== 'waiting' && session.status !== 'live') {
    console.log('   - Update session status to "waiting" or "live"')
  } else {
    console.log('   - Check browser console logs on dashboard pages')
    console.log('   - Verify authentication (mechanic cookie, customer auth)')
    console.log('   - Check API responses: /api/mechanic/active-sessions')
  }

  console.log('')
}

// Get session ID from command line
const sessionId = process.argv[2]

if (!sessionId) {
  console.log('Usage: node check-why-no-active-sessions.js <session-id>')
  console.log('\nExample:')
  console.log('  node check-why-no-active-sessions.js 470bd84a-ee7b-414f-964f-70001c674b66')
  process.exit(1)
}

checkSession(sessionId).catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
