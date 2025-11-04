'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Car,
  MessageSquare,
  User,
  Clock,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Settings,
  Bell,
  Heart,
  ClipboardList
} from 'lucide-react'
import Logo from '@/components/branding/Logo'
import { createClient } from '@/lib/supabase'
import { NotificationBell } from '@/components/notifications/NotificationBell'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/customer/dashboard',
    icon: LayoutDashboard,
    description: 'Overview & quick actions'
  },
  {
    label: 'Sessions',
    href: '/customer/sessions',
    icon: Clock,
    description: 'Session history'
  },
  {
    label: 'Quotes',
    href: '/customer/quotes',
    icon: FileText,
    description: 'View estimates'
  },
  {
    label: 'My RFQs',
    href: '/customer/rfq/my-rfqs',
    icon: ClipboardList,
    description: 'Request quotes from workshops',
    featureGated: 'rfq'
  },
  {
    label: 'Vehicles',
    href: '/customer/vehicles',
    icon: Car,
    description: 'Manage fleet'
  },
  {
    label: 'Schedule',
    href: '/customer/schedule',
    icon: Calendar,
    description: 'Book appointments'
  },
  {
    label: 'Profile',
    href: '/customer/profile',
    icon: User,
    description: 'Account settings'
  },
]

export default function CustomerSidebar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [firstName, setFirstName] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)
  // Phase 2.4: RFQ is now always-on

  // Fetch customer name and userId
  useEffect(() => {
    async function fetchCustomerData() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          setUserId(user.id)

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()

          if (profile?.full_name) {
            // Extract first name from full name
            const firstNameOnly = profile.full_name.split(' ')[0]
            setFirstName(firstNameOnly)
          }
        }
      } catch (error) {
        console.error('Failed to fetch customer data:', error)
      }
    }

    fetchCustomerData()
  }, [])

  async function handleSignOut() {
    try {
      // Call customer logout API to clear auth cookies
      await fetch('/api/customer/logout', {
        method: 'POST',
        credentials: 'include'
      })

      // Force hard redirect to clear any cached state
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
      // Still redirect even if error
      window.location.href = '/'
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
            <Logo size="md" showText={true} href="/" variant="customer" />
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-slate-300 font-medium">
                {firstName ? `Hi ${firstName}` : 'Customer Portal'}
              </p>
              {userId && <NotificationBell userId={userId} />}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              // Phase 2.4: RFQ is always-on, no filtering needed
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 border border-orange-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent hover:border-slate-700'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-orange-400' : ''}`} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="h-3 w-3 text-orange-400" />}
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
