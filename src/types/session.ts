export type SessionStatus =
  | 'pending'
  | 'waiting'
  | 'live'
  | 'reconnecting'
  | 'accepted'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'archived'
  | 'unattended'
export type SessionFile = {
  id: string
  fileName: string
  fileSize: number
  uploadedAt: string
  uploadedBy: string
  storagePath?: string | null
  url?: string | null
  description?: string | null
}

export type SessionExtensionRequest = {
  id: string
  minutes: number
  status: 'pending' | 'approved' | 'declined'
  requestedAt: string
}

export type SessionRequest = {
  id: string
  customerId: string
  customerName: string
  customerEmail?: string
  sessionType: string
  planCode: string
  status: SessionStatus | string
  description?: string | null
  createdAt: string
  acceptedAt?: string
  mechanicId?: string
  intakeId?: string | null
  sessionId?: string | null
}

export type SessionSummary = {
  id: string
  plan?: string | null
  type?: string
  status?: SessionStatus
  intakeId?: string | null
  customerUserId?: string | null
  mechanicId?: string | null
  customerName?: string | null
  mechanicName?: string | null
  vehicle?: string | null
  concernSummary?: string | null
  waiverAccepted?: boolean | null
  extensionBalance?: number | null
  scheduledStart?: string | null
  scheduledEnd?: string | null
  startedAt?: string | null
  endedAt?: string | null
  durationMinutes?: number | null
  sessionNotes?: string | null
  summaryData?: any
  files?: SessionFile[]
  metadata?: any
}

export type SessionQueueItem = {
  id: string
  sessionId?: string | null
  customerName?: string | null
  plan?: string | null
  sessionType?: string | null
  status?: SessionStatus
  vehicle?: string | null
  scheduledStart?: string | null
  scheduledEnd?: string | null
  concernSummary?: string | null
  waitingSince?: string | null
  queuePosition?: number | null
}

export type MechanicAvailabilityBlock = {
  id: string
  weekday: number
  startTime: string
  endTime: string
  isActive: boolean
}
