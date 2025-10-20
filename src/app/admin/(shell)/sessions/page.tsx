import { getSupabaseServer } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import SessionsList from './SessionsList'

export const dynamic = 'force-dynamic'

export default async function MechanicSessionsPage() {
  const supabase = getSupabaseServer()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/admin/login')
  }

  // Fetch available sessions (pending chat/video sessions without mechanics)
  const { data: availableSessions, error: availableError } = await supabase
    .from('sessions')
    .select(`
      id,
      created_at,
      type,
      plan,
      status,
      intake_id,
      customer_user_id
    `)
    .in('type', ['chat', 'video'])
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (availableError) {
    throw new Error(availableError.message)
  }

  // For each session, check if it has a mechanic assigned
  const sessionsWithMechanicCount = await Promise.all(
    (availableSessions || []).map(async (session) => {
      const { count } = await supabase
        .from('session_participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id)
        .eq('role', 'mechanic')

      return {
        ...session,
        has_mechanic: (count || 0) > 0,
      }
    })
  )

  // Filter to only sessions without mechanics
  const unassignedSessions = sessionsWithMechanicCount.filter((s) => !s.has_mechanic)

  // Fetch sessions this mechanic is currently in
  const { data: mySessions, error: mySessionsError } = await supabase
    .from('session_participants')
    .select(`
      session_id,
      sessions (
        id,
        created_at,
        type,
        plan,
        status,
        intake_id,
        customer_user_id
      )
    `)
    .eq('user_id', user.id)
    .eq('role', 'mechanic')

  if (mySessionsError) {
    throw new Error(mySessionsError.message)
  }

  const activeSessions = (mySessions || [])
    .map((p: any) => p.sessions)
    .filter((s: any) => s && s.status !== 'completed')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mechanic Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          View available sessions and join customers who need help
        </p>
      </div>

      <SessionsList
        userId={user.id}
        availableSessions={unassignedSessions}
        activeSessions={activeSessions}
      />
    </div>
  )
}
