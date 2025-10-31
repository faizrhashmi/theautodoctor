'use client'

import Select, { GroupBase, StylesConfig } from 'react-select'
import { getGroupedBrands, type VehicleBrand } from '@/lib/vehicleBrands'

interface SmartBrandSelectorProps {
  value: string
  onChange: (brand: string) => void
  label?: string
  className?: string
  required?: boolean
  error?: string
}

export default function SmartBrandSelector({
  value,
  onChange,
  label = 'Make',
  className = '',
  required = false,
  error
}: SmartBrandSelectorProps) {
  const groupedOptions = getGroupedBrands()

  // Find current selected option
  const selectedOption = groupedOptions
    .flatMap(group => group.options)
    .find(option => option.value === value) || null

  // Custom styles for react-select with dark theme and mobile optimization
  const customStyles: StylesConfig<VehicleBrand, false, GroupBase<VehicleBrand>> = {
    control: (base, state) => ({
      ...base,
      backgroundColor: 'rgba(15, 23, 42, 0.5)', // slate-900/50
      borderColor: error
        ? '#ef4444' // red-500 for error
        : state.isFocused
          ? '#6366f1' // indigo-500 when focused
          : '#475569', // slate-600 normal
      borderWidth: '1px',
      borderRadius: '1rem', // rounded-2xl
      minHeight: '44px', // Minimum tap target size for mobile
      padding: '0 8px',
      boxShadow: error
        ? '0 0 0 2px rgba(239, 68, 68, 0.2)' // red ring for error
        : state.isFocused
          ? '0 0 0 2px rgba(99, 102, 241, 0.5)' // indigo ring when focused
          : 'none',
      '&:hover': {
        borderColor: error ? '#dc2626' : '#6366f1' // red-600 : indigo-500
      },
      cursor: 'pointer',
      fontSize: '16px', // Prevent iOS zoom on focus
      transition: 'all 0.2s ease'
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: '#0f172a', // slate-900
      border: '1px solid #475569', // slate-700
      borderRadius: '1rem', // rounded-2xl
      marginTop: '8px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
      zIndex: 50,
      position: 'absolute'
    }),
    menuList: (base) => ({
      ...base,
      padding: '4px',
      maxHeight: '300px', // Better for mobile
      '::-webkit-scrollbar': {
        width: '8px'
      },
      '::-webkit-scrollbar-track': {
        background: '#334155' // slate-700
      },
      '::-webkit-scrollbar-thumb': {
        background: '#64748b', // slate-500
        borderRadius: '4px'
      }
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? '#6366f1' // indigo-500
        : state.isFocused
        ? '#334155' // slate-700
        : 'transparent',
      color: '#fff',
      cursor: 'pointer',
      padding: '12px 16px', // Larger tap target for mobile
      fontSize: '15px',
      '&:active': {
        backgroundColor: '#4f46e5' // indigo-600
      }
    }),
    groupHeading: (base) => ({
      ...base,
      color: '#94a3b8', // slate-400
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      padding: '8px 16px',
      letterSpacing: '0.05em'
    }),
    singleValue: (base) => ({
      ...base,
      color: '#f1f5f9', // slate-100
      fontSize: '16px'
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '8px 12px',
      fontSize: '16px'
    }),
    input: (base) => ({
      ...base,
      color: '#fff',
      fontSize: '16px', // Prevent iOS zoom
      margin: 0,
      padding: 0
    }),
    placeholder: (base) => ({
      ...base,
      color: '#94a3b8', // slate-400
      fontSize: '16px'
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: '#94a3b8', // slate-400
      '&:hover': {
        color: '#cbd5e1' // slate-300
      }
    }),
    indicatorSeparator: (base) => ({
      ...base,
      backgroundColor: '#475569' // slate-600
    }),
    clearIndicator: (base) => ({
      ...base,
      color: '#94a3b8', // slate-400
      '&:hover': {
        color: '#cbd5e1' // slate-300
      }
    })
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-200 mb-2">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <Select<VehicleBrand, false, GroupBase<VehicleBrand>>
        options={groupedOptions}
        value={selectedOption}
        onChange={(option) => {
          if (option) {
            onChange(option.value)
          }
        }}
        placeholder="Search or select make..."
        isSearchable
        isClearable
        styles={customStyles}
        className="react-select-container"
        classNamePrefix="react-select"
        required={required}
        // Accessibility
        aria-label={label}
        // Performance
        menuPlacement="auto"
        menuPosition="absolute" // Fix for mobile dropdown positioning
        // Mobile optimizations
        menuShouldScrollIntoView={false}
        closeMenuOnScroll={(e: any) => {
          const target = e.target as HTMLElement
          // Check if target has closest method (not all scroll targets do)
          if (!target || typeof target.closest !== 'function') {
            return true // Close menu for non-element scroll events
          }
          return !target.closest('.react-select__menu')
        }}
        // Filter options case-insensitive
        filterOption={(option, inputValue) => {
          return option.label.toLowerCase().includes(inputValue.toLowerCase())
        }}
      />

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-red-300">
          {error}
        </p>
      )}

      {/* Helper text */}
      {!error && (
        <p className="mt-2 text-xs text-slate-400">
          Start typing to search or scroll to browse
        </p>
      )}
    </div>
  )
}
