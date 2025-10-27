import { ReactNode } from 'react'
import CustomerNavbar from '@/components/customer/CustomerNavbar'

/**
 * CustomerFlowLayout - Wraps customer flow pages with CustomerNavbar
 * Used for: intake, checkout, thank-you, diagnostic, waiver pages
 */
export default function CustomerFlowLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CustomerNavbar />
      <main>{children}</main>
    </>
  )
}
