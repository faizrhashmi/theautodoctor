/**
 * Workshop Alert Service
 * Manages automated alerts for workshop issues and milestones
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AlertSeverity = 'critical' | 'warning' | 'info'

export type AlertType =
  // Critical alerts
  | 'application_stuck'
  | 'email_system_down'
  | 'workshop_churned'

  // Warning alerts
  | 'low_invite_acceptance'
  | 'approval_backlog'
  | 'slow_approval_time'

  // Info alerts
  | 'beta_milestone'
  | 'workshop_thriving'
  | 'first_mechanic_joined'
  | 'capacity_reached'

export interface CreateAlertParams {
  alertType: AlertType
  severity: AlertSeverity
  title: string
  message: string
  workshopId?: string
  userId?: string
  metadata?: Record<string, any>
}

export interface AlertResult {
  success: boolean
  alertId?: string
  error?: string
}

// ============================================================================
// CREATE ALERT
// ============================================================================

/**
 * Create a new alert
 *
 * @param params - Alert parameters
 * @returns Promise with creation result
 *
 * @example
 * ```typescript
 * await createAlert({
 *   alertType: 'application_stuck',
 *   severity: 'critical',
 *   title: 'Application Stuck',
 *   message: 'Workshop application has been pending for 48+ hours',
 *   workshopId: org.id,
 *   metadata: { hoursPending: 50 }
 * })
 * ```
 */
export async function createAlert(
  params: CreateAlertParams
): Promise<AlertResult> {
  try {
    const alertData = {
      alert_type: params.alertType,
      severity: params.severity,
      title: params.title,
      message: params.message,
      workshop_id: params.workshopId || null,
      user_id: params.userId || null,
      metadata: params.metadata || {},
      acknowledged: false,
    }

    const { data, error } = await supabaseAdmin
      .from('workshop_alerts')
      .insert(alertData)
      .select('id')
      .single()

    if (error) {
      console.error('[ALERTS] Failed to create alert:', params.alertType, error)
      return { success: false, error: error.message }
    }

    console.log(`[ALERTS] Alert created: ${params.alertType} (${params.severity})`, data.id)

    // TODO: Send notification (email, Slack, etc.) based on severity
    if (params.severity === 'critical') {
      console.log('[ALERTS] CRITICAL alert - should send immediate notification')
    }

    return {
      success: true,
      alertId: data.id,
    }
  } catch (e: any) {
    console.error('[ALERTS] Unexpected error creating alert:', e)
    return { success: false, error: e.message || 'Unknown error' }
  }
}

// ============================================================================
// ACKNOWLEDGE ALERT
// ============================================================================

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(
  alertId: string,
  adminId: string,
  actionTaken?: string
): Promise<AlertResult> {
  try {
    const updateData: any = {
      acknowledged: true,
      acknowledged_by: adminId,
      acknowledged_at: new Date().toISOString(),
    }

    if (actionTaken) {
      updateData.action_taken = actionTaken
      updateData.action_taken_at = new Date().toISOString()
    }

    const { error } = await supabaseAdmin
      .from('workshop_alerts')
      .update(updateData)
      .eq('id', alertId)

    if (error) {
      console.error('[ALERTS] Failed to acknowledge alert:', alertId, error)
      return { success: false, error: error.message }
    }

    console.log(`[ALERTS] Alert acknowledged: ${alertId}`)

    return { success: true, alertId }
  } catch (e: any) {
    console.error('[ALERTS] Unexpected error acknowledging alert:', e)
    return { success: false, error: e.message || 'Unknown error' }
  }
}

// ============================================================================
// AUTO-RESOLVE ALERT
// ============================================================================

/**
 * Auto-resolve an alert (e.g., when issue is fixed)
 */
export async function autoResolveAlert(
  alertType: AlertType,
  workshopId?: string
): Promise<AlertResult> {
  try {
    let query = supabaseAdmin
      .from('workshop_alerts')
      .update({
        auto_resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq('alert_type', alertType)
      .eq('acknowledged', false) // Only resolve unacknowledged alerts

    if (workshopId) {
      query = query.eq('workshop_id', workshopId)
    }

    const { error } = await query

    if (error) {
      console.error('[ALERTS] Failed to auto-resolve alert:', alertType, error)
      return { success: false, error: error.message }
    }

    console.log(`[ALERTS] Alert auto-resolved: ${alertType}`)

    return { success: true }
  } catch (e: any) {
    console.error('[ALERTS] Unexpected error auto-resolving alert:', e)
    return { success: false, error: e.message || 'Unknown error' }
  }
}

// ============================================================================
// QUERY ALERTS
// ============================================================================

/**
 * Get unacknowledged alerts
 */
export async function getUnacknowledgedAlerts(severity?: AlertSeverity) {
  try {
    let query = supabaseAdmin
      .from('workshop_alerts')
      .select('*')
      .eq('acknowledged', false)
      .order('created_at', { ascending: false })

    if (severity) {
      query = query.eq('severity', severity)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data }
  } catch (e: any) {
    console.error('[ALERTS] Failed to get unacknowledged alerts:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Get alerts for a specific workshop
 */
export async function getWorkshopAlerts(workshopId: string, limit: number = 50) {
  try {
    const { data, error } = await supabaseAdmin
      .from('workshop_alerts')
      .select('*')
      .eq('workshop_id', workshopId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, data }
  } catch (e: any) {
    console.error('[ALERTS] Failed to get workshop alerts:', e)
    return { success: false, error: e.message }
  }
}

// ============================================================================
// ALERT RULE CHECKERS
// ============================================================================

/**
 * Check if a workshop application is stuck (pending > 48 hours)
 */
export async function checkApplicationStuck() {
  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

    const { data: stuckApplications, error } = await supabaseAdmin
      .from('organizations')
      .select('id, name, email, created_at')
      .eq('organization_type', 'workshop')
      .eq('status', 'pending')
      .lt('created_at', fortyEightHoursAgo.toISOString())

    if (error) throw error

    // Create alerts for stuck applications
    for (const app of stuckApplications || []) {
      const hoursPending = Math.floor(
        (Date.now() - new Date(app.created_at).getTime()) / (1000 * 60 * 60)
      )

      // Check if alert already exists for this workshop
      const { data: existingAlert } = await supabaseAdmin
        .from('workshop_alerts')
        .select('id')
        .eq('workshop_id', app.id)
        .eq('alert_type', 'application_stuck')
        .eq('acknowledged', false)
        .single()

      if (!existingAlert) {
        await createAlert({
          alertType: 'application_stuck',
          severity: 'critical',
          title: 'Application Stuck',
          message: `Workshop application "${app.name}" has been pending for ${hoursPending} hours`,
          workshopId: app.id,
          metadata: {
            workshopName: app.name,
            workshopEmail: app.email,
            hoursPending,
          },
        })
      }
    }

    console.log(`[ALERTS] Checked for stuck applications: ${stuckApplications?.length || 0} found`)

    return { success: true, count: stuckApplications?.length || 0 }
  } catch (e: any) {
    console.error('[ALERTS] Failed to check stuck applications:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Check for approval backlog (>5 pending applications)
 */
export async function checkApprovalBacklog() {
  try {
    const { data: pendingApps, error } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('organization_type', 'workshop')
      .eq('status', 'pending')

    if (error) throw error

    const count = pendingApps?.length || 0

    if (count > 5) {
      // Check if alert already exists
      const { data: existingAlert } = await supabaseAdmin
        .from('workshop_alerts')
        .select('id')
        .eq('alert_type', 'approval_backlog')
        .eq('acknowledged', false)
        .single()

      if (!existingAlert) {
        await createAlert({
          alertType: 'approval_backlog',
          severity: 'warning',
          title: 'Approval Backlog',
          message: `${count} workshop applications pending approval`,
          metadata: { pendingCount: count },
        })
      }
    } else {
      // Auto-resolve if backlog is cleared
      await autoResolveAlert('approval_backlog')
    }

    console.log(`[ALERTS] Checked approval backlog: ${count} pending`)

    return { success: true, count }
  } catch (e: any) {
    console.error('[ALERTS] Failed to check approval backlog:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Check for workshops with low invite acceptance (<50%, min 5 invites)
 */
export async function checkLowInviteAcceptance() {
  try {
    // This requires more complex SQL - will implement in aggregation job
    console.log('[ALERTS] Low invite acceptance check - TODO: implement in aggregation job')

    return { success: true }
  } catch (e: any) {
    console.error('[ALERTS] Failed to check low invite acceptance:', e)
    return { success: false, error: e.message }
  }
}

// ============================================================================
// RUN ALL ALERT CHECKS
// ============================================================================

/**
 * Run all alert rule checks
 * Should be called periodically (e.g., hourly via cron)
 */
export async function runAlertChecks() {
  console.log('[ALERTS] Running all alert checks...')

  const results = await Promise.all([
    checkApplicationStuck(),
    checkApprovalBacklog(),
    checkLowInviteAcceptance(),
  ])

  const totalIssues = results.reduce((sum, r) => sum + (r.count || 0), 0)

  console.log(`[ALERTS] Alert checks complete. ${totalIssues} issues found`)

  return { success: true, totalIssues }
}
