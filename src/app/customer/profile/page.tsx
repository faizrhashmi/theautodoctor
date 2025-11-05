'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Key, Bell, CreditCard, TrendingUp } from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { apiRouteFor } from '@/lib/routes'

interface ProfileData {
  full_name: string
  email: string
  phone: string
  city: string
}

export default function CustomerProfilePage() {
  // ✅ Auth guard - ensures user is authenticated as customer
  const { isLoading: authLoading, user } = useAuthGuard({ requiredRole: 'customer' })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    email: '',
    phone: '',
    city: '',
  })
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [restoringOnboarding, setRestoringOnboarding] = useState(false)

  useEffect(() => {
    if (user) {
      fetchProfile()
      fetchOnboardingStatus()
    }
  }, [user])

  async function fetchProfile() {
    try {
      const response = await fetch('/api/customer/profile')
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      const data = await response.json()
      setProfile({
        full_name: data.profile.full_name || '',
        email: data.profile.email || '',
        phone: data.profile.phone || '',
        city: data.profile.city || '',
      })
    } catch (err) {
      console.error('Profile error:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/customer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Update error:', err)
      setError('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function fetchOnboardingStatus() {
    try {
      const response = await fetch(apiRouteFor.onboardingProgress())
      if (!response.ok) {
        throw new Error('Failed to fetch onboarding status')
      }
      const data = await response.json()
      setOnboardingDismissed(data.dismissed || false)
    } catch (err) {
      console.error('[Profile] Error fetching onboarding status:', err)
      // Silently fail - don't show error to user
    } finally {
      setCheckingOnboarding(false)
    }
  }

  async function handleRestoreOnboarding() {
    setRestoringOnboarding(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(apiRouteFor.onboardingProgress(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      })

      if (!response.ok) {
        throw new Error('Failed to restore onboarding')
      }

      setOnboardingDismissed(false)
      setSuccess('Onboarding guide restored! It will appear on your dashboard.')
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      console.error('[Profile] Error restoring onboarding:', err)
      setError('Failed to restore onboarding guide. Please try again.')
    } finally {
      setRestoringOnboarding(false)
    }
  }

  // Show loading state while checking authentication
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-slate-300">
            {authLoading ? 'Verifying authentication...' : 'Loading profile...'}
          </p>
        </div>
      </div>
    )
  }

  // Auth guard will redirect if not authenticated, but add safety check
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-4 sm:py-6 lg:py-8 overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Profile & Settings</h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1">Manage your account information and preferences</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-400/20 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg border border-green-400/20 bg-green-500/10 p-4 text-green-300">
            {success}
          </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          {/* Profile Information */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-orange-500/20">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Personal Information</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-slate-900/30 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                    City
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                    <input
                      type="text"
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                      placeholder="Toronto"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 sm:pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Security Settings */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-purple-500/20">
                <Key className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Security</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-700">
                <div>
                  <p className="text-sm font-medium text-white">Password</p>
                  <p className="text-xs text-slate-400 mt-1">Last changed 30 days ago</p>
                </div>
                <button className="px-4 py-2 bg-slate-700/50 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                  Change Password
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                  <p className="text-xs text-slate-400 mt-1">Add an extra layer of security</p>
                </div>
                <button className="px-4 py-2 bg-slate-700/50 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                  Enable
                </button>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
                <Bell className="h-5 w-5 text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-700">
                <div>
                  <p className="text-sm font-medium text-white">Email Notifications</p>
                  <p className="text-xs text-slate-400 mt-1">Receive updates about your sessions</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-slate-700">
                <div>
                  <p className="text-sm font-medium text-white">SMS Notifications</p>
                  <p className="text-xs text-slate-400 mt-1">Get text messages for urgent updates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-white">Marketing Emails</p>
                  <p className="text-xs text-slate-400 mt-1">Special offers and product updates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Preferences & Onboarding */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-500/20">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Preferences</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-white">Onboarding Guide</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {onboardingDismissed
                      ? 'Show step-by-step getting started checklist on dashboard'
                      : 'Getting started checklist is currently visible on your dashboard'
                    }
                  </p>
                </div>
                {!checkingOnboarding && onboardingDismissed && (
                  <button
                    onClick={handleRestoreOnboarding}
                    disabled={restoringOnboarding}
                    className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors border border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {restoringOnboarding ? 'Restoring...' : 'Restore Guide'}
                  </button>
                )}
                {!checkingOnboarding && !onboardingDismissed && (
                  <span className="text-xs text-green-400 font-medium">Active</span>
                )}
              </div>
            </div>
          </div>

          {/* Billing */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                <CreditCard className="h-5 w-5 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Billing & Payments</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-700">
                <div>
                  <p className="text-sm font-medium text-white">Payment Methods</p>
                  <p className="text-xs text-slate-400 mt-1">Manage your saved payment methods</p>
                </div>
                <button className="px-4 py-2 bg-slate-700/50 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                  Manage
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-white">Payment History</p>
                  <p className="text-xs text-slate-400 mt-1">View all past transactions</p>
                </div>
                <button className="px-4 py-2 bg-slate-700/50 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                  View History
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-red-900/50 p-6">
            <h2 className="text-xl font-bold text-red-400 mb-4">Danger Zone</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-white">Delete Account</p>
                  <p className="text-xs text-slate-400 mt-1">Permanently delete your account and all data</p>
                </div>
                <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors border border-red-500/30">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
