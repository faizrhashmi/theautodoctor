'use client'

/**
 * Location Selector Component
 * Allows mechanics to select their country and city
 */

import { useEffect, useState } from 'react'
import { MapPin, ChevronDown, Search } from 'lucide-react'

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

interface LocationSelectorProps {
  country: string
  city: string
  onCountryChange: (country: string, timezone: string) => void
  onCityChange: (city: string, stateProvince: string, timezone: string) => void
  error?: string
  disabled?: boolean
  className?: string
}

export function LocationSelector({
  country,
  city,
  onCountryChange,
  onCityChange,
  error,
  disabled = false,
  className = ''
}: LocationSelectorProps) {
  const [countries, setCountries] = useState<Country[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [filteredCities, setFilteredCities] = useState<City[]>([])
  const [citySearch, setCitySearch] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [showCustomCity, setShowCustomCity] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch countries
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
          setFilteredCities(data)
        }
      } catch (err) {
        console.error('Failed to fetch cities:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCities()
  }, [country, countries])

  // Filter cities based on search
  useEffect(() => {
    if (!citySearch) {
      setFilteredCities(cities)
      return
    }

    const filtered = cities.filter(c =>
      c.city_name.toLowerCase().includes(citySearch.toLowerCase()) ||
      c.state_province?.toLowerCase().includes(citySearch.toLowerCase())
    )
    setFilteredCities(filtered)
  }, [citySearch, cities])

  const handleCountryChange = (countryName: string) => {
    const selectedCountry = countries.find(c => c.country_name === countryName)
    if (selectedCountry) {
      onCountryChange(countryName, selectedCountry.default_timezone)
      // Reset city when country changes
      onCityChange('', '', selectedCountry.default_timezone)
      setShowCustomCity(false)
      setCustomCity('')
    }
  }

  const handleCitySelect = (selectedCity: City) => {
    onCityChange(selectedCity.city_name, selectedCity.state_province, selectedCity.timezone)
    setShowCustomCity(false)
  }

  const handleCustomCitySubmit = () => {
    if (customCity.trim()) {
      const selectedCountry = countries.find(c => c.country_name === country)
      onCityChange(customCity.trim(), '', selectedCountry?.default_timezone || 'America/Toronto')
      setShowCustomCity(false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Country Selector */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Country <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <select
            value={country}
            onChange={(e) => handleCountryChange(e.target.value)}
            disabled={disabled}
            className={`
              w-full pl-10 pr-4 py-3 rounded-lg border-2
              bg-white dark:bg-slate-800
              text-slate-900 dark:text-white
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            `}
          >
            <option value="">Select your country...</option>
            {countries.map((c) => (
              <option key={c.id} value={c.country_name}>
                {c.country_name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* City Selector */}
      {country && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            City <span className="text-red-500">*</span>
          </label>

          {!showCustomCity ? (
            <>
              {/* Search Box */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="Search cities..."
                  disabled={disabled || loading}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* City List */}
              <div className="max-h-48 overflow-y-auto border-2 border-slate-300 dark:border-slate-600 rounded-lg">
                {loading ? (
                  <div className="p-4 text-center text-slate-500">
                    Loading cities...
                  </div>
                ) : filteredCities.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    No cities found
                  </div>
                ) : (
                  filteredCities.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleCitySelect(c)}
                      disabled={disabled}
                      className={`
                        w-full px-4 py-3 text-left border-b border-slate-200 dark:border-slate-700
                        transition-colors
                        ${city === c.city_name
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="font-medium">{c.city_name}</div>
                      {c.state_province && (
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {c.state_province}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Custom City Button */}
              <button
                onClick={() => setShowCustomCity(true)}
                disabled={disabled}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                My city isn't listed - enter custom city
              </button>
            </>
          ) : (
            <>
              {/* Custom City Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  placeholder="Enter your city name..."
                  disabled={disabled}
                  className="flex-1 px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCustomCitySubmit()
                    }
                  }}
                />
                <button
                  onClick={handleCustomCitySubmit}
                  disabled={disabled || !customCity.trim()}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              <button
                onClick={() => setShowCustomCity(false)}
                disabled={disabled}
                className="mt-2 text-sm text-slate-600 dark:text-slate-400 hover:underline"
              >
                ← Back to city list
              </button>
            </>
          )}
        </div>
      )}

      {/* Current Selection Display */}
      {country && city && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium">
              {city}, {country}
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Info Message */}
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Your location helps match you with local customers and ensures accurate availability times.
      </p>
    </div>
  )
}
