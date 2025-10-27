'use client'

import { useState } from 'react'
import { MessageCircle, Video, Clock, DollarSign, User, Car, AlertCircle, CheckCircle } from 'lucide-react'

interface VirtualSessionCardProps {
  session: {
    id: string
    customer_name: string
    customer_email?: string
    customer_phone?: string
    session_type: 'chat' | 'video' | 'upgraded_from_chat'
    status: string
    base_price: number
    total_price: number
    vehicle_info?: any
    issue_description?: string
    created_at: string
    scheduled_start?: string
    scheduled_end?: string
  }
  onAccept?: (sessionId: string) => void
  onView?: (sessionId: string) => void
}

export default function VirtualSessionCard({ session, onAccept, onView }: VirtualSessionCardProps) {
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = async () => {
    if (!onAccept) return

    setAccepting(true)
    setError(null)

    try {
      await onAccept(session.id)
    } catch (err: any) {
      setError(err.message || 'Failed to accept session')
      setAccepting(false)
    }
  }

  const getSessionIcon = () => {
    switch (session.session_type) {
      case 'chat':
        return <MessageCircle className="w-5 h-5" />
      case 'video':
      case 'upgraded_from_chat':
        return <Video className="w-5 h-5" />
      default:
        return <MessageCircle className="w-5 h-5" />
    }
  }

  const getSessionTypeLabel = () => {
    switch (session.session_type) {
      case 'chat':
        return 'Chat Consultation'
      case 'video':
        return 'Video Consultation'
      case 'upgraded_from_chat':
        return 'Video (Upgraded)'
      default:
        return 'Consultation'
    }
  }

  const getSessionTypeColor = () => {
    switch (session.session_type) {
      case 'chat':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'video':
      case 'upgraded_from_chat':
        return 'bg-green-50 text-green-700 border-green-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const formatTime = (isoString?: string) => {
    if (!isoString) return null
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getVehicleInfo = () => {
    if (!session.vehicle_info) return 'Vehicle not specified'
    const v = session.vehicle_info
    if (typeof v === 'string') return v
    return `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim() || 'Vehicle info incomplete'
  }

  const getYourEarnings = () => {
    // Platform fee is 15%
    const platformFee = session.total_price * 0.15
    const yourEarnings = session.total_price - platformFee
    return yourEarnings.toFixed(2)
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${getSessionTypeColor()}`}>
              {getSessionIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {getSessionTypeLabel()}
              </h3>
              <p className="text-sm text-gray-500">
                Requested {formatTime(session.created_at)}
              </p>
            </div>
          </div>

          {session.status === 'pending' && (
            <div className="px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-sm font-medium">
              New Request
            </div>
          )}
        </div>

        {/* Customer Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">
              {session.customer_name}
            </span>
          </div>
          {session.customer_phone && (
            <div className="text-sm text-gray-600">
              📞 {session.customer_phone}
            </div>
          )}
        </div>

        {/* Vehicle Info */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Car className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Vehicle</span>
          </div>
          <p className="text-sm text-gray-900 ml-6">
            {getVehicleInfo()}
          </p>
        </div>

        {/* Issue Description */}
        {session.issue_description && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-900 mb-1">Issue Described:</p>
                <p className="text-sm text-blue-800">
                  {session.issue_description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Scheduled Time */}
        {session.scheduled_start && (
          <div className="mb-4 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700">
              Scheduled: {formatTime(session.scheduled_start)}
            </span>
          </div>
        )}

        {/* Earnings */}
        <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-green-700" />
                <span className="text-xs font-semibold text-green-900">Your Earnings</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                ${getYourEarnings()}
              </p>
              <p className="text-xs text-green-700">
                (${session.total_price.toFixed(2)} total, 15% platform fee)
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-green-700">Session Duration</div>
              <div className="text-sm font-semibold text-green-900">
                {session.session_type === 'chat' ? '15-30 min' : '30-45 min'}
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        {session.status === 'pending' && onAccept && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className={`py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                accepting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl'
              }`}
            >
              {accepting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Accepting...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Accept Session</span>
                </>
              )}
            </button>

            {onView && (
              <button
                onClick={() => onView(session.id)}
                className="py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200"
              >
                View Details
              </button>
            )}
          </div>
        )}

        {session.status === 'accepted' && onView && (
          <button
            onClick={() => onView(session.id)}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Go to Session
          </button>
        )}
      </div>
    </div>
  )
}
