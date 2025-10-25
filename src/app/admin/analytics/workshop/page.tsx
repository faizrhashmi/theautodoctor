'use client'

import React, { useState } from 'react'
import { AdminWorkshopDashboard } from '@/components/analytics/AdminWorkshopDashboard'
import { WorkshopHealthScorecard } from '@/components/analytics/WorkshopHealthScorecard'
import { BetaProgramTracker } from '@/components/analytics/BetaProgramTracker'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffect } from 'react'
import { BarChart3, Building2, Trophy } from 'lucide-react'

export default function AdminAnalyticsPage() {
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(null)
  const [workshopHealthData, setWorkshopHealthData] = useState<any>(null)
  const [betaProgramData, setBetaProgramData] = useState<any>(null)
  const [loadingWorkshop, setLoadingWorkshop] = useState(false)
  const [loadingBeta, setLoadingBeta] = useState(false)

  // Fetch beta program data on mount
  useEffect(() => {
    fetchBetaProgramData()
  }, [])

  const fetchBetaProgramData = async () => {
    setLoadingBeta(true)
    try {
      const response = await fetch('/api/admin/analytics/beta-program')
      if (response.ok) {
        const result = await response.json()
        setBetaProgramData(result.data)
      }
    } catch (error) {
      console.error('Error fetching beta program data:', error)
    } finally {
      setLoadingBeta(false)
    }
  }

  const fetchWorkshopHealth = async (workshopId: string) => {
    setLoadingWorkshop(true)
    try {
      const response = await fetch(`/api/admin/analytics/workshop-health/${workshopId}`)
      if (response.ok) {
        const result = await response.json()
        setWorkshopHealthData(result.data)
      }
    } catch (error) {
      console.error('Error fetching workshop health:', error)
    } finally {
      setLoadingWorkshop(false)
    }
  }

  const handleWorkshopSelect = (workshopId: string) => {
    setSelectedWorkshopId(workshopId)
    fetchWorkshopHealth(workshopId)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Workshop Analytics</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive analytics for workshop onboarding, health monitoring, and beta program tracking
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Workshop Health
            </TabsTrigger>
            <TabsTrigger value="beta" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Beta Program
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AdminWorkshopDashboard />
          </TabsContent>

          <TabsContent value="health" className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Select a Workshop to View Health Details
              </h2>

              {/* Workshop selector */}
              <div className="mb-6">
                <select
                  value={selectedWorkshopId || ''}
                  onChange={(e) => handleWorkshopSelect(e.target.value)}
                  className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a workshop...</option>
                  {/* This would be populated from an API call */}
                  <option value="workshop-1">Sample Workshop 1</option>
                  <option value="workshop-2">Sample Workshop 2</option>
                  <option value="workshop-3">Sample Workshop 3</option>
                </select>
              </div>

              {loadingWorkshop && (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              )}

              {workshopHealthData && !loadingWorkshop && (
                <WorkshopHealthScorecard data={workshopHealthData} />
              )}

              {!selectedWorkshopId && !loadingWorkshop && (
                <div className="text-center py-12 text-gray-500">
                  Select a workshop from the dropdown to view its health scorecard
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="beta" className="space-y-6">
            {loadingBeta && (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {betaProgramData && !loadingBeta && (
              <BetaProgramTracker data={betaProgramData} />
            )}

            {!betaProgramData && !loadingBeta && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">
                  Failed to load beta program data. Please refresh the page.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}