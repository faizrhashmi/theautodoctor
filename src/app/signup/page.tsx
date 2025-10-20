import { redirect } from 'next/navigation';
import SignupGate from './SignupGate';
import OnboardingFlow from './OnboardingFlow';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface SignupPageProps {
  searchParams?: {
    redirect?: string | string[];
  };
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectParam = searchParams?.redirect;
  const rawRedirect = typeof redirectParam === 'string' ? redirectParam : null;
  const redirectTo = rawRedirect && rawRedirect.startsWith('/') ? rawRedirect : null;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Unified signup hub
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-slate-900">
              Create your account or continue with a social login
            </h1>
            <p className="mt-3 text-slate-600">
              AskAutoDoctor connects you with certified mechanics for diagnostics and inspections across Ontario. Use one
              secure page to create your account, verify your email, and unlock live booking options.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li>• Sign up with email and password or continue with Google, Facebook, or Apple</li>
              <li>• Verified email required before selecting your pricing package</li>
              <li>• Live availability updates once your account is confirmed</li>
            </ul>
            <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold">Verified customers get priority access</p>
              <p className="mt-1">
                Confirm your email after signup and you will be redirected to choose the session that fits your vehicle issue.
              </p>
            </div>
          </div>
          <SignupGate redirectTo={redirectTo} />
        </div>
      </div>
    );
  }

  if (!user.email_confirmed_at) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Check your inbox to verify</h1>
          <p className="mt-4 text-sm text-slate-600">
            We sent a verification link to <span className="font-semibold">{user.email}</span>. Confirm your email and then
            reopen this page to select your plan and finish booking.
          </p>
          <p className="mt-4 text-sm text-slate-600">
            Need a new link? Open the original email or contact
            <a href="mailto:support@askautodoctor.com" className="ml-1 text-blue-600 hover:underline">
              support@askautodoctor.com
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_plan, last_selected_slot, full_name, phone, vehicle_hint')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.preferred_plan) {
    redirect('/onboarding/pricing');
  }

  if (profile.preferred_plan === 'free') {
    redirect('/customer/dashboard');
  }

  return (
    <OnboardingFlow
      email={user.email ?? ''}
      initialPlan={profile?.preferred_plan ?? null}
      initialSlot={profile?.last_selected_slot ?? null}
      initialFullName={profile?.full_name ?? null}
      initialPhone={profile?.phone ?? null}
      initialVehicle={profile?.vehicle_hint ?? null}
    />
  );
}
