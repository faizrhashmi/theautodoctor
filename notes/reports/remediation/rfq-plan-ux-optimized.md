# RFQ Marketplace Implementation Plan
**Pixel-Perfect, Mobile-First, Customer-Centric Design**

## 🎯 Executive Summary

**Objective:** Build a professional, industry-grade RFQ (Request for Quote) marketplace that feels as polished as Expedia, Shopify, or modern dealer management systems (DMS).

**Approach:**
- 📱 **Mobile-first** responsive design
- ✨ **Wizard-based** multi-step forms (no overwhelming single pages)
- 🤖 **Smart defaults** - prefill everything possible
- ♿ **Accessible** - WCAG 2.1 AA compliant
- 🎨 **Professional UI** - matches existing AskAutoDoctor dark theme
- 🔒 **Privacy-first** - PIPEDA/CASL compliant
- 🚀 **Zero-downtime** rollout with feature flag

**Timeline:** 6-8 weeks across 6 phases

**Risk:** VERY LOW - Feature flag ensures Direct Quote system unaffected

---

## 🎨 Design System & UX Principles

### Visual Design Standards

**Color Palette (Dark Theme):**
```css
--bg-primary: #0f172a (slate-950)
--bg-secondary: #1e293b (slate-900)
--bg-tertiary: #334155 (slate-800)
--accent-primary: #f97316 (orange-500)
--accent-secondary: #fb923c (orange-400)
--text-primary: #ffffff
--text-secondary: #cbd5e1 (slate-300)
--text-tertiary: #94a3b8 (slate-400)
--border-default: #475569 (slate-700)
--border-focus: #f97316 (orange-500)
--success: #10b981 (green-500)
--warning: #f59e0b (amber-500)
--error: #ef4444 (red-500)
```

**Typography:**
```css
/* Headers */
h1: 2.5rem/3rem font-bold (mobile: 2rem/2.5rem)
h2: 2rem/2.5rem font-bold (mobile: 1.5rem/2rem)
h3: 1.5rem/2rem font-semibold (mobile: 1.25rem/1.75rem)

/* Body */
body: 1rem/1.5rem font-normal
small: 0.875rem/1.25rem font-normal
tiny: 0.75rem/1rem font-normal

/* Font family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
```

**Spacing Scale:**
```css
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
2xl: 3rem (48px)
```

**Component Patterns:**

**Buttons:**
```jsx
// Primary Action
<button className="
  w-full sm:w-auto
  px-6 py-3
  bg-orange-500 hover:bg-orange-600
  text-white font-semibold
  rounded-lg
  transition-all duration-200
  shadow-lg hover:shadow-xl
  disabled:opacity-50 disabled:cursor-not-allowed
  focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900
">
  Continue
</button>

// Secondary Action
<button className="
  px-4 py-2
  bg-slate-800 hover:bg-slate-700
  text-slate-300 hover:text-white
  border border-slate-700 hover:border-slate-600
  rounded-lg
  transition-all
">
  Cancel
</button>
```

**Input Fields:**
```jsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-slate-300">
    Field Label
    <span className="text-red-400 ml-1">*</span>
  </label>
  <input
    type="text"
    className="
      w-full
      px-4 py-3
      bg-slate-900
      text-white
      border border-slate-700 focus:border-orange-500
      rounded-lg
      placeholder:text-slate-500
      focus:ring-2 focus:ring-orange-500/20
      transition-all
    "
    placeholder="Enter value..."
  />
  <p className="text-xs text-slate-400">
    Helper text or validation message
  </p>
</div>
```

**Cards:**
```jsx
<div className="
  bg-slate-800/50
  backdrop-blur-sm
  border border-slate-700
  rounded-xl
  p-4 sm:p-6
  shadow-xl
  hover:border-orange-500/50
  transition-all
">
  {/* Card content */}
</div>
```

### UX Principles

1. **Progressive Disclosure** - Show only what's needed at each step
2. **Smart Defaults** - Pre-fill everything possible from existing data
3. **Immediate Feedback** - Visual confirmation for every action
4. **Error Prevention** - Validate before submit, not after
5. **Mobile-First** - Design for thumb reach zones
6. **Accessibility** - Keyboard navigation, screen reader support
7. **Performance** - <2s page loads, optimistic UI updates

### Mobile-First Breakpoints

```css
/* Mobile: default (375px - 640px) */
/* Tablet: sm (640px - 768px) */
/* Desktop: md (768px - 1024px) */
/* Large: lg (1024px+) */
```

**Touch Target Sizes:**
- Minimum: 44x44px
- Recommended: 48x48px
- Inputs: 48px height minimum

---

## 📋 PHASE 0: Read-Only Verification

**Duration:** 2-3 days
**Risk:** VERY LOW
**Goal:** Verify database schema and RLS policies without modifying anything

### Deliverable

**Document:** `notes/reports/remediation/rfq-verification-Phase0.md`

### Tasks

#### 1. Schema Introspection

**Verify Tables Exist:**
```sql
-- Query to run
SELECT
  t.table_name,
  t.table_type,
  pg_size_pretty(pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))) as size
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'workshop_rfq_marketplace',
    'workshop_rfq_bids',
    'workshop_escalation_queue',
    'diagnostic_sessions',
    'repair_quotes'
  )
ORDER BY t.table_name;
```

**Verify Columns for `workshop_rfq_marketplace`:**
```sql
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workshop_rfq_marketplace'
ORDER BY ordinal_position;
```

**Expected Columns:**
- `id` (uuid, PK)
- `escalation_queue_id` (uuid, FK → workshop_escalation_queue)
- `customer_id` (uuid, FK → profiles)
- `diagnostic_session_id` (uuid, FK → diagnostic_sessions)
- `escalating_mechanic_id` (uuid, FK → mechanics)
- `title` (text, required)
- `description` (text, required)
- `issue_category` (text)
- `urgency` (text)
- Vehicle fields: `vehicle_id`, `vehicle_make`, `vehicle_model`, `vehicle_year`, `vehicle_mileage`, `vehicle_vin`
- Location fields: `customer_city`, `customer_province`, `customer_postal_code`, `latitude`, `longitude`
- Budget fields: `budget_min`, `budget_max`
- Bidding fields: `bid_deadline`, `max_bids`, `auto_expire_hours`
- Filters: `min_workshop_rating`, `required_certifications`, `preferred_cities`, `max_distance_km`
- Status: `status` (text, enum)
- Metrics: `view_count`, `bid_count`, `total_workshops_viewed`
- Winner: `accepted_bid_id`, `accepted_at`
- Legal: `customer_consent_to_share_info`, `customer_consent_timestamp`, `referral_fee_disclosed`
- Timestamps: `created_at`, `updated_at`

**Verify Columns for `workshop_rfq_bids`:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workshop_rfq_bids'
ORDER BY ordinal_position;
```

**Expected Columns:**
- `id` (uuid, PK)
- `rfq_marketplace_id` (uuid, FK)
- `workshop_id` (uuid, FK)
- Workshop snapshot: `workshop_name`, `workshop_city`, `workshop_rating`, `workshop_certifications`
- Pricing: `quote_amount`, `parts_cost`, `labor_cost`, `shop_supplies_fee`, `environmental_fee`
- Platform fee: `platform_fee_percent`, `platform_fee_amount`
- Warranty: `warranty_months`, `warranty_mileage`, `warranty_terms`
- Timeline: `estimated_completion_hours`, `available_start_date`
- Status: `status` (text, enum)
- Message: `message_to_customer`, `detailed_breakdown`
- Timestamps: `created_at`, `updated_at`, `submitted_at`, `expires_at`

#### 2. Foreign Key Verification

```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('workshop_rfq_marketplace', 'workshop_rfq_bids')
ORDER BY tc.table_name, tc.constraint_name;
```

#### 3. Index Verification

```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('workshop_rfq_marketplace', 'workshop_rfq_bids')
ORDER BY tablename, indexname;
```

**Expected Indexes:**
- `idx_rfq_marketplace_customer` ON `customer_id`
- `idx_rfq_marketplace_session` ON `diagnostic_session_id`
- `idx_rfq_marketplace_mechanic` ON `escalating_mechanic_id`
- `idx_rfq_marketplace_status` ON `status`
- `idx_rfq_marketplace_created` ON `created_at DESC`
- `idx_rfq_marketplace_location` ON `(latitude, longitude)` WHERE not null
- `idx_rfq_marketplace_category` ON `issue_category`
- `idx_rfq_marketplace_deadline` ON `bid_deadline` WHERE status='open'

#### 4. RLS Policy Verification

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename IN ('workshop_rfq_marketplace', 'workshop_rfq_bids')
ORDER BY tablename, policyname;
```

**Document:**
- Which policies exist
- Which are missing
- Gaps in authorization model

#### 5. Trigger & Function Verification

```sql
-- Check for triggers
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('workshop_rfq_marketplace', 'workshop_rfq_bids')
ORDER BY event_object_table, trigger_name;

-- Check for relevant functions
SELECT
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%rfq%'
ORDER BY routine_name;
```

### Success Criteria

- ✅ All 3 tables exist in database
- ✅ All required columns present and correct data types
- ✅ Foreign keys valid and enforced
- ✅ Performance indexes in place
- ✅ RLS policies documented (or gaps identified)
- ✅ No triggers/functions interfering with our implementation
- ✅ **Gaps documented with proposed migration** (if any)

### Deliverable Structure

```markdown
# RFQ Phase 0 Verification Report

## Schema Introspection Results

### Tables
[Table listing with sizes]

### Columns - workshop_rfq_marketplace
[Full column listing with types]

### Columns - workshop_rfq_bids
[Full column listing with types]

### Foreign Keys
[FK listing with ON DELETE/UPDATE rules]

### Indexes
[Index listing]

### RLS Policies
[Policy listing with USING/WITH CHECK expressions]

## Gaps Identified

### Missing Columns
[List any missing columns]

### Missing Indexes
[List performance indexes needed]

### Missing RLS Policies
[List authorization gaps]

## Migration Proposal (if required)

[Idempotent migration scripts IF gaps found]

## Recommendation

✅ PASS - No migrations required, proceed to Phase 1
OR
⚠️ STOP - Migrations required, awaiting approval
```

**STOP after Phase 0 documentation. Do not proceed to Phase 1 without approval.**

---

## 📋 PHASE 1: Feature Flag Infrastructure

**Duration:** 3-5 days
**Risk:** VERY LOW
**Goal:** Add feature flag system with zero UI exposure

### Deliverable

**Document:** `notes/reports/remediation/rfq-verification-Phase1.md`

### Implementation

#### 1. Environment Variable

**File:** `.env.example`
```bash
# RFQ Marketplace Feature Flag (default: false)
ENABLE_WORKSHOP_RFQ=false
```

**File:** `.env.local` (add to .gitignore)
```bash
ENABLE_WORKSHOP_RFQ=false  # Set to 'true' to enable in development
```

#### 2. Feature Flag Config

**File:** `src/config/featureFlags.ts`
```typescript
/**
 * Feature Flags Configuration
 *
 * Centralized feature flag management for gradual rollouts
 * and emergency kill-switches.
 */

export const FEATURE_FLAGS = {
  /**
   * RFQ Marketplace
   *
   * Enables multi-workshop competitive bidding system.
   * When disabled: RFQ UI hidden, RFQ APIs return 404
   *
   * @default false
   */
  ENABLE_WORKSHOP_RFQ: process.env.ENABLE_WORKSHOP_RFQ === 'true',
} as const

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS
```

#### 3. Server-Side Flag Utilities

**File:** `src/lib/flags.ts`
```typescript
import { FEATURE_FLAGS, type FeatureFlagKey } from '@/config/featureFlags'

/**
 * Server-side feature flag check
 *
 * Use in API routes and server components
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[flag] === true
}

/**
 * RFQ-specific helper
 */
export function isRfqEnabled(): boolean {
  return isFeatureEnabled('ENABLE_WORKSHOP_RFQ')
}

/**
 * Guard for API routes
 *
 * Usage:
 * ```ts
 * export async function POST(request: Request) {
 *   requireFeature('ENABLE_WORKSHOP_RFQ')
 *   // ... route logic
 * }
 * ```
 */
export function requireFeature(flag: FeatureFlagKey): void {
  if (!isFeatureEnabled(flag)) {
    throw new Error(`Feature '${flag}' is not enabled`)
  }
}
```

#### 4. Client-Side Flag Hook

**File:** `src/hooks/useFeatureFlags.ts`
```typescript
'use client'

import { useState, useEffect } from 'react'
import type { FeatureFlagKey } from '@/config/featureFlags'

interface FeatureFlagResponse {
  enabled: boolean
}

/**
 * Client-side feature flag hook
 *
 * Fetches flag status from API to prevent env var leakage
 *
 * Usage:
 * ```tsx
 * const isRfqEnabled = useFeatureFlag('ENABLE_WORKSHOP_RFQ')
 *
 * if (!isRfqEnabled) return null
 *
 * return <RfqButton />
 * ```
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/feature-flags/${flag}`)
      .then(res => res.json())
      .then((data: FeatureFlagResponse) => {
        setEnabled(data.enabled)
        setLoading(false)
      })
      .catch(() => {
        setEnabled(false)
        setLoading(false)
      })
  }, [flag])

  return enabled
}

/**
 * RFQ-specific hook
 */
export function useRfqEnabled(): boolean {
  return useFeatureFlag('ENABLE_WORKSHOP_RFQ')
}
```

#### 5. Feature Flag API Route

**File:** `src/app/api/feature-flags/[flag]/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { isFeatureEnabled, type FeatureFlagKey } from '@/lib/flags'
import { FEATURE_FLAGS } from '@/config/featureFlags'

export async function GET(
  request: Request,
  { params }: { params: { flag: string } }
) {
  const flag = params.flag as FeatureFlagKey

  // Validate flag exists
  if (!(flag in FEATURE_FLAGS)) {
    return NextResponse.json(
      { error: 'Invalid feature flag' },
      { status: 400 }
    )
  }

  const enabled = isFeatureEnabled(flag)

  return NextResponse.json({ enabled })
}
```

#### 6. UI Guard Component

**File:** `src/components/guards/FeatureGate.tsx`
```typescript
'use client'

import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import type { FeatureFlagKey } from '@/config/featureFlags'

interface FeatureGateProps {
  flag: FeatureFlagKey
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Conditionally render children based on feature flag
 *
 * Usage:
 * ```tsx
 * <FeatureGate flag="ENABLE_WORKSHOP_RFQ">
 *   <RfqButton />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const enabled = useFeatureFlag(flag)

  if (!enabled) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * RFQ-specific gate
 */
export function RfqGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <FeatureGate flag="ENABLE_WORKSHOP_RFQ" fallback={fallback}>
      {children}
    </FeatureGate>
  )
}
```

### Testing

**Create test file:** `src/lib/__tests__/flags.test.ts`
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isFeatureEnabled, isRfqEnabled, requireFeature } from '../flags'

describe('Feature Flags', () => {
  const originalEnv = process.env.ENABLE_WORKSHOP_RFQ

  afterEach(() => {
    process.env.ENABLE_WORKSHOP_RFQ = originalEnv
  })

  it('returns false when flag is not set', () => {
    delete process.env.ENABLE_WORKSHOP_RFQ
    expect(isRfqEnabled()).toBe(false)
  })

  it('returns false when flag is set to false', () => {
    process.env.ENABLE_WORKSHOP_RFQ = 'false'
    expect(isRfqEnabled()).toBe(false)
  })

  it('returns true when flag is set to true', () => {
    process.env.ENABLE_WORKSHOP_RFQ = 'true'
    expect(isRfqEnabled()).toBe(true)
  })

  it('throws when requiring disabled feature', () => {
    process.env.ENABLE_WORKSHOP_RFQ = 'false'
    expect(() => requireFeature('ENABLE_WORKSHOP_RFQ')).toThrow()
  })

  it('does not throw when requiring enabled feature', () => {
    process.env.ENABLE_WORKSHOP_RFQ = 'true'
    expect(() => requireFeature('ENABLE_WORKSHOP_RFQ')).not.toThrow()
  })
})
```

### Verification

**Manual Tests:**
1. ✅ Flag reads from environment variable
2. ✅ `isRfqEnabled()` returns false by default
3. ✅ API route `/api/feature-flags/ENABLE_WORKSHOP_RFQ` returns `{ enabled: false }`
4. ✅ `useRfqEnabled()` hook returns false
5. ✅ `<RfqGate>` hides children when flag OFF
6. ✅ Unit tests pass

**Automated Tests:**
```bash
npm run test -- flags.test.ts
```

### Success Criteria

- ✅ Feature flag config deployed
- ✅ Server utils functional
- ✅ Client hooks functional
- ✅ API route works
- ✅ UI gate component ready
- ✅ Unit tests passing
- ✅ **Flag OFF by default**
- ✅ **No UI changes visible**

### Commit

**Commit Message:**
```
feat(rfq): add feature flag infrastructure (default OFF)

- Add ENABLE_WORKSHOP_RFQ env var
- Create feature flag config and utilities
- Add server-side flag checks
- Add client-side useFeatureFlag hook
- Create FeatureGate/RfqGate components
- Add unit tests

No behavior change: flag is OFF by default
All RFQ features hidden until flag enabled

Relates to: RFQ Phase 1
```

**STOP after Phase 1 commit. Await approval for Phase 2.**

---

## 📋 PHASE 2: Mechanic RFQ Creation (UI + API)

**Duration:** 5-7 days
**Risk:** LOW
**Goal:** Build professional, wizard-based RFQ creation flow

### Deliverable

**Document:** `notes/reports/remediation/rfq-verification-Phase2.md`

### UX Design Specifications

#### Multi-Step Wizard Flow

**Overview:**
```
[Step 1: Vehicle & Issue] → [Step 2: Details & Budget] → [Step 3: Review & Submit]
```

**Progress Indicator:**
```jsx
<div className="mb-8">
  <div className="flex items-center justify-between max-w-2xl mx-auto">
    {/* Step 1 */}
    <div className="flex items-center">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500 text-white font-semibold">
        1
      </div>
      <span className="ml-3 text-sm font-medium text-white">Vehicle & Issue</span>
    </div>

    {/* Connector */}
    <div className="flex-1 h-0.5 mx-4 bg-slate-700"></div>

    {/* Step 2 */}
    <div className="flex items-center">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-700 text-slate-400 font-semibold">
        2
      </div>
      <span className="ml-3 text-sm font-medium text-slate-400">Details</span>
    </div>

    {/* Connector */}
    <div className="flex-1 h-0.5 mx-4 bg-slate-700"></div>

    {/* Step 3 */}
    <div className="flex items-center">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-700 text-slate-400 font-semibold">
        3
      </div>
      <span className="ml-3 text-sm font-medium text-slate-400">Review</span>
    </div>
  </div>
</div>
```

#### Step 1: Vehicle & Issue

**Layout:**
```jsx
<div className="max-w-2xl mx-auto space-y-6">
  {/* Vehicle Selection (Prefilled) */}
  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
    <h3 className="text-lg font-semibold text-white mb-4">Vehicle Information</h3>

    {/* Auto-populated from diagnostic session */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Year
        </label>
        <input
          type="number"
          value={2020}
          className="w-full px-4 py-3 bg-slate-900 text-white border border-slate-700 rounded-lg"
          disabled
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Make
        </label>
        <input
          type="text"
          value="Honda"
          className="w-full px-4 py-3 bg-slate-900 text-white border border-slate-700 rounded-lg"
          disabled
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Model
        </label>
        <input
          type="text"
          value="Civic"
          className="w-full px-4 py-3 bg-slate-900 text-white border border-slate-700 rounded-lg"
          disabled
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Trim <span className="text-slate-500">(optional)</span>
        </label>
        <input
          type="text"
          placeholder="e.g., LX, Sport"
          className="w-full px-4 py-3 bg-slate-900 text-white border border-slate-700 focus:border-orange-500 rounded-lg placeholder:text-slate-500"
        />
      </div>
    </div>

    {/* Odometer */}
    <div className="mt-4">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Current Odometer <span className="text-red-400">*</span>
      </label>
      <div className="relative">
        <input
          type="number"
          placeholder="125000"
          className="w-full px-4 py-3 pr-12 bg-slate-900 text-white border border-slate-700 focus:border-orange-500 rounded-lg"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
          km
        </span>
      </div>
    </div>

    {/* VIN (optional) */}
    <div className="mt-4">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        VIN <span className="text-slate-500">(optional)</span>
      </label>
      <input
        type="text"
        placeholder="1HGCV1F36KA123456"
        className="w-full px-4 py-3 bg-slate-900 text-white border border-slate-700 focus:border-orange-500 rounded-lg uppercase font-mono text-sm"
        maxLength={17}
      />
      <p className="mt-1 text-xs text-slate-400">
        Helps workshops provide more accurate quotes
      </p>
    </div>
  </div>

  {/* Issue Description (Prefilled from diagnostic) */}
  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
    <h3 className="text-lg font-semibold text-white mb-4">Issue Description</h3>

    {/* Service Type Tags */}
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-300 mb-3">
        Service Type <span className="text-red-400">*</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {['Brakes', 'Engine', 'Electrical', 'Suspension', 'Transmission', 'Diagnostic', 'Maintenance', 'Other'].map((type) => (
          <button
            key={type}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${type === 'Brakes'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600'
              }
            `}
          >
            {type}
          </button>
        ))}
      </div>
    </div>

    {/* Issue Title */}
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Issue Title <span className="text-red-400">*</span>
      </label>
      <input
        type="text"
        placeholder="e.g., Grinding noise when braking"
        value="Brake noise and vibration when stopping"
        className="w-full px-4 py-3 bg-slate-900 text-white border border-slate-700 focus:border-orange-500 rounded-lg"
        maxLength={200}
      />
      <p className="mt-1 text-xs text-slate-400">
        Brief summary (10-200 characters)
      </p>
    </div>

    {/* Detailed Description (from diagnostic session) */}
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Detailed Description <span className="text-red-400">*</span>
      </label>
      <textarea
        rows={6}
        className="w-full px-4 py-3 bg-slate-900 text-white border border-slate-700 focus:border-orange-500 rounded-lg resize-none"
        placeholder="Describe the issue in detail..."
      >
Customer reports grinding noise when applying brakes, especially at low speeds. Vibration felt through brake pedal. Issue started 2 weeks ago and has gotten progressively worse. No warning lights on dashboard.

Mechanic diagnosis: Front brake pads worn to 2mm, rotors showing scoring. Recommend replacement of front pads and rotor resurfacing or replacement.
      </textarea>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-slate-400">
          Minimum 50 characters, maximum 2000
        </p>
        <p className="text-xs text-slate-500">
          342 / 2000
        </p>
      </div>
    </div>

    {/* Urgency Selector */}
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-3">
        Urgency <span className="text-red-400">*</span>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { value: 'low', label: 'Low', desc: '1-2 weeks', color: 'blue' },
          { value: 'normal', label: 'Normal', desc: 'This week', color: 'green' },
          { value: 'high', label: 'High', desc: '1-2 days', color: 'yellow' },
          { value: 'urgent', label: 'Urgent', desc: 'ASAP', color: 'red' },
        ].map((option) => (
          <button
            key={option.value}
            className={`
              p-4 rounded-lg border-2 transition-all text-left
              ${option.value === 'normal'
                ? `border-${option.color}-500 bg-${option.color}-500/10`
                : 'border-slate-700 bg-slate-900 hover:border-slate-600'
              }
            `}
          >
            <div className={`text-sm font-semibold ${option.value === 'normal' ? `text-${option.color}-400` : 'text-slate-300'}`}>
              {option.label}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {option.desc}
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>

  {/* Photos/Videos */}
  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
    <h3 className="text-lg font-semibold text-white mb-4">
      Photos & Videos <span className="text-slate-500 text-sm font-normal">(optional)</span>
    </h3>

    <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-orange-500 transition-all cursor-pointer">
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-slate-300 font-medium mb-1">
          Click to upload or drag and drop
        </p>
        <p className="text-sm text-slate-500">
          PNG, JPG, HEIC up to 10MB each
        </p>
      </div>
    </div>

    {/* Uploaded files preview */}
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[1, 2].map((i) => (
        <div key={i} className="relative group">
          <div className="aspect-square bg-slate-900 rounded-lg overflow-hidden">
            <img src="/placeholder-brake.jpg" alt="Brake photo" className="w-full h-full object-cover" />
          </div>
          <button className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  </div>

  {/* Navigation Buttons */}
  <div className="flex items-center justify-between pt-6">
    <button className="px-6 py-3 text-slate-400 hover:text-white transition-colors">
      Cancel
    </button>
    <button className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl">
      Continue to Details
      <svg className="inline-block w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</div>
```

#### Step 2: Details & Budget

```jsx
<div className="max-w-2xl mx-auto space-y-6">
  {/* Location (Prefilled from customer profile) */}
  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
    <h3 className="text-lg font-semibold text-white mb-4">Service Location</h3>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          City
        </label>
        <input
          type="text"
          value="Toronto"
          className="w-full px-4 py-3 bg-slate-900 text-white border border-slate-700 rounded-lg"
          disabled
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Province
        </label>
        <input
          type="text"
          value="Ontario"
          className="w-full px-4 py-3 bg-slate-900 text-white border border-slate-700 rounded-lg"
          disabled
        />
      </div>
    </div>

    <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
      <div className="flex items-start">
        <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-blue-300">
          <strong>Privacy Notice:</strong> Workshops will only see your city and province, not your exact address. Your full address is shared only after you accept a bid.
        </div>
      </div>
    </div>
  </div>

  {/* Budget Range (Optional) */}
  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
    <h3 className="text-lg font-semibold text-white mb-2">
      Budget Range <span className="text-slate-500 text-sm font-normal">(optional)</span>
    </h3>
    <p className="text-sm text-slate-400 mb-6">
      Help workshops provide quotes within your budget. This is optional but can lead to better matches.
    </p>

    <div className="space-y-6">
      {/* Range Slider Visual */}
      <div className="px-2">
        <div className="relative h-2 bg-slate-700 rounded-full">
          <div className="absolute h-2 bg-orange-500 rounded-full" style={{ left: '20%', right: '40%' }}></div>
          <div className="absolute w-6 h-6 bg-orange-500 rounded-full border-4 border-slate-900 shadow-lg" style={{ left: '20%', top: '-8px' }}></div>
          <div className="absolute w-6 h-6 bg-orange-500 rounded-full border-4 border-slate-900 shadow-lg" style={{ left: '60%', top: '-8px' }}></div>
        </div>
      </div>

      {/* Min/Max Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Minimum Budget
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              type="number"
              value="300"
              className="w-full pl-8 pr-4 py-3 bg-slate-900 text-white border border-slate-700 focus:border-orange-500 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Maximum Budget
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              type="number"
              value="800"
              className="w-full pl-8 pr-4 py-3 bg-slate-900 text-white border border-slate-700 focus:border-orange-500 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
        <span className="text-sm text-slate-400">Your budget range:</span>
        <span className="text-lg font-semibold text-white">$300 - $800</span>
      </div>
    </div>
  </div>

  {/* Workshop Preferences */}
  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
    <h3 className="text-lg font-semibold text-white mb-4">
      Workshop Preferences <span className="text-slate-500 text-sm font-normal">(optional)</span>
    </h3>

    {/* Minimum Rating */}
    <div className="mb-6">
      <label className="block text-sm font-medium text-slate-300 mb-3">
        Minimum Workshop Rating
      </label>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            className={`flex-1 py-3 rounded-lg border-2 transition-all ${
              rating === 4
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-slate-700 bg-slate-900 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <svg className={`w-5 h-5 ${rating === 4 ? 'text-orange-400' : 'text-slate-500'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className={`text-sm font-medium ${rating === 4 ? 'text-white' : 'text-slate-400'}`}>
                {rating}+
              </span>
            </div>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Only workshops with 4.0+ rating can bid
      </p>
    </div>

    {/* Required Certifications */}
    <div className="mb-6">
      <label className="block text-sm font-medium text-slate-300 mb-3">
        Required Certifications
      </label>
      <div className="flex flex-wrap gap-2">
        {['ASE Certified', 'Red Seal', 'Honda Certified', 'Toyota Certified', 'Dealer Certified'].map((cert) => (
          <button
            key={cert}
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-white transition-all text-sm"
          >
            <span className="mr-2">+</span>
            {cert}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Click to add required certifications
      </p>
    </div>

    {/* Maximum Distance */}
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-3">
        Maximum Distance
      </label>
      <select className="w-full px-4 py-3 bg-slate-900 text-white border border-slate-700 focus:border-orange-500 rounded-lg">
        <option>No limit</option>
        <option>Within 5 km</option>
        <option selected>Within 10 km</option>
        <option>Within 25 km</option>
        <option>Within 50 km</option>
      </select>
      <p className="mt-2 text-xs text-slate-400">
        Only workshops within this range can bid
      </p>
    </div>
  </div>

  {/* Bidding Settings */}
  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
    <h3 className="text-lg font-semibold text-white mb-4">Bidding Settings</h3>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Bid Deadline
        </label>
        <select className="w-full px-4 py-3 bg-slate-900 text-white border border-slate-700 focus:border-orange-500 rounded-lg">
          <option>24 hours</option>
          <option>48 hours</option>
          <option selected>72 hours (3 days)</option>
          <option>5 days</option>
          <option>7 days (1 week)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Maximum Bids
        </label>
        <select className="w-full px-4 py-3 bg-slate-900 text-white border border-slate-700 focus:border-orange-500 rounded-lg">
          <option>3 bids</option>
          <option>5 bids</option>
          <option selected>10 bids</option>
          <option>15 bids</option>
          <option>20 bids</option>
          <option>Unlimited</option>
        </select>
      </div>
    </div>

    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
      <div className="flex items-start">
        <svg className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-green-300">
          Recommended: 72 hours gives workshops time to provide detailed quotes while keeping your request fresh.
        </div>
      </div>
    </div>
  </div>

  {/* Navigation */}
  <div className="flex items-center justify-between pt-6">
    <button className="px-6 py-3 text-slate-400 hover:text-white transition-colors">
      <svg className="inline-block w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
    <button className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl">
      Review RFQ
      <svg className="inline-block w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</div>
```

#### Step 3: Review & Submit

```jsx
<div className="max-w-3xl mx-auto space-y-6">
  {/* Summary Card */}
  <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30 rounded-xl p-6">
    <div className="flex items-start">
      <svg className="w-6 h-6 text-orange-400 mt-1 mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-white mb-2">Ready to Post Your RFQ</h3>
        <p className="text-slate-300">
          Review your request below. Once submitted, up to <strong className="text-orange-400">10 workshops</strong> within <strong className="text-orange-400">10 km</strong> can submit bids for the next <strong className="text-orange-400">72 hours</strong>.
        </p>
      </div>
    </div>
  </div>

  {/* Vehicle Summary */}
  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-white">Vehicle & Issue</h3>
      <button className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
        Edit
      </button>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">Vehicle</span>
        <p className="text-white font-medium mt-1">2020 Honda Civic</p>
      </div>
      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">Odometer</span>
        <p className="text-white font-medium mt-1">125,000 km</p>
      </div>
      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">Service Type</span>
        <p className="text-white font-medium mt-1">Brakes</p>
      </div>
      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">Urgency</span>
        <p className="flex items-center gap-1 font-medium mt-1">
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          <span className="text-white">Normal</span>
        </p>
      </div>
    </div>

    <div className="mb-4">
      <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">Issue</span>
      <h4 className="text-white font-semibold text-lg mb-2">Brake noise and vibration when stopping</h4>
      <p className="text-slate-300 text-sm leading-relaxed">
        Customer reports grinding noise when applying brakes, especially at low speeds. Vibration felt through brake pedal. Issue started 2 weeks ago and has gotten progressively worse...
      </p>
      <button className="text-sm text-orange-400 hover:text-orange-300 transition-colors mt-2">
        Read full description
      </button>
    </div>

    <div>
      <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">Photos</span>
      <div className="flex gap-2">
        <div className="w-20 h-20 bg-slate-900 rounded-lg overflow-hidden">
          <img src="/placeholder-1.jpg" className="w-full h-full object-cover" />
        </div>
        <div className="w-20 h-20 bg-slate-900 rounded-lg overflow-hidden">
          <img src="/placeholder-2.jpg" className="w-full h-full object-cover" />
        </div>
        <div className="w-20 h-20 bg-slate-900 rounded-lg flex items-center justify-center text-slate-500 text-xs">
          +2 more
        </div>
      </div>
    </div>
  </div>

  {/* Budget & Preferences */}
  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-white">Budget & Preferences</h3>
      <button className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
        Edit
      </button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">Budget Range</span>
        <p className="text-white font-semibold text-xl">$300 - $800</p>
      </div>

      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">Location</span>
        <p className="text-white font-medium">Toronto, ON</p>
        <p className="text-xs text-slate-400 mt-1">Within 10 km</p>
      </div>

      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">Minimum Rating</span>
        <div className="flex items-center gap-1">
          {[1,2,3,4].map(i => (
            <svg key={i} className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
          <span className="text-white font-medium ml-1">4.0+</span>
        </div>
      </div>

      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">Bidding</span>
        <p className="text-white font-medium">Up to 10 bids</p>
        <p className="text-xs text-slate-400 mt-1">Closes in 72 hours</p>
      </div>
    </div>
  </div>

  {/* Legal Consent */}
  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
    <label className="flex items-start cursor-pointer group">
      <input
        type="checkbox"
        className="w-5 h-5 mt-0.5 mr-4 bg-slate-900 border-2 border-slate-700 rounded checked:bg-orange-500 checked:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
        checked
      />
      <div className="flex-1">
        <p className="text-white font-medium mb-2">
          I consent to sharing my vehicle and issue information with workshops
          <span className="text-red-400 ml-1">*</span>
        </p>
        <p className="text-sm text-slate-400 leading-relaxed">
          By checking this box, you agree to share your vehicle details, issue description, city, and province with workshops who view your RFQ. Your exact address, email, and phone number will <strong>only</strong> be shared with the workshop you select after accepting their bid. This is required for PIPEDA compliance.
        </p>
      </div>
    </label>
  </div>

  {/* Referral Fee Disclosure (PIPEDA/CASL) */}
  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
    <div className="flex items-start">
      <svg className="w-6 h-6 text-blue-400 mt-0.5 mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex-1">
        <h4 className="text-white font-semibold mb-2">Referral Fee Disclosure</h4>
        <p className="text-sm text-blue-200 leading-relaxed mb-3">
          Your mechanic will earn a <strong className="text-blue-100">5% referral fee</strong> from the workshop you choose. This fee is already included in the quotes you receive and does not increase the price you pay. This disclosure is required by Canadian law.
        </p>
        <details className="text-sm text-blue-300">
          <summary className="cursor-pointer hover:text-blue-200 transition-colors">
            How does this work?
          </summary>
          <p className="mt-2 pl-4 border-l-2 border-blue-500/30">
            The referral fee compensates the mechanic who diagnosed your vehicle and posted this RFQ on your behalf. The workshop pays this fee, not you. All quotes you receive already factor in this cost.
          </p>
        </details>
      </div>
    </div>
  </div>

  {/* Navigation */}
  <div className="flex items-center justify-between pt-6 border-t border-slate-700">
    <button className="px-6 py-3 text-slate-400 hover:text-white transition-colors">
      <svg className="inline-block w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>

    <div className="flex items-center gap-3">
      <button className="px-6 py-3 text-slate-400 hover:text-white transition-colors">
        Save as Draft
      </button>
      <button className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Post RFQ to Marketplace
      </button>
    </div>
  </div>
</div>
```

#### Success Confirmation

```jsx
<div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
  <div className="max-w-2xl w-full">
    {/* Success Animation */}
    <div className="text-center mb-8">
      <div className="inline-block w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
        RFQ Posted Successfully!
      </h1>
      <p className="text-lg text-slate-300">
        Your request is now live in the marketplace
      </p>
    </div>

    {/* Info Card */}
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        <div>
          <div className="text-4xl font-bold text-orange-400 mb-2">10</div>
          <div className="text-sm text-slate-400">Max Workshops</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-orange-400 mb-2">72h</div>
          <div className="text-sm text-slate-400">Bidding Window</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-orange-400 mb-2">10km</div>
          <div className="text-sm text-slate-400">Search Radius</div>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-6">
        <h3 className="text-white font-semibold mb-4">What happens next?</h3>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 font-semibold mr-4 flex-shrink-0">
              1
            </div>
            <div>
              <p className="text-white font-medium">Workshops review your request</p>
              <p className="text-sm text-slate-400 mt-1">
                Eligible workshops will see your RFQ and prepare competitive bids
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 font-semibold mr-4 flex-shrink-0">
              2
            </div>
            <div>
              <p className="text-white font-medium">You receive bid notifications</p>
              <p className="text-sm text-slate-400 mt-1">
                We'll email and notify you when workshops submit bids
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 font-semibold mr-4 flex-shrink-0">
              3
            </div>
            <div>
              <p className="text-white font-medium">Compare and select the best bid</p>
              <p className="text-sm text-slate-400 mt-1">
                View all bids side-by-side and choose the workshop that fits your needs
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 font-semibold mr-4 flex-shrink-0">
              4
            </div>
            <div>
              <p className="text-white font-medium">Get your formal quote</p>
              <p className="text-sm text-slate-400 mt-1">
                The winning workshop will send you a detailed quote to approve
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Action Buttons */}
    <div className="mt-8 flex flex-col sm:flex-row gap-4">
      <Link
        href="/customer/rfq/[rfqId]/bids"
        className="flex-1 px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl text-center"
      >
        View My RFQ
      </Link>
      <Link
        href="/customer/dashboard"
        className="flex-1 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold border border-slate-700 rounded-lg transition-all text-center"
      >
        Back to Dashboard
      </Link>
    </div>
  </div>
</div>
```

### API Implementation

**Route:** `src/app/api/rfq/create/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireFeature, isRfqEnabled } from '@/lib/flags'
import { z } from 'zod'

// Zod schema for RFQ creation
const CreateRfqSchema = z.object({
  diagnostic_session_id: z.string().uuid('Invalid session ID'),

  // Vehicle info
  vehicle_id: z.string().uuid().optional(),
  vehicle_year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  vehicle_make: z.string().min(1).max(100),
  vehicle_model: z.string().min(1).max(100),
  vehicle_trim: z.string().max(100).optional(),
  vehicle_mileage: z.number().int().positive(),
  vehicle_vin: z.string().length(17).optional(),

  // Issue details
  title: z.string().min(10, 'Title must be at least 10 characters').max(200),
  description: z.string().min(50, 'Description must be at least 50 characters').max(2000),
  issue_category: z.enum(['engine', 'brakes', 'electrical', 'suspension', 'transmission', 'diagnostic', 'maintenance', 'other']),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),

  // Budget (optional)
  budget_min: z.number().positive().optional(),
  budget_max: z.number().positive().optional(),

  // Photos/videos
  photos: z.array(z.string().url()).max(10).default([]),
  videos: z.array(z.string().url()).max(3).default([]),

  // Workshop filters (optional)
  min_workshop_rating: z.number().min(0).max(5).optional(),
  required_certifications: z.array(z.string()).max(10).optional(),
  max_distance_km: z.number().int().positive().max(200).optional(),

  // Bidding settings
  bid_deadline_hours: z.number().int().min(24).max(168).default(72),
  max_bids: z.number().int().min(3).max(20).default(10),

  // Legal consent
  customer_consent_to_share_info: z.literal(true, {
    errorMap: () => ({ message: 'You must consent to share information with workshops' })
  }),
})
.refine(data => {
  if (data.budget_min && data.budget_max) {
    return data.budget_max >= data.budget_min
  }
  return true
}, {
  message: 'Maximum budget must be greater than or equal to minimum budget',
  path: ['budget_max']
})

export async function POST(request: Request) {
  try {
    // Feature flag check
    requireFeature('ENABLE_WORKSHOP_RFQ')

    const supabase = createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = CreateRfqSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.format()
      }, { status: 400 })
    }

    const data = validationResult.data

    // Verify user owns the diagnostic session
    const { data: session, error: sessionError } = await supabase
      .from('diagnostic_sessions')
      .select('id, customer_id, mechanic_id, diagnosis_summary, recommended_services')
      .eq('id', data.diagnostic_session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Diagnostic session not found' }, { status: 404 })
    }

    if (session.customer_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to create RFQ for this session' }, { status: 403 })
    }

    // Check if mechanic is eligible to post RFQ (not an employee)
    const { data: mechanic, error: mechanicError } = await supabase
      .from('mechanics')
      .select('id, partnership_type, service_tier')
      .eq('id', session.mechanic_id)
      .single()

    if (mechanic?.partnership_type === 'employee') {
      return NextResponse.json({
        error: 'Employee mechanics cannot post to RFQ marketplace. Please use direct assignment.'
      }, { status: 403 })
    }

    // Get customer location for privacy-safe sharing
    const { data: profile } = await supabase
      .from('profiles')
      .select('city, province, postal_code, latitude, longitude')
      .eq('id', user.id)
      .single()

    // Calculate bid deadline
    const bid_deadline = new Date()
    bid_deadline.setHours(bid_deadline.getHours() + data.bid_deadline_hours)

    // Create escalation queue entry (required for RFQ)
    const { data: escalation, error: escalationError } = await supabase
      .from('workshop_escalation_queue')
      .insert({
        diagnostic_session_id: data.diagnostic_session_id,
        mechanic_id: session.mechanic_id,
        customer_id: user.id,
        escalation_type: 'rfq_marketplace',
        status: 'pending',
        rfq_posted_at: new Date().toISOString(),
        rfq_bid_deadline: bid_deadline.toISOString(),
      })
      .select()
      .single()

    if (escalationError) {
      console.error('Escalation creation error:', escalationError)
      return NextResponse.json({ error: 'Failed to create escalation' }, { status: 500 })
    }

    // Create RFQ marketplace entry
    const { data: rfq, error: rfqError } = await supabase
      .from('workshop_rfq_marketplace')
      .insert({
        escalation_queue_id: escalation.id,
        customer_id: user.id,
        diagnostic_session_id: data.diagnostic_session_id,
        escalating_mechanic_id: session.mechanic_id,

        // Content
        title: data.title,
        description: data.description,
        issue_category: data.issue_category,
        urgency: data.urgency,

        // Vehicle
        vehicle_id: data.vehicle_id,
        vehicle_make: data.vehicle_make,
        vehicle_model: data.vehicle_model,
        vehicle_year: data.vehicle_year,
        vehicle_mileage: data.vehicle_mileage,
        vehicle_vin: data.vehicle_vin,

        // Location (privacy-safe: city/province only)
        customer_city: profile?.city,
        customer_province: profile?.province,
        customer_postal_code: profile?.postal_code,
        latitude: profile?.latitude,
        longitude: profile?.longitude,

        // Budget
        budget_min: data.budget_min,
        budget_max: data.budget_max,

        // Bidding settings
        bid_deadline,
        max_bids: data.max_bids,
        auto_expire_hours: data.bid_deadline_hours,

        // Workshop filters
        min_workshop_rating: data.min_workshop_rating,
        required_certifications: data.required_certifications,
        max_distance_km: data.max_distance_km,

        // Legal
        customer_consent_to_share_info: true,
        customer_consent_timestamp: new Date().toISOString(),
        referral_fee_disclosed: true,
        referral_disclosure_text: 'Your mechanic will earn a 5% referral fee from the workshop you choose.',

        // Status
        status: 'open',

        // Metadata
        metadata: {
          photos: data.photos,
          videos: data.videos,
          created_via: 'wizard_ui',
        }
      })
      .select()
      .single()

    if (rfqError) {
      console.error('RFQ creation error:', rfqError)

      // Rollback escalation
      await supabase
        .from('workshop_escalation_queue')
        .delete()
        .eq('id', escalation.id)

      return NextResponse.json({ error: 'Failed to create RFQ' }, { status: 500 })
    }

    // Log security event
    await supabase.from('security_events').insert({
      event_type: 'rfq.created',
      user_id: user.id,
      metadata: {
        rfq_id: rfq.id,
        diagnostic_session_id: data.diagnostic_session_id,
        issue_category: data.issue_category,
        urgency: data.urgency,
      }
    })

    // Return success
    return NextResponse.json({
      success: true,
      rfq_id: rfq.id,
      bid_deadline: rfq.bid_deadline,
      max_bids: rfq.max_bids,
      message: 'RFQ posted successfully to marketplace'
    }, { status: 201 })

  } catch (error: unknown) {
    console.error('RFQ creation error:', error)

    // Check if it's a feature flag error
    if (error instanceof Error && error.message.includes('not enabled')) {
      return NextResponse.json({
        error: 'RFQ marketplace feature is not enabled'
      }, { status: 404 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
```

### File Structure

```
src/
├── app/
│   ├── mechanic/
│   │   └── rfq/
│   │       └── create/
│   │           └── [sessionId]/
│   │               └── page.tsx          # Multi-step wizard
│   └── api/
│       └── rfq/
│           └── create/
│               └── route.ts              # POST handler
├── components/
│   └── rfq/
│       ├── VehicleInfoStep.tsx
│       ├── IssueDescriptionStep.tsx
│       ├── BudgetPreferencesStep.tsx
│       ├── ReviewSubmitStep.tsx
│       ├── ProgressIndicator.tsx
│       └── SuccessConfirmation.tsx
└── lib/
    └── rfq/
        └── validation.ts                  # Shared Zod schemas
```

### Success Criteria

- ✅ Multi-step wizard UI functional and mobile-responsive
- ✅ Smart defaults populate from diagnostic session
- ✅ Photo/video upload working
- ✅ Zod validation prevents invalid submissions
- ✅ API creates both `workshop_escalation_queue` and `workshop_rfq_marketplace` entries
- ✅ Customer consent captured (PIPEDA compliance)
- ✅ Referral fee disclosed (transparency)
- ✅ Only contractors/independents can create RFQ (employees blocked)
- ✅ RLS policies enforce user owns diagnostic session
- ✅ Success confirmation shows next steps
- ✅ **Feature gated behind ENABLE_WORKSHOP_RFQ flag**

### Commit Message

```
feat(rfq): add mechanic RFQ creation wizard (Phase 2)

- Add 3-step wizard UI (vehicle/issue, details/budget, review)
- Prefill data from diagnostic session and customer profile
- Photo/video upload with preview
- Smart defaults and conditional logic
- Zod validation on client and server
- API creates escalation + RFQ marketplace entries
- PIPEDA consent and referral fee disclosure
- Block employees from RFQ (contractors/independents only)
- Mobile-first responsive design
- Feature-gated behind ENABLE_WORKSHOP_RFQ

Relates to: RFQ Phase 2
```

**STOP after Phase 2 commit. Await approval for Phase 3.**

---

## 📄 Plan Continuation

**The complete RFQ implementation plan continues in a separate document:**

**[rfq-plan-ux-optimized-phases-3-6.md](./rfq-plan-ux-optimized-phases-3-6.md)**

This continuation document contains:

- **Phase 3:** Workshop Browse RFQs + Submit Bids (7-10 days)
  - Workshop marketplace listing with filters
  - RFQ detail view with sanitized data
  - 2-step bid submission wizard
  - Platform fee calculation and display
  - Duplicate bid prevention

- **Phase 4:** Customer Compare Bids + Accept Winner (5-7 days)
  - Side-by-side bid comparison (table + card views)
  - Sort by price, timeline, or rating
  - One-click bid acceptance
  - Atomic transaction (accept + create quote + close RFQ)

- **Phase 5:** Notifications + Auto-Expiration (5-7 days)
  - Email notifications (new bid, bid accepted/declined)
  - Workshop notification when new RFQs posted
  - Hourly cron job for auto-expiration
  - Resend email service integration

- **Phase 6:** Admin Analytics + Kill-Switch Verification (3-5 days)
  - Admin RFQ analytics dashboard
  - Key metrics and conversion rates
  - Top workshops leaderboard
  - Kill-switch E2E tests

**Plus:**
- Final Rollout Plan (alpha → beta → GA)
- Monitoring & Success Metrics (KPIs, alerts)
- Documentation & Training guides
- Risk Assessment matrix
- Complete timeline (6-8 weeks)

---

## 🚀 Next Steps

**To review the complete plan:**
1. Read this file (Phases 0-2) ✅
2. Read [rfq-plan-ux-optimized-phases-3-6.md](./rfq-plan-ux-optimized-phases-3-6.md) (Phases 3-6)
3. Review rollout plan and success metrics

**To begin implementation:**
1. Approve this plan: **"APPROVE RFQ PLAN"**
2. Start with Phase 0 (read-only schema verification)
3. Execute phases sequentially with approval gates

**Total Implementation Time:** 6-8 weeks across 6 phases

**Risk Level:** VERY LOW (feature flag kill-switch ensures zero impact to existing features)

---

**Ready to proceed? Let me know!** 🚀
