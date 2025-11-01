# Batch 1 Audit Report - Customer Surface
**Date:** 2025-11-01
**Auditor:** Lead Technical Auditor (READ-ONLY)
**Status:** COMPLETE

---

## Coverage Proof

**Manifests Processed:**
- Customer Pages: 17/17 (100%)
- Customer Components: 22/22 (100%)
- Customer APIs: 33/33 (100%)
- **Total Files Audited:** 72/72

**Manifest Sources:**
- `notes/reports/manifest/pages-customer.txt`
- `notes/reports/manifest/components-customer.txt`
- `notes/reports/manifest/api-customer.txt`

---

## Executive Summary

**Overall Health:** 🟢 **EXCELLENT** (All P0 issues resolved in Phase 0)

The Customer surface is in strong condition following recent Phase 0 fixes. All critical data flows are operational:
- ✅ Credit balance displays correctly
- ✅ Plan features fully accessible with type safety
- ✅ Session status strictly typed (no `| string` drift)
- ✅ Active sessions display with real-time updates
- ✅ All API ↔ UI contracts aligned

**Critical Findings:** 0 P0 issues
**Type/Schema Issues:** 2 P1 items
**Minor Issues:** 3 P2 items

---

## Findings Table

| # | Surface | Path:Line(s) | Expected vs Actual (fields/ids) | Root Cause | Minimal Fix | Priority | Risk to Existing |
|---|---------|--------------|----------------------------------|------------|-------------|----------|------------------|
| 1 | Customer API | `api/customer/sessions/route.ts:63-71` | Expects: Dynamic prices from `service_plans` table<br>Actual: Hardcoded `priceMap` object | Technical debt - prices duplicated in code | Join sessions with `service_plans` table: `.select('sessions.*, service_plans!sessions_plan_fkey(price)')` | **P1** | Low - only affects history display |
| 2 | Customer API | `api/customer/active-sessions/route.ts:27,57-82` | Expects: Consistent field naming<br>Actual: `mechanic_id` (DB) → manual transform → `mechanicName` (UI) | Case conversion at API layer | Standardize to snake_case in DB + camelCase adapter layer; OR use generated types with naming convention | **P1** | Low - transform working |
| 3 | Customer API | Multiple session APIs | Expects: Consistent default for null mechanic names<br>Actual: Mixed defaults ('Waiting for assignment', 'Mechanic', 'Pending Assignment') | Inconsistent null handling | Create constant `MECHANIC_PENDING = 'Mechanic Pending'` in shared constants; use everywhere | **P2** | None - cosmetic |
| 4 | Customer Page | `app/customer/vehicles/page.tsx:46-51` | Expects: Use `/api/customer/vehicles` route<br>Actual: Direct Supabase client query | Bypasses API auth layer | Route exists at `api/customer/vehicles/route.ts` - use it instead of direct client | **P2** | Low - both methods secure |
| 5 | Shared | Multiple tables | Expects: Single foreign key name for mechanics<br>Actual: Both `mechanic_id` AND `mechanic_user_id` in different tables | Schema evolution - columns added over time | Audit all tables; migrate to single convention (`mechanic_id` preferred); update all queries | **P1** | Medium - affects joins |

---

## Schema Drift Table

| Entity | UI/Type Expects | API Returns | DB/Migration Says | Drift? | Fix |
|--------|-----------------|-------------|-------------------|--------|-----|
| **service_plans** | `planCategory`, `features`, `routingPreference`, `restrictedBrands`, `requiresCertification` | ✅ All fields present (fixed Phase 0) | ✅ Migration `20251027000000` has all columns | ✅ NO DRIFT | None needed |
| **customer_subscriptions** | `current_credits`, `total_allocated`, `credits_used`, `plan_name`, `next_billing_date` | ✅ All fields present (fixed Phase 0) | ✅ Migration `20251202000001` has all columns | ✅ NO DRIFT | None needed |
| **sessions** | `status: SessionStatus` (strict enum) | ✅ Strict typing (fixed Phase 0) | ✅ Status values match enum | ✅ NO DRIFT | None needed |
| **sessions** | `plan: string` with actual price from service_plans | ❌ Hardcoded priceMap in sessions API | ✅ DB has `plan` as slug; `service_plans` has price | ⚠️ **MINOR DRIFT** | Add JOIN to service_plans in sessions API |
| **mechanics** | `mechanic_id` consistently | ❌ Mix of `mechanic_id` and `mechanic_user_id` | ⚠️ Different tables use different names | ⚠️ **NAMING DRIFT** | Standardize all tables to `mechanic_id` |

---

## Endpoint Contract Matrix

| Endpoint | UI Reads | Route Select/Transform | Missing/Wrong | Fix |
|----------|----------|------------------------|---------------|-----|
| **GET /api/customer/dashboard/stats** | `total_services`, `total_spent`, `active_warranties`, `pending_quotes`, `has_used_free_session`, `account_type`, `is_b2c_customer`, `subscription{...}` | ✅ Returns all expected fields (lines 199-211) | ✅ NONE | None |
| **GET /api/customer/active-sessions** | `id`, `plan`, `planLabel`, `type`, `status`, `createdAt`, `startedAt`, `mechanicName` | ✅ Returns all (lines 57-88) with transform | ⚠️ Transform: `mechanic_id` → `mechanicName` | Document or remove transform |
| **GET /api/customer/analytics** | `monthlySpending[]`, `serviceDistribution[]`, `mechanicRatings[]`, `vehicleStats`, `summary{}` | ✅ Returns all (lines 130-146) | ✅ NONE | None |
| **GET /api/customer/sessions** | `Session[]` with `price`, `type`, `status`, `mechanic_name`, `created_at` | ⚠️ Returns with **hardcoded** price (line 63) | ⚠️ Price not from DB | JOIN service_plans table |
| **GET /api/customer/quotes** | `Quote` with `id`, `status`, `total_cost`, `provider_name`, `valid_until` | ✅ Returns all (lines 52-69) | ✅ NONE | None |
| **GET /api/customer/profile** | `full_name`, `email`, `phone`, `city` | ✅ Returns exact fields (lines 36-43) | ✅ NONE | None |
| **GET /api/customer/subscriptions** | `subscription`, `plan{name, credit_allocation}`, `current_credits`, `status` | ✅ Returns with nested plan (lines 21-31) | ✅ NONE | None |
| **GET /api/plans** | `planType`, `billingCycle`, `creditAllocation`, `planCategory`, `features`, `routingPreference`, `restrictedBrands` | ✅ All fields added Phase 0 (lines 43-56) | ✅ NONE | None |

---

## Mobile/UX Blockers That Hide Data

**NONE FOUND** - All data visible on mobile viewports.

Verified:
- ✅ Credit balance widget responsive (lines 469-557: `sm:` breakpoints)
- ✅ SessionLauncher mobile-friendly (flex wrapping, responsive text)
- ✅ Active sessions card responsive (grid adapts `grid-cols-1 sm:grid-cols-2`)
- ✅ Dashboard stats responsive (proper breakpoints throughout)

---

## Manual QA Steps

### Test 1: Credit Balance Display
**URL:** `http://localhost:3000/customer/dashboard`
**Role:** Customer with active subscription
**Expected:**
1. Blue credit widget appears below active sessions (if any)
2. Large number shows current credits
3. Progress bar animates based on usage
4. Next renewal date displays at bottom

**Verification:**
- Widget at lines 469-557 in dashboard page
- API endpoint: `/api/customer/dashboard/stats` line 208

---

### Test 2: Plan Features Visibility
**URL:** `http://localhost:3000/customer/dashboard` → Click "Start Session"
**Role:** Customer (any account type)
**Expected:**
1. All plans show with descriptions
2. Feature flags work (premium tiers show specialist options)
3. Credit costs display if subscription active
4. Routing preferences respected for specialists

**Verification:**
- SessionLauncher component lines 395-461
- API endpoint: `/api/plans` returns all fields (lines 21-57)

---

### Test 3: Active Sessions Real-Time Updates
**URL:** `http://localhost:3000/customer/dashboard`
**Role:** Customer with active session
**Expected:**
1. Green active session card appears
2. Progress tracker shows current step
3. "Return to Session" button works
4. If mechanic completes session elsewhere, card disappears automatically

**Verification:**
- ActiveSessionsManager lines 29-89 (Supabase channel subscription)
- Real-time filter: `id=in.(${sessionIds.join(',')})` line 43

---

### Test 4: Session History Pricing
**URL:** `http://localhost:3000/customer/sessions`
**Role:** Customer with completed sessions
**Expected:**
1. Past sessions show prices
2. ⚠️ **KNOWN ISSUE**: Prices are hardcoded, not from service_plans
3. If admin changes pricing, history won't reflect new prices

**Verification:**
- Sessions API line 63-71 (hardcoded priceMap)
- **P1 FIX NEEDED**: Join service_plans table

---

### Test 5: Vehicles Page (Direct DB Access)
**URL:** `http://localhost:3000/customer/vehicles`
**Role:** Customer with saved vehicles
**Expected:**
1. Vehicles list displays
2. ⚠️ **MINOR**: Page uses direct Supabase client instead of API route

**Verification:**
- Page lines 46-51 (direct client query)
- API route exists but unused: `api/customer/vehicles/route.ts`
- **P2 FIX OPTIONAL**: Route through API for consistency

---

## Phase 0 Verification (Recent Fixes)

### ✅ Fix #1: Plans API Data Loss - VERIFIED
**Files:** `api/plans/route.ts`, `hooks/useCustomerPlan.ts`
**Status:** ALL FIELDS PRESENT
**Verification:**
- `planType` ✅ Line 45
- `billingCycle` ✅ Line 46
- `creditAllocation` ✅ Line 47
- `planCategory` ✅ Line 50
- `features` ✅ Line 51 (JSONB object)
- `routingPreference` ✅ Line 54
- `restrictedBrands` ✅ Line 55
- `requiresCertification` ✅ Line 56

**Impact:** Feature flags now functional. `hasFeature()` returns correct values.

---

### ✅ Fix #2: Credit Balance Display - VERIFIED
**Files:** `api/customer/dashboard/stats/route.ts`, `app/customer/dashboard/page.tsx`
**Status:** WIDGET DISPLAYS CORRECTLY
**Verification:**
- API query lines 122-143 (fetches subscription + plan)
- Transform lines 177-197 (builds subscription object)
- Response line 208 (includes in stats)
- UI widget lines 469-557 (renders if `has_active`)

**Impact:** Users can see credit balance, usage %, next billing date.

---

### ✅ Fix #3: SessionStatus Type Safety - VERIFIED
**Files:** `types/session.ts`
**Status:** STRICT TYPING ENFORCED
**Verification:**
- NO `| string` union ✅ (removed from line 45)
- Type guard `isValidSessionStatus()` ✅ (line 140)
- Parser `parseSessionStatus()` ✅ (line 157)
- Assertion `assertValidSessionStatus()` ✅ (line 178)

**Impact:** Compile-time type checking, exhaustive switch statements work.

---

### ✅ Fix #4: RPC Type Definitions - VERIFIED
**Files:** `types/database-functions.ts` (NEW), `api/customer/analytics/route.ts`
**Status:** FULL TYPE SAFETY
**Verification:**
- Wrapper functions defined ✅ (lines 67-117)
- Analytics API uses typed wrappers ✅ (lines 5-9, 35-38)
- NO `any` types in mapping ✅ (lines 95, 119)

**Impact:** Autocomplete works, compile-time errors for RPC calls.

---

## Recommended Next Steps

### Immediate (This Sprint)
1. **Address P1 Hardcoded Pricing** - Low risk, medium value
   - File: `api/customer/sessions/route.ts`
   - Change: Lines 63-71 → JOIN to service_plans
   - Effort: 30 minutes
   - Test: Session history shows correct prices

2. **Audit mechanic_id Naming** - Medium effort, prevents future bugs
   - Files: All tables with mechanic references
   - Change: Standardize to single convention
   - Effort: 2-3 hours (schema + code updates)
   - Test: All joins work without manual column mapping

### Next Sprint (P2 Items)
3. **Standardize Mechanic Pending Text** - Low effort polish
   - Files: Multiple session APIs
   - Change: Create shared constant
   - Effort: 15 minutes

4. **Route Vehicles Through API** - Consistency improvement
   - File: `app/customer/vehicles/page.tsx`
   - Change: Use existing `/api/customer/vehicles` route
   - Effort: 30 minutes

5. **Document camelCase/snake_case Convention** - Clarity for team
   - File: Create `docs/architecture/naming-conventions.md`
   - Effort: 1 hour

---

## Files Examined (Checklist)

### Pages ✅ (17/17)
- [x] `src/app/customer/complete-profile/page.tsx`
- [x] `src/app/customer/dashboard/page.tsx`
- [x] `src/app/customer/plans/page.tsx`
- [x] `src/app/customer/preferences/page.tsx`
- [x] `src/app/customer/profile/page.tsx`
- [x] `src/app/customer/quotes/[quoteId]/page.tsx`
- [x] `src/app/customer/quotes/page.tsx`
- [x] `src/app/customer/schedule/page.tsx`
- [x] `src/app/customer/sessions/page.tsx`
- [x] `src/app/customer/settings/privacy/delete-account/page.tsx`
- [x] `src/app/customer/settings/privacy/download-data/page.tsx`
- [x] `src/app/customer/settings/privacy/page.tsx`
- [x] `src/app/customer/signup/page.tsx`
- [x] `src/app/customer/specialists/page.tsx`
- [x] `src/app/customer/vehicles/[id]/history/page.tsx`
- [x] `src/app/customer/vehicles/page.tsx`
- [x] `src/app/customer/verify-email/page.tsx`

### Components ✅ (22/22)
- [x] `src/components/customer/ActiveSessionsManager.tsx`
- [x] `src/components/customer/AddToFavorites.tsx`
- [x] `src/components/customer/CustomerNavbar.tsx`
- [x] `src/components/customer/CustomerSidebar.tsx`
- [x] `src/components/customer/dashboard-types.ts`
- [x] `src/components/customer/EnhancedSchedulingCalendar.tsx`
- [x] `src/components/customer/ModernSchedulingCalendar.tsx`
- [x] `src/components/customer/PendingRequestBanner.tsx`
- [x] `src/components/customer/RecommendationsWidget.tsx`
- [x] `src/components/customer/RequestMechanicButton.tsx`
- [x] `src/components/customer/SchedulingCalendar.tsx`
- [x] `src/components/customer/SessionDetailsModal.tsx`
- [x] `src/components/customer/SessionFileList.tsx`
- [x] `src/components/customer/SessionFileManager.tsx`
- [x] `src/components/customer/sessionFilesHelpers.ts`
- [x] `src/components/customer/SessionHistoryCard.tsx`
- [x] `src/components/customer/SessionJoinCard.tsx`
- [x] `src/components/customer/SessionLauncher.tsx`
- [x] `src/components/customer/SessionManagement.tsx`
- [x] `src/components/customer/StuckSessionManager.tsx`
- [x] `src/components/customer/WaiverModal.tsx`
- [x] `src/components/customer/WorkshopDirectory.tsx`

### APIs ✅ (33/33)
- [x] `src/app/api/customer/active-sessions/route.ts`
- [x] `src/app/api/customer/activity/route.ts`
- [x] `src/app/api/customer/analytics/route.ts`
- [x] `src/app/api/customer/bookings/route.ts`
- [x] `src/app/api/customer/clear-plan/route.ts`
- [x] `src/app/api/customer/credits/route.ts`
- [x] `src/app/api/customer/dashboard/stats/route.ts`
- [x] `src/app/api/customer/favorites/[favoriteId]/route.ts`
- [x] `src/app/api/customer/favorites/route.ts`
- [x] `src/app/api/customer/force-cancel-session/route.ts`
- [x] `src/app/api/customer/forgot-password/route.ts`
- [x] `src/app/api/customer/login/route.ts`
- [x] `src/app/api/customer/logout/route.ts`
- [x] `src/app/api/customer/preferences/route.ts`
- [x] `src/app/api/customer/privacy/consents/route.ts`
- [x] `src/app/api/customer/privacy/delete-account/route.ts`
- [x] `src/app/api/customer/privacy/download-data/route.ts`
- [x] `src/app/api/customer/privacy/grant-consent/route.ts`
- [x] `src/app/api/customer/privacy/withdraw-consent/route.ts`
- [x] `src/app/api/customer/profile/route.ts`
- [x] `src/app/api/customer/quotes/route.ts`
- [x] `src/app/api/customer/recommendations/[id]/route.ts`
- [x] `src/app/api/customer/recommendations/route.ts`
- [x] `src/app/api/customer/schedule/route.ts`
- [x] `src/app/api/customer/sessions/[sessionId]/cancel/route.ts`
- [x] `src/app/api/customer/sessions/[sessionId]/rate/route.ts`
- [x] `src/app/api/customer/sessions/[sessionId]/reschedule/route.ts`
- [x] `src/app/api/customer/sessions/[sessionId]/route.ts`
- [x] `src/app/api/customer/sessions/route.ts`
- [x] `src/app/api/customer/signup/route.ts`
- [x] `src/app/api/customer/subscriptions/cancel/route.ts`
- [x] `src/app/api/customer/subscriptions/route.ts`
- [x] `src/app/api/customer/vehicles/route.ts`

---

## Conclusion

**Batch 1 (Customer Surface) Status: EXCELLENT** 🟢

All critical P0 issues resolved in Phase 0. Customer surface is production-ready with only minor optimization opportunities remaining. No data is lost or hidden from users. All watchlist items verified as working correctly.

The remaining P1 issues are technical debt items that can be addressed incrementally without impacting user experience.

**Recommendation:** Proceed to Batch 2 (Mechanic Surface) audit.
