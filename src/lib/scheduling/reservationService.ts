/**
 * RESERVATION SERVICE
 *
 * Manages time slot reservations to prevent double-booking.
 *
 * Flow:
 * 1. Customer selects time slot in calendar
 * 2. Reserve slot (15-minute hold) during checkout
 * 3. If payment succeeds → Confirm reservation
 * 4. If payment fails or timeout → Auto-expire reservation
 *
 * This ensures that once a customer starts checkout, the slot
 * is held exclusively for them (prevents race conditions).
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export interface CreateReservationParams {
  mechanicId: string
  startTime: Date
  endTime: Date
  sessionType?: string
}

export interface Reservation {
  id: string
  mechanicId: string
  startTime: Date
  endTime: Date
  status: 'reserved' | 'confirmed' | 'expired' | 'cancelled'
  expiresAt: Date | null
  sessionId: string | null
  createdAt: Date
}

export class ReservationService {
  /**
   * Reserve a time slot (15-minute hold during checkout)
   *
   * @throws Error if slot is already booked or mechanic unavailable
   */
  async createReservation(params: CreateReservationParams): Promise<Reservation> {
    const { mechanicId, startTime, endTime, sessionType } = params

    console.log('[ReservationService] Creating reservation:', {
      mechanicId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      sessionType
    })

    // 1. Final availability check (double-check before reservation)
    const isAvailable = await this.checkSlotAvailability(mechanicId, startTime, endTime)

    if (!isAvailable) {
      throw new Error('Time slot is no longer available')
    }

    // 2. Create reservation with 15-minute expiration
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now

    const { data, error } = await supabaseAdmin
      .from('slot_reservations')
      .insert({
        mechanic_id: mechanicId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'reserved',
        expires_at: expiresAt.toISOString(),
        metadata: {
          session_type: sessionType || 'video',
          created_by: 'customer_checkout'
        }
      })
      .select()
      .single()

    if (error) {
      // Check if it's a conflict error (unique constraint violation)
      if (error.code === '23P01' || error.code === '23505') {
        throw new Error('Time slot was just booked by another customer. Please select another time.')
      }

      console.error('[ReservationService] Failed to create reservation:', error)
      throw new Error(`Failed to reserve time slot: ${error.message}`)
    }

    console.log('[ReservationService] ✓ Reservation created:', data.id, 'expires at', expiresAt.toISOString())

    return {
      id: data.id,
      mechanicId: data.mechanic_id,
      startTime: new Date(data.start_time),
      endTime: new Date(data.end_time),
      status: data.status,
      expiresAt: data.expires_at ? new Date(data.expires_at) : null,
      sessionId: data.session_id,
      createdAt: new Date(data.created_at)
    }
  }

  /**
   * Confirm reservation after successful payment
   *
   * Links reservation to session and removes expiration
   */
  async confirmReservation(reservationId: string, sessionId: string): Promise<void> {
    console.log('[ReservationService] Confirming reservation:', reservationId, 'for session:', sessionId)

    const { error } = await supabaseAdmin
      .from('slot_reservations')
      .update({
        session_id: sessionId,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        expires_at: null // Remove expiration
      })
      .eq('id', reservationId)
      .eq('status', 'reserved') // Only confirm if still in reserved state

    if (error) {
      console.error('[ReservationService] Failed to confirm reservation:', error)
      throw new Error(`Failed to confirm reservation: ${error.message}`)
    }

    console.log('[ReservationService] ✓ Reservation confirmed:', reservationId)
  }

  /**
   * Release (cancel) a reservation
   *
   * Use this when:
   * - Payment fails
   * - Customer cancels checkout
   * - Customer navigates away
   */
  async releaseReservation(reservationId: string): Promise<void> {
    console.log('[ReservationService] Releasing reservation:', reservationId)

    const { error } = await supabaseAdmin
      .from('slot_reservations')
      .update({
        status: 'cancelled'
      })
      .eq('id', reservationId)
      .eq('status', 'reserved') // Only cancel if still reserved

    if (error) {
      console.error('[ReservationService] Failed to release reservation:', error)
      // Don't throw - releasing is best-effort
    }

    console.log('[ReservationService] ✓ Reservation released:', reservationId)
  }

  /**
   * Clean up expired reservations
   *
   * Call this from a cron job every 5 minutes
   */
  async releaseExpiredReservations(): Promise<number> {
    console.log('[ReservationService] Cleaning up expired reservations...')

    const { data, error } = await supabaseAdmin
      .from('slot_reservations')
      .update({
        status: 'expired'
      })
      .eq('status', 'reserved')
      .lt('expires_at', new Date().toISOString())
      .select('id')

    if (error) {
      console.error('[ReservationService] Failed to clean up expired reservations:', error)
      return 0
    }

    const count = data?.length || 0
    console.log(`[ReservationService] ✓ Released ${count} expired reservations`)

    return count
  }

  /**
   * Check if a time slot is available (no conflicting reservations)
   */
  private async checkSlotAvailability(
    mechanicId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    // Use the database function for consistent availability checking
    const { data, error } = await supabaseAdmin.rpc('is_slot_available', {
      p_mechanic_id: mechanicId,
      p_start_time: startTime.toISOString(),
      p_end_time: endTime.toISOString()
    })

    if (error) {
      console.error('[ReservationService] Availability check failed:', error)
      return false
    }

    return data === true
  }

  /**
   * Get reservation by ID
   */
  async getReservation(reservationId: string): Promise<Reservation | null> {
    const { data, error } = await supabaseAdmin
      .from('slot_reservations')
      .select('*')
      .eq('id', reservationId)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      mechanicId: data.mechanic_id,
      startTime: new Date(data.start_time),
      endTime: new Date(data.end_time),
      status: data.status,
      expiresAt: data.expires_at ? new Date(data.expires_at) : null,
      sessionId: data.session_id,
      createdAt: new Date(data.created_at)
    }
  }

  /**
   * Get all active reservations for a mechanic
   */
  async getMechanicReservations(mechanicId: string): Promise<Reservation[]> {
    const { data, error } = await supabaseAdmin
      .from('slot_reservations')
      .select('*')
      .eq('mechanic_id', mechanicId)
      .in('status', ['reserved', 'confirmed'])
      .order('start_time', { ascending: true })

    if (error) {
      console.error('[ReservationService] Failed to get mechanic reservations:', error)
      return []
    }

    return (data || []).map(r => ({
      id: r.id,
      mechanicId: r.mechanic_id,
      startTime: new Date(r.start_time),
      endTime: new Date(r.end_time),
      status: r.status,
      expiresAt: r.expires_at ? new Date(r.expires_at) : null,
      sessionId: r.session_id,
      createdAt: new Date(r.created_at)
    }))
  }
}

// Export singleton instance
export const reservationService = new ReservationService()
