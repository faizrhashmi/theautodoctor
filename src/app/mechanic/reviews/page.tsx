'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Star, TrendingUp, Award, MessageSquare, RefreshCw,
  Filter, Calendar, ThumbsUp, AlertCircle
} from 'lucide-react'

type Review = {
  id: string
  session_id: string
  customer_id: string
  customer_name: string
  rating: number
  comment: string | null
  created_at: string
  session?: {
    plan: string
    type: string
    ended_at: string
  }
}

type RatingStats = {
  average_rating: number
  total_reviews: number
  five_star: number
  four_star: number
  three_star: number
  two_star: number
  one_star: number
  recent_trend: 'up' | 'down' | 'stable'
}

export default function MechanicReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<RatingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [ratingFilter, setRatingFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')

  // Pagination
  const [page, setPage] = useState(0)
  const [limit] = useState(20)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    fetchReviews()
  }, [page, ratingFilter, sortBy])

  async function fetchReviews() {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (ratingFilter !== 'all') params.append('rating', ratingFilter)
      params.append('sort', sortBy)
      params.append('limit', String(limit))
      params.append('offset', String(page * limit))

      const response = await fetch(`/api/mechanic/reviews?${params.toString()}`)

      if (response.status === 401) {
        router.push('/mechanic/login')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to load reviews')
      }

      const data = await response.json()
      setReviews(data.reviews || [])
      setStats(data.stats || null)
      setHasMore(data.reviews?.length === limit)
    } catch (err) {
      console.error('Error loading reviews:', err)
      setError('Failed to load reviews. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function renderStars(rating: number, size: 'sm' | 'md' | 'lg' = 'md') {
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    }

    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-slate-600'
            }`}
          />
        ))}
      </div>
    )
  }

  function getStarPercentage(count: number, total: number) {
    if (total === 0) return 0
    return Math.round((count / total) * 100)
  }

  const filteredReviews = reviews

  if (loading && page === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 sm:px-6 py-6 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 sm:px-6 py-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Reviews & Ratings</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">See what customers are saying about your service</p>
          </div>
          <button
            onClick={() => router.push('/mechanic/dashboard')}
            className="text-sm text-slate-400 hover:text-slate-300 transition self-start sm:self-auto"
          >
            ← Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-900/20 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        {stats && (
          <div className="mb-6 sm:mb-8 grid gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Overall Rating */}
            <div className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
              <h2 className="text-lg font-bold text-white mb-4">Overall Rating</h2>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-yellow-400">
                    {stats.average_rating.toFixed(1)}
                  </div>
                  <div className="mt-2">
                    {renderStars(Math.round(stats.average_rating), 'lg')}
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    Based on {stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = stats[`${['one', 'two', 'three', 'four', 'five'][star - 1]}_star` as keyof RatingStats] as number
                    const percentage = getStarPercentage(count, stats.total_reviews)
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-sm text-slate-400 w-8">{star}★</span>
                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-400 w-12 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2">
              <div className="rounded-2xl border border-green-700/50 bg-green-900/20 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-300">Total Reviews</p>
                    <p className="mt-2 text-3xl font-bold text-green-400">{stats.total_reviews}</p>
                  </div>
                  <MessageSquare className="h-10 w-10 text-green-400" />
                </div>
              </div>

              <div className="rounded-2xl border border-yellow-700/50 bg-yellow-900/20 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-300">5-Star Reviews</p>
                    <p className="mt-2 text-3xl font-bold text-yellow-400">{stats.five_star}</p>
                    <p className="text-xs text-yellow-300/60 mt-1">
                      {getStarPercentage(stats.five_star, stats.total_reviews)}% of total
                    </p>
                  </div>
                  <Award className="h-10 w-10 text-yellow-400" />
                </div>
              </div>

              <div className="rounded-2xl border border-blue-700/50 bg-blue-900/20 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-300">Avg Rating</p>
                    <p className="mt-2 text-3xl font-bold text-blue-400">{stats.average_rating.toFixed(2)}</p>
                  </div>
                  <Star className="h-10 w-10 text-blue-400 fill-blue-400" />
                </div>
              </div>

              <div className="rounded-2xl border border-purple-700/50 bg-purple-900/20 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-300">Trend</p>
                    <p className="mt-2 text-lg font-bold text-purple-400 capitalize">{stats.recent_trend}</p>
                    <p className="text-xs text-purple-300/60 mt-1">Last 30 days</p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-bold text-white">Filters</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Rating</label>
              <select
                value={ratingFilter}
                onChange={(e) => {
                  setRatingFilter(e.target.value)
                  setPage(0)
                }}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-white focus:border-yellow-500 focus:outline-none"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any)
                  setPage(0)
                }}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-white focus:border-yellow-500 focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Customer Reviews</h2>
            <button
              onClick={() => {
                setPage(0)
                fetchReviews()
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {filteredReviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/30 p-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 text-slate-400">No reviews yet</p>
              <p className="mt-2 text-sm text-slate-500">
                {stats?.total_reviews === 0
                  ? 'Complete sessions to start receiving reviews'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {filteredReviews.map(review => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-semibold text-white">
                            {review.customer_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{review.customer_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {renderStars(review.rating, 'sm')}
                              <span className="text-xs text-slate-500">
                                {new Date(review.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {review.comment && (
                          <p className="mt-3 text-slate-300">{review.comment}</p>
                        )}

                        {review.session && (
                          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                            <span>Plan: {review.session.plan}</span>
                            <span>Type: {review.session.type}</span>
                            <span>
                              <Calendar className="inline h-3 w-3 mr-1" />
                              {new Date(review.session.ended_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                        review.rating >= 4
                          ? 'bg-green-500/10 text-green-400'
                          : review.rating === 3
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {review.rating}.0
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-400">Page {page + 1}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasMore}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
