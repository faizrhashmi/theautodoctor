'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Key, Bell, CreditCard, TrendingUp } from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { apiRouteFor } from '@/lib/routes'
import { ImprovedLocationSelector } from '@/components/shared/ImprovedLocationSelector'

interface ProfileData {
  full_name: string
  email: string
  phone: string
  address_line1: string
  address_line2: string
  country: string
  province: string
  city: string
  postal_code: string
}

export default function CustomerProfilePage() {
  // ✅ Auth guard - ensures user is authenticated as customer
  const { isLoading: authLoading, user } = useAuthGuard({ requiredRole: 'customer' })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    country: '',
    province: '',
    city: '',
    postal_code: '',
  })
  const [originalProfile, setOriginalProfile] = useState<ProfileData>({
    full_name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    country: '',
    province: '',
    city: '',
    postal_code: '',
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
      const profileData = {
        full_name: data.profile.full_name || '',
        email: data.profile.email || '',
        phone: data.profile.phone || '',
        address_line1: data.profile.address_line1 || '',
        address_line2: data.profile.address_line2 || '',
        country: data.profile.country || '',
        province: data.profile.province || '',
        city: data.profile.city || '',
        postal_code: data.profile.postal_code || '',
      }
      setProfile(profileData)
      setOriginalProfile(profileData) // Store original for cancel functionality
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

    // Validate required fields
    if (!profile.full_name?.trim()) {
      setError('Full name is required')
      setSaving(false)
      return
    }

    if (!profile.phone?.trim()) {
      setError('Phone number is required')
      setSaving(false)
      return
    }

    // Validate phone format
    const phoneRegex = /^[0-9+()\-\s]{7,}$/
    if (!phoneRegex.test(profile.phone)) {
      setError('Please enter a valid phone number')
      setSaving(false)
      return
    }

    if (!profile.country?.trim()) {
      setError('Country is required')
      setSaving(false)
      return
    }

    if (!profile.province?.trim()) {
      setError('Province/State is required')
      setSaving(false)
      return
    }

    if (!profile.city?.trim()) {
      setError('City is required')
      setSaving(false)
      return
    }

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
      setOriginalProfile(profile) // Update original to reflect saved changes
      setIsEditing(false) // Exit edit mode after successful save
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Update error:', err)
      setError('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleCancelEdit() {
    setProfile(originalProfile) // Revert to original values
    setIsEditing(false)
    setError(null)
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
      setSuccess('Booking guide restored! It will appear on your dashboard.')
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      console.error('[Profile] Error restoring onboarding:', err)
      setError('Failed to restore booking guide. Please try again.')
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
            <div className="flex items-center justify-between gap-2.5 sm:gap-3 mb-4 sm:mb-6">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-orange-500/20">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Personal Information</h2>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 rounded-lg text-xs sm:text-sm font-semibold transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {/* Required fields notice */}
            <div className="mb-4 sm:mb-6 rounded-lg border border-blue-400/20 bg-blue-500/10 p-3 sm:p-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-blue-400 text-xs sm:text-sm font-bold">!</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-blue-200 font-medium">
                    Complete your profile to book sessions
                  </p>
                  <p className="text-xs text-blue-300/80 mt-1">
                    All fields marked with <span className="text-red-400">*</span> are required before you can start a session with a mechanic.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                    disabled={!isEditing}
                    className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-700 rounded-lg ${
                      isEditing
                        ? 'bg-slate-900/50 text-white focus:border-orange-500 focus:outline-none'
                        : 'bg-slate-900/30 text-slate-400 cursor-not-allowed'
                    }`}
                    placeholder="John Doe"
                    required
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

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!isEditing}
                    className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-700 rounded-lg ${
                      isEditing
                        ? 'bg-slate-900/50 text-white focus:border-orange-500 focus:outline-none'
                        : 'bg-slate-900/30 text-slate-400 cursor-not-allowed'
                    }`}
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                  Location <span className="text-red-400">*</span>
                </label>
                <ImprovedLocationSelector
                  country={profile.country}
                  province={profile.province}
                  city={profile.city}
                  disabled={!isEditing}
                  onCountryChange={(country, timezone) => {
                    console.log('[CustomerProfile] onCountryChange called, setting country to:', country)
                    setProfile(prev => {
                      const updated = { ...prev, country }
                      console.log('[CustomerProfile] Profile state updated to:', updated)
                      return updated
                    })
                  }}
                  onCityChange={(city, province, timezone) => {
                    console.log('[CustomerProfile] onCityChange called:', { city, province })
                    setProfile(prev => ({ ...prev, city, province }))
                  }}
                  onProvinceChange={(province) => {
                    console.log('[CustomerProfile] onProvinceChange called:', province)
                    setProfile(prev => ({ ...prev, province }))
                  }}
                />
                <p className="text-xs text-slate-500 mt-1">Select your country, province/state, and city.</p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                  Street Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                  <input
                    type="text"
                    value={profile.address_line1}
                    onChange={(e) => setProfile(prev => ({ ...prev, address_line1: e.target.value }))}
                    disabled={!isEditing}
                    className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-700 rounded-lg ${
                      isEditing
                        ? 'bg-slate-900/50 text-white focus:border-orange-500 focus:outline-none'
                        : 'bg-slate-900/30 text-slate-400 cursor-not-allowed'
                    }`}
                    placeholder="123 Main Street"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                  Apartment, Suite, etc. (Optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                  <input
                    type="text"
                    value={profile.address_line2}
                    onChange={(e) => setProfile(prev => ({ ...prev, address_line2: e.target.value }))}
                    disabled={!isEditing}
                    className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-700 rounded-lg ${
                      isEditing
                        ? 'bg-slate-900/50 text-white focus:border-orange-500 focus:outline-none'
                        : 'bg-slate-900/30 text-slate-400 cursor-not-allowed'
                    }`}
                    placeholder="Apt 4B, Unit 2, etc."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                  Postal Code <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                  <input
                    type="text"
                    value={profile.postal_code}
                    onChange={(e) => setProfile(prev => ({ ...prev, postal_code: e.target.value.toUpperCase() }))}
                    disabled={!isEditing}
                    className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-700 rounded-lg ${
                      isEditing
                        ? 'bg-slate-900/50 text-white focus:border-orange-500 focus:outline-none'
                        : 'bg-slate-900/30 text-slate-400 cursor-not-allowed'
                    }`}
                    placeholder={profile.country?.toLowerCase() === 'canada' ? 'A1A 1A1' : profile.country?.toLowerCase() === 'united states' ? '12345' : 'Postal code'}
                    maxLength={10}
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Used for accurate mechanic matching.</p>
              </div>

              {isEditing && (
                <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 sm:flex-initial px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="flex-1 sm:flex-initial px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              )}
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
                  <p className="text-sm font-medium text-white">Booking Guide</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {onboardingDismissed
                      ? 'Show step-by-step booking guide from dashboard through all booking steps'
                      : 'Booking guide is currently visible and will guide you through the booking process'
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
