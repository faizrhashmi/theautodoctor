import { notFound, redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { PRICING, type PlanKey } from '@/config/pricing'
import ChatRoom from './ChatRoomV2'
import type { Json } from '@/types/supabase'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: { id: string }
}

export default async function ChatSessionPage({ params }: PageProps) {
  const sessionId = params.id
  const supabase = getSupabaseServer()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!user) {
    redirect(`/signup?redirect=/chat/${sessionId}`)
  }

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, plan, type, status, metadata')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError) {
    throw new Error(sessionError.message)
  }

  if (!session || session.type !== 'chat') {
    notFound()
  }

  const { data: participants, error: participantsError } = await supabase
    .from('session_participants')
    .select('user_id, role')
    .eq('session_id', sessionId)

  if (participantsError) {
    throw new Error(participantsError.message)
  }

  if (!participants?.some((participant) => participant.user_id === user.id)) {
    notFound()
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

  return (
    <ChatRoom
      sessionId={sessionId}
      userId={user.id}
      userEmail={user.email ?? null}
      planName={planName}
      status={session.status ?? 'pending'}
      initialMessages={(messages ?? []).map(mapMessage)}
      initialParticipants={participants ?? []}
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
