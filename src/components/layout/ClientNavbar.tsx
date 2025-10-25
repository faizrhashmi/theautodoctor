'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Home, DollarSign, BookOpen, Mail, Wrench, Menu, X, LayoutDashboard } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { createClient } from '@/lib/supabase'

const NAV_ITEMS = [
  { label: 'How It Works', href: '/how-it-works', icon: Home },
  { label: 'Services & Pricing', href: '/pricing', icon: DollarSign },
  { label: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen },
  { label: 'Contact', href: '/contact', icon: Mail },
]

export default function ClientNavbar() {
  const pathname = usePathname()
  const isHomepage = pathname === '/'
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const renderCTA = () => {
    // Hide CTA on homepage (hero has prominent CTAs already)
    if (isHomepage) return null

    if (loading) {
      return (
        <div className="h-10 w-32 animate-pulse rounded-full bg-white/10" />
      )
    }

    if (user) {
      // User is logged in - show Dashboard
      return (
        <Link
          href="/customer/dashboard"
          className="group ml-2 md:ml-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-orange-600 hover:to-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
      )
    }

    // User not logged in - show Get Started Free
    return (
      <Link
        href="/signup"
        className="group ml-2 md:ml-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-orange-600 hover:to-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
      >
        Get Started Free
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </Link>
    )
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/logo.svg"
            alt="AskAutoDoctor"
            width={36}
            height={36}
            priority
            className="transition-transform group-hover:scale-110"
          />
          <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
            AskAutoDoctor
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex flex-1 items-center justify-end gap-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative text-sm font-medium text-slate-300 transition hover:text-white"
            >
              {item.label}
              <span className="pointer-events-none absolute inset-x-0 -bottom-1 h-px scale-x-0 bg-gradient-to-r from-orange-400 via-red-500 to-indigo-500 transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 md:gap-4">
          {/* Login link for existing customers - hide if logged in */}
          {!user && (
            <Link
              href="/signup?mode=login"
              className="hidden text-sm font-medium text-slate-300 transition hover:text-white md:block"
            >
              Log In
            </Link>
          )}

          {/* Context-aware CTA - hidden on homepage */}
          {renderCTA()}

          {/* For Mechanics - Visually distinct from customer nav */}
          <Link
            href="/mechanic/login"
            className="hidden rounded-lg border border-orange-400/30 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-300 transition hover:border-orange-400/50 hover:bg-orange-500/20 md:block"
          >
            🔧 For Mechanics
          </Link>

          {/* Mobile Menu */}
          <MobileMenu user={user} loading={loading} />
        </div>
      </div>
    </header>
  )
}

/**
 * Improved Mobile Menu using Radix UI Dropdown
 * - Triggers only on hamburger icon click
 * - Auto-closes on scroll
 * - Slides in from the right side
 * - Non-persistent (closes on navigation/scroll)
 */
function MobileMenu({ user, loading }: { user: any; loading: boolean }) {
  const [open, setOpen] = useState(false)

  // Auto-close menu when user scrolls
  useEffect(() => {
    if (!open) return

    const handleScroll = () => {
      setOpen(false)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [open])

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className="md:hidden flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-slate-200 ring-1 ring-inset ring-white/10 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
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
          className="z-50 w-72 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-right-2 duration-200"
        >
          {/* Navigation Items */}
          {NAV_ITEMS.map((item) => (
            <DropdownMenu.Item key={item.href} asChild>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white focus:outline-none focus:bg-white/5"
              >
                <item.icon className="h-4 w-4 text-slate-400" />
                {item.label}
              </Link>
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="my-2 h-px bg-white/10" />

          {/* User State Aware Items */}
          {loading ? (
            <div className="px-4 py-3">
              <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
            </div>
          ) : user ? (
            <>
              {/* Dashboard for logged-in users */}
              <DropdownMenu.Item asChild>
                <Link
                  href="/customer/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white focus:outline-none focus:bg-white/5"
                >
                  <LayoutDashboard className="h-4 w-4 text-slate-400" />
                  Dashboard
                </Link>
              </DropdownMenu.Item>
            </>
          ) : (
            <>
              {/* Login for logged-out users */}
              <DropdownMenu.Item asChild>
                <Link
                  href="/signup?mode=login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white focus:outline-none focus:bg-white/5"
                >
                  Log In
                </Link>
              </DropdownMenu.Item>
            </>
          )}

          <DropdownMenu.Separator className="my-2 h-px bg-white/10" />

          {/* For Mechanics - Always visible */}
          <DropdownMenu.Item asChild>
            <Link
              href="/mechanic/login"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-300 transition hover:border-orange-400/50 hover:bg-orange-500/20 focus:outline-none"
            >
              <Wrench className="h-4 w-4" />
              For Mechanics
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
