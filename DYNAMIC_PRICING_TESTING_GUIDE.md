# Dynamic Pricing System - Testing & Verification Guide

## 🎯 Overview

This guide provides step-by-step instructions for testing the newly implemented dynamic pricing system. The system allows admins to manage pricing through the database, which automatically updates across all customer-facing pages and payment flows.

---

## ✅ What Was Implemented

### Phase 1: Public API Endpoint
- **File**: `src/app/api/plans/route.ts`
- **Feature**: Public endpoint that fetches active plans from `service_plans` table
- **Caching**: 60-second revalidation for performance

### Phase 2: React Hook
- **File**: `src/hooks/useServicePlans.ts`
- **Feature**: Reusable hook for fetching plans in client components
- **Benefits**: Centralized data fetching, loading states, error handling

### Phase 3: Homepage Update
- **File**: `src/app/page.tsx`
- **Feature**: Dynamic pricing display with fallback to hardcoded values
- **Benefits**: Shows real-time pricing from database

### Phase 4: Pricing Page Update
- **File**: `src/app/services-pricing/page.tsx`
- **Feature**: Full dynamic pricing with loading states
- **Benefits**: All plan details from database

### Phase 5: Checkout Flow Update
- **File**: `src/app/api/checkout/create-session/route.ts`
- **Feature**: Fetches Stripe Price IDs from database with fallback
- **Benefits**: Admin pricing changes immediately affect checkout

### Phase 6: Webhook Update
- **File**: `src/app/api/stripe/webhook/route.ts`
- **Feature**: Validates plans against database before fulfillment
- **Benefits**: Supports both database plans and legacy hardcoded plans

### Phase 7: Admin Validation
- **File**: `src/app/api/admin/plans/[id]/route.ts`
- **Feature**: Stripe Price ID validation before saving
- **Benefits**: Prevents invalid Stripe Price IDs from being saved

### Phase 8: Verification Script
- **File**: `scripts/check-stripe-price-ids.js`
- **Feature**: Checks which plans need Stripe configuration
- **Benefits**: Quick audit of Stripe setup

---

## 🧪 Testing Checklist

### Pre-Testing Setup

1. **Check Database Status**
   ```bash
   node scripts/check-stripe-price-ids.js
   ```
   - This shows which plans exist and which need Stripe Price IDs
   - Currently, all paid plans need Stripe Price IDs configured

2. **Configure Stripe Price IDs (Required for Payment Testing)**
   - Go to [Stripe Dashboard - Prices](https://dashboard.stripe.com/prices)
   - Create Prices for each plan shown in the verification script
   - Copy the Price IDs (start with `price_`)
   - Update plans via `/admin/plans` in your app

---

### Test 1: Admin Plan Management

**Objective**: Verify admin can update plans and Stripe Price IDs are validated

**Steps**:
1. Navigate to `/admin/plans`
2. Click "Edit Plan" on any PAYG plan (e.g., "Quick Chat")
3. Try to enter an invalid Stripe Price ID (e.g., "invalid_id")
   - **Expected**: Error message about invalid format
4. Try to enter a non-existent Price ID (e.g., "price_FAKE123")
   - **Expected**: Error message "Stripe Price ID not found"
5. Enter a valid Stripe Price ID from your Stripe dashboard
   - **Expected**: Plan updates successfully with validation confirmation

**Success Criteria**:
- ✅ Invalid Price IDs are rejected with clear error messages
- ✅ Valid Price IDs are accepted and saved
- ✅ Free plans can be saved without Price IDs

---

### Test 2: Dynamic Pricing Display - Homepage

**Objective**: Verify homepage shows database pricing

**Steps**:
1. Go to `/admin/plans` and note the price of "Quick Chat" (currently $9.99)
2. Navigate to homepage `/`
3. Find the "Quick Chat" pricing card
   - **Expected**: Shows "$9.99" and "30 minutes"
4. Go back to `/admin/plans` and change "Quick Chat" price to $12.99
5. Wait 60 seconds (for cache to expire) OR reload with cache clear
6. Check homepage again
   - **Expected**: Shows "$12.99" and "30 minutes"

**Success Criteria**:
- ✅ Homepage displays current database pricing
- ✅ Price changes in admin reflect on homepage (within 60 seconds)
- ✅ If database is unavailable, fallback pricing shows

---

### Test 3: Dynamic Pricing Display - Pricing Page

**Objective**: Verify pricing page shows all plan details from database

**Steps**:
1. Navigate to `/services-pricing`
2. Verify all active plans are displayed
   - **Expected**: See "Free Session", "Quick Advice", "Quick Chat", "Standard Video", "Full Diagnostic"
3. Verify plan details match database:
   - Price (e.g., "$9.99")
   - Duration (e.g., "30 minutes")
   - Perks (bullet points)
   - Description
4. Go to `/admin/plans` and disable "Quick Advice"
5. Refresh `/services-pricing`
   - **Expected**: "Quick Advice" no longer appears

**Success Criteria**:
- ✅ All active plans are displayed
- ✅ Inactive plans are hidden
- ✅ Plan details (price, duration, perks) match database
- ✅ Loading state appears while fetching

---

### Test 4: Checkout Flow - Database Stripe Price IDs

**Objective**: Verify checkout uses database Stripe Price IDs

**Prerequisites**:
- Stripe Price ID must be configured for the plan being tested
- Run `node scripts/check-stripe-price-ids.js` to verify

**Steps**:
1. Ensure "Quick Chat" has a Stripe Price ID in database
2. Start a new session by filling out intake form
3. Select "Quick Chat" plan
4. Complete form and submit
5. Sign the waiver
6. **Expected**: Redirects to Stripe checkout
7. Check Stripe checkout page
   - **Expected**: Shows correct price from database
8. Open browser console and check for log: `[Checkout] Plan found in database`
9. Cancel checkout and return to app

**Success Criteria**:
- ✅ Checkout session created successfully
- ✅ Stripe shows correct price from database
- ✅ Console logs show database lookup was successful
- ✅ If plan not in database, fallback to hardcoded config (with warning log)

---

### Test 5: Payment Webhook - Plan Validation

**Objective**: Verify webhook validates plans against database

**Prerequisites**:
- Must complete a real test payment in Stripe test mode

**Steps**:
1. Complete a test payment for "Quick Chat" using Stripe test card
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
2. After payment completes, check server logs
3. Look for webhook log: `[webhook:checkout] Plan: quick`
4. Verify validation passed (no "Invalid plan" error)
5. Verify session was created in database
6. Check session details show correct plan slug

**Success Criteria**:
- ✅ Webhook receives checkout.session.completed event
- ✅ Plan validation passes (checks database first)
- ✅ Session is created with correct plan
- ✅ Customer is redirected to thank-you page

---

### Test 6: Admin Plan Price Change - End-to-End

**Objective**: Verify complete flow from admin price change to customer payment

**Steps**:
1. **Admin Changes Price**:
   - Go to `/admin/plans`
   - Edit "Quick Chat" and change price from $9.99 to $14.99
   - Update Stripe Price ID if needed (or keep same for test)
   - Save changes

2. **Customer Views New Price**:
   - Wait 60 seconds or clear cache
   - Visit homepage `/` as a customer
   - **Expected**: "Quick Chat" shows "$14.99"
   - Visit `/services-pricing`
   - **Expected**: "Quick Chat" shows "$14.99"

3. **Customer Attempts Checkout**:
   - Fill out intake form
   - Select "Quick Chat" ($14.99)
   - Submit form
   - **Expected**: Redirects to Stripe checkout
   - **Expected**: Stripe shows $14.99 (if Price ID matches new price)

4. **Verify Database**:
   - Run: `node scripts/check-stripe-price-ids.js`
   - **Expected**: "Quick Chat" shows price $14.99

**Success Criteria**:
- ✅ Admin can change price in database
- ✅ Homepage updates within 60 seconds
- ✅ Pricing page updates within 60 seconds
- ✅ Checkout uses new database price
- ✅ No errors in console or server logs

---

### Test 7: Free Plan Flow (No Stripe)

**Objective**: Verify free plans work without Stripe Price IDs

**Steps**:
1. Verify "Free Session" has no Stripe Price ID:
   - Run: `node scripts/check-stripe-price-ids.js`
   - **Expected**: Shows "No Stripe Price ID (free plan)"
2. Start intake form as customer
3. Select "Free Session"
4. Complete form and submit
5. **Expected**: Session created immediately (no Stripe redirect)
6. **Expected**: Redirected to waiver, then thank-you page
7. Verify session exists in database with status "live"

**Success Criteria**:
- ✅ Free plan works without Stripe configuration
- ✅ Session created via session factory
- ✅ No Stripe checkout redirect
- ✅ Customer can use session immediately

---

### Test 8: Fallback to Hardcoded Pricing

**Objective**: Verify system gracefully falls back if database is unavailable

**Steps**:
1. Temporarily disable database access (or test with invalid plan slug)
2. Visit homepage `/`
3. **Expected**: Shows fallback hardcoded pricing
4. **Expected**: No error to customer (graceful degradation)
5. Check console for warning: "Using fallback hardcoded pricing"
6. Restore database access
7. Refresh homepage
8. **Expected**: Shows database pricing again

**Success Criteria**:
- ✅ Homepage doesn't crash if database fails
- ✅ Fallback pricing is displayed
- ✅ Warning logged in console
- ✅ System recovers when database is restored

---

## 🚨 Known Issues & Limitations

### Current State

1. **Stripe Price IDs Not Configured**:
   - All paid plans need Stripe Price IDs created in Stripe Dashboard
   - Until configured, checkout will use fallback hardcoded config (if available)
   - Use verification script to identify which plans need configuration

2. **60-Second Cache**:
   - Pricing changes take up to 60 seconds to appear on frontend
   - For instant updates, clear browser cache or use incognito mode
   - Admin changes are immediate in database

3. **Backward Compatibility**:
   - System maintains fallback to hardcoded `PRICING` config
   - Old plan slugs (chat10, video15, diagnostic) still work
   - New plans use descriptive slugs (quick, standard, diagnostic)

---

## 📊 Verification Commands

### Check Database Pricing
```bash
node scripts/check-stripe-price-ids.js
```

### Run TypeCheck
```bash
pnpm typecheck
```
- Some pre-existing errors are unrelated to dynamic pricing changes

### Start Development Server
```bash
pnpm dev
```

---

## 🎓 How to Configure Stripe Price IDs

### For PAYG Plans (One-time payments)

1. Go to [Stripe Dashboard - Products](https://dashboard.stripe.com/products)
2. Click "Add Product"
3. Fill in:
   - **Name**: Match the plan name (e.g., "Quick Chat")
   - **Description**: Optional
4. Under "Pricing":
   - **Type**: One-time
   - **Price**: Match database price (e.g., $9.99)
   - **Currency**: USD
5. Click "Save product"
6. Copy the **Price ID** (starts with `price_`)
7. Go to `/admin/plans` in your app
8. Edit the plan
9. Paste the Price ID into "Stripe Price ID (One-time)"
10. Click "Update Plan"
11. **Validation**: System will verify the Price ID with Stripe before saving

### For Subscription Plans

1. Follow steps 1-3 above
2. Under "Pricing":
   - **Type**: Recurring
   - **Billing period**: Monthly or Annual (match database)
   - **Price**: Match database price
3. Save and copy **Subscription Price ID**
4. Update in `/admin/plans` under "Stripe Subscription Price ID"

---

## 📝 Next Steps After Testing

1. **Configure Stripe Prices**: Add Price IDs for all active PAYG plans
2. **Test Payment Flow**: Complete end-to-end payment with real test card
3. **Monitor Logs**: Check webhook logs after first payment
4. **Update Documentation**: Document any issues found during testing
5. **Deploy to Production**: Once all tests pass in development

---

## 🐛 Troubleshooting

### Issue: "Plan not found in database"
- **Solution**: Check plan slug matches database exactly (run verification script)
- **Fallback**: System will use hardcoded PRICING config if available

### Issue: "Invalid Stripe Price ID"
- **Solution**: Verify Price ID format (`price_...`) and exists in Stripe Dashboard
- **Check**: Ensure Price is active in Stripe (not archived)

### Issue: Pricing not updating on frontend
- **Solution**: Wait 60 seconds for cache to expire
- **Quick Fix**: Clear browser cache or use incognito mode
- **Check**: Verify database actually updated (run verification script)

### Issue: Checkout fails with "Plan is not configured for payments"
- **Solution**: Add Stripe Price ID via `/admin/plans`
- **Check**: Run `node scripts/check-stripe-price-ids.js`

---

## ✅ Testing Sign-Off Checklist

Before marking implementation as complete:

- [ ] All admin plan management tests pass
- [ ] Homepage displays dynamic pricing
- [ ] Pricing page displays all plan details
- [ ] Checkout creates session with database Stripe Price ID
- [ ] Webhook validates plans successfully
- [ ] End-to-end price change flow works
- [ ] Free plan works without Stripe
- [ ] Fallback pricing works when database unavailable
- [ ] Stripe Price IDs configured for production plans
- [ ] Verification script shows all plans configured
- [ ] No errors in console or server logs
- [ ] Audit report updated with implementation details

---

**Last Updated**: 2025-11-08
**Implementation Status**: ✅ Complete - Pending Testing
**Next Action**: Configure Stripe Price IDs and run end-to-end tests
