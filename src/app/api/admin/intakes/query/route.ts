// @ts-nocheck
// app/api/admin/intakes/query/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import type { IntakeStatus } from '@/types/supabase'

// --- Runtime & caching (important for admin APIs) ---
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// If you want to ensure this route never gets statically analyzed at build:
// export const preferredRegion = 'auto' // optional, if you use regions

// Allowed statuses (kept in sync with your DB enum)
const STATUS_VALUES: IntakeStatus[] = [
  'new',
  'pending',
  'in_review',
  'in_progress',
  'awaiting_customer',
  'resolved',
  'cancelled',
]

function isIntakeStatus(value: string | null): value is IntakeStatus {
  return value !== null && (STATUS_VALUES as string[]).includes(value)
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function parsePositiveInt(value: string | null, fallback: number) {
  const n = Number(value ?? '')
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function toISODateBounds(from?: string | null, to?: string | null) {
  const fromISO = from ? new Date(`${from}T00:00:00Z`).toISOString() : undefined
  const toISO = to ? new Date(`${to}T23:59:59Z`).toISOString() : undefined
  return { fromISO, toISO }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.authorized) {
      return auth.response!
    }

    console.info('[admin/intakes] query', {
      admin: auth.profile?.email ?? auth.user?.id ?? 'unknown',
      url: req.url,
    })

    const url = new URL(req.url)

    // Pagination
    const pageRaw = url.searchParams.get('page')
    const sizeRaw = url.searchParams.get('pageSize')
    const page = clamp(parsePositiveInt(pageRaw, 1), 1, 10_000)
    const pageSize = clamp(parsePositiveInt(sizeRaw, 20), 1, 200)

    // Filters
    const q = (url.searchParams.get('q') || '').trim()
    const plan = (url.searchParams.get('plan') || '').trim() // 'all' means no plan filter
    const statusParam = url.searchParams.get('status')
    const status = isIntakeStatus(statusParam) ? (statusParam as IntakeStatus) : null
    const vin = (url.searchParams.get('vin') || '').trim()
    const from = url.searchParams.get('from') // YYYY-MM-DD
    const to = url.searchParams.get('to') // YYYY-MM-DD
    const { fromISO, toISO } = toISODateBounds(from, to)

    // Base query
    let query = supabase.from('intakes').select('*', { count: 'exact' })

    // Search across a few text columns
    if (q) {
      // Supabase .or() takes a comma-separated list of filters
      query = query.or(
        [
          `name.ilike.%${q}%`,
          `email.ilike.%${q}%`,
          `phone.ilike.%${q}%`,
          `vin.ilike.%${q}%`,
        ].join(','),
      )
    }

    // Filters
    if (plan && plan !== 'all') query = query.eq('plan', plan)
    if (status) query = query.eq('status', status)
    if (vin) query = query.ilike('vin', `%${vin}%`)
    if (fromISO) query = query.gte('created_at', fromISO)
    if (toISO) query = query.lte('created_at', toISO)

    // Pagination window
    const fromIndex = (page - 1) * pageSize
    const toIndex = fromIndex + pageSize - 1

    // Sort newest first and apply range
    query = query.order('created_at', { ascending: false }).range(fromIndex, toIndex)

    const { data, count, error } = await query

    if (error) {
      console.error('Supabase intakes query error', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      rows: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
      filters: {
        q,
        plan: plan || null,
        status,
        vin: vin || null,
        from: from || null,
        to: to || null,
      },
    })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unexpected error'
    console.error('Admin intakes query route error', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
