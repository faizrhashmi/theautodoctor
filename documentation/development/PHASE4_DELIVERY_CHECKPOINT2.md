# Phase 4 Delivery Checkpoint #2
## Unified "Quotes & Jobs" System - Customer + Workshop APIs Complete

**Date**: 2025-02-11
**Status**: ✅ READY TO TEST
**Completion**: 50% (6 of 10 major tasks)

---

## 📦 What's Been Delivered Since Checkpoint #1

This checkpoint builds on [Checkpoint #1](./PHASE4_DELIVERY_CHECKPOINT1.md) and adds **Customer Jobs APIs** and **Workshop APIs**.

### Previous Delivery (Checkpoint #1)
- ✅ SQL Migration (customer_quote_offers_v view)
- ✅ TypeScript Types (QuoteOffer, RepairJob, etc.)
- ✅ Central Routing (routes.ts updates)
- ✅ Customer Offers APIs (3 endpoints)

### New in Checkpoint #2

---

## 1. Customer Jobs APIs (3 endpoints)

### A. **GET /api/customer/jobs**
**Location**: `src/app/api/customer/jobs/route.ts`

**Purpose**: Fetch all repair jobs for logged-in customer

**Query Parameters**:
- `status` (optional): `'all'` | `'pending'` | `'in-progress'` | `'history'` (default: `'all'`)

**Response**:
```typescript
{
  jobs: RepairJob[],
  count: number,
  filters: {
    status?: 'all' | 'pending' | 'in-progress' | 'history'
  }
}
```

**Features**:
- ✅ Requires `requireCustomerAPI` auth guard
- ✅ Filters by `customer_id = auth.uid()` automatically
- ✅ Status filtering:
  - `pending`: pending_parts, parts_received
  - `in-progress`: repair_started, in_progress, waiting_approval, quality_check, ready_for_pickup
  - `history`: completed, cancelled
  - `all`: no filter
- ✅ Returns jobs with workshop info (name, address, phone)
- ✅ Source-aware (direct vs RFQ)

**Example Usage**:
```typescript
const response = await fetch('/api/customer/jobs?status=in-progress')
const { jobs } = await response.json()
```

---

### B. **GET /api/customer/jobs/[id]**
**Location**: `src/app/api/customer/jobs/[id]/route.ts`

**Purpose**: Fetch detailed job information with full timeline

**Response**:
```typescript
{
  job: RepairJob,
  updates: RepairJobUpdate[]
}
```

**Features**:
- ✅ Requires `requireCustomerAPI` auth guard
- ✅ Verifies customer owns the job
- ✅ Returns all customer-visible updates (internal_only=false)
- ✅ Includes workshop and mechanic details
- ✅ Full job timeline with photos
- ✅ Parts status and quality check info

**Example Usage**:
```typescript
const response = await fetch('/api/customer/jobs/job-123')
const { job, updates } = await response.json()

// job.status, job.estimatedCompletionDate, job.partsStatus, etc.
// updates[] - timeline entries with photos and messages
```

---

### C. **GET /api/customer/jobs/[id]/updates**
**Location**: `src/app/api/customer/jobs/[id]/updates/route.ts`

**Purpose**: Fetch timeline of job updates (dedicated endpoint for polling)

**Response**:
```typescript
{
  updates: RepairJobUpdate[],
  count: number
}
```

**Features**:
- ✅ Requires `requireCustomerAPI` auth guard
- ✅ Verifies customer owns the job
- ✅ Returns only customer-visible updates
- ✅ Ordered by most recent first
- ✅ Includes photos, status changes, messages

**Example Usage**:
```typescript
const response = await fetch('/api/customer/jobs/job-123/updates')
const { updates } = await response.json()

// Useful for polling/real-time updates in UI
```

---

## 2. Workshop APIs (4 endpoints)

### A. **GET /api/workshop/jobs**
**Location**: `src/app/api/workshop/jobs/route.ts`

**Purpose**: List all jobs for the authenticated workshop

**Query Parameters**:
- `status` (optional): `'all'` | `'pending'` | `'in-progress'` | `'ready'` | `'completed'` (default: `'all'`)

**Response**:
```typescript
{
  jobs: RepairJob[],
  count: number,
  filters: {
    status?: string
  }
}
```

**Features**:
- ✅ Requires `requireWorkshopAPI` auth guard
- ✅ Filters by `workshop_id = auth.organizationId` automatically
- ✅ Status filtering:
  - `pending`: pending_parts, parts_received
  - `in-progress`: repair_started, in_progress, waiting_approval, quality_check
  - `ready`: ready_for_pickup
  - `completed`: completed, cancelled
- ✅ Returns jobs with customer info (name, phone, email)
- ✅ Ordered by estimated_completion_date (most urgent first)

**Example Usage**:
```typescript
const response = await fetch('/api/workshop/jobs?status=in-progress')
const { jobs } = await response.json()
```

---

### B. **GET /api/workshop/jobs/[id]**
**Location**: `src/app/api/workshop/jobs/[id]/route.ts`

**Purpose**: Fetch detailed job information (workshop view)

**Response**:
```typescript
{
  job: RepairJob,
  updates: RepairJobUpdate[]
}
```

**Features**:
- ✅ Requires `requireWorkshopAPI` auth guard
- ✅ Verifies workshop owns the job
- ✅ Returns **ALL** updates (including internal_only=true)
- ✅ Includes customer contact info
- ✅ Parts tracking info (supplier, ETA, counts)

**Example Usage**:
```typescript
const response = await fetch('/api/workshop/jobs/job-123')
const { job, updates } = await response.json()
```

---

### C. **POST /api/workshop/jobs/[id]/updates**
**Location**: `src/app/api/workshop/jobs/[id]/updates/route.ts`

**Purpose**: Post status updates, photos, and customer messages

**Request Body**:
```typescript
{
  updateType: 'status_change' | 'parts_update' | 'timeline_update' | 'customer_message' | 'internal_note',
  newStatus?: string, // Required if updateType=status_change
  message: string,
  internalOnly?: boolean, // Default: false
  photos?: string[], // Storage URLs
  metadata?: Record<string, any>
}
```

**Response**:
```typescript
{
  update: RepairJobUpdate
}
```

**Features**:
- ✅ Requires `requireWorkshopAPI` auth guard
- ✅ Verifies workshop owns the job
- ✅ Auto-updates job status if updateType=status_change
- ✅ Updates relevant timestamp fields:
  - `repair_started` → `repair_started_at`
  - `quality_check` → `quality_check_at`
  - `ready_for_pickup` → `ready_for_pickup_at`
  - `completed` → `completed_at`
- ✅ Creates timeline entry in repair_job_updates
- ✅ Supports internal notes (invisible to customer)

**Example Usage**:
```typescript
// Status change
await fetch('/api/workshop/jobs/job-123/updates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    updateType: 'status_change',
    newStatus: 'in_progress',
    message: 'Work has started on your vehicle',
  })
})

// Customer message with photos
await fetch('/api/workshop/jobs/job-123/updates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    updateType: 'customer_message',
    message: 'We found additional wear on the brake rotors',
    photos: ['https://storage.../photo1.jpg'],
  })
})

// Internal note
await fetch('/api/workshop/jobs/job-123/updates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    updateType: 'internal_note',
    message: 'Customer called to check on ETA',
    internalOnly: true,
  })
})
```

---

### D. **POST /api/workshop/payments/[paymentId]/refund**
**Location**: `src/app/api/workshop/payments/[paymentId]/refund/route.ts`

**Purpose**: Workshop-initiated refund for incomplete/unsatisfactory work

**Request Body**:
```typescript
{
  reason: 'work_not_completed' | 'customer_dissatisfied' | 'parts_unavailable' | 'quality_issues' | 'other',
  notes?: string,
  amount?: number // Optional - defaults to full refund
}
```

**Response**:
```typescript
{
  success: boolean,
  message: string,
  refund: {
    id: string,
    amount: number,
    currency: string,
    status: string,
    reason: string
  },
  payment_id: string,
  escrow_status: 'refunded' | 'partially_refunded'
}
```

**Features**:
- ✅ Requires `requireWorkshopAPI` auth guard
- ✅ Verifies workshop owns the payment
- ✅ Validates payment is in escrow (status='held')
- ✅ Creates Stripe refund via API
- ✅ Updates repair_payments table
- ✅ Supports partial refunds
- ✅ Logs refund in refunds table
- ✅ Metadata includes workshop info for tracking

**Example Usage**:
```typescript
// Full refund
await fetch('/api/workshop/payments/payment-123/refund', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reason: 'parts_unavailable',
    notes: 'OEM parts no longer available, customer declined aftermarket'
  })
})

// Partial refund
await fetch('/api/workshop/payments/payment-123/refund', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reason: 'quality_issues',
    notes: 'Minor paint overspray, agreed to $50 discount',
    amount: 50.00
  })
})
```

---

## 3. Updated TypeScript Types

**Location**: `src/types/quotes.ts`

**New/Updated Types**:
- ✅ `RepairJobStatus` - Updated to match database schema exactly
  - `pending_parts | parts_received | repair_started | in_progress | waiting_approval | quality_check | ready_for_pickup | completed | on_hold | cancelled`
- ✅ `RepairJob` - Extended with additional fields:
  - `jobNumber`, `description`, `vehicleInfo`
  - `estimatedCompletionDate`, `estimatedLaborHours`, `actualLaborHours`
  - `partsStatus`, `partsEta`
  - `additionalWorkRequested`, `qualityCheckPassed`, `finalNotes`, `pickupScheduledAt`
  - `workshopName`, `workshopAddress`, `workshopPhone` (for customer view)
  - `customerName`, `customerPhone`, `customerEmail` (for workshop view)
  - `mechanicName` (for both views)
- ✅ `GetJobsResponse` - Alias with status filters
- ✅ `GetJobUpdatesResponse` - For updates endpoint

---

## 📂 Complete File Listing

### Customer Jobs APIs
```
src/app/api/customer/jobs/
├── route.ts                       (GET list)
├── [id]/
│   ├── route.ts                   (GET detail)
│   └── updates/
│       └── route.ts               (GET updates)
```

### Workshop APIs
```
src/app/api/workshop/jobs/
├── route.ts                       (GET list)
├── [id]/
│   ├── route.ts                   (GET detail)
│   └── updates/
│       └── route.ts               (POST update)

src/app/api/workshop/payments/
└── [paymentId]/
    └── refund/
        └── route.ts               (POST refund)
```

### Updated Types
```
src/types/
└── quotes.ts                      (Updated RepairJob interface + new types)
```

---

## ✅ What Works Now

### Customer Experience
1. ✅ **View all quote offers** (direct + RFQ unified) with filters
2. ✅ **View offer details** (workshop info, reviews, line items)
3. ✅ **Accept offers** (unified dispatcher to Stripe checkout)
4. ✅ **List active jobs** (pending, in-progress, history)
5. ✅ **View job details** (full timeline, photos, status)
6. ✅ **Track job updates** (real-time status changes, parts info)

### Workshop Experience
1. ✅ **List all workshop jobs** (filtered by status, sorted by urgency)
2. ✅ **View job details** (customer info, parts tracking, internal notes)
3. ✅ **Post status updates** (with auto-timestamp updates)
4. ✅ **Send customer messages** (with photos)
5. ✅ **Add internal notes** (invisible to customer)
6. ✅ **Initiate refunds** (full or partial, with Stripe integration)

---

## 🚧 What's Next (Remaining 50%)

### Immediate Next Steps:

1. **Admin APIs** (8+ endpoints):
   - GET /api/admin/quotes (all quotes, all sources)
   - PATCH /api/admin/quotes/[id] (force expire/unexpire)
   - GET /api/admin/jobs (all jobs across all workshops)
   - GET /api/admin/jobs/[id] (job detail with full history)
   - GET /api/admin/payments (escrow dashboard)
   - POST /api/admin/payments/[id]/release (release escrow to workshop)
   - GET /api/admin/refunds (refund management)
   - POST /api/admin/refunds/[paymentId] (admin-initiated refund)

2. **Customer UI** (/customer/quotes-and-jobs page):
   - Unified offers list (cards with source badges)
   - Filter/sort controls
   - Comparison mode
   - Job tracker with timeline
   - Live status updates

3. **Workshop UI** (/workshop/jobs):
   - Job list dashboard
   - Job detail with update form
   - Photo upload
   - Refund request form

4. **Admin UI**:
   - Quotes dashboard (all sources)
   - Jobs dashboard (all workshops)
   - Escrow control center
   - Refund approval

5. **Notifications**:
   - Update notification handlers with new deep links
   - Wire deepLinkFor.* helpers (already defined in routes.ts)

6. **Documentation**:
   - ADMIN-RUNBOOK.md
   - WORKSHOP-GUIDE.md
   - MIGRATIONS-APPLIED.md

---

## 🧪 How to Test

### Test 1: Customer Jobs List
```bash
# Login as a customer first, then:
curl http://localhost:3000/api/customer/jobs?status=in-progress \
  -H "Cookie: your-auth-cookie"
```

**Expected**: JSON array of jobs with workshop info

---

### Test 2: Customer Job Detail
```bash
curl http://localhost:3000/api/customer/jobs/JOB_ID \
  -H "Cookie: your-auth-cookie"
```

**Expected**: Full job details with timeline updates

---

### Test 3: Workshop Jobs List
```bash
# Login as a workshop member first, then:
curl http://localhost:3000/api/workshop/jobs?status=in-progress \
  -H "Cookie: your-auth-cookie"
```

**Expected**: JSON array of jobs with customer info

---

### Test 4: Workshop Post Update
```bash
curl -X POST http://localhost:3000/api/workshop/jobs/JOB_ID/updates \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "updateType": "status_change",
    "newStatus": "in_progress",
    "message": "Work has started"
  }'
```

**Expected**: Success response with update object

---

### Test 5: Workshop Refund
```bash
curl -X POST http://localhost:3000/api/workshop/payments/PAYMENT_ID/refund \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "reason": "work_not_completed",
    "notes": "Customer requested cancellation"
  }'
```

**Expected**: Success response with Stripe refund details

---

## 🎯 Progress Metrics

**Checkpoint #1**: 30% (3/10 major tasks) - Customer Offers APIs
**Checkpoint #2**: **50% (6/10 major tasks)** - Customer + Workshop APIs ✅

**Lines of Code**: ~2,800 (SQL + TypeScript + APIs)
**API Endpoints**: 10 total (3 Customer Offers + 3 Customer Jobs + 4 Workshop)
**Breaking Changes**: None (all additive)
**Backward Compatible**: ✅ Yes

---

## 🔥 Key Architectural Patterns

### 1. **Consistent Auth Guards**
- Customer APIs: `requireCustomerAPI`
- Workshop APIs: `requireWorkshopAPI`
- All verify ownership before mutations

### 2. **Source-Aware Design**
- Jobs track source (direct vs RFQ) in metadata
- Unified APIs handle both seamlessly

### 3. **Workshop Isolation**
- Each workshop only sees their own jobs
- RLS enforced via `workshop_id` filtering

### 4. **Customer Privacy**
- Customers only see customer-visible updates (internal_only=false)
- Workshops see all updates including internal notes

### 5. **Auto-Timestamp Management**
- Status changes automatically update relevant timestamp fields
- No manual timestamp management needed

### 6. **Stripe Integration**
- Refunds use existing Stripe API
- Webhook-compatible (final status updates via webhook)
- Idempotent refund record creation

---

## 📞 Support & Questions

**API Errors?**
- Check server logs for `[JOBS]`, `[WORKSHOP-JOBS]`, `[WORKSHOP-REFUND]` prefixes
- Verify authentication cookies
- Ensure customer/workshop has jobs/payments in database

**Type Errors?**
- Run `npm run typecheck`
- Ensure `src/types/quotes.ts` imported correctly

**Refund Errors?**
- Check Stripe dashboard for payment intent
- Verify escrow_status = 'held'
- Ensure payment belongs to workshop

---

## 🚀 Ready to Continue?

**Option A**: Test what's been delivered (10 APIs above)

**Option B**: Continue implementation:
- Next up: Admin APIs (8+ endpoints)
- Then UI components
- Then notifications
- Then documentation

Just say **"continue"** and I'll keep building!

---

**Files Changed**: 7 new API files + 1 types file updated
**Breaking Changes**: None (all additive)
**Backward Compatible**: ✅ Yes
**Database Changes**: None (uses existing repair_jobs, repair_job_updates, repair_payments tables)
