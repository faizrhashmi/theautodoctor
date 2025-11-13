# In-Person Diagnostic Implementation Plan
**Date:** 2025-11-12
**Status:** Implementation Ready
**Baseline Document:** Use this as reference for all future sessions

---

## 🎯 EXECUTIVE SUMMARY

### Core Business Model Decision:
**In-person bookings are ONLY available after a diagnostic session (online or in-person).**

### Why This Model:
1. ✅ Protects platform diagnostic revenue (30% commission guaranteed)
2. ✅ Prevents platform from becoming free calendar service
3. ✅ Filters for serious customers (willing to pay for expertise)
4. ✅ No conflict with existing RFQ system
5. ✅ Premium positioning (expertise, not commodity bookings)

---

## 📊 PRICING STRUCTURE

### Tier 1: Chat Diagnostic
- **Price Range:** $19-29 (mechanic sets)
- **Minimum:** $19
- **Commission:** 30%
- **What's Included:** Text chat, photo analysis, written diagnosis
- **Limitations:** No video, 24-48 hour response time

### Tier 2: Video Diagnostic
- **Price Range:** $39-79 (mechanic sets)
- **Minimum:** $39
- **Commission:** 30%
- **What's Included:** 30-45 min live video, real-time diagnosis, screen share
- **Limitations:** No physical inspection

### Tier 3: In-Person Diagnostic
- **Price Range:** $50-100 (mechanic sets)
- **Minimum:** $50
- **Commission:** 30%
- **What's Included:** 45-60 min shop visit, hands-on inspection, professional scan tools, test drive, written report with photos
- **Limitations:** None (most comprehensive)

### Pricing Validation Rules:
```
video_price >= chat_price
in_person_price >= video_price
```

---

## 💳 DIAGNOSTIC CREDIT SYSTEM

### Core Rules:

1. **Credit Validity:** 48 hours after diagnostic session completion
2. **Credit Scope:** Only applies to same mechanic
3. **Credit Type:** Lower tier credits toward higher tier
4. **Credit Usage:** One-time use only

### Credit Scenarios:

**Scenario 1: Chat → In-Person**
```
Customer paid: $25 (chat)
Mechanic's in-person price: $75
Credit applied: $25
Customer owes: $50
Total customer pays: $75 (fair to mechanic)
```

**Scenario 2: Video → In-Person (Same Price)**
```
Customer paid: $50 (video)
Mechanic's in-person price: $50
Credit applied: $50
Customer owes: $0 (FREE)
Total customer pays: $50
```

**Scenario 3: Video → In-Person (Higher Price)**
```
Customer paid: $50 (video)
Mechanic's in-person price: $75
Credit applied: $50
Customer owes: $25
Total customer pays: $75
```

### Credit Expiration:
- **Validity:** 48 hours from diagnostic session `completed_at`
- **After 48 hours:** Credit expires, customer must book new diagnostic
- **Rationale:** Car problems can change quickly, ensures fresh diagnosis

---

## 🗄️ DATABASE SCHEMA CHANGES

### New Table: `mechanic_diagnostic_pricing`
```sql
CREATE TABLE mechanic_diagnostic_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE UNIQUE,

  -- Pricing (mechanic sets, enforced minimums)
  chat_diagnostic_price DECIMAL(10,2) NOT NULL CHECK (chat_diagnostic_price >= 19),
  video_diagnostic_price DECIMAL(10,2) NOT NULL CHECK (video_diagnostic_price >= 39),
  in_person_diagnostic_price DECIMAL(10,2) NOT NULL CHECK (in_person_diagnostic_price >= 50),

  -- Descriptions (what's included)
  chat_diagnostic_description TEXT,
  video_diagnostic_description TEXT,
  in_person_diagnostic_description TEXT,

  -- Hierarchy validation
  CONSTRAINT chk_diagnostic_price_hierarchy CHECK (
    video_diagnostic_price >= chat_diagnostic_price AND
    in_person_diagnostic_price >= video_diagnostic_price
  ),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Modifications to `diagnostic_sessions`
```sql
ALTER TABLE diagnostic_sessions
  ADD COLUMN requires_in_person_follow_up BOOLEAN DEFAULT false,
  ADD COLUMN diagnostic_credit_used BOOLEAN DEFAULT false,
  ADD COLUMN diagnostic_credit_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN in_person_appointment_id UUID REFERENCES workshop_appointments(id);
```

### Modifications to `workshop_appointments`
```sql
ALTER TABLE workshop_appointments
  ADD COLUMN appointment_type VARCHAR(50) DEFAULT 'new_diagnostic' CHECK (
    appointment_type IN ('new_diagnostic', 'in_person_follow_up', 'follow_up_service')
  ),
  ADD COLUMN parent_diagnostic_session_id UUID REFERENCES diagnostic_sessions(id),
  ADD COLUMN diagnostic_credit_applied BOOLEAN DEFAULT false,
  ADD COLUMN diagnostic_credit_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN mechanic_diagnostic_price DECIMAL(10,2),
  ADD COLUMN platform_commission_percent DECIMAL(5,2) DEFAULT 30.00;
```

---

## 🔄 USER FLOWS

### Flow 1: New Customer - Online Diagnostic → In-Person Follow-Up

```
1. Customer searches for mechanic (existing flow)
2. Customer selects mechanic Sarah
3. Customer books video diagnostic ($50)
4. Sarah conducts video session
5. Sarah determines: "I need to see it in person"
6. Sarah marks session: requires_in_person_follow_up = true
7. System sets: diagnostic_credit_expires_at = completed_at + 48 hours
8. Customer receives email: "In-person follow-up needed (FREE - credit applied)"
9. Customer goes to Sarah's profile
10. System detects credit available (within 48 hours)
11. Green banner shows: "FREE In-Person Follow-Up Available"
12. Customer clicks "Book Free Follow-Up"
13. SKIP plan selection → Go straight to calendar
14. Customer selects date/time (within next 48 hours)
15. SKIP payment (amount = $0)
16. Create booking automatically
17. Mark diagnostic_credit_used = true
18. Confirmation: "Paid via diagnostic credit"
```

### Flow 2: Customer Books In-Person Diagnostic Directly

```
1. Customer searches for mechanic
2. Customer sees mechanic Mike's pricing:
   - Chat: $25
   - Video: $50
   - In-Person: $75
3. Customer selects "Book In-Person Diagnostic"
4. Go to calendar scheduling
5. Select date/time
6. Go to payment
7. Pay $75 (30% commission to platform)
8. Booking confirmed
9. Mechanic performs in-person diagnostic
10. Mechanic provides diagnosis + quote
11. Customer decides: accept quote or not
```

### Flow 3: In-Person Diagnostic → Repair Service

```
1. Customer had in-person diagnostic ($75 paid)
2. Mechanic diagnosed: "Need new brakes - $300"
3. Customer wants to accept quote
4. Customer books "Follow-Up Service" with same mechanic
5. This is NOT diagnostic (different appointment_type)
6. Customer pays $300 for repair
7. Platform takes 15% commission ($45)
8. Mechanic gets $255 (85%)
9. Total mechanic earned: $52.50 (diagnostic) + $255 (repair) = $307.50
10. Total platform earned: $22.50 (diagnostic) + $45 (repair) = $67.50
```

---

## 🛡️ BUSINESS LOGIC RULES

### Rule 1: Diagnostic Required Before Follow-Up Services
```typescript
// Validation: Customer must have completed diagnostic within 6 months
// before booking follow-up services (repairs, maintenance)

function canBookFollowUpService(customerId, mechanicId) {
  const hasRecentDiagnostic = await supabase
    .from('diagnostic_sessions')
    .select('id')
    .eq('customer_id', customerId)
    .eq('mechanic_id', mechanicId)
    .eq('status', 'completed')
    .gte('completed_at', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000))
    .single()

  return hasRecentDiagnostic ? true : false
}
```

### Rule 2: Credit Expires After 48 Hours
```typescript
function checkCreditValidity(sessionId) {
  const session = await getSession(sessionId)

  if (!session.requires_in_person_follow_up) {
    return { valid: false, reason: 'No in-person follow-up recommended' }
  }

  if (session.diagnostic_credit_used) {
    return { valid: false, reason: 'Credit already used' }
  }

  const expiresAt = new Date(session.diagnostic_credit_expires_at)
  const now = new Date()

  if (now > expiresAt) {
    return { valid: false, reason: 'Credit expired (48 hours passed)' }
  }

  return { valid: true, expiresAt }
}
```

### Rule 3: Pricing Hierarchy Enforced
```sql
-- Database trigger prevents invalid pricing
CREATE TRIGGER validate_pricing_hierarchy
  BEFORE INSERT OR UPDATE ON mechanic_diagnostic_pricing
  FOR EACH ROW
  EXECUTE FUNCTION validate_diagnostic_pricing_hierarchy();
```

### Rule 4: One Credit Per Session
```typescript
// Customer cannot use same diagnostic credit twice
// Marked in database: diagnostic_credit_used = true
```

---

## 📡 API ENDPOINTS

### New Endpoints to Create:

**1. POST `/api/mechanic/diagnostic-pricing`**
- **Purpose:** Mechanic sets their diagnostic pricing
- **Auth:** Mechanic only
- **Body:**
  ```json
  {
    "chat_diagnostic_price": 25,
    "video_diagnostic_price": 50,
    "in_person_diagnostic_price": 75,
    "chat_diagnostic_description": "Text-based diagnosis...",
    "video_diagnostic_description": "30-min live video...",
    "in_person_diagnostic_description": "45-60 min shop visit..."
  }
  ```
- **Validation:** Enforce minimums and hierarchy

**2. GET `/api/mechanic/diagnostic-pricing/:mechanicId`**
- **Purpose:** Get mechanic's diagnostic pricing
- **Auth:** Public
- **Response:**
  ```json
  {
    "chat_diagnostic_price": 25,
    "video_diagnostic_price": 50,
    "in_person_diagnostic_price": 75,
    "descriptions": {...}
  }
  ```

**3. POST `/api/diagnostic-sessions/:sessionId/require-in-person`**
- **Purpose:** Mechanic marks session as needing in-person follow-up
- **Auth:** Mechanic only (must be session's mechanic)
- **Effect:** Sets `requires_in_person_follow_up = true`, sets expiration

**4. GET `/api/customers/:customerId/diagnostic-credit/:mechanicId`**
- **Purpose:** Check if customer has valid credit with mechanic
- **Auth:** Customer only
- **Response:**
  ```json
  {
    "hasCredit": true,
    "sessionId": "uuid",
    "sessionType": "video",
    "creditAmount": 50,
    "inPersonPrice": 75,
    "amountOwed": 25,
    "isFree": false,
    "expiresAt": "2025-11-14T10:30:00Z",
    "hoursRemaining": 36
  }
  ```

**5. POST `/api/appointments/create-in-person-followup`**
- **Purpose:** Create in-person appointment using diagnostic credit
- **Auth:** Customer only
- **Body:**
  ```json
  {
    "parentSessionId": "uuid",
    "requestedDate": "2025-11-13",
    "requestedTime": "14:00"
  }
  ```
- **Logic:**
  - Validate credit is still valid
  - Calculate amount owed
  - Create appointment
  - Mark credit as used
  - If free, skip payment; if partial, collect difference

**6. POST `/api/payments/create-in-person-diagnostic`**
- **Purpose:** Create payment for in-person diagnostic (with or without credit)
- **Auth:** Customer only
- **Body:**
  ```json
  {
    "mechanicId": "uuid",
    "parentSessionId": "uuid" (optional, if using credit),
    "creditAmount": 50 (optional),
    "totalAmount": 75,
    "amountOwed": 25
  }
  ```
- **Logic:**
  - Create Stripe payment intent for amount owed
  - Store credit information in metadata
  - 30% commission to platform
  - 70% to mechanic

---

## 💰 COMMISSION LOGIC

### All Diagnostics: 30% Commission
```typescript
const DIAGNOSTIC_COMMISSION_PERCENT = 30

function calculateDiagnosticCommission(totalAmount) {
  const mechanicAmount = Math.round(totalAmount * 0.70)
  const platformCommission = totalAmount - mechanicAmount

  return {
    totalAmount,
    mechanicAmount,
    platformCommission,
    commissionPercent: 30
  }
}

// Example: $50 diagnostic
// Mechanic gets: $35
// Platform gets: $15
```

### Follow-Up Services: 15% Commission
```typescript
const SERVICE_COMMISSION_PERCENT = 15

function calculateServiceCommission(totalAmount) {
  const mechanicAmount = Math.round(totalAmount * 0.85)
  const platformCommission = totalAmount - mechanicAmount

  return {
    totalAmount,
    mechanicAmount,
    platformCommission,
    commissionPercent: 15
  }
}

// Example: $300 brake repair
// Mechanic gets: $255
// Platform gets: $45
```

---

## 🔐 PAYMENT FLOWS

### Payment Flow 1: Direct In-Person Diagnostic (No Credit)
```typescript
1. Customer books in-person diagnostic ($75)
2. Create Stripe Payment Intent:
   - Amount: $7500 (cents)
   - Customer: customer_stripe_id
   - Transfer Data:
     - Destination: mechanic_stripe_account_id
     - Amount: $5250 (70% to mechanic)
   - Metadata:
     - type: 'in_person_diagnostic'
     - platform_commission: $2250 (30%)
3. Customer pays $75
4. Stripe automatically:
   - Transfers $52.50 to mechanic
   - Keeps $22.50 for platform
5. Create workshop_appointment record:
   - appointment_type: 'new_diagnostic'
   - total_amount: 75
   - payment_status: 'paid'
   - platform_commission_percent: 30
```

### Payment Flow 2: In-Person Follow-Up (Full Credit)
```typescript
1. Customer books in-person follow-up
2. System checks:
   - Credit available: $50
   - In-person price: $50
   - Amount owed: $0 (FREE)
3. NO payment intent created
4. Create workshop_appointment record:
   - appointment_type: 'in_person_follow_up'
   - parent_diagnostic_session_id: original_session_id
   - diagnostic_credit_applied: true
   - diagnostic_credit_amount: 50
   - total_amount: 0
   - payment_status: 'paid_via_credit'
5. Mark original session: diagnostic_credit_used = true
6. Commission already collected from original session
```

### Payment Flow 3: In-Person Follow-Up (Partial Credit)
```typescript
1. Customer books in-person follow-up
2. System checks:
   - Credit available: $50
   - In-person price: $75
   - Amount owed: $25
3. Create Stripe Payment Intent:
   - Amount: $2500 (cents) - only the difference
   - BUT record full $75 transaction
   - Transfer Data:
     - Destination: mechanic_stripe_account_id
     - Amount: $5250 (70% of FULL $75)
   - Platform gets: $2250 (30% of FULL $75)
   - Customer already paid: $1500 (30% of $50 credit)
   - Platform collects now: $750 (30% of $25)
4. Create workshop_appointment record:
   - appointment_type: 'in_person_follow_up'
   - parent_diagnostic_session_id: original_session_id
   - diagnostic_credit_applied: true
   - diagnostic_credit_amount: 50
   - total_amount: 75 (full price)
   - amount_paid: 25 (difference paid now)
   - payment_status: 'paid'
   - platform_commission_percent: 30
```

---

## 🎨 UI/UX CHANGES

### Mechanic Profile (Customer View)

**When NO credit available:**
```
[Normal booking button]
"Book New Session"
```

**When credit available (48 hours):**
```
[Green alert banner]
✅ In-Person Follow-Up Available
Sarah recommended an in-person inspection after your video diagnostic.

In-Person Diagnostic: $75
Your Credit Applied: -$50
You Pay: $25

Valid for: 36 hours remaining

[Book Follow-Up - Pay $25] (primary button)
```

**When credit expired:**
```
[Yellow alert banner]
⏰ Your diagnostic credit has expired (48 hours passed)
To book in-person with Sarah, you'll need a new diagnostic session.

[Book New Session]
```

### Mechanic Dashboard (Mechanic View)

**Diagnostic Pricing Setup Page:**
```
Set Your Diagnostic Pricing

Chat Diagnostic: $___  (minimum $19)
What's included: [text area]

Video Diagnostic: $___  (minimum $39, must be ≥ chat price)
What's included: [text area]

In-Person Diagnostic: $___  (minimum $50, must be ≥ video price)
What's included: [text area]

[Save Pricing]
```

**During Diagnostic Session:**
```
[After session]
Did you complete the diagnosis?
○ Yes, diagnosis complete
● No, I need to see the vehicle in person

[If "in person" selected]
[Mark as Requiring In-Person Follow-Up]

Effect: Customer will be able to book free in-person visit within 48 hours
```

---

## 🧪 TESTING CHECKLIST

### Scenario 1: Free Follow-Up (Video → In-Person Same Price)
- [ ] Customer books $50 video diagnostic
- [ ] Mechanic marks requires_in_person_follow_up
- [ ] System sets expiration (48 hours)
- [ ] Customer sees green banner with "FREE"
- [ ] Customer books follow-up (amount = $0)
- [ ] No payment collected
- [ ] Appointment created successfully
- [ ] Credit marked as used
- [ ] Mechanic receives $35 total (from original $50)
- [ ] Platform receives $15 total (from original $50)

### Scenario 2: Partial Credit (Video → In-Person Higher Price)
- [ ] Customer books $50 video diagnostic
- [ ] Mechanic marks requires_in_person_follow_up
- [ ] Mechanic's in-person price is $75
- [ ] Customer sees banner with "Pay $25"
- [ ] Customer books follow-up
- [ ] Payment of $25 collected
- [ ] Appointment created with credit_amount = $50, amount_paid = $25
- [ ] Mechanic receives $52.50 total (70% of $75)
- [ ] Platform receives $22.50 total (30% of $75)

### Scenario 3: Credit Expires
- [ ] Customer books $50 video diagnostic
- [ ] Mechanic marks requires_in_person_follow_up
- [ ] Wait 49 hours
- [ ] Customer tries to book follow-up
- [ ] System shows "Credit expired" message
- [ ] Customer must book new diagnostic

### Scenario 4: Direct In-Person Booking (No Prior Session)
- [ ] Customer goes to mechanic Mike (never had session)
- [ ] Customer selects "Book In-Person Diagnostic" ($75)
- [ ] Goes to calendar → payment
- [ ] Pays full $75
- [ ] Appointment created as 'new_diagnostic'
- [ ] Mechanic receives $52.50
- [ ] Platform receives $22.50

### Scenario 5: Diagnostic → Repair Follow-Up
- [ ] Customer had in-person diagnostic ($75 paid)
- [ ] Mechanic provided quote ($300 brake job)
- [ ] Customer accepts quote
- [ ] Books "Follow-Up Service" (within 6 months)
- [ ] Pays $300 for repair
- [ ] Mechanic receives $255 (85% of $300)
- [ ] Platform receives $45 (15% of $300)
- [ ] No diagnostic credit applied (different service type)

---

## 📋 MIGRATION ORDER

1. **Migration 1:** Create `mechanic_diagnostic_pricing` table
2. **Migration 2:** Add columns to `diagnostic_sessions`
3. **Migration 3:** Add columns to `workshop_appointments`
4. **Migration 4:** Create validation triggers
5. **Migration 5:** Create helper functions
6. **Migration 6:** Seed default pricing for existing mechanics (optional)

---

## 🚀 IMPLEMENTATION PHASES

### Phase 1: Database & Backend (Week 1)
- [ ] Create migrations
- [ ] Create API endpoints
- [ ] Implement credit detection logic
- [ ] Implement payment flows
- [ ] Write tests

### Phase 2: Mechanic Dashboard (Week 2)
- [ ] Diagnostic pricing setup page
- [ ] Session "require in-person" button
- [ ] View customers with active credits

### Phase 3: Customer Booking Flow (Week 3)
- [ ] Credit banner on mechanic profile
- [ ] Modified booking flow (skip plan selection for follow-ups)
- [ ] Payment page with credit display
- [ ] Confirmation page with credit breakdown

### Phase 4: Testing & Launch (Week 4)
- [ ] End-to-end testing all scenarios
- [ ] UAT with test mechanics
- [ ] Documentation for mechanics
- [ ] Customer email templates
- [ ] Launch

---

## 📊 SUCCESS METRICS

### Platform Revenue Protection:
- **Target:** 100% of in-person bookings start with diagnostic
- **Metric:** `(in_person_diagnostics / total_in_person_appointments) * 100`
- **Goal:** 100%

### Credit Utilization:
- **Target:** 60%+ of customers who receive credit use it
- **Metric:** `(credits_used / credits_issued) * 100`
- **Goal:** 60%+

### Revenue Per Customer:
- **Baseline:** $15 (single diagnostic)
- **Target with follow-ups:** $60+ (diagnostic + repair)
- **Metric:** `total_revenue / unique_customers`

### Mechanic Satisfaction:
- **Target:** 80%+ mechanics enable in-person diagnostics
- **Metric:** `(mechanics_with_in_person_pricing / total_mechanics) * 100`
- **Goal:** 80%+

---

## 🔄 INTEGRATION WITH EXISTING SYSTEMS

### No Conflicts With:
- ✅ **Online Diagnostic Sessions** (chat/video) - unchanged
- ✅ **RFQ System** - still works for competitive bidding
- ✅ **Workshop Repairs** - still 15% commission
- ✅ **Virtual Mechanic Referrals** - still 2% to virtual mechanics
- ✅ **Stripe Connect** - same payment infrastructure
- ✅ **Mechanic Availability** - used for in-person scheduling

### Enhances:
- ✅ **Diagnostic Sessions** - now can lead to in-person follow-ups
- ✅ **Mechanic Revenue** - more opportunities to convert to repairs
- ✅ **Customer Journey** - clear path from diagnosis to repair
- ✅ **Platform Value** - more than just video calls

---

## 📝 DOCUMENTATION REQUIRED

### For Mechanics:
- [ ] "How to Set Your Diagnostic Pricing" guide
- [ ] "When to Recommend In-Person Follow-Up" guide
- [ ] "Understanding Diagnostic Credits" explainer

### For Customers:
- [ ] "How Diagnostic Credits Work" FAQ
- [ ] "What's Included in Each Diagnostic Tier" comparison
- [ ] "Why Book Through Platform vs. Direct" value proposition

### For Support Team:
- [ ] "Handling Credit Expiration Questions" playbook
- [ ] "Troubleshooting Payment Issues with Credits" guide
- [ ] "Mechanic Pricing Setup Assistance" script

---

## ✅ READY FOR IMPLEMENTATION

**All stakeholders aligned:**
- [x] Business model defined
- [x] Pricing structure finalized
- [x] Technical approach validated
- [x] User flows mapped
- [x] Database schema designed
- [x] API endpoints specified
- [x] Payment flows documented
- [x] Testing plan created

**Next Step:** Execute implementation following this plan.

**Baseline:** If new session starts, refer back to this document as source of truth.
