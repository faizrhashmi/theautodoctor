import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CustomerDashboardPage() {
  const supabase = getSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/customer/login?redirect=/customer/dashboard')
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, vehicle_info, email_verified, preferred_plan')
    .eq('id', user.id)
    .single()

  if (user.email_confirmed_at && !profile?.preferred_plan) {
    redirect('/onboarding/pricing')
  }

  // Get user's sessions (chat/video)
  const { data: sessionParticipants } = await supabase
    .from('session_participants')
    .select(`
      session_id,
      sessions (
        id,
        created_at,
        type,
        plan,
        status,
        intake_id
      )
    `)
    .eq('user_id', user.id)
    .eq('role', 'customer')

  const sessions = (sessionParticipants || [])
    .map((p: any) => p.sessions)
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const activeSessions = sessions.filter((s: any) => s.status !== 'completed')
  const pastSessions = sessions.filter((s: any) => s.status === 'completed')

  // Get user's intakes
  const { data: intakes } = await supabase
    .from('intakes')
    .select('id, created_at, status, summary')
    .or(`customer_email.eq.${user.email}`)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">
                {profile?.full_name || 'Customer Dashboard'}
              </h1>
              <p className="text-xs text-slate-600">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              New Service
            </Link>
            <form action="/api/customer/logout" method="POST">
              <button
                type="submit"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Active Sessions */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Active Sessions</h2>
              {activeSessions.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">No active sessions</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Start a new service to chat or video call with a mechanic
                  </p>
                  <Link
                    href="/pricing"
                    className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Browse Services
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeSessions.map((session: any) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              )}
            </section>

            {/* Past Sessions */}
            {pastSessions.length > 0 && (
              <section>
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Past Sessions</h2>
                <div className="space-y-3">
                  {pastSessions.slice(0, 5).map((session: any) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          session.type === 'chat' ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          {session.type === 'chat' ? '💬' : '📹'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {session.plan === 'chat10'
                              ? 'Quick Chat (30 min chat)'
                              : session.plan === 'video15'
                              ? 'Standard Video (45 min)'
                              : 'Full Diagnostic (60 min)'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(session.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Completed
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/pricing"
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">New Service</p>
                    <p className="text-xs text-slate-600">Chat or video call</p>
                  </div>
                </Link>

                <Link
                  href="/intake"
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Start Intake</p>
                    <p className="text-xs text-slate-600">Tell us about your issue</p>
                  </div>
                </Link>
              </div>
            </section>

            {/* Vehicle Info */}
            {profile?.vehicle_info && Object.keys(profile.vehicle_info).length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Your Vehicle</h3>
                <div className="space-y-2 text-sm text-slate-600">
                  {(profile.vehicle_info as any).make && (
                    <p><strong>Make:</strong> {(profile.vehicle_info as any).make}</p>
                  )}
                  {(profile.vehicle_info as any).model && (
                    <p><strong>Model:</strong> {(profile.vehicle_info as any).model}</p>
                  )}
                  {(profile.vehicle_info as any).year && (
                    <p><strong>Year:</strong> {(profile.vehicle_info as any).year}</p>
                  )}
                </div>
              </section>
            )}

            {/* Help */}
            <section className="rounded-2xl border border-slate-200 bg-blue-50 p-6">
              <h3 className="mb-2 text-sm font-semibold text-blue-900">Need Help?</h3>
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
          </div>
        </div>
      </main>
    </div>
  )
}

function SessionCard({ session }: { session: any }) {
  const route = session.type === 'chat' ? `/chat/${session.id}` : `/video/${session.id}`
  const typeColor = session.type === 'chat' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
  const planName =
    session.plan === 'chat10'
      ? 'Quick Chat (30 min chat)'
      : session.plan === 'video15'
      ? 'Standard Video (45 min)'
      : 'Full Diagnostic (60 min)'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${typeColor}`}>
          {session.type === 'chat' ? '💬' : '📹'} {planName}
        </span>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
          {session.status || 'pending'}
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Started {new Date(session.created_at).toLocaleString()}
      </p>

      <Link
        href={route}
        className="mt-4 block rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
      >
        {session.type === 'chat' ? 'Open Chat' : 'Join Video Call'}
      </Link>
    </div>
  )
}
