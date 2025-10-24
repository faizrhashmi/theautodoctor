'use client'

import { useEffect, useState } from 'react'
import { Sparkles, X, ArrowRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Upsell {
  id: string
  recommendation_type: string
  service_title: string
  service_description: string | null
  price_cents: number | null
  shown_at: string | null
  clicked_at: string | null
  dismissed_at: string | null
}

interface UpsellRecommendationsProps {
  sessionId: string
}

export default function UpsellRecommendations({ sessionId }: UpsellRecommendationsProps) {
  const [upsells, setUpsells] = useState<Upsell[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    async function fetchUpsells() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/upsells`)
        if (response.ok) {
          const data = await response.json()
          setUpsells(data.upsells || [])
        }
      } catch (error) {
        console.error('Failed to fetch upsells:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUpsells()
  }, [sessionId])

  const handleClick = async (upsell: Upsell) => {
    try {
      // Track the click
      await fetch(`/api/upsells/${upsell.id}/click`, { method: 'POST' })

      // Redirect based on recommendation type
      if (upsell.recommendation_type === 'follow_up') {
        router.push('/intake')
      } else if (upsell.recommendation_type === 'diagnostic_package') {
        router.push('/intake?plan=diagnostic')
      } else if (upsell.recommendation_type === 'video_session') {
        router.push('/intake?plan=video')
      } else {
        router.push('/intake')
      }
    } catch (error) {
      console.error('Failed to track upsell click:', error)
      // Still navigate even if tracking fails
      router.push('/intake')
    }
  }

  const handleDismiss = async (upsellId: string) => {
    try {
      await fetch(`/api/upsells/${upsellId}/dismiss`, { method: 'POST' })
      setDismissedIds((prev) => new Set(prev).add(upsellId))
    } catch (error) {
      console.error('Failed to dismiss upsell:', error)
      // Still remove from UI even if tracking fails
      setDismissedIds((prev) => new Set(prev).add(upsellId))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-xl">
        <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
        <span className="ml-2 text-sm text-slate-300">Loading recommendations...</span>
      </div>
    )
  }

  // Filter out dismissed upsells
  const visibleUpsells = upsells.filter((u) => !dismissedIds.has(u.id) && !u.dismissed_at)

  if (visibleUpsells.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-orange-400" />
        <h2 className="text-xl font-semibold text-white">Recommended for you</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleUpsells.map((upsell) => (
          <div
            key={upsell.id}
            className="group relative rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-6 shadow-lg transition hover:border-orange-500/50 hover:shadow-xl"
          >
            {/* Dismiss button */}
            <button
              onClick={() => handleDismiss(upsell.id)}
              className="absolute right-3 top-3 rounded-full p-1 text-slate-400 transition hover:bg-slate-700 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-3">
              {/* Badge */}
              <span className="inline-block rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-200">
                {upsell.recommendation_type.replace('_', ' ')}
              </span>

              {/* Title */}
              <h3 className="pr-6 text-lg font-bold text-white">{upsell.service_title}</h3>

              {/* Description */}
              {upsell.service_description && (
                <p className="text-sm leading-relaxed text-slate-300">{upsell.service_description}</p>
              )}

              {/* Price and CTA */}
              <div className="flex items-center justify-between pt-2">
                {upsell.price_cents !== null && (
                  <span className="text-2xl font-bold text-white">
                    ${(upsell.price_cents / 100).toFixed(2)}
                  </span>
                )}

                <button
                  onClick={() => handleClick(upsell)}
                  className="ml-auto flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-orange-700 hover:shadow-lg group-hover:px-6"
                >
                  Get started
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
