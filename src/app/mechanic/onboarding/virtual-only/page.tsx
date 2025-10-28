'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Award,
  Wrench,
  CheckCircle,
  ArrowRight,
  Plus,
  X,
  Phone,
  FileText,
  Star,
  Info
} from 'lucide-react'

const SPECIALIZATIONS = [
  'Brakes',
  'Engine Repair',
  'Transmission',
  'Electrical Systems',
  'Air Conditioning',
  'Suspension',
  'Exhaust Systems',
  'Diagnostics',
  'Oil Changes',
  'Tire Service',
  'Hybrid/Electric',
  'Diesel',
  'Performance Tuning',
  'Body Work',
]

const CANADIAN_PROVINCES = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon',
]

const CAR_MAKES = [
  'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'BMW', 'Mercedes-Benz',
  'Volkswagen', 'Mazda', 'Subaru', 'Hyundai', 'Kia', 'Dodge', 'RAM',
  'Jeep', 'GMC', 'Audi', 'Lexus', 'Acura', 'Infiniti', 'Tesla',
  'Volvo', 'Porsche', 'Land Rover', 'Jaguar', 'Mini', 'Fiat', 'Alfa Romeo'
]

interface FormData {
  certifications: string[]
  red_seal_certified: boolean
  certification_number: string
  certification_province: string
  years_experience: number
  specializations: string[]
  makes_serviced: string[]
  bio: string
  hourly_rate: number
  phone: string
}

export default function VirtualOnlyOnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)  // ✅ Auth guard
  const [isAuthenticated, setIsAuthenticated] = useState(false)  // ✅ Auth guard
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completionPercentage, setCompletionPercentage] = useState(0)

  const [formData, setFormData] = useState<FormData>({
    certifications: [],
    red_seal_certified: false,
    certification_number: '',
    certification_province: '',
    years_experience: 0,
    specializations: [],
    makes_serviced: [],
    bio: '',
    hourly_rate: 0,
    phone: ''
  })

  const [newCertification, setNewCertification] = useState('')

  // ✅ Auth guard
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/mechanics/me')
        if (!response.ok) {
          router.replace('/mechanic/login')
          return
        }
        setIsAuthenticated(true)
        setAuthChecking(false)
      } catch (err) {
        console.error('Auth check failed:', err)
        router.replace('/mechanic/login')
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!isAuthenticated) return  // ✅ Wait for auth
    // Load existing data if any
    setLoading(true)
    fetch('/api/mechanics/onboarding/virtual-only')
      .then(res => res.json())
      .then(data => {
        if (data.mechanic) {
          setFormData({
            certifications: data.mechanic.certifications || [],
            red_seal_certified: data.mechanic.red_seal_certified || false,
            certification_number: data.mechanic.certification_number || '',
            certification_province: data.mechanic.certification_province || '',
            years_experience: data.mechanic.years_experience || 0,
            specializations: data.mechanic.specializations || [],
            makes_serviced: data.mechanic.makes_serviced || [],
            bio: data.mechanic.bio || '',
            hourly_rate: data.mechanic.hourly_rate || 0,
            phone: data.mechanic.phone || ''
          })
          setCompletionPercentage(data.completion_percentage || 0)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load onboarding data:', err)
        setLoading(false)
      })
  }, [isAuthenticated])

  const handleAddCertification = () => {
    if (newCertification.trim()) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCertification.trim()]
      }))
      setNewCertification('')
    }
  }

  const handleRemoveCertification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }))
  }

  const toggleSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec]
    }))
  }

  const toggleMake = (make: string) => {
    setFormData(prev => ({
      ...prev,
      makes_serviced: prev.makes_serviced.includes(make)
        ? prev.makes_serviced.filter(m => m !== make)
        : [...prev.makes_serviced, make]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // Validation
    if (formData.certifications.length === 0) {
      setError('Please add at least one certification')
      setSubmitting(false)
      return
    }

    if (formData.years_experience < 0) {
      setError('Please enter your years of experience')
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/mechanics/onboarding/virtual-only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding')
      }

      // Success! Redirect to dashboard
      router.push(data.redirect_url)

    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full mb-4">
            <Award className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Virtual Consultation Specialist
          </h1>
          <p className="text-slate-400">
            Complete your profile to start accepting virtual consultation requests
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Profile Completion</span>
            <span className="text-sm font-semibold text-blue-600">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-green-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Certifications */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Award className="w-6 h-6 text-blue-600" />
              Certifications
            </h2>

            {/* Red Seal */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.red_seal_certified}
                  onChange={e => setFormData(prev => ({ ...prev, red_seal_certified: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-300">
                  Red Seal Certified
                </span>
              </label>
            </div>

            {formData.red_seal_certified && (
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Certification Number
                  </label>
                  <input
                    type="text"
                    value={formData.certification_number}
                    onChange={e => setFormData(prev => ({ ...prev, certification_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., RS123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Province
                  </label>
                  <select
                    value={formData.certification_province}
                    onChange={e => setFormData(prev => ({ ...prev, certification_province: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select province</option>
                    {CANADIAN_PROVINCES.map(province => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Other Certifications */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Other Certifications
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newCertification}
                  onChange={e => setNewCertification(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddCertification())}
                  className="flex-1 px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., ASE Master Technician"
                />
                <button
                  type="button"
                  onClick={handleAddCertification}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
              {formData.certifications.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.certifications.map((cert, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                    >
                      <span>{cert}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCertification(index)}
                        className="hover:bg-blue-100 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Experience */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Star className="w-6 h-6 text-blue-600" />
              Experience
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Years of Experience
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={formData.years_experience || ''}
                onChange={e => setFormData(prev => ({ ...prev, years_experience: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 15"
                required
              />
            </div>

            {/* Specializations */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Specializations (select all that apply)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {SPECIALIZATIONS.map(spec => (
                  <label
                    key={spec}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.specializations.includes(spec)}
                      onChange={() => toggleSpecialization(spec)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-300">{spec}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Makes Serviced */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Wrench className="w-6 h-6 text-blue-600" />
              Vehicle Makes You Service
            </h2>
            <p className="text-sm text-slate-400 mb-3">
              Select the car brands you have experience with (optional)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CAR_MAKES.map(make => (
                <label
                  key={make}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.makes_serviced.includes(make)}
                    onChange={() => toggleMake(make)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-300">{make}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Bio & Contact */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              About You
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Professional Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell customers about your experience and expertise..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be shown to customers when they view your profile
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(123) 456-7890"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Hourly Rate (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={formData.hourly_rate || ''}
                    onChange={e => setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-8 pr-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="50"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This is just for reference and won't affect consultation pricing
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-white mb-1">
                  Ready to start earning!
                </h3>
                <p className="text-sm text-slate-400">
                  Once you complete your profile, you'll be able to accept virtual consultation
                  requests immediately and start earning $12.75-$29.75 per session.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                submitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Completing Profile...</span>
                </>
              ) : (
                <>
                  <span>Complete Profile & Start Earning</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
