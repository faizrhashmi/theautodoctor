'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Errors = Partial<
  Record<
    | 'name'
    | 'email'
    | 'phone'
    | 'city'
    | 'vin'
    | 'year'
    | 'make'
    | 'model'
    | 'concern',
    string
  >
>

type UploadItem = {
  file: File
  path?: string
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Complimentary Session',
  trial: 'Complimentary Session',
  quick: 'Quick Chat (30 min)',
  standard: 'Standard Video (45 min)',
  diagnostic: 'Full Diagnostic (60 min)',
  chat10: 'Quick Chat (30 min)',
  video15: 'Standard Video (45 min)',
}

const PLAN_DESCRIPTIONS: Record<string, string> = {
  free: 'We will open a complimentary chat as soon as a mechanic accepts your request.',
  trial: 'We will open a complimentary chat as soon as a mechanic accepts your request.',
  quick: 'We will pair you with the next available mechanic for a rapid 30 minute chat.',
  standard: 'We will prepare the HD video bay and notify your assigned mechanic the moment this intake lands.',
  diagnostic: 'We will queue your deep-dive diagnostic session and send the join link right away.',
  chat10: 'We will pair you with the next available mechanic for a rapid 30 minute chat.',
  video15: 'We will prepare the HD video bay and notify your assigned mechanic the moment this intake lands.',
}

export default function IntakePage() {
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan') || 'trial'
  const router = useRouter()

  const planLabel = PLAN_LABELS[plan] ?? 'AskAutoDoctor Session'
  const planDescription =
    PLAN_DESCRIPTIONS[plan] ?? 'We will match you with the right mechanic as soon as you submit these details.'

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    vin: '',
    year: '',
    make: '',
    model: '',
    odometer: '',
    plate: '',
    concern: '',
  })
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [decoding, setDecoding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const firstErrorRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, [])
  const phoneRegex = useMemo(() => /^[0-9+()\-\s]{7,}$/i, [])

  function validate(): boolean {
    const nextErrors: Errors = {}

    if (!form.name.trim()) nextErrors.name = 'Name is required'
    if (!form.email.trim() || !emailRegex.test(form.email)) nextErrors.email = 'Valid email is required'
    if (!form.phone.trim() || !phoneRegex.test(form.phone)) nextErrors.phone = 'Valid phone is required'
    if (!form.city.trim()) nextErrors.city = 'City / Town is required'

    const hasFullYMM = !!(form.year.trim() && form.make.trim() && form.model.trim())
    if (!form.vin.trim() && !hasFullYMM) {
      nextErrors.vin = 'Provide VIN (preferred) or fill Year / Make / Model'
      if (!form.year.trim()) nextErrors.year = 'Year required if no VIN'
      if (!form.make.trim()) nextErrors.make = 'Make required if no VIN'
      if (!form.model.trim()) nextErrors.model = 'Model required if no VIN'
    }
    if (form.vin && form.vin.trim().length > 0 && form.vin.trim().length !== 17) {
      nextErrors.vin = 'VIN must be exactly 17 characters'
    }

    if (!form.concern.trim() || form.concern.trim().length < 10) {
      nextErrors.concern = 'Please describe the issue (min 10 characters)'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setTimeout(() => {
        firstErrorRef.current?.focus()
        firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 0)
      return false
    }

    return true
  }

  async function decodeVin() {
    if (!form.vin) return
    setDecoding(true)
    setError(null)
    try {
      const res = await fetch(`/api/vin/decode?vin=${encodeURIComponent(form.vin)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'VIN decode failed')
      setForm((prev) => ({
        ...prev,
        year: data.year || prev.year,
        make: data.make || prev.make,
        model: data.model || prev.model,
      }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDecoding(false)
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    const next = files.map<UploadItem>((file) => ({ file, progress: 0, status: 'pending' }))
    setUploads((prev) => [...prev, ...next])
  }

  async function uploadOne(item: UploadItem, index: number) {
    try {
      setUploads((prev) =>
        prev.map((u, i) => (i === index ? { ...u, status: 'uploading', progress: 0, error: undefined } : u)),
      )

      const signRes = await fetch('/api/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: item.file.name, contentType: item.file.type }),
      })

      const signData = await signRes.json()
      if (!signRes.ok) throw new Error(signData?.error || 'Unable to sign upload')

      const { signedUrl, path } = signData as { signedUrl: string; path: string }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', item.file.type || 'application/octet-stream')
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100)
            setUploads((prev) => prev.map((u, i) => (i === index ? { ...u, progress: pct } : u)))
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploads((prev) => prev.map((u, i) => (i === index ? { ...u, status: 'done', progress: 100, path } : u)))
            resolve()
          } else {
            reject(new Error('Upload failed'))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(item.file)
      })
    } catch (err: any) {
      setUploads((prev) =>
        prev.map((u, i) =>
          i === index
            ? { ...u, status: 'error', error: err?.message ?? 'Upload failed. Please try again.' }
            : u,
        ),
      )
    }
  }

  async function uploadAll() {
    for (let i = 0; i < uploads.length; i += 1) {
      const item = uploads[i]
      if (item.status === 'pending' || item.status === 'error') {
        // eslint-disable-next-line no-await-in-loop
        await uploadOne(item, i)
      }
    }
  }

  async function submit() {
    setError(null)
    setErrors({})
    firstErrorRef.current = null

    if (!validate()) return

    const anyUploading = uploads.some((u) => u.status === 'uploading' || u.status === 'pending')
    if (anyUploading) {
      setError('Please wait for file uploads to finish before continuing.')
      return
    }

    const uploadedPaths = uploads.filter((u) => u.status === 'done' && u.path).map((u) => u.path!)

    try {
      const res = await fetch('/api/intake/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, ...form, files: uploadedPaths }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Unable to continue')
      if (data.redirect) {
        router.push(data.redirect)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const canSubmit = (() => {
    const hasContact = form.name && form.email && form.phone && form.city
    const hasVehicle = form.vin.length === 17 || (form.year && form.make && form.model)
    const hasConcern = form.concern && form.concern.length >= 10
    const uploadsReady = uploads.every((u) => u.status === 'done' || u.status === 'pending' || u.status === 'error')
    return Boolean(hasContact && hasVehicle && hasConcern && uploadsReady)
  })()

  return (
    <main className="mx-auto max-w-5xl rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur lg:p-12">
      <div className="flex flex-col gap-8">
        <header className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 shadow-lg sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-200">Step 2 of 3</p>
              <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Tell us about your vehicle</h1>
              <p className="mt-3 text-sm text-slate-300">
                Share the details your mechanic needs. Once you submit this intake we will open your session and email the join link immediately.
              </p>
            </div>
            <div className="w-full max-w-sm rounded-2xl border border-orange-400/30 bg-orange-500/10 p-6 text-sm text-orange-100 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-200">Selected plan</p>
              <p className="mt-2 text-lg font-semibold text-white">{planLabel}</p>
              <p className="mt-2 text-xs leading-relaxed text-orange-100">{planDescription}</p>
              <ul className="mt-4 space-y-2 text-xs text-orange-100">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-300" /> Share your vehicle and concern
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-300" /> We route the right mechanic
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-300" /> Join the live session
                </li>
              </ul>
            </div>
          </div>
        </header>

        <div className="grid gap-6">
          <Section title="Contact details">
            <Input
              label="Full name *"
              value={form.name}
              onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
              error={errors.name}
              inputRef={(el) => {
                if (errors.name && !firstErrorRef.current) firstErrorRef.current = el
              }}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Email *"
                type="email"
                value={form.email}
                onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
                error={errors.email}
                inputRef={(el) => {
                  if (errors.email && !firstErrorRef.current) firstErrorRef.current = el
                }}
              />
              <Input
                label="Phone *"
                value={form.phone}
                onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                error={errors.phone}
                inputRef={(el) => {
                  if (errors.phone && !firstErrorRef.current) firstErrorRef.current = el
                }}
              />
            </div>
            <Input
              label="City / Town *"
              value={form.city}
              onChange={(value) => setForm((prev) => ({ ...prev, city: value }))}
              error={errors.city}
              inputRef={(el) => {
                if (errors.city && !firstErrorRef.current) firstErrorRef.current = el
              }}
            />
          </Section>

          <Section title="Vehicle information">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                label="VIN (17 characters preferred)"
                value={form.vin}
                onChange={(value) => setForm((prev) => ({ ...prev, vin: value.toUpperCase() }))}
                error={errors.vin}
                inputRef={(el) => {
                  if (errors.vin && !firstErrorRef.current) firstErrorRef.current = el
                }}
              />
              <button
                type="button"
                onClick={decodeVin}
                disabled={!form.vin || decoding}
                className="h-full rounded-xl bg-gradient-to-r from-orange-500 via-indigo-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:via-indigo-400 hover:to-purple-400 disabled:opacity-60"
              >
                {decoding ? 'Decoding...' : 'Decode VIN'}
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Year * (if no VIN)"
                value={form.year}
                onChange={(value) => setForm((prev) => ({ ...prev, year: value }))}
                error={errors.year}
                inputRef={(el) => {
                  if (errors.year && !firstErrorRef.current) firstErrorRef.current = el
                }}
              />
              <Input
                label="Make * (if no VIN)"
                value={form.make}
                onChange={(value) => setForm((prev) => ({ ...prev, make: value }))}
                error={errors.make}
                inputRef={(el) => {
                  if (errors.make && !firstErrorRef.current) firstErrorRef.current = el
                }}
              />
              <Input
                label="Model * (if no VIN)"
                value={form.model}
                onChange={(value) => setForm((prev) => ({ ...prev, model: value }))}
                error={errors.model}
                inputRef={(el) => {
                  if (errors.model && !firstErrorRef.current) firstErrorRef.current = el
                }}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Odometer (optional)" value={form.odometer} onChange={(value) => setForm((prev) => ({ ...prev, odometer: value }))} />
              <Input label="Plate (optional)" value={form.plate} onChange={(value) => setForm((prev) => ({ ...prev, plate: value }))} />
            </div>
          </Section>

          <Section title="What's going on?">
            <Textarea
              label="Describe the issue *"
              value={form.concern}
              onChange={(value) => setForm((prev) => ({ ...prev, concern: value }))}
              error={errors.concern}
              inputRef={(el) => {
                if (errors.concern && !firstErrorRef.current) firstErrorRef.current = el
              }}
            />
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <label className="text-sm font-semibold text-slate-200">Upload photos / videos (optional)</label>
              <input
                multiple
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="mt-3 block w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-none file:bg-orange-500/20 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-orange-100 hover:file:bg-orange-500/30"
              />
              {uploads.length > 0 && (
                <div className="mt-4 space-y-3">
                  {uploads.map((u, idx) => (
                    <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-white">{u.file.name}</div>
                          <div className="text-xs text-slate-400">{Math.round(u.file.size / 1024)} KB - {u.status}</div>
                        </div>
                        <div className="w-40">
                          <div className="h-2 w-full rounded-full bg-slate-800">
                            <div className="h-2 rounded-full bg-emerald-400 transition-all" style={{ width: `${u.progress}%` }} />
                          </div>
                        </div>
                      </div>
                      {u.error && <div className="mt-2 text-xs text-rose-300">{u.error}</div>}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={uploadAll}
                      disabled={uploads.every((u) => u.status === 'done')}
                      className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50"
                    >
                      {uploads.some((u) => u.status === 'uploading') ? 'Uploading...' : 'Upload selected files'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploads([])}
                      className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-white/40"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
              <p className="mt-3 text-xs text-slate-400">Up to ~10 files. Common uploads: leak photos, warning lights, scan tool screenshots, sound clips.</p>
            </div>
          </Section>
        </div>

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Step 3 - Join session</div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <span className="text-sm text-slate-300">
              Selected plan: <span className="font-semibold text-white">{planLabel}</span>
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 via-indigo-500 to-purple-500 px-6 py-2.5 text-sm font-semibold text-white shadow-xl transition hover:from-orange-400 hover:via-indigo-400 hover:to-purple-400 disabled:opacity-60"
            >
              Continue to session
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 shadow-sm backdrop-blur">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  )
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  error,
  inputRef,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  error?: string
  inputRef?: (el: HTMLInputElement | null) => void
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      <input
        ref={inputRef as any}
        aria-invalid={!!error}
        aria-describedby={error ? `${label}-error` : undefined}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-2 block w-full rounded-xl border px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
          error
            ? 'border-rose-400/60 bg-rose-950/40 focus:border-rose-300 focus:ring-rose-400/60'
            : 'border-white/10 bg-slate-900/60 focus:border-orange-300 focus:ring-orange-400/60'
        }`}
      />
      {error && <span id={`${label}-error`} className="mt-1 block text-xs text-rose-300">{error}</span>}
    </label>
  )
}

function Textarea({
  label,
  value,
  onChange,
  error,
  inputRef,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  inputRef?: (el: HTMLTextAreaElement | null) => void
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      <textarea
        ref={inputRef as any}
        aria-invalid={!!error}
        aria-describedby={error ? `${label}-error` : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className={`mt-2 block w-full rounded-xl border px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
          error
            ? 'border-rose-400/60 bg-rose-950/40 focus:border-rose-300 focus:ring-rose-400/60'
            : 'border-white/10 bg-slate-900/60 focus:border-orange-300 focus:ring-orange-400/60'
        }`}
      />
      {error && <span id={`${label}-error`} className="mt-1 block text-xs text-rose-300">{error}</span>}
    </label>
  )
}
