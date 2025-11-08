# Smoke Test Scenarios - Final Ship Fixes

**Purpose**: Manual QA scenarios to verify ship-readiness after implementing final fixes
**Date**: 2025-11-04
**Scope**: Critical paths, payment flows, refund system, pricing, auth, notifications

---

## 🔴 CRITICAL PATH TESTS (BLOCKERS)

### 1. Refund System - Full Flow
**Priority**: P0 - BLOCKER
**Estimated Time**: 10 minutes

**Test Scenario**:
1. Customer books a paid session (any plan)
2. Payment is held in escrow (`escrow_status = 'held'`)
3. Admin/Customer initiates refund via `/api/repair-payments/[paymentId]/refund`
4. Verify refund endpoint guards:
   - ✅ Auth check: Only customer who paid can request refund
   - ✅ Status check: Only 'held' payments can be refunded
5. Check refund record created in `refunds` table
6. Check `escrow_status` updated to 'refunded'

**Expected Result**:
- ✅ Refund processes successfully
- ✅ Stripe webhook receives `charge.refunded` event
- ✅ Audit log appears: `✓ Audit: {charge_id} | charge.refunded | repair_payment:{id} | customer:{id} | $X.XX USD`

**Pass Criteria**: Refund completes, audit log visible, no errors

---

### 2. Stripe Webhook - Idempotency Check
**Priority**: P0 - BLOCKER
**Estimated Time**: 5 minutes

**Test Scenario**:
1. Trigger a refund (from Test #1)
2. Manually replay the same `charge.refunded` webhook event (use Stripe Dashboard > Developers > Webhooks > Event Details > Resend)
3. Check database: Verify duplicate refund NOT created
4. Check logs: Verify idempotency message appears

**Expected Result**:
- ✅ Webhook processes event once only
- ✅ Duplicate events are ignored via `stripe_events` table check
- ✅ No duplicate refund records

**Pass Criteria**: Idempotent behavior confirmed, no duplicates

---

### 3. SessionWizard - Dynamic Pricing
**Priority**: P0 - HIGH PRIORITY
**Estimated Time**: 8 minutes

**Test Scenario**:
1. Navigate to `/customer/dashboard`
2. Click "Start Session" to open SessionWizard
3. Verify plans load from database (not hardcoded)
4. Admin: Update a plan price in `/admin/plans` (e.g., change "Standard Video" from $29.99 to $34.99)
5. Customer: Refresh wizard, verify new price appears immediately

**Expected Result**:
- ✅ Plans load dynamically from `useServicePlans()` hook
- ✅ Plans display: name, price, duration, perks (first 3)
- ✅ Loading spinner shows while fetching
- ✅ Price changes propagate from admin to wizard
- ✅ Only PAYG plans shown (subscription plans filtered out)

**Pass Criteria**: Wizard shows database-driven pricing, updates in real-time

**Regression Check**:
- ✅ Vehicle selection still works (if customer has vehicles)
- ✅ Specialist toggle still works
- ✅ "Launch Session" button navigates to `/intake?plan=...`

---

### 4. Login Redirect - Central Routing
**Priority**: P0 - HIGH PRIORITY
**Estimated Time**: 5 minutes

**Test Scenario**:
1. **Test Customer Login**:
   - Visit `/intake` without being logged in
   - Verify redirect to `/login` (NOT `/signup?mode=login`)
   - Login and verify return to `/intake`

2. **Test Video Session Sign Out**:
   - Join a video session as customer
   - Click "Sign Out" button
   - Verify redirect to `/login` (NOT `/signup?mode=login`)

3. **Test Mechanic Sign Out**:
   - Join a session as mechanic
   - Click "Sign Out" button
   - Verify redirect to `/mechanic/login` (NOT `/signup?mode=login`)

**Expected Result**:
- ✅ All redirects use `routeFor.login()` or `routeFor.mechanicLogin()`
- ✅ No `/signup?mode=login` URLs in production code

**Pass Criteria**: All auth redirects work correctly, no deprecated URLs

---

## 🟡 HIGH PRIORITY TESTS

### 5. Notification Click Tracking
**Priority**: P1 - HIGH PRIORITY
**Estimated Time**: 3 minutes

**Test Scenario**:
1. Trigger a notification (e.g., session completed, message received)
2. Open Notification Center (bell icon)
3. Click a notification
4. Check browser console for tracking log

**Expected Log Format**:
```
[NotificationClick] {"notification_id":"abc123","notification_type":"session_completed","clicked_at":"2025-11-04T...","was_unread":true,"payload_keys":["session_id"]}
```

**Expected Result**:
- ✅ Tracking log appears immediately (before navigation)
- ✅ Navigation proceeds even if tracking fails
- ✅ Notification marked as read
- ✅ User navigates to correct page

**Pass Criteria**: Tracking logs visible, navigation not blocked

---

### 6. Stripe Dispute Handling
**Priority**: P1 - HIGH PRIORITY
**Estimated Time**: 5 minutes (manual webhook test)

**Test Scenario**:
1. Using Stripe Dashboard, simulate a `dispute.created` event
2. Check webhook handler processes event
3. Check audit log appears

**Expected Result**:
- ✅ Webhook creates refund record with `chargeback` reason
- ✅ Session/payment flagged for review
- ✅ Audit log: `⚠️  Audit: {dispute_id} | dispute.created | charge:{id} | session:{id} | $X.XX USD`

**Pass Criteria**: Dispute logged, no errors

---

## 🟢 REGRESSION TESTS

### 7. Customer Session Flow (End-to-End)
**Priority**: P2 - REGRESSION CHECK
**Estimated Time**: 15 minutes

**Test Scenario**:
1. Customer logs in
2. Navigates to dashboard
3. Starts session via SessionWizard
4. Selects vehicle (if applicable)
5. Chooses plan (verify dynamic pricing)
6. Selects mechanic type (standard vs specialist)
7. Fills intake form
8. Payment processes
9. Session launches
10. Session completes
11. Refund requested (if needed)

**Pass Criteria**: Full flow works end-to-end without errors

---

### 8. Route Helpers - No Hardcoded Paths
**Priority**: P2 - REGRESSION CHECK
**Estimated Time**: 5 minutes

**Test Scenario**:
1. Navigate through customer portal:
   - Dashboard → Settings → Privacy Settings
   - Dashboard → Vehicles → Vehicle History
   - Dashboard → Sessions
2. Check browser network tab: Verify all navigation uses `/customer/*` routes correctly

**Expected Result**:
- ✅ All navigation works
- ✅ No 404 errors
- ✅ URLs match `routeFor.*` definitions

**Pass Criteria**: Navigation works, no broken links

---

## 📊 VERIFICATION CHECKLIST

Before marking "SHIP READY", verify:

### Database State
- [ ] `service_plans` table has active plans
- [ ] `refunds` table exists and RLS enabled
- [ ] `stripe_events` table for idempotency exists
- [ ] Phase 3.2 migration applied (repair_jobs, repair_job_updates)

### Code Quality
- [ ] TypeScript compiles without errors: `npm run typecheck`
- [ ] No hardcoded `/signup?mode=login` in src/ (except dev utils)
- [ ] All payment routes use `apiRouteFor.*`
- [ ] All UI routes use `routeFor.*`

### Audit Logs
- [ ] Refund events log to console with format: `✓ Audit: ...`
- [ ] Dispute events log to console with format: `⚠️  Audit: ...`
- [ ] Notification clicks log to console with format: `[NotificationClick] ...`

### Feature Flags
- [ ] `subscriptions` feature flag exists (off by default)
- [ ] SessionWizard filters subscription plans when flag is off

---

## 🚨 KNOWN ISSUES (Non-Blocking)

### Deferred Route Fixes
**Impact**: Low
**Files**: ~15 customer-facing navigation links still hardcoded
**Location**: `docs/ROUTE_FIXES_BATCH.md`
**Decision**: Fix incrementally post-ship (non-critical paths)

### No Analytics Endpoint
**Impact**: Low
**Status**: Notification tracking uses console logs
**Future**: Upgrade to POST /api/analytics/notification-click
**Workaround**: Console logs are searchable in production

---

## 📝 SMOKE TEST EXECUTION LOG

**Tester**: _________________
**Date**: _________________
**Build**: _________________

| # | Test Scenario | Pass/Fail | Notes |
|---|--------------|-----------|-------|
| 1 | Refund System - Full Flow | ⬜ | |
| 2 | Stripe Webhook - Idempotency | ⬜ | |
| 3 | SessionWizard - Dynamic Pricing | ⬜ | |
| 4 | Login Redirect - Central Routing | ⬜ | |
| 5 | Notification Click Tracking | ⬜ | |
| 6 | Stripe Dispute Handling | ⬜ | |
| 7 | Customer Session Flow (E2E) | ⬜ | |
| 8 | Route Helpers - No Hardcoded Paths | ⬜ | |

**Overall Status**: ⬜ PASS / ⬜ FAIL
**Ship Ready**: ⬜ YES / ⬜ NO

**Blocker Issues**:
- _None_ or _List critical issues here_

**Sign-Off**: _________________
**Date**: _________________
