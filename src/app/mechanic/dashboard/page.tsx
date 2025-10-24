import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import MechanicDashboardRedesigned from './MechanicDashboardRedesigned'

export const dynamic = 'force-dynamic'

/**
 * Server component: Verify mechanic authentication and load initial data
 */
export default async function MechanicDashboardPage() {
  // Get mechanic from custom auth system (aad_mech cookie)
  const cookieStore = cookies()
  const token = cookieStore.get('aad_mech')?.value

  if (!token) {
    redirect('/mechanic/login?redirect=/mechanic/dashboard')
  }

  // Verify session is valid
  const { data: session } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('mechanic_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) {
    redirect('/mechanic/login?redirect=/mechanic/dashboard')
  }

  // Load mechanic profile
  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email, stripe_account_id, stripe_payouts_enabled')
    .eq('id', session.mechanic_id)
    .single()

  if (!mechanic) {
    redirect('/mechanic/login')
  }

  return (
    <MechanicDashboardRedesigned
      mechanic={{
        id: mechanic.id,
        name: mechanic.name || 'Mechanic',
        email: mechanic.email,
        stripeConnected: Boolean(mechanic.stripe_account_id),
        payoutsEnabled: Boolean(mechanic.stripe_payouts_enabled),
      }}
    />
  )
}
