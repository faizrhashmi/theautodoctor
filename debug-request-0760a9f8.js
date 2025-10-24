// Debug script to check request 0760a9f8-960f-4f96-b4ee-4c79a87b6d1d
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugRequest() {
  const requestId = '0760a9f8-960f-4f96-b4ee-4c79a87b6d1d'

  console.log('=== CHECKING REQUEST ===')
  console.log('Request ID:', requestId)
  console.log('')

  // Check session_requests table
  const { data: request, error: reqError } = await supabase
    .from('session_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle()

  if (reqError) {
    console.error('Error fetching request:', reqError)
  } else if (!request) {
    console.log('❌ REQUEST NOT FOUND in session_requests table')
  } else {
    console.log('✓ Request found in session_requests:')
    console.log('  - Status:', request.status)
    console.log('  - Customer ID:', request.customer_id)
    console.log('  - Customer Name:', request.customer_name)
    console.log('  - Mechanic ID:', request.mechanic_id || '(none - available for all mechanics)')
    console.log('  - Session Type:', request.session_type)
    console.log('  - Plan Code:', request.plan_code)
    console.log('  - Created At:', request.created_at)
    console.log('  - Accepted At:', request.accepted_at || '(not accepted yet)')
    console.log('')
  }

  // Check if there's a session
  if (request?.customer_id) {
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('customer_user_id', request.customer_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionError) {
      console.error('Error fetching session:', sessionError)
    } else if (!session) {
      console.log('❌ NO SESSION found for customer')
    } else {
      console.log('✓ Session found:')
      console.log('  - Session ID:', session.id)
      console.log('  - Status:', session.status)
      console.log('  - Mechanic ID:', session.mechanic_id || '(none assigned)')
      console.log('  - Type:', session.type)
      console.log('  - Intake ID:', session.intake_id || '(none)')
      console.log('  - Created At:', session.created_at)
      console.log('  - Started At:', session.started_at || '(not started)')
      console.log('')
    }
  }

  // Check all pending requests to see what mechanics should see
  const { data: allPending, error: pendingError } = await supabase
    .from('session_requests')
    .select('id, status, mechanic_id, customer_name, created_at')
    .eq('status', 'pending')
    .is('mechanic_id', null)
    .order('created_at', { ascending: true })

  if (pendingError) {
    console.error('Error fetching pending requests:', pendingError)
  } else {
    console.log('=== ALL PENDING REQUESTS (what mechanics should see) ===')
    console.log(`Found ${allPending?.length || 0} pending requests:`)
    if (allPending && allPending.length > 0) {
      allPending.forEach(req => {
        const isOurRequest = req.id === requestId
        console.log(`  ${isOurRequest ? '→' : ' '} ${req.id} | ${req.customer_name} | ${req.created_at}`)
      })
    }
    console.log('')
  }

  // Recommendations
  console.log('=== DIAGNOSIS ===')
  if (!request) {
    console.log('❌ Request does not exist. It may have been deleted or the ID is incorrect.')
  } else if (request.status !== 'pending') {
    console.log(`❌ Request status is "${request.status}" but mechanics only see "pending" requests.`)
    console.log('   Solution: Update status to "pending" or check why it changed.')
  } else if (request.mechanic_id !== null) {
    console.log(`❌ Request is assigned to mechanic ${request.mechanic_id}.`)
    console.log('   Only that specific mechanic will see it in their "accepted" list.')
    console.log('   Solution: Set mechanic_id to NULL to make it available to all mechanics.')
  } else {
    console.log('✓ Request appears to be correctly configured (status=pending, mechanic_id=null)')
    console.log('  It should be visible on mechanic dashboard.')
    console.log('  Check:')
    console.log('    1. Browser is not caching old data (hard refresh)')
    console.log('    2. Realtime subscriptions are working')
    console.log('    3. No errors in browser console')
  }
}

debugRequest().catch(console.error)
