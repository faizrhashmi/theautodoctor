'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, DollarSign, BookOpen, Wrench, Menu, X, Building2 } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import Logo from '@/components/branding/Logo'
import { createClient } from '@/lib/supabase'

const NAV_ITEMS = [
  { label: 'How It Works', href: '/how-it-works', icon: Home },
  { label: 'Pricing', href: '/pricing', icon: DollarSign },
  { label: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen },
  { label: 'About', href: '/about', icon: Building2 },
]

/**
 * Determine user role by checking mechanics, workshops tables
 */
async function determineUserRole(userId: string): Promise<'customer' | 'mechanic' | 'workshop' | null> {
  try {
    const supabase = createClient()

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
    return null
  }
}

export default function ClientNavbar() {
  const pathname = usePathname()
  const router = useRouter()

  // Smart login handlers that check for existing sessions
  const handleCustomerLogin = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const role = await determineUserRole(session.user.id)
        if (role === 'customer') {
          router.push('/customer/dashboard')
          return
        }
      }

      router.push('/signup?mode=login')
    } catch (error) {
      console.error('Customer login check error:', error)
      router.push('/signup?mode=login')
    }
  }

  const handleMechanicLogin = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const role = await determineUserRole(session.user.id)
        if (role === 'mechanic') {
          router.push('/mechanic/dashboard')
          return
        }
      }

      router.push('/mechanic/login')
    } catch (error) {
      console.error('Mechanic login check error:', error)
      router.push('/mechanic/login')
    }
  }

  const handleWorkshopLogin = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const role = await determineUserRole(session.user.id)
        if (role === 'workshop') {
          router.push('/workshop/dashboard')
          return
        }
      }

      router.push('/workshop/login')
    } catch (error) {
      console.error('Workshop login check error:', error)
      router.push('/workshop/login')
    }
  }

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

          {/* Smart Log In button - checks session and redirects appropriately */}
          <button
            onClick={handleCustomerLogin}
            className="group relative px-4 py-2 rounded-lg text-sm font-medium transition-all text-slate-300 hover:text-white hover:bg-white/5"
          >
            Log In
          </button>
        </nav>

        <div className="ml-auto md:ml-0 flex items-center gap-3 md:gap-4">

          {/* Provider Links - Modern Cards with smart session checking */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={handleMechanicLogin}
              className="group relative flex items-center gap-2 rounded-lg border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5 px-3 py-2 text-xs font-semibold text-orange-400 transition-all hover:border-orange-400/50 hover:bg-orange-500/20 hover:shadow-lg hover:shadow-orange-500/20"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>For Mechanics</span>
            </button>
            <button
              onClick={handleWorkshopLogin}
              className="group relative flex items-center gap-2 rounded-lg border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 px-3 py-2 text-xs font-semibold text-blue-400 transition-all hover:border-blue-400/50 hover:bg-blue-500/20 hover:shadow-lg hover:shadow-blue-500/20"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>For Workshops</span>
            </button>
          </div>

          {/* Mobile Menu */}
          <MobileMenu
            pathname={pathname}
            onCustomerLogin={handleCustomerLogin}
            onMechanicLogin={handleMechanicLogin}
            onWorkshopLogin={handleWorkshopLogin}
          />
        </div>
      </div>
    </header>
  )
}

/**
 * Mobile Menu Component - Smart menu with session checking
 */
function MobileMenu({
  pathname,
  onCustomerLogin,
  onMechanicLogin,
  onWorkshopLogin
}: {
  pathname: string
  onCustomerLogin: () => void
  onMechanicLogin: () => void
  onWorkshopLogin: () => void
}) {
  const [open, setOpen] = useState(false)

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

          {/* Smart Log In button with session checking */}
          <div className="mb-3">
            <DropdownMenu.Item asChild>
              <button
                onClick={() => {
                  setOpen(false)
                  onCustomerLogin()
                }}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-200 bg-white/5 border border-white/10 transition-all hover:bg-white/10 hover:text-white hover:border-orange-400/50 focus:outline-none w-full"
              >
                Log In
              </button>
            </DropdownMenu.Item>
          </div>

          <DropdownMenu.Separator className="my-3 h-px bg-white/10" />

          {/* Provider Links with smart session checking */}
          <div className="space-y-2">
            <DropdownMenu.Item asChild>
              <button
                onClick={() => {
                  setOpen(false)
                  onMechanicLogin()
                }}
                className="flex items-center gap-3 rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5 px-4 py-3 text-sm font-semibold text-orange-400 transition-all hover:border-orange-400/50 hover:from-orange-500/20 hover:to-orange-600/10 focus:outline-none w-full"
              >
                <Wrench className="h-4 w-4" />
                For Mechanics
              </button>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <button
                onClick={() => {
                  setOpen(false)
                  onWorkshopLogin()
                }}
                className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 px-4 py-3 text-sm font-semibold text-blue-400 transition-all hover:border-blue-400/50 hover:from-blue-500/20 hover:to-blue-600/10 focus:outline-none w-full"
              >
                <Building2 className="h-4 w-4" />
                For Workshops
              </button>
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
