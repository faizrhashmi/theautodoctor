// @ts-nocheck
'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface Country {
  code: string
  name: string
  flag: string
  phoneCode: string
}

const COUNTRIES: Country[] = [
  // Popular countries first
  { code: 'US', name: 'United States', flag: '🇺🇸', phoneCode: '+1' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', phoneCode: '+1' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', phoneCode: '+44' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', phoneCode: '+61' },
  // All other countries alphabetically
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', phoneCode: '+93' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱', phoneCode: '+355' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿', phoneCode: '+213' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩', phoneCode: '+376' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', phoneCode: '+244' },
  { code: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬', phoneCode: '+1' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', phoneCode: '+54' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲', phoneCode: '+374' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', phoneCode: '+43' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿', phoneCode: '+994' },
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸', phoneCode: '+1' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', phoneCode: '+973' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', phoneCode: '+880' },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧', phoneCode: '+1' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾', phoneCode: '+375' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', phoneCode: '+32' },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿', phoneCode: '+501' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯', phoneCode: '+229' },
  { code: 'BT', name: 'Bhutan', flag: '🇧🇹', phoneCode: '+975' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', phoneCode: '+591' },
  { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦', phoneCode: '+387' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼', phoneCode: '+267' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', phoneCode: '+55' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳', phoneCode: '+673' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', phoneCode: '+359' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', phoneCode: '+226' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮', phoneCode: '+257' },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭', phoneCode: '+855' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', phoneCode: '+237' },
  { code: 'CV', name: 'Cape Verde', flag: '🇨🇻', phoneCode: '+238' },
  { code: 'CF', name: 'Central African Republic', flag: '🇨🇫', phoneCode: '+236' },
  { code: 'TD', name: 'Chad', flag: '🇹🇩', phoneCode: '+235' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', phoneCode: '+56' },
  { code: 'CN', name: 'China', flag: '🇨🇳', phoneCode: '+86' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', phoneCode: '+57' },
  { code: 'KM', name: 'Comoros', flag: '🇰🇲', phoneCode: '+269' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬', phoneCode: '+242' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', phoneCode: '+506' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', phoneCode: '+385' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', phoneCode: '+53' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾', phoneCode: '+357' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', phoneCode: '+420' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', phoneCode: '+45' },
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯', phoneCode: '+253' },
  { code: 'DM', name: 'Dominica', flag: '🇩🇲', phoneCode: '+1' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴', phoneCode: '+1' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', phoneCode: '+593' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', phoneCode: '+20' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', phoneCode: '+503' },
  { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶', phoneCode: '+240' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷', phoneCode: '+291' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', phoneCode: '+372' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', phoneCode: '+251' },
  { code: 'FJ', name: 'Fiji', flag: '🇫🇯', phoneCode: '+679' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', phoneCode: '+358' },
  { code: 'FR', name: 'France', flag: '🇫🇷', phoneCode: '+33' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', phoneCode: '+241' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲', phoneCode: '+220' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪', phoneCode: '+995' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', phoneCode: '+49' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', phoneCode: '+233' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', phoneCode: '+30' },
  { code: 'GD', name: 'Grenada', flag: '🇬🇩', phoneCode: '+1' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', phoneCode: '+502' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳', phoneCode: '+224' },
  { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼', phoneCode: '+245' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾', phoneCode: '+592' },
  { code: 'HT', name: 'Haiti', flag: '🇭🇹', phoneCode: '+509' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', phoneCode: '+504' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', phoneCode: '+36' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', phoneCode: '+354' },
  { code: 'IN', name: 'India', flag: '🇮🇳', phoneCode: '+91' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', phoneCode: '+62' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', phoneCode: '+98' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', phoneCode: '+964' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', phoneCode: '+353' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', phoneCode: '+972' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', phoneCode: '+39' },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲', phoneCode: '+1' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', phoneCode: '+81' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', phoneCode: '+962' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', phoneCode: '+7' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', phoneCode: '+254' },
  { code: 'KI', name: 'Kiribati', flag: '🇰🇮', phoneCode: '+686' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', phoneCode: '+965' },
  { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬', phoneCode: '+996' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦', phoneCode: '+856' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', phoneCode: '+371' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', phoneCode: '+961' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸', phoneCode: '+266' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷', phoneCode: '+231' },
  { code: 'LY', name: 'Libya', flag: '🇱🇾', phoneCode: '+218' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', phoneCode: '+423' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', phoneCode: '+370' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', phoneCode: '+352' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬', phoneCode: '+261' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼', phoneCode: '+265' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', phoneCode: '+60' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻', phoneCode: '+960' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', phoneCode: '+223' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', phoneCode: '+356' },
  { code: 'MH', name: 'Marshall Islands', flag: '🇲🇭', phoneCode: '+692' },
  { code: 'MR', name: 'Mauritania', flag: '🇲🇷', phoneCode: '+222' },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺', phoneCode: '+230' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', phoneCode: '+52' },
  { code: 'FM', name: 'Micronesia', flag: '🇫🇲', phoneCode: '+691' },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩', phoneCode: '+373' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨', phoneCode: '+377' },
  { code: 'MN', name: 'Mongolia', flag: '🇲🇳', phoneCode: '+976' },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪', phoneCode: '+382' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', phoneCode: '+212' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', phoneCode: '+258' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', phoneCode: '+95' },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦', phoneCode: '+264' },
  { code: 'NR', name: 'Nauru', flag: '🇳🇷', phoneCode: '+674' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', phoneCode: '+977' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', phoneCode: '+31' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', phoneCode: '+64' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', phoneCode: '+505' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', phoneCode: '+227' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', phoneCode: '+234' },
  { code: 'KP', name: 'North Korea', flag: '🇰🇵', phoneCode: '+850' },
  { code: 'MK', name: 'North Macedonia', flag: '🇲🇰', phoneCode: '+389' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', phoneCode: '+47' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', phoneCode: '+968' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', phoneCode: '+92' },
  { code: 'PW', name: 'Palau', flag: '🇵🇼', phoneCode: '+680' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦', phoneCode: '+507' },
  { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬', phoneCode: '+675' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', phoneCode: '+595' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', phoneCode: '+51' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', phoneCode: '+63' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', phoneCode: '+48' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', phoneCode: '+351' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', phoneCode: '+974' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', phoneCode: '+40' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', phoneCode: '+7' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', phoneCode: '+250' },
  { code: 'KN', name: 'Saint Kitts and Nevis', flag: '🇰🇳', phoneCode: '+1' },
  { code: 'LC', name: 'Saint Lucia', flag: '🇱🇨', phoneCode: '+1' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', flag: '🇻🇨', phoneCode: '+1' },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸', phoneCode: '+685' },
  { code: 'SM', name: 'San Marino', flag: '🇸🇲', phoneCode: '+378' },
  { code: 'ST', name: 'Sao Tome and Principe', flag: '🇸🇹', phoneCode: '+239' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', phoneCode: '+966' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', phoneCode: '+221' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸', phoneCode: '+381' },
  { code: 'SC', name: 'Seychelles', flag: '🇸🇨', phoneCode: '+248' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', phoneCode: '+232' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', phoneCode: '+65' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', phoneCode: '+421' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', phoneCode: '+386' },
  { code: 'SB', name: 'Solomon Islands', flag: '🇸🇧', phoneCode: '+677' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴', phoneCode: '+252' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', phoneCode: '+27' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', phoneCode: '+82' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸', phoneCode: '+211' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', phoneCode: '+34' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', phoneCode: '+94' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩', phoneCode: '+249' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷', phoneCode: '+597' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', phoneCode: '+46' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', phoneCode: '+41' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾', phoneCode: '+963' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', phoneCode: '+886' },
  { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯', phoneCode: '+992' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', phoneCode: '+255' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', phoneCode: '+66' },
  { code: 'TL', name: 'Timor-Leste', flag: '🇹🇱', phoneCode: '+670' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', phoneCode: '+228' },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴', phoneCode: '+676' },
  { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹', phoneCode: '+1' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', phoneCode: '+216' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', phoneCode: '+90' },
  { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲', phoneCode: '+993' },
  { code: 'TV', name: 'Tuvalu', flag: '🇹🇻', phoneCode: '+688' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', phoneCode: '+256' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', phoneCode: '+380' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', phoneCode: '+971' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', phoneCode: '+598' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', phoneCode: '+998' },
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺', phoneCode: '+678' },
  { code: 'VA', name: 'Vatican City', flag: '🇻🇦', phoneCode: '+379' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', phoneCode: '+58' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', phoneCode: '+84' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪', phoneCode: '+967' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲', phoneCode: '+260' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', phoneCode: '+263' },
]

interface CountrySelectorProps {
  value?: string
  onChange: (country: Country) => void
  error?: string
  placeholder?: string
  className?: string
}

export default function CountrySelector({
  value,
  onChange,
  error,
  placeholder = 'Select country',
  className = '',
}: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [recentCountries, setRecentCountries] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedCountry = COUNTRIES.find((c) => c.name === value || c.code === value)

  // Filter countries based on search
  const filteredCountries = COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.phoneCode.includes(searchQuery)
  )

  // Popular countries
  const popularCountries = COUNTRIES.slice(0, 4)

  // Get recent countries
  const recentCountryObjects = recentCountries
    .map((code) => COUNTRIES.find((c) => c.code === code))
    .filter(Boolean) as Country[]

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Load recent countries from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('recentCountries')
    if (recent) {
      setRecentCountries(JSON.parse(recent))
    }
  }, [])

  const handleSelect = (country: Country) => {
    onChange(country)
    setIsOpen(false)
    setSearchQuery('')

    // Update recent countries
    const updated = [country.code, ...recentCountries.filter((c) => c !== country.code)].slice(0, 3)
    setRecentCountries(updated)
    localStorage.setItem('recentCountries', JSON.stringify(updated))
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-lg border px-4 py-3 text-left transition focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
            : 'border-slate-300 focus:border-orange-500 focus:ring-orange-200'
        } ${isOpen ? 'ring-2 ring-orange-200' : ''}`}
      >
        <div className="flex items-center justify-between">
          {selectedCountry ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedCountry.flag}</span>
              <span className="font-medium text-slate-900">{selectedCountry.name}</span>
            </div>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
          <svg
            className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
          >
            {/* Search */}
            <div className="border-b border-slate-200 p-3">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search countries..."
                  className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-4 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  autoFocus
                />
              </div>
            </div>

            {/* Countries List */}
            <div className="max-h-64 overflow-y-auto">
              {/* Recent Countries */}
              {!searchQuery && recentCountryObjects.length > 0 && (
                <div className="border-b border-slate-100">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500">Recently Used</div>
                  {recentCountryObjects.map((country) => (
                    <CountryOption key={country.code} country={country} onSelect={handleSelect} />
                  ))}
                </div>
              )}

              {/* Popular Countries */}
              {!searchQuery && (
                <div className="border-b border-slate-100">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500">Popular</div>
                  {popularCountries.map((country) => (
                    <CountryOption key={country.code} country={country} onSelect={handleSelect} />
                  ))}
                </div>
              )}

              {/* All Countries */}
              {searchQuery && (
                <div className="px-3 py-2 text-xs font-semibold text-slate-500">
                  {filteredCountries.length} {filteredCountries.length === 1 ? 'result' : 'results'}
                </div>
              )}
              {filteredCountries.length > 0 ? (
                filteredCountries
                  .filter((country) => !searchQuery || !popularCountries.includes(country))
                  .map((country) => (
                    <CountryOption key={country.code} country={country} onSelect={handleSelect} />
                  ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-slate-500">No countries found</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CountryOption({ country, onSelect }: { country: Country; onSelect: (country: Country) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(country)}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-orange-50"
    >
      <span className="text-2xl">{country.flag}</span>
      <div className="flex-1">
        <div className="font-medium text-slate-900">{country.name}</div>
        <div className="text-xs text-slate-500">{country.phoneCode}</div>
      </div>
    </button>
  )
}

export { COUNTRIES }
