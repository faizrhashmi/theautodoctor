// app/layout.tsx
import './globals.css'
import Link from 'next/link'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'AskAutoDoctor',
  description: 'Certified mechanics on demand — online diagnostics & inspections across Ontario.',
  icons: {
    icon: '/favicon.ico',                // ✅ Favicon
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',      // ✅ If you have it
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* ✅ Responsive Header */}
        <header className="bg-white border-b shadow-sm fixed w-full z-50">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-2 text-xl font-bold text-gray-900">
                <img src="/logo.svg" alt="Logo" className="h-6 w-6" />
                <span>AskAutoDoctor</span>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex space-x-6 items-center">
                <Link href="/" className="hover:text-blue-600">Home</Link>
                <Link href="/pricing" className="hover:text-blue-600">Pricing</Link>
                <Link href="/book" className="hover:text-blue-600">Book</Link>
                <Link href="/book">
                  <span className="ml-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                    🚗 Book Now
                  </span>
                </Link>
              </nav>

              {/* Mobile */}
              <div className="md:hidden">
                <MobileMenu />
              </div>
            </div>
          </div>
        </header>

        <main className="pt-16">{children}</main>
      </body>
    </html>
  )
}

function MobileMenu() {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none">
        <svg className="h-6 w-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </summary>
      <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-md py-2 z-50">
        <Link href="/" className="block px-4 py-2 hover:bg-gray-100">Home</Link>
        <Link href="/pricing" className="block px-4 py-2 hover:bg-gray-100">Pricing</Link>
        <Link href="/book" className="block px-4 py-2 hover:bg-gray-100">Book</Link>
        <Link href="/book" className="block px-4 py-2 text-blue-600 font-semibold hover:bg-blue-50">
          🚗 Book Now
        </Link>
      </div>
    </details>
  )
}
