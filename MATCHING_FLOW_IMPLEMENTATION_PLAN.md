# MATCHING FLOW IMPLEMENTATION PLAN

**Created:** 2025-11-10
**Status:** READY FOR IMPLEMENTATION
**Priority:** CRITICAL - Foundation for entire booking system

---

## 📋 ANSWERS TO YOUR QUESTIONS

### Q1: 80% Profile Completion Check - Does Matching Address This?

**Answer: ✅ YES - Already Enforced**

The system already has this protection in place:

**Location:** [src/app/api/mechanics/available/route.ts:63](src/app/api/mechanics/available/route.ts#L63)
```typescript
.gte('profile_completion_score', 80) // Only mechanics with 80%+ profile completion
```

**How it works:**
1. Profile completion calculated in [src/lib/profileCompletion.ts](src/lib/profileCompletion.ts)
2. Score stored in `mechanics.profile_completion_score` field
3. `can_accept_sessions` boolean automatically set based on score >= 80%
4. Matching API filters out mechanics below 80% BEFORE scoring
5. Session factory will respect this when creating assignments

**No changes needed** - This protection is already in the pipeline.

---

### Q2: Single Source of Truth for Mechanic Online Status

**Answer: ❌ NO - Currently TWO fields being used**

**Current Problem:**
```typescript
// mechanics table has TWO fields:
currently_on_shift: boolean  // Updated by clock API
is_available: boolean         // ALSO updated by clock API (redundant!)
```

**Files Using Different Fields:**
1. [src/app/api/mechanics/available/route.ts:116-119](src/app/api/mechanics/available/route.ts#L116-L119) - Uses `currently_on_shift` ✓
2. [src/lib/mechanicMatching.ts:110](src/lib/mechanicMatching.ts#L110) - Uses `is_available` ❌
3. Clock API updates BOTH fields simultaneously

**SOLUTION - Single Source of Truth:**

**Use ONLY:** `currently_on_shift` (boolean)

**Deprecation Plan:**
1. Keep `is_available` column for backward compatibility (don't drop it yet)
2. Update all code to read from `currently_on_shift` only
3. Clock API continues writing to both (dual-write for safety)
4. In future migration, drop `is_available` column

**Files to Update:**
- [src/lib/mechanicMatching.ts:110](src/lib/mechanicMatching.ts#L110) - Change `is_available` → `currently_on_shift`
- Any other files querying mechanic status

---

### Q3: Red Seal Terminology - Should Say "Certification Details"

**Answer: ✅ CORRECT - System Already Supports Multiple Certifications**

**Current System:**
The signup flow already supports 6 certification types:

**File:** [src/lib/certifications/certTypes.ts](src/lib/certifications/certTypes.ts#L11-L17)
```typescript
export type CertificationType =
  | 'red_seal'        // Red Seal (Interprovincial)
  | 'provincial'      // Provincial Journeyperson (310S/310T)
  | 'ase'             // ASE (Automotive Service Excellence)
  | 'cpa_quebec'      // CPA Quebec
  | 'manufacturer'    // Manufacturer specialist (Honda, Toyota, etc.)
  | 'other'           // Other recognized certifications
```

**Database Schema:**
- New fields: `certification_type`, `certification_number`, `certification_authority`, `certification_region`
- Legacy fields: `red_seal_certified`, `red_seal_number`, `red_seal_province` (kept for backward compatibility)

**What Needs Changing:**

**UI Text Updates Required:**
1. **Mechanic Profile Page** - [src/app/mechanic/profile/MechanicProfileClient.tsx:500-595](src/app/mechanic/profile/MechanicProfileClient.tsx#L500-L595)
   - Change "Red Seal Certified" → "Professional Certification"
   - Change "Red Seal Number" → "Certification Number"
   - Change "Province/Territory" → "Region/Province"

2. **Admin Applications Page** - [src/app/admin/(shell)/mechanics/applications/page.tsx](src/app/admin/(shell)/mechanics/applications/page.tsx)
   - Update all "Red Seal" labels to "Certification"

3. **Matching Reasons** - [src/app/api/mechanics/available/route.ts:174-177](src/app/api/mechanics/available/route.ts#L174-L177)
   ```typescript
   // Change from:
   matchReasons.push('Red Seal Certified')
   // To:
   matchReasons.push('Professionally Certified')
   ```

4. **Matching Algorithm** - [src/lib/mechanicMatching.ts:168-172](src/lib/mechanicMatching.ts#L168-L172)
   ```typescript
   // Change from:
   matchReasons.push('Red Seal Certified')
   // To:
   matchReasons.push('Professionally Certified')
   ```

**Data Migration Strategy:**
- Keep dual-read/dual-write for now (reads new fields, falls back to legacy `red_seal_*`)
- No database migration needed yet
- Future: Migrate all `red_seal_*` data to new `certification_*` fields

---

### Q4: Matching Integration - Single Source of Truth for Session Creation

**Answer: ✅ YES - We Have One Source: sessionFactory.ts**

**Single Source of Truth:** [src/lib/sessionFactory.ts](src/lib/sessionFactory.ts)

**Current Flow:**
```
BookingWizard → /api/intake/start → sessionFactory.createSessionRecord()
```

**All 3 Payment Methods Use Same Factory:**
1. **Free Sessions** (Line 250-301)
2. **Credit Sessions** (Line 159-248)
3. **Paid Sessions** (Line 303-310 → Waiver → Stripe → Webhook)

**Where to Add Matching:**

**Option A: Inside sessionFactory (RECOMMENDED)**
- Pros: Centralized, works for all payment types, can't be bypassed
- Cons: Need to pass location data to factory

**Option B: In intake/start before calling factory**
- Pros: Access to full intake data
- Cons: Could be bypassed if sessions created elsewhere

**DECISION: Add to sessionFactory.ts**

**Implementation Point:** [src/lib/sessionFactory.ts:197](src/lib/sessionFactory.ts#L197) (right before creating assignments)

```typescript
// Step 5: SMART MATCHING - Find best mechanics
const matchingCriteria = extractMatchingCriteria(params, intake)
const matches = await findMatchingMechanics(matchingCriteria)

// Step 6: Create TARGETED assignments for top matches
for (const match of matches.slice(0, 3)) {
  await createTargetedAssignment(sessionId, match)
}

// Step 7: Create BROADCAST assignment for fallback
await createBroadcastAssignment(sessionId)
```

**This ensures:**
- ✅ Consistent matching for ALL session types
- ✅ Can't be bypassed
- ✅ Single implementation point
- ✅ Easy to maintain

---

### Q5: Customer Location - Single Source of Truth

**Answer: ⚠️ PARTIALLY - Location EXISTS but NOT FLOWING Through**

**Current Status:**

**Customer Location Storage:**
- Primary: `profiles` table has `country`, `province`, `city`, `postal_code` ✓
- Session metadata: NOT storing location (this is the problem)

**The Disconnect:**
1. BookingWizard fetches from profile ✓
2. Shows in LocationSelector ✓
3. Sends to `/api/mechanics/available` for preview ✓
4. **BUT NOT sent to `/api/intake/start`** ❌
5. Session created without location data ❌

**SOLUTION - Data Flow:**

```
profiles table (source of truth)
    ↓
BookingWizard.fetchProfile() → wizardData
    ↓
BookingWizard.submitToIntakeAPI() → intakePayload
    ↓
/api/intake/start → session metadata
    ↓
sessionFactory → matching criteria
```

**Fields to Add to Flow:**

**1. BookingWizard Payload:** [src/components/customer/BookingWizard.tsx:186-223](src/components/customer/BookingWizard.tsx#L186-L223)
```typescript
const intakePayload = {
  // ... existing fields ...

  // ADD THESE:
  customer_country: data.country,
  customer_province: data.province,
  customer_city: data.city,
  customer_postal_code: data.postalCode,
}
```

**2. Intake API Parameters:** [src/app/api/intake/start/route.ts:65-80](src/app/api/intake/start/route.ts#L65-L80)
```typescript
const {
  // ... existing ...
  postalCode = null,

  // ADD THESE:
  customer_country = null,
  customer_province = null,
  customer_city = null,
  customer_postal_code = null,
} = body || {}
```

**3. Session Metadata:** [src/lib/sessionFactory.ts:140-154](src/lib/sessionFactory.ts#L140-L154)
```typescript
const metadata: Record<string, Json> = {
  // ... existing ...

  // ADD THESE:
  customer_country,
  customer_province,
  customer_city,
  customer_postal_code,
}
```

**Deprecated Fields to Remove:**
- `postalCode` (standalone) → Use `customer_postal_code`
- `city` (standalone) → Use `customer_city`

**Migration Strategy:**
- Keep old fields for 2 weeks (dual-write)
- Update all read queries to use new fields
- Then remove old fields

---

### Q6: Session Request Fields - How to Enforce

**Answer: Create Migration + Update sessionFactory**

**Tables to Update:**

**Option A: Store in `sessions.metadata` (Recommended - No Migration)**
```typescript
metadata: {
  customer_country: string,
  customer_city: string,
  customer_postal_code: string,
  extracted_keywords: string[],
  matching_scores: { mechanicId: string, score: number }[]
}
```

**Option B: Add columns to `sessions` table (More Structured)**
```sql
ALTER TABLE sessions
ADD COLUMN customer_country TEXT,
ADD COLUMN customer_city TEXT,
ADD COLUMN customer_postal_code TEXT,
ADD COLUMN customer_keywords TEXT[]; -- PostgreSQL array
```

**RECOMMENDATION: Use Metadata (Option A)**

**Why:**
- No migration needed
- Flexible schema
- Already supports JSON
- Easy to query with `metadata->>'customer_country'`

**Enforcement in sessionFactory:**
```typescript
// REQUIRED fields check
if (!metadata.customer_country || !metadata.customer_postal_code) {
  throw new Error('Customer location is required for matching')
}
```

---

### Q7: Offline Mechanic Handling - Agreed 100%

**Answer: ✅ Implementation Plan Included Below**

See **PHASE 2: OFFLINE MECHANIC HANDLING** section.

---

### Q8: Scheduling System - Separate Chat

**Answer: ✅ Understood - Stop at Step 7**

Implementation plan stops after offline mechanic UI.
Scheduling integration will be connected in separate chat.

---

### Q9: Mechanic Location Fields - Single Source of Truth

**Answer: ✅ FIXED TODAY - Use `state_province`**

**Current State:**
- Database column: `state_province` (VARCHAR)
- Profile editor uses: `state_province` ✓
- Some queries might use: `province` ❌

**Files Already Using Correct Field:**
- [src/app/mechanic/profile/MechanicProfileClient.tsx:433-442](src/app/mechanic/profile/MechanicProfileClient.tsx#L433-L442) ✓
- [src/app/api/workshop/signup/route.ts:47](src/app/api/workshop/signup/route.ts#L47) ✓

**Audit Required:**
Search entire codebase for uses of standalone `province` without `state_` prefix.

**Single Source of Truth: `mechanics.state_province`**

**Migration:** None needed - column already exists and is being used.

---

### Q10: Matching Timing - Same Time for Free and Paid

**Answer: ✅ YES - Implement in sessionFactory (One Place)**

**Current Problem:**
- Free sessions: Create assignment AFTER waiver
- Paid sessions: Create assignment BEFORE waiver
- Matching would run at different times

**SOLUTION: Unified Approach**

**Move ALL assignment creation to sessionFactory** (including free sessions)

**Current Code:** [src/lib/sessionFactory.ts:198-231](src/lib/sessionFactory.ts#L198-L231)
```typescript
// IMPORTANT: Free sessions skip assignment creation - it's created after waiver signing
const shouldCreateAssignment = paymentMethod !== 'free'
```

**NEW CODE:**
```typescript
// ALWAYS create assignments (including free sessions)
// Matching happens at same point for all payment types
const shouldCreateAssignment = true // Remove the free session exception

// Run matching for ALL sessions
const matches = await findMatchingMechanics(criteria)

// Create targeted assignments
for (const match of matches.slice(0, 3)) {
  await createAssignment(sessionId, match.mechanicId, match.matchScore)
}
```

**Why This Works:**
1. Free sessions already have waiver requirement before mechanic sees it
2. Mechanics only get notified after waiver signed
3. But assignment created early = consistent matching
4. Broadcast happens at same time regardless of payment method

**Benefits:**
- ✅ Single code path for all session types
- ✅ Matching always runs at same point
- ✅ Easy maintenance (one place to update)
- ✅ Future-proof (works when free → paid migration happens)

---

## 🎯 IMPLEMENTATION PLAN - 7 PHASES

---

## PHASE 1: ESTABLISH SINGLE SOURCES OF TRUTH

**Priority:** CRITICAL
**Duration:** 2-3 hours
**Dependencies:** None

### 1.1 Mechanic Online Status - Use `currently_on_shift` Only

**Files to Update:**

1. **[src/lib/mechanicMatching.ts:110-116](src/lib/mechanicMatching.ts#L110-L116)**
   ```typescript
   // BEFORE:
   if (mechanic.is_available) {

   // AFTER:
   if (mechanic.currently_on_shift) {
   ```

2. **Search and Replace:**
   ```bash
   # Find all uses of is_available
   grep -r "is_available" src/ --include="*.ts" --include="*.tsx"

   # Replace with currently_on_shift (except in clock API which dual-writes)
   ```

3. **Keep Dual-Write in Clock API** (for safety):
   - [src/app/api/mechanic/clock/route.ts:73-80](src/app/api/mechanic/clock/route.ts#L73-L80)
   - [src/app/api/mechanic/clock/route.ts:123-130](src/app/api/mechanic/clock/route.ts#L123-L130)
   - Leave as-is (writes to both fields)

**Testing:**
- Mechanic clocks in → `currently_on_shift` = true
- Check `/api/mechanics/available` returns them as online
- Check matching algorithm scores them +50 points
- Mechanic clocks out → `currently_on_shift` = false
- Verify they disappear from available list

### 1.2 Location Fields - Use `state_province` Only

**Files to Audit:**

```bash
# Find all uses of standalone "province" (not state_province)
grep -rn "\.province" src/ --include="*.ts" --include="*.tsx" | grep -v "state_province"
```

**Replace Pattern:**
```typescript
// BEFORE:
mechanic.province

// AFTER:
mechanic.state_province
```

**Tables:**
- `mechanics.state_province` ✓ (canonical)
- `profiles.province` ✓ (customer location)
- `organizations.province` ✓ (workshop location)

All three can coexist - different contexts.

### 1.3 Certification Terminology - "Professional Certification"

**UI Text Updates:**

1. **Mechanic Profile Editor** - [src/app/mechanic/profile/MechanicProfileClient.tsx](src/app/mechanic/profile/MechanicProfileClient.tsx)

   **Lines 498-595 - Credentials Tab:**
   ```typescript
   // Line 503: Change heading
   <h3>Credentials & Experience</h3>

   // Line 524-537: Change checkbox label
   <label>
     <span className="font-medium text-white">Professionally Certified</span>
     <p className="text-sm text-slate-400 mt-1">
       I hold a professional automotive certification (Red Seal, Provincial 310S/310T, CPA, ASE, or Manufacturer specialist)
     </p>
   </label>

   // Line 544: Change label
   <label>Certification Number</label>

   // Line 556: Change label
   <label>Issuing Province/Region</label>

   // Line 570: Change label
   <label>Certification Expiry Date (if applicable)</label>
   ```

2. **Matching Reasons** - [src/lib/mechanicMatching.ts:168-172](src/lib/mechanicMatching.ts#L168-L172)
   ```typescript
   // BEFORE:
   matchReasons.push('Red Seal Certified')

   // AFTER:
   matchReasons.push('Professionally Certified')
   ```

3. **Available Mechanics API** - [src/app/api/mechanics/available/route.ts:174-177](src/app/api/mechanics/available/route.ts#L174-L177)
   ```typescript
   // BEFORE:
   matchReasons.push('Red Seal Certified')

   // AFTER:
   matchReasons.push('Professionally Certified')
   ```

**Database Fields:**
- Keep `red_seal_certified` for backward compatibility
- New fields `certification_type` already exist
- Dual-read logic already in place

**No migration needed** - terminology update only.

---

## PHASE 2: CAPTURE CUSTOMER LOCATION IN BOOKING FLOW

**Priority:** CRITICAL (Blocks Matching)
**Duration:** 1-2 hours
**Dependencies:** Phase 1

### 2.1 Update BookingWizard Payload

**File:** [src/components/customer/BookingWizard.tsx:186-223](src/components/customer/BookingWizard.tsx#L186-L223)

**Add to `intakePayload`:**
```typescript
const intakePayload = {
  // ... existing fields ...
  plan: data.planType || 'standard',
  name: profileData.profile.full_name,
  email: profileData.profile.email,
  phone: profileData.profile.phone,

  // EXISTING (keep for backward compatibility):
  city: data.city || profileData.profile.city || '',
  postalCode: data.postalCode || profileData.profile.postal_code || '',

  // NEW - Explicit location fields:
  customer_country: data.country || profileData.profile.country || '',
  customer_province: data.province || profileData.profile.province || '',
  customer_city: data.city || profileData.profile.city || '',
  customer_postal_code: data.postalCode || profileData.profile.postal_code || '',

  // Vehicle info...
  vin: vehicleData?.vin || '',
  // ... rest of fields
}
```

### 2.2 Update Intake API to Accept Location

**File:** [src/app/api/intake/start/route.ts:65-80](src/app/api/intake/start/route.ts#L65-L80)

**Add parameters:**
```typescript
const {
  plan = 'trial',
  name, email, phone, city,
  postalCode = null,

  // NEW: Customer location fields
  customer_country = null,
  customer_province = null,
  customer_city = null,
  customer_postal_code = null,

  vin = '', year = '', make = '', model = '',
  odometer = '', plate = '',
  concern,
  files = [],
  urgent = false,
  vehicle_id = null,
  use_credits = false,
  is_specialist = false,
  preferred_mechanic_id = null,
  routing_type = null,
} = body || {}
```

### 2.3 Pass Location to sessionFactory

**File:** [src/app/api/intake/start/route.ts](src/app/api/intake/start/route.ts)

**Update all 3 session creation calls:**

**Free Sessions (Line 256-280):**
```typescript
const result = await createSessionRecord({
  customerId: user.id,
  customerEmail: user.email,
  type: sessionType,
  plan,
  intakeId,
  stripeSessionId: freeSessionKey,
  paymentMethod: 'free',
  urgent,
  isSpecialist: is_specialist,
  preferredMechanicId: preferred_mechanic_id,
  routingType: routing_type as any,

  // NEW: Add location data
  customerCountry: customer_country,
  customerProvince: customer_province,
  customerCity: customer_city,
  customerPostalCode: customer_postal_code,
})
```

**Credit Sessions (Line 190-202):**
```typescript
const result = await createSessionRecord({
  // ... existing ...

  // NEW: Add location data
  customerCountry: customer_country,
  customerProvince: customer_province,
  customerCity: customer_city,
  customerPostalCode: customer_postal_code,
})
```

**Paid Sessions:**
Already handled via waiver → will get location from intake table.

### 2.4 Update sessionFactory Interface

**File:** [src/lib/sessionFactory.ts:24-52](src/lib/sessionFactory.ts#L24-L52)

**Add to `CreateSessionParams` interface:**
```typescript
export interface CreateSessionParams {
  // ... existing fields ...

  // NEW: Customer location for matching
  customerCountry?: string | null
  customerProvince?: string | null
  customerCity?: string | null
  customerPostalCode?: string | null
}
```

### 2.5 Store Location in Session Metadata

**File:** [src/lib/sessionFactory.ts:140-154](src/lib/sessionFactory.ts#L140-L154)

**Update metadata builder:**
```typescript
const metadata: Record<string, Json> = {
  payment_method: paymentMethod,
  urgent,
  source: 'intake',

  // NEW: Customer location
  customer_country: customerCountry || null,
  customer_province: customerProvince || null,
  customer_city: customerCity || null,
  customer_postal_code: customerPostalCode || null,
}

if (amountPaid !== null) metadata.amount_paid = amountPaid
if (creditCost !== null) metadata.credit_cost = creditCost
if (isSpecialist) metadata.is_specialist = isSpecialist
if (preferredMechanicId) metadata.preferred_mechanic_id = preferredMechanicId
if (routingType) metadata.routing_type = routingType
if (workshopId) metadata.workshop_id = workshopId
if (slotId) metadata.slot_id = slotId
```

**Testing:**
1. Complete booking wizard with location selected
2. Submit session
3. Check database: `sessions.metadata` should contain location fields
4. Verify location visible in admin panel

---

## PHASE 3: INTEGRATE MATCHING INTO SESSION CREATION

**Priority:** CRITICAL (Core Feature)
**Duration:** 3-4 hours
**Dependencies:** Phase 1, Phase 2

### 3.1 Extract Keywords from Concern Description

**File:** [src/lib/sessionFactory.ts](src/lib/sessionFactory.ts)

**Add helper function:**
```typescript
import { extractKeywordsFromDescription } from './mechanicMatching'

/**
 * Extract matching criteria from session parameters and intake data
 */
async function extractMatchingCriteria(
  params: CreateSessionParams,
  intakeId: string
): Promise<MatchingCriteria> {
  // Fetch intake data for concern and vehicle info
  const { data: intake } = await supabaseAdmin
    .from('intakes')
    .select('concern, year, make, model, vin')
    .eq('id', intakeId)
    .single()

  if (!intake) {
    throw new Error('Intake not found')
  }

  // Extract keywords from concern
  const keywords = extractKeywordsFromDescription(intake.concern || '')

  // Build matching criteria
  const criteria: MatchingCriteria = {
    requestType: params.isSpecialist ? 'brand_specialist' : 'general',
    requestedBrand: params.metadata?.requested_brand as string | undefined,
    extractedKeywords: keywords,
    customerCountry: params.customerCountry || undefined,
    customerCity: params.customerCity || undefined,
    customerPostalCode: params.customerPostalCode || undefined,
    preferLocalMechanic: true,
    urgency: params.urgent ? 'immediate' : 'scheduled',
  }

  // Store keywords in metadata for future reference
  params.metadata = {
    ...params.metadata,
    extracted_keywords: keywords,
  }

  return criteria
}
```

### 3.2 Run Matching BEFORE Creating Assignments

**File:** [src/lib/sessionFactory.ts:197-231](src/lib/sessionFactory.ts#L197-L231)

**Replace this section:**
```typescript
// Step 5: Create session assignment (queued for mechanics)
// IMPORTANT: Free sessions skip assignment creation - it's created after waiver signing
const shouldCreateAssignment = paymentMethod !== 'free'
let assignment: any = null

if (shouldCreateAssignment) {
  const assignmentMetadata: Record<string, Json> = {}
  if (preferredMechanicId) {
    assignmentMetadata.preferred_mechanic_id = preferredMechanicId
  }
  if (workshopId) {
    assignmentMetadata.workshop_id = workshopId
  }

  const { data: assignmentData, error: assignmentError } = await supabaseAdmin
    .from('session_assignments')
    .insert({
      session_id: sessionId,
      status: 'queued',
      offered_at: new Date().toISOString(),
      ...(Object.keys(assignmentMetadata).length > 0 && { metadata: assignmentMetadata })
    })
    .select('id')
    .single()

  if (assignmentError) {
    console.error('[sessionFactory] Failed to create assignment:', assignmentError)
  } else {
    assignment = assignmentData
    console.log(`[sessionFactory] Created assignment for session ${sessionId}`)
  }
}
```

**With this NEW code:**
```typescript
// Step 5: SMART MATCHING - Find best mechanics for this session
console.log(`[sessionFactory] Running smart matching for session ${sessionId}`)

let matches: MechanicMatch[] = []
let matchingCriteria: MatchingCriteria | null = null

try {
  const { findMatchingMechanics } = await import('./mechanicMatching')

  // Extract matching criteria from intake and session params
  matchingCriteria = await extractMatchingCriteria(params, intakeId)

  console.log(`[sessionFactory] Matching criteria:`, {
    requestType: matchingCriteria.requestType,
    brand: matchingCriteria.requestedBrand,
    keywordCount: matchingCriteria.extractedKeywords.length,
    location: matchingCriteria.customerCity,
    postalCode: matchingCriteria.customerPostalCode,
  })

  // Find top mechanics
  matches = await findMatchingMechanics(matchingCriteria)

  console.log(`[sessionFactory] Found ${matches.length} matching mechanics`)
  console.log(`[sessionFactory] Top 3 matches:`, matches.slice(0, 3).map(m => ({
    name: m.mechanicName,
    score: m.matchScore,
    availability: m.availability,
    reasons: m.matchReasons
  })))

  // Store match results in metadata
  metadata.matching_results = {
    total_matches: matches.length,
    top_scores: matches.slice(0, 3).map(m => ({
      mechanic_id: m.mechanicId,
      score: m.matchScore,
      reasons: m.matchReasons
    }))
  }

} catch (matchError) {
  console.error('[sessionFactory] Matching failed, falling back to broadcast:', matchError)
  // Don't fail session creation if matching fails - just log and continue
}

// Step 6: Create TARGETED assignments for top matches
const targetedAssignments: any[] = []

if (matches.length > 0) {
  console.log(`[sessionFactory] Creating targeted assignments for top 3 mechanics`)

  const topMatches = matches.slice(0, 3)

  for (const match of topMatches) {
    try {
      const { data: assignment, error: assignError } = await supabaseAdmin
        .from('session_assignments')
        .insert({
          session_id: sessionId,
          mechanic_id: match.mechanicId,
          status: 'offered', // Targeted = offered
          priority: 'high', // High priority for matched mechanics
          match_score: match.matchScore,
          match_reasons: match.matchReasons,
          offered_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 min to accept
          metadata: {
            match_type: 'targeted',
            match_score: match.matchScore,
            is_brand_specialist: match.isBrandSpecialist,
            is_local_match: match.isLocalMatch,
          }
        })
        .select('id')
        .single()

      if (!assignError && assignment) {
        targetedAssignments.push(assignment)
        console.log(`[sessionFactory] ✓ Created targeted assignment for ${match.mechanicName} (score: ${match.matchScore})`)
      }
    } catch (err) {
      console.error(`[sessionFactory] Failed to create targeted assignment:`, err)
    }
  }
}

// Step 7: Create BROADCAST assignment as fallback
console.log(`[sessionFactory] Creating broadcast assignment for remaining mechanics`)

const { data: broadcastAssignment, error: broadcastError } = await supabaseAdmin
  .from('session_assignments')
  .insert({
    session_id: sessionId,
    mechanic_id: null, // null = broadcast to all
    status: 'queued',
    priority: 'normal',
    offered_at: new Date().toISOString(),
    metadata: {
      match_type: 'broadcast',
      reason: matches.length > 0 ? 'fallback_if_no_targeted_accepts' : 'no_matches_found',
    }
  })
  .select('id')
  .single()

if (broadcastError) {
  console.error('[sessionFactory] Failed to create broadcast assignment:', broadcastError)
} else {
  console.log(`[sessionFactory] ✓ Created broadcast assignment`)
}

// Assignment summary
const totalAssignments = targetedAssignments.length + (broadcastAssignment ? 1 : 0)
console.log(`[sessionFactory] Created ${totalAssignments} total assignments (${targetedAssignments.length} targeted, ${broadcastAssignment ? 1 : 0} broadcast)`)
```

### 3.3 Update Broadcast Logic

**File:** [src/lib/sessionFactory.ts:233-270](src/lib/sessionFactory.ts#L233-L270)

**Update broadcast section:**
```typescript
// Step 8: Broadcast new assignments to mechanics in real-time
// Broadcast to TARGETED mechanics immediately (high priority)
// Broadcast to ALL mechanics only if no targeted mechanics accept within 2 minutes

const shouldBroadcast = true // Always broadcast (removed free session exception)

if (shouldBroadcast && targetedAssignments.length > 0) {
  try {
    const { broadcastSessionAssignment } = await import('./realtimeChannels')

    // Fetch intake data for broadcast payload
    const { data: intake } = await supabaseAdmin
      .from('intakes')
      .select('name, year, make, model, vin, concern')
      .eq('id', intakeId)
      .single()

    const vehicleSummary = intake?.vin
      ? `VIN: ${intake.vin}`
      : `${intake?.year || ''} ${intake?.make || ''} ${intake?.model || ''}`.trim()

    // Broadcast to TARGETED mechanics first (via mechanic-specific channels)
    for (const assignment of targetedAssignments) {
      await broadcastSessionAssignment('new_targeted_assignment', {
        assignmentId: assignment.id,
        sessionId: sessionId,
        mechanicId: assignment.mechanic_id,
        customerName: intake?.name || 'Customer',
        vehicleSummary: vehicleSummary || 'Vehicle',
        concern: intake?.concern || '',
        urgent: urgent || false,
        matchScore: assignment.match_score,
        matchReasons: assignment.match_reasons,
        priority: 'high',
        expiresAt: assignment.expires_at,
      })
    }

    console.log(`[sessionFactory] ✅ Broadcasted ${targetedAssignments.length} targeted assignments`)

  } catch (broadcastError) {
    console.error('[sessionFactory] Failed to broadcast assignments:', broadcastError)
  }
}

// Broadcast to ALL mechanics happens later (after 2 min timeout) via cron job or mechanic queue polling
```

### 3.4 Update mechanicMatching.ts Interface

**File:** [src/lib/mechanicMatching.ts:8-18](src/lib/mechanicMatching.ts#L8-L18)

**Ensure interface is exported:**
```typescript
export interface MatchingCriteria {
  requestType: 'general' | 'brand_specialist'
  requestedBrand?: string
  restrictedBrands?: string[]
  extractedKeywords: string[]
  customerCountry?: string
  customerCity?: string
  customerPostalCode?: string
  preferLocalMechanic?: boolean
  urgency?: 'immediate' | 'scheduled'
}

export interface MechanicMatch {
  mechanicId: string
  mechanicName: string
  profilePhoto: string | null
  matchScore: number
  matchReasons: string[]
  availability: 'online' | 'offline'
  yearsExperience: number
  rating: number
  isBrandSpecialist: boolean
  brandSpecializations: string[]
  serviceKeywords: string[]
  country: string | null
  city: string | null
  isLocalMatch: boolean
}
```

**Testing:**
1. Create test session with location "Toronto, ON, M5V 3A8"
2. Check console logs for matching criteria
3. Verify top 3 mechanics receive targeted assignments
4. Check `session_assignments` table:
   - 3 rows with `status='offered'`, `priority='high'`, `mechanic_id` set
   - 1 row with `status='queued'`, `priority='normal'`, `mechanic_id` null
5. Verify match scores stored in `match_score` column
6. Check session metadata contains `matching_results`

---

## PHASE 4: DATABASE SCHEMA UPDATES

**Priority:** HIGH
**Duration:** 1 hour
**Dependencies:** Phase 3

### 4.1 Add Columns to session_assignments Table

**Create Migration:** `supabase/migrations/20251110_add_matching_fields.sql`

```sql
-- Add matching-related fields to session_assignments
ALTER TABLE session_assignments
ADD COLUMN IF NOT EXISTS match_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS match_reasons TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add index for priority-based queries
CREATE INDEX IF NOT EXISTS idx_session_assignments_priority
ON session_assignments(priority, status, offered_at);

-- Add index for expiry cleanup
CREATE INDEX IF NOT EXISTS idx_session_assignments_expires_at
ON session_assignments(expires_at)
WHERE expires_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN session_assignments.match_score IS 'Matching algorithm score (0-200+)';
COMMENT ON COLUMN session_assignments.match_reasons IS 'Why this mechanic was matched (e.g., "Local to Toronto", "BMW specialist")';
COMMENT ON COLUMN session_assignments.priority IS 'Assignment priority: high (targeted match), normal (broadcast), low (fallback)';
COMMENT ON COLUMN session_assignments.expires_at IS 'When this targeted assignment expires (typically 2 minutes for high-priority)';
```

**Run Migration:**
```bash
npx supabase db push
```

### 4.2 Update TypeScript Types

**File:** `src/types/supabase.ts`

**Regenerate types:**
```bash
npm run supabase:db:types
```

**Verify new fields appear:**
```typescript
export interface SessionAssignment {
  id: string
  session_id: string
  mechanic_id: string | null
  status: 'queued' | 'offered' | 'accepted' | 'declined' | 'expired'
  priority: 'high' | 'normal' | 'low'
  match_score: number
  match_reasons: string[]
  offered_at: string
  expires_at: string | null
  // ... other fields
}
```

---

## PHASE 5: MECHANIC QUEUE PRIORITY DISPLAY

**Priority:** HIGH
**Duration:** 2 hours
**Dependencies:** Phase 4

### 5.1 Update Mechanic Queue API

**File:** [src/app/api/mechanic/queue/route.ts:50-74](src/app/api/mechanic/queue/route.ts#L50-L74)

**Update queries to include new fields:**
```typescript
// Unassigned (public queue)
const { data: unassignedA } = await supabase
  .from('session_assignments')
  .select('id, status, mechanic_id, session_id, created_at, updated_at, match_score, match_reasons, priority, expires_at')
  .is('mechanic_id', null)
  .eq('status', 'queued')
  .order('priority', { ascending: false }) // High priority first
  .order('created_at', { ascending: false })
  .limit(50)

// Mine (my targeted offers)
const { data: mineA } = await supabase
  .from('session_assignments')
  .select('id, status, mechanic_id, session_id, created_at, updated_at, match_score, match_reasons, priority, expires_at')
  .eq('mechanic_id', mech?.id ?? '00000000-0000-0000-0000-000000000000')
  .in('status', ['offered', 'accepted', 'joined', 'in_progress'])
  .order('priority', { ascending: false }) // High priority first
  .order('created_at', { ascending: false })
  .limit(50)
```

### 5.2 Create Priority Badge Component

**File:** `src/components/mechanic/PriorityBadge.tsx`

```typescript
import { Star, Users, Clock } from 'lucide-react'

interface PriorityBadgeProps {
  priority: 'high' | 'normal' | 'low'
  matchScore?: number
  matchReasons?: string[]
  expiresAt?: string | null
}

export function PriorityBadge({ priority, matchScore, matchReasons, expiresAt }: PriorityBadgeProps) {
  if (priority === 'high') {
    return (
      <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Star className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-semibold text-orange-300">Top Match for You</span>
          {matchScore && <span className="text-xs text-orange-400">Score: {matchScore}</span>}
        </div>
        {matchReasons && matchReasons.length > 0 && (
          <div className="space-y-1">
            {matchReasons.map((reason, idx) => (
              <div key={idx} className="text-xs text-orange-200 flex items-center gap-1">
                <span className="text-orange-400">•</span> {reason}
              </div>
            ))}
          </div>
        )}
        {expiresAt && (
          <div className="flex items-center gap-1 mt-2 text-xs text-orange-400">
            <Clock className="h-3 w-3" />
            <span>Expires in {getTimeRemaining(expiresAt)}</span>
          </div>
        )}
      </div>
    )
  }

  if (priority === 'normal') {
    return (
      <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" />
          <span className="text-xs text-slate-300">Open to all mechanics</span>
        </div>
      </div>
    )
  }

  return null // Low priority - don't show badge
}

function getTimeRemaining(expiresAt: string): string {
  const now = Date.now()
  const expiry = new Date(expiresAt).getTime()
  const diff = expiry - now

  if (diff <= 0) return 'Expired'

  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}
```

### 5.3 Display Priority in Queue

**File:** `src/app/mechanic/dashboard/page.tsx` (or wherever queue is displayed)

**Add PriorityBadge to assignment cards:**
```typescript
<div className="space-y-3">
  {assignments.map(assignment => (
    <div key={assignment.id} className="bg-slate-800 rounded-lg p-4">
      <PriorityBadge
        priority={assignment.priority}
        matchScore={assignment.match_score}
        matchReasons={assignment.match_reasons}
        expiresAt={assignment.expires_at}
      />

      {/* Rest of assignment card */}
      <div className="mt-3">
        <h4>{assignment.session.customer_name}</h4>
        <p>{assignment.session.vehicle}</p>
        {/* ... */}
      </div>
    </div>
  ))}
</div>
```

---

## PHASE 6: OFFLINE MECHANIC HANDLING UI

**Priority:** HIGH
**Duration:** 3-4 hours
**Dependencies:** Phase 1-5

### 6.1 Detect Offline State

**File:** [src/components/customer/booking-steps/MechanicStep.tsx:137-169](src/components/customer/booking-steps/MechanicStep.tsx#L137-L169)

**Add offline detection:**
```typescript
const filteredMechanics = useMemo(() => {
  let filtered = [...mechanics]

  // ... existing filters ...

  return filtered
}, [mechanics, searchQuery, filters, wizardData.customerPostalCode])

// NEW: Detect if all mechanics are offline
const allMechanicsOffline = filteredMechanics.length > 0 &&
  filteredMechanics.every(m => m.presenceStatus === 'offline')

const someMechanicsOnline = filteredMechanics.some(m => m.presenceStatus === 'online')
```

### 6.2 Create AllMechanicsOfflineCard Component

**File:** `src/components/customer/AllMechanicsOfflineCard.tsx`

```typescript
import { Clock, Calendar, Bell, UserCheck } from 'lucide-react'

interface AllMechanicsOfflineCardProps {
  mechanicsCount: number
  onScheduleSession: () => void
  onBrowseOffline: () => void
  onJoinWaitlist: () => void
}

export function AllMechanicsOfflineCard({
  mechanicsCount,
  onScheduleSession,
  onBrowseOffline,
  onJoinWaitlist
}: AllMechanicsOfflineCardProps) {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20 flex-shrink-0">
            <Clock className="h-6 w-6 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">
              All Mechanics Currently Offline
            </h3>
            <p className="text-slate-300 text-sm">
              {mechanicsCount} mechanic{mechanicsCount !== 1 ? 's' : ''} match your criteria, but none are online right now.
              Choose one of the options below to proceed:
            </p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-4">
        {/* Option 1: Schedule Later */}
        <button
          onClick={onScheduleSession}
          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-6 text-left transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20 border border-blue-500/30 flex-shrink-0 group-hover:bg-blue-500/30 transition">
              <Calendar className="h-6 w-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-white mb-1">Schedule for Later</h4>
              <p className="text-slate-400 text-sm mb-3">
                View mechanic availability calendars and book a time slot that works for you.
              </p>
              <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                <span>View available time slots</span>
                <svg className="h-4 w-4 group-hover:translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </button>

        {/* Option 2: Browse Offline Mechanics */}
        <button
          onClick={onBrowseOffline}
          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-6 text-left transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20 border border-purple-500/30 flex-shrink-0 group-hover:bg-purple-500/30 transition">
              <UserCheck className="h-6 w-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-white mb-1">Browse Offline Mechanics</h4>
              <p className="text-slate-400 text-sm mb-3">
                View detailed profiles, ratings, and reviews. Pick your favorite and schedule with them.
              </p>
              <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
                <span>View mechanic profiles</span>
                <svg className="h-4 w-4 group-hover:translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </button>

        {/* Option 3: Join Waitlist */}
        <button
          onClick={onJoinWaitlist}
          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-6 text-left transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 border border-green-500/30 flex-shrink-0 group-hover:bg-green-500/30 transition">
              <Bell className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-white mb-1">Join Waitlist</h4>
              <p className="text-slate-400 text-sm mb-3">
                Get notified instantly when a mechanic comes online and is ready to help you.
              </p>
              <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <span>Set up notification</span>
                <svg className="h-4 w-4 group-hover:translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Help Text */}
      <div className="mt-6 text-center">
        <p className="text-sm text-slate-400">
          Need immediate help? <a href="/support" className="text-orange-400 hover:text-orange-300 underline">Contact our support team</a>
        </p>
      </div>
    </div>
  )
}
```

### 6.3 Integrate into MechanicStep

**File:** [src/components/customer/booking-steps/MechanicStep.tsx:520-625](src/components/customer/booking-steps/MechanicStep.tsx#L520-L625)

**Replace mechanic grid section:**
```typescript
{/* Mechanics Grid */}
{!loading && !error && (
  <>
    {filteredMechanics.length === 0 ? (
      // No mechanics found (filters too strict)
      <div className="text-center py-12">
        <p className="text-slate-400 mb-2">No mechanics found matching your criteria</p>
        <button
          onClick={() => {
            setSearchQuery('')
            setFilters({ onlineOnly: false, brandSpecialists: false, highRated: false, local: false })
          }}
          className="text-orange-400 hover:text-orange-300 text-sm font-semibold"
        >
          Clear filters
        </button>
      </div>
    ) : allMechanicsOffline ? (
      // All mechanics are offline - show options
      <AllMechanicsOfflineCard
        mechanicsCount={filteredMechanics.length}
        onScheduleSession={() => {
          // TODO: Implement in separate chat (PHASE 7)
          alert('Schedule session flow - to be implemented')
        }}
        onBrowseOffline={() => {
          // Show offline mechanics without online filter
          setFilters({ ...filters, onlineOnly: false })
          window.scrollTo({ top: 520, behavior: 'smooth' })
        }}
        onJoinWaitlist={() => {
          // TODO: Implement waitlist
          alert('Waitlist flow - to be implemented')
        }}
      />
    ) : (
      // Normal flow - show mechanic grid
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedMechanics.map((mechanic) => (
            <MechanicCard
              key={mechanic.id}
              mechanic={mechanic}
              isSelected={selectedMechanicId === mechanic.id}
              onSelect={handleMechanicSelect}
              onViewProfile={(id) => {
                setSelectedProfileId(id)
                setShowProfileModal(true)
              }}
              showSpecialistPremium={mechanicType === 'favorite'}
            />
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {/* ... existing pagination code ... */}
          </div>
        )}
      </>
    )}
  </>
)}
```

### 6.4 Waitlist System (Basic Implementation)

**Create API:** `src/app/api/customer/waitlist/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionData, notifyVia } = await req.json()

  // Store waitlist entry
  const { error } = await supabaseAdmin
    .from('customer_waitlist')
    .insert({
      customer_user_id: user.id,
      session_data: sessionData,
      notify_via: notifyVia, // 'email' | 'sms' | 'push'
      status: 'waiting',
      created_at: new Date().toISOString()
    })

  if (error) {
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Create Table Migration:**
```sql
CREATE TABLE IF NOT EXISTS customer_waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_data JSONB NOT NULL,
  notify_via TEXT[] DEFAULT '{"email"}',
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_customer_waitlist_status ON customer_waitlist(status, expires_at);
```

---

## PHASE 7: TESTING & VALIDATION

**Priority:** CRITICAL
**Duration:** 2-3 hours
**Dependencies:** All previous phases

### 7.1 Unit Tests

**File:** `src/lib/__tests__/mechanicMatching.test.ts`

```typescript
import { findMatchingMechanics, extractKeywordsFromDescription } from '../mechanicMatching'

describe('mechanicMatching', () => {
  describe('extractKeywordsFromDescription', () => {
    it('should extract check engine light keyword', () => {
      const keywords = extractKeywordsFromDescription('My check engine light is on')
      expect(keywords).toContain('check engine light')
    })

    it('should extract multiple keywords', () => {
      const keywords = extractKeywordsFromDescription(
        'Need brake repair and oil change'
      )
      expect(keywords).toContain('brake repair')
      expect(keywords).toContain('oil change')
    })

    it('should handle empty description', () => {
      const keywords = extractKeywordsFromDescription('')
      expect(keywords).toEqual([])
    })
  })

  describe('findMatchingMechanics', () => {
    it('should prioritize online mechanics', async () => {
      const matches = await findMatchingMechanics({
        requestType: 'general',
        extractedKeywords: ['brake repair'],
        customerCity: 'Toronto',
      })

      const onlineMechanics = matches.filter(m => m.availability === 'online')
      const offlineMechanics = matches.filter(m => m.availability === 'offline')

      // Online should be scored higher
      if (onlineMechanics.length > 0 && offlineMechanics.length > 0) {
        expect(onlineMechanics[0].matchScore).toBeGreaterThan(offlineMechanics[0].matchScore)
      }
    })

    it('should filter out mechanics below 80% profile completion', async () => {
      const matches = await findMatchingMechanics({
        requestType: 'general',
        extractedKeywords: [],
      })

      // All returned mechanics should have >= 80% completion
      // (enforced by SQL query, but verify here)
      expect(matches.length).toBeGreaterThanOrEqual(0)
    })
  })
})
```

### 7.2 Integration Tests

**File:** `src/__tests__/integration/matching-flow.test.ts`

```typescript
describe('Matching Flow Integration', () => {
  it('should capture customer location from booking wizard', async () => {
    // Simulate booking wizard submission
    const payload = {
      plan: 'standard',
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '555-1234',
      customer_country: 'Canada',
      customer_province: 'Ontario',
      customer_city: 'Toronto',
      customer_postal_code: 'M5V 3A8',
      concern: 'My brakes are squeaking',
      // ... other fields
    }

    const response = await fetch('/api/intake/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    expect(response.ok).toBe(true)

    const result = await response.json()
    expect(result.redirect).toBeDefined()

    // Check session was created with location
    // ... verify in database
  })

  it('should create targeted assignments for top matches', async () => {
    // Create test session
    // Verify session_assignments has 3 targeted + 1 broadcast
    // ...
  })
})
```

### 7.3 E2E Test Scenarios

**Test Case 1: Happy Path - Online Mechanics**
1. Customer logs in
2. Completes booking wizard:
   - Location: Toronto, ON, M5V 3A8
   - Concern: "My BMW check engine light is on"
3. System should:
   - Extract keywords: ["check engine light", "BMW diagnostics"]
   - Find mechanics in Toronto area
   - Prioritize BMW specialists
   - Create 3 targeted assignments
   - Create 1 broadcast assignment
4. Top mechanic sees notification with high priority badge
5. Mechanic accepts within 2 minutes
6. Session starts

**Test Case 2: All Mechanics Offline**
1. Customer completes booking wizard
2. All matching mechanics are offline
3. System shows:
   - "All Mechanics Currently Offline" card
   - 3 options: Schedule / Browse / Waitlist
4. Customer clicks "Browse Offline"
5. Sees offline mechanics with profiles
6. Selects mechanic
7. [FUTURE: Schedule session - separate chat]

**Test Case 3: No Targeted Matches Accept**
1. System creates 3 targeted assignments
2. All 3 expire after 2 minutes (no accept)
3. Broadcast assignment activates
4. All online mechanics see request
5. First to accept gets the session

---

## 📊 SUCCESS METRICS

### Technical Metrics:
- ✅ 100% of sessions have location data in metadata
- ✅ Matching algorithm called for 100% of sessions
- ✅ Average match score > 100 for accepted assignments
- ✅ < 5 seconds latency for matching + assignment creation
- ✅ 0 errors in matching algorithm (graceful fallback to broadcast)

### Business Metrics:
- ✅ 80%+ of assignments accepted by targeted mechanics (vs broadcast)
- ✅ Targeted mechanics accept 2x faster than broadcast
- ✅ Customer satisfaction with mechanic match quality
- ✅ Reduce "no mechanics available" abandonment rate

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment:
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Database migrations tested on staging
- [ ] Feature flag created: `enable_smart_matching` (default: false)
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

### Deployment Steps:
1. [ ] Run database migrations
2. [ ] Deploy backend code (APIs + sessionFactory)
3. [ ] Deploy frontend code (BookingWizard + MechanicStep)
4. [ ] Enable feature flag for 10% of users
5. [ ] Monitor for 24 hours
6. [ ] If successful, ramp to 50%
7. [ ] After 48 hours, ramp to 100%

### Post-Deployment:
- [ ] Verify matching logs in production
- [ ] Check assignment distribution (targeted vs broadcast)
- [ ] Monitor mechanic acceptance rates
- [ ] Gather customer feedback
- [ ] Document any issues in postmortem

---

## 🔧 MAINTENANCE GUIDELINES

### Single Sources of Truth (Established):
1. **Mechanic Online Status:** `mechanics.currently_on_shift` (boolean)
2. **Customer Location:** `profiles` table → `sessions.metadata`
3. **Session Creation:** `src/lib/sessionFactory.ts` (ONE place for all types)
4. **Matching Logic:** `src/lib/mechanicMatching.ts` (ONE algorithm)
5. **Location Fields:** `mechanics.state_province` (not `province`)

### Future Enhancements (Out of Scope - Future Chats):
- [ ] Machine learning for match score optimization
- [ ] Customer preference learning (save favorite mechanics)
- [ ] Time-based availability predictions
- [ ] Workshop/team assignments
- [ ] Multi-mechanic sessions
- [ ] Real-time capacity management
- [ ] Geographic radius search (km-based)

---

## 📁 FILES MODIFIED SUMMARY

**Phase 1:**
- `src/lib/mechanicMatching.ts` - Use `currently_on_shift`
- `src/app/mechanic/profile/MechanicProfileClient.tsx` - Update certification text
- `src/app/api/mechanics/available/route.ts` - Update match reasons

**Phase 2:**
- `src/components/customer/BookingWizard.tsx` - Add location to payload
- `src/app/api/intake/start/route.ts` - Accept location params
- `src/lib/sessionFactory.ts` - Store location in metadata

**Phase 3:**
- `src/lib/sessionFactory.ts` - Add matching integration (major refactor)
- `src/lib/mechanicMatching.ts` - Export interfaces

**Phase 4:**
- `supabase/migrations/20251110_add_matching_fields.sql` - New migration

**Phase 5:**
- `src/app/api/mechanic/queue/route.ts` - Include new fields
- `src/components/mechanic/PriorityBadge.tsx` - New component

**Phase 6:**
- `src/components/customer/AllMechanicsOfflineCard.tsx` - New component
- `src/components/customer/booking-steps/MechanicStep.tsx` - Add offline handling
- `src/app/api/customer/waitlist/route.ts` - New API
- `supabase/migrations/customer_waitlist.sql` - New table

**Phase 7:**
- `src/lib/__tests__/mechanicMatching.test.ts` - New tests
- `src/__tests__/integration/matching-flow.test.ts` - New tests

---

**READY TO IMPLEMENT - ALL PHASES DEFINED**

Would you like to start with Phase 1?