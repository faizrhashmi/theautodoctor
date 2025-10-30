import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // ✅ SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(request)
    if (authResult.error) return authResult.error

    const customer = authResult.data
    console.log(`[CUSTOMER] ${customer.email} rating session ${params.sessionId}`)

    const { sessionId } = params
    const body = await request.json()
    const { rating, review } = body

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({
        error: 'Rating must be between 1 and 5'
      }, { status: 400 })
    }

    // First verify this session belongs to the customer
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, customer_user_id, status, mechanic_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify ownership
    if (session.customer_user_id !== customer.id) {
      return NextResponse.json({ error: 'Forbidden - Not your session' }, { status: 403 })
    }

    // Only allow rating completed sessions
    if (session.status !== 'completed') {
      return NextResponse.json({
        error: 'Can only rate completed sessions'
      }, { status: 400 })
    }

    // Update session with rating and review
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        rating: rating,
        review: review || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Update session rating error:', updateError)
      return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
    }

    // Update mechanic's average rating if mechanic exists
    if (session.mechanic_id) {
      // Get all completed sessions for this mechanic with ratings
      const { data: mechanicSessions } = await supabaseAdmin
        .from('sessions')
        .select('rating')
        .eq('mechanic_id', session.mechanic_id)
        .eq('status', 'completed')
        .not('rating', 'is', null)

      if (mechanicSessions && mechanicSessions.length > 0) {
        const avgRating = mechanicSessions.reduce((sum, s) => sum + (s.rating || 0), 0) / mechanicSessions.length

        // Update mechanic's average rating
        await supabaseAdmin
          .from('mechanics')
          .update({
            average_rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
            total_ratings: mechanicSessions.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.mechanic_id)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Rating submitted successfully',
      rating,
      review
    })

  } catch (error) {
    console.error('Rate session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
