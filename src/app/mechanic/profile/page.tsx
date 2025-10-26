// @ts-nocheck
'use client'

/**
 * Mechanic Profile Edit Page
 * Complete profile management with brand specializations, keywords, and location
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
  User,
  Award,
  MapPin,
  Shield,
  DollarSign,
  Star
} from 'lucide-react'
import { BrandSelector } from '@/components/mechanic/BrandSelector'
import { ServiceKeywordsSelector } from '@/components/mechanic/ServiceKeywordsSelector'
import { LocationSelector } from '@/components/mechanic/LocationSelector'
import { ProfileCompletionBanner } from '@/components/mechanic/ProfileCompletionBanner'
import type { ProfileCompletion } from '@/lib/profileCompletion'

type Tab = 'basic' | 'specializations' | 'location' | 'credentials'

interface MechanicProfile {
  id: string
  name: string
  email: string
  phone: string
  bio: string
  is_brand_specialist: boolean
  brand_specializations: string[]
  service_keywords: string[]
  specialist_tier: 'general' | 'brand' | 'master'
  country: string
  city: string
  state_province: string
  timezone: string
  certifications: string[]
  years_experience: number
  is_red_seal: boolean
  hourly_rate: number
  specializations: string[]
  profile_completion_score: number
  can_accept_sessions: boolean
}

export default function MechanicProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<Tab>('basic')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [mechanicId, setMechanicId] = useState<string | null>(null)

  const [profile, setProfile] = useState<Partial<MechanicProfile>>({
    name: '',
    phone: '',
    bio: '',
    brand_specializations: [],
    service_keywords: [],
    specialist_tier: 'general',
    country: '',
    city: '',
    state_province: '',
    timezone: 'America/Toronto',
    certifications: [],
    years_experience: 0,
    is_red_seal: false,
    hourly_rate: 0,
    specializations: []
  })

  // Fetch current user and profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          router.push('/mechanic/login')
          return
        }

        setMechanicId(user.id)

        // Fetch mechanic profile
        const response = await fetch(`/api/mechanics/${user.id}/profile`)
        if (!response.ok) {
          throw new Error('Failed to fetch profile')
        }

        const data = await response.json()
        setProfile(data)
      } catch (err: any) {
        console.error('Error fetching profile:', err)
        setError(err.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [supabase, router])

  const handleSave = async () => {
    if (!mechanicId) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch(`/api/mechanics/${mechanicId}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const data = await response.json()
      setProfile(data.mechanic)
      setSuccess(true)

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)

      // Refresh profile completion banner
      window.dispatchEvent(new Event('profileUpdated'))
    } catch (err: any) {
      console.error('Error saving profile:', err)
      setError(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'basic' as Tab, label: 'Basic Info', icon: User },
    { id: 'specializations' as Tab, label: 'Specializations', icon: Award },
    { id: 'location' as Tab, label: 'Location', icon: MapPin },
    { id: 'credentials' as Tab, label: 'Credentials', icon: Shield }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Mechanic Profile</h1>
              <p className="text-slate-600 mt-1">
                Complete your profile to start accepting sessions
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>

          {/* Profile Completion Banner */}
          {mechanicId && (
            <div className="mt-6">
              <ProfileCompletionBannerWrapper mechanicId={mechanicId} />
            </div>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 mt-6">
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-6xl mx-auto px-4 mt-6">
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <p>Profile updated successfully!</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-slate-200 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'basic' && (
              <BasicInfoTab profile={profile} setProfile={setProfile} />
            )}
            {activeTab === 'specializations' && (
              <SpecializationsTab profile={profile} setProfile={setProfile} />
            )}
            {activeTab === 'location' && (
              <LocationTab profile={profile} setProfile={setProfile} />
            )}
            {activeTab === 'credentials' && (
              <CredentialsTab profile={profile} setProfile={setProfile} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Basic Info Tab
function BasicInfoTab({ profile, setProfile }: any) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
        <p className="text-sm text-slate-600 mb-6">
          This information will be visible to customers when they view your profile.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Full Name *
        </label>
        <input
          type="text"
          value={profile.name || ''}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          placeholder="John Mechanic"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Phone Number *
        </label>
        <input
          type="tel"
          value={profile.phone || ''}
          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          placeholder="(555) 123-4567"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Bio / About You
        </label>
        <textarea
          value={profile.bio || ''}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          placeholder="Tell customers about your experience and expertise..."
        />
        <p className="text-xs text-slate-500 mt-1">
          A good bio helps customers trust you and understand your expertise.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Hourly Rate (CAD)
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="number"
            value={profile.hourly_rate || ''}
            onChange={(e) => setProfile({ ...profile, hourly_rate: parseFloat(e.target.value) || 0 })}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="50.00"
            min="0"
            step="0.01"
          />
        </div>
      </div>
    </div>
  )
}

// Specializations Tab
function SpecializationsTab({ profile, setProfile }: any) {
  const [selectedTier, setSelectedTier] = useState(profile.specialist_tier || 'general')

  const tiers = [
    {
      id: 'general',
      name: 'General Mechanic',
      description: 'Work on all vehicle types and brands',
      pricing: '$29.99 per session',
      icon: '🔧',
      color: 'slate'
    },
    {
      id: 'brand',
      name: 'Brand Specialist',
      description: 'Specialize in specific vehicle brands',
      pricing: '$49.99 per session',
      icon: '⭐',
      color: 'orange'
    },
    {
      id: 'master',
      name: 'Master Technician',
      description: 'Advanced certifications and expertise',
      pricing: 'Premium pricing',
      icon: '👑',
      color: 'purple'
    }
  ]

  const handleTierChange = (tier: string) => {
    setSelectedTier(tier)
    setProfile({ ...profile, specialist_tier: tier })
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Specialist Tier Selection */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Specialist Tier</h3>
        <p className="text-sm text-slate-600 mb-6">
          Choose your specialist tier. Higher tiers command premium pricing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier) => (
            <button
              key={tier.id}
              onClick={() => handleTierChange(tier.id)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                selectedTier === tier.id
                  ? `border-${tier.color}-500 bg-${tier.color}-50`
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-3xl mb-2">{tier.icon}</div>
              <h4 className="font-semibold text-slate-900">{tier.name}</h4>
              <p className="text-xs text-slate-600 mt-1">{tier.description}</p>
              <p className="text-sm font-medium text-orange-600 mt-2">{tier.pricing}</p>
              {selectedTier === tier.id && (
                <div className="flex items-center gap-1 mt-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-medium">Selected</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Brand Specializations */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Brand Specializations</h3>
        <p className="text-sm text-slate-600 mb-4">
          Select the vehicle brands you specialize in. This helps match you with brand-specific requests.
        </p>
        <BrandSelector
          value={profile.brand_specializations || []}
          onChange={(brands) => setProfile({ ...profile, brand_specializations: brands })}
        />
      </div>

      {/* Service Keywords */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Service Keywords</h3>
        <p className="text-sm text-slate-600 mb-4">
          Select the types of services you offer. This helps match you with relevant customer requests.
        </p>
        <ServiceKeywordsSelector
          value={profile.service_keywords || []}
          onChange={(keywords) => setProfile({ ...profile, service_keywords: keywords })}
        />
      </div>
    </div>
  )
}

// Location Tab
function LocationTab({ profile, setProfile }: any) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Location</h3>
        <p className="text-sm text-slate-600 mb-6">
          Your location helps us match you with customers in your area.
        </p>
      </div>

      <LocationSelector
        country={profile.country || ''}
        city={profile.city || ''}
        stateProvince={profile.state_province || ''}
        timezone={profile.timezone || 'America/Toronto'}
        onCountryChange={(country, timezone) => {
          setProfile({ ...profile, country, timezone })
        }}
        onCityChange={(city, stateProvince, timezone) => {
          setProfile({ ...profile, city, state_province: stateProvince, timezone })
        }}
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Local matching</h4>
            <p className="text-sm text-blue-700 mt-1">
              Mechanics in the same city get +35 match points. Same country gets +25 points.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Credentials Tab
function CredentialsTab({ profile, setProfile }: any) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Credentials & Experience</h3>
        <p className="text-sm text-slate-600 mb-6">
          Your certifications and experience help build trust with customers.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Years of Experience
        </label>
        <input
          type="number"
          value={profile.years_experience || 0}
          onChange={(e) => setProfile({ ...profile, years_experience: parseInt(e.target.value) || 0 })}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          placeholder="5"
          min="0"
        />
      </div>

      <div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={profile.is_red_seal || false}
            onChange={(e) => setProfile({ ...profile, is_red_seal: e.target.checked })}
            className="h-5 w-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
          />
          <div>
            <span className="font-medium text-slate-900">Red Seal Certified</span>
            <p className="text-sm text-slate-600">
              I am Red Seal certified in my trade
            </p>
          </div>
        </label>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Star className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900">Certification Upload Coming Soon</h4>
            <p className="text-sm text-yellow-700 mt-1">
              We'll soon allow you to upload photos of your certifications for verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Wrapper to fetch profile completion and display banner
function ProfileCompletionBannerWrapper({ mechanicId }: { mechanicId: string }) {
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCompletion = async () => {
      try {
        const response = await fetch(`/api/mechanics/${mechanicId}/profile-completion`)
        if (response.ok) {
          const data = await response.json()
          setCompletion(data)
        }
      } catch (error) {
        console.error('Error fetching profile completion:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCompletion()

    // Listen for profile updates
    const handleProfileUpdate = () => fetchCompletion()
    window.addEventListener('profileUpdated', handleProfileUpdate)

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate)
    }
  }, [mechanicId])

  if (loading || !completion) {
    return (
      <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
      </div>
    )
  }

  return <ProfileCompletionBanner completion={completion} />
}
