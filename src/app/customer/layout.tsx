'use client'

import { ReactNode, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import CustomerSidebar from '@/components/customer/CustomerSidebar'
import { ActiveSessionBanner } from '@/components/shared/ActiveSessionBanner'
import { useActivityTimeout } from '@/hooks/useActivityTimeout'
import { createClient } from '@/lib/supabase'
import { PlansProvider } from '@/contexts/PlansContext'

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const router = useRouter()

  // Callback when session is ended from ActiveSessionBanner
  const handleSessionEnded = useCallback(() => {
    console.log('[CustomerLayout] Session ended, refreshing page data')
    // Refresh the page to update active sessions
    router.refresh()
  }, [router])

  // ✅ Activity-based session timeout - 8 hours for customers
  useActivityTimeout({
    timeoutMs: 8 * 60 * 60 * 1000, // 8 hours
    onTimeout: async () => {
      const supabase = createClient()

      // Call logout API
      await fetch('/api/customer/logout', {
        method: 'POST',
        credentials: 'include',
      })

      // Sign out from Supabase
      await supabase.auth.signOut()

      // Clear storage
      localStorage.clear()
      sessionStorage.clear()

      // Hard redirect to home
      window.location.href = '/'
    },
  })

  return (
    <PlansProvider>
      <div className="flex min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <CustomerSidebar />
        <div className="flex-1 lg:ml-64 transition-all duration-300">
          {/* Active session banner - shows across all customer pages */}
          <ActiveSessionBanner userRole="customer" onSessionEnded={handleSessionEnded} />
          <main className="min-h-screen">
            {children}
          </main>
        </div>
      </div>
    </PlansProvider>
  )
}
