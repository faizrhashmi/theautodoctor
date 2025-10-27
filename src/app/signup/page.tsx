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
    error?: string | string[];
    error_code?: string | string[];
    error_description?: string | string[];
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

  // Extract error information from query params
  const errorCode = typeof searchParams?.error_code === 'string' ? searchParams.error_code : null;
  const errorDescription = typeof searchParams?.error_description === 'string' ? searchParams.error_description : null;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-12 place-items-center lg:place-items-start lg:grid-cols-[1.2fr_1fr] lg:gap-16">
            {/* Left Side - Branding & Benefits - ORDER: Desktop 1st, Mobile 2nd */}
            <div className="flex flex-col justify-start w-full max-w-lg lg:max-w-none lg:sticky lg:top-12 order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange-300 w-fit border border-orange-500/20">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                Live Mechanic Support
              </div>

              <h1 className="mt-6 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
                Car Trouble?
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-orange-500">
                  Get Help in Minutes
                </span>
              </h1>

              <p className="mt-6 text-lg text-slate-300 leading-relaxed">
                Video call a certified mechanic instantly—no appointment, no shop visit.
              </p>

              <div className="mt-10 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Live Video Help</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Show the problem, get solutions
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Certified Experts</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Real mechanics, real answers
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">5-Min Free Trial</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Try before you buy
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 rounded-2xl border border-orange-400/20 bg-gradient-to-br from-orange-500/10 to-red-500/10 p-6 backdrop-blur">
                <div className="flex items-center gap-3">
                  <svg className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-orange-200">Money-Back Guarantee</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Not happy? Full refund. No questions asked.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Login/Signup Form - ORDER: Desktop 2nd, Mobile 1st */}
            <div className="flex flex-col items-center lg:items-start justify-center gap-4 w-full max-w-lg lg:max-w-none lg:pt-0 order-1 lg:order-2">
              {errorCode === 'otp_expired' && (
                <div className="w-full max-w-md rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-300">
                  <p className="font-semibold">Email Verification Link Expired</p>
                  <p className="mt-2 text-xs text-rose-200">
                    {errorDescription ? decodeURIComponent(errorDescription) : 'The verification link has expired. Please sign up again to receive a new confirmation email.'}
                  </p>
                </div>
              )}
              <SignupGate redirectTo={redirectTo} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user.email_confirmed_at) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4">
        <div className="max-w-lg rounded-2xl border border-white/10 bg-white/5 p-10 text-center shadow-sm backdrop-blur">
          <h1 className="text-2xl font-semibold text-white">Check your inbox to verify</h1>
          <p className="mt-4 text-sm text-slate-300">
            We sent a verification link to <span className="font-semibold text-orange-400">{user.email}</span>. Confirm your email and then
            reopen this page to select your plan and finish booking.
          </p>
          <p className="mt-4 text-sm text-slate-300">
            Need a new link? Open the original email or contact{' '}
            <a href="mailto:support@askautodoctor.com" className="text-orange-400 hover:underline">
              support@askautodoctor.com
            </a>
            .
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <form action="/api/customer/logout" method="POST" className="w-full">
              <button
                type="submit"
                className="w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-700"
              >
                Sign out and try different account
              </button>
            </form>
            <a
              href="/customer/dashboard"
              className="rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/40 hover:bg-white/5"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_plan, last_selected_slot, full_name, phone, vehicle_hint')
    .eq('id', user.id)
    .maybeSingle();

  // If user has no plan, send them to select one
  if (!profile?.preferred_plan) {
    redirect('/onboarding/pricing');
  }

  // If user has a paid plan (not free), send them to dashboard
  if (profile.preferred_plan !== 'free') {
    redirect('/customer/dashboard');
  }

  // If the user is on the free tier, allow them to continue to onboarding/pricing
  // or follow an explicit redirect query (for example when they click "Upgrade").
  if (profile.preferred_plan === 'free') {
    if (redirectTo && !redirectTo.startsWith('/signup') && !redirectTo.startsWith('/onboarding')) {
      redirect(redirectTo);
    } else {
      // No explicit redirect, send free tier users to pricing to upgrade
      redirect('/onboarding/pricing');
    }
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
