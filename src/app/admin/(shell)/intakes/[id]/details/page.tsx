// @ts-nocheck
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import StatusBadge from '../../StatusBadge'
import { StatusSelector } from '../StatusSelector'
import { DeleteIntakeButton } from '../DeleteButton'
import type { Intake, IntakeStatus, Json } from '@/types/supabase'

export const dynamic = 'force-dynamic'

const DEFAULT_STATUS: IntakeStatus = 'new'
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'intakes'

type SignedFile = { path: string; url: string }

function toPathArray(value: Json | Json[] | null | undefined): string[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value.flatMap((item) => (typeof item === 'string' ? [item] : []))
  }

  if (typeof value === 'string') {
    return [value]
  }

  if (typeof value === 'object' && value !== null) {
    const maybePaths = (value as { paths?: Json }).paths
    if (Array.isArray(maybePaths)) {
      return maybePaths.flatMap((item) => (typeof item === 'string' ? [item] : []))
    }
  }

  return []
}

async function signFiles(paths: string[]): Promise<SignedFile[]> {
  if (!paths.length) return []

  const signed = await Promise.all(
    paths.map(async (path) => {
      const relativePath = path.startsWith(`${BUCKET}/`) ? path.slice(BUCKET.length + 1) : path
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(relativePath, 3600)
      if (error || !data?.signedUrl) {
        console.error('Failed to sign file', { path, error })
        return null
      }
      return { path, url: data.signedUrl }
    }),
  )

  return signed.filter((item): item is SignedFile => item !== null)
}

export default async function IntakeDetailsPage({ params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('intakes')
    .select('*')
    .eq('id', params.id)
    .maybeSingle<Intake>()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    notFound()
  }

  const customerName =
    data.name ||
    data.customer_name ||
    data.email ||
    data.customer_email ||
    '-'

  const concern = typeof data.concern === 'string' && data.concern.trim() ? data.concern : null
  const notes = typeof data.notes === 'string' && data.notes.trim() ? data.notes : null

  const filePaths = toPathArray(data.files)
  const signedFiles = await signFiles(filePaths)
  const safeStatus = (data.status ?? DEFAULT_STATUS) as IntakeStatus

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            <Link href="/admin/intakes" className="hover:underline">
              Back to intakes
            </Link>
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-white">
            Intake #{data.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-slate-500">
            Created {new Date(data.created_at).toLocaleString('en-CA')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={safeStatus} />
          <StatusSelector intakeId={data.id} currentStatus={safeStatus} />
          <DeleteIntakeButton id={data.id} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-5 shadow-sm">
          <header>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Customer
            </h2>
          </header>
          <dl className="grid gap-4 text-sm text-slate-200">
            <DetailItem label="Name" value={customerName} />
            <DetailItem label="Email" value={data.email ?? data.customer_email ?? '-'} />
            <DetailItem label="Phone" value={data.phone ?? data.customer_phone ?? '-'} />
            <DetailItem label="City" value={data.city ?? '-'} />
            <DetailItem label="Plan" value={data.plan ?? '-'} capitalize />
          </dl>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-5 shadow-sm">
          <header>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Vehicle
            </h2>
          </header>
          <dl className="grid gap-4 text-sm text-slate-200">
            <DetailItem label="Year" value={data.year ?? data.vehicle_year ?? '-'} />
            <DetailItem label="Make" value={data.make ?? data.vehicle_make ?? '-'} />
            <DetailItem label="Model" value={data.model ?? data.vehicle_model ?? '-'} />
            <DetailItem label="VIN" value={data.vin ?? '-'} mono />
            <DetailItem label="Odometer" value={data.odometer ?? '-'} />
            <DetailItem label="Plate" value={data.plate ?? '-'} />
          </dl>
        </section>
      </div>

      {(concern || notes) && (
        <section className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Notes and concerns
          </h2>
          <div className="mt-4 space-y-4 text-sm text-slate-200">
            {concern && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-400">Primary concern</h3>
                <p className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4">
                  {concern}
                </p>
              </div>
            )}
            {notes && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-400">Additional notes</h3>
                <p className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4">
                  {notes}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Attachments
          </h2>
          <span className="text-xs text-slate-500">
            {signedFiles.length} file{signedFiles.length === 1 ? '' : 's'}
          </span>
        </div>
        {signedFiles.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {signedFiles.map(({ path, url }) => {
              const filename = path.split('/').pop() || path
              return (
                <li key={path} className="flex flex-col rounded-xl border border-slate-700 p-4">
                  <div className="mb-3 break-all text-sm font-medium text-slate-200">
                    {filename}
                  </div>
                  <div className="mt-auto flex gap-2 text-sm">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-lg bg-orange-600 px-3 py-2 text-center font-medium text-white hover:bg-orange-700"
                    >
                      View
                    </a>
                    <a
                      href={url}
                      download={filename}
                      className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-center font-medium text-slate-200 hover:bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
                    >
                      Download
                    </a>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{path}</p>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No files uploaded for this intake.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Raw data
        </h2>
        <pre className="mt-4 max-h-96 overflow-auto rounded-lg border border-slate-100 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 text-xs text-slate-200">
          {JSON.stringify(data, null, 2)}
        </pre>
      </section>
    </div>
  )
}

function DetailItem({
  label,
  value,
  mono = false,
  capitalize = false,
}: {
  label: string
  value: unknown
  mono?: boolean
  capitalize?: boolean
}) {
  const display =
    typeof value === 'string' && value.trim()
      ? value
      : typeof value === 'number'
        ? String(value)
        : '-'

  return (
    <div>
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd
        className={[
          'text-slate-700',
          mono ? 'font-mono text-sm' : '',
          capitalize ? 'capitalize' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {display}
      </dd>
    </div>
  )
}
