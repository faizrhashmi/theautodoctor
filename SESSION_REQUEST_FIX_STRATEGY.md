# SESSION REQUEST FIX STRATEGY

## Problem Statement

**User Complaint:** "I accepted a request from the customer, but now can't find it anywhere in mechanic dashboard."

**Session ID:** `e8762f53-5137-44ee-b8ef-09c9a01b1c5f`

## Root Cause Analysis

### Investigation Findings

1. **Session exists** with status=`waiting` BUT **mechanic_id=null**
2. **Session_request exists** (ID: `eaa411bc-fca0-4c69-b5ce-7f66866c2274`) with:
   - status=`accepted`
   - mechanic_id=`1daec681-04cf-4640-9b98-d5369361e366`
   - **parent_session_id=null** ❌

3. **The Problem:** Session and session_request are NOT linked!

### The Broken Flow

```
Customer submits intake
    ↓
Creates session (id: e8762f53...)
    ↓
Creates session_request (id: eaa411bc...)
    ❌ BUT parent_session_id is NOT set!
    ↓
Mechanic accepts request
    ↓
Updates session_request: status='accepted', mechanic_id='1daec681...'
    ↓
Tries to update session using parent_session_id
    ❌ parent_session_id is null, so skips session update!
    ↓
RESULT: Session has no mechanic_id
    ↓
Mechanic dashboard queries sessions WHERE mechanic_id = current_mechanic
    ❌ Returns empty because mechanic_id is null!
```

## The Fix Strategy

### Phase 1: Fix the Link (CRITICAL - Do First)

**File:** `src/app/api/intake/start/route.ts`

**Current Code:**
```typescript
// Creates session
const session = await createSession(...)

// Creates session_request
const request = await createSessionRequest({
  customer_id,
  session_type,
  plan_code,
  // ❌ parent_session_id is NOT set here!
})
```

**Fixed Code:**
```typescript
// Creates session
const session = await createSession(...)

// Creates session_request WITH parent_session_id
const request = await createSessionRequest({
  customer_id,
  session_type,
  plan_code,
  parent_session_id: session.id,  // ✅ LINK THEM!
})
```

### Phase 2: Fix Accept Endpoint (Fallback)

**File:** `src/app/api/mechanic/accept/route.ts` (Line 159)

**Current Code:**
```typescript
const existingSessionId = request.parent_session_id || null

if (existingSessionId) {
  // Update session
} else {
  // ❌ Creates NEW session (wrong!)
}
```

**Fixed Code:**
```typescript
let existingSessionId = request.parent_session_id

// FALLBACK: If parent_session_id is null, find session by customer + time
if (!existingSessionId) {
  const { data: matchingSession } = await supabaseAdmin
    .from('sessions')
    .select('id')
    .eq('customer_user_id', request.customer_id)
    .eq('type', request.session_type)
    .eq('status', 'pending')
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Within 5 mins
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  existingSessionId = matchingSession?.id || null
}

if (existingSessionId) {
  // Update session with mechanic_id
  await supabaseAdmin
    .from('sessions')
    .update({
      mechanic_id: mechanic.id,
      status: 'waiting'
    })
    .eq('id', existingSessionId)
} else {
  // Only create new session if really no match found
}
```

### Phase 3: Unified Mechanic Dashboard

**Current Problem:** Dashboard only shows:
- Pending session_requests (for accepting)
- Active sessions where mechanic_id = current_mechanic

**Missing:**
- Sessions in 'waiting' status that were just accepted
- Completed sessions for viewing intake details
- Cancelled sessions for history

**Solution:** Create tabbed interface showing ALL data

**File:** `src/app/mechanic/dashboard/page.tsx`

**New Structure:**
```typescript
<Tabs>
  <Tab name="Incoming Requests">
    {/* Shows session_requests with status='pending' */}
    - Customer name
    - Session type
    - Plan
    - [Accept Button]
  </Tab>

  <Tab name="Active Sessions">
    {/* Shows sessions WHERE mechanic_id = current AND status IN ('waiting', 'live') */}
    - Session ID
    - Customer name
    - Status
    - Type
    - [Join Session Button]
  </Tab>

  <Tab name="Completed">
    {/* Shows sessions WHERE mechanic_id = current AND status = 'completed' */}
    - Session ID
    - Customer name
    - Completed date
    - Rating
    - [View Intake Details Button]
    - [View Session Summary Button]
  </Tab>

  <Tab name="History">
    {/* Shows ALL session_requests for this mechanic (accepted + cancelled) */}
    - Request ID
    - Status
    - Accepted/Cancelled date
    - Linked session (if exists)
  </Tab>
</Tabs>
```

### Phase 4: Database View for Easy Querying

**Create a Supabase view:**

```sql
CREATE VIEW mechanic_session_overview AS
SELECT
  sr.id as request_id,
  sr.status as request_status,
  sr.mechanic_id,
  sr.customer_id,
  sr.customer_name,
  sr.session_type,
  sr.plan_code,
  sr.created_at as request_created_at,
  sr.accepted_at,
  sr.parent_session_id,
  s.id as session_id,
  s.status as session_status,
  s.started_at,
  s.ended_at,
  s.rating,
  s.intake_id,
  i.vehicle_info,
  i.issue_description
FROM session_requests sr
LEFT JOIN sessions s ON s.id = sr.parent_session_id
LEFT JOIN intakes i ON i.id = s.intake_id
WHERE sr.mechanic_id IS NOT NULL
ORDER BY sr.created_at DESC;
```

**Usage in API:**
```typescript
// Get all sessions for mechanic
const { data } = await supabase
  .from('mechanic_session_overview')
  .select('*')
  .eq('mechanic_id', currentMechanicId)
```

## Implementation Order

### Immediate (Now):

1. ✅ **Fix intake flow** to set parent_session_id
2. ✅ **Fix accept endpoint** with fallback session matching
3. ✅ **Fix existing orphaned session** e8762f53-5137-44ee-b8ef-09c9a01b1c5f

### Short Term (Next):

4. **Create unified dashboard** with tabs
5. **Add "View Intake" button** for completed sessions
6. **Add proper error handling** for missing sessions

### Long Term (Later):

7. **Create database view** for simplified querying
8. **Add real-time updates** when sessions change status
9. **Add notifications** for new requests

## Quick Fix for Current Orphaned Session

Run this SQL in Supabase:

```sql
-- Update the orphaned session to assign it to the mechanic who accepted it
UPDATE sessions
SET mechanic_id = '1daec681-04cf-4640-9b98-d5369361e366'
WHERE id = 'e8762f53-5137-44ee-b8ef-09c9a01b1c5f';

-- Link the session_request to the session
UPDATE session_requests
SET parent_session_id = 'e8762f53-5137-44ee-b8ef-09c9a01b1c5f'
WHERE id = 'eaa411bc-fca0-4c69-b5ce-7f66866c2274';
```

After running this, the mechanic will see the session in their dashboard!

## Testing Checklist

- [ ] Customer creates intake → session + session_request both created with parent_session_id set
- [ ] Mechanic sees request in "Incoming Requests"
- [ ] Mechanic accepts request → session gets mechanic_id and status='waiting'
- [ ] Mechanic sees session in "Active Sessions" immediately after accepting
- [ ] Mechanic can join the session from dashboard
- [ ] After completing session, it appears in "Completed" tab
- [ ] Mechanic can view intake details from completed session
- [ ] All transitions happen atomically (no orphaned sessions)

## Success Metrics

- **Zero orphaned sessions** (sessions without mechanic_id after being accepted)
- **100% visibility** (mechanic can always find their accepted sessions)
- **Clear status flow** (pending request → accepted request → waiting session → live session → completed session)
- **No user complaints** about missing sessions

---

**Status:** Ready to implement
**Priority:** CRITICAL
**Estimated Time:** 2-3 hours for full implementation
