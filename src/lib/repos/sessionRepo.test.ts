/**
 * Session Repository Tests
 * Phase 1B: Batch 2 Mechanic Surface Remediation
 *
 * Tests table-choice matrix with feature flag AAD_USE_DIAGNOSTIC_SESSIONS_FOR_CLOCK
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'

// Mock environment variable
const setEnvFlag = (value: string | undefined) => {
  process.env.AAD_USE_DIAGNOSTIC_SESSIONS_FOR_CLOCK = value
}

// Mock supabaseAdmin
const mockSupabaseAdmin = {
  from: vi.fn()
}

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: mockSupabaseAdmin
}))

// Need to import after mocking
let getSessionById: any
let getClockStatusForMechanic: any
let getSessionStatsForShift: any
let getSessionRepoConfig: any

describe('Session Repository - Feature Flag Matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear module cache to re-evaluate env var
    vi.resetModules()
  })

  describe('getSessionRepoConfig', () => {
    test('Default (no env var) - uses sessions table', async () => {
      delete process.env.AAD_USE_DIAGNOSTIC_SESSIONS_FOR_CLOCK
      const { getSessionRepoConfig } = await import('./sessionRepo')

      const config = getSessionRepoConfig()

      expect(config.useDiagnosticSessions).toBe(false)
      expect(config.tableName).toBe('sessions')
      expect(config.flagName).toBe('AAD_USE_DIAGNOSTIC_SESSIONS_FOR_CLOCK')
    })

    test('Flag=false - uses sessions table', async () => {
      setEnvFlag('false')
      const { getSessionRepoConfig } = await import('./sessionRepo')

      const config = getSessionRepoConfig()

      expect(config.useDiagnosticSessions).toBe(false)
      expect(config.tableName).toBe('sessions')
    })

    test('Flag=true - uses diagnostic_sessions table', async () => {
      setEnvFlag('true')
      const { getSessionRepoConfig } = await import('./sessionRepo')

      const config = getSessionRepoConfig()

      expect(config.useDiagnosticSessions).toBe(true)
      expect(config.tableName).toBe('diagnostic_sessions')
    })
  })

  describe('getSessionById - Table Choice Matrix', () => {
    test('Flag=false - queries sessions table', async () => {
      setEnvFlag('false')

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'session-1', mechanic_id: 'mech-1' },
        error: null
      })

      mockSupabaseAdmin.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      })

      const { getSessionById } = await import('./sessionRepo')
      await getSessionById('session-1')

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('sessions')
      expect(mockSelect).toHaveBeenCalled()
    })

    test('Flag=true - queries diagnostic_sessions table', async () => {
      setEnvFlag('true')

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'session-1', mechanic_id: 'mech-1' },
        error: null
      })

      mockSupabaseAdmin.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      })

      const { getSessionById } = await import('./sessionRepo')
      await getSessionById('session-1')

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('diagnostic_sessions')
      expect(mockSelect).toHaveBeenCalled()
    })

    test('Returns null on error', async () => {
      setEnvFlag('false')

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      })

      mockSupabaseAdmin.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      })

      const { getSessionById } = await import('./sessionRepo')
      const result = await getSessionById('invalid-id')

      expect(result).toBeNull()
    })
  })

  describe('getClockStatusForMechanic', () => {
    test('Always queries mechanics table (no table choice)', async () => {
      setEnvFlag('false')

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'mech-1', currently_on_shift: true },
        error: null
      })

      mockSupabaseAdmin.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      })

      const { getClockStatusForMechanic } = await import('./sessionRepo')
      await getClockStatusForMechanic('mech-1')

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('mechanics')
      expect(mockSelect).toHaveBeenCalled()
    })

    test('Returns null on error', async () => {
      setEnvFlag('false')

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Mechanic not found' }
      })

      mockSupabaseAdmin.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      })

      const { getClockStatusForMechanic } = await import('./sessionRepo')
      const result = await getClockStatusForMechanic('invalid-id')

      expect(result).toBeNull()
    })
  })

  describe('getSessionStatsForShift - Table Choice Matrix', () => {
    const mockShiftStart = '2025-01-01T08:00:00Z'
    const mockShiftEnd = '2025-01-01T17:00:00Z'

    test('Flag=false - queries sessions table for stats', async () => {
      setEnvFlag('false')

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockGte = vi.fn().mockReturnThis()
      const mockLte = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockResolvedValue({
        data: [{ id: 'session-full-1' }],
        error: null
      })

      // First call (micro sessions)
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: mockSelect.mockReturnValueOnce({
          eq: mockEq.mockReturnValueOnce({
            eq: mockEq.mockReturnValueOnce({
              gte: mockGte.mockReturnValueOnce({
                lte: mockLte.mockResolvedValueOnce({
                  data: [{ id: 'session-micro-1', duration_minutes: 15 }],
                  error: null
                })
              })
            })
          })
        })
      })

      // Second call (full sessions)
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: mockSelect.mockReturnValueOnce({
          eq: mockEq.mockReturnValueOnce({
            in: mockIn
          })
        })
      })

      const { getSessionStatsForShift } = await import('./sessionRepo')
      const result = await getSessionStatsForShift('mech-1', mockShiftStart, mockShiftEnd)

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('sessions')
      expect(result.tableUsed).toBe('sessions')
      expect(result.microSessions).toHaveLength(1)
      expect(result.microMinutes).toBe(15)
    })

    test('Flag=true - queries diagnostic_sessions table for stats', async () => {
      setEnvFlag('true')

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockGte = vi.fn().mockReturnThis()
      const mockLte = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockResolvedValue({
        data: [{ id: 'diag-full-1' }],
        error: null
      })

      // First call (micro sessions)
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: mockSelect.mockReturnValueOnce({
          eq: mockEq.mockReturnValueOnce({
            eq: mockEq.mockReturnValueOnce({
              gte: mockGte.mockReturnValueOnce({
                lte: mockLte.mockResolvedValueOnce({
                  data: [
                    { id: 'diag-micro-1', duration_minutes: 10 },
                    { id: 'diag-micro-2', duration_minutes: 20 }
                  ],
                  error: null
                })
              })
            })
          })
        })
      })

      // Second call (full sessions)
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: mockSelect.mockReturnValueOnce({
          eq: mockEq.mockReturnValueOnce({
            in: mockIn
          })
        })
      })

      const { getSessionStatsForShift } = await import('./sessionRepo')
      const result = await getSessionStatsForShift('mech-1', mockShiftStart, mockShiftEnd)

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('diagnostic_sessions')
      expect(result.tableUsed).toBe('diagnostic_sessions')
      expect(result.microSessions).toHaveLength(2)
      expect(result.microMinutes).toBe(30)
    })

    test('Handles query errors gracefully', async () => {
      setEnvFlag('false')

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockGte = vi.fn().mockReturnThis()
      const mockLte = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Query failed' }
      })

      // First call (micro sessions) - error
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: mockSelect.mockReturnValueOnce({
          eq: mockEq.mockReturnValueOnce({
            eq: mockEq.mockReturnValueOnce({
              gte: mockGte.mockReturnValueOnce({
                lte: mockLte.mockResolvedValueOnce({
                  data: null,
                  error: { message: 'Micro query failed' }
                })
              })
            })
          })
        })
      })

      // Second call (full sessions) - error
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: mockSelect.mockReturnValueOnce({
          eq: mockEq.mockReturnValueOnce({
            in: mockIn
          })
        })
      })

      const { getSessionStatsForShift } = await import('./sessionRepo')
      const result = await getSessionStatsForShift('mech-1', mockShiftStart, mockShiftEnd)

      // Should return empty arrays on error
      expect(result.microSessions).toEqual([])
      expect(result.fullSessions).toEqual([])
      expect(result.microMinutes).toBe(0)
      expect(result.tableUsed).toBe('sessions')
    })

    test('Calculates microMinutes correctly with null values', async () => {
      setEnvFlag('false')

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockGte = vi.fn().mockReturnThis()
      const mockLte = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockResolvedValue({
        data: [],
        error: null
      })

      // Micro sessions with null duration
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: mockSelect.mockReturnValueOnce({
          eq: mockEq.mockReturnValueOnce({
            eq: mockEq.mockReturnValueOnce({
              gte: mockGte.mockReturnValueOnce({
                lte: mockLte.mockResolvedValueOnce({
                  data: [
                    { id: 'session-1', duration_minutes: 15 },
                    { id: 'session-2', duration_minutes: null },
                    { id: 'session-3', duration_minutes: 25 }
                  ],
                  error: null
                })
              })
            })
          })
        })
      })

      // Full sessions
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: mockSelect.mockReturnValueOnce({
          eq: mockEq.mockReturnValueOnce({
            in: mockIn
          })
        })
      })

      const { getSessionStatsForShift } = await import('./sessionRepo')
      const result = await getSessionStatsForShift('mech-1', mockShiftStart, mockShiftEnd)

      // Should sum only non-null values
      expect(result.microMinutes).toBe(40) // 15 + 0 + 25
    })
  })
})
