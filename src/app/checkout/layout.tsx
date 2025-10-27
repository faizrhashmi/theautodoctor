import CustomerNavbar from '@/components/customer/CustomerNavbar'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CustomerNavbar />
      {children}
    </>
  )
}
