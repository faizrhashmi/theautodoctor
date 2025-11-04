import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/customer/pending-actions
 * Phase 3.3: Fetch all pending actions requiring customer attention
 *
 * Aggregates:
 * - Incomplete onboarding steps
 * - Pending quote responses
 * - Active repairs needing attention
 * - Unrated sessions
 * - Follow-up opportunities
 */

interface PendingAction {
  id: string
  type: 'onboarding' | 'quote' | 'repair' | 'rating' | 'follow_up' | 'vehicle'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  actionUrl: string
  actionLabel: string
  createdAt?: string
  dueDate?: string
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[GET /api/customer/pending-actions] Fetching for customer ${user.id}`)

    const actions: PendingAction[] = []

    // ===== 1. ONBOARDING ACTIONS =====
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_dismissed')
        .eq('id', user.id)
        .single()

      if (!profile?.onboarding_dismissed) {
        const { data: onboardingData } = await supabase
          .rpc('get_onboarding_progress', { p_user_id: user.id })
          .single()

        if (onboardingData && onboardingData.completed_count < onboardingData.total_count) {
          actions.push({
            id: 'onboarding',
            type: 'onboarding',
            title: 'Complete Your Profile',
            description: `${onboardingData.total_count - onboardingData.completed_count} steps remaining to unlock full features`,
            priority: 'medium',
            actionUrl: '/customer/dashboard',
            actionLabel: 'Complete Now',
          })
        }
      }
    } catch (error) {
      console.error('[pending-actions] Error checking onboarding:', error)
    }

    // ===== 2. PENDING QUOTE RESPONSES =====
    try {
      const { data: pendingQuotes } = await supabase
        .from('repair_quotes')
        .select('id, created_at, subtotal, customer_total, description:line_items')
        .eq('customer_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (pendingQuotes && pendingQuotes.length > 0) {
        const oldestQuote = pendingQuotes[pendingQuotes.length - 1]
        const daysSinceQuote = Math.floor(
          (Date.now() - new Date(oldestQuote.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )

        actions.push({
          id: `quote-${oldestQuote.id}`,
          type: 'quote',
          title: `${pendingQuotes.length} Pending Quote${pendingQuotes.length > 1 ? 's' : ''}`,
          description: `Respond to quote${pendingQuotes.length > 1 ? 's' : ''} totaling $${pendingQuotes.reduce((sum, q) => sum + parseFloat(q.customer_total || '0'), 0).toFixed(2)}`,
          priority: daysSinceQuote > 3 ? 'high' : 'medium',
          actionUrl: '/customer/quotes',
          actionLabel: 'Review Quotes',
          createdAt: oldestQuote.created_at,
        })
      }
    } catch (error) {
      console.error('[pending-actions] Error checking quotes:', error)
    }

    // ===== 3. REPAIRS NEEDING ATTENTION =====
    try {
      const { data: repairJobs } = await supabase
        .from('repair_jobs')
        .select('id, description, status, created_at, estimated_completion_date')
        .eq('customer_id', user.id)
        .eq('status', 'waiting_approval')

      if (repairJobs && repairJobs.length > 0) {
        repairJobs.forEach((job) => {
          actions.push({
            id: `repair-${job.id}`,
            type: 'repair',
            title: 'Additional Work Approval Needed',
            description: job.description || 'Workshop needs approval to proceed',
            priority: 'high',
            actionUrl: `/customer/repairs/${job.id}/approve`,
            actionLabel: 'Review & Approve',
            createdAt: job.created_at,
          })
        })
      }

      // Check for ready for pickup
      const { data: readyJobs } = await supabase
        .from('repair_jobs')
        .select('id, description, ready_for_pickup_at')
        .eq('customer_id', user.id)
        .eq('status', 'ready_for_pickup')
        .eq('customer_notified_ready', false)

      if (readyJobs && readyJobs.length > 0) {
        readyJobs.forEach((job) => {
          const daysSinceReady = Math.floor(
            (Date.now() - new Date(job.ready_for_pickup_at).getTime()) / (1000 * 60 * 60 * 24)
          )

          actions.push({
            id: `pickup-${job.id}`,
            type: 'repair',
            title: 'Vehicle Ready for Pickup',
            description: job.description || 'Your vehicle repair is complete',
            priority: daysSinceReady > 2 ? 'high' : 'medium',
            actionUrl: `/customer/repairs/${job.id}`,
            actionLabel: 'Schedule Pickup',
            createdAt: job.ready_for_pickup_at,
          })
        })
      }
    } catch (error) {
      console.error('[pending-actions] Error checking repairs:', error)
    }

    // ===== 4. UNRATED SESSIONS =====
    try {
      const { data: unratedSessions } = await supabase
        .from('sessions')
        .select('id, ended_at, type')
        .eq('customer_user_id', user.id)
        .eq('status', 'completed')
        .is('rating', null)
        .gte('ended_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('ended_at', { ascending: false })
        .limit(3)

      if (unratedSessions && unratedSessions.length > 0) {
        actions.push({
          id: `rating-${unratedSessions[0].id}`,
          type: 'rating',
          title: `Rate ${unratedSessions.length} Recent Session${unratedSessions.length > 1 ? 's' : ''}`,
          description: 'Help us improve by rating your experience',
          priority: 'low',
          actionUrl: `/sessions/${unratedSessions[0].id}/summary`,
          actionLabel: 'Rate Now',
        })
      }
    } catch (error) {
      console.error('[pending-actions] Error checking ratings:', error)
    }

    // ===== 5. VEHICLE PROMPT =====
    try {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (!vehicles || vehicles.length === 0) {
        actions.push({
          id: 'vehicle',
          type: 'vehicle',
          title: 'Add Your Vehicle',
          description: 'Get personalized diagnostics and faster service',
          priority: 'medium',
          actionUrl: '/customer/vehicles',
          actionLabel: 'Add Vehicle',
        })
      }
    } catch (error) {
      console.error('[pending-actions] Error checking vehicles:', error)
    }

    console.log(`[GET /api/customer/pending-actions] Found ${actions.length} pending actions`)

    return NextResponse.json({
      actions,
      count: actions.length,
    })
  } catch (error) {
    console.error('[GET /api/customer/pending-actions] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
