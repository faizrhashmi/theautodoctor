import Link from 'next/link'
import SessionSummaryCard from '@/components/session/SessionSummaryCard'
import type { SessionSummary } from '@/types/session'
import { ArrowLeft, ClipboardList, FileText, MessageCircle } from 'lucide-react'

const MOCK_SUMMARY: SessionSummary = {
  id: 'summary-1',
  vehicle: '2020 Audi Q5',
  customerName: 'Brandon Lee',
  mechanicName: 'You',
  scheduledStart: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  scheduledEnd: new Date().toISOString(),
  status: 'completed',
  concernSummary: 'Check engine light + rough idle',
  waiverAccepted: true,
  extensionBalance: 0
}

export default function MechanicSessionCompletePage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16 sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <Link href="/mechanic/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <header className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Session summary ready for delivery</h1>
          <p className="mt-2 text-sm text-slate-500">
            Wrap up by saving your notes, uploading attachments, and sending the recap to the customer.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <SessionSummaryCard summary={MOCK_SUMMARY} />
          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Mechanic checklist</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li className="flex gap-2">
                  <ClipboardList className="mt-0.5 h-4 w-4 text-orange-500" />
                  <span>Submit diagnosis summary and action plan.</span>
                </li>
                <li className="flex gap-2">
                  <FileText className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>Upload any annotated photos or documents.</span>
                </li>
                <li className="flex gap-2">
                  <MessageCircle className="mt-0.5 h-4 w-4 text-purple-500" />
                  <span>Send follow-up message through floating chat.</span>
                </li>
              </ul>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Next actions</h2>
              <div className="mt-4 space-y-3">
                <button className="w-full rounded-full bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700">
                  Send summary to customer
                </button>
                <button className="w-full rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-orange-600">
                  Start next session
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
