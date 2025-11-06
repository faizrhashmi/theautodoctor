'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Car, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { decodeVIN, type VINDecodedData } from '@/lib/tools/vinDecoder'
import toast from 'react-hot-toast'

interface VINDecoderModalProps {
  onClose: () => void
  onInsert: (text: string) => void
}

export default function VINDecoderModal({ onClose, onInsert }: VINDecoderModalProps) {
  const [vin, setVin] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VINDecodedData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDecode = async () => {
    if (vin.length !== 17) {
      setError('VIN must be exactly 17 characters')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const decoded = await decodeVIN(vin.toUpperCase())
      if (decoded) {
        setResult(decoded)
      } else {
        setError('Could not decode VIN. Please verify and try again.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to decode VIN')
    } finally {
      setLoading(false)
    }
  }

  const handleInsertToChat = () => {
    if (!result) return

    const message = `🚗 Vehicle Details (VIN: ${vin}):\n\n` +
      `Make: ${result.make}\n` +
      `Model: ${result.model}\n` +
      `Year: ${result.year}` +
      (result.trim ? `\nTrim: ${result.trim}` : '') +
      (result.engineSize ? `\nEngine: ${result.engineSize}` : '') +
      (result.fuelType ? `\nFuel: ${result.fuelType}` : '') +
      (result.transmission ? `\nTransmission: ${result.transmission}` : '') +
      (result.driveType ? `\nDrive Type: ${result.driveType}` : '')

    onInsert(message)
    toast.success('Vehicle info inserted')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%', opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: '100%', opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border-t sm:border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-slate-700 bg-slate-900/95 backdrop-blur-md p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <Car className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">VIN Decoder</h2>
                <p className="text-sm text-slate-400">Quick vehicle lookup</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6 pb-[env(safe-area-inset-bottom)]">
          {/* VIN Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Vehicle Identification Number (VIN)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={vin}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '')
                  setVin(value.slice(0, 17))
                  setError(null)
                }}
                placeholder="Enter 17-character VIN"
                maxLength={17}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono uppercase"
              />
              <button
                onClick={handleDecode}
                disabled={loading || vin.length !== 17}
                className="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white hover:from-purple-600 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Decode'
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {vin.length}/17 characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Decoded Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="rounded-lg border border-green-400/30 bg-green-500/10 p-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-200 font-medium">VIN decoded successfully</p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Car className="h-4 w-4 text-purple-400" />
                  Vehicle Information
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Make</span>
                    <span className="text-white font-medium">{result.make}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Model</span>
                    <span className="text-white font-medium">{result.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Year</span>
                    <span className="text-white font-medium">{result.year}</span>
                  </div>

                  {result.trim && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Trim</span>
                      <span className="text-white font-medium">{result.trim}</span>
                    </div>
                  )}

                  {result.engineSize && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Engine</span>
                      <span className="text-white font-medium">{result.engineSize}</span>
                    </div>
                  )}

                  {result.fuelType && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fuel Type</span>
                      <span className="text-white font-medium">{result.fuelType}</span>
                    </div>
                  )}

                  {result.transmission && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Transmission</span>
                      <span className="text-white font-medium">{result.transmission}</span>
                    </div>
                  )}

                  {result.driveType && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Drive Type</span>
                      <span className="text-white font-medium">{result.driveType}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleInsertToChat}
                className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 py-3 text-sm font-semibold text-white hover:from-purple-600 hover:to-purple-700 transition flex items-center justify-center gap-2"
              >
                Insert into Chat
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </motion.div>
          )}

          {/* Info Box */}
          <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-3">
            <p className="text-xs text-blue-200">
              <strong>Tip:</strong> VIN is typically found on the driver's side dashboard, door jamb, or vehicle registration documents.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
