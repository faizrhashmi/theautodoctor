/**
 * COMPREHENSIVE SESSION FLOW INVESTIGATION
 *
 * This script will:
 * 1. Check the actual database schema for sessions and session_requests tables
 * 2. Find the specific session e8762f53-5137-44ee-b8ef-09c9a01b1c5f
 * 3. Check if there's a related session_request
 * 4. Analyze the relationship between the two tables
 * 5. Identify why sessions disappear from mechanic dashboard
 */

import 'dotenv/config'
import { supabaseAdmin } from '../src/lib/supabaseAdmin.ts'

const SESSION_ID = 'e8762f53-5137-44ee-b8ef-09c9a01b1c5f'

async function investigate() {
  console.log('🔍 COMPREHENSIVE SESSION FLOW INVESTIGATION')
  console.log('=' .repeat(80))

  // 1. Check session_requests table schema
  console.log('\n📋 1. SESSION_REQUESTS TABLE SCHEMA:')
  const { data: srSchema, error: srSchemaError } = await supabaseAdmin
    .from('session_requests')
    .select('*')
    .limit(1)

  if (srSchemaError) {
    console.error('❌ Error fetching session_requests schema:', srSchemaError)
  } else if (srSchema && srSchema[0]) {
    console.log('Columns:', Object.keys(srSchema[0]))
  } else {
    console.log('⚠️  No session_requests found in database')
  }

  // 2. Check sessions table schema
  console.log('\n📋 2. SESSIONS TABLE SCHEMA:')
  const { data: sessionsSchema, error: sessionsSchemaError } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .limit(1)

  if (sessionsSchemaError) {
    console.error('❌ Error fetching sessions schema:', sessionsSchemaError)
  } else if (sessionsSchema && sessionsSchema[0]) {
    console.log('Columns:', Object.keys(sessionsSchema[0]))
  } else {
    console.log('⚠️  No sessions found in database')
  }

  // 3. Find the specific session
  console.log(`\n🎯 3. FINDING SESSION ${SESSION_ID}:`)
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('id', SESSION_ID)
    .maybeSingle()

  if (sessionError) {
    console.error('❌ Error fetching session:', sessionError)
  } else if (session) {
    console.log('✅ Session found!')
    console.log(JSON.stringify(session, null, 2))
  } else {
    console.log('❌ Session NOT found in sessions table')
  }

  // 4. Check if there's a related session_request
  console.log('\n🔗 4. LOOKING FOR RELATED SESSION_REQUEST:')

  // Try different possible relationships
  const relationships = []

  // Check all session_requests to see if any have metadata or other fields linking to this session
  const { data: allRequests } = await supabaseAdmin
    .from('session_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (allRequests) {
    console.log(`Examining ${allRequests.length} recent requests for links to session ${SESSION_ID}`)
    allRequests.forEach(req => {
      // Check metadata for session reference
      if (req.metadata && typeof req.metadata === 'object') {
        if (req.metadata.session_id === SESSION_ID || req.metadata.parent_session_id === SESSION_ID) {
          console.log(`✅ Found request ${req.id} with session reference in metadata`)
          relationships.push({ type: 'metadata_reference', data: req })
        }
      }
    })
  }

  // Check by mechanic_id if we have session
  if (session?.mechanic_id) {
    const { data: reqsByMechanic } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('mechanic_id', session.mechanic_id)
      .eq('status', 'accepted')
      .order('accepted_at', { ascending: false })
      .limit(5)

    if (reqsByMechanic && reqsByMechanic.length > 0) {
      console.log(`Found ${reqsByMechanic.length} accepted requests by mechanic ${session.mechanic_id}`)
      relationships.push({ type: 'by_mechanic_id', data: reqsByMechanic })
    }
  }

  // Check by customer_id if we have session
  if (session?.customer_user_id) {
    const { data: reqsByCustomer } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('customer_id', session.customer_user_id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (reqsByCustomer && reqsByCustomer.length > 0) {
      console.log(`Found ${reqsByCustomer.length} requests by customer ${session.customer_user_id}`)
      relationships.push({ type: 'by_customer_id', data: reqsByCustomer })
    }
  }

  if (relationships.length > 0) {
    console.log('\nRelationships found:')
    relationships.forEach(rel => {
      console.log(`\n  ${rel.type}:`)
      console.log('  ', JSON.stringify(rel.data, null, 2))
    })
  } else {
    console.log('❌ No session_requests found related to this session')
  }

  // 5. Check ALL pending session_requests
  console.log('\n📊 5. ALL PENDING SESSION_REQUESTS:')
  const { data: pendingRequests, error: pendingError } = await supabaseAdmin
    .from('session_requests')
    .select('id, customer_id, mechanic_id, status, session_type, plan_code, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10)

  if (pendingError) {
    console.error('❌ Error fetching pending requests:', pendingError)
  } else {
    console.log(`Found ${pendingRequests?.length || 0} pending requests`)
    if (pendingRequests) {
      pendingRequests.forEach((req, idx) => {
        console.log(`  ${idx + 1}. ${req.id} - ${req.session_type} (${req.plan_code}) - ${req.created_at}`)
      })
    }
  }

  // 6. Check ALL accepted session_requests
  console.log('\n✅ 6. ALL ACCEPTED SESSION_REQUESTS:')
  const { data: acceptedRequests, error: acceptedError } = await supabaseAdmin
    .from('session_requests')
    .select('id, customer_id, mechanic_id, status, session_type, plan_code, accepted_at')
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false })
    .limit(10)

  if (acceptedError) {
    console.error('❌ Error fetching accepted requests:', acceptedError)
  } else {
    console.log(`Found ${acceptedRequests?.length || 0} accepted requests`)
    if (acceptedRequests) {
      acceptedRequests.forEach((req, idx) => {
        console.log(`  ${idx + 1}. ${req.id} - Mechanic: ${req.mechanic_id} - ${req.session_type} (${req.plan_code}) - ${req.accepted_at}`)
      })
    }
  }

  // 7. Check sessions by status
  console.log('\n🎬 7. SESSIONS BY STATUS:')
  const statuses = ['pending', 'waiting', 'live', 'scheduled', 'completed', 'cancelled']

  for (const status of statuses) {
    const { data: sessionsByStatus, count } = await supabaseAdmin
      .from('sessions')
      .select('id, status, type, mechanic_id, customer_user_id, created_at', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(5)

    console.log(`\n  ${status.toUpperCase()}: ${count || 0} total`)
    if (sessionsByStatus && sessionsByStatus.length > 0) {
      sessionsByStatus.forEach((s, idx) => {
        console.log(`    ${idx + 1}. ${s.id} - ${s.type} - Mechanic: ${s.mechanic_id || 'none'} - ${s.created_at}`)
      })
    }
  }

  // 8. THE BIG QUESTION: Why can't mechanic see their sessions?
  console.log('\n\n💡 8. ANALYSIS - WHY SESSIONS DISAPPEAR:')
  console.log('=' .repeat(80))

  if (session) {
    console.log(`Session ${SESSION_ID} exists with:`)
    console.log(`  - Status: ${session.status}`)
    console.log(`  - Type: ${session.type}`)
    console.log(`  - Mechanic ID: ${session.mechanic_id || 'NONE'}`)
    console.log(`  - Customer ID: ${session.customer_user_id}`)

    if (!session.mechanic_id) {
      console.log('\n❌ PROBLEM: Session has no mechanic_id assigned!')
      console.log('   This means when mechanic accepted the request, the session was not updated.')
    }

    if (session.status === 'pending') {
      console.log('\n⚠️  ISSUE: Session is still in "pending" status')
      console.log('   Mechanic dashboard likely only shows "waiting" or "live" sessions')
    }

    if (session.status === 'completed') {
      console.log('\n✅ Session is completed')
      console.log('   Mechanic should see this in completed/history view')
    }
  }

  console.log('\n\n📝 RECOMMENDATIONS:')
  console.log('=' .repeat(80))
  console.log('1. Add parent_session_id column to session_requests table')
  console.log('2. Create a unified view that joins sessions + session_requests')
  console.log('3. Update mechanic dashboard to show ALL sessions regardless of status')
  console.log('4. Add tabs for: Pending Requests | Active Sessions | Completed Sessions')
  console.log('5. Ensure accept endpoint ALWAYS updates both tables atomically')

  console.log('\n✅ Investigation complete!\n')
}

investigate().catch(console.error)
