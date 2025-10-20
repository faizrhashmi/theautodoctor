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
    .select('preferred_plan')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.preferred_plan) {
    redirect('/signup');
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
        <header className="text-white">
          <span className="inline-flex items-center rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">
            Choose your plan
          </span>
          <h1 className="mt-6 text-4xl font-semibold text-white">Finish onboarding by selecting a session tier</h1>
          <p className="mt-4 max-w-3xl text-sm text-slate-300">
            Unlock live access to certified mechanics. Pick the option that matches the depth of help you need—you can upgrade later before booking.
          </p>
        </header>

        <PlanSelectionClient email={user.email ?? ''} />
      </div>
    </div>
  );
}
