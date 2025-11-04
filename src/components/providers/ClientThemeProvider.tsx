'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const ACCENT_COLOR_MAP: Record<string, { primary: string; secondary: string }> = {
  orange: { primary: '#f97316', secondary: '#fb923c' },
  blue: { primary: '#3b82f6', secondary: '#60a5fa' },
  green: { primary: '#10b981', secondary: '#34d399' },
  red: { primary: '#ef4444', secondary: '#f87171' },
  purple: { primary: '#a855f7', secondary: '#c084fc' },
}

interface AccentColorContextType {
  primary: string
  secondary: string
  colorName: string
  setAccentColor: (colorName: string) => void
}

const AccentColorContext = createContext<AccentColorContextType>({
  primary: '#f97316',
  secondary: '#fb923c',
  colorName: 'orange',
  setAccentColor: () => {},
})

export function useAccentColor() {
  return useContext(AccentColorContext)
}

export function ClientThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorName, setColorName] = useState('orange')

  useEffect(() => {
    async function loadAccentColor() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          return
        }

        // Check if user is a customer
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.role !== 'customer') {
          return
        }

        // Fetch customer preferences
        const response = await fetch('/api/customer/preferences')
        if (response.ok) {
          const data = await response.json()
          const accentColor = data.preferences?.accent_color || 'orange'
          applyAccentColor(accentColor)
        }
      } catch (error) {
        console.error('[ClientThemeProvider] Failed to load accent color:', error)
      }
    }

    loadAccentColor()
  }, [])

  const applyAccentColor = (newColorName: string) => {
    const colors = ACCENT_COLOR_MAP[newColorName]
    if (colors) {
      document.documentElement.style.setProperty('--accent-primary', colors.primary)
      document.documentElement.style.setProperty('--accent-secondary', colors.secondary)
      setColorName(newColorName)
    }
  }

  const colors = ACCENT_COLOR_MAP[colorName]

  const contextValue: AccentColorContextType = {
    primary: colors.primary,
    secondary: colors.secondary,
    colorName,
    setAccentColor: applyAccentColor,
  }

  return (
    <AccentColorContext.Provider value={contextValue}>
      {children}
    </AccentColorContext.Provider>
  )
}
