# Feature Toggle Strategy: B2C → B2B Workshop Integration

**Author**: AI Analysis
**Date**: 2025-10-24
**Status**: Implementation Ready
**Related**: [STRATEGIC_ROADMAP_WORKSHOPS.md](./STRATEGIC_ROADMAP_WORKSHOPS.md)

---

## Executive Summary

This document provides a complete step-by-step strategy to implement admin-controlled feature toggles that allow AskAutoDoctor to remain B2C-only in production while building B2B workshop features that can be enabled via admin panel when ready.

**Key Goals:**
- ✅ Zero production impact during development
- ✅ Gradual rollout capability (5% → 50% → 100%)
- ✅ Admin panel control (no code deployments needed)
- ✅ A/B testing support
- ✅ Emergency kill switch
- ✅ Works with existing metadata architecture

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Toggle Service Implementation](#toggle-service-implementation)
4. [Admin Panel Integration](#admin-panel-integration)
5. [Integration Points](#integration-points)
6. [Phased Rollout Plan](#phased-rollout-plan)
7. [Code Examples](#code-examples)
8. [Testing Strategy](#testing-strategy)
9. [Rollback Procedures](#rollback-procedures)

---

## Architecture Overview

### Current State Analysis

**Existing Infrastructure (Perfect for Toggles):**
- ✅ Metadata fields exist: `profiles.metadata`, `session_requests.metadata`, `sessions.metadata`
- ✅ Centralized assignment logic: `/src/app/api/admin/requests/[id]/assign/route.ts`
- ✅ Auth guard pattern: `/src/lib/auth/guards.ts`
- ✅ Admin dashboard: `/src/app/admin/(shell)/page.tsx`
- ✅ TypeScript types: `src/types/supabase.ts`

**Key Decision Points Requiring Toggles:**
1. **Session Assignment Algorithm** - Broadcast (B2C) vs Smart Routing (B2B workshops)
2. **Mechanic Profile Display** - Show workshop affiliation or not
3. **Payment Flow** - Direct payout vs Workshop split
4. **Booking UI** - Workshop selection enabled/disabled
5. **Admin Assignment** - Manual assign to workshops vs individuals

### Toggle Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Panel UI                            │
│  (Create/Enable/Disable/Configure Toggles)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              feature_toggles Table (Supabase)                │
│  - Feature name, enabled status, rollout rules               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Toggle Service (/src/lib/featureToggles.ts)        │
│  - Check if feature enabled for user/role/session            │
│  - Cache for performance                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Integration Points                           │
│  - Assignment API, Booking UI, Payment Flow, etc.            │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### 1. Feature Toggles Table

**Create Migration: `20250124_create_feature_toggles.sql`**

```sql
-- Feature toggles for gradual B2B rollout
CREATE TABLE feature_toggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL, -- e.g., 'workshop_routing', 'workshop_payments'
  display_name TEXT NOT NULL,
  description TEXT,

  -- Toggle state
  enabled BOOLEAN DEFAULT false,

  -- Rollout strategy
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  rollout_strategy TEXT DEFAULT 'all' CHECK (rollout_strategy IN ('all', 'percentage', 'whitelist', 'role')),

  -- Targeting rules (JSONB for flexibility)
  target_config JSONB DEFAULT '{}',
  -- Examples:
  -- { "roles": ["mechanic"], "workshop_ids": ["uuid1", "uuid2"] }
  -- { "user_ids": ["uuid1", "uuid2"] }
  -- { "postal_codes": ["M5V", "L4Z"] }

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_modified_by UUID REFERENCES auth.users(id)
);

-- Index for fast lookups
CREATE INDEX idx_feature_toggles_enabled ON feature_toggles(feature_key, enabled);
CREATE INDEX idx_feature_toggles_strategy ON feature_toggles(rollout_strategy);

-- RLS Policies
ALTER TABLE feature_toggles ENABLE ROW LEVEL SECURITY;

-- Admins can manage toggles
CREATE POLICY "Admins can manage feature toggles"
  ON feature_toggles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Everyone can read enabled toggles (for client-side UI)
CREATE POLICY "Users can read enabled toggles"
  ON feature_toggles
  FOR SELECT
  USING (enabled = true);

COMMENT ON TABLE feature_toggles IS 'Admin-controlled feature flags for gradual B2B workshop rollout';
COMMENT ON COLUMN feature_toggles.rollout_percentage IS 'For percentage strategy: 0-100, based on user_id hash';
COMMENT ON COLUMN feature_toggles.target_config IS 'JSON config for whitelist/role strategies';
```

### 2. Feature Toggle Audit Log

```sql
-- Track toggle changes for compliance/debugging
CREATE TABLE feature_toggle_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toggle_id UUID REFERENCES feature_toggles(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,

  action TEXT NOT NULL, -- 'created', 'enabled', 'disabled', 'updated'
  old_state JSONB,
  new_state JSONB,

  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),

  notes TEXT -- Admin can add reason for change
);

CREATE INDEX idx_toggle_audit_feature ON feature_toggle_audit(feature_key, changed_at DESC);
CREATE INDEX idx_toggle_audit_user ON feature_toggle_audit(changed_by);

ALTER TABLE feature_toggle_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON feature_toggle_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

### 3. Seed Initial Feature Toggles

```sql
-- Insert workshop-related feature toggles (all disabled by default)
INSERT INTO feature_toggles (feature_key, display_name, description, enabled, rollout_strategy) VALUES
  ('workshop_routing', 'Workshop Smart Routing', 'Enable smart routing to assign sessions to workshop-affiliated mechanics', false, 'all'),
  ('workshop_payments', 'Workshop Payment Splitting', 'Enable revenue sharing with workshop partners', false, 'all'),
  ('workshop_booking_ui', 'Workshop Selection in Booking', 'Show workshop selection dropdown in customer booking flow', false, 'all'),
  ('workshop_admin_panel', 'Workshop Admin Dashboard', 'Enable workshop management pages in admin panel', false, 'role'),
  ('workshop_mechanic_profiles', 'Workshop Affiliation Display', 'Show workshop name on mechanic profiles', false, 'all'),
  ('workshop_reports', 'Workshop Analytics & Reports', 'Enable workshop-specific analytics and reporting', false, 'role');

-- Set target_config for role-based toggles
UPDATE feature_toggles
SET target_config = '{"roles": ["admin", "workshop_admin"]}'
WHERE feature_key IN ('workshop_admin_panel', 'workshop_reports');
```

---

## Toggle Service Implementation

### Create: `/src/lib/featureToggles.ts`

```typescript
import { createClient } from '@/lib/supabase'
import { cache } from 'react'

/**
 * Feature Toggle Service
 *
 * Centralized service for checking feature flags with caching.
 * Supports multiple rollout strategies: all, percentage, whitelist, role.
 */

// In-memory cache (refreshes every 5 minutes)
let toggleCache: Map<string, FeatureToggle> = new Map()
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export interface FeatureToggle {
  feature_key: string
  display_name: string
  enabled: boolean
  rollout_percentage: number
  rollout_strategy: 'all' | 'percentage' | 'whitelist' | 'role'
  target_config: Record<string, any>
  metadata: Record<string, any>
}

/**
 * Refresh toggle cache from database
 */
async function refreshToggleCache(): Promise<void> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('feature_toggles')
    .select('*')

  if (error) {
    console.error('[FeatureToggles] Failed to refresh cache:', error)
    return
  }

  toggleCache.clear()
  data?.forEach(toggle => {
    toggleCache.set(toggle.feature_key, toggle as FeatureToggle)
  })

  cacheTimestamp = Date.now()
}

/**
 * Get toggle from cache (with auto-refresh)
 */
async function getToggle(featureKey: string): Promise<FeatureToggle | null> {
  // Refresh cache if expired
  if (Date.now() - cacheTimestamp > CACHE_TTL) {
    await refreshToggleCache()
  }

  return toggleCache.get(featureKey) || null
}

/**
 * Main function: Check if feature is enabled for given context
 *
 * @param featureKey - Feature identifier (e.g., 'workshop_routing')
 * @param context - User/session context
 * @returns true if feature enabled, false otherwise
 */
export async function isFeatureEnabled(
  featureKey: string,
  context?: {
    userId?: string
    userRole?: string
    workshopId?: string
    sessionId?: string
    postalCode?: string
  }
): Promise<boolean> {
  const toggle = await getToggle(featureKey)

  // Feature doesn't exist or is globally disabled
  if (!toggle || !toggle.enabled) {
    return false
  }

  // Strategy: All users
  if (toggle.rollout_strategy === 'all') {
    return true
  }

  // Strategy: Percentage-based rollout
  if (toggle.rollout_strategy === 'percentage') {
    if (!context?.userId) return false

    // Hash user ID to get consistent percentage (same user always gets same result)
    const hash = simpleHash(context.userId)
    const userPercentage = hash % 100

    return userPercentage < toggle.rollout_percentage
  }

  // Strategy: Role-based
  if (toggle.rollout_strategy === 'role') {
    const allowedRoles = toggle.target_config?.roles as string[] || []
    return context?.userRole ? allowedRoles.includes(context.userRole) : false
  }

  // Strategy: Whitelist (user IDs, workshop IDs, postal codes, etc.)
  if (toggle.rollout_strategy === 'whitelist') {
    const config = toggle.target_config

    // Check user whitelist
    if (config?.user_ids && context?.userId) {
      if ((config.user_ids as string[]).includes(context.userId)) {
        return true
      }
    }

    // Check workshop whitelist
    if (config?.workshop_ids && context?.workshopId) {
      if ((config.workshop_ids as string[]).includes(context.workshopId)) {
        return true
      }
    }

    // Check postal code whitelist
    if (config?.postal_codes && context?.postalCode) {
      if ((config.postal_codes as string[]).includes(context.postalCode)) {
        return true
      }
    }

    return false
  }

  return false
}

/**
 * Simple hash function for percentage rollout
 * (Ensures same user always gets same result)
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Get all enabled features for admin dashboard
 */
export async function getAllToggles(): Promise<FeatureToggle[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('feature_toggles')
    .select('*')
    .order('display_name')

  if (error) {
    console.error('[FeatureToggles] Failed to fetch toggles:', error)
    return []
  }

  return data as FeatureToggle[]
}

/**
 * Admin function: Update toggle state
 */
export async function updateToggle(
  featureKey: string,
  updates: Partial<FeatureToggle>,
  adminUserId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  // Get current state for audit
  const { data: currentToggle } = await supabase
    .from('feature_toggles')
    .select('*')
    .eq('feature_key', featureKey)
    .single()

  // Update toggle
  const { error: updateError } = await supabase
    .from('feature_toggles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      last_modified_by: adminUserId
    })
    .eq('feature_key', featureKey)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Log to audit trail
  await supabase.from('feature_toggle_audit').insert({
    toggle_id: currentToggle?.id,
    feature_key: featureKey,
    action: 'updated',
    old_state: currentToggle,
    new_state: updates,
    changed_by: adminUserId,
    notes
  })

  // Invalidate cache
  await refreshToggleCache()

  return { success: true }
}

/**
 * Client-side helper: Check multiple features at once
 */
export async function checkFeatures(
  featureKeys: string[],
  context?: Parameters<typeof isFeatureEnabled>[1]
): Promise<Record<string, boolean>> {
  const results = await Promise.all(
    featureKeys.map(async (key) => ({
      key,
      enabled: await isFeatureEnabled(key, context)
    }))
  )

  return Object.fromEntries(results.map(r => [r.key, r.enabled]))
}
```

### TypeScript Types: Add to `/src/types/supabase.ts`

```typescript
export interface FeatureToggle {
  id: string
  feature_key: string
  display_name: string
  description: string | null
  enabled: boolean
  rollout_percentage: number
  rollout_strategy: 'all' | 'percentage' | 'whitelist' | 'role'
  target_config: Record<string, any>
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  created_by: string | null
  last_modified_by: string | null
}

export interface FeatureToggleAudit {
  id: string
  toggle_id: string
  feature_key: string
  action: 'created' | 'enabled' | 'disabled' | 'updated'
  old_state: Record<string, any> | null
  new_state: Record<string, any> | null
  changed_by: string | null
  changed_at: string
  notes: string | null
}
```

---

## Admin Panel Integration

### 1. Feature Toggles Management Page

**Create: `/src/app/admin/(shell)/feature-toggles/page.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getAllToggles, updateToggle, type FeatureToggle } from '@/lib/featureToggles'
import { Check, X, Settings, TrendingUp, Shield } from 'lucide-react'

export default function FeatureTogglesPage() {
  const [toggles, setToggles] = useState<FeatureToggle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    loadToggles()
  }, [])

  async function loadToggles() {
    setLoading(true)
    const data = await getAllToggles()
    setToggles(data)
    setLoading(false)
  }

  async function handleToggleChange(featureKey: string, enabled: boolean) {
    setSaving(featureKey)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('Must be logged in')
      setSaving(null)
      return
    }

    const result = await updateToggle(
      featureKey,
      { enabled },
      user.id,
      `${enabled ? 'Enabled' : 'Disabled'} via admin panel`
    )

    if (result.success) {
      await loadToggles()
    } else {
      alert(`Error: ${result.error}`)
    }

    setSaving(null)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-400">Loading feature toggles...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Feature Toggles</h1>
          <p className="mt-2 text-slate-600">
            Control B2B workshop features without code deployments. Changes take effect within 5 minutes.
          </p>
        </div>

        <div className="space-y-4">
          {toggles.map((toggle) => (
            <div
              key={toggle.feature_key}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {toggle.display_name}
                    </h3>
                    {toggle.enabled ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        <Check className="h-3 w-3" />
                        Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        <X className="h-3 w-3" />
                        Disabled
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    {toggle.description}
                  </p>

                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Settings className="h-3 w-3" />
                      Strategy: {toggle.rollout_strategy}
                    </span>
                    {toggle.rollout_strategy === 'percentage' && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Rollout: {toggle.rollout_percentage}%
                      </span>
                    )}
                    {toggle.rollout_strategy === 'role' && (
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Roles: {(toggle.target_config?.roles as string[] || []).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleChange(toggle.feature_key, !toggle.enabled)}
                  disabled={saving === toggle.feature_key}
                  className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    toggle.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                  } ${saving === toggle.feature_key ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      toggle.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        {toggles.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-600">No feature toggles found. Run database migration first.</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

### 2. Add to Admin Navigation

**Update: `/src/app/admin/(shell)/layout.tsx`** (or wherever admin nav is defined)

```typescript
// Add to navigation items
const adminNavItems = [
  { label: 'Dashboard', href: '/admin', icon: Home },
  { label: 'Requests', href: '/admin/requests', icon: Inbox },
  { label: 'Feature Toggles', href: '/admin/feature-toggles', icon: Settings }, // NEW
  // ... other items
]
```

---

## Integration Points

### 1. Session Assignment Algorithm

**File: `/src/app/api/admin/requests/[id]/assign/route.ts`**

**Current Code (Lines 50-70):**
```typescript
// Broadcast to ALL mechanics
const { error: notificationError } = await supabase.from('notifications').insert(
  mechanicsData.map((mech) => ({
    user_id: mech.id,
    title: 'New Session Request',
    message: `A new ${serviceType} session is available in your area.`,
    type: 'session_request',
    session_request_id: requestId,
    created_at: now,
  }))
)
```

**Updated Code with Toggle:**
```typescript
import { isFeatureEnabled } from '@/lib/featureToggles'

// Check if workshop routing is enabled
const workshopRoutingEnabled = await isFeatureEnabled('workshop_routing', {
  userId: adminUser.id,
  userRole: adminProfile.role
})

let targetMechanics = mechanicsData

if (workshopRoutingEnabled) {
  // SMART ROUTING: Find mechanics affiliated with workshops near customer
  const customerPostalCode = requestData.postal_code?.substring(0, 3) // First 3 chars

  // Query workshop_mechanics join table (future implementation)
  const { data: workshopMechanics } = await supabase
    .from('workshop_mechanics')
    .select(`
      mechanic_id,
      workshops!inner(
        id,
        name,
        coverage_postal_codes
      )
    `)
    .contains('workshops.coverage_postal_codes', [customerPostalCode])

  if (workshopMechanics && workshopMechanics.length > 0) {
    // Prioritize workshop mechanics
    const workshopMechanicIds = workshopMechanics.map(wm => wm.mechanic_id)
    targetMechanics = mechanicsData.filter(m => workshopMechanicIds.includes(m.id))

    console.log(`[WorkshopRouting] Routed to ${targetMechanics.length} workshop mechanics`)
  } else {
    console.log(`[WorkshopRouting] No workshop coverage, falling back to broadcast`)
  }
}

// Send notifications to target mechanics (workshop-filtered or all)
const { error: notificationError } = await supabase.from('notifications').insert(
  targetMechanics.map((mech) => ({
    user_id: mech.id,
    title: 'New Session Request',
    message: `A new ${serviceType} session is available in your area.`,
    type: 'session_request',
    session_request_id: requestId,
    created_at: now,
  }))
)
```

### 2. Mechanic Profile Display

**File: `/src/app/customer/dashboard/sessions/[id]/page.tsx` (or mechanic profile component)**

**Add Workshop Badge:**
```typescript
import { isFeatureEnabled } from '@/lib/featureToggles'

// In component
const [showWorkshopInfo, setShowWorkshopInfo] = useState(false)

useEffect(() => {
  async function checkToggle() {
    const enabled = await isFeatureEnabled('workshop_mechanic_profiles', {
      userId: session?.customer_id
    })
    setShowWorkshopInfo(enabled)
  }
  checkToggle()
}, [session])

// In JSX
{showWorkshopInfo && mechanic.workshop_id && (
  <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
    <Wrench className="h-4 w-4" />
    Affiliated with {mechanic.workshop_name}
  </div>
)}
```

### 3. Payment Flow (Future)

**File: `/src/app/api/webhooks/stripe/route.ts`**

```typescript
import { isFeatureEnabled } from '@/lib/featureToggles'

// In payment processing
if (event.type === 'checkout.session.completed') {
  const session = event.data.object

  // Check if workshop payment splitting is enabled
  const splitPaymentsEnabled = await isFeatureEnabled('workshop_payments', {
    sessionId: session.metadata.session_id
  })

  if (splitPaymentsEnabled) {
    // Get session details to check if mechanic is workshop-affiliated
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('mechanic_id, workshops!inner(id, commission_rate)')
      .eq('id', session.metadata.session_id)
      .single()

    if (sessionData?.workshops) {
      // Calculate split: 15% platform, X% workshop, remainder to mechanic
      const platformFee = amount * 0.15
      const workshopFee = amount * (sessionData.workshops.commission_rate || 0.10)
      const mechanicPayout = amount - platformFee - workshopFee

      // Create Stripe Transfer to workshop's connected account
      await stripe.transfers.create({
        amount: Math.round(workshopFee * 100),
        currency: 'cad',
        destination: sessionData.workshops.stripe_account_id,
        metadata: {
          session_id: session.metadata.session_id,
          type: 'workshop_commission'
        }
      })

      console.log(`[WorkshopPayments] Split payment: Platform ${platformFee}, Workshop ${workshopFee}, Mechanic ${mechanicPayout}`)
    }
  }
}
```

### 4. Admin Panel - Workshop Management

**File: `/src/app/admin/(shell)/workshops/page.tsx`** (new page)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { isFeatureEnabled } from '@/lib/featureToggles'
import { redirect } from 'next/navigation'

export default function WorkshopsPage() {
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        redirect('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const enabled = await isFeatureEnabled('workshop_admin_panel', {
        userId: user.id,
        userRole: profile?.role
      })

      if (!enabled) {
        redirect('/admin') // Redirect if toggle disabled
      }

      setHasAccess(true)
      setLoading(false)
    }

    checkAccess()
  }, [])

  if (loading) return <div>Loading...</div>
  if (!hasAccess) return null

  return (
    <div>
      {/* Workshop management UI */}
    </div>
  )
}
```

### 5. Customer Booking Flow

**File: `/src/app/book/page.tsx` or booking form component**

```typescript
import { isFeatureEnabled } from '@/lib/featureToggles'

const [showWorkshopSelection, setShowWorkshopSelection] = useState(false)
const [workshops, setWorkshops] = useState([])

useEffect(() => {
  async function checkWorkshopBooking() {
    const enabled = await isFeatureEnabled('workshop_booking_ui', {
      postalCode: form.postal_code
    })

    setShowWorkshopSelection(enabled)

    if (enabled) {
      // Load workshops in customer's area
      const { data } = await supabase
        .from('workshops')
        .select('id, name, address')
        .contains('coverage_postal_codes', [form.postal_code.substring(0, 3)])

      setWorkshops(data || [])
    }
  }

  if (form.postal_code) {
    checkWorkshopBooking()
  }
}, [form.postal_code])

// In JSX
{showWorkshopSelection && workshops.length > 0 && (
  <div>
    <label>Preferred Workshop (Optional)</label>
    <select {...}>
      <option value="">No preference</option>
      {workshops.map(w => (
        <option key={w.id} value={w.id}>{w.name}</option>
      ))}
    </select>
  </div>
)}
```

---

## Phased Rollout Plan

### Phase 1: Infrastructure (Week 1)
**Goal**: Create toggle system without touching existing functionality

**Tasks:**
1. ✅ Run database migration: `20250124_create_feature_toggles.sql`
2. ✅ Create `/src/lib/featureToggles.ts` service
3. ✅ Add TypeScript types to `/src/types/supabase.ts`
4. ✅ Create admin page: `/src/app/admin/(shell)/feature-toggles/page.tsx`
5. ✅ Seed initial toggles (all disabled)
6. ✅ Test toggle service with unit tests

**Validation:**
- Admin can see toggle list
- Toggling on/off updates database
- Cache refreshes correctly
- No production impact (all toggles disabled)

### Phase 2: Assignment Logic Integration (Week 2)
**Goal**: Add toggle checks to session assignment (prepare for smart routing)

**Tasks:**
1. ✅ Update `/src/app/api/admin/requests/[id]/assign/route.ts`
2. ✅ Add `workshop_routing` toggle check
3. ✅ Keep existing broadcast behavior (toggle disabled)
4. ✅ Add logging to verify toggle checks work
5. ✅ Test assignment flow unchanged

**Validation:**
- Assignment works exactly as before
- Logs show toggle check happening
- Admin can see "workshop_routing" toggle (disabled)

### Phase 3: Build Workshop Features (Weeks 3-8)
**Goal**: Build all workshop infrastructure BEHIND toggles

**Tasks** (from STRATEGIC_ROADMAP_WORKSHOPS.md Phase 3-4):
1. ✅ Create workshop tables (workshops, workshop_mechanics, workshop_locations)
2. ✅ Build workshop admin panel pages
3. ✅ Implement smart routing algorithm
4. ✅ Create workshop payment splitting logic
5. ✅ Add workshop selection to booking UI
6. ✅ Build workshop analytics dashboard

**Key Principle**: Every new feature wrapped in `isFeatureEnabled()` check

**Validation:**
- All new code exists but is unreachable (toggles disabled)
- Production remains pure B2C
- Can test on staging by enabling toggles

### Phase 4: Beta Testing (Weeks 9-10)
**Goal**: Test with 5-10 friendly workshops

**Setup:**
1. Enable `workshop_routing` toggle with whitelist strategy:
   ```sql
   UPDATE feature_toggles
   SET
     enabled = true,
     rollout_strategy = 'whitelist',
     target_config = '{"workshop_ids": ["uuid1", "uuid2", "uuid3"]}'
   WHERE feature_key = 'workshop_routing';
   ```

2. Invite beta workshops, add their IDs to whitelist

3. Monitor closely:
   - Session assignment working correctly?
   - Payment splits accurate?
   - Workshop dashboards functional?

**Success Criteria:**
- 20+ sessions routed successfully
- Zero payment errors
- Workshop admins can manage mechanics
- Beta participants happy

### Phase 5: Gradual Rollout (Weeks 11-14)
**Goal**: Roll out to all workshops gradually

**Week 11: 10% Rollout**
```sql
UPDATE feature_toggles
SET
  rollout_strategy = 'percentage',
  rollout_percentage = 10
WHERE feature_key = 'workshop_routing';
```
- Monitor error rates, session success rates
- Collect feedback from first 10% of workshops

**Week 12: 50% Rollout**
```sql
UPDATE feature_toggles
SET rollout_percentage = 50
WHERE feature_key = 'workshop_routing';
```
- Scale monitoring infrastructure
- Validate payment splits at scale

**Week 13: 100% Rollout**
```sql
UPDATE feature_toggles
SET
  rollout_strategy = 'all',
  rollout_percentage = 100
WHERE feature_key = 'workshop_routing';
```
- Full B2B + B2C hybrid mode live
- All workshops receiving routed sessions

**Week 14: Cleanup**
- Remove toggle checks from hot paths (optional)
- Keep admin toggles for emergency kill switch

---

## Code Examples

### Example 1: Simple Toggle Check

```typescript
import { isFeatureEnabled } from '@/lib/featureToggles'

async function handleFeature() {
  const enabled = await isFeatureEnabled('workshop_routing')

  if (enabled) {
    // New workshop logic
    await smartRouteToWorkshop()
  } else {
    // Existing B2C logic
    await broadcastToAllMechanics()
  }
}
```

### Example 2: Toggle with User Context

```typescript
const enabled = await isFeatureEnabled('workshop_payments', {
  userId: mechanic.id,
  userRole: mechanic.role,
  workshopId: mechanic.workshop_id
})
```

### Example 3: Toggle with Postal Code Targeting

```typescript
// Enable workshops only in Toronto for beta
const enabled = await isFeatureEnabled('workshop_booking_ui', {
  postalCode: customer.postal_code
})

// Admin sets up whitelist:
// target_config = {"postal_codes": ["M5V", "M5G", "M4Y"]}
```

### Example 4: Multiple Toggles at Once

```typescript
import { checkFeatures } from '@/lib/featureToggles'

const features = await checkFeatures(
  ['workshop_routing', 'workshop_payments', 'workshop_admin_panel'],
  { userId: user.id, userRole: user.role }
)

if (features.workshop_routing) { /* ... */ }
if (features.workshop_payments) { /* ... */ }
if (features.workshop_admin_panel) { /* ... */ }
```

### Example 5: Client-Side Toggle (UI)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { isFeatureEnabled } from '@/lib/featureToggles'

export default function BookingForm() {
  const [showWorkshops, setShowWorkshops] = useState(false)

  useEffect(() => {
    isFeatureEnabled('workshop_booking_ui').then(setShowWorkshops)
  }, [])

  return (
    <div>
      {/* Regular form fields */}

      {showWorkshops && (
        <WorkshopSelector />  {/* Only rendered if toggle enabled */}
      )}
    </div>
  )
}
```

---

## Testing Strategy

### Unit Tests

**Create: `/src/lib/__tests__/featureToggles.test.ts`**

```typescript
import { isFeatureEnabled } from '../featureToggles'

describe('Feature Toggles', () => {
  it('returns false for non-existent feature', async () => {
    const result = await isFeatureEnabled('non_existent_feature')
    expect(result).toBe(false)
  })

  it('respects global enable/disable', async () => {
    // Assuming 'workshop_routing' is disabled in test DB
    const result = await isFeatureEnabled('workshop_routing')
    expect(result).toBe(false)
  })

  it('handles percentage rollout correctly', async () => {
    // Feature set to 50% rollout
    const userId1 = 'user-abc' // Hash: 25
    const userId2 = 'user-xyz' // Hash: 75

    const result1 = await isFeatureEnabled('test_percentage', { userId: userId1 })
    const result2 = await isFeatureEnabled('test_percentage', { userId: userId2 })

    expect(result1).toBe(true)  // 25 < 50
    expect(result2).toBe(false) // 75 > 50
  })

  it('handles role-based toggles', async () => {
    const adminResult = await isFeatureEnabled('workshop_admin_panel', {
      userRole: 'admin'
    })
    const customerResult = await isFeatureEnabled('workshop_admin_panel', {
      userRole: 'customer'
    })

    expect(adminResult).toBe(true)
    expect(customerResult).toBe(false)
  })
})
```

### Integration Tests

**Test Assignment Flow:**
```typescript
describe('Session Assignment with Toggles', () => {
  it('broadcasts to all mechanics when toggle disabled', async () => {
    // Disable workshop_routing
    await updateToggle('workshop_routing', { enabled: false }, adminId)

    // Create session request
    const response = await POST('/api/admin/requests/123/assign')

    // Verify all mechanics notified
    const notifications = await getNotifications()
    expect(notifications.length).toBe(50) // All mechanics
  })

  it('routes to workshop mechanics when toggle enabled', async () => {
    // Enable workshop_routing
    await updateToggle('workshop_routing', { enabled: true }, adminId)

    // Create session request
    const response = await POST('/api/admin/requests/123/assign')

    // Verify only workshop mechanics notified
    const notifications = await getNotifications()
    expect(notifications.length).toBe(5) // Only workshop mechanics
  })
})
```

### Manual QA Checklist

**Before Rollout:**
- [ ] Admin can toggle features on/off
- [ ] Changes take effect within 5 minutes
- [ ] Disabling toggle immediately stops new feature usage
- [ ] Percentage rollout gives consistent results for same user
- [ ] Role-based toggles work for admin/customer/mechanic
- [ ] Audit log captures all toggle changes
- [ ] Toggle cache invalidation works correctly

**During Beta:**
- [ ] Workshop mechanics receive sessions
- [ ] Non-workshop mechanics still receive broadcasts
- [ ] Payment splits calculated correctly
- [ ] Workshop admin dashboard loads
- [ ] No errors in production logs

---

## Rollback Procedures

### Emergency Kill Switch

**Scenario**: Workshop routing causing issues, need immediate rollback

**Action** (Takes <30 seconds):
1. Go to `/admin/feature-toggles`
2. Toggle off `workshop_routing`
3. Wait 5 minutes for cache refresh
4. System reverts to pure B2C broadcast mode

**SQL Rollback** (If admin panel inaccessible):
```sql
-- Disable ALL workshop features immediately
UPDATE feature_toggles
SET enabled = false
WHERE feature_key LIKE 'workshop_%';

-- Or disable specific feature
UPDATE feature_toggles
SET enabled = false
WHERE feature_key = 'workshop_routing';
```

### Gradual Rollback

**Scenario**: 100% rollout causing high error rate, need to reduce

**Action**:
```sql
-- Reduce to 50%
UPDATE feature_toggles
SET
  rollout_strategy = 'percentage',
  rollout_percentage = 50
WHERE feature_key = 'workshop_routing';

-- Reduce to 10%
UPDATE feature_toggles
SET rollout_percentage = 10
WHERE feature_key = 'workshop_routing';

-- Reduce to whitelist only (beta workshops)
UPDATE feature_toggles
SET
  rollout_strategy = 'whitelist',
  target_config = '{"workshop_ids": ["uuid1", "uuid2"]}'
WHERE feature_key = 'workshop_routing';
```

### Nuclear Option: Remove All Toggle Checks

**Scenario**: Toggle system itself causing issues

**Action**:
1. Revert all commits adding toggle checks
2. Deploy previous version
3. Fix toggle system in dev environment
4. Redeploy when fixed

**Prevention**: Extensive staging testing before production rollout

---

## Monitoring & Observability

### Key Metrics to Track

**Toggle Usage Metrics:**
```sql
-- How many sessions assigned with workshop routing?
SELECT
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN metadata->>'workshop_routing_used' = 'true' THEN 1 END) as workshop_routed,
  COUNT(CASE WHEN metadata->>'workshop_routing_used' = 'false' THEN 1 END) as broadcast
FROM sessions
WHERE created_at > NOW() - INTERVAL '7 days';
```

**Toggle Performance:**
```typescript
// Add logging to toggle service
console.log(`[FeatureToggle] ${featureKey}: ${enabled ? 'ENABLED' : 'DISABLED'} for user ${context?.userId}`)
```

**Audit Trail Query:**
```sql
-- See toggle change history
SELECT
  feature_key,
  action,
  changed_by,
  changed_at,
  notes
FROM feature_toggle_audit
ORDER BY changed_at DESC
LIMIT 50;
```

### Alerts to Set Up

1. **Toggle Cache Miss Rate** - Should be <1%
2. **Workshop Routing Error Rate** - Should be <0.1%
3. **Payment Split Failures** - Should be 0
4. **Toggle Admin Page Load Time** - Should be <500ms

---

## Summary

This feature toggle strategy provides:

✅ **Zero Risk Deployment** - Build workshop features without affecting production
✅ **Admin Control** - No code deployments needed to enable/disable features
✅ **Gradual Rollout** - Test with 5 workshops → 10% → 50% → 100%
✅ **Emergency Kill Switch** - Disable problematic features in <30 seconds
✅ **A/B Testing Ready** - Test workshop routing vs broadcast side-by-side
✅ **Audit Trail** - Track who changed what and when

**Next Steps:**
1. Run database migration (Phase 1)
2. Create toggle service (Phase 1)
3. Build admin UI (Phase 1)
4. Integrate into assignment logic (Phase 2)
5. Build workshop features behind toggles (Phase 3)

**Questions? Issues?**
- Refer to [STRATEGIC_ROADMAP_WORKSHOPS.md](./STRATEGIC_ROADMAP_WORKSHOPS.md) for workshop implementation details
- Check toggle audit log for troubleshooting
- Use percentage rollout for safe testing

---

**Document Version**: 1.0
**Last Updated**: 2025-10-24
**Maintained By**: Engineering Team
