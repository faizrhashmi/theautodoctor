'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function MechanicSignup() {
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', confirm:'' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/dashboard/intakes';

  async function submit() {
    setError(null); setLoading(true);
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
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold">Mechanic Sign Up</h1>
      <p className="mt-1 text-slate-600">Create your account to access the dashboard.</p>
      <div className="mt-6 grid gap-3">
        <Field label="Name" value={form.name} onChange={v=>setForm({...form, name:v})} />
        <Field label="Email" type="email" value={form.email} onChange={v=>setForm({...form, email:v})} />
        <Field label="Phone" value={form.phone} onChange={v=>setForm({...form, phone:v})} />
        <Field label="Password" type="password" value={form.password} onChange={v=>setForm({...form, password:v})} />
        <Field label="Confirm Password" type="password" value={form.confirm} onChange={v=>setForm({...form, confirm:v})} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button onClick={submit} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? 'Creating...' : 'Create account'}
        </button>
        <p className="text-sm text-slate-600">Already have an account? <a className="text-orange-600 hover:underline" href="/mechanic/login">Log in</a></p>
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
