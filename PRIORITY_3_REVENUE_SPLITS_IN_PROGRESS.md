# ⏳ Priority 3: Workshop Revenue Splits - IN PROGRESS

**Status:** 🟡 **FOUNDATION COMPLETE** - Integration Pending
**Date Started:** January 27, 2025
**Estimated Time:** 5-7 days
**Time Invested:** ~2 days (foundation)
**Dependencies:** Priority 1 & Priority 2

---

## 📊 Implementation Status

### ✅ COMPLETED (Foundation - 40%)
- [x] Database schema for revenue tracking
- [x] Revenue split calculation logic
- [x] Workshop Stripe Connect onboarding API
- [x] Earnings tracking tables
- [x] Helper functions and views
- [x] Build verification

### 🟡 IN PROGRESS (0%)
- [ ] Integrate earnings into session completion
- [ ] Update existing payout logic
- [ ] Workshop earnings dashboard
- [ ] Mechanic earnings dashboard
- [ ] Payout processing automation

### ⏸️ PENDING (60%)
- [ ] Workshop earnings API endpoints
- [ ] Mechanic earnings API endpoints
- [ ] Payout scheduling/automation
- [ ] Workshop dashboard UI updates
- [ ] Revenue split testing
- [ ] Documentation for workshop onboarding

---

## 🎯 What Has Been Implemented

### **1. Database Schema (COMPLETE)**
**File:** [`supabase/migrations/20250127000002_workshop_revenue_splits.sql`](supabase/migrations/20250127000002_workshop_revenue_splits.sql)

#### **Tables Created:**

**`workshop_earnings`** - Tracks workshop revenue:
```sql
CREATE TABLE workshop_earnings (
  id UUID PRIMARY KEY,
  workshop_id UUID NOT NULL,
  session_id UUID,
  session_request_id UUID,
  mechanic_id UUID,
  payment_intent_id TEXT,

  -- Financial
  gross_amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  workshop_net_cents INTEGER NOT NULL,
  platform_fee_percentage NUMERIC(5, 2),

  -- Payout tracking
  payout_status TEXT DEFAULT 'pending',
  payout_id TEXT,
  payout_date TIMESTAMPTZ,
  payout_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`mechanic_earnings`** - Tracks mechanic payouts:
```sql
CREATE TABLE mechanic_earnings (
  id UUID PRIMARY KEY,
  mechanic_id UUID NOT NULL,
  workshop_id UUID,  -- NULL for independent mechanics
  workshop_earning_id UUID,
  session_id UUID,
  payment_intent_id TEXT,

  -- Financial
  gross_amount_cents INTEGER NOT NULL,
  mechanic_net_cents INTEGER NOT NULL,
  workshop_fee_cents INTEGER DEFAULT 0,
  platform_fee_cents INTEGER DEFAULT 0,

  -- Payout tracking
  payout_status TEXT DEFAULT 'pending',
  payout_id TEXT,
  payout_date TIMESTAMPTZ,
  payout_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **Organization Table Updates:**
```sql
ALTER TABLE organizations
ADD COLUMN stripe_connect_account_id TEXT UNIQUE,
ADD COLUMN stripe_onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN stripe_charges_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN stripe_details_submitted BOOLEAN DEFAULT FALSE,
ADD COLUMN platform_fee_percentage NUMERIC(5, 2) DEFAULT 20.00,
ADD COLUMN custom_fee_agreement BOOLEAN DEFAULT FALSE;
```

---

### **2. Revenue Split Logic (COMPLETE)**

#### **Function: `calculate_revenue_split()`**
**Purpose:** Calculates platform fee, workshop share, and mechanic share

**Three Scenarios Handled:**

**Scenario 1: Workshop Mechanic**
```
Session: $100 (customer pays)
Platform Fee (20%): $20
Workshop Net: $80
Mechanic: Paid separately by workshop (out of their $80)

Result:
- platform_fee_cents: 2000
- workshop_net_cents: 8000
- mechanic_net_cents: 0 (workshop handles this)
```

**Scenario 2: Independent Mechanic**
```
Session: $100 (customer pays)
Platform Fee (20%): $20
Workshop Net: $0
Mechanic Net: $80

Result:
- platform_fee_cents: 2000
- workshop_net_cents: 0
- mechanic_net_cents: 8000
```

**Scenario 3: Cross-Workshop (Hybrid Routing)**
```
Session: $100 (customer selected Workshop A, but Workshop B mechanic accepted)
Platform Fee (20%): $20
Workshop A Referral Fee (10%): $10
Mechanic Net: $70

Result:
- platform_fee_cents: 2000
- workshop_net_cents: 1000 (referral to Workshop A)
- mechanic_net_cents: 7000 (to Workshop B mechanic)
```

#### **Function: `record_session_earnings()`**
**Purpose:** Automatically records earnings when session completes

**Usage:**
```sql
-- Called when session ends with payment
SELECT record_session_earnings(
  'session-uuid',
  'payment-intent-id',
  10000  -- $100.00 in cents
);
```

**What it does:**
1. Looks up session details and assigned mechanic/workshop
2. Calls `calculate_revenue_split()` to determine split
3. Creates `workshop_earnings` record if workshop involved
4. Creates `mechanic_earnings` record if mechanic gets direct payment
5. Links records together for audit trail

---

### **3. Workshop Stripe Connect API (COMPLETE)**
**File:** [`src/app/api/workshop/stripe/onboard/route.ts`](src/app/api/workshop/stripe/onboard/route.ts)

**Endpoints:**

#### **POST /api/workshop/stripe/onboard**
Creates Stripe Connect Express account for workshop

**Flow:**
1. Authenticates workshop owner/admin
2. Creates Stripe Express account (or retrieves existing)
3. Generates onboarding link
4. Returns URL for redirect

**Request:**
```bash
POST /api/workshop/stripe/onboard
# Must be authenticated as workshop owner/admin
```

**Response:**
```json
{
  "url": "https://connect.stripe.com/express/...",
  "account_id": "acct_..."
}
```

#### **GET /api/workshop/stripe/onboard**
Checks Stripe Connect status

**Response:**
```json
{
  "connected": true,
  "onboarding_completed": true,
  "charges_enabled": true,
  "payouts_enabled": true,
  "account_id": "acct_..."
}
```

---

### **4. Analytics Views (COMPLETE)**

#### **`workshop_earnings_summary`**
Aggregated workshop earnings:
```sql
SELECT *
FROM workshop_earnings_summary
WHERE workshop_id = 'uuid';

-- Returns:
{
  workshop_id,
  workshop_name,
  total_sessions,
  total_gross_cents,
  total_platform_fee_cents,
  total_net_cents,
  paid_out_cents,
  pending_payout_cents,
  avg_platform_fee_percentage,
  first_earning_date,
  last_earning_date
}
```

#### **`mechanic_earnings_summary`**
Aggregated mechanic earnings:
```sql
SELECT *
FROM mechanic_earnings_summary
WHERE mechanic_id = 'uuid';

-- Returns:
{
  mechanic_id,
  mechanic_name,
  workshop_id,
  workshop_name,
  total_sessions,
  total_gross_cents,
  total_net_cents,
  total_platform_fee_cents,
  total_workshop_fee_cents,
  paid_out_cents,
  pending_payout_cents
}
```

---

## 🔧 What Needs To Be Done

### **Phase 1: Integration (HIGH PRIORITY)**

#### **1. Update Session End Route**
**File:** [`src/app/api/sessions/[id]/end/route.ts`](src/app/api/sessions/[id]/end/route.ts:297-382)

**Current Code (lines 297-382):**
```typescript
// Calculate mechanic earnings (only for sessions that actually happened)
const planKey = session.plan as PlanKey
const planPrice = PRICING[planKey]?.priceCents || 0
const mechanicEarningsCents = Math.round(planPrice * MECHANIC_SHARE)

// ... creates direct Stripe transfer to mechanic
```

**Needs to be replaced with:**
```typescript
// NEW: Use record_session_earnings() function
if (session.started_at && planPrice > 0) {
  // Get payment intent ID from session metadata
  const paymentIntentId = (session.metadata as any)?.payment_intent_id || null

  // Record earnings (handles all splits automatically)
  await supabaseAdmin.rpc('record_session_earnings', {
    p_session_id: sessionId,
    p_payment_intent_id: paymentIntentId,
    p_amount_cents: planPrice,
  })

  console.log(`[end session] Recorded earnings for session ${sessionId}: $${(planPrice / 100).toFixed(2)}`)
}
```

**Impact:**
- Replaces simple 70/30 split with intelligent workshop-aware splits
- Automatically tracks earnings in proper tables
- Supports all 3 routing scenarios (workshop/independent/hybrid)
- Maintains audit trail

---

#### **2. Create Workshop Earnings API**
**File:** `src/app/api/workshop/earnings/route.ts` (NEW)

**Purpose:** Allow workshops to view their earnings

**Endpoint: GET /api/workshop/earnings**
```typescript
// Returns workshop's earnings with filters
GET /api/workshop/earnings?status=pending&limit=50&offset=0

Response:
{
  ok: true,
  earnings: [
    {
      id: "uuid",
      session_id: "uuid",
      mechanic_name: "John Doe",
      gross_amount_cents: 10000,
      platform_fee_cents: 2000,
      workshop_net_cents: 8000,
      payout_status: "pending",
      created_at: "2025-01-27T..."
    }
  ],
  summary: {
    total_pending_cents: 50000,
    total_paid_cents: 120000,
    session_count: 23
  }
}
```

---

#### **3. Create Mechanic Earnings API**
**File:** `src/app/api/mechanic/earnings/route.ts` (NEW)

**Purpose:** Allow mechanics to view their earnings

**Endpoint: GET /api/mechanic/earnings**
```typescript
// Returns mechanic's earnings
GET /api/mechanic/earnings?status=pending

Response:
{
  ok: true,
  earnings: [
    {
      id: "uuid",
      session_id: "uuid",
      workshop_name: "AutoPro" or null,
      gross_amount_cents: 10000,
      mechanic_net_cents: 8000,
      platform_fee_cents: 2000,
      workshop_fee_cents: 0,
      payout_status: "paid",
      payout_date: "2025-01-25T...",
      created_at: "2025-01-27T..."
    }
  ],
  summary: {
    total_pending_cents: 25000,
    total_paid_cents: 85000
  }
}
```

---

### **Phase 2: Dashboard UIs (MEDIUM PRIORITY)**

#### **4. Workshop Dashboard - Earnings Tab**
**Location:** Add to [`src/app/workshop/dashboard/page.tsx`](src/app/workshop/dashboard/page.tsx)

**Features:**
- Display pending earnings
- Show paid-out history
- Stripe Connect onboarding status
- "Complete Onboarding" button if not done
- Export earnings to CSV

#### **5. Mechanic Dashboard - Earnings Section**
**Location:** Add to mechanic dashboard

**Features:**
- Display pending/paid earnings
- Filter by date range
- Show per-session breakdown
- Stripe Connect status

---

### **Phase 3: Payout Processing (LOWER PRIORITY)**

#### **6. Manual Payout Processing**
**File:** `src/app/api/admin/payouts/process/route.ts` (NEW)

**Purpose:** Admin triggers manual payouts

**Logic:**
```typescript
// For each pending earning:
// 1. Create Stripe transfer to workshop's Connect account
// 2. Update payout_status to 'processing'
// 3. On success: payout_status = 'paid', record payout_id
// 4. On failure: payout_status = 'failed', record error
```

#### **7. Automated Payout Scheduling (Optional)**
**File:** `src/app/api/cron/process-payouts/route.ts` (NEW)

**Purpose:** Weekly/monthly automated payouts

**Schedule Options:**
- Weekly: Every Friday
- Bi-weekly: 1st and 15th
- Monthly: Last day of month

**Minimum Payout Threshold:** e.g., $50

---

## 📊 Revenue Split Examples

### **Example 1: Workshop Mechanic Session**
```
Customer pays: $100 for video15
Workshop: AutoPro Mechanics
Mechanic: John (works for AutoPro)
Platform fee: 20%

Split:
  Platform: $20 (20%)
  Workshop (AutoPro): $80 (80%)
  Mechanic (John): Paid by AutoPro separately

Database Records:
  workshop_earnings:
    - gross_amount_cents: 10000
    - platform_fee_cents: 2000
    - workshop_net_cents: 8000
    - payout_status: pending

  mechanic_earnings:
    - (no record - workshop handles mechanic payment internally)
```

### **Example 2: Independent Mechanic**
```
Customer pays: $100
Workshop: None (broadcast routing)
Mechanic: Sarah (independent)
Platform fee: 20%

Split:
  Platform: $20 (20%)
  Workshop: $0
  Mechanic (Sarah): $80 (80%)

Database Records:
  workshop_earnings:
    - (no record - no workshop involved)

  mechanic_earnings:
    - gross_amount_cents: 10000
    - mechanic_net_cents: 8000
    - platform_fee_cents: 2000
    - payout_status: pending
```

### **Example 3: Cross-Workshop (Hybrid Routing)**
```
Customer pays: $100
Customer selected: Workshop A
Mechanic accepted: Mike (from Workshop B)
Platform fee: 20%
Referral fee: 10% to Workshop A

Split:
  Platform: $20 (20%)
  Workshop A (referral): $10 (10%)
  Mechanic (Mike from Workshop B): $70 (70%)

Database Records:
  workshop_earnings (Workshop A):
    - gross_amount_cents: 10000
    - platform_fee_cents: 0 (not charged on referral)
    - workshop_net_cents: 1000 (referral fee)
    - payout_status: pending

  mechanic_earnings (Mike):
    - gross_amount_cents: 10000
    - mechanic_net_cents: 7000
    - platform_fee_cents: 2000
    - workshop_fee_cents: 1000 (to Workshop A)
    - payout_status: pending
```

---

## 🚀 How to Apply What's Been Completed

### **Step 1: Apply Database Migration**

```bash
# Option A: Via Supabase CLI
npx supabase db push

# Option B: Via Supabase Studio (recommended)
# 1. Go to https://app.supabase.com/project/YOUR_PROJECT/sql
# 2. Copy contents of: supabase/migrations/20250127000002_workshop_revenue_splits.sql
# 3. Click "Run"
# 4. Verify success in console
```

### **Step 2: Verify Migration**

```sql
-- Check new tables exist
SELECT * FROM workshop_earnings LIMIT 1;
SELECT * FROM mechanic_earnings LIMIT 1;

-- Check organizations table updated
SELECT
  id,
  name,
  stripe_connect_account_id,
  stripe_onboarding_completed,
  platform_fee_percentage
FROM organizations
WHERE organization_type = 'workshop'
LIMIT 5;

-- Test revenue split function
SELECT * FROM calculate_revenue_split(
  10000,  -- $100.00
  'WORKSHOP_UUID_HERE',
  'MECHANIC_UUID_HERE'
);
-- Should return: platform_fee_cents, workshop_net_cents, mechanic_net_cents, etc.

-- Check views
SELECT * FROM workshop_earnings_summary;
SELECT * FROM mechanic_earnings_summary;
```

### **Step 3: Test Workshop Stripe Onboarding**

```bash
# Start the app
npm run dev

# As a workshop owner/admin, call:
POST http://localhost:3001/api/workshop/stripe/onboard

# Expected response:
{
  "url": "https://connect.stripe.com/express/...",
  "account_id": "acct_..."
}

# Visit the URL to complete Stripe onboarding
# Then check status:
GET http://localhost:3001/api/workshop/stripe/onboard

# Expected:
{
  "connected": true,
  "onboarding_completed": true,
  "payouts_enabled": true
}
```

---

## ⚠️ Integration Checklist

To complete Priority 3, these tasks remain:

- [ ] **CRITICAL:** Update `/api/sessions/[id]/end` to call `record_session_earnings()`
- [ ] Create `/api/workshop/earnings` endpoint
- [ ] Create `/api/mechanic/earnings` endpoint
- [ ] Add Stripe Connect button to workshop dashboard
- [ ] Add earnings tab to workshop dashboard
- [ ] Add earnings section to mechanic dashboard
- [ ] Create admin payout processing endpoint
- [ ] Test all 3 revenue split scenarios
- [ ] Update existing sessions to migrate payout data (optional)
- [ ] Document workshop onboarding process

---

## 🐛 Known Issues

**None currently.**

Migration and API endpoints compile successfully. Integration testing pending.

---

## 📚 Related Documentation

- Migration file: [`supabase/migrations/20250127000002_workshop_revenue_splits.sql`](supabase/migrations/20250127000002_workshop_revenue_splits.sql)
- Workshop Stripe API: [`src/app/api/workshop/stripe/onboard/route.ts`](src/app/api/workshop/stripe/onboard/route.ts)
- Session end route: [`src/app/api/sessions/[id]/end/route.ts`](src/app/api/sessions/[id]/end/route.ts:297-382)
- Mechanic Stripe API (reference): [`src/app/api/mechanics/stripe/onboard/route.ts`](src/app/api/mechanics/stripe/onboard/route.ts)
- Priority 1: [`PRIORITY_1_WORKSHOP_LINKING_COMPLETE.md`](PRIORITY_1_WORKSHOP_LINKING_COMPLETE.md)
- Priority 2: [`PRIORITY_2_SMART_ROUTING_COMPLETE.md`](PRIORITY_2_SMART_ROUTING_COMPLETE.md)

---

## 🎯 Next Steps

### **To Complete Priority 3:**
1. Integrate `record_session_earnings()` into session completion
2. Create workshop and mechanic earnings API endpoints
3. Build dashboard UIs for viewing earnings
4. Test all revenue split scenarios
5. Implement payout processing

### **Estimated Time Remaining:** 3-5 days

### **Then Move to Priority 4:** Customer Workshop Directory UI

---

## ✅ What's Ready to Use

- ✅ Database schema for tracking all earnings
- ✅ Revenue split calculation function (all 3 scenarios)
- ✅ Workshop Stripe Connect onboarding
- ✅ Earnings summary views for analytics
- ✅ Automatic earnings recording function
- ✅ Build verification passed

**Foundation is solid. Integration is straightforward and well-defined.** 🚀
