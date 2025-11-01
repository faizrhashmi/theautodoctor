# Batch 4 - Admin Surface Remediation Plan

**Date:** 2025-01-01
**Scope:** Admin dashboard security & code quality
**Approach:** Phased, minimal-diff remediation (P0 → P1 → P2)
**Status:** 📋 PLAN ONLY - Awaiting Approval

---

## Executive Summary

**Total Issues Found:** 215+
- **P0 (Critical Security):** 2 issues
- **P1 (High Priority):** 152 issues
- **P2 (Medium Priority):** 61+ issues

**Estimated Total Time:** 4-6 days (across 3 phases)
**Risk Level:** LOW (read-only planning, no migrations unless strictly necessary)

---

## Issue Inventory

### 🔴 P0 - Critical Security Issues (2 total)

#### P0-1: SQL Injection Risk in Database Query Tool
**File:** `src/app/api/admin/database/query/route.ts:100`
**Severity:** CRITICAL
**Description:**
```typescript
// CURRENT (line 100):
const { data, error } = await supabase.rpc('exec_sql', { sql: query })
```

**Risk:**
- Direct SQL execution via RPC function
- While whitelist exists (lines 14-20), bypasses could exist
- Potential for SQL injection if `exec_sql` RPC function is too permissive
- Comment on line 170-172 indicates function may not even exist yet

**Proposed Fix:**
1. Remove `supabase.rpc('exec_sql')` entirely
2. Implement safer alternatives:
   - Option A: Use Supabase query builder with parameterized queries
   - Option B: Pre-defined read-only views/functions
   - Option C: Remove feature entirely if not actively used

**Evidence:**
```typescript
// Lines 170-172 comment:
// Note: The exec_sql RPC function needs to be created in Supabase
// This is a safer alternative to direct SQL execution
// For now, we'll use a simpler approach with Supabase queries
```

---

#### P0-2: Privacy Dashboard Response Key Mismatch
**File:** `src/app/admin/(shell)/privacy/dashboard/page.tsx:54`
**Severity:** HIGH (breaks functionality)
**Description:**
```typescript
// CURRENT (line 54):
const data = await response.json()
setMetrics(data.dashboardSummary)  // ❌ WRONG KEY
setComplianceScore(data.complianceScore)
```

**API Actually Returns:** (from `src/app/api/admin/privacy/metrics/route.ts:62-96`)
```typescript
return NextResponse.json({
  summary: { ... },  // ← Actual key name
  complianceScore: { ... },
  consentStats: [ ... ],
})
```

**Impact:**
- Dashboard displays nothing (metrics are null/undefined)
- Silent failure - no error shown to admin
- PIPEDA compliance monitoring broken

**Proposed Fix:**
```typescript
setMetrics(data.summary)  // ✅ Correct key
```

**Additional Issues Found:**
- Interface `DashboardMetrics` uses snake_case (lines 8-28)
- API returns camelCase in `summary` object (lines 64-75)
- Needs consistent key transformation

---

### 🟠 P1 - High Priority Issues (152 total)

#### P1-1: Excessive @ts-nocheck Usage
**Files Affected:** 101 files (45 pages + 56 API routes)
**Severity:** HIGH (hides type errors, tech debt)

**Breakdown:**
- Admin pages with @ts-nocheck: 45
- Admin API routes with @ts-nocheck: 56

**Sample Files:**
```
src/app/admin/(shell)/database/page.tsx:1                  // @ts-nocheck
src/app/admin/(shell)/privacy/dashboard/page.tsx:1         // @ts-nocheck
src/app/api/admin/database/query/route.ts:1                // @ts-nocheck
src/app/api/admin/privacy/metrics/route.ts                 (no @ts-nocheck - good!)
... +97 more files
```

**Risk:**
- Type errors silently ignored
- Interface mismatches not caught (like P0-2 above)
- Maintenance burden increases over time
- IDE autocomplete/IntelliSense degraded

**Proposed Phased Removal:**
1. **Phase 1A:** Remove @ts-nocheck from 10 critical files (database, privacy, sessions)
2. **Phase 1B:** Remove from 30 medium-priority files (users, mechanics, workshops)
3. **Phase 1C:** Remove from remaining 61 files (analytics, logs, cleanup)

---

#### P1-2: Loose Error Handling
**Files Affected:** 51 instances
**Pattern:** `catch (error: any)` or `catch (err: any)`

**Examples:**
```typescript
// src/app/admin/(shell)/database/page.tsx:83
catch (err: any) {
} finally {
  setLoading(false)
}

// src/app/admin/(shell)/privacy/dashboard/page.tsx:57
catch (err) {
  console.error('Error fetching dashboard:', err)
  setError(err instanceof Error ? err.message : 'Failed to load dashboard')
}
```

**Risk:**
- Swallowed errors with no user feedback (line 83-86 example)
- Generic error messages
- Hard to debug production issues

**Proposed Fix:**
```typescript
catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error('[admin-database] Query execution failed:', message, error)
  setError(message)
  // Optional: Send to error tracking service
}
```

---

#### P1-3: Timezone Handling Issues
**Files Affected:** 59 uses of `toLocaleString`/`toLocaleDateString`
**Additional:** 20+ direct `new Date()` usages without timezone awareness

**Examples:**
```typescript
// src/app/admin/(shell)/database/page.tsx:139, 156
link.download = `query-results-${new Date().toISOString()}.json`
// ✅ Good - ISO string is timezone-neutral

// src/app/admin/(shell)/customers/page.tsx:123
{customer.suspended_until && new Date(customer.suspended_until) > new Date() && (...)}
// ⚠️ Problem - comparing dates without explicit timezone
```

**Risk:**
- Admin in Toronto sees different timestamps than Vancouver
- Suspension/activation times off by hours
- CSV exports have inconsistent timestamps
- Audit logs show wrong times

**Proposed Fix:**
1. Create utility: `src/lib/adminTime.ts`
```typescript
// Always use UTC for admin operations
export const adminNow = () => new Date()
export const adminDate = (isoString: string) => new Date(isoString)
export const formatAdminTimestamp = (date: Date) => {
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}
```

2. Replace all `new Date()` comparisons with explicit UTC handling
3. Add timezone indicator to all admin timestamps in UI

---

### 🟡 P2 - Medium Priority Issues (61+ total)

#### P2-1: CSV Export Character Encoding
**Files Affected:** 5 export functions
**Files:**
- `src/app/admin/(shell)/database/page.tsx:141-158` (CSV export)
- `src/app/admin/(shell)/customers/page.tsx` (user export)
- `src/app/admin/(shell)/intakes/page.tsx` (intake export)
- `src/app/admin/(shell)/mechanics/page.tsx` (mechanic export)
- `src/app/api/admin/users/export/route.ts` (CSV generation)

**Issues:**
- No BOM (Byte Order Mark) for Excel compatibility
- French characters (é, à, ç) may break in Excel
- Commas in data fields not escaped properly
- No charset declaration

**Example (database/page.tsx:141-158):**
```typescript
const csvRows = [
  headers.join(','),
  ...results.data.map((row: any) =>
    headers.map(header => JSON.stringify(row[header] ?? '')).join(',')
  ),
]
const csvStr = csvRows.join('\n')
const dataBlob = new Blob([csvStr], { type: 'text/csv' })
```

**Proposed Fix:**
```typescript
// Add UTF-8 BOM for Excel
const BOM = '\uFEFF'
const csvStr = BOM + csvRows.join('\n')
const dataBlob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
```

---

#### P2-2: Hardcoded Values in Admin Utils
**Occurrences:** 15+ instances
**Examples:**
- Query categories hardcoded (database/page.tsx:455-460)
- Admin role check string literals (multiple files)
- Status values hardcoded instead of constants

**Proposed Fix:**
- Create `src/config/adminConstants.ts`
- Centralize all admin-specific constants

---

#### P2-3: Inconsistent Error Messages
**Files Affected:** 30+ routes
**Examples:**
```typescript
{ error: 'Failed to fetch dashboard summary' }           // Generic
{ error: 'Unauthorized' }                                // No context
{ error: error?.message || 'Internal server error' }     // Too vague
```

**Proposed Fix:**
- Standardize error response format
- Add error codes for easier debugging
- Include helpful context

---

## Phased Implementation Plan

### **Phase P0: Critical Security Fixes**
**Duration:** 1 day
**Files Changed:** 3-5

**Tasks:**
1. **P0-1: Remove SQL Injection Risk**
   - Investigate if `exec_sql` RPC function exists
   - If exists: Remove it from database
   - If not: Comment out line 100, show error message
   - Update UI to show "Feature temporarily disabled for security audit"
   - Add ADR documenting decision

2. **P0-2: Fix Privacy Dashboard Key Mismatch**
   - Change `data.dashboardSummary` → `data.summary` (line 54)
   - Add defensive check: `if (!data.summary) throw new Error(...)`
   - Optional: Add interface alignment (snake_case vs camelCase)

**Verification:**
- Manual test: Load privacy dashboard, verify metrics display
- Grep verification: No remaining `dashboardSummary` references
- Test database page shows disabled message (if P0-1 removed)

**Commit:**
```
security(admin): Phase P0 — Fix SQL injection & privacy dashboard (CRITICAL)
```

---

### **Phase P1: High-Priority Code Quality**
**Duration:** 2-3 days
**Files Changed:** 60-80

**Sub-Phases:**

#### **Phase P1A: Critical Files @ts-nocheck Removal** (Day 1)
**Files:** 10 critical admin files

**Priority Order:**
1. database/page.tsx
2. privacy/dashboard/page.tsx
3. privacy/metrics/route.ts
4. sessions/page.tsx
5. sessions/AdminSessionsClient.tsx
6. customers/page.tsx
7. mechanics/page.tsx
8. intakes/page.tsx
9. logs/page.tsx
10. health/route.ts

**Approach per file:**
1. Remove `// @ts-nocheck`
2. Run `npx tsc --noEmit` to find errors
3. Fix errors one by one (proper types, not `as any`)
4. Add telemetry: `[ADMIN TYPE] {"file":"...","errors_fixed":N}`

---

#### **Phase P1B: Error Handling Improvements** (Day 2)
**Files:** 51 files with loose error handling

**Pattern Replacement:**
```typescript
// BEFORE:
catch (err: any) {
  // maybe log, maybe not
}

// AFTER:
catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[admin-${feature}] Operation failed:`, message, { context })
  setError(message)
  // Future: Send to Sentry/error tracking
}
```

**Automated Script:**
```bash
# Find all loose error handlers
grep -r "catch.*err.*any\|catch.*error.*any" src/app/admin --include="*.tsx" --include="*.ts"
```

---

#### **Phase P1C: Timezone Standardization** (Day 3)
**Files:** 59 locale string usages + 20 date comparisons

**Steps:**
1. Create `src/lib/adminTime.ts` utility
2. Replace all admin `new Date()` with `adminNow()`
3. Replace all comparisons with explicit UTC
4. Add "UTC" suffix to all displayed timestamps
5. Update CSV exports to use ISO timestamps

**Example Replacements:**
```typescript
// BEFORE:
{new Date(item.executed_at).toLocaleString()}

// AFTER:
{formatAdminTimestamp(adminDate(item.executed_at))}
```

---

### **Phase P2: Medium-Priority Polish**
**Duration:** 1-2 days
**Files Changed:** 20-30

#### **Phase P2A: CSV Export Fixes** (0.5 day)
**Files:** 5 export functions

**Changes per file:**
1. Add UTF-8 BOM
2. Update Blob type to include charset
3. Test with French characters (é, à, ç, ô)
4. Verify in Excel (Windows)

---

#### **Phase P2B: Constants Centralization** (0.5 day)
**Create:** `src/config/adminConstants.ts`

**Contents:**
```typescript
export const ADMIN_QUERY_CATEGORIES = [
  'custom', 'sessions', 'users', 'payments', 'analytics', 'database'
] as const

export const ADMIN_ROLE = 'admin'

export const SESSION_STATUSES = {
  ACTIVE: 'active',
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Admin access required',
  NOT_FOUND: 'Resource not found',
  // ... more
} as const
```

---

#### **Phase P2C: Error Message Standardization** (1 day)
**Files:** 30+ API routes

**Standard Format:**
```typescript
interface AdminErrorResponse {
  error: string        // User-facing message
  code: string         // Machine-readable code
  details?: any        // Optional debug info (dev only)
  timestamp: string    // ISO timestamp
}

// Example:
return NextResponse.json({
  error: 'Failed to fetch dashboard metrics',
  code: 'DASHBOARD_FETCH_ERROR',
  timestamp: new Date().toISOString(),
}, { status: 500 })
```

---

## SQL Safety Section

### **NO MIGRATIONS UNLESS STRICTLY NECESSARY**

**Current Assessment:** ✅ **No SQL migrations required** for Batch 4

**Reasoning:**
- All issues are code-level (TypeScript, error handling, UI)
- Privacy dashboard uses existing `admin_privacy_dashboard_summary` view
- Database query tool interacts with existing schema
- No new columns, tables, or constraints needed

---

### **IF Migrations Become Necessary (Future)**

**Pre-Migration Checklist:**

1. **Introspection Queries (Run First):**
```sql
-- Verify target table/view exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('admin_privacy_dashboard_summary', 'admin_query_history', 'admin_saved_queries');

-- Verify column structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'admin_privacy_dashboard_summary'
ORDER BY ordinal_position;

-- Check for existing RPC functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('exec_sql', 'get_privacy_compliance_score');
```

2. **Idempotent Migration Scripts:**
```sql
-- batch-4/01_up.sql (if needed)
-- EXAMPLE ONLY - Not currently required

-- Add column IF NOT EXISTS (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_logs' AND column_name = 'admin_id'
  ) THEN
    ALTER TABLE public.admin_logs ADD COLUMN admin_id UUID;
    COMMENT ON COLUMN public.admin_logs.admin_id IS 'Admin who performed action';
  END IF;
END $$;

-- Verify
SELECT column_name FROM information_schema.columns
WHERE table_name = 'admin_logs' AND column_name = 'admin_id';
```

3. **"Base-on-What-Exists" Rule:**
   - NEVER assume schema structure
   - ALWAYS introspect live DB first
   - Use `IF NOT EXISTS` / `IF EXISTS` checks
   - Include VERIFY queries in migration

4. **Verify-First, Apply, Re-Verify Sequence:**
```bash
# Step 1: Precheck
psql $DATABASE_URL -f migrations/batch-4/00_precheck.sql > precheck.log

# Step 2: Review precheck output
cat precheck.log  # Ensure tables/columns exist as expected

# Step 3: Apply migration
psql $DATABASE_URL -f migrations/batch-4/01_up.sql

# Step 4: Verify success
psql $DATABASE_URL -f migrations/batch-4/02_verify.sql

# Step 5: Rollback (if needed)
psql $DATABASE_URL -f migrations/batch-4/03_down.sql
```

---

## Test Plan

### **Manual Testing Checklist**

#### **P0 Tests (Critical - Must Pass)**

**P0-1: Database Query Tool**
- [ ] Navigate to `/admin/database`
- [ ] Attempt to execute SELECT query
- [ ] **If feature disabled:** Verify error message shows
- [ ] **If feature active:** Verify only SELECT queries work
- [ ] Attempt INSERT query → should be blocked
- [ ] Attempt UPDATE query → should be blocked
- [ ] Attempt DROP query → should be blocked

**P0-2: Privacy Dashboard**
- [ ] Navigate to `/admin/privacy/dashboard`
- [ ] Verify all metric cards display numbers (not null/undefined)
- [ ] Verify compliance score displays (percentage + grade)
- [ ] Click "Refresh Data" button → metrics update
- [ ] Check browser console → no errors

---

#### **P1 Tests (High Priority)**

**P1A: TypeScript Cleanup**
- [ ] Run `npx tsc --noEmit` → 0 errors in admin files
- [ ] Open 5 random admin files in IDE → IntelliSense works
- [ ] No red squigglies in critical files

**P1B: Error Handling**
- [ ] Trigger API error (disconnect internet, make request)
- [ ] Verify error message displays to admin
- [ ] Check console → structured error logged
- [ ] Error includes context (file, operation)

**P1C: Timezone Consistency**
- [ ] Check admin dashboard timestamps
- [ ] All timestamps should end with "UTC"
- [ ] Export CSV from customers page
- [ ] Verify timestamps in CSV are ISO format (YYYY-MM-DD HH:MM:SS)
- [ ] Open CSV in Excel → dates display correctly

---

#### **P2 Tests (Medium Priority)**

**P2A: CSV Export (Excel Compatibility)**
- [ ] Export customers CSV
- [ ] Open in Microsoft Excel (Windows)
- [ ] Verify French characters display correctly (é, à, ç)
- [ ] Verify commas in data don't break columns
- [ ] Verify dates are readable

**P2B: Constants Usage**
- [ ] Grep for hardcoded 'admin' role string
- [ ] Should use `ADMIN_ROLE` constant
- [ ] Grep for hardcoded query categories
- [ ] Should use `ADMIN_QUERY_CATEGORIES`

**P2C: Error Messages**
- [ ] Trigger 401 error → "Authentication required"
- [ ] Trigger 403 error → "Admin access required"
- [ ] Trigger 404 error → "Resource not found"
- [ ] Trigger 500 error → Specific error with context

---

### **RBAC (Role-Based Access Control) Tests**

**Admin Access:**
- [ ] Login as admin → all admin routes accessible
- [ ] Logout → redirected to login

**Non-Admin Access:**
- [ ] Login as customer → redirect from /admin/*
- [ ] Login as mechanic → redirect from /admin/*
- [ ] Login as workshop → redirect from /admin/*
- [ ] No auth → redirect to login page

**API Endpoint Security:**
- [ ] Call `/api/admin/*` without auth → 401
- [ ] Call `/api/admin/*` with customer auth → 403
- [ ] Call `/api/admin/*` with admin auth → 200

---

### **Automated Testing**

**TypeScript Verification:**
```bash
npm run typecheck
# Expected: 0 errors
```

**Grep Verification (Post-Phase):**
```bash
# After P0:
grep -r "dashboardSummary" src/app/admin
# Expected: 0 matches

grep -r "exec_sql" src/app/admin
# Expected: 0 matches OR commented out

# After P1A:
grep -r "// @ts-nocheck" src/app/admin/(shell)/database src/app/admin/(shell)/privacy src/app/admin/(shell)/sessions
# Expected: 0 matches in these critical dirs

# After P1B:
grep -r "catch.*err.*:.*any" src/app/admin
# Expected: Significantly reduced count

# After P1C:
grep -r "new Date().toLocaleString\|new Date().toLocaleDateString" src/app/admin
# Expected: 0 matches (replaced with formatAdminTimestamp)

# After P2A:
grep -r "Blob\(\[.*\], { type: 'text/csv' }\)" src/app/admin
# Expected: 0 matches (should include charset)
```

---

## Rollback Plan

### **Per-Phase Rollback**

**Phase P0:**
- If privacy dashboard breaks: `git revert <commit-hash>`
- If database tool breaks: Re-enable feature by uncommenting code
- Zero risk - pure UI/API bug fixes

**Phase P1:**
- If TypeScript errors appear: Add back `// @ts-nocheck` temporarily
- If timezone issues: Revert `adminTime.ts` changes, restore `new Date()`
- Each sub-phase is independently reversible

**Phase P2:**
- If CSV export breaks in Excel: Revert BOM addition
- If constants break: Restore hardcoded strings
- Low risk - mostly polish improvements

### **Emergency Rollback (Nuclear Option)**
```bash
# Rollback all Batch 4 changes
git log --oneline | grep "admin.*Phase"
# Find commit before Batch 4 started
git revert <commit-range>
```

---

## Risk Matrix

| Issue | Likelihood | Impact | Mitigation |
|-------|-----------|--------|------------|
| **P0-1:** SQL injection exploited | LOW | CRITICAL | Remove feature entirely if RPC exists |
| **P0-2:** Privacy dashboard still broken after fix | LOW | HIGH | Add defensive checks, fallback UI |
| **P1A:** TypeScript errors block build | MEDIUM | MEDIUM | Fix incrementally, keep @ts-nocheck as escape hatch |
| **P1B:** Error handling changes break UI | LOW | LOW | Wrapped in try-catch, preserves existing behavior |
| **P1C:** Timezone changes confuse admins | MEDIUM | LOW | Add "UTC" labels everywhere, document in changelog |
| **P2A:** CSV exports break in Excel | LOW | LOW | Test on Windows Excel before deploying |
| **P2B:** Constants centralization breaks imports | LOW | LOW | ESLint auto-import, TypeScript catches errors |
| **P2C:** New error format breaks client parsing | LOW | MEDIUM | Keep old format as fallback for 1 version |

**Overall Risk Assessment:** ✅ **LOW RISK**
- No database migrations
- No API contract changes
- Pure code quality improvements
- Each phase independently reversible

---

## Commit Message Templates

### **Phase P0:**
```
security(admin): Phase P0 — Fix SQL injection & privacy dashboard (CRITICAL)

## P0-1: Remove SQL Injection Risk

- Removed direct SQL execution via supabase.rpc('exec_sql')
- Database query tool temporarily disabled for security audit
- Added warning message: "Feature under security review"
- Created ADR: notes/reports/adr/batch-4-adr-01-sql-query-tool.md

Rationale: exec_sql RPC function allows arbitrary SQL execution,
bypassing application-level whitelist. Safer alternatives needed.

## P0-2: Fix Privacy Dashboard Key Mismatch

- Fixed: data.dashboardSummary → data.summary (line 54)
- Added defensive null check
- Verified API contract: /api/admin/privacy/metrics returns 'summary' key

Result: Privacy dashboard now displays PIPEDA compliance metrics correctly.

## Verification

- Manual test: Privacy dashboard loads with metrics ✅
- Manual test: Database tool shows disabled message ✅
- Grep: 0 instances of 'dashboardSummary' remain ✅
- Grep: 0 instances of 'exec_sql' in active code ✅

Total files changed: 3-5
```

---

### **Phase P1A:**
```
refactor(admin): Phase P1A — Remove @ts-nocheck from 10 critical files

## TypeScript Cleanup

Removed @ts-nocheck from critical admin files and fixed all type errors:

**Files Updated:**
1. src/app/admin/(shell)/database/page.tsx (12 errors fixed)
2. src/app/admin/(shell)/privacy/dashboard/page.tsx (8 errors fixed)
3. src/app/admin/(shell)/sessions/page.tsx (15 errors fixed)
... (list all 10)

**Common Fixes:**
- Replace `any` with proper types from Supabase
- Add interfaces for API responses
- Fix useState<T> type parameters
- Add proper error types

**Telemetry:**
[ADMIN TYPE] {"phase":"P1A","files":10,"errors_fixed":87}

**Verification:**
- TypeScript: 0 errors in updated files ✅
- IDE: IntelliSense fully functional ✅
- Grep: 0 @ts-nocheck in critical paths ✅

Total files changed: 10
No behavior changes, pure type safety improvements.
```

---

### **Phase P1B:**
```
refactor(admin): Phase P1B — Improve error handling across 51 files

## Error Handling Improvements

Replaced loose `catch (err: any)` with structured error handling:

**Pattern:**
- OLD: catch (err: any) { /* maybe log */ }
- NEW: catch (error) { structured logging + user feedback }

**Changes:**
- Added consistent error messages
- Improved console logging with context
- Better user-facing error displays
- Preparation for error tracking integration

**Files Updated:** 51
- API routes: 30
- Pages: 21

**Example:**
```diff
- catch (err: any) {
-   console.error(err)
- }
+ catch (error) {
+   const message = error instanceof Error ? error.message : String(error)
+   console.error('[admin-dashboard] Fetch failed:', message, { context })
+   setError(message)
+ }
```

**Verification:**
- Tested error scenarios: All show proper messages ✅
- Console logs: Structured with context ✅
- User experience: Errors clearly communicated ✅

Total files changed: 51
No behavior changes for success paths.
```

---

### **Phase P1C:**
```
refactor(admin): Phase P1C — Standardize timezone handling (UTC everywhere)

## Timezone Standardization

All admin timestamps now explicitly use UTC to prevent timezone confusion.

**Created:**
- src/lib/adminTime.ts (UTC utility functions)

**Changes:**
- Replaced 59 `toLocaleString()` calls with `formatAdminTimestamp()`
- Replaced 20 date comparisons with explicit UTC
- Added "UTC" suffix to all displayed timestamps
- Updated CSV exports to use ISO timestamps

**Impact:**
- Toronto admin sees same times as Vancouver admin ✅
- Suspension times accurate across timezones ✅
- Audit logs consistent globally ✅
- CSV exports timezone-neutral ✅

**Example:**
```diff
- {new Date(item.executed_at).toLocaleString()}
+ {formatAdminTimestamp(adminDate(item.executed_at))}
// Output: "2025-01-01 14:30:00 UTC" (was "1/1/2025, 2:30:00 PM" in local TZ)
```

**Verification:**
- All timestamps display UTC label ✅
- CSV exports use ISO format ✅
- Date comparisons timezone-explicit ✅

Total files changed: 40+
```

---

### **Phase P2:**
```
polish(admin): Phase P2 — CSV exports, constants, error messages

## P2A: CSV Export Excel Compatibility

- Added UTF-8 BOM for Excel French character support
- Updated Blob type to include charset
- Tested with é, à, ç, ô characters ✅

## P2B: Constants Centralization

Created src/config/adminConstants.ts:
- ADMIN_QUERY_CATEGORIES
- ADMIN_ROLE
- SESSION_STATUSES
- ERROR_MESSAGES

Replaced 15+ hardcoded strings with constants.

## P2C: Error Message Standardization

Standardized API error responses:
```json
{
  "error": "User-facing message",
  "code": "MACHINE_READABLE_CODE",
  "timestamp": "2025-01-01T14:30:00Z"
}
```

**Updated:** 30+ API routes

**Verification:**
- CSV opens correctly in Excel with French chars ✅
- All constants used consistently ✅
- Error messages clear and helpful ✅

Total files changed: 25-30
Pure polish, no breaking changes.
```

---

## Success Criteria

### **Phase P0 Success:**
- ✅ Privacy dashboard displays all metrics
- ✅ No active SQL injection vectors in admin surface
- ✅ 0 P0 security issues remain

### **Phase P1 Success:**
- ✅ 10 critical admin files have no `@ts-nocheck`
- ✅ `npx tsc --noEmit` shows 0 errors in updated files
- ✅ All errors logged with structured context
- ✅ All admin timestamps show "UTC" label
- ✅ CSV exports use ISO timestamps

### **Phase P2 Success:**
- ✅ CSV files open correctly in Excel (tested on Windows)
- ✅ French characters (é, à, ç) display correctly in exports
- ✅ All admin query categories use constants
- ✅ API errors follow standardized format
- ✅ Grep shows 0 hardcoded role strings

### **Overall Batch 4 Success:**
- ✅ 0 critical security issues
- ✅ 101 @ts-nocheck directives removed (phased)
- ✅ 51 error handlers improved
- ✅ 59+ timezone issues resolved
- ✅ 5 CSV exports Excel-compatible
- ✅ TypeScript compilation clean for admin surface
- ✅ All tests pass
- ✅ No behavior changes for existing functionality
- ✅ Comprehensive verification report created

---

## Dependencies & Prerequisites

**Required:**
- Node.js 18+
- Supabase CLI (for database introspection if needed)
- Database access (read-only sufficient)
- Admin test account

**Optional:**
- Sentry/error tracking account (for P1B error monitoring)
- Windows machine with Excel (for P2A CSV testing)

---

## Timeline

**Phase P0:** Day 1 (CRITICAL - immediate start after approval)
**Phase P1:** Days 2-4 (phased across P1A, P1B, P1C)
**Phase P2:** Days 5-6 (optional polish, can defer if needed)

**Total:** 4-6 days

---

## Next Steps

1. **User Review:** Review this plan, provide feedback
2. **Approval:** Explicit approval to proceed with Phase P0
3. **Execution:** Implement Phase P0 (1 day)
4. **Commit & Verify:** Create verification report for P0
5. **Phase P1 Approval:** Get approval for P1 after P0 success
6. **Iterate:** Repeat for P1 and P2

---

**Status:** 📋 **PLAN ONLY - AWAITING APPROVAL**

**Plan Author:** Claude (Batch 4 Planning Session)
**Plan Date:** 2025-01-01
**Next Action:** User approval to proceed with Phase P0
