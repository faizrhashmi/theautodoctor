'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

const TEMPLATES = [
  {
    id: 'diagnostic',
    label: '🔍 Request Diagnostic Photos',
    text: 'Please upload clear photos of the affected area so I can inspect the issue in detail. Multiple angles would be helpful.'
  },
  {
    id: 'quote',
    label: '💰 Quote Coming Soon',
    text: 'I\'ll send you a detailed quote shortly with parts and labor breakdown.'
  },
  {
    id: 'part',
    label: '🔧 Part Number Request',
    text: 'Can you share the OEM part number or VIN so I can confirm compatibility and get accurate pricing?'
  },
  {
    id: 'safety',
    label: '⚠️ Safety Notice',
    text: 'For your safety, please avoid driving until this issue is properly inspected. I can arrange mobile service if needed.'
  },
  {
    id: 'followup',
    label: '👋 Follow-up Check',
    text: 'Just checking in - how is everything running since the repair? Any concerns?'
  }
]

interface QuickResponseTemplatesProps {
  onInsert: (text: string) => void
}

export default function QuickResponseTemplates({ onInsert }: QuickResponseTemplatesProps) {
  const [justInserted, setJustInserted] = useState<string | null>(null)

  const handleInsert = (template: typeof TEMPLATES[0]) => {
    onInsert(template.text)
    setJustInserted(template.id)
    setTimeout(() => setJustInserted(null), 1500)
  }

  return (
    <div className="space-y-2">
      {TEMPLATES.map((template) => (
        <button
          key={template.id}
          onClick={() => handleInsert(template)}
          disabled={justInserted === template.id}
          className="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-left transition hover:bg-slate-700/50 hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <span className="text-sm text-slate-200 font-medium">{template.label}</span>
          {justInserted === template.id ? (
            <Check className="h-4 w-4 text-green-400 animate-in fade-in" />
          ) : (
            <svg
              className="h-4 w-4 text-slate-400 group-hover:text-orange-400 transition"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}
