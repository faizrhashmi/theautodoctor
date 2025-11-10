# Implementation Status & Next Steps

## Date: 2025-11-08

## ✅ Completed (Phase 1-2)

### 1. Database Migrations ✅
**File**: `supabase/migrations/20251108100000_add_platform_fee_settings.sql`
- Created `platform_fee_settings` table (global defaults)
- Created `workshop_fee_overrides` table (per-workshop custom rates)
- Created `mechanic_fee_overrides` table (per-mechanic custom referral fees)
- Created `fee_change_log` audit table
- Added RLS policies (admins can manage, users can read)
- Added trigger functions for automatic audit logging
- Added helper functions: `get_mechanic_referral_fee()`, `get_workshop_quote_platform_fee()`, etc.

### 2. TypeScript Types ✅
**File**: `src/types/mechanic.ts`
- Added `MechanicType` enum (VIRTUAL_ONLY, INDEPENDENT_WORKSHOP, WORKSHOP_AFFILIATED)
- Added `PaymentDestination` interface
- Created `getMechanicType()` function - determines type from database fields
- Created `getSessionPaymentDestination()` function - routes payment to mechanic or workshop
- Created helper functions: `getMechanicTypeDescription()`, `canCreateQuotes()`, etc.

### 3. Platform Fees Library ✅
**File**: `src/lib/platformFees.ts`
- Created centralized fee management with 1-minute caching
- Functions to get global fees: `getPlatformFees()`
- Functions to get overrides: `getWorkshopFeeOverride()`, `getMechanicFeeOverride()`
- Calculation helpers: `calculateMechanicEarnings()`, `calculateReferralFee()`, etc.
- Escrow logic: `getEscrowHoldDays()` (7 days default, 14 for high-value)
- Falls back to hardcoded defaults if database unavailable

### 4. Config File Updated ✅
**File**: `src/config/mechanicPricing.ts`
- Changed `REFERRAL_FEE_RATE` from 0.05 to 0.02 (5% → 2%)
- Changed `REFERRAL_FEE_PERCENT` from 5 to 2
- Added note that these are fallback values (database is source of truth)

---

## 🔴 Critical Fixes Needed (To Implement)

### Fix 1: Workshop-Affiliated Mechanic Payment Routing
**File**: `src/app/api/sessions/[id]/end/route.ts`
**Lines**: 214-275
**Problem**: Workshop-affiliated mechanics get paid directly instead of their workshop

**Current Code** (WRONG):
```typescript
const { data: mechanic } = await supabaseAdmin
  .from('mechanics')
  .select('stripe_account_id, stripe_payouts_enabled, name')
  .eq('id', session.mechanic_id)
  .single()

if (mechanic?.stripe_account_id && mechanic.stripe_payouts_enabled) {
  const transfer = await stripe.transfers.create({
    destination: mechanic.stripe_account_id,  // ❌ Always pays mechanic
    amount: mechanicEarningsCents
  })
}
```

**Fixed Code** (CORRECT):
```typescript
import { getSessionPaymentDestination } from '@/types/mechanic'

// Fetch mechanic WITH workshop data
const { data: mechanic } = await supabaseAdmin
  .from('mechanics')
  .select(`
    id,
    name,
    stripe_account_id,
    stripe_payouts_enabled,
    workshop_id,
    account_type,
    service_tier,
    partnership_type,
    organizations!inner(
      id,
      name,
      stripe_account_id,
      stripe_payouts_enabled
    )
  `)
  .eq('id', session.mechanic_id)
  .single()

// ✅ Determine who gets paid (mechanic or workshop)
const paymentDestination = getSessionPaymentDestination(mechanic)

if (!paymentDestination.accountId) {
  payoutMetadata = {
    ...payoutMetadata,
    status: 'pending_stripe_connection',
    message: `${paymentDestination.type === 'workshop' ? 'Workshop' : 'Mechanic'} needs to connect Stripe`
  }
  throw new Error('No Stripe account connected')
}

// ✅ Create transfer to correct destination
const transfer = await stripe.transfers.create({
  amount: mechanicEarningsCents,
  currency: 'usd',
  destination: paymentDestination.accountId,
  description: `Session ${sessionId} - ${paymentDestination.payeeName}`,
  metadata: {
    session_id: sessionId,
    mechanic_id: paymentDestination.context.mechanic_id,
    workshop_id: paymentDestination.context.workshop_id || null,
    payee_type: paymentDestination.type,
    mechanic_type: paymentDestination.context.mechanic_type,
    plan: session.plan,
    session_type: session.type
  }
})

console.log(`✅ Paid ${paymentDestination.payeeName} (${paymentDestination.type}): $${mechanicEarningsCents/100}`)
```

---

### Fix 2: Implement Referral Fee Transfers
**File**: `src/app/api/stripe/webhook/route.ts`
**Lines**: Around 533
**Problem**: Referral fees calculated but never transferred

**Add After Creating `repair_payment` Record**:
```typescript
import { getMechanicReferralFee } from '@/lib/platformFees'

// ✅ Transfer referral fee to virtual mechanic
if (metadata.referring_mechanic_id) {
  try {
    // Get referring mechanic
    const { data: referringMechanic } = await supabaseAdmin
      .from('mechanics')
      .select('id, name, stripe_account_id, stripe_payouts_enabled')
      .eq('id', metadata.referring_mechanic_id)
      .single()

    if (!referringMechanic) {
      console.warn(`Referring mechanic ${metadata.referring_mechanic_id} not found`)
    } else {
      // Get effective referral fee (custom or default 2%)
      const referralFeePercent = await getMechanicReferralFee(metadata.referring_mechanic_id)
      const referralFeeCents = Math.round((paymentIntent.amount) * (referralFeePercent / 100))

      if (referringMechanic.stripe_account_id && referringMechanic.stripe_payouts_enabled) {
        // ✅ Transfer referral fee immediately
        const referralTransfer = await stripe.transfers.create({
          amount: referralFeeCents,
          currency: 'usd',
          destination: referringMechanic.stripe_account_id,
          description: `Referral fee - Quote ${metadata.quote_id}`,
          metadata: {
            type: 'referral_fee',
            quote_id: metadata.quote_id,
            rfq_id: metadata.rfq_id || null,
            referring_mechanic_id: metadata.referring_mechanic_id,
            repair_amount_cents: paymentIntent.amount,
            referral_fee_percent: referralFeePercent
          }
        })

        // Record in mechanic_earnings table
        await supabaseAdmin.from('mechanic_earnings').insert({
          mechanic_id: metadata.referring_mechanic_id,
          quote_id: metadata.quote_id,
          gross_amount_cents: referralFeeCents,
          mechanic_net_cents: referralFeeCents,
          platform_fee_cents: 0,
          payout_status: 'transferred',
          payout_id: referralTransfer.id,
          earnings_type: 'referral',
          created_at: new Date().toISOString()
        })

        console.log(`✅ Referral fee paid: $${(referralFeeCents/100).toFixed(2)} to ${referringMechanic.name}`)
      } else {
        // Mechanic hasn't connected Stripe - pending
        await supabaseAdmin.from('mechanic_earnings').insert({
          mechanic_id: metadata.referring_mechanic_id,
          quote_id: metadata.quote_id,
          gross_amount_cents: referralFeeCents,
          mechanic_net_cents: referralFeeCents,
          payout_status: 'pending_stripe_connection',
          earnings_type: 'referral'
        })

        console.warn(`⚠️ Referral fee pending: ${referringMechanic.name} needs to connect Stripe`)
      }
    }
  } catch (referralError) {
    console.error('Failed to process referral fee:', referralError)
    // Don't fail entire webhook
  }
}
```

---

### Fix 3: Use Dynamic Fees in Session End Route
**File**: `src/app/api/sessions/[id]/end/route.ts`
**Line**: 12

**Current** (WRONG):
```typescript
const MECHANIC_SHARE = 0.7 // 70% to mechanic, 30% to platform
```

**Fixed** (CORRECT):
```typescript
import { calculateMechanicEarnings } from '@/lib/platformFees'

// Remove hardcoded constant, use dynamic calculation instead

// Later in the code (around line 201):
// Instead of:
const mechanicEarningsCents = Math.round(planPrice * MECHANIC_SHARE)

// Use:
const mechanicEarningsCents = await calculateMechanicEarnings(planPrice)
```

---

## 🎨 Admin UI Needed

### Admin Fee Settings Page
**File**: `src/app/admin/(shell)/fee-settings/page.tsx` (CREATE NEW)

**Features Required**:
1. **Global Settings Tab**:
   - Session split slider (mechanic % / platform %)
   - Referral fee input (default 2%)
   - Workshop quote platform fee (default 15%)
   - Escrow hold days (default 7, high-value 14)
   - High-value threshold input (default $1000)
   - Enable/disable auto-release toggle

2. **Workshop Overrides Tab**:
   - Search workshops
   - View current overrides
   - Create custom agreement (session fee, quote fee, escrow days)
   - Set agreement type (volume_discount, promotional, partnership)
   - Set expiry date
   - Deactivate override

3. **Mechanic Overrides Tab**:
   - Search mechanics
   - View current referral fee overrides
   - Create custom referral fee (e.g., 3% for top performers)
   - Set reason, effective date, expiry date

4. **Audit Log Tab**:
   - View all fee changes
   - Filter by entity type (global/workshop/mechanic)
   - Filter by date range
   - Show who changed what when

**Navigation**: Add to admin sidebar under "Settings" → "Fee Configuration"

---

## 📝 Documentation Updates Needed

### 1. Update `BUSINESS_LOGIC_ANALYSIS_AND_RECOMMENDATIONS.md`
Add section:
```markdown
## ✅ Implementation Complete

All three phases have been implemented:
- Phase 1: Critical bugs fixed ✅
- Phase 2: Admin fee configuration UI ✅
- Phase 3: Type system and utilities ✅

See IMPLEMENTATION_STATUS_AND_NEXT_STEPS.md for details.
```

### 2. Update `STRIPE_CONNECT_PAYMENT_SPLITS_ANALYSIS.md`
Update "Current State" section to show fixes implemented.

### 3. Update `CODEBASE_AUDIT_REPORT.md`
Mark Issue #5 as RESOLVED:
```markdown
Issue #5: 2% independent mechanic referral fee not implemented
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Priority: HIGH
**Status**: ✅ RESOLVED (2025-11-08)

Resolution:
- Referral fee changed from 5% to 2% in config
- Database-driven fees implemented (platform_fee_settings table)
- Admin UI created for dynamic fee management
- Referral fee transfers implemented in webhook
- Workshop payment routing fixed

Files Changed:
- src/config/mechanicPricing.ts - Updated to 2%
- src/lib/platformFees.ts - Created fee management library
- src/types/mechanic.ts - Added payment routing logic
- supabase/migrations/20251108100000_add_platform_fee_settings.sql
```

---

## 🧪 Testing Checklist

Before deploying:

### Database
- [ ] Run migration: `pnpm supabase db push`
- [ ] Verify tables created: platform_fee_settings, workshop_fee_overrides, mechanic_fee_overrides
- [ ] Verify default values inserted
- [ ] Test helper functions: `SELECT get_mechanic_referral_fee('mechanic-id')`

### Session Payments
- [ ] Test virtual mechanic session → mechanic gets paid
- [ ] Test independent workshop owner session → mechanic gets paid
- [ ] Test workshop-affiliated mechanic session → WORKSHOP gets paid (not mechanic)
- [ ] Verify 70/30 split is correct
- [ ] Check metadata includes mechanic_type and payee_type

### Referral Fees
- [ ] Virtual mechanic escalates customer to workshop
- [ ] Customer approves $500 quote
- [ ] Check referring mechanic gets $10 transfer (2% of $500)
- [ ] Verify recorded in mechanic_earnings table

### Admin UI
- [ ] Can change global referral fee from 2% to 3%
- [ ] Can create workshop override (custom 12% quote fee)
- [ ] Can create mechanic override (custom 4% referral)
- [ ] Verify changes logged in fee_change_log
- [ ] Verify changes take effect immediately (within 1 min cache)

### Edge Cases
- [ ] Workshop-affiliated mechanic has personal Stripe account → workshop still gets paid
- [ ] Referral fee override expired → uses global default
- [ ] Workshop agreement expired → uses global default
- [ ] Database query fails → falls back to hardcoded defaults

---

## 🚀 Deployment Steps

1. **Apply Migration**:
   ```bash
   cd "c:\Users\Faiz Hashmi\theautodoctor"
   pnpm supabase db push
   ```

2. **Verify Migration**:
   ```sql
   SELECT * FROM platform_fee_settings;
   -- Should return 1 row with defaults
   ```

3. **Deploy Code Changes**:
   - Commit changes to git
   - Push to deployment branch
   - Vercel will auto-deploy

4. **Post-Deployment Verification**:
   - Test session payment with each mechanic type
   - Test referral fee transfer
   - Test admin fee settings UI
   - Check Stripe dashboard for transfers

5. **Monitor**:
   - Check logs for payment routing errors
   - Verify no mechanics/workshops report missing payments
   - Monitor fee_change_log for audit trail

---

## 📊 Business Impact

### Before Fixes:
- Virtual mechanics earned 5% referrals (too high)
- Workshop-affiliated mechanics could steal revenue
- No way to change fees without code deployment

### After Fixes:
- Virtual mechanics earn correct 2% referrals
- Workshop gets paid for their employees' work
- Admin can adjust fees via UI instantly
- Per-workshop and per-mechanic custom rates
- Complete audit trail of all fee changes

**ROI**: Correct business model + operational flexibility + compliance

---

## 🎯 Next Actions

**Priority Order**:
1. Implement Fix 1 (workshop payment routing) - CRITICAL
2. Implement Fix 2 (referral fee transfers) - CRITICAL
3. Implement Fix 3 (dynamic fees in session end) - HIGH
4. Build admin UI - HIGH
5. Update documentation - MEDIUM
6. Test thoroughly - CRITICAL
7. Deploy to production - FINAL

**Estimated Time**: 2-3 days for full implementation + testing

---

**Status**: ✅ Foundation Complete, Ready for Critical Fixes Implementation
**Last Updated**: 2025-11-08
**Next Step**: Implement Fix 1 (workshop payment routing)
