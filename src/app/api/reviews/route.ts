import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function createClient() {
  const cookieStore = cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

/**
 * POST /api/reviews
 * Submit a review for a completed session
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { sessionId, rating, reviewText } = body

    // Validate input
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Verify session exists and belongs to user
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, customer_user_id, mechanic_id, status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify user is the customer
    if (session.customer_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden - Not your session' }, { status: 403 })
    }

    // Verify session is completed
    if (session.status !== 'completed') {
      return NextResponse.json(
        { error: 'Cannot review incomplete session' },
        { status: 400 }
      )
    }

    // Check if review already exists (unique constraint on session_id)
    const { data: existingReview } = await supabaseAdmin
      .from('mechanic_reviews')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (existingReview) {
      return NextResponse.json(
        { error: 'Review already submitted for this session' },
        { status: 409 }
      )
    }

    // Create review
    const { data: review, error: reviewError } = await supabaseAdmin
      .from('mechanic_reviews')
      .insert({
        session_id: sessionId,
        mechanic_id: session.mechanic_id,
        customer_id: user.id,
        rating,
        review_text: reviewText || null,
      })
      .select()
      .single()

    if (reviewError) {
      console.error('[POST /api/reviews] Failed to create review:', reviewError)
      return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
    }

    // Track CRM interaction
    try {
      await supabaseAdmin.from('crm_interactions').insert({
        customer_id: user.id,
        interaction_type: 'review_submitted',
        session_id: sessionId,
        metadata: { review_id: review.id, rating },
      })
    } catch (crmError) {
      console.error('[POST /api/reviews] Failed to track CRM interaction:', crmError)
      // Don't fail the request
    }

    return NextResponse.json({
      success: true,
      review,
    })
  } catch (error) {
    console.error('[POST /api/reviews] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/reviews?mechanicId=xxx
 * Get reviews for a mechanic
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const mechanicId = searchParams.get('mechanicId')

    if (!mechanicId) {
      return NextResponse.json({ error: 'Mechanic ID is required' }, { status: 400 })
    }

    // Get reviews for mechanic with customer details
    const { data: reviews, error } = await supabaseAdmin
      .from('mechanic_reviews')
      .select(
        `
        id,
        rating,
        review_text,
        helpful_count,
        created_at,
        customer:customer_id (
          full_name
        )
      `
      )
      .eq('mechanic_id', mechanicId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[GET /api/reviews] Failed to fetch reviews:', error)
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }

    // Get mechanic stats
    const { data: mechanic } = await supabaseAdmin
      .from('mechanics')
      .select('avg_rating, total_reviews')
      .eq('user_id', mechanicId)
      .single()

    return NextResponse.json({
      reviews: reviews || [],
      stats: mechanic
        ? {
            avgRating: mechanic.avg_rating,
            totalReviews: mechanic.total_reviews,
          }
        : { avgRating: 0, totalReviews: 0 },
    })
  } catch (error) {
    console.error('[GET /api/reviews] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
