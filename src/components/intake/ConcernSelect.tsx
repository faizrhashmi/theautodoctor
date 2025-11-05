'use client'

import { useState, useMemo } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { CONCERN_CATEGORIES } from '@/lib/concernCategories'
import type { SubCategory } from '@/lib/concernCategories'

interface ConcernOption {
  value: string
  label: string
  category: string
  description?: string
}

interface ConcernSelectProps {
  value: string
  onChange: (value: string, label: string) => void
  error?: string
}

// Flatten all subcategories into selectable options
function getConcernOptions(): ConcernOption[] {
  const options: ConcernOption[] = []

  CONCERN_CATEGORIES.forEach((category) => {
    if (category.subCategories && category.subCategories.length > 0) {
      category.subCategories.forEach((sub) => {
        options.push({
          value: sub.slug,
          label: sub.name,
          category: category.name,
        })
      })
    } else {
      // Category without subcategories
      options.push({
        value: category.slug,
        label: category.name,
        category: category.name,
      })
    }
  })

  return options
}

export function ConcernSelect({ value, onChange, error }: ConcernSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const allOptions = useMemo(() => getConcernOptions(), [])

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return allOptions

    const query = searchQuery.toLowerCase()
    return allOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.category.toLowerCase().includes(query)
    )
  }, [allOptions, searchQuery])

  const selectedOption = allOptions.find((opt) => opt.value === value)

  function handleSelect(option: ConcernOption) {
    onChange(option.value, option.label)
    setIsOpen(false)
    setSearchQuery('')
  }

  function handleKeyDown(e: React.KeyboardEvent, option?: ConcernOption) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (option) {
        handleSelect(option)
      } else {
        setIsOpen(!isOpen)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => handleKeyDown(e)}
        className={`
          w-full min-h-[44px] px-4 py-3
          bg-slate-900/50 border rounded-2xl
          text-left text-base
          flex items-center justify-between gap-3
          transition-all
          focus:outline-none focus:ring-2 focus:ring-indigo-500
          ${error ? 'border-red-500' : 'border-slate-700'}
          ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500' : ''}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Primary concern selector"
      >
        <span className={selectedOption ? 'text-slate-100' : 'text-slate-400'}>
          {selectedOption ? selectedOption.label : 'Select your main concern'}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false)
              setSearchQuery('')
            }}
          />

          {/* Options Panel */}
          <div className="absolute z-20 mt-2 w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[400px] overflow-hidden">
            {/* Search Input */}
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search concerns..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Options List */}
            <div className="overflow-y-auto max-h-[320px]" role="listbox">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-400 text-sm">
                  No concerns found matching "{searchQuery}"
                </div>
              ) : (
                <>
                  {(() => {
                    let lastCategory = ''
                    return filteredOptions.map((option) => {
                      const showCategoryHeader = option.category !== lastCategory
                      lastCategory = option.category

                      return (
                        <div key={option.value}>
                          {showCategoryHeader && (
                            <div className="px-4 py-2 bg-slate-800/50 text-xs font-semibold text-slate-400 uppercase tracking-wider sticky top-0">
                              {option.category}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSelect(option)}
                            onKeyDown={(e) => handleKeyDown(e, option)}
                            className={`
                              w-full px-4 py-3 text-left text-base
                              flex items-center justify-between gap-3
                              transition-colors
                              hover:bg-slate-800
                              focus:outline-none focus:bg-slate-800
                              ${value === option.value ? 'bg-indigo-500/10' : ''}
                            `}
                            role="option"
                            aria-selected={value === option.value}
                          >
                            <span className="text-slate-100">{option.label}</span>
                            {value === option.value && (
                              <Check className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                            )}
                          </button>
                        </div>
                      )
                    })
                  })()}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
