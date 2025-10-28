// @ts-nocheck
// src/app/admin/layout.tsx
import type { Metadata } from 'next'
import { AdminActivityTimeout } from '@/components/admin/AdminActivityTimeout'

export const metadata: Metadata = {
  title: 'Admin - AskAutoDoctor',
}

export default function AdminShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ✅ Activity-based session timeout for admin users */}
      <AdminActivityTimeout />

      {/* Page content with minimal top padding for fixed navbar */}
      <main className="mx-auto max-w-7xl px-4 pt-20 pb-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </>
  )
}
