'use client'

import { useState } from 'react'
import { ArrowRight, X } from 'lucide-react'

interface UpsellCardProps {
  upsellId: string
  title: string
  description: string | null
  priceCents: number | null
  type: string
  onDismiss?: () => void
  onAccept?: () => void
}

export function UpsellCard({
  upsellId,
  title,
  description,
  priceCents,
  type,
  onDismiss,
  onAccept,
}: UpsellCardProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleClick = async () => {
    setIsProcessing(true)

    try {
      await fetch(`/api/upsells/${upsellId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'click' }),
      })

      if (onAccept) onAccept()
    } catch (error) {
      console.error('Failed to track upsell click:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDismiss = async () => {
    setIsProcessing(true)

    try {
      await fetch(`/api/upsells/${upsellId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })

      if (onDismiss) onDismiss()
    } catch (error) {
      console.error('Failed to dismiss upsell:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'follow_up':
        return 'border-yellow-500/30 bg-yellow-500/10'
      case 'premium_upgrade':
        return 'border-purple-500/30 bg-purple-500/10'
      case 'maintenance_plan':
        return 'border-green-500/30 bg-green-500/10'
      case 'diagnostic_package':
        return 'border-blue-500/30 bg-blue-500/10'
      default:
        return 'border-slate-500/30 bg-slate-500/10'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'follow_up':
        return 'Follow-up Session'
      case 'premium_upgrade':
        return 'Premium Upgrade'
      case 'maintenance_plan':
        return 'Maintenance Plan'
      case 'diagnostic_package':
        return 'Diagnostic Package'
      default:
        return 'Recommendation'
    }
  }

  return (
    <div
      className={`relative rounded-lg border p-4 ${getTypeColor(type)}`}
    >
      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        disabled={isProcessing}
        className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:bg-slate-700/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Type Badge */}
      <div className="mb-2">
        <span className="inline-block rounded-full bg-white/10 px-2 py-1 text-xs font-medium text-white">
          {getTypeLabel(type)}
        </span>
      </div>

      {/* Title */}
      <h4 className="mb-2 pr-6 text-lg font-semibold text-white">{title}</h4>

      {/* Description */}
      {description && (
        <p className="mb-4 text-sm text-slate-300">{description}</p>
      )}

      {/* Price and CTA */}
      <div className="flex items-center justify-between">
        {priceCents !== null && (
          <span className="text-xl font-bold text-white">
            {formatPrice(priceCents)}
          </span>
        )}
        <button
          onClick={handleClick}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? 'Loading...' : 'Learn More'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
