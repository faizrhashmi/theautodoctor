// @ts-nocheck
/* eslint-disable @next/next/no-img-element */
// Using img element for dynamic file uploads with unknown dimensions

'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type SignedFile = { path: string; url: string }
type Intake = {
  id: string
  created_at: string
  status: string | null
  plan: string | null
  vin?: string | null
  vehicle_make?: string | null
  vehicle_model?: string | null
  vehicle_year?: number | null
  customer_name?: string | null
  customer_phone?: string | null
  customer_email?: string | null
  concern?: string | null
  details?: string | null
  attachments?: any
  media_paths?: any
  signedAttachments?: SignedFile[]
  signedMedia?: SignedFile[]
  signedFiles?: SignedFile[]
  // any other keys from your form will still show in the generic renderer below
  [key: string]: any
}

const STATUS_OPTIONS = [
  'new',
  'pending',
  'in_review',
  'in_progress',
  'awaiting_customer',
  'resolved',
  'cancelled',
] as const

// If your PATCH currently only allows 4 statuses, update it to accept the above
// or map these to your allowed set before PATCH.

export default function IntakesClient() {
  const router = useRouter()
  const pathname = usePathname()
  const qs = useSearchParams()
  const tab = (qs.get('tab') ?? 'list') as 'list' | 'details'
  const id = qs.get('id')

  // You might already have your own fetch for list rows; this demo fetches minimal list
  const [rows, setRows] = useState<any[]>([])
  const [count, setCount] = useState<number>(0)
  const [loadingList, setLoadingList] = useState(false)

  const [item, setItem] = useState<Intake | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)

  // --- List fetch (simplified). Replace with your existing call if you already have it.
  useEffect(() => {
    let ignore = false
    ;(async () => {
      setLoadingList(true)
      try {
        const res = await fetch('/api/admin/intakes?page=1&pageSize=50', { cache: 'no-store' })
        if (!res.ok) throw new Error(`Failed list: ${res.status}`)
        const data = await res.json()
        if (!ignore) {
          setRows(data.items ?? [])
          setCount(data.count ?? 0)
        }
      } catch (e: any) {
        console.error(e)
      } finally {
        if (!ignore) setLoadingList(false)
      }
    })()
    return () => { ignore = true }
  }, [])

  // --- Details fetch
  useEffect(() => {
    if (tab !== 'details' || !id) return
    let ignore = false
    ;(async () => {
      setLoadingDetails(true)
      setErrorDetails(null)
      try {
        const res = await fetch(`/api/admin/intakes/${id}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || `Failed details: ${res.status}`)
        if (!ignore) setItem(data)
      } catch (e: any) {
        if (!ignore) setErrorDetails(e?.message ?? 'Failed to load details')
      } finally {
        if (!ignore) setLoadingDetails(false)
      }
    })()
    return () => { ignore = true }
  }, [tab, id])

  function setTab(next: 'list' | 'details') {
    const sp = new URLSearchParams(qs.toString())
    sp.set('tab', next)
    if (next === 'list') sp.delete('id')
    router.replace(`${pathname}?${sp.toString()}`)
  }

  function openDetails(forId: string) {
    const sp = new URLSearchParams(qs.toString())
    sp.set('tab', 'details')
    sp.set('id', forId)
    router.replace(`${pathname}?${sp.toString()}`)
  }

  async function updateStatus(intakeId: string, status: string) {
    try {
      const res = await fetch(`/api/admin/intakes/${intakeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      // Optimistic UI: update local item + list
      setItem((prev) => (prev ? { ...prev, status } : prev))
      setRows((prev) => prev.map((r) => (r.id === intakeId ? { ...r, status } : r)))
    } catch (e) {
      console.error(e)
      alert('Could not update status')
    }
  }

  const activeRow = useMemo(() => rows.find((r) => r.id === id), [rows, id])

  return (
    <div className="mt-4">
      {/* Tabs */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setTab('list')}
          className={`rounded-lg px-3 py-2 text-sm ring-1 ${tab === 'list' ? 'bg-slate-900 text-white ring-slate-900' : 'ring-slate-300 hover:bg-slate-50'}`}
        >
          List
        </button>
        <button
          onClick={() => setTab('details')}
          disabled={!id}
          className={`rounded-lg px-3 py-2 text-sm ring-1 ${tab === 'details' ? 'bg-slate-900 text-white ring-slate-900' : 'ring-slate-300 hover:bg-slate-50'} ${!id ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Details
        </button>

        <div className="ml-auto text-xs text-slate-500">{count} total</div>
      </div>

      {/* Content */}
      {tab === 'list' && (
        <ListView
          rows={rows}
          loading={loadingList}
          onOpenDetails={openDetails}
        />
      )}

      {tab === 'details' && (
        <DetailsView
          id={id}
          item={item}
          loading={loadingDetails}
          error={errorDetails}
          fallbackHeader={activeRow}
          onChangeStatus={updateStatus}
        />
      )}
    </div>
  )
}

function ListView({ rows, loading, onOpenDetails }: {
  rows: any[], loading: boolean, onOpenDetails: (id: string) => void
}) {
  return (
    <div className="rounded-xl border bg-white">
      <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-slate-500">
        <div className="col-span-2">Created</div>
        <div className="col-span-2">Customer</div>
        <div className="col-span-3">Contact</div>
        <div className="col-span-2">VIN</div>
        <div className="col-span-1">Plan</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-1 text-right">Update</div>
      </div>
      <div className="divide-y">
        {loading && <div className="px-4 py-4 text-sm text-slate-500">Loading…</div>}
        {!loading && rows.map((r) => (
          <div key={r.id} className="grid grid-cols-12 gap-4 px-4 py-3">
            <div className="col-span-2 text-sm">{new Date(r.created_at).toLocaleString('en-CA')}</div>
            <div className="col-span-2 text-sm">
              {r.customer_name ?? '—'}
              <div className="text-[11px] text-slate-500">{r.id?.slice(0,8)}</div>
            </div>
            <div className="col-span-3 text-sm">
              {r.customer_email ?? '—'}
              <div className="text-[11px] text-slate-500">{r.customer_phone ?? ''}</div>
            </div>
            <div className="col-span-2 text-sm">{r.vin ?? '—'}</div>
            <div className="col-span-1 text-sm">{r.plan ?? '—'}</div>
            <div className="col-span-1">
              <StatusPill value={r.status}/>
            </div>
            <div className="col-span-1 flex gap-2 justify-end">
              <button
                onClick={() => onOpenDetails(r.id)}
                className="rounded-lg border px-2 py-1 text-sm hover:bg-slate-50"
                title="Open details"
              >
                Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusPill({ value }: { value?: string | null }) {
  const v = (value ?? 'new').toLowerCase()
  const palette: Record<string, string> = {
    'new': 'bg-slate-100 text-slate-700',
    'in review': 'bg-purple-100 text-purple-700',
    'in progress': 'bg-blue-100 text-blue-700',
    'awaiting customer': 'bg-amber-100 text-amber-700',
    'resolved': 'bg-green-100 text-green-700',
    'pending': 'bg-slate-100 text-slate-700',
    'cancelled': 'bg-rose-100 text-rose-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${palette[v] ?? 'bg-slate-100 text-slate-700'}`}>
      {value ?? 'new'}
    </span>
  )
}

function DetailsView({
  id, item, loading, error, onChangeStatus, fallbackHeader
}: {
  id: string | null
  item: Intake | null
  loading: boolean
  error: string | null
  fallbackHeader: any
  onChangeStatus: (id: string, status: string) => void
}) {
  if (!id) {
    return <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">Select a row from the List tab to view details.</div>
  }
  return (
    <div className="rounded-xl border bg-white p-6">
      {loading && <div className="text-sm text-slate-500">Loading details…</div>}
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {item && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <div className="text-sm text-slate-500">Intake ID</div>
              <div className="font-medium">{item.id}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Created</div>
              <div className="font-medium">{new Date(item.created_at).toLocaleString('en-CA')}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Plan</div>
              <div className="font-medium">{item.plan ?? '—'}</div>
            </div>
            <div className="ml-auto">
              <label className="mr-2 text-sm text-slate-500">Status</label>
              <select
                className="rounded-lg border px-2 py-1 text-sm"
                value={item.status ?? 'new'}
                onChange={(e) => onChangeStatus(item.id, e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>

          {/* Customer */}
          <section>
            <h3 className="text-sm font-semibold">Customer</h3>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Name:</span> {item.customer_name ?? '—'}</div>
              <div><span className="text-slate-500">Phone:</span> {item.customer_phone ?? '—'}</div>
              <div className="col-span-2"><span className="text-slate-500">Email:</span> {item.customer_email ?? '—'}</div>
            </div>
          </section>

          {/* Vehicle */}
          <section>
            <h3 className="text-sm font-semibold">Vehicle</h3>
            <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-slate-500">Year:</span> {item.vehicle_year ?? '—'}</div>
              <div><span className="text-slate-500">Make:</span> {item.vehicle_make ?? '—'}</div>
              <div><span className="text-slate-500">Model:</span> {item.vehicle_model ?? '—'}</div>
              <div className="col-span-3"><span className="text-slate-500">VIN:</span> {item.vin ?? '—'}</div>
            </div>
          </section>

          {/* Concern / Details */}
          <section>
            <h3 className="text-sm font-semibold">Concern / Details</h3>
            <div className="mt-2 whitespace-pre-wrap break-words text-sm">
              {item.concern || item.details || <span className="italic text-slate-400">No details provided</span>}
            </div>
          </section>

          {/* Files */}
          <section>
            <h3 className="text-sm font-semibold">Files</h3>
            {item.signedFiles?.length || item.signedAttachments?.length || item.signedMedia?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {item.signedFiles?.map((f) => <FileChip key={`f-${f.path}`} f={f} />)}
                {item.signedAttachments?.map((f) => <FileChip key={`a-${f.path}`} f={f} />)}
                {item.signedMedia?.map((f) => <FileChip key={`m-${f.path}`} f={f} />)}
              </div>
            ) : (
              <div className="mt-2 text-sm text-slate-400">No files uploaded</div>
            )}
          </section>

          {/* Everything else (generic form fields fallback) */}
          <section>
            <h3 className="text-sm font-semibold">All Fields</h3>
            <div className="mt-2 overflow-x-auto rounded-lg border bg-slate-50 p-3 text-xs">
              <pre className="whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
            </div>
          </section>
        </div>
      )}

      {!loading && !item && !error && (
        <div className="text-sm text-slate-500">
          {fallbackHeader ? 'No details found for selected intake.' : 'Select a row from the List tab to view details.'}
        </div>
      )}
    </div>
  )
}

function FileChip({ f }: { f: SignedFile }) {
  const name = f.path.split('/').pop() ?? f.path
  const isImage = /\.(png|jpe?g|webp|gif|heic|bmp)$/i.test(name)
  const isVideo = /\.(mp4|webm|mov|m4v)$/i.test(name)
  return (
    <a href={f.url} target="_blank" rel="noreferrer"
       className="inline-flex items-center gap-2 rounded-lg border px-2 py-1 text-xs hover:bg-slate-50">
      {name}
      {isImage && <img src={f.url} alt={name} className="h-8 w-8 rounded object-cover" />}
      {isVideo && <span className="text-[10px] opacity-70">video</span>}
    </a>
  )
}
