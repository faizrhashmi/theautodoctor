import Link from 'next/link'
import SessionSummaryCard from '@/components/session/SessionSummaryCard'
import type { SessionSummary } from '@/types/session'
import { ArrowLeft, Download, Sparkles } from 'lucide-react'

const MOCK_SUMMARY: SessionSummary = {
  id: 'summary-1',
  vehicle: '2020 Audi Q5',
  customerName: 'Brandon Lee',
  mechanicName: 'Jamie Carter',
  scheduledStart: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  scheduledEnd: new Date().toISOString(),
  status: 'completed',
  concernSummary: 'Check engine light + rough idle',
  waiverAccepted: true,
  extensionBalance: 0
}

export default function SessionCompletePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-16 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-orange-200 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <header className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-xl">
          <div className="flex flex-col gap-4 text-center">
            <span className="mx-auto inline-flex items-center gap-2 rounded-full bg-orange-500/20 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-blue-100">
              <Sparkles className="h-4 w-4" /> Session complete
            </span>
            <h1 className="text-3xl font-bold">Your certified mechanic has wrapped up the consultation</h1>
            <p className="text-sm text-slate-300">
              Review your summary, download notes, and book a follow-up in seconds.
            </p>
          </div>
        </header>

        <SessionSummaryCard summary={MOCK_SUMMARY} variant="dark" />

        <section className="grid gap-4 rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-xl md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold">Recommended next steps</h2>
            <ul className="mt-3 space-y-3 text-sm text-slate-300">
              <li>• Schedule an in-person diagnostic if symptoms persist.</li>
              <li>• Order OEM spark plugs and ignition coils.</li>
              <li>• Monitor fuel economy and idle behaviour over the next week.</li>
            </ul>
          </div>
          <div className="space-y-4 rounded-2xl bg-slate-800/60 p-5">
            <h3 className="text-sm font-semibold text-orange-200">Session files</h3>
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-orange-700">
              <Download className="h-4 w-4" />
              Download all attachments
            </button>
            <Link href="/session/new" className="block rounded-xl border border-orange-300/40 px-4 py-3 text-center text-sm font-semibold text-blue-100 transition hover:border-blue-200 hover:text-white">
              Book follow-up session
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
