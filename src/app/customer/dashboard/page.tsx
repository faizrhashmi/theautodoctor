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
import { AlertCircle, Calendar, ClipboardList, Star } from 'lucide-react'
import ActiveSessionsManager from '@/components/customer/ActiveSessionsManager'
import SessionManagement from '@/components/customer/SessionManagement'

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
        status
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
      // Removed mechanic_id mapping as it may not exist in all database schemas
      // ...sessions
      //   .map((session) => session.mechanic_id)
      //   .filter((value): value is string => Boolean(value)),
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
    scheduledStart: session.created_at,
    scheduledEnd: null,
    startedAt: session.created_at,
    endedAt: null,
    mechanicId: null, // Mechanic ID may not be available in all database schemas
    mechanicName: null, // Mechanic name will be null if mechanic_id doesn't exist
    files: filesBySession.get(session.id) ?? [],
  }))

  const upcomingSessions = normalizedSessions
    .filter((session) => !['completed', 'cancelled'].includes(session.status.toLowerCase()))
    .sort((a, b) => sessionSortValue(a) - sessionSortValue(b))

  // Separate active/in-progress sessions from scheduled ones
  const activeSessions = upcomingSessions.filter((session) =>
    ['live', 'waiting'].includes(session.status.toLowerCase())
  )
  const scheduledSessions = upcomingSessions.filter((session) =>
    ['pending', 'scheduled'].includes(session.status.toLowerCase())
  )

  // nextSession should be the first scheduled session (not active)
  const nextSession = scheduledSessions[0] ?? null
  const queuedSessions = scheduledSessions.slice(1)

  // Session history - exclude sessions already shown above (active and upcoming)
  // Show completed, canceled, and any old pending/live sessions
  const displayedSessionIds = new Set([
    ...activeSessions.map(s => s.id),
    ...scheduledSessions.map(s => s.id)
  ])

  const allSessionHistory = normalizedSessions
    .filter(session => !displayedSessionIds.has(session.id))
    .sort((a, b) => {
      const aTime = new Date(a.startedAt ?? a.createdAt).getTime()
      const bTime = new Date(b.startedAt ?? b.createdAt).getTime()
      return bTime - aTime // Most recent first
    })

  // Separate counts for better visibility
  const completedCount = normalizedSessions.filter(s => s.status.toLowerCase() === 'completed').length
  const activeCount = activeSessions.length
  const pendingCount = scheduledSessions.length
  const canceledCount = normalizedSessions.filter(s => ['cancelled', 'canceled'].includes(s.status.toLowerCase())).length

  const planSummary = getPlanSummary(profile?.preferred_plan ?? null, profile?.account_status ?? null, upcomingSessions.length)

  const vehicleInfo = (profile?.vehicle_info as Record<string, string | null> | null) ?? null

  // Fetch vehicles from the new vehicles table
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('id, make, model, year, vin, color, mileage, plate, is_primary, nickname')
    .eq('user_id', user.id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })

  if (vehiclesError) {
    console.warn('Unable to load vehicles for dashboard', vehiclesError)
  }

  const userVehicles = vehicles ?? []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Modern Header with Gradient */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="group relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30 transition-all hover:scale-105 hover:shadow-orange-500/50">
              <span className="text-xl font-bold text-white">{initials(profile?.full_name ?? user.email ?? 'Customer')}</span>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                {profile?.full_name ? `Welcome back, ${profile.full_name.split(' ')[0]}!` : 'Dashboard'}
              </h1>
              <p className="text-sm text-slate-400">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden rounded-xl border border-orange-400/30 bg-gradient-to-br from-orange-500/20 to-orange-600/20 px-4 py-2 shadow-lg backdrop-blur-sm sm:block">
              <p className="text-xs font-medium text-orange-300">{planSummary.badge ?? planSummary.headline}</p>
            </div>
            <form action="/api/customer/logout" method="POST">
              <button type="submit" className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition-all hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300">
                <svg className="h-4 w-4 transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Email Verification Alert */}
        {!user.email_confirmed_at && profile?.email_verified === false && (
          <div className="group relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 p-5 shadow-lg backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                <svg className="h-5 w-5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-200">Email Verification Required</h3>
                <p className="mt-1 text-sm text-amber-200/80">
                  Please verify your email address before joining a session. Check your inbox for a confirmation link.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mechanic Presence - Modern Card */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
          <MechanicPresenceIndicator
            variant="dark"
            loadingText="Checking live mechanic availability..."
            zeroText="Our mechanics are currently offline. We'll let you know as soon as someone is live."
            className="flex w-full items-center justify-center sm:w-auto sm:justify-start"
          />
        </div>

        {/* Main Content Grid - Dynamic ordering based on active sessions */}
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-8">
            {/* Active Sessions Management - Shows FIRST when there are active sessions */}
            {activeCount > 0 && <ActiveSessionsManager sessions={activeSessions} />}

            {/* Plan & Billing - Shows FIRST when NO active sessions, otherwise shows after Active Sessions */}
            <section className={`group rounded-2xl border p-8 shadow-2xl backdrop-blur transition ${
              activeCount > 0
                ? 'border-slate-600/30 bg-gradient-to-br from-slate-800/20 to-slate-700/10 opacity-60 cursor-not-allowed'
                : 'border-orange-400/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5 hover:border-orange-400/50'
            }`}>
              {activeCount > 0 && (
                <div className="mb-5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
                  <svg className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-300">Plan & Billing Locked</p>
                    <p className="text-xs text-amber-200/80 mt-1">
                      You have {activeCount} active session{activeCount > 1 ? 's' : ''}. Please complete or cancel your active session{activeCount > 1 ? 's' : ''} before making changes to your plan or starting a new session.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 mb-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-lg ${
                  activeCount > 0
                    ? 'bg-gradient-to-br from-slate-600 to-slate-700'
                    : 'bg-gradient-to-br from-orange-500 to-orange-600'
                }`}>
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${
                    activeCount > 0 ? 'text-slate-400' : 'text-orange-300'
                  }`}>Plan &amp; Billing</p>
                  <h3 className={`text-2xl font-bold mt-1 ${
                    activeCount > 0 ? 'text-slate-300' : 'text-white'
                  }`}>{planSummary.headline}</h3>
                </div>
              </div>

              <p className={`text-base leading-relaxed ${
                activeCount > 0 ? 'text-slate-400' : 'text-orange-50/90'
              }`}>{planSummary.description}</p>

              {planSummary.billingDetail && (
                <div className={`mt-4 rounded-xl border px-4 py-3 ${
                  activeCount > 0
                    ? 'bg-slate-700/20 border-slate-600/30'
                    : 'bg-orange-500/20 border-orange-400/30'
                }`}>
                  <p className={`text-sm font-medium ${
                    activeCount > 0 ? 'text-slate-400' : 'text-orange-100'
                  }`}>{planSummary.billingDetail}</p>
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-400/30 px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-green-300">{activeCount}</p>
                  <p className="text-xs text-green-200/80 mt-1">Active</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-400/30 px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-blue-300">{pendingCount}</p>
                  <p className="text-xs text-blue-200/80 mt-1">Pending</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-400/30 px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-purple-300">{completedCount}</p>
                  <p className="text-xs text-purple-200/80 mt-1">Completed</p>
                </div>
                {canceledCount > 0 && (
                  <div className="rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-400/30 px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-red-300">{canceledCount}</p>
                    <p className="text-xs text-red-200/80 mt-1">Canceled</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {planSummary.checkoutHref && (
                  activeCount > 0 ? (
                    <div className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-3.5 text-base font-bold text-slate-400 shadow-lg cursor-not-allowed opacity-50">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      {planSummary.checkoutLabel ?? 'Complete payment'}
                    </div>
                  ) : (
                    <Link
                      href={planSummary.checkoutHref}
                      prefetch={false}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-700 hover:to-orange-800 hover:shadow-orange-500/50"
                    >
                      {planSummary.checkoutLabel ?? 'Complete payment'}
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  )
                )}
                <div className="flex gap-3">
                  {activeCount > 0 ? (
                    <div className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-slate-600/40 bg-slate-700/20 px-4 py-3 text-sm font-semibold text-slate-500 cursor-not-allowed opacity-50">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      {planSummary.actionLabel}
                    </div>
                  ) : (
                    <Link
                      href={planSummary.actionHref}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-orange-400/40 bg-orange-500/20 px-4 py-3 text-sm font-semibold text-orange-200 transition hover:border-orange-400/60 hover:bg-orange-500/30"
                    >
                      {planSummary.actionLabel}
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                  {profile?.preferred_plan && (
                    <form action="/api/customer/clear-plan" method="POST">
                      <button
                        type="submit"
                        disabled={activeCount > 0}
                        className={`inline-flex items-center justify-center gap-1 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                          activeCount > 0
                            ? 'border-slate-600/40 bg-slate-700/20 text-slate-500 cursor-not-allowed opacity-50'
                            : 'border-white/20 bg-white/5 text-slate-300 hover:border-white/30 hover:bg-white/10 hover:text-slate-200'
                        }`}
                      >
                        Clear plan
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </section>

            {/* Active Sessions Management - Only show when NO active sessions (otherwise shown at top) */}
            {activeCount === 0 && activeSessions.length === 0 && <ActiveSessionsManager sessions={activeSessions} />}

            {/* Comprehensive Session Management with Filters */}
            <section className="space-y-5">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                  <ClipboardList className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Session Management</h2>
              </div>
              <SessionManagement sessions={normalizedSessions} userId={user.id} />
            </section>
          </div>

          <aside className="space-y-6 lg:col-span-4">
            {/* Upcoming Session - Now in sidebar */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-md">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">Next Session</h2>
              </div>
              {nextSession ? (
                <SessionJoinCard session={nextSession} />
              ) : (
                <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 p-6 text-center shadow-lg backdrop-blur transition hover:border-orange-400/30">
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl transition group-hover:bg-orange-500/20"></div>
                  <div className="relative">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-white">No upcoming sessions</h3>
                    <p className="mt-2 text-xs text-slate-300">
                      Schedule your first session to connect with our mechanics.
                    </p>
                    <Link
                      href="/customer/schedule"
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-700 hover:to-orange-800"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Schedule now
                    </Link>
                  </div>
                </div>
              )}

              {/* More Upcoming Sessions */}
              {queuedSessions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-300">Also Scheduled</h3>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-300">
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                      {queuedSessions.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {queuedSessions.slice(0, 3).map((session) => (
                      <UpcomingSessionCard key={session.id} session={session} />
                    ))}
                    {queuedSessions.length > 3 && (
                      <p className="text-xs text-center text-slate-500 pt-1">
                        +{queuedSessions.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>
            <section className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 p-6 shadow-lg backdrop-blur transition hover:border-white/20">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-white">Your Vehicles</h3>
                </div>
                <Link
                  href="/customer/vehicles"
                  className="inline-flex items-center gap-1 rounded-full bg-orange-600/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600"
                >
                  {userVehicles.length > 0 ? 'Manage' : 'Add vehicle'}
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              {userVehicles.length > 0 ? (
                <div className="space-y-3">
                  {userVehicles.slice(0, 3).map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="group/vehicle rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 text-sm transition hover:border-white/20 hover:bg-white/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-1 gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 shadow-md">
                            <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {vehicle.is_primary && (
                                <Star className="h-3.5 w-3.5 flex-shrink-0 fill-orange-400 text-orange-400" />
                              )}
                              <p className="font-semibold text-white truncate">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </p>
                            </div>
                            {vehicle.nickname && (
                              <p className="text-xs text-slate-400 mt-1">{vehicle.nickname}</p>
                            )}
                            <div className="mt-2 space-y-0.5 text-xs text-slate-400">
                              {vehicle.color && <p>Color: {vehicle.color}</p>}
                              {vehicle.mileage && <p>Mileage: {vehicle.mileage}</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {userVehicles.length > 3 && (
                    <p className="text-xs text-center text-slate-500 pt-2">
                      +{userVehicles.length - 3} more vehicle{userVehicles.length - 3 !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-6 text-center">
                  <svg className="mx-auto h-10 w-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <p className="mt-3 text-sm text-slate-400">
                    No vehicle added yet. Add your vehicle information to help mechanics prepare for your session.
                  </p>
                </div>
              )}
            </section>

            {/* Quick Actions - Need Help */}
            <section className="group rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-6 shadow-lg backdrop-blur transition hover:border-orange-400/50">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-md">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white">Need help now?</h3>
                  <p className="mt-2 text-sm text-orange-100/90">
                    Alert our mechanics instantly or email us at{' '}
                    <a
                      href="mailto:support@askautodoctor.com"
                      className="font-semibold text-orange-300 hover:text-orange-200 transition underline decoration-orange-400/50 hover:decoration-orange-300"
                    >
                      support@askautodoctor.com
                    </a>
                  </p>
                  <RequestMechanicButton className="mt-4" />
                </div>
              </div>
            </section>

          </aside>
        </div>

        <section className="mt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">My Uploads</h2>
              </div>
              <p className="text-sm text-slate-300">Share photos, PDFs, or scan reports before your session so your mechanic can prepare.</p>
            </div>
            {upcomingSessions.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1.5 text-xs font-semibold text-green-300">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-400"></span>
                Files sync instantly
              </span>
            )}
          </div>

          {upcomingSessions.length === 0 ? (
            <div className="mt-6 group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 p-8 text-center shadow-lg backdrop-blur transition hover:border-blue-400/30">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl transition group-hover:bg-blue-500/20"></div>
              <div className="relative">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm text-slate-300">
                  Upload slots will appear here once you schedule a session. Ready to get started?{' '}
                  <Link href="/customer/schedule" className="font-semibold text-orange-400 transition hover:text-orange-300">
                    Schedule a session
                  </Link>
                  .
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
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

  // No plan selected - show plan selection
  if (!plan) {
    return {
      headline: 'No active plan selected',
      description: 'Choose a plan to schedule your first session and unlock live support from our certified mechanics.',
      actionLabel: 'Pick a plan',
      actionHref: '/onboarding/pricing',
      badge: 'No plan',
    }
  }

  if (status === 'trial') {
    return {
      headline: 'Trial access',
      description:
        'You have trial access. Choose a plan to continue using our service after your trial period.',
      actionLabel: 'View plans',
      actionHref: '/onboarding/pricing',
      badge: 'Trial access',
      billingDetail: 'No payment is required during trial.',
      checkoutHref,
      checkoutLabel: 'Continue to intake',
    }
  }

  const label = PLAN_LABELS[plan] ?? (planKey ? PLAN_LABELS[planKey] ?? plan : plan)
  const description =
    upcomingCount > 0
      ? `You have ${upcomingCount} upcoming session${upcomingCount === 1 ? '' : 's'}. Adjust or add more at any time.`
      : 'Your next step is the intake form. Share your vehicle details so we can prep your live session.'

  // For free plan, show specific messaging
  const isFree = plan === 'free'

  return {
    headline: label,
    description,
    actionLabel: isFree ? 'View paid plans' : 'Change or upgrade plan',
    actionHref: '/onboarding/pricing',
    badge: label,
    billingDetail: price ? `${label} is billed at ${price} once checkout is complete.` : isFree ? 'No payment required for free sessions.' : null,
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
