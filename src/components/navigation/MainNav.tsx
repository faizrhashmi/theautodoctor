'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Wrench } from 'lucide-react'

type NavLink = { name: string; href: string; highlight?: boolean }

const NAV_LINKS: NavLink[] = [
  { name: 'Home', href: '/' },
  { name: 'How It Works', href: '/how-it-works' },
  { name: 'Services & Pricing', href: '/pricing' },
  { name: 'Join as a Mechanic', href: '/mechanic/signup', highlight: true },
]

export default function MainNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-100 transition hover:text-white">
          <div className="rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-2 text-white shadow-lg">
            <Wrench className="h-5 w-5" />
          </div>
          <span>AskAutoDoctor</span>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                link.highlight
                  ? 'inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-blue-400 hover:via-indigo-400 hover:to-purple-400'
                  : 'group relative text-sm font-medium text-slate-300 transition hover:text-white'
              }
            >
              {link.name}
              {!link.highlight && (
                <span className="pointer-events-none absolute inset-x-0 -bottom-1 h-px scale-x-0 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 transition-transform duration-300 ease-out group-hover:scale-x-100" />
              )}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 md:gap-4">
          <Link
            href="/customer/login"
            className="hidden text-sm font-medium text-slate-300 transition hover:text-white md:inline-flex"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/35"
          >
            Book Now
          </Link>
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-full bg-white/5 p-2 text-slate-200 transition hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-slate-950/95 px-4 py-4 backdrop-blur md:hidden">
          <div className="space-y-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={
                  link.highlight
                    ? 'block rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:from-blue-400 hover:via-indigo-400 hover:to-purple-400'
                    : 'block rounded-xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white'
                }
              >
                {link.name}
              </Link>
            ))}
          </div>
          <div className="mt-3 grid gap-2">
            <Link
              href="/customer/login"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/35 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center justify-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Book Now
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
