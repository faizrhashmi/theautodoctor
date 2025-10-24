'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MechanicDashboard from './MechanicDashboardComplete'

type Mech = {
  id: string
  name: string
  email: string
  stripeConnected: boolean
  payoutsEnabled: boolean
}

export default function MechanicDashboardPage() {
  const router = useRouter()
  const [mechanic, setMechanic] = useState<Mech | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        const response = await fetch('/api/mechanics/me')

        if (!response.ok) {
          if (response.status === 401) {
            router.replace('/mechanic/login')
            return
          }
          throw new Error('Failed to load mechanic data')
        }

        const data = await response.json()

        if (mounted) {
          setMechanic(data)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error loading mechanic:', err)
        if (mounted) {
          setError('Failed to load dashboard. Please try again.')
          setLoading(false)
        }
      }
    }
    run()
    return () => { mounted = false }
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        Loading dashboard…
      </div>
    )
  }

  if (error || !mechanic) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error || 'Failed to load dashboard'}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return <MechanicDashboard mechanic={mechanic} />
}
