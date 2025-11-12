import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { sendWaitlistJoinedEmail } from '@/lib/email/templates'

/**
 * POST /api/customer/waitlist/join
 *
 * ✅ FULLY IMPLEMENTED:
 * Allows customers to join a waitlist when all mechanics are offline.
 * When a mechanic comes online, the customer will be notified.
 *
 * Features:
 * 1. Creates waitlist entry in database
 * 2. Sends confirmation email to customer
 * 3. Auto-expires after 24 hours
 * 4. Real-time notifications when mechanics come online (via separate endpoint)
 */

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client from request
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get customer profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { notification_type = 'mechanic_online', metadata = {} } = body

    // ✅ Create waitlist entry in database
    const { data: waitlistEntry, error: insertError } = await supabase
      .from('customer_waitlist')
      .insert({
        customer_id: user.id,
        notification_type,
        status: 'pending',
        metadata: {
          ...metadata,
          email: profile.email,
          name: profile.full_name,
        },
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Waitlist] Database insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      )
    }

    console.log('[Waitlist] Customer joined waitlist:', {
      waitlistId: waitlistEntry.id,
      userId: user.id,
      email: profile.email,
      name: profile.full_name,
      notificationType: notification_type,
      metadata,
      timestamp: new Date().toISOString()
    })

    // ✅ Send confirmation email
    try {
      await sendWaitlistJoinedEmail({
        customerEmail: profile.email,
        customerName: profile.full_name,
      })
      console.log('[Waitlist] Confirmation email sent to:', profile.email)
    } catch (emailError) {
      console.error('[Waitlist] Email sending failed:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined waitlist. You will be notified when a mechanic comes online.',
      waitlistEntry: {
        id: waitlistEntry.id,
        userId: user.id,
        email: profile.email,
        notificationType: notification_type,
        status: 'pending',
        createdAt: waitlistEntry.created_at,
        expiresAt: waitlistEntry.expires_at,
      }
    })

  } catch (error) {
    console.error('[Waitlist] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
