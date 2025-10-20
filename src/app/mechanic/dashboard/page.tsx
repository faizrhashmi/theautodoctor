import { redirect } from 'next/navigation'
import MechanicDashboardClient from './MechanicDashboardClient'
import { getSupabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export default async function MechanicDashboardPage() {
  const supabase = getSupabaseServer()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/mechanic/login?next=/mechanic/dashboard')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const isMechanic = user.user_metadata?.role === 'mechanic' || profile?.role === 'mechanic'

  if (!isMechanic) {
    redirect('/mechanic/login?next=/mechanic/dashboard')
  }

  const mechanicName =
    profile?.full_name ??
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.length > 0
      ? user.user_metadata.full_name
      : null) ??
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.length > 0
      ? user.user_metadata.name
      : null) ??
    user.email ??
    'Mechanic'

  return <MechanicDashboardClient initialMechanic={{ id: user.id, name: mechanicName }} />
}
