'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, DollarSign, Wrench, Package, Loader2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface QuoteBuilderDrawerProps {
  sessionId: string
  mechanicId: string
  onClose: () => void
}

export default function QuoteBuilderDrawer({
  sessionId,
  mechanicId,
  onClose
}: QuoteBuilderDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    description: '',
    laborHours: '',
    laborRate: '85',
    partsDescription: '',
    partsCost: '',
    notes: ''
  })

  const laborCost = Number(formData.laborHours) * Number(formData.laborRate) || 0
  const partsCost = Number(formData.partsCost) || 0
  const subtotal = laborCost + partsCost
  const tax = subtotal * 0.13 // 13% tax
  const total = subtotal + tax

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.description.trim()) {
      toast.error('Please add a description')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/mechanic/quotes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          mechanic_id: mechanicId,
          description: formData.description,
          labor_hours: Number(formData.laborHours) || 0,
          labor_rate: Number(formData.laborRate) || 0,
          parts_description: formData.partsDescription,
          parts_cost_cents: Math.round(partsCost * 100),
          notes: formData.notes,
          total_cost_cents: Math.round(total * 100)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create quote')
      }

      setSuccess(true)
      toast.success('Quote sent successfully!')

      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Error creating quote:', error)
      toast.error('Failed to send quote. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full sm:max-w-2xl max-h-[90vh] sm:rounded-2xl rounded-t-2xl border-t sm:border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="border-b border-slate-700 bg-slate-900/95 backdrop-blur-md p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Create Quote</h2>
                <p className="text-sm text-slate-400">Send estimate to customer</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-[env(safe-area-inset-bottom)]">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-white">Quote Sent!</h3>
                <p className="text-sm text-slate-400 mt-1">Customer will be notified</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Work Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the repair work to be performed..."
                  rows={3}
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                />
              </div>

              {/* Labor */}
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-4">
                <div className="flex items-center gap-2 text-slate-200">
                  <Wrench className="h-5 w-5 text-orange-400" />
                  <h3 className="font-semibold">Labor</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.laborHours}
                      onChange={(e) => setFormData(prev => ({ ...prev, laborHours: e.target.value }))}
                      placeholder="2.5"
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Rate/Hour</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        step="5"
                        min="0"
                        value={formData.laborRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, laborRate: e.target.value }))}
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 pl-7 pr-3 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                      />
                    </div>
                  </div>
                </div>
                {laborCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Labor Subtotal</span>
                    <span className="font-semibold text-white">${laborCost.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Parts */}
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-4">
                <div className="flex items-center gap-2 text-slate-200">
                  <Package className="h-5 w-5 text-blue-400" />
                  <h3 className="font-semibold">Parts</h3>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Parts Description</label>
                  <textarea
                    value={formData.partsDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, partsDescription: e.target.value }))}
                    placeholder="List parts needed (e.g., brake pads, rotors, oil filter...)"
                    rows={2}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Parts Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.partsCost}
                      onChange={(e) => setFormData(prev => ({ ...prev, partsCost: e.target.value }))}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 pl-7 pr-3 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Warranty info, timeline, special considerations..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                />
              </div>

              {/* Total Summary */}
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Subtotal</span>
                  <span className="text-white">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Tax (13%)</span>
                  <span className="text-white">${tax.toFixed(2)}</span>
                </div>
                <div className="h-px bg-slate-600" />
                <div className="flex justify-between">
                  <span className="font-semibold text-white">Total</span>
                  <span className="text-2xl font-bold text-green-400">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 sticky bottom-0 bg-slate-950/95 backdrop-blur-md -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.description.trim()}
                  className="flex-1 rounded-lg bg-gradient-to-r from-green-500 to-green-600 py-3 text-sm font-semibold text-white hover:from-green-600 hover:to-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Quote'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
