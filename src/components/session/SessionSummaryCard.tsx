import type { SessionSummary } from '@/types/session'
import { CalendarDays, ClipboardList, MessageSquare, UserRound } from 'lucide-react'

interface SessionSummaryCardProps {
  summary: SessionSummary
  className?: string
  variant?: 'light' | 'dark'
}

export default function SessionSummaryCard({ summary, className = '', variant = 'light' }: SessionSummaryCardProps) {
  const baseColors =
    variant === 'dark'
      ? {
          container: 'border-slate-700 bg-white/5 text-slate-100',
          subtle: 'text-slate-300',
          strong: 'text-white'
        }
      : {
          container: 'border-slate-200 bg-white text-slate-900',
          subtle: 'text-slate-500',
          strong: 'text-slate-900'
        }

  return (
    <article className={`rounded-3xl border p-6 shadow-sm ${baseColors.container} ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-xs uppercase tracking-wide ${baseColors.subtle}`}>Session #{summary.id.slice(0, 8)}</p>
          <h2 className={`text-lg font-semibold ${baseColors.strong}`}>{summary.vehicle}</h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
            summary.status === 'completed'
              ? 'bg-emerald-100 text-emerald-700'
              : summary.status === 'live'
                ? 'bg-blue-100 text-blue-700'
                : summary.status === 'scheduled'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-600'
          }`}
        >
          {summary.status}
        </span>
      </header>

      <dl className={`mt-6 grid gap-4 text-sm ${baseColors.subtle} sm:grid-cols-2`}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <dt className={`text-xs uppercase ${baseColors.subtle}`}>Customer</dt>
            <dd className={`font-medium ${baseColors.strong}`}>{summary.customerName}</dd>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
            <MessageSquare className="h-5 w-5" />
          </span>
          <div>
            <dt className={`text-xs uppercase ${baseColors.subtle}`}>Mechanic</dt>
            <dd className={`font-medium ${baseColors.strong}`}>{summary.mechanicName}</dd>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <dt className={`text-xs uppercase ${baseColors.subtle}`}>Scheduled</dt>
            <dd className={`font-medium ${baseColors.strong}`}>
              {new Date(summary.scheduledStart).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
            </dd>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div>
            <dt className={`text-xs uppercase ${baseColors.subtle}`}>Concern</dt>
            <dd className={`font-medium ${baseColors.strong}`}>{summary.concernSummary}</dd>
          </div>
        </div>
      </dl>

      <footer className={`mt-6 flex flex-wrap items-center justify-between gap-2 text-xs ${baseColors.subtle}`}>
        <span>Waiver {summary.waiverAccepted ? 'accepted' : 'pending'}</span>
        <span>Extension balance: {summary.extensionBalance} min</span>
      </footer>
    </article>
  )
}
