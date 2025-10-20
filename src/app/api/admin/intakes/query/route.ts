import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import type { IntakeStatus } from '@/types/supabase'

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
  return value !== null && STATUS_VALUES.includes(value as IntakeStatus)
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
    const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get('pageSize') ?? '20')))

    const search = (url.searchParams.get('q') || '').trim()
    const plan = (url.searchParams.get('plan') || '').trim()
    const status = isIntakeStatus(url.searchParams.get('status'))
      ? (url.searchParams.get('status') as IntakeStatus)
      : null
    const vin = (url.searchParams.get('vin') || '').trim()
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const fromISO = from ? new Date(`${from}T00:00:00Z`).toISOString() : undefined
    const toISO = to ? new Date(`${to}T23:59:59Z`).toISOString() : undefined

    let query = supabase.from('intakes').select('*', { count: 'exact' })

    if (search) {
      query = query.or(
        [
          `name.ilike.%${search}%`,
          `email.ilike.%${search}%`,
          `phone.ilike.%${search}%`,
          `vin.ilike.%${search}%`,
        ].join(','),
      )
    }

    if (plan && plan !== 'all') query = query.eq('plan', plan)
    if (status) query = query.eq('status', status)
    if (vin) query = query.ilike('vin', `%${vin}%`)
    if (fromISO) query = query.gte('created_at', fromISO)
    if (toISO) query = query.lte('created_at', toISO)

    const fromIndex = (page - 1) * pageSize
    const toIndex = fromIndex + pageSize - 1
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
    })
  } catch (err: any) {
    console.error('Admin intakes query route error', err)
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
