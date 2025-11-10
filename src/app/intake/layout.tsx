'use client'

// src/app/intake/layout.tsx
// This is a client component - caching is handled by parent layouts
import CustomerNavbar from '@/components/customer/CustomerNavbar'

export default function IntakeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CustomerNavbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12 sm:px-8">
        {children}
      </div>
    </>
  );
}
