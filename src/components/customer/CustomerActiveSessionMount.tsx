'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// we reuse your existing shared banner
const ActiveSessionBanner = dynamic(
  () => import('@/components/shared/ActiveSessionBanner').then(m => ({ default: m.ActiveSessionBanner })),
  { ssr: false }
)

export default function CustomerActiveSessionMount() {
  const router = useRouter()
  const [canShow, setCanShow] = useState(false)

  // fetch once on mount + any time the page asks to refresh
  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        const r = await fetch('/api/customer/sessions/active', { cache: 'no-store' })
        const d = await r.json()
        // only show if active + session returned (banner has its own guards too)
        if (mounted) setCanShow(!!(d?.active && d?.session))
      } catch {
        if (mounted) setCanShow(false)
      }
    }
    run()

    // also listen for our optional realtime event if you keep it
    const onUpdate = () => run()
    window.addEventListener('customer:sessions:update', onUpdate)
    return () => {
      mounted = false
      window.removeEventListener('customer:sessions:update', onUpdate)
    }
  }, [])

  if (!canShow) return null
  // Delegate UX + polling to shared component, but force customer role
  return (
    <div className="fixed inset-x-0 top-0 z-[1000]">
      <ActiveSessionBanner userRole="customer" onSessionEnded={() => router.refresh()} />
    </div>
  )
}
