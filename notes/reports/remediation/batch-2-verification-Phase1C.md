# Batch 2 Phase 1C Verification Report
**Fix Repository Column Mapping: plan-based filtering**

---

## Executive Summary

**Status:** ✅ **COMPLETE**
**Priority:** P0 (Critical fix for Phase 1B bug)
**Scope:** Fix repository to use `plan` column instead of non-existent `session_duration_type`
**Approach:** Code-only, no SQL, preserves API contracts
**Files Modified:** 3
**TypeScript Errors:** 0 new errors
**Tests:** 14/14 passing ✅

---

## Problem Discovered in Phase 1B

Phase 1B validation revealed that:
1. `sessions` table does NOT have `session_duration_type` column
2. `sessions` table uses `plan` column with values: `free`, `video15`, `diagnostic`
3. Phase 1B repository queries would fail with SQL error "column does not exist"

**Evidence from ADR:**
- sessions: 48 rows, plan values: free (30), video15 (10), diagnostic (8)
- diagnostic_sessions: 0 rows (empty table)

---

## Solution: Plan-Based Mapping

### Mapping Table

| Plan Value | Session Type | Avg Duration | Category | Usage |
|------------|--------------|--------------|----------|-------|
| `free`     | chat         | 2.8 min      | **MICRO** | Quick text sessions |
| `video15`  | video        | 6.7 min      | **FULL**  | Video diagnostics |
| `diagnostic` | diagnostic | 22.0 min     | **FULL**  | Comprehensive diagnostics |

---

## Changes Made

### 1. Repository Constants

**File:** [src/lib/repos/sessionRepo.ts](src/lib/repos/sessionRepo.ts:23-24)

```typescript
const MICRO_SESSION_PLAN = 'free'
const FULL_SESSION_PLANS = ['video15', 'diagnostic']
```

---

### 2. Query Fix: Micro Sessions

**Before (BROKEN):**
```typescript
.eq('session_duration_type', 'micro')  // ❌ Column doesn't exist
```

**After (FIXED):**
```typescript
.eq('plan', MICRO_SESSION_PLAN)  // ✅ plan = 'free'
```

**Full Query:**
```typescript
const { data: microSessions } = await supabaseAdmin
  .from(tableName)
  .select('id, duration_minutes, plan')
  .eq('mechanic_id', mechanicId)
  .eq('plan', 'free')
  .gte('created_at', shiftStartTime)
  .lte('created_at', shiftEndTime)
```

---

### 3. Query Fix: Full Sessions

**Before (BROKEN):**
```typescript
.in('session_duration_type', ['standard', 'extended'])  // ❌ Column doesn't exist
```

**After (FIXED):**
```typescript
.in('plan', FULL_SESSION_PLANS)  // ✅ plan IN ['video15', 'diagnostic']
```

**Full Query:**
```typescript
const { data: fullSessions } = await supabaseAdmin
  .from(tableName)
  .select('id, plan')
  .eq('mechanic_id', mechanicId)
  .in('plan', ['video15', 'diagnostic'])
  .gte('created_at', shiftStartTime)
  .lte('created_at', shiftEndTime)
```

---

### 4. Interface Update

**File:** [src/lib/repos/sessionRepo.ts](src/lib/repos/sessionRepo.ts:27-47)

```typescript
export interface SessionData {
  plan?: string | null  // ✅ Changed from session_duration_type
}

export interface SessionStats {
  microSessions: Array<{ id: string; duration_minutes: number | null }>
  fullSessions: Array<{ id: string }>
  microMinutes: number
  tableUsed: 'sessions' | 'diagnostic_sessions'
  planFilters: {  // ✅ NEW - for telemetry
    micro: string
    full: string[]
  }
}
```

---

### 5. Telemetry Enhancement

**Repository Telemetry:**
```typescript
console.log('[MECH SESSIONS]', JSON.stringify({
  source: 'sessionRepo',
  function: 'getSessionStatsForShift',
  tableUsed: 'sessions',
  planMicro: 'free',
  planFull: ['video15', 'diagnostic'],
  microCount: 3,
  fullCount: 2,
  microMinutes: 8
}))
```

**Clock Route Telemetry:**
```typescript
console.log('[CLOCK ROUTE]', JSON.stringify({
  action: 'clock_out',
  tableUsed: 'sessions',
  mechanicId: 'mech-uuid',
  shiftId: 'shift-uuid',
  flag: 'false',
  planMicro: 'free',             // ✅ NEW
  planFull: ['video15', 'diagnostic'],  // ✅ NEW
  microSessionsCount: 3,
  fullSessionsCount: 2
}))
```

---

## Test Coverage

### File: [src/lib/repos/sessionRepo.test.ts](src/lib/repos/sessionRepo.test.ts)

**Tests Updated:** 13 → 14 tests

#### New/Updated Tests:
1. ✅ `getSessionRepoConfig` - Verifies plan mapping in config
2. ✅ `getSessionById` - Expects `plan` column in select
3. ✅ `getSessionStatsForShift` - Verifies plan filters in return
4. ✅ **NEW:** `MICRO/FULL split using plan values` - Comprehensive test

**Test Matrix:**

| Test | Flag | Expected Behavior | Status |
|------|------|-------------------|--------|
| Config with plan mapping | false | micro='free', full=['video15','diagnostic'] | ✅ Pass |
| SessionById uses plan | false | Select includes 'plan' column | ✅ Pass |
| Micro sessions | false | Filters by plan='free' | ✅ Pass |
| Full sessions | false | Filters by plan IN ['video15','diagnostic'] | ✅ Pass |
| Plan filters returned | false | planFilters object in result | ✅ Pass |
| MICRO/FULL split | false | 2 micro (free), 2 full (video15, diagnostic) | ✅ Pass |

**All Tests:** 14/14 passing ✅

---

## TypeScript Compilation

```bash
npm run typecheck
```

**Result:** ✅ **PASS** - No new errors in modified files

**Modified files checked:**
- src/lib/repos/sessionRepo.ts - 0 errors ✅
- src/lib/repos/sessionRepo.test.ts - 0 errors ✅
- src/app/api/mechanic/clock/route.ts - 0 errors ✅

---

## Validation Checklist

### Code Changes
- [x] Repository uses `plan` column (not session_duration_type)
- [x] Micro filter: `.eq('plan', 'free')`
- [x] Full filter: `.in('plan', ['video15', 'diagnostic'])`
- [x] Constants defined for plan values
- [x] Interface updated (SessionData, SessionStats)
- [x] Telemetry includes plan filters

### Tests
- [x] All existing tests updated for plan-based filtering
- [x] New test for MICRO/FULL split added
- [x] All 14 tests passing
- [x] Mock console.log to suppress telemetry during tests

### Quality
- [x] TypeScript compilation passes
- [x] No SQL migrations required
- [x] API contracts preserved
- [x] Feature flag behavior unchanged

---

## Manual Smoke Test Plan

### Setup
```bash
# Ensure flag is default (false = use sessions table)
AAD_USE_DIAGNOSTIC_SESSIONS_FOR_CLOCK=false
```

### Test 1: Clock In/Out with Free Sessions
**Objective:** Verify micro sessions (plan='free') are counted

**Steps:**
1. Mechanic clocks in via dashboard
2. Complete 2 chat sessions (plan='free', duration ~3min each)
3. Mechanic clocks out
4. Check shift log entry

**Expected Results:**
- ✅ Shift log: `micro_sessions_taken = 2`
- ✅ Shift log: `full_sessions_taken = 0`
- ✅ Shift log: `micro_minutes_used ≈ 6`
- ✅ Telemetry: `[MECH SESSIONS] {"planMicro":"free","microCount":2}`
- ✅ Telemetry: `[CLOCK ROUTE] {"planMicro":"free","planFull":["video15","diagnostic"],"microSessionsCount":2}`

---

### Test 2: Clock In/Out with Mixed Sessions
**Objective:** Verify both micro and full sessions are counted correctly

**Steps:**
1. Mechanic clocks in
2. Complete 1 chat session (plan='free', duration ~3min)
3. Complete 1 video session (plan='video15', duration ~7min)
4. Complete 1 diagnostic session (plan='diagnostic', duration ~22min)
5. Mechanic clocks out
6. Check shift log entry

**Expected Results:**
- ✅ Shift log: `micro_sessions_taken = 1`
- ✅ Shift log: `full_sessions_taken = 2`
- ✅ Shift log: `micro_minutes_used ≈ 3`
- ✅ Telemetry: `[MECH SESSIONS] {"microCount":1,"fullCount":2,"microMinutes":3}`
- ✅ Telemetry: `[CLOCK ROUTE] {"microSessionsCount":1,"fullSessionsCount":2}`

---

### Test 3: Toggle Feature Flag (Local Test Only)
**Objective:** Verify flag still works (fallback to diagnostic_sessions)

**Steps:**
1. Set `AAD_USE_DIAGNOSTIC_SESSIONS_FOR_CLOCK=true`
2. Restart app
3. Clock in/out
4. Check telemetry

**Expected Results:**
- ✅ Telemetry: `[CLOCK ROUTE] {"tableUsed":"diagnostic_sessions",...}`
- ✅ Session counts = 0 (expected, diagnostic_sessions table is empty)

---

## Known Limitations

### 1. Empty diagnostic_sessions Table
**Issue:** Feature flag true → always returns 0 sessions
**Reason:** diagnostic_sessions table has 0 rows
**Impact:** Flag true is only useful for testing, not for production
**Mitigation:** Keep flag=false (default) in production

### 2. Hardcoded Plan Values
**Issue:** If new plans are added to database, repository won't count them
**Example:** If `plan='extended'` is added, it won't be counted as full session
**Mitigation:** Document plan mapping in code comments and ADR

### 3. No Validation of Plan Values
**Issue:** Invalid plan values in database will be ignored
**Example:** If plan='invalid', session won't be counted
**Mitigation:** Add database constraint for plan values (Phase 2)

---

## Rollback Plan

### Option 1: Git Revert (Recommended)
```bash
git log --oneline -3
git revert <phase-1c-commit-hash>
git push origin main
```

### Option 2: Manual Revert
1. Restore Phase 1B repository code:
   - Change `.eq('plan', 'free')` → `.eq('session_duration_type', 'micro')`
   - Change `.in('plan', ['video15', 'diagnostic'])` → `.in('session_duration_type', ['standard', 'extended'])`
2. Remove planFilters from SessionStats interface
3. Remove plan mapping constants
4. Revert telemetry changes

**Note:** Phase 1B code had the bug, so reverting will re-introduce the column error.

---

## Next Steps

### Immediate (Deploy & Validate)
1. **Commit Phase 1C** to main ✅
2. **Deploy** to production with flag=false
3. **Execute Manual Smoke Tests** (Test 1 and Test 2)
4. **Monitor Telemetry** for 24-48 hours:
   - `[MECH SESSIONS]` logs showing correct counts
   - `[CLOCK ROUTE]` logs showing plan filters
5. **Verify Shift Logs** match actual sessions completed

### Phase 2 (After Validation)
- Remove feature flag (hardcode sessions table)
- Add database constraint for plan values
- Migrate other routes to use sessionRepo
- Performance optimization if needed

---

## Files Modified Summary

| File | Lines Changed | Purpose |
|------|---------------|---------|
| [src/lib/repos/sessionRepo.ts](src/lib/repos/sessionRepo.ts) | +40 / -10 | Fix column mapping, add telemetry |
| [src/lib/repos/sessionRepo.test.ts](src/lib/repos/sessionRepo.test.ts) | +459 / -347 | Update all tests for plan-based filtering |
| [src/app/api/mechanic/clock/route.ts](src/app/api/mechanic/clock/route.ts) | +2 / -0 | Add plan filters to telemetry |
| [notes/reports/adr/batch-2-adr-01-session-table-selection.md](notes/reports/adr/batch-2-adr-01-session-table-selection.md) | +237 / -7 | Add Phase 1C implementation section |

**Total:** +738 / -364 = **+374 net lines**

---

## Sign-Off

**Phase 1C: Repository Column Mapping Fix**
✅ **COMPLETE**

**Critical Bug Fixed:** Repository now queries existing `plan` column instead of non-existent `session_duration_type`

**Testing:** 14/14 unit tests passing ✅

**TypeScript:** 0 new errors ✅

**Deployment:** Ready for production with flag=false

**Validation:** Manual smoke tests pending (requires deployed environment)

---

**Report Generated:** 2025-11-01
**Author:** Claude (Batch 2 Remediation Agent)
**Next Review:** After manual smoke tests completion
