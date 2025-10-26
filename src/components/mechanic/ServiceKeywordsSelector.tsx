'use client'

/**
 * Service Keywords Selector Component
 * Multi-select component for mechanics to choose their service expertise
 */

import { useEffect, useState } from 'react'
import { Check, ChevronDown, Search, X, Filter } from 'lucide-react'

interface ServiceKeyword {
  id: string
  keyword: string
  category: string
  complexity: string
  requires_specialist: boolean
}

interface ServiceKeywordsSelectorProps {
  value: string[] // Array of selected keywords
  onChange: (keywords: string[]) => void
  label?: string
  description?: string
  error?: string
  disabled?: boolean
  className?: string
  minSelection?: number
}

export function ServiceKeywordsSelector({
  value = [],
  onChange,
  label = 'Service Keywords',
  description = 'Select services you can perform (minimum 3 recommended)',
  error,
  disabled = false,
  className = '',
  minSelection = 3
}: ServiceKeywordsSelectorProps) {
  const [keywords, setKeywords] = useState<ServiceKeyword[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // Fetch available keywords
  useEffect(() => {
    const fetchKeywords = async () => {
      try {
        const response = await fetch('/api/service-keywords')
        if (response.ok) {
          const data = await response.json()
          setKeywords(data)
        }
      } catch (err) {
        console.error('Failed to fetch service keywords:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchKeywords()
  }, [])

  // Get unique categories
  const categories = [...new Set(keywords.map(k => k.category))]

  // Filter keywords
  const filteredKeywords = keywords.filter(keyword => {
    const matchesSearch = keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || keyword.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Group by category
  const keywordsByCategory = categories.reduce((acc, category) => {
    acc[category] = filteredKeywords.filter(k => k.category === category)
    return acc
  }, {} as Record<string, ServiceKeyword[]>)

  const toggleKeyword = (keywordText: string) => {
    if (disabled) return

    if (value.includes(keywordText)) {
      onChange(value.filter(k => k !== keywordText))
    } else {
      onChange([...value, keywordText])
    }
  }

  const removeAllKeywords = () => {
    if (disabled) return
    onChange([])
  }

  const isMinimumMet = value.length >= minSelection

  return (
    <div className={`relative ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}

      {/* Description */}
      {description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
          {description}
        </p>
      )}

      {/* Selected Keywords Display */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full min-h-[44px] px-4 py-2 rounded-lg border-2
          bg-white dark:bg-slate-800
          flex items-center justify-between gap-2
          cursor-pointer transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'}
          ${error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : ''}
        `}
      >
        <div className="flex-1 flex flex-wrap gap-2">
          {value.length === 0 ? (
            <span className="text-slate-500 dark:text-slate-400">
              Select services...
            </span>
          ) : (
            value.map(keyword => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded-md"
              >
                {keyword}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleKeyword(keyword)
                  }}
                  className="hover:bg-green-200 dark:hover:bg-green-800/50 rounded"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>

        <ChevronDown
          className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Selection Count Indicator */}
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className={value.length >= minSelection ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>
          {value.length} selected
          {value.length < minSelection && ` (${minSelection - value.length} more recommended)`}
        </span>
        {!isMinimumMet && (
          <span className="text-xs text-orange-600 dark:text-orange-400">
            Select at least {minSelection} keywords for better matching
          </span>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
          {error}
        </p>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 rounded-lg border-2 border-blue-500 shadow-xl max-h-[32rem] overflow-hidden flex flex-col">
            {/* Search & Filter Bar */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 space-y-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search services..."
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                <CategoryButton
                  label="All"
                  isActive={selectedCategory === 'all'}
                  onClick={() => setSelectedCategory('all')}
                />
                {categories.map(category => (
                  <CategoryButton
                    key={category}
                    label={category}
                    isActive={selectedCategory === category}
                    onClick={() => setSelectedCategory(category)}
                  />
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <button
                onClick={removeAllKeywords}
                className="text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Clear All
              </button>
              <span className={`text-sm ${isMinimumMet ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {value.length} / {minSelection} minimum
              </span>
            </div>

            {/* Keywords List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 text-center text-slate-500">
                  Loading service keywords...
                </div>
              ) : filteredKeywords.length === 0 ? (
                <div className="p-4 text-center text-slate-500">
                  No services found
                </div>
              ) : selectedCategory === 'all' ? (
                // Show grouped by category
                <div className="p-2">
                  {Object.entries(keywordsByCategory).map(([category, items]) => {
                    if (items.length === 0) return null
                    return (
                      <div key={category} className="mb-4">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2 uppercase">
                          {category}
                        </p>
                        {items.map(keyword => (
                          <KeywordOption
                            key={keyword.id}
                            keyword={keyword}
                            isSelected={value.includes(keyword.keyword)}
                            onToggle={() => toggleKeyword(keyword.keyword)}
                          />
                        ))}
                      </div>
                    )
                  })}
                </div>
              ) : (
                // Show filtered category
                <div className="p-2">
                  {filteredKeywords.map(keyword => (
                    <KeywordOption
                      key={keyword.id}
                      keyword={keyword}
                      isSelected={value.includes(keyword.keyword)}
                      onToggle={() => toggleKeyword(keyword.keyword)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="p-2 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Category Filter Button
 */
function CategoryButton({
  label,
  isActive,
  onClick
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors
        ${isActive
          ? 'bg-blue-600 text-white'
          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
        }
      `}
    >
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </button>
  )
}

/**
 * Individual Keyword Option
 */
function KeywordOption({
  keyword,
  isSelected,
  onToggle
}: {
  keyword: ServiceKeyword
  isSelected: boolean
  onToggle: () => void
}) {
  const complexityColor = {
    simple: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    complex: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  }[keyword.complexity] || 'bg-slate-100'

  return (
    <button
      onClick={onToggle}
      className={`
        w-full px-3 py-2 rounded-md text-left
        flex items-center justify-between
        transition-colors
        ${isSelected
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
        }
      `}
    >
      <span className="flex items-center gap-2">
        <span className="font-medium">{keyword.keyword}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${complexityColor}`}>
          {keyword.complexity}
        </span>
        {keyword.requires_specialist && (
          <span className="text-xs px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
            Specialist
          </span>
        )}
      </span>

      {isSelected && (
        <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
      )}
    </button>
  )
}
