import { getSupabaseServer } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import SessionHealthDashboard from './SessionHealthDashboard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SessionHealthPage() {
  const supabase = getSupabaseServer()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/admin/login')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/admin/login')
  }

  // Fetch session health data
  const { data: healthData, error } = await supabase.rpc('session_health_dashboard')

  if (error) {
    console.error('Error fetching session health data:', error)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Session End Logic Health Monitor</h1>
        <p className="mt-2 text-sm text-slate-400">
          Real-time monitoring of session status integrity and completion logic
        </p>
      </div>

      <SessionHealthDashboard initialData={healthData} />
    </div>
  )
}
