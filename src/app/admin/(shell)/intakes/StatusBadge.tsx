'use client';

type IntakeStatus =
  | 'new'
  | 'pending'
  | 'in_review'
  | 'in_progress'
  | 'awaiting_customer'
  | 'resolved'
  | 'cancelled';

const COLOR_MAP: Record<IntakeStatus, string> = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  pending: 'bg-slate-200 text-slate-800 border-slate-300',
  in_review: 'bg-violet-100 text-violet-800 border-violet-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  awaiting_customer: 'bg-slate-100 text-slate-800 border-slate-200',
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

function humanize(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StatusBadge({ status }: { status: IntakeStatus }) {
  const cls =
    COLOR_MAP[status] ?? 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}
      title={humanize(status)}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current/70" />
      {humanize(status)}
    </span>
  );
}
