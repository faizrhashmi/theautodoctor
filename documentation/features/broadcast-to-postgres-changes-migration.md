# Broadcast to postgres_changes Migration Analysis

**Date Implemented:** October-November 2025
**Status:** PARTIALLY COMPLETE
**Priority:** HIGH
**Category:** Realtime Architecture, Notification System

---

## Overview

The system underwent a migration from Supabase broadcast channels to postgres_changes subscriptions for delivering realtime notifications to mechanics. The migration was motivated by reliability concerns on Render's serverless platform but was incompletely implemented, creating multiple failure modes.

---

## Migration Motivation

### Problems with Broadcast Channels

**File:** `src/app/mechanic/dashboard/page.tsx` (Line 561)

```typescript
// PHASE 3A: Removed broadcast channel - now using postgres_changes above
// postgres_changes is more reliable on Render (survives container restarts)
```

**Issues on Render:**
1. **Container Restarts:** Serverless containers restart frequently, breaking persistent connections
2. **Ephemeral Nature:** Broadcasts only received by currently connected clients
3. **No Persistence:** If mechanic offline when event fires, they never receive it
4. **Connection Drops:** Network issues cause missed notifications with no recovery

### Benefits of postgres_changes

1. **Persistent:** Based on database changes, not live connections
2. **Survives Restarts:** Events tied to data, not connection state
3. **Reliable:** Database is source of truth
4. **Queryable:** Can fetch missed events via API

---

## The Old System (Broadcast Channels)

### Architecture

```
Customer Request
      ↓
Session Created in Database
      ↓
Backend calls broadcastSessionRequest()
      ↓
Supabase Broadcast Channel: 'session_requests_feed'
      ↓
Mechanics Subscribed to Channel
      ↓
Instant Notification (< 1 second)
      ↓
onNewSessionRequest() → Toast/Audio/Browser Alert
```

### Implementation

**File:** `src/lib/realtimeChannels.ts` (Deprecated functions still present)

```typescript
export async function broadcastSessionRequest(
  event: 'new_request' | 'request_accepted' | 'request_cancelled',
  payload: any
) {
  const supabase = createClient()

  const { error } = await supabase
    .channel('session_requests_feed')
    .send({
      type: 'broadcast',
      event,
      payload
    })

  if (error) {
    console.error('[Broadcast] Failed:', error)
  }
}
```

**File:** `src/app/mechanic/dashboard/page.tsx` (Old code, now removed)

```typescript
// Subscribe to broadcasts
const channel = supabase
  .channel('session_requests_feed')
  .on('broadcast', {event: 'new_request'}, (payload) => {
    // Instant notification with complete data
    onNewSessionRequest({
      requestId: payload.requestId,
      customerName: payload.customerName,
      vehicle: payload.vehicle,
      concern: payload.concern
    }, flags)
  })
  .subscribe()
```

### Characteristics

| Aspect | Details |
|--------|---------|
| **Latency** | < 1 second |
| **Data Flow** | Push-based (server → client) |
| **Data Included** | Complete notification payload |
| **Reliability** | Low (ephemeral) |
| **Additional Fetches** | None needed |
| **Error Handling** | Simple (broadcast succeeds or fails) |

---

## The New System (postgres_changes)

### Architecture

```
Customer Request
      ↓
session_assignments Row INSERTED with status='queued'
      ↓
Supabase Realtime Server Detects Change
      ↓
RLS Policy Check for Each Subscribed Client
      ↓
postgres_changes Event Sent (if RLS allows)
      ↓
Dashboard Receives Event with session_id
      ↓
Fetch Session Details (+ Intake Data)
      ↓
onNewSessionRequest() → Toast/Audio/Browser Alert
```

### Implementation

**File:** `src/app/mechanic/dashboard/page.tsx` (Lines 451-543)

```typescript
const channel = supabase
  .channel('mechanic-dashboard-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'session_assignments',
  }, async (payload) => {
    const eventType = payload.eventType?.toUpperCase()

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      const newRecord = payload.new as any
      const oldRecord = payload.old as any

      // Only alert when status transitions TO 'queued'
      const isNewlyQueued = newRecord?.status === 'queued'
                         && oldRecord?.status !== 'queued'

      if (isNewlyQueued && flags.mech_new_request_alerts) {
        // Fetch session details
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('id, type, intake_id')
          .eq('id', newRecord.session_id)
          .single()

        if (sessionError) {
          console.error('[MechanicDashboard] Failed to fetch session:', sessionError)
          return // ❌ SILENT FAILURE
        }

        // Fetch intake details
        const { data: intake, error: intakeError } = await supabase
          .from('intakes')
          .select('name, concern, vehicle_make, vehicle_model, vehicle_year')
          .eq('id', session.intake_id)
          .single()

        if (intakeError) {
          console.error('[MechanicDashboard] Failed to fetch intake:', intakeError)
          return // ❌ SILENT FAILURE
        }

        // Finally trigger alert
        onNewSessionRequest({
          requestId: newRecord.id,
          customerName: intake.name || 'Customer',
          vehicle: `${intake.vehicle_year} ${intake.vehicle_make} ${intake.vehicle_model}`,
          concern: intake.concern || ''
        }, flags)
      }
    }
  })
  .subscribe()
```

### Characteristics

| Aspect | Details |
|--------|---------|
| **Latency** | 1-3 seconds (includes fetches) |
| **Data Flow** | Pull-based (client fetches after event) |
| **Data Included** | Only IDs, must fetch details |
| **Reliability** | High (database-backed) |
| **Additional Fetches** | 2 required (session + intake) |
| **Error Handling** | Complex (multiple failure points) |

---

## What Broke in Migration

### Issue 1: Backend Still Calls Deprecated Broadcast

**File:** `src/app/api/waiver/submit/route.ts` (Line 232)

```typescript
// Still calling OLD broadcast function
const { broadcastSessionRequest } = await import('@/lib/realtimeChannels')
await broadcastSessionRequest('new_request', { request: newRequest })
```

**Problem:** Broadcasts to `session_requests_feed` channel, but **nobody is listening** anymore.

**Impact:** Wasted server resources, confusing for developers

---

### Issue 2: Silent Failures in Data Fetching

**Multiple Failure Points:**

```typescript
// Failure Point 1: Session fetch fails
const { data: session, error: sessionError } = await supabase...
if (sessionError) {
  return // ❌ Alert dropped, no retry, no fallback
}

// Failure Point 2: Intake fetch fails
const { data: intake, error: intakeError } = await supabase...
if (intakeError) {
  return // ❌ Alert dropped, no retry, no fallback
}
```

**Why Fetches Fail:**
1. **Race Condition:** postgres_changes fires before transaction commits
2. **RLS Policy:** Client doesn't have permission to read intake
3. **Network Timeout:** Slow connection drops fetch
4. **Database Load:** Query times out under high load

**Result:** Mechanic sees nothing, has no idea a request came in

---

### Issue 3: Feature Flag Check Bypassed

**File:** `src/app/mechanic/dashboard/page.tsx` (Line 486-487)

```typescript
// TEMPORARY DEBUG: Always alert if newly queued (bypass flag check)
if (isNewlyQueued) {
  // Fires regardless of flags.mech_new_request_alerts
}
```

**Problem:**
- Debugging code left in production
- Admins can't disable alerts via feature flags
- Creates confusion about system behavior

**Fixed:** Re-enabled flag check
```typescript
if (isNewlyQueued && flags.mech_new_request_alerts) {
```

---

### Issue 4: Case Sensitivity Bug

**File:** `src/app/mechanic/dashboard/page.tsx` (Line 461)

**Problem:** Supabase returns lowercase event types but code checked uppercase

```typescript
// Before (never matches)
if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')

// After (works)
const eventType = payload.eventType?.toUpperCase()
if (eventType === 'INSERT' || eventType === 'UPDATE')
```

---

### Issue 5: No Error Handling in Alert Pipeline

**File:** `src/lib/newRequestAlerts.tsx`

```typescript
export function onNewSessionRequest(
  request: SessionRequest,
  flags: FeatureFlags
) {
  // TIER 1: Toast notification
  showNewRequestToast(request) // Can throw

  // TIER 2: Audio alert
  if (flags.mech_audio_alerts) {
    playNewRequestSound() // Can throw
  }

  // TIER 3: Browser notification
  if (flags.mech_browser_notifications) {
    showBrowserNotification(request) // Can throw if permission denied
  }

  // TIER 4: Visual indicators
  if (flags.mech_visual_indicators) {
    updateTabTitle(request) // Can throw
    flashFavicon() // Can throw
  }

  // ❌ No try-catch, any error breaks entire subscription
}
```

**Impact:** One failed alert tier crashes all future notifications

---

## Comparison Table

| Feature | Broadcast System | postgres_changes System |
|---------|------------------|------------------------|
| **Speed** | < 1 second | 1-3 seconds |
| **Reliability** | Low (ephemeral) | High (persistent) |
| **Data Freshness** | Immediate | Requires fetch |
| **Error Handling** | Simple | Complex |
| **Server Load** | Low | Higher (clients fetch data) |
| **RLS Impact** | None | Can block events |
| **Debugging** | Easy (clear events) | Hard (mixed with DB ops) |
| **Offline Support** | None | Via API polling |
| **Container Restarts** | Breaks connection | Survives restart |

---

## Recommended Hybrid Approach

### Option A: Dual Notification System

Use **both** broadcast and postgres_changes:

```typescript
// Backend: Send both
await broadcastSessionAssignment('new_request', payload) // Instant
await createAssignment({status: 'queued'}) // Reliable

// Frontend: Listen to both
.on('broadcast', {event: 'new_request'}, (payload) => {
  // Instant notification with complete data
  onNewSessionRequest(payload, flags)
})
.on('postgres_changes', {table: 'session_assignments'}, (payload) => {
  // Fallback if broadcast was missed
  if (!alreadyNotified(payload.new.id)) {
    fetchDetailsAndNotify(payload.new)
  }
})
```

**Benefits:**
- Speed of broadcasts (< 1s)
- Reliability of postgres_changes (survives restarts)
- Automatic recovery from missed broadcasts

---

### Option B: Complete postgres_changes with Improvements

If staying with postgres_changes only:

#### 1. Add Error Handling

```typescript
.on('postgres_changes', async (payload) => {
  try {
    const details = await fetchSessionDetails(payload.new.session_id)

    onNewSessionRequest(details, flags)
  } catch (err) {
    console.error('[Alert] Failed to fetch details:', err)

    // Fallback: Show basic alert
    onNewSessionRequest({
      requestId: payload.new.id,
      customerName: 'New Customer',
      vehicle: 'Vehicle',
      concern: 'New session request available'
    }, flags)

    // Trigger refetch to update queue
    refetchData()
  }
})
```

#### 2. Add Retry Logic

```typescript
async function fetchSessionDetails(sessionId, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const session = await supabase.from('sessions')...
      return session
    } catch (err) {
      if (i === retries - 1) throw err
      await sleep(Math.pow(2, i) * 100) // Exponential backoff
    }
  }
}
```

#### 3. Add Monitoring

```typescript
// Track alert delivery
window.gtag?.('event', 'mechanic_alert_attempted', {
  request_id: requestId,
  fetch_succeeded: !error,
  latency_ms: performance.now() - startTime
})
```

---

## Migration Completion Checklist

### Code Cleanup

- [ ] Remove deprecated `broadcastSessionRequest()` function
- [ ] Update waiver/submit to use `broadcastSessionAssignment()` or remove entirely
- [ ] Remove "TEMPORARY DEBUG" comments
- [ ] Add error handling to all fetch calls
- [ ] Add retry logic with exponential backoff

### Error Handling

- [ ] Wrap `onNewSessionRequest()` in try-catch
- [ ] Add fallback notifications for fetch failures
- [ ] Log all notification failures
- [ ] Add monitoring/alerting for high failure rates

### Testing

- [ ] Test with simulated network failures
- [ ] Test with RLS policies blocking fetches
- [ ] Test during high database load
- [ ] Test container restart scenarios
- [ ] Test with multiple mechanics subscribed

### Documentation

- [x] Document migration reasoning
- [x] Document failure modes
- [x] Create troubleshooting guide
- [ ] Update API documentation
- [ ] Add architecture diagrams

---

## Lessons Learned

### 1. Migrations Require Complete Implementation

**Problem:** Removed broadcast listeners but left broadcast calls in backend

**Lesson:** Create migration checklist covering:
- Client code changes
- Server code changes
- Database schema updates
- Cleanup of deprecated code
- Testing all paths

### 2. Silent Failures Are Dangerous

**Problem:** Fetch failures silently drop notifications

**Lesson:**
- Always log failures
- Provide fallback behavior
- Alert admins of high failure rates
- Never fail silently in user-facing features

### 3. Test Edge Cases

**Problem:** Race conditions between event and data availability

**Lesson:**
- Test with slow networks
- Test with transaction timing
- Test with RLS restrictions
- Test during high load

### 4. Feature Flags Should Always Work

**Problem:** Debug code bypassed feature flags

**Lesson:**
- Never bypass flags "temporarily"
- Use separate debug flags if needed
- Review code before production
- Test flag behavior

---

## Future Enhancements

### 1. Event Acknowledgment

Track which events were processed:

```typescript
const processedEvents = new Set()

.on('postgres_changes', (payload) => {
  const eventId = payload.commit_timestamp

  if (processedEvents.has(eventId)) {
    return // Already processed
  }

  processedEvents.add(eventId)
  // Process event...
})
```

### 2. Offline Queue

Store missed events while offline:

```typescript
if (!navigator.onLine) {
  // Store in IndexedDB
  await db.missedEvents.add(payload)
} else {
  processEvent(payload)
}

// On reconnect
window.addEventListener('online', async () => {
  const missed = await db.missedEvents.toArray()
  for (const event of missed) {
    processEvent(event)
    await db.missedEvents.delete(event.id)
  }
})
```

### 3. Health Monitoring

Track realtime system health:

```typescript
const metrics = {
  eventsReceived: 0,
  fetchFailures: 0,
  alertsDelivered: 0,
  avgLatency: 0
}

// Report to admin dashboard
setInterval(() => {
  if (metrics.fetchFailures > 10) {
    alertAdmin('High notification failure rate')
  }
}, 60000)
```

---

## Related Documentation

- [RLS Blocking postgres_changes Events](../troubleshooting/rls-blocking-postgres-changes-events.md)
- [Session Assignment Completion Fix](../troubleshooting/session-assignments-not-updating-on-completion.md)
- [Realtime Notifications Diagnostic Report](../REALTIME_NOTIFICATIONS_DIAGNOSTIC_REPORT.md)
- [New Request Alerts System](./new-request-alerts-system.md)

---

## References

- Broadcast Channels: `src/lib/realtimeChannels.ts`
- Dashboard Subscriptions: `src/app/mechanic/dashboard/page.tsx`
- Alert System: `src/lib/newRequestAlerts.tsx`
- Waiver Submission: `src/app/api/waiver/submit/route.ts`

---

**Last Updated:** January 6, 2025
**Migration Status:** Partially Complete - Requires Cleanup
