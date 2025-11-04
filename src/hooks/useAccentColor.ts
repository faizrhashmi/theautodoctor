'use client'

import { useMemo } from 'react'

export function useAccentColor() {
  return useMemo(() => {
    // Read CSS variables from document
    const primary = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-primary')
      .trim() || '#f97316'

    const secondary = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-secondary')
      .trim() || '#fb923c'

    return {
      primary,
      secondary,

      // Style objects for common use cases
      textPrimary: { color: primary },
      textSecondary: { color: secondary },

      bgPrimary: { backgroundColor: primary },
      bgSecondary: { backgroundColor: secondary },

      borderPrimary: { borderColor: primary },
      borderSecondary: { borderColor: secondary },

      gradient: {
        backgroundImage: `linear-gradient(to right, ${primary}, ${secondary})`
      },

      // Tailwind-like utilities
      classes: {
        text: 'accent-text',
        textSecondary: 'accent-text-secondary',
        bg: 'accent-bg',
        bgSecondary: 'accent-bg-secondary',
        border: 'accent-border',
        gradient: 'accent-gradient',
        shadow: 'accent-shadow',
      }
    }
  }, [])
}
