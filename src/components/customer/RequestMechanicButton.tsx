'use client'

import { useState } from 'react'

interface RequestMechanicButtonProps {
  planCode?: string
  sessionType?: 'chat' | 'video' | 'diagnostic'
  label?: string
  className?: string
}

export default function RequestMechanicButton({
  planCode = 'chat10',
  sessionType = 'chat',
  label = 'Request a Mechanic',
  className,
}: RequestMechanicButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const handleRequest = async () => {
    if (status === 'loading') return

    setStatus('loading')
    setMessage(null)

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionType, planCode }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? 'Unable to create request')
      }

      setStatus('success')
      setMessage('Request sent! A mechanic will claim your chat shortly.')
    } catch (error) {
      console.error('Failed to request mechanic', error)
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unable to request a mechanic right now.')
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleRequest}
        disabled={status === 'loading' || status === 'success'}
        className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed ${
          status === 'success'
            ? 'bg-green-600 hover:bg-green-600 disabled:bg-green-500'
            : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
        }`}
      >
        {status === 'loading' ? 'Sending…' : status === 'success' ? 'Request Sent' : label}
      </button>
      {message && (
        <p
          className={`mt-2 text-xs ${
            status === 'error' ? 'text-red-600' : 'text-slate-600'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
