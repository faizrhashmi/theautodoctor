'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface HomepageSection {
  id: string
  section_key: string
  section_name: string
  section_value: any
  is_active: boolean
  display_order: number
  updated_at: string
  created_at: string
  updated_by_profile?: {
    full_name: string
    email: string
  }
}

export default function AdminHomepagePage() {
  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState<HomepageSection[]>([])
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    loadSections()
  }, [])

  async function loadSections() {
    try {
      const response = await fetch('/api/admin/homepage')
      if (response.ok) {
        const data = await response.json()
        setSections(data.sections || [])
      }
    } catch (error) {
      console.error('Error loading homepage sections:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleSection(sectionId: string, currentActive: boolean) {
    try {
      const response = await fetch(`/api/admin/homepage/${sectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive })
      })

      if (response.ok) {
        loadSections()
      } else {
        alert('Failed to toggle section')
      }
    } catch (error) {
      console.error('Error toggling section:', error)
      alert('Failed to toggle section')
    }
  }

  async function updateSection(sectionId: string, updates: Partial<HomepageSection>) {
    try {
      const response = await fetch(`/api/admin/homepage/${sectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        loadSections()
        setShowEditModal(false)
        setEditingSection(null)
      } else {
        alert('Failed to update section')
      }
    } catch (error) {
      console.error('Error updating section:', error)
      alert('Failed to update section')
    }
  }

  async function updateDisplayOrder(sectionId: string, newOrder: number) {
    try {
      const response = await fetch(`/api/admin/homepage/${sectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: newOrder })
      })

      if (response.ok) {
        loadSections()
      }
    } catch (error) {
      console.error('Error updating display order:', error)
    }
  }

  const sortedSections = [...sections].sort((a, b) => a.display_order - b.display_order)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading homepage configuration...</p>
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
              <h1 className="text-3xl font-bold text-white mb-2">Homepage Content Manager</h1>
              <p className="text-slate-400">Configure homepage sections, layout, and content</p>
            </div>
            <Link
              href="/admin/dashboard"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Section Cards */}
        <div className="space-y-4">
          {sortedSections.map((section) => (
            <div
              key={section.id}
              className={`bg-slate-800/50 backdrop-blur-sm border rounded-lg p-6 transition ${
                section.is_active ? 'border-slate-700' : 'border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="text-sm">#{section.display_order}</span>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => updateDisplayOrder(section.id, section.display_order - 1)}
                          disabled={section.display_order === 1}
                          className="text-xs hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => updateDisplayOrder(section.id, section.display_order + 1)}
                          disabled={section.display_order === sections.length}
                          className="text-xs hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-white">{section.section_name}</h3>
                    <code className="px-2 py-1 bg-slate-900 text-blue-400 text-xs rounded border border-slate-700">
                      {section.section_key}
                    </code>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        section.is_active
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-slate-700 text-slate-400 border border-slate-600'
                      }`}
                    >
                      {section.is_active ? 'ACTIVE' : 'HIDDEN'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingSection(section)
                      setShowEditModal(true)
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
                  >
                    Edit Content
                  </button>
                  <button
                    onClick={() => toggleSection(section.id, section.is_active)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      section.is_active
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {section.is_active ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Section Preview */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <pre className="text-xs text-slate-400 overflow-x-auto">
                  {JSON.stringify(section.section_value, null, 2)}
                </pre>
              </div>

              {/* Section-specific preview */}
              {section.section_key === 'hero_section' && (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                  <h4 className="text-white font-semibold mb-2">{section.section_value.title}</h4>
                  <p className="text-slate-300 text-sm mb-2">{section.section_value.subtitle}</p>
                  <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded">
                    {section.section_value.cta_text}
                  </button>
                </div>
              )}

              {section.section_key === 'promotional_banner' && section.section_value.enabled && (
                <div className="mt-4 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <p className="text-yellow-400 text-sm font-medium mb-2">🎉 {section.section_value.text}</p>
                  <button className="px-3 py-1 bg-yellow-600 text-white text-xs rounded">
                    {section.section_value.cta_text}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-blue-400 font-semibold mb-2">📝 Homepage Management Tips</h3>
          <ul className="text-blue-300/80 text-sm space-y-1 list-disc list-inside">
            <li>Use display order arrows to reorder sections on the homepage</li>
            <li>Toggle sections on/off to show or hide them from customers</li>
            <li>Edit section content using the Edit Content button</li>
            <li>Changes take effect immediately on the public homepage</li>
          </ul>
        </div>

        {/* Edit Modal */}
        {showEditModal && editingSection && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-lg p-6 max-w-3xl w-full border border-slate-700 my-8">
              <h3 className="text-xl font-semibold text-white mb-4">
                Edit {editingSection.section_name}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Section Configuration (JSON)
                  </label>
                  <textarea
                    id="edit-section-value"
                    defaultValue={JSON.stringify(editingSection.section_value, null, 2)}
                    rows={20}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
                    placeholder='{"key": "value"}'
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Edit the JSON configuration. Ensure valid JSON syntax.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      try {
                        const value = JSON.parse(
                          (document.getElementById('edit-section-value') as HTMLTextAreaElement).value
                        )
                        updateSection(editingSection.id, { section_value: value })
                      } catch (error) {
                        alert('Invalid JSON. Please check your syntax.')
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingSection(null)
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
