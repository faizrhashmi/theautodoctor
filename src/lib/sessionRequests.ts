import type { SessionRequest } from '@/types/session'
import type { Database } from '@/types/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type SessionRequestRow = Database['public']['Tables']['session_requests']['Row']

export function toSessionRequest(row: SessionRequestRow): SessionRequest {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name ?? 'Customer',
    customerEmail: row.customer_email ?? undefined,
    sessionType: row.session_type,
    planCode: row.plan_code,
    status: row.status,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at ?? undefined,
    mechanicId: row.mechanic_id ?? undefined,
  }
}

export async function broadcastSessionRequest(
  event: 'new_request' | 'request_accepted' | 'request_cancelled',
  payload: Record<string, unknown>
) {
  try {
    const channel = supabaseAdmin.channel('requests')
    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          resolve()
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          reject(err ?? new Error(`Request channel subscription failed: ${status}`))
        }
      })
    })

    await channel.send({
      type: 'broadcast',
      event,
      payload,
    })

    await channel.unsubscribe()
    supabaseAdmin.removeChannel(channel)
  } catch (error) {
    console.error('Unable to broadcast session request event', error)
  }
}
