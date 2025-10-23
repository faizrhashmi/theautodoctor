'use client'

import { useState } from 'react'
import { Clock, User, DollarSign, AlertCircle, CheckCircle } from 'lucide-react'

interface UnattendedRequest {
  id: string
  customer_id: string
  customer_name: string | null
  customer_email: string | null
  session_type: 'chat' | 'video' | 'diagnostic'
  plan_code: string
  status: string
  created_at: string
}

interface Mechanic {
  id: string
  name: string | null
  email: string
}

interface UnattendedRequestsListProps {
  unattendedRequests: UnattendedRequest[]
  expiredRequests: UnattendedRequest[]
  mechanics: Mechanic[]
}

export default function UnattendedRequestsList({
  unattendedRequests,
  expiredRequests,
  mechanics,
}: UnattendedRequestsListProps) {
  const [assigningRequestId, setAssigningRequestId] = useState<string | null>(null)
  const [selectedMechanic, setSelectedMechanic] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const calculateAge = (createdAt: string) => {
    const ageMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
    if (ageMinutes < 60) return `${ageMinutes}m`
    const ageHours = Math.floor(ageMinutes / 60)
    return `${ageHours}h ${ageMinutes % 60}m`
  }

  const formatPlan = (planCode: string) => {
    const planMap: Record<string, string> = {
      chat10: '10-min Chat ($9.99)',
      video15: '15-min Video ($29.99)',
      diagnostic: 'Diagnostic ($49.99)',
    }
    return planMap[planCode] || planCode
  }

  const handleAssign = async (requestId: string) => {
    const mechanicId = selectedMechanic[requestId]
    if (!mechanicId) {
      setErrorMessage('Please select a mechanic')
      return
    }

    setAssigningRequestId(requestId)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/admin/requests/${requestId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mechanicId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign request')
      }

      setSuccessMessage(data.message || 'Request assigned successfully')
      // Reload the page to refresh the list
      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to assign request')
    } finally {
      setAssigningRequestId(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-400" />
            <p className="text-sm text-green-200">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
            <p className="text-sm text-red-200">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Unattended Requests */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Unattended Requests ({unattendedRequests.length})
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          These requests were not accepted by any mechanic within 5 minutes. Assign them manually to available mechanics.
        </p>

        {unattendedRequests.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm text-slate-600">No unattended requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {unattendedRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-slate-600" />
                      <span className="font-semibold text-slate-900">
                        {request.customer_name || 'Customer'}
                      </span>
                      <span className="text-sm text-slate-600">
                        {request.customer_email}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        {formatPlan(request.plan_code)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Waiting: {calculateAge(request.created_at)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-3">
                      <select
                        value={selectedMechanic[request.id] || ''}
                        onChange={(e) =>
                          setSelectedMechanic({
                            ...selectedMechanic,
                            [request.id]: e.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        disabled={assigningRequestId === request.id}
                      >
                        <option value="">Select mechanic...</option>
                        {mechanics.map((mechanic) => (
                          <option key={mechanic.id} value={mechanic.id}>
                            {mechanic.name || mechanic.email}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleAssign(request.id)}
                        disabled={
                          !selectedMechanic[request.id] ||
                          assigningRequestId === request.id
                        }
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {assigningRequestId === request.id ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expired Requests */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Expired Requests ({expiredRequests.length})
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          These requests are older than 2 hours. The Stripe payment token has expired. Customer must re-request.
        </p>

        {expiredRequests.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm text-slate-600">No expired requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {expiredRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-slate-300 bg-slate-100 p-4 opacity-75"
              >
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-slate-600" />
                  <span className="font-semibold text-slate-900">
                    {request.customer_name || 'Customer'}
                  </span>
                  <span className="text-sm text-slate-600">
                    {request.customer_email}
                  </span>
                </div>

                <div className="flex items-center gap-6 text-sm text-slate-600 mt-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {formatPlan(request.plan_code)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Created: {calculateAge(request.created_at)} ago
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Stripe token expired. Customer must create a new request.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
