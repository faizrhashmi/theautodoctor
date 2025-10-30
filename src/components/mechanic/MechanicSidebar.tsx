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
  DollarSign,
  Star,
  Briefcase,
  Video,
  TrendingUp,
  FolderOpen
} from 'lucide-react'
import Logo from '@/components/branding/Logo'
import { createClient } from '@/lib/supabase'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/mechanic/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Sessions',
    href: '/mechanic/sessions',
    icon: Video,
  },
  {
    label: 'CRM',
    href: '/mechanic/crm',
    icon: Users,
  },
  {
    label: 'Analytics',
    href: '/mechanic/analytics',
    icon: TrendingUp,
  },
  {
    label: 'Earnings',
    href: '/mechanic/earnings',
    icon: DollarSign,
  },
  {
    label: 'Reviews',
    href: '/mechanic/reviews',
    icon: Star,
  },
  {
    label: 'Documents',
    href: '/mechanic/documents',
    icon: FolderOpen,
  },
  {
    label: 'Partnerships',
    href: '/mechanic/partnerships/browse',
    icon: Briefcase,
  },
  {
    label: 'Availability',
    href: '/mechanic/availability',
    icon: Calendar,
  },
  {
    label: 'Profile',
    href: '/mechanic/profile',
    icon: User,
  },
]

export default function MechanicSidebar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mechanicFirstName, setMechanicFirstName] = useState<string>('')

  // Fetch mechanic's name on mount
  useEffect(() => {
    const fetchMechanicName = async () => {
      try {
        const response = await fetch('/api/mechanics/me')
        if (response.ok) {
          const data = await response.json()
          const firstName = data.name ? data.name.split(' ')[0] : ''
          setMechanicFirstName(firstName)
        }
      } catch (error) {
        console.error('Failed to fetch mechanic name:', error)
      }
    }

    fetchMechanicName()
  }, [])

  async function handleSignOut() {
    try {
      console.log('[MechanicSidebar] Starting logout...')

      const supabase = createClient()

      // Sign out from Supabase - this will clear all auth cookies
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('[MechanicSidebar] Logout error:', error)
        // Continue with redirect even if error
      } else {
        console.log('[MechanicSidebar] ✅ Logout successful')
      }

      // Force hard redirect to clear any cached state
      window.location.href = '/mechanic/login'
    } catch (error) {
      console.error('[MechanicSidebar] Sign out error:', error)
      // Still redirect even if error
      window.location.href = '/mechanic/login'
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
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-800 z-40 transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section - Compact */}
          <div className="p-4 border-b border-slate-800">
            <Logo size="md" showText={true} href="/mechanic/dashboard" variant="mechanic" />
            <p className="text-xs text-slate-400 mt-1">
              {mechanicFirstName ? `Hi ${mechanicFirstName}` : 'Mechanic Portal'}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent hover:border-slate-700'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : ''}`} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="h-3 w-3 text-blue-400" />}
                </Link>
              )
            })}
          </nav>

          {/* Bottom Actions - Compact */}
          <div className="p-3 border-t border-slate-800 space-y-2">
            {/* Logout Button */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span className="flex-1 text-left">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
