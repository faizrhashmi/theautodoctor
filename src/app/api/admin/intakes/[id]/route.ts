// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { ensureAdmin } from '@/lib/auth'
import type { IntakeStatus } from '@/types/supabase'

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'intakes'
const ALLOWED_STATUSES: IntakeStatus[] = [
  'new',
  'pending',
  'in_review',
  'in_progress',
  'awaiting_customer',
  'resolved',
  'cancelled',
]

function respondError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function asPathArray(input: unknown): string[] {
  if (!input) return []
  if (Array.isArray(input)) return input.filter((p): p is string => typeof p === 'string')
  if (typeof input === 'object') {
    const maybePaths = (input as Record<string, unknown>).paths
    if (Array.isArray(maybePaths)) {
      return maybePaths.filter((p): p is string => typeof p === 'string')
    }
  }
  if (typeof input === 'string') return [input]
  return []
}

async function signStoragePaths(paths: string[]) {
  if (!paths.length) return []
  const results = await Promise.all(
    paths.map(async (path) => {
      const relativePath = path.startsWith(`${BUCKET}/`) ? path.slice(BUCKET.length + 1) : path
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(relativePath, 3600)
      if (error || !data?.signedUrl) {
        console.error('Failed to sign path', { path, error })
        return null
      }
      return { path, url: data.signedUrl }
    }),
  )

  return results.filter((item): item is { path: string; url: string } => item !== null)
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  // ✅ SECURITY FIX: Require admin authentication
  const auth = await ensureAdmin()
  if (!auth.ok) return auth.res

  if (!supabase) return respondError('Supabase not configured on server', 500)
  const { data, error } = await supabase
    .from('intakes')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (error) {
    console.error('GET /api/admin/intakes/[id] error', error)
    return respondError(error.message, 500)
  }
  if (!data) {
    return respondError('Not found', 404)
  }

  const filePaths = asPathArray(data.files)
  const signedFiles = await signStoragePaths(filePaths)

  return NextResponse.json({
    ...data,
    signedFiles,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // ✅ SECURITY FIX: Require admin authentication
  const auth = await ensureAdmin()
  if (!auth.ok) return auth.res

  if (!supabase) return respondError('Supabase not configured on server', 500)
  const payload = await req.json().catch(() => ({}))
  const status = payload.status as IntakeStatus | undefined

  if (!status) {
    return respondError('Status is required')
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    return respondError('Invalid status')
  }

  const { error } = await supabase
    .from('intakes')
    .update({ status })
    .eq('id', params.id)

  if (error) {
    console.error('PATCH /api/admin/intakes/[id] error', error)
    return respondError(error.message, 500)
  }

  return NextResponse.json({ ok: true, status })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!supabase) return respondError('Supabase not configured on server', 500)

  const guard = await ensureAdmin()
  if (!guard.ok) return guard.res

  const admin = guard.user
  const { reason = null } = await req.json().catch(() => ({}))

  const { data: intake, error: fetchError } = await supabase
    .from('intakes')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (fetchError) {
    console.error('DELETE /api/admin/intakes/[id] fetch error', fetchError)
    return respondError(fetchError.message, 500)
  }
  if (!intake) {
    return respondError('Intake not found', 404)
  }

  const { error: logError } = await supabase.from('intake_deletions').insert({
    intake_id: params.id,
    deleted_by: admin.id,
    deleted_email: admin.email ?? null,
    deleted_at: new Date().toISOString(),
    reason,
    payload: intake,
  })
  if (logError) {
    // If the audit table is missing, continue with deletion but log a warning.
    const missingTableCodes = new Set(['42P01', 'PGRST116'])
    const missingTable =
      (logError.code && missingTableCodes.has(logError.code)) ||
      (logError.message && /intake_deletions/i.test(logError.message) && logError.message.includes('schema cache'))

    if (missingTable) {
      console.warn('intake_deletions table missing, skipping audit log')
    } else {
      console.error('DELETE /api/admin/intakes/[id] log error', logError)
      return respondError(logError.message, 500)
    }
  }

  const { error: deleteError } = await supabase.from('intakes').delete().eq('id', params.id)
  if (deleteError) {
    console.error('DELETE /api/admin/intakes/[id] delete error', deleteError)
    return respondError(deleteError.message, 500)
  }

  return NextResponse.json({ ok: true })
}
