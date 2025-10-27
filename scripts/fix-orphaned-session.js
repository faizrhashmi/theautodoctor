/**
 * FIX ORPHANED SESSION
 *
 * This script fixes the specific orphaned session: e8762f53-5137-44ee-b8ef-09c9a01b1c5f
 * It will:
 * 1. Update the session to assign it to the mechanic who accepted the request
 * 2. Link the session_request to the session
 */

import 'dotenv/config'
import { supabaseAdmin } from '../src/lib/supabaseAdmin.ts'

const SESSION_ID = 'e8762f53-5137-44ee-b8ef-09c9a01b1c5f'
const REQUEST_ID = 'eaa411bc-fca0-4c69-b5ce-7f66866c2274'
const MECHANIC_ID = '1daec681-04cf-4640-9b98-d5369361e366'

async function fixOrphanedSession() {
  console.log('🔧 FIXING ORPHANED SESSION')
  console.log('=' .repeat(80))
  console.log(`Session ID: ${SESSION_ID}`)
  console.log(`Request ID: ${REQUEST_ID}`)
  console.log(`Mechanic ID: ${MECHANIC_ID}`)
  console.log('')

  // Step 1: Update the session to assign mechanic
  console.log('Step 1: Updating session to assign mechanic...')
  const { data: updatedSession, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .update({ mechanic_id: MECHANIC_ID })
    .eq('id', SESSION_ID)
    .select()
    .single()

  if (sessionError) {
    console.error('❌ Failed to update session:', sessionError)
    process.exit(1)
  }

  console.log('✅ Session updated successfully!')
  console.log(`   mechanic_id: ${updatedSession.mechanic_id}`)
  console.log(`   status: ${updatedSession.status}`)
  console.log('')

  // Step 2: Link session_request to session
  console.log('Step 2: Linking session_request to session...')
  const { data: updatedRequest, error: requestError } = await supabaseAdmin
    .from('session_requests')
    .update({ parent_session_id: SESSION_ID })
    .eq('id', REQUEST_ID)
    .select()
    .single()

  if (requestError) {
    console.error('❌ Failed to update session_request:', requestError)
    process.exit(1)
  }

  console.log('✅ Session request updated successfully!')
  console.log(`   parent_session_id: ${updatedRequest.parent_session_id}`)
  console.log(`   status: ${updatedRequest.status}`)
  console.log(`   mechanic_id: ${updatedRequest.mechanic_id}`)
  console.log('')

  // Verify the fix
  console.log('✅ VERIFICATION:')
  console.log('=' .repeat(80))
  console.log('The mechanic should now see this session in their dashboard.')
  console.log('Dashboard query: SELECT * FROM sessions WHERE mechanic_id = mechanic_id AND status IN (\'waiting\', \'live\')')
  console.log('')
  console.log('Next steps:')
  console.log('1. Mechanic refreshes their dashboard')
  console.log('2. Session should appear in "Active Sessions"')
  console.log('3. Mechanic can click to join the session at: /video/' + SESSION_ID)
  console.log('')
  console.log('✅ Fix complete!')
}

fixOrphanedSession().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
