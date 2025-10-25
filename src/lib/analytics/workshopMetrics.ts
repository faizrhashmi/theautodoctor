/**
 * Workshop Metrics Service
 * Aggregates analytics data into daily/weekly/monthly metrics
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createAlert } from './workshopAlerts'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type MetricType = 'daily' | 'weekly' | 'monthly'

export interface MetricsResult {
  success: boolean
  metricsId?: string
  error?: string
}

export interface MetricsData {
  // Signup funnel
  signupsStarted: number
  signupsCompleted: number
  signupsFailed: number
  signupConversionRate: number

  // Approval metrics
  applicationsPending: number
  applicationsApproved: number
  applicationsRejected: number
  avgApprovalTimeHours: number
  medianApprovalTimeHours: number

  // Invitation metrics
  invitesSent: number
  invitesAccepted: number
  invitesExpired: number
  inviteAcceptanceRate: number

  // Email metrics
  emailsSent: number
  emailsFailed: number
  emailSuccessRate: number

  // Workshop health
  activeWorkshops: number
  pendingWorkshops: number
  workshopsWithMechanics: number
  totalMechanicsInvited: number
  totalMechanicsActive: number
  avgMechanicsPerWorkshop: number

  // Activity metrics
  dashboardLogins: number
  profileUpdates: number
}

// ============================================================================
// CALCULATE DAILY METRICS
// ============================================================================

/**
 * Calculate and store daily metrics
 * Should be run once per day at midnight
 */
export async function calculateDailyMetrics(date?: Date): Promise<MetricsResult> {
  try {
    const targetDate = date || new Date()
    targetDate.setHours(0, 0, 0, 0)

    const startOfDay = new Date(targetDate)
    const endOfDay = new Date(targetDate)
    endOfDay.setDate(endOfDay.getDate() + 1)

    console.log(`[METRICS] Calculating daily metrics for ${startOfDay.toDateString()}`)

    // ========== SIGNUP FUNNEL METRICS ==========
    const { data: signupEvents } = await supabaseAdmin
      .from('workshop_events')
      .select('event_type, success')
      .in('event_type', [
        'workshop_signup_started',
        'workshop_signup_submitted',
        'workshop_signup_success',
        'workshop_signup_failed'
      ])
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())

    const signupsStarted = signupEvents?.filter(e => e.event_type === 'workshop_signup_started').length || 0
    const signupsSubmitted = signupEvents?.filter(e => e.event_type === 'workshop_signup_submitted').length || 0
    const signupsCompleted = signupEvents?.filter(e => e.event_type === 'workshop_signup_success').length || 0
    const signupsFailed = signupEvents?.filter(e => e.event_type === 'workshop_signup_failed').length || 0

    const signupConversionRate = signupsSubmitted > 0
      ? Math.round((signupsCompleted / signupsSubmitted) * 100)
      : 0

    // ========== APPROVAL METRICS ==========
    const { data: approvalEvents } = await supabaseAdmin
      .from('workshop_events')
      .select('event_type, workshop_id, created_at')
      .in('event_type', ['workshop_approved', 'workshop_rejected'])
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())

    const applicationsApproved = approvalEvents?.filter(e => e.event_type === 'workshop_approved').length || 0
    const applicationsRejected = approvalEvents?.filter(e => e.event_type === 'workshop_rejected').length || 0

    // Calculate approval times for workshops approved today
    let avgApprovalTimeHours = 0
    let medianApprovalTimeHours = 0

    if (applicationsApproved > 0) {
      const approvedWorkshopIds = approvalEvents
        ?.filter(e => e.event_type === 'workshop_approved')
        ?.map(e => e.workshop_id) || []

      const { data: workshops } = await supabaseAdmin
        .from('organizations')
        .select('id, created_at')
        .in('id', approvedWorkshopIds)

      if (workshops && workshops.length > 0) {
        const approvalTimes = workshops.map(w => {
          const approvalEvent = approvalEvents?.find(e => e.workshop_id === w.id)
          if (!approvalEvent) return 0
          const submitTime = new Date(w.created_at).getTime()
          const approvalTime = new Date(approvalEvent.created_at).getTime()
          return (approvalTime - submitTime) / (1000 * 60 * 60) // Convert to hours
        })

        avgApprovalTimeHours = approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length

        // Calculate median
        const sorted = approvalTimes.sort((a, b) => a - b)
        medianApprovalTimeHours = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)]
      }
    }

    // Count pending applications (current state)
    const { count: applicationsPending } = await supabaseAdmin
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_type', 'workshop')
      .eq('status', 'pending')

    // ========== INVITATION METRICS ==========
    const { data: inviteEvents } = await supabaseAdmin
      .from('workshop_events')
      .select('event_type')
      .in('event_type', [
        'mechanic_invited',
        'mechanic_invite_accepted',
        'mechanic_invite_expired'
      ])
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())

    const invitesSent = inviteEvents?.filter(e => e.event_type === 'mechanic_invited').length || 0
    const invitesAccepted = inviteEvents?.filter(e => e.event_type === 'mechanic_invite_accepted').length || 0
    const invitesExpired = inviteEvents?.filter(e => e.event_type === 'mechanic_invite_expired').length || 0

    const inviteAcceptanceRate = invitesSent > 0
      ? Math.round((invitesAccepted / invitesSent) * 100)
      : 0

    // ========== EMAIL METRICS ==========
    const { data: emailEvents } = await supabaseAdmin
      .from('workshop_events')
      .select('event_type, success')
      .like('event_type', 'email_%')
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())

    const emailsSent = emailEvents?.filter(e => e.success === true).length || 0
    const emailsFailed = emailEvents?.filter(e => e.success === false).length || 0
    const emailTotal = emailsSent + emailsFailed

    const emailSuccessRate = emailTotal > 0
      ? Math.round((emailsSent / emailTotal) * 100)
      : 100

    const emailApprovalSent = emailEvents?.filter(e => e.event_type === 'email_approval_sent').length || 0
    const emailRejectionSent = emailEvents?.filter(e => e.event_type === 'email_rejection_sent').length || 0
    const emailInviteSent = emailEvents?.filter(e => e.event_type === 'email_invite_sent').length || 0

    // ========== WORKSHOP HEALTH METRICS ==========
    const { data: workshops } = await supabaseAdmin
      .from('organizations')
      .select('id, status')
      .eq('organization_type', 'workshop')

    const activeWorkshops = workshops?.filter(w => w.status === 'active').length || 0
    const pendingWorkshops = workshops?.filter(w => w.status === 'pending').length || 0
    const rejectedWorkshops = workshops?.filter(w => w.status === 'rejected').length || 0
    const suspendedWorkshops = workshops?.filter(w => w.status === 'suspended').length || 0

    // Count workshops with mechanics
    const { data: workshopsWithMechanicsData } = await supabaseAdmin
      .from('mechanics')
      .select('workshop_id')
      .not('workshop_id', 'is', null)
      .limit(1000)

    const uniqueWorkshopsWithMechanics = new Set(workshopsWithMechanicsData?.map(m => m.workshop_id))
    const workshopsWithMechanics = uniqueWorkshopsWithMechanics.size

    // Count total mechanics
    const { count: totalMechanicsActive } = await supabaseAdmin
      .from('mechanics')
      .select('id', { count: 'exact', head: true })
      .not('workshop_id', 'is', null)
      .eq('application_status', 'approved')

    // Count total invitations sent (all time)
    const { count: totalMechanicsInvited } = await supabaseAdmin
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .not('invite_email', 'is', null)

    const avgMechanicsPerWorkshop = activeWorkshops > 0
      ? Math.round((totalMechanicsActive || 0) / activeWorkshops * 10) / 10
      : 0

    // ========== ACTIVITY METRICS ==========
    const { data: activityEvents } = await supabaseAdmin
      .from('workshop_events')
      .select('event_type')
      .in('event_type', ['workshop_dashboard_accessed', 'workshop_profile_updated'])
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())

    const dashboardLogins = activityEvents?.filter(e => e.event_type === 'workshop_dashboard_accessed').length || 0
    const profileUpdates = activityEvents?.filter(e => e.event_type === 'workshop_profile_updated').length || 0

    // ========== API PERFORMANCE METRICS ==========
    const { data: allEvents } = await supabaseAdmin
      .from('workshop_events')
      .select('success')
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())

    const totalApiCalls = allEvents?.length || 0
    const apiErrors = allEvents?.filter(e => e.success === false).length || 0
    const apiSuccessRate = totalApiCalls > 0
      ? Math.round(((totalApiCalls - apiErrors) / totalApiCalls) * 100)
      : 100

    // ========== SAVE METRICS ==========
    const metricsData = {
      metric_date: startOfDay.toISOString().split('T')[0],
      metric_type: 'daily' as const,

      // Signup funnel
      signups_started: signupsStarted,
      signups_completed: signupsCompleted,
      signups_failed: signupsFailed,
      signup_conversion_rate: signupConversionRate,

      // Approval metrics
      applications_pending: applicationsPending || 0,
      applications_approved: applicationsApproved,
      applications_rejected: applicationsRejected,
      avg_approval_time_hours: Math.round(avgApprovalTimeHours * 10) / 10,
      median_approval_time_hours: Math.round(medianApprovalTimeHours * 10) / 10,

      // Invitation metrics
      invites_sent: invitesSent,
      invites_accepted: invitesAccepted,
      invites_expired: invitesExpired,
      invite_acceptance_rate: inviteAcceptanceRate,

      // Email metrics
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      email_success_rate: emailSuccessRate,
      email_approval_sent: emailApprovalSent,
      email_rejection_sent: emailRejectionSent,
      email_invite_sent: emailInviteSent,

      // Workshop health
      active_workshops: activeWorkshops,
      pending_workshops: pendingWorkshops,
      rejected_workshops: rejectedWorkshops,
      suspended_workshops: suspendedWorkshops,
      workshops_with_mechanics: workshopsWithMechanics,
      total_mechanics_invited: totalMechanicsInvited || 0,
      total_mechanics_active: totalMechanicsActive || 0,
      avg_mechanics_per_workshop: avgMechanicsPerWorkshop,

      // Activity metrics
      dashboard_logins: dashboardLogins,
      profile_updates: profileUpdates,

      // Performance
      api_errors: apiErrors,
      api_success_rate: apiSuccessRate,
    }

    // Upsert metrics (update if exists, insert if not)
    const { data: metrics, error } = await supabaseAdmin
      .from('workshop_metrics')
      .upsert(metricsData, {
        onConflict: 'metric_date,metric_type',
      })
      .select('id')
      .single()

    if (error) {
      console.error('[METRICS] Failed to save daily metrics:', error)
      return { success: false, error: error.message }
    }

    console.log(`[METRICS] Daily metrics saved for ${startOfDay.toDateString()}`)

    // ========== CHECK FOR ALERTS ==========
    await checkMetricAlerts(metricsData)

    return {
      success: true,
      metricsId: metrics?.id,
    }
  } catch (e: any) {
    console.error('[METRICS] Unexpected error calculating daily metrics:', e)
    return { success: false, error: e.message || 'Unknown error' }
  }
}

// ============================================================================
// CALCULATE WEEKLY METRICS
// ============================================================================

/**
 * Calculate weekly metrics (aggregate of daily metrics)
 * Should be run once per week
 */
export async function calculateWeeklyMetrics(weekStartDate?: Date): Promise<MetricsResult> {
  try {
    const startDate = weekStartDate || new Date()
    startDate.setHours(0, 0, 0, 0)

    // Set to Monday of the week
    const day = startDate.getDay()
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1)
    startDate.setDate(diff)

    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 7)

    console.log(`[METRICS] Calculating weekly metrics for week starting ${startDate.toDateString()}`)

    // Get daily metrics for the week
    const { data: dailyMetrics, error } = await supabaseAdmin
      .from('workshop_metrics')
      .select('*')
      .eq('metric_type', 'daily')
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .lt('metric_date', endDate.toISOString().split('T')[0])

    if (error || !dailyMetrics || dailyMetrics.length === 0) {
      console.error('[METRICS] No daily metrics found for week')
      return { success: false, error: 'No daily metrics found' }
    }

    // Aggregate the daily metrics
    const weeklyData = {
      metric_date: startDate.toISOString().split('T')[0],
      metric_type: 'weekly' as const,

      // Sum up totals
      signups_started: dailyMetrics.reduce((sum, d) => sum + (d.signups_started || 0), 0),
      signups_completed: dailyMetrics.reduce((sum, d) => sum + (d.signups_completed || 0), 0),
      signups_failed: dailyMetrics.reduce((sum, d) => sum + (d.signups_failed || 0), 0),

      applications_approved: dailyMetrics.reduce((sum, d) => sum + (d.applications_approved || 0), 0),
      applications_rejected: dailyMetrics.reduce((sum, d) => sum + (d.applications_rejected || 0), 0),

      invites_sent: dailyMetrics.reduce((sum, d) => sum + (d.invites_sent || 0), 0),
      invites_accepted: dailyMetrics.reduce((sum, d) => sum + (d.invites_accepted || 0), 0),
      invites_expired: dailyMetrics.reduce((sum, d) => sum + (d.invites_expired || 0), 0),

      emails_sent: dailyMetrics.reduce((sum, d) => sum + (d.emails_sent || 0), 0),
      emails_failed: dailyMetrics.reduce((sum, d) => sum + (d.emails_failed || 0), 0),

      dashboard_logins: dailyMetrics.reduce((sum, d) => sum + (d.dashboard_logins || 0), 0),
      profile_updates: dailyMetrics.reduce((sum, d) => sum + (d.profile_updates || 0), 0),
      api_errors: dailyMetrics.reduce((sum, d) => sum + (d.api_errors || 0), 0),

      // Use latest values for current state metrics
      applications_pending: dailyMetrics[dailyMetrics.length - 1].applications_pending || 0,
      active_workshops: dailyMetrics[dailyMetrics.length - 1].active_workshops || 0,
      pending_workshops: dailyMetrics[dailyMetrics.length - 1].pending_workshops || 0,
      workshops_with_mechanics: dailyMetrics[dailyMetrics.length - 1].workshops_with_mechanics || 0,
      total_mechanics_active: dailyMetrics[dailyMetrics.length - 1].total_mechanics_active || 0,

      // Calculate averages
      avg_approval_time_hours: dailyMetrics.reduce((sum, d) => sum + (d.avg_approval_time_hours || 0), 0) / dailyMetrics.length,
      avg_mechanics_per_workshop: dailyMetrics.reduce((sum, d) => sum + (d.avg_mechanics_per_workshop || 0), 0) / dailyMetrics.length,

      // Recalculate rates
      signup_conversion_rate: 0,
      invite_acceptance_rate: 0,
      email_success_rate: 0,
      api_success_rate: 0,
    }

    // Calculate rates
    if (weeklyData.signups_started > 0) {
      weeklyData.signup_conversion_rate = Math.round((weeklyData.signups_completed / weeklyData.signups_started) * 100)
    }
    if (weeklyData.invites_sent > 0) {
      weeklyData.invite_acceptance_rate = Math.round((weeklyData.invites_accepted / weeklyData.invites_sent) * 100)
    }
    const totalEmails = weeklyData.emails_sent + weeklyData.emails_failed
    if (totalEmails > 0) {
      weeklyData.email_success_rate = Math.round((weeklyData.emails_sent / totalEmails) * 100)
    }
    const totalApiCalls = dailyMetrics.reduce((sum, d) => {
      const successCalls = (d.emails_sent || 0) + (d.signups_completed || 0) + (d.dashboard_logins || 0)
      return sum + successCalls + (d.api_errors || 0)
    }, 0)
    if (totalApiCalls > 0) {
      weeklyData.api_success_rate = Math.round(((totalApiCalls - weeklyData.api_errors) / totalApiCalls) * 100)
    }

    // Save weekly metrics
    const { data: metrics, error: saveError } = await supabaseAdmin
      .from('workshop_metrics')
      .upsert(weeklyData, {
        onConflict: 'metric_date,metric_type',
      })
      .select('id')
      .single()

    if (saveError) {
      console.error('[METRICS] Failed to save weekly metrics:', saveError)
      return { success: false, error: saveError.message }
    }

    console.log(`[METRICS] Weekly metrics saved for week starting ${startDate.toDateString()}`)

    return {
      success: true,
      metricsId: metrics?.id,
    }
  } catch (e: any) {
    console.error('[METRICS] Unexpected error calculating weekly metrics:', e)
    return { success: false, error: e.message || 'Unknown error' }
  }
}

// ============================================================================
// CHECK FOR METRIC-BASED ALERTS
// ============================================================================

async function checkMetricAlerts(metrics: any) {
  try {
    // Check for low signup conversion
    if (metrics.signup_conversion_rate < 30 && metrics.signups_started > 5) {
      await createAlert({
        alertType: 'low_invite_acceptance',
        severity: 'warning',
        title: 'Low Signup Conversion Rate',
        message: `Signup conversion rate is ${metrics.signup_conversion_rate}% (target: >30%)`,
        metadata: {
          rate: metrics.signup_conversion_rate,
          started: metrics.signups_started,
          completed: metrics.signups_completed,
        },
      })
    }

    // Check for low invite acceptance
    if (metrics.invite_acceptance_rate < 50 && metrics.invites_sent > 5) {
      await createAlert({
        alertType: 'low_invite_acceptance',
        severity: 'warning',
        title: 'Low Invite Acceptance Rate',
        message: `Mechanic invite acceptance rate is ${metrics.invite_acceptance_rate}% (target: >70%)`,
        metadata: {
          rate: metrics.invite_acceptance_rate,
          sent: metrics.invites_sent,
          accepted: metrics.invites_accepted,
        },
      })
    }

    // Check for email failures
    if (metrics.email_success_rate < 95 && metrics.emails_failed > 3) {
      await createAlert({
        alertType: 'email_system_down',
        severity: metrics.email_success_rate < 80 ? 'critical' : 'warning',
        title: 'Email Delivery Issues',
        message: `Email success rate is ${metrics.email_success_rate}% with ${metrics.emails_failed} failures`,
        metadata: {
          rate: metrics.email_success_rate,
          sent: metrics.emails_sent,
          failed: metrics.emails_failed,
        },
      })
    }

    // Check for approval backlog
    if (metrics.applications_pending > 5) {
      await createAlert({
        alertType: 'approval_backlog',
        severity: 'warning',
        title: 'Workshop Approval Backlog',
        message: `${metrics.applications_pending} workshop applications pending approval`,
        metadata: {
          pending: metrics.applications_pending,
        },
      })
    }

    // Check for slow approval time
    if (metrics.avg_approval_time_hours > 36 && metrics.applications_approved > 0) {
      await createAlert({
        alertType: 'slow_approval_time',
        severity: 'warning',
        title: 'Slow Approval Time',
        message: `Average approval time is ${metrics.avg_approval_time_hours} hours (target: <24 hours)`,
        metadata: {
          avgHours: metrics.avg_approval_time_hours,
          medianHours: metrics.median_approval_time_hours,
        },
      })
    }

    // Positive alert: Beta milestone reached
    if (metrics.active_workshops >= 3 && metrics.active_workshops <= 5) {
      // Check if we haven't already created this alert today
      const { data: existingAlert } = await supabaseAdmin
        .from('workshop_alerts')
        .select('id')
        .eq('alert_type', 'beta_milestone')
        .gte('created_at', new Date().toISOString().split('T')[0])
        .single()

      if (!existingAlert) {
        await createAlert({
          alertType: 'beta_milestone',
          severity: 'info',
          title: '🎉 Beta Milestone Reached!',
          message: `${metrics.active_workshops} workshops are now active (target: 3-5)`,
          metadata: {
            activeWorkshops: metrics.active_workshops,
          },
        })
      }
    }
  } catch (e: any) {
    console.error('[METRICS] Error checking metric alerts:', e)
  }
}

// ============================================================================
// GET CURRENT METRICS
// ============================================================================

/**
 * Get metrics for a specific date range
 */
export async function getMetrics(
  startDate: Date,
  endDate: Date,
  metricType: MetricType = 'daily'
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('workshop_metrics')
      .select('*')
      .eq('metric_type', metricType)
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .lte('metric_date', endDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: false })

    if (error) throw error

    return { success: true, data }
  } catch (e: any) {
    console.error('[METRICS] Failed to get metrics:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Get latest metrics snapshot
 */
export async function getLatestMetrics() {
  try {
    const { data, error } = await supabaseAdmin
      .from('workshop_metrics')
      .select('*')
      .eq('metric_type', 'daily')
      .order('metric_date', { ascending: false })
      .limit(1)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (e: any) {
    console.error('[METRICS] Failed to get latest metrics:', e)
    return { success: false, error: e.message }
  }
}