'use client'

import { useActivityTimeout } from '@/hooks/useActivityTimeout'
import { createClient } from '@/lib/supabase'

/**
 * Client component that manages activity-based session timeout for admin users
 * Used in the admin layout to automatically log out inactive admins after 2 hours
 */
export function AdminActivityTimeout() {
  // ✅ Activity-based session timeout - 2 hours for admins (most restrictive)
  useActivityTimeout({
    timeoutMs: 2 * 60 * 60 * 1000, // 2 hours
    onTimeout: async () => {
      const supabase = createClient()

      // Call logout API
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      })

      // Sign out from Supabase
      await supabase.auth.signOut()

      // Clear storage
      localStorage.clear()
      sessionStorage.clear()

      // Hard redirect to admin login
      window.location.href = '/admin/login'
    },
  })

  // This component doesn't render anything
  return null
}
