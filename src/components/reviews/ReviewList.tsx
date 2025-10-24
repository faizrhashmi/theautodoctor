'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'

interface Review {
  id: string
  rating: number
  review_text: string | null
  created_at: string
  customer: {
    full_name: string | null
  } | null
}

interface ReviewListProps {
  mechanicId: string
  limit?: number
}

export function ReviewList({ mechanicId, limit }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchReviews()
  }, [mechanicId])

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/reviews?mechanicId=${mechanicId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load reviews')
      }

      setReviews(limit ? data.reviews.slice(0, limit) : data.reviews)
      setStats(data.stats)
    } catch (err: any) {
      setError(err.message || 'Failed to load reviews')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'
            }`}
          />
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-blue-500"></div>
          <span className="ml-3 text-slate-400">Loading reviews...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
        <p className="text-red-200">{error}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      {/* Stats Summary */}
      <div className="mb-6 flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-white">
              {stats.avgRating.toFixed(1)}
            </span>
            {renderStars(Math.round(stats.avgRating))}
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-slate-400">No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-lg border border-slate-700 bg-slate-900 p-4"
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="font-medium text-white">
                    {review.customer?.full_name || 'Anonymous'}
                  </p>
                  <div className="mt-1">{renderStars(review.rating)}</div>
                </div>
                <p className="text-sm text-slate-400">{formatDate(review.created_at)}</p>
              </div>
              {review.review_text && (
                <p className="mt-3 text-slate-300">{review.review_text}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
