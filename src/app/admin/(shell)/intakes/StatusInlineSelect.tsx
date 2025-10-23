// @ts-nocheck
'use client'
import { useState } from 'react'

export default function StatusInlineSelect({ id, initial }: { id: string; initial?: string | null }) {
  const [status, setStatus] = useState(initial ?? 'pending')
  const [saving, setSaving] = useState(false)
  async function update(next: string) {
    setSaving(true)
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
      setSaving(false)
    }
  }
  return (
    <select
      value={status}
      onChange={(e) => update(e.target.value)}
      disabled={saving}
      className="rounded-xl border px-2 py-1 text-xs capitalize"
    >
      <option value="new">new</option>
      <option value="pending">pending</option>
      <option value="in_review">in review</option>
      <option value="in_progress">in progress</option>
      <option value="awaiting_customer">awaiting customer</option>
      <option value="resolved">resolved</option>
      <option value="cancelled">cancelled</option>
    </select>
  )
}
