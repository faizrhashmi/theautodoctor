import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'
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

export const dynamic = 'force-dynamic'

const PLAN_LABELS: Record<string, string> = {
  chat10: 'Quick Chat (30 min)',
  video15: 'Standard Video (45 min)',
  diagnostic: 'Full Diagnostic (60 min)',
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, vehicle_info, email_verified, preferred_plan, account_status')
    .eq('id', user.id)
    .maybeSingle()

  if (user.email_confirmed_at && !profile?.preferred_plan) {
    redirect('/onboarding/pricing')
  }

  const { data: sessionParticipants } = await supabase
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

  const sessions = (sessionParticipants ?? [])
    .map((row) => row.sessions)
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
      fileRows = filesData ?? []
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
      relatedProfiles = profilesData ?? []
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
              <span className="text-lg font-semibold text-white">{initials(profile?.full_name ?? user.email ?? 'Customer')}</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">
                {profile?.full_name ? `Hi, ${profile.full_name}` : 'Customer Dashboard'}
              </h1>
              <p className="text-xs text-slate-600">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 sm:block">
              {planSummary.badge ?? planSummary.headline}
            </div>
            <Link
              href="/pricing"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              New Service
            </Link>
            <form action="/api/customer/logout" method="POST">
              <button type="submit" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {profile?.email_verified === false && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Please verify your email address before joining a session. Check your inbox for a confirmation link or request a new
            one from the login page.
          </div>
        )}

        <div className="mb-6 flex">
          <MechanicPresenceIndicator
            variant="light"
            loadingText="Checking live mechanic availability…"
            zeroText="Our mechanics are currently offline. We'll let you know as soon as someone is live."
            formatOnlineText={(count) => `🟢 ${count} mechanic${count === 1 ? '' : 's'} available to help right now`}
            className="flex w-full items-center justify-center sm:w-auto sm:justify-start"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Upcoming session</h2>
              {nextSession ? (
                <SessionJoinCard session={nextSession} />
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">No sessions scheduled</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Book a chat or video consultation to connect with our certified mechanics.
                  </p>
                  <div className="mt-4 flex justify-center gap-3">
                    <Link
                      href="/pricing"
                      className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Browse plans
                    </Link>
                    <Link
                      href="/customer/schedule"
                      className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                    >
                      Schedule later
                    </Link>
                  </div>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">More upcoming sessions</h2>
                {queuedSessions.length > 0 && (
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {queuedSessions.length} waiting
                  </span>
                )}
              </div>
              {queuedSessions.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">We&apos;ll list additional bookings here once you have more sessions.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {queuedSessions.map((session) => (
                    <UpcomingSessionCard key={session.id} session={session} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Session history</h2>
              {pastSessions.length === 0 ? (
                <p className="text-sm text-slate-500">You haven&apos;t completed any sessions yet. Completed sessions will appear here.</p>
              ) : (
                <div className="space-y-3">
                  {pastSessions.slice(0, 6).map((session) => (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{session.planLabel}</p>
                          <p className="text-xs text-slate-500">
                            {session.typeLabel}
                            {session.mechanicName ? ` · ${session.mechanicName}` : ''}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatSessionDate(session.endedAt ?? session.startedAt ?? session.createdAt)}
                          </p>
                        </div>
                        <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
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
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Plan &amp; billing</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{planSummary.headline}</h3>
              <p className="mt-2 text-sm text-slate-600">{planSummary.description}</p>
              <p className="mt-4 text-xs text-slate-500">
                Upcoming sessions: {upcomingSessions.length} · Completed: {pastSessions.length}
              </p>
              <Link
                href={planSummary.actionHref}
                className="mt-4 inline-flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
              >
                {planSummary.actionLabel}
              </Link>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">Quick actions</h3>
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                      <span className="text-lg">⚡</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">Need help right now?</p>
                      <p className="text-xs text-slate-600">
                        Send a real-time alert to our mechanics and start a Quick Chat as soon as someone accepts.
                      </p>
                      <RequestMechanicButton className="mt-3" />
                    </div>
                  </div>
                </div>

                <Link
                  href="/customer/schedule"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                    <span className="text-base text-purple-600">📅</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Manage bookings</p>
                    <p className="text-xs text-slate-600">Reschedule or cancel an upcoming session.</p>
                  </div>
                </Link>

                <Link
                  href="/intake"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <span className="text-base text-green-600">📝</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Start a new intake</p>
                    <p className="text-xs text-slate-600">Tell us about a new issue and we&apos;ll match you with a mechanic.</p>
                  </div>
                </Link>
              </div>
            </section>

            {vehicleInfo && Object.keys(vehicleInfo).length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Your vehicle</h3>
                <div className="space-y-2 text-sm text-slate-600">
                  {vehicleInfo.make && <p><strong>Make:</strong> {vehicleInfo.make}</p>}
                  {vehicleInfo.model && <p><strong>Model:</strong> {vehicleInfo.model}</p>}
                  {vehicleInfo.year && <p><strong>Year:</strong> {vehicleInfo.year}</p>}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-blue-50 p-6 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-blue-900">Need help?</h3>
              <p className="text-sm text-blue-700">
                Contact our support team if you have any questions or issues.
              </p>
              <a
                href="mailto:support@askautodoctor.com"
                className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                support@askautodoctor.com →
              </a>
            </section>
          </aside>
        </div>

        <section className="mt-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">My uploads</h2>
              <p className="text-sm text-slate-600">Share photos, PDFs, or scan reports before your session so your mechanic can prepare.</p>
            </div>
            {upcomingSessions.length > 0 && (
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Files sync instantly with your mechanic
              </span>
            )}
          </div>

          {upcomingSessions.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Upload slots will appear here once you schedule a session. Ready to get started?{' '}
              <Link href="/pricing" className="font-semibold text-blue-600 hover:text-blue-800">
                Choose a plan
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
    return `${session.planLabel} • ${new Date(session.scheduledStart).toLocaleString()}`
  }

  return `${session.planLabel} • Requested ${new Date(session.createdAt).toLocaleString()}`
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

function getPlanSummary(plan: string | null, status: string | null, upcomingCount: number) {
  if (!plan) {
    return {
      headline: 'No active plan selected',
      description: 'Choose a plan to schedule your first session and unlock live support.',
      actionLabel: 'Pick a plan',
      actionHref: '/pricing',
      badge: 'No plan',
    }
  }

  if (plan === 'free' || status === 'trial') {
    return {
      headline: 'Complimentary session',
      description:
        'Enjoy your one-time session on us. Upgrade to a standard or diagnostic plan to keep priority access after it ends.',
      actionLabel: 'View upgrade options',
      actionHref: '/pricing',
      badge: 'Trial access',
    }
  }

  const label = PLAN_LABELS[plan] ?? plan
  const description =
    upcomingCount > 0
      ? `You have ${upcomingCount} upcoming session${upcomingCount === 1 ? '' : 's'}. Adjust or add more at any time.`
      : 'Book your next session when you are ready—we keep your plan on standby.'

  return {
    headline: label,
    description,
    actionLabel: 'Change or upgrade plan',
    actionHref: '/pricing',
    badge: label,
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
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-900">{session.planLabel}</p>
        <p className="text-xs text-slate-500">{scheduledText}</p>
        {session.mechanicName && (
          <p className="text-xs text-slate-500">Assigned mechanic: {session.mechanicName}</p>
        )}
        <p className="text-xs text-slate-500">Status: {session.status}</p>
      </div>
      {joinable ? (
        <Link
          href={joinRoute}
          className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          Join session
        </Link>
      ) : (
        <span className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500">
          Join available {JOIN_WINDOW_MINUTES} min before
        </span>
      )}
    </div>
  )
}
