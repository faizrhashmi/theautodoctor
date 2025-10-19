// src/app/admin/layout.tsx
import type { ReactNode } from 'react'

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  // No header here — keeps /admin/login clean
  return <>{children}</>
}
