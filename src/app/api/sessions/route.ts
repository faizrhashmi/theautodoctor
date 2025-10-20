import { NextResponse } from 'next/server'
import type { SessionSummary } from '@/types/session'

const MOCK_SESSIONS: SessionSummary[] = [
  {
    id: 'queue-1',
    vehicle: '2020 Audi Q5',
    customerName: 'Brandon Lee',
    mechanicName: 'Jamie Carter',
    scheduledStart: new Date().toISOString(),
    scheduledEnd: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    status: 'scheduled',
    concernSummary: 'Check engine light + rough idle',
    waiverAccepted: true,
    extensionBalance: 0
  }
]

export async function GET() {
  return NextResponse.json({ sessions: MOCK_SESSIONS })
}

export async function POST(request: Request) {
  const body = await request.json()
  const created: SessionSummary = {
    id: crypto.randomUUID(),
    vehicle: body.vehicle ?? 'Unknown vehicle',
    customerName: body.customerName ?? 'Customer',
    mechanicName: body.mechanicName ?? 'Unassigned',
    scheduledStart: body.scheduledStart ?? new Date().toISOString(),
    scheduledEnd: body.scheduledEnd ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    status: 'scheduled',
    concernSummary: body.concernSummary ?? 'Pending intake notes',
    waiverAccepted: false,
    extensionBalance: 0
  }

  return NextResponse.json({ session: created }, { status: 201 })
}
