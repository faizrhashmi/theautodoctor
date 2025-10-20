export type SessionStatus = 'scheduled' | 'waiting' | 'live' | 'completed' | 'cancelled'

export interface SessionSummary {
  id: string
  vehicle: string
  customerName: string
  mechanicName: string
  scheduledStart: string
  scheduledEnd: string
  status: SessionStatus
  concernSummary: string
  waiverAccepted: boolean
  extensionBalance: number
}

export interface SessionQueueItem extends SessionSummary {
  queuePosition: number
  waitingSince?: string
}

export interface MechanicAvailabilityBlock {
  id: string
  weekday: number
  startTime: string
  endTime: string
  isActive: boolean
}

export interface SessionFile {
  id: string
  fileName: string
  fileSize: number
  uploadedAt: string
  uploadedBy: string
}

export interface SessionExtensionRequest {
  id: string
  minutes: number
  status: 'pending' | 'approved' | 'declined' | 'paid'
  requestedAt: string
}
