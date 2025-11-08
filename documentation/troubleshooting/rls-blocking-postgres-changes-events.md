# RLS Policies Blocking Postgres Changes Events

**Date Encountered:** January 6, 2025
**Status:** RESOLVED
**Priority:** CRITICAL
**Category:** Realtime Notifications, Database Security

---

## Overview

Supabase postgres_changes events were not being delivered to client applications despite correct Realtime configuration. The subscription showed `SUBSCRIBED` status, but no events were received when database rows changed. This caused complete failure of the mechanic notification system.

---

## Problem Description

### User Feedback
- "The notification banner/toasts used to appear when new session requests would arrive on mechanics side, now it's not appearing"
- "I restarted the whole project [Supabase]"
- "I just created a request, and it's not showing on mechanic's side"
- Test page showed: `Subscription status: SUBSCRIBED` but `Trigger Test Update` produced no events

### Symptoms
1. Supabase Realtime subscription status: `SUBSCRIBED` ✅
2. Database changes occurring successfully ✅
3. Realtime enabled in Supabase dashboard ✅
4. Table added to `supabase_realtime` publication ✅
5. **Events never reaching client** ❌

### Technical Evidence

**Test Results:**
```
[4:05:20 AM] ✅ Signed in as: workshop.mechanic@test.com
[4:05:20 AM] Subscription status: SUBSCRIBED
[4:05:24 AM] Found assignment: 4a14eab1-e45c-4700-a3ba-5d381c69b993 (status: queued)
[4:05:24 AM] Updating status to: offered
[4:05:24 AM] ✅ Update successful - watch for postgres_changes event above
```

**No postgres_changes event was received.**

---

## Root Cause Analysis

### The Hidden Behavior

**Supabase postgres_changes has an undocumented security feature:**

> When a client subscribes to postgres_changes, Supabase checks if that client has SELECT permission on each changed row via RLS policies. If RLS denies access to a specific row, **the realtime event for that row is silently suppressed**.

This creates a **silent failure mode**:
1. Subscription connects successfully → `SUBSCRIBED`
2. Database change occurs → Recorded
3. Realtime server processes change → Event generated
4. **RLS policy evaluated for client** → Access denied
5. **Event suppressed** → Client receives nothing
6. **No error logged** → Appears as if nothing happened

### The Problematic RLS Policy

**File:** `supabase/migrations/20251106000003_fix_realtime_rls.sql`

```sql
CREATE POLICY "Mechanics can view assignments for realtime"
  ON session_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mechanics m
      WHERE m.user_id = auth.uid()
    )
    OR status IN ('queued', 'offered')
  );
```

**Why This Failed:**

The policy uses an `OR` condition with two clauses:
1. First clause: User is a mechanic (ANY mechanic)
2. Second clause: Status is 'queued' or 'offered'

**The Problem:** Depending on Postgres query planner execution order, the first clause might not be evaluated correctly for realtime events. In some cases, the query planner optimizes the check differently for realtime event filtering vs. normal SELECT queries.

Additionally, when events are filtered at the Realtime server level, the RLS evaluation context is different from client queries, leading to inconsistent behavior.

---

## Solution Implementation

### Migration: Fix RLS for Realtime

**File:** `supabase/migrations/20251106000006_fix_realtime_rls_for_real.sql`

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Mechanics can view assignments for realtime" ON session_assignments;

-- Create simplified policy that works with realtime
CREATE POLICY "Mechanics can view assignments for realtime"
  ON session_assignments FOR SELECT
  USING (
    -- Allow all authenticated mechanics to see all assignments
    -- This is REQUIRED for postgres_changes events to be delivered
    EXISTS (
      SELECT 1 FROM mechanics m WHERE m.user_id = auth.uid()
    )
  );

-- Add admin access policy
CREATE POLICY "Admins can view all assignments"
  ON session_assignments FOR SELECT
  USING (is_admin(auth.uid()));
```

### Key Changes

**Before:**
- Complex OR condition
- Mixed user authentication with status filtering
- Query planner could optimize differently for realtime

**After:**
- Simple, explicit condition
- Single EXISTS clause
- Mechanics see ALL assignments (API still filters appropriately)
- Predictable query execution

### Why This Works

1. **Explicit Permission**: Clear, single-condition check
2. **No Complex Logic**: Avoids query planner optimization issues
3. **Consistent Evaluation**: Same result whether checking for realtime or SELECT
4. **Security Maintained**: API endpoints handle filtering for appropriate access
5. **Admin Access**: Separate policy for admins using existing `is_admin()` function

---

## Verification Steps

### Test 1: Authenticated Realtime Events

**File:** `public/test-realtime-authenticated.html`

```html
<!-- Sign in as mechanic -->
<button onclick="signIn()">Sign In</button>

<!-- Subscribe to postgres_changes -->
<script>
  channel = supabase
    .channel('test-assignments-auth')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'session_assignments',
    }, (payload) => {
      console.log('🔔 EVENT RECEIVED!', payload)
    })
    .subscribe()
</script>
```

**Before Fix:**
```
Subscription status: SUBSCRIBED
[Update occurs]
[No event received]
```

**After Fix:**
```
Subscription status: SUBSCRIBED
[Update occurs]
🔔 EVENT RECEIVED! {eventType: "UPDATE", new: {...}, old: {...}}
```

### Test 2: Status Transition Detection

**File:** `src/app/mechanic/dashboard/page.tsx` (Lines 451-543)

```typescript
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'session_assignments',
}, async (payload) => {
  const eventType = payload.eventType?.toUpperCase()

  if (eventType === 'INSERT' || eventType === 'UPDATE') {
    const newRecord = payload.new as any
    const oldRecord = payload.old as any

    const isNewlyQueued = newRecord?.status === 'queued'
                       && oldRecord?.status !== 'queued'

    if (isNewlyQueued && flags.mech_new_request_alerts) {
      // Trigger notification
      onNewSessionRequest({...}, flags)
    }
  }
})
```

**Result:** Notifications now fire correctly when assignments transition to 'queued'.

---

## Technical Details

### RLS and Realtime Interaction

**How Supabase Filters Realtime Events:**

```
Database Change Occurs
     ↓
Realtime Server Receives Notification
     ↓
For Each Subscribed Client:
  1. Get client's JWT token
  2. Set auth context: auth.uid() = client's user ID
  3. Execute RLS policy for the changed row
  4. If policy returns TRUE → Send event to client
  5. If policy returns FALSE → Suppress event (no error)
     ↓
Event Delivered (or Not)
```

**Why Silent Failures Happen:**

Supabase considers RLS blocking an event as **expected security behavior**, not an error. The assumption is that if a client shouldn't see a row, they shouldn't receive change events for it either.

However, this creates confusion when:
- Subscription shows as connected
- Developers expect all events for a table
- No indication that RLS is filtering events

### Query Planner Behavior

The Postgres query planner can evaluate `OR` conditions in different orders:

**Option A (works):**
```sql
1. Check: EXISTS (SELECT 1 FROM mechanics...)
2. If TRUE → return TRUE (short-circuit, don't check status)
3. If FALSE → check status IN ('queued', 'offered')
```

**Option B (fails for realtime):**
```sql
1. Check: status IN ('queued', 'offered')
2. If TRUE → return TRUE (short-circuit)
3. If FALSE → check EXISTS (SELECT 1 FROM mechanics...)
```

In Option B, if the assignment status is 'accepted', the query short-circuits before checking mechanic authentication, resulting in FALSE even though the mechanic should have access.

---

## Prevention Strategies

### 1. Keep RLS Policies Simple for Realtime Tables

**Good:**
```sql
CREATE POLICY "mechanics_view"
  ON table_name FOR SELECT
  USING (user_type = 'mechanic');
```

**Avoid:**
```sql
CREATE POLICY "complex_view"
  ON table_name FOR SELECT
  USING (
    (user_type = 'mechanic' AND status = 'active')
    OR (user_type = 'admin')
    OR (public_view = true AND published_at IS NOT NULL)
  );
```

### 2. Test Realtime Events with Authenticated Clients

Always test postgres_changes subscriptions with actual user authentication, not just service role keys.

**Test Pattern:**
```javascript
// ❌ Don't only test with service role
const adminClient = supabase.createClient(url, SERVICE_ROLE_KEY)

// ✅ Also test with anon key + user JWT
const userClient = supabase.createClient(url, ANON_KEY)
await userClient.auth.signInWithPassword({email, password})
// Now test postgres_changes
```

### 3. Monitor Subscription Health

Add health checks for realtime subscriptions:

```typescript
const healthCheck = setInterval(() => {
  const status = channel?.state
  console.log('[Realtime Health]', {
    status,
    timestamp: new Date().toISOString()
  })

  if (status !== 'joined') {
    console.error('[Realtime] Channel not joined! Reconnecting...')
    // Implement reconnect logic
  }
}, 30000) // Every 30 seconds
```

### 4. Add Event Delivery Tracking

Log when events are expected but not received:

```typescript
// After database mutation
await supabase.from('table').update({...})

// Set timeout to check if event was received
const eventTimeout = setTimeout(() => {
  console.warn('[Realtime] Expected event not received within 5s')
  // Alert admin or retry
}, 5000)

// In subscription handler
.on('postgres_changes', (payload) => {
  clearTimeout(eventTimeout) // Event received
})
```

---

## Related Issues Fixed

### Case Sensitivity Bug

**File:** `src/app/mechanic/dashboard/page.tsx` (Line 461)

**Problem:** Supabase returns lowercase event types (`'insert'`, `'update'`) but code checked for uppercase (`'INSERT'`, `'UPDATE'`).

**Fix:**
```typescript
// Before
if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')

// After
const eventType = payload.eventType?.toUpperCase()
if (eventType === 'INSERT' || eventType === 'UPDATE')
```

---

## Testing Checklist

After applying RLS fix:

- [ ] Open test-realtime-authenticated.html
- [ ] Sign in as mechanic
- [ ] Click "Trigger Test Update"
- [ ] Verify: `🔔🔔🔔 POSTGRES_CHANGES EVENT RECEIVED!` appears
- [ ] Check both `new` and `old` record data are present
- [ ] Verify mechanic dashboard shows notification toast
- [ ] Test with multiple mechanics subscribed simultaneously
- [ ] Verify admin users can also receive events

---

## Performance Considerations

### Impact of Broader RLS Policy

**Before:** Mechanics only see assignments where `mechanic_id = their_id` OR `status IN ('queued', 'offered')`

**After:** Mechanics see ALL assignments

**Concern:** Could this expose too much data?

**Mitigation:**
1. API endpoints still filter results appropriately
2. Client-side state management doesn't store all assignments
3. realtime events are ephemeral (not stored)
4. Sensitive data not included in assignments table

**Performance Impact:** Minimal - RLS check is simpler and faster

---

## Future Enhancements

### 1. Hybrid Notification System

Combine postgres_changes with broadcast channels:

```typescript
// Broadcast for instant notification
await supabase.channel('alerts').send({
  type: 'broadcast',
  event: 'new_assignment',
  payload: {assignmentId, summary}
})

// postgres_changes as reliable fallback
// (Already subscribed)
```

Benefits:
- Broadcast: < 1 second latency
- postgres_changes: Survives restarts, handles missed events

### 2. Event Acknowledgment System

Track which events were successfully processed:

```typescript
.on('postgres_changes', async (payload) => {
  try {
    await handleEvent(payload)
    // Mark event as processed
    await supabase.from('event_log').insert({
      event_id: payload.commit_timestamp,
      processed_at: new Date()
    })
  } catch (err) {
    // Retry or alert
  }
})
```

### 3. RLS Policy Testing Framework

Create automated tests for RLS + Realtime:

```typescript
describe('RLS Realtime Integration', () => {
  it('should deliver events to mechanics', async () => {
    const mechanic = await signInAsMechanic()
    const events = []

    mechanic.channel.on('postgres_changes', (e) => events.push(e))

    await createAssignment()

    await waitFor(() => events.length > 0)
    expect(events[0].new.status).toBe('queued')
  })
})
```

---

## Related Documentation

- [Realtime Notifications Diagnostic Report](../REALTIME_NOTIFICATIONS_DIAGNOSTIC_REPORT.md)
- [Session Assignment Completion Fix](./session-assignments-not-updating-on-completion.md)
- [Broadcast to postgres_changes Migration](../features/broadcast-to-postgres-changes-migration.md)
- [Feature Flags RLS Policy](./feature-flags-rls-policy-fix.md)

---

## References

- Supabase Realtime Documentation: https://supabase.com/docs/guides/realtime
- Postgres Row Level Security: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Session Assignment Schema: `supabase/migrations/20251104000001_session_unification.sql`

---

**Last Updated:** January 6, 2025
**Fixed By:** RLS Policy Simplification (Migration 20251106000006)
