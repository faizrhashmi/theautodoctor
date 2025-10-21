'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type NavLink = { name: string; href: string; highlight?: boolean }

const NAV_LINKS: NavLink[] = [
  { name: 'Home', href: '/' },
  { name: 'How It Works', href: '/how-it-works' },
  { name: 'Services & Pricing', href: '/pricing' },
  { name: 'Join as a Mechanic', href: '/mechanic/signup', highlight: true },
]

export default function MainNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    async function checkActiveSession() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setHasActiveSession(false)
          setIsLoading(false)
          return
        }

        // Check if user has any active sessions
        const { data: sessionParticipants, error: sessionError } = await supabase
          .from('session_participants')
          .select(`
            session_id,
            sessions (
              id,
              status
            )
          `)
          .eq('user_id', user.id)
          .eq('role', 'customer')

        if (sessionError) {
          console.error('Error fetching session participants:', sessionError)
          setHasActiveSession(false)
          setIsLoading(false)
          return
        }

        console.log('Session participants:', sessionParticipants)

        const activeSessions = (sessionParticipants ?? [])
          .map((row: any) => row.sessions)
          .filter((session: any) => {
            console.log('Session:', session)
            return session && !['completed', 'cancelled'].includes(session.status?.toLowerCase() ?? '')
          })

        console.log('Active sessions found:', activeSessions.length)
        setHasActiveSession(activeSessions.length > 0)
      } catch (error) {
        console.error('Error checking active sessions:', error)
        setHasActiveSession(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkActiveSession()
  }, [])

  return (
    <nav className={`sticky top-0 z-30 transition-all duration-200 ${
        scrolled 
          ? 'bg-white/95 shadow-md backdrop-blur border-b border-gray-200/50' 
          : 'bg-transparent'
      }`}>
      <div className="mx-auto flex h-20 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <Image src="/logo.svg" alt="AskAutoDoctor" width={44} height={44} priority className="transition-transform duration-200 group-hover:scale-110" />
          <span className={`text-xl font-bold transition-colors duration-200 ${
            scrolled 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent' 
              : 'text-gray-900'
          }`}>
            AskAutoDoctor
          </span>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                link.highlight
                  ? 'inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5'
                  : 'group relative text-sm font-medium text-gray-600 transition-colors duration-200 hover:text-gray-900'
              }
            >
              {link.name}
              {!link.highlight && (
                <span className="pointer-events-none absolute inset-x-0 -bottom-1 h-0.5 scale-x-0 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-transform duration-300 ease-out group-hover:scale-x-100" />
              )}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 md:gap-4">
          <Link
            href="/customer/login"
            className="hidden text-sm font-medium text-gray-600 transition-colors duration-200 hover:text-gray-900 md:inline-flex"
          >
            Sign In
          </Link>
          {!isLoading && !hasActiveSession && (
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5"
            >
              Book Now
            </Link>
          )}
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
        <div className="border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur md:hidden">
          <div className="space-y-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={
                  link.highlight
                    ? 'block rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-orange-500/25'
                    : 'block rounded-xl px-4 py-3 text-sm font-medium text-gray-600 transition-colors duration-200 hover:bg-gray-50 hover:text-gray-900'
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
              className="inline-flex items-center justify-center rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors duration-200 hover:border-gray-300 hover:text-gray-900"
            >
              Sign In
            </Link>
            {!isLoading && !hasActiveSession && (
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-orange-500/25"
              >
                Book Now
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
