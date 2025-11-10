'use client'

/**
 * ConcernStep - Step 4 of BookingWizard
 * Embeds concern section from intake form
 * - Concern category selection
 * - Concern description
 * - File uploads
 * - Urgent checkbox
 */

import { useState, useEffect } from 'react'
import { ConcernSelect } from '@/components/intake/ConcernSelect'
import { FileText, Upload, AlertCircle, X, Check, HelpCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface ConcernStepProps {
  wizardData: any
  onComplete: (data: any) => void
  onBack: () => void
}

type UploadItem = {
  file: File
  path?: string
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export default function ConcernStep({ wizardData, onComplete, onBack }: ConcernStepProps) {
  const [primaryConcern, setPrimaryConcern] = useState<string>('')
  const [concernCategory, setConcernCategory] = useState<string>('')
  const [concernDescription, setConcernDescription] = useState('')
  const [concernPlaceholder, setConcernPlaceholder] = useState<string>('Describe what\'s happening with your vehicle...')
  const [isUrgent, setIsUrgent] = useState(false)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [error, setError] = useState('')

  // Form validation - user must click Continue to submit
  const isFormValid = primaryConcern && concernDescription.trim().length >= 10

  // Update wizard data when form data changes (to keep it in sync)
  // This enables the Continue button but doesn't auto-submit
  useEffect(() => {
    if (isFormValid) {
      const concernData = {
        primaryConcern,
        concernCategory,
        concernDescription,
        isUrgent,
        uploadedFiles: uploads.filter(u => u.status === 'done').map(u => u.path),
      }
      console.log('[ConcernStep] Form data updated, syncing with wizard')
      onComplete(concernData)
    }
  }, [primaryConcern, concernCategory, concernDescription, isUrgent, uploads])

  const handleConcernSelect = (value: string, category?: string) => {
    setPrimaryConcern(value)
    if (category) {
      setConcernCategory(category)
    }

    // Update placeholder based on selected concern
    const placeholders: Record<string, string> = {
      'Check Engine Light': 'What codes are showing? When did the light come on?',
      'Strange Noises': 'When does the noise occur? Can you describe the sound?',
      'Brake Issues': 'Is there squealing, grinding, or soft pedal feel?',
      'Fluid Leaks': 'What color is the fluid? Where is it leaking from?',
      'Electrical Problems': 'What specific electrical component is malfunctioning?',
      'Overheating': 'When does it overheat? Have you checked coolant level?',
      'Transmission Issues': 'Is there slipping, hard shifting, or delayed engagement?',
      'Steering Problems': 'Is there difficulty turning or unusual vibration?',
      'A/C or Heating': 'Is the air not cold/hot enough or not blowing at all?',
      'Tire Issues': 'Describe the problem with your tires',
    }
    setConcernPlaceholder(placeholders[value] || 'Describe what\'s happening with your vehicle...')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newUploads: UploadItem[] = files.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }))
    setUploads(prev => [...prev, ...newUploads])
  }

  const uploadAll = async () => {
    const supabase = createClient()

    for (let i = 0; i < uploads.length; i++) {
      const upload = uploads[i]
      if (upload.status === 'done') continue

      // Update status to uploading
      setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'uploading' as const, progress: 0 } : u))

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 8)
        const ext = upload.file.name.split('.').pop()
        const filename = `${timestamp}_${randomStr}.${ext}`
        const path = `${user.id}/${filename}`

        const { error: uploadError } = await supabase.storage
          .from('session-uploads')
          .upload(path, upload.file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw uploadError

        // Mark as done with path
        setUploads(prev => prev.map((u, idx) =>
          idx === i ? { ...u, status: 'done' as const, progress: 100, path } : u
        ))
      } catch (err: any) {
        setUploads(prev => prev.map((u, idx) =>
          idx === i ? { ...u, status: 'error' as const, error: err.message } : u
        ))
      }
    }
  }


  return (
    <div className="space-y-6">
      {/* Quick Guide */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-blue-100">
            <p className="font-semibold mb-1">Describe your vehicle issue</p>
            <p className="text-blue-200/80">
              Select the primary concern category and provide details about what's happening. You can upload photos or videos to help your mechanic understand the problem better.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/20 border border-orange-500/30">
            <FileText className="h-6 w-6 text-orange-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">What's going on?</h2>
            <p className="mt-2 text-sm text-slate-300">
              Tell us about the issue you're experiencing so your mechanic can prepare
            </p>
          </div>
        </div>
      </div>

      {/* Concern Selection */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 space-y-5">
        <div>
          <label htmlFor="primary-concern" className="block text-sm font-semibold text-slate-200 mb-2">
            Primary concern <span className="text-red-400">*</span>
          </label>
          <ConcernSelect
            value={primaryConcern}
            onChange={handleConcernSelect}
            error={error && !primaryConcern ? error : undefined}
          />
        </div>

        {/* Concern Description */}
        <div>
          <label htmlFor="concern-description" className="block text-sm font-semibold text-slate-200 mb-2">
            Describe the issue <span className="text-red-400">*</span>
          </label>
          <textarea
            id="concern-description"
            value={concernDescription}
            onChange={(e) => setConcernDescription(e.target.value)}
            placeholder={concernPlaceholder}
            rows={5}
            className={`w-full rounded-xl border px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all resize-none ${
              error && !concernDescription.trim()
                ? 'border-red-500 bg-slate-900/50 focus:ring-red-500'
                : 'border-slate-700 bg-slate-900/50 focus:ring-orange-500'
            }`}
          />
          {error && !concernDescription.trim() && (
            <p className="mt-1 text-xs text-rose-300">{error}</p>
          )}
        </div>

        {/* File Upload */}
        <div className="rounded-xl border border-white/10 bg-slate-950/30 p-5">
          <label className="text-sm font-semibold text-slate-200 mb-3 block">
            Upload photos / videos (optional)
          </label>
          <input
            multiple
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="block w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-white file:mr-3 file:rounded-lg file:border-none file:bg-orange-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-orange-100 hover:file:bg-orange-500/30 file:cursor-pointer touch-manipulation"
          />

          {uploads.length > 0 && (
            <div className="mt-4 space-y-3">
              {uploads.map((u, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 text-sm transition ${
                    u.status === 'done'
                      ? 'border-emerald-400/50 bg-emerald-500/10'
                      : u.status === 'error'
                      ? 'border-rose-400/50 bg-rose-500/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white flex items-center gap-2 break-all">
                        {u.file.name}
                        {u.status === 'done' && (
                          <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className={`text-xs mt-1 ${
                        u.status === 'done' ? 'text-emerald-300' :
                        u.status === 'error' ? 'text-rose-300' :
                        'text-slate-400'
                      }`}>
                        {Math.round(u.file.size / 1024)} KB • {
                          u.status === 'done' ? 'Uploaded' :
                          u.status === 'uploading' ? 'Uploading...' :
                          u.status === 'error' ? 'Failed' :
                          'Ready'
                        }
                      </div>
                    </div>
                    {u.status !== 'uploading' && (
                      <button
                        type="button"
                        onClick={() => setUploads(prev => prev.filter((_, i) => i !== idx))}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition hover:bg-slate-700 hover:text-white active:scale-95 touch-manipulation"
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
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
                  className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 touch-manipulation"
                >
                  {uploads.some((u) => u.status === 'uploading') ? 'Uploading...' :
                   uploads.every((u) => u.status === 'done') ? '✓ All files uploaded' :
                   'Upload selected files'}
                </button>
                <button
                  type="button"
                  onClick={() => setUploads([])}
                  className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-white/40 hover:bg-white/5 active:scale-95 touch-manipulation"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-400">
            Up to ~10 files. Common uploads: leak photos, warning lights, scan tool screenshots, sound clips.
          </p>
        </div>

        {/* Urgent Checkbox */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <input
            type="checkbox"
            id="urgent-checkbox"
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
            className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-2 focus:ring-red-500 mt-0.5"
          />
          <label htmlFor="urgent-checkbox" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200">Mark as Urgent</span>
              <AlertCircle className="h-4 w-4 text-red-400" />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Skip additional details and connect with an available mechanic immediately
            </p>
          </label>
        </div>
      </div>

      {/* Priority Connection Banner - Shown when urgent is checked */}
      {isUrgent && (
        <div className="rounded-2xl border-2 border-red-500/50 bg-gradient-to-r from-red-600/30 via-orange-600/30 to-red-600/30 p-5 shadow-xl animate-pulse-slow">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-500/30 border border-red-400/50">
              <svg className="h-6 w-6 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/30 border border-red-400/50 text-xs font-bold uppercase tracking-wider text-red-200">
                  EXPRESS MODE
                </span>
                Priority Connection Active
              </h3>
              <p className="mt-1 text-sm text-red-100">
                You'll be connected to the first available mechanic
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Validation Helper */}
      {!isFormValid && !error && (
        <div className="rounded-xl border border-slate-600/50 bg-slate-800/50 p-4 text-sm text-slate-300">
          <p className="font-semibold mb-1">Required to continue:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            {!primaryConcern && <li>Select a primary concern</li>}
            {!concernDescription.trim() && <li>Describe the issue</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
