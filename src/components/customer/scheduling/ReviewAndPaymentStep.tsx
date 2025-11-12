'use client'

/**
 * ReviewAndPaymentStep - Step 7 of SchedulingPage
 * Review booking details and process payment via Stripe
 */

import { useState } from 'react'
import { Calendar, Car, Clock, DollarSign, User, FileText, Loader2, CheckCircle, MapPin, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ReviewAndPaymentStepProps {
  wizardData: {
    sessionType: 'online' | 'in_person' // Session type from ServiceTypeStep
    vehicleId: string | null
    vehicleName: string
    planType: string
    planPrice: number
    mechanicId: string
    mechanicName: string
    scheduledFor: Date
    // NEW: Scheduled intake fields
    serviceType: string // 'diagnostic' | 'repair' | 'maintenance' | 'inspection' | 'consultation'
    serviceDescription: string
    preparationNotes?: string
    specialRequests?: string
    uploadedFiles?: string[]
    // Workshop fields for in-person visits
    workshopName?: string
    workshopAddress?: {
      address: string
      city: string
      province: string
      postal: string
      country?: string
    }
  }
  onComplete: () => void
  onBack?: () => void
}

export default function ReviewAndPaymentStep({
  wizardData,
  onComplete,
  onBack
}: ReviewAndPaymentStepProps) {
  const router = useRouter()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreedToPolicy, setAgreedToPolicy] = useState(false)

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(date)
  }

  const handlePayment = async () => {
    if (!agreedToPolicy) {
      setError('Please agree to the cancellation policy')
      return
    }

    try {
      setProcessing(true)
      setError(null)

      // 1. Fetch user profile to get required contact info
      const profileRes = await fetch('/api/customer/profile')
      if (!profileRes.ok) {
        throw new Error('Failed to fetch profile. Please ensure your profile is complete.')
      }
      const profile = await profileRes.json()

      // 2. Fetch vehicle details
      const vehicleRes = await fetch(`/api/customer/vehicles/${wizardData.vehicleId}`)
      if (!vehicleRes.ok) {
        throw new Error('Failed to fetch vehicle details')
      }
      const vehicle = await vehicleRes.json()

      // 3. Create intake payload using unified /api/intake/start
      const intakePayload = {
        // Contact info from profile
        name: profile.full_name || profile.name,
        email: profile.email,
        phone: profile.phone,
        city: profile.city || 'N/A',
        customer_country: profile.country,
        customer_province: profile.province,
        customer_city: profile.city,
        customer_postal_code: profile.postal_code,
        // Vehicle info
        vehicle_id: wizardData.vehicleId,
        vin: vehicle.vin || '',
        year: vehicle.year || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        plate: vehicle.license_plate || '',
        // Plan and mechanic
        plan: wizardData.planType,
        mechanic_id: wizardData.mechanicId,
        // Concern (map from service description)
        concern: wizardData.serviceDescription,
        files: wizardData.uploadedFiles || [],
        // Scheduling
        scheduled_for: wizardData.scheduledFor.toISOString(),
      }

      // 4. Submit via unified intake API
      const response = await fetch('/api/intake/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intakePayload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create appointment')
      }

      // 5. Redirect to waiver (unified intake flow)
      // The intake API returns redirectUrl, follow it
      if (data.redirectUrl) {
        router.push(data.redirectUrl)
      } else {
        // Fallback: go to appointments page
        router.push('/customer/appointments')
      }

      onComplete()
    } catch (err: any) {
      console.error('[ReviewAndPaymentStep] Error:', err)
      setError(err.message || 'Failed to create appointment. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const calculateTotal = () => {
    // For in-person, charge deposit only at booking
    if (wizardData.sessionType === 'in_person') {
      return 15 // $15 deposit
    }
    // For online, charge full amount
    return wizardData.planPrice
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Review & Confirm
        </h2>
        <p className="text-sm sm:text-base text-slate-400">
          Please review your appointment details before confirming
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 sm:p-6 space-y-4">
        {/* Service Type */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Clock className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-slate-500 uppercase">Service Type</div>
            <div className="text-white font-semibold">
              {wizardData.sessionType === 'online' ? 'Online Diagnostic' : 'In-Person Visit'}
            </div>
          </div>
        </div>

        {/* Scheduled Time */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-orange-400" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-slate-500 uppercase">Scheduled For</div>
            <div className="text-white font-semibold">{formatDate(wizardData.scheduledFor)}</div>
          </div>
        </div>

        {/* Mechanic */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <User className="h-5 w-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-slate-500 uppercase">Mechanic</div>
            <div className="text-white font-semibold">{wizardData.mechanicName}</div>
          </div>
        </div>

        {/* Vehicle */}
        {wizardData.vehicleId && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Car className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-slate-500 uppercase">Vehicle</div>
              <div className="text-white font-semibold">{wizardData.vehicleName}</div>
            </div>
          </div>
        )}

        {/* Workshop Address (in-person only) */}
        {wizardData.sessionType === 'in_person' && wizardData.workshopAddress && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-amber-200 uppercase mb-1">Service Location</div>
                <div className="text-white font-semibold">{wizardData.workshopName || 'Workshop'}</div>
                <div className="text-sm text-slate-300 mt-2">
                  {wizardData.workshopAddress.address}<br/>
                  {wizardData.workshopAddress.city}, {wizardData.workshopAddress.province} {wizardData.workshopAddress.postal}
                  {wizardData.workshopAddress.country && <><br/>{wizardData.workshopAddress.country}</>}
                </div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    `${wizardData.workshopAddress.address}, ${wizardData.workshopAddress.city}, ${wizardData.workshopAddress.province}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-sm text-amber-400 hover:text-amber-300 hover:underline transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Get Directions
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Service Description */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <FileText className="h-5 w-5 text-red-400" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-slate-500 uppercase">Service Description</div>
            <div className="text-white text-sm">{wizardData.serviceDescription}</div>
          </div>
        </div>

        {/* Price */}
        <div className="pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 uppercase">
                {wizardData.sessionType === 'in_person' ? 'Deposit (Due Now)' : 'Total Amount'}
              </div>
              <div className="text-2xl font-bold text-white">${calculateTotal()}</div>
              {wizardData.sessionType === 'in_person' && (
                <div className="text-xs text-slate-400 mt-1">
                  Balance of ${wizardData.planPrice - 15} due after service
                </div>
              )}
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Cancellation Policy */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-amber-300 mb-2">📋 Cancellation Policy</h3>
        <ul className="text-xs sm:text-sm text-amber-200 space-y-1">
          <li>• <strong>24+ hours before:</strong> Full refund (minus $5 processing fee)</li>
          <li>• <strong>2-24 hours before:</strong> 75% refund - 25% to mechanic</li>
          <li>• <strong>&lt;2 hours or no-show:</strong> 50% account credit - 50% to mechanic</li>
        </ul>
        <p className="text-xs text-amber-300 mt-2">
          Fair compensation ensures mechanics reserve time for you. Credits never expire.
        </p>
      </div>

      {/* Agreement Checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreedToPolicy}
          onChange={(e) => setAgreedToPolicy(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-0"
        />
        <span className="text-sm text-slate-300">
          I agree to the cancellation policy and confirm the appointment details are correct
        </span>
      </label>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Confirm Button */}
      <button
        onClick={handlePayment}
        disabled={processing || !agreedToPolicy}
        className={`
          w-full py-4 rounded-lg font-semibold text-base sm:text-lg transition-all
          ${processing || !agreedToPolicy
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20'
          }
        `}
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Confirm & Pay ${calculateTotal()}
          </span>
        )}
      </button>

      <p className="text-xs text-center text-slate-500">
        🔒 Secure payment processing. Your card will be charged ${calculateTotal()}.
      </p>
    </div>
  )
}
