export interface MechanicPresencePayload {
  user_id: string
  status: 'online' | 'offline'
  name?: string
}
