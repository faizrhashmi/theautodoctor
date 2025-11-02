// @ts-nocheck
/**
 * Individual Workshop Health API
 * Returns detailed health metrics for a specific workshop
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ensureAdmin } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

  try {
    // Verify admin authentication
    const adminCheck = await ensureAdmin()
    if (!adminCheck.ok) return adminCheck.res

    const workshopId = params.id

    // Fetch workshop details
    const { data: workshop, error: workshopError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', workshopId)
      .eq('organization_type', 'workshop')
      .single()

    if (workshopError || !workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
    }

    // Fetch mechanics count
    const { count: mechanicsCount } = await supabaseAdmin
      .from('mechanics')
      .select('id', { count: 'exact', head: true })
      .eq('workshop_id', workshopId)

    // Fetch invitation metrics
    const { data: invitations } = await supabaseAdmin
      .from('organization_members')
      .select('status')
      .eq('organization_id', workshopId)

    const inviteMetrics = {
      sent: invitations?.length || 0,
      accepted: invitations?.filter(i => i.status === 'active').length || 0,
      pending: invitations?.filter(i => i.status === 'pending').length || 0,
      expired: invitations?.filter(i => i.status === 'expired').length || 0,
    }

    inviteMetrics.acceptanceRate = inviteMetrics.sent > 0
      ? Math.round((inviteMetrics.accepted / inviteMetrics.sent) * 100)
      : 0

    // Fetch recent activity
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentEvents } = await supabaseAdmin
      .from('workshop_events')
      .select('*')
      .eq('workshop_id', workshopId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    // Get last login
    const { data: lastLogin } = await supabaseAdmin
      .from('workshop_events')
      .select('created_at')
      .eq('workshop_id', workshopId)
      .eq('event_type', 'workshop_dashboard_accessed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Count profile updates
    const { count: profileUpdates } = await supabaseAdmin
      .from('workshop_events')
      .select('id', { count: 'exact', head: true })
      .eq('workshop_id', workshopId)
      .eq('event_type', 'workshop_profile_updated')

    // Count dashboard accesses
    const { count: dashboardAccesses } = await supabaseAdmin
      .from('workshop_events')
      .select('id', { count: 'exact', head: true })
      .eq('workshop_id', workshopId)
      .eq('event_type', 'workshop_dashboard_accessed')

    // Calculate health score and determine issues
    let healthScore = 100
    const issues = []
    const recommendations = []

    // Check mechanics count
    if (mechanicsCount === 0) {
      healthScore -= 30
      issues.push('No mechanics have joined yet')
      recommendations.push('Send invitations to mechanics to join your workshop')
    } else if (mechanicsCount < 3) {
      healthScore -= 15
      recommendations.push(`Invite ${3 - mechanicsCount} more mechanics to reach minimum capacity`)
    }

    // Check invite acceptance rate
    if (inviteMetrics.sent > 0 && inviteMetrics.acceptanceRate < 50) {
      healthScore -= 20
      issues.push(`Low invite acceptance rate (${inviteMetrics.acceptanceRate}%)`)
      recommendations.push('Follow up with pending invitations or send new ones')
    }

    // Check last activity
    const daysSinceLastLogin = lastLogin
      ? Math.floor(
          (Date.now() - new Date(lastLogin.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 999

    if (daysSinceLastLogin > 14) {
      healthScore -= 25
      issues.push('No activity in the last 14 days')
      recommendations.push('Log in to your dashboard to stay active')
    } else if (daysSinceLastLogin > 7) {
      healthScore -= 10
      issues.push('No activity in the last 7 days')
      recommendations.push('Regular dashboard access helps maintain active status')
    }

    // Check if pending approval
    if (workshop.status === 'pending') {
      healthScore = Math.min(healthScore, 50)
      issues.push('Workshop pending approval')
    } else if (workshop.status === 'suspended') {
      healthScore = 0
      issues.push('Workshop is suspended')
      recommendations.push('Contact support to resolve suspension')
    }

    // Determine health status
    let healthStatus: 'excellent' | 'good' | 'warning' | 'critical'
    if (healthScore >= 80) healthStatus = 'excellent'
    else if (healthScore >= 60) healthStatus = 'good'
    else if (healthScore >= 40) healthStatus = 'warning'
    else healthStatus = 'critical'

    // Build timeline of recent events
    const timeline = recentEvents?.map(event => ({
      date: event.created_at,
      event: getEventDescription(event.event_type, event.metadata),
      type: getEventType(event.event_type, event.success),
    })) || []

    // Add workshop creation to timeline if within 30 days
    if (workshop.created_at) {
      const createdDate = new Date(workshop.created_at)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      if (createdDate > thirtyDaysAgo) {
        timeline.push({
          date: workshop.created_at,
          event: 'Workshop registered',
          type: 'positive',
        })
      }
    }

    // Sort timeline by date
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      success: true,
      data: {
        workshop: {
          id: workshop.id,
          name: workshop.name,
          email: workshop.email,
          status: workshop.status,
          createdAt: workshop.created_at,
          approvedAt: workshop.approved_at,
          lastActivity: lastLogin?.created_at,
        },
        metrics: {
          mechanics: mechanicsCount || 0,
          invitesSent: inviteMetrics.sent,
          invitesAccepted: inviteMetrics.accepted,
          inviteAcceptanceRate: inviteMetrics.acceptanceRate,
          lastLogin: lastLogin?.created_at,
          profileUpdates: profileUpdates || 0,
          dashboardAccesses: dashboardAccesses || 0,
        },
        health: {
          score: Math.max(0, healthScore),
          status: healthStatus,
          issues,
          recommendations,
        },
        timeline: timeline.slice(0, 10), // Return last 10 events
      },
    })
  } catch (error: unknown) {
    console.error('[ANALYTICS] Error fetching workshop health:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to get event description
function getEventDescription(eventType: string, metadata?: any): string {
  switch (eventType) {
    case 'workshop_signup_success':
      return 'Workshop account created'
    case 'workshop_approved':
      return 'Workshop application approved'
    case 'workshop_rejected':
      return 'Workshop application rejected'
    case 'mechanic_invited':
      return `Mechanic invited${metadata?.mechanicEmail ? `: ${metadata.mechanicEmail}` : ''}`
    case 'mechanic_invite_accepted':
      return `Mechanic joined${metadata?.mechanicName ? `: ${metadata.mechanicName}` : ''}`
    case 'workshop_dashboard_accessed':
      return 'Dashboard accessed'
    case 'workshop_profile_updated':
      return 'Profile updated'
    default:
      return eventType.replace(/_/g, ' ')
  }
}

// Helper function to determine event type
function getEventType(eventType: string, success?: boolean): 'positive' | 'negative' | 'neutral' {
  if (success === false) return 'negative'

  switch (eventType) {
    case 'workshop_approved':
    case 'mechanic_invite_accepted':
    case 'workshop_signup_success':
      return 'positive'
    case 'workshop_rejected':
    case 'mechanic_invite_expired':
    case 'workshop_signup_failed':
      return 'negative'
    default:
      return 'neutral'
  }
}