'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'

interface FollowUpButtonProps {
  sessionId: string
  mechanicName: string
  onSuccess?: () => void
}

export function FollowUpButton({ sessionId, mechanicName, onSuccess }: FollowUpButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [followUpType, setFollowUpType] = useState<'quick_question' | 'mini_extension' | 'new_issue'>('quick_question')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!description.trim()) {
      setError('Please describe your follow-up question')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentSessionId: sessionId,
          followUpType,
          description: description.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create follow-up request')
      }

      setShowModal(false)
      setDescription('')
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to create follow-up request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-slate-900"
      >
        <MessageCircle className="h-5 w-5" />
        Ask a Follow-up Question
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-800 p-6">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Follow-up Question
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Ask {mechanicName} a follow-up question about your previous session
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Question Type */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Question Type
                </label>
                <select
                  value={followUpType}
                  onChange={(e) => setFollowUpType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 p-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="quick_question">Quick Question</option>
                  <option value="mini_extension">Mini Consultation</option>
                  <option value="new_issue">Related New Issue</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  {followUpType === 'quick_question' && 'Brief clarification or simple question'}
                  {followUpType === 'mini_extension' && 'Short follow-up session needed'}
                  {followUpType === 'new_issue' && 'New related problem discovered'}
                </p>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Your Question
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your follow-up question..."
                  rows={4}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 p-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={500}
                  required
                />
                <p className="mt-1 text-xs text-slate-400">
                  {description.length}/500 characters
                </p>
              </div>

              {/* Info Box */}
              <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                <p className="text-sm text-blue-200">
                  Limited to 3 follow-ups per session within 30 days of completion.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !description.trim()}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Follow-up'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-600 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
