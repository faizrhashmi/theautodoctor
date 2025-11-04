/**
 * Customer Onboarding Progress API
 * Phase 2.1: Onboarding checklist
 *
 * Returns onboarding checklist progress for authenticated customer
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

    // Check if user has manually dismissed the checklist
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

    // Step 2: Has added vehicle
    const { count: vehicleCount } = await supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', user.id)

    const hasVehicle = (vehicleCount ?? 0) > 0

    // Step 3: Has completed first session
    const { count: completedSessionCount } = await supabase
      .from('chat_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', user.id)
      .eq('status', 'completed')

    const hasCompletedSession = (completedSessionCount ?? 0) > 0

    // Step 4: Has viewed session summary
    // (We check if any session has summary_data OR status completed)
    const { count: summaryViewCount } = await supabase
      .from('chat_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', user.id)
      .or('status.eq.completed,summary_data.not.is.null')

    const hasViewedSummary = (summaryViewCount ?? 0) > 0

    // Step 5: Has requested first quote
    // Check both repair_quotes and workshop_rfq_marketplace
    const { count: quoteCount } = await supabase
      .from('repair_quotes')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', user.id)

    const { count: rfqCount } = await supabase
      .from('workshop_rfq_marketplace')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', user.id)

    const hasRequestedQuote = (quoteCount ?? 0) > 0 || (rfqCount ?? 0) > 0

    // Build steps array
    const steps = [
      {
        id: 'account_created',
        label: 'Account created',
        description: 'You successfully created your account',
        completed: accountCreated,
        icon: 'check_circle',
      },
      {
        id: 'add_vehicle',
        label: 'Add vehicle information',
        description: 'Add your first vehicle to get started',
        completed: hasVehicle,
        icon: 'directions_car',
        action: '/customer/vehicles',
      },
      {
        id: 'complete_session',
        label: 'Complete first session',
        description: 'Start your first diagnostic session',
        completed: hasCompletedSession,
        icon: 'videocam',
        action: '/customer/dashboard',
      },
      {
        id: 'view_summary',
        label: 'Review session summary',
        description: 'View your diagnostic report',
        completed: hasViewedSummary,
        icon: 'description',
        action: hasCompletedSession ? '/customer/sessions' : null,
      },
      {
        id: 'request_quote',
        label: 'Request first quote',
        description: 'Get pricing for recommended repairs',
        completed: hasRequestedQuote,
        icon: 'request_quote',
        action: hasViewedSummary ? '/customer/rfq/create' : null,
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
        message: 'Onboarding checklist dismissed',
      })
    }

    if (action === 'restore') {
      // Restore onboarding checklist
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
        message: 'Onboarding checklist restored',
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
