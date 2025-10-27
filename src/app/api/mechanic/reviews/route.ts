import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('aad_mech')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const rating = searchParams.get('rating')
    const sort = searchParams.get('sort') || 'newest'
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build reviews query
    let reviewsQuery = supabaseAdmin
      .from('session_reviews')
      .select(`
        *,
        sessions (
          plan,
          type,
          ended_at,
          customer_user_id
        ),
        users!session_reviews_customer_user_id_fkey (
          full_name
        )
      `)
      .eq('mechanic_id', session.mechanic_id)

    // Apply rating filter
    if (rating && rating !== 'all') {
      reviewsQuery = reviewsQuery.eq('rating', parseInt(rating, 10))
    }

    // Apply sorting
    switch (sort) {
      case 'oldest':
        reviewsQuery = reviewsQuery.order('created_at', { ascending: true })
        break
      case 'highest':
        reviewsQuery = reviewsQuery.order('rating', { ascending: false })
        break
      case 'lowest':
        reviewsQuery = reviewsQuery.order('rating', { ascending: true })
        break
      case 'newest':
      default:
        reviewsQuery = reviewsQuery.order('created_at', { ascending: false })
        break
    }

    // Apply pagination
    reviewsQuery = reviewsQuery.range(offset, offset + limit - 1)

    const { data: reviewsData, error: reviewsError } = await reviewsQuery

    if (reviewsError) {
      console.error('[MECHANIC REVIEWS API] Error:', reviewsError)
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }

    // Format reviews with customer names
    const reviews = reviewsData?.map((review: any) => ({
      id: review.id,
      session_id: review.session_id,
      customer_id: review.customer_user_id,
      customer_name: review.users?.full_name || 'Customer',
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      session: review.sessions ? {
        plan: review.sessions.plan,
        type: review.sessions.type,
        ended_at: review.sessions.ended_at,
      } : null,
    })) || []

    // Calculate statistics (for all reviews, not just filtered)
    const { data: allReviews } = await supabaseAdmin
      .from('session_reviews')
      .select('rating, created_at')
      .eq('mechanic_id', session.mechanic_id)

    const stats = {
      average_rating: 0,
      total_reviews: allReviews?.length || 0,
      five_star: allReviews?.filter(r => r.rating === 5).length || 0,
      four_star: allReviews?.filter(r => r.rating === 4).length || 0,
      three_star: allReviews?.filter(r => r.rating === 3).length || 0,
      two_star: allReviews?.filter(r => r.rating === 2).length || 0,
      one_star: allReviews?.filter(r => r.rating === 1).length || 0,
      recent_trend: 'stable' as 'up' | 'down' | 'stable',
    }

    if (allReviews && allReviews.length > 0) {
      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0)
      stats.average_rating = totalRating / allReviews.length

      // Calculate trend (last 10 vs previous 10)
      const sortedReviews = [...allReviews].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      if (sortedReviews.length >= 20) {
        const recent10 = sortedReviews.slice(0, 10)
        const previous10 = sortedReviews.slice(10, 20)

        const recentAvg = recent10.reduce((sum, r) => sum + r.rating, 0) / 10
        const previousAvg = previous10.reduce((sum, r) => sum + r.rating, 0) / 10

        if (recentAvg > previousAvg + 0.2) {
          stats.recent_trend = 'up'
        } else if (recentAvg < previousAvg - 0.2) {
          stats.recent_trend = 'down'
        }
      }
    }

    return NextResponse.json({
      reviews,
      stats,
    })
  } catch (error) {
    console.error('[MECHANIC REVIEWS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
