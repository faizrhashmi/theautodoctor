import { NextResponse } from 'next/server'
import type { SessionSummary } from '@/types/session'

const MOCK_SESSION: SessionSummary = {
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

export async function GET() {
  return NextResponse.json({ session: MOCK_SESSION })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const updates = await request.json()
  const updated: SessionSummary = {
    ...MOCK_SESSION,
    ...updates,
    id: params.id
  }
  return NextResponse.json({ session: updated })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ success: true, deletedId: params.id })
}
