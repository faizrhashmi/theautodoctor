import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'
import SchedulingWizard from './SchedulingWizard'

export const dynamic = 'force-dynamic'

export default async function CustomerSchedulePage() {
  const supabase = getSupabaseServer()

  // 1. Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signup?redirect=/customer/schedule')
  }

  // 2. Check for active sessions (prevent double booking)
  const { data: activeSessions } = await supabase
    .from('sessions')
    .select('id, status, type')
    .eq('customer_user_id', user.id)
    .in('status', ['pending', 'live', 'waiting'])
    .limit(1)

  if (activeSessions && activeSessions.length > 0) {
    // Redirect to active session instead of allowing new booking
    redirect(`/customer/sessions/${activeSessions[0].id}`)
  }

  // 3. Render wizard
  return <SchedulingWizard />
}
