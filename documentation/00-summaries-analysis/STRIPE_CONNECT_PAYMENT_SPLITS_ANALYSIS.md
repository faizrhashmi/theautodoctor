# Stripe Connect Payment Splits - Complete Analysis & Best Practices

## 📋 Executive Summary

**Date**: 2025-11-08
**Status**: ⚠️ **PARTIALLY IMPLEMENTED - NEEDS COMPLETION**
**Impact**: Critical business logic affecting revenue distribution

---

## 🔍 Current State Analysis

### What's Working ✅

1. **Session Payments (Chat/Video/Diagnostic)**
   - Direct Stripe transfers to independent mechanics
   - 70/30 split (mechanic/platform)
   - Immediate payout after session completion
   - Status tracking in session metadata

2. **Quote/RFQ Payments**
   - Escrow holding (payment captured but not transferred)
   - Platform fee calculated and stored
   - Admin dashboard shows escrow balances
   - Refund handling works

3. **Stripe Connect Infrastructure**
   - Mechanics can connect Stripe accounts
   - Workshops can connect Stripe accounts
   - Onboarding flow complete
   - Account verification checks

### What's Broken/Missing ❌

1. **Hardcoded Platform Fees**
   - Session payments use fixed 70/30 split
   - Not connected to workshop settings
   - Config files contradict (85/15 vs 70/30)

2. **Workshop Revenue Splits Not Used**
   - UI exists to set commission (0-85%)
   - Saves to `organizations.platform_fee_percentage`
   - **Session payment logic ignores this setting**

3. **Workshop Payouts Not Implemented**
   - Escrow release logic is SIMULATED
   - Fake `transfer_id` generated
   - Actual Stripe Connect transfer commented out
   - No automated payout processing

4. **Database Functions Not Integrated**
   - `calculate_revenue_split()` exists but not fully used
   - `record_session_earnings()` called but splits still hardcoded
   - `workshop_earnings` and `mechanic_earnings` tables unused

5. **Referral Fees Not Paid**
   - 5% referral fee calculated for RFQ escalations
   - Tracked in database
   - **No actual transfer to referring mechanic**

6. **No Admin Fee Configuration UI**
   - Can't set platform fees per workshop
   - Can't create tiered fee structures
   - Can't adjust splits dynamically

---

## 💰 Current Payment Scenarios

### Scenario 1: Independent Mechanic (B2C Session)

```
Customer books "Quick Chat" - $10.00
          ↓
    Stripe Checkout
          ↓
Payment Intent Succeeded ($10.00 captured)
          ↓
┌─────────────────────────────────────────┐
│  CURRENT SPLIT (HARDCODED 70/30)       │
├─────────────────────────────────────────┤
│  Platform Fee (30%): $3.00             │
│  Mechanic Payout (70%): $7.00          │
└─────────────────────────────────────────┘
          ↓
Stripe Transfer IMMEDIATE to mechanic's Connect account
          ↓
Status: 'transferred' (tracked in session.metadata.payout)
```

**Code Location**: [src/app/api/sessions/[id]/end/route.ts:12](src/app/api/sessions/[id]/end/route.ts#L12)
```typescript
const MECHANIC_SHARE = 0.7 // ❌ HARDCODED
```

**Problem**:
- Platform takes 30% but config says should be 15% (`mechanicPricing.ts:22`)
- Not respecting any dynamic configuration

---

### Scenario 2: Workshop Mechanic (Session)

```
Customer books "Video Consultation" - $29.99
Mechanic is employed by "AutoFix Workshop"
          ↓
    Stripe Checkout
          ↓
Payment Intent Succeeded ($29.99 captured)
          ↓
┌─────────────────────────────────────────────────────┐
│  CURRENT BEHAVIOR (INCORRECT!)                      │
├─────────────────────────────────────────────────────┤
│  Platform Fee (30%): $9.00                          │
│  Transfer to MECHANIC (70%): $20.99                 │
│  Workshop gets: $0.00  ❌ WRONG!                    │
└─────────────────────────────────────────────────────┘
```

**What SHOULD Happen** (Using workshop settings):
```
Workshop has platform_fee_percentage = 20%
Workshop has commission_rate = 15% (what they take from mechanic)

Total: $29.99
          ↓
┌─────────────────────────────────────────────────────┐
│  CORRECT SPLIT (Workshop-Aware)                     │
├─────────────────────────────────────────────────────┤
│  Platform Fee (20%): $6.00                          │
│  Gross to Workshop (80%): $23.99                    │
│    ├─ Workshop Commission (15%): $3.60              │
│    └─ Mechanic Net (85%): $20.39                    │
└─────────────────────────────────────────────────────┘
          ↓
Option A: Single transfer to workshop, they pay mechanic
Option B: Two transfers (platform splits it)
```

**Current Issue**:
- Workshop settings UI exists but session payments don't use it
- Workshop gets nothing, mechanic gets direct transfer
- Workshop commission not collected

---

### Scenario 3: Quote/Repair Payment (Workshop Job)

```
Customer approves repair quote - $500.00
Workshop: "AutoFix Workshop"
Platform fee: 12% (stored in quote)
          ↓
    Stripe Checkout
          ↓
Payment Intent Succeeded ($500.00 captured)
          ↓
┌─────────────────────────────────────────────────────┐
│  ESCROW HOLDING (Payment captured, not transferred) │
├─────────────────────────────────────────────────────┤
│  Platform Fee (12%): $60.00                         │
│  Workshop Gets (88%): $440.00 (HELD IN ESCROW)     │
└─────────────────────────────────────────────────────┘
          ↓
Admin Reviews Job Completion
          ↓
Admin Clicks "Release Payment"
          ↓
❌ SIMULATED - Creates fake transfer_id
✅ SHOULD DO - stripe.transfers.create({ amount: 440, destination: workshop_stripe_account })
```

**Code Location**: [src/app/api/admin/payments/[paymentId]/release/route.ts:109-131](src/app/api/admin/payments/[paymentId]/release/route.ts#L109-L131)
```typescript
// TODO: Uncomment when ready for production
// const transfer = await stripe.transfers.create({
//   amount: Math.round(payment.provider_amount * 100),
//   destination: workshopStripeAccountId,
//   ...
// })

// ❌ CURRENT: Fake transfer for testing
const fakeTransferId = `tr_fake_${Date.now()}_${Math.random().toString(36).substring(7)}`
```

**Problem**:
- Workshop never actually receives money
- Escrow release is simulated
- No automated payout processing

---

### Scenario 4: RFQ Bid Payment with Referral

```
Customer accepts bid - $500.00
Workshop wins bid: "AutoFix Workshop"
Referring Mechanic: "John Smith" (escalated customer to RFQ)
Platform fee: 15%
Referral fee: 5%
          ↓
    Stripe Checkout
          ↓
Payment Intent Succeeded ($500.00 captured)
          ↓
┌─────────────────────────────────────────────────────┐
│  CALCULATED SPLIT (Tracked but not transferred)     │
├─────────────────────────────────────────────────────┤
│  Platform Fee (15%): $75.00                         │
│  Workshop Gets (80%): $400.00 (HELD IN ESCROW)     │
│  Referral Fee (5%): $25.00 (TRACKED, NOT PAID)     │
└─────────────────────────────────────────────────────┘
          ↓
❌ Workshop payment: SIMULATED (not transferred)
❌ Referral fee: TRACKED (notification created, no transfer)
```

**Code Location**: [src/app/api/stripe/webhook/route.ts:533](src/app/api/stripe/webhook/route.ts#L533)
```typescript
referral_fee_percent: 5.0, // ❌ HARDCODED, never actually paid
```

**Problem**:
- Referral fee calculated but never transferred to mechanic
- Workshop payment held indefinitely
- No automation

---

## 🏗️ Database Schema Analysis

### Currently Active Tables

**`repair_payments`** ✅ (Working for escrow tracking)
```sql
CREATE TABLE repair_payments (
  id UUID PRIMARY KEY,
  quote_id UUID REFERENCES repair_quotes,
  customer_id UUID,
  workshop_id UUID REFERENCES organizations,
  mechanic_id UUID REFERENCES mechanics,
  amount DECIMAL(10,2),              -- Total paid by customer
  platform_fee DECIMAL(10,2),        -- Platform's cut
  provider_amount DECIMAL(10,2),     -- Workshop gets (after platform fee)
  escrow_status TEXT,                -- 'held', 'released', 'refunded'
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,           -- Populated when released
  held_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
)
```

**`organizations`** ✅ (Has fee configuration fields)
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT,
  stripe_connect_account_id TEXT,    -- Stripe Connect account ID
  stripe_onboarding_completed BOOLEAN,
  stripe_charges_enabled BOOLEAN,
  stripe_payouts_enabled BOOLEAN,
  platform_fee_percentage NUMERIC(5,2) DEFAULT 20.00,  -- ✅ DYNAMIC FEE
  custom_fee_agreement BOOLEAN DEFAULT FALSE
)
```

**Usage**: Workshop settings UI updates `platform_fee_percentage`, but session payments don't read it!

---

### Future Tables (Schema Exists, NOT INTEGRATED)

**`workshop_earnings`** ⚠️ (Created but unused)
```sql
CREATE TABLE workshop_earnings (
  id UUID PRIMARY KEY,
  workshop_id UUID REFERENCES organizations,
  session_id UUID REFERENCES sessions,
  gross_amount_cents INTEGER,        -- Total session price
  platform_fee_cents INTEGER,        -- Platform's cut
  workshop_net_cents INTEGER,        -- Workshop gets
  payout_status TEXT,                -- 'pending', 'transferred', 'failed'
  payout_id TEXT,                    -- Stripe transfer ID
  payout_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

**Purpose**: Track workshop earnings from sessions (not just quotes)

**Problem**: Table exists, but session payment logic doesn't insert records here

---

**`mechanic_earnings`** ⚠️ (Created but unused)
```sql
CREATE TABLE mechanic_earnings (
  id UUID PRIMARY KEY,
  mechanic_id UUID REFERENCES mechanics,
  workshop_id UUID REFERENCES organizations,  -- NULL for independent
  session_id UUID REFERENCES sessions,
  gross_amount_cents INTEGER,        -- Session price
  mechanic_net_cents INTEGER,        -- What mechanic gets
  workshop_fee_cents INTEGER,        -- Workshop's commission (if employed)
  platform_fee_cents INTEGER,        -- Platform's cut
  payout_status TEXT,
  payout_id TEXT,
  created_at TIMESTAMPTZ
)
```

**Purpose**: Track mechanic earnings with workshop commission deducted

**Problem**: Session payments skip this, go directly to Stripe transfer

---

**`platform_fee_rules`** ⚠️ (Created but never used)
```sql
CREATE TABLE platform_fee_rules (
  id UUID PRIMARY KEY,
  rule_name TEXT,
  rule_type TEXT,                    -- 'flat', 'percentage', 'tiered'
  applies_to TEXT,                   -- 'all', 'workshop', 'independent'
  min_job_value DECIMAL(10,2),
  max_job_value DECIMAL(10,2),
  percentage_fee NUMERIC(5,2),
  flat_fee_cents INTEGER,
  is_active BOOLEAN
)
```

**Purpose**: Support tiered fee structures (e.g., "Jobs over $100 get 10% fee instead of 15%")

**Problem**: No admin UI to manage rules, no code reading from this table

---

### Database Functions (Smart Logic, Not Used)

**`calculate_revenue_split()`** ([supabase/migrations_backup/20250127000002_workshop_revenue_splits.sql:130-213](supabase/migrations_backup/20250127000002_workshop_revenue_splits.sql#L130-L213))

```sql
CREATE OR REPLACE FUNCTION calculate_revenue_split(
  p_session_id UUID,
  p_gross_amount_cents INTEGER
) RETURNS JSON AS $$
DECLARE
  v_session sessions;
  v_mechanic mechanics;
  v_workshop organizations;
  v_platform_fee_cents INTEGER;
  v_workshop_commission_cents INTEGER;
  v_mechanic_net_cents INTEGER;
  v_workshop_net_cents INTEGER;
BEGIN
  -- Fetch session and mechanic
  SELECT * INTO v_session FROM sessions WHERE id = p_session_id;
  SELECT * INTO v_mechanic FROM mechanics WHERE id = v_session.mechanic_id;

  -- THREE SCENARIOS:

  -- Scenario 1: Independent mechanic (no workshop)
  IF v_mechanic.organization_id IS NULL THEN
    v_platform_fee_cents := ROUND(p_gross_amount_cents * 0.15);  -- 15% platform
    v_mechanic_net_cents := p_gross_amount_cents - v_platform_fee_cents;
    RETURN json_build_object(
      'scenario', 'independent',
      'platform_fee_cents', v_platform_fee_cents,
      'mechanic_net_cents', v_mechanic_net_cents
    );
  END IF;

  -- Scenario 2: Workshop mechanic (workshop pays mechanic)
  SELECT * INTO v_workshop FROM organizations WHERE id = v_mechanic.organization_id;

  IF v_workshop.pays_mechanics_directly THEN
    -- Workshop gets all (minus platform fee), pays mechanic themselves
    v_platform_fee_cents := ROUND(p_gross_amount_cents * COALESCE(v_workshop.platform_fee_percentage, 20.0) / 100.0);
    v_workshop_net_cents := p_gross_amount_cents - v_platform_fee_cents;
    RETURN json_build_object(
      'scenario', 'workshop_pays_mechanic',
      'platform_fee_cents', v_platform_fee_cents,
      'workshop_net_cents', v_workshop_net_cents
    );
  END IF;

  -- Scenario 3: Platform splits payment (workshop gets commission, mechanic gets remainder)
  v_platform_fee_cents := ROUND(p_gross_amount_cents * COALESCE(v_workshop.platform_fee_percentage, 20.0) / 100.0);
  v_workshop_commission_cents := ROUND((p_gross_amount_cents - v_platform_fee_cents) * COALESCE(v_workshop.mechanic_commission_rate, 15.0) / 100.0);
  v_mechanic_net_cents := p_gross_amount_cents - v_platform_fee_cents - v_workshop_commission_cents;

  RETURN json_build_object(
    'scenario', 'platform_splits',
    'platform_fee_cents', v_platform_fee_cents,
    'workshop_commission_cents', v_workshop_commission_cents,
    'mechanic_net_cents', v_mechanic_net_cents
  );
END;
$$ LANGUAGE plpgsql;
```

**This function handles ALL THREE SCENARIOS correctly!**

**Problem**: Session end route calls this function ([src/app/api/sessions/[id]/end/route.ts:295-326](src/app/api/sessions/[id]/end/route.ts#L295-L326)) but IGNORES the result for Stripe transfer:

```typescript
// ✅ Calls the smart function
const { data: earningsData } = await supabaseAdmin.rpc('record_session_earnings', {
  p_session_id: sessionId,
  p_gross_amount_cents: planPriceCents,
})

// ❌ BUT THEN uses hardcoded split for actual transfer!
const mechanicEarningsCents = Math.round(planPriceCents * MECHANIC_SHARE) // Still 70%!
```

---

## 🎯 Best Practice Implementation

### Recommended Payment Split Strategy

#### **Independent Mechanics (B2C Sessions)**

```
Customer Payment: $29.99
├─ Platform Fee (15%): $4.50
└─ Mechanic Net (85%): $25.49
```

**Implementation**:
- Use platform-wide default: 15% platform fee
- Configurable via admin UI (global setting)
- Immediate Stripe transfer to mechanic

---

#### **Workshop Mechanics (Sessions)**

```
Customer Payment: $29.99
├─ Platform Fee (20%): $6.00  ← Workshop-specific, from organizations.platform_fee_percentage
└─ To Workshop/Mechanic (80%): $23.99
    ├─ Workshop Commission (15%): $3.60  ← From organizations.mechanic_commission_rate
    └─ Mechanic Net (85%): $20.39
```

**Two Payout Options**:

**Option A: Single Transfer to Workshop** (Recommended for simplicity)
```typescript
// Workshop is responsible for paying mechanic
stripe.transfers.create({
  amount: 2399,  // $23.99 (after platform fee)
  destination: workshop.stripe_connect_account_id,
  metadata: {
    session_id,
    mechanic_id,
    workshop_commission_cents: 360,
    mechanic_net_cents: 2039,
    note: 'Workshop to pay mechanic directly'
  }
})
```

**Benefits**:
- Simpler Stripe integration (one transfer)
- Workshop handles mechanic payments (their employees)
- Workshop can adjust timing/amounts based on performance
- Matches typical employer/employee relationship

**Option B: Platform Splits Payment** (More complex, more control)
```typescript
// Transfer 1: Workshop commission
stripe.transfers.create({
  amount: 360,  // $3.60
  destination: workshop.stripe_connect_account_id
})

// Transfer 2: Mechanic direct payment
stripe.transfers.create({
  amount: 2039,  // $20.39
  destination: mechanic.stripe_connect_account_id
})
```

**Benefits**:
- Mechanics get paid even if workshop has issues
- Platform has full control over splits
- Better for contractor relationships (not employees)

**Recommendation**: Use **Option A** (single transfer to workshop) because:
- Most workshops treat mechanics as employees
- Simpler compliance (workshop handles tax withholding)
- Fewer Stripe transfer fees
- Matches `organizations.pays_mechanics_directly` flag in database

---

#### **Quote/Repair Payments (Workshop Jobs)**

```
Customer Payment: $500.00
├─ Platform Fee (12-20%): $60.00  ← Variable per workshop or job size
└─ Workshop Net: $440.00
    └─ ESCROW until job completed and verified
```

**Implementation**:
```typescript
// Step 1: Capture payment (automatic on checkout.session.completed)
// Stripe holds funds, no transfer yet

// Step 2: Admin/Customer verifies job completion
// Step 3: Release escrow
stripe.transfers.create({
  amount: 44000,  // $440.00 in cents
  destination: workshop.stripe_connect_account_id,
  description: 'Quote #123 - Brake repair',
  metadata: {
    quote_id,
    workshop_id,
    job_type: 'repair',
    verified_by: 'admin' // or 'customer'
  }
})

// Step 4: Update database
UPDATE repair_payments SET
  escrow_status = 'released',
  stripe_transfer_id = transfer.id,
  released_at = NOW()
WHERE id = payment_id
```

**Automation Rules** (To implement):
- **Auto-release after 7 days** if customer doesn't dispute
- **Hold for 30 days** for high-value jobs (>$1000)
- **Require admin approval** for first-time workshops
- **Instant release** for trusted workshops (track record)

---

#### **RFQ Bids with Referrals**

```
Customer Payment: $500.00
├─ Platform Fee (15%): $75.00
├─ Referral Fee (5%): $25.00  ← To mechanic who escalated
└─ Workshop Net (80%): $400.00
```

**Implementation** (Three transfers):
```typescript
// Transfer 1: Workshop (held in escrow initially)
const workshopTransfer = await stripe.transfers.create({
  amount: 40000,  // $400
  destination: workshop.stripe_connect_account_id,
  description: 'RFQ #456 - Engine rebuild'
})

// Transfer 2: Referral fee to referring mechanic (immediate)
const referralTransfer = await stripe.transfers.create({
  amount: 2500,  // $25
  destination: referring_mechanic.stripe_connect_account_id,
  description: 'Referral fee for RFQ #456',
  metadata: {
    referral_type: 'rfq_escalation',
    rfq_id,
    bid_id
  }
})

// Platform keeps $75 (no transfer needed, already in platform account)
```

**Business Logic**:
- Referral fee paid **immediately** (incentivize escalations)
- Workshop payment **held in escrow** (same as quotes)
- Platform fee stays in main Stripe account

---

## 🔧 Correct Implementation Plan

### Phase 1: Fix Session Payment Splits (CRITICAL)

**Goal**: Make session payments respect workshop settings

**Changes Needed**:

**File 1**: [src/app/api/sessions/[id]/end/route.ts](src/app/api/sessions/[id]/end/route.ts)

```typescript
// ❌ REMOVE THIS
const MECHANIC_SHARE = 0.7

// ✅ ADD THIS (use database function result)
const { data: splitData } = await supabaseAdmin.rpc('calculate_revenue_split', {
  p_session_id: sessionId,
  p_gross_amount_cents: planPriceCents
})

if (!splitData) {
  throw new Error('Failed to calculate revenue split')
}

// splitData returns:
// {
//   scenario: 'independent' | 'workshop_pays_mechanic' | 'platform_splits',
//   platform_fee_cents: number,
//   mechanic_net_cents?: number,      // For independent
//   workshop_net_cents?: number,      // For workshop_pays_mechanic
//   workshop_commission_cents?: number // For platform_splits
// }

// Handle based on scenario
if (splitData.scenario === 'independent') {
  // ✅ Transfer to mechanic
  const transfer = await stripe.transfers.create({
    amount: splitData.mechanic_net_cents,
    destination: mechanic.stripe_connect_account_id,
    description: `Session ${sessionId} - Independent mechanic`,
    metadata: {
      session_id: sessionId,
      mechanic_id,
      platform_fee_cents: splitData.platform_fee_cents,
      scenario: 'independent'
    }
  })

  // Record in mechanic_earnings table
  await supabaseAdmin.from('mechanic_earnings').insert({
    mechanic_id,
    session_id: sessionId,
    gross_amount_cents: planPriceCents,
    mechanic_net_cents: splitData.mechanic_net_cents,
    platform_fee_cents: splitData.platform_fee_cents,
    payout_status: 'transferred',
    payout_id: transfer.id
  })

} else if (splitData.scenario === 'workshop_pays_mechanic') {
  // ✅ Transfer to workshop (they pay mechanic)
  const transfer = await stripe.transfers.create({
    amount: splitData.workshop_net_cents,
    destination: workshop.stripe_connect_account_id,
    description: `Session ${sessionId} - Workshop pays mechanic`,
    metadata: {
      session_id: sessionId,
      workshop_id,
      mechanic_id,
      platform_fee_cents: splitData.platform_fee_cents,
      scenario: 'workshop_pays_mechanic'
    }
  })

  // Record in workshop_earnings table
  await supabaseAdmin.from('workshop_earnings').insert({
    workshop_id,
    session_id: sessionId,
    gross_amount_cents: planPriceCents,
    workshop_net_cents: splitData.workshop_net_cents,
    platform_fee_cents: splitData.platform_fee_cents,
    payout_status: 'transferred',
    payout_id: transfer.id
  })

} else if (splitData.scenario === 'platform_splits') {
  // ✅ Two transfers: workshop commission + mechanic payment

  // Transfer 1: Workshop commission
  const workshopTransfer = await stripe.transfers.create({
    amount: splitData.workshop_commission_cents,
    destination: workshop.stripe_connect_account_id,
    description: `Session ${sessionId} - Workshop commission`,
    metadata: {
      session_id: sessionId,
      workshop_id,
      type: 'commission'
    }
  })

  // Transfer 2: Mechanic payment
  const mechanicTransfer = await stripe.transfers.create({
    amount: splitData.mechanic_net_cents,
    destination: mechanic.stripe_connect_account_id,
    description: `Session ${sessionId} - Mechanic payment`,
    metadata: {
      session_id: sessionId,
      mechanic_id,
      workshop_id,
      type: 'mechanic_payment'
    }
  })

  // Record both
  await supabaseAdmin.from('workshop_earnings').insert({
    workshop_id,
    session_id: sessionId,
    gross_amount_cents: planPriceCents,
    workshop_net_cents: splitData.workshop_commission_cents,
    platform_fee_cents: splitData.platform_fee_cents,
    payout_status: 'transferred',
    payout_id: workshopTransfer.id
  })

  await supabaseAdmin.from('mechanic_earnings').insert({
    mechanic_id,
    workshop_id,
    session_id: sessionId,
    gross_amount_cents: planPriceCents,
    mechanic_net_cents: splitData.mechanic_net_cents,
    workshop_fee_cents: splitData.workshop_commission_cents,
    platform_fee_cents: splitData.platform_fee_cents,
    payout_status: 'transferred',
    payout_id: mechanicTransfer.id
  })
}
```

**Benefits**:
- ✅ Respects workshop settings (`platform_fee_percentage`, `mechanic_commission_rate`)
- ✅ Uses database function (single source of truth)
- ✅ Populates earnings tables (proper tracking)
- ✅ Handles all three scenarios correctly

---

### Phase 2: Complete Workshop Escrow Release (HIGH PRIORITY)

**Goal**: Actually transfer funds from escrow to workshops

**Changes Needed**:

**File**: [src/app/api/admin/payments/[paymentId]/release/route.ts](src/app/api/admin/payments/[paymentId]/release/route.ts)

```typescript
// ❌ REMOVE SIMULATION (Lines 109-147)
const fakeTransferId = `tr_fake_${Date.now()}_...`

// ✅ IMPLEMENT REAL STRIPE TRANSFER
if (!workshop.stripe_connect_account_id) {
  return NextResponse.json(
    { error: 'Workshop has not connected their Stripe account' },
    { status: 400 }
  )
}

if (!workshop.stripe_charges_enabled || !workshop.stripe_payouts_enabled) {
  return NextResponse.json(
    { error: 'Workshop Stripe account is not fully activated' },
    { status: 400 }
  )
}

// ✅ Create actual Stripe transfer
const transfer = await stripe.transfers.create({
  amount: Math.round(payment.provider_amount * 100),  // Convert to cents
  currency: 'usd',
  destination: workshop.stripe_connect_account_id,
  description: `Release payment for Quote #${payment.quote_id}`,
  metadata: {
    payment_id: paymentId,
    quote_id: payment.quote_id,
    workshop_id: payment.workshop_id,
    released_by: authResult.user.id,
    released_at: new Date().toISOString()
  }
})

// ✅ Update database with real transfer ID
const { error: updateError } = await supabaseAdmin
  .from('repair_payments')
  .update({
    escrow_status: 'released',
    stripe_transfer_id: transfer.id,  // Real Stripe transfer ID
    released_at: new Date().toISOString()
  })
  .eq('id', paymentId)
```

**Safety Checks to Add**:
```typescript
// 1. Check payment isn't already released
if (payment.escrow_status === 'released') {
  return NextResponse.json({ error: 'Payment already released' }, { status: 400 })
}

// 2. Check quote is marked complete
const { data: quote } = await supabaseAdmin
  .from('repair_quotes')
  .select('status')
  .eq('id', payment.quote_id)
  .single()

if (quote.status !== 'completed') {
  return NextResponse.json({ error: 'Quote must be completed before releasing payment' }, { status: 400 })
}

// 3. Verify workshop hasn't been suspended
if (workshop.suspended || workshop.stripe_restrictions) {
  return NextResponse.json({ error: 'Workshop account has restrictions' }, { status: 403 })
}
```

---

### Phase 3: Implement Referral Fee Transfers

**Goal**: Actually pay mechanics for RFQ referrals

**Changes Needed**:

**File**: [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts) (Lines 416-544)

**Add after creating repair_payment record**:

```typescript
// ✅ Calculate and transfer referral fee
if (metadata.referring_mechanic_id) {
  const referralFeePercent = 5.0  // Or fetch from platform_fee_rules
  const referralFeeCents = Math.round((amountTotal / 100) * (referralFeePercent / 100))

  // Fetch referring mechanic's Stripe account
  const { data: referringMechanic } = await supabaseAdmin
    .from('mechanics')
    .select('stripe_account_id, stripe_payouts_enabled')
    .eq('id', metadata.referring_mechanic_id)
    .single()

  if (referringMechanic?.stripe_account_id && referringMechanic.stripe_payouts_enabled) {
    // ✅ Create immediate transfer for referral fee
    const referralTransfer = await stripe.transfers.create({
      amount: referralFeeCents,
      currency: 'usd',
      destination: referringMechanic.stripe_account_id,
      description: `Referral fee for RFQ #${metadata.rfq_id}`,
      metadata: {
        rfq_id: metadata.rfq_id,
        bid_id: metadata.bid_id,
        referring_mechanic_id: metadata.referring_mechanic_id,
        referral_fee_percent: referralFeePercent,
        type: 'rfq_referral'
      }
    })

    // Record referral payout
    await supabaseAdmin.from('mechanic_earnings').insert({
      mechanic_id: metadata.referring_mechanic_id,
      rfq_id: metadata.rfq_id,
      gross_amount_cents: referralFeeCents,
      mechanic_net_cents: referralFeeCents,
      platform_fee_cents: 0,  // No fee on referral fees
      payout_status: 'transferred',
      payout_id: referralTransfer.id,
      earnings_type: 'referral'
    })

    console.log(`[webhook] Referral fee transferred: $${referralFeeCents/100} to mechanic ${metadata.referring_mechanic_id}`)
  } else {
    console.warn(`[webhook] Referring mechanic ${metadata.referring_mechanic_id} doesn't have Stripe connected - referral fee pending`)

    // Create pending payout record
    await supabaseAdmin.from('mechanic_earnings').insert({
      mechanic_id: metadata.referring_mechanic_id,
      rfq_id: metadata.rfq_id,
      gross_amount_cents: referralFeeCents,
      mechanic_net_cents: referralFeeCents,
      payout_status: 'pending_stripe_connection',
      earnings_type: 'referral'
    })
  }
}
```

---

### Phase 4: Build Admin Fee Configuration UI

**Goal**: Allow admins to manage platform fees dynamically

**New Page**: `src/app/admin/(shell)/fee-settings/page.tsx`

**Features**:

1. **Global Platform Fee Settings**
   ```typescript
   - Default platform fee for independent mechanics (15%)
   - Default platform fee for workshops (20%)
   - Referral fee percentage (5%)
   ```

2. **Workshop-Specific Fee Overrides**
   ```typescript
   - Search for workshop
   - Set custom platform fee (10-30%)
   - Set custom mechanic commission (0-85%)
   - Toggle: "Custom fee agreement" flag
   - Save reason for custom fee (contract, volume discount, etc.)
   ```

3. **Tiered Fee Rules** (Advanced)
   ```typescript
   - Rule: "Jobs over $500 get 12% platform fee instead of 15%"
   - Rule: "First 10 sessions for new workshops get 10% fee"
   - Rule: "Luxury brand workshops get 18% fee"
   ```

4. **Fee History/Audit Log**
   ```typescript
   - Who changed what fee when
   - Before/after values
   - Reason for change
   ```

**Database Changes**:
```sql
-- Add global settings table
CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_by UUID REFERENCES auth.users,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_settings (key, value) VALUES
  ('independent_platform_fee_percent', '15.0'),
  ('workshop_platform_fee_percent', '20.0'),
  ('referral_fee_percent', '5.0');

-- Add fee change audit log
CREATE TABLE fee_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT,  -- 'global', 'workshop', 'mechanic'
  entity_id UUID,
  field_name TEXT,   -- 'platform_fee_percentage', etc.
  old_value NUMERIC(5,2),
  new_value NUMERIC(5,2),
  reason TEXT,
  changed_by UUID REFERENCES auth.users,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Phase 5: Automate Escrow Release

**Goal**: Reduce manual admin work

**Automation Rules**:

```typescript
// Cron job (run daily at 2am)
// File: src/app/api/cron/process-escrow/route.ts

export async function GET(request: NextRequest) {
  // Verify cron secret
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rule 1: Auto-release after 7 days if no dispute
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: autoReleasePayments } = await supabaseAdmin
    .from('repair_payments')
    .select('*, repair_quotes!inner(status)')
    .eq('escrow_status', 'held')
    .eq('repair_quotes.status', 'completed')
    .lt('held_at', sevenDaysAgo.toISOString())
    .limit(50)  // Process in batches

  for (const payment of autoReleasePayments || []) {
    // Check for disputes
    const { data: disputes } = await supabaseAdmin
      .from('customer_disputes')
      .select('id')
      .eq('quote_id', payment.quote_id)
      .eq('status', 'open')

    if (disputes && disputes.length > 0) {
      console.log(`Skipping payment ${payment.id} - has open dispute`)
      continue
    }

    // Release payment
    await releasePayment(payment.id, 'auto_release_7_days')
  }

  // Rule 2: Remind admin for high-value jobs (>$1000) after 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: highValuePayments } = await supabaseAdmin
    .from('repair_payments')
    .select('*')
    .eq('escrow_status', 'held')
    .gt('amount', 1000)
    .lt('held_at', thirtyDaysAgo.toISOString())

  for (const payment of highValuePayments || []) {
    // Send notification to admin
    await sendAdminNotification({
      type: 'escrow_release_needed',
      payment_id: payment.id,
      amount: payment.amount,
      days_held: Math.floor((Date.now() - new Date(payment.held_at).getTime()) / (1000 * 60 * 60 * 24))
    })
  }

  return NextResponse.json({ success: true })
}
```

**Setup in Vercel/Platform**:
```bash
# Add to vercel.json
{
  "crons": [{
    "path": "/api/cron/process-escrow",
    "schedule": "0 2 * * *"  // Daily at 2am
  }]
}
```

---

## 📊 Recommended Fee Structure

### Standard Fees

| Scenario | Platform Fee | Workshop Commission | Mechanic Gets |
|----------|-------------|---------------------|---------------|
| **Independent Mechanic** | 15% | N/A | 85% |
| **Workshop Mechanic (Option A)** | 20% | 15% of net | 65% of gross |
| **Workshop Mechanic (Option B)** | 20% | Workshop gets 80%, pays mechanic separately | 80% to workshop |
| **Quote/Repair Jobs** | 12-20% (varies) | N/A | 80-88% (in escrow) |
| **RFQ with Referral** | 15% | N/A | 5% to referrer, 80% to winner |

### Custom Fee Agreements

**High-Volume Workshops** (>50 sessions/month):
- Platform fee: 15% (instead of 20%)
- Minimum commitment: 6 months

**Luxury Brand Specialists**:
- Platform fee: 18% (higher service standards)
- Certification required

**New Workshops** (First 3 months):
- Platform fee: 10% (promotional rate)
- After 3 months: Standard 20%

---

## ✅ Implementation Checklist

### Critical (Do First)

- [ ] **Phase 1**: Fix session payment splits to use `calculate_revenue_split()`
- [ ] **Phase 1**: Update session end route to respect workshop settings
- [ ] **Phase 1**: Populate `mechanic_earnings` and `workshop_earnings` tables
- [ ] **Phase 2**: Implement real Stripe transfers for escrow release
- [ ] **Phase 2**: Add safety checks (quote complete, no disputes, etc.)
- [ ] **Phase 3**: Implement referral fee transfers for RFQ escalations

### High Priority (Next)

- [ ] **Phase 4**: Build admin fee settings UI
- [ ] **Phase 4**: Add workshop-specific fee override capability
- [ ] **Phase 4**: Create fee change audit log
- [ ] **Phase 5**: Build escrow auto-release cron job
- [ ] **Phase 5**: Add admin notifications for manual review needed

### Medium Priority (Later)

- [ ] Build workshop earnings dashboard
- [ ] Build mechanic earnings dashboard
- [ ] Implement tiered fee rules (volume-based)
- [ ] Add payout scheduling (weekly/monthly options)
- [ ] Create financial reports for tax season
- [ ] Add dispute handling workflow

### Low Priority (Future Enhancements)

- [ ] A/B test different fee structures
- [ ] Implement dynamic pricing based on demand
- [ ] Add loyalty rewards (lower fees for long-term workshops)
- [ ] Build workshop performance analytics
- [ ] Create mechanic payout history export

---

## 🚨 Critical Business Decisions Needed

### Decision 1: Workshop Payout Model

**Question**: Should workshops receive all funds and pay mechanics themselves, or should platform split payments?

**Option A (Recommended)**: Workshop receives full amount (minus platform fee)
- Simpler tax/compliance (workshop handles W2/1099)
- One Stripe transfer instead of two
- Matches employer/employee relationship

**Option B**: Platform splits payment between workshop and mechanic
- More control for platform
- Better for contractor relationships
- Mechanics guaranteed payment even if workshop fails

**Recommendation**: Use **Option A** by default, allow workshops to toggle with `organizations.pays_mechanics_directly` flag

---

### Decision 2: Standard Platform Fee

**Current Inconsistency**:
- Config says: 15% for independent mechanics
- Code uses: 30% for session payments
- Workshop settings: 20% default

**Recommendation**:
```
Independent Mechanics: 15% platform fee
Workshop Sessions: 20% platform fee
Quotes/Repairs: 15% platform fee (negotiable per workshop)
```

**Rationale**:
- 15% is competitive with Uber (25-30%)
- 20% for workshops accounts for extra admin
- Lower than TaskRabbit (20-30%)

---

### Decision 3: Escrow Release Timing

**Question**: How long should funds be held before auto-release?

**Options**:
- 3 days (fast, risky)
- 7 days (balanced) ← **Recommended**
- 14 days (safe, slow)
- 30 days (very conservative)

**Recommendation**:
- Standard jobs: 7 days auto-release
- High-value (>$1000): 14 days or manual approval
- First-time workshops: Manual approval for first 5 jobs

---

### Decision 4: Referral Fee Source

**Question**: Should referral fees come from platform's share or reduce workshop's share?

**Option A**: Platform pays referral fee (reduces platform's 15% to 10%)
```
Total: $500
Platform: $50 (10% after paying referral)
Referral: $25 (5%)
Workshop: $425 (85%)
```

**Option B**: Workshop pays referral fee (reduces workshop's share)
```
Total: $500
Platform: $75 (15%)
Referral: $25 (5% from workshop's share)
Workshop: $400 (80%)
```

**Recommendation**: **Option B** (workshop pays referral fee)
- Referrals help workshop get customers
- Fair for workshop to pay for lead
- Keeps platform fee consistent

---

## 📈 Expected Revenue Impact

### Before Fixes (Current State)

**100 sessions @ $29.99 average**:
```
Revenue: $2,999
├─ Platform keeps (30%): $899.70
└─ Mechanics get (70%): $2,099.30
```

**10 repair quotes @ $500 average**:
```
Revenue: $5,000
├─ Platform keeps (15%): $750
└─ Workshops get (85%): $4,250 (HELD, NOT TRANSFERRED)
```

**Monthly**: Platform revenue = $1,649.70 (but $4,250 stuck in escrow)

---

### After Fixes (Correct Implementation)

**100 sessions @ $29.99 average**:
- 50 independent mechanics (15% fee): $224.93 platform revenue
- 50 workshop mechanics (20% fee): $299.90 platform revenue

```
Session Revenue: $2,999
├─ Platform keeps: $524.83 (17.5% effective)
├─ Independent mechanics: $1,274.43
└─ Workshops: $1,199.74 (who pay their employed mechanics)
```

**10 repair quotes @ $500 average**:
```
Revenue: $5,000
├─ Platform keeps (15%): $750
└─ Workshops get (85%): $4,250 (NOW ACTUALLY TRANSFERRED)
```

**Monthly**: Platform revenue = $1,274.83 (escrow actually released)

**Impact**:
- Platform revenue: -$375 (-22%) but more sustainable
- Workshops happy (actually get paid)
- Mechanics happy (fair split)
- Business compliant (proper 1099/W2 handling)

---

## 🎯 Success Metrics

After implementation, track:

1. **Payout Success Rate**: % of transfers that succeed
2. **Escrow Hold Time**: Average days funds held
3. **Dispute Rate**: % of jobs with customer disputes
4. **Workshop Satisfaction**: Surveys on payment speed
5. **Mechanic Retention**: Do mechanics stay after fee change?
6. **Platform Margin**: Actual platform fee collected vs expected

**Targets**:
- Payout success rate: >95%
- Average escrow hold time: <10 days
- Dispute rate: <2%
- Workshop satisfaction: >4.5/5
- Mechanic retention: >85% after 6 months

---

## 📚 Related Documentation

- **Stripe Connect Documentation**: https://stripe.com/docs/connect
- **Stripe Transfers**: https://stripe.com/docs/connect/transfers
- **Current Code**: `src/app/api/sessions/[id]/end/route.ts`
- **Database Functions**: `supabase/migrations_backup/20250127000002_workshop_revenue_splits.sql`
- **Workshop Settings**: `src/app/workshop/settings/revenue/page.tsx`

---

## ✅ Summary

### Current State
- ⚠️ Session payments use hardcoded 70/30 split (not configurable)
- ⚠️ Workshop settings ignored by session payment logic
- ⚠️ Escrow release is simulated (workshops never get paid)
- ⚠️ Referral fees tracked but never transferred
- ⚠️ No admin UI for fee configuration

### Correct Implementation
- ✅ Use `calculate_revenue_split()` function (respects workshop settings)
- ✅ Populate `mechanic_earnings` and `workshop_earnings` tables
- ✅ Implement real Stripe transfers for escrow release
- ✅ Transfer referral fees automatically
- ✅ Build admin UI for fee management
- ✅ Automate escrow release with safety checks

### Business Recommendations
- **Independent mechanics**: 15% platform fee
- **Workshop sessions**: 20% platform fee, workshops pay mechanics
- **Quotes/repairs**: 15% platform fee, 7-day auto-release
- **Referrals**: 5% fee paid from workshop's share
- **High-value jobs**: Manual approval or 14-day hold

---

**Next Steps**:
1. Review and approve fee structure
2. Prioritize phases 1-3 (critical fixes)
3. Test in development with real Stripe test mode
4. Deploy Phase 1 first (session splits)
5. Monitor metrics and adjust

---

**Status**: ⚠️ **ACTION REQUIRED**
**Priority**: 🔴 **CRITICAL** (affects revenue distribution and workshop satisfaction)
**Estimated Implementation**: 3-5 days for phases 1-3

