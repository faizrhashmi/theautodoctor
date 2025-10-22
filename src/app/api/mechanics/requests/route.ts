import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { runFullCleanup } from '@/lib/sessionCleanup'

async function getMechanicFromCookie(_req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('aad_mech')?.value

  if (!token) return null

  const { data: session } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('mechanic_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) return null

  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email')
    .eq('id', session.mechanic_id)
    .maybeSingle()

  return mechanic
}

export async function GET(req: NextRequest) {
  const mechanic = await getMechanicFromCookie(req)

  if (!mechanic) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Run comprehensive cleanup to ensure no stale sessions/requests are blocking
  // This uses the centralized cleanup utility for consistency and robustness
  console.log('[mechanics/requests] Running cleanup before fetching requests...')
  const cleanupStats = await runFullCleanup()

  if (cleanupStats.totalCleaned > 0) {
    console.log(`[mechanics/requests] Cleaned up ${cleanupStats.totalCleaned} stale items:`, cleanupStats)
  }

  // Fetch all pending requests (only recent ones now)
  const { data: requests, error } = await supabaseAdmin
    .from('session_requests')
    .select('*')
    .eq('status', 'pending')
    .is('mechanic_id', null)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch session requests for mechanic', error)
    return NextResponse.json({ error: 'Unable to fetch requests' }, { status: 500 })
  }

  // Enrich requests with intake data and files
  const enrichedRequests = await Promise.all(
    (requests || []).map(async (request) => {
      // Get the session for this request to find intake_id
      const { data: session } = await supabaseAdmin
        .from('sessions')
        .select('id, intake_id, metadata')
        .eq('customer_user_id', request.customer_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let intakeData: any = null
      let sessionFiles: any[] = []

      if (session?.intake_id) {
        // Fetch intake data
        const { data: intake } = await supabaseAdmin
          .from('intakes')
          .select('*')
          .eq('id', session.intake_id)
          .maybeSingle()

        intakeData = intake
      }

      if (session?.id) {
        // Fetch session files
        const { data: files } = await supabaseAdmin
          .from('session_files')
          .select('id, file_name, file_size, file_type, file_url, created_at, description')
          .eq('session_id', session.id)
          .order('created_at', { ascending: false })

        sessionFiles = files || []
      }

      return {
        ...request,
        intake: intakeData,
        files: sessionFiles,
        sessionId: session?.id || null,
      }
    })
  )

  return NextResponse.json({ requests: enrichedRequests })
}
