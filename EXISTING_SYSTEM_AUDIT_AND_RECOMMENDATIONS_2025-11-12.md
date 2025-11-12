# Existing System Audit & Business Model Recommendations
**Date:** 2025-11-12
**Purpose:** Comprehensive analysis of current system + Strategic recommendations for in-person bookings

---

## 🔍 PART 1: WHAT ALREADY EXISTS

### ✅ Mechanic Availability System - ALREADY BUILT

**Location:**
- UI: `src/app/mechanic/availability/page.tsx` (544 lines, fully functional)
- API: `src/app/api/mechanic/availability/route.ts` (GET + PUT endpoints)
- Table: `mechanic_availability` (already exists in database)

**Current Features:**
1. ✅ Mechanics can set weekly availability blocks
2. ✅ Can set different times for each day of week (0-6)
3. ✅ Can add multiple blocks per day
4. ✅ Can toggle blocks active/inactive
5. ✅ Time-off/vacation management (separate table)
6. ✅ Visual weekly overview

**Database Schema:**
```sql
CREATE TABLE mechanic_availability (
  id UUID PRIMARY KEY,
  mechanic_id UUID REFERENCES mechanics(id),
  day_of_week INTEGER (0-6), -- 0=Sunday, 6=Saturday
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**What's MISSING:**
❌ No validation against workshop hours for workshop_affiliated mechanics
❌ No enforcement of business logic (independent vs affiliated)
❌ Booking system doesn't filter by mechanic_availability yet

---

### ✅ Stripe Connect Integration - ALREADY BUILT

**Location:**
- Mechanic Onboarding: `src/app/api/mechanics/stripe/onboard/route.ts`
- Workshop Onboarding: `src/app/api/workshop/stripe/onboard/route.ts`
- Database: `mechanics` and `organizations` tables have `stripe_account_id` field

**Current Features:**
1. ✅ Stripe Express account creation
2. ✅ Onboarding link generation
3. ✅ Account ID stored in database
4. ✅ Separate flows for mechanics and workshops

**What's MISSING:**
❌ No destination charges (direct payment splitting)
❌ No commission deduction logic
❌ No payment flow for in-person bookings
❌ No enforcement that workshops must onboard before accepting bookings

---

### ✅ Payment & Commission Structure - ALREADY DEFINED

**Location:** `supabase/migrations/20251108100000_add_platform_fee_settings.sql`

**Current Structure:**
```sql
platform_fee_settings (
  -- Online Diagnostic Sessions
  default_session_mechanic_percent: 70.00
  default_session_platform_percent: 30.00

  -- Workshop Quotes/Repairs (RFQ system)
  default_workshop_quote_platform_fee: 15.00

  -- Mechanic Referrals (virtual mechanics → RFQ)
  default_referral_fee_percent: 2.00

  -- Workshop Escalations (mechanic refers to workshop)
  workshop_escalation_referral_percent: 5.00
)
```

**YOUR CLEAR FEE STRUCTURE:**

| Revenue Stream | Platform Fee | Service Provider Gets |
|---|---|---|
| **Online Diagnostics** | **30%** | Mechanic gets **70%** |
| **Workshop Quotes** | **15%** | Workshop gets **85%** |
| **RFQ Referrals** | **2%** | Referring mechanic gets **2%** of bid |
| **Workshop Escalations** | **5%** | Escalating mechanic gets **5%** |

---

### ❌ In-Person Payment Flow - NOT IMPLEMENTED

**Current Code:**
```typescript
// src/components/customer/scheduling/ReviewAndPaymentStep.tsx
const calculateTotal = () => {
  if (wizardData.sessionType === 'in_person') {
    return 15 // $15 deposit
  }
  return wizardData.planPrice
}
```

**Problem:**
- Deposit amount is hardcoded
- NO ACTUAL PAYMENT PROCESSING for in-person
- handlePayment() calls `/api/intake/start` which creates session but NO STRIPE PAYMENT
- Payment status set to 'deposit_paid' but NO MONEY ACTUALLY COLLECTED

**Critical Gap:**
```typescript
// src/app/api/sessions/create-scheduled/route.ts line 121
payment_status: sessionType === 'in_person' ? 'deposit_paid' : 'paid',
// ⚠️ This just sets a flag - NO ACTUAL PAYMENT HAPPENS
```

---

## 🚨 PART 2: CRITICAL PROBLEMS TO SOLVE

### Problem #1: Workshop-Affiliated Mechanics Can Break Workshop Schedule

**Scenario:**
```
Workshop Hours: Mon-Fri 9AM-5PM
Mechanic John (affiliated): Sets availability Mon-Fri 8AM-9PM

Customer books at 7PM → John accepts → Workshop is closed → Customer arrives to locked doors
```

**Why This Breaks:**
- No validation trigger exists
- Mechanic dashboard doesn't check workshop_id
- Independent and affiliated mechanics use same UI

**Impact:**
- Bad customer experience
- Workshop upset (mechanic scheduling without permission)
- Platform liability

---

### Problem #2: In-Person Bookings Collect NO MONEY

**Current Flow:**
```
Customer clicks "Pay $15 & Confirm"
    ↓
No Stripe payment created
    ↓
Session created with payment_status = 'deposit_paid' (lie)
    ↓
Customer arrives at workshop
    ↓
Customer and mechanic "handle it between them"
    ↓
Platform gets NOTHING
```

**Why This is Catastrophic:**
1. ❌ Customer thinks they paid $15, but didn't
2. ❌ No money in escrow = no leverage
3. ❌ Customer can walk away without paying (legally!)
4. ❌ Platform has NO commission collection mechanism
5. ❌ Mechanic can accept cash, bypass platform entirely

---

### Problem #3: "Cannot Charge Upfront Because Mechanic Has to See Car First"

**Your Concern:**
> "CANNOT CHARGE UPFRONT BECAUSE MECHANIC HAS TO SEE THE CAR, SO AT THE TIME OF APPOINTMENT FOR IN PERSON SHOULD BE FREE YOU THINK? AND THEN WHEN CUSTOMER SHOW UP AND THEY DECIDE TO HANDLE IT BETWEEN THEM, PLATFORM GETS NOTHING"

**This is the CORE BUSINESS MODEL QUESTION:**

Should in-person bookings be:
- **Option A:** FREE to book, payment after inspection?
- **Option B:** Paid booking fee (non-refundable)?
- **Option C:** Deposit booking, balance after service?

**Problem with Option A (FREE):**
- ❌ Customer no-shows cost mechanic time
- ❌ Customer pays mechanic directly in cash
- ❌ Platform gets bypassed
- ❌ No way to enforce commission

**Problem with Option C (DEPOSIT):**
- ❌ Only $15 upfront = not enough to prevent no-shows
- ❌ Balance payment relies on goodwill
- ❌ Customer can refuse to pay balance
- ❌ Canadian law: can't hold customer hostage

---

## 💡 PART 3: RECOMMENDED BUSINESS MODEL

### 🎯 Recommended Model: "Booking Fee + Inspection + Quote + Service"

**Step-by-Step Flow:**

### STEP 1: Customer Books In-Person Inspection Appointment

**What Customer Pays:** **$50 NON-REFUNDABLE INSPECTION FEE**

**What Customer Gets:**
- Guaranteed appointment slot
- Mechanic physically inspects vehicle (30-60 minutes)
- Verbal diagnostic findings
- Written quote for repairs (if needed)

**Why This Works:**
- ✅ Customer is serious (paid $50)
- ✅ Mechanic gets paid for their time (even if customer declines quote)
- ✅ Platform gets commission (30% = $15)
- ✅ Customer can't bypass platform (already paid)

**Payment Flow:**
```
Customer books inspection → Stripe charges $50
    ↓
Platform holds $50 for 7 days (automatic escrow)
    ↓
Mechanic performs inspection
    ↓
Mechanic provides quote to customer
    ↓
After inspection complete, platform releases:
    → $35 to mechanic (70%)
    → $15 to platform (30%)
```

---

### STEP 2: Customer Accepts Quote for Repair Work

**What Happens:**
- Mechanic creates workshop RFQ (Request for Quote) in system
- RFQ shows: Parts needed, labor hours, total cost (e.g., $800)
- Customer sees quote in their dashboard
- Customer can:
  - **Accept:** Proceed with this mechanic
  - **Get Bids:** Post RFQ to workshop marketplace
  - **Decline:** Just paid $50 for inspection, no further obligation

**If Customer Accepts Mechanic's Quote:**

**Option 2A: Mechanic is Independent Workshop**
```
Customer pays $800 via platform
    ↓
Platform holds $800 in escrow (Stripe)
    ↓
Mechanic completes repair
    ↓
Customer confirms completion
    ↓
Platform releases payment:
    → $680 to mechanic (85% of $800) ← 15% commission for full repair
    → $120 to platform (15%)
```

**Option 2B: Mechanic Refers to Workshop (If too complex)**
```
Mechanic creates RFQ for customer
    ↓
Workshop bids $1000
    ↓
Customer accepts bid
    ↓
Customer pays $1000 via platform
    ↓
Workshop completes repair
    ↓
Platform releases payment:
    → $50 to mechanic (5% escalation referral)
    → $850 to workshop (85% of $1000)
    → $100 to platform (10% net commission)
```

---

## 📊 REVISED FEE STRUCTURE FOR IN-PERSON

| Service | Customer Pays | Platform Fee | Mechanic/Workshop Gets | Notes |
|---------|---------------|--------------|------------------------|-------|
| **In-Person Inspection** | $50 | 30% ($15) | 70% ($35) | Non-refundable booking fee |
| **Independent Mechanic Repair** | Quote amount | 15% | 85% | If mechanic does repair |
| **Workshop Repair (Direct)** | Quote amount | 15% | 85% | Workshop completes repair |
| **Workshop Repair (Referred)** | Quote amount | 10% + 5% referral | Workshop: 85%, Mechanic: 5% | Mechanic referred customer |

**KEY INSIGHT:** This is actually SAME as your online model:
- Inspection = Diagnostic session (30% platform fee)
- Repair quote = Workshop quote (15% platform fee)

---

## 🔐 HOW TO PREVENT PLATFORM BYPASS

### Enforcement Mechanism #1: Payment Required Before Service

```typescript
// When customer books in-person inspection:
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000, // $50
  currency: 'cad',
  customer: stripeCustomerId,
  payment_method: paymentMethodId,
  confirm: true,
  metadata: {
    session_id: sessionId,
    session_type: 'in_person_inspection',
    mechanic_id: mechanicId
  }
})

// Store in database:
payment_status: 'paid'
payment_amount: 5000
payment_intent_id: paymentIntent.id
```

**Result:** Customer has ALREADY PAID. Can't bypass platform.

---

### Enforcement Mechanism #2: Commission Deduction BEFORE Workshop Payment

**For repairs via independent mechanics:**
```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 80000, // $800 repair quote
  currency: 'cad',
  customer: stripeCustomerId,
  transfer_data: {
    destination: mechanicStripeAccountId,
    amount: 68000, // $680 (85% after 15% commission)
  },
  metadata: {
    platform_commission: 12000, // $120 stays with platform
    rfq_id: rfqId
  }
})
```

**Result:** Commission deducted AUTOMATICALLY. Mechanic can't skip paying platform.

---

### Enforcement Mechanism #3: Penalties for Cash Transactions

**Terms of Service Clause:**
```
Mechanics who accept payment outside the platform will:
1. Be permanently banned from platform
2. Forfeit all pending payouts
3. Be charged 3x the transaction amount
```

**Detection Methods:**
- Customer reports ("Mechanic asked for cash")
- Random spot-checks via customer surveys
- Anomaly detection (booked but payment never processed)

---

## 🎯 PART 4: COMPLETE IN-PERSON IMPLEMENTATION PLAN

### Phase 2A: CRITICAL FIXES (15-20 hours)

#### Fix #1: Validate Mechanic Availability Against Workshop Hours

**New Database Trigger:**
```sql
CREATE OR REPLACE FUNCTION validate_mechanic_availability_against_workshop()
RETURNS TRIGGER AS $$
DECLARE
  v_mechanic_type TEXT;
  v_workshop_id UUID;
  v_workshop_hours RECORD;
BEGIN
  -- Get mechanic type and workshop
  SELECT mechanic_type, workshop_id INTO v_mechanic_type, v_workshop_id
  FROM mechanics WHERE id = NEW.mechanic_id;

  -- If workshop_affiliated, ENFORCE workshop hours
  IF v_mechanic_type = 'workshop_affiliated' THEN
    SELECT open_time, close_time, is_open INTO v_workshop_hours
    FROM workshop_availability
    WHERE workshop_id = v_workshop_id
      AND day_of_week = NEW.day_of_week;

    -- Reject if workshop closed that day
    IF v_workshop_hours.is_open = false THEN
      RAISE EXCEPTION 'Workshop is closed on %. You cannot set availability.',
        CASE NEW.day_of_week
          WHEN 0 THEN 'Sunday' WHEN 1 THEN 'Monday' WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday' WHEN 4 THEN 'Thursday' WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday' END;
    END IF;

    -- Reject if times outside workshop hours
    IF NEW.start_time < v_workshop_hours.open_time THEN
      RAISE EXCEPTION 'Start time % is before workshop opens at %',
        NEW.start_time, v_workshop_hours.open_time;
    END IF;

    IF NEW.end_time > v_workshop_hours.close_time THEN
      RAISE EXCEPTION 'End time % is after workshop closes at %',
        NEW.end_time, v_workshop_hours.close_time;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_workshop_hours_for_affiliated_mechanics
  BEFORE INSERT OR UPDATE ON mechanic_availability
  FOR EACH ROW EXECUTE FUNCTION validate_mechanic_availability_against_workshop();
```

**Effort:** 2-3 hours

---

#### Fix #2: Implement $50 Inspection Fee Payment

**Update ReviewAndPaymentStep.tsx:**
```typescript
const calculateInspectionFee = () => {
  if (wizardData.sessionType === 'in_person') {
    return 5000 // $50 inspection fee (in cents)
  }
  return wizardData.planPrice // Online diagnostic
}

const handlePayment = async () => {
  // ... existing code ...

  // Create Stripe payment intent
  const paymentRes = await fetch('/api/payments/create-inspection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: calculateInspectionFee(),
      sessionType: wizardData.sessionType,
      mechanicId: wizardData.mechanicId,
      sessionId: sessionId
    })
  })

  const { clientSecret } = await paymentRes.json()

  // Confirm payment with Stripe
  const { error: stripeError } = await stripe.confirmCardPayment(clientSecret)

  if (stripeError) {
    throw new Error(stripeError.message)
  }

  // Payment succeeded - create session
  // ... rest of flow ...
}
```

**New API Endpoint:** `src/app/api/payments/create-inspection/route.ts`
```typescript
export async function POST(req: NextRequest) {
  // 1. Get authenticated user
  // 2. Get mechanic's Stripe account ID
  // 3. Create payment intent with destination charge
  const paymentIntent = await stripe.paymentIntents.create({
    amount: body.amount,
    currency: 'cad',
    customer: customerId,
    transfer_data: {
      destination: mechanicStripeAccountId,
      amount: Math.round(body.amount * 0.70) // 70% to mechanic
    },
    metadata: {
      session_type: 'in_person_inspection',
      mechanic_id: body.mechanicId,
      platform_commission_percent: 30
    }
  })

  return NextResponse.json({ clientSecret: paymentIntent.client_secret })
}
```

**Effort:** 4-6 hours

---

#### Fix #3: Update UI to Show Inspection Fee

**Update ReviewAndPaymentStep pricing display:**
```tsx
{wizardData.sessionType === 'in_person' && (
  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
    <div className="text-sm text-blue-200 mb-2">
      <strong>In-Person Inspection</strong>
    </div>
    <div className="text-white">
      <strong className="text-2xl">${50}</strong>
      <span className="text-slate-400 text-sm ml-2">inspection fee</span>
    </div>
    <div className="text-xs text-slate-400 mt-2">
      Non-refundable. Includes 30-60 min vehicle inspection + written diagnostic report.
      If you proceed with repairs, we'll provide a detailed quote.
    </div>
  </div>
)}
```

**Effort:** 1-2 hours

---

#### Fix #4: Workshop Address Validation (Already Done in Phase 1) ✅

---

### Phase 2B: Quote Workflow (20-25 hours)

#### Feature #1: Mechanic Creates Post-Inspection Quote

**New UI:** `src/app/mechanic/sessions/[id]/create-quote/page.tsx`

Mechanic fills out:
- Parts needed (itemized)
- Labor hours estimate
- Total cost
- Photos of issues (upload)
- Timeline (e.g., "2-3 days")

**API:** `POST /api/mechanic/quotes/create`

**Database:** Store in `workshop_rfq_marketplace` table (already exists)

**Effort:** 8-10 hours

---

#### Feature #2: Customer Quote Acceptance Flow

**Customer Dashboard Shows:**
```
Your Inspection is Complete!
Mechanic: John Smith
Issue Found: Brake pads worn, rotors need resurfacing
Quote: $450 (parts: $200, labor: $250)
Timeline: 2-3 days

[Accept Quote & Pay] [Get Other Bids] [Decline]
```

**Payment on Accept:**
- Charge full $450 via Stripe
- Hold in escrow
- Deduct 15% commission ($67.50)
- Release $382.50 to mechanic after completion

**Effort:** 8-10 hours

---

#### Feature #3: Completion Confirmation

**After Repair:**
- Mechanic marks as complete
- Customer gets notification
- Customer confirms (with photos)
- Payment auto-released after 7 days (escrow)

**Effort:** 4-5 hours

---

## 📋 SUMMARY & RECOMMENDATIONS

### ✅ What Already Works
1. Mechanic availability UI (fully built)
2. Stripe Connect onboarding (already integrated)
3. 70/30 commission structure (clearly defined)
4. Workshop hours system (exists for workshops)

### ❌ What's Broken
1. No validation of mechanic availability vs workshop hours
2. In-person bookings collect NO MONEY (critical bug)
3. No commission enforcement for in-person services
4. Customer can bypass platform and pay mechanic directly

### 🎯 Recommended Business Model

**For In-Person Bookings:**
1. **$50 inspection fee** (non-refundable, 30% platform commission)
2. **Inspection → Quote → Payment** workflow
3. **Full payment upfront** for repairs (held in Stripe escrow)
4. **15% commission** on repairs (same as workshop quotes)

**Why This Works:**
- ✅ Customer is committed ($50 paid upfront)
- ✅ Mechanic gets paid for inspection time
- ✅ Platform gets commission on BOTH inspection AND repair
- ✅ No way to bypass platform (payment already processed)
- ✅ Legally compliant (Stripe handles escrow)
- ✅ Fair to all parties (mechanic, customer, platform)

### 🚀 Implementation Priority

**URGENT (Do Now):**
1. Add Stripe payment for $50 inspection fee (4-6 hrs)
2. Add workshop hours validation trigger (2-3 hrs)
3. Update UI to show inspection fee clearly (1-2 hrs)

**HIGH (Do Next Week):**
4. Build mechanic quote creation UI (8-10 hrs)
5. Build customer quote acceptance flow (8-10 hrs)
6. Add escrow hold/release logic (4-5 hrs)

**MEDIUM (Do Later):**
7. Add workshop hours display in booking flow
8. Add distance calculation (Haversine - FREE)
9. Add payment analytics dashboard

---

## 💰 Projected Revenue Per In-Person Booking

**Scenario: Customer books in-person inspection**
```
Inspection Fee: $50
Platform Commission (30%): $15 ✅

If Customer Accepts Quote for $500 Repair:
Platform Commission (15%): $75 ✅

TOTAL PLATFORM REVENUE: $90 per completed job
```

**vs. Current System (FREE booking):**
```
Platform Revenue: $0 ❌
Mechanic bypasses platform: 100% chance
```

---

**Next Step:** Approve this business model and I'll implement the $50 inspection fee payment flow first.

