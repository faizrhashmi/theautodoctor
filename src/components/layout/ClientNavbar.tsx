'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, DollarSign, BookOpen, Wrench, Menu, X, LayoutDashboard, Building2 } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { createClient } from '@/lib/supabase'
import Logo from '@/components/branding/Logo'

const NAV_ITEMS = [
  { label: 'How It Works', href: '/how-it-works', icon: Home },
  { label: 'Pricing', href: '/pricing', icon: DollarSign },
  { label: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen },
  { label: 'About', href: '/about', icon: Building2 },
]

/**
 * Determine user role by checking mechanics, workshops, and profiles tables
 */
async function determineUserRole(
  userId: string,
  supabase: any
): Promise<'customer' | 'mechanic' | 'workshop' | null> {
  try {
    // Check if user is a mechanic
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (mechanic) return 'mechanic'

    // Check if user is a workshop owner
    const { data: workshop } = await supabase
      .from('workshops')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle()

    if (workshop) return 'workshop'

    // Default to customer
    return 'customer'
  } catch (error) {
    console.error('Error determining user role:', error)
    return 'customer' // Default fallback
  }
}

export default function ClientNavbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'customer' | 'mechanic' | 'workshop' | null>(null)

  // Initialize user state - must be before early return to follow Rules of Hooks
  useEffect(() => {
    const supabase = createClient()

    // Get and VALIDATE initial session (this refreshes expired tokens)
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('[ClientNavbar] Session validation error:', error)
        // Clear invalid session
        await supabase.auth.signOut()
        setUser(null)
        setUserRole(null)
        setLoading(false)
        return
      }

      const user = session?.user ?? null
      setUser(user)

      if (user) {
        // Verify session is actually valid by checking user data
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (userError || !userData.user) {
          // Session is invalid, sign out
          console.log('[ClientNavbar] Invalid session detected, signing out')
          await supabase.auth.signOut()
          setUser(null)
          setUserRole(null)
          setLoading(false)
          return
        }

        // Check user role
        const role = await determineUserRole(user.id, supabase)
        setUserRole(role)
      } else {
        setUserRole(null)
      }

      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[ClientNavbar] Auth state changed:', event)

      // Handle sign out
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserRole(null)
        return
      }

      // Handle token refresh failures
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.log('[ClientNavbar] Token refresh failed, signing out')
        await supabase.auth.signOut()
        setUser(null)
        setUserRole(null)
        return
      }

      const user = session?.user ?? null
      setUser(user)

      if (user) {
        const role = await determineUserRole(user.id, supabase)
        setUserRole(role)
      } else {
        setUserRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check session validity when user returns to the page
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          console.log('[ClientNavbar] Session invalid on page return, signing out')
          await supabase.auth.signOut()
          setUser(null)
          setUserRole(null)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Hide ClientNavbar ONLY on authenticated dashboard pages with sidebars and active sessions
  // Strategy: Be specific about what to hide, not broad
  const shouldHideNavbar = (() => {
    if (!pathname) return false

    // HIDE: Active session pages (need full focus)
    if (
      pathname.startsWith('/video') ||
      pathname.startsWith('/chat') ||
      pathname.startsWith('/diagnostic') ||
      pathname.startsWith('/session')
    ) {
      return true
    }

    // HIDE: Customer flow pages (intake, checkout, etc.)
    if (
      pathname.startsWith('/intake') ||
      pathname.startsWith('/checkout') ||
      pathname.startsWith('/thank-you') ||
      pathname.startsWith('/waiver')
    ) {
      return true
    }

    // HIDE: Mechanic authenticated dashboard pages (where sidebar is visible)
    // SHOW: Mechanic login, signup, onboarding (no sidebar)
    if (pathname.startsWith('/mechanic')) {
      const isMechanicAuth =
        pathname === '/mechanic/login' ||
        pathname === '/mechanic/signup' ||
        pathname.startsWith('/mechanic/onboarding')

      // Show navbar on auth pages, hide on dashboard pages
      return !isMechanicAuth
    }

    // HIDE: Workshop signup and authenticated dashboard pages
    // SHOW: Workshop login page (has navbar)
    if (pathname.startsWith('/workshop')) {
      const isWorkshopLogin = pathname === '/workshop/login'

      // Show navbar ONLY on login page, hide on signup and dashboard
      return !isWorkshopLogin
    }

    // HIDE: Customer authenticated dashboard pages (where sidebar is visible)
    // SHOW: Customer login, signup, onboarding (no sidebar)
    if (pathname.startsWith('/customer')) {
      const isCustomerAuth =
        pathname === '/customer/login' ||
        pathname === '/customer/signup' ||
        pathname.startsWith('/customer/onboarding')

      // Show navbar on auth pages, hide on dashboard pages
      return !isCustomerAuth
    }

    // SHOW: Admin pages now use ClientNavbar instead of custom header
    // HIDE: Admin login page only
    if (pathname.startsWith('/admin')) {
      return pathname === '/admin/login' // Only hide on login page
    }

    // SHOW on all other pages (homepage, public pages, etc.)
    return false
  })()

  if (shouldHideNavbar) {
    return null
  }

  const renderCTA = () => {
    if (user && userRole) {
      // Different styling based on user role
      if (userRole === 'mechanic') {
        return (
          <Link
            href="/mechanic/dashboard"
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:shadow-orange-500/40 hover:from-orange-600 hover:to-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
          >
            <Wrench className="h-4 w-4" />
            <span>Mechanic Dashboard</span>
          </Link>
        )
      }

      if (userRole === 'workshop') {
        return (
          <Link
            href="/workshop/dashboard"
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:from-blue-600 hover:to-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
          >
            <Building2 className="h-4 w-4" />
            <span>Workshop Dashboard</span>
          </Link>
        )
      }

      // Default customer dashboard
      return (
        <Link
          href="/customer/dashboard"
          className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:shadow-orange-500/40 hover:from-orange-600 hover:to-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </Link>
      )
    }

    return null
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-lg">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Logo size="md" showText={true} href="/" />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex md:ml-auto items-center gap-1 md:mr-6">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'text-orange-400 bg-orange-500/10 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-1 -bottom-px h-0.5 bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto md:ml-0 flex items-center gap-3 md:gap-4">
          {/* Login link for existing customers - hide if logged in */}
          {!user && !loading && (
            <Link
              href="/signup?mode=login"
              className="hidden text-sm font-medium text-slate-300 hover:text-white transition-colors md:block"
            >
              Log In
            </Link>
          )}

          {/* Dashboard button for logged-in users only */}
          {renderCTA()}

          {/* Provider Links - Modern Cards */}
          <div className="hidden lg:flex items-center gap-2">
            <Link
              href="/mechanic/login"
              className="group relative flex items-center gap-2 rounded-lg border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5 px-3 py-2 text-xs font-semibold text-orange-400 transition-all hover:border-orange-400/50 hover:bg-orange-500/20 hover:shadow-lg hover:shadow-orange-500/20"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>For Mechanics</span>
            </Link>
            <Link
              href="/workshop/login"
              className="group relative flex items-center gap-2 rounded-lg border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 px-3 py-2 text-xs font-semibold text-blue-400 transition-all hover:border-blue-400/50 hover:bg-blue-500/20 hover:shadow-lg hover:shadow-blue-500/20"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>For Workshops</span>
            </Link>
          </div>

          {/* Mobile Menu */}
          <MobileMenu user={user} loading={loading} pathname={pathname} userRole={userRole} />
        </div>
      </div>
    </header>
  )
}

/**
 * Mobile Menu Component
 */
function MobileMenu({
  user,
  loading,
  pathname,
  userRole
}: {
  user: any;
  loading: boolean;
  pathname: string;
  userRole: 'customer' | 'mechanic' | 'workshop' | null;
}) {
  const [open, setOpen] = useState(false)

  // Auto-close menu when user scrolls
  useEffect(() => {
    if (!open) return

    const handleScroll = () => {
      setOpen(false)
    }

    const timeoutId = setTimeout(() => {
      window.addEventListener('scroll', handleScroll, { passive: true })
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [open])

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-200 border border-white/10 transition hover:bg-white/10 hover:text-white hover:border-orange-400/50 focus:outline-none focus:ring-2 focus:ring-orange-400 flex-shrink-0"
          aria-label="Toggle navigation menu"
        >
          {open ? (
            <X className="h-5 w-5 transition-transform duration-200" />
          ) : (
            <Menu className="h-5 w-5 transition-transform duration-200" />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-72 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/98 backdrop-blur-xl p-3 shadow-2xl shadow-black/50 animate-slide-in-right"
        >
          {/* Navigation Items */}
          <div className="mb-3">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href
              return (
                <DropdownMenu.Item key={item.href} asChild>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all focus:outline-none ${
                      isActive
                        ? 'bg-orange-500/10 text-orange-400 font-semibold border border-orange-500/30'
                        : 'text-slate-200 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive ? 'text-orange-400' : 'text-slate-400'}`} />
                    {item.label}
                  </Link>
                </DropdownMenu.Item>
              )
            })}
          </div>

          <DropdownMenu.Separator className="my-3 h-px bg-white/10" />

          {/* User State Aware Items */}
          {loading ? (
            <div className="px-4 py-3">
              <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
            </div>
          ) : user && userRole ? (
            <div className="mb-3">
              {userRole === 'mechanic' && (
                <DropdownMenu.Item asChild>
                  <Link
                    href="/mechanic/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium bg-gradient-to-r from-orange-500/10 to-amber-600/10 text-orange-400 border border-orange-500/30 transition-all hover:from-orange-500/20 hover:to-amber-600/20 focus:outline-none"
                  >
                    <Wrench className="h-4 w-4" />
                    Mechanic Dashboard
                  </Link>
                </DropdownMenu.Item>
              )}
              {userRole === 'workshop' && (
                <DropdownMenu.Item asChild>
                  <Link
                    href="/workshop/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium bg-gradient-to-r from-blue-500/10 to-blue-700/10 text-blue-400 border border-blue-500/30 transition-all hover:from-blue-500/20 hover:to-blue-700/20 focus:outline-none"
                  >
                    <Building2 className="h-4 w-4" />
                    Workshop Dashboard
                  </Link>
                </DropdownMenu.Item>
              )}
              {userRole === 'customer' && (
                <DropdownMenu.Item asChild>
                  <Link
                    href="/customer/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium bg-gradient-to-r from-orange-500/10 to-red-600/10 text-orange-400 border border-orange-500/30 transition-all hover:from-orange-500/20 hover:to-red-600/20 focus:outline-none"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenu.Item>
              )}
            </div>
          ) : user ? (
            <div className="px-4 py-3">
              <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
            </div>
          ) : (
            <div className="mb-3">
              <DropdownMenu.Item asChild>
                <Link
                  href="/signup?mode=login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-200 bg-white/5 border border-white/10 transition-all hover:bg-white/10 hover:text-white hover:border-orange-400/50 focus:outline-none"
                >
                  Log In
                </Link>
              </DropdownMenu.Item>
            </div>
          )}

          <DropdownMenu.Separator className="my-3 h-px bg-white/10" />

          {/* Provider Links */}
          <div className="space-y-2">
            <DropdownMenu.Item asChild>
              <Link
                href="/mechanic/login"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5 px-4 py-3 text-sm font-semibold text-orange-400 transition-all hover:border-orange-400/50 hover:from-orange-500/20 hover:to-orange-600/10 focus:outline-none"
              >
                <Wrench className="h-4 w-4" />
                For Mechanics
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link
                href="/workshop/login"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 px-4 py-3 text-sm font-semibold text-blue-400 transition-all hover:border-blue-400/50 hover:from-blue-500/20 hover:to-blue-600/10 focus:outline-none"
              >
                <Building2 className="h-4 w-4" />
                For Workshops
              </Link>
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
