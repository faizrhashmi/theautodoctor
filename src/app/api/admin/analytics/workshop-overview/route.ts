// @ts-nocheck
/**
 * Admin Workshop Overview Analytics API
 * Returns aggregated metrics for the admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ensureAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

  try {
    // Verify admin authentication
    const adminCheck = await ensureAdmin()
    if (!adminCheck.ok) return adminCheck.res

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'today' // today, yesterday, week, month

    // Calculate date ranges
    const now = new Date()
    let startDate: Date
    let compareStartDate: Date
    let compareEndDate: Date

    switch (period) {
      case 'yesterday':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 1)
        startDate.setHours(0, 0, 0, 0)
        compareStartDate = new Date(startDate)
        compareStartDate.setDate(startDate.getDate() - 1)
        compareEndDate = new Date(startDate)
        break
      case 'week':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
        compareStartDate = new Date(startDate)
        compareStartDate.setDate(startDate.getDate() - 7)
        compareEndDate = new Date(startDate)
        break
      case 'month':
        startDate = new Date(now)
        startDate.setMonth(now.getMonth() - 1)
        compareStartDate = new Date(startDate)
        compareStartDate.setMonth(startDate.getMonth() - 1)
        compareEndDate = new Date(startDate)
        break
      default: // today
        startDate = new Date(now)
        startDate.setHours(0, 0, 0, 0)
        compareStartDate = new Date(startDate)
        compareStartDate.setDate(startDate.getDate() - 1)
        compareEndDate = new Date(now)
        compareEndDate.setDate(now.getDate() - 1)
        compareEndDate.setHours(23, 59, 59, 999)
        break
    }

    // Fetch current period metrics
    const [
      currentMetrics,
      funnelData,
      recentAlerts,
      workshopHealth,
      emailMetrics,
    ] = await Promise.all([
      // Get aggregated metrics for current period
      fetchPeriodMetrics(startDate, now),
      // Get funnel conversion data
      fetchFunnelData(startDate, now),
      // Get recent alerts
      fetchRecentAlerts(),
      // Get workshop health stats
      fetchWorkshopHealth(),
      // Get email performance
      fetchEmailMetrics(startDate, now),
    ])

    // Fetch comparison period metrics for trends
    const compareMetrics = await fetchPeriodMetrics(compareStartDate, compareEndDate)

    // Calculate trends
    const trends = calculateTrends(currentMetrics, compareMetrics)

    return NextResponse.json({
      success: true,
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      metrics: {
        ...currentMetrics,
        trends,
      },
      funnel: funnelData,
      alerts: recentAlerts,
      workshopHealth,
      emailPerformance: emailMetrics,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error('[ANALYTICS] Error fetching workshop overview:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Fetch aggregated metrics for a period
async function fetchPeriodMetrics(startDate: Date, endDate: Date) {
  const { data: events } = await supabaseAdmin
    .from('workshop_events')
    .select('event_type, success, metadata, created_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  const metrics = {
    signups: {
      started: 0,
      completed: 0,
      failed: 0,
    },
    applications: {
      pending: 0,
      approved: 0,
      rejected: 0,
    },
    invitations: {
      sent: 0,
      accepted: 0,
      expired: 0,
    },
    activity: {
      logins: 0,
      profileUpdates: 0,
    },
  }

  // Count events
  events?.forEach((event) => {
    switch (event.event_type) {
      case 'workshop_signup_started':
        metrics.signups.started++
        break
      case 'workshop_signup_success':
        metrics.signups.completed++
        break
      case 'workshop_signup_failed':
        metrics.signups.failed++
        break
      case 'workshop_approved':
        metrics.applications.approved++
        break
      case 'workshop_rejected':
        metrics.applications.rejected++
        break
      case 'mechanic_invited':
        metrics.invitations.sent++
        break
      case 'mechanic_invite_accepted':
        metrics.invitations.accepted++
        break
      case 'mechanic_invite_expired':
        metrics.invitations.expired++
        break
      case 'workshop_dashboard_accessed':
        metrics.activity.logins++
        break
      case 'workshop_profile_updated':
        metrics.activity.profileUpdates++
        break
    }
  })

  // Get current pending applications
  const { count: pendingCount } = await supabaseAdmin
    .from('organizations')
    .select('id', { count: 'exact', head: true })
    .eq('organization_type', 'workshop')
    .eq('status', 'pending')

  metrics.applications.pending = pendingCount || 0

  return metrics
}

// Fetch funnel conversion data
async function fetchFunnelData(startDate: Date, endDate: Date) {
  const { data: events } = await supabaseAdmin
    .from('workshop_events')
    .select('event_type, workshop_id')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .in('event_type', [
      'workshop_signup_started',
      'workshop_signup_submitted',
      'workshop_signup_success',
      'workshop_approved',
      'workshop_dashboard_accessed',
    ])

  const uniqueWorkshops = {
    started: new Set(),
    submitted: new Set(),
    completed: new Set(),
    approved: new Set(),
    active: new Set(),
  }

  events?.forEach((event) => {
    if (!event.workshop_id) return

    switch (event.event_type) {
      case 'workshop_signup_started':
        uniqueWorkshops.started.add(event.workshop_id)
        break
      case 'workshop_signup_submitted':
        uniqueWorkshops.submitted.add(event.workshop_id)
        break
      case 'workshop_signup_success':
        uniqueWorkshops.completed.add(event.workshop_id)
        break
      case 'workshop_approved':
        uniqueWorkshops.approved.add(event.workshop_id)
        break
      case 'workshop_dashboard_accessed':
        uniqueWorkshops.active.add(event.workshop_id)
        break
    }
  })

  const stages = [
    {
      name: 'Started Signup',
      count: uniqueWorkshops.started.size,
      percentage: 100,
    },
    {
      name: 'Submitted Application',
      count: uniqueWorkshops.submitted.size,
      percentage: uniqueWorkshops.started.size
        ? Math.round((uniqueWorkshops.submitted.size / uniqueWorkshops.started.size) * 100)
        : 0,
    },
    {
      name: 'Account Created',
      count: uniqueWorkshops.completed.size,
      percentage: uniqueWorkshops.started.size
        ? Math.round((uniqueWorkshops.completed.size / uniqueWorkshops.started.size) * 100)
        : 0,
    },
    {
      name: 'Approved',
      count: uniqueWorkshops.approved.size,
      percentage: uniqueWorkshops.started.size
        ? Math.round((uniqueWorkshops.approved.size / uniqueWorkshops.started.size) * 100)
        : 0,
    },
    {
      name: 'Active (Logged In)',
      count: uniqueWorkshops.active.size,
      percentage: uniqueWorkshops.started.size
        ? Math.round((uniqueWorkshops.active.size / uniqueWorkshops.started.size) * 100)
        : 0,
    },
  ]

  // Calculate dropoffs
  for (let i = 0; i < stages.length - 1; i++) {
    const dropoff = stages[i].count - stages[i + 1].count
    stages[i].dropoffCount = dropoff
    stages[i].dropoffPercentage = stages[i].count
      ? Math.round((dropoff / stages[i].count) * 100)
      : 0
  }

  return stages
}

// Fetch recent alerts
async function fetchRecentAlerts() {
  const { data: alerts } = await supabaseAdmin
    .from('workshop_alerts')
    .select('*')
    .eq('acknowledged', false)
    .order('created_at', { ascending: false })
    .limit(10)

  return alerts || []
}

// Fetch workshop health statistics
async function fetchWorkshopHealth() {
  const [activeWorkshops, pendingWorkshops, suspendedWorkshops, workshopsWithMechanics] =
    await Promise.all([
      supabaseAdmin
        .from('organizations')
        .select('id', { count: 'exact', head: true })
        .eq('organization_type', 'workshop')
        .eq('status', 'active'),
      supabaseAdmin
        .from('organizations')
        .select('id', { count: 'exact', head: true })
        .eq('organization_type', 'workshop')
        .eq('status', 'pending'),
      supabaseAdmin
        .from('organizations')
        .select('id', { count: 'exact', head: true })
        .eq('organization_type', 'workshop')
        .eq('status', 'suspended'),
      supabaseAdmin
        .from('mechanics')
        .select('workshop_id')
        .not('workshop_id', 'is', null),
    ])

  const uniqueWorkshopsWithMechanics = new Set(
    workshopsWithMechanics.data?.map((m) => m.workshop_id) || []
  )

  const totalMechanics = workshopsWithMechanics.data?.length || 0
  const workshopsWithMechanicsCount = uniqueWorkshopsWithMechanics.size

  return {
    active: activeWorkshops.count || 0,
    pending: pendingWorkshops.count || 0,
    suspended: suspendedWorkshops.count || 0,
    withMechanics: workshopsWithMechanicsCount,
    totalMechanics,
    avgMechanicsPerWorkshop:
      workshopsWithMechanicsCount > 0
        ? Math.round(totalMechanics / workshopsWithMechanicsCount * 10) / 10
        : 0,
  }
}

// Fetch email performance metrics
async function fetchEmailMetrics(startDate: Date, endDate: Date) {
  const { data: emailEvents } = await supabaseAdmin
    .from('workshop_events')
    .select('event_type, success, metadata')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .like('event_type', 'email_%')

  const stats = {
    total: 0,
    sent: 0,
    failed: 0,
    byType: {
      approval: { sent: 0, failed: 0 },
      rejection: { sent: 0, failed: 0 },
      invitation: { sent: 0, failed: 0 },
    },
  }

  emailEvents?.forEach((event) => {
    stats.total++
    if (event.success) {
      stats.sent++
    } else {
      stats.failed++
    }

    // Count by type
    const emailType = event.metadata?.emailType
    if (emailType && stats.byType[emailType]) {
      if (event.success) {
        stats.byType[emailType].sent++
      } else {
        stats.byType[emailType].failed++
      }
    }
  })

  return {
    ...stats,
    successRate: stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 100,
  }
}

// Calculate trends between periods
function calculateTrends(current: any, previous: any) {
  const calculateChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }

  return {
    signups: calculateChange(current.signups.completed, previous.signups.completed),
    approvals: calculateChange(
      current.applications.approved,
      previous.applications.approved
    ),
    invitations: calculateChange(current.invitations.sent, previous.invitations.sent),
    activity: calculateChange(current.activity.logins, previous.activity.logins),
  }
}