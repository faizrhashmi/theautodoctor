import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

/*
 * Site metadata
 *
 * Define the default title and description for the site.  These values will
 * populate the `<title>` tag and meta description automatically when the
 * application is built with Next.js.
 */
export const metadata: Metadata = {
  title: 'AutoDoctor - Expert Auto Mechanics On Demand',
  description:
    'Get instant video consultations with certified mechanics. Diagnose issues, get repair advice, and pre‑purchase inspections from anywhere.',
}

/*
 * Root layout component
 *
 * Wraps all pages with common elements like the navigation bar at the top
 * and the footer at the bottom.  The `children` prop represents the
 * content of each page.  Using flexbox ensures the footer stays at the
 * bottom on short pages.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow pt-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}

/*
 * Navigation bar
 *
 * Provides links to the main pages of the site and a prominent call‑to‑action
 * button.  The bar is sticky and slightly translucent, giving the site a
 * modern feel while staying out of the way of content.
 */
function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="container flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">AD</span>
          </div>
          <span className="text-xl font-bold text-gray-900">AutoDoctor</span>
        </div>
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-gray-600 hover:text-gray-900 font-medium">
            Home
          </Link>
          <Link href="/pricing" className="text-gray-600 hover:text-gray-900 font-medium">
            Pricing
          </Link>
          <Link href="/book" className="btn-primary">
            Book Now
          </Link>
        </div>
      </div>
    </nav>
  )
}

/*
 * Footer component
 *
 * Displays the site’s logo, copyright, tagline and a contact link.  The
 * footer uses a dark background to clearly separate it from the page content.
 */
function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 mt-auto">
      <div className="container text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">AD</span>
          </div>
          <h3 className="text-xl font-bold">AutoDoctor</h3>
        </div>
        <p>&copy; {new Date().getFullYear()} AutoDoctor. All rights reserved.</p>
        <p className="text-gray-400 mt-2">Professional auto consultations made simple</p>
        <div className="mt-4 text-gray-400">
          <p>
            Contact: <a href="mailto:support@askautodoctor.com" className="hover:text-white">support@askautodoctor.com</a>
          </p>
        </div>
      </div>
    </footer>
  )
}