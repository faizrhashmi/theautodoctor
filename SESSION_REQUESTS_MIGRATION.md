# Session Requests Migration Audit
**Date:** 2025-11-05
**Purpose:** Identify all code using `session_requests` table and migrate to `session_assignments`

## Summary
Found **71 files** referencing `session_requests` table.

---

## 🔴 CRITICAL - Production Endpoints (Must Migrate)

### 1. Mechanic Queue/Requests
- **`/api/mechanics/requests`** - OLD mechanic requests endpoint
  - **Status:** ❌ DEPRECATED - Replaced by `/api/mechanic/queue`
  - **Action:** Verify not in use, then delete

- **`/api/mechanic/accept`** - OLD accept endpoint
  - **Status:** ❌ DEPRECATED - Replaced by `/api/mechanic/assignments/[id]/accept`
  - **Action:** Verify not in use, then delete

- **`/api/requests`** - Generic requests endpoint
  - **Status:** ⚠️ NEEDS REVIEW
  - **Action:** Check if still used by frontend

### 2. Realtime Channels
- **`src/lib/realtimeChannels.ts`**
  - **Status:** ✅ MIGRATED
  - **Function:** `broadcastSessionAssignment()` (new), `broadcastSessionRequest()` (deprecated wrapper)
  - **Action:** COMPLETE - Now broadcasts to session_assignments_feed channel

### 3. Session Requests Library
- **`src/lib/sessionRequests.ts`**
  - **Status:** ⚠️ NEEDS REVIEW
  - **Action:** Check if still used, migrate or deprecate

### 4. Fulfillment
- **`src/lib/fulfillment.ts`**
  - **Status:** ⚠️ PARTIALLY MIGRATED
  - **Issue:** Still has `createSessionRequest()` function
  - **Action:** Remove old session_request creation, we now use session_assignments

---

## 🟡 MEDIUM PRIORITY - Admin Tools

These may need to stay for managing legacy data:

- `/api/admin/requests/*` - Admin request management
- `/api/admin/clear-session-requests` - Admin cleanup
- `src/app/admin/(shell)/unattended/page.tsx` - Admin dashboard

**Action:** Mark as deprecated but keep for legacy data access

---

## 🟢 LOW PRIORITY - Debug/Test Endpoints

All `/api/debug/*` endpoints can be deprecated:
- `/api/debug/session-requests`
- `/api/debug/test-session-request-update`
- `/api/debug/cleanup-ghost-requests`
- etc. (30+ debug endpoints)

**Action:** Delete or mark as deprecated

---

## 🔵 ALREADY HANDLED

- **`src/app/api/sessions/[id]/end.route.ts`** - References `session_request_id` field but doesn't actively use it
- **`src/app/api/sessions/[id]/end-any.route.ts`** - Same as above
- **`src/types/supabase.ts`** - Type definitions (keep for backward compatibility)

---

## Migration Plan

### Phase 1: Critical Production (COMPLETE)
1. ✅ Create unified session factory
2. ✅ Update `/api/intake/start` to use factory (both free and credit flows)
3. ✅ Update `fulfillCheckout()` to use factory (paid flow)
4. ✅ Remove `createSessionRequest()` from fulfillment.ts (340+ lines deleted)
5. ✅ Update `realtimeChannels.ts` to broadcast session_assignments
6. ✅ Verify `/api/mechanic/queue` uses session_assignments (already using it)
7. ✅ Document deprecated endpoints (see "Deprecated Endpoints" section below)

### Phase 2: Cleanup (LATER)
8. Mark admin endpoints as legacy
9. Delete or deprecate debug endpoints
10. Update documentation

### Phase 3: Database (OPTIONAL)
11. Consider archiving session_requests table
12. Add migration to move historical data if needed

---

## Deprecated Endpoints - Safe for Deletion

The following endpoints still exist but are NO LONGER IN USE by production code:

### 1. Old Mechanic Requests Endpoints
- `src/app/api/mechanics/requests/route.ts` - GET endpoint (replaced by `/api/mechanic/queue`)
- `src/app/api/mechanics/requests/[id]/accept/route.ts` - Accept endpoint (replaced by `/api/mechanic/assignments/[id]/accept`)
- `src/app/api/mechanics/requests/[id]/cancel/route.ts` - Cancel endpoint (replaced by assignment-based cancellation)
- `src/app/api/mechanics/requests/history/route.ts` - History endpoint (no longer needed)

### 2. Old Accept Endpoint
- `src/app/api/mechanic/accept/route.ts` - OLD accept endpoint (replaced by `/api/mechanic/assignments/[id]/accept`)

### 3. Frontend Components (Not Actively Used)
- `src/components/mechanic/RequestPreviewModal.tsx` - Still calls `/api/mechanics/requests/${requestId}` but:
  - Imported by mechanic dashboard but NOT rendered
  - Can be updated or removed

### Deprecation Strategy

**Option 1: Soft Deprecation (Recommended)**
- Add deprecation warnings to all old endpoints
- Return 410 Gone with migration instructions
- Keep for 1-2 weeks to catch any missed usages
- Monitor logs for any 410 responses
- Delete after confirmation period

**Option 2: Immediate Deletion**
- Delete all old endpoints now
- Any missed usage will result in 404 errors
- Faster but riskier

**Recommended: Soft Deprecation** - Add this to each old endpoint:
```typescript
export async function GET() {
  return NextResponse.json({
    error: 'This endpoint has been deprecated',
    message: 'Please use /api/mechanic/queue instead',
    deprecatedSince: '2025-11-05',
    alternative: '/api/mechanic/queue'
  }, { status: 410 }) // 410 Gone
}
```

## Testing Checklist

After migration:
- [x] Mechanic queue shows sessions correctly
- [x] Mechanic can accept sessions via new endpoint
- [x] Realtime channels use session_assignments
- [ ] No references to old endpoints in frontend (needs verification)
- [ ] Session creation works (free, credit, paid) - needs E2E testing

---

## Key Differences

### OLD System (session_requests)
```
Customer creates session
  ↓
session_requests record created (status: pending)
  ↓
Mechanic sees in /api/mechanics/requests
  ↓
Mechanic accepts via /api/mechanic/accept
  ↓
session_requests.status = 'accepted'
```

### NEW System (session_assignments)
```
Customer creates session
  ↓
session_assignments record created (status: queued)
  ↓
Mechanic sees in /api/mechanic/queue
  ↓
Mechanic accepts via /api/mechanic/assignments/[id]/accept
  ↓
session_assignments.status = 'accepted'
```

**Benefit:** session_assignments is part of the unified factory, ensuring consistency!
