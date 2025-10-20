import Link from 'next/link'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import type { IntakeDeletion } from '@/types/supabase'

export const dynamic = 'force-dynamic'

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function renderPayloadSummary(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '-'

  const record = payload as Record<string, unknown>
  const summary: string[] = []

  const name =
    typeof record.name === 'string'
      ? record.name
      : typeof record.customer_name === 'string'
        ? record.customer_name
        : null
  if (name) summary.push(name)

  const vehicleParts = [record.year, record.make, record.model]
    .map((part) => {
      if (typeof part === 'number') return String(part)
      if (typeof part === 'string') return part.trim()
      return ''
    })
    .filter((part): part is string => part.length > 0)
  if (vehicleParts.length) {
    summary.push(vehicleParts.join(' '))
  }

  if (typeof record.status === 'string' && record.status.trim()) {
    summary.push(`status: ${record.status}`)
  }

  return summary.length ? summary.join(' | ') : '-'
}

export default async function IntakeDeletionLogPage() {
  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
            Supabase admin client is not configured on the server. Unable to load the deletion log.
          </div>
        </div>
      </div>
    )
  }

  const { data, error } = await supabase
    .from('intake_deletions')
    .select('*')
    .order('deleted_at', { ascending: false })
    .limit(100)

  if (error) {
    throw new Error(error.message)
  }

  const rows: IntakeDeletion[] = data ?? []

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Intake Deletion Log</h1>
            <p className="text-sm text-slate-500">
              Showing the most recent deletions. Up to 100 records are displayed, newest first.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/intakes"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to intakes
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
            No deletion records have been logged yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide">
                    <th>Deleted at</th>
                    <th>Intake</th>
                    <th>Deleted by</th>
                    <th>Reason</th>
                    <th>Summary</th>
                    <th>Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((row) => {
                    const summary = renderPayloadSummary(row.payload)
                    return (
                      <tr key={row.id} className="[&>td]:px-4 [&>td]:py-3 align-top">
                        <td className="whitespace-nowrap text-slate-600">
                          {formatDate(row.deleted_at)}
                        </td>
                        <td className="whitespace-nowrap text-slate-600">
                          <div className="font-mono text-xs text-slate-500">{row.intake_id}</div>
                        </td>
                        <td className="text-slate-600">
                          <div>{row.deleted_email || '-'}</div>
                          {row.deleted_by && (
                            <div className="text-xs text-slate-400">User ID: {row.deleted_by}</div>
                          )}
                        </td>
                        <td className="text-slate-600">
                          {row.reason?.trim() || '-'}
                        </td>
                        <td className="text-slate-600">{summary}</td>
                        <td className="text-slate-600">
                          <details className="group">
                            <summary className="cursor-pointer text-xs font-medium text-blue-600 group-open:text-blue-700">
                              View JSON
                            </summary>
                            <pre className="mt-2 max-h-64 overflow-auto rounded border border-slate-200 bg-slate-50 p-3 text-xs">
                              {JSON.stringify(row.payload, null, 2)}
                            </pre>
                          </details>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
