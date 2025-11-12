// @ts-nocheck
'use client'

/**
 * Mechanic Profile Edit Page - Mobile First, Dark Theme
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
  Star,
  ArrowLeft
} from 'lucide-react'
import { BrandSelector } from '@/components/mechanic/BrandSelector'
import { ServiceKeywordsSelector } from '@/components/mechanic/ServiceKeywordsSelector'
import { ImprovedLocationSelector } from '@/components/shared/ImprovedLocationSelector'
import { ProfileCompletionBanner } from '@/components/mechanic/ProfileCompletionBanner'
import type { ProfileCompletion } from '@/lib/profileCompletion'
import Link from 'next/link'

type Tab = 'basic' | 'specializations' | 'location' | 'credentials'

interface MechanicProfile {
  id: string
  name: string
  email: string
  phone: string
  about_me: string // ✅ Fixed: was 'bio'
  is_brand_specialist: boolean
  brand_specializations: string[]
  service_keywords: string[]
  specialist_tier: 'general' | 'brand' | 'master'
  country: string
  city: string
  state_province: string
  postal_code: string
  timezone: string
  years_of_experience: number // ✅ Fixed: was 'years_experience'
  red_seal_certified: boolean // ✅ Fixed: was 'is_red_seal'
  red_seal_number: string
  red_seal_province: string
  red_seal_expiry_date: string
  hourly_rate: number
  specializations: string[]
  profile_completion_score: number
  can_accept_sessions: boolean
  shop_affiliation: string
}

interface MechanicProfileClientProps {
  initialProfile: MechanicProfile
  mechanicId: string
}

export function MechanicProfileClient({ initialProfile, mechanicId }: MechanicProfileClientProps) {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<Tab>('basic')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [profile, setProfile] = useState<Partial<MechanicProfile>>(initialProfile)

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

      setTimeout(() => setSuccess(false), 3000)
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-12 sm:pb-16">
      {/* Header - Mobile First */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {/* Back Button */}
          <Link
            href="/mechanic/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-4 touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Mechanic Profile</h1>
              <p className="text-slate-400 text-sm mt-1">
                Complete your profile to start accepting sessions
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl touch-manipulation min-h-[44px] font-semibold"
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
            <div className="mt-4 sm:mt-6">
              <ProfileCompletionBannerWrapper mechanicId={mechanicId} />
            </div>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 mt-4 sm:mt-6">
          <div className="flex items-center gap-3 p-3 sm:p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
            <p className="text-red-300 text-sm sm:text-base">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 mt-4 sm:mt-6">
          <div className="flex items-center gap-3 p-3 sm:p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-400" />
            <p className="text-green-300 text-sm sm:text-base">Profile updated successfully!</p>
          </div>
        </div>
      )}

      {/* Tabs - Mobile First with Horizontal Scroll */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 mt-4 sm:mt-6">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg overflow-hidden">
          {/* Tab Headers - Horizontal Scroll on Mobile */}
          <div className="flex border-b border-slate-700 overflow-x-auto hide-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 font-medium whitespace-nowrap transition-all touch-manipulation flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'text-orange-400 border-b-2 border-orange-500 bg-orange-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
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

// Basic Info Tab - Dark Theme
function BasicInfoTab({ profile, setProfile }: any) {
  return (
    <div className="space-y-5 sm:space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Basic Information</h3>
        <p className="text-sm text-slate-400 mb-4 sm:mb-6">
          This information will be visible to customers when they view your profile.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Full Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={profile.name || ''}
          onChange={(e) => setProfile((prev: any) => ({ ...prev, name: e.target.value }))}
          className="w-full px-4 py-3 border border-slate-600 bg-slate-900/60 text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-500 transition touch-manipulation"
          placeholder="John Mechanic"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Phone Number <span className="text-red-400">*</span>
        </label>
        <input
          type="tel"
          value={profile.phone || ''}
          onChange={(e) => setProfile((prev: any) => ({ ...prev, phone: e.target.value }))}
          className="w-full px-4 py-3 border border-slate-600 bg-slate-900/60 text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-500 transition touch-manipulation"
          placeholder="(555) 123-4567"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          About You
        </label>
        <textarea
          value={profile.about_me || ''}
          onChange={(e) => setProfile((prev: any) => ({ ...prev, about_me: e.target.value }))}
          rows={5}
          className="w-full px-4 py-3 border border-slate-600 bg-slate-900/60 text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-500 resize-none transition touch-manipulation"
          placeholder="Tell customers about your experience and expertise..."
        />
        <p className="text-xs text-slate-500 mt-2">
          A good description helps customers trust you and understand your expertise.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Shop Affiliation (Optional)
        </label>
        <input
          type="text"
          value={profile.shop_affiliation || ''}
          onChange={(e) => setProfile((prev: any) => ({ ...prev, shop_affiliation: e.target.value }))}
          className="w-full px-4 py-3 border border-slate-600 bg-slate-900/60 text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-500 transition touch-manipulation"
          placeholder="ABC Auto Repair"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Hourly Rate (CAD)
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="number"
            value={profile.hourly_rate || ''}
            onChange={(e) => setProfile((prev: any) => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
            className="w-full pl-10 pr-4 py-3 border border-slate-600 bg-slate-900/60 text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-500 transition touch-manipulation"
            placeholder="50.00"
            min="0"
            step="0.01"
          />
        </div>
      </div>
    </div>
  )
}

// Specializations Tab - Dark Theme
function SpecializationsTab({ profile, setProfile }: any) {
  const [selectedTier, setSelectedTier] = useState(profile.specialist_tier || 'general')

  const tiers = [
    {
      id: 'general',
      name: 'General Mechanic',
      description: 'Work on all vehicle types and brands',
      pricing: '$29.99 per session',
      icon: '🔧',
      borderColor: 'border-slate-600',
      bgColor: 'bg-slate-700/30'
    },
    {
      id: 'brand',
      name: 'Brand Specialist',
      description: 'Specialize in specific vehicle brands',
      pricing: '$49.99 per session',
      icon: '⭐',
      borderColor: 'border-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      id: 'master',
      name: 'Master Technician',
      description: 'Advanced certifications and expertise',
      pricing: 'Premium pricing',
      icon: '👑',
      borderColor: 'border-purple-500',
      bgColor: 'bg-purple-500/10'
    }
  ]

  const handleTierChange = (tier: string) => {
    setSelectedTier(tier)
    setProfile((prev: any) => ({ ...prev, specialist_tier: tier }))
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl">
      {/* Specialist Tier Selection */}
      <div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Specialist Tier</h3>
        <p className="text-sm text-slate-400 mb-4 sm:mb-6">
          Choose your specialist tier. Higher tiers command premium pricing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {tiers.map((tier) => (
            <button
              key={tier.id}
              onClick={() => handleTierChange(tier.id)}
              className={`p-4 border-2 rounded-xl text-left transition-all touch-manipulation ${
                selectedTier === tier.id
                  ? `${tier.borderColor} ${tier.bgColor}`
                  : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
              }`}
            >
              <div className="text-3xl mb-2">{tier.icon}</div>
              <h4 className="font-semibold text-white text-sm sm:text-base">{tier.name}</h4>
              <p className="text-xs text-slate-400 mt-1">{tier.description}</p>
              <p className="text-sm font-medium text-orange-400 mt-2">{tier.pricing}</p>
              {selectedTier === tier.id && (
                <div className="flex items-center gap-1 mt-3 text-green-400">
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
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Brand Specializations</h3>
        <p className="text-sm text-slate-400 mb-4">
          Select the vehicle brands you specialize in. This helps match you with brand-specific requests.
        </p>
        <BrandSelector
          value={profile.brand_specializations || []}
          onChange={(brands) => setProfile((prev: any) => ({ ...prev, brand_specializations: brands }))}
        />
      </div>

      {/* Service Keywords */}
      <div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Service Keywords</h3>
        <p className="text-sm text-slate-400 mb-4">
          Select the types of services you offer. This helps match you with relevant customer requests.
        </p>
        <ServiceKeywordsSelector
          value={profile.service_keywords || []}
          onChange={(keywords) => setProfile((prev: any) => ({ ...prev, service_keywords: keywords }))}
        />
      </div>
    </div>
  )
}

// Location Tab - Dark Theme
function LocationTab({ profile, setProfile }: any) {
  return (
    <div className="space-y-5 sm:space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Location</h3>
        <p className="text-sm text-slate-400 mb-4 sm:mb-6">
          Your location helps us match you with customers in your area.
        </p>
      </div>

      <ImprovedLocationSelector
        country={profile.country || ''}
        city={profile.city || ''}
        province={profile.state_province || ''}
        onCountryChange={(country, timezone) => {
          setProfile((prev: any) => ({ ...prev, country, timezone }))
        }}
        onCityChange={(city, province, timezone) => {
          setProfile((prev: any) => ({ ...prev, city, state_province: province, timezone }))
        }}
        onProvinceChange={(province) => {
          setProfile((prev: any) => ({ ...prev, state_province: province }))
        }}
      />

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Full Address <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <textarea
            value={profile.full_address || ''}
            onChange={(e) => setProfile((prev: any) => ({ ...prev, full_address: e.target.value }))}
            rows={3}
            className="w-full pl-10 pr-4 py-3 border border-slate-600 bg-slate-900/60 text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-500 resize-none transition touch-manipulation"
            placeholder="123 Main Street&#10;Apt 4B"
            required
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Enter your complete street address including apartment/unit number
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Postal Code <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={profile.postal_code || ''}
          onChange={(e) => setProfile((prev: any) => ({ ...prev, postal_code: e.target.value.toUpperCase() }))}
          maxLength={10}
          className="w-full px-4 py-3 border border-slate-600 bg-slate-900/60 text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-500 transition touch-manipulation"
          placeholder={profile.country?.toLowerCase() === 'canada' ? 'A1A 1A1' : profile.country?.toLowerCase() === 'united states' ? '12345' : 'Postal code'}
          required
        />
        <p className="text-xs text-slate-500 mt-2">
          Used for accurate customer matching
        </p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex gap-3">
          <MapPin className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-300 text-sm sm:text-base">Local matching</h4>
            <p className="text-sm text-blue-400/80 mt-1">
              Mechanics in the same city get +35 match points. Same country gets +25 points.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Credentials Tab - Dark Theme with Fixed Fields
function CredentialsTab({ profile, setProfile }: any) {
  return (
    <div className="space-y-5 sm:space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Credentials & Experience</h3>
        <p className="text-sm text-slate-400 mb-4 sm:mb-6">
          Your certifications and experience help build trust with customers.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Years of Experience
        </label>
        <input
          type="number"
          value={profile.years_of_experience || 0}
          onChange={(e) => setProfile({ ...profile, years_of_experience: parseInt(e.target.value) || 0 })}
          className="w-full px-4 py-3 border border-slate-600 bg-slate-900/60 text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-500 transition touch-manipulation"
          placeholder="5"
          min="0"
        />
      </div>

      <div>
        <label className="flex items-start gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-slate-600 transition touch-manipulation">
          <input
            type="checkbox"
            checked={profile.red_seal_certified || false}
            onChange={(e) => setProfile({ ...profile, red_seal_certified: e.target.checked })}
            className="h-5 w-5 rounded border-slate-600 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900 mt-0.5 flex-shrink-0"
          />
          <div>
            <span className="font-medium text-white">Professionally Certified</span>
            <p className="text-sm text-slate-400 mt-1">
              I hold a professional automotive certification (Red Seal, Provincial 310S/310T, CPA Quebec, ASE, or Manufacturer specialist)
            </p>
          </div>
        </label>
      </div>

      {profile.red_seal_certified && (
        <div className="space-y-4 pl-0 sm:pl-8 pt-2">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Certification Number
            </label>
            <input
              type="text"
              value={profile.red_seal_number || ''}
              onChange={(e) => setProfile({ ...profile, red_seal_number: e.target.value })}
              className="w-full px-4 py-3 border border-slate-600 bg-slate-900/60 text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-500 transition touch-manipulation"
              placeholder="Enter certificate number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Issuing Province/Region
            </label>
            <input
              type="text"
              value={profile.red_seal_province || ''}
              onChange={(e) => setProfile({ ...profile, red_seal_province: e.target.value })}
              className="w-full px-4 py-3 border border-slate-600 bg-slate-900/60 text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-500 transition touch-manipulation"
              placeholder="e.g., Ontario, British Columbia"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Certification Expiry Date (if applicable)
            </label>
            <input
              type="date"
              value={profile.red_seal_expiry_date || ''}
              onChange={(e) => setProfile({ ...profile, red_seal_expiry_date: e.target.value })}
              className="w-full px-4 py-3 border border-slate-600 bg-slate-900/60 text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-500 transition touch-manipulation"
            />
          </div>
        </div>
      )}

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex gap-3">
          <Star className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-300 text-sm sm:text-base">Certification Upload Coming Soon</h4>
            <p className="text-sm text-yellow-400/80 mt-1">
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

    const handleProfileUpdate = () => fetchCompletion()
    window.addEventListener('profileUpdated', handleProfileUpdate)

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate)
    }
  }, [mechanicId])

  if (loading || !completion) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-slate-700 rounded w-1/2"></div>
      </div>
    )
  }

  return <ProfileCompletionBanner completion={completion} />
}
