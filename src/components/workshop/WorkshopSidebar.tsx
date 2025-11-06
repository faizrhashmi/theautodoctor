'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Users,
  MessageSquare,
  User,
  Clock,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Settings,
  TrendingUp,
  Wrench,
  Briefcase,
  Building2
} from 'lucide-react'
import Logo from '@/components/branding/Logo'
import { createClient } from '@/lib/supabase'
import { NotificationBell } from '@/components/notifications/NotificationBell'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/workshop/dashboard',
    icon: LayoutDashboard,
    description: 'Overview & insights'
  },
  {
    label: 'Diagnostics',
    href: '/workshop/diagnostics',
    icon: Wrench,
    description: 'Diagnostic sessions'
  },
  {
    label: 'Quotes',
    href: '/workshop/quotes',
    icon: FileText,
    description: 'Manage estimates'
  },
  {
    label: 'Analytics',
    href: '/workshop/analytics',
    icon: TrendingUp,
    description: 'Performance metrics'
  },
  {
    label: 'Partnerships',
    href: '/workshop/partnerships',
    icon: Briefcase,
    description: 'Mechanic network'
  },
  {
    label: 'Settings',
    href: '/workshop/settings',
    icon: Settings,
    description: 'Workshop configuration'
  },
]

export default function WorkshopSidebar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [workshopUserId, setWorkshopUserId] = useState<string | null>(null)

  // Fetch workshop userId on mount
  useEffect(() => {
    const fetchWorkshopUserId = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          setWorkshopUserId(user.id)
        }
      } catch (error) {
        console.error('Failed to fetch workshop user:', error)
      }
    }

    fetchWorkshopUserId()
  }, [])

  async function handleSignOut() {
    try {
      // Call workshop logout API to clear auth cookies
      await fetch('/api/workshop/logout', {
        method: 'POST',
        credentials: 'include'
      })

      // Force hard redirect to clear any cached state
      window.location.href = '/workshop/login'
    } catch (error) {
      console.error('Sign out error:', error)
      // Still redirect even if error
      window.location.href = '/workshop/login'
    }
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 flex items-center justify-center w-10 h-10 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition-all shadow-lg"
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 sm:w-80 lg:w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-800 z-40 transition-transform duration-300 ease-in-out shadow-2xl ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Workshop navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo Section - Improved padding for mobile */}
          <div className="p-5 sm:p-6 lg:p-4 border-b border-slate-800">
            <Logo size="md" showText={true} href="/workshop/dashboard" variant="workshop" />
            <div className="flex items-center justify-between gap-2 mt-3">
              <p className="text-sm sm:text-base text-slate-300 font-medium flex-shrink min-w-0 truncate">Workshop Portal</p>
              {workshopUserId && <NotificationBell userId={workshopUserId} userRole="workshop" />}
            </div>
          </div>

          {/* Navigation - Enhanced for mobile */}
          <nav className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-3 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-base sm:text-lg lg:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent hover:border-slate-700'
                  }`}
                >
                  <Icon className={`h-5 w-5 sm:h-6 sm:w-6 lg:h-4 lg:w-4 flex-shrink-0 ${isActive ? 'text-purple-400' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{item.label}</div>
                    <div className="text-xs text-slate-500 truncate sm:block lg:hidden">{item.description}</div>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-purple-400 flex-shrink-0" />}
                </Link>
              )
            })}
          </nav>

          {/* Bottom Actions - Enhanced for mobile */}
          <div className="p-3 sm:p-4 lg:p-3 border-t border-slate-800 space-y-2">
            {/* Logout Button */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base sm:text-lg lg:text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all"
            >
              <LogOut className="h-5 w-5 sm:h-6 sm:w-6 lg:h-4 lg:w-4" />
              <span className="flex-1 text-left">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
