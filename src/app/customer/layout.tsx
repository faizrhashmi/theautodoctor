'use client'

import { ReactNode } from 'react'
import CustomerSidebar from '@/components/customer/CustomerSidebar'
import { useActivityTimeout } from '@/hooks/useActivityTimeout'
import { createClient } from '@/lib/supabase'

export default function CustomerLayout({ children }: { children: ReactNode }) {
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
    <div className="flex min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <CustomerSidebar />
      <main className="flex-1 lg:ml-64 transition-all duration-300">
        {children}
      </main>
    </div>
  )
}
