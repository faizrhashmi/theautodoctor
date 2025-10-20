'use client'

import { useState } from 'react'
import type { IntakeStatus } from '@/types/supabase'

const STATUS_OPTIONS: { value: IntakeStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_review', label: 'In Review' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'awaiting_customer', label: 'Awaiting Customer' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'cancelled', label: 'Cancelled' },
]

interface StatusSelectorProps {
  intakeId: string
  currentStatus: IntakeStatus
}

export function StatusSelector({ intakeId, currentStatus }: StatusSelectorProps) {
  const [status, setStatus] = useState<IntakeStatus>(currentStatus)
  const [loading, setLoading] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    if (!STATUS_OPTIONS.some((option) => option.value === newStatus)) {
      return
    }

    const castStatus = newStatus as IntakeStatus

    if (newStatus === status) return
    const previous = status
    setStatus(castStatus)
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/intakes/${intakeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: castStatus }),
      })

      if (!response.ok) {
        console.error('Failed to update status')
        setStatus(previous)
        return
      }
      // Optional: Refresh the page to show updated status everywhere
      window.location.reload()
    } catch (error) {
      console.error('Error updating status:', error)
      setStatus(previous)
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      value={status}
      onChange={(e) => handleStatusChange(e.target.value)}
      disabled={loading}
      className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
