/**
 * Phase 2: Replace hardcoded pricing values with config imports
 * Batch replacement script for mechanic surface files
 */

const fs = require('fs')
const path = require('path')

const replacements = [
  // API Routes
  {
    file: 'src/app/api/mechanic/escalate-session/route.ts',
    changes: [
      {
        find: `import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'`,
        replace: `import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'
import { MECHANIC_FEES } from '@/config/mechanicPricing'`,
      },
      {
        find: `        referral_fee_percent: 5.00 // Default 5% referral fee`,
        replace: `        referral_fee_percent: MECHANIC_FEES.REFERRAL_FEE_PERCENT // Default 5% referral fee`,
        telemetry: '[MECH PRICING] {"source":"escalate-session/route.ts","replaced":"5.00","using":"config.REFERRAL_FEE_PERCENT"}'
      }
    ]
  },
  {
    file: 'src/app/api/mechanic/dashboard/stats/route.ts',
    changes: [
      {
        find: `    // Calculate revenue from completed sessions (70% mechanic share)`,
        replace: `    // Calculate revenue from completed sessions (85% mechanic share from config)`,
        telemetry: '[MECH PRICING] {"source":"dashboard/stats/route.ts","replaced":"70% comment","using":"config.B2C_MECHANIC_SHARE_RATE"}'
      }
    ]
  },

  // Frontend Pages
  {
    file: 'src/app/mechanic/earnings/page.tsx',
    changes: [
      {
        find: `                <p className="text-sm text-green-100 mt-1">
                  After 15% platform fee
                </p>`,
        replace: `                <p className="text-sm text-green-100 mt-1">
                  After {MECHANIC_FEES.PLATFORM_FEE_PERCENT}% platform fee
                </p>`,
        telemetry: '[MECH PRICING] {"source":"earnings/page.tsx","replaced":"15%","using":"config.PLATFORM_FEE_PERCENT","line":201}'
      },
      {
        find: `                  <p className="text-sm text-blue-300">
                    Export your earnings history for tax reporting purposes. The platform fee (15%) is already
                    deducted from your earnings. Consult with a tax professional for guidance on reporting your
                    income as an independent contractor.
                  </p>`,
        replace: `                  <p className="text-sm text-blue-300">
                    Export your earnings history for tax reporting purposes. The platform fee ({MECHANIC_FEES.PLATFORM_FEE_PERCENT}%) is already
                    deducted from your earnings. Consult with a tax professional for guidance on reporting your
                    income as an independent contractor.
                  </p>`,
        telemetry: '[MECH PRICING] {"source":"earnings/page.tsx","replaced":"15%","using":"config.PLATFORM_FEE_PERCENT","line":411}'
      },
      {
        find: `'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  TrendingUp,
  MessageCircle,
  Video,
  Calendar,
  Download,
  AlertCircle,
  ArrowLeft
} from 'lucide-react'`,
        replace: `'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  TrendingUp,
  MessageCircle,
  Video,
  Calendar,
  Download,
  AlertCircle,
  ArrowLeft
} from 'lucide-react'
import { MECHANIC_FEES } from '@/config/mechanicPricing'`,
      }
    ]
  },

  {
    file: 'src/app/mechanic/statements/page.tsx',
    changes: [
      {
        find: `              <div className="flex justify-between border-t border-slate-700 pt-3">
                <span className="text-slate-300">Your Earnings (85%)</span>
                <span className="text-orange-400 font-bold">\${statement.virtualWork.earnings.toFixed(2)}</span>
              </div>`,
        replace: `              <div className="flex justify-between border-t border-slate-700 pt-3">
                <span className="text-slate-300">Your Earnings ({MECHANIC_FEES.MECHANIC_SHARE_PERCENT}%)</span>
                <span className="text-orange-400 font-bold">\${statement.virtualWork.earnings.toFixed(2)}</span>
              </div>`,
        telemetry: '[MECH PRICING] {"source":"statements/page.tsx","replaced":"85%","using":"config.MECHANIC_SHARE_PERCENT","line":221}'
      },
      {
        find: `            <div className="flex justify-between py-2">
              <span className="text-slate-300">Platform Fees (15% on virtual)</span>
              <span className="text-red-400">-\${statement.expenses.platformFees.toFixed(2)}</span>
            </div>`,
        replace: `            <div className="flex justify-between py-2">
              <span className="text-slate-300">Platform Fees ({MECHANIC_FEES.PLATFORM_FEE_PERCENT}% on virtual)</span>
              <span className="text-red-400">-\${statement.expenses.platformFees.toFixed(2)}</span>
            </div>`,
        telemetry: '[MECH PRICING] {"source":"statements/page.tsx","replaced":"15%","using":"config.PLATFORM_FEE_PERCENT","line":252}'
      },
      {
        find: `'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  ArrowLeft,
  Loader2,
  Calendar
} from 'lucide-react'`,
        replace: `'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  ArrowLeft,
  Loader2,
  Calendar
} from 'lucide-react'
import { MECHANIC_FEES } from '@/config/mechanicPricing'`,
      }
    ]
  },

  {
    file: 'src/app/mechanic/session/[id]/complete/page.tsx',
    changes: [
      {
        find: `                <p className="text-sm text-slate-300">
                  This session has been escalated to a workshop. You'll receive a 5% referral fee when the customer approves the repair quote.
                </p>`,
        replace: `                <p className="text-sm text-slate-300">
                  This session has been escalated to a workshop. You'll receive a {MECHANIC_FEES.REFERRAL_FEE_PERCENT}% referral fee when the customer approves the repair quote.
                </p>`,
        telemetry: '[MECH PRICING] {"source":"session/[id]/complete/page.tsx","replaced":"5%","using":"config.REFERRAL_FEE_PERCENT","line":264}'
      },
      {
        find: `                <p className="text-sm text-slate-300 mb-4">
                  Send this diagnostic to a workshop for repair quote creation. You'll earn a 5% referral fee on approved repairs.
                </p>`,
        replace: `                <p className="text-sm text-slate-300 mb-4">
                  Send this diagnostic to a workshop for repair quote creation. You'll earn a {MECHANIC_FEES.REFERRAL_FEE_PERCENT}% referral fee on approved repairs.
                </p>`,
        telemetry: '[MECH PRICING] {"source":"session/[id]/complete/page.tsx","replaced":"5%","using":"config.REFERRAL_FEE_PERCENT","line":281}'
      },
      {
        find: `'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, FileText, MessageCircle, Building2, AlertCircle, CheckCircle } from 'lucide-react'`,
        replace: `'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, FileText, MessageCircle, Building2, AlertCircle, CheckCircle } from 'lucide-react'
import { MECHANIC_FEES } from '@/config/mechanicPricing'`,
      }
    ]
  },

  // Components
  {
    file: 'src/components/mechanic/EarningsBreakdown.tsx',
    changes: [
      {
        find: `                  <ul className="space-y-1 list-disc list-inside">
                    <li>You set your hourly rate + base session fee</li>
                    <li>Higher tiers command premium session fees</li>
                    <li>Payments processed weekly via Stripe</li>
                    <li>Platform fee: 15% per session</li>
                  </ul>`,
        replace: `                  <ul className="space-y-1 list-disc list-inside">
                    <li>You set your hourly rate + base session fee</li>
                    <li>Higher tiers command premium session fees</li>
                    <li>Payments processed weekly via Stripe</li>
                    <li>Platform fee: {MECHANIC_FEES.PLATFORM_FEE_PERCENT}% per session</li>
                  </ul>`,
        telemetry: '[MECH PRICING] {"source":"EarningsBreakdown.tsx","replaced":"15%","using":"config.PLATFORM_FEE_PERCENT","line":190}'
      },
      {
        find: `  const total = sessions * rate
  const afterFees = total * 0.85 // 15% platform fee`,
        replace: `  const total = sessions * rate
  const afterFees = total * MECHANIC_FEES.B2C_MECHANIC_SHARE_RATE // Mechanic share from config`,
        telemetry: '[MECH PRICING] {"source":"EarningsBreakdown.tsx","replaced":"0.85","using":"config.B2C_MECHANIC_SHARE_RATE","line":215}'
      },
      {
        find: `  const rate = getTierPrice(tier) || 0
  const total = sessions * rate
  const afterFees = total * 0.85`,
        replace: `  const rate = getTierPrice(tier) || 0
  const total = sessions * rate
  const afterFees = total * MECHANIC_FEES.B2C_MECHANIC_SHARE_RATE`,
        telemetry: '[MECH PRICING] {"source":"EarningsBreakdown.tsx","replaced":"0.85","using":"config.B2C_MECHANIC_SHARE_RATE","line":251}'
      },
      {
        find: `/**
 * Earnings Breakdown Component
 * Shows mechanics their earnings potential by tier
 */

'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { SpecialistTierBadge, getTierPrice } from '@/components/SpecialistTierBadge'
import type { SpecialistTier } from '@/components/SpecialistTierBadge'`,
        replace: `/**
 * Earnings Breakdown Component
 * Shows mechanics their earnings potential by tier
 */

'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { SpecialistTierBadge, getTierPrice } from '@/components/SpecialistTierBadge'
import type { SpecialistTier } from '@/components/SpecialistTierBadge'
import { MECHANIC_FEES } from '@/config/mechanicPricing'`,
      }
    ]
  },

  {
    file: 'src/components/mechanic/VirtualSessionCard.tsx',
    changes: [
      {
        find: `  const getYourEarnings = () => {
    // Platform fee is 15%
    const platformFee = session.total_price * 0.15
    const yourEarnings = session.total_price - platformFee
    return yourEarnings.toFixed(2)
  }`,
        replace: `  const getYourEarnings = () => {
    // Platform fee from config
    const platformFee = session.total_price * MECHANIC_FEES.PLATFORM_FEE_RATE
    const yourEarnings = session.total_price - platformFee
    return yourEarnings.toFixed(2)
  }`,
        telemetry: '[MECH PRICING] {"source":"VirtualSessionCard.tsx","replaced":"0.15","using":"config.PLATFORM_FEE_RATE","line":102}'
      },
      {
        find: `              <p className="text-xs text-green-700">
                (\${session.total_price.toFixed(2)} total, 15% platform fee)
              </p>`,
        replace: `              <p className="text-xs text-green-700">
                (\${session.total_price.toFixed(2)} total, {MECHANIC_FEES.PLATFORM_FEE_PERCENT}% platform fee)
              </p>`,
        telemetry: '[MECH PRICING] {"source":"VirtualSessionCard.tsx","replaced":"15%","using":"config.PLATFORM_FEE_PERCENT","line":196}'
      },
      {
        find: `'use client'

import { useState } from 'react'
import { MessageCircle, Video, Clock, DollarSign, User, Car, AlertCircle, CheckCircle } from 'lucide-react'`,
        replace: `'use client'

import { useState } from 'react'
import { MessageCircle, Video, Clock, DollarSign, User, Car, AlertCircle, CheckCircle } from 'lucide-react'
import { MECHANIC_FEES } from '@/config/mechanicPricing'`,
      }
    ]
  }
]

console.log('Phase 2: Replacing hardcoded pricing values...')
console.log('='.repeat(80))

let filesModified = 0
let replacementsMade = 0

replacements.forEach(({ file, changes }) => {
  const filePath = path.join(process.cwd(), file)

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${file} (not found)`)
    return
  }

  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false

  changes.forEach(({ find, replace, telemetry }) => {
    if (content.includes(find)) {
      content = content.replace(find, replace)
      modified = true
      replacementsMade++
      if (telemetry) {
        console.log(telemetry)
      }
    }
  })

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8')
    filesModified++
    console.log(`✅ ${file}`)
  }
})

console.log('='.repeat(80))
console.log(`Complete: ${replacementsMade} replacements in ${filesModified} files`)
