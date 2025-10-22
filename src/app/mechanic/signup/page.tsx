'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Wrench, Mail, Phone, Lock, User } from 'lucide-react';

export default function MechanicSignup() {
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', confirm:'' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/mechanic/dashboard';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Client-side validation
    if (!form.name.trim()) { setError('Name is required'); setLoading(false); return; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Valid email is required'); setLoading(false); return;
    }
    if (!form.phone.trim() || !/^[0-9+()\-\s]{7,}$/i.test(form.phone)) {
      setError('Valid phone number is required'); setLoading(false); return;
    }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match'); setLoading(false); return; }

    try {
      const res = await fetch('/api/mechanics/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Signup failed');
      router.push(next);
    } catch (e:any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4">
      <main className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-600">
              <Wrench className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Mechanic Sign Up</h1>
            <p className="mt-2 text-sm text-slate-300">Create your account to start helping customers</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Field
              label="Full Name"
              value={form.name}
              onChange={v=>setForm({...form, name:v})}
              icon={User}
              placeholder="John Smith"
            />
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={v=>setForm({...form, email:v})}
              icon={Mail}
              placeholder="john@example.com"
            />
            <Field
              label="Phone"
              value={form.phone}
              onChange={v=>setForm({...form, phone:v})}
              icon={Phone}
              placeholder="+1 (555) 123-4567"
            />
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={v=>setForm({...form, password:v})}
              icon={Lock}
              placeholder="Min. 6 characters"
            />
            <Field
              label="Confirm Password"
              type="password"
              value={form.confirm}
              onChange={v=>setForm({...form, confirm:v})}
              icon={Lock}
              placeholder="Re-enter password"
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
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <Link href="/mechanic/login" className="font-semibold text-orange-400 hover:text-orange-300">
                Log in
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
  placeholder
}:{
  label:string;
  value:string;
  onChange:(v:string)=>void;
  type?:string;
  icon?: React.ComponentType<{ className?: string }>;
  placeholder?: string;
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
          className={`block w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/60 ${Icon ? 'pl-10' : ''}`}
        />
      </div>
    </label>
  );
}
