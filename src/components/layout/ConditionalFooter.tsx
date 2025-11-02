'use client'

import { usePathname } from 'next/navigation'
import SiteFooter from './SiteFooter'

export default function ConditionalFooter() {
  const pathname = usePathname()

  // Special handling for workshop pages
  const isWorkshopLogin = pathname === '/workshop/login'

  // Show footer only on public marketing pages
  // Hide on authenticated dashboards, chat, video, and customer flow pages
  const showFooter =
    !pathname?.startsWith('/customer') &&
    !pathname?.startsWith('/mechanic') &&
    !pathname?.startsWith('/admin') &&
    // Workshop: Only show on login page, hide on signup and dashboard
    (!pathname?.startsWith('/workshop') || isWorkshopLogin) &&
    // Customer flow pages - hide footer
    !pathname?.startsWith('/intake') &&
    !pathname?.startsWith('/checkout') &&
    !pathname?.startsWith('/thank-you') &&
    !pathname?.startsWith('/diagnostic') &&
    !pathname?.startsWith('/waiver') &&
    // Session pages (video, chat, etc.) - hide footer for immersive experience
    !pathname?.startsWith('/video') &&
    !pathname?.startsWith('/chat') &&
    !pathname?.startsWith('/session')

  // Only render footer on public pages
  if (!showFooter) {
    return null
  }

  return <SiteFooter />
}
