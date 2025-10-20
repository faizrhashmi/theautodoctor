'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Wrench } from 'lucide-react'

type NavLink = { name: string; href: string; highlight?: boolean }

const NAV_LINKS: NavLink[] = [
  { name: 'Home', href: '/' },
  { name: 'How It Works', href: '/how-it-works' },
  { name: 'Services & Pricing', href: '/pricing' },
  { name: 'Join as a Mechanic', href: '/mechanic/signup' },
]

export default function MainNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-white shadow-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2 rounded-lg group-hover:from-blue-700 group-hover:to-blue-800 transition-all">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              Ask<span className="text-blue-600">AutoDoctor</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  link.highlight
                    ? 'bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg'
                    : 'text-gray-700 hover:text-blue-600 font-medium transition-colors relative group'
                }
              >
                {link.name}
                {!link.highlight && (
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300" />
                )}
              </Link>
            ))}
            <Link
              href="/customer/login"
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={
                  link.highlight
                    ? 'block bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold text-center transition-colors'
                    : 'block text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-4 py-3 rounded-lg font-medium transition-colors'
                }
              >
                {link.name}
              </Link>
            ))}
            <Link
              href="/customer/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-4 py-3 rounded-lg font-medium transition-colors text-center border border-gray-300"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
