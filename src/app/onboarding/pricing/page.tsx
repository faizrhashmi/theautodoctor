import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_plan, full_name')
    .eq('id', user.id)
    .maybeSingle();

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email || 'User';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-white/10 bg-white/5 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-white">Choose Your Plan</h1>
          <a
            href="/customer/dashboard"
            className="text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Back to Dashboard
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange-300">
            Select Your Plan
          </div>
          <h2 className="text-4xl font-bold text-white md:text-5xl">
            Choose the Right Session
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-orange-500">
              For Your Vehicle
            </span>
          </h2>
          <p className="mt-6 text-lg text-slate-300 max-w-3xl mx-auto">
            Connect with certified mechanics instantly. Select the plan that matches your needs - you can upgrade anytime.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-300">
              <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
              Change plans anytime
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-300">
              Secure Stripe billing
            </div>
          </div>
        </div>

        <PlanSelectionClient displayName={displayName} />
      </main>
    </div>
  );
}






