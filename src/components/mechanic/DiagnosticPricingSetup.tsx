'use client'

/**
 * Diagnostic Pricing Setup Component
 * Allows mechanics to set their diagnostic pricing tiers (chat, video, in-person)
 *
 * Features:
 * - Enforces minimum pricing: Chat $19, Video $39, In-Person $50
 * - Enforces hierarchy: video >= chat, in_person >= video
 * - Real-time validation
 * - What's included descriptions for each tier
 * - Mobile-first, dark theme design
 */

import { useState, useEffect } from 'react'
import {
  DollarSign,
  MessageSquare,
  Video,
  Wrench,
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  TrendingUp,
} from 'lucide-react'
import type { MechanicDiagnosticPricing, DIAGNOSTIC_PRICING } from '@/types/diagnostic-credit'

interface DiagnosticPricingSetupProps {
  mechanicId: string
  onSaveSuccess?: () => void
}

interface PricingFormData {
  chat_diagnostic_price: number
  video_diagnostic_price: number
  in_person_diagnostic_price: number
  chat_diagnostic_description: string
  video_diagnostic_description: string
  in_person_diagnostic_description: string
}

const MINIMUM_PRICES = {
  chat: 19,
  video: 39,
  in_person: 50,
}

const DEFAULT_DESCRIPTIONS = {
  chat: 'Text-based diagnostic consultation with 24-48 hour response time. Review photos, videos, and error codes.',
  video: '30-minute live video diagnostic session. Real-time guidance and visual inspection support.',
  in_person: 'Comprehensive hands-on diagnostic at shop. Includes error scan, visual inspection, test drive, and detailed written report.',
}

export function DiagnosticPricingSetup({ mechanicId, onSaveSuccess }: DiagnosticPricingSetupProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [pricing, setPricing] = useState<PricingFormData>({
    chat_diagnostic_price: 25,
    video_diagnostic_price: 50,
    in_person_diagnostic_price: 75,
    chat_diagnostic_description: DEFAULT_DESCRIPTIONS.chat,
    video_diagnostic_description: DEFAULT_DESCRIPTIONS.video,
    in_person_diagnostic_description: DEFAULT_DESCRIPTIONS.in_person,
  })

  const [validationErrors, setValidationErrors] = useState<{
    chat?: string
    video?: string
    in_person?: string
  }>({})

  // Fetch existing pricing
  useEffect(() => {
    fetchPricing()
  }, [mechanicId])

  const fetchPricing = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/mechanic/diagnostic-pricing')

      if (!response.ok) {
        throw new Error('Failed to fetch pricing')
      }

      const data = await response.json()

      if (data.pricing) {
        setPricing({
          chat_diagnostic_price: data.pricing.chat_diagnostic_price,
          video_diagnostic_price: data.pricing.video_diagnostic_price,
          in_person_diagnostic_price: data.pricing.in_person_diagnostic_price,
          chat_diagnostic_description: data.pricing.chat_diagnostic_description || DEFAULT_DESCRIPTIONS.chat,
          video_diagnostic_description: data.pricing.video_diagnostic_description || DEFAULT_DESCRIPTIONS.video,
          in_person_diagnostic_description: data.pricing.in_person_diagnostic_description || DEFAULT_DESCRIPTIONS.in_person,
        })
      }
    } catch (err: any) {
      console.error('Error fetching pricing:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Validate pricing
  const validatePricing = (): boolean => {
    const errors: any = {}

    // Check minimums
    if (pricing.chat_diagnostic_price < MINIMUM_PRICES.chat) {
      errors.chat = `Minimum chat diagnostic price is $${MINIMUM_PRICES.chat}`
    }

    if (pricing.video_diagnostic_price < MINIMUM_PRICES.video) {
      errors.video = `Minimum video diagnostic price is $${MINIMUM_PRICES.video}`
    }

    if (pricing.in_person_diagnostic_price < MINIMUM_PRICES.in_person) {
      errors.in_person = `Minimum in-person diagnostic price is $${MINIMUM_PRICES.in_person}`
    }

    // Check hierarchy: video >= chat
    if (pricing.video_diagnostic_price < pricing.chat_diagnostic_price) {
      errors.video = 'Video price must be greater than or equal to chat price'
    }

    // Check hierarchy: in_person >= video
    if (pricing.in_person_diagnostic_price < pricing.video_diagnostic_price) {
      errors.in_person = 'In-person price must be greater than or equal to video price'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validatePricing()) {
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/mechanic/diagnostic-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pricing),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save pricing')
      }

      setSuccess(true)

      if (onSaveSuccess) {
        onSaveSuccess()
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Error saving pricing:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">Diagnostic Pricing</h2>
            <p className="text-blue-100 text-sm">
              Set your diagnostic pricing for chat, video, and in-person sessions.
              Earn 70% commission on all diagnostics.
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-300">
            <p className="font-medium text-blue-300 mb-1">Pricing Hierarchy</p>
            <p>Video price must be ≥ Chat price. In-Person price must be ≥ Video price.</p>
            <p className="mt-2 text-gray-400">
              When customers upgrade from chat/video to in-person, they receive credit toward the higher tier.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Diagnostic */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-600/20 rounded-lg">
            <MessageSquare className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Chat Diagnostic</h3>
            <p className="text-sm text-gray-400">Minimum ${MINIMUM_PRICES.chat}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Price (CAD)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                min={MINIMUM_PRICES.chat}
                step="1"
                value={pricing.chat_diagnostic_price}
                onChange={(e) => {
                  setPricing({ ...pricing, chat_diagnostic_price: parseFloat(e.target.value) || 0 })
                  setValidationErrors({ ...validationErrors, chat: undefined })
                }}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {validationErrors.chat && (
              <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {validationErrors.chat}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              What's Included
            </label>
            <textarea
              value={pricing.chat_diagnostic_description}
              onChange={(e) =>
                setPricing({ ...pricing, chat_diagnostic_description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Describe what's included in your chat diagnostic..."
            />
          </div>
        </div>
      </div>

      {/* Video Diagnostic */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Video className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Video Diagnostic</h3>
            <p className="text-sm text-gray-400">Minimum ${MINIMUM_PRICES.video}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Price (CAD)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                min={MINIMUM_PRICES.video}
                step="1"
                value={pricing.video_diagnostic_price}
                onChange={(e) => {
                  setPricing({ ...pricing, video_diagnostic_price: parseFloat(e.target.value) || 0 })
                  setValidationErrors({ ...validationErrors, video: undefined })
                }}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {validationErrors.video && (
              <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {validationErrors.video}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              What's Included
            </label>
            <textarea
              value={pricing.video_diagnostic_description}
              onChange={(e) =>
                setPricing({ ...pricing, video_diagnostic_description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Describe what's included in your video diagnostic..."
            />
          </div>
        </div>
      </div>

      {/* In-Person Diagnostic */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <Wrench className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">In-Person Diagnostic</h3>
            <p className="text-sm text-gray-400">Minimum ${MINIMUM_PRICES.in_person}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Price (CAD)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                min={MINIMUM_PRICES.in_person}
                step="1"
                value={pricing.in_person_diagnostic_price}
                onChange={(e) => {
                  setPricing({ ...pricing, in_person_diagnostic_price: parseFloat(e.target.value) || 0 })
                  setValidationErrors({ ...validationErrors, in_person: undefined })
                }}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {validationErrors.in_person && (
              <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {validationErrors.in_person}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              What's Included
            </label>
            <textarea
              value={pricing.in_person_diagnostic_description}
              onChange={(e) =>
                setPricing({ ...pricing, in_person_diagnostic_description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Describe what's included in your in-person diagnostic..."
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-950/30 border border-green-800/50 rounded-xl p-4">
          <div className="flex items-center gap-3 text-green-400">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">Diagnostic pricing saved successfully!</p>
          </div>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {saving ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Save Diagnostic Pricing
          </>
        )}
      </button>

      {/* Earnings Preview */}
      <div className="bg-gradient-to-br from-green-950/30 to-emerald-950/30 border border-green-800/50 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-600/20 rounded-xl">
            <TrendingUp className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-3">Your Earnings (70% Commission)</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Chat Diagnostic:</span>
                <span className="font-semibold text-green-400">
                  ${(pricing.chat_diagnostic_price * 0.7).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Video Diagnostic:</span>
                <span className="font-semibold text-green-400">
                  ${(pricing.video_diagnostic_price * 0.7).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">In-Person Diagnostic:</span>
                <span className="font-semibold text-green-400">
                  ${(pricing.in_person_diagnostic_price * 0.7).toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Platform retains 30% commission on diagnostic sessions
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
