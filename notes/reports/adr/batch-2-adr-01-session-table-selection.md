# ADR 01: Session Table Selection for Clock Route

**Date:** 2025-11-01
**Status:** ✅ **DECIDED** - Use `sessions` table with `plan` column mapping
**Context:** Phase 1B - Batch 2 Mechanic Surface Remediation
**Decision Maker:** Claude (Automated Analysis) + User Approval Required

---

## Context

### The Problem
The mechanic clock route (`/api/mechanic/clock`) queries session data during clock-out to calculate shift statistics (micro sessions, full sessions, minutes used). The original implementation directly queried `diagnostic_sessions` table with filters for `session_duration_type IN ('micro', 'standard', 'extended')`.

**Two tables exist:**
1. `sessions` - Main session tracking table
2. `diagnostic_sessions` - Workshop-specific diagnostic workflow table

**Ambiguity:**
- Which table contains the correct session data for mechanic shifts?
- Do both tables contain sessions, or is one table empty?
- What columns should be used to distinguish micro vs full sessions?

### Phase 1B Approach
Instead of changing table queries directly (risky), we implemented:
- Repository abstraction (`src/lib/repos/sessionRepo.ts`)
- Feature flag (`AAD_USE_DIAGNOSTIC_SESSIONS_FOR_CLOCK`)
- Structured telemetry (`[CLOCK ROUTE]` logs)
- Read-only database queries for empirical validation

---

## Phase 1B Evidence

### Investigation Date: 2025-11-01

#### Environment Configuration
```bash
AAD_USE_DIAGNOSTIC_SESSIONS_FOR_CLOCK=not set (defaults to false)
# Meaning: Repository uses sessions table by default
```

---

### 1. Table Row Counts

**Query:**
```sql
SELECT 'sessions' as table_name, COUNT(*) FROM sessions
UNION ALL
SELECT 'diagnostic_sessions' as table_name, COUNT(*) FROM diagnostic_sessions;
```

**Results:**
```
sessions:             48 rows
diagnostic_sessions:   0 rows  ⚠️ EMPTY TABLE
```

**Analysis:**
- ✅ `sessions` table contains 48 sessions
- ❌ `diagnostic_sessions` table is completely empty
- **Conclusion:** The original clock route was querying an empty table!

---

### 2. Last 5 Mechanic Shifts

**Query:**
```sql
SELECT id, mechanic_id, clock_in_at, clock_out_at,
       micro_sessions_taken, full_sessions_taken, micro_minutes_used
FROM mechanic_shift_logs
WHERE clock_out_at IS NOT NULL
ORDER BY clock_out_at DESC
LIMIT 5;
```

**Results:**
```
Shift 1: 10918c1f-a3ab-49b4-ae4f-4e2e97c1c1b8
  Mechanic: c62837da-8ff1-4218-afbe-3da2e940dfd7
  Clock In:  2025-11-01 05:57:27.168Z
  Clock Out: 2025-11-01 05:57:31.310Z
  Micro Sessions: 0
  Full Sessions:  0
  Micro Minutes:  0

Shift 2: cff353c8-d5c2-4dad-97cb-5c9e13c52182
  Mechanic: c62837da-8ff1-4218-afbe-3da2e940dfd7
  Clock In:  2025-11-01 05:57:17.971Z
  Clock Out: 2025-11-01 05:57:23.290Z
  Micro Sessions: 0
  Full Sessions:  0
  Micro Minutes:  0

[... 3 more shifts with identical 0 counts ...]
```

**Analysis:**
- All 5 recent shifts show 0 sessions taken
- This is because the clock route queried `diagnostic_sessions` (empty table)
- These shifts were only 4-10 seconds long (likely test shifts)
- Real session data exists in `sessions` table but was never counted

---

### 3. Sessions Table Schema

**Introspection Query:**
```javascript
SELECT * FROM sessions LIMIT 1;
```

**Columns Found:**
```
id                   string
plan                 string   ← KEY: "free", "video15", "diagnostic"
type                 string   ← KEY: "chat", "video", "diagnostic"
stripe_session_id    string
customer_email       string (nullable)
status               string
intake_id            string
created_at           string
updated_at           string
customer_user_id     string
metadata             object
mechanic_id          string (nullable)
scheduled_start      string (nullable)
scheduled_end        string (nullable)
scheduled_for        string (nullable)
started_at           string (nullable)
ended_at             string
duration_minutes     number   ← KEY: Actual duration
expires_at           string (nullable)
summary_data         object (nullable)
summary_submitted_at string (nullable)
parent_session_id    string (nullable)
is_follow_up         boolean
rating               number (nullable)
rating_comment       string (nullable)
workshop_id          string (nullable)
preferred_workshop_id string (nullable)
```

**Critical Finding:**
- ❌ **NO `session_duration_type` column exists!**
- ✅ Uses `plan` column instead ("free", "video15", "diagnostic")
- ✅ Uses `type` column for general category ("chat", "video", "diagnostic")

**Implication:**
- The repository code queries for `session_duration_type` which **does not exist**
- This would cause SQL errors when querying `sessions` table
- The repository needs to be fixed to use `plan` column instead

---

### 4. Session Distribution Analysis

**Query:**
```javascript
SELECT plan, type, duration_minutes FROM sessions;
```

**Results:**

#### By Plan:
```
free:       30 sessions
video15:    10 sessions
diagnostic:  8 sessions
Total:      48 sessions
```

#### By Type:
```
chat:       30 sessions
video:      10 sessions
diagnostic:  8 sessions
```

#### Duration Analysis (by Plan):
```
Plan         Avg Duration  Min  Max
-----------------------------------------
free         2.8 min       0    26
video15      6.7 min       1    24
diagnostic  22.0 min      22    22
```

**Analysis:**
- **Free/Chat sessions:** Very short (avg 2.8 min) - likely "micro" sessions
- **Video15 sessions:** Moderate (avg 6.7 min) - could be micro or short full
- **Diagnostic sessions:** Long (22 min) - clearly "full" sessions

---

### 5. Proposed Plan-to-Category Mapping

Based on duration analysis and plan names:

#### Option 1: Duration-Based (Recommended)
```javascript
// Micro: <= 15 minutes
if (plan === 'free' || duration_minutes <= 15) → MICRO

// Full: > 15 minutes
if (plan === 'video15' || plan === 'diagnostic' || duration_minutes > 15) → FULL
```

#### Option 2: Plan-Based (Simpler)
```javascript
// Micro: Short sessions
if (plan === 'free') → MICRO

// Full: Standard and diagnostic sessions
if (plan === 'video15' || plan === 'diagnostic') → FULL
```

**Recommendation:** Use Plan-Based mapping for consistency:
- Micro: `plan = 'free'` (30 sessions)
- Full: `plan IN ('video15', 'diagnostic')` (18 sessions)

---

### 6. Cross-Table Comparison

**Test Scenario:** Query sessions for last shift period

```javascript
// Shift: 10918c1f-a3ab-49b4-ae4f-4e2e97c1c1b8
// Time: 2025-11-01 05:57:27 to 05:57:31 (4 seconds)
// Mechanic: c62837da-8ff1-4218-afbe-3da2e940dfd7

// Query sessions table
SELECT COUNT(*) FROM sessions
WHERE mechanic_id = 'c62837da-...'
  AND created_at >= '2025-11-01 05:57:27.168Z'
  AND created_at <= '2025-11-01 05:57:31.310Z';
// Result: 0 sessions (shift was only 4 seconds, no sessions completed)

// Query diagnostic_sessions table
SELECT COUNT(*) FROM diagnostic_sessions
WHERE mechanic_id = 'c62837da-...'
  AND created_at >= '2025-11-01 05:57:27.168Z'
  AND created_at <= '2025-11-01 05:57:31.310Z';
// Result: 0 sessions (table is empty)
```

**Match Analysis:**
- Shift log reports: 0 micro, 0 full sessions
- sessions table: 0 sessions (correct - shift was only 4 seconds)
- diagnostic_sessions table: 0 sessions (correct by accident - table is empty)
- **Both tables match, but for different reasons**

**Caveat:** All recent shifts are test shifts (4-10 seconds) with no actual sessions. Need to test with a real shift that has completed sessions.

---

## Decision

### ✅ Use `sessions` Table with Corrected Column Mapping

**Rationale:**
1. **diagnostic_sessions is empty** (0 rows) - cannot be the source of truth
2. **sessions table has 48 rows** - contains all actual session data
3. **Column mismatch discovered** - `session_duration_type` does not exist, must use `plan`
4. **Clear plan values** - "free", "video15", "diagnostic" map to micro/full categories
5. **Duration data available** - `duration_minutes` column can be used for validation

**Decision:**
- Set `AAD_USE_DIAGNOSTIC_SESSIONS_FOR_CLOCK=false` (default) ✅
- Use `sessions` table for clock-out session queries
- **FOLLOW-UP REQUIRED:** Fix repository to query `plan` instead of `session_duration_type`

---

## Consequences

### Immediate Actions Required

#### 1. Fix Repository Column Mapping (CRITICAL)
**File:** [src/lib/repos/sessionRepo.ts](src/lib/repos/sessionRepo.ts)

**Current Code (BROKEN):**
```typescript
const { data: microSessions } = await supabaseAdmin
  .from(tableName)
  .select('id, duration_minutes')
  .eq('mechanic_id', mechanicId)
  .eq('session_duration_type', 'micro')  // ❌ Column doesn't exist!
```

**Fixed Code (REQUIRED):**
```typescript
const { data: microSessions } = await supabaseAdmin
  .from(tableName)
  .select('id, duration_minutes, plan')
  .eq('mechanic_id', mechanicId)
  .eq('plan', 'free')  // ✅ Correct column name
```

**Mapping:**
```typescript
// Micro sessions: plan = 'free'
.eq('plan', 'free')

// Full sessions: plan IN ('video15', 'diagnostic')
.in('plan', ['video15', 'diagnostic'])
```

---

#### 2. Update Repository Tests
**File:** [src/lib/repos/sessionRepo.test.ts](src/lib/repos/sessionRepo.test.ts)

Update test mocks to use `plan` column instead of `session_duration_type`.

---

#### 3. Environment Variable
**Production:**
```bash
AAD_USE_DIAGNOSTIC_SESSIONS_FOR_CLOCK=false
```

**Reasoning:** Keep default (false) since `sessions` is the correct table.

---

#### 4. Remove Feature Flag (Phase 2)
Once the column mapping is fixed and validated:
- Remove `AAD_USE_DIAGNOSTIC_SESSIONS_FOR_CLOCK` flag
- Hardcode `sessions` table in repository
- Remove diagnostic_sessions query code
- Clean up telemetry logs

---

### What Stays the Same
- ✅ Repository abstraction pattern (good design)
- ✅ `getSessionStatsForShift()` function signature
- ✅ Telemetry logging structure
- ✅ API contracts (no changes)
- ✅ Shift log update logic

### What Changes
- ❌ Column name: `session_duration_type` → `plan`
- ❌ Filter values: `'micro'` → `'free'`, `['standard', 'extended']` → `['video15', 'diagnostic']`
- ⚠️ Feature flag will be removed after validation

---

## Validation Plan

### Phase 1B Validation (Current)
✅ **Completed:**
- Database introspection
- Table row counts
- Schema analysis
- Plan/type distribution
- Duration analysis

❌ **Blocked:**
- Cannot test with real shift data (all recent shifts are 4-10 second tests with 0 sessions)
- Need a real mechanic shift with completed sessions to validate counts

### Phase 1C Validation (Next - REQUIRED)
**Goal:** Fix repository column mapping and validate with real data

**Steps:**
1. Fix `sessionRepo.ts` to use `plan` column
2. Update tests for new column mapping
3. Deploy to test environment
4. Create real mechanic shift:
   - Clock in
   - Complete 2-3 free sessions (micro)
   - Complete 1 video15 session (full)
   - Clock out
5. Verify shift log:
   - `micro_sessions_taken` = 2-3
   - `full_sessions_taken` = 1
   - `micro_minutes_used` = sum of free session durations
6. Check telemetry logs:
   - `[CLOCK ROUTE] {"tableUsed":"sessions","microSessionsCount":X,"fullSessionsCount":Y}`
7. Query database to confirm:
   - `sessions` table has those sessions
   - Counts match shift log

---

## Alternative Considered

### ❌ Use diagnostic_sessions Table
**Rejected because:**
- Table is completely empty (0 rows)
- Would return incorrect session counts (always 0)
- Not the source of truth for session data

### ❌ Keep Feature Flag Permanently
**Rejected because:**
- diagnostic_sessions is definitively wrong (empty)
- No need for A/B testing when one option is clearly correct
- Adds unnecessary complexity
- Feature flag should be temporary for validation only

---

## Follow-Up Issues

### Phase 1C (Immediate - CRITICAL)
**Title:** Fix sessionRepo column mapping to use `plan` instead of `session_duration_type`

**Description:**
- Current repository queries for non-existent `session_duration_type` column
- Must be updated to query `plan` column with correct values
- Mapping: `'free'` → micro, `['video15', 'diagnostic']` → full

**Files:**
- `src/lib/repos/sessionRepo.ts` (fix queries)
- `src/lib/repos/sessionRepo.test.ts` (update tests)

**Priority:** P0 (Critical) - Current code will fail when querying sessions table

---

### Phase 2 (After Phase 1C Validation)
**Title:** Remove AAD_USE_DIAGNOSTIC_SESSIONS_FOR_CLOCK feature flag

**Description:**
- After empirical validation, hardcode `sessions` table
- Remove diagnostic_sessions query code
- Simplify repository to single table implementation
- Update telemetry to remove `tableUsed` (no longer needed)

**Priority:** P1 (High) - Tech debt cleanup

---

### Phase 3 (Future - Low Priority)
**Title:** Investigate diagnostic_sessions table purpose

**Description:**
- Table exists but is empty
- Migration file `20250127000001_add_repair_quote_system.sql` created it
- Intended for workshop diagnostic workflow
- Determine if table is needed or can be dropped

**Priority:** P2 (Low) - Schema cleanup

---

## References

### Database Queries
- Table counts: `scripts/query-session-evidence.js`
- Schema introspection: `scripts/introspect-session-schemas.js`
- Plan analysis: `scripts/analyze-session-types.js`

### Code Files
- Repository: [src/lib/repos/sessionRepo.ts](src/lib/repos/sessionRepo.ts)
- Tests: [src/lib/repos/sessionRepo.test.ts](src/lib/repos/sessionRepo.test.ts)
- Clock route: [src/app/api/mechanic/clock/route.ts](src/app/api/mechanic/clock/route.ts)

### Documentation
- Phase 1B Plan: [notes/reports/remediation/batch-2-plan.md](notes/reports/remediation/batch-2-plan.md)
- Phase 1B Verification: [notes/reports/remediation/batch-2-verification-Phase1B.md](notes/reports/remediation/batch-2-verification-Phase1B.md)

### Migration Files
- Diagnostic sessions creation: `supabase/migrations/20250127000001_add_repair_quote_system.sql`

---

## Telemetry Examples

### With Current Flag (Default: false)
```json
[CLOCK ROUTE] {
  "action": "clock_out",
  "tableUsed": "sessions",
  "mechanicId": "c62837da-8ff1-4218-afbe-3da2e940dfd7",
  "shiftId": "10918c1f-a3ab-49b4-ae4f-4e2e97c1c1b8",
  "flag": "false",
  "microSessionsCount": 0,
  "fullSessionsCount": 0
}
```

**Note:** Counts are 0 because:
1. Shift was only 4 seconds (test shift)
2. Repository queries for non-existent `session_duration_type` column (causes SQL error, returns empty array)

### After Phase 1C Fix
```json
[CLOCK ROUTE] {
  "action": "clock_out",
  "tableUsed": "sessions",
  "mechanicId": "c62837da-8ff1-4218-afbe-3da2e940dfd7",
  "shiftId": "real-shift-uuid",
  "flag": "false",
  "microSessionsCount": 3,
  "fullSessionsCount": 1
}
```

---

## Phase 1C Implementation — Column Mapping Fix

**Date:** 2025-11-01
**Status:** ✅ **IMPLEMENTED**

### Changes Made

#### 1. Repository Fix: [src/lib/repos/sessionRepo.ts](src/lib/repos/sessionRepo.ts)

**Column Mapping Constants Added:**
```typescript
const MICRO_SESSION_PLAN = 'free'
const FULL_SESSION_PLANS = ['video15', 'diagnostic']
```

**Before (BROKEN):**
```typescript
const { data: microSessions } = await supabaseAdmin
  .from(tableName)
  .select('id, duration_minutes')
  .eq('mechanic_id', mechanicId)
  .eq('session_duration_type', 'micro')  // ❌ Column doesn't exist!
  .gte('created_at', shiftStartTime)
  .lte('created_at', shiftEndTime)

const { data: fullSessions } = await supabaseAdmin
  .from(tableName)
  .select('id')
  .eq('mechanic_id', mechanicId)
  .in('session_duration_type', ['standard', 'extended'])  // ❌ Column doesn't exist!
  .gte('created_at', shiftStartTime)
  .lte('created_at', shiftEndTime)
```

**After (FIXED):**
```typescript
const { data: microSessions } = await supabaseAdmin
  .from(tableName)
  .select('id, duration_minutes, plan')
  .eq('mechanic_id', mechanicId)
  .eq('plan', MICRO_SESSION_PLAN)  // ✅ plan = 'free'
  .gte('created_at', shiftStartTime)
  .lte('created_at', shiftEndTime)

const { data: fullSessions } = await supabaseAdmin
  .from(tableName)
  .select('id, plan')
  .eq('mechanic_id', mechanicId)
  .in('plan', FULL_SESSION_PLANS)  // ✅ plan IN ['video15', 'diagnostic']
  .gte('created_at', shiftStartTime)
  .lte('created_at', shiftEndTime)
```

**Interface Updates:**
```typescript
export interface SessionData {
  // Changed from session_duration_type to plan
  plan?: string | null
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

**Telemetry Added:**
```typescript
console.log('[MECH SESSIONS]', JSON.stringify({
  source: 'sessionRepo',
  function: 'getSessionStatsForShift',
  tableUsed: tableName,
  planMicro: MICRO_SESSION_PLAN,
  planFull: FULL_SESSION_PLANS,
  microCount: microSessions?.length || 0,
  fullCount: fullSessions?.length || 0,
  microMinutes
}))
```

---

#### 2. Clock Route Telemetry: [src/app/api/mechanic/clock/route.ts](src/app/api/mechanic/clock/route.ts)

**Before:**
```typescript
console.log('[CLOCK ROUTE]', JSON.stringify({
  action: 'clock_out',
  tableUsed: sessionStats.tableUsed,
  mechanicId,
  shiftId: openShift.id,
  flag: repoConfig.flagValue,
  microSessionsCount: sessionStats.microSessions.length,
  fullSessionsCount: sessionStats.fullSessions.length
}))
```

**After:**
```typescript
console.log('[CLOCK ROUTE]', JSON.stringify({
  action: 'clock_out',
  tableUsed: sessionStats.tableUsed,
  mechanicId,
  shiftId: openShift.id,
  flag: repoConfig.flagValue,
  planMicro: sessionStats.planFilters.micro,      // ✅ NEW
  planFull: sessionStats.planFilters.full,        // ✅ NEW
  microSessionsCount: sessionStats.microSessions.length,
  fullSessionsCount: sessionStats.fullSessions.length
}))
```

---

#### 3. Test Updates: [src/lib/repos/sessionRepo.test.ts](src/lib/repos/sessionRepo.test.ts)

**New Tests Added:**
- ✅ Plan mapping in config (expects `micro: 'free', full: ['video15', 'diagnostic']`)
- ✅ Plan column in select statement (not session_duration_type)
- ✅ Plan filters in return value (planFilters property)
- ✅ **MICRO/FULL split test** - Verifies 'free' → micro, ['video15', 'diagnostic'] → full

**Total Tests:** 14 (was 13)
**All Passing:** ✅

---

### Final Plan Mapping Table

| Session Plan | Session Type | Duration (avg) | Category | Repository Filter |
|--------------|--------------|----------------|----------|-------------------|
| `free`       | chat         | 2.8 min        | **MICRO** | `.eq('plan', 'free')` |
| `video15`    | video        | 6.7 min        | **FULL**  | `.in('plan', ['video15', 'diagnostic'])` |
| `diagnostic` | diagnostic   | 22.0 min       | **FULL**  | `.in('plan', ['video15', 'diagnostic'])` |

---

### Telemetry Output Examples

#### Repository Telemetry
```json
[MECH SESSIONS] {
  "source": "sessionRepo",
  "function": "getSessionStatsForShift",
  "tableUsed": "sessions",
  "planMicro": "free",
  "planFull": ["video15", "diagnostic"],
  "microCount": 3,
  "fullCount": 2,
  "microMinutes": 8
}
```

#### Clock Route Telemetry
```json
[CLOCK ROUTE] {
  "action": "clock_out",
  "tableUsed": "sessions",
  "mechanicId": "c62837da-8ff1-4218-afbe-3da2e940dfd7",
  "shiftId": "shift-uuid",
  "flag": "false",
  "planMicro": "free",
  "planFull": ["video15", "diagnostic"],
  "microSessionsCount": 3,
  "fullSessionsCount": 2
}
```

---

### Verification Checklist

- [x] Repository queries use `plan` column instead of `session_duration_type`
- [x] Micro sessions filter: `plan = 'free'`
- [x] Full sessions filter: `plan IN ('video15', 'diagnostic')`
- [x] SessionStats interface includes planFilters
- [x] Telemetry includes plan mapping information
- [x] All tests updated and passing (14/14)
- [x] TypeScript compilation passes with no new errors
- [x] No SQL migrations required (code-only change)
- [x] API contracts preserved (no request/response changes)

---

### Files Modified

1. **[src/lib/repos/sessionRepo.ts](src/lib/repos/sessionRepo.ts)**
   - Added: Plan mapping constants
   - Changed: Column from `session_duration_type` to `plan`
   - Added: planFilters to SessionStats interface
   - Added: Telemetry logging

2. **[src/lib/repos/sessionRepo.test.ts](src/lib/repos/sessionRepo.test.ts)**
   - Updated: All test expectations for plan-based filtering
   - Added: MICRO/FULL split test
   - Added: Plan mapping config test

3. **[src/app/api/mechanic/clock/route.ts](src/app/api/mechanic/clock/route.ts)**
   - Enhanced: Telemetry to include planMicro and planFull

---

## Sign-Off

**Analysis Date:** 2025-11-01
**Implementation Date:** 2025-11-01
**Analyst:** Claude (Batch 2 Remediation Agent)
**Status:** ✅ **IMPLEMENTED & TESTED**
**Next Action:** Deploy and validate with real mechanic shift data

**Phase 1C Summary:**
1. ✅ Fixed repository to query `plan` column (not session_duration_type)
2. ✅ Implemented plan-based mapping (free=micro, video15/diagnostic=full)
3. ✅ Added structured telemetry with plan filters
4. ✅ All tests passing (14/14)
5. ✅ TypeScript compilation clean
6. ✅ No SQL changes required

**Pending:**
1. ⏳ Deploy to production with flag=false (use sessions table)
2. ⏳ Validate with real mechanic shift (complete 1-2 free + 1 video15 sessions)
3. ⏳ Verify shift log counts match actual sessions
4. ⏳ Remove feature flag after validation (Phase 2)

---

**Document Version:** 2.0
**Last Updated:** 2025-11-01
**Related ADRs:** None (first ADR for Batch 2)
