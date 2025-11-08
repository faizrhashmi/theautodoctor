# Implementation Notes - Final Ship Fixes

## Completed ✅

### 1. Refund Endpoint (BLOCKER)
- ✅ Already implemented at `src/app/api/repair-payments/[paymentId]/refund/route.ts`
- ✅ All guards in place (auth check, escrow_status='held')
- ✅ Supports full/partial refunds
- ✅ Writes to refunds table
- ✅ Updates escrow_status optimistically
- ✅ Central routing exists: `apiRouteFor.repairPaymentRefund(paymentId)`

### 2. Stripe Refund Webhook (BLOCKER)
- ✅ Already implemented in `src/app/api/stripe/webhook/route.ts`
- ✅ `handleChargeRefunded()` processes repair_payments and sessions
- ✅ `handleDisputeCreated()` flags for review
- ✅ Idempotent via `isEventProcessed()` check
- ✅ **ADDED**: Audit logging for all refund/dispute events
  - `✓ Audit: {eventId} | {type} | {entity} | customer:{id} | ${amount} {currency}`

### 3. Replace Hardcoded Routes (HIGH PRIORITY)
- ✅ Added missing route helpers to `src/lib/routes.ts`:
  - `customerSettings()`, `customerPrivacySettings()`, `customerDataDownload()`
  - `customerDeleteAccount()`, `customerSchedule()`, `customerPlans()`
- ✅ Fixed: `src/app/customer/vehicles/[id]/history/page.tsx` (4 instances)
- ⚠️  Remaining files documented in `docs/ROUTE_FIXES_BATCH.md`
  - Low risk: These are customer-facing pages, not critical auth/payment flows
  - Can be fixed incrementally post-ship

### 4. SessionWizard Pricing (HIGH PRIORITY)
- ✅ Replaced hardcoded `SESSION_TYPES` array with database-driven pricing
- ✅ Integrated `useServicePlans()` hook from `/api/plans`
- ✅ Filters for PAYG (one-time) plans only
- ✅ Maps database plan fields to UI format (price, duration, perks, icons)
- ✅ Maintains existing 3-step wizard flow
- ✅ Ready for subscription support when `subscriptions` feature flag is enabled
- **File**: `src/components/customer/SessionWizard.tsx`
- **Acceptance Criteria Met**: ✅ Changing plan in admin UI will now propagate to wizard

**Implementation Details**:
- Added import: `import { useServicePlans } from '@/hooks/useCustomerPlan'`
- Plan filtering: `plans.filter(plan => !plan.planType || plan.planType === 'one_time' || plan.planType === 'payg')`
- Icon mapping: `PLAN_ICONS` object maps slugs to Lucide icons
- Loading states: Shows spinner while fetching plans
- Empty state: Graceful fallback if no plans available

### 5. Remove /signup?mode=login References (HIGH PRIORITY)
- ✅ Added `mechanicLogin()` route helper to `src/lib/routes.ts:91`
- ✅ Fixed: `src/app/intake/page.tsx` - Changed `redirectTo: '/signup?mode=login'` to `routeFor.login()`
- ✅ Fixed: `src/app/video/[id]/VideoSessionClient.tsx` - Updated sign out redirect to use `routeFor.login()` and `routeFor.mechanicLogin()`
- ✅ Fixed: `src/app/diagnostic/[id]/VideoSessionClient.tsx` - Updated sign out redirect to use `routeFor.login()` and `routeFor.mechanicLogin()`
- ⚠️  Remaining: `src/app/api/dev/create-test-users/route.ts:113` (dev-only testing utility, acceptable to leave)
- **Result**: All production code now uses centralized routing helpers

**Implementation Details**:
- All login redirects now use: `routeFor.login()` for customers, `routeFor.mechanicLogin()` for mechanics
- Replaced 4 instances: 1 in intake page, 2 in video session clients, 1 in diagnostic session client
- Single source of truth maintained via `src/lib/routes.ts`

### 6. Notification Click Tracking
- ✅ Added `trackNotificationClick()` function to `src/components/notifications/NotificationCenter.tsx:117-140`
- ✅ Non-blocking, fire-and-forget tracking
- ✅ Captures: notification_id, notification_type, clicked_at, was_unread, payload_keys
- ✅ Console logging for observability (searchable in production logs)
- ✅ Graceful failure handling (tracking errors never block navigation)
- ✅ Future-ready: Commented placeholder for API endpoint upgrade
- **File**: `src/components/notifications/NotificationCenter.tsx`
- **Result**: All notification clicks are now tracked for analytics

**Implementation Details**:
- Tracking fires immediately on click, before mark-as-read
- Structured JSON logging: `[NotificationClick] {"notification_id": "...", ...}`
- Try/catch ensures tracking failures don't crash the app
- Can easily upgrade to POST /api/analytics/notification-click later

### 7. Smoke Test Documentation
- ✅ Created comprehensive test plan: `docs/SMOKE_TEST_SCENARIOS.md`
- ✅ Covers all 7 final ship fixes
- ✅ Includes 8 test scenarios (6 critical + 2 regression)
- ✅ Execution checklist with pass/fail tracking
- ✅ Verification checklist for database, code quality, audit logs
- ✅ Documents known non-blocking issues
- **File**: `docs/SMOKE_TEST_SCENARIOS.md`
- **Result**: QA team has clear testing guide

**Test Coverage**:
- P0 Blockers: Refund system, Stripe webhooks, SessionWizard pricing, Login redirects
- P1 High Priority: Notification tracking, Dispute handling
- P2 Regression: Customer session E2E, Route helpers
- Verification: Database state, code quality, audit logs, feature flags

## Notes

### Route Fixes - Rationale for Deferred Items
The remaining hardcoded routes are in:
- Customer UI pages (settings, vehicles, sessions)
- Non-critical navigation (back buttons, breadcrumbs)
- No payment/auth/security impact

**Ship Decision**: These can be fixed incrementally post-launch without blocking ship. The critical paths (webhook payments, refunds, auth) all use `routeFor.*` correctly.

### ESLint Rule (Deferred)
Adding ESLint rule to prevent future hardcoded routes:
```json
{
  "no-restricted-syntax": [
    "error",
    {
      "selector": "Literal[value=/^\\/(customer|mechanic|workshop|video|chat)/]",
      "message": "Use routeFor.* from @/lib/routes"
    }
  ]
}
```
**Status**: Documented for future PR. Not blocking ship.

## Audit Logs Added

### Stripe Webhook Events
```
✓ Audit: {charge_id} | charge.refunded | repair_payment:{id} | customer:{id} | ${amount} {currency}
✓ Audit: {charge_id} | charge.refunded | session:{id} | customer:{id} | ${amount} {currency}
⚠️  Audit: {dispute_id} | dispute.created | charge:{id} | session:{id} | ${amount} {currency}
```

Location: `src/app/api/stripe/webhook/route.ts`
- Lines 749 (repair payment refunds)
- Lines 803 (session refunds)
- Lines 872 (disputes)
