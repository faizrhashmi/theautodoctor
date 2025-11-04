import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/customer/preferences
 * Fetch customer's preferences
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch or create preferences
    let { data: preferences, error: fetchError } = await supabase
      .from('customer_preferences')
      .select('*')
      .eq('customer_id', user.id)
      .single()

    // If preferences don't exist, create default ones
    if (fetchError && fetchError.code === 'PGRST116') {
      const { data: newPreferences, error: createError } = await supabase
        .from('customer_preferences')
        .insert({
          customer_id: user.id,
        })
        .select('*')
        .single()

      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create preferences', details: createError.message },
          { status: 500 }
        )
      }

      preferences = newPreferences
    } else if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch preferences', details: fetchError.message },
        { status: 500 }
      )
    }

    // Fetch favorite mechanics details
    let favoriteMechanics = []
    if (preferences && preferences.favorite_mechanics && preferences.favorite_mechanics.length > 0) {
      const { data: mechanicsData } = await supabase.rpc('get_customer_favorite_mechanics', {
        p_customer_id: user.id,
      })

      favoriteMechanics = mechanicsData || []
    }

    return NextResponse.json({
      preferences,
      favorite_mechanics: favoriteMechanics,
    })
  } catch (error: any) {
    console.error('[API] Error fetching preferences:', error)
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 })
  }
}

/**
 * PUT /api/customer/preferences
 * Update customer's preferences
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Validate and sanitize input
    const allowedFields = [
      'email_notifications',
      'sms_notifications',
      'push_notifications',
      'marketing_emails',
      'preferred_session_type',
      'auto_accept_specialist_match',
      'favorite_mechanics',
      'blocked_mechanics',
      'preferred_contact_method',
      'preferred_contact_time',
      'maintenance_reminders_enabled',
      'reminder_frequency_days',
      'accent_color',
    ]

    const updates: any = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Update preferences
    const { data: updatedPreferences, error: updateError } = await supabase
      .from('customer_preferences')
      .update(updates)
      .eq('customer_id', user.id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update preferences', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      preferences: updatedPreferences,
      message: 'Preferences updated successfully',
    })
  } catch (error: any) {
    console.error('[API] Error updating preferences:', error)
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 })
  }
}
