# WORKSHOP SPECIALIST & HOURLY RATE - INTELLIGENT BUSINESS LOGIC SOLUTION
**Date:** November 12, 2025
**Status:** 🎯 STRATEGIC RECOMMENDATION
**Priority:** 🔴 CRITICAL - Business Model Integrity

---

## EXECUTIVE SUMMARY

### The Challenge
1. **Workshop employees CAN be brand specialists** (BMW, Porsche, etc.) and deserve premium compensation
2. **Current system conflict:** Specialist premium goes to workshop, but no mechanism to ensure workshop pays specialist mechanic fairly
3. **Hourly rate confusion:** Field shown to mechanics who shouldn't set their own rates

### The Intelligent Solution
**Workshop-Level Specialist Control System** - Let workshops designate which mechanics are specialists, control pricing, and manage specialist premiums transparently.

**Key Insight:** Shift specialist designation from individual mechanic profiles to workshop-managed credentials with proper audit trails.

---

## PART 1: WORKSHOP SPECIALIST SYSTEM (Your Question #1)

### Current Problem Analysis

**Pricing System Confirmed:**
```sql
-- ✅ YES, both pricing patterns exist
ALTER TABLE brand_specializations
  ADD COLUMN specialist_premium DECIMAL(10,2) DEFAULT 15.00;

UPDATE brand_specializations
  SET specialist_premium = 15.00 WHERE NOT is_luxury;  -- Standard brands

UPDATE brand_specializations
  SET specialist_premium = 25.00 WHERE is_luxury = true;  -- Luxury brands
```

**Current Payment Flow (UNFAIR TO WORKSHOPS):**
```
Customer books "David - BMW Specialist" → $49.99 + $25 luxury = $74.99
  ↓
Payment goes to WORKSHOP (not David)
  ↓
Workshop pays David his salary (no extra for specialist booking)
  ↓
⚠️ PROBLEM: Workshop earns $74.99 but has no obligation to compensate David for specialist premium
  ↓
WORSE: Customer expects specialist but workshop can assign anyone available
```

---

### INTELLIGENT SOLUTION: Workshop Specialist Management System

#### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    WORKSHOP OWNER PORTAL                     │
│                                                               │
│  1. Designates mechanics as specialists                      │
│  2. Sets which brands each mechanic is certified for         │
│  3. Defines bonus structure for specialist bookings          │
│  4. System enforces: Only designated specialist can accept   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   SPECIALIST CREDENTIALS                      │
│  (workshop_specialist_credentials table)                     │
│                                                               │
│  • workshop_id: UUID                                         │
│  • mechanic_id: UUID                                         │
│  • brand_specializations: TEXT[]                             │
│  • verified_by: workshop owner/admin                         │
│  • specialist_bonus_percent: DECIMAL (e.g., 20%)            │
│  • active: BOOLEAN                                           │
│  • expires_at: TIMESTAMPTZ (re-verification required)        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    BOOKING & PAYMENT FLOW                     │
│                                                               │
│  Customer → Selects "BMW Specialist"                         │
│     ↓                                                         │
│  System → Only shows workshop mechanics with verified        │
│           BMW specialist credential                          │
│     ↓                                                         │
│  Booking → Customer pays $74.99 (session + luxury premium)   │
│     ↓                                                         │
│  Payment → Workshop receives $74.99                          │
│     ↓                                                         │
│  System → Records $25 premium in specialist_earnings table   │
│     ↓                                                         │
│  Workshop → Must pay mechanic base + $25 specialist bonus    │
│     (Tracked in platform, enforced by workshop agreement)    │
└─────────────────────────────────────────────────────────────┘
```

---

### Database Schema Design

#### Table 1: workshop_specialist_credentials

```sql
-- New table: Workshop-managed specialist credentials
CREATE TABLE workshop_specialist_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  workshop_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,

  -- Specialist designation
  brand_specializations TEXT[] NOT NULL,  -- ['BMW', 'Mercedes-Benz', 'Audi']
  specialist_tier TEXT DEFAULT 'brand' CHECK (specialist_tier IN ('brand', 'master')),

  -- Verification & approval
  verified_by UUID NOT NULL REFERENCES auth.users(id),  -- Workshop owner/admin who approved
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 years'),  -- Must re-verify every 2 years

  -- Compensation agreement
  specialist_bonus_percent DECIMAL(5,2) DEFAULT 20.00,  -- Mechanic gets 20% of specialist premium
  specialist_bonus_flat DECIMAL(10,2),  -- OR flat bonus per specialist booking

  -- Status
  active BOOLEAN DEFAULT true,
  suspended_reason TEXT,
  suspended_until TIMESTAMPTZ,

  -- Evidence/documentation
  certification_urls TEXT[],  -- Links to certificates, training docs
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(workshop_id, mechanic_id),  -- One credential per mechanic per workshop

  -- Validation
  CHECK (array_length(brand_specializations, 1) > 0),  -- Must have at least one brand
  CHECK (
    (specialist_bonus_percent IS NOT NULL AND specialist_bonus_flat IS NULL) OR
    (specialist_bonus_percent IS NULL AND specialist_bonus_flat IS NOT NULL)
  )  -- Must choose percentage OR flat, not both
);

-- Indexes
CREATE INDEX idx_specialist_creds_workshop ON workshop_specialist_credentials(workshop_id, active);
CREATE INDEX idx_specialist_creds_mechanic ON workshop_specialist_credentials(mechanic_id, active);
CREATE INDEX idx_specialist_creds_brands ON workshop_specialist_credentials USING GIN(brand_specializations);
CREATE INDEX idx_specialist_creds_expires ON workshop_specialist_credentials(expires_at) WHERE active = true;

-- RLS Policies
ALTER TABLE workshop_specialist_credentials ENABLE ROW LEVEL SECURITY;

-- Workshop owners/admins can manage their specialist credentials
CREATE POLICY "Workshop admins manage specialist credentials"
  ON workshop_specialist_credentials FOR ALL
  USING (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Mechanics can view their own credentials
CREATE POLICY "Mechanics view own specialist credentials"
  ON workshop_specialist_credentials FOR SELECT
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE user_id = auth.uid()
    )
  );

-- Customers can view active specialist credentials (for booking)
CREATE POLICY "Customers view active specialist credentials"
  ON workshop_specialist_credentials FOR SELECT
  USING (active = true AND expires_at > NOW());
```

#### Table 2: specialist_earnings_ledger

```sql
-- Audit trail: Track specialist premiums earned
CREATE TABLE specialist_earnings_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES organizations(id),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id),
  credential_id UUID REFERENCES workshop_specialist_credentials(id),

  -- Earnings breakdown
  session_base_price DECIMAL(10,2) NOT NULL,
  specialist_premium DECIMAL(10,2) NOT NULL,  -- $15 or $25
  mechanic_bonus_amount DECIMAL(10,2) NOT NULL,  -- Amount owed to mechanic

  -- Payment tracking
  workshop_received_at TIMESTAMPTZ,
  mechanic_paid_at TIMESTAMPTZ,
  payment_method TEXT,  -- 'salary', 'bonus', 'commission'

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(session_id, mechanic_id)
);

-- Indexes
CREATE INDEX idx_specialist_earnings_workshop ON specialist_earnings_ledger(workshop_id, mechanic_paid_at);
CREATE INDEX idx_specialist_earnings_mechanic ON specialist_earnings_ledger(mechanic_id, mechanic_paid_at);
CREATE INDEX idx_specialist_earnings_unpaid ON specialist_earnings_ledger(mechanic_paid_at) WHERE mechanic_paid_at IS NULL;

-- RLS Policies
ALTER TABLE specialist_earnings_ledger ENABLE ROW LEVEL SECURITY;

-- Workshop owners see their ledger
CREATE POLICY "Workshop owners view specialist earnings"
  ON specialist_earnings_ledger FOR SELECT
  USING (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Mechanics see their own earnings
CREATE POLICY "Mechanics view own specialist earnings"
  ON specialist_earnings_ledger FOR SELECT
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE user_id = auth.uid()
    )
  );

-- Only workshop owners can mark as paid
CREATE POLICY "Workshop owners update paid status"
  ON specialist_earnings_ledger FOR UPDATE
  USING (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
```

---

### Updated Mechanic Matching Logic

**Before (Current System - FLAWED):**
```typescript
// src/lib/mechanicMatching.ts
if (requestType === 'brand_specialist') {
  filteredMechanics = mechanics.filter(m =>
    m.is_brand_specialist &&  // ❌ Individual mechanic claims specialist
    m.brand_specializations?.includes(requestedBrand)
  )
}
```

**After (Intelligent System - FAIR):**
```typescript
// src/lib/mechanicMatching.ts
if (requestType === 'brand_specialist') {
  // Get mechanics with VERIFIED workshop specialist credentials
  const { data: credentials } = await supabase
    .from('workshop_specialist_credentials')
    .select(`
      mechanic_id,
      brand_specializations,
      specialist_tier,
      specialist_bonus_percent,
      workshop:organizations!workshop_id(id, name)
    `)
    .eq('active', true)
    .gt('expires_at', new Date().toISOString())
    .contains('brand_specializations', [requestedBrand])

  const verifiedSpecialistIds = credentials.map(c => c.mechanic_id)

  // ONLY show mechanics with workshop-verified specialist credentials
  filteredMechanics = mechanics.filter(m =>
    verifiedSpecialistIds.includes(m.id)
  )

  // Attach credential info for transparency
  filteredMechanics = filteredMechanics.map(m => ({
    ...m,
    specialistCredential: credentials.find(c => c.mechanic_id === m.id),
    workshopName: credentials.find(c => c.mechanic_id === m.id)?.workshop.name
  }))
}
```

---

### Workshop Owner Portal UI

#### Page: `/workshop/specialists/manage`

**Features:**
1. **List All Workshop Mechanics**
   - Show current specialist status
   - Show brands they're certified for
   - Show expiration dates

2. **Designate Specialist Button**
   - Modal opens with brand selector
   - Choose specialist tier (brand/master)
   - Set bonus structure (% or flat)
   - Upload certification proof
   - Save creates credential record

3. **Specialist Earnings Dashboard**
   - Table showing unpaid specialist bonuses
   - "Mark as Paid" button
   - Export to payroll CSV

**Mock UI:**
```tsx
// src/app/workshop/specialists/manage/page.tsx
'use client'

export default function WorkshopSpecialistManagement() {
  return (
    <div className="p-6">
      <h1>Specialist Mechanic Management</h1>

      {/* Active Specialists */}
      <section className="mb-8">
        <h2>Current Specialists</h2>
        <table>
          <thead>
            <tr>
              <th>Mechanic</th>
              <th>Brands</th>
              <th>Tier</th>
              <th>Bonus</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>David Smith</td>
              <td>BMW, Mercedes-Benz</td>
              <td>Brand Specialist</td>
              <td>20% of premium</td>
              <td>Jan 15, 2027</td>
              <td>
                <button>Edit</button>
                <button>Suspend</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Non-Specialist Mechanics */}
      <section className="mb-8">
        <h2>General Mechanics</h2>
        <table>
          <thead>
            <tr>
              <th>Mechanic</th>
              <th>Years Experience</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>John Doe</td>
              <td>8 years</td>
              <td>
                <button onClick={openDesignateModal}>
                  ⭐ Designate as Specialist
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Unpaid Specialist Bonuses */}
      <section>
        <h2>Unpaid Specialist Bonuses</h2>
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
          <p>💰 Total Unpaid: $375.00 (15 specialist sessions)</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Session</th>
              <th>Mechanic</th>
              <th>Brand</th>
              <th>Premium</th>
              <th>Bonus Owed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Nov 10</td>
              <td>#12345</td>
              <td>David Smith</td>
              <td>BMW</td>
              <td>$25</td>
              <td>$5.00 (20%)</td>
              <td>
                <button>Mark Paid</button>
              </td>
            </tr>
          </tbody>
        </table>
        <button className="mt-4">Export to CSV for Payroll</button>
      </section>
    </div>
  )
}
```

---

### Vetting & Approval Process (Independent Mechanics)

**You mentioned:** "For independent mechanics, they can define themselves and we have a vetting process to verify and approve."

**Let's verify this exists:**

#### Current Admin Approval System

**File:** `src/app/api/admin/mechanics/[id]/approve/route.ts`

**Expected Flow:**
```
1. Independent mechanic signs up
   ↓
2. Sets is_brand_specialist = true in profile
   ↓
3. Selects brand_specializations: ['BMW', 'Audi']
   ↓
4. application_status = 'pending'
   ↓
5. Admin reviews:
   - Profile completeness
   - Certifications uploaded
   - Years of experience
   - Brand specialization claims
   ↓
6. Admin clicks "Approve"
   ↓
7. application_status = 'approved'
   ↓
8. Mechanic can now accept specialist bookings
```

**✅ RECOMMENDATION:** Add specialist verification checklist to admin approval UI:

```tsx
// src/app/admin/mechanics/applications/page.tsx
<div className="specialist-verification">
  <h3>Specialist Claims Verification</h3>

  {mechanic.is_brand_specialist && (
    <div>
      <p>Claimed Brands: {mechanic.brand_specializations.join(', ')}</p>
      <p>Specialist Tier: {mechanic.specialist_tier}</p>

      <label>
        <input type="checkbox" required />
        Verified certification documents for claimed brands
      </label>

      <label>
        <input type="checkbox" required />
        Confirmed 5+ years experience with these brands
      </label>

      <label>
        <input type="checkbox" required />
        Background check passed
      </label>

      {/* Can only approve if all boxes checked */}
      <button disabled={!allChecked}>Approve Specialist</button>
    </div>
  )}
</div>
```

---

### Customer-Facing Changes

**Before (Current - Unclear):**
```
[Mechanic Card]
David Smith ⭐
BMW Specialist
Rating: 4.9 (127 reviews)
Price: $49.99 + $25 specialist premium

[Customer thinks: I'm paying David directly]
```

**After (Transparent):**
```
[Mechanic Card]
David Smith ⭐
BMW Specialist at Toronto Auto Experts
✓ Workshop-Verified BMW Specialist (Expires: Jan 2027)
Rating: 4.9 (127 reviews)

Session: $49.99
Specialist Premium: $25.00 (BMW luxury brand)
Total: $74.99

ℹ️ Specialist premium goes to workshop, ensuring you receive
   service from a verified BMW specialist mechanic.
```

---

### Business Rules Summary

| Mechanic Type | Can Be Specialist? | Who Designates? | Who Gets Premium? | Transparency |
|---------------|-------------------|-----------------|-------------------|--------------|
| **Virtual Only** | ✅ Yes | Self-designated, admin-approved | Mechanic (70% of total) | Simple: mechanic earns it |
| **Independent Workshop** | ✅ Yes | Self-designated, admin-approved | Mechanic (as workshop owner) | Simple: mechanic owns shop |
| **Workshop Employee** | ✅ Yes | **Workshop owner designates** | Workshop → pays bonus to mechanic | **Complex: needs ledger system** |

---

## PART 2: HOURLY RATE FIELD VISIBILITY (Your Question #2)

### Current Problem

```
❌ INCORRECT CURRENT STATE:
- Virtual mechanics: CAN see hourly_rate field (shouldn't - no physical work)
- Workshop employees: CAN see hourly_rate field (shouldn't - workshop sets rates)
- Independent mechanics: CAN see hourly_rate field (correct - they need it)
```

### Intelligent Solution: Context-Aware Field Visibility

#### Rule Matrix

| Mechanic Type | Hourly Rate Field | Rationale | Alternative Display |
|---------------|-------------------|-----------|---------------------|
| **Virtual Only** | ❌ Hidden | No physical work, paid 70% of session | Show: "Session Rate: 70% of booking" |
| **Workshop Employee** | ❌ Hidden | Workshop sets all rates | Show: "Rates set by: [Workshop Name]" |
| **Independent Workshop** | ✅ Visible & Editable | Needs to quote physical repairs | Show: "Your Hourly Rate: $__" |

---

### Implementation: Dynamic Field Rendering

#### Backend: Add mechanic type to profile response

```typescript
// src/app/mechanic/profile/page.tsx (Server Component)
export default async function MechanicProfilePage() {
  const authMechanic = await requireMechanic()

  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select(`
      *,
      workshop_id,
      account_type
    `)
    .eq('id', authMechanic.id)
    .single()

  // ✅ Determine mechanic type using helper
  const mechanicType = getMechanicType(mechanic)

  return <MechanicProfileClient
    initialProfile={profileForClient}
    mechanicId={authMechanic.id}
    mechanicType={mechanicType}  // Pass to client
  />
}
```

#### Frontend: Conditional rendering

```typescript
// src/app/mechanic/profile/MechanicProfileClient.tsx

interface MechanicProfileClientProps {
  initialProfile: MechanicProfile
  mechanicId: string
  mechanicType: 'virtual_only' | 'independent_workshop' | 'workshop_affiliated'
}

function BasicInfoTab({ profile, setProfile, mechanicType }: any) {
  // Determine if hourly rate should be shown
  const showHourlyRate = mechanicType === 'independent_workshop'

  return (
    <div className="space-y-6">
      {/* Name, phone, about_me fields... */}

      {/* Shop Affiliation - always shown */}
      <div>
        <label>Shop Affiliation (Optional)</label>
        <input
          value={profile.shop_affiliation || ''}
          onChange={(e) => setProfile({...profile, shop_affiliation: e.target.value})}
        />
      </div>

      {/* Hourly Rate - conditional */}
      {showHourlyRate ? (
        <div>
          <label className="flex items-center gap-2">
            Hourly Rate (CAD)
            <span className="text-xs text-slate-400">
              For physical repair quotes
            </span>
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="number"
              value={profile.hourly_rate || ''}
              onChange={(e) => setProfile({...profile, hourly_rate: parseFloat(e.target.value) || 0})}
              className="w-full pl-10 pr-4 py-3 border border-slate-600 bg-slate-900/60 text-white rounded-xl"
              placeholder="125.00"
              min="0"
              step="0.01"
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            This rate will be shown to customers when you provide physical repair quotes.
            Typical range: $80-$150 CAD/hour depending on experience and location.
          </p>
        </div>
      ) : (
        // Alternative display for virtual/workshop mechanics
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-white mb-1">
                {mechanicType === 'virtual_only'
                  ? 'Virtual Session Rates'
                  : 'Workshop Rates'
                }
              </h4>
              <p className="text-sm text-slate-300">
                {mechanicType === 'virtual_only' ? (
                  <>
                    You earn <strong className="text-orange-400">70%</strong> of the session booking price.
                    For a $49.99 session, you earn $34.99.
                  </>
                ) : (
                  <>
                    Rates for physical work are set by <strong className="text-orange-400">
                      {profile.shop_affiliation || 'your workshop'}
                    </strong>.
                    Your earnings are determined by your employment agreement.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### Customer-Facing: When Hourly Rate is Shown

**Scenario 1: Customer viewing independent mechanic's profile**
```tsx
<div className="mechanic-rates">
  <h3>Rates</h3>
  <div>
    <span>Virtual Diagnostic Session:</span>
    <span>$49.99</span>
  </div>
  <div>
    <span>Physical Repair (if needed):</span>
    <span>$125/hour + parts</span>
  </div>
</div>
```

**Scenario 2: Customer receiving quote from independent mechanic**
```
Labor: 3 hours × $125/hour = $375
Parts: $450
Tax: $82.50
Total: $907.50
```

**Scenario 3: Workshop quote (hourly rate from workshop, not individual mechanic)**
```
Toronto Auto Experts Quote

Labor: 3 hours × $140/hour = $420  ← Workshop rate, not mechanic's
Parts: $450
Tax: $87.00
Total: $957.00

Mechanic assigned: David Smith (BMW Specialist)
```

---

### API Changes

**Update profile PATCH to validate hourly_rate based on mechanic type:**

```typescript
// src/app/api/mechanics/[mechanicId]/profile/route.ts
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { mechanicId } = await context.params
  const updates: ProfileUpdateData = await request.json()

  // Get mechanic type
  const { data: mechanic } = await supabase
    .from('mechanics')
    .select('workshop_id, account_type')
    .eq('id', mechanicId)
    .single()

  const mechanicType = getMechanicType(mechanic)

  // ✅ Validate hourly_rate based on type
  if ('hourly_rate' in updates) {
    if (mechanicType !== 'independent_workshop') {
      return NextResponse.json(
        {
          error: 'Only independent workshop owners can set hourly rates',
          mechanicType,
          hint: mechanicType === 'virtual_only'
            ? 'Virtual mechanics earn 70% of session price'
            : 'Workshop employees: rates are set by your workshop'
        },
        { status: 403 }
      )
    }
  }

  // ... rest of update logic
}
```

---

## IMPLEMENTATION ROADMAP

### Phase 1: Emergency Fixes (Week 1) - 8 hours

**Priority:** Fix profile completion and about_me saving (from previous audit)

1. ✅ Create profile_requirements table
2. ✅ Fix API to save about_me and hourly_rate
3. ✅ Add about_me to completion checks

**Deliverable:** Mechanics can complete profiles to 80%

---

### Phase 2: Hourly Rate Visibility (Week 2) - 4 hours

**Priority:** Correct hourly rate field display

1. **Pass mechanic type to client component** (30 min)
   - Update server component
   - Add prop to client

2. **Conditional rendering in BasicInfoTab** (1 hour)
   - Show field only for independent mechanics
   - Show info box for virtual/workshop

3. **API validation** (30 min)
   - Reject hourly_rate updates from non-independent

4. **Testing** (2 hours)
   - Virtual mechanic: field hidden, info shown
   - Workshop mechanic: field hidden, workshop rates info shown
   - Independent: field visible, can edit

**Deliverable:** Hourly rate only editable by independent mechanics

---

### Phase 3: Workshop Specialist System (Weeks 3-4) - 24 hours

**Priority:** Intelligent workshop specialist management

#### Week 3: Database & Backend (12 hours)

1. **Create migrations** (3 hours)
   - workshop_specialist_credentials table
   - specialist_earnings_ledger table
   - Indexes and RLS policies

2. **API endpoints** (4 hours)
   - POST /api/workshop/specialists/designate
   - GET /api/workshop/specialists/list
   - PATCH /api/workshop/specialists/[id]/update
   - DELETE /api/workshop/specialists/[id]/revoke
   - GET /api/workshop/specialists/earnings/unpaid
   - PATCH /api/workshop/specialists/earnings/[id]/mark-paid

3. **Update matching logic** (3 hours)
   - Modify mechanicMatching.ts
   - Query workshop_specialist_credentials
   - Filter by verified specialists only

4. **Session completion hook** (2 hours)
   - When specialist session completes
   - Calculate bonus amount
   - Insert into specialist_earnings_ledger

#### Week 4: Frontend (12 hours)

1. **Workshop specialist management page** (5 hours)
   - List current specialists
   - Designate/edit specialist modal
   - Suspend/revoke specialist access

2. **Specialist earnings dashboard** (3 hours)
   - Table of unpaid bonuses
   - Mark as paid functionality
   - Export to CSV

3. **Mechanic profile changes** (2 hours)
   - Remove specialist tier selection for workshop mechanics
   - Show read-only "Workshop-verified specialist" badge
   - Link to workshop's specialist policy

4. **Customer-facing transparency** (2 hours)
   - Update mechanic cards to show workshop name
   - Add "Verified by [Workshop]" badge
   - Explain premium in booking summary

---

### Phase 4: Admin Vetting Enhancements (Week 5) - 6 hours

**Priority:** Strengthen independent mechanic specialist approval

1. **Enhanced admin UI** (3 hours)
   - Specialist verification checklist
   - View uploaded certifications
   - Require all checks before approval

2. **Specialist re-verification system** (2 hours)
   - Email alerts for expiring specialist status
   - Re-certification workflow
   - Automatic suspension on expiry

3. **Reporting dashboard** (1 hour)
   - Total specialists by type
   - Pending verifications
   - Expiring credentials

---

## BUSINESS RULES DOCUMENTATION

### Rule 1: Specialist Designation Authority

| Mechanic Type | Who Can Designate as Specialist? | Approval Process |
|---------------|----------------------------------|------------------|
| Virtual Only | Self-designated | Admin approval required |
| Independent Workshop | Self-designated | Admin approval required |
| Workshop Employee | **Workshop owner only** | Internal workshop decision |

### Rule 2: Specialist Premium Distribution

| Mechanic Type | Premium Recipient | Transparency |
|---------------|-------------------|--------------|
| Virtual Only | Mechanic (included in 70% split) | Simple: customer pays mechanic |
| Independent Workshop | Mechanic (as workshop owner) | Simple: mechanic owns business |
| Workshop Employee | Workshop → mechanic bonus | **Complex: needs ledger tracking** |

### Rule 3: Hourly Rate Authority

| Mechanic Type | Can Set Hourly Rate? | Rate Usage |
|---------------|---------------------|------------|
| Virtual Only | ❌ No | N/A (no physical work) |
| Independent Workshop | ✅ Yes | Used for physical repair quotes |
| Workshop Employee | ❌ No | Workshop sets all rates |

---

## SUCCESS METRICS

### Phase 2 (Hourly Rate) - Week 2

| Metric | Target | Measurement |
|--------|--------|-------------|
| Virtual mechanics see hourly rate field | 0% | Database query |
| Workshop employees see hourly rate field | 0% | Database query |
| Independent mechanics can edit hourly rate | 100% | Test accounts |
| Customer confusion support tickets | -50% | Support dashboard |

### Phase 3 (Workshop Specialists) - Week 4

| Metric | Target | Measurement |
|--------|--------|-------------|
| Workshop specialists have credentials | 100% | Database query |
| Customers see workshop verification badge | 100% | UI audit |
| Workshop owners track unpaid bonuses | 100% | Feature usage analytics |
| Fair compensation disputes | 0 | Support tickets |

### Phase 4 (Admin Vetting) - Week 5

| Metric | Target | Measurement |
|--------|--------|-------------|
| Independent specialists with admin approval | 100% | Database query |
| Specialist applications pending >7 days | <5 | Admin dashboard |
| Specialist credential expirations | 0 expired | Automated alerts |

---

## RISK MITIGATION

### Risk 1: Workshop Doesn't Pay Specialist Bonus

**Mitigation:**
1. **Contractual:** Workshop agreement includes specialist bonus clause
2. **Transparency:** Mechanic sees unpaid bonuses in their dashboard
3. **Escalation:** Mechanic can file complaint, platform investigates
4. **Enforcement:** Workshop suspended from platform if non-compliant

**Implementation:**
```tsx
// Mechanic sees this in their dashboard
<div className="unpaid-specialist-bonuses">
  ⚠️ You have $75 in unpaid specialist bonuses from Toronto Auto Experts
  <button>Request Payment</button>
  <button>File Complaint</button>
</div>
```

### Risk 2: Workshop Claims Non-Specialists are Specialists

**Mitigation:**
1. **Verification Required:** Workshop must upload certification docs
2. **2-Year Expiry:** Credentials must be renewed
3. **Customer Reviews:** Track specialist session quality
4. **Random Audits:** Platform reviews specialist credentials quarterly
5. **Penalties:** Workshop loses specialist designation privileges if fraud detected

### Risk 3: Independent Mechanic Falsely Claims Specialist

**Mitigation:**
1. **Admin Approval:** All specialist claims reviewed before approval
2. **Verification Checklist:** Admin must check certifications
3. **Background Checks:** Verify work history and credentials
4. **Customer Feedback:** Track quality of specialist sessions
5. **Revocation:** Platform can revoke specialist status if fraud detected

---

## TESTING SCENARIOS

### Test 1: Workshop Designates Specialist

```
1. Login as workshop owner (Toronto Auto Experts)
2. Navigate to /workshop/specialists/manage
3. Click "Designate as Specialist" on David Smith
4. Select brands: BMW, Mercedes-Benz
5. Set bonus: 20% of specialist premium
6. Upload David's BMW certification
7. Save

Expected Result:
✅ workshop_specialist_credentials record created
✅ David now shows as "BMW Specialist" in marketplace
✅ Only David appears when customers search for BMW specialist from Toronto Auto Experts
✅ Other workshop mechanics do NOT appear for BMW specialist requests
```

### Test 2: Specialist Session Payment Flow

```
1. Customer books BMW specialist session with David ($74.99 total)
2. Session completes successfully
3. Workshop receives $74.99 from Stripe
4. System creates specialist_earnings_ledger entry:
   - session_base_price: $49.99
   - specialist_premium: $25.00
   - mechanic_bonus_amount: $5.00 (20% of $25)
   - mechanic_paid_at: NULL

Expected Result:
✅ Workshop dashboard shows $5.00 unpaid to David
✅ David's dashboard shows $5.00 pending payment
✅ Workshop owner clicks "Mark as Paid"
✅ mechanic_paid_at updated to NOW()
✅ Both dashboards updated
```

### Test 3: Virtual Mechanic Cannot Set Hourly Rate

```
1. Login as virtual-only mechanic
2. Navigate to /mechanic/profile
3. Go to Basic Info tab

Expected Result:
✅ Hourly rate field NOT shown
✅ Info box shown: "You earn 70% of session price"
✅ Try to PATCH hourly_rate via API
✅ API returns 403 Forbidden
```

### Test 4: Workshop Employee Cannot Self-Designate Specialist

```
1. Login as workshop employee (David)
2. Navigate to /mechanic/profile
3. Go to Specializations tab

Expected Result:
✅ Specialist tier buttons are disabled (except General)
✅ Tooltip: "Your workshop owner manages specialist designations"
✅ If David is designated by workshop, shows read-only badge:
   "✓ Workshop-Verified BMW Specialist"
```

---

## APPENDIX A: SQL Queries

### Query 1: Find workshops with unpaid specialist bonuses

```sql
SELECT
  o.name as workshop_name,
  COUNT(sel.id) as unpaid_sessions,
  SUM(sel.mechanic_bonus_amount) as total_unpaid
FROM specialist_earnings_ledger sel
JOIN organizations o ON sel.workshop_id = o.id
WHERE sel.mechanic_paid_at IS NULL
GROUP BY o.id, o.name
ORDER BY total_unpaid DESC;
```

### Query 2: Find mechanics with expiring specialist credentials

```sql
SELECT
  m.name as mechanic_name,
  m.email,
  o.name as workshop_name,
  wsc.brand_specializations,
  wsc.expires_at,
  (wsc.expires_at - NOW()) as days_until_expiry
FROM workshop_specialist_credentials wsc
JOIN mechanics m ON wsc.mechanic_id = m.id
LEFT JOIN organizations o ON wsc.workshop_id = o.id
WHERE wsc.active = true
  AND wsc.expires_at < (NOW() + INTERVAL '30 days')
ORDER BY wsc.expires_at ASC;
```

### Query 3: Audit specialist premium earnings by mechanic

```sql
SELECT
  m.name as mechanic_name,
  COUNT(sel.id) as specialist_sessions,
  SUM(sel.specialist_premium) as total_premiums_earned,
  SUM(sel.mechanic_bonus_amount) as total_bonuses_owed,
  SUM(CASE WHEN sel.mechanic_paid_at IS NOT NULL THEN sel.mechanic_bonus_amount ELSE 0 END) as total_paid,
  SUM(CASE WHEN sel.mechanic_paid_at IS NULL THEN sel.mechanic_bonus_amount ELSE 0 END) as total_unpaid
FROM specialist_earnings_ledger sel
JOIN mechanics m ON sel.mechanic_id = m.id
GROUP BY m.id, m.name
ORDER BY total_unpaid DESC;
```

---

## FINAL RECOMMENDATIONS

### For Question 1: Workshop Specialists

**✅ IMPLEMENT:** Workshop-level specialist credential system

**Benefits:**
- ✅ Fair to workshops: They control who is designated as specialist
- ✅ Fair to mechanics: Transparent bonus tracking, enforceable payment
- ✅ Fair to customers: Know specialist is verified by workshop
- ✅ Platform integrity: Audit trail for all specialist designations
- ✅ Scalable: Works for any size workshop (1-100 mechanics)

**Key Feature:** `specialist_earnings_ledger` creates paper trail ensuring workshop pays promised bonuses

---

### For Question 2: Hourly Rate Visibility

**✅ IMPLEMENT:** Context-aware field visibility

**Rules:**
- Virtual mechanics: ❌ Hide hourly rate (show session earning %)
- Workshop employees: ❌ Hide hourly rate (show "Rates set by workshop")
- Independent mechanics: ✅ Show hourly rate (needed for quotes)

**Benefits:**
- ✅ Reduces confusion for mechanics
- ✅ Prevents invalid data entry
- ✅ Clearer customer expectations
- ✅ Aligns UI with business model

---

## DEPLOYMENT RECOMMENDATION

**Priority Order:**
1. **Phase 1 (Week 1):** Profile completion fixes - CRITICAL
2. **Phase 2 (Week 2):** Hourly rate visibility - HIGH
3. **Phase 3 (Weeks 3-4):** Workshop specialist system - HIGH
4. **Phase 4 (Week 5):** Admin vetting enhancements - MEDIUM

**Total Timeline:** 5 weeks
**Total Effort:** 42 hours

**ROI:**
- Eliminates unfair compensation practices
- Increases workshop trust and retention
- Reduces customer confusion support tickets
- Creates transparent, auditable specialist system

---

**Document Status:** ✅ COMPLETE - Ready for Executive Review
**Next Steps:** Approve phased implementation plan
**Questions?** Schedule architecture review meeting

---

*End of Strategic Recommendation*
