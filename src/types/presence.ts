export type MechanicPresencePayload = {
  user_id: string
  status: 'online' | 'offline'
  last_seen_at?: string
}
