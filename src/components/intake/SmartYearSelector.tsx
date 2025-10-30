'use client'

import { useMemo } from 'react'

interface SmartYearSelectorProps {
  value: string
  onChange: (year: string) => void
  label?: string
  className?: string
  required?: boolean
}

export default function SmartYearSelector({
  value,
  onChange,
  label = 'Year',
  className = '',
  required = false
}: SmartYearSelectorProps) {
  const yearGroups = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const nextYear = currentYear + 1

    return [
      {
        label: 'Recent (Last 5 Years)',
        years: Array.from({ length: 5 }, (_, i) => nextYear - i)
      },
      {
        label: '2015-2019',
        years: [2019, 2018, 2017, 2016, 2015]
      },
      {
        label: '2010-2014',
        years: [2014, 2013, 2012, 2011, 2010]
      },
      {
        label: '2005-2009',
        years: [2009, 2008, 2007, 2006, 2005]
      },
      {
        label: '2000-2004',
        years: [2004, 2003, 2002, 2001, 2000]
      },
      {
        label: 'Older (1990-1999)',
        years: Array.from({ length: 10 }, (_, i) => 1999 - i)
      },
      {
        label: 'Classic (Before 1990)',
        years: Array.from({ length: 30 }, (_, i) => 1989 - i)
      }
    ]
  }, [])

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-200 mb-2">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full min-h-[44px] px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-2xl text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all touch-manipulation text-base"
      >
        <option value="" disabled>
          Select year
        </option>

        {yearGroups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.years.map((year) => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}
