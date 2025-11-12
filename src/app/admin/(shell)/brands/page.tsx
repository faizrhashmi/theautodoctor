'use client'

/**
 * Admin: Brand Management
 * Manage vehicle brands and service keywords
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { AlertCircle, CheckCircle, RefreshCw, Plus, Edit2, Trash2, Star, Wrench, DollarSign, Crown } from 'lucide-react'

interface Brand {
  id: string
  brand_name: string
  is_luxury: boolean
  requires_certification: boolean
  active: boolean
  specialist_premium: number
}

interface ServiceKeyword {
  id: string
  keyword: string
  category: string
  complexity: string
  requires_specialist: boolean
  active: boolean
}

export default function BrandManagementAdminPage() {
  const [activeTab, setActiveTab] = useState<'brands' | 'keywords'>('brands')
  const [brands, setBrands] = useState<Brand[]>([])
  const [keywords, setKeywords] = useState<ServiceKeyword[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingPremiumId, setEditingPremiumId] = useState<string | null>(null)
  const [editPremiumValue, setEditPremiumValue] = useState<string>('')

  const supabase = createClient()

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [brandsRes, keywordsRes] = await Promise.all([
        supabase.from('brand_specializations').select('*').order('brand_name'),
        supabase.from('service_keywords').select('*').order('category').order('keyword')
      ])

      if (brandsRes.error) throw brandsRes.error
      if (keywordsRes.error) throw keywordsRes.error

      setBrands(brandsRes.data || [])
      setKeywords(keywordsRes.data || [])
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const toggleBrandActive = async (brandId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('brand_specializations')
        .update({ active: !currentState })
        .eq('id', brandId)

      if (error) throw error

      setBrands(brands.map(b => b.id === brandId ? { ...b, active: !currentState } : b))
      setSuccess(`Brand ${!currentState ? 'activated' : 'deactivated'}`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const toggleKeywordActive = async (keywordId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('service_keywords')
        .update({ active: !currentState })
        .eq('id', keywordId)

      if (error) throw error

      setKeywords(keywords.map(k => k.id === keywordId ? { ...k, active: !currentState } : k))
      setSuccess(`Keyword ${!currentState ? 'activated' : 'deactivated'}`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const startEditingPremium = (brandId: string, currentPremium: number) => {
    setEditingPremiumId(brandId)
    setEditPremiumValue(currentPremium.toString())
  }

  const cancelEditingPremium = () => {
    setEditingPremiumId(null)
    setEditPremiumValue('')
  }

  const saveSpecialistPremium = async (brandId: string) => {
    try {
      const premium = parseFloat(editPremiumValue)
      if (isNaN(premium) || premium < 0) {
        setError('Premium must be a positive number')
        return
      }

      const { error } = await supabase
        .from('brand_specializations')
        .update({ specialist_premium: premium })
        .eq('id', brandId)

      if (error) throw error

      setBrands(brands.map(b => b.id === brandId ? { ...b, specialist_premium: premium } : b))
      setSuccess(`Specialist premium updated to $${premium.toFixed(2)}`)
      setEditingPremiumId(null)
      setEditPremiumValue('')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const bulkUpdateStandardPremium = async (premium: number) => {
    try {
      const { error } = await supabase
        .from('brand_specializations')
        .update({ specialist_premium: premium })
        .eq('is_luxury', false)

      if (error) throw error

      setBrands(brands.map(b => !b.is_luxury ? { ...b, specialist_premium: premium } : b))
      setSuccess(`All standard brand premiums updated to $${premium.toFixed(2)}`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const bulkUpdateLuxuryPremium = async (premium: number) => {
    try {
      const { error } = await supabase
        .from('brand_specializations')
        .update({ specialist_premium: premium })
        .eq('is_luxury', true)

      if (error) throw error

      setBrands(brands.map(b => b.is_luxury ? { ...b, specialist_premium: premium } : b))
      setSuccess(`All luxury brand premiums updated to $${premium.toFixed(2)}`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const categoryColors: Record<string, string> = {
    diagnostic: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    repair: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    installation: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    maintenance: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white dark:text-white">
            Brand & Service Management
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-400 mt-1">
            Manage vehicle brands and service keywords
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/25 text-white rounded-lg hover:from-orange-600 hover:to-red-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-900 dark:text-green-100">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('brands')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'brands'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Vehicle Brands ({brands.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('keywords')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'keywords'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Service Keywords ({keywords.length})
          </div>
        </button>
      </div>

      {/* Brands Tab */}
      {activeTab === 'brands' && (
        <div className="space-y-4">
          {/* Bulk Update Controls */}
          <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-5 w-5 text-orange-400" />
              <h3 className="text-white font-semibold">Bulk Update Specialist Premiums</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">Standard Brands:</span>
                <button
                  onClick={() => bulkUpdateStandardPremium(15)}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                >
                  Set All to $15.00
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">Luxury Brands:</span>
                <button
                  onClick={() => bulkUpdateLuxuryPremium(25)}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                >
                  <Crown className="h-3.5 w-3.5" />
                  Set All to $25.00
                </button>
              </div>
            </div>
          </div>

          {/* Brands Table */}
          <div className="bg-slate-800/50 backdrop-blur-sm dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-200 dark:text-slate-300 uppercase">
                      Brand Name
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-200 dark:text-slate-300 uppercase">
                      Luxury
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-200 dark:text-slate-300 uppercase">
                      Cert Required
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-200 dark:text-slate-300 uppercase">
                      Specialist Premium
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-200 dark:text-slate-300 uppercase">
                      Active
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-200 dark:text-slate-300 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {brands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white dark:text-white">
                          {brand.brand_name}
                        </span>
                        {brand.is_luxury && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {brand.is_luxury ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {brand.requires_certification ? (
                        <CheckCircle className="h-5 w-5 text-orange-500 mx-auto" />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingPremiumId === brand.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex items-center bg-slate-900 rounded-lg px-2 py-1">
                            <DollarSign className="h-4 w-4 text-slate-400" />
                            <input
                              type="number"
                              step="0.01"
                              value={editPremiumValue}
                              onChange={(e) => setEditPremiumValue(e.target.value)}
                              className="w-20 bg-transparent text-white text-sm focus:outline-none"
                              autoFocus
                            />
                          </div>
                          <button
                            onClick={() => saveSpecialistPremium(brand.id)}
                            className="p-1 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                            title="Save"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEditingPremium}
                            className="p-1 bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors"
                            title="Cancel"
                          >
                            <AlertCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span className={`font-semibold ${brand.is_luxury ? 'text-orange-400' : 'text-green-400'}`}>
                            ${brand.specialist_premium?.toFixed(2) || '0.00'}
                          </span>
                          <button
                            onClick={() => startEditingPremium(brand.id, brand.specialist_premium || 0)}
                            className="p-1 hover:bg-slate-700 rounded transition-colors"
                            title="Edit premium"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-400 hover:text-white" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleBrandActive(brand.id, brand.active)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          brand.active ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 bg-white rounded-full transition-transform ${
                            brand.active ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-slate-400">
                        {brand.is_luxury && <Crown className="h-4 w-4 inline text-yellow-500" />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* Keywords Tab */}
      {activeTab === 'keywords' && (
        <div className="space-y-4">
          {['diagnostic', 'repair', 'installation', 'maintenance'].map(category => {
            const categoryKeywords = keywords.filter(k => k.category === category)
            if (categoryKeywords.length === 0) return null

            return (
              <div key={category} className="bg-slate-800/50 backdrop-blur-sm dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-700 px-4 py-3">
                  <h3 className="font-semibold text-white dark:text-white capitalize">
                    {category} ({categoryKeywords.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-200 dark:text-slate-300 uppercase">
                          Keyword
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-200 dark:text-slate-300 uppercase">
                          Complexity
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-200 dark:text-slate-300 uppercase">
                          Specialist Required
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-200 dark:text-slate-300 uppercase">
                          Active
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {categoryKeywords.map((keyword) => (
                        <tr key={keyword.id} className="hover:bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 dark:hover:bg-slate-700/50">
                          <td className="px-4 py-2 text-sm text-white dark:text-white">
                            {keyword.keyword}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`text-xs px-2 py-1 rounded ${
                              keyword.complexity === 'simple'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : keyword.complexity === 'complex'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                            }`}>
                              {keyword.complexity}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            {keyword.requires_specialist ? (
                              <CheckCircle className="h-4 w-4 text-orange-500 mx-auto" />
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => toggleKeywordActive(keyword.id, keyword.active)}
                              className={`w-10 h-5 rounded-full transition-colors ${
                                keyword.active ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                              }`}
                            >
                              <span
                                className={`block w-3 h-3 bg-white rounded-full transition-transform ${
                                  keyword.active ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
