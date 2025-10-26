'use client'

/**
 * Profile Completion Banner
 * Displays profile completion progress and blocks session acceptance until 80% complete
 */

import { AlertCircle, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { ProfileCompletion } from '@/lib/profileCompletion'

interface ProfileCompletionBannerProps {
  completion: ProfileCompletion
  className?: string
}

export function ProfileCompletionBanner({ completion, className = '' }: ProfileCompletionBannerProps) {
  // Don't show if profile is complete
  if (completion.canAcceptSessions) {
    return (
      <div className={`bg-green-50 border-l-4 border-green-500 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              Profile Complete - Ready to Accept Sessions!
            </p>
            <p className="text-sm text-green-700 mt-1">
              Your profile is {completion.score}% complete. You can now accept customer sessions.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Calculate points needed
  const pointsNeeded = 80 - completion.score

  return (
    <div className={`bg-orange-50 border-l-4 border-orange-500 p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertCircle className="h-6 w-6 text-orange-500" />
        </div>

        <div className="flex-1">
          {/* Header */}
          <h3 className="text-lg font-semibold text-orange-900 mb-2">
            Complete Your Profile to Start Accepting Sessions
          </h3>
          <p className="text-sm text-orange-800 mb-4">
            You need at least 80% profile completion to accept customer sessions.
            You're {pointsNeeded}% away from going live!
          </p>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-orange-800">
                Profile Completion
              </span>
              <span className="text-sm font-bold text-orange-900">
                {completion.score}%
              </span>
            </div>
            <div className="w-full bg-orange-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${completion.score}%` }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-orange-600">
                Current: {completion.score}%
              </span>
              <span className="text-xs font-semibold text-orange-700">
                Goal: 80%
              </span>
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-3 mb-4">
            <p className="text-sm font-medium text-orange-900">
              What's Missing:
            </p>
            <ul className="space-y-2">
              {completion.nextSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-orange-800">
                  <ArrowRight className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Missing Fields Detail */}
          {completion.missingFields.length > 0 && (
            <div className="mb-4">
              <details className="group">
                <summary className="text-sm font-medium text-orange-800 cursor-pointer hover:text-orange-900 mb-2">
                  View all missing fields ({completion.missingFields.length})
                </summary>
                <div className="mt-2 pl-4 border-l-2 border-orange-300">
                  <ul className="space-y-1">
                    {completion.missingFields.map((field) => (
                      <li key={field.field} className="text-sm text-orange-700 flex items-center justify-between">
                        <span className="capitalize">{field.field.replace(/_/g, ' ')}</span>
                        <span className="text-xs bg-orange-200 px-2 py-0.5 rounded">
                          +{field.weight} pts
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </div>
          )}

          {/* Action Button */}
          <Link
            href="/mechanic/profile"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors shadow-md hover:shadow-lg"
          >
            Complete Profile Now
            <ArrowRight className="h-4 w-4" />
          </Link>

          {/* Timeline Estimate */}
          <p className="text-xs text-orange-600 mt-3">
            Estimated time to complete: {estimateCompletionTime(completion.missingFields.length)} minutes
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Estimate time to complete based on missing fields
 */
function estimateCompletionTime(missingFieldsCount: number): number {
  // Rough estimate: 2 minutes per field
  const baseTime = missingFieldsCount * 2
  return Math.max(5, Math.min(baseTime, 30)) // Between 5-30 minutes
}

/**
 * Compact version for use in headers/cards
 */
export function ProfileCompletionMini({ completion, className = '' }: ProfileCompletionBannerProps) {
  if (completion.canAcceptSessions) {
    return (
      <div className={`flex items-center gap-2 text-green-600 ${className}`}>
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Profile Complete ({completion.score}%)</span>
      </div>
    )
  }

  return (
    <Link
      href="/mechanic/profile"
      className={`flex items-center gap-2 text-orange-600 hover:text-orange-700 ${className}`}
    >
      <AlertCircle className="h-4 w-4" />
      <span className="text-sm font-medium">
        Complete profile to accept sessions ({completion.score}%)
      </span>
    </Link>
  )
}
