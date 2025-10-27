'use client'

import { usePathname } from 'next/navigation'
import MechanicSidebar from '@/components/mechanic/MechanicSidebar'

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
