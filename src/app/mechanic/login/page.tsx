'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function MechanicLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/dashboard/intakes';

  async function submit() {
    setError(null); setLoading(true);
    try {
      const res = await fetch('/api/mechanics/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Login failed');
      router.push(next);
    } catch (e:any) {
      setError(e.message); setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-2xl font-bold">Mechanic Login</h1>
      <div className="mt-6 grid gap-3">
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password" type="password" value={password} onChange={setPassword} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button onClick={submit} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="text-sm text-slate-600">No account? <a href="/mechanic/signup" className="text-blue-600 hover:underline">Sign up</a></p>
      </div>
    </main>
  );
}

function Field({label, value, onChange, type='text'}:{label:string; value:string; onChange:(v:string)=>void; type?:string}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
    </label>
  );
}
