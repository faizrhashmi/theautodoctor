'use client'

/**
 * Enhanced Customer Intake Form
 * Includes brand specialist selection, location matching, and smart mechanic matching
 */

import { useState, useEffect } from 'react'
import { Star, MapPin, CheckCircle, Info, Loader2, DollarSign } from 'lucide-react'
import { MechanicMatch } from '@/lib/mechanicMatching'
import { SpecialistTierBadge } from '@/components/SpecialistTierBadge'

interface EnhancedIntakeFormProps {
  onSubmit: (data: IntakeData) => void
  className?: string
}

export interface IntakeData {
  requestType: 'general' | 'brand_specialist'
  requestedBrand?: string
  customerCountry: string
  customerCity: string
  preferLocalMechanic: boolean
  description: string
  extractedKeywords: string[]
  selectedMechanic?: string
}

export function EnhancedIntakeForm({ onSubmit, className = '' }: EnhancedIntakeFormProps) {
  // Form state
  const [requestType, setRequestType] = useState<'general' | 'brand_specialist'>('general')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [customerCountry, setCustomerCountry] = useState('')
  const [customerCity, setCustomerCity] = useState('')
  const [preferLocal, setPreferLocal] = useState(true)
  const [description, setDescription] = useState('')

  // Matching state
  const [extractedKeywords, setExtractedKeywords] = useState<string[]>([])
  const [matchedMechanics, setMatchedMechanics] = useState<MechanicMatch[]>([])
  const [selectedMechanic, setSelectedMechanic] = useState<string>('')
  const [isMatching, setIsMatching] = useState(false)

  // Data loading
  const [brands, setBrands] = useState<any[]>([])
  const [countries, setCountries] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [loadingBrands, setLoadingBrands] = useState(true)
  const [loadingCities, setLoadingCities] = useState(false)

  // Pricing
  const [pricing, setPricing] = useState<{ general: string; specialist: string }>({
    general: '$29.99',
    specialist: '$49.99'
  })

  // Feature flags
  const [showBrandSpecialist, setShowBrandSpecialist] = useState(true) // Will fetch from API

  // Load brands and countries
  useEffect(() => {
    const loadData = async () => {
      try {
        const [brandsRes, countriesRes] = await Promise.all([
          fetch('/api/brands'),
          fetch('/api/countries')
        ])

        if (brandsRes.ok) {
          const brandsData = await brandsRes.json()
          setBrands(brandsData)
        }

        if (countriesRes.ok) {
          const countriesData = await countriesRes.json()
          setCountries(countriesData)
        }
      } catch (err) {
        console.error('Failed to load form data:', err)
      } finally {
        setLoadingBrands(false)
      }
    }

    loadData()
  }, [])

  // Load cities when country changes
  useEffect(() => {
    const loadCities = async () => {
      if (!customerCountry) {
        setCities([])
        return
      }

      setLoadingCities(true)
      try {
        const country = countries.find(c => c.country_name === customerCountry)
        if (country) {
          const response = await fetch(`/api/cities?country=${country.country_code}`)
          if (response.ok) {
            const data = await response.json()
            setCities(data)
          }
        }
      } catch (err) {
        console.error('Failed to load cities:', err)
      } finally {
        setLoadingCities(false)
      }
    }

    loadCities()
  }, [customerCountry, countries])

  // Extract keywords as user types
  useEffect(() => {
    const extractKeywords = async () => {
      if (description.length < 10) {
        setExtractedKeywords([])
        return
      }

      try {
        const response = await fetch('/api/keywords/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description })
        })

        if (response.ok) {
          const { keywords } = await response.json()
          setExtractedKeywords(keywords)
        }
      } catch (err) {
        console.error('Failed to extract keywords:', err)
      }
    }

    const debounce = setTimeout(extractKeywords, 500)
    return () => clearTimeout(debounce)
  }, [description])

  // Find matching mechanics
  const findMatches = async () => {
    if (!description || description.length < 10) {
      alert('Please describe your concern (at least 10 characters)')
      return
    }

    if (!customerCountry || !customerCity) {
      alert('Please select your location')
      return
    }

    if (requestType === 'brand_specialist' && !selectedBrand) {
      alert('Please select your vehicle brand')
      return
    }

    setIsMatching(true)
    try {
      const response = await fetch('/api/matching/find-mechanics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType,
          requestedBrand: requestType === 'brand_specialist' ? selectedBrand : undefined,
          extractedKeywords,
          customerCountry,
          customerCity,
          preferLocalMechanic: preferLocal
        })
      })

      if (response.ok) {
        const { matches } = await response.json()
        setMatchedMechanics(matches)
      } else {
        alert('Failed to find matching mechanics. Please try again.')
      }
    } catch (err) {
      console.error('Failed to match mechanics:', err)
      alert('Error finding mechanics. Please try again.')
    } finally {
      setIsMatching(false)
    }
  }

  // Handle submit
  const handleSubmit = () => {
    if (!selectedMechanic) {
      alert('Please select a mechanic to proceed')
      return
    }

    const data: IntakeData = {
      requestType,
      requestedBrand: requestType === 'brand_specialist' ? selectedBrand : undefined,
      customerCountry,
      customerCity,
      preferLocalMechanic: preferLocal,
      description,
      extractedKeywords,
      selectedMechanic
    }

    onSubmit(data)
  }

  return (
    <div className={`max-w-4xl mx-auto space-y-8 ${className}`}>
      {/* Step 1: Service Type Selection */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Step 1: Choose Service Type
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* General Service */}
          <button
            onClick={() => setRequestType('general')}
            className={`
              p-6 border-2 rounded-xl text-left transition-all
              ${requestType === 'general'
                ? 'border-slate-500 bg-slate-50 dark:bg-slate-900/20 ring-4 ring-slate-500/20'
                : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
              }
            `}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <SpecialistTierBadge tier="general" size="sm" showIcon={true} showLabel={true} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  General Service
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Certified mechanic handles your request
                </p>
              </div>
              {requestType === 'general' && (
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {pricing.general}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                per session
              </span>
            </div>
            <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              ✓ All vehicle types • ✓ Quick response • ✓ Professional service
            </div>
          </button>

          {/* Brand Specialist */}
          {showBrandSpecialist && (
            <button
              onClick={() => setRequestType('brand_specialist')}
              className={`
                p-6 border-2 rounded-xl text-left transition-all relative overflow-hidden
                ${requestType === 'brand_specialist'
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 ring-4 ring-orange-500/20'
                  : 'border-slate-300 dark:border-slate-600 hover:border-orange-400 hover:bg-orange-50/50'
                }
              `}
            >
              {/* Recommended badge */}
              <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                RECOMMENDED
              </div>

              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 pr-20">
                  <div className="flex items-center gap-2 mb-2">
                    <SpecialistTierBadge tier="brand" size="sm" showIcon={true} showLabel={true} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    Brand Specialist
                    <Star className="h-5 w-5 text-orange-500" />
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Expert in your specific vehicle brand
                  </p>
                </div>
                {requestType === 'brand_specialist' && (
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {pricing.specialist}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  per session
                </span>
              </div>
              <div className="mt-3 text-xs text-orange-700 dark:text-orange-300">
                ✓ Brand-specific expertise • ✓ Advanced diagnostics • ✓ Premium service
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded text-xs font-medium">
                <Info className="h-3 w-3" />
                Higher accuracy for brand-specific issues
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Step 2: Brand Selection (if specialist) */}
      {requestType === 'brand_specialist' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Step 2: Select Your Vehicle Brand
          </h2>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select your vehicle brand...</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.brand_name}>
                {brand.brand_name}
                {brand.is_luxury ? ' (Luxury)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Step 3: Location */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Step {requestType === 'brand_specialist' ? '3' : '2'}: Your Location
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Country
            </label>
            <select
              value={customerCountry}
              onChange={(e) => {
                setCustomerCountry(e.target.value)
                setCustomerCity('') // Reset city
              }}
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            >
              <option value="">Select country...</option>
              {countries.map((country) => (
                <option key={country.id} value={country.country_name}>
                  {country.country_name}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              City
            </label>
            <select
              value={customerCity}
              onChange={(e) => setCustomerCity(e.target.value)}
              disabled={!customerCountry || loadingCities}
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 disabled:opacity-50"
            >
              <option value="">Select city...</option>
              {cities.map((city) => (
                <option key={city.id} value={city.city_name}>
                  {city.city_name}
                  {city.state_province ? `, ${city.state_province}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Prefer Local Toggle */}
        <div className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            id="preferLocal"
            checked={preferLocal}
            onChange={(e) => setPreferLocal(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="preferLocal" className="text-sm text-slate-700 dark:text-slate-300">
            Prefer mechanics in my city (recommended)
          </label>
        </div>
      </div>

      {/* Step 4: Describe Concern */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Step {requestType === 'brand_specialist' ? '4' : '3'}: Describe Your Concern
        </h2>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Example: I need to install a backup camera in my 2020 BMW X5. The camera is already purchased, just need help with installation and coding."
          rows={5}
          className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Extracted Keywords */}
        {extractedKeywords.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Detected services:
                </p>
                <div className="flex flex-wrap gap-2">
                  {extractedKeywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-sm rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Find Mechanics Button */}
        <button
          onClick={findMatches}
          disabled={isMatching || description.length < 10}
          className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isMatching ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Finding best matches...
            </>
          ) : (
            <>Find My Mechanic</>
          )}
        </button>
      </div>

      {/* Step 5: Matched Mechanics */}
      {matchedMechanics.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Step {requestType === 'brand_specialist' ? '5' : '4'}: Choose Your Mechanic
          </h2>

          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            We found {matchedMechanics.length} matching mechanics. Select one to proceed:
          </p>

          <div className="space-y-4">
            {matchedMechanics.slice(0, 5).map((mechanic) => (
              <MechanicMatchCard
                key={mechanic.mechanicId}
                mechanic={mechanic}
                isSelected={selectedMechanic === mechanic.mechanicId}
                onSelect={() => setSelectedMechanic(mechanic.mechanicId)}
              />
            ))}
          </div>

          {/* Submit Button */}
          {selectedMechanic && (
            <button
              onClick={handleSubmit}
              className="mt-6 w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-6 w-6" />
              Book Session with Selected Mechanic
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Mechanic Match Card Component
 */
function MechanicMatchCard({
  mechanic,
  isSelected,
  onSelect
}: {
  mechanic: MechanicMatch
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full p-5 border-2 rounded-xl text-left transition-all
        ${isSelected
          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500/20'
          : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'
        }
      `}
    >
      <div className="flex items-start gap-4">
        {/* Profile Photo */}
        <div className="flex-shrink-0">
          {mechanic.profilePhoto ? (
            <img
              src={mechanic.profilePhoto}
              alt={mechanic.mechanicName}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <span className="text-2xl font-bold text-slate-600 dark:text-slate-300">
                {mechanic.mechanicName.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                {mechanic.mechanicName}
              </h3>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mt-1">
                {mechanic.availability === 'online' && (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    Available now
                  </span>
                )}
                {mechanic.country && mechanic.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {mechanic.city}, {mechanic.country}
                  </span>
                )}
              </div>
            </div>

            {/* Match Score */}
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {mechanic.matchScore}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                match score
              </div>
            </div>
          </div>

          {/* Experience & Rating */}
          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-2">
            <span>{mechanic.yearsExperience} years exp</span>
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              {mechanic.rating.toFixed(1)}
            </span>
            {mechanic.isBrandSpecialist && (
              <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-xs font-medium">
                Specialist
              </span>
            )}
          </div>

          {/* Match Reasons */}
          <div className="flex flex-wrap gap-2">
            {mechanic.matchReasons.slice(0, 4).map((reason, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="flex-shrink-0">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
        )}
      </div>
    </button>
  )
}
