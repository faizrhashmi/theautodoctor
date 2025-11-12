# FINAL WORKSHOP SPECIALIST PLAN - Legally Compliant
**Date:** November 12, 2025
**Status:** 🎯 READY FOR IMPLEMENTATION
**Compliance:** ✅ Canadian Employment Law Compliant

---

## EXECUTIVE SUMMARY

### Your Requirements - CONFIRMED ✅

1. ✅ **NO involvement in workshop-mechanic payment splits** - We don't track, suggest, or enforce any payment arrangements
2. ✅ **Workshop owner has FULL control** - They designate specialists, we just record it
3. ✅ **Single source of truth** - One system, connected to matching flow
4. ✅ **30-day cooling period EXISTS** - Already implemented and working
5. ✅ **Mechanic can leave anytime** - Get own account after cooling period

### What I Found - VERIFIED ✅

**Workshop Dashboard:**
- ✅ EXISTS at `/workshop/dashboard`
- ✅ Shows mechanics list
- ✅ Has InviteMechanicModal component
- ⚠️ **MISSING:** Specialist designation controls
- ⚠️ **MISSING:** Remove mechanic functionality visible

**Cooling Period:**
- ✅ Fully implemented in migration `20251109000002_add_cooling_period.sql`
- ✅ Auto-triggers when mechanic removed from workshop
- ✅ 30-day suspension period
- ✅ After 30 days: Can become independent OR join new workshop

**Current Issues:**
- ❌ Individual mechanics CAN self-designate as specialists (should only be workshop owner for employees)
- ❌ No UI for workshop owner to manage specialist status
- ❌ Matching system checks individual `is_brand_specialist` field (wrong source)

---

## THE INTELLIGENT SOLUTION

### Single Source of Truth Architecture

```
┌──────────────────────────────────────────────────────────┐
│              MECHANIC PROFILE TABLE                       │
│  (mechanics table - existing)                            │
│                                                           │
│  Fields:                                                  │
│  • is_brand_specialist: BOOLEAN                          │
│  • brand_specializations: TEXT[]                         │
│  • specialist_tier: TEXT                                 │
│  • workshop_id: UUID (NULL if independent)               │
│  • account_type: TEXT (workshop_mechanic/individual)     │
│                                                           │
│  ⚠️ CURRENT PROBLEM:                                     │
│  Workshop employees can edit these fields directly!      │
└──────────────────────────────────────────────────────────┘
                          ↓
                 WHO CAN MODIFY?
                          ↓
         ┌────────────────┴─────────────────┐
         │                                   │
    INDEPENDENT                      WORKSHOP EMPLOYEE
    (account_type =                 (account_type =
     individual_mechanic)            workshop_mechanic)
         │                                   │
         │                                   │
    ✅ CAN EDIT                        ❌ CANNOT EDIT
    (Self-designates)                  (Workshop owner controls)
         │                                   │
         ↓                                   ↓
    Admin reviews                      Workshop owner sets via
    & approves                         dashboard UI
         │                                   │
         └────────────────┬─────────────────┘
                          ↓
              ┌──────────────────────────┐
              │   MATCHING SYSTEM        │
              │                          │
              │  Reads from mechanics    │
              │  table ONLY              │
              │  (Single source of truth)│
              └──────────────────────────┘
```

### Key Insight: Use RLS + UI Controls, Not New Tables

**Why This Is Best:**
- ✅ Single source of truth (mechanics table)
- ✅ No payment tracking (legally compliant)
- ✅ No new tables needed
- ✅ Workshop controls via UI + RLS policies
- ✅ Matching system already reads from mechanics table

---

## IMPLEMENTATION PLAN

### Phase 1: Lock Down Profile Editing (2 hours)

#### Step 1.1: Add RLS Policy to Prevent Workshop Mechanics from Self-Designating

**File:** New migration `supabase/migrations/YYYYMMDD_lock_specialist_fields.sql`

```sql
-- Prevent workshop employees from editing specialist fields
-- Workshop owners must use dashboard to manage their team

-- Drop existing overly-permissive policies (if any)
DROP POLICY IF EXISTS "Mechanics can update own profile" ON mechanics;

-- Create granular update policy
CREATE POLICY "Mechanics can update non-specialist fields"
  ON mechanics FOR UPDATE
  USING (
    -- Can only update own record
    user_id = auth.uid()
  )
  WITH CHECK (
    -- Can only update own record
    user_id = auth.uid()
    AND
    -- If workshop employee, CANNOT change specialist fields
    (
      account_type != 'workshop_mechanic'
      OR
      (
        -- Workshop employees can only update these safe fields:
        (is_brand_specialist IS NOT DISTINCT FROM OLD.is_brand_specialist) AND
        (brand_specializations IS NOT DISTINCT FROM OLD.brand_specializations) AND
        (specialist_tier IS NOT DISTINCT FROM OLD.specialist_tier)
      )
    )
  );

-- Workshop owners can update their employees' specialist designations
CREATE POLICY "Workshop owners manage employee specialists"
  ON mechanics FOR UPDATE
  USING (
    -- User is owner/admin of the mechanic's workshop
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  )
  WITH CHECK (
    -- Same workshop check
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

COMMENT ON POLICY "Mechanics can update non-specialist fields" ON mechanics IS
  'Workshop employees cannot self-designate as specialists. Workshop owners control this via dashboard.';
```

#### Step 1.2: Update Profile UI to Disable Specialist Fields for Workshop Employees

**File:** `src/app/mechanic/profile/MechanicProfileClient.tsx`

```typescript
// Line 320 - Update specialist tier selection
function SpecializationsTab({ profile, setProfile, mechanicType }: any) {
  const [selectedTier, setSelectedTier] = useState(profile.specialist_tier || 'general')

  // ✅ NEW: Disable specialist tier selection for workshop employees
  const isWorkshopEmployee = mechanicType === 'workshop_affiliated'

  const handleTierChange = (tier: string) => {
    // ✅ Prevent workshop employees from changing tier
    if (isWorkshopEmployee && tier !== 'general') {
      alert(
        '⚠️ Specialist Designation Managed by Workshop\n\n' +
        'Your workshop owner controls specialist designations. ' +
        'If you believe you should be designated as a specialist, ' +
        'please speak with your workshop manager.\n\n' +
        'Want to be an independent specialist? You can leave your workshop ' +
        'and create your own account after the 30-day cooling period.'
      )
      return
    }

    setSelectedTier(tier)
    setProfile((prev: any) => ({ ...prev, specialist_tier: tier }))
  }

  return (
    <div className="space-y-8">
      {/* Specialist Tier - Show status for workshop employees */}
      {isWorkshopEmployee ? (
        // READ-ONLY display for workshop employees
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">
            Your Specialist Status
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Managed by your workshop owner
          </p>

          <div className="flex items-center gap-4">
            {profile.is_brand_specialist ? (
              <>
                <div className="flex-shrink-0">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-3xl">
                    ⭐
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-xl font-bold text-white mb-1">
                    Brand Specialist
                  </div>
                  <div className="text-sm text-slate-300 mb-2">
                    Certified for: {profile.brand_specializations?.join(', ') || 'No brands set'}
                  </div>
                  <div className="text-xs text-slate-500">
                    Designated by workshop owner
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex-shrink-0">
                  <div className="h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center text-3xl">
                    🔧
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-xl font-bold text-white mb-1">
                    General Mechanic
                  </div>
                  <div className="text-sm text-slate-400">
                    Not currently designated as specialist
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Contact your workshop owner if you believe you should be designated as a specialist
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        // EDITABLE for independent mechanics (existing code)
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Specialist Tier</h3>
          <p className="text-sm text-slate-400 mb-6">
            Choose your specialist tier. Higher tiers command premium pricing.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {tiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => handleTierChange(tier.id)}
                className={/* existing styles */}
              >
                {/* existing tier card content */}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Brand Specializations - Conditional editing */}
      {!isWorkshopEmployee && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Brand Specializations</h3>
          <BrandSelector
            value={profile.brand_specializations || []}
            onChange={(brands) => setProfile((prev: any) => ({ ...prev, brand_specializations: brands }))}
          />
        </div>
      )}

      {/* Service Keywords - Always editable (not specialist-specific) */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Service Keywords</h3>
        <ServiceKeywordsSelector
          value={profile.service_keywords || []}
          onChange={(keywords) => setProfile((prev: any) => ({ ...prev, service_keywords: keywords }))}
        />
      </div>
    </div>
  )
}
```

---

### Phase 2: Add Workshop Specialist Management UI (4 hours)

#### Step 2.1: Create Workshop Team Management Page

**File:** `src/app/workshop/team/page.tsx` (NEW)

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Users, Star, Shield, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { BrandSelector } from '@/components/mechanic/BrandSelector'

interface TeamMechanic {
  id: string
  name: string
  email: string
  phone: string
  years_of_experience: number
  is_brand_specialist: boolean
  brand_specializations: string[]
  specialist_tier: 'general' | 'brand' | 'master'
  red_seal_certified: boolean
  account_status: string
}

export default function WorkshopTeamPage() {
  const [mechanics, setMechanics] = useState<TeamMechanic[]>([])
  const [loading, setLoading] = useState(true)
  const [editingMechanic, setEditingMechanic] = useState<string | null>(null)
  const [editData, setEditData] = useState<{
    is_brand_specialist: boolean
    brand_specializations: string[]
    specialist_tier: string
  } | null>(null)

  useEffect(() => {
    fetchTeamMechanics()
  }, [])

  const fetchTeamMechanics = async () => {
    try {
      const response = await fetch('/api/workshop/team/mechanics')
      const data = await response.json()
      setMechanics(data.mechanics || [])
    } catch (error) {
      console.error('Failed to fetch mechanics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditSpecialist = (mechanic: TeamMechanic) => {
    setEditingMechanic(mechanic.id)
    setEditData({
      is_brand_specialist: mechanic.is_brand_specialist,
      brand_specializations: mechanic.brand_specializations || [],
      specialist_tier: mechanic.specialist_tier || 'general'
    })
  }

  const handleSaveSpecialist = async (mechanicId: string) => {
    try {
      const response = await fetch(`/api/workshop/team/mechanics/${mechanicId}/specialist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })

      if (response.ok) {
        await fetchTeamMechanics() // Refresh list
        setEditingMechanic(null)
        setEditData(null)
      } else {
        const error = await response.json()
        alert(`Failed to update: ${error.message}`)
      }
    } catch (error) {
      console.error('Failed to update specialist status:', error)
      alert('Failed to update specialist status')
    }
  }

  const handleRemoveSpecialist = async (mechanicId: string) => {
    if (!confirm('Remove specialist designation from this mechanic?')) return

    try {
      const response = await fetch(`/api/workshop/team/mechanics/${mechanicId}/specialist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_brand_specialist: false,
          brand_specializations: [],
          specialist_tier: 'general'
        })
      })

      if (response.ok) {
        await fetchTeamMechanics()
      }
    } catch (error) {
      console.error('Failed to remove specialist:', error)
    }
  }

  if (loading) {
    return <div className="p-6 text-white">Loading team...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Team Management</h1>
          <p className="text-slate-400">
            Manage your mechanics and designate specialists
          </p>
        </div>

        {/* Specialists Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-orange-400" />
            Brand Specialists ({mechanics.filter(m => m.is_brand_specialist).length})
          </h2>

          {mechanics.filter(m => m.is_brand_specialist).length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
              <Star className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No specialists designated yet</p>
              <p className="text-slate-500 text-sm mt-1">
                Designate mechanics as specialists below to enable premium bookings
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {mechanics.filter(m => m.is_brand_specialist).map(mechanic => (
                <div
                  key={mechanic.id}
                  className="bg-slate-800/50 border border-orange-500/30 rounded-xl p-6"
                >
                  {editingMechanic === mechanic.id ? (
                    // EDIT MODE
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">{mechanic.name}</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveSpecialist(mechanic.id)}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingMechanic(null)
                              setEditData(null)
                            }}
                            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Specialist Tier
                        </label>
                        <select
                          value={editData?.specialist_tier}
                          onChange={(e) => setEditData({ ...editData!, specialist_tier: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-600 text-white rounded-lg"
                        >
                          <option value="general">General Mechanic</option>
                          <option value="brand">Brand Specialist</option>
                          <option value="master">Master Technician</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Certified Brands
                        </label>
                        <BrandSelector
                          value={editData?.brand_specializations || []}
                          onChange={(brands) => setEditData({ ...editData!, brand_specializations: brands })}
                        />
                      </div>
                    </div>
                  ) : (
                    // VIEW MODE
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{mechanic.name}</h3>
                          <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs font-semibold rounded-full">
                            {mechanic.specialist_tier === 'master' ? 'Master' : 'Brand Specialist'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mb-1">{mechanic.email}</p>
                        <p className="text-sm text-slate-400 mb-3">
                          {mechanic.years_of_experience} years experience
                          {mechanic.red_seal_certified && ' • Red Seal Certified'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {mechanic.brand_specializations?.map(brand => (
                            <span
                              key={brand}
                              className="px-3 py-1 bg-slate-700 text-slate-200 text-xs rounded-lg"
                            >
                              {brand}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSpecialist(mechanic)}
                          className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                          title="Edit specialist details"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveSpecialist(mechanic.id)}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition"
                          title="Remove specialist designation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* General Mechanics Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-400" />
            General Mechanics ({mechanics.filter(m => !m.is_brand_specialist).length})
          </h2>

          <div className="grid gap-4">
            {mechanics.filter(m => !m.is_brand_specialist).map(mechanic => (
              <div
                key={mechanic.id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{mechanic.name}</h3>
                    <p className="text-sm text-slate-400 mb-1">{mechanic.email}</p>
                    <p className="text-sm text-slate-400">
                      {mechanic.years_of_experience} years experience
                      {mechanic.red_seal_certified && ' • Red Seal Certified'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingMechanic(mechanic.id)
                      setEditData({
                        is_brand_specialist: true,
                        brand_specializations: [],
                        specialist_tier: 'brand'
                      })
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                  >
                    <Star className="h-4 w-4" />
                    Designate as Specialist
                  </button>
                </div>

                {editingMechanic === mechanic.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Certified Brands
                      </label>
                      <BrandSelector
                        value={editData?.brand_specializations || []}
                        onChange={(brands) => setEditData({ ...editData!, brand_specializations: brands })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveSpecialist(mechanic.id)}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition"
                      >
                        Save Specialist
                      </button>
                      <button
                        onClick={() => {
                          setEditingMechanic(null)
                          setEditData(null)
                        }}
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
```

#### Step 2.2: Create API Endpoints

**File:** `src/app/api/workshop/team/mechanics/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated workshop owner
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workshop ID from organization_members
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Workshop owner access required' }, { status: 403 })
    }

    // Get all mechanics in this workshop
    const { data: mechanics, error } = await supabaseAdmin
      .from('mechanics')
      .select(`
        id,
        name,
        email,
        phone,
        years_of_experience,
        is_brand_specialist,
        brand_specializations,
        specialist_tier,
        red_seal_certified,
        account_status
      `)
      .eq('workshop_id', membership.organization_id)
      .eq('account_type', 'workshop_mechanic')
      .order('is_brand_specialist', { ascending: false })
      .order('name')

    if (error) {
      console.error('[Workshop Team] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch mechanics' }, { status: 500 })
    }

    return NextResponse.json({ mechanics })
  } catch (error: any) {
    console.error('[Workshop Team] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**File:** `src/app/api/workshop/team/mechanics/[mechanicId]/specialist/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ mechanicId: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { mechanicId } = await context.params
    const supabase = await createClient()

    // Get authenticated workshop owner
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify mechanic exists and belongs to this workshop owner
    const { data: mechanic } = await supabaseAdmin
      .from('mechanics')
      .select('workshop_id, account_type')
      .eq('id', mechanicId)
      .single()

    if (!mechanic) {
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    if (mechanic.account_type !== 'workshop_mechanic') {
      return NextResponse.json(
        { error: 'Can only manage workshop employees' },
        { status: 403 }
      )
    }

    // Verify user is owner of this workshop
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', mechanic.workshop_id)
      .eq('role', 'owner')
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You must be the workshop owner to manage specialists' },
        { status: 403 }
      )
    }

    // Parse update data
    const updates = await request.json()

    // Update mechanic specialist status
    const { error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update({
        is_brand_specialist: updates.is_brand_specialist,
        brand_specializations: updates.brand_specializations,
        specialist_tier: updates.specialist_tier || 'general'
      })
      .eq('id', mechanicId)

    if (updateError) {
      console.error('[Workshop Specialist Update] Error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update specialist status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Workshop Specialist Update] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

#### Step 2.3: Add Link to Workshop Sidebar

**File:** `src/components/workshop/WorkshopSidebar.tsx`

Add this navigation item:

```typescript
{
  name: 'Team',
  href: '/workshop/team',
  icon: Users,
  current: pathname === '/workshop/team'
}
```

---

### Phase 3: Update Matching System (1 hour)

**No changes needed!** The matching system already reads from the `mechanics` table:

**File:** `src/app/api/mechanics/available/route.ts` (Lines 66-69)

```typescript
// ✅ Already filters by is_brand_specialist
if (requestType === 'brand_specialist') {
  query = query.eq('is_brand_specialist', true)
}
```

**And later (Lines 100-109):**

```typescript
// ✅ Already filters by brand_specializations
if (requestType === 'brand_specialist' && requestedBrand) {
  filteredMechanics = filteredMechanics.filter(mechanic => {
    return mechanic.brand_specializations?.some((brand: string) =>
      brand.toLowerCase() === requestedBrand.toLowerCase()
    )
  })
}
```

**This is PERFECT** - Single source of truth maintained! ✅

---

### Phase 4: Hourly Rate Visibility (1 hour)

**Already covered in previous document - just implement:**

1. Hide hourly_rate for `virtual_only` and `workshop_mechanic`
2. Show info box explaining rates are set by workshop/session %
3. API validation to reject hourly_rate updates from non-independent mechanics

---

## VERIFICATION CHECKLIST

### ✅ Canadian Employment Law Compliance

- ✅ **NO payment tracking** - We don't record or suggest split arrangements
- ✅ **NO interference** - Mechanic negotiates directly with workshop
- ✅ **Employee autonomy** - Can leave anytime (with cooling period)
- ✅ **Clear employment** - Workshop employees marked as `workshop_mechanic`
- ✅ **30-day cooling period** - Prevents immediate jumping to competition

### ✅ Workshop Control

- ✅ **Full control** - Workshop owner designates specialists via dashboard
- ✅ **Edit/remove** - Can change specialist status anytime
- ✅ **No self-designation** - Employees cannot self-designate

### ✅ Single Source of Truth

- ✅ **Mechanics table** - All specialist data in one place
- ✅ **Matching reads from mechanics table** - No new lookups needed
- ✅ **RLS enforcement** - Database prevents unauthorized changes

### ✅ Mechanic Freedom

- ✅ **Can leave** - No lock-in
- ✅ **30-day cooling period** - Already implemented
- ✅ **Own account** - Can become independent after cooling period

---

## IMPLEMENTATION TIMELINE

### Week 1: Core Implementation (8 hours)

**Day 1-2: Lock Down Profile Editing (2 hours)**
- Create RLS policy migration
- Update profile UI to show read-only specialist status for workshop employees
- Test: Workshop employee cannot change specialist fields

**Day 3-4: Workshop Management UI (4 hours)**
- Create `/workshop/team` page
- Add "Designate as Specialist" functionality
- Add edit/remove specialist controls
- Test: Workshop owner can manage all specialists

**Day 5: API Endpoints (2 hours)**
- Create `GET /api/workshop/team/mechanics`
- Create `PATCH /api/workshop/team/mechanics/[id]/specialist`
- Test API authorization and updates

### Week 2: Polish & Testing (4 hours)

**Day 1: Hourly Rate Visibility (1 hour)**
- Hide field for virtual/workshop mechanics
- Show context-appropriate messaging

**Day 2-3: Integration Testing (2 hours)**
- Test full flow: designate specialist → customer searches → matching works
- Verify cooling period still works
- Test employee cannot self-designate

**Day 4: Documentation (1 hour)**
- Update workshop owner guide
- Document new team management features

---

## SUCCESS METRICS

### Compliance Metrics
- ✅ Zero platform involvement in payment splits
- ✅ Zero employment law violations
- ✅ 100% workshop owner control

### Functional Metrics
- ✅ Workshop employees cannot self-designate as specialists
- ✅ Workshop owners can manage all team specialists
- ✅ Matching system correctly finds specialists
- ✅ Customers see accurate specialist information

### User Experience Metrics
- ✅ Workshop owners rate team management as "easy to use"
- ✅ Zero confusion about who controls specialist designation
- ✅ Mechanics understand cooling period policy

---

## FINAL ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    MECHANICS TABLE                           │
│                 (Single Source of Truth)                     │
│                                                              │
│  Fields:                                                     │
│  • is_brand_specialist                                       │
│  • brand_specializations                                     │
│  • specialist_tier                                           │
│  • workshop_id                                               │
│  • account_type                                              │
└─────────────────────────────────────────────────────────────┘
                           ↑
                           │ Updates via RLS-protected API
                           │
        ┌──────────────────┴─────────────────────┐
        │                                         │
   ┌────────────┐                        ┌────────────────┐
   │ Independent│                        │ Workshop Owner │
   │  Mechanic  │                        │   Dashboard    │
   └────────────┘                        └────────────────┘
        │                                         │
        │ Self-designates                        │ Designates
        │ (Admin approves)                       │ employees
        │                                         │
        └──────────────────┬─────────────────────┘
                           │
                           ↓
                  ┌─────────────────┐
                  │ MATCHING SYSTEM │
                  │                 │
                  │ Reads from      │
                  │ mechanics table │
                  └─────────────────┘
                           ↓
                  ┌─────────────────┐
                  │  CUSTOMER SEES  │
                  │  Specialists    │
                  └─────────────────┘
```

---

## WHAT YOU GET

### 1. Legal Protection ✅
- No involvement in employment relationships
- No payment tracking or enforcement
- Clear policy: "Mechanics negotiate with workshop directly"

### 2. Workshop Control ✅
- Full team management dashboard
- Designate/edit/remove specialists
- No employee self-service for specialist status

### 3. Single Source of Truth ✅
- All data in mechanics table
- Matching reads from one place
- No synchronization issues

### 4. Mechanic Freedom ✅
- 30-day cooling period already exists
- Can leave anytime
- Can become independent after cooling

### 5. Customer Transparency ✅
- See accurate specialist information
- Know who designated specialist (workshop vs independent)
- Trust in verification process

---

## MY FINAL RECOMMENDATION

**THIS IS THE RIGHT APPROACH ✅**

**Why:**
1. ✅ Legally compliant - No employment law issues
2. ✅ Simple architecture - Uses existing tables
3. ✅ Workshop control - Full management UI
4. ✅ Single source of truth - No duplicate data
5. ✅ Quick implementation - 12 hours total

**What NOT to do:**
- ❌ Track specialist payment splits
- ❌ Suggest bonus percentages
- ❌ Enforce payment obligations
- ❌ Get involved in employment relationship

**The Platform's Role:**
- ✅ Record who is designated as specialist
- ✅ Show specialists to customers
- ✅ Match customers with specialists
- ✅ Let workshop owner manage their team
- ✅ Stay OUT of payment arrangements

---

## NEXT STEPS

**Ready to proceed?**

1. **Approve this plan** - Confirm approach is acceptable
2. **Phase 1** - I'll create the RLS migration and update profile UI
3. **Phase 2** - Build workshop team management page
4. **Phase 3** - Verify matching system works (should be automatic)
5. **Phase 4** - Add hourly rate visibility logic
6. **Testing** - Full end-to-end verification

**Total time: 2 weeks (12 hours development)**

Should I start with Phase 1?

---

*End of Final Plan - Legally Compliant & Ready to Implement*
