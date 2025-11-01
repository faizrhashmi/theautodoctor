'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Lock,
  FileText,
  Shield,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Info,
} from 'lucide-react'
import {
  Step1Basic,
  Step2Business,
  Step3Coverage,
  Step4Review,
} from '@/components/workshop/WorkshopSignupSteps'

interface WorkshopSignupData {
  // Step 1: Basic Information
  workshopName: string
  contactName: string
  email: string
  phone: string
  password: string
  confirmPassword: string

  // Step 2: Business Details
  businessRegistrationNumber: string
  taxId: string // GST/HST
  website: string
  industry: string

  // Step 3: Address & Coverage
  address: string
  city: string
  province: string
  postalCode: string
  coveragePostalCodes: string[] // Array of postal code prefixes
  serviceRadiusKm: number

  // Step 4: Workshop Settings
  mechanicCapacity: number
  commissionRate: number // Workshop's cut (default 10%)

  // Legal
  termsAccepted: boolean
}

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

const INDUSTRIES = [
  'Independent Auto Repair Shop',
  'Dealership Service Center',
  'Franchise Service Center (e.g., Midas, Jiffy Lube)',
  'Specialty Shop (e.g., Brakes, Transmission)',
  'Mobile Mechanic Network',
  'Fleet Maintenance',
  'Other',
]

export default function WorkshopSignupPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<WorkshopSignupData>({
    workshopName: '',
    contactName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessRegistrationNumber: '',
    taxId: '',
    website: '',
    industry: '',
    address: '',
    city: '',
    province: 'Ontario',
    postalCode: '',
    coveragePostalCodes: [],
    serviceRadiusKm: 25,
    mechanicCapacity: 10,
    commissionRate: 10.0,
    termsAccepted: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [postalCodeInput, setPostalCodeInput] = useState('')

  const updateForm = (updates: Partial<WorkshopSignupData>) => {
    setFormData({ ...formData, ...updates })
    setErrors({})
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.workshopName.trim()) newErrors.workshopName = 'Workshop name is required'
      if (!formData.contactName.trim()) newErrors.contactName = 'Contact name is required'
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email address'
      }
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
      if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters'
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    if (step === 2) {
      if (!formData.businessRegistrationNumber.trim()) {
        newErrors.businessRegistrationNumber = 'Business registration number is required'
      }
      if (!formData.taxId.trim()) newErrors.taxId = 'GST/HST number is required'
      if (!formData.industry) newErrors.industry = 'Industry is required'
    }

    if (step === 3) {
      if (!formData.address.trim()) newErrors.address = 'Address is required'
      if (!formData.city.trim()) newErrors.city = 'City is required'
      if (!formData.province) newErrors.province = 'Province is required'
      if (!formData.postalCode.trim()) newErrors.postalCode = 'Postal code is required'
      if (formData.coveragePostalCodes.length === 0) {
        newErrors.coveragePostalCodes = 'Add at least one coverage postal code'
      }
    }

    if (step === 4) {
      if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4))
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const addPostalCode = () => {
    const code = postalCodeInput.trim().toUpperCase()
    if (code.length >= 3 && code.length <= 6) {
      if (!formData.coveragePostalCodes.includes(code)) {
        updateForm({
          coveragePostalCodes: [...formData.coveragePostalCodes, code],
        })
        setPostalCodeInput('')
      }
    }
  }

  const removePostalCode = (code: string) => {
    updateForm({
      coveragePostalCodes: formData.coveragePostalCodes.filter((c) => c !== code),
    })
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) return

    setLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/workshop/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ submit: data.error || 'Signup failed. Please try again.' })
        return
      }

      // Success! Redirect to dashboard or confirmation page
      router.push(`/workshop/signup/success?id=${data.organizationId}`)
    } catch (error: any) {
      setErrors({ submit: error.message || 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">AskAutoDoctor for Workshops</span>
            </Link>
            <Link href="/login" className="text-sm text-slate-400 hover:text-white">
              Already have an account? <span className="font-semibold text-orange-400">Sign In</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step, idx) => (
              <div key={step} className="flex flex-1 items-center">
                <div className="relative flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: step <= currentStep ? '#ea580c' : '#334155',
                      scale: step === currentStep ? 1.1 : 1,
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full font-semibold text-white shadow-lg"
                  >
                    {step < currentStep ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      step
                    )}
                  </motion.div>
                  <span className="mt-2 text-xs font-medium text-slate-400">
                    {step === 1 ? 'Basic' : step === 2 ? 'Business' : step === 3 ? 'Coverage' : 'Review'}
                  </span>
                </div>
                {idx < 3 && (
                  <div className="relative mx-2 flex-1">
                    <div className="h-1 bg-slate-700"></div>
                    <motion.div
                      initial={false}
                      animate={{ width: step < currentStep ? '100%' : '0%' }}
                      transition={{ duration: 0.3 }}
                      className="absolute left-0 top-0 h-1 bg-orange-600"
                    ></motion.div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
        >
          {/* Error Alert */}
          <AnimatePresence>
            {errors.submit && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-rose-400/30 bg-rose-500/10 p-4"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-400" />
                  <p className="text-sm font-medium text-rose-200">{errors.submit}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-8">
            {/* Step Content */}
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <Step1Basic
                  formData={formData}
                  updateForm={updateForm}
                  errors={errors}
                />
              )}
              {currentStep === 2 && (
                <Step2Business
                  formData={formData}
                  updateForm={updateForm}
                  errors={errors}
                />
              )}
              {currentStep === 3 && (
                <Step3Coverage
                  formData={formData}
                  updateForm={updateForm}
                  errors={errors}
                  postalCodeInput={postalCodeInput}
                  setPostalCodeInput={setPostalCodeInput}
                  addPostalCode={addPostalCode}
                  removePostalCode={removePostalCode}
                  provinces={CANADIAN_PROVINCES}
                />
              )}
              {currentStep === 4 && (
                <Step4Review
                  formData={formData}
                  updateForm={updateForm}
                  errors={errors}
                  setCurrentStep={setCurrentStep}
                />
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/60 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:via-orange-500 hover:to-orange-600"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 via-green-600 to-green-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-green-400 hover:via-green-500 hover:to-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-orange-400 hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-orange-400 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}
