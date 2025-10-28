'use client'

import Select, { GroupBase, StylesConfig } from 'react-select'
import { getGroupedBrands, type VehicleBrand } from '@/lib/vehicleBrands'

interface SmartBrandSelectorProps {
  value: string
  onChange: (brand: string) => void
  label?: string
  className?: string
  required?: boolean
}

export default function SmartBrandSelector({
  value,
  onChange,
  label = 'Make',
  className = '',
  required = false
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
      backgroundColor: 'rgba(30, 41, 59, 0.5)', // slate-800/50
      borderColor: state.isFocused ? '#3b82f6' : '#475569', // blue-500 : slate-600
      borderWidth: '1px',
      borderRadius: '0.5rem',
      minHeight: '48px', // Mobile-friendly height
      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
      '&:hover': {
        borderColor: '#64748b' // slate-500
      },
      cursor: 'pointer',
      fontSize: '16px' // Prevent iOS zoom on focus
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: '#1e293b', // slate-800
      border: '1px solid #475569', // slate-600
      borderRadius: '0.5rem',
      marginTop: '4px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
      zIndex: 100
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
        ? '#3b82f6' // blue-500
        : state.isFocused
        ? '#334155' // slate-700
        : 'transparent',
      color: '#fff',
      cursor: 'pointer',
      padding: '12px 16px', // Larger tap target for mobile
      fontSize: '15px',
      '&:active': {
        backgroundColor: '#1e40af' // blue-800
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
      color: '#fff'
    }),
    input: (base) => ({
      ...base,
      color: '#fff',
      fontSize: '16px' // Prevent iOS zoom
    }),
    placeholder: (base) => ({
      ...base,
      color: '#94a3b8' // slate-400
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
        menuPosition="fixed" // Better for mobile scrolling
        // Mobile optimizations
        menuShouldScrollIntoView={true}
        closeMenuOnScroll={false}
        // Filter options case-insensitive
        filterOption={(option, inputValue) => {
          return option.label.toLowerCase().includes(inputValue.toLowerCase())
        }}
      />

      {/* Helper text */}
      <p className="mt-2 text-xs text-slate-400">
        Start typing to search or scroll to browse
      </p>
    </div>
  )
}
