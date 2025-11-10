# Mechanic Referral System - Implementation Summary

**Date**: January 9, 2025
**Status**: ✅ COMPLETE - All phases implemented and migrated

## Overview

This document summarizes the complete implementation of the Mechanic Referral System, which enables virtual mechanics to earn a 2% referral commission when they help customers create RFQs that result in accepted workshop bids.

---

## Business Model

### Referral Flow
1. **Virtual mechanic** completes diagnostic session with customer
2. **Mechanic** creates DRAFT RFQ on behalf of customer (pre-fills technical details)
3. **Customer** receives notification to review draft RFQ
4. **Customer** reviews, optionally edits, and approves RFQ
5. **RFQ** publishes to marketplace (status: draft → active)
6. **Workshops** submit competitive bids
7. **Customer** compares bids and accepts one
8. **Automatic trigger** creates referral earning record (2% of bid amount)
9. **Mechanic** earns commission (deducted from platform fee, NOT customer price)

### Commission Structure
- **Rate**: 2% of accepted bid amount
- **Source**: Deducted from 30% platform fee
- **Example**: Customer accepts $1,000 bid → Mechanic earns $20
- **Payment**: Tracked as "pending" until processed, then marked "paid"

---

## Database Changes

### Migration File
`supabase/migrations/20251109030000_add_mechanic_referral_system.sql`

### New Tables

#### `mechanic_referral_earnings`
Tracks all referral commissions earned by mechanics.

**Key Columns:**
- `mechanic_id`: Who earned the commission
- `rfq_id`: Which RFQ generated the commission
- `customer_id`: Customer who accepted the bid
- `workshop_id`: Workshop that won the bid
- `bid_id`: The accepted bid
- `bid_amount`: Total bid amount
- `referral_rate`: Commission rate (default 0.02 = 2%)
- `commission_amount`: Calculated commission
- `status`: pending | processing | paid | cancelled | failed
- `earned_at`: When commission was earned
- `paid_at`: When commission was paid out

**Indexes:**
- `idx_mechanic_referral_earnings_mechanic`: Fast lookups by mechanic
- `idx_mechanic_referral_earnings_status`: Filter by payment status
- `idx_mechanic_referral_earnings_rfq`: Lookup by RFQ

**RLS Policies:**
- Mechanics can view their own referrals
- Admins can view all referrals
- System can insert/update via service role

### Modified Tables

#### `workshop_rfq_marketplace`
**New Columns:**
- `rfq_status`: draft | active | bidding | accepted | completed | expired | cancelled
- `metadata`: JSONB field for tracking referral source and other metadata

**Updated Columns:**
- `escalating_mechanic_id`: Now used to track referring mechanic for 2% commission

### New Database Objects

**Function:** `calculate_referral_commission(bid_amount, referral_rate)`
- Calculates commission amount
- Default rate: 2%
- Returns: DECIMAL(10,2)

**Trigger:** `trigger_create_mechanic_referral`
- Fires when bid status changes to 'accepted'
- Automatically creates `mechanic_referral_earnings` record
- Only if RFQ has `escalating_mechanic_id` set

**View:** `mechanic_referral_summary`
- Aggregates referral statistics per mechanic
- Shows: total_referrals, paid_referrals, pending_referrals, total_earned, etc.

---

## API Endpoints

### Mechanic Endpoints

#### `POST /api/mechanic/rfq/create-draft`
Create draft RFQ on behalf of customer after diagnostic session.

**Request Body:**
```json
{
  "diagnostic_session_id": "uuid",
  "title": "string (10-100 chars)",
  "description": "string (50-1000 chars)",
  "recommended_services": "string (optional)",
  "issue_category": "engine|brakes|electrical|suspension|transmission|other",
  "urgency": "low|normal|high|urgent",
  "budget_min": number (optional),
  "budget_max": number (optional)
}
```

**Response:**
```json
{
  "success": true,
  "rfq_id": "uuid",
  "status": "draft",
  "message": "Draft RFQ created successfully. Customer will be notified to review and approve."
}
```

**Security:**
- Must be authenticated mechanic
- Must own the diagnostic session
- Session must have completed status

**Notifications:**
- Creates `rfq_draft_ready` notification for customer

#### `GET /api/mechanic/referrals`
Fetch mechanic's referral earnings and statistics.

**Response:**
```json
{
  "success": true,
  "referrals": [
    {
      "id": "uuid",
      "bid_amount": 1000.00,
      "commission_amount": 20.00,
      "referral_rate": 0.02,
      "status": "pending|paid",
      "earned_at": "timestamp",
      "paid_at": "timestamp|null",
      "rfq": { "title": "...", "vehicle_make": "..." },
      "workshop": { "name": "...", "city": "..." }
    }
  ],
  "summary": {
    "total_referrals": 12,
    "pending_referrals": 3,
    "paid_referrals": 9,
    "total_earned": 240.00,
    "pending_earnings": 60.00,
    "paid_earnings": 180.00,
    "avg_commission": 20.00
  }
}
```

### Customer Endpoints

#### `GET /api/customer/rfq/drafts`
Fetch all draft RFQs created by mechanics for this customer.

**Response:**
```json
{
  "success": true,
  "drafts": [
    {
      "id": "uuid",
      "title": "Brake System Diagnosis",
      "description": "...",
      "mechanics": { "full_name": "John Doe", "rating": 4.8 },
      "vehicles": { "year": 2024, "make": "Honda", "model": "Civic" },
      "budget_min": 800,
      "budget_max": 1200,
      "bid_deadline": "timestamp"
    }
  ],
  "count": 1
}
```

#### `POST /api/customer/rfq/drafts/[draftId]/approve`
Customer approves draft RFQ and publishes to marketplace.

**Request Body:**
```json
{
  "customer_consent": true,
  "title": "string (optional - customer can modify)",
  "description": "string (optional)",
  "budget_min": number (optional),
  "budget_max": number (optional)
}
```

**Response:**
```json
{
  "success": true,
  "rfq_id": "uuid",
  "status": "active",
  "message": "RFQ approved and published to marketplace"
}
```

**Side Effects:**
- Updates RFQ status: draft → active
- Updates escalation_queue status: draft → posted
- Sends `rfq_draft_approved` notification to mechanic

---

## UI Components

### Mechanic Pages

#### `/mechanic/referrals`
**File:** `src/app/mechanic/referrals/page.tsx`

**Features:**
- Summary cards: Total Earned, Paid Out, Pending, Avg Commission
- Referral list with:
  - RFQ title and vehicle info
  - Workshop that won bid
  - Commission amount and rate
  - Payment status (Paid / Pending)
  - Dates earned and paid
- Info banner explaining how referrals work

**Navigation:**
- Added "Referrals" link to mechanic sidebar
- Icon: Gift
- Description: "Referral commissions"

### Customer Pages

#### `/customer/rfq/drafts`
**File:** `src/app/customer/rfq/drafts/page.tsx`

**Features:**
- List of draft RFQs prepared by mechanics
- Shows mechanic who created it
- Vehicle and issue details
- Budget estimate
- Bid deadline
- Actions:
  - "Approve & Publish" - Publishes to marketplace
  - "Edit First" - Modify before publishing
- Info banner explaining the process and 2% referral disclosure

### Sidebar Changes

#### Mechanic Sidebar
**File:** `src/components/mechanic/MechanicSidebar.tsx`

**Changes:**
1. **Removed "Quotes" nav item** for ALL mechanic types:
   - Virtual mechanics: Don't create quotes (escalate to RFQ instead)
   - Independent workshop owners: Use workshop sidebar Quotes page
   - Workshop employees: No access to quotes

2. **Added "Referrals" nav item**:
   - Shows for all mechanic types who can access earnings
   - Virtual mechanics and independent owners can see it
   - Workshop employees cannot (filtered by `canAccessEarnings()`)

3. **Added "Workshop View" button** (bottom actions):
   - Only shows for independent owner-operators
   - Uses `isOwnerOperator()` check
   - Links to `/workshop/dashboard`

---

## Notification Types

### For Customers

#### `rfq_draft_ready`
Sent when mechanic creates draft RFQ.
```json
{
  "rfq_id": "uuid",
  "mechanic_name": "John Doe",
  "session_id": "uuid",
  "title": "Brake System Diagnosis",
  "message": "Your mechanic has prepared a repair request for you to review and submit."
}
```

### For Mechanics

#### `rfq_draft_approved`
Sent when customer approves draft RFQ.
```json
{
  "rfq_id": "uuid",
  "title": "Brake System Diagnosis",
  "message": "Customer approved your RFQ draft and it's now live in the marketplace!"
}
```

---

## Technical Implementation Details

### Automatic Commission Calculation

**Trigger Logic:**
```sql
-- Fires when workshop_rfq_bids.status changes to 'accepted'
CREATE TRIGGER trigger_create_mechanic_referral
    AFTER UPDATE OF status ON workshop_rfq_bids
    FOR EACH ROW
    EXECUTE FUNCTION create_mechanic_referral_on_bid_accept();
```

**Function Behavior:**
1. Checks if bid status changed to 'accepted'
2. Fetches RFQ details including `escalating_mechanic_id`
3. Only proceeds if `escalating_mechanic_id` is NOT NULL
4. Calculates commission: `bid_amount × 0.02`
5. Creates `mechanic_referral_earnings` record with status 'pending'
6. Uses `ON CONFLICT DO NOTHING` to prevent duplicates

### Role-Based Access Control

**Mechanics can access referrals if:**
```typescript
canAccessEarnings(mechanicData) === true

// Returns true for:
// - MechanicType.VIRTUAL_ONLY
// - MechanicType.INDEPENDENT_WORKSHOP

// Returns false for:
// - MechanicType.WORKSHOP_AFFILIATED (employees)
```

### Data Integrity

**Constraints:**
- `UNIQUE(rfq_id, mechanic_id)` - One commission per RFQ per mechanic
- `CHECK (bid_amount > 0)` - Valid bid amounts only
- `CHECK (commission_amount >= 0)` - Non-negative commissions
- `CHECK (referral_rate >= 0 AND referral_rate <= 1)` - Valid rate (0-100%)

**Foreign Key Cascades:**
- `mechanic_id` ON DELETE CASCADE - Remove earnings if mechanic deleted
- `rfq_id` ON DELETE CASCADE - Remove earnings if RFQ deleted
- `workshop_id` ON DELETE CASCADE - Remove earnings if workshop deleted
- `diagnostic_session_id` ON DELETE SET NULL - Keep earnings if session deleted

---

## Testing Checklist

### Manual Testing Steps

1. **Create Draft RFQ as Mechanic:**
   - [ ] Complete diagnostic session as virtual mechanic
   - [ ] Create draft RFQ with POST to `/api/mechanic/rfq/create-draft`
   - [ ] Verify draft created with `rfq_status = 'draft'`
   - [ ] Verify `escalating_mechanic_id` is set

2. **Customer Reviews Draft:**
   - [ ] Navigate to `/customer/rfq/drafts`
   - [ ] See draft RFQ with mechanic's details
   - [ ] Approve draft
   - [ ] Verify RFQ status changes to 'active'

3. **Workshop Bids:**
   - [ ] Workshop sees RFQ in marketplace
   - [ ] Workshop submits bid
   - [ ] Customer sees bid in `/customer/rfq/[rfqId]/bids`

4. **Commission Creation:**
   - [ ] Customer accepts workshop bid
   - [ ] Verify `mechanic_referral_earnings` record created automatically
   - [ ] Verify commission_amount = bid_amount × 0.02
   - [ ] Verify status = 'pending'

5. **Mechanic Views Referrals:**
   - [ ] Navigate to `/mechanic/referrals`
   - [ ] See pending referral in list
   - [ ] Summary statistics show correct totals

---

## RFQ Escalation Entry Points

### Implemented ✅

1. **Session Summary Page** ([sessions/[id]/summary/page.tsx](cci:1://file:///c:/Users/Faiz%20Hashmi/theautodoctor/src/app/sessions/%5Bid%5D/summary/page.tsx:0:0-0:0))
   - "Create RFQ for Customer" button shown after submitting session summary
   - Opens `EscalateToRfqModal` component
   - Automatically checks if RFQ already exists for this session

2. **Mechanic Sessions List** ([mechanic/sessions/page.tsx](cci:1://file:///c:/Users/Faiz%20Hashmi/theautodoctor/src/app/mechanic/sessions/page.tsx:0:0-0:0))
   - "Create RFQ" button shown on each completed session card
   - Only visible for `status === 'completed'` sessions **AND within 7 days** ✨ NEW
   - Opens same `EscalateToRfqModal` component

3. **Duplicate Prevention**
   - API endpoint: `GET /api/sessions/[id]/rfq-status`
   - Checks if RFQ already created for session
   - Shows warning with existing RFQ details if duplicate detected
   - Provides link to track in Referrals Dashboard

### Components

#### `EscalateToRfqModal` ([components/mechanic/EscalateToRfqModal.tsx](cci:1://file:///c:/Users/Faiz%20Hashmi/theautodoctor/src/components/mechanic/EscalateToRfqModal.tsx:0:0-0:0))
- Full-featured modal for creating draft RFQs
- Features:
  - Title (10-100 chars required)
  - Description (50-1000 chars required)
  - Recommended services (optional)
  - Issue category (dropdown: engine, brakes, electrical, etc.)
  - Urgency level (dropdown: low, normal, high, urgent)
  - **Bid deadline** (dropdown: 24h to 168h, default 72h) ✨ NEW
  - Budget range (optional min/max)
  - Real-time duplicate detection
  - 2% commission banner
  - Success/error handling

### Validation Rules ✨ NEW

#### Session Recency
- **7-Day Limit**: RFQs can only be created for diagnostic sessions completed within the last 7 days
- **Prevents abuse**: Mechanics cannot create RFQs for old/stale sessions
- **API Validation**: Backend enforces this rule in `POST /api/mechanic/rfq/create-draft`
- **UI Visibility**: "Create RFQ" button only shows for sessions within 7 days in sessions list
- **Error Message**: Clear error if mechanic attempts to create RFQ for session >7 days old

#### Bid Deadline Customization
- **Mechanic Control**: Mechanics can set custom bid deadline (24 hours to 1 week)
- **Default**: 72 hours (3 days) - marked as "Recommended"
- **Options**: 24h, 48h, 72h, 96h, 120h, 168h
- **Purpose**: Allows mechanic to align deadline with urgency level
- **Validation**: Backend enforces min 24h, max 168h (1 week)

## Next Steps (Future Enhancements)

### Not Implemented (Optional)

1. **Email Notifications**
   - Email customer when draft RFQ ready
   - Email mechanic when draft approved
   - Email mechanic when commission earned

3. **Admin Payout Management**
   - Admin dashboard to mark referrals as 'paid'
   - Bulk payout processing
   - Stripe payout integration

4. **Referrals Tab in Earnings Page**
   - Add tab to `/mechanic/earnings`
   - Show referrals alongside session earnings
   - Combined earning reports

5. **Analytics**
   - Referral conversion rate
   - Average time to approval
   - Top referring mechanics

---

## Files Created/Modified

### New Files
```
supabase/migrations/20251109030000_add_mechanic_referral_system.sql
src/app/api/mechanic/rfq/create-draft/route.ts
src/app/api/mechanic/referrals/route.ts
src/app/api/customer/rfq/drafts/route.ts
src/app/api/customer/rfq/drafts/[draftId]/approve/route.ts
src/app/mechanic/referrals/page.tsx
src/app/customer/rfq/drafts/page.tsx
MECHANIC_REFERRAL_SYSTEM_IMPLEMENTATION.md (this file)
```

### Modified Files
```
src/components/mechanic/MechanicSidebar.tsx
  - Removed "Quotes" nav item for all mechanics
  - Added "Referrals" nav item
  - Added "Workshop View" button for owner-operators
```

---

## Migration Status

**✅ Migration Applied Successfully**
- Date: January 9, 2025
- Migration File: `20251109030000_add_mechanic_referral_system.sql`
- Status: COMPLETE
- Tables Created: 1 (`mechanic_referral_earnings`)
- Views Created: 1 (`mechanic_referral_summary`)
- Triggers Created: 1 (`trigger_create_mechanic_referral`)
- Functions Created: 1 (`calculate_referral_commission`)

---

## Summary

The Mechanic Referral System is now **fully operational**. Virtual mechanics can create draft RFQs for customers, customers can review and approve them, and mechanics automatically earn 2% commissions when customers accept bids. The system includes:

- ✅ Complete database schema with automatic commission tracking
- ✅ API endpoints for draft RFQ creation and approval
- ✅ Mechanic referrals dashboard page
- ✅ Customer draft RFQ review page
- ✅ Sidebar navigation updates
- ✅ RLS policies for data security
- ✅ Automatic trigger-based commission calculation

**No customer workflow conflicts** - customers can still create RFQs directly OR approve mechanic-created drafts.

**No duplicate workflows** - mechanics no longer have a "Quotes" page; they escalate to RFQ marketplace instead.

**Clean separation** - Workshop owners use workshop sidebar for quotes; mechanics use RFQ escalation for referral earnings.
