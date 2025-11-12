'use client'

/**
 * CalendarStep - Step 5 of SchedulingPage
 * Wraps ModernSchedulingCalendar with availability integration
 */

import { useState } from 'react'
import ModernSchedulingCalendar from '@/components/customer/ModernSchedulingCalendar'

interface CalendarStepProps {
  wizardData: {
    mechanicId: string
    sessionType: 'online' | 'in_person'
    scheduledFor: Date | null
    planType?: string
  }
  onComplete: (data: { scheduledFor: Date }) => void
  onBack?: () => void
}

export default function CalendarStep({ wizardData, onComplete, onBack }: CalendarStepProps) {
  const handleTimeSelect = (date: Date) => {
    console.log('[CalendarStep] Time selected:', date)
    onComplete({ scheduledFor: date })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Choose Date & Time
        </h2>
        <p className="text-sm sm:text-base text-slate-400">
          Select a convenient time for your scheduled session
        </p>
      </div>

      {/* Calendar */}
      <ModernSchedulingCalendar
        initialEvents={[]}
        plan={(wizardData.planType as any) || 'video15'}
        activeSession={null}
        mechanicId={wizardData.mechanicId}
        serviceType={wizardData.sessionType}
        onTimeSelect={handleTimeSelect}
      />

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">📅 Scheduling Tips</h3>
        <ul className="text-xs sm:text-sm text-blue-200 space-y-1">
          <li>• All times are shown in your local timezone</li>
          <li>• Grayed out slots are unavailable</li>
          <li>• We'll send you reminders 24h, 1h, and 15min before your session</li>
        </ul>
      </div>
    </div>
  )
}
