/**
 * AvailabilityService - Mechanic availability checking for scheduled sessions
 *
 * Handles availability logic for all 3 mechanic types:
 * 1. virtual_only - Check mechanic's personal schedule
 * 2. independent_workshop - Check mechanic's schedule
 * 3. workshop_affiliated - Check workshop hours + mechanic schedule
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export interface AvailabilityResult {
  available: boolean
  reason?: string
}

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
  reason?: string
}

class AvailabilityService {
  /**
   * Check if a mechanic is available for a specific time slot
   */
  async isAvailable(
    mechanicId: string,
    startTime: Date,
    endTime: Date,
    sessionType: 'online' | 'in_person'
  ): Promise<AvailabilityResult> {
    try {
      // 1. Enforce minimum 2-hour advance notice
      const now = new Date()
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)
      if (startTime < twoHoursFromNow) {
        return { available: false, reason: 'Please book at least 2 hours in advance' }
      }

      // 2. Get mechanic details
      const { data: mechanic, error: mechanicError } = await supabaseAdmin
        .from('mechanics')
        .select('user_id, mechanic_type, workshop_id')
        .eq('user_id', mechanicId)
        .single()

      if (mechanicError || !mechanic) {
        return { available: false, reason: 'Mechanic not found' }
      }

      // 3. Check mechanic time-off periods (vacation, sick days, etc.)
      const timeOffResult = await this.checkMechanicTimeOff(mechanicId, startTime, endTime)
      if (!timeOffResult.available) {
        return timeOffResult
      }

      // 4. Check for existing session conflicts
      const hasConflict = await this.checkSessionConflicts(mechanicId, startTime, endTime)
      if (hasConflict) {
        return { available: false, reason: 'Mechanic has another session at this time' }
      }

      // 5. Type-specific availability checks
      if (mechanic.mechanic_type === 'virtual_only') {
        return await this.checkVirtualMechanicAvailability(mechanicId, startTime, endTime)
      } else if (mechanic.mechanic_type === 'independent_workshop') {
        return await this.checkIndependentWorkshopAvailability(mechanicId, startTime, endTime)
      } else if (mechanic.mechanic_type === 'workshop_affiliated') {
        return await this.checkWorkshopAffiliatedAvailability(
          mechanicId,
          mechanic.workshop_id,
          startTime,
          endTime
        )
      }

      return { available: true }
    } catch (error) {
      console.error('[AvailabilityService] Error checking availability:', error)
      return { available: false, reason: 'Error checking availability' }
    }
  }

  /**
   * Get all available time slots for a mechanic on a given date
   */
  async getAvailableSlots(
    mechanicId: string,
    date: Date,
    sessionType: 'online' | 'in_person',
    slotDuration: number = 30 // minutes
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = []

    // Generate slots from 9 AM to 8 PM
    const startHour = 9
    const endHour = 20

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const slotStart = new Date(date)
        slotStart.setHours(hour, minute, 0, 0)

        const slotEnd = new Date(slotStart)
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration)

        const result = await this.isAvailable(mechanicId, slotStart, slotEnd, sessionType)

        slots.push({
          start: slotStart,
          end: slotEnd,
          available: result.available,
          reason: result.reason
        })
      }
    }

    return slots
  }

  /**
   * Check mechanic time-off periods (vacation, sick days, personal days)
   */
  private async checkMechanicTimeOff(
    mechanicId: string,
    startTime: Date,
    endTime: Date
  ): Promise<AvailabilityResult> {
    const startDateStr = startTime.toISOString().split('T')[0]
    const endDateStr = endTime.toISOString().split('T')[0]

    const { data: timeOff } = await supabaseAdmin
      .from('mechanic_time_off')
      .select('start_date, end_date, reason')
      .eq('mechanic_id', mechanicId)
      .lte('start_date', endDateStr)
      .gte('end_date', startDateStr)

    if (timeOff && timeOff.length > 0) {
      const reason = timeOff[0].reason || 'Mechanic is unavailable'
      return { available: false, reason }
    }

    return { available: true }
  }

  /**
   * Check for session time conflicts
   */
  private async checkSessionConflicts(
    mechanicId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const { data: conflicts } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('mechanic_user_id', mechanicId)
      .in('status', ['scheduled', 'pending', 'live'])
      .gte('scheduled_start', startTime.toISOString())
      .lte('scheduled_end', endTime.toISOString())

    return (conflicts && conflicts.length > 0) || false
  }

  /**
   * Check virtual-only mechanic availability
   * Only checks mechanic's personal schedule
   */
  private async checkVirtualMechanicAvailability(
    mechanicId: string,
    startTime: Date,
    endTime: Date
  ): Promise<AvailabilityResult> {
    // Check mechanic_availability table
    const dayOfWeek = startTime.getDay() // 0 = Sunday, 1 = Monday, etc.
    const timeString = startTime.toTimeString().slice(0, 5) // "HH:MM"

    const { data: availability } = await supabaseAdmin
      .from('mechanic_availability')
      .select('*')
      .eq('mechanic_user_id', mechanicId)
      .eq('day_of_week', dayOfWeek)
      .lte('start_time', timeString)
      .gte('end_time', timeString)

    if (!availability || availability.length === 0) {
      return { available: false, reason: 'Mechanic not available at this time' }
    }

    return { available: true }
  }

  /**
   * Check independent workshop mechanic availability
   * Checks mechanic's personal schedule only
   */
  private async checkIndependentWorkshopAvailability(
    mechanicId: string,
    startTime: Date,
    endTime: Date
  ): Promise<AvailabilityResult> {
    // Same as virtual mechanic - check personal schedule
    return await this.checkVirtualMechanicAvailability(mechanicId, startTime, endTime)
  }

  /**
   * Check workshop-affiliated mechanic availability
   * Checks BOTH workshop hours AND mechanic schedule
   */
  private async checkWorkshopAffiliatedAvailability(
    mechanicId: string,
    workshopId: string | null,
    startTime: Date,
    endTime: Date
  ): Promise<AvailabilityResult> {
    // 1. Check workshop availability first (using correct table: workshop_availability)
    if (workshopId) {
      const dayOfWeek = startTime.getDay() // 0 = Sunday, 1 = Monday, etc.
      const startTimeStr = startTime.toTimeString().slice(0, 5) // "HH:MM"
      const endTimeStr = endTime.toTimeString().slice(0, 5)

      const { data: workshopHours, error: hoursError } = await supabaseAdmin
        .from('workshop_availability')
        .select('*')
        .eq('workshop_id', workshopId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_closed', false)
        .single()

      if (hoursError || !workshopHours) {
        return { available: false, reason: 'Workshop closed on this day' }
      }

      // Check if time is within workshop operating hours
      if (startTimeStr < workshopHours.open_time || endTimeStr > workshopHours.close_time) {
        return { available: false, reason: 'Outside workshop operating hours' }
      }

      // Check if time overlaps with break time
      if (workshopHours.break_start && workshopHours.break_end) {
        // Session starts during break or overlaps with break
        const sessionOverlapsBreak = (
          (startTimeStr >= workshopHours.break_start && startTimeStr < workshopHours.break_end) ||
          (endTimeStr > workshopHours.break_start && endTimeStr <= workshopHours.break_end) ||
          (startTimeStr <= workshopHours.break_start && endTimeStr >= workshopHours.break_end)
        )

        if (sessionOverlapsBreak) {
          return { available: false, reason: 'Workshop break time' }
        }
      }
    }

    // 2. Check mechanic's personal schedule
    return await this.checkVirtualMechanicAvailability(mechanicId, startTime, endTime)
  }
}

export const availabilityService = new AvailabilityService()
