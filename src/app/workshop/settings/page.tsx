'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Globe,
  Settings as SettingsIcon,
  CreditCard,
  Users,
  Save,
  AlertCircle,
  CheckCircle,
  Percent,
  MapPinned,
  Clock,
  Shield,
} from 'lucide-react'

interface WorkshopData {
  organization: {
    id: string
    name: string
    email: string
    phone: string
    address: string
    city: string
    province: string
    postal_code: string
    coverage_postal_codes: string[]
    service_radius_km: number
    mechanic_capacity: number
    commission_rate: number
    website: string | null
    stripe_account_id: string | null
    stripe_account_status: string | null
    status: string
    verification_status: string
  }
}

export default function WorkshopSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<WorkshopData | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    website: '',
    service_radius_km: 50,
    mechanic_capacity: 10,
    commission_rate: 30,
    coverage_postal_codes: '',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/workshop/dashboard')
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/workshop/login?redirect=/workshop/settings')
          return
        }
        setError(result.error || 'Failed to load settings')
        return
      }

      setData(result.data)

      // Populate form with current values
      const org = result.data.organization
      setFormData({
        name: org.name || '',
        email: org.email || '',
        phone: org.phone || '',
        address: org.address || '',
        city: org.city || '',
        province: org.province || '',
        postal_code: org.postal_code || '',
        website: org.website || '',
        service_radius_km: org.service_radius_km || 50,
        mechanic_capacity: org.mechanic_capacity || 10,
        commission_rate: org.commission_rate || 30,
        coverage_postal_codes: (org.coverage_postal_codes || []).join(', '),
      })
    } catch (err: any) {
      console.error('[WORKSHOP SETTINGS] Error:', err)
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/workshop/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          coverage_postal_codes: formData.coverage_postal_codes
            .split(',')
            .map(pc => pc.trim())
            .filter(Boolean),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to save settings')
        return
      }

      setSuccess('Settings saved successfully!')

      // Refresh data
      await fetchSettings()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('[WORKSHOP SETTINGS] Save error:', err)
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="h-8 w-8 text-purple-400" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Workshop Settings
          </h1>
        </div>
        <p className="text-slate-400">
          Manage your workshop configuration and business settings
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-green-400">{success}</p>
        </div>
      )}

      {/* Workshop Profile Section */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-6 w-6 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">Workshop Profile</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Workshop Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Website (optional)
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              City
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Province
            </label>
            <select
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            >
              <option value="">Select Province</option>
              <option value="AB">Alberta</option>
              <option value="BC">British Columbia</option>
              <option value="MB">Manitoba</option>
              <option value="NB">New Brunswick</option>
              <option value="NL">Newfoundland and Labrador</option>
              <option value="NS">Nova Scotia</option>
              <option value="ON">Ontario</option>
              <option value="PE">Prince Edward Island</option>
              <option value="QC">Quebec</option>
              <option value="SK">Saskatchewan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Postal Code
            </label>
            <input
              type="text"
              value={formData.postal_code}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              placeholder="A1A 1A1"
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Service Coverage Section */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <MapPinned className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Service Coverage</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Service Radius (km)
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={formData.service_radius_km}
              onChange={(e) => setFormData({ ...formData, service_radius_km: parseInt(e.target.value) || 50 })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Maximum distance you service from your location
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Coverage Postal Codes (comma-separated)
            </label>
            <textarea
              value={formData.coverage_postal_codes}
              onChange={(e) => setFormData({ ...formData, coverage_postal_codes: e.target.value })}
              placeholder="M5H 2N2, M5V 3A8, M4W 3L4"
              rows={3}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Specific postal codes your workshop services (optional)
            </p>
          </div>
        </div>
      </div>

      {/* Business Settings Section */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-6 w-6 text-green-400" />
          <h2 className="text-xl font-semibold text-white">Team Capacity</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Mechanic Capacity
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.mechanic_capacity}
              onChange={(e) => setFormData({ ...formData, mechanic_capacity: parseInt(e.target.value) || 10 })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Maximum number of employee mechanics that can work at your workshop
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-400 font-medium mb-1">
                Payment Structure
              </p>
              <p className="text-xs text-slate-400">
                <strong>Independent Workshop Owners:</strong> When you work diagnostic sessions yourself, you earn 70% of the session fee directly from the platform.
                <br /><br />
                <strong>Workshop Employees:</strong> The workshop receives 70% of session fees for employee-worked sessions. You are responsible for paying your employees separately according to your employment agreements.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Additional Settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/workshop/settings/revenue"
            className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-600/50 rounded-lg hover:border-purple-500/50 transition-colors group"
          >
            <CreditCard className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors">
                Revenue & Payouts
              </p>
              <p className="text-xs text-slate-500">Manage Stripe account</p>
            </div>
          </Link>

          <Link
            href="/workshop/dashboard#mechanics"
            className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-600/50 rounded-lg hover:border-purple-500/50 transition-colors group"
          >
            <Users className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors">
                Team Management
              </p>
              <p className="text-xs text-slate-500">Manage mechanics</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          <Save className="h-5 w-5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
