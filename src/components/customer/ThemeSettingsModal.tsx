'use client'

import { useState, useEffect } from 'react'
import { X, Check, Palette } from 'lucide-react'

interface ThemeSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  currentAccentColor?: string
  onSave?: (color: string) => void
}

const ACCENT_COLORS = [
  {
    id: 'orange',
    name: 'Orange (Default)',
    primary: '#f97316',
    secondary: '#fb923c',
    gradient: 'from-orange-500 to-orange-600',
    borderColor: 'border-orange-500',
    bgColor: 'bg-orange-500',
    hoverBg: 'hover:bg-orange-500/20',
    activeBorder: 'border-orange-400',
  },
  {
    id: 'blue',
    name: 'Ocean Blue',
    primary: '#3b82f6',
    secondary: '#60a5fa',
    gradient: 'from-blue-500 to-blue-600',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-500',
    hoverBg: 'hover:bg-blue-500/20',
    activeBorder: 'border-blue-400',
  },
  {
    id: 'green',
    name: 'Emerald Green',
    primary: '#10b981',
    secondary: '#34d399',
    gradient: 'from-green-500 to-green-600',
    borderColor: 'border-green-500',
    bgColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-500/20',
    activeBorder: 'border-green-400',
  },
  {
    id: 'red',
    name: 'Ruby Red',
    primary: '#ef4444',
    secondary: '#f87171',
    gradient: 'from-red-500 to-red-600',
    borderColor: 'border-red-500',
    bgColor: 'bg-red-500',
    hoverBg: 'hover:bg-red-500/20',
    activeBorder: 'border-red-400',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    primary: '#a855f7',
    secondary: '#c084fc',
    gradient: 'from-purple-500 to-purple-600',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-500',
    hoverBg: 'hover:bg-purple-500/20',
    activeBorder: 'border-purple-400',
  },
]

export default function ThemeSettingsModal({
  isOpen,
  onClose,
  currentAccentColor = 'orange',
  onSave,
}: ThemeSettingsModalProps) {
  const [selectedColor, setSelectedColor] = useState(currentAccentColor)
  const [saving, setSaving] = useState(false)

  // Reset selected color when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedColor(currentAccentColor)
    }
  }, [isOpen, currentAccentColor])

  async function handleSave() {
    setSaving(true)
    try {
      // Call API to save preference
      const response = await fetch('/api/customer/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accent_color: selectedColor }),
      })

      if (!response.ok) {
        throw new Error('Failed to save theme preference')
      }

      // Apply theme immediately via CSS variables
      const selectedColorConfig = ACCENT_COLORS.find(c => c.id === selectedColor)
      if (selectedColorConfig) {
        document.documentElement.style.setProperty('--accent-primary', selectedColorConfig.primary)
        document.documentElement.style.setProperty('--accent-secondary', selectedColorConfig.secondary)
      }

      // Notify parent component
      if (onSave) {
        onSave(selectedColor)
      }

      onClose()
    } catch (error) {
      console.error('Failed to save theme:', error)
      alert('Failed to save theme preference. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 border border-slate-700">
                <Palette className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Theme Settings</h2>
                <p className="text-sm text-slate-400">Customize your experience</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Accent Color</h3>
              <p className="text-sm text-slate-400">
                Choose your preferred accent color. This will be applied throughout your dashboard and session experience.
              </p>
            </div>

            {/* Color Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ACCENT_COLORS.map((color) => {
                const isSelected = selectedColor === color.id

                return (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color.id)}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `${color.borderColor} bg-slate-800/50`
                        : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Color Preview */}
                      <div className="relative">
                        <div
                          className={`w-16 h-16 rounded-lg bg-gradient-to-br ${color.gradient} shadow-lg`}
                        />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-white rounded-full p-1">
                              <Check className="h-6 w-6 text-slate-900" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Color Info */}
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-white mb-1">{color.name}</div>
                        <div className="text-xs text-slate-400">
                          Primary: {color.primary}
                        </div>
                        <div className="text-xs text-slate-400">
                          Secondary: {color.secondary}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Preview Section */}
            <div className="mt-8 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
              <h4 className="text-sm font-semibold text-white mb-4">Preview</h4>
              <div className="space-y-3">
                {/* Button Preview */}
                <div>
                  <p className="text-xs text-slate-400 mb-2">Button Style:</p>
                  <button
                    className={`px-4 py-2 bg-gradient-to-r ${
                      ACCENT_COLORS.find(c => c.id === selectedColor)?.gradient
                    } text-white rounded-lg font-semibold shadow-lg transition-all`}
                  >
                    Example Button
                  </button>
                </div>

                {/* Badge Preview */}
                <div>
                  <p className="text-xs text-slate-400 mb-2">Badge Style:</p>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                      ACCENT_COLORS.find(c => c.id === selectedColor)?.borderColor
                    } ${ACCENT_COLORS.find(c => c.id === selectedColor)?.bgColor}/20 text-white`}
                  >
                    Example Badge
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-2.5 bg-gradient-to-r ${
                ACCENT_COLORS.find(c => c.id === selectedColor)?.gradient
              } text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
