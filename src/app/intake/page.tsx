'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ConcernCategorySelector from '@/components/intake/ConcernCategorySelector'
import SmartYearSelector from '@/components/intake/SmartYearSelector'
import SmartBrandSelector from '@/components/intake/SmartBrandSelector'
import type { ConcernCategory, SubCategory } from '@/lib/concernCategories'

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
  const isUrgent = searchParams.get('urgent') === 'true'
  const router = useRouter()

  const planLabel = isUrgent ? 'URGENT: Express Connection' : (PLAN_LABELS[plan] ?? 'AskAutoDoctor Session')
  const planDescription = isUrgent
    ? 'Skip the details - we\'ll connect you with an available mechanic immediately. Complete vehicle info during your session.'
    : (PLAN_DESCRIPTIONS[plan] ?? 'We will match you with the right mechanic as soon as you submit these details.')

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
  const [concernCategory, setConcernCategory] = useState<string>('')
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [decoding, setDecoding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [savedVehicle, setSavedVehicle] = useState<any>(null)
  const [userVehicles, setUserVehicles] = useState<any[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [activeSessionModal, setActiveSessionModal] = useState<{
    sessionId: string
    sessionType: string
    sessionStatus: string
  } | null>(null)
  const firstErrorRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const supabase = createClient()

  // Handle concern category selection
  const handleConcernCategorySelect = (
    category: ConcernCategory,
    subCategory?: SubCategory,
    template?: string
  ) => {
    setConcernCategory(category.slug)
    if (template) {
      setForm(prev => ({ ...prev, concern: template }))
    }
  }

  // Check for active sessions on mount - enforce business rule
  useEffect(() => {
    async function checkActiveSessions() {
      try {
        const response = await fetch('/api/customer/active-sessions')
        if (response.ok) {
          const data = await response.json()
          if (data.hasActiveSessions && data.sessions.length > 0) {
            const session = data.sessions[0]
            setActiveSessionModal({
              sessionId: session.id,
              sessionType: session.type,
              sessionStatus: session.status
            })
          }
        }
      } catch (err) {
        console.error('Error checking active sessions:', err)
      }
    }
    checkActiveSessions()
  }, [])

  // Load user profile and vehicle info
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone, vehicle_info')
            .eq('id', user.id)
            .single()

          if (profile) {
            // Pre-fill all user contact info
            setForm(prev => ({
              ...prev,
              name: profile.full_name || prev.name,
              email: user.email || prev.email,
              phone: profile.phone || prev.phone,
              city: (user.user_metadata?.city as string) || prev.city,
            }))

            // Save vehicle info if available (legacy)
            if (profile.vehicle_info && typeof profile.vehicle_info === 'object') {
              setSavedVehicle(profile.vehicle_info)
            }
          }

          // Load vehicles from new vehicles table
          const { data: vehicles, error: vehiclesError } = await supabase
            .from('vehicles')
            .select('id, make, model, year, vin, color, mileage, plate, is_primary, nickname')
            .eq('user_id', user.id)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: false })

          if (!vehiclesError && vehicles && vehicles.length > 0) {
            setUserVehicles(vehicles)
            // Auto-select primary vehicle if available
            const primaryVehicle = vehicles.find(v => v.is_primary)
            if (primaryVehicle) {
              setSelectedVehicleId(primaryVehicle.id)
            }
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err)
      } finally {
        setLoadingProfile(false)
      }
    }
    loadProfile()
  }, [supabase])

  function loadSavedVehicle() {
    if (savedVehicle) {
      setForm(prev => ({
        ...prev,
        year: savedVehicle.year || prev.year,
        make: savedVehicle.make || prev.make,
        model: savedVehicle.model || prev.model,
        vin: savedVehicle.vin || prev.vin,
        odometer: savedVehicle.mileage || prev.odometer,
      }))
    }
  }

  function loadSelectedVehicle() {
    const vehicle = userVehicles.find(v => v.id === selectedVehicleId)
    if (vehicle) {
      setForm(prev => ({
        ...prev,
        year: vehicle.year || prev.year,
        make: vehicle.make || prev.make,
        model: vehicle.model || prev.model,
        vin: vehicle.vin || prev.vin,
        odometer: vehicle.mileage || prev.odometer,
        plate: vehicle.plate || prev.plate,
      }))
    }
  }

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, [])
  const phoneRegex = useMemo(() => /^[0-9+()\-\s]{7,}$/i, [])

  function validate(): boolean {
    const nextErrors: Errors = {}

    if (!form.name.trim()) nextErrors.name = 'Name is required'
    if (!form.email.trim() || !emailRegex.test(form.email)) nextErrors.email = 'Valid email is required'
    if (!form.phone.trim() || !phoneRegex.test(form.phone)) nextErrors.phone = 'Valid phone is required'
    if (!form.city.trim()) nextErrors.city = 'City / Town is required'

    // For urgent sessions, vehicle info is optional - can be provided during session
    if (!isUrgent) {
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
    } else {
      // For urgent mode, only validate VIN length if provided
      if (form.vin && form.vin.trim().length > 0 && form.vin.trim().length !== 17) {
        nextErrors.vin = 'VIN must be exactly 17 characters'
      }
    }

    // Concern is required but shorter minimum for urgent sessions
    const minConcernLength = isUrgent ? 5 : 10
    if (!form.concern.trim() || form.concern.trim().length < minConcernLength) {
      nextErrors.concern = `Please describe the issue (min ${minConcernLength} characters)`
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
      if (item && (item.status === 'pending' || item.status === 'error')) {
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
        body: JSON.stringify({ plan, ...form, files: uploadedPaths, urgent: isUrgent }),
      })
      const data = await res.json()

      // Handle active session conflict
      if (res.status === 409 && data.activeSessionId) {
        setActiveSessionModal({
          sessionId: data.activeSessionId,
          sessionType: data.activeSessionType || 'chat',
          sessionStatus: data.activeSessionStatus || 'pending'
        })
        return
      }

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
    const minConcernLength = isUrgent ? 5 : 10
    const hasConcern = form.concern && form.concern.length >= minConcernLength
    const uploadsReady = uploads.every((u) => u.status === 'done' || u.status === 'pending' || u.status === 'error')

    // For urgent mode, vehicle info is optional
    if (isUrgent) {
      return Boolean(hasContact && hasConcern && uploadsReady)
    }

    return Boolean(hasContact && hasVehicle && hasConcern && uploadsReady)
  })()

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  return (
    <main className="mx-auto max-w-5xl rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur lg:p-12">
      <div className="flex flex-col gap-8">
        {/* Urgent Mode Banner */}
        {isUrgent && (
          <div className="rounded-2xl border-2 border-red-500/50 bg-gradient-to-r from-red-600/30 via-orange-600/30 to-red-600/30 p-4 shadow-xl animate-pulse-slow">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/30 border border-red-400/50">
                <svg className="h-6 w-6 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/30 border border-red-400/50 text-xs font-bold uppercase tracking-wider text-red-200">
                    EXPRESS MODE
                  </span>
                  Priority Connection Active
                </h3>
                <p className="mt-1 text-sm text-slate-200">
                  Vehicle details are optional - you can provide them during your session. Just tell us your contact info and issue to connect immediately.
                </p>
              </div>
            </div>
          </div>
        )}

        <header className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 shadow-lg sm:p-8">
          <div className="flex items-center justify-end mb-4">
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-semibold text-slate-400 hover:text-white transition"
            >
              Sign out
            </button>
          </div>
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

          <Section title={isUrgent ? "Vehicle information (optional - can be provided during session)" : "Vehicle information"}>
            {userVehicles.length > 0 && !loadingProfile && (
              <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 p-4">
                <label className="block">
                  <span className="text-sm font-semibold text-orange-200">Select from your saved vehicles</span>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="mt-2 block w-full rounded-lg border border-orange-400/30 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
                  >
                    <option value="">Choose a vehicle...</option>
                    {userVehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.nickname ? `${vehicle.nickname} - ` : ''}{vehicle.year} {vehicle.make} {vehicle.model}
                        {vehicle.is_primary ? ' (Primary)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedVehicleId && (
                  <button
                    type="button"
                    onClick={loadSelectedVehicle}
                    className="mt-3 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                  >
                    Use this vehicle
                  </button>
                )}
              </div>
            )}
            {savedVehicle && !loadingProfile && userVehicles.length === 0 && (
              <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 p-4">
                <p className="text-sm font-semibold text-orange-200">
                  Saved vehicle: {savedVehicle.year} {savedVehicle.make} {savedVehicle.model}
                </p>
                <button
                  type="button"
                  onClick={loadSavedVehicle}
                  className="mt-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Use this vehicle
                </button>
              </div>
            )}
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
              <SmartYearSelector
                label="Year * (if no VIN)"
                value={form.year}
                onChange={(value) => setForm((prev) => ({ ...prev, year: value }))}
                required={!form.vin.trim()}
              />
              <SmartBrandSelector
                label="Make * (if no VIN)"
                value={form.make}
                onChange={(value) => setForm((prev) => ({ ...prev, make: value }))}
                required={!form.vin.trim()}
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
            <ConcernCategorySelector
              onSelect={handleConcernCategorySelect}
              selectedCategory={concernCategory}
              className="mb-4"
            />
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
                    <div key={idx} className={`rounded-xl border p-3 text-sm transition ${
                      u.status === 'done'
                        ? 'border-emerald-400/50 bg-emerald-500/10'
                        : u.status === 'error'
                        ? 'border-rose-400/50 bg-rose-500/10'
                        : 'border-white/10 bg-white/5'
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white flex items-center gap-2">
                            {u.file.name}
                            {u.status === 'done' && (
                              <svg className="h-4 w-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className={`text-xs mt-1 ${u.status === 'done' ? 'text-emerald-300' : u.status === 'error' ? 'text-rose-300' : 'text-slate-400'}`}>
                            {Math.round(u.file.size / 1024)} KB • {u.status === 'done' ? 'Uploaded' : u.status === 'uploading' ? 'Uploading...' : u.status === 'error' ? 'Failed' : 'Ready'}
                          </div>
                        </div>
                        {u.status !== 'uploading' && (
                          <button
                            type="button"
                            onClick={() => setUploads(prev => prev.filter((_, i) => i !== idx))}
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition hover:bg-slate-700 hover:text-white"
                            title="Remove file"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {u.status === 'uploading' && (
                        <div className="mt-2">
                          <div className="h-2 w-full rounded-full bg-slate-800">
                            <div className="h-2 rounded-full bg-emerald-400 transition-all" style={{ width: `${u.progress}%` }} />
                          </div>
                        </div>
                      )}
                      {u.error && <div className="mt-2 text-xs text-rose-300">{u.error}</div>}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={uploadAll}
                      disabled={uploads.every((u) => u.status === 'done')}
                      className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploads.some((u) => u.status === 'uploading') ? 'Uploading...' : uploads.every((u) => u.status === 'done') ? '✓ All files uploaded' : 'Upload selected files'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploads([])}
                      className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-white/40 hover:bg-white/5"
                    >
                      Clear all
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
              className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-xl transition disabled:opacity-60 ${
                isUrgent
                  ? 'bg-gradient-to-r from-red-500 via-orange-600 to-red-700 hover:from-red-600 hover:via-orange-700 hover:to-red-800'
                  : 'bg-gradient-to-r from-orange-500 via-indigo-500 to-purple-500 hover:from-orange-400 hover:via-indigo-400 hover:to-purple-400'
              }`}
            >
              {isUrgent && (
                <svg className="h-4 w-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              {isUrgent ? 'Connect Now (Express)' : 'Continue to session'}
            </button>
          </div>
        </div>
      </div>

      {/* Active Session Modal */}
      {activeSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-2xl">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-600">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">Active Session in Progress</h3>
                <p className="mt-2 text-sm text-slate-300">
                  You already have a session that&apos;s {activeSessionModal.sessionStatus}. You can only have one active session at a time.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">
                Please complete or cancel your current session before starting a new one.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => router.push(activeSessionModal.sessionType === 'chat'
                  ? `/chat/${activeSessionModal.sessionId}`
                  : `/video/${activeSessionModal.sessionId}`
                )}
                className="w-full rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:via-orange-500 hover:to-orange-600"
              >
                Return to Active Session
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/customer/dashboard')}
                  className="flex-1 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to end this session? This action cannot be undone.')) {
                      try {
                        const response = await fetch(`/api/sessions/${activeSessionModal.sessionId}/end`, {
                          method: 'POST',
                        })
                        if (response.ok) {
                          setActiveSessionModal(null)
                          // Refresh the page or show success message
                        } else {
                          alert('Failed to end session. Please try again.')
                        }
                      } catch (error) {
                        alert('Failed to end session. Please try again.')
                      }
                    }
                  }}
                  className="flex-1 rounded-full border border-red-400/50 bg-red-500/10 px-6 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
                >
                  End Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
