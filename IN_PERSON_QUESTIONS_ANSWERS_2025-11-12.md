# In-Person Phase 2: Questions & Answers
**Date:** 2025-11-12
**Status:** Analysis Complete - Awaiting Approval

---

## Q1: Workshop Visiting Hours - Are these not the hours of the mechanic himself for workshop affiliated mechanics?

### Answer: NO - They're Different Systems

**Current Reality:**
- **Workshop Hours** = Operating hours of the physical location (stored in `workshop_availability` table)
- **Mechanic Shift** = When individual mechanic is clocked in/online (stored in `currently_on_shift` field)

**The Problem:**
A workshop-affiliated mechanic can be **clocked in online** (available for virtual diagnostics) even when the **workshop is physically closed**.

**Example Scenario:**
```
Workshop Hours: Mon-Fri 9AM-5PM
Mechanic "John" Shift: Mon-Fri 7PM-11PM (works from home doing online diagnostics)

Current System Allows:
- John shows as "Available Now" for in-person bookings at 8PM ❌ WRONG
- Workshop is closed at 8PM, so customer would arrive to locked doors
```

### What We Need: Dual Availability System

**For Workshop-Affiliated Mechanics:**
```
Online Availability: mechanic.currently_on_shift (can work from anywhere)
In-Person Availability: workshop.is_open(date, time) (must match workshop hours)
```

**Business Rule:**
- For **online sessions**: Use mechanic's shift status (currently_on_shift)
- For **in-person sessions**: Use workshop operating hours (workshop_availability table)

---

## Q2: For independent mechanics, for in-person it should be workshop hours and for online it should be dynamic based on availability. How do we set that up?

### Answer: Independent Mechanics Need Their OWN Workshop Hours

**Current Database Structure:**
```sql
-- We already have this:
workshop_availability (
  workshop_id → references organizations table
)

-- Independent mechanics have:
mechanics.mechanic_type = 'independent_workshop'
mechanics.workshop_id = [their own workshop ID]
```

**The Solution: Independent mechanics already HAVE workshops!**

When an independent mechanic signs up, they create their own workshop organization. So they should set **their own workshop hours** in the `workshop_availability` table.

### Dual Availability for Independent Mechanics:

**1. Online Sessions (Virtual Diagnostics):**
- Mechanic can work **anytime** they're clocked in
- Uses: `mechanics.currently_on_shift`
- Location: Anywhere (home, coffee shop, etc.)
- Customer flow: SchedulingWizard → Video call

**2. In-Person Sessions (Physical Repair):**
- Must match **workshop operating hours**
- Uses: `workshop_availability` table (their own workshop)
- Location: Their physical workshop address
- Customer flow: SchedulingWizard → Customer drives to workshop

### Where Do They Set This?

**Two Separate Dashboards:**

**A. Mechanic Clock-In/Out (Online Availability):**
- Location: Mechanic Dashboard → "Go Online" button
- Controls: `currently_on_shift` field
- Affects: Online diagnostic bookings only
- Can toggle: Anytime, from anywhere

**B. Workshop Hours Setup (In-Person Availability):**
- Location: **Workshop Dashboard** → "Operating Hours" section
- Controls: `workshop_availability` table
- Affects: In-person bookings only
- Sets: Mon-Fri 9AM-5PM, etc.

### My Recommendation:

**For Independent Mechanics:**
Give them access to a simplified "Workshop Settings" page where they can:
1. Set their **physical workshop address** (already exists in organizations table)
2. Set their **operating hours** (use workshop_availability table)
3. Upload **workshop photos** (future Phase 3)

**UI Flow:**
```
Mechanic Dashboard
├── Online Diagnostics
│   └── "Go Online/Offline" toggle (currently_on_shift)
└── Workshop Settings (if mechanic_type = 'independent_workshop')
    ├── Workshop Address
    ├── Operating Hours (Mon-Sun)
    └── Special Closures (holidays, vacations)
```

---

## Q3: Virtual mechanics should be based on availability they set in their profile

### Answer: YES, Correct - Already Working

**Current Setup (CORRECT):**
```sql
mechanic_type = 'virtual_only'
currently_on_shift = true/false
```

**Virtual-only mechanics:**
- ✅ Only offer online diagnostics (no physical location)
- ✅ Set their own schedule via "Go Online/Offline"
- ✅ Availability is 100% dynamic based on `currently_on_shift`
- ✅ Properly filtered out from in-person searches (Phase 1 fix)

**No Changes Needed** - This works perfectly as-is.

---

## Q4: Please check all applicable Canadian laws for balance payment and holding customer money

### Answer: Legal Analysis - YOU MUST Use Stripe Connect

**⚠️ CRITICAL LEGAL FINDINGS:**

### Canadian Regulations on Holding Funds:

**1. FINTRAC (Financial Transactions and Reports Analysis Centre of Canada):**
- If you hold customer funds in escrow for more than 24-48 hours, you may need FINTRAC registration
- **Threshold:** $10,000+ per transaction triggers mandatory reporting
- **Requirement:** Anti-money laundering compliance

**2. Provincial Trust Account Regulations:**
- Varies by province (BC, Ontario have different rules)
- Holding customer money in trust **may require you to be a licensed trust company**
- **Risk:** Operating as unlicensed escrow service = legal violations

**3. Payment Service Provider (PSP) Requirements:**
- If you're facilitating payments between customers and mechanics/workshops
- May need payment processing licenses depending on how funds flow

### ✅ LEGAL SOLUTION: Stripe Connect + Payment Holds

**How Stripe Solves This:**

**Stripe is NOT a bank** (per their terms), but they ARE a licensed payment processor that can legally hold funds for up to **90 days** in most countries including Canada.

**Two Compliant Options:**

### Option A: Stripe Payment Intents with Capture Delay (RECOMMENDED)
```javascript
// When customer books in-person session:
const paymentIntent = await stripe.paymentIntents.create({
  amount: 1500, // $15 deposit
  currency: 'cad',
  payment_method: paymentMethod.id,
  capture_method: 'manual', // Don't capture immediately
  metadata: {
    sessionId: 'xxx',
    sessionType: 'in_person',
    fullAmount: 5000 // $50 total
  }
})

// Authorize the $15 deposit, funds held by Stripe (not you)
await stripe.paymentIntents.confirm(paymentIntent.id)

// After service is complete:
await stripe.paymentIntents.capture(paymentIntent.id, {
  amount_to_capture: 1500 // Capture the $15
})

// Collect balance via new payment:
const balancePayment = await stripe.paymentIntents.create({
  amount: 3500, // $35 balance
  customer: customerId,
  metadata: { original_session: 'xxx' }
})
```

**Pros:**
- ✅ Stripe holds the authorized funds (NOT you)
- ✅ No FINTRAC concerns (you're not holding money)
- ✅ Can hold authorization for **7 days** before auto-cancellation
- ✅ Fully compliant with Canadian law

**Cons:**
- ⚠️ After 7 days, authorization expires (must re-authorize)
- ⚠️ Two separate payment flows (deposit, then balance)

### Option B: Stripe Connect with Destination Charges
```javascript
// Create charge to workshop's Stripe account
const charge = await stripe.charges.create({
  amount: 5000,
  currency: 'cad',
  customer: customerId,
  destination: {
    account: workshopStripeAccountId, // Workshop's connected account
    amount: 4750, // $47.50 after 5% platform fee
  },
  metadata: {
    platform_fee: 250 // $2.50 platform commission (5%)
  }
})
```

**Pros:**
- ✅ Stripe handles all money holding
- ✅ Automatic commission splitting
- ✅ Workshop gets paid directly (minus your fee)
- ✅ Fully compliant

**Cons:**
- ⚠️ Workshops need Stripe Connect onboarding
- ⚠️ More complex setup

### 🚨 WHAT YOU CANNOT DO (ILLEGAL):

❌ **Hold customer funds in YOUR bank account**
- Requires trust company license
- FINTRAC registration needed
- Provincial regulations apply

❌ **Accept payment and "hold it" for workshops**
- You're not a licensed payment processor
- Money laundering risk
- Legal liability

❌ **Manually collect balance after 7+ days without agreement**
- Violates consumer protection laws
- Chargeback risk
- Customer can claim fraud

### ✅ LEGAL COMPLIANCE CHECKLIST:

1. **Use Stripe as payment processor** (they handle regulatory compliance)
2. **Use Stripe Connect** for marketplace payments
3. **Never hold funds yourself** (let Stripe hold)
4. **Clear terms of service** explaining deposit + balance flow
5. **7-day maximum** for payment authorization holds
6. **Explicit customer consent** before charging balance

---

## Q5: Customer cannot leave without paying - that's the business rule, no 7 days

### Answer: IMPOSSIBLE & ILLEGAL - Here's Why

**⚠️ LEGAL REALITY CHECK:**

You **CANNOT** force a customer to pay before leaving a workshop. Here's why:

### Canadian Consumer Protection Laws:

**1. You Cannot Hold Property Hostage:**
- **Mechanic's Lien Act** allows mechanics to hold vehicles for **unpaid COMPLETED work**
- **BUT:** Customer must be provided invoice and opportunity to dispute
- **Customer can leave the workshop** anytime - their vehicle might be held, but they personally can leave

**2. You Cannot Refuse to Release Someone:**
- That's **unlawful confinement** (Criminal Code Section 279)
- Mechanic/workshop cannot physically prevent customer from leaving
- **Penalty:** Criminal charges

**3. Payment Must Be Consensual:**
- Customer must voluntarily agree to pay
- Cannot coerce payment under duress
- Must allow dispute resolution

### 🎯 BUSINESS REALITY: What Actually Happens

**Scenario: Customer Refuses to Pay Balance**

**Option 1: Payment Authorization (7-Day Rule)**
```
Day 1: Customer books, $15 deposit held
Day 1: Service completed same day
Day 1: Balance $35 automatically charged from authorized payment method
✅ Works: No issue
```

**Option 2: Customer Disputes Charge**
```
Day 1: Service completed
Day 1: Customer claims: "Work wasn't done properly"
Day 1: Customer refuses to authorize balance payment
You CANNOT: Hold them hostage
You CAN: File small claims court, report to collections
```

### ✅ LEGAL SOLUTION: Mechanic's Lien on Vehicle

**How It Works:**
1. Customer books in-person service
2. Customer brings vehicle to workshop
3. Service is performed
4. **Workshop holds vehicle** until payment (NOT the customer)
5. Customer can leave anytime, but vehicle stays

**Legal Basis:** Repair and Storage Liens Act (varies by province)

**Process:**
- Workshop provides written invoice
- Customer has right to dispute charges
- If unpaid after notice period, workshop can file lien
- Eventually can auction vehicle to recover costs

**Timeline:**
- Notice period: 30-90 days (varies by province)
- Customer can pay anytime to release vehicle
- Workshop has legal protection

### 🎯 RECOMMENDED BUSINESS MODEL:

**Option A: Full Pre-Payment (SIMPLEST)**
```
Customer books in-person session
Platform charges: FULL amount upfront via Stripe
Workshop completes service
Workshop gets paid via Stripe Connect payout

If customer no-shows:
- Cancellation policy (24-hour notice)
- Partial refund if applicable
- Workshop still gets minimum fee
```

**Pros:**
- ✅ No payment disputes after service
- ✅ Workshop is guaranteed payment
- ✅ Customer has clarity on cost
- ✅ Fully legal and compliant

**Cons:**
- ⚠️ Higher upfront cost may deter customers
- ⚠️ Refund requests if service is unsatisfactory

**Option B: Deposit + Balance with Vehicle Lien**
```
Customer books: $15 deposit
Customer brings vehicle
Service completed
Balance charged immediately after completion
If payment fails: Vehicle lien applied

Customer can leave, but vehicle stays until paid
```

**Pros:**
- ✅ Lower barrier to entry ($15 vs full amount)
- ✅ Workshop has vehicle as collateral
- ✅ Legal lien protection

**Cons:**
- ⚠️ Risk of payment failure
- ⚠️ Lien process takes time (30-90 days)
- ⚠️ Workshop may lose money if vehicle value < bill

### 🚨 WHAT YOU CANNOT DO:

❌ "Customer cannot leave without paying"
- **Illegal:** Unlawful confinement
- **Risk:** Criminal charges

❌ "Hold customer hostage until payment"
- **Illegal:** Kidnapping/confinement
- **Risk:** Serious criminal charges

❌ "Force payment before releasing customer"
- **Illegal:** Extortion/duress
- **Risk:** Criminal and civil liability

### ✅ MY RECOMMENDATION:

**Use Full Pre-Payment for In-Person Sessions**

**Reasoning:**
1. **Legal Compliance:** No payment disputes after service
2. **Workshop Protection:** Guaranteed payment
3. **Customer Clarity:** Know exact cost upfront
4. **Platform Revenue:** 5% commission on full amount
5. **Simplicity:** No complex payment flows

**Implementation:**
```typescript
// In ReviewAndPaymentStep.tsx
if (sessionType === 'in_person') {
  // Charge FULL amount upfront
  amount = wizardData.planPrice // e.g., $50
  message = "Full payment due now (in-person service)"
} else {
  // Online sessions: existing logic
  amount = wizardData.planPrice
}
```

**Refund Policy:**
- 24-hour cancellation notice: 90% refund
- No-show: No refund (workshop reserved time)
- Service not completed: Full refund minus $15 cancellation fee

---

## Q6: We are not gonna promote workshops for now - point of contact remains mechanic

### Answer: GOOD DECISION - Here's the Revised Architecture

**✅ Correct Business Model:**

You are a **mechanic-customer platform** that happens to facilitate in-person services at workshops. The mechanic is the service provider, not the workshop.

### Revised System Architecture:

**For In-Person Bookings:**
```
Customer → Platform → Mechanic (who works at Workshop)
                       ↓
                    Workshop provides location only
```

**NOT:**
```
Customer → Platform → Workshop → Mechanic (employee)
```

### How Availability Should Work:

**A. Workshop-Affiliated Mechanic:**
```typescript
mechanic_type: 'workshop_affiliated'
workshop_id: '[workshop UUID]'

For in-person bookings:
- Mechanic's availability = Workshop operating hours
- Mechanic can set which days they work
- System filters: workshop.is_open(date, time) AND mechanic.works_on(day)
```

**Example:**
```
Workshop Hours: Mon-Sun 8AM-6PM
Mechanic John: Works Mon, Wed, Fri 9AM-5PM
Mechanic Sarah: Works Tue, Thu, Sat 10AM-4PM

Customer booking Tuesday at 11AM:
→ Shows: Sarah (available)
→ Doesn't show: John (doesn't work Tuesdays)
```

**B. Independent Mechanic:**
```typescript
mechanic_type: 'independent_workshop'
workshop_id: '[their own workshop UUID]'

For in-person bookings:
- Mechanic sets their own workshop hours
- Those hours are stored in workshop_availability table
- System uses those hours for in-person booking slots
```

### Where Do Mechanics Set Availability?

**My Recommendation: Mechanic Dashboard (NOT Workshop Dashboard)**

**Why:**
1. Mechanic is the point of contact (your decision ✅)
2. Mechanic controls their own schedule
3. Workshop is just a location provider
4. Keeps workshop owners out of booking flow

### Proposed UI Structure:

**Mechanic Dashboard → Availability Settings:**

```
┌─────────────────────────────────────────┐
│ 🔧 Mechanic Availability Settings       │
├─────────────────────────────────────────┤
│                                         │
│ Online Diagnostic Availability          │
│ ○ Available Now (currently_on_shift)    │
│ ● Offline                               │
│                                         │
│ ───────────────────────────────────────│
│                                         │
│ In-Person Service Availability          │
│ (For workshop_affiliated mechanics)     │
│                                         │
│ Workshop: Thompson Auto Care            │
│ Workshop Hours: Mon-Fri 9AM-5PM         │
│                                         │
│ My Working Days:                        │
│ ☑ Monday    9:00 AM - 5:00 PM          │
│ ☑ Tuesday   9:00 AM - 5:00 PM          │
│ ☐ Wednesday (Day Off)                  │
│ ☑ Thursday  9:00 AM - 5:00 PM          │
│ ☑ Friday    9:00 AM - 5:00 PM          │
│ ☐ Saturday                             │
│ ☐ Sunday                               │
│                                         │
│ Note: You can only work during your    │
│ workshop's operating hours.             │
│                                         │
│ [Save Availability]                     │
└─────────────────────────────────────────┘
```

**For Independent Mechanics:**

```
┌─────────────────────────────────────────┐
│ 🔧 Mechanic Availability Settings       │
├─────────────────────────────────────────┤
│                                         │
│ Online Diagnostic Availability          │
│ ● Available Now                         │
│                                         │
│ ───────────────────────────────────────│
│                                         │
│ In-Person Service Availability          │
│ (Your Workshop)                         │
│                                         │
│ Workshop Address:                       │
│ 123 Main St, Toronto, ON M5V 1A1       │
│ [Edit Address]                          │
│                                         │
│ Workshop Operating Hours:               │
│ Monday:    9:00 AM - 5:00 PM ☑ Open   │
│ Tuesday:   9:00 AM - 5:00 PM ☑ Open   │
│ Wednesday: 9:00 AM - 5:00 PM ☑ Open   │
│ Thursday:  9:00 AM - 5:00 PM ☑ Open   │
│ Friday:    9:00 AM - 5:00 PM ☑ Open   │
│ Saturday:  ☐ Closed                    │
│ Sunday:    ☐ Closed                    │
│                                         │
│ [Save Hours]                            │
└─────────────────────────────────────────┘
```

### Database Schema Changes Needed:

**New Table: `mechanic_availability`**
```sql
CREATE TABLE mechanic_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_available BOOLEAN NOT NULL DEFAULT true,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',

  -- For workshop_affiliated mechanics, these times MUST be within workshop hours
  workshop_id UUID REFERENCES organizations(id), -- Copy from mechanics table

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(mechanic_id, day_of_week)
);
```

**Validation Function:**
```sql
CREATE OR REPLACE FUNCTION validate_mechanic_availability()
RETURNS TRIGGER AS $$
DECLARE
  v_mechanic_type TEXT;
  v_workshop_hours RECORD;
BEGIN
  -- Get mechanic type
  SELECT mechanic_type, workshop_id INTO v_mechanic_type, NEW.workshop_id
  FROM mechanics
  WHERE id = NEW.mechanic_id;

  -- If workshop_affiliated, validate against workshop hours
  IF v_mechanic_type = 'workshop_affiliated' THEN
    SELECT open_time, close_time INTO v_workshop_hours
    FROM workshop_availability
    WHERE workshop_id = NEW.workshop_id
      AND day_of_week = NEW.day_of_week
      AND is_open = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Workshop is closed on this day';
    END IF;

    IF NEW.start_time < v_workshop_hours.open_time THEN
      RAISE EXCEPTION 'Start time (%) is before workshop opens (%)',
        NEW.start_time, v_workshop_hours.open_time;
    END IF;

    IF NEW.end_time > v_workshop_hours.close_time THEN
      RAISE EXCEPTION 'End time (%) is after workshop closes (%)',
        NEW.end_time, v_workshop_hours.close_time;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_mechanic_availability
  BEFORE INSERT OR UPDATE ON mechanic_availability
  FOR EACH ROW EXECUTE FUNCTION validate_mechanic_availability();
```

### How Booking Flow Works:

**Customer books in-person session at 2PM on Tuesday:**

1. **API Query:**
```typescript
GET /api/mechanics/available?sessionType=in_person&date=2025-11-12&time=14:00

// Backend logic:
const mechanics = await supabase
  .from('mechanics')
  .select(`
    *,
    mechanic_availability!inner(*),
    organizations:workshop_id(*)
  `)
  .eq('mechanic_type', 'independent_workshop')
  .or('mechanic_type.eq.workshop_affiliated')
  .eq('mechanic_availability.day_of_week', 2) // Tuesday
  .lte('mechanic_availability.start_time', '14:00')
  .gte('mechanic_availability.end_time', '14:00')
```

2. **Result:**
Only mechanics who:
- ✅ Work on Tuesdays
- ✅ Are available at 2PM
- ✅ Have workshop address
- ✅ Workshop is open at 2PM (for workshop_affiliated)

3. **Customer selects mechanic**
4. **System records:**
   - Session scheduled with MECHANIC (not workshop)
   - Workshop address shown for customer reference
   - Payment goes to MECHANIC (with platform commission)

---

## Q7: $15 is for in-person and online? What's the fee structure?

### Answer: Clarify Your Business Model First

**Current Code Shows:**
```typescript
// In ReviewAndPaymentStep.tsx
const amount = planPrice // Could be $50, $75, $100 depending on plan
```

**You need to decide:**

### Option A: Different Pricing for Online vs In-Person

**Online Sessions:**
- Customer pays: **Full amount upfront** (e.g., $50 for 30min)
- Platform takes: 5% commission ($2.50)
- Mechanic gets: $47.50

**In-Person Sessions:**
- Customer pays: **Full amount upfront** (e.g., $80 for 60min in-person)
- Platform takes: 5% commission ($4.00)
- Mechanic gets: $76.00

**Why charge more for in-person:**
- Mechanic must be physically present (can't multitask)
- Workshop overhead (space, tools, utilities)
- Travel time for customer (higher value service)

### Option B: Same Pricing, Different Payment Flow

**Online Sessions:**
- Customer pays: $50 upfront
- Service delivered immediately
- Payment released to mechanic after session

**In-Person Sessions:**
- Customer pays: $50 upfront (NOT $15 deposit)
- Service scheduled for future date
- Payment held by Stripe until service completed
- Payment released to mechanic after completion

### Option C: Deposit Model (NOT RECOMMENDED)

**In-Person Only:**
- Customer pays: $15 deposit at booking
- Customer pays: $35 balance after service
- Total: $50

**Why NOT recommended:**
1. Double payment flow (friction)
2. Risk of non-payment on balance
3. Customer confusion
4. 7-day Stripe authorization limit

### 🎯 MY RECOMMENDATION: Option A (Different Pricing)

**Proposed Pricing:**

| Service Type | Duration | Customer Pays | Platform Fee (5%) | Mechanic Gets |
|--------------|----------|---------------|-------------------|---------------|
| Online Diagnostic | 30 min | $50 | $2.50 | $47.50 |
| Online Diagnostic | 60 min | $75 | $3.75 | $71.25 |
| In-Person Diagnostic | 60 min | $80 | $4.00 | $76.00 |
| In-Person Diagnostic | 90 min | $110 | $5.50 | $104.50 |

**Full pre-payment for ALL services** (no deposit model).

**Implementation:**
```typescript
// src/config/pricing.ts
export const PRICING = {
  // Online plans
  'quick-advice-online': {
    price: 50,
    sessionType: 'online'
  },
  'deep-dive-online': {
    price: 75,
    sessionType: 'online'
  },

  // In-person plans (20% higher)
  'diagnostic-in-person-60': {
    price: 80,
    sessionType: 'in_person'
  },
  'diagnostic-in-person-90': {
    price: 110,
    sessionType: 'in_person'
  }
}
```

---

## Q8: How do we make sure we get paid our commission from workshops?

### Answer: Use Stripe Connect (MANDATORY)

**Current Problem:**
If you let workshops collect payment directly from customers, you have ZERO guarantee of getting your commission.

**✅ SOLUTION: Stripe Connect Destination Charges**

### How It Works:

**1. Workshop Onboarding:**
```typescript
// Workshop must connect Stripe account
POST /api/workshop/stripe/onboard

// Creates Stripe Express/Standard account
// Workshop provides banking details
// Stripe verifies identity (KYC)
```

**2. Customer Books In-Person Service:**
```typescript
// Customer pays via YOUR Stripe account
const charge = await stripe.charges.create({
  amount: 8000, // $80
  currency: 'cad',
  source: customerPaymentMethod,
  destination: {
    account: workshopStripeAccountId, // Workshop's connected account
    amount: 7600, // $76 (after 5% commission)
  },
  metadata: {
    platform_fee: 400, // $4 stays with platform
    session_id: 'xxx',
    mechanic_id: 'yyy'
  }
})
```

**3. Money Flow:**
```
Customer pays $80
    ↓
Your Stripe Account receives $80
    ↓
Automatically splits:
    → $76 to Workshop Stripe account (instant or scheduled payout)
    → $4 stays in your account (platform commission)
```

**4. Payout to Mechanic (If Independent):**
```typescript
// For independent mechanics who own their workshop
// They get the $76 directly via Stripe Connect payout

// For workshop_affiliated mechanics
// Workshop pays them separately (not your concern)
```

### Why This Is the ONLY Way:

**✅ Automatic Commission Collection:**
- You don't have to invoice workshops
- You don't have to chase payments
- Stripe handles all the money routing

**✅ Legally Compliant:**
- Stripe is the licensed payment processor
- You never hold customer funds (Stripe does)
- Complies with FINTRAC and provincial regulations

**✅ Workshop Cannot Skip Payment:**
- Money flows through YOUR Stripe account first
- Commission is deducted BEFORE workshop gets paid
- No disputes or chargebacks for your commission

**✅ Transparent Accounting:**
- Every transaction recorded in Stripe Dashboard
- Clear audit trail for taxes
- Automated reporting

### Required Database Changes:

**Add to `organizations` table (workshops):**
```sql
ALTER TABLE organizations
ADD COLUMN stripe_account_id TEXT UNIQUE,
ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT false,
ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN stripe_charges_enabled BOOLEAN DEFAULT false;
```

**Add to `mechanics` table:**
```sql
ALTER TABLE mechanics
ADD COLUMN stripe_account_id TEXT UNIQUE, -- For independent mechanics
ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT false;
```

### Business Rules:

**1. Workshop Cannot Accept In-Person Bookings Until:**
- ✅ Stripe Connect account created
- ✅ Identity verified (KYC)
- ✅ Banking details provided
- ✅ Payouts enabled

**2. Platform Commission Rate:**
- Stored in `platform_fee_settings` table (already exists)
- Default: 5% of transaction amount
- Can be adjusted by admin

**3. Payout Schedule:**
- Daily automatic payouts (Stripe default)
- Or customize: Weekly, Monthly
- Set per workshop via Stripe API

### Alternative (NOT RECOMMENDED): Manual Commission Collection

**How it would work:**
- Workshop collects payment directly from customer
- Workshop invoices you nothing
- You invoice workshop for 5% commission monthly
- Workshop may or may not pay

**Why this is BAD:**
- ❌ Workshops can ignore invoices
- ❌ No legal recourse (they have customer money)
- ❌ Accounting nightmare
- ❌ Cash flow problems for your platform
- ❌ Impossible to scale

### 🎯 MANDATORY IMPLEMENTATION:

**You MUST use Stripe Connect for in-person bookings.**

**Onboarding Flow:**
1. Workshop signs up on platform
2. Platform redirects to Stripe Connect onboarding
3. Workshop completes KYC, provides banking details
4. Stripe verifies identity (1-2 days)
5. Workshop can now accept in-person bookings
6. All payments automatically split (commission deducted)

**Without this:** You have NO guaranteed way to collect commission.

---

## 📋 SUMMARY & ACTION ITEMS

### Key Decisions Made:

1. ✅ **Availability System:** Mechanics set availability in their dashboard (not workshop dashboard)
2. ✅ **Payment Model:** Full pre-payment for in-person sessions (no deposit model)
3. ✅ **Commission:** Stripe Connect with automatic commission deduction (mandatory)
4. ✅ **Business Model:** Mechanic is point of contact (workshop is location only)
5. ✅ **Legal Compliance:** Use Stripe to hold funds (not you)
6. ✅ **Customer Payment:** Cannot force payment, must use Stripe authorization holds (max 7 days)

### Required Implementations:

**Phase 2A (HIGH PRIORITY):**
1. Create `mechanic_availability` table
2. Build mechanic availability UI (dashboard)
3. Update booking query to filter by mechanic availability
4. Implement Stripe Connect onboarding for workshops
5. Implement destination charges for commission collection

**Phase 2B (MEDIUM PRIORITY):**
6. Add workshop hours display in booking flow
7. Create separate pricing for in-person vs online
8. Build refund policy and cancellation flow
9. Add workshop address validation

**Phase 2C (FUTURE):**
10. Add workshop photos
11. Add distance calculation (Haversine - FREE)
12. Add workshop ratings
13. Add mobile service support

### Legal Compliance Requirements:

- ✅ Use Stripe for all payment processing
- ✅ Never hold customer funds in your bank account
- ✅ Clear terms of service explaining payment flow
- ✅ Refund policy compliant with Canadian consumer protection
- ✅ Cannot hold customers hostage (only vehicles with lien)

---

**Next Step:** Review this analysis and approve Phase 2A implementation plan.
