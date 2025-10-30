'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Building2,
  DollarSign,
  MapPin,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Plus,
  X,
  Send
} from 'lucide-react'

interface Reference {
  name: string
  phone: string
  relationship: string
}

interface Program {
  id: string
  workshop_id: string
  program_name: string
  program_type: string
  description?: string
  daily_rate?: number
  hourly_rate?: number
  mechanic_percentage?: number
  workshop_percentage?: number
  monthly_fee?: number
  requirements?: string[]
  benefits?: string[]
  organizations: {
    name: string
    city?: string
    province?: string
    phone?: string
    email?: string
  }
}

export default function ApplyToPartnershipPage() {
  const router = useRouter()
  const params = useParams()
  const programId = params.programId as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [program, setProgram] = useState<Program | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [coverLetter, setCoverLetter] = useState('')
  const [availabilityNotes, setAvailabilityNotes] = useState('')
  const [references, setReferences] = useState<Reference[]>([
    { name: '', phone: '', relationship: '' }
  ])

  useEffect(() => {
    loadProgram()
  }, [programId])

  const loadProgram = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/mechanics/partnerships/programs')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load program')
      }

      const foundProgram = data.programs?.find((p: Program) => p.id === programId)

      if (!foundProgram) {
        throw new Error('Program not found')
      }

      setProgram(foundProgram)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddReference = () => {
    if (references.length < 3) {
      setReferences([...references, { name: '', phone: '', relationship: '' }])
    }
  }

  const handleRemoveReference = (index: number) => {
    setReferences(references.filter((_, i) => i !== index))
  }

  const handleReferenceChange = (index: number, field: keyof Reference, value: string) => {
    const updated = [...references]
    updated[index][field] = value
    setReferences(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Filter out empty references
      const validReferences = references.filter(r => r.name && r.phone && r.relationship)

      const response = await fetch('/api/mechanics/partnerships/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: programId,
          cover_letter: coverLetter || undefined,
          availability_notes: availabilityNotes || undefined,
          references: validReferences.length > 0 ? validReferences : undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application')
      }

      setSuccess(true)

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/mechanic/partnerships/applications')
      }, 2000)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading program details...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Application Submitted!</h2>
          <p className="text-slate-400 mb-4">
            Your application has been sent to {program?.organizations.name}.
            They will review it and get back to you soon.
          </p>
          <p className="text-sm text-gray-500">Redirecting to your applications...</p>
        </div>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Program Not Found</h2>
          <p className="text-slate-400 mb-6">{error || 'The program you are looking for does not exist.'}</p>
          <button
            onClick={() => router.push('/mechanic/partnerships/browse')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Browse Programs
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Programs</span>
          </button>

          <h1 className="text-3xl font-bold text-white mb-2">Apply to Partnership Program</h1>
          <p className="text-slate-400">
            Submit your application to partner with {program.organizations.name}
          </p>
        </div>

        {/* Program Summary */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm border-2 border-blue-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-slate-400" />
                <h3 className="text-lg font-semibold text-white">
                  {program.organizations.name}
                </h3>
              </div>
              <h4 className="text-xl font-bold text-blue-600 mb-2">
                {program.program_name}
              </h4>
              {program.organizations.city && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {program.organizations.city}, {program.organizations.province}
                  </span>
                </div>
              )}
            </div>

            <div className="text-right">
              {program.program_type === 'bay_rental' && program.daily_rate && (
                <div className="text-2xl font-bold text-green-600">
                  ${program.daily_rate}/day
                </div>
              )}
              {program.program_type === 'revenue_share' && (
                <div className="text-2xl font-bold text-green-600">
                  {program.mechanic_percentage}% / {program.workshop_percentage}%
                </div>
              )}
              {program.program_type === 'membership' && program.monthly_fee && (
                <div className="text-2xl font-bold text-purple-600">
                  ${program.monthly_fee}/month
                </div>
              )}
            </div>
          </div>

          {program.description && (
            <p className="text-sm text-slate-300">{program.description}</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover Letter */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Cover Letter</h3>
            <p className="text-sm text-slate-400 mb-4">
              Introduce yourself and explain why you want to partner with this workshop.
            </p>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={6}
              placeholder="Tell them about your experience, skills, and what you hope to achieve through this partnership..."
              className="w-full px-4 py-3 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Availability */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Availability</h3>
            <p className="text-sm text-slate-400 mb-4">
              Let them know when you are available to work.
            </p>
            <textarea
              value={availabilityNotes}
              onChange={(e) => setAvailabilityNotes(e.target.value)}
              rows={3}
              placeholder="e.g., Weekdays 9am-5pm, Weekends available, etc."
              className="w-full px-4 py-3 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* References */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">References (Optional)</h3>
                <p className="text-sm text-slate-400">
                  Provide up to 3 professional references.
                </p>
              </div>
              {references.length < 3 && (
                <button
                  type="button"
                  onClick={handleAddReference}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Reference
                </button>
              )}
            </div>

            <div className="space-y-4">
              {references.map((ref, index) => (
                <div key={index} className="border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">
                      Reference {index + 1}
                    </h4>
                    {references.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveReference(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={ref.name}
                      onChange={(e) => handleReferenceChange(index, 'name', e.target.value)}
                      placeholder="Full Name"
                      className="px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="tel"
                      value={ref.phone}
                      onChange={(e) => handleReferenceChange(index, 'phone', e.target.value)}
                      placeholder="Phone Number"
                      className="px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={ref.relationship}
                      onChange={(e) => handleReferenceChange(index, 'relationship', e.target.value)}
                      placeholder="Relationship (e.g., Former Manager)"
                      className="px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  Review Before Submitting
                </p>
                <p className="text-sm text-blue-800">
                  Make sure all information is accurate. The workshop will review your application
                  and contact you if they are interested in moving forward.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Submit Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
