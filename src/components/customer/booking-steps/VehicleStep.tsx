'use client'

/**
 * Step 1: Vehicle Selection
 * Shows grid of customer's vehicles + "Add Vehicle" option
 */

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Car, Plus, Check, AlertCircle, X, Loader2, Crown } from 'lucide-react'
import SmartYearSelector from '@/components/intake/SmartYearSelector'
import SmartBrandSelector from '@/components/intake/SmartBrandSelector'

interface VehicleStepProps {
  wizardData: any
  onComplete: (data: any) => void
  onBack: () => void
}

interface Vehicle {
  id: string
  year: number
  make: string
  model: string
  plate?: string
  vin?: string
  mileage?: number
  color?: string
  nickname?: string
}

export default function VehicleStep({ wizardData, onComplete }: VehicleStepProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(wizardData.vehicleId)
  const [isAdviceOnly, setIsAdviceOnly] = useState<boolean>(wizardData.isAdviceOnly || false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/customer/vehicles')
      if (!response.ok) throw new Error('Failed to fetch vehicles')

      const data = await response.json()
      setVehicles(data.vehicles || [])
    } catch (err: any) {
      console.error('Error fetching vehicles:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicleId(vehicle.id)
    setIsAdviceOnly(false) // Clear advice-only flag when selecting a vehicle
    console.log('[VehicleStep] Selected vehicle:', vehicle)
    onComplete({
      vehicleId: vehicle.id,
      vehicleName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      isAdviceOnly: false, // Clear the flag
      // Pass full vehicle data - only year, make, model are mandatory
      vehicleData: {
        year: vehicle.year?.toString() || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        vin: vehicle.vin || '',  // Optional
        license_plate: vehicle.plate || '',  // Optional
        odometer: vehicle.mileage?.toString() || '',  // Optional
      },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto mb-4 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400">Loading your vehicles...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-400" />
          <div>
            <h3 className="font-semibold text-red-200">Error Loading Vehicles</h3>
            <p className="text-sm text-red-300 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const handleSkip = () => {
    setSelectedVehicleId(null) // Clear vehicle selection
    setIsAdviceOnly(true) // Set advice-only flag
    console.log('[VehicleStep] Skip - Just Advice selected')
    onComplete({
      vehicleId: null,
      vehicleName: 'General Advice (No Vehicle)',
      vehicleData: null,
      isAdviceOnly: true, // Flag for later steps to handle advice-only flow
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">Select Your Vehicle</h3>
        <p className="text-slate-400">Choose which vehicle needs service, or skip if you just need advice</p>
      </div>

      {/* Specialist Context Banner */}
      {wizardData.requestedBrand && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-200">
              🏆 Looking for a <strong>{wizardData.requestedBrand}</strong> specialist?
              {' '}Select your {wizardData.requestedBrand} vehicle below, or click{' '}
              <strong>"Skip - Just Advice"</strong> if you don't own one yet.
            </p>
          </div>
        </div>
      )}

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {vehicles.map((vehicle) => {
          const isSelected = selectedVehicleId === vehicle.id
          return (
            <button
              key={vehicle.id}
              onClick={() => handleVehicleSelect(vehicle)}
              className={`
                relative rounded-lg border p-4 transition-all text-left
                ${isSelected
                  ? 'border-orange-500 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent shadow-lg shadow-orange-500/20'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800/80'
                }
              `}
            >
              {/* Car Icon */}
              <div className={`
                h-10 w-10 rounded-lg flex items-center justify-center mb-3
                ${isSelected ? 'bg-orange-500/20' : 'bg-slate-700/50'}
              `}>
                <Car className={`h-5 w-5 ${isSelected ? 'text-orange-400' : 'text-slate-400'}`} />
              </div>

              {/* Vehicle Info */}
              <div>
                <h4 className="font-semibold text-white text-sm mb-1">
                  {vehicle.year} {vehicle.make}
                </h4>
                <p className="text-xs text-slate-400 mb-1">{vehicle.model}</p>
                {vehicle.plate && (
                  <p className="text-xs text-slate-500">
                    {vehicle.plate}
                  </p>
                )}
              </div>

              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}
            </button>
          )
        })}

        {/* Skip Vehicle Card - Just need advice */}
        <button
          onClick={handleSkip}
          className={`
            relative rounded-lg border-2 border-dashed p-4 transition-all
            ${isAdviceOnly
              ? 'border-blue-500 bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent shadow-lg shadow-blue-500/20'
              : 'border-blue-700/50 bg-blue-900/20 hover:border-blue-500/50 hover:bg-blue-900/30'
            }
          `}
        >
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className={`
              h-10 w-10 rounded-lg flex items-center justify-center mb-3
              ${isAdviceOnly ? 'bg-blue-500/30' : 'bg-blue-700/30'}
            `}>
              <AlertCircle className={`h-5 w-5 ${isAdviceOnly ? 'text-blue-300' : 'text-blue-400'}`} />
            </div>
            <h4 className="font-semibold text-white text-sm mb-1">Skip - Just Advice</h4>
            <p className="text-xs text-blue-300">General consultation</p>
          </div>

          {/* Selected Indicator */}
          {isAdviceOnly && (
            <div className="absolute top-2 right-2">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            </div>
          )}
        </button>

        {/* Add Vehicle Card */}
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/30 hover:border-orange-500/50 hover:bg-slate-800/50 p-4 transition-all"
        >
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="h-10 w-10 rounded-lg bg-slate-700/50 flex items-center justify-center mb-3">
              <Plus className="h-5 w-5 text-slate-400" />
            </div>
            <h4 className="font-semibold text-white text-sm mb-1">Add Vehicle</h4>
            <p className="text-xs text-slate-400">Quick add</p>
          </div>
        </button>
      </div>

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={(newVehicle) => {
          setVehicles([...vehicles, newVehicle])
          setShowAddModal(false)
          handleVehicleSelect(newVehicle)
        }}
      />
    </div>
  )
}

// Add Vehicle Modal Component (Full version from SessionWizard)
function AddVehicleModal({ isOpen, onClose, onSuccess }: any) {
  const [mounted, setMounted] = useState(false)
  const [newVehicle, setNewVehicle] = useState({
    year: '',
    make: '',
    model: '',
    vin: '',
  })
  const [addingVehicle, setAddingVehicle] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleSubmit = async () => {
    setAddingVehicle(true)
    setError(null)

    try {
      const response = await fetch('/api/customer/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVehicle),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add vehicle')
      }

      const data = await response.json()
      onSuccess(data.vehicle)
      setNewVehicle({ year: '', make: '', model: '', vin: '' })
    } catch (err: any) {
      console.error('Error adding vehicle:', err)
      setError(err.message)
    } finally {
      setAddingVehicle(false)
    }
  }

  if (!mounted || !isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ margin: 0 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-xl sm:rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Add Vehicle</h3>
            <p className="text-xs text-slate-400 mt-0.5">Quick add without leaving</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700 transition-all hover:rotate-90 duration-200"
            aria-label="Close modal"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-4 space-y-3">
          {/* Year Selector */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-white mb-1.5">
              Year <span className="text-orange-400">*</span>
            </label>
            <SmartYearSelector
              value={newVehicle.year}
              onChange={(year) => setNewVehicle(prev => ({ ...prev, year }))}
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>

          {/* Make/Brand Selector */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-white mb-1.5">
              Make/Brand <span className="text-orange-400">*</span>
            </label>
            <SmartBrandSelector
              value={newVehicle.make}
              onChange={(make) => setNewVehicle(prev => ({ ...prev, make }))}
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>

          {/* Model Input */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-white mb-1.5">
              Model <span className="text-orange-400">*</span>
            </label>
            <input
              type="text"
              value={newVehicle.model}
              onChange={(e) => setNewVehicle(prev => ({ ...prev, model: e.target.value }))}
              placeholder="e.g., Camry, F-150, Model 3"
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>

          {/* VIN Input (Optional) */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-white mb-1.5">
              VIN <span className="text-slate-500 font-normal text-xs">(Optional)</span>
            </label>
            <input
              type="text"
              value={newVehicle.vin}
              onChange={(e) => setNewVehicle(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
              placeholder="17-character VIN"
              maxLength={17}
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono"
            />
          </div>

          {/* Helper Text */}
          <div className="flex items-start gap-2 p-2 sm:p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] sm:text-xs text-orange-200">
              This vehicle will be saved to your account and automatically selected for your session.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex gap-2 sm:gap-3 p-3 sm:p-4 border-t border-slate-700 bg-slate-800/50 sticky bottom-0">
          <button
            onClick={onClose}
            disabled={addingVehicle}
            className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={addingVehicle || !newVehicle.year || !newVehicle.make || !newVehicle.model}
            className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg shadow-orange-500/20 active:scale-95"
          >
            {addingVehicle ? (
              <>
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                <span className="text-xs sm:text-sm">Adding...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Add Vehicle</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
