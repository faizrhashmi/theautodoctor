// @ts-nocheck
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export interface AddressData {
  addressLine1: string
  addressLine2?: string
  city: string
  stateProvince: string
  postalZipCode: string
  country: string
  latitude?: number
  longitude?: number
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: AddressData) => void
  value?: Partial<AddressData>
  error?: string
  className?: string
}

export default function AddressAutocomplete({
  onAddressSelect,
  value,
  error,
  className = '',
}: AddressAutocompleteProps) {
  const [manualEntry, setManualEntry] = useState(true) // Default to manual entry (Google Places API placeholder)
  const [formData, setFormData] = useState<Partial<AddressData>>(value || {})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Handle field changes
  const handleChange = (field: keyof AddressData, val: string) => {
    const updated = { ...formData, [field]: val }
    setFormData(updated)
    setErrors((prev) => ({ ...prev, [field]: '' }))

    // Auto-populate parent component
    if (
      updated.addressLine1 &&
      updated.city &&
      updated.stateProvince &&
      updated.postalZipCode &&
      updated.country
    ) {
      onAddressSelect(updated as AddressData)
    }
  }

  // Validate postal code format based on country
  const validatePostalCode = (code: string, country: string): boolean => {
    const patterns: Record<string, RegExp> = {
      'United States': /^\d{5}(-\d{4})?$/,
      'Canada': /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
      'United Kingdom': /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i,
      'Australia': /^\d{4}$/,
    }

    const pattern = patterns[country]
    if (!pattern) return true // Allow any format for unknown countries
    return pattern.test(code)
  }

  const handleBlur = (field: keyof AddressData) => {
    const val = formData[field]
    if (!val && field !== 'addressLine2') {
      setErrors((prev) => ({ ...prev, [field]: 'This field is required' }))
    } else if (field === 'postalZipCode' && val && formData.country) {
      if (!validatePostalCode(val, formData.country)) {
        setErrors((prev) => ({ ...prev, [field]: 'Invalid postal/ZIP code format' }))
      }
    }
  }

  return (
    <div className={className}>
      {/* Google Places API Toggle (Placeholder for future) */}
      <div className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 p-3">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-sm font-medium text-blue-900">
            {manualEntry ? 'Manual Address Entry' : 'Google Places Autocomplete'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setManualEntry(!manualEntry)}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          {manualEntry ? 'Use Autocomplete' : 'Enter Manually'}
        </button>
      </div>

      {/* Google Places Autocomplete (Placeholder) */}
      {!manualEntry && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          <div className="flex items-start gap-2">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-semibold">Google Places API Integration</p>
              <p className="mt-1 text-xs">
                This feature will enable automatic address completion. For now, please use manual entry below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Address Entry */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        {/* Street Address */}
        <div>
          <label htmlFor="addressLine1" className="block text-sm font-medium text-slate-700">
            Street Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="addressLine1"
            value={formData.addressLine1 || ''}
            onChange={(e) => handleChange('addressLine1', e.target.value)}
            onBlur={() => handleBlur('addressLine1')}
            placeholder="123 Main Street"
            className={`mt-1 block w-full rounded-lg border px-4 py-3 outline-none transition focus:ring-2 ${
              errors.addressLine1
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-orange-500 focus:ring-orange-200'
            }`}
          />
          {errors.addressLine1 && <p className="mt-1 text-xs text-red-600">{errors.addressLine1}</p>}
        </div>

        {/* Apartment, Suite, etc. */}
        <div>
          <label htmlFor="addressLine2" className="block text-sm font-medium text-slate-700">
            Apartment, Suite, Unit, etc. <span className="text-slate-400">(Optional)</span>
          </label>
          <input
            type="text"
            id="addressLine2"
            value={formData.addressLine2 || ''}
            onChange={(e) => handleChange('addressLine2', e.target.value)}
            placeholder="Apt 4B"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
        </div>

        {/* City and State/Province */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-slate-700">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="city"
              value={formData.city || ''}
              onChange={(e) => handleChange('city', e.target.value)}
              onBlur={() => handleBlur('city')}
              placeholder="New York"
              className={`mt-1 block w-full rounded-lg border px-4 py-3 outline-none transition focus:ring-2 ${
                errors.city
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-slate-300 focus:border-orange-500 focus:ring-orange-200'
              }`}
            />
            {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
          </div>

          <div>
            <label htmlFor="stateProvince" className="block text-sm font-medium text-slate-700">
              State / Province <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="stateProvince"
              value={formData.stateProvince || ''}
              onChange={(e) => handleChange('stateProvince', e.target.value)}
              onBlur={() => handleBlur('stateProvince')}
              placeholder="NY"
              className={`mt-1 block w-full rounded-lg border px-4 py-3 outline-none transition focus:ring-2 ${
                errors.stateProvince
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-slate-300 focus:border-orange-500 focus:ring-orange-200'
              }`}
            />
            {errors.stateProvince && <p className="mt-1 text-xs text-red-600">{errors.stateProvince}</p>}
          </div>
        </div>

        {/* Postal/ZIP Code */}
        <div>
          <label htmlFor="postalZipCode" className="block text-sm font-medium text-slate-700">
            Postal / ZIP Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="postalZipCode"
            value={formData.postalZipCode || ''}
            onChange={(e) => handleChange('postalZipCode', e.target.value)}
            onBlur={() => handleBlur('postalZipCode')}
            placeholder="10001"
            className={`mt-1 block w-full rounded-lg border px-4 py-3 outline-none transition focus:ring-2 ${
              errors.postalZipCode
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-orange-500 focus:ring-orange-200'
            }`}
          />
          {errors.postalZipCode && <p className="mt-1 text-xs text-red-600">{errors.postalZipCode}</p>}
        </div>

        {/* Country (Hidden - managed by CountrySelector in parent) */}
        <input type="hidden" value={formData.country || ''} />

        {/* Address Preview */}
        {formData.addressLine1 && formData.city && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-green-200 bg-green-50 p-4"
          >
            <div className="flex items-start gap-2">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm">
                <p className="font-semibold text-green-900">Address Preview</p>
                <div className="mt-1 text-green-700">
                  <p>{formData.addressLine1}</p>
                  {formData.addressLine2 && <p>{formData.addressLine2}</p>}
                  <p>
                    {formData.city}
                    {formData.stateProvince && `, ${formData.stateProvince}`}{' '}
                    {formData.postalZipCode}
                  </p>
                  {formData.country && <p>{formData.country}</p>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
