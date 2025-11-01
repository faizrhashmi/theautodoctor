/**
 * Strict session status enum
 * ⚠️ DO NOT add `| string` - this defeats type safety!
 * Use the type guard functions below for runtime validation
 */
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

// ✅ P0 FIX: Strict typing without | string union
export type SessionRequest = {
  id: string
  customerId: string
  customerName: string
  customerEmail?: string
  sessionType: string
  planCode: string
  status: SessionStatus  // ✅ STRICT - Only valid SessionStatus values
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

// ============================================================================
// Type Guards and Validation Functions
// ✅ P0 FIX: Safe runtime validation for SessionStatus
// ============================================================================

/**
 * All valid session status values
 * Used by type guard for runtime validation
 */
const VALID_SESSION_STATUSES: readonly SessionStatus[] = [
  'pending',
  'waiting',
  'live',
  'reconnecting',
  'accepted',
  'scheduled',
  'completed',
  'cancelled',
  'expired',
  'refunded',
  'archived',
  'unattended'
] as const

/**
 * Type guard to validate if a string is a valid SessionStatus
 * Use this when receiving data from API or external sources
 *
 * @param status - String to validate
 * @returns Type predicate indicating if status is valid SessionStatus
 *
 * @example
 * const apiStatus = 'completed'
 * if (isValidSessionStatus(apiStatus)) {
 *   // TypeScript now knows apiStatus is SessionStatus
 *   const status: SessionStatus = apiStatus
 * }
 */
export function isValidSessionStatus(status: string): status is SessionStatus {
  return VALID_SESSION_STATUSES.includes(status as SessionStatus)
}

/**
 * Safely parse a status string with fallback
 * Returns the status if valid, otherwise returns the fallback
 *
 * @param status - String to parse
 * @param fallback - Fallback status if invalid (default: 'pending')
 * @returns Valid SessionStatus
 *
 * @example
 * const dbStatus = 'unknown_status'
 * const safeStatus = parseSessionStatus(dbStatus, 'pending')
 * // Returns 'pending' since 'unknown_status' is invalid
 */
export function parseSessionStatus(
  status: string | null | undefined,
  fallback: SessionStatus = 'pending'
): SessionStatus {
  if (!status) return fallback
  return isValidSessionStatus(status) ? status : fallback
}

/**
 * Assert that a status is valid, throwing an error if not
 * Use this when you expect the status to ALWAYS be valid
 *
 * @param status - String to validate
 * @param context - Context for error message (e.g., 'API response', 'Database query')
 * @throws Error if status is invalid
 *
 * @example
 * const apiStatus = response.status
 * assertValidSessionStatus(apiStatus, 'API response')
 * // Now TypeScript knows apiStatus is SessionStatus
 */
export function assertValidSessionStatus(
  status: string,
  context: string = 'unknown'
): asserts status is SessionStatus {
  if (!isValidSessionStatus(status)) {
    throw new Error(
      `Invalid session status "${status}" in ${context}. ` +
      `Valid statuses: ${VALID_SESSION_STATUSES.join(', ')}`
    )
  }
}
