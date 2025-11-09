import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { PRICING, type PlanKey } from '@/config/pricing'
import ChatRoom from './ChatRoomV3'
import type { Json } from '@/types/supabase'

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

export default async function ChatSessionPage({ params }: PageProps) {
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
    redirect(`/signup?redirect=/chat/${sessionId}`)
  }

  // Fetch session FIRST to determine the correct role
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, plan, type, status, metadata, created_at, started_at, mechanic_id, customer_user_id')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError) {
    throw new Error(sessionError.message)
  }

  if (!session || session.type !== 'chat') {
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
  console.log('[CHAT PAGE SECURITY]', {
    sessionId,
    hasUserAuth: !!user,
    hasMechanicAuth: !!mechanic,
    sessionCustomerId: session.customer_user_id,
    sessionMechanicId: session.mechanic_id,
    isMechanicForThisSession,
    isCustomerForThisSession,
  })

  // IMPORTANT: For chat room, prioritize mechanic auth when both cookies exist
  // This ensures mechanics see the correct role in chat
  // The "Return to Dashboard" button uses the isMechanic variable which will be correct
  if (isMechanicForThisSession && mechanic) {
    // They are the assigned mechanic
    currentUserId = mechanic.user_id  // Use user_id (auth ID) not mechanic.id (profile ID)
    userRole = 'mechanic'
    console.log('[CHAT PAGE SECURITY] Role assigned: MECHANIC', { currentUserId })
  } else if (isCustomerForThisSession && user) {
    // They are the customer who created this session
    currentUserId = user.id
    userRole = 'customer'
    console.log('[CHAT PAGE SECURITY] Role assigned: CUSTOMER', { currentUserId })
  } else {
    // Neither the assigned mechanic nor the customer - access denied
    console.log('[CHAT PAGE SECURITY] ACCESS DENIED - Not assigned to this session')
    notFound()
  }

  // 🔒 SECURITY FIX: Prevent access to completed/cancelled sessions
  // This blocks browser back button, direct URL access, and bookmarks
  if (session.status === 'completed' || session.status === 'cancelled') {
    const dashboardUrl = userRole === 'customer' ? '/customer/dashboard' : '/mechanic/dashboard'
    console.log(`[CHAT PAGE SECURITY] Session ${sessionId} is ${session.status} - redirecting to dashboard`)
    redirect(dashboardUrl)
  }

  // Use supabaseAdmin for participants and messages after authorization check
  // This ensures both mechanics and customers can read messages regardless of RLS policies
  const { error: participantsError } = await supabaseAdmin
    .from('session_participants')
    .select('user_id, role')
    .eq('session_id', sessionId)

  if (participantsError) {
    throw new Error(participantsError.message)
  }

  // CRITICAL FIX: Use supabaseAdmin to fetch messages for both mechanics and customers
  // This prevents RLS issues that can block mechanics from seeing chat history
  const { data: messages, error: messagesError } = await supabaseAdmin
    .from('chat_messages')
    .select('id, content, sender_id, created_at, attachments, read_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (messagesError) {
    throw new Error(messagesError.message)
  }

  // ✅ DYNAMIC PRICING: Fetch plan name from database first, fallback to hardcoded
  const planSlug = session.plan ?? 'free'
  const { data: planData } = await supabaseAdmin
    .from('service_plans')
    .select('name, plan_type')
    .eq('slug', planSlug)
    .eq('is_active', true)
    .maybeSingle()

  const planKey = (session.plan as PlanKey) ?? 'chat10'
  const planName = planData?.name ?? PRICING[planKey]?.name ?? 'Quick Chat'
  const isFreeSession = session.plan === 'free' || session.plan === 'trial' || session.plan === 'trial-free'

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

  // Determine correct dashboard URL based on their role in this session
  // Use userRole determined above (mechanic vs customer) for correct redirect
  const dashboardUrl = userRole === 'mechanic' ? '/mechanic/dashboard' : '/customer/dashboard'

  return (
    <ChatRoom
      sessionId={sessionId}
      userId={currentUserId!}
      userRole={userRole}
      planName={planName}
      plan={session.plan ?? 'free'}
      isFreeSession={isFreeSession}
      status={session.status ?? 'pending'}
      startedAt={session.started_at || session.created_at}
      initialMessages={(messages ?? []).map(mapMessage)}
      mechanicName={mechanicName}
      customerName={customerName}
      mechanicId={mechanicUserId}
      customerId={session.customer_user_id}
      dashboardUrl={dashboardUrl}
    />
  )
}

function mapMessage(message: {
  id: string
  content: string
  sender_id: string
  created_at: string
  attachments: Json
  read_at: string | null
}) {
  return {
    id: message.id,
    content: message.content,
    sender_id: message.sender_id,
    created_at: message.created_at,
    attachments: normalizeAttachments(message.attachments),
    read_at: message.read_at,
  }
}

function normalizeAttachments(value: Json) {
  if (!Array.isArray(value)) {
    return undefined
  }

  const attachments: Array<{ name: string; url: string; size: number; type: string }> = []

  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue
    }

    const record = entry as Record<string, Json>
    const name = typeof record.name === 'string' ? record.name : 'file'
    const url = typeof record.url === 'string' ? record.url : ''
    if (!url) continue

    let size = 0
    if (typeof record.size === 'number') {
      size = record.size
    } else if (typeof record.size === 'string') {
      const parsed = Number(record.size)
      size = Number.isFinite(parsed) ? parsed : 0
    }

    const type =
      typeof record.type === 'string' && record.type
        ? record.type
        : 'application/octet-stream'

    attachments.push({ name, url, size, type })
  }

  return attachments.length ? attachments : undefined
}
