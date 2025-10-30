'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import MechanicSidebar from '@/components/mechanic/MechanicSidebar'
import { useActivityTimeout } from '@/hooks/useActivityTimeout'

// Routes that should NOT show the sidebar
const NO_SIDEBAR_ROUTES = [
  '/mechanic/login',
  '/mechanic/signup',
]

// Check if route starts with any onboarding path
function isOnboardingRoute(pathname: string) {
  return pathname.startsWith('/mechanic/onboarding')
}

function shouldShowSidebar(pathname: string): boolean {
  // Don't show sidebar on public auth routes
  if (NO_SIDEBAR_ROUTES.includes(pathname)) {
    return false
  }

  // Don't show sidebar on onboarding routes
  if (isOnboardingRoute(pathname)) {
    return false
  }

  // Show sidebar on all other mechanic routes
  return true
}

export default function MechanicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const showSidebar = shouldShowSidebar(pathname || '')
  const supabase = createClient()

  // ✅ Activity-based session timeout - 4 hours for mechanics
  useActivityTimeout({
    timeoutMs: 4 * 60 * 60 * 1000, // 4 hours
    onTimeout: async () => {
      // Sign out from Supabase
      await supabase.auth.signOut()
      // Hard redirect to login
      window.location.href = '/mechanic/login'
    },
  })

  // Global auth protection for mechanic routes
  useEffect(() => {
    const checkAuth = async () => {
      if (!showSidebar) return // Skip auth check for public routes

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.log('[MechanicLayout] No session found, redirecting to login')
        window.location.href = '/mechanic/login'
        return
      }

      // Verify user is a mechanic
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.role !== 'mechanic') {
        console.log('[MechanicLayout] User is not a mechanic, signing out')
        await supabase.auth.signOut()
        window.location.href = '/mechanic/login'
      }
    }

    checkAuth()
  }, [showSidebar, supabase])

  if (!showSidebar) {
    // No sidebar for auth/onboarding pages
    return <>{children}</>
  }

  // Authenticated pages with sidebar
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <MechanicSidebar />
      <main className="flex-1 lg:ml-64 transition-all duration-300">
        {children}
      </main>
    </div>
  )
}