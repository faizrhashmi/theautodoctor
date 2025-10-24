'use client'

import { useState } from 'react'
import { ReviewForm } from '@/components/reviews/ReviewForm'
import { ReviewList } from '@/components/reviews/ReviewList'
import { FollowUpButton } from '@/components/follow-up/FollowUpButton'
import { UpsellCard } from '@/components/upsells/UpsellCard'

export default function TestNewFeaturesPage() {
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [testSessionId] = useState('test-session-id')
  const [testMechanicId] = useState('test-mechanic-id')

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-white">
          🧪 Test New B2C Features
        </h1>

        {/* API Endpoint Tests */}
        <div className="mb-8 rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">
            📡 API Endpoints Created
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="rounded bg-green-500/20 px-2 py-1 font-mono text-green-300">
                POST
              </span>
              <span className="text-slate-300">/api/reviews</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-500/20 px-2 py-1 font-mono text-blue-300">
                GET
              </span>
              <span className="text-slate-300">/api/reviews?mechanicId=xxx</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-green-500/20 px-2 py-1 font-mono text-green-300">
                POST
              </span>
              <span className="text-slate-300">/api/follow-up</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-500/20 px-2 py-1 font-mono text-blue-300">
                GET
              </span>
              <span className="text-slate-300">/api/follow-up?sessionId=xxx</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-500/20 px-2 py-1 font-mono text-blue-300">
                GET
              </span>
              <span className="text-slate-300">/api/upsells</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-purple-500/20 px-2 py-1 font-mono text-purple-300">
                PUT
              </span>
              <span className="text-slate-300">/api/upsells/:id</span>
            </div>
          </div>
        </div>

        {/* Review Form Demo */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-white">
            ⭐ Review Form Component
          </h2>
          {!showReviewForm ? (
            <button
              onClick={() => setShowReviewForm(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Show Review Form Demo
            </button>
          ) : (
            <ReviewForm
              sessionId={testSessionId}
              mechanicName="Test Mechanic"
              onSuccess={() => {
                alert('Review submitted! (This is a demo)')
                setShowReviewForm(false)
              }}
              onCancel={() => setShowReviewForm(false)}
            />
          )}
        </div>

        {/* Review List Demo */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-white">
            📋 Review List Component
          </h2>
          <ReviewList mechanicId={testMechanicId} limit={5} />
        </div>

        {/* Follow-up Button Demo */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-white">
            💬 Follow-up Question Component
          </h2>
          <FollowUpButton
            sessionId={testSessionId}
            mechanicName="Test Mechanic"
            onSuccess={() => alert('Follow-up request created! (This is a demo)')}
          />
        </div>

        {/* Upsell Cards Demo */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-white">
            💎 Upsell Card Components
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <UpsellCard
              upsellId="test-1"
              title="Premium Diagnostic Package"
              description="Get a comprehensive diagnostic report with detailed analysis and recommendations."
              priceCents={4999}
              type="diagnostic_package"
              onDismiss={() => alert('Upsell dismissed')}
              onAccept={() => alert('Upsell accepted')}
            />
            <UpsellCard
              upsellId="test-2"
              title="Follow-up Consultation"
              description="Have additional questions? Book a 15-minute follow-up with your mechanic."
              priceCents={1999}
              type="follow_up"
              onDismiss={() => alert('Upsell dismissed')}
              onAccept={() => alert('Upsell accepted')}
            />
            <UpsellCard
              upsellId="test-3"
              title="Monthly Maintenance Plan"
              description="Stay on top of your vehicle maintenance with our monthly plan."
              priceCents={9999}
              type="maintenance_plan"
              onDismiss={() => alert('Upsell dismissed')}
              onAccept={() => alert('Upsell accepted')}
            />
            <UpsellCard
              upsellId="test-4"
              title="Upgrade to Premium"
              description="Get priority access, extended session times, and more."
              priceCents={2999}
              type="premium_upgrade"
              onDismiss={() => alert('Upsell dismissed')}
              onAccept={() => alert('Upsell accepted')}
            />
          </div>
        </div>

        {/* Database Migrations Info */}
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">
            🗄️ Database Migrations
          </h2>
          <p className="mb-4 text-slate-300">
            Run these migrations in your Supabase SQL editor:
          </p>
          <div className="space-y-2 text-sm">
            <div className="rounded bg-slate-700 p-3">
              <code className="text-green-300">migrations/08_reputation_system.sql</code>
              <p className="mt-1 text-slate-400">
                Adds mechanic profiles, ratings, reviews, and specialties
              </p>
            </div>
            <div className="rounded bg-slate-700 p-3">
              <code className="text-green-300">migrations/09_crm_and_upsells.sql</code>
              <p className="mt-1 text-slate-400">
                Adds CRM tracking and upsell recommendation system
              </p>
            </div>
            <div className="rounded bg-slate-700 p-3">
              <code className="text-green-300">migrations/10_follow_up_requests.sql</code>
              <p className="mt-1 text-slate-400">
                Adds follow-up question flow with rate limiting
              </p>
            </div>
          </div>
        </div>

        {/* Email Templates Info */}
        <div className="mt-8 rounded-lg border border-blue-500/30 bg-blue-500/10 p-6">
          <h2 className="mb-4 text-xl font-semibold text-blue-200">
            📧 Email Templates Integrated
          </h2>
          <ul className="space-y-2 text-sm text-blue-200">
            <li>✅ Mechanic Assigned - Sends when mechanic accepts request</li>
            <li>✅ Session Ended - Sends when session completes</li>
            <li>✅ Summary Delivered - Enhanced branded template</li>
            <li>📝 Booking Confirmed - Ready to integrate</li>
            <li>📝 Session Starting - Ready for cron job</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
