'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

interface NavSection {
  id: string
  label: string
}

const NAV_SECTIONS: NavSection[] = [
  { id: 'core-operations', label: 'Core Operations' },
  { id: 'user-management', label: 'User Management' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'system-tools', label: 'System Tools' },
  { id: 'emergency-tools', label: 'Emergency' },
  { id: 'platform-overview', label: 'Overview' },
]

export default function QuickNav() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('core-operations')
  const [isScrolling, setIsScrolling] = useState(false)

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      setIsScrolling(true)
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(sectionId)

      // Reset scrolling flag after animation
      setTimeout(() => setIsScrolling(false), 1000)
    }
  }

  // Track active section on scroll
  useEffect(() => {
    if (isScrolling) return // Don't update during programmatic scroll

    const handleScroll = () => {
      const sections = NAV_SECTIONS.map(nav => document.getElementById(nav.id))
      const scrollPosition = window.scrollY + 200 // Offset for better UX

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i]
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(NAV_SECTIONS[i].id)
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isScrolling])

  // Handle signout
  const handleSignOut = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
    } catch (error) {
      console.error('Signout error:', error)
    }
  }

  return (
    <div className="sticky top-16 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop: Pill Navigation */}
        <div className="hidden md:flex items-center justify-between py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {NAV_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200
                  ${
                    activeSection === section.id
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700'
                  }
                `}
              >
                {section.label}
              </button>
            ))}
          </div>

          {/* Desktop Signout */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/30 transition-all whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

        {/* Mobile: Select Dropdown + Signout */}
        <div className="md:hidden flex items-center gap-2 py-3">
          <select
            value={activeSection}
            onChange={(e) => scrollToSection(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {NAV_SECTIONS.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </select>

          {/* Mobile Signout */}
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center p-2 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/30 transition-all"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
