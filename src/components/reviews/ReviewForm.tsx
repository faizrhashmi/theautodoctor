'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

interface ReviewFormProps {
  sessionId: string
  mechanicName: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function ReviewForm({ sessionId, mechanicName, onSuccess, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          rating,
          reviewText: reviewText.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review')
      }

      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to submit review')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">
        Rate Your Experience with {mechanicName}
      </h3>

      <form onSubmit={handleSubmit}>
        {/* Star Rating */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Your Rating
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoverRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="mt-2 text-sm text-slate-400">
              {rating === 5 && 'Excellent!'}
              {rating === 4 && 'Very Good'}
              {rating === 3 && 'Good'}
              {rating === 2 && 'Fair'}
              {rating === 1 && 'Poor'}
            </p>
          )}
        </div>

        {/* Review Text */}
        <div className="mb-6">
          <label
            htmlFor="reviewText"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Your Review (Optional)
          </label>
          <textarea
            id="reviewText"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience with other customers..."
            rows={4}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 p-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={500}
          />
          <p className="mt-1 text-xs text-slate-400">
            {reviewText.length}/500 characters
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/30 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-600 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
