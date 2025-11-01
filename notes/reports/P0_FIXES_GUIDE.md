# P0 Critical Fixes - Implementation Guide

**Generated:** 2025-11-01
**Priority:** CRITICAL - Implement ASAP
**Estimated Total Time:** 4-6 hours

---

## Issue #1: Fix /api/plans Data Loss

**Severity:** 🔴 CRITICAL
**Impact:** Feature flags completely non-functional, credit allocation missing
**Affected Files:** `src/app/api/plans/route.ts`, `src/hooks/useCustomerPlan.ts`
**Estimated Time:** 30 minutes

### Problem

The `/api/plans` route transforms database data but **omits critical fields** needed by the frontend:
- `plan_type` (subscription vs one-time)
- `billing_cycle` (monthly vs annual)
- `credit_allocation` (how many credits per month)
- `plan_category` (basic, premium, enterprise)
- `routing_preference` (mechanic routing logic)
- `restricted_brands` (brand specialist filters)
- `features` (JSONB feature flags)

### Current Code (BROKEN)

```typescript
// src/app/api/plans/route.ts (lines 20-36)
export async function GET() {
  try {
    const { data: plans, error } = await supabaseAdmin
      .from('service_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[GET /api/plans] Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
    }

    // ❌ PROBLEM: This transformation LOSES critical fields
    const transformedPlans = plans.map(plan => ({
      id: plan.slug,
      slug: plan.slug,
      name: plan.name,
      price: `$${plan.price.toFixed(2)}`,
      priceValue: parseFloat(plan.price),
      duration: plan.duration_minutes >= 60
        ? `${Math.floor(plan.duration_minutes / 60)} hour${plan.duration_minutes > 60 ? 's' : ''}`
        : `${plan.duration_minutes} minute${plan.duration_minutes > 1 ? 's' : ''}`,
      durationMinutes: plan.duration_minutes,
      description: plan.description,
      perks: plan.perks || [],
      recommendedFor: plan.recommended_for || '',
      stripePriceId: plan.stripe_price_id
      // ❌ MISSING: plan_type, billing_cycle, credit_allocation, plan_category,
      //             routing_preference, restricted_brands, features, requires_certification
    }))

    return NextResponse.json({ plans: transformedPlans })
  } catch (error) {
    console.error('[GET /api/plans] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Fixed Code (COMPLETE)

```typescript
// src/app/api/plans/route.ts (FIXED)
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/plans - Public endpoint for active service plans
 * Returns all active plans with complete feature flags and routing preferences
 */
export async function GET() {
  try {
    const { data: plans, error } = await supabaseAdmin
      .from('service_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[GET /api/plans] Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
    }

    // ✅ FIXED: Include ALL database fields in transformation
    const transformedPlans = plans.map(plan => ({
      // Basic identification
      id: plan.slug,
      slug: plan.slug,
      name: plan.name,

      // Pricing
      price: `$${plan.price.toFixed(2)}`,
      priceValue: parseFloat(plan.price),
      stripePriceId: plan.stripe_price_id,

      // Duration
      duration: plan.duration_minutes >= 60
        ? `${Math.floor(plan.duration_minutes / 60)} hour${plan.duration_minutes > 60 ? 's' : ''}`
        : `${plan.duration_minutes} minute${plan.duration_minutes > 1 ? 's' : ''}`,
      durationMinutes: plan.duration_minutes,

      // Content
      description: plan.description,
      perks: plan.perks || [],
      recommendedFor: plan.recommended_for || '',

      // ✅ CRITICAL ADDITIONS - Previously missing fields:

      // Subscription & Payment
      planType: plan.plan_type, // 'one_time' | 'subscription'
      billingCycle: plan.billing_cycle, // 'monthly' | 'annual' | null
      creditAllocation: plan.credit_allocation, // Number of credits per billing cycle

      // Feature Flags & Tier
      planCategory: plan.plan_category, // 'basic' | 'premium' | 'enterprise'
      features: plan.features || {}, // JSONB feature flags object

      // Routing & Specialist Logic
      routingPreference: plan.routing_preference, // 'any' | 'general' | 'brand_specialist'
      restrictedBrands: plan.restricted_brands || [], // Array of brand names
      requiresCertification: plan.requires_certification || false, // Red Seal requirement
    }))

    return NextResponse.json({ plans: transformedPlans })
  } catch (error) {
    console.error('[GET /api/plans] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Update Frontend Type Definition

```typescript
// src/hooks/useCustomerPlan.ts (Update interface)
interface ServicePlan {
  id: string
  slug: string
  name: string
  price: string
  priceValue: number
  duration: string
  durationMinutes: number
  description: string
  perks: string[]
  recommendedFor: string
  stripePriceId: string | null

  // ✅ ADD THESE (previously optional, now required):
  planType: 'one_time' | 'subscription'
  billingCycle: 'monthly' | 'annual' | null
  creditAllocation: number | null
  planCategory: 'basic' | 'premium' | 'enterprise'
  features: Record<string, boolean | string | number>
  routingPreference: 'any' | 'general' | 'brand_specialist'
  restrictedBrands: string[]
  requiresCertification: boolean
}
```

### Validation

```bash
# Test the API endpoint
curl http://localhost:3000/api/plans | jq '.'

# Verify all fields are present:
# - planType
# - billingCycle
# - creditAllocation
# - planCategory
# - features
# - routingPreference
# - restrictedBrands
# - requiresCertification
```

---

## Issue #2: Add Credit Balance to Customer Dashboard

**Severity:** 🔴 CRITICAL
**Impact:** Users cannot see their subscription credit balance
**Affected Files:** `src/app/customer/dashboard/page.tsx`, `src/app/api/customer/dashboard/stats/route.ts`
**Estimated Time:** 2 hours

### Problem

The `customer_subscriptions.current_credits` field exists in the database, and the API can fetch it, but the dashboard **never displays it to users**. This is critical for a credit-based subscription model.

### Step 1: Update Dashboard Stats API

```typescript
// src/app/api/customer/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const authResult = await requireCustomerAPI(req)
  if (authResult.error) return authResult.error

  const customer = authResult.data
  const customerId = customer.id

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  try {
    // ... existing queries for sessions, warranties, etc ...

    // ✅ ADD: Fetch active subscription with credit balance
    const { data: activeSubscription } = await supabaseAdmin
      .from('customer_subscriptions')
      .select(`
        id,
        current_credits,
        total_credits_allocated,
        credits_used,
        status,
        billing_cycle_end,
        next_billing_date,
        plan:service_plans (
          name,
          credit_allocation,
          billing_cycle
        )
      `)
      .eq('customer_id', customerId)
      .in('status', ['active', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Build response with subscription data
    return NextResponse.json({
      total_services: totalSessions,
      total_spent: parseFloat(totalSpent.toFixed(2)),
      active_warranties: activeWarranties || 0,
      pending_quotes: pendingQuotes || 0,
      has_used_free_session: hasUsedFreeSession,
      account_type: accountType,
      is_b2c_customer: isB2CCustomer,

      // ✅ ADD: Subscription credit data
      subscription: activeSubscription ? {
        has_active: true,
        current_credits: activeSubscription.current_credits,
        total_allocated: activeSubscription.total_credits_allocated,
        credits_used: activeSubscription.credits_used,
        plan_name: activeSubscription.plan?.name || 'Unknown',
        credit_allocation: activeSubscription.plan?.credit_allocation || 0,
        billing_cycle: activeSubscription.plan?.billing_cycle || 'monthly',
        next_billing_date: activeSubscription.next_billing_date,
        billing_cycle_end: activeSubscription.billing_cycle_end,
      } : {
        has_active: false,
        current_credits: 0,
        total_allocated: 0,
        credits_used: 0,
        plan_name: null,
        credit_allocation: 0,
        billing_cycle: null,
        next_billing_date: null,
        billing_cycle_end: null,
      }
    })
  } catch (error) {
    console.error('[CUSTOMER DASHBOARD STATS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Step 2: Update Dashboard Page Interface

```typescript
// src/app/customer/dashboard/page.tsx (Add to interfaces)

interface DashboardStats {
  total_services: number
  total_spent: number
  active_warranties: number
  pending_quotes: number
  has_used_free_session: boolean | null
  account_type: string
  is_b2c_customer: boolean

  // ✅ ADD: Subscription data
  subscription: {
    has_active: boolean
    current_credits: number
    total_allocated: number
    credits_used: number
    plan_name: string | null
    credit_allocation: number
    billing_cycle: string | null
    next_billing_date: string | null
    billing_cycle_end: string | null
  }
}
```

### Step 3: Add Credit Balance Widget to Dashboard

```typescript
// src/app/customer/dashboard/page.tsx
// Add this component within the dashboard layout

{/* ✅ ADD: Credit Balance Widget */}
{stats.subscription.has_active && (
  <div className="rounded-2xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 p-4 sm:p-6 shadow-2xl backdrop-blur">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
          <svg
            className="h-6 w-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-white">
            Subscription Credits
          </h3>
          <p className="text-xs sm:text-sm text-blue-300">
            {stats.subscription.plan_name}
          </p>
        </div>
      </div>
    </div>

    {/* Credit Balance Display */}
    <div className="space-y-4">
      {/* Current Credits - Large Display */}
      <div className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-400/30">
        <div className="text-5xl sm:text-6xl font-bold text-white mb-2">
          {stats.subscription.current_credits}
        </div>
        <div className="text-sm sm:text-base text-blue-200">
          Credits Remaining
        </div>
      </div>

      {/* Credit Usage Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-blue-500/10 border border-blue-400/20 p-3">
          <div className="text-xs text-blue-300 mb-1">Total Allocated</div>
          <div className="text-xl font-bold text-white">
            {stats.subscription.total_allocated}
          </div>
        </div>
        <div className="rounded-lg bg-blue-500/10 border border-blue-400/20 p-3">
          <div className="text-xs text-blue-300 mb-1">Credits Used</div>
          <div className="text-xl font-bold text-white">
            {stats.subscription.credits_used}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-blue-300 mb-2">
          <span>Usage This Cycle</span>
          <span>
            {stats.subscription.credits_used} / {stats.subscription.credit_allocation}
          </span>
        </div>
        <div className="h-2 bg-blue-900/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
            style={{
              width: `${Math.min(100, (stats.subscription.credits_used / stats.subscription.credit_allocation) * 100)}%`
            }}
          />
        </div>
      </div>

      {/* Renewal Date */}
      {stats.subscription.next_billing_date && (
        <div className="text-xs text-blue-300 text-center pt-2 border-t border-blue-400/20">
          Next renewal: {new Date(stats.subscription.next_billing_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
      )}
    </div>
  </div>
)}
```

### Step 4: Add Credits Display to Top Navigation (Optional)

```typescript
// src/components/customer/CustomerNavbar.tsx or similar
// Add this to the navbar for quick visibility

<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30">
  <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  <span className="text-sm font-semibold text-white">
    {currentCredits} credits
  </span>
</div>
```

---

## Issue #3: Fix Type Safety - Remove `| string` from SessionStatus

**Severity:** 🔴 CRITICAL
**Impact:** Defeats TypeScript type checking, allows invalid status values
**Affected Files:** `src/types/session.ts`, all components using SessionStatus
**Estimated Time:** 15 minutes

### Problem

The `SessionRequest` type uses `SessionStatus | string` which defeats the entire purpose of having a strict enum.

### Current Code (BROKEN)

```typescript
// src/types/session.ts
export type SessionStatus =
  | 'pending'
  | 'waiting'
  | 'live'
  | 'reconnecting'
  | 'accepted'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'archived'
  | 'unattended'

export type SessionRequest = {
  id: string
  customerId: string
  customerName: string
  sessionType: string
  planCode: string
  status: SessionStatus | string  // ❌ PROBLEM: Allows ANY string
  mechanicId?: string
  intakeId?: string | null
  sessionId?: string | null
}
```

### Fixed Code (STRICT TYPES)

```typescript
// src/types/session.ts (FIXED)

/**
 * Strict session status enum
 * ⚠️ DO NOT add `| string` - this defeats type safety!
 */
export type SessionStatus =
  | 'pending'
  | 'waiting'
  | 'live'
  | 'reconnecting'
  | 'accepted'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'archived'
  | 'unattended'

// ✅ FIXED: Strict typing without string union
export type SessionRequest = {
  id: string
  customerId: string
  customerName: string
  sessionType: string
  planCode: string
  status: SessionStatus  // ✅ STRICT - Only valid status values allowed
  mechanicId?: string
  intakeId?: string | null
  sessionId?: string | null
}

/**
 * Type guard to validate status strings at runtime
 * Use this when receiving data from API or external sources
 */
export function isValidSessionStatus(status: string): status is SessionStatus {
  const validStatuses: SessionStatus[] = [
    'pending',
    'waiting',
    'live',
    'reconnecting',
    'accepted',
    'scheduled',
    'completed',
    'cancelled',
    'expired',
    'refunded',
    'archived',
    'unattended'
  ]
  return validStatuses.includes(status as SessionStatus)
}

/**
 * Safely parse a status string with fallback
 * Returns the status if valid, otherwise returns the fallback
 */
export function parseSessionStatus(
  status: string,
  fallback: SessionStatus = 'pending'
): SessionStatus {
  return isValidSessionStatus(status) ? status : fallback
}
```

### Update API Routes to Validate

```typescript
// Example: src/app/api/customer/active-sessions/route.ts

import { isValidSessionStatus, parseSessionStatus } from '@/types/session'

export async function GET(req: NextRequest) {
  // ... fetch sessions from database ...

  const transformedSessions = sessions.map(session => {
    // ✅ Validate status before using it
    if (!isValidSessionStatus(session.status)) {
      console.warn(`[Active Sessions API] Invalid status: ${session.status} for session ${session.id}`)
    }

    return {
      id: session.id,
      plan: session.plan,
      type: session.type,
      status: parseSessionStatus(session.status, 'pending'), // ✅ Safe parsing
      createdAt: session.created_at,
      mechanicName: mechanicName
    }
  })

  return NextResponse.json({ sessions: transformedSessions })
}
```

### Add Runtime Validation with Zod (Recommended)

```typescript
// src/lib/validation/session-schemas.ts (NEW FILE)
import { z } from 'zod'

export const SessionStatusSchema = z.enum([
  'pending',
  'waiting',
  'live',
  'reconnecting',
  'accepted',
  'scheduled',
  'completed',
  'cancelled',
  'expired',
  'refunded',
  'archived',
  'unattended'
])

export const SessionRequestSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  customerName: z.string(),
  sessionType: z.string(),
  planCode: z.string(),
  status: SessionStatusSchema, // ✅ Validated at runtime
  mechanicId: z.string().uuid().optional(),
  intakeId: z.string().uuid().nullable().optional(),
  sessionId: z.string().uuid().nullable().optional()
})

// Usage in API routes:
const result = SessionRequestSchema.safeParse(data)
if (!result.success) {
  return NextResponse.json({ error: result.error }, { status: 400 })
}
```

---

## Issue #4: Add TypeScript Types for RPC Functions

**Severity:** 🔴 CRITICAL
**Impact:** No autocomplete or type checking for database function results
**Affected Files:** `src/app/api/customer/analytics/route.ts`, create `src/types/database-functions.ts`
**Estimated Time:** 1 hour

### Problem

The analytics API calls Supabase RPC functions (`get_customer_spending_trend`, `get_customer_session_distribution`) but has no TypeScript definitions for the return types.

### Current Code (NO TYPES)

```typescript
// src/app/api/customer/analytics/route.ts (lines 28-35)

// ❌ PROBLEM: No type for spendingTrend or sessionDistribution
const { data: spendingTrend } = await supabaseAdmin.rpc('get_customer_spending_trend', {
  p_customer_id: customerId,
})

const { data: sessionDistribution } = await supabaseAdmin.rpc('get_customer_session_distribution', {
  p_customer_id: customerId,
})

// Later used without type safety:
const monthlySpending = spendingTrend?.map((item: any, index: number, arr: any[]) => {
  //                                          ^^^^ NO TYPE SAFETY
```

### Step 1: Create Database Function Types

```typescript
// src/types/database-functions.ts (NEW FILE)

/**
 * Type definitions for Supabase RPC (stored procedure) functions
 * These should match the RETURN types of your database functions
 */

// ============================================================================
// Customer Analytics Functions
// ============================================================================

/**
 * Return type for get_customer_spending_trend RPC function
 * Shows monthly spending over last 12 months
 */
export interface CustomerSpendingTrendRow {
  month: string          // Format: 'YYYY-MM'
  total_spent: string    // Decimal as string (PostgreSQL returns numeric as string)
  session_count: number  // Number of sessions in that month
}

/**
 * Return type for get_customer_session_distribution RPC function
 * Shows breakdown of session types
 */
export interface CustomerSessionDistributionRow {
  session_type: 'chat' | 'video' | 'diagnostic' | 'upgraded_from_chat'
  count: number
  percentage: string  // Decimal as string
}

/**
 * Return type for get_customer_credit_balance RPC function
 * Returns current credit balance for active subscription
 */
export interface CustomerCreditBalance {
  balance: number
}

// ============================================================================
// Mechanic Analytics Functions
// ============================================================================

/**
 * Return type for mechanic revenue breakdown functions
 */
export interface MechanicRevenueRow {
  date: string
  total_revenue: string  // Decimal as string
  total_earnings: string // Decimal as string
  session_count: number
}

// ============================================================================
// Admin Analytics Functions
// ============================================================================

/**
 * Return type for platform-wide metrics
 */
export interface PlatformMetricsRow {
  metric_name: string
  metric_value: number
  calculated_at: string
}

// ============================================================================
// Type-safe RPC wrapper functions
// ============================================================================

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Type-safe wrapper for get_customer_spending_trend
 */
export async function getCustomerSpendingTrend(
  supabase: SupabaseClient,
  customerId: string
): Promise<CustomerSpendingTrendRow[]> {
  const { data, error } = await supabase
    .rpc('get_customer_spending_trend', {
      p_customer_id: customerId
    })

  if (error) {
    console.error('[RPC] get_customer_spending_trend error:', error)
    throw error
  }

  return data || []
}

/**
 * Type-safe wrapper for get_customer_session_distribution
 */
export async function getCustomerSessionDistribution(
  supabase: SupabaseClient,
  customerId: string
): Promise<CustomerSessionDistributionRow[]> {
  const { data, error } = await supabase
    .rpc('get_customer_session_distribution', {
      p_customer_id: customerId
    })

  if (error) {
    console.error('[RPC] get_customer_session_distribution error:', error)
    throw error
  }

  return data || []
}

/**
 * Type-safe wrapper for get_customer_credit_balance
 */
export async function getCustomerCreditBalance(
  supabase: SupabaseClient,
  customerId: string
): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_customer_credit_balance', {
      p_customer_id: customerId
    })

  if (error) {
    console.error('[RPC] get_customer_credit_balance error:', error)
    throw error
  }

  return data || 0
}
```

### Step 2: Update Analytics API to Use Types

```typescript
// src/app/api/customer/analytics/route.ts (FIXED)
import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  getCustomerSpendingTrend,
  getCustomerSessionDistribution,
  CustomerSpendingTrendRow,
  CustomerSessionDistributionRow
} from '@/types/database-functions'

export async function GET(req: NextRequest) {
  const authResult = await requireCustomerAPI(req)
  if (authResult.error) return authResult.error

  const customer = authResult.data
  const customerId = customer.id

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  try {
    // ✅ FIXED: Now has full type safety
    const spendingTrend = await getCustomerSpendingTrend(supabaseAdmin, customerId)
    const sessionDistribution = await getCustomerSessionDistribution(supabaseAdmin, customerId)

    // ✅ Now TypeScript knows the exact shape of these arrays
    const monthlySpending = spendingTrend.map((item, index, arr) => {
      // ✅ item.month autocompletes!
      // ✅ item.total_spent is typed as string (not any)
      // ✅ item.session_count is typed as number

      const prevAmount = index < arr.length - 1 ? parseFloat(arr[index + 1].total_spent) : 0
      const currentAmount = parseFloat(item.total_spent)
      const change = prevAmount > 0 ? ((currentAmount - prevAmount) / prevAmount) * 100 : 0

      return {
        month: new Date(item.month + '-01').toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        amount: currentAmount,
        trend: change > 0 ? ('up' as const) : change < 0 ? ('down' as const) : ('stable' as const),
        change: Math.abs(Math.round(change)),
      }
    })

    const colorMap: Record<string, string> = {
      chat: '#3B82F6',
      video: '#10B981',
      diagnostic: '#F59E0B',
      upgraded_from_chat: '#8B5CF6',
    }

    const serviceDistribution = sessionDistribution.map((item) => ({
      // ✅ item.session_type is typed - autocomplete works!
      type: item.session_type.charAt(0).toUpperCase() + item.session_type.slice(1),
      count: item.count,
      percentage: Math.round(parseFloat(item.percentage)),
      color: colorMap[item.session_type] || '#8B5CF6',
    }))

    return NextResponse.json({
      monthlySpending,
      serviceDistribution,
      // ... rest of response
    })
  } catch (error) {
    console.error('[CUSTOMER ANALYTICS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Step 3: Generate Complete Database Types (BEST PRACTICE)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Generate TypeScript types from your Supabase project
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts

# Or if using local development:
supabase gen types typescript --local > src/types/database.ts
```

Then update your imports:

```typescript
// src/types/database-functions.ts
import { Database } from './database'

// Now you can use generated types:
export type CustomerSpendingTrendRow = Database['public']['Functions']['get_customer_spending_trend']['Returns'][number]
```

---

## Testing Checklist

After implementing all P0 fixes:

### Fix #1: Plans API
- [ ] `/api/plans` returns all fields including `planCategory`, `features`, etc.
- [ ] `useCustomerPlan.hasFeature()` returns correct boolean values
- [ ] `requiresBrandSpecialist()` works correctly
- [ ] SessionLauncher can access credit allocation

### Fix #2: Credit Balance
- [ ] Dashboard displays current credit balance
- [ ] Credit usage percentage shows correctly
- [ ] Next billing date displayed
- [ ] No errors when no active subscription

### Fix #3: Type Safety
- [ ] TypeScript compile succeeds with strict mode
- [ ] No `| string` unions in session types
- [ ] Exhaustive switch statements work for SessionStatus
- [ ] Invalid status values rejected at runtime

### Fix #4: RPC Types
- [ ] Autocomplete works for RPC function results
- [ ] No `any` types in analytics code
- [ ] Type errors caught at compile time
- [ ] RPC wrapper functions tested

---

## Validation Commands

```bash
# Type checking
npm run typecheck

# Lint for any types
npm run lint | grep -i "any"

# Build production
npm run build

# Test API endpoints
curl http://localhost:3000/api/plans | jq '.plans[0] | keys'
curl http://localhost:3000/api/customer/dashboard/stats | jq '.subscription'

# Visual regression testing (if available)
npm run test:visual

# E2E tests
npm run test:e2e -- --grep "dashboard|credits|plans"
```

---

## Rollback Plan

If any issues arise:

```bash
# Rollback to previous commit
git revert HEAD

# Or restore specific files
git checkout HEAD~1 -- src/app/api/plans/route.ts
git checkout HEAD~1 -- src/app/customer/dashboard/page.tsx
git checkout HEAD~1 -- src/types/session.ts
```

---

## Post-Implementation

After all P0 fixes are deployed:

1. **Monitor Error Logs** - Check for any new runtime errors
2. **User Feedback** - Ask beta users to verify credit balance displays correctly
3. **Performance** - Verify no regression in page load times
4. **Analytics** - Track feature flag usage to ensure they're working

---

**Estimated Total Time:** 4-6 hours (all P0 fixes combined)
**Priority:** CRITICAL - These issues block core functionality
**Suggested Order:** Fix #1 → Fix #4 → Fix #3 → Fix #2

Once complete, move to P1 issues (type consistency, interface consolidation, mobile touch targets).
