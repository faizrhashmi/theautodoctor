import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { PRICING, type PlanKey } from '@/config/pricing'
import VideoSessionClient from './VideoSessionClient'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: { id: string }
}

// Helper to check mechanic auth
async function getMechanicFromCookie() {
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

export default async function VideoSessionPage({ params }: PageProps) {
  const sessionId = params.id
  const supabase = getSupabaseServer()

  // Check for customer auth (Supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check for mechanic auth (custom)
  const mechanic = await getMechanicFromCookie()

  // Must be authenticated as either customer or mechanic
  if (!user && !mechanic) {
    redirect(`/signup?redirect=/video/${sessionId}`)
  }

  // Fetch session FIRST to determine the correct role
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, plan, type, status, metadata, created_at, started_at, ended_at, mechanic_id, customer_user_id')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError) {
    throw new Error(sessionError.message)
  }

  if (!session || session.type !== 'video') {
    notFound()
  }

  // CRITICAL: Determine role based on session assignment, NOT just cookie presence
  // This prevents role confusion when both cookies exist (testing on same browser)
  let currentUserId: string
  let userRole: 'mechanic' | 'customer'

  // Check if this person is the assigned mechanic for this session
  const isMechanicForThisSession = mechanic && session.mechanic_id === mechanic.id

  // Check if this person is the customer who created this session
  const isCustomerForThisSession = user && session.customer_user_id === user.id

  // Security logging
  console.log('[VIDEO PAGE SECURITY]', {
    sessionId,
    hasUserAuth: !!user,
    hasMechanicAuth: !!mechanic,
    sessionCustomerId: session.customer_user_id,
    sessionMechanicId: session.mechanic_id,
    isMechanicForThisSession,
    isCustomerForThisSession,
  })

  // IMPORTANT: Prioritize mechanic auth when both cookies exist
  // This ensures mechanics see the correct role
  if (isMechanicForThisSession && mechanic) {
    // They are the assigned mechanic
    currentUserId = mechanic.id
    userRole = 'mechanic'
    console.log('[VIDEO PAGE SECURITY] Role assigned: MECHANIC', { currentUserId })
  } else if (isCustomerForThisSession && user) {
    // They are the customer who created this session
    currentUserId = user.id
    userRole = 'customer'
    console.log('[VIDEO PAGE SECURITY] Role assigned: CUSTOMER', { currentUserId })
  } else {
    // Neither the assigned mechanic nor the customer - access denied
    console.log('[VIDEO PAGE SECURITY] ACCESS DENIED - Not assigned to this session')
    notFound()
  }

  const planKey = (session.plan as PlanKey) ?? 'video15'
  const planName = PRICING[planKey]?.name ?? 'Video Consultation'

  // Generate LiveKit token with correct role metadata
  const roomName = `session-${sessionId}`
  const identity = userRole === 'mechanic' ? `mechanic-${currentUserId}` : `customer-${currentUserId}`

  const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/livekit/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      room: roomName,
      identity: identity,
      metadata: JSON.stringify({
        sessionId,
        userId: currentUserId,
        role: userRole,
      }),
    }),
  })

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.json().catch(() => ({}))
    console.error('LiveKit token error:', errorData)
    throw new Error(errorData.error || 'Failed to generate LiveKit token')
  }

  const { token } = await tokenResponse.json()

  // Determine correct dashboard URL based on user existence (not role)
  const dashboardUrl = user ? '/customer/dashboard' : '/mechanic/dashboard'

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://myautodoctorca-oe6r6oqr.livekit.cloud'

  return (
    <VideoSessionClient
      sessionId={sessionId}
      userId={currentUserId}
      userRole={userRole}
      plan={planKey}
      planName={planName}
      token={token}
      serverUrl={serverUrl}
      status={session.status ?? 'pending'}
      startedAt={session.started_at || session.created_at}
      mechanicId={session.mechanic_id}
      customerId={session.customer_user_id}
      dashboardUrl={dashboardUrl}
    />
  )
}
