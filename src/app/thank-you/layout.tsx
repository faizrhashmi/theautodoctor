import CustomerNavbar from '@/components/customer/CustomerNavbar'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function ThankYouLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CustomerNavbar />
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
        {children}
      </div>
    </>
  )
}
