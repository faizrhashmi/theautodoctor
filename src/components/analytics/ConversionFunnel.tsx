// Conversion Funnel Component for visualizing workshop signup flow
import React from 'react'
import { cn } from '@/lib/utils'
import { ArrowDown, CheckCircle, XCircle, Clock } from 'lucide-react'

export interface FunnelStage {
  name: string
  count: number
  percentage: number
  icon?: React.ReactNode
  color?: string
  dropoffCount?: number
  dropoffPercentage?: number
}

interface ConversionFunnelProps {
  stages: FunnelStage[]
  title?: string
  className?: string
  showDropoff?: boolean
  vertical?: boolean
}

export function ConversionFunnel({
  stages,
  title,
  className,
  showDropoff = true,
  vertical = false,
}: ConversionFunnelProps) {
  const getStageColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-indigo-500',
      'bg-purple-500',
      'bg-green-500',
    ]
    return colors[index % colors.length]
  }

  const getDropoffColor = (percentage: number) => {
    if (percentage < 10) return 'text-green-600'
    if (percentage < 30) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (vertical) {
    // Vertical funnel layout
    return (
      <div className={cn('bg-white rounded-lg shadow-sm p-6', className)}>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
        )}

        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div key={stage.name}>
              <div className="relative">
                <div
                  className={cn(
                    'flex items-center justify-between p-4 rounded-lg text-white',
                    stage.color || getStageColor(index)
                  )}
                  style={{
                    width: `${stage.percentage}%`,
                    minWidth: '200px',
                  }}
                >
                  <div className="flex items-center gap-3">
                    {stage.icon || <CheckCircle className="h-5 w-5" />}
                    <div>
                      <p className="font-semibold">{stage.name}</p>
                      <p className="text-sm opacity-90">
                        {stage.count.toLocaleString()} ({stage.percentage}%)
                      </p>
                    </div>
                  </div>
                </div>

                {showDropoff && stage.dropoffCount !== undefined && index < stages.length - 1 && (
                  <div className="flex items-center gap-2 ml-8 mt-2 mb-2">
                    <ArrowDown className="h-4 w-4 text-gray-400" />
                    <span
                      className={cn(
                        'text-sm font-medium',
                        getDropoffColor(stage.dropoffPercentage || 0)
                      )}
                    >
                      {stage.dropoffCount} dropped ({stage.dropoffPercentage}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Horizontal funnel layout
  return (
    <div className={cn('bg-white rounded-lg shadow-sm p-6', className)}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      )}

      <div className="flex items-center justify-between gap-4">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.name}>
            <div className="flex-1">
              <div
                className={cn(
                  'relative p-4 rounded-lg text-white text-center',
                  stage.color || getStageColor(index)
                )}
              >
                <div className="flex justify-center mb-2">
                  {stage.icon || <CheckCircle className="h-6 w-6" />}
                </div>
                <p className="font-semibold text-sm">{stage.name}</p>
                <p className="text-2xl font-bold mt-1">
                  {stage.count.toLocaleString()}
                </p>
                <p className="text-sm opacity-90">{stage.percentage}%</p>
              </div>

              {showDropoff && stage.dropoffCount !== undefined && (
                <div className="text-center mt-2">
                  <p
                    className={cn(
                      'text-xs font-medium',
                      getDropoffColor(stage.dropoffPercentage || 0)
                    )}
                  >
                    -({stage.dropoffCount}) {stage.dropoffPercentage}%
                  </p>
                </div>
              )}
            </div>

            {index < stages.length - 1 && (
              <ArrowDown className="h-5 w-5 text-gray-400 rotate-[-90deg]" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}