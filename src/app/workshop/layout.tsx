'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import WorkshopSidebar from '@/components/workshop/WorkshopSidebar'

// Routes that should NOT show the sidebar
const NO_SIDEBAR_ROUTES = [
  '/workshop/login',
  '/workshop/signup',
]

export default function WorkshopLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const showSidebar = pathname ? !NO_SIDEBAR_ROUTES.includes(pathname) : true

  if (!showSidebar) {
    // No sidebar for auth pages
    return <>{children}</>
  }

  // Authenticated pages with sidebar
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <WorkshopSidebar />
      <main className="flex-1 lg:ml-64 transition-all duration-300">
        {children}
      </main>
    </div>
  )
}
