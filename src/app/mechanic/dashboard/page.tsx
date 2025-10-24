'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import MechanicDashboard from './MechanicDashboardRedesigned'
import { createClient } from '@/lib/supabase'

type Mech = {
  id: string
  name: string
  email: string
  stripeConnected: boolean
  payoutsEnabled: boolean
}

export default function MechanicDashboardPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [mechanic, setMechanic] = useState<Mech | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/mechanic/login')
        return
      }

      // Pull a minimal profile; fall back to auth if needed
      const { data: mechRow } = await supabase
        .from('mechanics')
        .select('id, name, email, stripe_account_id, stripe_payouts_enabled')
        .eq('user_id', user.id)
        .single()

      const mech: Mech = {
        id: mechRow?.id ?? user.id,
        name: mechRow?.name ?? (user.user_metadata?.full_name ?? 'Mechanic'),
        email: mechRow?.email ?? (user.email ?? 'unknown@example.com'),
        stripeConnected: !!mechRow?.stripe_account_id,
        payoutsEnabled: !!mechRow?.stripe_payouts_enabled,
      }

      if (mounted) {
        setMechanic(mech)
        setLoading(false)
      }
    }
    run()
    return () => { mounted = false }
  }, [router, supabase])

  if (loading || !mechanic) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        Loading dashboard…
      </div>
    )
  }

  return <MechanicDashboard mechanic={mechanic} />
}
