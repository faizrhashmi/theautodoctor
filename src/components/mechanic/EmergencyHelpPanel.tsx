'use client'

import { useState } from 'react'
import {
  X, HelpCircle, Phone, MessageSquare, AlertTriangle,
  Clock, DollarSign, FileText, Users, Video, Settings
} from 'lucide-react'

type HelpPanelProps = {
  onClose: () => void
}

type HelpCategory = 'emergency' | 'technical' | 'payment' | 'general'

type HelpArticle = {
  id: string
  category: HelpCategory
  title: string
  content: string
  icon: any
}

const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'stuck-session',
    category: 'emergency',
    title: 'Session is stuck or not responding',
    icon: AlertTriangle,
    content: `If you're in a session that's not responding:
1. Try refreshing your browser (Ctrl+R or Cmd+R)
2. Check your internet connection
3. If the issue persists, use the "Force End All Sessions" option in your dashboard
4. Contact support immediately if the customer is waiting

Emergency Contact: 1-800-AUTO-DOC`
  },
  {
    id: 'customer-no-show',
    category: 'emergency',
    title: 'Customer didn't show up',
    icon: Clock,
    content: `If a customer doesn't join within 10 minutes:
1. Wait the full 10 minutes from scheduled time
2. Try contacting them via the chat function
3. After 10 minutes, you can safely cancel the session
4. You'll still receive partial payment for your time

Note: No-shows don't affect your rating.`
  },
  {
    id: 'technical-issues',
    category: 'technical',
    title: 'Video or audio not working',
    icon: Video,
    content: `Troubleshooting steps:
1. Check camera/microphone permissions in your browser
2. Make sure no other apps are using your camera
3. Try a different browser (Chrome works best)
4. Check your internet speed (need 5+ Mbps)
5. Restart your browser

Still having issues? Switch to chat-only mode in the session controls.`
  },
  {
    id: 'payment-missing',
    category: 'payment',
    title: 'Haven't received payment',
    icon: DollarSign,
    content: `Payment timeline:
• Earnings appear in your dashboard immediately after session completion
• Stripe processes payouts 3-7 business days after the session
• Check your Stripe dashboard for payout status
• Ensure your Stripe account is fully verified

If payment is delayed beyond 7 days, contact support with your session ID.`
  },
  {
    id: 'stripe-setup',
    category: 'payment',
    title: 'Setting up Stripe payouts',
    icon: Settings,
    content: `To receive payments:
1. Click "Setup Stripe Payouts" in your dashboard
2. Complete Stripe Connect onboarding (takes 5-10 minutes)
3. Provide your banking information
4. Verify your identity (required by law)
5. Wait for Stripe approval (usually instant)

Required documents: Photo ID, bank account details`
  },
  {
    id: 'sin-collection',
    category: 'payment',
    title: 'Why do you need my SIN?',
    icon: FileText,
    content: `Your Social Insurance Number (SIN) is required for:
• Canadian tax compliance (CRA reporting)
• Income verification
• Payment processing

Your SIN is:
✓ Encrypted with AES-256
✓ Never shown to customers
✓ Only accessible by authorized personnel
✓ PIPEDA compliant

We take your privacy seriously.`
  },
  {
    id: 'rating-system',
    category: 'general',
    title: 'How does the rating system work?',
    icon: Users,
    content: `Rating details:
• Customers can rate you 1-5 stars after each session
• Ratings appear on your profile and affect request priority
• Only completed sessions receive ratings
• Cancelled sessions don't affect your rating
• You can view all reviews in the Reviews & Ratings page

Maintain 4.0+ average for best visibility!`
  },
  {
    id: 'availability',
    category: 'general',
    title: 'Managing my availability',
    icon: Clock,
    content: `Set your availability:
1. Go to Availability page
2. Add time blocks for each day you're available
3. Set start and end times
4. Toggle blocks active/inactive as needed
5. Use Time Off feature for vacations

Changes take effect immediately for new bookings.`
  },
  {
    id: 'documents',
    category: 'general',
    title: 'Required documents',
    icon: FileText,
    content: `Upload these documents in the Documents page:
• Driver's License (required)
• Liability Insurance (required)
• Mechanic Certification (recommended)
• Void Cheque for payouts (required)

All documents are reviewed within 24-48 hours.
Expired documents will trigger automatic reminders.`
  }
]

export default function EmergencyHelpPanel({ onClose }: HelpPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null)

  const categories = [
    { id: 'all' as const, label: 'All Topics', icon: HelpCircle },
    { id: 'emergency' as const, label: 'Emergency', icon: AlertTriangle },
    { id: 'technical' as const, label: 'Technical', icon: Settings },
    { id: 'payment' as const, label: 'Payment', icon: DollarSign },
    { id: 'general' as const, label: 'General', icon: FileText },
  ]

  const filteredArticles = HELP_ARTICLES.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory
    const matchesSearch = !searchQuery ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
          <div>
            <h2 className="text-2xl font-bold text-white">Help & Support</h2>
            <p className="mt-1 text-sm text-slate-400">Get instant help with common issues</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-600 bg-slate-800 p-2 text-slate-300 transition hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Emergency Contact Banner */}
        <div className="border-b border-red-500/30 bg-red-900/20 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="flex-1">
              <p className="font-semibold text-red-200">Need immediate assistance?</p>
              <p className="text-sm text-red-300/80">
                Call our 24/7 support: <strong>1-800-AUTO-DOC</strong> (1-800-288-6362)
              </p>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(90vh-180px)] overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0 border-r border-slate-700/50 bg-slate-800/30 p-4 overflow-y-auto">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              {categories.map(cat => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id)
                      setSelectedArticle(null)
                    }}
                    className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {cat.label}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 rounded-lg border border-blue-500/30 bg-blue-900/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-blue-400" />
                <p className="font-semibold text-blue-200 text-sm">Live Chat</p>
              </div>
              <p className="text-xs text-blue-300/80 mb-3">
                Chat with a support agent
              </p>
              <button className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700">
                Start Chat
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedArticle ? (
              <div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="mb-4 text-sm text-blue-400 hover:text-blue-300 transition"
                >
                  ← Back to articles
                </button>

                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-full bg-blue-500/10 p-3">
                      <selectedArticle.icon className="h-6 w-6 text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{selectedArticle.title}</h3>
                  </div>

                  <div className="prose prose-invert max-w-none">
                    <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                      {selectedArticle.content}
                    </p>
                  </div>

                  <div className="mt-6 rounded-lg border border-slate-700/50 bg-slate-900/50 p-4">
                    <p className="text-sm text-slate-400">
                      Was this helpful?{' '}
                      <button className="text-blue-400 hover:text-blue-300 ml-2">
                        Yes
                      </button>
                      {' / '}
                      <button className="text-blue-400 hover:text-blue-300">
                        No
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">
                  {selectedCategory === 'all' ? 'All Help Articles' : categories.find(c => c.id === selectedCategory)?.label}
                </h3>

                {filteredArticles.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/30 p-12 text-center">
                    <HelpCircle className="mx-auto h-12 w-12 text-slate-600" />
                    <p className="mt-4 text-slate-400">No articles found</p>
                    <p className="mt-2 text-sm text-slate-500">Try a different search or category</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filteredArticles.map(article => {
                      const Icon = article.icon
                      return (
                        <button
                          key={article.id}
                          onClick={() => setSelectedArticle(article)}
                          className="flex items-start gap-4 rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 text-left transition hover:border-blue-500/30 hover:bg-slate-800"
                        >
                          <div className={`flex-shrink-0 rounded-lg p-2 ${
                            article.category === 'emergency'
                              ? 'bg-red-500/10 text-red-400'
                              : article.category === 'payment'
                              ? 'bg-green-500/10 text-green-400'
                              : article.category === 'technical'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-slate-500/10 text-slate-400'
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{article.title}</h4>
                            <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                              {article.content.split('\n')[0]}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
