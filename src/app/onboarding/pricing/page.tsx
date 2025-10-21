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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-amber-950/50 to-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-32 -left-24 h-64 w-64 rounded-full bg-amber-500/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-orange-500/30 blur-[120px]" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-5 py-16 sm:px-8 lg:px-12">
        <header className="space-y-6">
          <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-amber-200">
            Choose your plan
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Finish onboarding by selecting{' '}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500">
                the session tier that fits you
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-orange-100/80">
              Unlock live access to certified mechanics. Pick the option that matches the depth of help you need - you can upgrade later before booking.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-orange-200/90">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-300" />
              Change or upgrade your plan any time inside the dashboard.
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-2">
              Billing is secured through Stripe - Cancel or switch tiers whenever you like.
            </div>
          </div>
        </header>

        <PlanSelectionClient displayName={displayName} />
      </div>
    </div>
  );
}






