'use client'

import { useMemo } from 'react'
import { Lightbulb } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import suggestions from '@/lib/suggestions.json'

interface SmartSuggestionsProps {
  recentMessages: string[]
  onInsert: (text: string) => void
}

export default function SmartSuggestions({ recentMessages, onInsert }: SmartSuggestionsProps) {
  const activeSuggestions = useMemo(() => {
    if (recentMessages.length === 0) return []

    // Combine recent messages into searchable text
    const searchText = recentMessages
      .slice(-5) // Last 5 messages
      .join(' ')
      .toLowerCase()

    // Find matching patterns
    const matches: Array<{ text: string; label: string }> = []

    for (const pattern of suggestions.patterns) {
      const hasMatch = pattern.keywords.some(keyword =>
        searchText.includes(keyword.toLowerCase())
      )

      if (hasMatch) {
        matches.push(...pattern.suggestions)
      }

      // Limit to 2 suggestions max
      if (matches.length >= 2) break
    }

    return matches.slice(0, 2)
  }, [recentMessages])

  if (activeSuggestions.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-start gap-2 mb-3"
      >
        <Lightbulb className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-1" />
        <div className="flex-1 space-y-2">
          <p className="text-xs font-medium text-slate-400">Smart Suggestions</p>
          <div className="flex flex-wrap gap-2">
            {activeSuggestions.map((suggestion, index) => (
              <motion.button
                key={index}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onInsert(suggestion.text)}
                className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-200 hover:bg-yellow-500/20 hover:border-yellow-400/50 transition"
              >
                {suggestion.label}
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
