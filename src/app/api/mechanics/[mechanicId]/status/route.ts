/**
 * GET /api/mechanics/[mechanicId]/status
 *
 * Returns real-time availability status for a specific mechanic
 * Used by Favorites Priority Flow to check if favorite mechanic is online
 *
 * Feature Flag: ENABLE_FAVORITES_PRIORITY
 *
 * Phase 1: Availability Status API (Read-Only)
 * - Wraps existing presence mechanism (same as MechanicPresenceIndicator)
 * - Falls back to mechanics.is_online field
 * - Returns { is_online: boolean, last_seen?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { MechanicPresencePayload } from '@/types/presence'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { mechanicId: string } }
) {
  // ============================================================================
  // FEATURE FLAG CHECK
  // ============================================================================
  if (process.env.ENABLE_FAVORITES_PRIORITY !== 'true') {
    return NextResponse.json(
      { error: 'Feature not enabled' },
      { status: 404 }
    )
  }

  const { mechanicId } = params

  // Validate mechanicId format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!mechanicId || !uuidRegex.test(mechanicId)) {
    return NextResponse.json(
      { error: 'Invalid mechanic ID format' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()

    // =========================================================================
    // STEP 1: Check Realtime Presence (Primary Source)
    // =========================================================================
    // This uses the SAME mechanism as MechanicPresenceIndicator
    // Channel: 'online_mechanics' (existing production channel)

    let isOnlineFromPresence = false
    let presenceCheckSuccessful = false

    try {
      // Create a temporary channel to check presence state
      // Using a unique key to avoid conflicts
      const presenceChannel = supabase.channel(`mechanic_status_check_${Date.now()}`, {
        config: { presence: { key: `checker-${Math.random().toString(36).slice(2)}` } }
      })

      // Subscribe to the online_mechanics presence channel
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Presence subscription timeout'))
        }, 3000) // 3 second timeout

        presenceChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout)
            resolve()
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            clearTimeout(timeout)
            reject(new Error(`Presence subscription failed: ${status}`))
          }
        })
      })

      // Query presence state for this specific mechanic
      const presence = presenceChannel.presenceState<MechanicPresencePayload>()

      Object.values(presence).forEach((entries) => {
        entries?.forEach((entry) => {
          if (entry?.user_id === mechanicId && entry.status === 'online') {
            isOnlineFromPresence = true
          }
        })
      })

      presenceCheckSuccessful = true

      // Clean up channel
      await presenceChannel.unsubscribe()
      supabase.removeChannel(presenceChannel)

    } catch (presenceError) {
      console.warn(`[MechanicStatus] Presence check failed for ${mechanicId}:`, presenceError)
      // Continue to fallback - not a critical error
    }

    // =========================================================================
    // STEP 2: Fallback to Database (Secondary Source)
    // =========================================================================
    // Query mechanics.is_online field as fallback
    // This is the same field used by mechanicMatching.ts (line 109)

    const { data: mechanic, error: mechanicError } = await supabase
      .from('mechanics')
      .select('is_online, updated_at, status')
      .eq('id', mechanicId)
      .maybeSingle()

    if (mechanicError) {
      console.error(`[MechanicStatus] Database query error for ${mechanicId}:`, mechanicError)
      return NextResponse.json(
        { error: 'Failed to fetch mechanic status' },
        { status: 500 }
      )
    }

    // Mechanic not found
    if (!mechanic) {
      return NextResponse.json(
        {
          is_online: false,
          error: 'Mechanic not found'
        },
        { status: 404 }
      )
    }

    // Check if mechanic account is approved
    if (mechanic.status !== 'approved') {
      return NextResponse.json(
        {
          is_online: false,
          reason: 'Mechanic account not approved'
        },
        { status: 200 }
      )
    }

    // =========================================================================
    // STEP 3: Determine Final Status
    // =========================================================================
    // Presence (real-time) takes precedence over database field

    const isOnline = presenceCheckSuccessful
      ? isOnlineFromPresence  // Use real-time presence if check succeeded
      : (mechanic.is_online || false)  // Fall back to database field

    // Calculate last_seen (approximate)
    let lastSeen: string | null = null
    if (!isOnline && mechanic.updated_at) {
      lastSeen = mechanic.updated_at
    }

    // =========================================================================
    // RESPONSE
    // =========================================================================

    return NextResponse.json({
      is_online: isOnline,
      last_seen: lastSeen,
      checked_via: presenceCheckSuccessful ? 'realtime_presence' : 'database_fallback'
    })

  } catch (error) {
    console.error(`[MechanicStatus] Unexpected error for ${mechanicId}:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
