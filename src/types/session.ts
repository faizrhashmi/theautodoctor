export type SessionStatus =
  | 'waiting'
  | 'live'
  | 'reconnecting'
  | 'completed'
  | 'cancelled'

export type SessionFile = {
  id: string
  fileName: string
  fileSize: number
  uploadedAt: string
  uploadedBy: string
  url?: string | null
}

export type SessionExtensionRequest = {
  id: string
  minutes: number
  status: 'pending' | 'approved' | 'declined'
  requestedAt: string
}
