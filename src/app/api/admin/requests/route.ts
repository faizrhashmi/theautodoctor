import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

async function getAdminFromCookie(_req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('aad_admin')?.value

  if (!token) return null

  // TODO: Implement admin session validation
  // For now, check if admin cookie exists
  // In production, validate against admin_sessions table
  return { id: 'admin', role: 'admin' }
}

export async function GET(req: NextRequest) {
  const admin = await getAdminFromCookie(req)

  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const statusParamRaw = searchParams.get('status') || 'unattended'
  const statusParam = ['pending', 'accepted', 'cancelled', 'unattended', 'expired'].includes(statusParamRaw)
    ? (statusParamRaw as 'pending' | 'accepted' | 'cancelled' | 'unattended' | 'expired')
    : ('unattended' as const)

  // Fetch unattended or expired requests
  const { data: requests, error } = await supabaseAdmin
    .from('session_requests')
    .select('*')
    .eq('status', statusParam)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[admin/requests] Failed to fetch requests:', error)
    return NextResponse.json({ error: 'Unable to fetch requests' }, { status: 500 })
  }

  // Enrich with session data
  const enrichedRequests = await Promise.all(
    (requests || []).map(async (request) => {
      const { data: session } = await supabaseAdmin
        .from('sessions')
        .select('id, intake_id, metadata')
        .eq('customer_user_id', request.customer_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let intakeData: any = null

      if (session?.intake_id) {
        const { data: intake } = await supabaseAdmin
          .from('intakes')
          .select('*')
          .eq('id', session.intake_id)
          .maybeSingle()

        intakeData = intake
      }

      // Calculate age in minutes
      const ageMinutes = Math.floor(
        (Date.now() - new Date(request.created_at).getTime()) / 60000
      )

      return {
        ...request,
        intake: intakeData,
        sessionId: session?.id || null,
        ageMinutes,
      }
    })
  )

  return NextResponse.json({ requests: enrichedRequests })
}
