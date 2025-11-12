# QUOTES & RFQ SYSTEM - COMPREHENSIVE INVESTIGATION REPORT
## Updated: January 11, 2025

**Investigation Scope**: Database Schema, API Endpoints, Frontend Components, Data Consistency, Dependencies
**Status**: COMPLETE - Fresh Investigation After Recent Changes

---

## 🎯 EXECUTIVE SUMMARY

After recent code changes, here is the definitive state of your Quotes & RFQ system:

### System Overview

Your platform implements **TWO distinct pricing/quote systems**:

1. **DIRECT QUOTES SYSTEM** ✅ - Mechanic/workshop sends quote directly to customer
2. **RFQ MARKETPLACE SYSTEM** ⚠️ - Customer posts RFQ, multiple workshops bid competitively

### Critical Findings

#### ✅ WHAT'S WORKING
- **Direct Quotes System**: Fully functional (repair_quotes table exists and works)
- **Workshop Escalation**: Virtual mechanics can escalate to workshops (workshop_escalation_queue exists)
- **Core APIs**: 12 quote APIs functional, infrastructure in place
- **Frontend Pages**: Most customer/mechanic/workshop pages implemented

#### ⚠️ CRITICAL ISSUES DISCOVERED

**1. RFQ MARKETPLACE TABLES DON'T EXIST** 🚨
- `workshop_rfq_marketplace` - NOT in production
- `workshop_rfq_bids` - NOT in production
- `workshop_rfq_views` - NOT in production
- **Impact**: 16 RFQ APIs will FAIL, multiple frontend pages broken

**2. BROKEN MIGRATION DEPENDENCY** 🚨
- Migration `20251109030000_add_mechanic_referral_system.sql` references non-existent RFQ tables
- `mechanic_referral_earnings` table creation will FAIL
- Foreign keys point to tables that don't exist

**3. MISSING CRITICAL FRONTEND PAGES** ⚠️
- `/customer/rfq/[rfqId]/bids` - Customers can't compare bids
- `/workshop/rfq/marketplace/[rfqId]` - Workshops can't submit bids
- Result: **RFQ workflow completely broken from user perspective**

**4. SECURITY VULNERABILITIES** 🔴
- `/api/quotes/[quoteId]` - No authorization check
- `/api/quotes/[quoteId]/respond` - No authorization check
- Anyone with a quote ID can view/respond to any quote

**5. DATA INCONSISTENCIES** ⚠️
- Referral fee: Database default 5%, UI shows 2%, migration uses 0.02 (2%)
- Workshop quotes page: Hardcoded placeholder workshop_id

### Quick Stats

| Metric | Count | Status |
|--------|-------|--------|
| **Database Tables** | 4 working, 3 missing | ⚠️ |
| **API Endpoints** | 10 functional, 16 broken | ⚠️ |
| **Frontend Pages** | 12 working, 4 missing | ⚠️ |
| **Security Issues** | 2 critical | 🔴 |
| **Data Issues** | 3 major inconsistencies | ⚠️ |

---

## 📊 TABLE OF CONTENTS

1. [Database Schema Analysis](#1-database-schema-analysis)
2. [API Endpoints Status](#2-api-endpoints-status)
3. [Frontend Components Status](#3-frontend-components-status)
4. [Data Consistency Issues](#4-data-consistency-issues)
5. [Source of Truth Analysis](#5-source-of-truth-analysis)
6. [Dependency Map](#6-dependency-map)
7. [Impact Analysis](#7-impact-analysis)
8. [Critical Recommendations](#8-critical-recommendations)

---

## 1. DATABASE SCHEMA ANALYSIS

### 1.1 Tables That EXIST in Production ✅

#### `repair_quotes` - Direct Quote System
**Status**: ✅ FULLY FUNCTIONAL
**Purpose**: Main quote system for mechanic/workshop → customer quotes

**Complete Schema**:
```sql
CREATE TABLE repair_quotes (
  -- Identity
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),

  -- Relationships
  customer_id               UUID REFERENCES profiles(id),
  vehicle_id                UUID REFERENCES vehicles(id),
  diagnostic_session_id     UUID REFERENCES diagnostic_sessions(id),
  in_person_visit_id        UUID REFERENCES in_person_visits(id),

  -- Provider (one of these will be set)
  workshop_id               UUID REFERENCES organizations(id),
  mechanic_id               UUID REFERENCES mechanics(id),
  diagnosing_mechanic_id    UUID REFERENCES mechanics(id),
  quoting_user_id           UUID REFERENCES mechanics(id),

  -- Quote Details
  line_items                JSONB NOT NULL,
  labor_cost                DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  parts_cost                DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  subtotal                  DECIMAL(10,2) NOT NULL,

  -- Platform Fees
  platform_fee_percent      DECIMAL(5,2) NOT NULL,
  platform_fee_amount       DECIMAL(10,2) NOT NULL,
  fee_rule_applied          TEXT,

  -- Final Amounts
  customer_total            DECIMAL(10,2) NOT NULL,
  provider_receives         DECIMAL(10,2) NOT NULL,

  -- Status & Timestamps
  status                    TEXT DEFAULT 'pending',
  sent_at                   TIMESTAMPTZ,
  viewed_at                 TIMESTAMPTZ,
  customer_responded_at     TIMESTAMPTZ,
  work_started_at           TIMESTAMPTZ,
  work_completed_at         TIMESTAMPTZ,

  -- Customer Response
  customer_response         TEXT,  -- 'approved', 'declined', 'requested_changes'
  customer_notes            TEXT,
  decline_reason            TEXT,

  -- Modifications
  modification_reason       TEXT,
  previous_quote_id         UUID REFERENCES repair_quotes(id),
  is_modification           BOOLEAN DEFAULT false,

  -- Warranty
  warranty_days             INTEGER DEFAULT 90,
  warranty_expires_at       TIMESTAMPTZ,

  -- Notes
  notes                     TEXT,
  internal_notes            TEXT,
  estimated_completion_hours DECIMAL(5,2)
);
```

**Indexes**:
- `idx_repair_quotes_customer` ON (customer_id)
- `idx_repair_quotes_workshop` ON (workshop_id)
- `idx_repair_quotes_mechanic` ON (mechanic_id)
- `idx_repair_quotes_status` ON (status)
- `idx_repair_quotes_diagnostic` ON (diagnostic_session_id)
- `idx_repair_quotes_created` ON (created_at DESC)

**Status Values**:
```
pending → viewed → approved/declined/requested_changes
                → in_progress → completed/cancelled
```

**Used By**:
- Customer quotes dashboard
- Mechanic quotes dashboard
- Workshop quotes dashboard
- 12 API endpoints

---

#### `workshop_escalation_queue` - Workshop Escalation System
**Status**: ✅ FULLY FUNCTIONAL
**Purpose**: Virtual mechanics escalate diagnostics to workshops for repair quotes

**Complete Schema**:
```sql
CREATE TABLE workshop_escalation_queue (
  -- Identity
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),

  -- Relationships
  diagnostic_session_id     UUID NOT NULL REFERENCES diagnostic_sessions(id),
  customer_id               UUID NOT NULL REFERENCES profiles(id),
  escalating_mechanic_id    UUID NOT NULL REFERENCES mechanics(id),
  assigned_workshop_id      UUID REFERENCES organizations(id),
  assigned_to_advisor_id    UUID REFERENCES mechanics(id),

  -- Status
  status                    TEXT DEFAULT 'pending',
    -- pending → accepted → in_progress → quote_sent → declined/cancelled
  priority                  TEXT DEFAULT 'normal',  -- low, normal, high, urgent

  -- Assignment
  auto_assigned             BOOLEAN DEFAULT false,
  assignment_method         TEXT,  -- auto_match, mechanic_choice, partnership
  assigned_at               TIMESTAMPTZ,
  accepted_at               TIMESTAMPTZ,

  -- Issue Details (denormalized for quick access)
  vehicle_info              JSONB,
  issue_summary             TEXT,
  urgency                   TEXT,

  -- Mechanic Diagnosis
  diagnosis_summary         TEXT,
  recommended_services      TEXT[],
  diagnostic_photos         JSONB DEFAULT '[]',
  mechanic_notes            TEXT,

  -- Quote Tracking
  quote_created_at          TIMESTAMPTZ,
  quote_id                  UUID REFERENCES repair_quotes(id),
  declined_reason           TEXT,
  declined_at               TIMESTAMPTZ,

  -- Referral Fee (5% to mechanic when workshop completes job)
  referral_fee_percent      DECIMAL(5,2) DEFAULT 5.00,
  referral_fee_amount       DECIMAL(10,2),
  referral_paid             BOOLEAN DEFAULT false,
  referral_paid_at          TIMESTAMPTZ
);
```

**Indexes**:
- `idx_escalation_queue_workshop` ON (assigned_workshop_id)
- `idx_escalation_queue_status` ON (status)
- `idx_escalation_queue_priority` ON (priority)
- `idx_escalation_queue_mechanic` ON (escalating_mechanic_id)
- `idx_escalation_queue_advisor` ON (assigned_to_advisor_id)
- `idx_escalation_queue_customer` ON (customer_id)
- `idx_escalation_queue_created` ON (created_at)

**Workflow**:
```
Virtual Mechanic completes diagnostic
         ↓
Creates escalation (status: pending)
         ↓
Workshop receives and accepts (status: accepted)
         ↓
Workshop service advisor assigned
         ↓
Quote created (status: quote_sent)
         ↓
Customer accepts quote → Mechanic earns 5% referral fee
```

**Used By**:
- Virtual mechanic escalation flow
- Workshop escalation acceptance
- Referral fee tracking

---

#### `quote_modifications` - Mid-Repair Quote Changes
**Status**: ✅ FULLY FUNCTIONAL
**Purpose**: Track changes to quotes during repair work (additional issues found)

**Complete Schema**:
```sql
CREATE TABLE quote_modifications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Quote References
  original_quote_id     UUID REFERENCES repair_quotes(id),
  new_quote_id          UUID REFERENCES repair_quotes(id),

  -- Changes
  added_items           JSONB,
  removed_items         JSONB,
  modified_items        JSONB,

  -- Pricing Changes
  old_subtotal          DECIMAL(10,2) NOT NULL,
  new_subtotal          DECIMAL(10,2) NOT NULL,
  old_customer_total    DECIMAL(10,2) NOT NULL,
  new_customer_total    DECIMAL(10,2) NOT NULL,

  -- Reason & Response
  reason                TEXT NOT NULL,
  created_by            UUID REFERENCES mechanics(id),
  status                TEXT DEFAULT 'pending',  -- pending, approved, declined
  customer_response     TEXT,
  responded_at          TIMESTAMPTZ
);
```

**Indexes**:
- `idx_quote_modifications_original` ON (original_quote_id)
- `idx_quote_modifications_new` ON (new_quote_id)
- `idx_quote_modifications_status` ON (status)

**Used By**:
- Quote modification workflow (when additional repairs needed mid-job)

---

#### `repair_payments` - Payment Escrow System
**Status**: ✅ FULLY FUNCTIONAL
**Purpose**: Escrow system for repair payments

**Complete Schema**:
```sql
CREATE TABLE repair_payments (
  -- Identity
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),

  -- Relationships
  quote_id                  UUID REFERENCES repair_quotes(id),
  customer_id               UUID REFERENCES profiles(id),
  workshop_id               UUID REFERENCES organizations(id),
  mechanic_id               UUID REFERENCES mechanics(id),

  -- Amounts
  amount                    DECIMAL(10,2) NOT NULL,
  platform_fee              DECIMAL(10,2) NOT NULL,
  provider_amount           DECIMAL(10,2) NOT NULL,

  -- Escrow Status
  escrow_status             TEXT DEFAULT 'held',
    -- held → released/refunded/disputed/partially_refunded
  held_at                   TIMESTAMPTZ DEFAULT NOW(),
  released_at               TIMESTAMPTZ,
  refunded_at               TIMESTAMPTZ,

  -- Stripe References
  stripe_payment_intent_id  TEXT,
  stripe_transfer_id        TEXT,
  stripe_refund_id          TEXT,

  -- Disputes
  dispute_reason            TEXT,
  dispute_resolved_at       TIMESTAMPTZ
);
```

**Indexes**:
- `idx_repair_payments_quote` ON (quote_id)
- `idx_repair_payments_customer` ON (customer_id)
- `idx_repair_payments_provider` ON (workshop_id, mechanic_id)
- `idx_repair_payments_escrow_status` ON (escrow_status)
- `idx_repair_payments_stripe_intent` ON (stripe_payment_intent_id)

**Used By**:
- Quote payment checkout
- Payment webhooks
- Escrow release/refund

---

### 1.2 Tables That DON'T EXIST in Production ❌

#### `workshop_rfq_marketplace` - RFQ Marketplace
**Status**: ❌ NOT IN PRODUCTION
**Defined In**: `supabase/migrations_backup/20251206000002_phase6_workshop_rfq_marketplace.sql`
**Purpose**: RFQ marketplace where multiple workshops compete with bids

**Expected Schema** (from backup migration):
```sql
CREATE TABLE workshop_rfq_marketplace (
  -- Identity
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW(),

  -- Links to escalation system
  escalation_queue_id             UUID UNIQUE REFERENCES workshop_escalation_queue(id),

  -- Participants
  customer_id                     UUID NOT NULL REFERENCES profiles(id),
  diagnostic_session_id           UUID REFERENCES diagnostic_sessions(id),
  escalating_mechanic_id          UUID REFERENCES mechanics(id),

  -- RFQ Details
  title                           TEXT NOT NULL,
  description                     TEXT NOT NULL,
  issue_category                  TEXT,
  urgency                         TEXT DEFAULT 'normal',

  -- Vehicle Info (snapshot)
  vehicle_id                      UUID REFERENCES vehicles(id),
  vehicle_make                    TEXT,
  vehicle_model                   TEXT,
  vehicle_year                    INTEGER,
  vehicle_mileage                 INTEGER,
  vehicle_vin                     TEXT,

  -- Location
  customer_city                   TEXT,
  customer_province               TEXT,
  customer_postal_code            TEXT,
  latitude                        DOUBLE PRECISION,
  longitude                       DOUBLE PRECISION,

  -- Mechanic Diagnosis
  diagnosis_summary               TEXT NOT NULL,
  recommended_services            TEXT[],
  diagnostic_photos               JSONB,
  mechanic_notes                  TEXT,

  -- Media
  additional_photos               TEXT[],
  additional_videos               TEXT[],
  additional_documents            TEXT[],

  -- Budget
  budget_min                      DECIMAL(10,2),
  budget_max                      DECIMAL(10,2),

  -- Bidding Settings
  bid_deadline                    TIMESTAMPTZ NOT NULL,
  max_bids                        INTEGER DEFAULT 10,
  auto_expire_hours               INTEGER DEFAULT 72,

  -- Workshop Filters
  min_workshop_rating             DECIMAL(3,2),
  required_certifications         TEXT[],
  preferred_cities                TEXT[],
  max_distance_km                 INTEGER,

  -- Status
  status                          TEXT DEFAULT 'open',
  rfq_status                      TEXT DEFAULT 'active',  -- ⚠️ DUPLICATE FIELD

  -- Metrics
  view_count                      INTEGER DEFAULT 0,
  bid_count                       INTEGER DEFAULT 0,
  total_workshops_viewed          INTEGER DEFAULT 0,

  -- Winning Bid
  accepted_bid_id                 UUID REFERENCES workshop_rfq_bids(id),
  accepted_at                     TIMESTAMPTZ,

  -- PIPEDA Compliance
  customer_consent_to_share_info  BOOLEAN NOT NULL DEFAULT false,
  customer_consent_timestamp      TIMESTAMPTZ,
  referral_fee_disclosed          BOOLEAN NOT NULL DEFAULT false,
  referral_disclosure_text        TEXT,
  privacy_policy_version          TEXT DEFAULT 'v1',

  metadata                        JSONB DEFAULT '{}'
);
```

**Why It Doesn't Exist**:
- Migration file in `migrations_backup/` folder, not applied to production
- Never executed via `supabase db push` or similar
- Planned feature that was never deployed

**Impact of Missing Table**:
- 16 RFQ API endpoints will FAIL with "relation does not exist" error
- Multiple frontend pages will show errors
- Customer RFQ creation completely broken
- Workshop marketplace completely broken

---

#### `workshop_rfq_bids` - Workshop Bids on RFQs
**Status**: ❌ NOT IN PRODUCTION
**Purpose**: Workshop bids on RFQ marketplace requests

**Expected Schema** (from backup migration):
```sql
CREATE TABLE workshop_rfq_bids (
  -- Identity
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW(),

  -- Relationships
  rfq_marketplace_id              UUID NOT NULL REFERENCES workshop_rfq_marketplace(id),
  workshop_id                     UUID NOT NULL REFERENCES organizations(id),

  -- Workshop Info Snapshot
  workshop_name                   TEXT NOT NULL,
  workshop_city                   TEXT,
  workshop_rating                 DECIMAL(3,2),
  workshop_review_count           INTEGER,
  workshop_certifications         TEXT[],
  workshop_years_in_business      INTEGER,

  -- Bid Pricing (OCPA compliance - required breakdown)
  quote_amount                    DECIMAL(10,2) NOT NULL,
  parts_cost                      DECIMAL(10,2) NOT NULL,
  labor_cost                      DECIMAL(10,2) NOT NULL,
  shop_supplies_fee               DECIMAL(10,2),
  environmental_fee               DECIMAL(10,2),
  tax_amount                      DECIMAL(10,2),

  -- Service Details
  estimated_completion_days       INTEGER,
  estimated_labor_hours           DECIMAL(5,2),
  parts_warranty_months           INTEGER,
  labor_warranty_months           INTEGER,
  warranty_info                   TEXT,

  -- Proposal
  description                     TEXT NOT NULL,
  parts_needed                    TEXT,
  repair_plan                     TEXT,
  alternative_options             TEXT,

  -- Value-Adds
  earliest_availability_date      DATE,
  can_provide_loaner_vehicle      BOOLEAN DEFAULT false,
  can_provide_pickup_dropoff      BOOLEAN DEFAULT false,
  after_hours_service_available   BOOLEAN DEFAULT false,

  -- Submission Info
  submitted_by_user_id            UUID REFERENCES profiles(id),
  submitted_by_role               TEXT,

  -- Status
  status                          TEXT DEFAULT 'pending',
    -- pending → accepted/rejected/withdrawn/expired
  accepted_at                     TIMESTAMPTZ,
  rejected_at                     TIMESTAMPTZ,
  withdrawn_at                    TIMESTAMPTZ,
  withdrawn_reason                TEXT,

  -- Tracking
  viewed_by_customer              BOOLEAN DEFAULT false,
  first_viewed_at                 TIMESTAMPTZ,

  metadata                        JSONB DEFAULT '{}',

  UNIQUE(rfq_marketplace_id, workshop_id)  -- One bid per workshop per RFQ
);
```

**Impact of Missing Table**:
- Workshop bid submission API will FAIL
- Customer cannot view/compare bids
- Bid acceptance flow completely broken

---

#### `workshop_rfq_views` - View Tracking
**Status**: ❌ NOT IN PRODUCTION
**Purpose**: Track which workshops viewed each RFQ (analytics)

**Expected Schema**:
```sql
CREATE TABLE workshop_rfq_views (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  rfq_marketplace_id    UUID NOT NULL REFERENCES workshop_rfq_marketplace(id),
  workshop_id           UUID NOT NULL REFERENCES organizations(id),
  view_count            INTEGER DEFAULT 1,
  last_viewed_at        TIMESTAMPTZ DEFAULT NOW(),
  submitted_bid         BOOLEAN DEFAULT false,

  UNIQUE(rfq_marketplace_id, workshop_id)
);
```

**Impact of Missing Table**:
- View tracking will fail (but non-critical)
- Analytics incomplete

---

#### `mechanic_referral_earnings` - Referral Commissions
**Status**: ⚠️ UNCERTAIN - Migration attempted but may have failed
**Migration**: `20251109030000_add_mechanic_referral_system.sql`
**Purpose**: Track 2% referral commissions for mechanics

**Schema** (from migration):
```sql
CREATE TABLE mechanic_referral_earnings (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mechanic_id             UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  rfq_id                  UUID NOT NULL REFERENCES workshop_rfq_marketplace(id) ON DELETE CASCADE,
  diagnostic_session_id   UUID REFERENCES diagnostic_sessions(id) ON DELETE SET NULL,
  customer_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workshop_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bid_id                  UUID NOT NULL REFERENCES workshop_rfq_bids(id) ON DELETE CASCADE,

  bid_amount              DECIMAL(10,2) NOT NULL CHECK (bid_amount > 0),
  referral_rate           DECIMAL(5,4) NOT NULL DEFAULT 0.02,  -- 2%
  commission_amount       DECIMAL(10,2) NOT NULL CHECK (commission_amount >= 0),

  status                  TEXT NOT NULL DEFAULT 'pending',
  earned_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at                 TIMESTAMPTZ,
  payout_id               TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata                JSONB DEFAULT '{}',

  UNIQUE(rfq_id, mechanic_id)
);
```

**CRITICAL ISSUE**: This table has foreign keys to `workshop_rfq_marketplace` and `workshop_rfq_bids`, which DON'T EXIST!

**Result**: Migration will FAIL when executed, or table was never created

---

### 1.3 Database Views

#### `customer_quote_offers_v` - Unified Quotes View
**Status**: ⚠️ UNCERTAIN - Depends on missing RFQ tables
**Purpose**: Single customer-facing view combining direct quotes + RFQ bids

**Expected Definition** (from documentation):
```sql
CREATE VIEW customer_quote_offers_v
WITH (security_invoker = on) AS
SELECT
  -- From repair_quotes (direct quotes)
  rq.id as offer_id,
  'direct' as source,
  NULL as rfq_id,
  rq.diagnostic_session_id as session_id,
  rq.customer_id,
  rq.workshop_id,
  rq.customer_total as price_total,
  rq.labor_cost as price_labor,
  rq.parts_cost as price_parts,
  rq.platform_fee_amount as platform_fee,
  rq.status,
  rq.line_items,
  rq.warranty_days / 30 as warranty_months,
  ...
FROM repair_quotes rq
WHERE ...

UNION ALL

SELECT
  -- From workshop_rfq_bids (RFQ marketplace bids)
  wrb.id as offer_id,
  'rfq' as source,
  wrb.rfq_marketplace_id as rfq_id,
  wrm.diagnostic_session_id as session_id,
  wrm.customer_id,
  wrb.workshop_id,
  wrb.quote_amount as price_total,
  wrb.labor_cost as price_labor,
  wrb.parts_cost as price_parts,
  ...
FROM workshop_rfq_bids wrb
JOIN workshop_rfq_marketplace wrm ON wrm.id = wrb.rfq_marketplace_id
WHERE ...
;
```

**Impact if Missing**:
- Unified offers API `/api/customer/quotes/offers` will FAIL
- Admin quotes listing will FAIL
- Customer won't see combined view of all pricing options

---

### 1.4 Schema Migration Status

**Current Migration State**:
```
✅ Applied: repair_quotes system (Phase 1)
✅ Applied: workshop_escalation_queue (Phase 2)
✅ Applied: quote_modifications (Phase 3)
❌ NOT Applied: workshop_rfq_marketplace (Phase 6)
❌ NOT Applied: workshop_rfq_bids (Phase 6)
❌ NOT Applied: workshop_rfq_views (Phase 6)
⚠️ UNCERTAIN: mechanic_referral_earnings (depends on Phase 6)
⚠️ UNCERTAIN: customer_quote_offers_v view
```

**Reason for Non-Application**:
- Phase 6 migration file is in `supabase/migrations_backup/` folder
- Never moved to active `supabase/migrations/` folder
- Never executed via deployment pipeline

---

## 2. API ENDPOINTS STATUS

### 2.1 Quote APIs (12 Endpoints)

| # | Endpoint | Method | Status | Tables Used | Issues |
|---|----------|--------|--------|-------------|--------|
| 1 | `/api/quotes/[quoteId]` | GET | ✅ Working | repair_quotes | 🔴 No auth check |
| 2 | `/api/quotes/[quoteId]/respond` | PATCH | ✅ Working | repair_quotes | 🔴 No auth, TODOs incomplete |
| 3 | `/api/quotes/[quoteId]/payment/checkout` | POST | ✅ Working | repair_quotes, repair_payments | ✅ Has RLS |
| 4 | `/api/workshop/quotes` | GET | ✅ Working | repair_quotes | ✅ Has auth |
| 5 | `/api/workshop/quotes/create` | POST | ✅ Working | repair_quotes, diagnostic_sessions | ✅ Has auth |
| 6 | `/api/customer/quotes` | GET | ✅ Working | repair_quotes | ✅ Has auth |
| 7 | `/api/customer/quotes/offers` | GET | ⚠️ Partial | customer_quote_offers_v (view) | ⚠️ View may not exist |
| 8 | `/api/customer/quotes/offers/[offerId]` | GET | ⚠️ Partial | repair_quotes OR workshop_rfq_bids | ⚠️ RFQ path broken |
| 9 | `/api/customer/quotes/offers/[offerId]/accept` | POST | ⚠️ Partial | repair_quotes OR workshop_rfq_bids | ⚠️ RFQ path broken |
| 10 | `/api/mechanic/quotes` | GET | ✅ Working | repair_quotes | ✅ Has auth |
| 11 | `/api/admin/quotes` | GET | ⚠️ Partial | customer_quote_offers_v (view) | ⚠️ View may not exist |
| 12 | `/api/admin/quotes/[id]` | PATCH | ⚠️ Partial | repair_quotes OR workshop_rfq_bids | ⚠️ RFQ path broken |

**Summary**:
- **10 endpoints fully functional** (direct quotes path)
- **2 endpoints partially functional** (have RFQ fallback paths that will fail)

---

### 2.2 RFQ APIs (16 Endpoints)

| # | Endpoint | Method | Status | Tables Used | Issues |
|---|----------|--------|--------|-------------|--------|
| 13 | `/api/rfq/create` | POST | ❌ Broken | workshop_rfq_marketplace | ❌ Table missing |
| 14 | `/api/rfq/bids` (submit) | POST | ❌ Broken | workshop_rfq_bids | ❌ Table missing |
| 15 | `/api/rfq/bids` (list) | GET | ❌ Broken | workshop_rfq_bids | ❌ Table missing |
| 16 | `/api/rfq/my-rfqs` | GET | ❌ Broken | workshop_rfq_marketplace | ❌ Table missing |
| 17 | `/api/rfq/[rfqId]` | GET | ❌ Broken | workshop_rfq_marketplace | ❌ Table missing |
| 18 | `/api/rfq/marketplace` | GET | ❌ Broken | workshop_rfq_marketplace | ❌ Table missing |
| 19 | `/api/rfq/marketplace/[rfqId]` | GET | ❌ Broken | workshop_rfq_marketplace | ❌ Table missing |
| 20 | `/api/rfq/[rfqId]/accept` | POST | ❌ Broken | workshop_rfq_marketplace | ❌ Table missing |
| 21 | `/api/rfq/[rfqId]/bids` | GET | ❌ Broken | workshop_rfq_bids | ❌ Table missing |
| 22 | `/api/rfq/customer/create` | POST | ❌ Broken | workshop_rfq_marketplace | ❌ Table missing |
| 23 | `/api/rfq/[rfqId]/bids/[bidId]/payment/checkout` | POST | ❌ Broken | workshop_rfq_bids | ❌ Table missing |
| 24 | `/api/customer/rfq/drafts` | GET | ❌ Broken | workshop_rfq_marketplace | ❌ Table missing |
| 25 | `/api/customer/rfq/drafts/[draftId]/approve` | POST | ❌ Broken | workshop_rfq_marketplace | ❌ Table missing |
| 26 | `/api/sessions/[id]/rfq-status` | GET | ❌ Broken | workshop_rfq_marketplace | ❌ Table missing |
| 27 | `/api/mechanic/rfq/create-draft` | POST | ❌ Broken | workshop_rfq_marketplace | ❌ Table missing |
| 28 | `/api/cron/rfq-expiration` | GET | ❌ Broken | workshop_rfq_marketplace | ❌ Table missing, RPC missing |

**Summary**:
- **0 endpoints functional**
- **16 endpoints completely broken** (all require missing tables)

---

### 2.3 Security Issues in APIs

#### 🔴 CRITICAL: Unprotected Quote Endpoints

**1. GET `/api/quotes/[quoteId]`**
```typescript
// src/app/api/quotes/[quoteId]/route.ts
export async function GET(request: Request, { params }: { params: { quoteId: string } }) {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey) // ⚠️ BYPASSES RLS

  const { data: quote } = await supabaseAdmin
    .from('repair_quotes')
    .select('*')
    .eq('id', params.quoteId)
    .single()

  // ❌ NO AUTHORIZATION CHECK
  // Anyone with quote ID can view quote details

  return NextResponse.json({ quote })
}
```

**Vulnerability**: Anyone who knows or guesses a quote ID can:
- View customer personal info
- View workshop pricing details
- View internal notes
- View quote status

**Fix Required**:
```typescript
const user = await getUser() // Get authenticated user
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// Verify user is customer, workshop, or mechanic on this quote
if (quote.customer_id !== user.id &&
    quote.workshop_id !== user.workshop_id &&
    quote.mechanic_id !== user.mechanic_id &&
    user.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

**2. PATCH `/api/quotes/[quoteId]/respond`**
```typescript
// src/app/api/quotes/[quoteId]/respond/route.ts
export async function PATCH(request: Request, { params }: { params: { quoteId: string } }) {
  const { response, notes, decline_reason } = await request.json()

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  // ❌ NO AUTHORIZATION CHECK
  // Anyone can approve/decline any quote

  const { data } = await supabaseAdmin
    .from('repair_quotes')
    .update({
      customer_response: response,
      status: response === 'approved' ? 'approved' : 'declined',
      customer_responded_at: new Date().toISOString(),
      customer_notes: notes,
      decline_reason: decline_reason
    })
    .eq('id', params.quoteId)

  // TODO: Create payment intent with Stripe (not implemented)
  // TODO: Send notification to workshop (not implemented)

  return NextResponse.json({ success: true })
}
```

**Vulnerability**: Anyone can:
- Approve quotes they don't own → fraudulent work authorization
- Decline legitimate quotes → sabotage competitors
- Modify quote responses

**Fix Required**: Same as above - verify customer_id matches authenticated user

---

### 2.4 Incomplete Implementations

**PATCH `/api/quotes/[quoteId]/respond` - Lines 87-92**

**TODOs Not Implemented**:
```typescript
// TODO: Create payment intent with Stripe
// TODO: Create repair_payments record with escrow_status = 'held'
// TODO: Send notification to workshop about customer response
```

**Current Behavior**:
- Customer approves quote ✅
- Status updated to 'approved' ✅
- Payment NOT created ❌
- Workshop NOT notified ❌
- Customer must manually navigate to payment page ❌

**Expected Behavior**:
- Create payment record immediately
- Notify workshop of approval
- Redirect customer to payment checkout

---

## 3. FRONTEND COMPONENTS STATUS

### 3.1 Customer Pages

| Page | Path | Status | APIs Used | Issues |
|------|------|--------|-----------|--------|
| Quotes Dashboard | `/customer/quotes` | ✅ Working | `/api/quotes`, `/api/rfq/my-rfqs` | ⚠️ Bug line 108: calls non-existent `fetchQuotes()` |
| ❌ Quote Detail | `/customer/quotes/[quoteId]` | ❌ Missing | - | Page doesn't exist |
| Create RFQ | `/customer/rfq/create` | ✅ Working | `/api/rfq/create` | ⚠️ Will fail (API broken) |
| My RFQs | `/customer/rfq/my-rfqs` | ✅ Working | `/api/rfq/my-rfqs` | ⚠️ Will fail (API broken) |
| ❌ View Bids | `/customer/rfq/[rfqId]/bids` | ❌ Missing | - | Page doesn't exist, linked from My RFQs |
| RFQ Drafts | `/customer/rfq/drafts` | ✅ Working | `/api/customer/rfq/drafts` | ⚠️ Will fail (API broken) |
| ❌ Edit Draft | `/customer/rfq/drafts/[draftId]/edit` | ❌ Missing | - | Page doesn't exist, linked from Drafts |

**Working Pages**: 4/7 (57%)
**Missing Pages**: 3/7 (43%)

---

### 3.2 Mechanic Pages

| Page | Path | Status | APIs Used | Issues |
|------|------|--------|-----------|--------|
| Quotes Dashboard | `/mechanic/quotes` | ✅ Working | `/api/mechanic/quotes` | ✅ Fully functional |
| ❌ Create RFQ | `/mechanic/rfq/create/[sessionId]` | ❌ Missing | - | Page doesn't exist (modal exists) |
| Referrals | `/mechanic/referrals` | ✅ Working | `/api/mechanic/referrals` | ⚠️ Will fail (depends on mechanic_referral_earnings table) |

**Components**:
- `QuoteBuilderDrawer` ✅ Working - Creates direct quotes
- `EscalateToRfqModal` ✅ Working - Creates draft RFQs (but API will fail)

**Working Pages**: 2/3 (67%)
**Working Components**: 2/2 (100%)

---

### 3.3 Workshop Pages

| Page | Path | Status | APIs Used | Issues |
|------|------|--------|-----------|--------|
| Quotes Dashboard | `/workshop/quotes` | ⚠️ Partial | `/api/workshop/quotes` | 🔴 Line 82: Hardcoded `workshopId = 'placeholder'` |
| RFQ Marketplace | `/workshop/rfq/marketplace` | ✅ Working | `/api/rfq/marketplace` | ⚠️ Will fail (API broken) |
| ❌ RFQ Detail + Bid | `/workshop/rfq/marketplace/[rfqId]` | ❌ Missing | - | Page doesn't exist, linked from Marketplace |
| My Bids | `/workshop/rfq/my-bids` | ✅ Working | `/api/rfq/bids` | ⚠️ Will fail (API broken) |

**Working Pages**: 2/4 (50%)
**Missing Pages**: 1/4 (25%)
**Broken Pages**: 1/4 (25% - hardcoded placeholder)

---

### 3.4 Critical Missing Pages

**Impact on User Flows**:

1. **❌ `/customer/rfq/[rfqId]/bids`** - View & Compare Workshop Bids
   - **Impact**: Customer CANNOT compare workshop bids
   - **Linked From**: My RFQs page (line 229, 428)
   - **Breaks Flow**: Customer creates RFQ → Workshops bid → Customer can't see bids

2. **❌ `/workshop/rfq/marketplace/[rfqId]`** - View RFQ Detail & Submit Bid
   - **Impact**: Workshop CANNOT submit bids
   - **Linked From**: Marketplace browse page (line 294)
   - **Breaks Flow**: Workshop finds RFQ → Can't view details → Can't submit bid

3. **❌ `/customer/quotes/[quoteId]`** - Individual Quote Detail
   - **Impact**: Customer cannot view detailed quote breakdown
   - **Workaround**: Information shown in list view, but not detailed

4. **❌ `/customer/rfq/drafts/[draftId]/edit`** - Edit Draft Before Approval
   - **Impact**: Customer must approve or reject, cannot modify mechanic's draft
   - **Linked From**: Drafts page (line 213)

---

### 3.5 Frontend Bugs

**1. Customer Quotes Page - Line 108**
```typescript
// src/app/customer/quotes/page.tsx:108
const handleQuoteResponse = async (quoteId: string, response: string) => {
  // ... API call ...
  await fetchQuotes() // ❌ ERROR: Function doesn't exist
  // Should be: await fetchAllQuotes()
}
```
**Impact**: Runtime error when customer responds to quote

---

**2. Workshop Quotes Page - Line 82**
```typescript
// src/app/workshop/quotes/page.tsx:82
const workshopId = 'placeholder' // ❌ ERROR: Hardcoded
// TODO: This should come from auth

const url = `/api/workshop/quotes?workshop_id=${workshopId}&status=${filterStatus}`
```
**Impact**: Workshop sees no quotes or wrong quotes

---

## 4. DATA CONSISTENCY ISSUES

### 4.1 Multiple Sources of Truth

#### Issue 1: Referral Fee Percentage

**Conflict**:
| Source | Value | Location |
|--------|-------|----------|
| Database Default | **5.00%** | `workshop_escalation_queue.referral_fee_percent DEFAULT 5.00` |
| Migration | **0.02** (2%) | `mechanic_referral_earnings.referral_rate DEFAULT 0.02` |
| Frontend UI | **"2%"** | `EscalateToRfqModal` line 147: "You'll earn a 2% referral commission" |
| Documentation | **"2%"** | Migration comments state 2% |
| API Logic | **5%** | `workshop_escalation_queue` uses 5% for actual calculations |

**Current Behavior**:
- Virtual mechanic escalates diagnostic to workshop
- UI shows "You'll earn 2%"
- Database stores `referral_fee_percent = 5.00`
- Workshop completes job
- Mechanic gets paid **5%** (not the displayed 2%)

**Impact**:
- User sees 2% but gets 5% (good for mechanic, bad for platform margins)
- Or: Code expects 2% but database defaults to 5% (inconsistent calculations)
- Financial projections unreliable

**Solution Required**: Decide on single rate (probably 2% per documentation) and update:
- Database default in `workshop_escalation_queue`
- Frontend display
- All calculations

---

#### Issue 2: Duplicate Status Fields

**Table**: `workshop_rfq_marketplace` (if it existed)

**Conflict**:
```sql
status          TEXT DEFAULT 'open'
  -- Values: draft, open, under_review, bid_accepted, quote_sent, converted, expired, cancelled

rfq_status      TEXT DEFAULT 'active'
  -- Values: draft, active, bidding, accepted, completed, expired, cancelled
```

**Two status fields with overlapping but different values!**

**Usage in Code**:
- `/api/customer/rfq/drafts` filters by: `rfq_status = 'draft'`
- `/api/rfq/marketplace` filters by: `status = 'open'`
- Migration adds column: `ALTER TABLE workshop_rfq_marketplace ADD COLUMN rfq_status TEXT`

**Impact**: Confusion about which field is source of truth

**Solution Required**:
- Choose ONE status field
- Migrate all code to use single field
- Define clear status lifecycle

---

#### Issue 3: Quote Status Values Inconsistency

**Different status value sets across tables**:

**`repair_quotes.status`**:
```
pending, viewed, approved, declined, modified,
in_progress, completed, cancelled
```

**`workshop_escalation_queue.status`**:
```
pending, accepted, in_progress, quote_sent,
declined, cancelled
```

**`workshop_rfq_marketplace.status`** (planned):
```
draft, open, under_review, bid_accepted,
quote_sent, converted, expired, cancelled
```

**`workshop_rfq_bids.status`** (planned):
```
pending, accepted, rejected, withdrawn, expired
```

**Impact**:
- Unified view must map 4 different status sets
- Frontend status badges must handle all variations
- No single enum type enforcing consistency

---

### 4.2 Denormalized Data

**Vehicle Info in RFQ Marketplace** (if it existed):
```sql
-- Stored in workshop_rfq_marketplace:
vehicle_make, vehicle_model, vehicle_year, vehicle_vin

-- Also stored in:
vehicles table
```

**Reason**: Intentional snapshot for historical record (good practice)

**Risk**: If vehicle details updated, RFQ shows old data (but this is intentional)

---

**Workshop Info in Bids** (if it existed):
```sql
-- Stored in workshop_rfq_bids:
workshop_name, workshop_city, workshop_rating,
workshop_review_count, workshop_certifications

-- Also stored in:
organizations table
```

**Reason**: Snapshot preserves bid context at submission time (good practice)

**Risk**: Minimal - intentional design

---

## 5. SOURCE OF TRUTH ANALYSIS

### ❌ ANSWER: NO SINGLE SOURCE OF TRUTH

Multiple sources of truth exist across the system:

#### 5.1 Quote/RFQ Status Values

**Problem**: 4 different status field sets

**Sources**:
1. `repair_quotes.status` (8 values)
2. `workshop_escalation_queue.status` (6 values)
3. `workshop_rfq_marketplace.status` + `rfq_status` (2 fields!)
4. `workshop_rfq_bids.status` (5 values)

**Recommendation**: Create master `quote_status_enum` and `rfq_status_enum` types

---

#### 5.2 Referral Fee Rates

**Problem**: Conflicting values (2% vs 5%)

**Sources**:
1. Database: 5% (workshop_escalation_queue)
2. Migration: 2% (mechanic_referral_earnings)
3. UI: 2% (frontend display)
4. Documentation: 2%

**Recommendation**: Standardize to 2% across all sources

---

#### 5.3 Platform Fee Calculation

**Problem**: Inconsistent fee calculation

**Sources**:
1. Direct Quotes: Uses `platform_fee_rules` table (dynamic)
2. RFQ Bids: Hardcoded 12% in `/api/rfq/.../payment/checkout`
3. Admin: Can override via API

**Recommendation**: All should query `platform_fee_rules` table

---

#### 5.4 Warranty Storage

**Problem**: Different units, lossy conversion

**Sources**:
1. `repair_quotes.warranty_days` (in days)
2. `workshop_rfq_bids.parts_warranty_months` + `labor_warranty_months` (in months)
3. Unified view: `warranty_days / 30` (lossy conversion)

**Example**: 91 days = 3.03 months → rounds to 3 months (loses 1 day)

**Recommendation**: Standardize to days everywhere, convert to months only for display

---

## 6. DEPENDENCY MAP

### 6.1 Database Dependencies

```
diagnostic_sessions
       │
       ├──→ repair_quotes (direct quote)
       │       │
       │       └──→ repair_payments
       │
       └──→ workshop_escalation_queue
               │
               ├──→ repair_quotes (workshop creates quote)
               │       │
               │       └──→ repair_payments
               │
               └──→ workshop_rfq_marketplace (if existed)
                       │
                       ├──→ workshop_rfq_bids (multiple workshops bid)
                       │       │
                       │       └──→ repair_payments (winning bid)
                       │
                       └──→ mechanic_referral_earnings (2% commission)
```

---

### 6.2 Critical Path: Direct Quote Flow

```
1. Diagnostic Session Completed
   └─ diagnostic_sessions table

2. Mechanic/Workshop Creates Quote
   └─ POST /api/workshop/quotes/create
      └─ Inserts repair_quotes
      └─ Sends email notification

3. Customer Views Quote
   └─ GET /api/quotes/[quoteId]
      └─ Reads repair_quotes
      └─ Updates viewed_at

4. Customer Approves Quote
   └─ PATCH /api/quotes/[quoteId]/respond
      └─ Updates repair_quotes.customer_response = 'approved'
      └─ ❌ TODO: Should create repair_payments (not implemented)
      └─ ❌ TODO: Should notify workshop (not implemented)

5. Customer Pays
   └─ POST /api/quotes/[quoteId]/payment/checkout
      └─ Creates Stripe checkout session
      └─ Webhook: Creates repair_payments with escrow_status='held'

6. Work Completed
   └─ Workshop marks complete
      └─ Updates repair_quotes.status = 'completed'
      └─ Triggers payment release
      └─ Updates repair_payments.escrow_status = 'released'
```

**Dependencies**:
- Stripe API (payment processing)
- Email service (notifications)
- Webhooks (payment confirmation)

---

### 6.3 Critical Path: Workshop Escalation Flow

```
1. Virtual Mechanic Completes Diagnostic
   └─ diagnostic_sessions table

2. Mechanic Escalates to Workshop
   └─ Via UI or POST /api/mechanic/escalate
      └─ Inserts workshop_escalation_queue
      └─ Sets referral_fee_percent = 5%

3. Workshop Accepts Escalation
   └─ Workshop receives notification
      └─ Updates workshop_escalation_queue.status = 'accepted'
      └─ Assigns service advisor

4. Workshop Creates Quote
   └─ POST /api/workshop/quotes/create
      └─ Inserts repair_quotes
      └─ Links via workshop_escalation_queue.quote_id
      └─ Updates workshop_escalation_queue.status = 'quote_sent'

5. Customer Accepts Quote & Pays
   └─ Same as direct quote flow

6. Work Completed & Payment Released
   └─ Updates repair_quotes.status = 'completed'
      └─ Releases payment from escrow
      └─ Calculates mechanic referral fee (5% of job)
      └─ Updates workshop_escalation_queue.referral_fee_amount
      └─ Updates workshop_escalation_queue.referral_paid = true
```

**Dependencies**:
- Same as direct quote flow
- Plus: Mechanic payout system

---

### 6.4 Critical Path: RFQ Marketplace Flow (If Implemented)

```
1. Virtual Mechanic Completes Diagnostic
   └─ diagnostic_sessions table

2. Mechanic Creates Draft RFQ
   └─ POST /api/mechanic/rfq/create-draft
      └─ Inserts workshop_escalation_queue
      └─ Inserts workshop_rfq_marketplace (status='draft')
      └─ Notifies customer

3. Customer Approves Draft
   └─ POST /api/customer/rfq/drafts/[draftId]/approve
      └─ Updates workshop_rfq_marketplace.rfq_status = 'active'
      └─ Updates workshop_rfq_marketplace.status = 'open'
      └─ RFQ visible in marketplace

4. Workshops Browse & Submit Bids
   └─ GET /api/rfq/marketplace
      └─ Reads workshop_rfq_marketplace (status='open')
   └─ POST /api/rfq/bids
      └─ Inserts workshop_rfq_bids
      └─ Updates workshop_rfq_marketplace.bid_count
      └─ Notifies customer

5. Customer Accepts Winning Bid
   └─ POST /api/rfq/[rfqId]/accept
      └─ RPC: accept_workshop_rfq_bid()
      └─ Updates workshop_rfq_marketplace.accepted_bid_id
      └─ Updates workshop_rfq_bids.status = 'accepted' (winning bid)
      └─ Updates other bids.status = 'rejected'
      └─ Trigger: Creates mechanic_referral_earnings (2%)

6. Customer Pays
   └─ POST /api/rfq/[rfqId]/bids/[bidId]/payment/checkout
      └─ Creates Stripe checkout session
      └─ Webhook: Creates repair_payments

7. Work Completed
   └─ Workshop completes repair
      └─ Releases payment from escrow
      └─ Pays mechanic 2% referral commission
```

**Dependencies**:
- All of above
- Plus: RFQ marketplace tables
- Plus: Bid acceptance RPC function
- Plus: Referral earnings trigger

---

### 6.5 External Service Dependencies

#### Stripe
**Endpoints Dependent**:
- `/api/quotes/[quoteId]/payment/checkout`
- `/api/rfq/[rfqId]/bids/[bidId]/payment/checkout`

**Webhooks**:
- `checkout.session.completed` → Creates `repair_payments`
- `payment_intent.succeeded` → Releases escrow
- `payout.paid` → Updates mechanic referral status

**Impact if Stripe Down**:
- Customers cannot pay
- Escrow not created
- Mechanics not paid referrals

---

#### Email Service (Resend/SendGrid)
**Endpoints Dependent**:
- `/api/workshop/quotes/create` → Sends quote notification
- Various RFQ endpoints → Send notifications

**Impact if Down**:
- Customers miss notifications
- Workshops miss bid notifications
- Non-critical (can retry)

---

## 7. IMPACT ANALYSIS

### 7.1 If RFQ Tables Are Created

**Required Actions**:
1. Apply migration `20251206000002_phase6_workshop_rfq_marketplace.sql`
   - Creates `workshop_rfq_marketplace`
   - Creates `workshop_rfq_bids`
   - Creates `workshop_rfq_views`
   - Creates indexes
   - Creates RLS policies

2. Create database functions:
   - `accept_workshop_rfq_bid()` - Bid acceptance logic
   - `auto_expire_rfq_marketplace()` - Auto-expire old RFQs

3. Create database view:
   - `customer_quote_offers_v` - Unified quotes + bids view

4. Apply migration `20251109030000_add_mechanic_referral_system.sql`:
   - Creates `mechanic_referral_earnings`
   - Creates trigger on bid acceptance
   - Adds `rfq_status` column to `workshop_rfq_marketplace`

5. Regenerate TypeScript types:
   - `npx supabase gen types typescript --linked`

6. Create missing frontend pages:
   - `/customer/rfq/[rfqId]/bids`
   - `/workshop/rfq/marketplace/[rfqId]`
   - `/customer/rfq/drafts/[draftId]/edit`

7. Fix frontend bugs:
   - Customer quotes page line 108
   - Workshop quotes page line 82

**Estimated Effort**:
- Database migrations: 2 hours
- Frontend pages: 16 hours (4 pages × 4 hours)
- Bug fixes: 2 hours
- Testing: 8 hours
- **Total: 28 hours (~3.5 days)**

**Risk**: Medium (new feature, extensive testing needed)

---

### 7.2 If RFQ Tables Are NOT Created (Current State)

**Impact**:
- RFQ marketplace feature completely non-functional
- 16 API endpoints return errors
- Multiple frontend pages show errors
- Feature flags `ENABLE_WORKSHOP_RFQ` and `ENABLE_CUSTOMER_RFQ` are misleading

**Required Actions**:
1. Remove or comment out RFQ-related code:
   - 16 API endpoints
   - 8 frontend pages
   - RFQ-related components

2. Update feature flags:
   - Set `ENABLE_WORKSHOP_RFQ = false`
   - Set `ENABLE_CUSTOMER_RFQ = false`
   - Add UI message: "RFQ Marketplace coming soon"

3. Fix migration `20251109030000`:
   - Remove foreign keys to non-existent RFQ tables
   - Modify to work without RFQ tables

4. Use only direct quote + escalation systems

**Estimated Effort**:
- Code cleanup: 4 hours
- Migration fix: 2 hours
- Testing: 2 hours
- **Total: 8 hours (1 day)**

**Risk**: Low (removing broken code)

---

### 7.3 If Security Issues Are Fixed

**Required Changes**:

**1. Fix GET `/api/quotes/[quoteId]`**:
```typescript
const user = await getUser()
if (!user) return unauthorized()

const { data: quote } = await supabase
  .from('repair_quotes')
  .select('*')
  .eq('id', quoteId)
  .single()

// Verify ownership
if (quote.customer_id !== user.id &&
    quote.workshop_id !== user.workshop_id &&
    quote.mechanic_id !== user.mechanic_id &&
    user.role !== 'admin') {
  return forbidden()
}
```

**2. Fix PATCH `/api/quotes/[quoteId]/respond`**:
```typescript
const user = await getUser()
if (!user) return unauthorized()

const { data: quote } = await supabase
  .from('repair_quotes')
  .select('customer_id')
  .eq('id', quoteId)
  .single()

if (quote.customer_id !== user.id && user.role !== 'admin') {
  return forbidden()
}

// Continue with update...
```

**Estimated Effort**:
- Code changes: 1 hour
- Testing: 1 hour
- **Total: 2 hours**

**Risk**: Low (straightforward auth check)

---

### 7.4 If Incomplete Implementations Are Completed

**PATCH `/api/quotes/[quoteId]/respond` TODOs**:

**Add**:
```typescript
if (response === 'approved') {
  // 1. Create payment record
  const { data: payment } = await supabase
    .from('repair_payments')
    .insert({
      quote_id: quoteId,
      customer_id: quote.customer_id,
      workshop_id: quote.workshop_id,
      mechanic_id: quote.mechanic_id,
      amount: quote.customer_total,
      platform_fee: quote.platform_fee_amount,
      provider_amount: quote.provider_receives,
      escrow_status: 'pending'
    })
    .single()

  // 2. Notify workshop
  await sendNotification({
    user_id: quote.workshop_id || quote.mechanic_id,
    type: 'quote_approved',
    title: 'Quote Approved',
    message: `Customer approved quote #${quoteId}`,
    link: `/workshop/quotes/${quoteId}`
  })

  // 3. Return checkout URL
  return NextResponse.json({
    success: true,
    redirect: `/quotes/${quoteId}/payment/checkout`
  })
}
```

**Estimated Effort**:
- Code implementation: 2 hours
- Testing: 2 hours
- **Total: 4 hours**

**Risk**: Low (well-defined requirements)

---

## 8. CRITICAL RECOMMENDATIONS

### 8.1 IMMEDIATE ACTIONS (Priority 1 - This Week)

#### 1. 🔴 Fix Security Vulnerabilities
**Issue**: 2 quote endpoints have no authorization checks
**Impact**: Data breach, fraudulent quote responses
**Effort**: 2 hours
**Files**:
- `src/app/api/quotes/[quoteId]/route.ts`
- `src/app/api/quotes/[quoteId]/respond/route.ts`

**Action**: Add user authentication and ownership verification

---

#### 2. 🔴 Decide on RFQ Marketplace Implementation
**Issue**: RFQ tables don't exist, breaking 16 APIs and multiple pages
**Impact**: Major feature completely non-functional
**Effort**: 28 hours (implement) OR 8 hours (remove)

**Decision Required**:
- **Option A**: Implement RFQ marketplace (apply migrations, create pages)
- **Option B**: Remove RFQ code (clean up, set flags to false)

**Recommendation**: If RFQ marketplace is a planned feature, implement it now. If not, remove the code to avoid confusion.

---

#### 3. 🟡 Fix Frontend Bugs
**Issue**: Runtime errors in customer quotes page, hardcoded workshop ID
**Impact**: Broken user flows
**Effort**: 2 hours
**Files**:
- `src/app/customer/quotes/page.tsx` (line 108)
- `src/app/workshop/quotes/page.tsx` (line 82)

**Action**:
- Fix function name: `fetchQuotes()` → `fetchAllQuotes()`
- Get workshop ID from auth instead of hardcoded placeholder

---

### 8.2 HIGH PRIORITY (Priority 2 - Next 2 Weeks)

#### 4. ⚠️ Complete Quote Response Implementation
**Issue**: TODOs not implemented in quote approval flow
**Impact**: Incomplete workflow, manual steps required
**Effort**: 4 hours
**File**: `src/app/api/quotes/[quoteId]/respond/route.ts`

**Action**: Implement payment creation and workshop notification

---

#### 5. ⚠️ Resolve Referral Fee Inconsistency
**Issue**: Database shows 5%, UI shows 2%, migration uses 2%
**Impact**: Financial calculations unreliable, trust issues
**Effort**: 4 hours

**Decision Required**: Choose 2% or 5%

**Action**:
- Update database default
- Update UI displays
- Update all calculations
- Communicate to mechanics if changing

---

#### 6. ⚠️ Regenerate TypeScript Types
**Issue**: Types file doesn't reflect current database state
**Impact**: Type errors, missing table definitions
**Effort**: 1 hour

**Action**: Run `npx supabase gen types typescript --linked`

---

### 8.3 MEDIUM PRIORITY (Priority 3 - Next Month)

#### 7. Create Missing Frontend Pages
**Issue**: 4 critical pages missing, breaking user flows
**Impact**: Users cannot complete workflows
**Effort**: 16 hours (4 pages × 4 hours)

**Pages to Create**:
- `/customer/rfq/[rfqId]/bids` - Compare workshop bids
- `/workshop/rfq/marketplace/[rfqId]` - View RFQ & submit bid
- `/customer/quotes/[quoteId]` - Quote detail view
- `/customer/rfq/drafts/[draftId]/edit` - Edit draft before approval

---

#### 8. Consolidate Duplicate Status Fields
**Issue**: `workshop_rfq_marketplace` has both `status` and `rfq_status`
**Impact**: Confusion, inconsistent queries
**Effort**: 8 hours

**Action**:
- Choose one status field
- Migrate data
- Update all API endpoints
- Update frontend filters

---

#### 9. Standardize Warranty Storage
**Issue**: Days vs months with lossy conversion
**Impact**: Inaccurate warranty info
**Effort**: 6 hours

**Action**: Store everything in days, convert to months only for display

---

### 8.4 LOW PRIORITY (Nice to Have)

#### 10. Add Pagination to Lists
**Issue**: All quotes/RFQs fetched at once
**Impact**: Performance issues with large datasets
**Effort**: 8 hours

---

#### 11. Implement Quote/Bid Editing
**Issue**: Cannot edit after submission
**Impact**: Must create new quote/bid for changes
**Effort**: 16 hours

---

#### 12. Create Master Enum Types
**Issue**: Multiple status value sets
**Impact**: No type safety
**Effort**: 4 hours

---

## 9. IMPLEMENTATION ROADMAP

### Phase 1: Critical Fixes (Week 1)
- [ ] Fix security vulnerabilities (2 hours)
- [ ] Decide on RFQ implementation (decision)
- [ ] Fix frontend bugs (2 hours)
- [ ] Regenerate TypeScript types (1 hour)

**Total: 5 hours + decision**

---

### Phase 2: Complete Workflows (Week 2)
- [ ] Complete quote response implementation (4 hours)
- [ ] Resolve referral fee inconsistency (4 hours)
- [ ] Either: Implement RFQ marketplace (28 hours)
- [ ] Or: Remove RFQ code (8 hours)

**Total: 36 hours (implement) OR 16 hours (remove)**

---

### Phase 3: Missing Features (Week 3-4)
- [ ] Create missing frontend pages (16 hours)
- [ ] Consolidate duplicate status fields (8 hours)
- [ ] Standardize warranty storage (6 hours)

**Total: 30 hours**

---

### Phase 4: Enhancements (Month 2)
- [ ] Add pagination (8 hours)
- [ ] Implement quote/bid editing (16 hours)
- [ ] Create master enum types (4 hours)
- [ ] Comprehensive testing (16 hours)

**Total: 44 hours**

---

## 10. TESTING CHECKLIST

### 10.1 Direct Quote System
- [ ] Mechanic can create quote
- [ ] Customer receives quote notification
- [ ] Customer can view quote
- [ ] Customer can approve quote
- [ ] Payment is created on approval
- [ ] Workshop is notified of approval
- [ ] Customer can pay quote
- [ ] Payment goes into escrow
- [ ] Workshop can complete work
- [ ] Payment is released from escrow

---

### 10.2 Workshop Escalation System
- [ ] Virtual mechanic can escalate to workshop
- [ ] Workshop receives escalation notification
- [ ] Workshop can accept escalation
- [ ] Service advisor can be assigned
- [ ] Workshop can create quote from escalation
- [ ] Customer receives quote
- [ ] Customer can pay quote
- [ ] Mechanic earns referral fee (5% or 2%)
- [ ] Referral fee is tracked in escalation queue
- [ ] Referral fee is paid out

---

### 10.3 RFQ Marketplace System (If Implemented)
- [ ] Mechanic can create draft RFQ
- [ ] Customer receives draft notification
- [ ] Customer can approve draft
- [ ] RFQ appears in marketplace
- [ ] Workshops can browse marketplace
- [ ] Workshops can submit bids
- [ ] Customer can view all bids
- [ ] Customer can compare bids
- [ ] Customer can accept winning bid
- [ ] Other bids are auto-rejected
- [ ] Mechanic referral earnings created (2%)
- [ ] Customer can pay winning bid
- [ ] Payment goes into escrow
- [ ] Workshop completes work
- [ ] Payment released from escrow
- [ ] Mechanic referral paid out

---

### 10.4 Security Testing
- [ ] Non-authenticated users cannot view quotes
- [ ] Users cannot view quotes they don't own
- [ ] Users cannot respond to quotes they don't own
- [ ] Workshop cannot view other workshop's quotes
- [ ] Mechanic cannot view other mechanic's quotes
- [ ] Admin can view all quotes

---

## 11. CONCLUSION

### Current System State

**Working** ✅:
- Direct Quotes System (mechanic/workshop → customer)
- Workshop Escalation System (virtual mechanic → workshop)
- Payment Escrow System
- Core frontend pages for working systems

**Broken** ❌:
- RFQ Marketplace (tables don't exist)
- 16 RFQ API endpoints
- 4 critical frontend pages
- Mechanic referral earnings (depends on RFQ tables)

**Vulnerable** 🔴:
- 2 quote endpoints with no authorization
- Hardcoded workshop ID in frontend

**Inconsistent** ⚠️:
- Referral fee (2% vs 5%)
- Duplicate status fields
- Warranty storage units

---

### Key Decision Points

**1. RFQ Marketplace Implementation**
- **Implement**: 28 hours effort, full feature availability
- **Remove**: 8 hours effort, simpler codebase
- **Recommendation**: Implement if this is a planned feature

**2. Referral Fee Rate**
- **2%**: Matches documentation and UI
- **5%**: Current database default
- **Recommendation**: Use 2% (update database)

---

### Priority Summary

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 🔴 Critical | Fix security issues | 2h | Prevent data breach |
| 🔴 Critical | Decide on RFQ implementation | Decision | Unblock 16 APIs |
| 🔴 Critical | Fix frontend bugs | 2h | Fix runtime errors |
| 🟡 High | Complete quote workflows | 4h | Better UX |
| 🟡 High | Resolve referral fee | 4h | Financial accuracy |
| ⚠️ Medium | Create missing pages | 16h | Complete user flows |
| ⚠️ Medium | Fix data inconsistencies | 14h | Data integrity |

---

### Final Recommendations

**Immediate (This Week)**:
1. Fix security vulnerabilities
2. Fix frontend bugs
3. Decide on RFQ marketplace direction

**Short Term (Next 2 Weeks)**:
1. Implement or remove RFQ code
2. Complete TODOs in quote response
3. Resolve referral fee inconsistency

**Medium Term (Next Month)**:
1. Create missing frontend pages
2. Consolidate status fields
3. Standardize data storage

---

**Report Generated**: January 11, 2025
**Investigation Status**: COMPLETE
**Total Issues Found**: 21
**Critical Issues**: 5
**High Priority Issues**: 4
**Medium Priority Issues**: 12

---

END OF REPORT
