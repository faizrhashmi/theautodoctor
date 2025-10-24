'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, Loader2, CheckCircle } from 'lucide-react'

interface SummaryFormData {
  findings: string
  steps_taken: string
  parts_needed: string
  next_steps: string
  photos: File[]
}

export default function SessionSummaryPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const sessionId = params.id

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<SummaryFormData>({
    findings: '',
    steps_taken: '',
    parts_needed: '',
    next_steps: '',
    photos: [],
  })

  useEffect(() => {
    fetchSession()
  }, [sessionId])

  async function fetchSession() {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`)
      if (!res.ok) throw new Error('Session not found')

      const data = await res.json()
      setSession(data.session)

      // Check if summary already submitted
      if (data.session.summary_submitted_at) {
        router.push('/mechanic/dashboard')
        return
      }

      // Verify this is a completed session
      if (!['completed', 'cancelled'].includes(data.session.status)) {
        setError('Can only submit summary for completed sessions')
      }
    } catch (err) {
      setError('Failed to load session')
    } finally {
      setLoading(false)
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, ...files],
    }))
  }

  function removePhoto(index: number) {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Create FormData for file upload
      const formPayload = new FormData()
      formPayload.append('findings', formData.findings)
      formPayload.append('steps_taken', formData.steps_taken)
      formPayload.append('parts_needed', formData.parts_needed)
      formPayload.append('next_steps', formData.next_steps)

      formData.photos.forEach((photo, index) => {
        formPayload.append(`photo_${index}`, photo)
      })

      const res = await fetch(`/api/sessions/${sessionId}/summary`, {
        method: 'POST',
        body: formPayload,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to submit summary')
      }

      // Success - redirect to dashboard
      alert('Summary submitted successfully! Customer has been emailed.')
      router.push('/mechanic/dashboard')
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    )
  }

  if (error && !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.push('/mechanic/dashboard')}
            className="mt-4 text-blue-400 hover:underline"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 py-8">
      <div className="mx-auto max-w-3xl px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Session Summary</h1>
          <p className="mt-2 text-slate-400">
            Provide a detailed summary of the diagnostic session for the customer
          </p>
        </div>

        {/* Session Info */}
        {session && (
          <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Session ID:</span>
                <span className="ml-2 font-mono text-white">{session.id.slice(0, 8)}</span>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>
                <span className="ml-2 capitalize text-white">{session.status}</span>
              </div>
              <div>
                <span className="text-slate-400">Duration:</span>
                <span className="ml-2 text-white">{session.duration_minutes} minutes</span>
              </div>
              <div>
                <span className="text-slate-400">Date:</span>
                <span className="ml-2 text-white">
                  {new Date(session.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Summary Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Findings */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-white">
              Diagnostic Findings *
            </label>
            <textarea
              required
              value={formData.findings}
              onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              rows={5}
              placeholder="Describe what you found during the diagnostic session..."
            />
          </div>

          {/* Steps Taken */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-white">
              Steps Taken *
            </label>
            <textarea
              required
              value={formData.steps_taken}
              onChange={(e) => setFormData({ ...formData, steps_taken: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              rows={4}
              placeholder="List the diagnostic steps you performed..."
            />
          </div>

          {/* Parts Needed */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-white">
              Parts/Repairs Needed
            </label>
            <textarea
              value={formData.parts_needed}
              onChange={(e) => setFormData({ ...formData, parts_needed: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              rows={3}
              placeholder="List any parts or repairs needed (optional)..."
            />
          </div>

          {/* Next Steps */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-white">
              Recommended Next Steps *
            </label>
            <textarea
              required
              value={formData.next_steps}
              onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              rows={3}
              placeholder="What should the customer do next?..."
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-white">
              Photos (Optional)
            </label>
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center">
              <Upload className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm text-slate-400">Upload photos from the session</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="mt-4"
              />
            </div>

            {/* Photo Previews */}
            {formData.photos.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="group relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Preview ${index + 1}`}
                      className="h-32 w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition group-hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/mechanic/dashboard')}
              className="flex-1 rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-300 transition hover:bg-slate-800"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Submit Summary
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
