import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { PRICING, type PlanKey } from '@/config/pricing'
import { generateLiveKitToken } from '@/lib/livekit'
import { checkAndExpireSession } from '@/lib/sessionExpiration'
import VideoSessionClient from './VideoSessionClient'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: { id: string }
}

// Helper to check mechanic auth using unified Supabase auth
async function getMechanicFromAuth() {
  const supabase = getSupabaseServer()

  // Get current authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) return null

  // Check if user has mechanic role
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'mechanic') return null

  // Load mechanic profile
  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email, user_id')
    .eq('user_id', user.id)
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

  // Check for mechanic auth (unified Supabase auth)
  const mechanic = await getMechanicFromAuth()

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

  // 🔀 PHASE 2: Accept both 'video' and 'diagnostic' types
  // Diagnostic sessions now handled by /video route for consolidation
  if (!session || (session.type !== 'video' && session.type !== 'diagnostic')) {
    notFound()
  }

  // ⏱️ AUTO-EXPIRE: Check if session has expired based on plan duration
  // This catches expired sessions even if the cron job hasn't run yet
  const { expired, session: checkedSession } = await checkAndExpireSession(sessionId)
  if (expired && checkedSession) {
    // Session was just expired, use the updated session data
    session.status = checkedSession.status
    session.ended_at = checkedSession.ended_at
    session.metadata = checkedSession.metadata
  }

  // CRITICAL: Determine role based on session assignment, NOT just cookie presence
  // This prevents role confusion when both cookies exist (testing on same browser)
  let currentUserId: string
  let userRole: 'mechanic' | 'customer'

  // Check if this person is the assigned mechanic for this session
  const isMechanicForThisSession = mechanic && session.mechanic_id === mechanic.id

  // Check if this person is the customer who created this session
  const isCustomerForThisSession = user && session.customer_user_id === user.id

  // Security logging (handles both video and diagnostic types)
  console.log('[VIDEO/DIAGNOSTIC PAGE SECURITY]', {
    sessionType: session.type,
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
    console.log('[VIDEO/DIAGNOSTIC PAGE SECURITY] Role assigned: MECHANIC', { currentUserId, sessionType: session.type })
  } else if (isCustomerForThisSession && user) {
    // They are the customer who created this session
    currentUserId = user.id
    userRole = 'customer'
    console.log('[VIDEO/DIAGNOSTIC PAGE SECURITY] Role assigned: CUSTOMER', { currentUserId, sessionType: session.type })
  } else {
    // Neither the assigned mechanic nor the customer - access denied
    console.log('[VIDEO/DIAGNOSTIC PAGE SECURITY] ACCESS DENIED - Not assigned to this session', { sessionType: session.type })
    notFound()
  }

  // 🔒 SECURITY FIX: Prevent access to completed/cancelled sessions
  // This blocks browser back button, direct URL access, and bookmarks
  if (session.status === 'completed' || session.status === 'cancelled') {
    const dashboardUrl = userRole === 'customer' ? '/customer/dashboard' : '/mechanic/dashboard'
    console.log(`[VIDEO/DIAGNOSTIC PAGE SECURITY] Session ${sessionId} (type: ${session.type}) is ${session.status} - redirecting to dashboard`)
    redirect(dashboardUrl)
  }

  // ✅ DYNAMIC PRICING: Fetch plan name from database first, fallback to hardcoded
  const planSlug = session.plan ?? 'standard'
  const { data: planData } = await supabaseAdmin
    .from('service_plans')
    .select('name, plan_type')
    .eq('slug', planSlug)
    .eq('is_active', true)
    .maybeSingle()

  const planKey = (session.plan as PlanKey) ?? 'video15'
  const planName = planData?.name ?? PRICING[planKey]?.name ?? 'Video Consultation'

  // Fetch mechanic name and user_id if assigned
  let mechanicName: string | null = null
  let mechanicUserId: string | null = null
  if (session.mechanic_id) {
    const { data: mechanicData } = await supabaseAdmin
      .from('mechanics')
      .select('name, user_id')
      .eq('id', session.mechanic_id)
      .maybeSingle()
    mechanicName = mechanicData?.name || null
    mechanicUserId = mechanicData?.user_id || null
  }

  // Fetch customer name
  let customerName: string | null = null
  if (session.customer_user_id) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', session.customer_user_id)
      .maybeSingle()

    if (profile?.full_name) {
      customerName = profile.full_name
    } else if (user?.user_metadata?.name) {
      customerName = user.user_metadata.name
    } else if (user?.email) {
      customerName = user.email.split('@')[0] || null
    }
  }

  // Generate LiveKit token with correct role metadata (server-side)
  const roomName = `session-${sessionId}`
  const identity = userRole === 'mechanic' ? `mechanic-${currentUserId}` : `customer-${currentUserId}`

  // P0-1 FIX: Remove metadata from JWT - store session mapping server-side instead
  const { token, serverUrl } = await generateLiveKitToken({
    room: roomName,
    identity: identity,
  })

  // P0-1 FIX: Store room mapping server-side for security
  await supabaseAdmin.from('livekit_rooms').upsert(
    {
      room_name: roomName,
      session_id: sessionId,
      user_id: currentUserId,
      role: userRole,
      identity: identity,
      created_at: new Date().toISOString(),
    },
    {
      onConflict: 'room_name,user_id',
    }
  )

  // Determine correct dashboard URL based on actual user role
  const dashboardUrl = userRole === 'customer' ? '/customer/dashboard' : '/mechanic/dashboard'

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
      mechanicId={mechanicUserId}
      customerId={session.customer_user_id}
      mechanicName={mechanicName}
      customerName={customerName}
      dashboardUrl={dashboardUrl}
    />
  )
}
