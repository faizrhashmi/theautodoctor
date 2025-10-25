// @ts-nocheck
/**
 * Workshop Alert Checking Cron Job
 * Runs hourly to check for workshop issues and create alerts
 *
 * Schedule: Hourly
 * URL: /api/cron/workshop-alerts
 *
 * Can be triggered manually or via cron service (Vercel, Supabase, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { runAlertChecks, checkApplicationStuck, checkApprovalBacklog } from '@/lib/analytics/workshopAlerts'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  try {
    console.log('[CRON] Running workshop alert checks...')

    const startTime = Date.now()

    // Run all alert checks
    const alertResult = await runAlertChecks()

    // Additional custom checks
    await checkInactiveWorkshops()
    await checkExpiredInvitations()

    const duration = Date.now() - startTime

    console.log(`[CRON] Alert checks completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Alert checks completed',
      totalIssues: alertResult.totalIssues || 0,
      duration,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[CRON] Unexpected error in alerts cron:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

// Check for inactive workshops (no dashboard access in 14 days)
async function checkInactiveWorkshops() {
  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

    // Get active workshops
    const { data: activeWorkshops } = await supabaseAdmin
      .from('organizations')
      .select('id, name, email')
      .eq('organization_type', 'workshop')
      .eq('status', 'active')

    if (!activeWorkshops || activeWorkshops.length === 0) return

    // Check each workshop's last activity
    for (const workshop of activeWorkshops) {
      // Get last dashboard access
      const { data: lastAccess } = await supabaseAdmin
        .from('workshop_events')
        .select('created_at')
        .eq('workshop_id', workshop.id)
        .eq('event_type', 'workshop_dashboard_accessed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!lastAccess || new Date(lastAccess.created_at) < fourteenDaysAgo) {
        // Check if alert already exists
        const { data: existingAlert } = await supabaseAdmin
          .from('workshop_alerts')
          .select('id')
          .eq('workshop_id', workshop.id)
          .eq('alert_type', 'workshop_churned')
          .eq('acknowledged', false)
          .single()

        if (!existingAlert) {
          const daysSinceAccess = lastAccess
            ? Math.floor((Date.now() - new Date(lastAccess.created_at).getTime()) / (1000 * 60 * 60 * 24))
            : 999

          await supabaseAdmin.from('workshop_alerts').insert({
            alert_type: 'workshop_churned',
            severity: 'critical',
            title: 'Workshop Inactive',
            message: `Workshop "${workshop.name}" has been inactive for ${daysSinceAccess} days`,
            workshop_id: workshop.id,
            metadata: {
              workshopName: workshop.name,
              workshopEmail: workshop.email,
              daysSinceAccess,
              lastAccessDate: lastAccess?.created_at || null,
            },
          })

          console.log(`[ALERTS] Created inactive workshop alert for ${workshop.name}`)
        }
      }
    }
  } catch (error: any) {
    console.error('[ALERTS] Error checking inactive workshops:', error)
  }
}

// Check for expired invitations and mark them
async function checkExpiredInvitations() {
  try {
    const now = new Date()

    // Get expired pending invitations
    const { data: expiredInvites } = await supabaseAdmin
      .from('organization_members')
      .select('id, invite_code, invite_email, organization_id, invite_expires_at')
      .eq('status', 'pending')
      .lt('invite_expires_at', now.toISOString())
      .not('invite_email', 'is', null)

    if (!expiredInvites || expiredInvites.length === 0) return

    console.log(`[ALERTS] Found ${expiredInvites.length} expired invitations`)

    // Track expired invitations
    for (const invite of expiredInvites) {
      // Create expired event
      await supabaseAdmin.from('workshop_events').insert({
        event_type: 'mechanic_invite_expired',
        event_category: 'invitation',
        workshop_id: invite.organization_id,
        metadata: {
          inviteCode: invite.invite_code,
          inviteEmail: invite.invite_email,
          expiredAt: invite.invite_expires_at,
        },
      })
    }

    // Mark invitations as expired (update status)
    const inviteIds = expiredInvites.map(i => i.id)
    await supabaseAdmin
      .from('organization_members')
      .update({ status: 'expired' })
      .in('id', inviteIds)

    console.log(`[ALERTS] Marked ${expiredInvites.length} invitations as expired`)
  } catch (error: any) {
    console.error('[ALERTS] Error checking expired invitations:', error)
  }
}

// POST endpoint for manual trigger with specific checks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { checkType } = body

    let result

    switch (checkType) {
      case 'stuck_applications':
        result = await checkApplicationStuck()
        break
      case 'approval_backlog':
        result = await checkApprovalBacklog()
        break
      case 'inactive_workshops':
        await checkInactiveWorkshops()
        result = { success: true, message: 'Inactive workshop check completed' }
        break
      case 'expired_invitations':
        await checkExpiredInvitations()
        result = { success: true, message: 'Expired invitation check completed' }
        break
      default:
        // Run all checks
        result = await runAlertChecks()
        await checkInactiveWorkshops()
        await checkExpiredInvitations()
        break
    }

    return NextResponse.json({
      success: true,
      message: 'Alert check completed',
      checkType: checkType || 'all',
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[CRON] Error in manual alert trigger:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}