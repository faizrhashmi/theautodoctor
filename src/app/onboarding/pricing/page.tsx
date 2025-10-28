import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import PlanSelectionClient from './PlanSelectionClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function PricingSelectionPage() {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signup');
  }

  if (!user.email_confirmed_at) {
    redirect('/signup');
  }

  // Check for active sessions - users cannot change plans with active sessions
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: activeSessions } = await supabaseAdmin
    .from('sessions')
    .select('id, status, type, created_at')
    .eq('customer_user_id', user.id)
    .in('status', ['pending', 'waiting', 'live', 'scheduled'])
    .gte('created_at', twentyFourHoursAgo)
    .order('created_at', { ascending: false });

  const hasActiveSessions = Boolean(activeSessions && activeSessions.length > 0);
  const activeSessionsData = activeSessions || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-white/10 bg-white/5 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-white">Book a Session</h1>
          <div className="flex items-center gap-4">
            <a
              href="/customer/dashboard"
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Dashboard
            </a>
            <form action="/api/customer/logout" method="POST">
              <button
                type="submit"
                className="text-sm font-medium text-slate-300 transition hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        {hasActiveSessions && (
          <div className="mb-8 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-6 flex items-start gap-4">
            <svg className="h-6 w-6 text-amber-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-300">Session Booking Locked</h3>
              <p className="text-sm text-amber-200/90 mt-2">
                You have {activeSessionsData.length} active session{activeSessionsData.length > 1 ? 's' : ''}. Please complete or cancel your active session{activeSessionsData.length > 1 ? 's' : ''} before starting a new session.
              </p>
              <div className="mt-4 space-y-2">
                {activeSessionsData.map((session) => (
                  <div key={session.id} className="flex items-center gap-3 rounded-lg bg-amber-500/20 border border-amber-400/30 px-4 py-2 text-sm">
                    <div className="flex-1">
                      <span className="font-semibold text-amber-200">
                        {session.type === 'chat' ? 'Chat' : session.type === 'video' ? 'Video' : 'Diagnostic'} Session
                      </span>
                      <span className="text-amber-300/80"> • Status: {session.status}</span>
                    </div>
                    <a
                      href={session.type === 'chat' ? `/chat/${session.id}` : `/video/${session.id}`}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
                    >
                      Go to session
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange-300">
            Select Session Type
          </div>
          <h2 className="text-4xl font-bold text-white md:text-5xl">
            Choose the Right Session
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-orange-500">
              For Your Vehicle
            </span>
          </h2>
          <p className="mt-6 text-lg text-slate-300 max-w-3xl mx-auto">
            Connect with certified mechanics instantly. One-time payment per session - no subscriptions or recurring charges.
          </p>
          {!hasActiveSessions && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-300">
                <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                Fixed price per session
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-300">
                Secure Stripe billing
              </div>
            </div>
          )}
        </div>

        <PlanSelectionClient hasActiveSessions={hasActiveSessions} />
      </main>
    </div>
  );
}






