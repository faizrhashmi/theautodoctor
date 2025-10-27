// @ts-nocheck
// src/app/admin/layout.tsx
import type { Metadata } from 'next'
import { LogoutButton } from '@/components/admin/LogoutButton'

export const metadata: Metadata = {
  title: 'Admin - AskAutoDoctor',
}

export default function AdminShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin top bar - Conditionally rendered based on route */}
      <AdminHeader />

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

// Separate client component for the header to handle auth state
function AdminHeader() {
  // For now, we'll use a simple approach - you can enhance this later
  const isAuthenticated =
    typeof window !== 'undefined'
      ? !!localStorage.getItem('supabase.auth.token')
      : false

  // Don't show header on login page
  const isLoginPage =
    typeof window !== 'undefined'
      ? window.location.pathname === '/admin/login'
      : false

  if (isLoginPage || !isAuthenticated) {
    return null
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <a href="/admin" className="flex items-center gap-3 hover:opacity-80 transition">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 font-bold text-white shadow-sm">
              A
            </span>
            <span className="text-sm font-semibold text-slate-900">Admin Panel</span>
          </a>
          <nav className="hidden lg:flex items-center gap-1">
            <NavLink href="/admin" label="Dashboard" />
            <div className="h-4 w-px bg-slate-300 mx-1"></div>
            <NavLink href="/admin/intakes" label="Intakes" />
            <NavLink href="/admin/sessions" label="Sessions" />
            <NavLink href="/admin/claims" label="Claims" badge="NEW" />
            <div className="h-4 w-px bg-slate-300 mx-1"></div>
            <NavLink href="/admin/customers" label="Users" />
            <NavLink href="/admin/mechanics" label="Mechanics" />
            <NavLink href="/admin/workshops" label="Workshops" />
            <div className="h-4 w-px bg-slate-300 mx-1"></div>
            <NavLink href="/admin/analytics/overview" label="Analytics" />
            <NavLink href="/admin/logs" label="Logs" />
            <NavLink href="/admin/database" label="Tools" />
            <NavLink href="/admin/emergency" label="Emergency" badge="⚠️" />
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/admin/logout"
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </a>
        </div>
      </div>
    </header>
  )
}

function NavLink({ href, label, badge }: { href: string; label: string; badge?: string }) {
  return (
    <a
      href={href}
      className="relative px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
    >
      {label}
      {badge && (
        <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold px-1 rounded">
          {badge}
        </span>
      )}
    </a>
  )
}
