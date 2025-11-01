import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Session Repository - Abstracts session data access with table-choice flexibility
 *
 * Feature Flag: AAD_USE_DIAGNOSTIC_SESSIONS_FOR_CLOCK
 * - false (default): Use `sessions` table
 * - true: Use `diagnostic_sessions` table (legacy fallback)
 *
 * Phase 1B: Batch 2 Mechanic Surface Remediation
 * - Addresses P0-2: Wrong table queries in clock route
 * - Allows empirical testing without schema changes
 */

const useDiagnosticSessions = process.env.AAD_USE_DIAGNOSTIC_SESSIONS_FOR_CLOCK === 'true'

// Types
export interface SessionData {
  id: string
  mechanic_id: string | null
  customer_id: string
  status: string
  created_at: string
  completed_at: string | null
  duration_minutes?: number | null
  session_duration_type?: string | null
}

export interface SessionStats {
  microSessions: Array<{ id: string; duration_minutes: number | null }>
  fullSessions: Array<{ id: string }>
  microMinutes: number
  tableUsed: 'sessions' | 'diagnostic_sessions'
}

export interface ClockStatus {
  id: string
  currently_on_shift: boolean
  last_clock_in: string | null
  last_clock_out: string | null
}

/**
 * Get session by ID
 * @param sessionId - UUID of session
 * @returns Session data or null if not found
 */
export async function getSessionById(sessionId: string): Promise<SessionData | null> {
  const tableName = useDiagnosticSessions ? 'diagnostic_sessions' : 'sessions'

  const { data, error } = await supabaseAdmin
    .from(tableName)
    .select('id, mechanic_id, customer_id, status, created_at, completed_at, duration_minutes, session_duration_type')
    .eq('id', sessionId)
    .single()

  if (error) {
    console.error(`[SESSION REPO] getSessionById error (table=${tableName}):`, error)
    return null
  }

  return data
}

/**
 * Get clock status for mechanic
 * NOTE: Clock status is stored in mechanics table, not sessions table
 * @param mechanicId - UUID of mechanic
 * @returns Clock status data or null if not found
 */
export async function getClockStatusForMechanic(mechanicId: string): Promise<ClockStatus | null> {
  const { data, error } = await supabaseAdmin
    .from('mechanics')
    .select('id, currently_on_shift, last_clock_in, last_clock_out')
    .eq('id', mechanicId)
    .single()

  if (error) {
    console.error('[SESSION REPO] getClockStatusForMechanic error:', error)
    return null
  }

  return data
}

/**
 * Get session stats during a shift period
 * Used for clock-out to calculate sessions completed during shift
 *
 * @param mechanicId - UUID of mechanic
 * @param shiftStartTime - ISO timestamp of shift start
 * @param shiftEndTime - ISO timestamp of shift end
 * @returns Session statistics with table metadata
 */
export async function getSessionStatsForShift(
  mechanicId: string,
  shiftStartTime: string,
  shiftEndTime: string
): Promise<SessionStats> {
  const tableName = useDiagnosticSessions ? 'diagnostic_sessions' : 'sessions'

  // Query micro sessions
  const { data: microSessions, error: microError } = await supabaseAdmin
    .from(tableName)
    .select('id, duration_minutes')
    .eq('mechanic_id', mechanicId)
    .eq('session_duration_type', 'micro')
    .gte('created_at', shiftStartTime)
    .lte('created_at', shiftEndTime)

  if (microError) {
    console.error(`[SESSION REPO] getSessionStatsForShift micro error (table=${tableName}):`, microError)
  }

  // Query full sessions
  const { data: fullSessions, error: fullError } = await supabaseAdmin
    .from(tableName)
    .select('id')
    .eq('mechanic_id', mechanicId)
    .in('session_duration_type', ['standard', 'extended'])
    .gte('created_at', shiftStartTime)
    .lte('created_at', shiftEndTime)

  if (fullError) {
    console.error(`[SESSION REPO] getSessionStatsForShift full error (table=${tableName}):`, fullError)
  }

  const microMinutes = (microSessions || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0)

  return {
    microSessions: microSessions || [],
    fullSessions: fullSessions || [],
    microMinutes,
    tableUsed: tableName
  }
}

/**
 * Get the current feature flag value for debugging
 * @returns Object with flag value and table name
 */
export function getSessionRepoConfig() {
  return {
    useDiagnosticSessions,
    tableName: useDiagnosticSessions ? 'diagnostic_sessions' : 'sessions',
    flagName: 'AAD_USE_DIAGNOSTIC_SESSIONS_FOR_CLOCK',
    flagValue: process.env.AAD_USE_DIAGNOSTIC_SESSIONS_FOR_CLOCK
  }
}
