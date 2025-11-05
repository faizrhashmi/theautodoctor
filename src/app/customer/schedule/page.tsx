import { redirect } from 'next/navigation'
import ModernSchedulingCalendar from '@/components/customer/ModernSchedulingCalendar'
import { getSupabaseServer } from '@/lib/supabaseServer'
import type { PlanKey } from '@/config/pricing'

export const dynamic = 'force-dynamic'

const ALL_PLANS: PlanKey[] = ['chat10', 'video15', 'diagnostic']
const SCHEDULABLE_PLANS: PlanKey[] = ['video15', 'diagnostic']

function normalizePlan(value: string | null | undefined): PlanKey | null {
  if (!value) return null
  return ALL_PLANS.includes(value as PlanKey) ? (value as PlanKey) : null
}

export default async function CustomerSchedulePage() {
  const supabase = getSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signup?redirect=/customer/schedule')
  }

  // Check for active sessions to pass to calendar for time conflict validation
  // Note: We allow scheduling during active sessions, but prevent time conflicts
  const { data: activeSessions } = await supabase
    .from('sessions')
    .select('id, status, type, scheduled_start, scheduled_end, created_at')
    .eq('customer_user_id', user.id)
    .in('status', ['pending', 'live', 'waiting'])
    .limit(1)

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, preferred_plan')
    .eq('id', user.id)
    .maybeSingle()

  const plan = normalizePlan(profile?.preferred_plan)

  const { data: sessionsData } = await supabase
    .from('sessions')
    .select('id, status, plan, type, scheduled_start, scheduled_end')
    .eq('customer_user_id', user.id)
    .in('status', ['scheduled', 'waiting', 'live', 'completed'])
    .order('scheduled_start', { ascending: true })

  const scheduledEvents = (sessionsData ?? [])
    .filter((session) => Boolean(session) && Boolean(session.scheduled_start) && Boolean(session.scheduled_end))
    .map((session) => ({
      id: session.id,
      status: session.status ?? 'scheduled',
      plan: (normalizePlan(session.plan) ?? (plan ?? 'video15')) as PlanKey,
      type: session.type ?? 'video',
      start: session.scheduled_start!,
      end: session.scheduled_end!,
    }))

  const eligible = plan ? SCHEDULABLE_PLANS.includes(plan) : false

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-4 sm:py-6 lg:py-8 overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:gap-4 pb-4 sm:pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs sm:text-sm font-medium uppercase tracking-wide text-orange-500">Live session scheduling</p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-white">Book your live mechanic session</h1>
            <p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-400">
              Choose a time that works for you. We&apos;ll confirm with the next available certified mechanic and email you the joining details.
            </p>
          </div>
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300 shadow-sm backdrop-blur-sm w-full md:w-auto">
            <p className="font-semibold text-white">Current plan</p>
            <p>{plan ? planLabel(plan) : 'No active plan selected'}</p>
            {!eligible && (
              <p className="mt-1 text-xs text-blue-400">
                Upgrade to the Standard Video or Full Diagnostic package to unlock advance booking.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <ModernSchedulingCalendar
              initialEvents={scheduledEvents}
              plan={plan}
              activeSession={activeSessions && activeSessions.length > 0 ? activeSessions[0] : null}
            />
          </div>
          <aside className="space-y-4 sm:space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 sm:p-6 shadow-sm backdrop-blur-sm">
              <h2 className="text-sm font-semibold text-white">How scheduling works</h2>
              <ul className="mt-3 space-y-3 text-sm text-slate-400">
                <li>Pick a time in your local timezone. We store everything in UTC so your mechanic sees it correctly.</li>
                <li>We&apos;ll match you with an available mechanic or notify you if we need to adjust the time.</li>
                <li>Need something sooner? Reply to the confirmation email and we&apos;ll prioritize your request.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 sm:p-6 shadow-sm backdrop-blur-sm">
              <h2 className="text-sm font-semibold text-white">Session prep checklist</h2>
              <ul className="mt-3 space-y-3 text-sm text-slate-400">
                <li>Gather recent service history or diagnostic codes.</li>
                <li>Plan to join from a location with strong data or Wi-Fi.</li>
                <li>Confirm your microphone and camera are working before the session.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function planLabel(plan: PlanKey): string {
  switch (plan) {
    case 'chat10':
      return 'Quick Chat (30 min)'
    case 'video15':
      return 'Standard Video (45 min)'
    case 'diagnostic':
      return 'Full Diagnostic (60 min)'
    default:
      return plan
  }
}
