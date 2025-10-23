// @ts-nocheck
import { getSupabaseServer } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import AdminSessionsClient, { type SessionWithParticipants } from './AdminSessionsClient'

export const dynamic = 'force-dynamic'

export default async function AdminSessionsPage() {
  const supabase = getSupabaseServer()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/admin/login')
  }

  // Fetch initial sessions with all related data
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select(`
      *,
      session_participants!inner(
        user_id,
        role,
        users!inner(
          email,
          user_metadata
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (sessionsError) {
    console.error('Error fetching sessions:', sessionsError)
  }

  // Get statistics
  const stats = await getSessionStats(supabase)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Session Management</h1>
        <p className="mt-2 text-sm text-slate-600">
          Monitor and manage all customer sessions
        </p>
      </div>

      <AdminSessionsClient initialSessions={(sessions as unknown as SessionWithParticipants[]) || []} initialStats={stats} />
    </div>
  )
}

async function getSessionStats(supabase: any) {
  const [liveCount, waitingCount, completedCount, totalRevenue] = await Promise.all([
    supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'live'),
    supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'waiting'),
    supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('sessions').select('metadata').eq('status', 'completed'),
  ])

  const revenue = totalRevenue.data?.reduce((sum: number, session: any) => {
    const amount = session.metadata?.amount || 0
    return sum + (typeof amount === 'number' ? amount : 0)
  }, 0) || 0

  return {
    live: liveCount.count || 0,
    waiting: waitingCount.count || 0,
    completed: completedCount.count || 0,
    revenue: revenue / 100, // Convert cents to dollars
  }
}
