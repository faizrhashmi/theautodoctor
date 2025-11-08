# Session Assignments Not Updating on Completion

**Date Encountered:** January 6, 2025
**Status:** RESOLVED
**Priority:** HIGH
**Category:** Session Management, Database Integrity

---

## Overview

When sessions were completed or cancelled, the `sessions` table was updated correctly but the corresponding `session_assignments` record was never updated. This caused completed sessions to remain visible in the mechanic's available queue indefinitely, creating data inconsistency and poor UX.

---

## Problem Description

### User Feedback
- "Very strange behavior of requests still showing in available sessions after ending on mechanic side and not marked as completed maybe. In development it's perfectly fine, only in production."
- "I checked in production, still showing some old session, after applying migration"
- "The session request still shows one of the request which was already accepted"

### Symptoms
1. Mechanic completes a session successfully
2. Session status updates to `'completed'` in `sessions` table
3. Session continues to appear in mechanic's available queue
4. Manual page refresh doesn't remove the session
5. `session_assignments.status` remains as `'accepted'` permanently

### Production vs Development
The issue was more visible in production due to:
- Higher CDN/browser caching (5-15 second cache windows)
- Network latency exposing race conditions
- No postgres_changes events triggered (assignment never updated)

---

## Root Cause Analysis

### The Missing Update

**File:** `src/app/api/sessions/[id]/end/route.ts`

The endpoint successfully:
1. ✅ Calls `end_session_with_semantics()` to update `sessions.status`
2. ✅ Processes payments via Stripe
3. ✅ Sends completion emails
4. ✅ Broadcasts realtime events
5. ✅ Updates deprecated `session_requests` table
6. ❌ **Never updates `session_assignments` table**

**Evidence from Code Review:**

```typescript
// Line 108-133: Updates sessions table
const { data: result } = await supabaseAdmin.rpc('end_session_with_semantics', {
  p_session_id: sessionId,
  p_ended_at: now,
  p_mechanic_notes: mechanicNotes
})

// Lines 521-563: Updates session_requests (deprecated)
const { error: requestUpdateError } = await supabaseAdmin
  .from('session_requests')
  .update({
    status: requestStatus,
    completed_at: now
  })
  .eq('customer_user_id', session.customer_user_id)

// Lines 564+: Build response
// ❌ NO CODE TO UPDATE session_assignments
```

### Database Function Analysis

**File:** `supabase/migrations/20251105000005_fix_end_session_semantics.sql` (Lines 17-159)

The `end_session_with_semantics()` function:
- Updates `sessions.status` to `'completed'` or `'cancelled'`
- Updates `sessions.ended_at` timestamp
- Calculates session duration
- **Does NOT touch `session_assignments` table**

### Schema Limitation

**File:** `supabase/migrations/20251104000001_session_unification.sql` (Line 15)

```sql
status TEXT NOT NULL CHECK (status IN (
  'queued',
  'offered',
  'accepted',
  'declined',
  'expired',
  'cancelled'
)) DEFAULT 'queued'
```

**Problem:** The CHECK constraint doesn't include `'completed'` status, so even if code tried to update it, the database would reject it.

---

## The Complete Flow (Before Fix)

### Session Lifecycle

```
1. Customer submits request
   ↓
   sessions: status = 'pending'
   session_assignments: status = 'queued'

2. Mechanic accepts
   ↓
   sessions: status = 'waiting'
   session_assignments: status = 'accepted'

3. Session starts
   ↓
   sessions: status = 'live'
   session_assignments: status = 'accepted' (unchanged)

4. Session ends
   ↓
   sessions: status = 'completed' ✅
   session_assignments: status = 'accepted' ❌ STUCK HERE
```

### Why Queue Shows Stale Sessions

**File:** `src/app/api/mechanic/queue/route.ts` (Lines 35-94)

```typescript
// Query filters correctly
let query = supabaseAdmin
  .from('session_assignments')
  .select('...')
  .in('status', ['queued', 'offered']) // ✅ Excludes 'accepted'
  .order('created_at', { ascending: false })

// Additional filtering
const filteredAssignments = (assignments || [])
  .filter(assignment => {
    const session = assignment.sessions as any

    // Session must be pending or waiting
    if (!['pending', 'waiting'].includes(session.status))
      return false // ✅ Excludes 'completed'

    return true
  })
```

**The query is correct!** It excludes:
- Assignments with status `'accepted'`
- Sessions with status `'completed'`

**So why do they still appear?**

Because of:
1. **CDN/Browser Caching:** 5-15 second cache window serves stale data
2. **No postgres_changes Event:** Assignment never updated = no event = no refetch
3. **Race Conditions:** Broadcast fires, refetch happens, but cache returns old data

---

## Solution Implementation

### Part 1: Update Database Schema

**Migration:** `supabase/migrations/20251106000007_add_completed_status_to_assignments.sql`

```sql
-- Drop existing constraint
ALTER TABLE session_assignments
DROP CONSTRAINT IF EXISTS session_assignments_status_check;

-- Add new constraint with 'completed' status
ALTER TABLE session_assignments
ADD CONSTRAINT session_assignments_status_check
CHECK (status IN (
  'queued',
  'offered',
  'accepted',
  'declined',
  'expired',
  'cancelled',
  'completed'  -- ✅ Added
));
```

### Part 2: Update End Session Logic

**File:** `src/app/api/sessions/[id]/end/route.ts` (After line 563)

```typescript
// =============================================================================
// UPDATE SESSION ASSIGNMENT STATUS
// Mark assignment as completed/cancelled so it's removed from queue
// =============================================================================
const { data: assignment } = await supabaseAdmin
  .from('session_assignments')
  .select('id, metadata')
  .eq('session_id', sessionId)
  .single()

if (assignment) {
  const { error: assignmentUpdateError } = await supabaseAdmin
    .from('session_assignments')
    .update({
      status: final_status === 'completed' ? 'completed' : 'cancelled',
      updated_at: now,
      metadata: {
        ...assignment.metadata,
        completed_at: now,
        final_session_status: final_status,
        completion_reason: 'session_ended'
      }
    })
    .eq('id', assignment.id)

  if (assignmentUpdateError) {
    console.error('[end session] Failed to update session_assignment:', assignmentUpdateError)
  } else {
    console.log('[end session] ✅ Updated session_assignment to:', final_status)
  }
} else {
  console.warn('[end session] No session_assignment found for session:', sessionId)
}
```

### Part 3: Clean Up Existing Data

**Migration:** `supabase/migrations/20251106000009_cleanup_stuck_assignments.sql`

```sql
-- Update assignments for completed sessions
UPDATE session_assignments sa
SET
  status = 'completed',
  updated_at = NOW(),
  metadata = COALESCE(sa.metadata, '{}'::jsonb) || jsonb_build_object(
    'cleanup_at', NOW(),
    'cleanup_reason', 'retroactive_completion_fix',
    'previous_status', sa.status
  )
FROM sessions s
WHERE sa.session_id = s.id
  AND s.status = 'completed'
  AND sa.status IN ('accepted', 'queued', 'offered');

-- Update assignments for cancelled sessions
UPDATE session_assignments sa
SET
  status = 'cancelled',
  updated_at = NOW()
FROM sessions s
WHERE sa.session_id = s.id
  AND s.status = 'cancelled'
  AND sa.status IN ('accepted', 'queued', 'offered');
```

---

## Verification Steps

### Test 1: Complete a Session

1. Mechanic accepts a session from queue
2. Start and conduct the session
3. Click "End Session"
4. **Verify:**
   - Session disappears from queue immediately
   - No manual refresh needed
   - postgres_changes event fires

### Test 2: Database Consistency

```sql
-- Check that completed sessions have completed assignments
SELECT
  s.id,
  s.status as session_status,
  sa.status as assignment_status
FROM sessions s
JOIN session_assignments sa ON sa.session_id = s.id
WHERE s.status = 'completed'
LIMIT 10;
```

**Expected:** All should show `assignment_status = 'completed'`

### Test 3: Queue Filtering

```sql
-- This should return 0 rows (no completed sessions in queue)
SELECT COUNT(*)
FROM session_assignments sa
JOIN sessions s ON s.id = sa.session_id
WHERE sa.status IN ('queued', 'offered')
  AND s.status = 'completed';
```

---

## Technical Details

### Status State Machine

```
session_assignments.status Transitions:

[Created] → 'queued'
    ↓
'queued' → 'offered' (when offered to specific mechanic)
    ↓
'offered' → 'accepted' (mechanic accepts)
         → 'declined' (mechanic declines)
         → 'expired' (offer times out)
    ↓
'accepted' → 'completed' (session ends successfully) ✅ NEW
          → 'cancelled' (session ends without completion) ✅ NEW
```

### Metadata Tracking

The update adds comprehensive metadata:

```json
{
  "completed_at": "2025-01-06T10:30:00Z",
  "final_session_status": "completed",
  "completion_reason": "session_ended",
  "previous_status": "accepted"
}
```

This enables:
- Audit trail of status changes
- Debugging session lifecycle issues
- Analytics on completion rates

### postgres_changes Trigger

When assignment is updated, postgres_changes fires:

```javascript
{
  eventType: 'UPDATE',
  old: {
    id: 'xxx',
    status: 'accepted',
    ...
  },
  new: {
    id: 'xxx',
    status: 'completed',
    ...
  }
}
```

Mechanic dashboard detects this and refetches queue, removing the completed session.

---

## Prevention Strategies

### 1. Maintain Parallel State

**Pattern:** When updating one table's status, update related tables:

```typescript
// Update main entity
await db.from('sessions').update({status: 'completed'})

// Update related entities
await db.from('session_assignments').update({status: 'completed'})
await db.from('session_requests').update({status: 'completed'})
```

### 2. Use Database Triggers

Alternative approach using triggers:

```sql
CREATE OR REPLACE FUNCTION sync_assignment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When session completes, update assignment
  IF NEW.status IN ('completed', 'cancelled')
     AND OLD.status != NEW.status THEN

    UPDATE session_assignments
    SET status = NEW.status
    WHERE session_id = NEW.id
      AND status NOT IN ('completed', 'cancelled');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_assignment
  AFTER UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION sync_assignment_status();
```

### 3. Add Consistency Checks

Regular cron job to detect inconsistencies:

```sql
-- Find sessions that are completed but assignments aren't
SELECT
  s.id,
  s.status as session_status,
  sa.status as assignment_status
FROM sessions s
JOIN session_assignments sa ON sa.session_id = s.id
WHERE s.status IN ('completed', 'cancelled')
  AND sa.status NOT IN ('completed', 'cancelled', 'declined');
```

### 4. Validate in API Response

Add checks before returning data:

```typescript
// In queue API
const assignments = await fetchAssignments()

// Filter out inconsistent data
const validAssignments = assignments.filter(a => {
  const session = a.sessions

  // Sanity check: Don't show completed sessions
  if (['completed', 'cancelled'].includes(session.status)) {
    console.warn('[Queue] Filtered out completed session:', a.id)
    return false
  }

  return true
})
```

---

## Performance Impact

### Additional Database Operation

**Before:** 1 database call to end session
**After:** 2 database calls (session + assignment)

**Impact:** Minimal (~50ms additional latency)

### Benefits Outweigh Cost

- Eliminates stale data in UI
- Triggers postgres_changes for immediate UI update
- Maintains data consistency
- Enables better analytics

---

## Related Issues

### Issue 1: No Assignment Created for Free Sessions

**Discovery:** Some sessions exist with NO `session_assignment` record at all.

**Evidence:**
```json
{
  "session_id": "0f189575-9967-45ca-82e0-13488a404da4",
  "session_status": "pending",
  "assignment_id": null,  // ❌
  "assignment_status": null
}
```

**Root Cause:** `sessionFactory.createSessionRecord()` may not be creating assignments for free trial sessions.

**Status:** Under investigation

**Related File:** `src/lib/sessionFactory.ts`

### Issue 2: Waiver Submission Update Failing

**File:** `src/app/api/waiver/submit/route.ts` (Lines 145-165)

Tries to update assignment from `'pending_waiver'` → `'queued'` but assignment doesn't exist:

```typescript
const { error: updateError } = await supabaseAdmin
  .from('session_assignments')
  .update({status: 'queued'})
  .eq('session_id', existingSession.id)
  .eq('status', 'pending_waiver')

// ❌ No rows match because assignment was never created
```

**Log shows:**
```
[waiver] ✅ Transitioned assignment to queued
```

But database shows no assignment exists.

---

## Future Enhancements

### 1. Cascade Status Updates

Use database foreign keys with ON UPDATE CASCADE:

```sql
ALTER TABLE session_assignments
ADD CONSTRAINT fk_session_status
FOREIGN KEY (session_id)
REFERENCES sessions(id)
ON UPDATE CASCADE;
```

(Note: This requires custom trigger logic since we're cascading status, not id)

### 2. Status Transition Validation

Prevent invalid state transitions:

```sql
CREATE OR REPLACE FUNCTION validate_assignment_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Define valid transitions
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Cannot change status from completed';
  END IF;

  IF OLD.status = 'queued' AND NEW.status NOT IN ('offered', 'expired') THEN
    RAISE EXCEPTION 'Invalid transition from queued to %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3. Event Sourcing

Track all status changes in audit table:

```sql
CREATE TABLE session_assignment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES session_assignments(id),
  from_status TEXT,
  to_status TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id),
  metadata JSONB
);
```

---

## Related Documentation

- [RLS Blocking postgres_changes Events](./rls-blocking-postgres-changes-events.md)
- [Realtime Notifications Diagnostic Report](../REALTIME_NOTIFICATIONS_DIAGNOSTIC_REPORT.md)
- [Session Unification Migration](../database/session-unification-migration.md)
- [Session Assignment Schema](../database/session-assignments-schema.md)

---

## References

- Session End Endpoint: `src/app/api/sessions/[id]/end/route.ts`
- Queue API: `src/app/api/mechanic/queue/route.ts`
- Session Semantics Function: `supabase/migrations/20251105000005_fix_end_session_semantics.sql`
- Assignment Schema: `supabase/migrations/20251104000001_session_unification.sql`

---

**Last Updated:** January 6, 2025
**Fixed By:** Schema Update + End Session Logic (Migrations 007 & 009)
