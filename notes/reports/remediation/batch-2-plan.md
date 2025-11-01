# Batch 2 Remediation Plan: Mechanic Surface
**P0 → P1 → P2 Prioritized Roadmap**

**Date:** 2025-11-01
**Batch:** 2 of 6
**Surface:** Mechanic
**Status:** 📋 PLAN ONLY (NO CODE CHANGES YET)
**Auditor Reference:** [batch-2.md](../batches/batch-2.md)

---

## Executive Summary

**Scope:** Fix 3 P0 critical issues, 16 P1 high-priority issues, and 3 P2 polish issues across 101 mechanic files.

**Primary Problems:**
- ❌ **P0:** Mock data hardcoded in production session page (broken functionality)
- ❌ **P0:** Wrong table queries (`diagnostic_sessions` vs `sessions`) - 12 occurrences across 4 files
- ⚠️ **P1:** Hardcoded pricing/fees in 10+ locations (not fixed by Batch 3 which focused on workshop)
- ⚠️ **P1:** Schema drift (2 UI fields don't exist in database)
- ⚠️ **P1:** Type safety issues (`any` types, missing interfaces)

**Estimated Effort:** 2-3 days (P0: 4 hours, P1: 1-2 days, P2: 4 hours)

**SQL Required:** YES (Phase 2 P1 - schema drift fix, optional)

---

## Phase Breakdown

| Phase | Priority | Effort | Risk | Blocking? |
|-------|----------|--------|------|-----------|
| Phase 1 (P0) | **Critical** | 4 hours | 🟡 Medium | YES |
| Phase 2 (P1) | **High** | 1-2 days | 🟢 Low | NO |
| Phase 3 (P2) | **Nice-to-have** | 4 hours | 🟢 Low | NO |

---

## PHASE 1: P0 Critical Fixes (4 hours)

**Goal:** Fix broken functionality that prevents production use

### P0-1: Remove Mock Data from Session Page

**Issue:** `src/app/mechanic/session/[id]/page.tsx` uses hardcoded MOCK_SESSIONS instead of API

**File:** `src/app/mechanic/session/[id]/page.tsx`
**Lines:** 13-32 (MOCK_SESSIONS + MOCK_EXTENSIONS)

**Problem:**
```typescript
// ❌ CURRENT: Hardcoded mock data
const MOCK_SESSIONS: Record<string, SessionQueueItem> = {
  'queue-1': {
    id: 'queue-1',
    vehicle: '2020 Audi Q5',
    customerName: 'Brandon Lee',
    // ... hardcoded values
  }
}

const session = useMemo(() => MOCK_SESSIONS[params.id], [params.id])
```

**Fix:**
```typescript
// ✅ PROPOSED: Fetch from API
const [session, setSession] = useState<SessionQueueItem | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  fetch(`/api/mechanic/sessions/${params.id}`)
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error)
      setSession(data.session)
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false))
}, [params.id])
```

**API Endpoint:** `GET /api/mechanic/sessions/[sessionId]/route.ts` already exists ✅

**Testing:**
1. Navigate to `/mechanic/session/[id]` with valid session ID
2. Verify real session data loads (not mock data)
3. Verify error handling for invalid session IDs
4. Check loading states display correctly

**Estimate:** 1 hour

---

### P0-2: Fix Wrong Table Queries (diagnostic_sessions → sessions)

**Issue:** 12 queries use wrong table name `diagnostic_sessions` instead of `sessions`

**Affected Files (4 total):**

#### 1. `src/app/api/mechanic/escalate-session/route.ts`
**Lines:** 65, 72, 87, 275

**Changes:**
```typescript
// Line 65
- .from('diagnostic_sessions')
+ .from('sessions')

// Line 72 (FK reference)
- session:session_requests!diagnostic_sessions_session_id_fkey (
+ session:session_requests!sessions_session_id_fkey (

// Line 87 (FK reference)
- customer:profiles!diagnostic_sessions_customer_id_fkey (
+ customer:profiles!sessions_customer_id_fkey (

// Line 275
- .from('diagnostic_sessions')
+ .from('sessions')
```

#### 2. `src/app/api/mechanic/clock/route.ts`
**Lines:** 142, 150

**Changes:**
```typescript
// Line 142
- .from('diagnostic_sessions')
+ .from('sessions')

// Line 150
- .from('diagnostic_sessions')
+ .from('sessions')
```

#### 3. `src/app/api/mechanic/sessions/complete/route.ts`
**Lines:** 72, 114, 199

**Changes:**
```typescript
// Line 72
- .from('diagnostic_sessions')
+ .from('sessions')

// Line 114
- .from('diagnostic_sessions')
+ .from('sessions')

// Line 199
- .from('diagnostic_sessions')
+ .from('sessions')
```

#### 4. `src/app/api/mechanic/sessions/[sessionId]/route.ts`
**Lines:** 29, 43, 56

**Changes:**
```typescript
// Line 29
- .from('diagnostic_sessions')
+ .from('sessions')

// Line 43 (FK reference)
- session:session_requests!diagnostic_sessions_session_id_fkey (
+ session:session_requests!sessions_session_id_fkey (

// Line 56 (FK reference)
- customer:profiles!diagnostic_sessions_customer_id_fkey (
+ customer:profiles!sessions_customer_id_fkey (
```

**Database Verification Required:**
Before making changes, verify:
```sql
-- Check if 'sessions' table exists and has the right structure
SELECT table_name FROM information_schema.tables WHERE table_name IN ('sessions', 'diagnostic_sessions');

-- Check FK constraints
SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name
FROM information_schema.key_column_usage
WHERE constraint_name LIKE '%session%';
```

**Testing:**
1. Test each affected API endpoint after changes
2. Verify data returns correctly from `sessions` table
3. Check FK references resolve properly
4. Confirm no TypeScript errors

**Estimate:** 2 hours (includes DB verification)

---

### P0 Testing Matrix

| Test Case | Endpoint/Page | Expected Result | Verification |
|-----------|---------------|-----------------|--------------|
| Load session page | `/mechanic/session/[id]` | Real data loads (not mock) | Check API call in network tab |
| Invalid session ID | `/mechanic/session/999` | 404 or error message | Error handling works |
| Escalate session | `POST /api/mechanic/escalate-session` | Session escalated successfully | Data saved to correct table |
| Clock in/out | `POST /api/mechanic/clock` | Clock status updated | Session queries work |
| Complete session | `POST /api/mechanic/sessions/complete` | Session marked complete | Data in `sessions` table |
| Get session details | `GET /api/mechanic/sessions/[id]` | Session data returned | Correct table queried |

**Phase 1 Estimate:** 4 hours total (1 hour mock data + 2 hours table fixes + 1 hour testing)

**Phase 1 Risks:**
- 🟡 **Medium Risk:** FK constraint names may differ - need to verify actual constraint names in DB
- 🟡 **Medium Risk:** `sessions` table may have different column names than expected
- 🟢 **Low Risk:** API shape changes (should be minimal, just table name)

---

## PHASE 2: P1 High-Priority Fixes (1-2 days)

**Goal:** Centralize pricing/fees, fix schema drift, improve type safety

### P1-1: Centralize Hardcoded Pricing/Fees

**Issue:** 10+ locations have hardcoded pricing values not using centralized config

**Files with Hardcoded Values:**

#### Group A: Plan Pricing (2 files)
| File | Line | Hardcoded Value | Fix |
|------|------|----------------|-----|
| `mechanic/sessions/page.tsx` | 37-41 | `PLAN_PRICING = {chat10: 999, video15: 2999, diagnostic: 4999}` | Use API to fetch from `service_plans` table |

**Note:** `api/mechanic/dashboard/stats/route.ts` also had PLAN_PRICING but this is server-side and may need to stay or use shared pricing service.

#### Group B: Commission Rates (6 files)
| File | Line | Hardcoded Value | Fix |
|------|------|----------------|-----|
| `mechanic/analytics/page.tsx` | 200 | "Your Earnings (85%)" | Use `WORKSHOP_PRICING.PLATFORM_COMMISSION_RATE` |
| `mechanic/statements/page.tsx` | 221 | "Your Earnings (85%)" | Use `WORKSHOP_PRICING.PLATFORM_COMMISSION_RATE` |
| `mechanic/statements/page.tsx` | 252 | "Platform Fees (15% on virtual)" | Use `WORKSHOP_PRICING.PLATFORM_COMMISSION_RATE` |
| `mechanic/earnings/page.tsx` | 201, 411 | "After 15% platform fee" | Use `WORKSHOP_PRICING.PLATFORM_COMMISSION_RATE` |
| `mechanic/sessions/page.tsx` | 43 | `MECHANIC_SHARE = 0.7` (70%) | **Different rate!** Verify if this is correct |
| `mechanic/onboarding/stripe/page.tsx` | 176 | "You earn 70% of each session price" | Use calculated mechanic share |

#### Group C: Referral Fee (1 file)
| File | Line | Hardcoded Value | Fix |
|------|------|----------------|-----|
| `mechanic/session/[id]/complete/page.tsx` | 264, 281 | "5% referral fee" | Add `referral_fee` to `WORKSHOP_PRICING` or fetch from `platform_settings` |

**Implementation Options:**

**Option A: Extend WORKSHOP_PRICING config (Recommended)**
```typescript
// src/config/workshopPricing.ts
export const WORKSHOP_PRICING = {
  // ... existing
  PLATFORM_COMMISSION_RATE: 15.0,
  REFERRAL_FEE_RATE: 5.0, // NEW

  // For display calculations
  getMechanicShare(): number {
    return 100 - this.PLATFORM_COMMISSION_RATE // 85%
  },

  getReferralFeeRate(): number {
    return this.REFERRAL_FEE_RATE
  }
}
```

**Option B: Fetch from database**
```sql
-- Add to migrations if needed
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS referral_fee_rate DECIMAL(5,2) DEFAULT 5.00;
```

**Recommended Approach:** Option A (extend config) - simpler, no DB migration needed

**Changes Required:**

1. **Extend config** - Add referral fee to `WORKSHOP_PRICING`
2. **Update mechanic UI files** - Replace hardcoded percentages with config values
3. **Update mechanic/sessions/page.tsx** - Investigate 70% rate (different from 85% elsewhere)

**Special Note on 70% Rate:**
- Most places use 85% mechanic share (100% - 15% platform fee)
- `mechanic/sessions/page.tsx` and `mechanic/onboarding/stripe/page.tsx` use 70%
- **ACTION REQUIRED:** Verify with stakeholder which is correct, or if this is workshop-specific

**Testing:**
1. Check all pages display correct percentages from config
2. Verify calculations are correct (earnings = revenue * mechanic_share_rate)
3. Test with different config values to ensure dynamic updates work

**Estimate:** 6 hours (2 hours config + 3 hours UI updates + 1 hour testing)

---

### P1-2: Fix Schema Drift (about_me, hourly_rate)

**Issue:** 2 UI fields don't exist in database

**Files Affected:**
- `src/app/mechanic/profile/MechanicProfileClient.tsx` (lines 39, 53, 272-273, 304-305)
- `src/app/mechanic/profile/page.tsx` (lines 110, 124 - with comments about missing fields)

**Current Code:**
```typescript
// src/app/mechanic/profile/page.tsx
about_me: '', // Field doesn't exist in DB - provide empty default
hourly_rate: 0, // Field doesn't exist in DB - provide zero default
```

**Option A: Add Fields to Database (Recommended)**

**SQL Migration:**
```sql
-- supabase/migrations/batch-2/01_add_mechanic_profile_fields_up.sql

-- Add about_me and hourly_rate to mechanics table
ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS about_me TEXT,
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8,2);

COMMENT ON COLUMN mechanics.about_me IS 'Mechanic bio/about me text displayed on profile';
COMMENT ON COLUMN mechanics.hourly_rate IS 'Hourly rate for physical services (optional, for workshop mechanics)';

-- Create index for future queries
CREATE INDEX IF NOT EXISTS idx_mechanics_hourly_rate ON mechanics(hourly_rate) WHERE hourly_rate IS NOT NULL;
```

**Rollback:**
```sql
-- supabase/migrations/batch-2/02_add_mechanic_profile_fields_down.sql

ALTER TABLE mechanics DROP COLUMN IF EXISTS about_me;
ALTER TABLE mechanics DROP COLUMN IF EXISTS hourly_rate;
DROP INDEX IF EXISTS idx_mechanics_hourly_rate;
```

**Verification:**
```sql
-- supabase/migrations/batch-2/03_verify_mechanic_profile_fields.sql

DO $$
BEGIN
  -- Check about_me exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='mechanics' AND column_name='about_me'
  ) THEN
    RAISE EXCEPTION 'about_me column missing from mechanics table';
  END IF;

  -- Check hourly_rate exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='mechanics' AND column_name='hourly_rate'
  ) THEN
    RAISE EXCEPTION 'hourly_rate column missing from mechanics table';
  END IF;

  RAISE NOTICE 'All mechanic profile fields verified successfully';
END $$;
```

**Code Changes After Migration:**
```typescript
// src/app/mechanic/profile/page.tsx
- about_me: '', // Field doesn't exist in DB - provide empty default
+ about_me: mechanicData.about_me || '',

- hourly_rate: 0, // Field doesn't exist in DB - provide zero default
+ hourly_rate: mechanicData.hourly_rate || 0,
```

**Option B: Remove Fields from UI**

If stakeholder decides these fields aren't needed:
```typescript
// Remove from MechanicProfileClient.tsx interface (lines 39, 53)
// Remove from UI form (lines 272-273, 304-305)
// Remove from page.tsx default values (lines 110, 124)
```

**Recommended:** Option A (add to database) - UI already built, just needs DB support

**Testing:**
1. Run migration on dev database
2. Test profile save with about_me and hourly_rate values
3. Verify data persists correctly
4. Test profile load displays saved values
5. Test empty/null values handle gracefully

**Estimate:** 3 hours (1 hour SQL + 1 hour code changes + 1 hour testing)

---

### P1-3: Improve Type Safety

**Issue:** Multiple files use `any` types and missing interfaces

**Files with Type Issues:**
1. `mechanic/crm/page.tsx:117` - Uses `any` for payload
2. `components/mechanic/OnShiftToggle.tsx:14` - `useState<any>`
3. `api/mechanic/dashboard/stats/route.ts:100` - `(session.profiles as any)`

**Fixes:**

#### Fix 1: CRM Payload Types
```typescript
// src/types/crm.ts (NEW FILE)
export interface CRMCustomer {
  id: string
  full_name: string
  email: string
  phone?: string
  created_at: string
  last_session_at?: string
  total_sessions: number
  lifetime_value: number
}

export interface CRMPayload {
  customers: CRMCustomer[]
  stats: {
    total_customers: number
    active_this_month: number
    repeat_customers: number
  }
}
```

```typescript
// mechanic/crm/page.tsx:117
- setCustomers((data as any).customers)
+ const payload = data as CRMPayload
+ setCustomers(payload.customers)
```

#### Fix 2: Clock Status Types
```typescript
// components/mechanic/OnShiftToggle.tsx
interface ClockStatus {
  isOnShift: boolean
  clockedInAt: string | null
  lastClockOut: string | null
}

- const [clockStatus, setClockStatus] = useState<any>(null)
+ const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null)
```

#### Fix 3: Supabase Type Generation
```typescript
// api/mechanic/dashboard/stats/route.ts:100
- customer_name: (session.profiles as any)?.full_name || 'Customer'
+ customer_name: (session.profiles as { full_name?: string })?.full_name || 'Customer'

// OR regenerate Supabase types:
// npm run supabase:types
```

**Testing:**
1. TypeScript compilation passes (`npm run typecheck`)
2. No new type errors introduced
3. IDE autocomplete works correctly

**Estimate:** 2 hours

---

### P1-4: Standardize ID Fields (Optional)

**Issue:** Inconsistent use of `mechanic_id` vs `mechanic_user_id`

**Affected Files:**
- `mechanic/dashboard/page.tsx` (lines 68, 130)
- Various API routes

**Investigation Required:**
```sql
-- Check which tables use which column name
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name LIKE '%mechanic%id%'
ORDER BY table_name;
```

**Decision Needed:** Verify with DB schema which is canonical
- If `mechanic_id` is canonical → rename all `mechanic_user_id` references
- If `mechanic_user_id` is canonical → rename all `mechanic_id` references
- If both exist for different purposes → document the distinction

**Recommendation:** Defer to Phase 3 (P2) - this is cleanup, not broken functionality

**Estimate:** 4 hours (if pursued)

---

### P1 Testing Matrix

| Test Case | Files Affected | Expected Result | Verification |
|-----------|----------------|-----------------|--------------|
| Display platform fee | analytics, statements, earnings pages | Shows "15%" from config | Visual check + code inspection |
| Calculate mechanic share | All earning pages | Uses `1 - platformFeeRate` | Math check in calculations |
| Display referral fee | session complete page | Shows "5%" from config | Visual check |
| Save profile with about_me | mechanic/profile | Data saved to DB | DB query confirms |
| Save profile with hourly_rate | mechanic/profile | Data saved to DB | DB query confirms |
| Load profile | mechanic/profile | about_me and hourly_rate display | Values match DB |
| Type safety | TypeScript compilation | No type errors | `npm run typecheck` |

**Phase 2 Estimate:** 1-2 days (6 hours pricing + 3 hours schema + 2 hours types + 2 hours testing)

**Phase 2 Risks:**
- 🟢 **Low Risk:** Config changes - well understood pattern from Batch 3
- 🟡 **Medium Risk:** SQL migration - need to test rollback path
- 🟢 **Low Risk:** Type safety - straightforward interface additions

---

## PHASE 3: P2 Polish Fixes (4 hours)

**Goal:** UI cleanup and minor improvements

### P2-1: Fix CSS Class Error

**File:** `mechanic/onboarding/virtual-only/page.tsx:283`
**Issue:** Invalid `bg-slate-700` in dark theme context

**Fix:**
```typescript
// Line 283
- className="bg-slate-700 ..."
+ className="bg-slate-800 ..." // or appropriate dark theme class
```

**Estimate:** 15 minutes

---

### P2-2: Deduplicate Availability Toggle

**File:** `mechanic/dashboard/virtual/page.tsx:176`
**Issue:** Duplicates `OnShiftToggle` component logic

**Fix:**
```typescript
// Replace inline toggle with component
- <div className="availability-toggle-inline">...</div>
+ <OnShiftToggle />
```

**Estimate:** 30 minutes

---

### P2-3: Business Logic Warning (Optional)

**File:** `components/mechanic/MechanicActiveSessionsManager.tsx:74-75`
**Issue:** Logs error when multiple sessions exist (should be enforced at DB level)

**Current:**
```typescript
if (activeSessions.length > 1) {
  console.error('[ACTIVE SESSIONS] Multiple active sessions detected:', activeSessions)
}
```

**Recommendation:** Add DB constraint
```sql
-- Enforce one active session per mechanic
CREATE UNIQUE INDEX idx_one_active_session_per_mechanic
ON sessions (mechanic_id)
WHERE status IN ('live', 'in_progress');
```

**Alternative:** Keep as warning-only (current state is acceptable for P2)

**Estimate:** 1 hour (if DB constraint added), 0 hours (if skipped)

---

### P2 Testing Matrix

| Test Case | File | Expected Result | Verification |
|-----------|------|-----------------|--------------|
| Dark theme rendering | onboarding/virtual-only | No CSS errors | Visual check |
| Availability toggle | dashboard/virtual | Uses shared component | Code inspection |
| Multiple sessions | ActiveSessionsManager | Warning logged (optional: DB enforces) | Test with multiple sessions |

**Phase 3 Estimate:** 2-3 hours (CSS + toggle deduplication + optional DB constraint)

**Phase 3 Risks:**
- 🟢 **Low Risk:** All P2 changes are cosmetic or optional

---

## SQL Requirements Summary

### Required Migrations

**Phase 2 P1-2 Only (Optional but Recommended):**

```
supabase/migrations/batch-2/
├── 01_add_mechanic_profile_fields_up.sql      # Add about_me, hourly_rate to mechanics
├── 02_add_mechanic_profile_fields_down.sql    # Rollback migration
└── 03_verify_mechanic_profile_fields.sql      # Verification queries
```

**Exact Schema Changes:**
```sql
-- Add 2 columns to mechanics table
ALTER TABLE mechanics ADD COLUMN about_me TEXT;
ALTER TABLE mechanics ADD COLUMN hourly_rate DECIMAL(8,2);

-- No FK changes
-- No new tables
-- No data migrations
```

### Optional Migrations

**Phase 3 P2-3 (Business Logic Enforcement):**

```sql
-- Enforce one active session per mechanic
CREATE UNIQUE INDEX idx_one_active_session_per_mechanic
ON sessions (mechanic_id)
WHERE status IN ('live', 'in_progress');
```

**Impact:** Prevents multiple active sessions at DB level (currently only warned in UI)

---

## Database Introspection Commands

**Before starting Phase 1 P0-2:**
```sql
-- 1. Verify tables exist
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name IN ('sessions', 'diagnostic_sessions', 'mechanics', 'session_reviews')
ORDER BY table_name;

-- 2. Check sessions table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;

-- 3. Check FK constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name LIKE '%session%' OR ccu.table_name LIKE '%session%')
ORDER BY tc.table_name, tc.constraint_name;

-- 4. Check mechanic_id vs mechanic_user_id usage
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name LIKE '%mechanic%id%'
ORDER BY table_name, column_name;
```

**Before starting Phase 2 P1-2:**
```sql
-- Verify mechanics table exists and check current columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'mechanics'
ORDER BY ordinal_position;

-- Check if about_me or hourly_rate already exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'mechanics'
  AND column_name IN ('about_me', 'hourly_rate');
```

---

## Test Plan

### Smoke Tests (All Phases)

**Critical Paths:**
1. **Mechanic Login** → Dashboard loads with stats
2. **Session Flow** → Accept request → Complete session → Earnings updated
3. **Profile Management** → Edit profile → Save changes → Changes persist
4. **Earnings View** → View earnings → Correct percentages displayed
5. **Session Details** → View session → Real data displays (not mock)

**Regression Tests:**
1. All existing mechanic API endpoints still work
2. No TypeScript compilation errors
3. No console errors on mechanic pages
4. Database queries return correct data

### Test Data Setup

```sql
-- Create test mechanic
INSERT INTO mechanics (user_id, name, email, service_tier, stripe_connected)
VALUES ('test-user-123', 'Test Mechanic', 'test@example.com', 'virtual_only', true);

-- Create test session
INSERT INTO sessions (id, mechanic_id, customer_id, status, type, plan, started_at)
VALUES ('test-session-456', 'test-mechanic-id', 'test-customer-id', 'live', 'video', 'video15', NOW());

-- Create test review
INSERT INTO session_reviews (session_id, mechanic_id, customer_user_id, rating, comment)
VALUES ('test-session-456', 'test-mechanic-id', 'test-customer-id', 5, 'Great service!');
```

### Manual Test Scenarios

#### Scenario 1: Session Page (P0-1)
1. Navigate to `/mechanic/session/test-session-456`
2. **Expected:** Real session data displays (not "2020 Audi Q5" mock data)
3. **Verify:** API call to `/api/mechanic/sessions/test-session-456` in network tab
4. **Verify:** Customer name, vehicle, concern all match DB data

#### Scenario 2: Wrong Table Fix (P0-2)
1. Call `GET /api/mechanic/sessions/test-session-456`
2. **Expected:** Session data returned successfully
3. **Verify:** No "table doesn't exist" errors
4. **Verify:** Data matches sessions table
5. Test escalate, clock, complete endpoints similarly

#### Scenario 3: Hardcoded Pricing (P1-1)
1. Navigate to `/mechanic/analytics`
2. **Expected:** "Your Earnings (85%)" text dynamically generated from config
3. Change `WORKSHOP_PRICING.PLATFORM_COMMISSION_RATE` to 12%
4. **Expected:** Text updates to "Your Earnings (88%)"
5. Test similar for statements, earnings pages

#### Scenario 4: Schema Drift (P1-2)
1. Navigate to `/mechanic/profile`
2. Edit "About Me" field, enter text
3. Edit "Hourly Rate" field, enter 75.00
4. Save profile
5. **Expected:** Success message
6. Refresh page
7. **Expected:** Values still display (persisted to DB)
8. Check DB: `SELECT about_me, hourly_rate FROM mechanics WHERE id = 'test-mechanic-id'`
9. **Expected:** Values match UI

#### Scenario 5: Type Safety (P1-3)
1. Run `npm run typecheck`
2. **Expected:** 0 new type errors (pre-existing errors OK)
3. Open mechanic files in IDE
4. **Expected:** Autocomplete works for ClockStatus, CRMPayload interfaces

---

## Rollback Plan

### Phase 1 (P0) Rollback

**If P0-1 (mock data) breaks:**
```bash
# Revert specific file
git checkout HEAD~1 -- src/app/mechanic/session/[id]/page.tsx

# Or revert entire commit
git revert <commit-hash>
```

**If P0-2 (table queries) breaks:**
```bash
# Revert all 4 files
git checkout HEAD~1 -- src/app/api/mechanic/escalate-session/route.ts
git checkout HEAD~1 -- src/app/api/mechanic/clock/route.ts
git checkout HEAD~1 -- src/app/api/mechanic/sessions/complete/route.ts
git checkout HEAD~1 -- src/app/api/mechanic/sessions/[sessionId]/route.ts

npm run typecheck
npm run build
```

**Impact:** Pages will be broken again (mock data) or queries will fail (wrong table)

---

### Phase 2 (P1) Rollback

**If P1-1 (pricing) breaks:**
```bash
# Revert config changes and all UI files
git revert <commit-hash>

# Or selective revert
git checkout HEAD~1 -- src/config/workshopPricing.ts
git checkout HEAD~1 -- src/app/mechanic/analytics/page.tsx
git checkout HEAD~1 -- src/app/mechanic/statements/page.tsx
git checkout HEAD~1 -- src/app/mechanic/earnings/page.tsx
git checkout HEAD~1 -- src/app/mechanic/sessions/page.tsx
git checkout HEAD~1 -- src/app/mechanic/onboarding/stripe/page.tsx
git checkout HEAD~1 -- src/app/mechanic/session/[id]/complete/page.tsx
```

**If P1-2 (schema drift) breaks:**
```sql
-- Rollback SQL migration
psql $DATABASE_URL -f supabase/migrations/batch-2/02_add_mechanic_profile_fields_down.sql
```

```bash
# Revert code changes
git checkout HEAD~1 -- src/app/mechanic/profile/MechanicProfileClient.tsx
git checkout HEAD~1 -- src/app/mechanic/profile/page.tsx
```

**Impact:** Hardcoded values return, about_me/hourly_rate can't be saved to DB

---

### Phase 3 (P2) Rollback

**If P2 changes break:**
```bash
# P2 changes are cosmetic, safe to revert individually
git checkout HEAD~1 -- src/app/mechanic/onboarding/virtual-only/page.tsx
git checkout HEAD~1 -- src/app/mechanic/dashboard/virtual/page.tsx
```

**If P2-3 DB constraint breaks:**
```sql
-- Remove constraint
DROP INDEX IF EXISTS idx_one_active_session_per_mechanic;
```

**Impact:** Minor UI issues, no functional impact

---

## Risk Assessment

### High Risk Items
- ❌ **None** (all changes are low-medium risk)

### Medium Risk Items
- 🟡 **P0-2 Table Queries:** FK constraint names may differ from assumptions
  - **Mitigation:** Run introspection first, verify actual FK names
  - **Fallback:** Keep old table name if new one doesn't exist

- 🟡 **P1-2 SQL Migration:** Adding columns could fail if they already exist
  - **Mitigation:** Use `IF NOT EXISTS` in SQL
  - **Fallback:** Skip migration if columns exist, update code only

### Low Risk Items
- 🟢 **P0-1 Mock Data:** Safe replacement with API call
- 🟢 **P1-1 Pricing Config:** Well-tested pattern from Batch 3
- 🟢 **P1-3 Type Safety:** Pure TypeScript changes, no runtime impact
- 🟢 **P2 All:** Cosmetic changes only

---

## Verification Report Template

**After each phase, create:**

```
notes/reports/remediation/
├── batch-2-verification-Phase1.md  # P0 fixes
├── batch-2-verification-Phase2.md  # P1 fixes
└── batch-2-verification-Phase3.md  # P2 fixes
```

**Required Content:**
1. ✅ Changes made (files + line numbers)
2. ✅ Test matrix with results
3. ✅ TypeScript compilation status
4. ✅ API contract verification (request/response unchanged)
5. ✅ Database queries tested (if applicable)
6. ✅ Screenshots/logs (if relevant)
7. ✅ Known issues (if any)

---

## Commit Message Format

**Phase 1 (P0):**
```
fix(mechanic): Phase 1 P0 — remove mock data + fix table queries (critical)

- Replace MOCK_SESSIONS with API call in session page
- Fix 12 wrong table queries (diagnostic_sessions → sessions)
- Files: session/[id]/page.tsx, escalate-session, clock, sessions/complete, sessions/[id]

Fixes:
- P0-1: Mock data removed from production session page
- P0-2: All queries now use correct 'sessions' table

Verification: notes/reports/remediation/batch-2-verification-Phase1.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Phase 2 (P1):**
```
fix(mechanic): Phase 2 P1 — centralize pricing + fix schema drift

- Remove 10+ hardcoded pricing/fee values
- Add about_me, hourly_rate to mechanics table
- Improve type safety (ClockStatus, CRMPayload interfaces)

Changes:
- P1-1: Extended WORKSHOP_PRICING config with referral fee
- P1-2: SQL migration adds profile fields
- P1-3: Type interfaces for CRM and clock status

Verification: notes/reports/remediation/batch-2-verification-Phase2.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Phase 3 (P2):**
```
fix(mechanic): Phase 3 P2 — UI polish + cleanup

- Fix CSS class error in onboarding
- Deduplicate availability toggle component
- Optional: DB constraint for one active session

Changes:
- P2-1: Fixed bg-slate-700 → bg-slate-800
- P2-2: Replaced inline toggle with OnShiftToggle component
- P2-3: Added unique index for active sessions

Verification: notes/reports/remediation/batch-2-verification-Phase3.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Estimates Summary

| Phase | Priority | Tasks | Estimated Time | Complexity |
|-------|----------|-------|----------------|------------|
| **Phase 1 (P0)** | Critical | 2 fixes (mock data + table queries) | **4 hours** | 🟡 Medium |
| **Phase 2 (P1)** | High | 3 fixes (pricing + schema + types) | **1-2 days** (14-16 hours) | 🟡 Medium |
| **Phase 3 (P2)** | Nice-to-have | 3 polish items | **2-3 hours** | 🟢 Low |
| **TOTAL** | | **8 fixes** | **2-3 days** (20-23 hours) | |

**Breakdown by Task:**
- P0-1 Mock Data: 1 hour
- P0-2 Table Queries: 2 hours + 1 hour DB verification
- P1-1 Pricing: 6 hours (config + UI updates + testing)
- P1-2 Schema Drift: 3 hours (SQL + code + testing)
- P1-3 Type Safety: 2 hours
- P2 All: 2-3 hours

**Critical Path:** Phase 1 → Phase 2 → Phase 3
**Blocking:** Only Phase 1 is blocking (broken functionality)

---

## Success Criteria

### Phase 1 (P0) Complete When:
- ✅ Session page loads real data from API (no mock data)
- ✅ All 4 affected API files query `sessions` table (not `diagnostic_sessions`)
- ✅ All API endpoints return data successfully
- ✅ No TypeScript errors introduced
- ✅ Verification report published

### Phase 2 (P1) Complete When:
- ✅ 0 hardcoded pricing/fee values remain in mechanic files
- ✅ `about_me` and `hourly_rate` save to database correctly
- ✅ Type interfaces added for CRM and clock status
- ✅ `npm run typecheck` passes
- ✅ All mechanic pages display correct percentages from config
- ✅ Verification report published

### Phase 3 (P2) Complete When:
- ✅ CSS errors fixed in onboarding
- ✅ Availability toggle uses shared component
- ✅ Optional: DB constraint enforces one active session
- ✅ Verification report published

### Batch 2 Complete When:
- ✅ All 3 phases complete
- ✅ All tests pass
- ✅ No regressions detected
- ✅ Documentation updated
- ✅ User approval received

---

## Next Steps

**After Plan Approval:**
1. ✅ Review plan with stakeholder
2. ✅ Verify DB introspection outputs
3. ✅ Get approval for 70% vs 85% mechanic share question
4. ✅ Decide on Option A vs B for schema drift (add fields vs remove UI)
5. ✅ Get SQL migration approval
6. 🚀 Execute Phase 1 (P0)
7. 📝 Create verification report
8. 🚀 Execute Phase 2 (P1)
9. 📝 Create verification report
10. 🚀 Execute Phase 3 (P2)
11. 📝 Create verification report
12. ✅ Mark Batch 2 complete

---

**BATCH 2 PLAN COMPLETE — AWAITING APPROVAL**

**No code changes made yet. Ready to execute on approval.**
