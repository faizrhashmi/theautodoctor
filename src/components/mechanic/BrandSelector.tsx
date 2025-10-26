'use client'

/**
 * Brand Selector Component
 * Multi-select component for mechanics to choose their brand specializations
 */

import { useEffect, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'

interface Brand {
  id: string
  brand_name: string
  is_luxury: boolean
  requires_certification: boolean
}

interface BrandSelectorProps {
  value: string[] // Array of selected brand names
  onChange: (brands: string[]) => void
  label?: string
  description?: string
  error?: string
  disabled?: boolean
  className?: string
}

export function BrandSelector({
  value = [],
  onChange,
  label = 'Brand Specializations',
  description = 'Select the vehicle brands you specialize in',
  error,
  disabled = false,
  className = ''
}: BrandSelectorProps) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Fetch available brands
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch('/api/brands')
        if (response.ok) {
          const data = await response.json()
          setBrands(data)
        }
      } catch (err) {
        console.error('Failed to fetch brands:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBrands()
  }, [])

  // Filter brands based on search
  const filteredBrands = brands.filter(brand =>
    brand.brand_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Group brands by luxury status
  const luxuryBrands = filteredBrands.filter(b => b.is_luxury)
  const standardBrands = filteredBrands.filter(b => !b.is_luxury)

  const toggleBrand = (brandName: string) => {
    if (disabled) return

    if (value.includes(brandName)) {
      onChange(value.filter(b => b !== brandName))
    } else {
      onChange([...value, brandName])
    }
  }

  const removeAllBrands = () => {
    if (disabled) return
    onChange([])
  }

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

      {/* Selected Brands Display */}
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
              Select brands...
            </span>
          ) : (
            value.map(brandName => (
              <span
                key={brandName}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-md"
              >
                {brandName}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleBrand(brandName)
                  }}
                  className="hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded"
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
          <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 rounded-lg border-2 border-blue-500 shadow-xl max-h-96 overflow-hidden flex flex-col">
            {/* Search Box */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search brands..."
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <button
                onClick={removeAllBrands}
                className="text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Clear All
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {value.length} selected
              </span>
            </div>

            {/* Brands List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 text-center text-slate-500">
                  Loading brands...
                </div>
              ) : filteredBrands.length === 0 ? (
                <div className="p-4 text-center text-slate-500">
                  No brands found
                </div>
              ) : (
                <>
                  {/* Luxury Brands */}
                  {luxuryBrands.length > 0 && (
                    <div className="p-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2">
                        LUXURY BRANDS
                      </p>
                      {luxuryBrands.map(brand => (
                        <BrandOption
                          key={brand.id}
                          brand={brand}
                          isSelected={value.includes(brand.brand_name)}
                          onToggle={() => toggleBrand(brand.brand_name)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Standard Brands */}
                  {standardBrands.length > 0 && (
                    <div className="p-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2">
                        STANDARD BRANDS
                      </p>
                      {standardBrands.map(brand => (
                        <BrandOption
                          key={brand.id}
                          brand={brand}
                          isSelected={value.includes(brand.brand_name)}
                          onToggle={() => toggleBrand(brand.brand_name)}
                        />
                      ))}
                    </div>
                  )}
                </>
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
 * Individual Brand Option Component
 */
function BrandOption({
  brand,
  isSelected,
  onToggle
}: {
  brand: Brand
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`
        w-full px-3 py-2 rounded-md text-left
        flex items-center justify-between
        transition-colors
        ${isSelected
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
        }
      `}
    >
      <span className="flex items-center gap-2">
        <span className="font-medium">{brand.brand_name}</span>
        {brand.requires_certification && (
          <span className="text-xs px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
            Cert Required
          </span>
        )}
      </span>

      {isSelected && (
        <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      )}
    </button>
  )
}
