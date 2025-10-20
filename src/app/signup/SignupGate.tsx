"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import WaiverModal from "@/components/customer/WaiverModal";

type Mode = "signup" | "login";

type SignupFormState = {
  fullName: string;
  phone: string;
  vehicle: string;
  dateOfBirth: string;
  consent: boolean;
};

const EMPTY_FORM: SignupFormState = {
  fullName: "",
  phone: "",
  vehicle: "",
  dateOfBirth: "",
  consent: false,
};

function isAdult(value: string): boolean {
  if (!value) return false;
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 18;
}

interface SignupGateProps {
  redirectTo?: string | null;
}

export default function SignupGate({ redirectTo }: SignupGateProps) {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [form, setForm] = useState<SignupFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [publicAvailability, setPublicAvailability] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWaiver, setShowWaiver] = useState(false);
  const [waiverAccepted, setWaiverAccepted] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const redirectURL = useMemo(() => {
    try {
      const url = new URL("/auth/confirm", origin);
      if (redirectTo) {
        url.searchParams.set("next", redirectTo);
      }
      return url.toString();
    } catch (error) {
      return `${origin}/auth/confirm`;
    }
  }, [origin, redirectTo]);

  const formIsValid = useMemo(() => {
    if (!form.fullName.trim()) return false;
    if (!form.phone.trim()) return false;
    if (!isAdult(form.dateOfBirth)) return false;
    if (!waiverAccepted) return false;
    return true;
  }, [form, waiverAccepted]);

  useEffect(() => {
    setError(null);
    setMessage(null);
    setPublicAvailability(null);
  }, [mode]);

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formIsValid) {
      setError("Please complete all required fields, confirm you are 18 or older, and accept the Terms of Service.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "customer",
          full_name: form.fullName.trim(),
          phone: form.phone.trim(),
          vehicle_hint: form.vehicle.trim(),
          date_of_birth: form.dateOfBirth,
        },
        emailRedirectTo: redirectURL,
      },
    });

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setMessage("Check your inbox to confirm your email. After confirming, return here to log in.");
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (data?.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      setError("Please confirm your email before logging in.");
      setLoading(false);
      return;
    }

    if (redirectTo) {
      router.replace(redirectTo);
    } else {
      router.replace("/customer/dashboard");
    }
    setLoading(false);
  }

  async function handleOAuth(provider: "google" | "facebook" | "apple") {
    setError(null);
    setMessage(null);
    setLoading(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectURL },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  const oauthButtons: Array<{ id: "google" | "facebook" | "apple"; label: string }> = [
    { id: "google", label: "Continue with Google" },
    { id: "facebook", label: "Continue with Facebook" },
    { id: "apple", label: "Continue with Apple" },
  ];

  async function handlePublicAvailability() {
    setCheckingAvailability(true);
    setPublicAvailability(null);
    try {
      const res = await fetch("/api/mechanics/availability");
      if (!res.ok) throw new Error("Unable to check availability");
      const data = await res.json();
      if (typeof data.mechanicsOnline === "number") {
        setPublicAvailability(`Mechanics online right now: ${data.mechanicsOnline}. Create an account to see who is available.`);
      } else {
        setPublicAvailability("Create an account to see live availability.");
      }
    } catch (err: any) {
      setPublicAvailability(err?.message || "Unable to check availability. Please try again later.");
    } finally {
      setCheckingAvailability(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
            mode === "signup" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
          }`}
          type="button"
        >
          Sign up
        </button>
        <button
          onClick={() => setMode("login")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
            mode === "login" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
          }`}
          type="button"
        >
          Log in
        </button>
      </div>

      <form onSubmit={mode === "signup" ? handleSignup : handleLogin} className="space-y-4">
        {mode === "signup" && (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600">Full name</label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Phone number</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g. 416-555-0123"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Date of birth</label>
              <input
                type="date"
                required
                value={form.dateOfBirth}
                onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-slate-500">You must be 18 or older to use AskAutoDoctor.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Vehicle (optional)</label>
              <input
                type="text"
                value={form.vehicle}
                onChange={(e) => setForm((prev) => ({ ...prev, vehicle: e.target.value }))}
                placeholder="Year / Make / Model"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-600">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {mode === "signup" && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs text-blue-900">
              {waiverAccepted ? (
                <span className="font-semibold">✓ Terms of Service & Waiver accepted (18+)</span>
              ) : (
                <span>You must review and accept our Terms of Service & Waiver (18+)</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setShowWaiver(true)}
              className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              {waiverAccepted ? "Review Terms Again" : "Review & Accept Terms (Required)"}
            </button>
          </div>
        )}
        <button
          type="submit"
          disabled={loading || (mode === "signup" && !formIsValid)}
          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Processing..." : mode === "signup" ? "Create account" : "Log in"}
        </button>
      </form>

      <div className="mt-4 space-y-3">
        {oauthButtons.map((button) => (
          <button
            key={button.id}
            onClick={() => handleOAuth(button.id)}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <span>{button.label}</span>
          </button>
        ))}
        <button
          onClick={handlePublicAvailability}
          disabled={checkingAvailability}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          {checkingAvailability ? "Checking availability..." : "See how many mechanics are online"}
        </button>
      </div>

      {publicAvailability && <p className="mt-4 text-xs text-slate-500">{publicAvailability}</p>}
      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      {message && <p className="mt-4 text-sm text-emerald-600">{message}</p>}

      <p className="mt-6 text-xs text-slate-500">
        We will email you a confirmation link. You must verify your email before selecting a session.
      </p>

      <WaiverModal
        isOpen={showWaiver}
        onAccept={() => {
          setWaiverAccepted(true);
          setShowWaiver(false);
        }}
        onDecline={() => {
          setWaiverAccepted(false);
          setShowWaiver(false);
        }}
      />
    </div>
  );
}
