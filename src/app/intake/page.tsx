'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function IntakePage() {
  const sp = useSearchParams();
  const plan = sp.get('plan') || 'trial';
  const router = useRouter();

  const [form, setForm] = useState({
    name: '', email: '', phone: '', city: '',
    vin: '', year: '', make: '', model: '', odometer: '', plate: '',
    concern: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [decoding, setDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decodeVin() {
    if (!form.vin) return;
    setDecoding(true);
    setError(null);
    try {
      const res = await fetch(`/api/vin/decode?vin=${encodeURIComponent(form.vin)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'VIN decode failed');
      setForm(prev => ({ ...prev, year: data.year || prev.year, make: data.make || prev.make, model: data.model || prev.model }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDecoding(false);
    }
  }

  async function submit() {
    setError(null);
    try {
      const body = new FormData();
      body.append('plan', plan);
      Object.entries(form).forEach(([k,v]) => body.append(k, v));
      files.forEach(f => body.append('files', f));

      const res = await fetch('/api/intake/start', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Unable to continue');

      if (data.redirect) {
        router.push(data.redirect);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">Vehicle & Issue Details</h1>
      <p className="mt-1 text-slate-600">Before we connect you, tell us about your vehicle. This helps the mechanic prepare and saves you time.</p>

      <div className="mt-6 grid gap-4">
        <Section title="Contact">
          <Input label="Full name" value={form.name} onChange={v=>setForm({...form, name:v})} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Email" type="email" value={form.email} onChange={v=>setForm({...form, email:v})} />
            <Input label="Phone" value={form.phone} onChange={v=>setForm({...form, phone:v})} />
          </div>
          <Input label="City / Town" value={form.city} onChange={v=>setForm({...form, city:v})} />
        </Section>

        <Section title="Vehicle">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="VIN" value={form.vin} onChange={v=>setForm({...form, vin:v.toUpperCase()})} />
            <button onClick={decodeVin} disabled={!form.vin || decoding} className="self-end rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{decoding? 'Decoding…':'Decode VIN'}</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Year" value={form.year} onChange={v=>setForm({...form, year:v})} />
            <Input label="Make" value={form.make} onChange={v=>setForm({...form, make:v})} />
            <Input label="Model" value={form.model} onChange={v=>setForm({...form, model:v})} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Odometer" value={form.odometer} onChange={v=>setForm({...form, odometer:v})} />
            <Input label="Plate (optional)" value={form.plate} onChange={v=>setForm({...form, plate:v})} />
          </div>
        </Section>

        <Section title="What’s going on?">
          <Textarea label="Describe the issue" value={form.concern} onChange={v=>setForm({...form, concern:v})} />
          <div>
            <label className="text-sm font-medium text-slate-700">Upload photos / videos (optional)</label>
            <input multiple type="file" accept="image/*,video/*" onChange={(e)=> setFiles(Array.from(e.target.files||[]))} className="mt-2 block w-full rounded-xl border px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-slate-500">Up to ~10 files. Examples: leak photo, warning light, scan-tool screenshot, sound clip.</p>
          </div>
        </Section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex gap-3">
          <button onClick={submit} className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700">Continue</button>
          <span className="self-center text-sm text-slate-600">Selected: <b>{plan}</b></span>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function Input({ label, value, onChange, type='text' }: { label: string; value: string; onChange: (v:string)=>void; type?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-1 block w-full rounded-xl border px-3 py-2 text-sm" />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v:string)=>void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea value={value} onChange={e=>onChange(e.target.value)} rows={5} className="mt-1 block w-full rounded-xl border px-3 py-2 text-sm" />
    </label>
  );
}
