'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

export default function ConditionalMainWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Pages with their own navbar (or customer flow pages) don't need top padding
  const needsTopPadding =
    !pathname?.startsWith('/customer') &&
    !pathname?.startsWith('/mechanic') &&
    !pathname?.startsWith('/admin') &&
    // Customer flow pages
    !pathname?.startsWith('/intake') &&
    !pathname?.startsWith('/checkout') &&
    !pathname?.startsWith('/thank-you') &&
    !pathname?.startsWith('/diagnostic') &&
    !pathname?.startsWith('/waiver') &&
    // Session pages (video, chat, etc.)
    !pathname?.startsWith('/video') &&
    !pathname?.startsWith('/chat') &&
    !pathname?.startsWith('/session')

  return (
    <main className={needsTopPadding ? 'pt-16' : ''}>
      {children}
    </main>
  )
}
