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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 font-bold text-white">
              A
            </span>
            <span className="text-sm font-semibold text-slate-900">Admin Panel</span>
          </div>
          <nav className="flex items-center gap-4">
            <a
              href="/admin/intakes"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Intakes
            </a>
            <a
              href="/admin/sessions"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Sessions
            </a>
          </nav>
        </div>
        <LogoutButton />
      </div>
    </header>
  )
}
