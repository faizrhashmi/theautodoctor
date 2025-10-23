// @ts-nocheck
// src/app/api/admin/intakes/export/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { ensureAdmin } from '@/lib/auth'
import type { IntakeStatus } from '@/types/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toISOStart(d: string) {
  return new Date(d + 'T00:00:00Z').toISOString()
}
function toISOEnd(d: string) {
  return new Date(d + 'T23:59:59.999Z').toISOString()
}

const PAGE = 1000 // chunk size for streaming

export async function GET(req: NextRequest) {
  const guard = await ensureAdmin()
  if (!guard.ok) return guard.res

  const url = new URL(req.url)
  const plan = url.searchParams.get('plan') || ''
  const statusParam = url.searchParams.get('status')
  const vin = url.searchParams.get('vin') || ''
  const from = url.searchParams.get('from') || ''
  const to = url.searchParams.get('to') || ''
  const search = url.searchParams.get('search') || ''
  const status: IntakeStatus | null =
    statusParam && isIntakeStatus(statusParam) ? statusParam : null

  // Build base query (no range)
  let base = supabase.from('intakes').select('*', { count: 'exact' }).order('created_at', { ascending: false })

  if (plan) base = base.eq('plan', plan)
  if (status) base = base.eq('status', status)
  if (vin) base = base.ilike('vin', `%${vin}%`)
  if (from) base = base.gte('created_at', toISOStart(from))
  if (to) base = base.lte('created_at', toISOEnd(to))
  if (search) {
    base = base.or(
      [
        `name.ilike.%${search}%`,
        `customer_name.ilike.%${search}%`,
        `email.ilike.%${search}%`,
        `phone.ilike.%${search}%`,
        `vin.ilike.%${search}%`,
      ].join(','),
    )
  }

  const headers = [
    'id',
    'created_at',
    'name',
    'email',
    'phone',
    'vin',
    'plan',
    'status',
  ]

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Write CSV header
      controller.enqueue(encoder.encode(headers.join(',') + '\n'))

      let offset = 0
      while (true) {
        const { data, error } = await base.range(offset, offset + PAGE - 1)
        if (error) {
          controller.error(error)
          return
        }

        const rows = data ?? []
        if (rows.length === 0) break

        const chunk = rows
          .map((r) =>
            [
              r.id,
              r.created_at,
              r.name ?? r.customer_name ?? '',
              r.email ?? '',
              r.phone ?? '',
              r.vin ?? '',
              r.plan ?? '',
              r.status ?? '',
            ]
              .map((v) =>
                String(v)
                  .replace(/"/g, '""')
                  .replace(/\n/g, ' ')
              )
              .map((v) => `"${v}"`)
              .join(',')
          )
          .join('\n') + '\n'

        controller.enqueue(encoder.encode(chunk))
        offset += rows.length

        if (rows.length < PAGE) break
      }

      controller.close()
    },
  })

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="intakes-export-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}

function isIntakeStatus(value: string): value is IntakeStatus {
  return [
    'new',
    'pending',
    'in_review',
    'in_progress',
    'awaiting_customer',
    'resolved',
    'cancelled',
  ].includes(value)
}
