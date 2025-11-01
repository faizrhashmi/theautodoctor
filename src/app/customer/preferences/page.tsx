'use client'

import { useState, useEffect } from 'react'
import { Bell, Mail, MessageSquare, Phone, Settings, Star, X, Check, Smartphone } from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import Link from 'next/link'

interface CustomerPreferences {
  id: string
  email_notifications: boolean
  sms_notifications: boolean
  push_notifications: boolean
  marketing_emails: boolean
  preferred_session_type: string | null
  auto_accept_specialist_match: boolean
  favorite_mechanics: string[]
  blocked_mechanics: string[]
  preferred_contact_method: string
  preferred_contact_time: string | null
  maintenance_reminders_enabled: boolean
  reminder_frequency_days: number
}

interface FavoriteMechanic {
  mechanic_id: string
  mechanic_name: string
  mechanic_email: string
  total_sessions: number
  avg_rating: number
  specialties: string[]
}

export default function CustomerPreferencesPage() {
  const { isLoading: authLoading, user } = useAuthGuard({ requiredRole: 'customer' })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [preferences, setPreferences] = useState<CustomerPreferences | null>(null)
  const [favoriteMechanics, setFavoriteMechanics] = useState<FavoriteMechanic[]>([])

  useEffect(() => {
    if (user) {
      fetchPreferences()
    }
  }, [user])

  async function fetchPreferences() {
    try {
      const response = await fetch('/api/customer/preferences')
      if (!response.ok) {
        throw new Error('Failed to fetch preferences')
      }
      const data = await response.json()
      setPreferences(data.preferences)
      setFavoriteMechanics(data.favorite_mechanics || [])
    } catch (err) {
      console.error('Preferences error:', err)
      setError('Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!preferences) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/customer/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) {
        throw new Error('Failed to update preferences')
      }

      setSuccess('Preferences updated successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Update error:', err)
      setError('Failed to update preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function updatePreference(key: keyof CustomerPreferences, value: any) {
    if (!preferences) return
    setPreferences({ ...preferences, [key]: value })
  }

  function removeFavoriteMechanic(mechanicId: string) {
    if (!preferences) return
    const updated = preferences.favorite_mechanics.filter(id => id !== mechanicId)
    setPreferences({ ...preferences, favorite_mechanics: updated })
    setFavoriteMechanics(favoriteMechanics.filter(m => m.mechanic_id !== mechanicId))
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-slate-300">
            {authLoading ? 'Verifying authentication...' : 'Loading preferences...'}
          </p>
        </div>
      </div>
    )
  }

  if (!user || !preferences) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-orange-400" />
            <h1 className="text-3xl font-bold text-white">Preferences</h1>
          </div>
          <p className="text-slate-400">Customize your experience and notification settings</p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300 flex items-center gap-2">
            <Check className="h-5 w-5" />
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* Notification Preferences */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="h-6 w-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Notifications</h2>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900/70 transition">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-white font-medium">Email Notifications</p>
                    <p className="text-sm text-slate-400">Session updates and recommendations</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.email_notifications}
                  onChange={(e) => updatePreference('email_notifications', e.target.checked)}
                  className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-2 focus:ring-orange-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900/70 transition">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-white font-medium">SMS Notifications</p>
                    <p className="text-sm text-slate-400">Urgent session alerts via text</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.sms_notifications}
                  onChange={(e) => updatePreference('sms_notifications', e.target.checked)}
                  className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-2 focus:ring-orange-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900/70 transition">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-white font-medium">Push Notifications</p>
                    <p className="text-sm text-slate-400">In-app notifications</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.push_notifications}
                  onChange={(e) => updatePreference('push_notifications', e.target.checked)}
                  className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-2 focus:ring-orange-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900/70 transition">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-white font-medium">Marketing Emails</p>
                    <p className="text-sm text-slate-400">Promotions and special offers</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.marketing_emails}
                  onChange={(e) => updatePreference('marketing_emails', e.target.checked)}
                  className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-2 focus:ring-orange-500"
                />
              </label>
            </div>
          </div>

          {/* Session Preferences */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="h-6 w-6 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">Session Preferences</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Preferred Session Type
                </label>
                <select
                  value={preferences.preferred_session_type || ''}
                  onChange={(e) => updatePreference('preferred_session_type', e.target.value || null)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">No preference</option>
                  <option value="chat">Quick Chat</option>
                  <option value="video">Video Session</option>
                  <option value="diagnostic">Full Diagnostic</option>
                </select>
              </div>

              <label className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900/70 transition">
                <div>
                  <p className="text-white font-medium">Auto-accept Specialist Matches</p>
                  <p className="text-sm text-slate-400">Automatically accept brand specialist recommendations</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.auto_accept_specialist_match}
                  onChange={(e) => updatePreference('auto_accept_specialist_match', e.target.checked)}
                  className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-2 focus:ring-orange-500"
                />
              </label>
            </div>
          </div>

          {/* Maintenance Reminders */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="h-6 w-6 text-green-400" />
              <h2 className="text-xl font-semibold text-white">Maintenance Reminders</h2>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900/70 transition">
                <div>
                  <p className="text-white font-medium">Enable Maintenance Reminders</p>
                  <p className="text-sm text-slate-400">Get personalized service recommendations</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.maintenance_reminders_enabled}
                  onChange={(e) => updatePreference('maintenance_reminders_enabled', e.target.checked)}
                  className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-2 focus:ring-orange-500"
                />
              </label>

              {preferences.maintenance_reminders_enabled && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Reminder Frequency (days)
                  </label>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={preferences.reminder_frequency_days}
                    onChange={(e) => updatePreference('reminder_frequency_days', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="mt-1 text-xs text-slate-400">Check for new recommendations every {preferences.reminder_frequency_days} days</p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Preferences */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Phone className="h-6 w-6 text-yellow-400" />
              <h2 className="text-xl font-semibold text-white">Contact Preferences</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Preferred Contact Method
                </label>
                <select
                  value={preferences.preferred_contact_method}
                  onChange={(e) => updatePreference('preferred_contact_method', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="phone">Phone</option>
                  <option value="app">In-App</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Preferred Contact Time
                </label>
                <input
                  type="text"
                  value={preferences.preferred_contact_time || ''}
                  onChange={(e) => updatePreference('preferred_contact_time', e.target.value || null)}
                  placeholder="e.g., 9am-5pm EST"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Favorite Mechanics */}
          {favoriteMechanics.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Star className="h-6 w-6 text-yellow-400" />
                <h2 className="text-xl font-semibold text-white">Favorite Mechanics</h2>
              </div>

              <div className="space-y-3">
                {favoriteMechanics.map((mechanic) => (
                  <div
                    key={mechanic.mechanic_id}
                    className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">{mechanic.mechanic_name}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                        <span>{mechanic.total_sessions} sessions</span>
                        {mechanic.avg_rating && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                            {mechanic.avg_rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {mechanic.specialties && mechanic.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {mechanic.specialties.slice(0, 3).map((spec, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeFavoriteMechanic(mechanic.mechanic_id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Remove from favorites"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
            <Link
              href="/customer/dashboard"
              className="px-6 py-4 border border-slate-600 text-slate-300 rounded-xl font-semibold hover:bg-slate-800 transition"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
