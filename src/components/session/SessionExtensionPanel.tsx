'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, DollarSign } from 'lucide-react'
import type { SessionExtensionRequest } from '@/types/session'

interface SessionExtensionPanelProps {
  hourlyRate?: number
  existingRequests?: SessionExtensionRequest[]
  onRequestExtension?: (minutes: number) => void
}

const EXTENSION_OPTIONS = [10, 15, 20, 30]

export default function SessionExtensionPanel({
  hourlyRate = 120,
  existingRequests = [],
  onRequestExtension
}: SessionExtensionPanelProps) {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(EXTENSION_OPTIONS[0])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cost = useMemo(() => ((hourlyRate / 60) * selectedMinutes).toFixed(2), [hourlyRate, selectedMinutes])

  const handleSubmit = () => {
    setIsSubmitting(true)
    setTimeout(() => {
      onRequestExtension?.(selectedMinutes)
      setIsSubmitting(false)
    }, 600)
  }

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Need More Time?</h2>
        <p className="text-xs text-slate-500">Extend the session without leaving the call.</p>
      </header>
      <div className="space-y-5 px-4 py-5">
        <div className="grid grid-cols-2 gap-3">
          {EXTENSION_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSelectedMinutes(option)}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                selectedMinutes === option
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              {option} minutes
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex items-center gap-2 text-slate-900">
            <DollarSign className="h-4 w-4" />
            <span className="font-semibold">Estimated cost</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">${cost}</p>
          <p className="text-xs text-slate-500">Charged via secure Stripe payment.</p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          <span>{isSubmitting ? 'Processing…' : `Request ${selectedMinutes} minutes`}</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        {existingRequests.length > 0 && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <p className="font-semibold text-slate-700">Recent requests</p>
            <ul className="space-y-2">
              {existingRequests.map((request) => (
                <li key={request.id} className="flex items-center justify-between text-slate-600">
                  <span>{request.minutes} minutes</span>
                  <span className={`font-medium ${request.status === 'approved' ? 'text-green-600' : request.status === 'declined' ? 'text-red-500' : 'text-amber-600'}`}>
                    {request.status}
                  </span>
                  <span>{new Date(request.requestedAt).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  )
}
