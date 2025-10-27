'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface FeeRule {
  id: string
  rule_name: string
  rule_type: 'flat' | 'percentage' | 'tiered' | 'service_based'
  description: string
  applies_to: 'all' | 'workshop' | 'independent' | 'mobile'
  fee_percentage: number | null
  flat_fee: number | null
  min_job_value: number | null
  max_job_value: number | null
  service_categories: string[] | null
  priority: number
  is_active: boolean
  created_at: string
}

export default function AdminFeeRulesPage() {
  const [loading, setLoading] = useState(true)
  const [feeRules, setFeeRules] = useState<FeeRule[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadFeeRules()
  }, [])

  async function loadFeeRules() {
    try {
      const response = await fetch('/api/admin/fees/rules')
      if (response.ok) {
        const data = await response.json()
        setFeeRules(data)
      }
    } catch (error) {
      console.error('Error loading fee rules:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleRuleActive(ruleId: string, currentActive: boolean) {
    try {
      const response = await fetch(`/api/admin/fees/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive })
      })

      if (response.ok) {
        loadFeeRules()
      } else {
        alert('Failed to update rule')
      }
    } catch (error) {
      console.error('Error toggling rule:', error)
      alert('Failed to update rule')
    }
  }

  async function deleteRule(ruleId: string, ruleName: string) {
    if (!confirm(`Are you sure you want to delete "${ruleName}"? This cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/fees/rules/${ruleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadFeeRules()
      } else {
        alert('Failed to delete rule')
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
      alert('Failed to delete rule')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading fee rules...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900/50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Fee Rules Management</h1>
              <p className="text-slate-400 mt-1">Configure platform fee calculation rules</p>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 border border-slate-700 text-slate-200 rounded-lg hover:bg-slate-900/50"
              >
                ← Back to Dashboard
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/25 text-white rounded-lg hover:from-orange-600 hover:to-red-700 font-medium"
              >
                + Create New Rule
              </button>
            </div>
          </div>
        </div>

        {/* Active Rules */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Active Rules</h2>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg shadow overflow-hidden">
            {feeRules.filter(r => r.is_active).length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No active fee rules
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rule Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Applies To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Conditions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800/50 backdrop-blur-sm divide-y divide-gray-200">
                  {feeRules
                    .filter(r => r.is_active)
                    .sort((a, b) => b.priority - a.priority)
                    .map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-900/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {rule.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-white">{rule.rule_name}</div>
                          <div className="text-sm text-slate-500">{rule.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded bg-slate-800/50 text-slate-100">
                            {rule.rule_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                            {rule.applies_to}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {rule.rule_type === 'percentage' && rule.fee_percentage && (
                            <span className="text-sm font-semibold text-white">{rule.fee_percentage}%</span>
                          )}
                          {rule.rule_type === 'flat' && rule.flat_fee && (
                            <span className="text-sm font-semibold text-white">${rule.flat_fee}</span>
                          )}
                          {rule.rule_type === 'tiered' && (
                            <span className="text-sm text-slate-400">Tiered</span>
                          )}
                          {rule.rule_type === 'service_based' && rule.fee_percentage && (
                            <span className="text-sm font-semibold text-white">{rule.fee_percentage}%</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-400">
                            {rule.min_job_value && <div>Min: ${rule.min_job_value}</div>}
                            {rule.max_job_value && <div>Max: ${rule.max_job_value}</div>}
                            {rule.service_categories && rule.service_categories.length > 0 && (
                              <div>Services: {rule.service_categories.join(', ')}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => toggleRuleActive(rule.id, rule.is_active)}
                            className="text-yellow-600 hover:text-yellow-800 mr-3"
                          >
                            Deactivate
                          </button>
                          <button
                            onClick={() => deleteRule(rule.id, rule.rule_name)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Inactive Rules */}
        {feeRules.filter(r => !r.is_active).length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Inactive Rules</h2>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rule Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800/50 backdrop-blur-sm divide-y divide-gray-200">
                  {feeRules
                    .filter(r => !r.is_active)
                    .map((rule) => (
                      <tr key={rule.id} className="opacity-60 hover:bg-slate-900/50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-white">{rule.rule_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded bg-slate-800/50 text-slate-100">
                            {rule.rule_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {rule.fee_percentage && <span>{rule.fee_percentage}%</span>}
                          {rule.flat_fee && <span>${rule.flat_fee}</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => toggleRuleActive(rule.id, rule.is_active)}
                            className="text-green-600 hover:text-green-800 mr-3"
                          >
                            Activate
                          </button>
                          <button
                            onClick={() => deleteRule(rule.id, rule.rule_name)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How Fee Rules Work</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Rules are checked in order of priority (highest first)</li>
            <li>• First matching rule is applied to calculate the fee</li>
            <li>• Inactive rules are skipped</li>
            <li>• Service-based rules match specific service categories</li>
            <li>• Tiered rules apply different percentages based on job value</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
