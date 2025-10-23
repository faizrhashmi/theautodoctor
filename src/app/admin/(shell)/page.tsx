// @ts-nocheck
// src/app/admin/(shell)/page.tsx
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export const dynamic = 'force-dynamic'

interface DashboardData {
  metrics: {
    activeSessions: number
    totalCustomers: number
    totalMechanics: number
    onlineMechanics: number
    pendingRequests: number
    unattendedRequests: number
    todayRevenue: number
    weekRevenue: number
    monthRevenue: number
    customerTrend24h: number
    customerTrend7d: number
    customerTrend30d: number
  }
  systemHealth: {
    databaseStatus: 'healthy' | 'degraded' | 'down'
    supabaseStatus: 'healthy' | 'degraded' | 'down'
    livekitStatus: 'healthy' | 'degraded' | 'down'
    stripeStatus: 'healthy' | 'degraded' | 'down'
    lastCleanup?: string
    errorRate: number
  }
  recentActivity: Array<{
    id: string
    type: 'session' | 'request' | 'error'
    title: string
    description: string
    timestamp: string
    status?: string
  }>
  chartData: {
    sessionsOverTime: Array<{ date: string; sessions: number }>
    sessionTypes: Array<{ name: string; value: number }>
    revenueTrend: Array<{ date: string; revenue: number }>
    customerAcquisition: Array<{ date: string; customers: number }>
  }
}

async function getDashboardData(): Promise<DashboardData> {
  // Calculate date ranges
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Fetch active sessions
  const { data: activeSessions, error: activeSessionsError } = await supabaseAdmin
    .from('sessions')
    .select('id, status, type, created_at')
    .in('status', ['active', 'pending', 'waiting'])

  if (activeSessionsError) throw new Error(activeSessionsError.message)

  // Fetch pending requests
  const { data: pendingRequests, error: pendingRequestsError } = await supabaseAdmin
    .from('session_requests')
    .select('id')
    .eq('status', 'pending')

  if (pendingRequestsError) throw new Error(pendingRequestsError.message)

  // Fetch unattended requests
  const { data: unattendedRequests, error: unattendedRequestsError } = await supabaseAdmin
    .from('session_requests')
    .select('id')
    .eq('status', 'unattended')

  if (unattendedRequestsError) throw new Error(unattendedRequestsError.message)

  // Fetch total customers from profiles
  const { count: totalCustomers, error: customersError } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'customer')

  if (customersError) throw new Error(customersError.message)

  // Fetch customers from last 24h
  const { count: customers24h, error: customers24hError } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'customer')
    .gte('created_at', yesterday.toISOString())

  if (customers24hError) throw new Error(customers24hError.message)

  // Fetch customers from last 7 days
  const { count: customers7d, error: customers7dError } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'customer')
    .gte('created_at', weekAgo.toISOString())

  if (customers7dError) throw new Error(customers7dError.message)

  // Fetch customers from last 30 days
  const { count: customers30d, error: customers30dError } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'customer')
    .gte('created_at', monthAgo.toISOString())

  if (customers30dError) throw new Error(customers30dError.message)

  // Fetch total mechanics
  const { count: totalMechanics, error: mechanicsError } = await supabaseAdmin
    .from('mechanics')
    .select('*', { count: 'exact', head: true })

  if (mechanicsError) throw new Error(mechanicsError.message)

  // Calculate session types breakdown
  const sessionTypes = [
    { name: 'Chat', value: activeSessions?.filter((s) => s.type === 'chat').length || 0 },
    { name: 'Video', value: activeSessions?.filter((s) => s.type === 'video').length || 0 },
    {
      name: 'Diagnostic',
      value: activeSessions?.filter((s) => s.type === 'diagnostic').length || 0,
    },
  ]

  // Fetch recent sessions for activity feed
  const { data: recentSessions, error: recentSessionsError } = await supabaseAdmin
    .from('sessions')
    .select('id, type, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (recentSessionsError) throw new Error(recentSessionsError.message)

  // Fetch recent requests for activity feed
  const { data: recentRequests, error: recentRequestsError } = await supabaseAdmin
    .from('session_requests')
    .select('id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (recentRequestsError) throw new Error(recentRequestsError.message)

  // Combine activities
  const activities = [
    ...(recentSessions || []).map((s) => ({
      id: s.id,
      type: 'session' as const,
      title: `${s.type} session created`,
      description: `Status: ${s.status || 'unknown'}`,
      timestamp: s.created_at,
      status: s.status || undefined,
    })),
    ...(recentRequests || []).map((r) => ({
      id: r.id,
      type: 'request' as const,
      title: 'Session request received',
      description: `Status: ${r.status}`,
      timestamp: r.created_at,
      status: r.status,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)

  // Fetch sessions over time (last 7 days)
  const { data: sessionsHistory, error: sessionsHistoryError } = await supabaseAdmin
    .from('sessions')
    .select('created_at')
    .gte('created_at', weekAgo.toISOString())

  if (sessionsHistoryError) throw new Error(sessionsHistoryError.message)

  // Group sessions by date
  const sessionsOverTime = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekAgo.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0] || ''
    const count =
      sessionsHistory?.filter((s) => s.created_at?.startsWith(dateStr)).length || 0
    return {
      date: dateStr,
      sessions: count,
    }
  })

  // Fetch customer acquisition (last 7 days)
  const { data: customersHistory, error: customersHistoryError } = await supabaseAdmin
    .from('profiles')
    .select('created_at')
    .eq('role', 'customer')
    .gte('created_at', weekAgo.toISOString())

  if (customersHistoryError) throw new Error(customersHistoryError.message)

  // Group customers by date
  const customerAcquisition = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekAgo.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0] || '';
    const count =
      customersHistory?.filter((c) => c.created_at?.startsWith(dateStr)).length || 0
    return {
      date: dateStr,
      customers: count,
    }
  })

  // Calculate customer trends
  const customerTrend24h = customers24h && totalCustomers ? ((customers24h / totalCustomers) * 100) : 0
  const customerTrend7d = customers7d && totalCustomers ? ((customers7d / totalCustomers) * 100) : 0
  const customerTrend30d = customers30d && totalCustomers ? ((customers30d / totalCustomers) * 100) : 0

  return {
    metrics: {
      activeSessions: activeSessions?.length || 0,
      totalCustomers: totalCustomers || 0,
      totalMechanics: totalMechanics || 0,
      onlineMechanics: 0, // TODO: Implement online status
      pendingRequests: pendingRequests?.length || 0,
      unattendedRequests: unattendedRequests?.length || 0,
      todayRevenue: 0, // TODO: Implement revenue tracking
      weekRevenue: 0,
      monthRevenue: 0,
      customerTrend24h,
      customerTrend7d,
      customerTrend30d,
    },
    systemHealth: {
      databaseStatus: 'healthy',
      supabaseStatus: 'healthy',
      livekitStatus: 'healthy',
      stripeStatus: 'healthy',
      errorRate: 0,
    },
    recentActivity: activities,
    chartData: {
      sessionsOverTime,
      sessionTypes,
      revenueTrend: [], // TODO: Implement revenue tracking
      customerAcquisition,
    },
  }
}

export default async function AdminDashboardPage() {
  const supabase = getSupabaseServer()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/admin/login')
  }

  const dashboardData = await getDashboardData()

  return <DashboardClient data={dashboardData} />
}
