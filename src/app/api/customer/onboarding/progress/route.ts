/**
 * Customer Onboarding Progress API
 * Tracks booking journey from dashboard through step 4
 *
 * Returns onboarding/booking guide progress for authenticated customer
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch profile with onboarding status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_dismissed, onboarding_dismissed_at')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[onboarding-progress] Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    // Check if user has manually dismissed the guide
    if (profile?.onboarding_dismissed) {
      return NextResponse.json({
        dismissed: true,
        dismissed_at: profile.onboarding_dismissed_at,
        steps: [],
        completed_count: 0,
        total_count: 0,
        progress_percentage: 100,
      })
    }

    // Step 1: Account created (always true if authenticated)
    const accountCreated = true

    // Step 2: Has started booking (navigated to book-session page)
    // We'll consider this true if they have any vehicle or any session
    const { count: vehicleCount } = await supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', user.id)

    const { count: sessionCount } = await supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('customer_user_id', user.id)

    const hasStartedBooking = (vehicleCount ?? 0) > 0 || (sessionCount ?? 0) > 0

    // Step 3: Has selected vehicle (has vehicle in garage)
    const hasVehicle = (vehicleCount ?? 0) > 0

    // Step 4: Has chosen plan (has created a session)
    const hasChosenPlan = (sessionCount ?? 0) > 0

    // Step 5: Has completed concern (has session with intake_id)
    const { count: sessionWithIntakeCount } = await supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('customer_user_id', user.id)
      .not('intake_id', 'is', null)

    const hasCompletedConcern = (sessionWithIntakeCount ?? 0) > 0

    // Build steps array
    const steps = [
      {
        id: 'account_created',
        label: 'Welcome',
        description: 'Account created successfully',
        completed: accountCreated,
        icon: 'check_circle',
      },
      {
        id: 'start_booking',
        label: 'Start booking',
        description: 'Click "Book a Session" to begin',
        completed: hasStartedBooking,
        icon: 'directions_car',
        action: '/customer/book-session',
      },
      {
        id: 'select_vehicle',
        label: 'Select vehicle',
        description: 'Choose your vehicle or skip',
        completed: hasVehicle,
        icon: 'directions_car',
        action: !hasStartedBooking ? null : '/customer/book-session',
      },
      {
        id: 'choose_plan',
        label: 'Choose plan',
        description: 'Select your service plan',
        completed: hasChosenPlan,
        icon: 'request_quote',
        action: !hasVehicle ? null : '/customer/book-session',
      },
      {
        id: 'describe_concern',
        label: 'Describe concern',
        description: 'Tell us what you need help with',
        completed: hasCompletedConcern,
        icon: 'description',
        action: !hasChosenPlan ? null : '/customer/book-session',
      },
    ]

    const completedCount = steps.filter((s) => s.completed).length
    const totalCount = steps.length
    const progressPercentage = Math.round((completedCount / totalCount) * 100)

    return NextResponse.json({
      dismissed: false,
      steps,
      completed_count: completedCount,
      total_count: totalCount,
      progress_percentage: progressPercentage,
      all_completed: completedCount === totalCount,
    })
  } catch (error: any) {
    console.error('[onboarding-progress] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to fetch onboarding progress' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'dismiss') {
      // Mark onboarding as dismissed
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          onboarding_dismissed: true,
          onboarding_dismissed_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('[onboarding-progress] Error dismissing onboarding:', updateError)
        return NextResponse.json({ error: 'Failed to dismiss onboarding' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Booking guide dismissed',
      })
    }

    if (action === 'restore') {
      // Restore onboarding guide
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          onboarding_dismissed: false,
          onboarding_dismissed_at: null,
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('[onboarding-progress] Error restoring onboarding:', updateError)
        return NextResponse.json({ error: 'Failed to restore onboarding' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Booking guide restored',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[onboarding-progress] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to update onboarding status' },
      { status: 500 }
    )
  }
}
