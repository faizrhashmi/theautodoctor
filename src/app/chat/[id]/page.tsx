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

export default async function ChatSessionPage({ params }: PageProps) {
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

  if (isMechanicForThisSession) {
    // They are the assigned mechanic
    currentUserId = mechanic!.id
    userRole = 'mechanic'
    console.log('[CHAT PAGE SECURITY] Role assigned: MECHANIC', { currentUserId })
  } else if (isCustomerForThisSession) {
    // They are the customer who created this session
    currentUserId = user!.id
    userRole = 'customer'
    console.log('[CHAT PAGE SECURITY] Role assigned: CUSTOMER', { currentUserId })
  } else {
    // Neither the assigned mechanic nor the customer - access denied
    console.log('[CHAT PAGE SECURITY] ACCESS DENIED - Not assigned to this session')
    notFound()
  }

  const { data: participants, error: participantsError } = await supabase
    .from('session_participants')
    .select('user_id, role')
    .eq('session_id', sessionId)

  if (participantsError) {
    throw new Error(participantsError.message)
  }

  const { data: messages, error: messagesError } = await supabase
    .from('chat_messages')
    .select('id, content, sender_id, created_at, attachments')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (messagesError) {
    throw new Error(messagesError.message)
  }

  const planKey = (session.plan as PlanKey) ?? 'chat10'
  const planName = PRICING[planKey]?.name ?? 'Quick Chat'
  const isFreeSession = session.plan === 'free' || session.plan === 'trial' || session.plan === 'trial-free'
  const userEmail = user?.email || mechanic?.email || null

  // Fetch mechanic name if assigned
  let mechanicName: string | null = null
  if (session.mechanic_id) {
    const { data: mechanicData } = await supabaseAdmin
      .from('mechanics')
      .select('name')
      .eq('id', session.mechanic_id)
      .maybeSingle()
    mechanicName = mechanicData?.name || null
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

  return (
    <ChatRoom
      sessionId={sessionId}
      userId={currentUserId!}
      userRole={userRole}
      userEmail={userEmail}
      planName={planName}
      plan={session.plan ?? 'free'}
      isFreeSession={isFreeSession}
      status={session.status ?? 'pending'}
      startedAt={session.started_at || session.created_at}
      scheduledStart={session.created_at}
      scheduledEnd={null}
      initialMessages={(messages ?? []).map(mapMessage)}
      initialParticipants={participants ?? []}
      mechanicName={mechanicName}
      customerName={customerName}
      mechanicId={session.mechanic_id || null}
      customerId={session.customer_user_id || null}
    />
  )
}

function mapMessage(message: {
  id: string
  content: string
  sender_id: string
  created_at: string
  attachments: Json
}) {
  return {
    id: message.id,
    content: message.content,
    sender_id: message.sender_id,
    created_at: message.created_at,
    attachments: normalizeAttachments(message.attachments),
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
