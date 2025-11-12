/**
 * POST /api/availability/check-slots
 * Get available time slots for a specific mechanic on a specific date
 *
 * Used by: ModernSchedulingCalendar for real-time availability checking
 */

import { NextRequest, NextResponse } from 'next/server'
import { availabilityService } from '@/lib/availabilityService'

export const dynamic = 'force-dynamic'

// Time slots from 9 AM to 8 PM in 30-minute intervals
const generateTimeSlots = () => {
  const slots: { hour: number; minute: number; time: string }[] = []
  for (let hour = 9; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const time = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
      slots.push({ hour, minute, time })
    }
  }
  return slots
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mechanicId, date, serviceType } = body

    // Validate inputs
    if (!mechanicId) {
      return NextResponse.json(
        { error: 'mechanicId is required' },
        { status: 400 }
      )
    }

    if (!date) {
      return NextResponse.json(
        { error: 'date is required (YYYY-MM-DD format)' },
        { status: 400 }
      )
    }

    if (!serviceType || !['online', 'in_person'].includes(serviceType)) {
      return NextResponse.json(
        { error: 'serviceType must be "online" or "in_person"' },
        { status: 400 }
      )
    }

    // Parse date (expected format: YYYY-MM-DD)
    const [year, month, day] = date.split('-').map(Number)
    const targetDate = new Date(year, month - 1, day)

    // Check if date is in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (targetDate < today) {
      return NextResponse.json({
        success: true,
        slots: generateTimeSlots().map(slot => ({
          time: slot.time,
          available: false,
          reason: 'Past date'
        }))
      })
    }

    // Generate time slots and check availability for each
    const timeSlots = generateTimeSlots()
    const availabilityPromises = timeSlots.map(async (slot) => {
      const startTime = new Date(year, month - 1, day, slot.hour, slot.minute, 0)
      const endTime = new Date(startTime.getTime() + 45 * 60000) // 45 minutes session

      // Check if slot is in the past (for today)
      const now = new Date()
      if (startTime < now) {
        return {
          time: slot.time,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          available: false,
          reason: 'Time has passed'
        }
      }

      // Check mechanic availability
      const result = await availabilityService.isAvailable(
        mechanicId,
        startTime,
        endTime,
        serviceType
      )

      return {
        time: slot.time,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        available: result.available,
        reason: result.reason || undefined
      }
    })

    const slots = await Promise.all(availabilityPromises)

    return NextResponse.json({
      success: true,
      date,
      mechanicId,
      serviceType,
      slots
    })

  } catch (error: any) {
    console.error('[availability/check-slots] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
