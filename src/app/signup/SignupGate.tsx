"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import WaiverModal from "@/components/customer/WaiverModal";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";

type Mode = "signup" | "login";

type SignupFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  vehicle: string;
  dateOfBirth: string;
  address: string;
  city: string;
  country: string;
};

const EMPTY_FORM: SignupFormState = {
  firstName: "",
  lastName: "",
  phone: "",
  vehicle: "",
  dateOfBirth: "",
  address: "",
  city: "",
  country: "Canada",
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

function hasOnlyLetters(value: string): boolean {
  return /^[a-zA-Z\s'-]+$/.test(value);
}

function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}

interface SignupGateProps {
  redirectTo?: string | null;
}

export default function SignupGate({ redirectTo }: SignupGateProps) {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  // Read mode from URL, default to "signup" (not "login")
  const initialMode = searchParams.get('mode') === 'login' ? 'login' : 'signup';
  const [mode, setMode] = useState<Mode>(initialMode);
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Check if user is already logged in and redirect to dashboard
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        // Only show error for specific session errors (not "no session found")
        if (sessionError && sessionError.message && !sessionError.message.includes('no session')) {
          console.log('[SignupGate] Session error:', sessionError.message);
          await supabase.auth.signOut();
          setError('Your session has expired. Please log in again.');
          return;
        }

        if (session) {
          console.log('[SignupGate] User already logged in, redirecting to dashboard');
          router.push(redirectTo || '/customer/dashboard');
        }
      } catch (err) {
        console.error('[SignupGate] Error checking session:', err);
        // Clear any invalid session data silently
        await supabase.auth.signOut();
      }
    };
    checkExistingSession();
  }, [supabase, router, redirectTo]);

  // Cleanup any stale auth data when entering login/signup page
  useEffect(() => {
    console.log('[SignupGate] Component mounted - ready for login');
  }, []);

  // Check for hash-based errors from Supabase OAuth/email confirmation
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const errorCode = params.get('error_code');
      const errorDescription = params.get('error_description');

      if (errorCode === 'otp_expired') {
        setError(errorDescription
          ? decodeURIComponent(errorDescription)
          : 'Email verification link has expired. Please sign up again to receive a new confirmation email.');
        // Clean up the URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const redirectURL = useMemo(() => {
    try {
      const url = new URL("/auth/callback", origin);
      if (redirectTo) {
        url.searchParams.set("next", redirectTo);
      }
      return url.toString();
    } catch (error) {
      return `${origin}/auth/callback`;
    }
  }, [origin, redirectTo]);

  const requiredFieldsFilled = useMemo(() => {
    if (mode === "login") return true;
    return !!(
      form.firstName.trim() &&
      form.lastName.trim() &&
      form.phone.trim() &&
      form.dateOfBirth &&
      form.address.trim() &&
      form.city.trim() &&
      form.country.trim() &&
      email.trim() &&
      password
    );
  }, [mode, form, email, password]);

  const formIsValid = useMemo(() => {
    if (mode === "login") return true;
    if (!form.firstName.trim() || !hasOnlyLetters(form.firstName)) return false;
    if (!form.lastName.trim() || !hasOnlyLetters(form.lastName)) return false;
    if (!form.phone.trim()) return false;
    if (!form.address.trim()) return false;
    if (!form.city.trim()) return false;
    if (!form.country.trim()) return false;
    if (!isAdult(form.dateOfBirth)) return false;
    if (!email.trim()) return false;
    if (!isValidPassword(password)) return false;
    if (!waiverAccepted) return false;
    return true;
  }, [mode, form, email, password, waiverAccepted]);

  useEffect(() => {
    setError(null);
    setMessage(null);
    setPublicAvailability(null);
    setFieldErrors({});
  }, [mode]);

  const validateField = (name: string, value: string) => {
    const errors: Record<string, string> = { ...fieldErrors };

    if (name === "firstName" || name === "lastName") {
      if (value && !hasOnlyLetters(value)) {
        errors[name] = "Only letters, spaces, hyphens and apostrophes allowed";
      } else {
        delete errors[name];
      }
    }

    if (name === "password") {
      if (value && !isValidPassword(value)) {
        errors[name] = "Minimum 8 characters with letters and numbers";
      } else {
        delete errors[name];
      }
    }

    if (name === "dateOfBirth") {
      if (value && !isAdult(value)) {
        errors[name] = "You must be 18 or older";
      } else {
        delete errors[name];
      }
    }

    setFieldErrors(errors);
  };

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    console.log("Form validation state:", {
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      dateOfBirth: form.dateOfBirth,
      email: email,
      password: password.length,
      waiverAccepted: waiverAccepted,
      formIsValid: formIsValid,
    });

    if (!formIsValid) {
      const validationErrors = [];
      if (!form.firstName.trim() || !hasOnlyLetters(form.firstName)) {
        validationErrors.push("First name must contain only letters");
      }
      if (!form.lastName.trim() || !hasOnlyLetters(form.lastName)) {
        validationErrors.push("Last name must contain only letters");
      }
      if (!form.phone.trim()) {
        validationErrors.push("Phone number is required");
      }
      if (!isAdult(form.dateOfBirth)) {
        validationErrors.push("You must be 18 or older");
      }
      if (!email.trim()) {
        validationErrors.push("Email is required");
      }
      if (!isValidPassword(password)) {
        validationErrors.push("Password must be at least 8 characters with letters and numbers");
      }
      if (!waiverAccepted) {
        validationErrors.push("You must accept the Terms of Service");
      }

      setError(validationErrors.join(". ") + ".");
      console.error("Validation errors:", validationErrors);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;

    console.log("Attempting signup with:", { email, fullName, phone: form.phone });

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "customer",
          account_type: "individual_customer", // Track account type for B2C/B2B2C/B2B SaaS
          source: "direct", // Track signup source (direct, workshop_referral, invitation)
          full_name: fullName,
          phone: form.phone.trim(),
          vehicle_hint: form.vehicle.trim(),
          date_of_birth: form.dateOfBirth,
          address: form.address.trim(),
          city: form.city.trim(),
          country: form.country.trim(),
        },
        emailRedirectTo: redirectURL,
      },
    });

    setLoading(false);

    console.log("Signup response:", { data, error: signUpError });

    if (signUpError) {
      setError(signUpError.message);
      console.error("Signup error:", signUpError);
      return;
    }

    setMessage("✓ Account created! Check your inbox to confirm your email. After confirming, you'll be redirected to the customer dashboard.");
    console.log("Signup successful! User should check email.");
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    console.log('[handleLogin] Starting login attempt for:', email);

    try {
      // Call server-side API for validation and authentication
      console.log('[handleLogin] Calling server-side login API...');

      const loginRes = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        console.error('[handleLogin] Login API error:', loginData.error);
        throw new Error(loginData.error || 'Login failed. Please try again.');
      }

      if (!loginData.access_token || !loginData.refresh_token) {
        throw new Error('Failed to receive authentication tokens.');
      }

      console.log('[handleLogin] Login API successful, setting session...');

      // Set session cookies
      const setRes = await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: loginData.access_token,
          refresh_token: loginData.refresh_token
        }),
      });

      if (!setRes.ok) {
        const text = await setRes.text();
        console.error('[handleLogin] Failed to set server session:', text);
        throw new Error('Failed to establish session. Please try again.');
      }

      console.log('[handleLogin] Login successful, redirecting...');
      if (redirectTo) {
        window.location.href = redirectTo;
      } else {
        window.location.href = '/customer/dashboard';
      }
    } catch (error: any) {
      console.error('[handleLogin] Error caught:', error);
      const errorMessage = error?.message || 'Login failed. Please check your credentials and try again.';
      console.error('[handleLogin] Setting error:', errorMessage);
      setError(errorMessage);
      setLoading(false);
    }
  }


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
    <div className="w-full max-w-md mx-auto px-4 sm:px-0">
      {/* Mode Toggle - At the top */}
      <div className="mb-4 text-center">
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="text-sm text-slate-400 hover:text-orange-400 transition"
        >
          {mode === "login" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>

      {/* Header Section */}
      <div className="mb-6 text-center">
        <h1 className="bg-gradient-to-r from-white via-orange-100 to-white bg-clip-text text-3xl sm:text-4xl font-black text-transparent">
          {mode === "login" ? "Welcome Back" : "Get Started"}
        </h1>
        {mode === "signup" && (
          <p className="mt-2 text-sm text-orange-400 font-semibold">
            FREE 5-minute trial
          </p>
        )}
      </div>

      {/* Main Card */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Social Auth Buttons - Show for both modes */}
        <div className="mb-6">
          <SocialAuthButtons
            mode={mode}
            redirectTo={redirectTo || undefined}
            onError={(err) => setError(err)}
          />
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <span className="text-xs font-bold tracking-wider text-slate-400">OR EMAIL</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

      <form onSubmit={mode === "signup" ? handleSignup : handleLogin} className="space-y-5">
        {mode === "signup" && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-200">
                  First name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, firstName: e.target.value }));
                    validateField("firstName", e.target.value);
                  }}
                  className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 backdrop-blur transition focus:border-orange-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                  placeholder="John"
                />
                {fieldErrors.firstName && (
                  <p className="mt-1.5 text-xs text-rose-400">{fieldErrors.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200">
                  Last name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, lastName: e.target.value }));
                    validateField("lastName", e.target.value);
                  }}
                  className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 backdrop-blur transition focus:border-orange-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                  placeholder="Doe"
                />
                {fieldErrors.lastName && (
                  <p className="mt-1.5 text-xs text-rose-400">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-200">
                  Phone number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="416-555-0123"
                  className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 backdrop-blur transition focus:border-orange-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200">
                  Date of birth <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.dateOfBirth}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }));
                    validateField("dateOfBirth", e.target.value);
                  }}
                  className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 backdrop-blur transition focus:border-orange-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                />
                {fieldErrors.dateOfBirth && (
                  <p className="mt-1.5 text-xs text-rose-400">{fieldErrors.dateOfBirth}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200">
                Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main Street"
                className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 backdrop-blur transition focus:border-orange-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-200">
                  City <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="Toronto"
                  className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 backdrop-blur transition focus:border-orange-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200">
                  Country <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={form.country}
                  onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 backdrop-blur transition focus:border-orange-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                >
                  <option value="Canada" className="bg-slate-900 text-white">Canada</option>
                  <option value="United States" className="bg-slate-900 text-white">United States</option>
                  <option value="Other" className="bg-slate-900 text-white">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200">
                Vehicle <span className="text-xs font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={form.vehicle}
                onChange={(e) => setForm((prev) => ({ ...prev, vehicle: e.target.value }))}
                placeholder="2020 Honda Civic"
                className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 backdrop-blur transition focus:border-orange-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-200">
            Email {mode === "signup" && <span className="text-rose-400">*</span>}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 backdrop-blur transition focus:border-orange-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-200">
            Password {mode === "signup" && <span className="text-rose-400">*</span>}
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (mode === "signup") {
                validateField("password", e.target.value);
              }
            }}
            minLength={mode === "signup" ? 8 : 6}
            placeholder={mode === "signup" ? "Minimum 8 characters" : "Enter password"}
            className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 backdrop-blur transition focus:border-orange-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
          />
          {mode === "signup" && (
            <>
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs text-rose-400">{fieldErrors.password}</p>
              )}
              {!fieldErrors.password && password && (
                <p className="mt-1.5 text-xs text-emerald-400">✓ Password meets requirements</p>
              )}
            </>
          )}
        </div>

        {mode === "login" && (
          <div className="flex justify-end text-sm">
            <Link href="/forgot-password" className="font-semibold text-orange-200 transition hover:text-white">
              Forgot password?
            </Link>
          </div>
        )}

        {mode === "signup" && (
          <div
            className={`rounded-2xl border p-6 transition-all duration-300 ${
              requiredFieldsFilled
                ? "border-orange-400/40 bg-gradient-to-br from-orange-500/15 to-red-500/10 shadow-lg shadow-orange-500/10"
                : "border-white/10 bg-white/5 opacity-60"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
                waiverAccepted ? "bg-emerald-500" : "border-2 border-white/20 bg-white/10"
              }`}>
                {waiverAccepted && (
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-200">
                  {waiverAccepted ? (
                    <span className="text-emerald-400">Terms accepted</span>
                  ) : (
                    <span>Accept Terms (18+)</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setShowWaiver(true)}
                  disabled={!requiredFieldsFilled}
                  className={`mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                    requiredFieldsFilled
                      ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30 hover:from-orange-600 hover:to-red-700"
                      : "cursor-not-allowed bg-slate-700/50 text-slate-500"
                  }`}
                >
                  {waiverAccepted ? "Review Terms" : "Accept Terms"}
                </button>
                {!requiredFieldsFilled && (
                  <p className="mt-2 text-xs text-slate-500">
                    Fill all fields first
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (mode === "signup" && !formIsValid)}
          className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 px-4 py-4 text-base font-bold text-white shadow-2xl shadow-orange-500/50 transition-all hover:shadow-orange-500/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : mode === "signup" ? (
            "Create Account"
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      {mode === "signup" && (
        <button
          onClick={handlePublicAvailability}
          disabled={checkingAvailability}
          className="mt-6 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-200 backdrop-blur transition hover:bg-white/15 hover:border-white/30 disabled:opacity-60"
        >
          {checkingAvailability ? "Checking..." : "See mechanics online"}
        </button>
      )}

      {publicAvailability && (
        <div className="mt-4 rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-500/20 to-red-500/10 p-4 shadow-lg shadow-orange-500/10">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="flex-1 text-sm text-orange-200">{publicAvailability}</p>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-2xl border border-rose-400/30 bg-gradient-to-br from-rose-500/20 to-red-500/10 p-4 shadow-lg shadow-rose-500/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="flex-1 text-sm text-rose-300">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 text-rose-300 hover:text-rose-100 transition-colors"
              aria-label="Dismiss error"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {error.includes('session') && (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setError(null);
                window.location.reload();
              }}
              className="mt-3 w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition-colors shadow-lg shadow-rose-500/30"
            >
              Clear Session & Refresh
            </button>
          )}
        </div>
      )}
      {message && (
        <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-green-500/10 p-4 shadow-lg shadow-emerald-500/10">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="flex-1 text-sm text-emerald-300">{message}</p>
          </div>
        </div>
      )}

      {mode === "signup" && (
        <p className="mt-4 text-center text-xs text-slate-400">
          Check your email to verify before booking
        </p>
      )}

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
    </div>
  );
}
