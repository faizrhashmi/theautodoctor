'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, FileText, Upload, Check, AlertTriangle, Building2, FileCheck } from 'lucide-react'

interface AgreementSection {
  key: string
  title: string
  content: string
  required: boolean
}

const AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    key: 'independent_contractor',
    title: 'Independent Contractor Relationship',
    content: `I acknowledge and agree that:
• My organization is an independent contractor, not an employee or agent of The Auto Doctor Inc.
• We maintain complete control over how we perform repair services
• We are responsible for our own business operations, taxes, and compliance
• The Auto Doctor Inc. is a technology platform connecting us with customers
• We are not entitled to employee benefits, insurance, or other employee rights`,
    required: true,
  },
  {
    key: 'insurance',
    title: 'Insurance Requirements',
    content: `I confirm that my organization:
• Carries commercial general liability insurance with minimum $2,000,000 CAD coverage
• Will maintain current insurance throughout our use of the platform
• Will notify The Auto Doctor Inc. immediately if insurance lapses or is cancelled
• Understands that failure to maintain insurance may result in account suspension`,
    required: true,
  },
  {
    key: 'ocpa_compliance',
    title: 'Ontario Consumer Protection Act (OCPA) Compliance',
    content: `I agree to comply with the Ontario Consumer Protection Act, including:
• Providing written estimates before beginning work (O. Reg. 17/05, s. 56)
• Obtaining customer authorization before exceeding estimate by 10%
• Maintaining proper business registration and licenses
• Displaying pricing and warranty information as required by law
• Honoring consumer protection rights under Ontario law`,
    required: true,
  },
  {
    key: 'privacy',
    title: 'Privacy and Data Protection (PIPEDA)',
    content: `I acknowledge that:
• Customer personal information must be protected according to PIPEDA
• I will only use customer data for providing repair services
• I will not share customer data with third parties without consent
• I will maintain reasonable security safeguards for customer information
• I will report any data breaches to The Auto Doctor Inc. immediately`,
    required: true,
  },
  {
    key: 'quality',
    title: 'Service Quality and Professionalism',
    content: `I commit to:
• Providing high-quality automotive repair services
• Treating all customers with professionalism and respect
• Responding to customer inquiries in a timely manner
• Honoring all quotes and warranties provided through the platform
• Resolving customer complaints fairly and promptly`,
    required: true,
  },
  {
    key: 'platform_fees',
    title: 'Platform Fees and Payments',
    content: `I understand and agree that:
• The Auto Doctor Inc. charges a platform fee for connecting me with customers
• Fees are clearly disclosed and deducted from customer payments
• Payments are processed through Stripe Connect
• I am responsible for my own taxes and remittances (GST/HST, income tax, etc.)
• Fee structures may change with 30 days written notice`,
    required: true,
  },
]

export default function WorkshopAgreementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingInsurance, setUploadingInsurance] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Agreement sections
  const [sectionsAccepted, setSectionsAccepted] = useState<Record<string, boolean>>({})
  const [electronicSignature, setElectronicSignature] = useState('')

  // Insurance details
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null)
  const [insuranceProvider, setInsuranceProvider] = useState('')
  const [policyNumber, setPolicyNumber] = useState('')
  const [coverageAmount, setCoverageAmount] = useState('2000000')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')

  // Business registration
  const [businessNumber, setBusinessNumber] = useState('')
  const [gstHstNumber, setGstHstNumber] = useState('')
  const [wsibRequired, setWsibRequired] = useState(false)
  const [wsibAccountNumber, setWsibAccountNumber] = useState('')

  useEffect(() => {
    // Initialize all sections as not accepted
    const initial: Record<string, boolean> = {}
    AGREEMENT_SECTIONS.forEach(section => {
      initial[section.key] = false
    })
    setSectionsAccepted(initial)
  }, [])

  function toggleSection(key: string) {
    setSectionsAccepted(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  function areAllRequiredSectionsAccepted(): boolean {
    return AGREEMENT_SECTIONS.every(section => {
      if (section.required) {
        return sectionsAccepted[section.key] === true
      }
      return true
    })
  }

  function validateForm(): boolean {
    setError(null)

    if (!areAllRequiredSectionsAccepted()) {
      setError('Please accept all required agreement sections')
      return false
    }

    if (!electronicSignature || electronicSignature.trim().length < 2) {
      setError('Please provide your electronic signature (minimum 2 characters)')
      return false
    }

    if (!insuranceProvider || !policyNumber) {
      setError('Please provide insurance details')
      return false
    }

    const coverage = parseFloat(coverageAmount)
    if (isNaN(coverage) || coverage < 2000000) {
      setError('Insurance coverage must be at least $2,000,000 CAD')
      return false
    }

    if (!effectiveDate || !expiryDate) {
      setError('Please provide insurance effective and expiry dates')
      return false
    }

    const expiry = new Date(expiryDate)
    if (expiry <= new Date()) {
      setError('Insurance certificate must not be expired')
      return false
    }

    const effective = new Date(effectiveDate)
    if (effective > new Date()) {
      setError('Insurance certificate must be currently effective')
      return false
    }

    if (wsibRequired && !wsibAccountNumber) {
      setError('Please provide WSIB account number')
      return false
    }

    return true
  }

  async function handleSubmit() {
    if (!validateForm()) return

    try {
      setLoading(true)
      setError(null)

      // First, upload insurance certificate if provided
      let insuranceCertificateUrl = null
      if (insuranceFile) {
        const formData = new FormData()
        formData.append('file', insuranceFile)
        formData.append('type', 'insurance_certificate')

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload insurance certificate')
        }

        const uploadData = await uploadResponse.json()
        insuranceCertificateUrl = uploadData.url
      }

      // Sign the agreement
      const response = await fetch('/api/workshop/agreement/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          electronicSignature: electronicSignature.trim(),
          sectionsAccepted,
          insurance: {
            certificateUrl: insuranceCertificateUrl,
            provider: insuranceProvider.trim(),
            policyNumber: policyNumber.trim(),
            coverageAmount: parseFloat(coverageAmount),
            effectiveDate,
            expiryDate,
          },
          businessRegistration: {
            businessNumber: businessNumber.trim() || null,
            gstHstNumber: gstHstNumber.trim() || null,
            wsibRequired,
            wsibAccountNumber: wsibRequired ? wsibAccountNumber.trim() : null,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign agreement')
      }

      setSuccessMessage('Agreement signed successfully! Redirecting to dashboard...')

      // Redirect to workshop dashboard
      setTimeout(() => {
        router.push('/workshop/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to sign agreement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <FileCheck className="h-8 w-8 text-orange-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Workshop Agreement</h1>
              <p className="text-sm text-slate-400 mt-1">Review and sign the independent contractor agreement</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-400" />
              <p className="text-sm text-green-200">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Agreement Sections */}
        <div className="space-y-6">
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-6">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-blue-400 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-blue-200 mb-2">Independent Contractor Agreement</h2>
                <p className="text-sm text-blue-300/90">
                  Please review each section carefully and accept all required terms. This agreement establishes your
                  relationship with The Auto Doctor Inc. as an independent contractor.
                </p>
              </div>
            </div>
          </div>

          {AGREEMENT_SECTIONS.map((section) => (
            <div
              key={section.key}
              className={`rounded-lg border p-6 transition ${
                sectionsAccepted[section.key]
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-slate-700 bg-slate-800/50 backdrop-blur-sm'
              }`}
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  id={section.key}
                  checked={sectionsAccepted[section.key] || false}
                  onChange={() => toggleSection(section.key)}
                  className="mt-1 h-5 w-5 rounded border-slate-600 text-orange-600 focus:ring-2 focus:ring-orange-500"
                />
                <div className="flex-1">
                  <label htmlFor={section.key} className="cursor-pointer">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      {section.title}
                      {section.required && <span className="text-xs text-red-400">(Required)</span>}
                    </h3>
                    <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                      {section.content}
                    </div>
                  </label>
                </div>
                {sectionsAccepted[section.key] && (
                  <Check className="h-6 w-6 text-green-400 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}

          {/* Insurance Information */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-400" />
              Insurance Certificate Upload
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Insurance Provider *
                  </label>
                  <input
                    type="text"
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                    placeholder="e.g., Intact Insurance"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Policy Number *
                  </label>
                  <input
                    type="text"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                    placeholder="Policy number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Coverage Amount (CAD) *
                  </label>
                  <input
                    type="number"
                    value={coverageAmount}
                    onChange={(e) => setCoverageAmount(e.target.value)}
                    min="2000000"
                    step="100000"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Minimum $2,000,000 required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Certificate Upload
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setInsuranceFile(e.target.files?.[0] || null)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-orange-500/20 file:text-orange-300 hover:file:bg-orange-500/30"
                  />
                  {insuranceFile && (
                    <p className="text-xs text-green-400 mt-1">✓ {insuranceFile.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Business Registration */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-400" />
              Business Registration (Optional)
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    CRA Business Number
                  </label>
                  <input
                    type="text"
                    value={businessNumber}
                    onChange={(e) => setBusinessNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                    placeholder="123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    GST/HST Number
                  </label>
                  <input
                    type="text"
                    value={gstHstNumber}
                    onChange={(e) => setGstHstNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                    placeholder="123456789RT0001"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                <input
                  type="checkbox"
                  id="wsib"
                  checked={wsibRequired}
                  onChange={(e) => setWsibRequired(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-slate-600 text-orange-600 focus:ring-2 focus:ring-orange-500"
                />
                <label htmlFor="wsib" className="flex-1 cursor-pointer">
                  <span className="text-sm font-medium text-slate-300">
                    I employ workers and require WSIB coverage
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Check this if you have employees and need to provide WSIB information
                  </p>
                </label>
              </div>

              {wsibRequired && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    WSIB Account Number *
                  </label>
                  <input
                    type="text"
                    value={wsibAccountNumber}
                    onChange={(e) => setWsibAccountNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                    placeholder="WSIB account number"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Electronic Signature */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-400" />
              Electronic Signature
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Type your full name to sign *
              </label>
              <input
                type="text"
                value={electronicSignature}
                onChange={(e) => setElectronicSignature(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none font-signature text-2xl"
                placeholder="Your Full Name"
              />
              <p className="text-xs text-slate-500 mt-2">
                By typing your name above, you agree that this constitutes a legal electronic signature with the same
                legal effect as a handwritten signature.
              </p>
            </div>

            {electronicSignature && (
              <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm text-blue-200">
                  <strong>Electronic Signature Preview:</strong>
                </p>
                <p className="text-2xl font-signature text-blue-300 mt-2">{electronicSignature}</p>
                <p className="text-xs text-blue-400/70 mt-2">
                  Signed on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || !areAllRequiredSectionsAccepted() || !electronicSignature}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold hover:from-orange-700 hover:to-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Signing Agreement...
              </>
            ) : (
              <>
                <FileCheck className="h-5 w-5" />
                Sign Agreement and Continue
              </>
            )}
          </button>

          {/* Footer Notice */}
          <div className="text-center pt-6 border-t border-slate-700">
            <p className="text-xs text-slate-400">
              Questions about this agreement? Contact{' '}
              <a href="mailto:legal@theautodoctor.ca" className="text-blue-400 hover:text-blue-300">
                legal@theautodoctor.ca
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
