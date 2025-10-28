'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Calendar, FileText, Car, MessageSquare, User, Clock, LogOut } from 'lucide-react'
import { createClient, clearBrowserClient } from '@/lib/supabase'
import Logo from '@/components/branding/Logo'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/customer/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Sessions',
    href: '/customer/sessions',
    icon: Clock,
  },
  {
    label: 'Quotes',
    href: '/customer/quotes',
    icon: FileText,
  },
  {
    label: 'Vehicles',
    href: '/customer/vehicles',
    icon: Car,
  },
  {
    label: 'Schedule',
    href: '/customer/schedule',
    icon: Calendar,
  },
  {
    label: 'Profile',
    href: '/customer/profile',
    icon: User,
  },
]

export default function CustomerNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    try {
      console.log('[CustomerNavbar] Starting sign out...');

      // Step 1: Client-side cleanup FIRST - this immediately updates auth state
      console.log('[CustomerNavbar] Clearing client-side session...');
      await supabase.auth.signOut();

      // This triggers SIGNED_OUT event which all listeners will hear
      // Give it a moment to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      // Set a flag BEFORE clearing storage to communicate logout to next page
      sessionStorage.setItem('logout-pending', 'true');

      localStorage.clear();

      // Don't clear sessionStorage yet - we need the logout-pending flag to persist

      // Clear the singleton browser client so fresh client is created on next page load
      clearBrowserClient();
      console.log('[CustomerNavbar] Client-side cleanup complete');

      // Step 2: Clear server-side cookies
      console.log('[CustomerNavbar] Calling server logout API...');
      try {
        const response = await fetch('/api/customer/logout', {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          console.log('[CustomerNavbar] Server-side cookies cleared');
        } else {
          console.warn('[CustomerNavbar] Logout API non-OK status:', response.status);
        }
      } catch (apiError) {
        console.error('[CustomerNavbar] Logout API error (continuing anyway):', apiError);
      }

      // Step 3: Give browser time to process cookie headers before navigation
      console.log('[CustomerNavbar] Waiting for cookie processing...');
      await new Promise(resolve => setTimeout(resolve, 200));

      // Step 4: Force a complete page reload with cache-busting to ensure fresh state
      console.log('[CustomerNavbar] Reloading page to clear all state...');
      // Add timestamp to prevent any browser caching
      window.location.href = '/?logout=' + Date.now();
    } catch (error) {
      console.error('[CustomerNavbar] Sign out error:', error);
      // Fail-safe: force cleanup and reload anyway
      try {
        sessionStorage.setItem('logout-pending', 'true');
        await supabase.auth.signOut();
        localStorage.clear();
        // Don't clear sessionStorage - need logout-pending flag
        clearBrowserClient();
      } catch (e) {
        console.error('[CustomerNavbar] Cleanup error:', e);
      }
      window.location.href = '/?logout=' + Date.now();
    }
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Logo size="md" showText={true} href="/" variant="customer" />

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}

            {/* Sign Out Button - Desktop */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-red-500/10 hover:border hover:border-red-500/30 transition-all ml-2"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <Link
              href="/customer/profile"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <User className="h-5 w-5" />
            </Link>
            <button
              onClick={handleSignOut}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Links - Mobile */}
        <div className="md:hidden pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
