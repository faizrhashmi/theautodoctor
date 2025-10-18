import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Ask Auto Doctor – Expert Mechanics On Demand',
  description: 'Instant video consultations with certified mechanics. Diagnose issues, get repair advice, and pre-purchase inspections from anywhere.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
          <nav className="container h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-extrabold text-lg">
              <img
                src="/favicon.ico"
                alt="AskAutoDoctor Logo"
                className="h-8 w-8 rounded-md"
              />
              <span className="text-gray-900 hover:text-blue-600 transition-colors">
                AskAutoDoctor
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
              <Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
              <Link href="/book" className="hover:text-blue-600 transition-colors">Book</Link>
              <Link
                href="/book"
                className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Book Now
              </Link>
            </div>
          </nav>
        </header>

        <main>{children}</main>

        {/* Footer */}
        <footer className="border-t border-gray-100 py-10 mt-20">
          <div className="container text-sm text-gray-500 flex flex-col md:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} Ask Auto Doctor. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/pricing" className="hover:text-gray-700">Pricing</Link>
              <Link href="/book" className="hover:text-gray-700">Book a Consultation</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}