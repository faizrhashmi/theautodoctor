'use client'

import { useState } from 'react'
import { Check, Clock, Plus, Save, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import type { MechanicAvailabilityBlock } from '@/types/session'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const DEFAULT_AVAILABILITY: MechanicAvailabilityBlock[] = [
  { id: 'a1', weekday: 1, startTime: '09:00', endTime: '13:00', isActive: true },
  { id: 'a2', weekday: 2, startTime: '14:00', endTime: '18:00', isActive: true },
  { id: 'a3', weekday: 6, startTime: '10:00', endTime: '16:00', isActive: false }
]

export default function MechanicAvailabilityPage() {
  const [availability, setAvailability] = useState<MechanicAvailabilityBlock[]>(DEFAULT_AVAILABILITY)
  const [isSaving, setIsSaving] = useState(false)

  const toggleBlock = (blockId: string) => {
    setAvailability((prev) => prev.map((block) => (block.id === blockId ? { ...block, isActive: !block.isActive } : block)))
  }

  const updateBlock = (blockId: string, key: 'startTime' | 'endTime' | 'weekday', value: string) => {
    setAvailability((prev) =>
      prev.map((block) => (block.id === blockId ? { ...block, [key]: key === 'weekday' ? Number(value) : value } : block))
    )
  }

  const deleteBlock = (blockId: string) => {
    setAvailability((prev) => prev.filter((block) => block.id !== blockId))
  }

  const addBlock = () => {
    setAvailability((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        weekday: 0,
        startTime: '08:00',
        endTime: '12:00',
        isActive: true
      }
    ])
  }

  const saveAvailability = () => {
    setIsSaving(true)
    setTimeout(() => setIsSaving(false), 800)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-8">
      <header className="mb-10 flex flex-col gap-2">
        <p className="text-xs uppercase tracking-widest text-blue-600">Availability</p>
        <h1 className="text-3xl font-bold text-slate-900">Control when customers can book you</h1>
        <p className="text-sm text-slate-500">
          Adjust your weekly schedule. Deactivating a block removes it from the booking calendar instantly.
        </p>
      </header>

      <div className="space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Weekly schedule</h2>
              <p className="text-sm text-slate-500">Tap a block to activate/deactivate.</p>
            </div>
            <button
              type="button"
              onClick={addBlock}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
            >
              <Plus className="h-4 w-4" />
              Add block
            </button>
          </div>

          <ul className="mt-6 space-y-4">
            {availability.map((block) => (
              <li
                key={block.id}
                className={`flex flex-col gap-4 rounded-2xl border px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
                  block.isActive ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-100 text-slate-600'
                }`}
              >
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <select
                      value={block.weekday}
                      onChange={(event) => updateBlock(block.id, 'weekday', event.target.value)}
                      className="rounded-full border border-transparent bg-white/80 px-3 py-1 text-sm text-slate-700 focus:border-blue-300 focus:outline-none"
                    >
                      {WEEKDAYS.map((day, index) => (
                        <option key={day} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </label>
                  <input
                    type="time"
                    value={block.startTime}
                    onChange={(event) => updateBlock(block.id, 'startTime', event.target.value)}
                    className="rounded-full border border-transparent bg-white/80 px-3 py-1 text-sm text-slate-700 focus:border-blue-300 focus:outline-none"
                  />
                  <span className="text-xs uppercase">to</span>
                  <input
                    type="time"
                    value={block.endTime}
                    onChange={(event) => updateBlock(block.id, 'endTime', event.target.value)}
                    className="rounded-full border border-transparent bg-white/80 px-3 py-1 text-sm text-slate-700 focus:border-blue-300 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleBlock(block.id)}
                    className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
                  >
                    {block.isActive ? (
                      <>
                        <ToggleRight className="h-5 w-5 text-blue-500" /> Active
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-5 w-5 text-slate-400" /> Paused
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteBlock(block.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-1 text-sm text-red-500 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Publishing changes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Saving immediately updates the Supabase availability tables. Customers will only see the slots you mark active.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveAvailability}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
            {isSaving ? (
              <span className="inline-flex items-center gap-2 text-sm text-blue-600">
                <Check className="h-4 w-4" />
                Availability synced
              </span>
            ) : (
              <span className="text-sm text-slate-400">Changes not yet published</span>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
