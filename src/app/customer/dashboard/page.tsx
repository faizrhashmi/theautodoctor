import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { PLAN_ALIASES, PRICING, type PlanKey } from '@/config/pricing'
import MechanicPresenceIndicator from '@/components/realtime/MechanicPresenceIndicator'
import RequestMechanicButton from '@/components/customer/RequestMechanicButton'
import { SessionJoinCard } from '@/components/customer/SessionJoinCard'
import { SessionFileManager } from '@/components/customer/SessionFileManager'
import { SessionFileList } from '@/components/customer/SessionFileList'
import type { Profile, Session, SessionFile } from '@/types/supabase'
import type {
  CustomerDashboardFile,
  CustomerDashboardSession,
} from '@/components/customer/dashboard-types'
import { AlertCircle, Calendar, ClipboardList } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PLAN_LABELS: Record<string, string> = {
  quick: 'Quick Chat',
  standard: 'Standard Video',
  diagnostic: 'Full Diagnostic',
  free: 'Free Session',
  // Legacy plan IDs (if any exist in database)
  chat10: 'Quick Chat (30 min)',
  video15: 'Standard Video (45 min)',
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  chat: 'Live chat',
  video: 'Video call',
  diagnostic: 'Diagnostic video call',
}

const JOIN_WINDOW_MINUTES = 10

export default async function CustomerDashboardPage() {
  const supabase = getSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/customer/login?redirect=/customer/dashboard')
  }

  let profile: Pick<
    Profile,
    'full_name' | 'phone' | 'vehicle_info' | 'email_verified' | 'preferred_plan' | 'account_status'
  > | null = null

  const {
    data: profileData,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select('full_name, phone, vehicle_info, email_verified, preferred_plan, account_status')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.warn('Customer dashboard profile query failed, attempting admin fallback', {
      code: profileError.code,
      message: profileError.message,
    })

    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone, vehicle_info, email_verified, preferred_plan, account_status')
      .eq('id', user.id)
      .maybeSingle()

    if (adminError) {
      console.error('Unable to load customer profile via admin client', adminError)
    } else {
      profile = adminProfile ?? null
    }
  } else {
    profile = profileData ?? null
  }

  // NOTE: Removed redirect to pricing if no plan - this was causing redirect loops
  // Users can access dashboard even without a plan selected
  // if (user.email_confirmed_at && !profile?.preferred_plan) {
  //   redirect('/onboarding/pricing')
  // }

  const { data: sessionParticipants, error: sessionParticipantsError } = await supabase
    .from('session_participants')
    .select(`
      session_id,
      sessions (
        id,
        created_at,
        plan,
        type,
        status,
        scheduled_start,
        scheduled_end,
        started_at,
        ended_at,
        mechanic_id
      )
    `)
    .eq('user_id', user.id)
    .eq('role', 'customer')

  if (sessionParticipantsError) {
    console.error('Unable to load session participants for dashboard', sessionParticipantsError)
  }

  const sessions = (sessionParticipants ?? [])
    .map((row: any) => row.sessions)
    .filter(Boolean) as Session[]

  const sessionIds = sessions.map((session) => session.id)

  let fileRows: SessionFile[] = []
  if (sessionIds.length > 0) {
    const { data: filesData, error: filesError } = await supabase
      .from('session_files')
      .select(
        'id, created_at, session_id, file_name, file_size, file_type, storage_path, file_url, uploaded_by'
      )
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false })

    if (!filesError) {
      fileRows = (filesData ?? []) as SessionFile[]
    } else {
      console.error('Unable to load session files for dashboard', filesError)
    }
  }

  const relatedProfileIds = Array.from(
    new Set([
      ...sessions
        .map((session) => session.mechanic_id)
        .filter((value): value is string => Boolean(value)),
      ...fileRows.map((file) => file.uploaded_by).filter((value): value is string => Boolean(value)),
    ])
  )

  let relatedProfiles: Profile[] = []
  if (relatedProfileIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', relatedProfileIds)

    if (!profilesError) {
      relatedProfiles = (profilesData ?? []) as Profile[]
    }
  }

  const profileMap = new Map(relatedProfiles.map((item) => [item.id, item.full_name]))

  const filesBySession = new Map<string, CustomerDashboardFile[]>()
  for (const file of fileRows) {
    const normalized: CustomerDashboardFile = {
      id: file.id,
      sessionId: file.session_id,
      fileName: file.file_name,
      fileSize: file.file_size,
      fileType: file.file_type,
      storagePath: file.storage_path,
      createdAt: file.created_at,
      fileUrl: file.file_url,
      uploadedBy: file.uploaded_by,
      uploadedByName:
        file.uploaded_by === user.id ? null : profileMap.get(file.uploaded_by ?? '') ?? null,
    }

    const existing = filesBySession.get(file.session_id) ?? []
    existing.push(normalized)
    filesBySession.set(file.session_id, existing)
  }

  const normalizedSessions: CustomerDashboardSession[] = sessions.map((session) => ({
    id: session.id,
    plan: session.plan,
    planLabel: PLAN_LABELS[session.plan] ?? session.plan,
    type: session.type,
    typeLabel: SESSION_TYPE_LABELS[session.type] ?? session.type,
    status: session.status ?? 'pending',
    createdAt: session.created_at,
    scheduledStart: session.scheduled_start,
    scheduledEnd: session.scheduled_end,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    mechanicId: session.mechanic_id,
    mechanicName: session.mechanic_id ? profileMap.get(session.mechanic_id) ?? null : null,
    files: filesBySession.get(session.id) ?? [],
  }))

  const upcomingSessions = normalizedSessions
    .filter((session) => !['completed', 'cancelled'].includes(session.status.toLowerCase()))
    .sort((a, b) => sessionSortValue(a) - sessionSortValue(b))

  const nextSession = upcomingSessions[0] ?? null
  const queuedSessions = upcomingSessions.slice(1)

  const pastSessions = normalizedSessions
    .filter((session) => session.status.toLowerCase() === 'completed')
    .sort((a, b) => sessionSortValue(b, true) - sessionSortValue(a, true))

  const planSummary = getPlanSummary(profile?.preferred_plan ?? null, profile?.account_status ?? null, upcomingSessions.length)

  const vehicleInfo = (profile?.vehicle_info as Record<string, string | null> | null) ?? null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-white/10 bg-white/5 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-600">
              <span className="text-lg font-semibold text-white">{initials(profile?.full_name ?? user.email ?? 'Customer')}</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">
                {profile?.full_name ? `Hi, ${profile.full_name}` : 'Customer Dashboard'}
              </h1>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-200 sm:block">
              {planSummary.badge ?? planSummary.headline}
            </div>
            <form action="/api/customer/logout" method="POST">
              <button type="submit" className="text-sm font-medium text-slate-300 transition hover:text-white">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {profile?.email_verified === false && (
          <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Please verify your email address before joining a session. Check your inbox for a confirmation link or request a new
            one from the login page.
          </div>
        )}

        <div className="mb-6 flex">
          <MechanicPresenceIndicator
            variant="dark"
            loadingText="Checking live mechanic availabilityÃ¢â‚¬Â¦"
            zeroText="Our mechanics are currently offline. We'll let you know as soon as someone is live."
            className="flex w-full items-center justify-center sm:w-auto sm:justify-start"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Upcoming session</h2>
              {nextSession ? (
                <SessionJoinCard session={nextSession} />
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-sm backdrop-blur">
                  <h3 className="text-lg font-semibold text-white">No sessions scheduled</h3>
                  <p className="mt-2 text-sm text-slate-300">
                    {"You're all set with your "}
                    {profile?.preferred_plan ? PLAN_LABELS[profile.preferred_plan] || 'plan' : 'plan'}
                    {"! Schedule your first session to connect with our certified mechanics."}
                  </p>
                  <div className="mt-4 flex justify-center">
                    <Link
                      href="/customer/schedule"
                      className="rounded-full bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
                    >
                      Schedule a session
                    </Link>
                  </div>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">More upcoming sessions</h2>
                {queuedSessions.length > 0 && (
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {queuedSessions.length} waiting
                  </span>
                )}
              </div>
              {queuedSessions.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">We&apos;ll list additional bookings here once you have more sessions.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {queuedSessions.map((session) => (
                    <UpcomingSessionCard key={session.id} session={session} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 text-lg font-semibold text-white">Session history</h2>
              {pastSessions.length === 0 ? (
                <p className="text-sm text-slate-400">You haven&apos;t completed any sessions yet. Completed sessions will appear here.</p>
              ) : (
                <div className="space-y-3">
                  {pastSessions.slice(0, 6).map((session) => (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{session.planLabel}</p>
                          <p className="text-xs text-slate-400">
                            {session.typeLabel}
                            {session.mechanicName ? ` Ã‚Â· ${session.mechanicName}` : ''}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatSessionDate(session.endedAt ?? session.startedAt ?? session.createdAt)}
                          </p>
                        </div>
                        <span className="inline-flex items-center justify-center rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300">
                          Completed
                        </span>
                      </div>
                      {session.files.length > 0 && (
                        <SessionFileList files={session.files} compact currentUserId={user.id} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-400">Plan &amp; billing</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{planSummary.headline}</h3>
              <p className="mt-2 text-sm text-slate-300">{planSummary.description}</p>
              {planSummary.billingDetail && (
                <p className="mt-3 text-xs text-orange-200">{planSummary.billingDetail}</p>
              )}
              <p className="mt-4 text-xs text-slate-400">
                Upcoming sessions: {upcomingSessions.length} - Completed: {pastSessions.length}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {planSummary.checkoutHref && (
                  <Link
                    href={planSummary.checkoutHref}
                    prefetch={false}
                    className="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-400"
                  >
                    {planSummary.checkoutLabel ?? 'Complete payment'}
                  </Link>
                )}
                <Link
                  href={planSummary.actionHref}
                  className="inline-flex items-center justify-center rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-200 transition hover:border-orange-400/50 hover:bg-orange-500/20"
                >
                  {planSummary.actionLabel}
                </Link>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
              <h3 className="mb-4 text-sm font-semibold text-white">Quick actions</h3>
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20">
                      <AlertCircle className="h-5 w-5 text-orange-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Need help right now?</p>
                      <p className="text-xs text-slate-300">
                        Send a real-time alert to our mechanics and start a Quick Chat as soon as someone accepts.
                      </p>
                      <RequestMechanicButton className="mt-3" />
                    </div>
                  </div>
                </div>

                <Link
                  href="/customer/schedule"
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
                    <Calendar className="h-5 w-5 text-purple-300" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">Manage bookings</p>
                    <p className="text-xs text-slate-300">Reschedule or cancel an upcoming session.</p>
                  </div>
                </Link>
              </div>
            </section>

            {vehicleInfo && Object.keys(vehicleInfo).length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
                <h3 className="mb-3 text-sm font-semibold text-white">Your vehicle</h3>
                <div className="space-y-2 text-sm text-slate-300">
                  {vehicleInfo.make && <p><strong className="text-white">Make:</strong> {vehicleInfo.make}</p>}
                  {vehicleInfo.model && <p><strong className="text-white">Model:</strong> {vehicleInfo.model}</p>}
                  {vehicleInfo.year && <p><strong className="text-white">Year:</strong> {vehicleInfo.year}</p>}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-orange-400/30 bg-orange-500/10 p-6 shadow-sm backdrop-blur">
              <h3 className="mb-2 text-sm font-semibold text-orange-200">Need help?</h3>
              <p className="text-sm text-orange-300">
                Contact our support team if you have any questions or issues.
              </p>
              <a
                href="mailto:support@askautodoctor.com"
                className="mt-3 inline-block text-sm font-semibold text-orange-400 hover:text-orange-300"
              >
                support@askautodoctor.com Ã¢â€ â€™
              </a>
            </section>
          </aside>
        </div>

        <section className="mt-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">My uploads</h2>
              <p className="text-sm text-slate-300">Share photos, PDFs, or scan reports before your session so your mechanic can prepare.</p>
            </div>
            {upcomingSessions.length > 0 && (
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Files sync instantly with your mechanic
              </span>
            )}
          </div>

          {upcomingSessions.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300 backdrop-blur">
              Upload slots will appear here once you schedule a session. Ready to get started?{' '}
              <Link href="/customer/schedule" className="font-semibold text-orange-400 hover:text-orange-300">
                Schedule a session
              </Link>
              .
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {upcomingSessions.map((session) => (
                <SessionFileManager
                  key={session.id}
                  sessionId={session.id}
                  sessionLabel={uploadLabel(session)}
                  allowUpload
                  initialFiles={session.files}
                  currentUserId={user.id}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function sessionSortValue(session: CustomerDashboardSession, fallbackToCreated = false): number {
  const reference =
    session.scheduledStart ??
    session.startedAt ??
    session.endedAt ??
    (fallbackToCreated ? session.createdAt : null) ??
    session.createdAt

  return reference ? new Date(reference).getTime() : 0
}

function formatSessionDate(value: string | null): string {
  if (!value) {
    return 'Scheduled time to be confirmed'
  }

  return new Date(value).toLocaleString()
}

function uploadLabel(session: CustomerDashboardSession): string {
  if (session.scheduledStart) {
    return `${session.planLabel} - ${new Date(session.scheduledStart).toLocaleString()}`
  }

  return `${session.planLabel} - Requested ${new Date(session.createdAt).toLocaleString()}`
}

function initials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return 'U'
  const parts = trimmed.split(' ')
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
}

type PlanSummary = {
  headline: string
  description: string
  actionLabel: string
  actionHref: string
  badge: string
  billingDetail?: string | null
  checkoutHref?: string | null
  checkoutLabel?: string | null
}

const PRICE_FORMATTER = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
})

function resolvePlanKey(plan: string | null): PlanKey | null {
  if (!plan || plan === 'free') {
    return null
  }
  const direct = (['chat10', 'video15', 'diagnostic'] as PlanKey[]).includes(plan as PlanKey)
  if (direct) {
    return plan as PlanKey
  }
  return PLAN_ALIASES[plan] ?? null
}

function getPlanSummary(plan: string | null, status: string | null, upcomingCount: number): PlanSummary {
  const planKey = resolvePlanKey(plan)
  const intakePlanParam = encodeURIComponent(plan ?? planKey ?? 'free')
  const checkoutHref = `/intake?plan=${intakePlanParam}`
  const price = planKey ? PRICE_FORMATTER.format(PRICING[planKey].priceCents / 100) : null

  if (!plan) {
    return {
      headline: 'No active plan selected',
      description: 'Choose a plan to schedule your first session and unlock live support.',
      actionLabel: 'Pick a plan',
      actionHref: '/onboarding/pricing',
      badge: 'No plan',
    }
  }

  if (plan === 'free' || status === 'trial') {
    return {
      headline: 'Complimentary session',
      description:
        'You can launch your complimentary chat right away. Upgrade to a standard or diagnostic plan afterward to keep priority access.',
      actionLabel: 'View upgrade options',
      actionHref: '/onboarding/pricing',
      badge: 'Trial access',
      billingDetail: 'No payment is required for complimentary access.',
      checkoutHref,
      checkoutLabel: 'Start complimentary session',
    }
  }

  const label = PLAN_LABELS[plan] ?? (planKey ? PLAN_LABELS[planKey] ?? plan : plan)
  const description =
    upcomingCount > 0
      ? `You have ${upcomingCount} upcoming session${upcomingCount === 1 ? '' : 's'}. Adjust or add more at any time.`
      : 'Your next step is the intake form. Share your vehicle details so we can prep your live session.'

  return {
    headline: label,
    description,
    actionLabel: 'Change or upgrade plan',
    actionHref: '/onboarding/pricing',
    badge: label,
    billingDetail: price ? `${label} is billed at ${price} once checkout is complete.` : null,
    checkoutHref,
    checkoutLabel: 'Continue',
  }
}

function isJoinable(session: CustomerDashboardSession, referenceDate = new Date()): boolean {
  const status = session.status.toLowerCase()
  if (['live', 'waiting'].includes(status)) {
    return true
  }

  const scheduledStart = session.scheduledStart ? new Date(session.scheduledStart).getTime() : null
  const scheduledEnd = session.scheduledEnd ? new Date(session.scheduledEnd).getTime() : null
  if (!scheduledStart) {
    return false
  }

  const now = referenceDate.getTime()
  const windowMs = JOIN_WINDOW_MINUTES * 60 * 1000
  return now >= scheduledStart - windowMs && (scheduledEnd === null || now <= scheduledEnd + windowMs)
}

function UpcomingSessionCard({ session }: { session: CustomerDashboardSession }) {
  const joinRoute = session.type === 'chat' ? `/chat/${session.id}` : `/video/${session.id}`
  const joinable = isJoinable(session)
  const scheduledText = session.scheduledStart
    ? `Scheduled for ${new Date(session.scheduledStart).toLocaleString()}`
    : `Requested on ${new Date(session.createdAt).toLocaleString()}`

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-white">{session.planLabel}</p>
        <p className="text-xs text-slate-400">{scheduledText}</p>
        {session.mechanicName && (
          <p className="text-xs text-slate-400">Assigned mechanic: {session.mechanicName}</p>
        )}
        <p className="text-xs text-slate-400">Status: {session.status}</p>
      </div>
      {joinable ? (
        <Link
          href={joinRoute}
          className="inline-flex items-center justify-center rounded-full bg-orange-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-700"
        >
          Join session
        </Link>
      ) : (
        <span className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-slate-400">
          Join available {JOIN_WINDOW_MINUTES} min before
        </span>
      )}
    </div>
  )
}
