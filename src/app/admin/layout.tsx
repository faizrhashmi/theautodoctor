// src/app/admin/layout.tsx
import type { Metadata } from 'next'
import { LogoutButton } from '@/components/admin/LogoutButton'
import { AuthCheck } from '@/components/admin/AuthCheck'

export const metadata: Metadata = {
  title: 'Admin - AskAutoDoctor',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* ClientNavbar will be shown at the top (handled by root layout) */}
      {/* No duplicate header needed */}
      {children}
    </div>
  )
}
