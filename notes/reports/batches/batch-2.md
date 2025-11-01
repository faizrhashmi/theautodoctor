# Batch 2 Audit Report: Mechanic Surface

**Batch:** 2 of 6
**Surface:** Mechanic
**Status:** ✅ COMPLETE
**Date:** 2025-11-01
**Auditor:** Lead Auditor (READ-ONLY)

---

## Executive Summary

**Scope:** 101 files (26 pages, 27 components, 48 API routes)
**Coverage:** 101/101 files audited (100%)
**Overall Health:** 🟡 GOOD (78/100) - Functional but needs centralization
**Critical Issues:** 3 P0, 16 P1, 3 P2

**Key Findings:**
- ✅ Strong authentication pattern across all routes
- ✅ Good API contract consistency
- ✅ Effective real-time subscription handling
- ⚠️ **P0:** Wrong table queries (`diagnostic_sessions` vs `sessions`)
- ⚠️ **P0:** Mock data in production session page
- ⚠️ **P1:** Hardcoded pricing/fees in 10+ locations
- ⚠️ **P1:** Schema drift (UI fields missing from DB)

---

## Coverage Proof (101/101 Files)

### Pages (26/26) ✅

- [x] `src/app/mechanic/analytics/page.tsx` - **ISSUE P1**: Hardcoded 85% commission
- [x] `src/app/mechanic/availability/page.tsx`
- [x] `src/app/mechanic/crm/page.tsx` - **ISSUE P1**: Uses `any` type
- [x] `src/app/mechanic/dashboard/page.tsx` - **ISSUE P1**: mechanic_id vs mechanic_user_id
- [x] `src/app/mechanic/dashboard/virtual/page.tsx` - **ISSUE P2**: UI duplication
- [x] `src/app/mechanic/documents/page.tsx`
- [x] `src/app/mechanic/earnings/page.tsx`
- [x] `src/app/mechanic/job-recording/page.tsx`
- [x] `src/app/mechanic/login/page.tsx`
- [x] `src/app/mechanic/onboarding/service-tier/page.tsx`
- [x] `src/app/mechanic/onboarding/stripe/complete/page.tsx`
- [x] `src/app/mechanic/onboarding/stripe/page.tsx` - **ISSUE P1**: Hardcoded 70% share
- [x] `src/app/mechanic/onboarding/virtual-only/page.tsx` - **ISSUE P2**: CSS class error
- [x] `src/app/mechanic/partnerships/applications/page.tsx`
- [x] `src/app/mechanic/partnerships/apply/[programId]/page.tsx`
- [x] `src/app/mechanic/partnerships/browse/page.tsx`
- [x] `src/app/mechanic/profile/page.tsx` - **ISSUE P1**: Schema drift (about_me, hourly_rate)
- [x] `src/app/mechanic/reviews/page.tsx`
- [x] `src/app/mechanic/session/[id]/complete/page.tsx` - **ISSUE P1**: Hardcoded 5% referral
- [x] `src/app/mechanic/session/[id]/page.tsx` - **ISSUE P0**: MOCK_SESSIONS hardcoded
- [x] `src/app/mechanic/sessions/page.tsx` - **ISSUE P1**: Hardcoded pricing + commission
- [x] `src/app/mechanic/sessions/virtual/page.tsx`
- [x] `src/app/mechanic/signup/[inviteCode]/page.tsx`
- [x] `src/app/mechanic/signup/page.tsx`
- [x] `src/app/mechanic/signup/success/page.tsx`
- [x] `src/app/mechanic/statements/page.tsx`

### Components (27/27) ✅

- [x] `src/components/mechanic/AvailabilityCalendar.tsx`
- [x] `src/components/mechanic/BrandSelector.tsx`
- [x] `src/components/mechanic/EarningsBreakdown.tsx` - **ISSUE P1**: Hardcoded 15% fee
- [x] `src/components/mechanic/EmergencyHelpPanel.tsx`
- [x] `src/components/mechanic/EnhancedRequestDetailModal.tsx`
- [x] `src/components/mechanic/FilesBrowser.tsx`
- [x] `src/components/mechanic/FileSharePanel.tsx`
- [x] `src/components/mechanic/LocationSelector.tsx`
- [x] `src/components/mechanic/MechanicActiveSessionsManager.tsx` - **ISSUE P2**: Business logic warning
- [x] `src/components/mechanic/MechanicFooter.tsx`
- [x] `src/components/mechanic/MechanicPresenceIndicator.tsx`
- [x] `src/components/mechanic/MechanicSidebar.tsx`
- [x] `src/components/mechanic/OnShiftToggle.tsx` - **ISSUE P1**: Uses `any` type
- [x] `src/components/mechanic/ProfileCompletionBanner.tsx`
- [x] `src/components/mechanic/ProfilePanel.tsx`
- [x] `src/components/mechanic/RequestDetailModal.tsx`
- [x] `src/components/mechanic/RequestPreviewModal.tsx`
- [x] `src/components/mechanic/ReviewForm.tsx`
- [x] `src/components/mechanic/ReviewList.tsx`
- [x] `src/components/mechanic/ServiceKeywordsSelector.tsx`
- [x] `src/components/mechanic/SessionExtensionPanel.tsx`
- [x] `src/components/mechanic/SessionFileList.tsx`
- [x] `src/components/mechanic/SessionFileManager.tsx`
- [x] `src/components/mechanic/sessionFilesHelpers.ts`
- [x] `src/components/mechanic/SessionTimer.tsx`
- [x] `src/components/mechanic/SINCollectionModal.tsx`
- [x] `src/components/mechanic/VirtualSessionCard.tsx`

### API Routes (48/48) ✅

- [x] `src/app/api/mechanic/accept/route.ts`
- [x] `src/app/api/mechanic/active-sessions/route.ts`
- [x] `src/app/api/mechanic/availability/route.ts`
- [x] `src/app/api/mechanic/clear-stuck-requests/route.ts`
- [x] `src/app/api/mechanic/clock/route.ts`
- [x] `src/app/api/mechanic/collect-sin/route.ts`
- [x] `src/app/api/mechanic/dashboard/stats/route.ts` - **ISSUE P1**: Hardcoded pricing + status mismatch
- [x] `src/app/api/mechanic/documents/[id]/route.ts`
- [x] `src/app/api/mechanic/documents/route.ts`
- [x] `src/app/api/mechanic/earnings/route.ts` - **ISSUE P0**: Wrong table query
- [x] `src/app/api/mechanic/escalate-session/route.ts`
- [x] `src/app/api/mechanic/force-end-all/route.ts`
- [x] `src/app/api/mechanic/login/route.ts`
- [x] `src/app/api/mechanic/logout/route.ts`
- [x] `src/app/api/mechanic/profile/[mechanicId]/route.ts`
- [x] `src/app/api/mechanic/reviews/route.ts`
- [x] `src/app/api/mechanic/sessions/[sessionId]/route.ts`
- [x] `src/app/api/mechanic/sessions/complete/route.ts`
- [x] `src/app/api/mechanic/sessions/history/route.ts`
- [x] `src/app/api/mechanic/signup/draft/route.ts`
- [x] `src/app/api/mechanic/signup/route.ts`
- [x] `src/app/api/mechanic/time-off/[id]/route.ts`
- [x] `src/app/api/mechanic/time-off/route.ts`
- [x] `src/app/api/mechanic/upload-document/route.ts`
- [x] `src/app/api/mechanic/workshop-signup/route.ts`
- [x] `src/app/api/mechanics/[mechanicId]/profile/route.ts`
- [x] `src/app/api/mechanics/[mechanicId]/profile-completion/route.ts`
- [x] `src/app/api/mechanics/analytics/route.ts` - **ISSUE P0**: Wrong table + **ISSUE P1**: Hardcoded 85%
- [x] `src/app/api/mechanics/availability/route.ts`
- [x] `src/app/api/mechanics/available-count/route.ts`
- [x] `src/app/api/mechanics/bay-bookings/route.ts`
- [x] `src/app/api/mechanics/clients/[clientId]/route.ts`
- [x] `src/app/api/mechanics/clients/route.ts`
- [x] `src/app/api/mechanics/dashboard/stats/route.ts`
- [x] `src/app/api/mechanics/earnings/route.ts` - **ISSUE P1**: Hardcoded 15% fee
- [x] `src/app/api/mechanics/jobs/route.ts`
- [x] `src/app/api/mechanics/me/route.ts`
- [x] `src/app/api/mechanics/onboarding/service-tier/route.ts`
- [x] `src/app/api/mechanics/onboarding/virtual-only/route.ts`
- [x] `src/app/api/mechanics/partnerships/applications/route.ts`
- [x] `src/app/api/mechanics/partnerships/programs/route.ts`
- [x] `src/app/api/mechanics/requests/[id]/accept/route.ts`
- [x] `src/app/api/mechanics/requests/[id]/cancel/route.ts`
- [x] `src/app/api/mechanics/requests/history/route.ts`
- [x] `src/app/api/mechanics/requests/route.ts`
- [x] `src/app/api/mechanics/sessions/virtual/route.ts`
- [x] `src/app/api/mechanics/statements/route.ts`
- [x] `src/app/api/mechanics/stripe/onboard/route.ts`

---

## Detailed Findings

### P0 Issues (Critical) - 3 Issues

| # | File | Line | Issue | Root Cause | Fix |
|---|------|------|-------|------------|-----|
| 1 | `api/mechanic/earnings/route.ts` | 71 | Wrong table query | Queries `diagnostic_sessions` instead of `sessions` | Change to `.from('sessions')` |
| 2 | `api/mechanics/analytics/route.ts` | 50 | Wrong table query | Queries `diagnostic_sessions` instead of `sessions` | Change to `.from('sessions')` |
| 3 | `mechanic/session/[id]/page.tsx` | 13-28 | Mock data in production | MOCK_SESSIONS array hardcoded | Remove mock, connect to `/api/mechanic/sessions/[sessionId]` |

**Impact:** P0 issues will cause incorrect data returns or broken functionality. Must fix before production.

---

### P1 Issues (Type/Schema) - 16 Issues

| # | File | Line | Issue | Root Cause | Fix |
|---|------|------|-------|------------|-----|
| 1 | `mechanic/analytics/page.tsx` | 200 | Hardcoded commission | `85%` virtual earnings in UI | Fetch from `platform_settings` table |
| 2 | `mechanic/dashboard/page.tsx` | 68, 130 | ID field inconsistency | Uses `mechanic_id` vs `mechanic_user_id` | Standardize to `mechanic_id` across DB |
| 3 | `api/mechanic/dashboard/stats/route.ts` | 68-73 | Hardcoded pricing | PLAN_PRICING object embedded | Fetch from `service_plans` table |
| 4 | `api/mechanic/earnings/route.ts` | 101 | Hardcoded platform fee | `15%` fee hardcoded | Fetch from `platform_settings.platform_fee` |
| 5 | `api/mechanics/analytics/route.ts` | 58, 92 | Hardcoded commission | `85%` virtual earnings | Use `1 - platform_fee` |
| 6 | `mechanic/sessions/page.tsx` | 37-44 | Hardcoded pricing | PLAN_PRICING duplicated | Centralize pricing service |
| 7 | `mechanic/sessions/page.tsx` | 43 | Hardcoded mechanic share | `MECHANIC_SHARE = 0.7` | Fetch from `platform_settings` |
| 8 | `mechanic/profile/page.tsx` | 110, 124 | Schema drift | `about_me` and `hourly_rate` don't exist in DB | Add fields to `mechanics` table OR remove from UI |
| 9 | `components/mechanic/EarningsBreakdown.tsx` | 190 | Hardcoded platform fee | `15%` in UI text | Fetch from API |
| 10 | `mechanic/onboarding/stripe/page.tsx` | 176 | Hardcoded commission | `70%` mechanic share in text | Fetch from settings |
| 11 | `mechanic/session/[id]/complete/page.tsx` | 264 | Hardcoded referral fee | `5%` referral fee in text | Fetch from `platform_settings.referral_fee` |
| 12 | `api/mechanic/dashboard/stats/route.ts` | 29-32 | Session status mismatch | Uses `pending`, `waiting`, `scheduled` | Verify against SessionStatus enum |
| 13 | `mechanic/crm/page.tsx` | 117 | Type safety | Uses `any` for payload | Create typed interface |
| 14 | `components/mechanic/OnShiftToggle.tsx` | 14 | Type safety | `useState<any>` | Create ClockStatus interface |
| 15 | `api/mechanic/dashboard/stats/route.ts` | 100 | Type assertion | `(session.profiles as any)` | Fix Supabase type generation |
| 16 | `mechanic/analytics/page.tsx` | (implied) | Missing API fields | UI doesn't use `growth` and `clients` from API | Add to interface or remove from API |

**Impact:** P1 issues create maintenance burden and risk of data inconsistency. Should fix in short-term.

---

### P2 Issues (Polish) - 3 Issues

| # | File | Line | Issue | Root Cause | Fix |
|---|------|------|-------|------------|-----|
| 1 | `mechanic/onboarding/virtual-only/page.tsx` | 283 | CSS class error | Invalid `bg-slate-700` in dark theme | Review dark mode classes |
| 2 | `mechanic/dashboard/virtual/page.tsx` | 176 | UI duplication | Availability toggle duplicates OnShiftToggle | Use OnShiftToggle component |
| 3 | `components/mechanic/MechanicActiveSessionsManager.tsx` | 74-75 | Business logic warning | Logs error when multiple sessions exist | Should enforce at DB level with constraint |

**Impact:** P2 issues are minor and don't affect functionality. Can address in future sprints.

---

## Schema Drift Table

| TypeScript Field | Database Field | Status | Action Required |
|------------------|----------------|--------|-----------------|
| `about_me` | ❌ Missing | **DRIFT** | Add to `mechanics` table OR remove from UI |
| `hourly_rate` | ❌ Missing | **DRIFT** | Add to `mechanics` table OR remove from UI |
| `mechanic_id` | ✅ Exists (some tables) | **INCONSISTENT** | Standardize: `mechanic_id` vs `mechanic_user_id` |
| `diagnostic_sessions` table | ⚠️ Deprecated? | **WRONG TABLE** | Should use unified `sessions` table |
| SessionStatus enum | ✅ Exists | **VERIFY** | Check if `scheduled` is valid status |

---

## Endpoint Contract Matrix

| Endpoint | UI Consumer | Fields Expected | Fields Returned | Status |
|----------|-------------|-----------------|-----------------|--------|
| `GET /api/mechanic/dashboard/stats` | `mechanic/dashboard/page.tsx` | pending_sessions, active_quotes, approved_today, revenue_this_month, total_completed_sessions, recent_sessions | ✅ All fields present | ✅ VALID |
| `GET /api/mechanics/earnings` | `mechanic/earnings/page.tsx` | period, date_range, summary, by_session_type, daily_earnings, session_details | ✅ All fields present | ✅ VALID |
| `GET /api/mechanics/analytics` | `mechanic/analytics/page.tsx` | period, totalJobs, totalRevenue, virtualJobs, sessionTypes, dailyData | ✅ Core fields present, ⚠️ growth & clients unused | ⚠️ PARTIAL |
| `GET /api/mechanics/me` | `mechanic/dashboard/virtual/page.tsx` | id, user_id, name, email, stripeConnected, service_tier | ✅ All fields present | ✅ VALID |
| `GET /api/mechanic/active-sessions` | `components/mechanic/MechanicActiveSessionsManager.tsx` | sessions array with id, status, customer info | ✅ All fields present | ✅ VALID |
| `GET /api/mechanic/sessions/[sessionId]` | `mechanic/session/[id]/page.tsx` | ❌ **NOT CONNECTED** - Uses MOCK_SESSIONS | N/A | ❌ BROKEN |

**Summary:** 5/6 endpoints have valid contracts. 1 endpoint not connected (uses mock data).

---

## Hardcoded Values Audit

### Pricing (Should be from `service_plans` table)

**PLAN_PRICING - Duplicated 2 times:**
```typescript
// api/mechanic/dashboard/stats/route.ts:68-73
const PLAN_PRICING: Record<string, number> = {
  'chat10': 999,
  'video15': 2999,
  'diagnostic': 4999,
}

// mechanic/sessions/page.tsx:37-41
const PLAN_PRICING: Record<string, number> = {
  chat10: 999,
  video15: 2999,
  diagnostic: 4999,
}
```

### Commission Rates (Should be from `platform_settings` table)

**Platform Fee - Hardcoded 4 times:**
- `api/mechanic/earnings/route.ts:101` - `platformFeeRate = 0.15`
- `api/mechanics/analytics/route.ts:58, 92` - `virtualRevenue * 0.85`
- `components/mechanic/EarningsBreakdown.tsx:190` - "Platform fee: 15%"
- `mechanic/analytics/page.tsx:200` - "Your Earnings (85%)"

**Mechanic Share - Hardcoded 3 times:**
- `api/mechanic/dashboard/stats/route.ts:68` - `MECHANIC_SHARE = 0.7`
- `mechanic/sessions/page.tsx:43` - `MECHANIC_SHARE = 0.7`
- `mechanic/onboarding/stripe/page.tsx:176` - "You earn 70%"

**Referral Fee - Hardcoded 1 time:**
- `mechanic/session/[id]/complete/page.tsx:264` - "5% referral fee"

**Recommendation:** Create centralized pricing/fees service:
```typescript
// src/lib/pricing.ts
export async function getPlatformSettings() {
  return supabaseAdmin.from('platform_settings').select('*').single()
}

export async function getPlanPricing() {
  return supabaseAdmin.from('service_plans').select('*')
}
```

---

## Real-Time Updates Analysis

### Supabase Subscriptions ✅ GOOD

**Dashboard (mechanic/dashboard/page.tsx:376-456):**
```typescript
✅ Subscribes to: sessions, session_requests, repair_quotes
✅ Subscribes to: broadcast channel for instant updates
✅ Refetches on window focus
✅ Proper cleanup on unmount
```

**ActiveSessionsManager (MechanicActiveSessionsManager.tsx:28-64):**
```typescript
✅ Subscribes to session status updates
✅ Removes ended sessions from UI automatically
✅ Filters by session IDs for efficiency
```

**OnShiftToggle (OnShiftToggle.tsx:20-23):**
```typescript
✅ Polls clock status every 30 seconds
⚠️ Could use real-time subscription instead of polling
```

---

## Authentication Pattern ✅ EXCELLENT

All mechanic pages use consistent 3-step auth:
1. ✅ Verify Supabase session exists
2. ✅ Verify `profiles.role = 'mechanic'`
3. ✅ Fetch mechanic profile from `mechanics` table

All API routes use:
```typescript
✅ requireMechanicAPI(req) guard
✅ Returns structured error responses
✅ Validates mechanic ownership for resources
```

**No security gaps found.**

---

## Manual QA Steps

### Test Scenario 1: Dashboard Stats Display
1. Navigate to `/mechanic/dashboard`
2. **Expected:** Dashboard loads with stats (pending sessions, revenue, completed sessions)
3. **Verify:** No console errors, all numbers display correctly
4. **Watch for:** Hardcoded pricing in revenue calculations (P1 issue)

### Test Scenario 2: Earnings Report
1. Navigate to `/mechanic/earnings`
2. Select period (week/month)
3. **Expected:** Earnings breakdown with platform fee deducted
4. **Verify:** Platform fee = 15% (hardcoded, P1 issue)
5. **Watch for:** Wrong table query may cause missing sessions (P0 issue)

### Test Scenario 3: Session Details
1. Navigate to `/mechanic/session/[id]`
2. **Expected:** Real session data displays
3. **Verify:** Currently shows MOCK_SESSIONS (P0 issue - broken)
4. **Action:** Check if page connects to API or uses mock data

### Test Scenario 4: Profile Edit
1. Navigate to `/mechanic/profile`
2. Try editing profile
3. **Watch for:** `about_me` and `hourly_rate` fields (P1 issue - don't exist in DB)
4. **Expected:** May cause save errors

### Test Scenario 5: Analytics Page
1. Navigate to `/mechanic/analytics`
2. **Expected:** Charts and metrics display
3. **Verify:** Virtual earnings show "85%" (hardcoded, P1 issue)
4. **Watch for:** Wrong table query may cause missing data (P0 issue)

---

## Comparison to Batch 1 (Customer Surface)

| Metric | Batch 1 (Customer) | Batch 2 (Mechanic) | Delta |
|--------|-------------------|--------------------|-------|
| **Files Audited** | 72 | 101 | +29 |
| **P0 Issues** | 0 | 3 | +3 ⚠️ |
| **P1 Issues** | 2 | 16 | +14 ⚠️ |
| **P2 Issues** | 3 | 3 | 0 |
| **Health Score** | 🟢 92/100 (Excellent) | 🟡 78/100 (Good) | -14 points |
| **Auth Pattern** | ✅ Strong | ✅ Strong | Equal |
| **Real-time** | ✅ Good | ✅ Good | Equal |
| **Hardcoded Values** | Few | Many (10+ locations) | Worse |
| **Schema Drift** | None | 2 fields + 1 table | Worse |

**Analysis:** Mechanic surface has more technical debt than Customer surface. Primary issues are centralization (pricing/fees) and wrong table queries.

---

## Recommendations by Priority

### Immediate (P0) - Fix This Week

1. **Fix Wrong Table Queries:**
   ```typescript
   // api/mechanic/earnings/route.ts:71
   - .from('diagnostic_sessions')
   + .from('sessions')

   // api/mechanics/analytics/route.ts:50
   - .from('diagnostic_sessions')
   + .from('sessions')
   ```

2. **Remove Mock Data:**
   ```typescript
   // mechanic/session/[id]/page.tsx:13-28
   - const MOCK_SESSIONS = [...]
   + // Connect to /api/mechanic/sessions/[sessionId]
   ```

### Short-term (P1) - Fix This Sprint

1. **Create Centralized Pricing Service:**
   - Add `platform_settings` table with `platform_fee`, `mechanic_share`, `referral_fee`
   - Create `src/lib/fees.ts` with `getPlatformSettings()`
   - Replace all 10+ hardcoded instances

2. **Fix Schema Drift:**
   - Option A: Add `about_me` and `hourly_rate` to `mechanics` table
   - Option B: Remove from UI if not needed

3. **Standardize ID Fields:**
   - Audit: `mechanics`, `sessions`, `availability`, `earnings` tables
   - Create migration to standardize on `mechanic_id`

4. **Improve Type Safety:**
   - Create `ClockStatus` interface for OnShiftToggle
   - Create typed payload interfaces for CRM
   - Fix Supabase type generation

### Long-term (P2) - Future Sprint

1. **UI Consistency:** Consolidate availability toggle logic
2. **Real-time Optimization:** Replace polling with subscriptions in OnShiftToggle
3. **Business Logic:** Add DB constraint to prevent multiple active sessions

---

## Overall Assessment

**Grade: 🟡 GOOD (78/100)**

**Strengths:**
- ✅ Excellent authentication pattern
- ✅ Strong API contract consistency
- ✅ Good real-time subscription handling
- ✅ Clear separation of concerns

**Weaknesses:**
- ⚠️ Wrong table queries (P0 blocker)
- ⚠️ Mock data in production (P0 blocker)
- ⚠️ Significant hardcoded pricing/fees (10+ locations)
- ⚠️ Schema drift (2 missing DB fields)

**Verdict:** Mechanic surface is functional but has more technical debt than Customer surface. Primary issues are centralization and database query correctness. Recommend addressing P0 issues immediately, then tackling P1 centralization in next sprint.

---

**BATCH 2 AUDIT COMPLETE**
**Next:** Update AuditIndex.md and await approval for Batch 3 (Workshop Surface)
