'use client'
import { useState } from 'react'

export default function StatusActions({ id, initial }: { id: string; initial: string }) {
  const [status, setStatus] = useState(initial)
  const [loading, setLoading] = useState(false)

  async function setTo(next: string) {
    if (next === status) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/intakes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error(await res.text())
      setStatus(next)
    } catch (e) {
      alert('Failed: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const opts = ['new','pending','in_review','in_progress','awaiting_customer','resolved','cancelled']
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map(s => (
        <button
          key={s}
          onClick={() => setTo(s)}
          disabled={loading || status === s}
          className={`rounded-xl border px-3 py-2 text-sm capitalize ${
            status === s ? 'bg-orange-600 text-white' : 'hover:bg-slate-50'
          }`}
        >
          {s.replace('_',' ')}
        </button>
      ))}
    </div>
  )
}
