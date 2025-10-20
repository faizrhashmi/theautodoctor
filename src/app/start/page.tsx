import { getSupabaseServer } from "@/lib/supabaseServer";
import SignupGate from "./SignupGate";
import OnboardingFlow from "./OnboardingFlow";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Get matched with a certified mechanic in minutes</h1>
            <p className="mt-3 text-slate-600">
              Create an account or sign in with Google to save your vehicle details, book a consultation, and access live support.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li>- Secure sign-in with email or Google</li>
              <li>- Choose the session that fits your needs</li>
              <li>- See real-time mechanic availability before you begin</li>
            </ul>
            <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Mechanics standing by</p>
              <p className="mt-1">Live availability refreshes every few minutes. Sign up to see who is online right now.</p>
            </div>
          </div>
          <SignupGate />
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_plan, last_selected_slot, full_name, phone, vehicle_hint")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <OnboardingFlow
      email={user.email ?? ""}
      initialPlan={profile?.preferred_plan ?? null}
      initialSlot={profile?.last_selected_slot ?? null}
      initialFullName={profile?.full_name ?? null}
      initialPhone={profile?.phone ?? null}
      initialVehicle={profile?.vehicle_hint ?? null}
    />
  );
}
