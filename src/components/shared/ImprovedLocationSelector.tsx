'use client'

/**
 * Improved Location Selector
 * Modern, grouped city selector showing Province > City
 * Used across: Customer profiles, Mechanic profiles, Workshop locations, Booking wizard
 */

import { useEffect, useState } from 'react'
import { MapPin, ChevronDown, Search, X } from 'lucide-react'

interface Country {
  id: string
  country_name: string
  country_code: string
  default_timezone: string
}

interface City {
  id: string
  city_name: string
  state_province: string
  country_code: string
  timezone: string
}

interface ImprovedLocationSelectorProps {
  country: string
  city: string
  province?: string
  onCountryChange: (country: string, timezone: string) => void
  onCityChange: (city: string, province: string, timezone: string) => void
  onProvinceChange?: (province: string) => void
  error?: string
  disabled?: boolean
  className?: string
  compact?: boolean // For smaller UIs
}

export function ImprovedLocationSelector({
  country,
  city,
  province,
  onCountryChange,
  onCityChange,
  onProvinceChange,
  error,
  disabled = false,
  className = '',
  compact = false
}: ImprovedLocationSelectorProps) {
  const [countries, setCountries] = useState<Country[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [provinces, setProvinces] = useState<string[]>([])
  const [selectedProvince, setSelectedProvince] = useState<string>(province || '')
  const [filteredCities, setFilteredCities] = useState<City[]>([])
  const [citySearch, setCitySearch] = useState('')
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('/api/countries')
        if (response.ok) {
          const data = await response.json()
          setCountries(data)
        }
      } catch (err) {
        console.error('Failed to fetch countries:', err)
      }
    }

    fetchCountries()
  }, [])

  // Fetch cities when country changes
  useEffect(() => {
    const fetchCities = async () => {
      if (!country) {
        setCities([])
        setFilteredCities([])
        setProvinces([])
        return
      }

      try {
        setLoading(true)
        const selectedCountry = countries.find(c => c.country_name === country)
        if (!selectedCountry) return

        const response = await fetch(`/api/cities?country=${selectedCountry.country_code}`)
        if (response.ok) {
          const data = await response.json()
          setCities(data)

          // Extract unique provinces
          const uniqueProvinces = [...new Set(data.map((c: City) => c.state_province))].sort()
          setProvinces(uniqueProvinces as string[])
        }
      } catch (err) {
        console.error('Failed to fetch cities:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCities()
  }, [country, countries])

  // Filter cities by province and search query
  useEffect(() => {
    let filtered = cities

    // Filter by selected province
    if (selectedProvince) {
      filtered = filtered.filter(c => c.state_province === selectedProvince)
    }

    // Filter by search query
    if (citySearch.trim()) {
      filtered = filtered.filter(c =>
        c.city_name.toLowerCase().includes(citySearch.toLowerCase())
      )
    }

    setFilteredCities(filtered)
  }, [cities, selectedProvince, citySearch])

  const handleProvinceChange = (newProvince: string) => {
    setSelectedProvince(newProvince)
    setCitySearch('')
    if (onProvinceChange) {
      onProvinceChange(newProvince)
    }
  }

  const handleCitySelect = (selectedCity: City) => {
    onCityChange(selectedCity.city_name, selectedCity.state_province, selectedCity.timezone)
    setShowCityDropdown(false)
    setCitySearch('')
  }

  const handleCountryChange = (newCountry: string) => {
    const selectedCountry = countries.find(c => c.country_name === newCountry)
    if (selectedCountry) {
      onCountryChange(newCountry, selectedCountry.default_timezone)
      setSelectedProvince('')
      setCitySearch('')
    }
  }

  // Group cities by province for dropdown
  const citiesByProvince = filteredCities.reduce((acc, city) => {
    const prov = city.state_province
    if (!acc[prov]) acc[prov] = []
    acc[prov].push(city)
    return acc
  }, {} as Record<string, City[]>)

  const textSize = compact ? 'text-xs' : 'text-sm'
  const paddingSize = compact ? 'px-3 py-1.5' : 'px-4 py-2.5'

  return (
    <div className={className}>
      {/* Grid Layout - Side by side on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Country Selector */}
        <div>
          <label className={`block ${textSize} font-medium text-slate-300 mb-1.5`}>
            Country
          </label>
          <select
            value={country}
            onChange={(e) => handleCountryChange(e.target.value)}
            disabled={disabled}
            className={`w-full ${paddingSize} bg-slate-900 border border-slate-700 rounded-lg text-white ${textSize}
              focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all
              disabled:opacity-50 disabled:cursor-not-allowed appearance-none`}
          >
            <option value="">Select country...</option>
            {countries.map((c) => (
              <option key={c.id} value={c.country_name}>
                {c.country_name}
              </option>
            ))}
          </select>
        </div>

        {/* Province/State Selector */}
        {country && provinces.length > 0 && (
          <div>
            <label className={`block ${textSize} font-medium text-slate-300 mb-1.5`}>
              Province/State
            </label>
            <select
              value={selectedProvince}
              onChange={(e) => handleProvinceChange(e.target.value)}
              disabled={disabled || loading}
              className={`w-full ${paddingSize} bg-slate-900 border border-slate-700 rounded-lg text-white ${textSize}
                focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all
                disabled:opacity-50 disabled:cursor-not-allowed appearance-none`}
            >
              <option value="">All provinces...</option>
              {provinces.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* City Selector with Search */}
        {country && (
          <div className="relative">
            <label className={`block ${textSize} font-medium text-slate-300 mb-1.5`}>
              City
            </label>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={city || citySearch}
              onChange={(e) => {
                setCitySearch(e.target.value)
                setShowCityDropdown(true)
              }}
              onFocus={() => setShowCityDropdown(true)}
              disabled={disabled || loading}
              placeholder={selectedProvince ? `Search cities in ${selectedProvince}...` : "Search cities..."}
              className={`w-full pl-10 pr-10 ${paddingSize} bg-slate-900 border border-slate-700 rounded-lg text-white ${textSize}
                placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all
                disabled:opacity-50 disabled:cursor-not-allowed`}
            />

            {/* Clear button */}
            {(city || citySearch) && (
              <button
                type="button"
                onClick={() => {
                  setCitySearch('')
                  onCityChange('', '', '')
                  setShowCityDropdown(false)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Dropdown */}
          {showCityDropdown && filteredCities.length > 0 && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowCityDropdown(false)}
              />

              {/* Dropdown Menu */}
              <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                {/* Grouped by Province */}
                {Object.entries(citiesByProvince).map(([prov, provinceCities]) => (
                  <div key={prov}>
                    {/* Province Header */}
                    {!selectedProvince && (
                      <div className="sticky top-0 bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 border-b border-slate-600">
                        {prov}
                      </div>
                    )}

                    {/* Cities in this Province */}
                    {provinceCities.map((cityItem) => (
                      <button
                        key={cityItem.id}
                        type="button"
                        onClick={() => handleCitySelect(cityItem)}
                        className={`w-full text-left px-4 py-2 ${textSize} text-white hover:bg-slate-700 transition-colors
                          ${city === cityItem.city_name ? 'bg-orange-500/20' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span>{cityItem.city_name}</span>
                          {!selectedProvince && (
                            <span className="text-xs text-slate-500 ml-auto">{cityItem.state_province}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))}

                {/* No Results */}
                {filteredCities.length === 0 && (
                  <div className="px-4 py-6 text-center text-slate-400 text-sm">
                    No cities found matching "{citySearch}"
                  </div>
                )}
              </div>
            </>
          )}

          {/* Loading State */}
          {loading && (
            <div className="absolute right-3 top-10 text-slate-400">
              <div className="h-4 w-4 border-2 border-slate-600 border-t-orange-500 rounded-full animate-spin" />
            </div>
          )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className={`${textSize} text-red-400 mt-3`}>{error}</p>
      )}

      {/* Helper Text */}
      {city && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg mt-3">
          <MapPin className="h-4 w-4 text-green-400 flex-shrink-0" />
          <p className="text-xs text-green-200">
            <strong>{city}</strong> selected for location matching
          </p>
        </div>
      )}
    </div>
  )
}
