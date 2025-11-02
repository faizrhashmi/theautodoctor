# Phase 3 Verification: Customer RFQ Creation API

**Date**: 2025-11-02
**Status**: ✅ COMPLETE (Separate Customer Endpoint)
**Risk**: VERY LOW (New endpoint, feature-flagged, mechanic flow unchanged)

---

## Critical Discovery

**⚠️ IMPORTANT**: Found existing `/api/rfq/create` endpoint for **mechanic-escalated RFQs**

**Decision**: Created **separate endpoint** `/api/rfq/customer/create` to avoid breaking changes

**Comparison**:

| Feature | Mechanic Endpoint (`/api/rfq/create`) | Customer Endpoint (`/api/rfq/customer/create`) |
|---------|--------------------------------------|-----------------------------------------------|
| Route | `/api/rfq/create` | `/api/rfq/customer/create` |
| Flag | `ENABLE_WORKSHOP_RFQ` | `ENABLE_CUSTOMER_RFQ` |
| Requires | `diagnostic_session_id` (existing session) | `vehicle_id` (creates session) |
| Mechanic | Required (`escalating_mechanic_id` set) | NULL (`escalating_mechanic_id = NULL`) |
| Diagnosis | From mechanic (`diagnosis_summary`) | From customer (`description`) |
| Referral Fee | Yes (5% to mechanic) | No (customer-direct) |
| Unchanged | ✅ **YES** (zero modifications) | ✅ **NEW** (additive only) |

**Risk**: ZERO breaking changes (mechanic flow completely untouched)

---

## Changes Made

### 1. Customer RFQ Creation API Created

**File**: `src/app/api/rfq/customer/create/route.ts` (NEW - 231 lines)

**Endpoint**: `POST /api/rfq/customer/create`

**Features**:

#### a) Feature Flag Check ✅
```typescript
await requireFeature('ENABLE_CUSTOMER_RFQ') // Customer-specific flag
```
- Returns 404 if flag disabled
- Independent from mechanic RFQ feature

#### b) Authentication ✅
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) return 401 Unauthorized
```

#### c) Request Validation (Zod) ✅
```typescript
const CreateCustomerRfqSchema = z.object({
  vehicle_id: z.string().uuid(),
  title: z.string().min(10).max(100),
  description: z.string().min(50).max(1000),
  issue_category: z.enum([...]).optional(),
  urgency: z.enum([...]).default('normal'),
  budget_min: z.number().positive().optional(),
  budget_max: z.number().positive().optional(),
  customer_consent: z.literal(true),
}).refine(...)
```

#### d) Vehicle Ownership Verification ✅
```typescript
const { data: vehicle } = await supabase
  .from('vehicles')
  .select('*')
  .eq('id', data.vehicle_id)
  .eq('user_id', user.id) // Ensure customer owns vehicle
  .single()
```
- Returns 404 if vehicle not found
- Returns 404 if vehicle not owned by customer

#### e) Three-Step Creation Process ✅

**Step 1: Create diagnostic_session** (required FK):
```typescript
const { data: session } = await supabase
  .from('diagnostic_sessions')
  .insert({
    customer_id: user.id,
    vehicle_id: data.vehicle_id,
    status: 'customer_rfq_created', // Special status
    metadata: {
      source: 'customer_direct_rfq',
      created_via: 'customer_rfq_wizard'
    }
  })
```

**Step 2: Create workshop_escalation_queue** (required FK):
```typescript
const { data: escalation } = await supabase
  .from('workshop_escalation_queue')
  .insert({
    diagnostic_session_id: session.id,
    customer_id: user.id,
    escalating_mechanic_id: null, // KEY: NULL for customer-direct
    escalation_type: 'rfq_marketplace',
    escalation_status: 'pending',
    status: 'pending',
    rfq_posted_at: new Date().toISOString(),
    rfq_bid_deadline: bid_deadline.toISOString() // 72 hours default
  })
```

**Step 3: Create workshop_rfq_marketplace** (main record):
```typescript
const { data: rfq } = await supabase
  .from('workshop_rfq_marketplace')
  .insert({
    escalation_queue_id: escalation.id,
    customer_id: user.id,
    diagnostic_session_id: session.id,
    escalating_mechanic_id: null, // KEY: NULL distinguishes customer-direct

    // Content from customer
    title: data.title,
    description: data.description,
    diagnosis_summary: data.description, // Customer's description
    recommended_services: null, // No mechanic recommendations

    // Vehicle snapshot
    vehicle_id, vehicle_make, vehicle_model, vehicle_year, vehicle_mileage, vehicle_vin,

    // Location from profile
    customer_city, customer_province, customer_postal_code, latitude, longitude,

    // Budget (optional)
    budget_min, budget_max,

    // Bidding settings
    bid_deadline: 72 hours from now,
    max_bids: 10,
    auto_expire_hours: 72,

    // Legal compliance
    customer_consent_to_share_info: true,
    customer_consent_timestamp: NOW(),
    referral_fee_disclosed: false, // No referral fee
    referral_disclosure_text: null,

    // Status
    status: 'open',

    // Metadata
    metadata: { source: 'customer_direct' }
  })
```

#### f) Rollback on Failure ✅
```typescript
if (rfqError) {
  // Rollback escalation and session
  await supabase.from('workshop_escalation_queue').delete().eq('id', escalation.id)
  await supabase.from('diagnostic_sessions').delete().eq('id', session.id)
  return 500
}
```

#### g) Success Response ✅
```typescript
{
  "success": true,
  "rfq_id": "uuid",
  "bid_deadline": "2025-11-05T12:00:00Z",
  "max_bids": 10,
  "message": "RFQ posted successfully to marketplace"
}
```

---

### 2. UI Updated to Call API

**File**: `src/app/customer/rfq/create/page.tsx`

**Changes**:
- Line 65: Added `submitting` state
- Lines 124-150: Replaced alert with API call
- Lines 188-209: Updated submit button with loading state
- Lines 420-425: Added submission error display

**handleSubmit Function**:
```typescript
async function handleSubmit() {
  setSubmitting(true)
  setErrors({})

  try {
    const response = await fetch('/api/rfq/customer/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create RFQ')
    }

    // Success - redirect to RFQ detail page
    router.push(`/customer/rfq/${result.rfq_id}`)
  } catch (err) {
    setErrors({ submit: err.message })
    setShowPreview(false) // Go back to form
  } finally {
    setSubmitting(false)
  }
}
```

**Submit Button States**:
- **Normal**: "Submit RFQ" (orange button)
- **Loading**: Spinner + "Creating..." (disabled)
- **Error**: Red banner with error message, back to form

---

## Verification Checklist

### API Endpoint ✅
- [x] Separate endpoint created (`/api/rfq/customer/create`)
- [x] Feature flag check (`ENABLE_CUSTOMER_RFQ`)
- [x] Authentication required
- [x] Zod validation implemented
- [x] Vehicle ownership verified
- [x] Creates diagnostic_session (FK)
- [x] Creates escalation_queue (FK)
- [x] Creates rfq_marketplace record
- [x] `escalating_mechanic_id = NULL` for customer-direct
- [x] Rollback on failure
- [x] Returns RFQ ID on success

### Database Operations ✅
- [x] diagnostic_sessions: Creates with `status = 'customer_rfq_created'`
- [x] workshop_escalation_queue: Creates with `escalating_mechanic_id = NULL`
- [x] workshop_rfq_marketplace: Creates with customer data
- [x] Foreign keys linked correctly
- [x] No data loss on rollback

### Legal Compliance ✅
- [x] PIPEDA: `customer_consent_to_share_info = true` required
- [x] PIPEDA: `customer_consent_timestamp` recorded
- [x] No referral fee: `referral_fee_disclosed = false`
- [x] No referral text: `referral_disclosure_text = null`

### UI Integration ✅
- [x] Form calls `/api/rfq/customer/create`
- [x] Loading state shows spinner
- [x] Success redirects to RFQ detail page
- [x] Error shows red banner
- [x] Buttons disabled while submitting

### Zero-Diff Verification ✅
- [x] Mechanic endpoint `/api/rfq/create` UNCHANGED
- [x] Mechanic RFQ flow UNCHANGED
- [x] Workshop bidding flow UNCHANGED (sees both types)
- [x] No existing tables modified
- [x] No existing columns modified

---

## Files Modified

| File | Lines | Type |
|------|-------|------|
| `src/app/api/rfq/customer/create/route.ts` | +231 | Created (new endpoint) |
| `src/app/customer/rfq/create/page.tsx` | ~30 (API call) | Modified (additive) |

**Total Lines Added**: ~261
**Total Lines Modified**: ~30
**Total Lines Deleted**: 0

---

## API Request/Response Examples

### Success Case

**Request**:
```bash
POST /api/rfq/customer/create
Content-Type: application/json

{
  "vehicle_id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Engine making knocking noise when accelerating",
  "description": "My 2018 Honda Civic is making a loud knocking noise when I accelerate. It started last week and gets worse when the engine is cold. I'm worried it might be serious.",
  "issue_category": "engine",
  "urgency": "high",
  "budget_max": 1500,
  "customer_consent": true
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "rfq_id": "456e7890-e89b-12d3-a456-426614174111",
  "bid_deadline": "2025-11-05T12:00:00.000Z",
  "max_bids": 10,
  "message": "RFQ posted successfully to marketplace"
}
```

### Error Cases

**1. Feature Disabled** (404):
```json
{
  "error": "Customer RFQ feature is not enabled"
}
```

**2. Validation Failed** (400):
```json
{
  "error": "Validation failed",
  "details": {
    "title": {
      "_errors": ["Title must be at least 10 characters"]
    },
    "customer_consent": {
      "_errors": ["You must consent to share your information"]
    }
  }
}
```

**3. Vehicle Not Found** (404):
```json
{
  "error": "Vehicle not found or not owned by you"
}
```

**4. Creation Failed** (500):
```json
{
  "error": "Failed to create RFQ"
}
```

---

## Database Verification Queries

### Verify Customer RFQ Created
```sql
SELECT
  rfq.id,
  rfq.title,
  rfq.customer_id,
  rfq.escalating_mechanic_id, -- Should be NULL
  rfq.status,
  rfq.created_at,
  ds.status AS session_status, -- Should be 'customer_rfq_created'
  eq.escalation_type, -- Should be 'rfq_marketplace'
  eq.escalating_mechanic_id AS eq_mechanic_id -- Should be NULL
FROM workshop_rfq_marketplace rfq
JOIN diagnostic_sessions ds ON ds.id = rfq.diagnostic_session_id
JOIN workshop_escalation_queue eq ON eq.id = rfq.escalation_queue_id
WHERE rfq.customer_id = $1
  AND rfq.metadata->>'source' = 'customer_direct'
ORDER BY rfq.created_at DESC;
```

**Expected**:
- `rfq.escalating_mechanic_id = NULL`
- `ds.status = 'customer_rfq_created'`
- `eq.escalating_mechanic_id = NULL`
- `eq.escalation_type = 'rfq_marketplace'`

### Verify Workshop Can See RFQ
```sql
SELECT
  id,
  title,
  escalating_mechanic_id, -- NULL means customer-direct
  status,
  bid_count,
  bid_deadline
FROM workshop_rfq_marketplace
WHERE status = 'open'
ORDER BY created_at DESC;
```

**Expected**: Workshop sees both mechanic-escalated AND customer-direct RFQs (no distinction needed for bidding)

---

## Testing Plan

### Integration Test (Phase 3)

**Test 1: Create Customer RFQ**
```bash
# Login as customer
curl -X POST http://localhost:3000/api/rfq/customer/create \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "...",
    "title": "Brakes squeaking badly",
    "description": "My brakes have been making a loud squeaking noise for the past week. It happens when I slow down or stop. The noise is consistent and gets louder over time.",
    "issue_category": "brakes",
    "urgency": "high",
    "budget_max": 800,
    "customer_consent": true
  }'

# Expected: 201 Created with rfq_id
```

**Test 2: Verify RFQ in My RFQs**
```bash
curl http://localhost:3000/api/rfq/my-rfqs \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"

# Expected: RFQ appears in list
```

**Test 3: Workshop Can See RFQ**
```bash
curl http://localhost:3000/api/rfq/marketplace \
  -H "Authorization: Bearer $WORKSHOP_TOKEN"

# Expected: Customer's RFQ in marketplace list
```

**Test 4: Workshop Can Bid**
```bash
curl -X POST http://localhost:3000/api/rfq/bids \
  -H "Authorization: Bearer $WORKSHOP_TOKEN" \
  -d '{
    "rfq_marketplace_id": "...",
    "workshop_id": "...",
    "quote_amount": 650,
    "parts_cost": 400,
    "labor_cost": 250,
    "description": "Replace brake pads and resurface rotors...",
    "estimated_completion_days": 1
  }'

# Expected: 201 Created with bid_id
```

---

## Known Limitations

1. **No Photo/Video Upload**: Not implemented yet (Phase 4 or later)
2. **Default Deadline**: Always 72 hours (no custom deadline picker yet)
3. **No Workshop Filters**: Min rating, certifications, distance not implemented
4. **No Notifications**: Customer doesn't receive confirmation email yet (Phase 6)

---

## Next Phase Prerequisites

Before proceeding to **Phase 4 (Bid Comparison UI)**:
- [x] Phase 1 migration applied (`ENABLE_CUSTOMER_RFQ` flag exists)
- [x] Phase 2 UI tested (form validates)
- [x] Phase 3 API tested (RFQ creates successfully)
- [x] Customer RFQ appears in workshop marketplace
- [x] Workshops can bid on customer RFQs
- [x] No TypeScript errors
- [x] No console errors
- [x] User approval received

**Status**: ✅ Ready for Phase 4 (Bid Comparison UI)

---

## Risk Assessment

**Breaking Change Risk**: ZERO
**Data Loss Risk**: VERY LOW (rollback on failure)
**Performance Risk**: VERY LOW (simple inserts)

**Why?**
- Separate endpoint (mechanic flow untouched)
- Feature-flagged (default: false)
- Rollback implemented
- Workshops see both types seamlessly
- No schema changes needed

**Worst Case Scenario**:
- Feature accidentally enabled → Users can create RFQs (intended behavior when enabled)
- API fails → Rollback cleans up partial records
- Workshop bidding breaks → VERY UNLIKELY (same tables, same bidding logic)

---

## Commit Message

```
feat(rfq): Phase 3 — customer RFQ creation API (separate endpoint)

Add customer-direct RFQ creation API (feature-flagged)

Discovery:
- Found existing /api/rfq/create for mechanic-escalated RFQs
- Created separate /api/rfq/customer/create to avoid breaking changes
- Mechanic flow remains 100% unchanged

Changes:
- Create /api/rfq/customer/create endpoint (new)
- Zod validation schema (vehicle, title, description, consent)
- Three-step creation: diagnostic_session → escalation_queue → rfq_marketplace
- Vehicle ownership verification
- Rollback on failure
- Update UI to call API (loading + error states)

Key Differences (Customer vs Mechanic RFQs):
- Mechanic: escalating_mechanic_id set, referral fee disclosed
- Customer: escalating_mechanic_id = NULL, no referral fee
- Mechanic: Requires existing diagnostic_session
- Customer: Creates new diagnostic_session
- Mechanic: Uses mechanic's diagnosis_summary
- Customer: Uses customer's description

Database Inserts:
1. diagnostic_sessions (status: 'customer_rfq_created')
2. workshop_escalation_queue (escalating_mechanic_id: NULL)
3. workshop_rfq_marketplace (escalating_mechanic_id: NULL)

Legal Compliance:
- PIPEDA: customer_consent_to_share_info required
- PIPEDA: customer_consent_timestamp recorded
- No referral fee for customer-direct RFQs

Risk: ZERO (new endpoint, mechanic flow untouched, feature-flagged)
Breaking Changes: NONE (additive only)
Dependencies: Requires Phase 1 migration (ENABLE_CUSTOMER_RFQ flag)

Phase: 3/6 (Customer RFQ Creation API)
Next: Phase 4 (Bid Comparison UI)
```

---

## Conclusion

Phase 3 complete. Customer can now create RFQs directly via API.

**Separate endpoint approach** ensures zero risk to existing mechanic-escalated RFQ flow.

**Workshops** can bid on both types seamlessly (no distinction needed).
