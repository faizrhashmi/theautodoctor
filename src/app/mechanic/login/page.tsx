'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Wrench, Mail, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function MechanicLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = createClient();

  const next = sp.get('next') || sp.get('redirect') || '/mechanic/dashboard';

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError && sessionError.message && !sessionError.message.includes('no session')) {
          console.log('[MechanicLogin] Session error:', sessionError.message);
          await supabase.auth.signOut();
          setError('Your session has expired. Please log in again.');
          return;
        }

        if (session) {
          console.log('[MechanicLogin] Session found, verifying with API...');

          // Verify the session actually works by making an API call
          try {
            const response = await fetch('/api/mechanics/me');

            if (response.ok) {
              const data = await response.json();

              // Verify this is a mechanic account
              if (data && data.user_id) {
                console.log('[MechanicLogin] ✅ Valid mechanic session, redirecting to dashboard');
                router.push(next);
                return;
              }
            }

            // Session exists but API call failed - clear it
            console.log('[MechanicLogin] Session invalid, clearing and staying on login');
            await supabase.auth.signOut();
          } catch (apiError) {
            console.error('[MechanicLogin] API verification failed:', apiError);
            await supabase.auth.signOut();
          }
        }
      } catch (err) {
        console.error('[MechanicLogin] Error checking session:', err);
        await supabase.auth.signOut();
      }
    };
    checkExistingSession();
  }, [supabase, router, next]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    console.log('[MechanicLogin] Starting login attempt for:', email);

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    try {
      console.log('[MechanicLogin] Calling server-side login API...');

      const loginRes = await fetch('/api/mechanic/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        console.error('[MechanicLogin] Login API error:', loginData.error);
        throw new Error(loginData.error || 'Login failed. Please try again.');
      }

      if (!loginData.access_token || !loginData.refresh_token) {
        throw new Error('Failed to receive authentication tokens.');
      }

      console.log('[MechanicLogin] Login API successful, setting session...');

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
        console.error('[MechanicLogin] Failed to set server session:', text);
        throw new Error('Failed to establish session. Please try again.');
      }

      console.log('[MechanicLogin] ✅ Login successful, redirecting to:', next);

      window.location.href = next;

    } catch (e: any) {
      console.error('[MechanicLogin] ❌ Login failed:', e);
      setError(e.message || 'An unexpected error occurred');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 pt-20 pb-8">
      <main className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-600">
              <Wrench className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Mechanic Login</h1>
            <p className="mt-2 text-sm text-slate-300">Sign in to your mechanic account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              icon={Mail}
              placeholder="your@email.com"
              disabled={loading}
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              icon={Lock}
              placeholder="Your password"
              disabled={loading}
            />

            {error && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:via-orange-500 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Don&apos;t have an account?{' '}
              <Link href="/mechanic/signup" className="font-semibold text-orange-400 hover:text-orange-300">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-slate-400 hover:text-white">
            ← Back to homepage
          </Link>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type='text',
  icon: Icon,
  placeholder,
  disabled
}:{
  label:string;
  value:string;
  onChange:(v:string)=>void;
  type?:string;
  icon?: React.ComponentType<{ className?: string }>;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      <div className="relative mt-2">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon className="h-5 w-5 text-slate-400" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={e=>onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`block w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/60 disabled:opacity-50 disabled:cursor-not-allowed ${Icon ? 'pl-10' : ''}`}
        />
      </div>
    </label>
  );
}
