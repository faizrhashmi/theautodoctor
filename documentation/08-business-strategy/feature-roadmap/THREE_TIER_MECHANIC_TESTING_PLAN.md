# 3-Tier Mechanic Model - Testing & Verification Plan

## Overview
This document outlines how to test and verify the 3-tier mechanic business model implementation.

---

## 🎯 Three Mechanic Tiers

### 1. **Virtual-Only Mechanics**
- **Classification**: `service_tier = 'virtual'` AND `can_perform_physical_work = false`
- **Capabilities**: Remote diagnostics only
- **Payment Routing**: Mechanic gets paid directly
- **Revenue Model**:
  - 70% of session payments
  - 2% referral fee when referred customers approve workshop quotes
- **Restrictions**:
  - ❌ Cannot access Partnerships menu
  - ❌ Cannot apply for workshop partnerships (API returns 403)
  - ✅ Can escalate sessions to workshops

### 2. **Independent Workshop Owners**
- **Classification**: `workshop_id` exists AND `account_type = 'independent'`
- **Capabilities**: Own their workshop, can do virtual + physical work
- **Payment Routing**: Mechanic gets paid directly (not workshop)
- **Revenue Model**:
  - 70% of virtual session payments
  - Workshop rates for physical repair quotes (with platform fee)

### 3. **Workshop-Affiliated Mechanics**
- **Classification**: `workshop_id` exists AND `account_type = 'workshop'`
- **Capabilities**: Employee/contractor of a workshop
- **Payment Routing**: ⚠️ **WORKSHOP gets paid** (not the mechanic)
- **Revenue Model**:
  - Workshop receives 70% of session payments
  - Workshop handles mechanic's compensation (platform neutral)

---

## 🧪 Testing Scenarios

### Test 1: Virtual-Only Mechanic Session Payment
**Setup**:
1. Create/use mechanic with:
   - `service_tier = 'virtual'`
   - `can_perform_physical_work = false`
   - `workshop_id = NULL`
   - Stripe account connected

**Test Steps**:
1. Complete a paid session ($30)
2. Check session end route creates transfer
3. Verify transfer goes to mechanic's Stripe account
4. Verify amount = $21 (70% of $30)
5. Check `mechanic_earnings` table records it

**Expected Result**:
- ✅ Transfer destination: Mechanic's `stripe_account_id`
- ✅ Transfer metadata: `payee_type = 'mechanic'`, `mechanic_type = 'virtual_only'`

---

### Test 2: Virtual-Only Mechanic Referral Fee
**Setup**:
1. Virtual mechanic escalates session to workshop
2. Customer approves workshop quote ($500)
3. Workshop completes job
4. Customer pays workshop quote

**Test Steps**:
1. Trigger webhook: `payment_intent.succeeded` for RFQ bid
2. Check webhook creates referral transfer
3. Verify transfer = $10 (2% of $500)
4. Verify destination = mechanic's Stripe account

**Expected Result**:
- ✅ Transfer created to mechanic
- ✅ Transfer amount = 2% of quote
- ✅ `mechanic_earnings` table: `earnings_type = 'referral'`
- ✅ Notification sent to mechanic

---

### Test 3: Virtual-Only Partnership Restriction
**Setup**:
1. Login as virtual-only mechanic

**Test Steps**:
1. Check sidebar navigation
2. Try to navigate to `/mechanic/partnerships/browse`
3. Try API call: `GET /api/mechanics/partnerships/programs`

**Expected Result**:
- ✅ "Partnerships" menu item NOT visible in sidebar
- ✅ Direct navigation shows error from API
- ✅ API returns 403 with message: "Partnerships are only available to mechanics who can perform physical work"

---

### Test 4: Independent Workshop Owner Session Payment
**Setup**:
1. Create/use mechanic with:
   - `workshop_id = 'some-workshop-uuid'`
   - `account_type = 'independent'`
   - Mechanic AND workshop both have Stripe accounts

**Test Steps**:
1. Complete a paid session ($30)
2. Check session end route transfer

**Expected Result**:
- ✅ Transfer destination: **Mechanic's** `stripe_account_id` (NOT workshop)
- ✅ Transfer amount = $21 (70%)
- ✅ Transfer metadata: `payee_type = 'mechanic'`, `mechanic_type = 'independent_workshop'`

---

### Test 5: Workshop-Affiliated Mechanic Payment Routing (CRITICAL)
**Setup**:
1. Create mechanic with:
   - `workshop_id = 'workshop-xyz'`
   - `account_type = 'workshop'` (or `partnership_type = 'employee'`)
   - Mechanic has personal Stripe account
   - Workshop has Stripe account

**Test Steps**:
1. Complete a paid session ($30)
2. Check session end route query includes workshop organization data
3. Verify `getSessionPaymentDestination()` returns workshop
4. Verify transfer goes to **WORKSHOP** Stripe account (not mechanic)

**Expected Result**:
- ✅ Transfer destination: Workshop's `organizations.stripe_account_id`
- ✅ Transfer amount = $21 (70%)
- ✅ Transfer metadata: `payee_type = 'workshop'`, `mechanic_type = 'workshop_affiliated'`
- ✅ Mechanic's personal Stripe account **NOT used** (prevents revenue theft)

---

## 📊 Payment Routing Matrix

| Mechanic Type | Session Payment Destination | Referral Fee Destination |
|---------------|---------------------------|------------------------|
| Virtual-Only | Mechanic | Mechanic (2% of quote) |
| Independent Workshop | Mechanic | N/A (can create own quotes) |
| Workshop-Affiliated | **Workshop** | N/A (workshop handles) |

---

## 🔍 Database Verification Queries

### Check Mechanic Type Classification
```sql
SELECT
  id,
  name,
  service_tier,
  account_type,
  workshop_id,
  can_perform_physical_work,
  CASE
    WHEN workshop_id IS NULL THEN 'VIRTUAL_ONLY'
    WHEN account_type = 'workshop' THEN 'WORKSHOP_AFFILIATED'
    WHEN account_type = 'independent' THEN 'INDEPENDENT_WORKSHOP'
    ELSE 'UNKNOWN'
  END AS mechanic_type
FROM mechanics
WHERE id = 'mechanic-id-here';
```

### Verify Referral Fee Transfer
```sql
SELECT
  me.mechanic_id,
  me.quote_id,
  me.gross_amount_cents / 100.0 AS referral_fee_dollars,
  me.earnings_type,
  me.payout_status,
  me.payout_id
FROM mechanic_earnings me
WHERE me.earnings_type = 'referral'
ORDER BY me.created_at DESC
LIMIT 10;
```

### Check Session Payment Metadata
```sql
SELECT
  s.id AS session_id,
  s.mechanic_id,
  s.payout_metadata,
  m.name AS mechanic_name,
  m.account_type,
  m.workshop_id
FROM sessions s
JOIN mechanics m ON m.id = s.mechanic_id
WHERE s.status = 'completed'
  AND s.payout_metadata IS NOT NULL
ORDER BY s.ended_at DESC
LIMIT 10;
```

---

## 🎨 Admin UI Testing

### Test 6: Global Fee Settings UI
**URL**: `/admin/fee-settings`

**Test Steps**:
1. Login as admin
2. Navigate to fee settings page
3. Change session split from 70/30 to 75/25
4. Change referral fee from 2% to 3%
5. Save changes
6. Reload page - verify changes persisted
7. Check database: `SELECT * FROM platform_fee_settings`

**Expected Result**:
- ✅ UI updates immediately
- ✅ Database reflects changes
- ✅ Fee cache cleared (next session uses new rates)

---

### Test 7: Workshop Fee Overrides UI
**URL**: `/admin/workshop-rates`

**Test Steps**:
1. Navigate to workshop rates page
2. Click "Add Custom Rate"
3. Select a workshop
4. Set custom quote fee: 12% (instead of default 15%)
5. Set agreement type: "Volume Discount"
6. Save
7. Verify workshop appears in table with 12% fee

**Test Steps (Verify in Transaction)**:
1. Process a workshop quote payment ($500)
2. Verify platform fee = $60 (12% instead of $75)

**Expected Result**:
- ✅ Override saved to `workshop_fee_overrides` table
- ✅ Future quote payments use 12% fee
- ✅ Audit log records change in `fee_change_log` table

---

## 🚨 Critical Edge Cases

### Edge Case 1: Workshop-Affiliated Mechanic with Personal Stripe
**Scenario**: Mechanic works for workshop but connects personal Stripe account

**Old Behavior (BUG)**:
- Session payment goes to mechanic's personal account
- Workshop loses 70% revenue
- Mechanic can steal revenue

**New Behavior (FIXED)**:
- Session end route queries workshop organization data
- Payment routes to workshop's Stripe account
- Mechanic's personal account ignored
- Transfer metadata shows `payee_type = 'workshop'`

**Test**: Follow Test 5 above

---

### Edge Case 2: Mechanic Switches from Virtual to Workshop-Affiliated
**Scenario**: Virtual mechanic gets hired by workshop

**Expected Behavior**:
1. Admin updates mechanic:
   - `workshop_id = 'workshop-abc'`
   - `account_type = 'workshop'`
2. Next session payment routes to workshop (not mechanic)
3. Partnerships menu disappears from sidebar
4. Partnership applications return 403

---

### Edge Case 3: Custom Referral Fee Per Mechanic
**Scenario**: High-performing virtual mechanic negotiates 3% referral fee

**Test Steps**:
1. Admin creates override in database:
```sql
INSERT INTO mechanic_fee_overrides (
  mechanic_id,
  custom_referral_fee_percent,
  override_reason,
  effective_date,
  is_active
) VALUES (
  'mechanic-xyz',
  3.00,
  'Top performer - increased rate',
  CURRENT_DATE,
  true
);
```
2. Process referral payment ($500)
3. Verify fee = $15 (3% instead of 2%)

---

## 📋 Verification Checklist

### Code Implementation
- [x] Session end route uses `getSessionPaymentDestination()`
- [x] Session query includes workshop organization data
- [x] Transfer metadata includes `payee_type` and `mechanic_type`
- [x] Webhook implements referral fee Stripe transfers
- [x] Webhook uses dynamic 2% fee (not hardcoded 5%)
- [x] Partnership API routes check `service_tier` and return 403
- [x] Sidebar filters partnership link for virtual-only
- [x] Fee settings cache properly cleared on updates

### Database
- [x] Migration pushed to Supabase
- [x] `platform_fee_settings` table created with default values
- [x] `workshop_fee_overrides` table created with RLS
- [x] `mechanic_fee_overrides` table created with RLS
- [x] `fee_change_log` table created with triggers

### Admin UI
- [x] `/admin/fee-settings` page created
- [x] `/admin/workshop-rates` page created
- [x] API routes created for fee management
- [ ] Add navigation links to admin sidebar

### Documentation
- [ ] Update CODEBASE_AUDIT_REPORT.md
- [ ] Update business logic documentation
- [ ] Create deployment notes

---

## 🎯 Success Criteria

All tests must pass:
1. ✅ Virtual-only mechanics receive 70% + 2% referrals
2. ✅ Independent workshop owners receive 70% directly
3. ✅ Workshop-affiliated payments route to workshop (not mechanic)
4. ✅ Partnerships restricted for virtual-only mechanics
5. ✅ Referral fees actually transferred (not just notified)
6. ✅ Admin can adjust fees via UI
7. ✅ Workshop-specific rates override global defaults
8. ✅ All fee changes logged in audit trail

---

## 📞 Support & Debugging

### Check Payment Routing Logic
```typescript
import { getMechanicType, getSessionPaymentDestination } from '@/types/mechanic'

// In console or test:
const mechanic = { /* mechanic data */ }
const mechanicType = getMechanicType(mechanic)
const paymentDestination = getSessionPaymentDestination(mechanic)
console.log({ mechanicType, paymentDestination })
```

### Verify Fee Calculation
```typescript
import { getMechanicReferralFee, calculateReferralFee } from '@/lib/platformFees'

// In API route or test:
const feePercent = await getMechanicReferralFee('mechanic-id')
const feeAmount = await calculateReferralFee(50000, 'mechanic-id') // $500 quote
console.log({ feePercent, feeAmount })
```

---

**Last Updated**: 2025-11-08
**Implementation Status**: ✅ Core logic complete, UI ready for testing
