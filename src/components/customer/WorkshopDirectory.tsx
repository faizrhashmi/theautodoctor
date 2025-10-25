'use client'

import { useState, useEffect } from 'react'

type Workshop = {
  workshop_id: string
  workshop_name: string
  workshop_email: string
  workshop_status: string
  total_mechanics: number
  available_mechanics: number
  avg_rating: number | null
  total_sessions: number
  created_at: string
}

type WorkshopDirectoryProps = {
  onSelectWorkshop?: (workshopId: string, workshopName: string) => void
  selectedWorkshopId?: string | null
}

export default function WorkshopDirectory({
  onSelectWorkshop,
  selectedWorkshopId = null,
}: WorkshopDirectoryProps) {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWorkshops()
  }, [])

  async function fetchWorkshops() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/workshops/directory?limit=50')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch workshops')
      }

      setWorkshops(data.workshops || [])
    } catch (err) {
      console.error('Error fetching workshops:', err)
      setError(err instanceof Error ? err.message : 'Failed to load workshops')
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(workshop: Workshop) {
    if (onSelectWorkshop) {
      onSelectWorkshop(workshop.workshop_id, workshop.workshop_name)
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center text-gray-500">
            <div className="mb-2">Loading workshops...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="text-center text-red-600">
          <p className="font-medium">Error loading workshops</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={fetchWorkshops}
            className="mt-3 rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (workshops.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="text-center text-gray-500">
          <p className="font-medium">No workshops available</p>
          <p className="mt-1 text-sm">Check back later for available workshops</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Select a Workshop</h3>
        <p className="mt-1 text-sm text-gray-600">
          Choose a preferred workshop or select &quot;Any Available&quot; for the quickest response
        </p>
      </div>

      {/* "Any Available" Option */}
      <div
        onClick={() => onSelectWorkshop && onSelectWorkshop('', 'Any Available Mechanic')}
        className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-blue-500 hover:shadow-md ${
          selectedWorkshopId === ''
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900">🚀 Any Available Mechanic</h4>
            <p className="mt-1 text-sm text-gray-600">
              Get matched with the first available mechanic for fastest service
            </p>
          </div>
          {selectedWorkshopId === '' && (
            <div className="ml-4 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600">
              <svg
                className="h-4 w-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Workshop List */}
      <div className="grid gap-4 sm:grid-cols-2">
        {workshops.map((workshop) => (
          <div
            key={workshop.workshop_id}
            onClick={() => handleSelect(workshop)}
            className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-blue-500 hover:shadow-md ${
              selectedWorkshopId === workshop.workshop_id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{workshop.workshop_name}</h4>

                {/* Workshop Stats */}
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span className="font-medium">
                      {workshop.available_mechanics} mechanics available
                    </span>
                    <span className="mx-2">•</span>
                    <span>{workshop.total_sessions} sessions completed</span>
                  </div>

                  {workshop.avg_rating && (
                    <div className="flex items-center">
                      <span className="text-yellow-500">★</span>
                      <span className="ml-1">
                        {workshop.avg_rating.toFixed(1)} rating
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedWorkshopId === workshop.workshop_id && (
                <div className="ml-4 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600">
                  <svg
                    className="h-4 w-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Help Text */}
      <div className="mt-4 rounded-lg bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          <strong>Workshop Selection:</strong> When you select a workshop, your request
          will be routed to their mechanics first. This helps support local businesses
          and may provide faster service if you&apos;ve worked with them before.
        </p>
      </div>
    </div>
  )
}
