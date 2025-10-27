import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { PRICING, type PlanKey } from '@/config/pricing'
import { generateLiveKitToken } from '@/lib/livekit'
import VideoSessionClient from './VideoSessionClient'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: { id: string }
  searchParams?: { testRole?: 'mechanic' | 'customer' }
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

export default async function DiagnosticSessionPage({ params, searchParams }: PageProps) {
  const sessionId = params.id
  const testRole = searchParams?.testRole
  const supabase = getSupabaseServer()

  // Enhanced logging for debugging
  const cookieStore = cookies()
  const mechanicCookie = cookieStore.get('aad_mech')?.value

  console.log('[DIAGNOSTIC AUTH CHECK]', {
    sessionId,
    hasMechanicCookie: !!mechanicCookie,
    mechanicCookiePreview: mechanicCookie ? mechanicCookie.substring(0, 10) + '...' : null,
    testRoleOverride: testRole || null,
  })

  // Check for customer auth (Supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check for mechanic auth (custom)
  const mechanic = await getMechanicFromCookie()

  console.log('[DIAGNOSTIC AUTH RESULT]', {
    hasUser: !!user,
    userId: user?.id || null,
    hasMechanic: !!mechanic,
    mechanicId: mechanic?.id || null,
  })

  // TEST MODE: Allow bypassing auth with testRole parameter
  if (testRole && !user && !mechanic) {
    console.log('[DIAGNOSTIC TEST MODE] Using test role:', testRole)
    // Continue without auth for testing purposes
  } else if (!user && !mechanic) {
    // Must be authenticated as either customer or mechanic
    redirect(`/signup?redirect=/diagnostic/${sessionId}`)
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

  if (!session || session.type !== 'diagnostic') {
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

  // Enhanced security logging
  console.log('[DIAGNOSTIC PAGE SECURITY]', {
    sessionId,
    hasUserAuth: !!user,
    hasMechanicAuth: !!mechanic,
    sessionCustomerId: session.customer_user_id,
    sessionMechanicId: session.mechanic_id,
    isMechanicForThisSession,
    isCustomerForThisSession,
    mechanicCookieExists: !!mechanicCookie,
    testRoleActive: !!testRole,
  })

  // TEST MODE: Override role if testRole parameter is present
  if (testRole) {
    if (testRole === 'mechanic' && session.mechanic_id) {
      currentUserId = session.mechanic_id
      userRole = 'mechanic'
      console.log('[DIAGNOSTIC TEST MODE] Role assigned: MECHANIC (TEST)', { currentUserId })
    } else if (testRole === 'customer' && session.customer_user_id) {
      currentUserId = session.customer_user_id
      userRole = 'customer'
      console.log('[DIAGNOSTIC TEST MODE] Role assigned: CUSTOMER (TEST)', { currentUserId })
    } else {
      console.log('[DIAGNOSTIC TEST MODE] Invalid test role or missing session user')
      notFound()
    }
  }
  // IMPORTANT: Prioritize mechanic auth when both cookies exist
  // This ensures mechanics see the correct role
  else if (isMechanicForThisSession && mechanic) {
    // They are the assigned mechanic
    currentUserId = mechanic.id
    userRole = 'mechanic'
    console.log('[DIAGNOSTIC PAGE SECURITY] Role assigned: MECHANIC', { currentUserId })
  } else if (isCustomerForThisSession && user) {
    // They are the customer who created this session
    currentUserId = user.id
    userRole = 'customer'
    console.log('[DIAGNOSTIC PAGE SECURITY] Role assigned: CUSTOMER', { currentUserId })
  } else {
    // Neither the assigned mechanic nor the customer - access denied
    console.log('[DIAGNOSTIC PAGE SECURITY] ACCESS DENIED - Not assigned to this session', {
      userExists: !!user,
      mechanicExists: !!mechanic,
      sessionCustomerId: session.customer_user_id,
      sessionMechanicId: session.mechanic_id,
    })
    notFound()
  }

  const planKey = (session.plan as PlanKey) ?? 'diagnostic'
  const planName = PRICING[planKey]?.name ?? 'Full Diagnostic'

  // Generate LiveKit token with correct role metadata (server-side)
  const roomName = `session-${sessionId}`
  const identity = userRole === 'mechanic' ? `mechanic-${currentUserId}` : `customer-${currentUserId}`

  const { token, serverUrl } = await generateLiveKitToken({
    room: roomName,
    identity: identity,
    metadata: {
      sessionId,
      userId: currentUserId,
      role: userRole,
    },
  })

  // Determine correct dashboard URL based on user existence (not role)
  const dashboardUrl = user ? '/customer/dashboard' : '/mechanic/dashboard'

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
