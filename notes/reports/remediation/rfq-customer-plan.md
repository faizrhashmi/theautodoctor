# Customer RFQ Creation — Implementation Plan

**Date**: 2025-11-02
**Status**: PLAN ONLY - Awaiting Approval
**Feature Flag**: `ENABLE_CUSTOMER_RFQ` (default: false)
**Risk**: VERY LOW (feature-flagged, additive only, no breaking changes)

---

## Executive Summary

Implement customer-direct RFQ creation to unlock the fully-built workshop bidding marketplace. This is a **5-phase implementation** with strict guardrails:

- Feature-flagged (kill-switch available)
- Additive only (zero breaking changes to existing flows)
- Reuses existing RFQ tables/endpoints
- Commit to main after each phase approval
- No workshop/mechanic flow changes

**Goal**: Enable customers to create RFQs → Workshops can immediately bid (already 100% ready)

---

## Schema Evidence (from Database)

### Database Discovery Output

```
============================================
Schema Discovery for Customer RFQ Plan
============================================

1. workshop_rfq_marketplace TABLE
✅ Table exists (empty)

2. workshop_rfq_bids TABLE
✅ Table exists (empty)

3. vehicles TABLE
✅ Table exists. Columns:
  - color, created_at, id, is_primary, make, mileage, model, nickname
  - plate, updated_at, user_id, vin, year

4. profiles TABLE
✅ Table exists. Columns:
  - account_status, account_type, address_line1, address_line2, anonymized
  - anonymized_at, ban_reason, city, communication_preferences, country
  - created_at, date_of_birth, deleted_at, deletion_request_id, email
  - email_verified, free_session_override, full_name, id, is_18_plus
  - last_selected_slot, latitude, longitude, metadata, newsletter_subscribed
  - onboarding_completed, organization_id, phone, postal_zip_code
  - preferred_language, preferred_plan, profile_completed, profile_completed_at
  - referral_source, referred_by_workshop_id, role, source, state_province
  - stripe_account_id, stripe_charges_enabled, stripe_details_submitted
  - stripe_onboarding_completed, stripe_payouts_enabled, suspended_until
  - terms_accepted, terms_accepted_at, timezone, updated_at, vehicle_hint
  - vehicle_info, waiver_accepted, waiver_accepted_at, waiver_ip_address

5. diagnostic_sessions TABLE
✅ Table exists (empty or no rows)

6. intakes TABLE
✅ Table exists. Columns:
  - city, concern, created_at, customer_name, email, files, id
  - make, model, name, odometer, phone, plan, plate, status
  - urgent, vehicle_id, vin, year

7. feature_flags TABLE
Current flags:
  - ENABLE_WORKSHOP_RFQ: true
```

### workshop_rfq_marketplace Table Schema (43 Columns)

**From migration file: `20251206000002_phase6_workshop_rfq_marketplace.sql`**

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `id` | UUID | Auto | Primary key |
| `created_at` | TIMESTAMP | Auto | Timestamp |
| `updated_at` | TIMESTAMP | Auto | Trigger updates |
| `escalation_queue_id` | UUID | **YES** | Links to escalation queue (UNIQUE) |
| `customer_id` | UUID | **YES** | Customer who created RFQ |
| `diagnostic_session_id` | UUID | **YES** | Links to diagnostic session |
| `escalating_mechanic_id` | UUID | Optional | NULL for customer-direct RFQs |
| `title` | TEXT | **YES** | RFQ title |
| `description` | TEXT | **YES** | RFQ description |
| `issue_category` | TEXT | Optional | 'engine', 'brakes', 'electrical', etc. |
| `urgency` | TEXT | Default: 'normal' | 'low', 'normal', 'high', 'urgent' |
| `vehicle_id` | UUID | Optional | Links to vehicles table |
| `vehicle_make` | TEXT | Optional | Snapshot from vehicle |
| `vehicle_model` | TEXT | Optional | Snapshot from vehicle |
| `vehicle_year` | INTEGER | Optional | Snapshot from vehicle |
| `vehicle_mileage` | INTEGER | Optional | Snapshot from vehicle |
| `vehicle_vin` | TEXT | Optional | Snapshot from vehicle |
| `customer_city` | TEXT | Optional | From profiles table |
| `customer_province` | TEXT | Optional | From profiles.state_province |
| `customer_postal_code` | TEXT | Optional | From profiles.postal_zip_code |
| `latitude` | DOUBLE PRECISION | Optional | From profiles |
| `longitude` | DOUBLE PRECISION | Optional | From profiles |
| `diagnosis_summary` | TEXT | **YES** | Customer's description of issue |
| `recommended_services` | TEXT[] | Optional | Service categories |
| `diagnostic_photos` | JSONB | Default: '[]' | Photos from customer |
| `mechanic_notes` | TEXT | Optional | NULL for customer-direct |
| `additional_photos` | TEXT[] | Optional | Storage URLs |
| `additional_videos` | TEXT[] | Optional | Storage URLs |
| `additional_documents` | TEXT[] | Optional | Storage URLs |
| `budget_min` | DECIMAL(10,2) | Optional | Customer budget range |
| `budget_max` | DECIMAL(10,2) | Optional | Customer budget range |
| `bid_deadline` | TIMESTAMP | **YES** | When bidding closes |
| `max_bids` | INTEGER | Default: 10 | Max workshops that can bid |
| `auto_expire_hours` | INTEGER | Default: 72 | Auto-close after hours |
| `min_workshop_rating` | DECIMAL(3,2) | Optional | Filter workshops |
| `required_certifications` | TEXT[] | Optional | Filter workshops |
| `preferred_cities` | TEXT[] | Optional | Filter workshops |
| `max_distance_km` | INTEGER | Optional | Filter workshops |
| `status` | TEXT | Default: 'open' | 'draft', 'open', 'under_review', 'bid_accepted', 'quote_sent', 'converted', 'expired', 'cancelled' |
| `view_count` | INTEGER | Default: 0 | Auto-incremented by trigger |
| `bid_count` | INTEGER | Default: 0 | Auto-incremented by trigger |
| `total_workshops_viewed` | INTEGER | Default: 0 | Auto-incremented by trigger |
| `accepted_bid_id` | UUID | Optional | Winning bid |
| `accepted_at` | TIMESTAMP | Optional | When bid accepted |
| `customer_consent_to_share_info` | BOOLEAN | **YES** | PIPEDA compliance |
| `customer_consent_timestamp` | TIMESTAMP | Optional | When consent given |
| `referral_fee_disclosed` | BOOLEAN | Default: false | Competition Act |
| `referral_disclosure_text` | TEXT | Optional | Disclosure text |
| `privacy_policy_version` | TEXT | Default: 'v1' | Policy version |
| `metadata` | JSONB | Default: '{}' | Extra data |

### Required Fields for Customer-Created RFQs

**Minimum to create RFQ**:
1. `escalation_queue_id` (UUID) - **Must create first**
2. `customer_id` (UUID) - From `auth.uid()`
3. `diagnostic_session_id` (UUID) - **Must create first**
4. `title` (TEXT) - Customer input
5. `description` (TEXT) - Customer input
6. `diagnosis_summary` (TEXT) - Customer's issue description
7. `bid_deadline` (TIMESTAMP) - Auto-calculate (NOW() + 72 hours)
8. `customer_consent_to_share_info` (BOOLEAN) - Checkbox (required)

**Key Insight**: Customer-direct RFQs set `escalating_mechanic_id = NULL` to distinguish from mechanic-escalated RFQs.

---

## Code Touchpoints (Files Modified Per Phase)

### Phase 1: Feature Flag Setup

**New Files**:
- ✅ NONE (feature flag infra already exists from previous phases)

**Modified Files**:
- `supabase/migrations/YYYYMMDD_add_customer_rfq_flag.sql` - Add flag
- `.env.example` - Document flag

**Zero-Diff Locations**: None (new flag, default OFF)

---

### Phase 2: Customer RFQ Creation UI

**New Files**:
- `src/app/customer/rfq/create/page.tsx` - Multi-step form wizard
- `src/components/rfq/CreateRfqWizard.tsx` - Wizard component
- `src/components/rfq/VehicleSelectStep.tsx` - Step 1: Vehicle
- `src/components/rfq/IssueDescriptionStep.tsx` - Step 2: Issue
- `src/components/rfq/PreferencesStep.tsx` - Step 3: Preferences
- `src/components/rfq/ReviewConsentStep.tsx` - Step 4: Review

**Modified Files**:
- `src/app/customer/rfq/my-rfqs/page.tsx` - Add "Create RFQ" button (feature-gated)

**Zero-Diff Locations**:
- Existing `/customer/rfq/my-rfqs` route unchanged (button only shows if flag ON)
- No changes to workshop flows
- No changes to mechanic flows

---

### Phase 3: Customer RFQ Creation API

**New Files**:
- `src/app/api/rfq/create/route.ts` - POST endpoint for customer RFQ creation
- `src/lib/rfq/createCustomerRfq.ts` - Business logic
- `src/lib/rfq/customerRfqValidation.ts` - Zod schema

**Modified Files**:
- NONE (new endpoints only)

**Zero-Diff Locations**:
- Existing `/api/rfq/marketplace` unchanged (workshops browse both types)
- Existing `/api/rfq/bids` unchanged (workshops bid same way)
- Existing `/api/rfq/my-rfqs` unchanged (fetches both types)

**Key Design**: Reuse existing `workshop_rfq_marketplace` table with `escalating_mechanic_id = NULL` for customer-direct RFQs.

---

### Phase 4: Bid Comparison UI

**New Files**:
- `src/app/customer/rfq/[rfqId]/bids/page.tsx` - Compare bids page
- `src/components/rfq/BidComparisonTable.tsx` - Side-by-side comparison
- `src/components/rfq/BidCard.tsx` - Individual bid card
- `src/components/rfq/AcceptBidDialog.tsx` - Confirmation modal

**Modified Files**:
- `src/app/customer/rfq/my-rfqs/page.tsx` - Add "View Bids" link per RFQ

**Zero-Diff Locations**:
- No changes to workshop bid submission
- No changes to workshop marketplace browsing

---

### Phase 5: Bid Acceptance API

**New Files**:
- `src/app/api/rfq/[rfqId]/accept-bid/route.ts` - POST endpoint

**Modified Files**:
- NONE (leverages existing `accept_workshop_rfq_bid()` function from migration)

**Zero-Diff Locations**:
- Existing bid acceptance logic reused
- Existing workshop notifications reused

---

### Phase 6: Notifications & Polish

**New Files**:
- NONE (reuse existing notification system)

**Modified Files**:
- `src/lib/rfq/notifications.ts` - Add customer RFQ created notification
- `src/lib/rfq/notifications.ts` - Add bid received notification (reuse existing)

**Zero-Diff Locations**:
- Workshop notifications unchanged
- Mechanic notifications unchanged (they don't get notified for customer-direct RFQs)

---

## Phase-by-Phase Implementation Plan

### Phase 1: Feature Flag Setup (5 minutes)

**Goal**: Add `ENABLE_CUSTOMER_RFQ` feature flag

**Tasks**:
1. Create migration to insert flag into `feature_flags` table
2. Update `.env.example` with flag documentation
3. Verify flag exists and defaults to false

**Migration SQL**:
```sql
-- Add ENABLE_CUSTOMER_RFQ feature flag
INSERT INTO feature_flags (flag_key, is_enabled, description)
VALUES (
  'ENABLE_CUSTOMER_RFQ',
  false,
  'Enable customer-direct RFQ creation (bypasses mechanic escalation)'
)
ON CONFLICT (flag_key) DO NOTHING;
```

**Verification Checklist**:
- [ ] Flag exists in `feature_flags` table
- [ ] Flag is `is_enabled = false` by default
- [ ] `.env.example` documents flag
- [ ] `isFeatureEnabled('ENABLE_CUSTOMER_RFQ')` returns false

**Zero-Diff Verification**:
- [ ] No UI changes visible
- [ ] No API behavior changes
- [ ] Workshop flows unchanged
- [ ] Mechanic flows unchanged

**STOP**: Await approval before Phase 2

---

### Phase 2: Customer RFQ Creation UI (4-6 hours)

**Goal**: Build 4-step wizard for customers to create RFQs

**Tasks**:
1. Create `/customer/rfq/create` page with wizard component
2. Step 1: Select vehicle (from customer's vehicles)
3. Step 2: Describe issue (title, description, category, urgency)
4. Step 3: Set preferences (budget, deadline, workshop filters)
5. Step 4: Review & consent (PIPEDA checkbox)
6. Add "Create RFQ" button to `/customer/rfq/my-rfqs` (feature-gated)

**UI Components**:

**CreateRfqWizard.tsx**:
- Multi-step stepper (4 steps)
- Form state management (React Hook Form + Zod)
- Navigation (Next/Back/Submit)
- Draft saving (localStorage)

**VehicleSelectStep.tsx**:
- Fetch customer's vehicles
- Radio select vehicle
- Show: make, model, year, mileage, VIN
- Option: "Add new vehicle" (redirect to vehicle form)

**IssueDescriptionStep.tsx**:
- Text input: Title (max 100 chars)
- Textarea: Description (min 50 chars, max 1000 chars)
- Select: Issue category (engine, brakes, electrical, suspension, transmission, other)
- Radio: Urgency (low, normal, high, urgent)
- File upload: Photos/videos (optional, max 5 files, 10MB each)

**PreferencesStep.tsx**:
- Number inputs: Budget range (min/max, optional)
- Date picker: Bid deadline (default: 3 days, max: 14 days)
- Number input: Max bids (default: 10, max: 20)
- Number input: Min workshop rating (optional, 1.0-5.0)
- Checkbox: Only certified workshops
- Multi-select: Preferred cities (optional)
- Number input: Max distance (km, optional)

**ReviewConsentStep.tsx**:
- Summary: Vehicle, issue, preferences
- Edit buttons (go back to step)
- Checkbox: "I consent to share my information with workshops" (REQUIRED)
- Legal text: PIPEDA disclosure
- Legal text: No referral fee for customer-direct RFQs
- Submit button

**Verification Checklist**:
- [ ] `/customer/rfq/create` loads without errors
- [ ] "Create RFQ" button shows on `/customer/rfq/my-rfqs` ONLY if flag enabled
- [ ] "Create RFQ" button hidden if flag disabled
- [ ] All 4 steps render correctly
- [ ] Form validation works (required fields)
- [ ] Vehicle prefill works (customer's vehicles)
- [ ] File upload works (photos/videos)
- [ ] PIPEDA consent checkbox required
- [ ] Submit button disabled until consent checked
- [ ] Navigation works (Next/Back)
- [ ] Mobile-responsive (test on 375px width)

**Zero-Diff Verification**:
- [ ] Existing `/customer/rfq/my-rfqs` unchanged when flag OFF
- [ ] No API calls made (form not submitted yet)
- [ ] Workshop flows unchanged
- [ ] Mechanic flows unchanged

**STOP**: Await approval before Phase 3

---

### Phase 3: Customer RFQ Creation API (3-4 hours)

**Goal**: Build API endpoint to create customer RFQ

**Tasks**:
1. Create `POST /api/rfq/create` endpoint
2. Validate request body with Zod schema
3. Create `diagnostic_session` (required FK)
4. Create `workshop_escalation_queue` (required FK)
5. Insert `workshop_rfq_marketplace` record
6. Upload photos/videos to storage
7. Return RFQ ID

**API Route Structure**:

**POST /api/rfq/create**:
```typescript
// Request body
{
  vehicle_id: UUID;
  title: string;
  description: string;
  issue_category?: string;
  urgency?: 'low' | 'normal' | 'high' | 'urgent';
  budget_min?: number;
  budget_max?: number;
  bid_deadline?: string; // ISO timestamp
  max_bids?: number;
  min_workshop_rating?: number;
  required_certifications?: string[];
  preferred_cities?: string[];
  max_distance_km?: number;
  photos?: File[]; // Uploaded files
  customer_consent: boolean; // REQUIRED
}

// Response
{
  success: true;
  rfq_id: UUID;
  bid_deadline: string;
  message: "RFQ created successfully";
}
```

**Implementation Steps**:

1. **Auth & Feature Flag Check**:
```typescript
await requireFeature('ENABLE_CUSTOMER_RFQ');
const { data: { user } } = await supabase.auth.getUser();
if (!user) return 401 Unauthorized;
```

2. **Validate Request**:
```typescript
const validationResult = CreateCustomerRfqSchema.safeParse(body);
if (!validationResult.success) return 400 Bad Request;
```

3. **Verify Vehicle Ownership**:
```typescript
const { data: vehicle } = await supabase
  .from('vehicles')
  .select('*')
  .eq('id', data.vehicle_id)
  .eq('user_id', user.id)
  .single();

if (!vehicle) return 404 Vehicle Not Found;
```

4. **Get Customer Profile**:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('city, state_province, postal_zip_code, latitude, longitude')
  .eq('id', user.id)
  .single();
```

5. **Create Diagnostic Session** (minimal record for FK):
```typescript
const { data: session } = await supabase
  .from('diagnostic_sessions')
  .insert({
    customer_id: user.id,
    vehicle_id: data.vehicle_id,
    status: 'customer_rfq_created', // Special status
    metadata: { source: 'customer_direct_rfq' }
  })
  .select()
  .single();
```

6. **Create Escalation Queue** (required FK):
```typescript
const { data: escalation } = await supabase
  .from('workshop_escalation_queue')
  .insert({
    escalating_mechanic_id: null, // NULL for customer-direct
    customer_id: user.id,
    diagnostic_session_id: session.id,
    escalation_type: 'rfq_marketplace',
    escalation_status: 'pending',
    status: 'pending',
    rfq_posted_at: new Date().toISOString(),
    rfq_bid_deadline: data.bid_deadline || new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    metadata: { source: 'customer_direct' }
  })
  .select()
  .single();
```

7. **Upload Photos** (if provided):
```typescript
const photoUrls = [];
for (const photo of data.photos || []) {
  const path = `rfq/${escalation.id}/${photo.name}`;
  await supabase.storage.from('rfq-photos').upload(path, photo);
  const { data: { publicUrl } } = supabase.storage.from('rfq-photos').getPublicUrl(path);
  photoUrls.push(publicUrl);
}
```

8. **Create RFQ Marketplace Record**:
```typescript
const { data: rfq } = await supabase
  .from('workshop_rfq_marketplace')
  .insert({
    escalation_queue_id: escalation.id,
    customer_id: user.id,
    diagnostic_session_id: session.id,
    escalating_mechanic_id: null, // KEY: NULL for customer-direct

    title: data.title,
    description: data.description,
    issue_category: data.issue_category,
    urgency: data.urgency || 'normal',

    vehicle_id: vehicle.id,
    vehicle_make: vehicle.make,
    vehicle_model: vehicle.model,
    vehicle_year: vehicle.year,
    vehicle_mileage: vehicle.mileage,
    vehicle_vin: vehicle.vin,

    customer_city: profile.city,
    customer_province: profile.state_province,
    customer_postal_code: profile.postal_zip_code,
    latitude: profile.latitude,
    longitude: profile.longitude,

    diagnosis_summary: data.description, // Customer's description
    diagnostic_photos: photoUrls,

    budget_min: data.budget_min,
    budget_max: data.budget_max,

    bid_deadline: data.bid_deadline || new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    max_bids: data.max_bids || 10,
    auto_expire_hours: 72,

    min_workshop_rating: data.min_workshop_rating,
    required_certifications: data.required_certifications,
    preferred_cities: data.preferred_cities,
    max_distance_km: data.max_distance_km,

    status: 'open',

    customer_consent_to_share_info: data.customer_consent,
    customer_consent_timestamp: new Date().toISOString(),
    referral_fee_disclosed: false, // No referral fee for customer-direct

    metadata: { source: 'customer_direct' }
  })
  .select()
  .single();
```

9. **Link RFQ to Escalation Queue**:
```typescript
await supabase
  .from('workshop_escalation_queue')
  .update({ rfq_marketplace_id: rfq.id })
  .eq('id', escalation.id);
```

10. **Return Success**:
```typescript
return NextResponse.json({
  success: true,
  rfq_id: rfq.id,
  bid_deadline: rfq.bid_deadline,
  message: 'RFQ created successfully'
}, { status: 201 });
```

**Zod Validation Schema**:
```typescript
export const CreateCustomerRfqSchema = z.object({
  vehicle_id: z.string().uuid(),
  title: z.string().min(10).max(100),
  description: z.string().min(50).max(1000),
  issue_category: z.enum(['engine', 'brakes', 'electrical', 'suspension', 'transmission', 'other']).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  budget_min: z.number().positive().optional(),
  budget_max: z.number().positive().optional(),
  bid_deadline: z.string().datetime().optional(),
  max_bids: z.number().int().min(1).max(20).optional(),
  min_workshop_rating: z.number().min(1.0).max(5.0).optional(),
  required_certifications: z.array(z.string()).optional(),
  preferred_cities: z.array(z.string()).optional(),
  max_distance_km: z.number().int().positive().optional(),
  customer_consent: z.literal(true), // MUST be true
}).refine(data => {
  if (data.budget_min && data.budget_max) {
    return data.budget_min <= data.budget_max;
  }
  return true;
}, { message: 'Budget min must be less than or equal to budget max' });
```

**Verification Checklist**:
- [ ] POST `/api/rfq/create` returns 404 if flag disabled
- [ ] POST `/api/rfq/create` returns 401 if not authenticated
- [ ] POST `/api/rfq/create` returns 400 if validation fails
- [ ] POST `/api/rfq/create` returns 404 if vehicle not owned by customer
- [ ] POST `/api/rfq/create` returns 400 if consent not given
- [ ] Creates `diagnostic_session` with `status = 'customer_rfq_created'`
- [ ] Creates `workshop_escalation_queue` with `escalating_mechanic_id = NULL`
- [ ] Creates `workshop_rfq_marketplace` with `escalating_mechanic_id = NULL`
- [ ] Links `rfq_marketplace_id` to escalation queue
- [ ] Uploads photos to storage
- [ ] Returns RFQ ID in response
- [ ] RFQ appears in customer's `/api/rfq/my-rfqs`
- [ ] RFQ appears in workshop's `/api/rfq/marketplace`

**Zero-Diff Verification**:
- [ ] Existing `/api/rfq/marketplace` returns both mechanic-escalated AND customer-direct RFQs
- [ ] Workshops can browse customer-direct RFQs (no distinction needed)
- [ ] Workshops can bid on customer-direct RFQs (existing `/api/rfq/bids` works)
- [ ] No changes to mechanic flows

**Integration Test**:
```bash
# Create customer RFQ
curl -X POST http://localhost:3000/api/rfq/create \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -d '{
    "vehicle_id": "...",
    "title": "Engine making knocking noise",
    "description": "My 2018 Honda Civic is making a loud knocking noise when I accelerate. Happens mostly when cold.",
    "issue_category": "engine",
    "urgency": "high",
    "budget_max": 1500,
    "customer_consent": true
  }'

# Expected: 201 Created with rfq_id

# Verify: Workshop can see RFQ
curl http://localhost:3000/api/rfq/marketplace \
  -H "Authorization: Bearer $WORKSHOP_TOKEN"

# Expected: Customer's RFQ in list

# Verify: Workshop can bid
curl -X POST http://localhost:3000/api/rfq/bids \
  -H "Authorization: Bearer $WORKSHOP_TOKEN" \
  -d '{
    "rfq_marketplace_id": "...",
    "workshop_id": "...",
    "quote_amount": 1200,
    "parts_cost": 800,
    "labor_cost": 400,
    "description": "Replace timing belt and tensioner...",
    "estimated_completion_days": 2
  }'

# Expected: 201 Created with bid_id
```

**STOP**: Await approval before Phase 4

---

### Phase 4: Bid Comparison UI (3-4 hours)

**Goal**: Enable customers to view and compare workshop bids

**Tasks**:
1. Create `/customer/rfq/[rfqId]/bids` page
2. Fetch all bids for RFQ
3. Display bids in comparison table
4. Show bid details (price, warranty, availability)
5. Highlight recommended bid (best value)
6. "Accept Bid" button per bid

**UI Components**:

**BidComparisonTable.tsx**:
- Table columns: Workshop, Quote, Parts, Labor, Warranty, Availability, Actions
- Sort by: price (default), rating, warranty
- Filter by: max price, min rating
- Highlight: lowest price, best warranty, highest rating

**BidCard.tsx** (mobile view):
- Card layout for each bid
- Workshop info: name, city, rating, reviews
- Pricing: total, parts, labor breakdown
- Warranty: parts months, labor months
- Availability: earliest date, loaner available, pickup/dropoff
- "View Details" → expand full description
- "Accept Bid" button

**AcceptBidDialog.tsx**:
- Confirmation modal
- Show: workshop name, total price, warranty
- Warning: "This will notify the workshop and close bidding"
- Checkbox: "I understand this is binding"
- "Confirm" / "Cancel" buttons

**API Fetching**:
```typescript
// GET /api/rfq/[rfqId]/bids
const { data } = await fetch(`/api/rfq/${rfqId}/bids`);

// Response
{
  rfq: {
    id: UUID;
    title: string;
    status: string;
    bid_count: number;
    bid_deadline: string;
  };
  bids: [
    {
      id: UUID;
      workshop_id: UUID;
      workshop_name: string;
      workshop_city: string;
      workshop_rating: number;
      workshop_review_count: number;
      quote_amount: number;
      parts_cost: number;
      labor_cost: number;
      description: string;
      estimated_completion_days: number;
      parts_warranty_months: number;
      labor_warranty_months: number;
      earliest_availability_date: string;
      can_provide_loaner_vehicle: boolean;
      can_provide_pickup_dropoff: boolean;
      created_at: string;
    }
  ];
  recommendations: {
    lowest_price_bid_id: UUID;
    best_warranty_bid_id: UUID;
    highest_rated_bid_id: UUID;
  };
}
```

**Verification Checklist**:
- [ ] `/customer/rfq/[rfqId]/bids` loads without errors
- [ ] "View Bids" link shows on `/customer/rfq/my-rfqs` for RFQs with bids
- [ ] Fetches all bids for RFQ
- [ ] Displays bid comparison table
- [ ] Shows workshop info (name, city, rating)
- [ ] Shows pricing breakdown (total, parts, labor)
- [ ] Shows warranty info (parts, labor months)
- [ ] Shows availability (earliest date, loaner, pickup)
- [ ] Highlights recommended bids (badges)
- [ ] Sorting works (price, rating, warranty)
- [ ] Filtering works (max price, min rating)
- [ ] "Accept Bid" button shows per bid
- [ ] Mobile-responsive (card layout on small screens)

**Zero-Diff Verification**:
- [ ] No changes to workshop flows
- [ ] No changes to bid submission
- [ ] No changes to mechanic flows

**STOP**: Await approval before Phase 5

---

### Phase 5: Bid Acceptance API (2-3 hours)

**Goal**: Enable customers to accept winning bid

**Tasks**:
1. Create `POST /api/rfq/[rfqId]/accept-bid` endpoint
2. Validate customer owns RFQ
3. Call existing `accept_workshop_rfq_bid()` function
4. Update RFQ status to `bid_accepted`
5. Reject all other bids
6. Send notifications to workshop + customer

**API Route**:

**POST /api/rfq/[rfqId]/accept-bid**:
```typescript
// Request body
{
  bid_id: UUID;
}

// Response
{
  success: true;
  rfq_id: UUID;
  bid_id: UUID;
  workshop_id: UUID;
  quote_amount: number;
  message: "Bid accepted successfully";
}
```

**Implementation**:

1. **Auth & Feature Flag Check**:
```typescript
await requireFeature('ENABLE_CUSTOMER_RFQ');
const { data: { user } } = await supabase.auth.getUser();
if (!user) return 401 Unauthorized;
```

2. **Validate Request**:
```typescript
const { bid_id } = await request.json();
if (!bid_id) return 400 Bad Request;
```

3. **Call Database Function** (reuse existing function):
```typescript
const { data: result, error } = await supabase
  .rpc('accept_workshop_rfq_bid', {
    p_rfq_id: rfqId,
    p_bid_id: bid_id,
    p_customer_id: user.id
  });

if (error || !result.success) {
  return NextResponse.json({ error: result.error || error.message }, { status: 400 });
}
```

4. **Send Notifications**:
```typescript
await Promise.all([
  // Notify workshop (bid accepted)
  notifyWorkshopBidAccepted({
    workshopId: result.workshop_id,
    rfqId: rfqId,
    customerId: user.id,
    quoteAmount: result.quote_amount
  }),
  // Notify customer (confirmation)
  notifyCustomerBidAccepted({
    customerId: user.id,
    rfqId: rfqId,
    workshopName: result.workshop_name,
    quoteAmount: result.quote_amount
  })
]);
```

5. **Return Success**:
```typescript
return NextResponse.json({
  success: true,
  rfq_id: rfqId,
  bid_id: bid_id,
  workshop_id: result.workshop_id,
  quote_amount: result.quote_amount,
  message: 'Bid accepted successfully'
}, { status: 200 });
```

**Verification Checklist**:
- [ ] POST `/api/rfq/[rfqId]/accept-bid` returns 404 if flag disabled
- [ ] Returns 401 if not authenticated
- [ ] Returns 403 if RFQ not owned by customer
- [ ] Returns 400 if RFQ not in `open` or `under_review` status
- [ ] Returns 404 if bid not found
- [ ] Accepts bid (sets `status = 'accepted'`)
- [ ] Rejects all other bids (sets `status = 'rejected'`)
- [ ] Updates RFQ status to `bid_accepted`
- [ ] Updates RFQ `accepted_bid_id` and `accepted_at`
- [ ] Updates escalation queue `winning_workshop_id`
- [ ] Sends notification to workshop
- [ ] Sends notification to customer
- [ ] Returns workshop info in response

**Zero-Diff Verification**:
- [ ] Existing `accept_workshop_rfq_bid()` function works for both mechanic-escalated AND customer-direct RFQs
- [ ] No changes to workshop flows
- [ ] No changes to mechanic flows

**Integration Test**:
```bash
# Accept bid
curl -X POST http://localhost:3000/api/rfq/$RFQ_ID/accept-bid \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -d '{ "bid_id": "$BID_ID" }'

# Expected: 200 OK with workshop info

# Verify: RFQ status updated
curl http://localhost:3000/api/rfq/my-rfqs \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"

# Expected: RFQ status = 'bid_accepted', accepted_bid_id set

# Verify: Workshop notified
# Check workshop's notifications/emails
```

**STOP**: Await approval before Phase 6

---

### Phase 6: Notifications & Polish (2-3 hours)

**Goal**: Add notifications and UX polish

**Tasks**:
1. Add "RFQ Created" notification for customer
2. Add "New Bid Received" notification for customer (reuse existing)
3. Add "Bid Accepted" notification for workshop (reuse existing)
4. Add "Bid Rejected" notification for workshops (new)
5. Add email templates for all notifications
6. Add bid deadline countdown on customer RFQ list
7. Add "X bids received" badge on customer RFQ list
8. Add empty state on `/customer/rfq/create` if no vehicles

**Notifications**:

**Customer: RFQ Created** (new):
- Trigger: After RFQ created successfully
- Channel: In-app + email
- Content: "Your RFQ has been posted! Workshops can now submit bids."

**Customer: New Bid Received** (reuse existing):
- Trigger: Workshop submits bid
- Channel: In-app + email
- Content: "New bid received on your RFQ: [RFQ Title]. Total bids: X of Y."

**Customer: Bid Deadline Approaching** (new):
- Trigger: 24 hours before deadline
- Channel: In-app + email
- Content: "Your RFQ bid deadline is in 24 hours. Review bids now."

**Workshop: Bid Accepted** (reuse existing):
- Trigger: Customer accepts bid
- Channel: In-app + email
- Content: "Congratulations! Customer accepted your bid for [RFQ Title]."

**Workshop: Bid Rejected** (new):
- Trigger: Customer accepts different bid
- Channel: In-app + email
- Content: "Customer chose a different bid for [RFQ Title]. Thank you for bidding."

**UX Polish**:

1. **Bid Countdown Timer** on `/customer/rfq/my-rfqs`:
```tsx
<span className="text-sm text-gray-500">
  {hoursRemaining > 24 ? `${Math.floor(hoursRemaining / 24)} days left` : `${hoursRemaining} hours left`}
</span>
```

2. **Bid Count Badge**:
```tsx
<Badge variant={bidCount > 0 ? "success" : "secondary"}>
  {bidCount} {bidCount === 1 ? 'bid' : 'bids'}
</Badge>
```

3. **Empty State** on `/customer/rfq/create`:
```tsx
{vehicles.length === 0 && (
  <EmptyState
    icon={Car}
    title="No vehicles found"
    description="Add a vehicle to create an RFQ"
    action={<Button href="/customer/vehicles/add">Add Vehicle</Button>}
  />
)}
```

4. **RFQ Status Badges**:
- `open` → Blue badge "Accepting Bids"
- `under_review` → Yellow badge "Reviewing Bids"
- `bid_accepted` → Green badge "Bid Accepted"
- `expired` → Gray badge "Expired"

**Verification Checklist**:
- [ ] Customer receives "RFQ Created" notification
- [ ] Customer receives "New Bid" notification for each bid
- [ ] Customer receives "Deadline Approaching" notification
- [ ] Workshop receives "Bid Accepted" notification
- [ ] Workshop receives "Bid Rejected" notification
- [ ] Email templates render correctly
- [ ] Countdown timer shows on RFQ list
- [ ] Bid count badge shows on RFQ list
- [ ] Empty state shows if no vehicles
- [ ] Status badges show correctly

**Zero-Diff Verification**:
- [ ] No changes to workshop flows
- [ ] No changes to mechanic flows
- [ ] Existing notifications still work

**STOP**: Implementation complete! Create PR for final review.

---

## Legal & Compliance

### PIPEDA (Privacy)
- ✅ Customer consent checkbox required
- ✅ Consent timestamp tracked (`customer_consent_timestamp`)
- ✅ Disclosure: "Your information will be shared with workshops for bidding"

### Competition Act
- ✅ No referral fee for customer-direct RFQs (`referral_fee_disclosed = false`)
- ✅ Open bidding (multiple workshops can compete)
- ✅ Customer chooses best bid (no favoritism)

### Ontario Consumer Protection Act (OCPA)
- ✅ Workshop bids require parts + labor breakdown (existing validation)
- ✅ Written estimate provided (bid description)
- ✅ Warranty terms disclosed (parts_warranty_months, labor_warranty_months)

---

## Risk Analysis

### Breaking Change Risk: ZERO

**Why?**
1. Feature-flagged (default OFF)
2. Reuses existing tables/endpoints
3. Additive only (no modifications to existing flows)
4. Customer-direct RFQs identified by `escalating_mechanic_id = NULL`
5. Workshops browse/bid same way (no distinction needed)

**What Could Go Wrong?**
1. **Mechanic-escalated RFQs break**: VERY UNLIKELY (we're not touching mechanic flows)
2. **Workshop bidding breaks**: VERY UNLIKELY (reusing existing `/api/rfq/bids`)
3. **RFQ policies break**: UNLIKELY (RLS policies already support customer ownership)

**Mitigation**:
- Feature flag kill-switch
- Each phase independently verifiable
- Zero-diff verification checklists
- Integration tests before each phase approval

### Performance Risk: LOW

**Considerations**:
1. **Table size**: `workshop_rfq_marketplace` table will grow (but indexes exist)
2. **File uploads**: Photos/videos stored in Supabase storage (existing infra)
3. **Notifications**: Async (non-blocking)

**Mitigation**:
- Existing indexes on `customer_id`, `status`, `created_at`
- File upload limits (max 5 files, 10MB each)
- Notification queue (no direct impact on API response time)

### Security Risk: VERY LOW

**Considerations**:
1. **Customer can create unlimited RFQs**: Rate limiting needed
2. **Customer can see all workshop bids**: Intended behavior
3. **Customer consent required**: Enforced in validation

**Mitigation**:
- Add rate limiting (e.g., max 10 RFQs per month per customer)
- RLS policies enforce ownership
- Zod validation enforces consent

---

## Success Metrics

**Phase 1-3 Complete**:
- Customers can create RFQs
- RFQs appear in workshop marketplace
- Workshops can bid (existing flow)

**Phase 4-5 Complete**:
- Customers can compare bids
- Customers can accept bids
- Workshops receive acceptance notifications

**Phase 6 Complete**:
- All notifications working
- UX polished (countdowns, badges, empty states)

**Production Success**:
- 10+ customer-created RFQs per week
- 80%+ of customer RFQs receive at least 1 bid
- 60%+ of customer RFQs result in accepted bid
- Zero errors in Sentry related to RFQ creation

---

## Testing Strategy

### Unit Tests

**Files to Test**:
- `src/lib/rfq/customerRfqValidation.ts` - Zod schema validation
- `src/lib/rfq/createCustomerRfq.ts` - Business logic

**Test Cases**:
- ✅ Valid RFQ creation passes validation
- ✅ Missing required fields fail validation
- ✅ Invalid budget range fails validation
- ✅ Missing consent fails validation
- ✅ Invalid vehicle ID fails validation

### Integration Tests

**Test Scenarios**:
1. **Customer creates RFQ**:
   - POST `/api/rfq/create` → 201 Created
   - Verify `diagnostic_session` created
   - Verify `workshop_escalation_queue` created
   - Verify `workshop_rfq_marketplace` created
   - Verify RFQ appears in `/api/rfq/my-rfqs`
   - Verify RFQ appears in `/api/rfq/marketplace` (workshop view)

2. **Workshop bids on customer RFQ**:
   - POST `/api/rfq/bids` → 201 Created
   - Verify bid created
   - Verify customer notified
   - Verify bid appears in `/api/rfq/[rfqId]/bids`

3. **Customer accepts bid**:
   - POST `/api/rfq/[rfqId]/accept-bid` → 200 OK
   - Verify bid accepted
   - Verify other bids rejected
   - Verify RFQ status updated
   - Verify workshop notified
   - Verify escalation queue updated

### E2E Tests (Playwright)

**User Flows**:
1. Customer creates RFQ → Workshop bids → Customer accepts
2. Customer creates RFQ → No bids → Expires after deadline
3. Customer creates RFQ → Multiple bids → Customer compares → Accepts best

---

## Rollout Plan

### Phase 1: Internal Testing (1 week)
- Enable flag for test accounts only
- Create 5-10 test RFQs
- Verify workshop bidding works
- Verify bid acceptance works
- Fix any bugs

### Phase 2: Beta Testing (2 weeks)
- Enable flag for 10% of customers (invite-only)
- Monitor Sentry for errors
- Gather user feedback
- Iterate on UX

### Phase 3: General Availability (4 weeks)
- Enable flag for 50% of customers (A/B test)
- Compare RFQ conversion rates vs mechanic-escalated
- Monitor workshop bid volume
- Gradually increase to 100%

---

## Open Questions

1. **Rate Limiting**: Should we limit RFQs per customer per month?
   - Recommendation: Yes, max 10 per month to prevent spam

2. **Bid Editing**: Should workshops be able to edit bids before customer accepts?
   - Recommendation: Yes, but only if status = 'pending'

3. **RFQ Cancellation**: Should customers be able to cancel RFQs after bids received?
   - Recommendation: Yes, but notify all bidding workshops

4. **Partial Bids**: What if workshop only wants to do part of the work?
   - Recommendation: Allow in "alternative_options" field

5. **Follow-Up Questions**: Should workshops be able to ask clarifying questions?
   - Recommendation: Phase 7 feature (messaging system)

---

## Appendix A: Database Queries for Verification

### Verify Customer RFQ Created
```sql
SELECT
  rfq.id,
  rfq.title,
  rfq.customer_id,
  rfq.escalating_mechanic_id, -- Should be NULL
  rfq.status,
  rfq.bid_count,
  rfq.created_at,
  eq.escalation_type, -- Should be 'rfq_marketplace'
  ds.status -- Should be 'customer_rfq_created'
FROM workshop_rfq_marketplace rfq
JOIN workshop_escalation_queue eq ON eq.id = rfq.escalation_queue_id
JOIN diagnostic_sessions ds ON ds.id = rfq.diagnostic_session_id
WHERE rfq.customer_id = $1
ORDER BY rfq.created_at DESC;
```

### Verify Workshop Can See Customer RFQ
```sql
SELECT
  rfq.id,
  rfq.title,
  rfq.issue_category,
  rfq.vehicle_make,
  rfq.vehicle_model,
  rfq.bid_deadline,
  rfq.bid_count,
  rfq.max_bids,
  rfq.escalating_mechanic_id -- NULL means customer-direct
FROM workshop_rfq_marketplace rfq
WHERE rfq.status = 'open'
ORDER BY rfq.created_at DESC;
```

### Verify Bid Acceptance
```sql
SELECT
  rfq.id AS rfq_id,
  rfq.status, -- Should be 'bid_accepted'
  rfq.accepted_bid_id,
  rfq.accepted_at,
  b.id AS bid_id,
  b.workshop_id,
  b.status AS bid_status, -- Should be 'accepted'
  eq.winning_workshop_id, -- Should match b.workshop_id
  eq.customer_selected_bid_at
FROM workshop_rfq_marketplace rfq
JOIN workshop_rfq_bids b ON b.id = rfq.accepted_bid_id
JOIN workshop_escalation_queue eq ON eq.id = rfq.escalation_queue_id
WHERE rfq.id = $1;
```

---

## Appendix B: Code Samples

### Feature Flag Check (Reusable)
```typescript
// src/lib/flags.ts
export async function requireCustomerRfqFeature() {
  const enabled = await isFeatureEnabled('ENABLE_CUSTOMER_RFQ');
  if (!enabled) {
    throw new Error('Customer RFQ feature is not enabled');
  }
}
```

### Customer RFQ Creation (Core Logic)
```typescript
// src/lib/rfq/createCustomerRfq.ts
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function createCustomerRfq(customerId: string, data: CreateRfqInput) {
  const supabase = getSupabaseServer();

  // 1. Create diagnostic session
  const { data: session } = await supabase
    .from('diagnostic_sessions')
    .insert({
      customer_id: customerId,
      vehicle_id: data.vehicle_id,
      status: 'customer_rfq_created',
      metadata: { source: 'customer_direct_rfq' }
    })
    .select()
    .single();

  // 2. Create escalation queue
  const { data: escalation } = await supabase
    .from('workshop_escalation_queue')
    .insert({
      escalating_mechanic_id: null, // NULL for customer-direct
      customer_id: customerId,
      diagnostic_session_id: session.id,
      escalation_type: 'rfq_marketplace',
      escalation_status: 'pending',
      status: 'pending',
      rfq_posted_at: new Date().toISOString(),
      rfq_bid_deadline: data.bid_deadline,
      metadata: { source: 'customer_direct' }
    })
    .select()
    .single();

  // 3. Create RFQ marketplace record
  const { data: rfq } = await supabase
    .from('workshop_rfq_marketplace')
    .insert({
      escalation_queue_id: escalation.id,
      customer_id: customerId,
      diagnostic_session_id: session.id,
      escalating_mechanic_id: null, // KEY: NULL
      title: data.title,
      description: data.description,
      diagnosis_summary: data.description,
      // ... rest of fields
      status: 'open',
      customer_consent_to_share_info: data.customer_consent,
      customer_consent_timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  // 4. Link RFQ to escalation queue
  await supabase
    .from('workshop_escalation_queue')
    .update({ rfq_marketplace_id: rfq.id })
    .eq('id', escalation.id);

  return rfq;
}
```

---

## Conclusion

This plan enables customer-direct RFQ creation to unlock the fully-built workshop bidding marketplace. The implementation is:

- ✅ Feature-flagged (kill-switch available)
- ✅ Additive only (zero breaking changes)
- ✅ Reuses existing infrastructure
- ✅ 6 phases with verification checklists
- ✅ Commit to main after each phase approval

**Next Step**: Await user command to proceed with Phase 1.

---

**STOP**: Plan complete. Awaiting approval to proceed.

**Command to Continue**: `APPROVE RFQ-CUSTOMER PLAN — PROCEED TO PHASE 1`
