'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Errors = Partial<Record<
  | 'name' | 'email' | 'phone' | 'city'
  | 'vin' | 'year' | 'make' | 'model'
  | 'concern'
, string>>;

type UploadItem = {
  file: File;
  path?: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
};

export default function IntakePage() {
  const sp = useSearchParams();
  const plan = sp.get('plan') || 'trial';
  const router = useRouter();

  const [form, setForm] = useState({
    name: '', email: '', phone: '', city: '',
    vin: '', year: '', make: '', model: '', odometer: '', plate: '',
    concern: '',
  });
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [decoding, setDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const firstErrorRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Simple validators
  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);
  const phoneRegex = useMemo(() => /^[0-9+()\-\s]{7,}$/i, []);

  function validate(): boolean {
    const e: Errors = {};

    // Contact (all required)
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim() || !emailRegex.test(form.email)) e.email = 'Valid email is required';
    if (!form.phone.trim() || !phoneRegex.test(form.phone)) e.phone = 'Valid phone is required';
    if (!form.city.trim()) e.city = 'City / Town is required';

    // Vehicle: require either VIN (recommended) OR full Y/M/M
    const hasFullYMM = !!(form.year.trim() && form.make.trim() && form.model.trim());
    if (!form.vin.trim() && !hasFullYMM) {
      e.vin = 'Provide VIN (preferred) or fill Year/Make/Model';
      if (!form.year.trim()) e.year = 'Year required if no VIN';
      if (!form.make.trim()) e.make = 'Make required if no VIN';
      if (!form.model.trim()) e.model = 'Model required if no VIN';
    }
    if (form.vin && form.vin.trim().length > 0 && form.vin.trim().length !== 17) {
      e.vin = 'VIN must be exactly 17 characters';
    }

    // Concern required
    if (!form.concern.trim() || form.concern.trim().length < 10) {
      e.concern = 'Please describe the issue (min 10 characters)';
    }

    setErrors(e);

    // focus/scroll to first error
    if (Object.keys(e).length > 0) {
      setTimeout(() => {
        firstErrorRef.current?.focus();
        firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      return false;
    }
    return true;
  }

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

  // Upload logic using signed URLs (server-side generated)
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const items: UploadItem[] = files.map((f) => ({ file: f, progress: 0, status: 'pending' }));
    setUploads((prev) => [...prev, ...items]);
  }

  async function uploadOne(item: UploadItem, idx: number) {
    try {
      setUploads((prev) => prev.map((u, i) => i === idx ? { ...u, status: 'uploading', progress: 0 } : u));
      // ask server for a signed upload URL for Supabase Storage
      const signRes = await fetch('/api/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: item.file.name, contentType: item.file.type })
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData?.error || 'Cannot sign upload');

      const { signedUrl, path } = signData;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('Content-Type', item.file.type || 'application/octet-stream');
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            setUploads((prev) => prev.map((u, i) => i === idx ? { ...u, progress: pct } : u));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploads((prev) => prev.map((u, i) => i === idx ? { ...u, status: 'done', progress: 100, path } : u));
            resolve();
          } else {
            const msg = `Upload failed (${xhr.status})`;
            setUploads((prev) => prev.map((u, i) => i === idx ? { ...u, status: 'error', error: msg } : u));
            reject(new Error(msg));
          }
        };
        xhr.onerror = () => {
          const msg = 'Network error during upload';
          setUploads((prev) => prev.map((u, i) => i === idx ? { ...u, status: 'error', error: msg } : u));
          reject(new Error(msg));
        };
        xhr.send(item.file);
      });
    } catch (err: any) {
      setUploads((prev) => prev.map((u, i) => i === idx ? { ...u, status: 'error', error: err.message || 'Upload error' } : u));
    }
  }

  async function uploadAll() {
    // Upload pending/errored items
    const toUpload = uploads.map((u, idx) => ({u, idx})).filter(({u}) => u.status === 'pending' || u.status === 'error');
    for (const {u, idx} of toUpload) {
      // eslint-disable-next-line no-await-in-loop
      await uploadOne(u, idx);
    }
  }

  async function submit() {
    setError(null);
    if (!validate()) return;

    // Ensure uploads are either done or there are none
    const hasUploads = uploads.length > 0;
    const anyUploading = uploads.some(u => u.status === 'uploading' || u.status === 'pending');
    if (anyUploading) {
      setError('Please wait for file uploads to finish.');
      return;
    }
    const uploadedPaths = uploads.filter(u => u.status === 'done' && u.path).map(u => u.path as string);

    try {
      const res = await fetch('/api/intake/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, ...form, files: uploadedPaths })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Unable to continue');
      if (data.redirect) {
        router.push(data.redirect);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  // Disable button if obvious empties (optimistic UI)
  const canSubmit = (() => {
    const hasContact = form.name && form.email && form.phone && form.city;
    const hasVehicle = form.vin.length === 17 || (form.year && form.make && form.model);
    const hasConcern = form.concern && form.concern.length >= 10;
    // also require that any selected files finished uploading
    const notUploading = uploads.every(u => u.status === 'done' || u.status === 'pending' || u.status === 'error');
    return !!(hasContact && hasVehicle && hasConcern && notUploading);
  })();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">Vehicle & Issue Details</h1>
      <p className="mt-1 text-slate-600">Before we connect you, tell us about your vehicle. This helps the mechanic prepare and saves you time.</p>

      <div className="mt-6 grid gap-4">
        <Section title="Contact">
          <Input label="Full name *" value={form.name} onChange={v=>setForm({...form, name:v})} error={errors.name} inputRef={(el)=>{ if(errors.name && !firstErrorRef.current) firstErrorRef.current = el as any; }} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Email *" type="email" value={form.email} onChange={v=>setForm({...form, email:v})} error={errors.email} inputRef={(el)=>{ if(errors.email && !firstErrorRef.current) firstErrorRef.current = el as any; }} />
            <Input label="Phone *" value={form.phone} onChange={v=>setForm({...form, phone:v})} error={errors.phone} inputRef={(el)=>{ if(errors.phone && !firstErrorRef.current) firstErrorRef.current = el as any; }} />
          </div>
          <Input label="City / Town *" value={form.city} onChange={v=>setForm({...form, city:v})} error={errors.city} inputRef={(el)=>{ if(errors.city && !firstErrorRef.current) firstErrorRef.current = el as any; }} />
        </Section>

        <Section title="Vehicle">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="VIN (17 chars preferred)" value={form.vin} onChange={v=>setForm({...form, vin:v.toUpperCase()})} error={errors.vin} inputRef={(el)=>{ if(errors.vin && !firstErrorRef.current) firstErrorRef.current = el as any; }} />
            <button onClick={decodeVin} disabled={!form.vin || decoding} className="self-end rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {decoding? 'Decoding…':'Decode VIN'}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Year * (if no VIN)" value={form.year} onChange={v=>setForm({...form, year:v})} error={errors.year} inputRef={(el)=>{ if(errors.year && !firstErrorRef.current) firstErrorRef.current = el as any; }} />
            <Input label="Make * (if no VIN)" value={form.make} onChange={v=>setForm({...form, make:v})} error={errors.make} inputRef={(el)=>{ if(errors.make && !firstErrorRef.current) firstErrorRef.current = el as any; }} />
            <Input label="Model * (if no VIN)" value={form.model} onChange={v=>setForm({...form, model:v})} error={errors.model} inputRef={(el)=>{ if(errors.model && !firstErrorRef.current) firstErrorRef.current = el as any; }} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Odometer (optional)" value={form.odometer} onChange={v=>setForm({...form, odometer:v})} />
            <Input label="Plate (optional)" value={form.plate} onChange={v=>setForm({...form, plate:v})} />
          </div>
        </Section>

        <Section title="What’s going on?">
          <Textarea label="Describe the issue *" value={form.concern} onChange={v=>setForm({...form, concern:v})} error={errors.concern} inputRef={(el)=>{ if(errors.concern && !firstErrorRef.current) firstErrorRef.current = el as any; }} />
          <div className="mt-2 rounded-xl border p-3">
            <label className="text-sm font-medium text-slate-700">Upload photos / videos (optional)</label>
            <input multiple type="file" accept="image/*,video/*" onChange={handleFileSelect} className="mt-2 block w-full rounded-xl border px-3 py-2 text-sm" />
            {uploads.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploads.map((u, idx) => (
                  <div key={idx} className="rounded-lg border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{u.file.name}</div>
                        <div className="text-xs text-slate-500">{Math.round(u.file.size/1024)} KB • {u.status}</div>
                      </div>
                      <div className="w-40">
                        <div className="h-2 w-full rounded bg-slate-200">
                          <div className="h-2 rounded bg-emerald-500" style={{ width: `${u.progress}%` }} />
                        </div>
                      </div>
                    </div>
                    {u.error && <div className="text-xs text-red-600 mt-1">{u.error}</div>}
                  </div>
                ))}
                <div className="flex gap-2">
                  <button onClick={uploadAll} className="rounded-lg bg-slate-900 px-3 py-1.5 text-white text-xs font-semibold disabled:opacity-50"
                    disabled={uploads.every(u => u.status === 'done')}
                  >
                    {uploads.some(u => u.status === 'uploading') ? 'Uploading…' : 'Upload selected files'}
                  </button>
                  <button onClick={()=>setUploads([])} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Clear</button>
                </div>
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">Up to ~10 files. Examples: leak photo, warning light, scan-tool screenshot, sound clip.</p>
          </div>
        </Section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex gap-3">
          <button onClick={submit} disabled={!canSubmit} className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            Continue
          </button>
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

function Input({
  label, value, onChange, type='text', error, inputRef
}: {
  label: string;
  value: string;
  onChange: (v:string)=>void;
  type?: string;
  error?: string;
  inputRef?: (el: HTMLInputElement | null) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        ref={inputRef as any}
        aria-invalid={!!error}
        aria-describedby={error ? `${label}-error` : undefined}
        type={type}
        value={value}
        onChange={e=>onChange(e.target.value)}
        className={`mt-1 block w-full rounded-xl border px-3 py-2 text-sm ${error ? 'border-red-500 ring-1 ring-red-500' : ''}`}
      />
      {error && <span id={`${label}-error`} className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function Textarea({
  label, value, onChange, error, inputRef
}: {
  label: string;
  value: string;
  onChange: (v:string)=>void;
  error?: string;
  inputRef?: (el: HTMLTextAreaElement | null) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        ref={inputRef as any}
        aria-invalid={!!error}
        aria-describedby={error ? `${label}-error` : undefined}
        value={value}
        onChange={e=>onChange(e.target.value)}
        rows={5}
        className={`mt-1 block w-full rounded-xl border px-3 py-2 text-sm ${error ? 'border-red-500 ring-1 ring-red-500' : ''}`}
      />
      {error && <span id={`${label}-error`} className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
