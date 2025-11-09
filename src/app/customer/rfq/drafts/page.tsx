'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, Clock, AlertCircle, Check, Edit, Eye } from 'lucide-react'

interface DraftRFQ {
  id: string
  title: string
  description: string
  issue_category: string
  urgency: string
  budget_min: number | null
  budget_max: number | null
  bid_deadline: string
  created_at: string
  mechanics: {
    id: string
    full_name: string
    profile_photo_url: string | null
    rating: number | null
  } | null
  vehicles: {
    id: string
    year: number
    make: string
    model: string
  } | null
  metadata: any
}

export default function DraftRFQsPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<DraftRFQ[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  useEffect(() => {
    fetchDrafts()
  }, [])

  async function fetchDrafts() {
    try {
      const response = await fetch('/api/customer/rfq/drafts')
      if (response.ok) {
        const data = await response.json()
        setDrafts(data.drafts || [])
      }
    } catch (error) {
      console.error('Failed to fetch drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleApproveDraft(draftId: string) {
    if (!confirm('Approve this RFQ and publish it to the marketplace?')) {
      return
    }

    setApprovingId(draftId)
    try {
      const response = await fetch(`/api/customer/rfq/drafts/${draftId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_consent: true })
      })

      if (response.ok) {
        const data = await response.json()
        alert('RFQ approved and published to marketplace!')
        // Redirect to RFQ bids page
        router.push(`/customer/rfq/${data.rfq_id}/bids`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to approve RFQ')
      }
    } catch (error) {
      console.error('Failed to approve draft:', error)
      alert('Failed to approve RFQ')
    } finally {
      setApprovingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading draft RFQs...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Draft Repair Requests</h1>
          <p className="text-slate-400">
            Your mechanic has prepared these repair requests for you. Review and approve to get quotes from local workshops.
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1">How it works</p>
              <p className="text-blue-300 text-sm">
                Your diagnostic mechanic has pre-filled the technical details. Review the request, make any changes if needed,
                and approve to publish it to the marketplace. Your mechanic will earn a small 2% referral commission if you accept a bid.
              </p>
            </div>
          </div>
        </div>

        {/* Draft RFQs List */}
        {drafts.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
            <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No draft requests yet</p>
            <p className="text-sm text-slate-500">
              Your mechanic will create repair requests here after diagnostic sessions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">{draft.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      {draft.vehicles && (
                        <span>
                          {draft.vehicles.year} {draft.vehicles.make} {draft.vehicles.model}
                        </span>
                      )}
                      {draft.issue_category && (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                          {draft.issue_category}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded">
                        {draft.urgency}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-slate-300 mb-4 line-clamp-3">{draft.description}</p>

                {/* Mechanic Info */}
                {draft.mechanics && (
                  <div className="flex items-center gap-3 mb-4 p-3 bg-slate-800/50 rounded-lg">
                    <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {draft.mechanics.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Prepared by</p>
                      <p className="text-white font-medium">{draft.mechanics.full_name}</p>
                    </div>
                  </div>
                )}

                {/* Budget */}
                {(draft.budget_min || draft.budget_max) && (
                  <div className="mb-4">
                    <p className="text-sm text-slate-400 mb-1">Estimated Budget</p>
                    <p className="text-white font-semibold">
                      ${draft.budget_min?.toFixed(2) || '0.00'} - ${draft.budget_max?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                )}

                {/* Deadline */}
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                  <Clock className="h-4 w-4" />
                  <span>Bids close {new Date(draft.bid_deadline).toLocaleDateString()}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleApproveDraft(draft.id)}
                    disabled={approvingId === draft.id}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {approvingId === draft.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Approving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Approve & Publish
                      </>
                    )}
                  </button>
                  <Link
                    href={`/customer/rfq/drafts/${draft.id}/edit`}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition"
                  >
                    <Edit className="h-4 w-4" />
                    Edit First
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8">
          <Link href="/customer/dashboard" className="text-blue-400 hover:text-blue-300 transition">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
