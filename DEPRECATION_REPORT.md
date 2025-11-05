# Deprecation Analysis Report
**Generated:** 2025-11-05
**Purpose:** Identify deprecated files, APIs, and database objects for cleanup

## Executive Summary
This report identifies all deprecated code and database objects after the session unification architecture migration.

---

## 1. Duplicate Session Creation Endpoints

### Current State
There are currently **TWO** endpoints that create sessions:

1. **`/api/intake/start` (POST)** - Original endpoint
   - Location: `src/app/api/intake/start/route.ts`
   - Used by: Intake page
   - Features:
     - Active session conflict detection (409)
     - Creates session + intake + assignment
     - Handles payment/credits
     - Returns redirect URL

2. **`/api/customer/sessions` (POST)** - New endpoint
   - Location: `src/app/api/customer/sessions/route.ts`
   - Used by: Not currently integrated
   - Features:
     - Active session conflict detection (409)
     - Creates session + intake
     - Logs session events
     - Returns session object

### Recommendation
**CONSOLIDATE:** Keep `/api/intake/start` as the ONLY session creation endpoint.
- It has more complete functionality (payment, assignment, redirect)
- Already integrated with intake page
- Already has 409 conflict handling
- Has proper error handling and rollback

**ACTION:**
- Remove the POST handler from `/api/customer/sessions/route.ts`
- Keep only the GET handler for listing sessions
- Update any future code to use `/api/intake/start`

---

## 2. Deprecated Component Files

### Already Deleted
✅ `src/components/customer/ActiveSessionsManager.tsx` - DELETED
✅ `src/components/mechanic/MechanicActiveSessionsManager.tsx` - DELETED

### Verification Needed
Check for any remaining imports/references to these components:

```bash
grep -r "ActiveSessionsManager" src/
grep -r "MechanicActiveSessionsManager" src/
```

---

## 3. API Endpoint Analysis

### Endpoints to Keep (New Architecture)
- ✅ `/api/customer/sessions/active` - Fetch active sessions for dashboard
- ✅ `/api/customer/sessions/[sessionId]/cancel` - Cancel session
- ✅ `/api/customer/sessions/[sessionId]/join` - Customer joins session
- ✅ `/api/customer/sessions/[sessionId]/end` - Customer ends session
- ✅ `/api/mechanic/queue` - Fetch mechanic queue
- ✅ `/api/mechanic/assignments/[id]/accept` - Accept assignment
- ✅ `/api/mechanic/sessions/[sessionId]/join` - Mechanic joins session
- ✅ `/api/mechanic/sessions/[sessionId]/end` - Mechanic ends session
- ✅ `/api/sessions/[sessionId]/summary` - Fetch session summary for cards
- ✅ `/api/sessions/[sessionId]/events` - Fetch session events
- ✅ `/api/sessions/[sessionId]/state` - Fetch session state
- ✅ `/api/sessions/[id]/end` - End session (shared)
- ✅ `/api/sessions/[id]/end-any` - End session alternative
- ✅ `/api/intake/start` - **KEEP as primary session creation endpoint**

### Endpoints to Review
- ❓ `/api/sessions/[id]/start` - May be redundant with intake/start
- ❓ `/api/mechanic/sessions/complete` - May be duplicate of end endpoints
- ❓ `/api/mechanics/requests` - May be duplicate of /api/mechanic/queue
- ❓ `/api/customer/sessions` (POST only) - REMOVE POST handler

---

## 4. Database Schema Analysis

### Tables in Use (New Architecture)
- ✅ `sessions` - Core session data
- ✅ `session_assignments` - Mechanic assignments
- ✅ `session_participants` - Track who's in session
- ✅ `session_devices` - Device enforcement
- ✅ `session_events` - Audit trail
- ✅ `intakes` - Customer intake data
- ✅ `mechanics` - Mechanic profiles
- ✅ `profiles` - User profiles

### Columns to Review
Need to verify if these columns are still used:
- `sessions.mechanic_id` - May be redundant with session_assignments
- `sessions.metadata` - Check what's stored here vs dedicated tables

### RPC Functions to Review
- ✅ `get_active_session_for_customer` - KEEP (used by intake/start)
- ❓ Other RPC functions - need to list and review

---

## 5. Component Dependencies

### Components Using Old Patterns
Need to search for and update:
- Components importing deleted ActiveSessionsManager
- Components using old session APIs
- Components not using SessionCard

```bash
# Find components not using SessionCard
find src/components -name "*.tsx" -exec grep -l "session" {} \; | xargs grep -L "SessionCard"

# Find components with hardcoded session status
grep -r "status.*===.*'pending'" src/components/
```

---

## 6. Action Items

### Priority 1: Critical Cleanup
1. [ ] Remove POST handler from `/api/customer/sessions/route.ts`
2. [ ] Verify no imports of deleted ActiveSessionsManager components
3. [ ] Document `/api/intake/start` as the canonical session creation endpoint

### Priority 2: Endpoint Consolidation
4. [ ] Audit `/api/sessions/[id]/start` - compare with `/api/intake/start`
5. [ ] Audit `/api/mechanic/sessions/complete` - compare with end endpoints
6. [ ] Audit `/api/mechanics/requests` - compare with `/api/mechanic/queue`
7. [ ] Remove or consolidate duplicate endpoints

### Priority 3: Database Cleanup
8. [ ] Review `sessions.mechanic_id` usage vs `session_assignments`
9. [ ] Review `sessions.metadata` contents
10. [ ] List all RPC functions and verify usage
11. [ ] Remove unused database objects

### Priority 4: Code Quality
12. [ ] Search for hardcoded session status strings
13. [ ] Search for direct database queries that should use new APIs
14. [ ] Update all session-related components to use SessionCard pattern

---

## 7. Testing Checklist

After cleanup, test:
- [ ] Session creation from intake (free plan)
- [ ] Session creation from intake (paid plan)
- [ ] 409 conflict modal appears correctly
- [ ] SessionCard displays on customer dashboard
- [ ] SessionCard displays in mechanic queue
- [ ] Mechanic can accept from queue
- [ ] Customer and mechanic can join
- [ ] Session end flows work
- [ ] Device enforcement works
- [ ] Session events are logged

---

## Next Steps

1. Run automated searches for remaining references
2. Create detailed file-by-file analysis
3. Execute cleanup in safe order (tests first, then code, then DB)
4. Verify with manual testing
5. Run full test suite
6. Deploy with rollback plan

