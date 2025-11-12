'use client'

/**
 * ServiceTypeStep - Step 1 of SchedulingPage
 * Allows customer to choose between Online or In-Person service
 * Mobile-first design with large tap targets
 */

import { useState } from 'react'
import { Video, Wrench, Check } from 'lucide-react'

const SERVICE_TYPES = [
  {
    id: 'online' as const,
    icon: Video,
    title: 'Online Diagnostic',
    features: [
      'Video or chat session',
      'From anywhere',
      'Instant connection',
      'Lower cost'
    ]
  },
  {
    id: 'in_person' as const,
    icon: Wrench,
    title: 'In-Person Visit',
    features: [
      'Visit mechanic\'s workshop',
      'Hands-on service',
      'Physical inspection',
      'Complete repairs'
    ]
  }
]

interface ServiceTypeStepProps {
  wizardData: { sessionType: 'online' | 'in_person' | null }
  onComplete: (data: { sessionType: 'online' | 'in_person' }) => void
  onBack?: () => void
}

export default function ServiceTypeStep({ wizardData, onComplete, onBack }: ServiceTypeStepProps) {
  const [selected, setSelected] = useState<'online' | 'in_person' | null>(wizardData.sessionType)

  const handleSelect = (type: 'online' | 'in_person') => {
    setSelected(type)
    onComplete({ sessionType: type })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Choose Service Type
        </h2>
        <p className="text-sm sm:text-base text-slate-400">
          How would you like to connect with your mechanic?
        </p>
      </div>

      {/* Service Type Cards */}
      <div className="space-y-3">
        {SERVICE_TYPES.map(type => {
          const Icon = type.icon
          const isSelected = selected === type.id

          return (
            <button
              key={type.id}
              onClick={() => handleSelect(type.id)}
              className={`
                w-full p-5 sm:p-6 rounded-lg border-2 transition-all text-left
                ${isSelected
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }
              `}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Icon className={`h-8 w-8 ${isSelected ? 'text-orange-400' : 'text-slate-400'}`} />
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {type.title}
                  </h3>
                </div>
                {isSelected && (
                  <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              <ul className="space-y-2">
                {type.features.map((feature, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>
    </div>
  )
}
