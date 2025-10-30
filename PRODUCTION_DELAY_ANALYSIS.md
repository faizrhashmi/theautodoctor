# Production 10-Minute Delay Analysis

## Issue
Session requests take ~10 minutes to appear in mechanic dashboard in production (Render), but work instantly in development (localhost).

## Root Cause Analysis

### 1. Broadcast Channel Race Condition
**File**: `src/lib/sessionRequests.ts:22-49`

The `broadcastSessionRequest` function has a problematic pattern:
```typescript
const channel = supabaseAdmin.channel('session_requests_feed')
await channel.subscribe() // Wait for subscription
await channel.send({ type: 'broadcast', event, payload }) // Send immediately
await channel.unsubscribe() // Unsubscribe immediately
supabaseAdmin.removeChannel(channel) // Remove immediately
```

**Problem**: The channel is unsubscribed and removed immediately after sending. In production environments with network latency, the broadcast may not fully propagate to all listeners before the channel is destroyed.

**Why it works in localhost**: Zero network latency means broadcasts propagate instantly before unsubscribe.

### 2. Multiple Overlapping Subscriptions
**File**: `src/app/mechanic/dashboard/page.tsx`

The dashboard has 4 different real-time subscription mechanisms:
1. **Lines 84-98**: `mechanic:lobby` - Broadcast channel listening for new_request/cancelled/accepted
2. **Lines 100-110**: `sr-changes` - Postgres changes on session_requests table
3. **Lines 409-449**: `mechanic-dashboard-updates` - Postgres changes on sessions/session_requests/quotes
4. **Lines 452-481**: `session_requests_feed` - Broadcast channel for new_request/cancelled/accepted

**Problem**: Redundant subscriptions may cause confusion. If broadcast fails, postgres_changes should be the fallback, but there are TWO separate postgres_changes subscriptions that might conflict.

### 3. Subscription Timing
The dashboard sets up subscriptions AFTER authentication completes (line 366):
```typescript
if (checkingTier || !supabase || !isAuthenticated) return
```

If the customer creates a session_request BEFORE the mechanic's dashboard finishes auth, the broadcast is missed entirely.

### 4. Why it Eventually Shows After 10 Minutes

The dashboard has multiple fallback mechanisms:
- **Line 112-116**: Window focus handler - refetches on focus
- **Lines 100-110**: Postgres changes listener - triggers on INSERT to session_requests

The postgres_changes subscription is more reliable than broadcasts because it doesn't depend on ephemeral channels. The 10-minute delay suggests:
- Broadcast channels are failing in production
- Postgres changes subscription eventually triggers (possibly on next database event or heartbeat)
- OR mechanic refreshed/focused the window after 10 minutes

## Solutions

### Solution 1: Use Long-Lived Broadcast Channels (Recommended)
Instead of creating/destroying channels for each broadcast, maintain a persistent channel.

**Create**: `src/lib/realtimeChannels.ts`
```typescript
import { supabaseAdmin } from './supabaseAdmin'

// Persistent channel for broadcasting session request updates
let sessionRequestsChannel: any = null

export async function getSessionRequestsChannel() {
  if (!sessionRequestsChannel) {
    sessionRequestsChannel = supabaseAdmin.channel('session_requests_feed')

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Channel subscription timeout')), 5000)

      sessionRequestsChannel.subscribe((status: string, err: any) => {
        clearTimeout(timeout)
        if (status === 'SUBSCRIBED') {
          console.log('[RealtimeChannels] session_requests_feed channel ready')
          resolve()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(err || new Error(`Channel subscription failed: ${status}`))
        }
      })
    })
  }

  return sessionRequestsChannel
}

export async function broadcastSessionRequest(
  event: 'new_request' | 'request_accepted' | 'request_cancelled',
  payload: Record<string, unknown>
) {
  try {
    const channel = await getSessionRequestsChannel()

    console.log(`[RealtimeChannels] Broadcasting ${event}:`, payload)

    await channel.send({
      type: 'broadcast',
      event,
      payload,
    })

    console.log(`[RealtimeChannels] Successfully broadcasted ${event}`)
  } catch (error) {
    console.error(`[RealtimeChannels] Failed to broadcast ${event}:`, error)
    // Don't throw - this shouldn't fail the main operation
  }
}
```

### Solution 2: Add Retry Logic to Broadcasts
```typescript
async function broadcastWithRetry(event: string, payload: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await broadcastSessionRequest(event, payload)
      return // Success
    } catch (error) {
      console.warn(`[Broadcast] Attempt ${i + 1}/${retries} failed:`, error)
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }
  console.error(`[Broadcast] All ${retries} attempts failed`)
}
```

### Solution 3: Consolidate Dashboard Subscriptions
Remove redundant subscriptions, keep only:
1. ONE postgres_changes subscription for all tables
2. ONE broadcast subscription for instant updates

### Solution 4: Add Production Monitoring
Add logging to track:
- When broadcasts are sent (waiver/submit/route.ts)
- When broadcasts are received (dashboard page.tsx)
- Subscription status (SUBSCRIBED, CHANNEL_ERROR, TIMED_OUT)

## Recommended Implementation Order

1. **Immediate**: Add logging to production to confirm broadcasts are being sent
2. **Short-term**: Implement Solution 1 (persistent channels)
3. **Medium-term**: Consolidate dashboard subscriptions (Solution 3)
4. **Long-term**: Add comprehensive monitoring (Solution 4)

## Testing Plan

1. Deploy diagnostic endpoint to production
2. Create test session request and monitor:
   - Server logs (Render) - check if broadcast is sent
   - Browser console (mechanic dashboard) - check if broadcast is received
   - Supabase dashboard - check real-time connections
3. Measure time from request creation to dashboard update
4. If still delayed, check Supabase real-time metrics for connection issues

## Alternative: Polling Fallback
If real-time continues to be unreliable in production, add a polling mechanism:
```typescript
// Poll every 30 seconds for new requests
useEffect(() => {
  const interval = setInterval(() => {
    fetch('/api/mechanics/requests?status=pending')
      .then(res => res.json())
      .then(data => setPendingRequests(data.requests || []))
  }, 30000)

  return () => clearInterval(interval)
}, [])
```
