# Favorites System - Full Implementation Guide

## Overview

This document outlines the complete implementation of the Favorites Rebooking System with Real-Time Availability Checks.

---

## 🎯 Core Features

### 1. Smart Priority Broadcast
- Favorite mechanic gets FIRST notification (5-10 minute priority window)
- If no response → Auto-fallback to broadcast matching (existing system)
- Zero booking failures → Reliability guaranteed

### 2. Real-Time Availability Notifications
- **Before** booking: Check if favorite mechanic is online
- Show instant status: "Available Now" vs "Currently Offline"
- Customer decides: Wait for favorite OR broadcast immediately

### 3. Seamless Integration
- Works with existing broadcast matching system
- No disruption to current fulfillment logic
- Backwards compatible with non-favorite bookings

---

## 📋 Complete User Flow

### Scenario 1: Favorite Mechanic is ONLINE

```
1. Customer Dashboard → Clicks "Book Again" on favorite mechanic
2. System checks mechanic's online status → ✅ ONLINE
3. Modal appears:
   "Book with [Mechanic Name]"
   Status: ● Available Now
   [Continue with [Mechanic]] [Choose Different Mechanic]

4. Customer clicks "Continue with [Mechanic]"
5. Redirected to intake form (pre-filled: preferred_mechanic_id)
6. Customer completes intake → Pays via Stripe
7. System creates session_request with:
   - preferred_mechanic_id: [mechanic_id]
   - routing_type: 'priority_broadcast'
   - priority_window_minutes: 10

8. Backend sends priority notification to that mechanic ONLY
9. Mechanic accepts → Session starts immediately
10. If no response within 10 min → Broadcast to all mechanics
```

**Success Rate**: ~85% (if mechanic is online and active)

---

### Scenario 2: Favorite Mechanic is OFFLINE

```
1. Customer Dashboard → Clicks "Book Again" on favorite mechanic
2. System checks mechanic's online status → ❌ OFFLINE
3. Modal appears:
   "Book with [Mechanic Name]"
   Status: ○ Currently Offline
   Last seen: 2 hours ago

   Options:
   [Notify & Wait for [Mechanic]]
   [Find Available Mechanic Now]
   [Cancel]

4a. Customer chooses "Notify & Wait":
    - Creates session_request with extended priority window (30 min)
    - Mechanic gets notification when they come online
    - If still no response → Broadcasts to all

4b. Customer chooses "Find Available Now":
    - Skips priority notification entirely
    - Immediately broadcasts to all online mechanics
    - Fastest path to service

4c. Customer chooses "Cancel":
    - Returns to dashboard
    - No session created
```

**Benefit**: Customer has FULL CONTROL and transparency

---

## 🔧 Technical Implementation

### Phase 1: Dashboard Integration ✅ COMPLETE

**File**: `src/app/customer/dashboard/page.tsx`

**Added:**
- Favorites state management
- `fetchFavorites()` API call
- "My Favorite Mechanics" section
- "Book Again" buttons with query params

**Display:**
```jsx
<Link href={`/intake?preferred_mechanic=${favorite.provider_id}&provider_type=${favorite.provider_type}`}>
  <Zap /> Book Again
</Link>
```

---

### Phase 2: Intake Page - Availability Check Modal

**File**: `src/app/intake/page.tsx` (needs modification)

**Logic:**
```typescript
// 1. Check URL params for preferred_mechanic
const preferredMechanicId = searchParams.get('preferred_mechanic')
const providerType = searchParams.get('provider_type')

// 2. If present, fetch mechanic's real-time status
if (preferredMechanicId) {
  const response = await fetch(`/api/mechanics/${preferredMechanicId}/status`)
  const { is_online, last_seen } = await response.json()

  // 3. Show availability modal
  setShowAvailabilityModal(true)
  setMechanicStatus({ is_online, last_seen })
}

// 4. Customer chooses option → Set routing strategy
if (customerChoice === 'priority_broadcast') {
  setRoutingType('priority_broadcast')
  setPreferredMechanicId(preferredMechanicId)
} else if (customerChoice === 'broadcast_now') {
  setRoutingType('broadcast')
  setPreferredMechanicId(null) // Clear preference
}
```

**New API Endpoint Needed:**
```
GET /api/mechanics/[mechanicId]/status
Response: { is_online: boolean, last_seen: timestamp }
```

---

### Phase 3: SessionLauncher Enhancement

**File**: `src/components/customer/SessionLauncher.tsx`

**New Props:**
```typescript
interface SessionLauncherProps {
  // ... existing props
  preferredMechanicId?: string | null
  providerType?: 'independent' | 'workshop'
  routingType?: 'broadcast' | 'priority_broadcast'
}
```

**Pass to Stripe Checkout Metadata:**
```typescript
metadata: {
  preferred_mechanic_id: preferredMechanicId || null,
  routing_type: routingType || 'broadcast',
  provider_type: providerType || null
}
```

---

### Phase 4: Fulfillment Logic Update

**File**: `src/lib/fulfillment.ts`

**Function**: `createSessionRequest()`

**Current:**
```typescript
await supabaseAdmin.from('session_requests').insert({
  customer_id: customerId,
  session_type: sessionType,
  plan_code: planCode,
  status: 'pending',
  preferred_workshop_id: workshopId,
  routing_type: routingType
})
```

**Enhanced:**
```typescript
await supabaseAdmin.from('session_requests').insert({
  customer_id: customerId,
  session_type: sessionType,
  plan_code: planCode,
  status: 'pending',
  preferred_workshop_id: workshopId,
  preferred_mechanic_id: preferredMechanicId || null, // NEW
  routing_type: routingType || 'broadcast',
  priority_window_minutes: routingType === 'priority_broadcast' ? 10 : null, // NEW
  priority_notified_at: routingType === 'priority_broadcast' ? NOW() : null // NEW
})
```

**Database Migration Needed:**
```sql
ALTER TABLE session_requests
ADD COLUMN preferred_mechanic_id UUID REFERENCES mechanics(id),
ADD COLUMN priority_window_minutes INTEGER,
ADD COLUMN priority_notified_at TIMESTAMP WITH TIME ZONE;
```

---

### Phase 5: Broadcast Logic Enhancement

**File**: `src/lib/realtimeChannels.ts` (or wherever broadcast happens)

**Enhanced Logic:**
```typescript
async function broadcastSessionRequest(sessionRequestId: string) {
  const request = await getSessionRequest(sessionRequestId)

  // Priority Broadcast Mode
  if (request.routing_type === 'priority_broadcast' && request.preferred_mechanic_id) {
    // Send notification to preferred mechanic ONLY
    await sendPushNotification(request.preferred_mechanic_id, {
      title: 'Priority Request from Your Favorite Customer!',
      body: `${request.customer_name} wants to book with you`,
      priority: 'high'
    })

    // Set timer for fallback
    setTimeout(async () => {
      const updated = await getSessionRequest(sessionRequestId)

      // If still pending (not accepted), broadcast to all
      if (updated.status === 'pending' && !updated.mechanic_id) {
        await broadcastToAllMechanics(sessionRequestId)
      }
    }, request.priority_window_minutes * 60 * 1000) // Convert to milliseconds

  } else {
    // Standard Broadcast Mode
    await broadcastToAllMechanics(sessionRequestId)
  }
}
```

---

### Phase 6: Post-Service "Add to Favorites" Prompt

**File**: `src/app/mechanic/session/[id]/complete/page.tsx` (or wherever session completion happens)

**After session marked complete, show modal to customer:**

```jsx
{showFavoritePrompt && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md">
      <div className="text-center">
        <Heart className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">
          Great Session with {mechanicName}!
        </h3>
        <p className="text-slate-300 mb-6">
          Save {mechanicName} to your favorites for quick rebooking next time.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => addToFavorites(mechanicId)}
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg font-medium"
          >
            Add to Favorites
          </button>
          <button
            onClick={() => setShowFavoritePrompt(false)}
            className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

**API Call:**
```typescript
async function addToFavorites(mechanicId: string) {
  await fetch('/api/customer/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider_id: mechanicId,
      provider_type: 'independent' // or 'workshop'
    })
  })

  // Show success toast
  setShowFavoritePrompt(false)
  showSuccessToast('Added to favorites!')
}
```

---

## 📊 Database Schema Changes

### New Columns for `session_requests`

```sql
-- Migration: Add favorites support to session_requests
ALTER TABLE session_requests
ADD COLUMN preferred_mechanic_id UUID REFERENCES mechanics(id) ON DELETE SET NULL,
ADD COLUMN priority_window_minutes INTEGER DEFAULT NULL,
ADD COLUMN priority_notified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN fallback_broadcast_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index for faster lookups
CREATE INDEX idx_session_requests_preferred_mechanic
ON session_requests(preferred_mechanic_id)
WHERE preferred_mechanic_id IS NOT NULL;

COMMENT ON COLUMN session_requests.preferred_mechanic_id IS 'Favorite mechanic to prioritize for this request';
COMMENT ON COLUMN session_requests.priority_window_minutes IS 'How long to wait for preferred mechanic before fallback';
COMMENT ON COLUMN session_requests.priority_notified_at IS 'When priority notification was sent';
COMMENT ON COLUMN session_requests.fallback_broadcast_at IS 'When we fell back to broadcast (NULL if priority worked)';
```

---

## 🎨 UI Components Needed

### 1. MechanicAvailabilityModal Component

**File**: `src/components/customer/MechanicAvailabilityModal.tsx`

```tsx
interface Props {
  mechanicName: string
  isOnline: boolean
  lastSeen?: string
  onPriorityBooking: () => void
  onBroadcastBooking: () => void
  onCancel: () => void
}

export function MechanicAvailabilityModal({ ... }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md">
        <h3 className="text-xl font-bold text-white mb-4">
          Book with {mechanicName}
        </h3>

        {isOnline ? (
          <div className="flex items-center gap-2 text-green-400 mb-6">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            <span>Available Now</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 mb-6">
            <div className="w-3 h-3 bg-slate-600 rounded-full" />
            <span>Currently Offline</span>
            {lastSeen && <span className="text-sm">• Last seen {lastSeen}</span>}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={onPriorityBooking}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 rounded-lg font-medium"
          >
            {isOnline ? `Continue with ${mechanicName}` : `Notify & Wait for ${mechanicName}`}
          </button>

          <button
            onClick={onBroadcastBooking}
            className="w-full border border-slate-600 text-slate-300 px-4 py-3 rounded-lg font-medium"
          >
            Find Available Mechanic Now
          </button>

          <button
            onClick={onCancel}
            className="w-full text-slate-400 px-4 py-2 rounded-lg text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## 📈 Success Metrics

### KPIs to Track

1. **Favorite Mechanic Acceptance Rate**
   - % of priority notifications accepted by favorite mechanic
   - Target: >70%

2. **Fallback Rate**
   - % of bookings that fall back to broadcast
   - Target: <30%

3. **Customer Satisfaction**
   - % of customers who rebook with same mechanic
   - Target: >60%

4. **Time to Session Start**
   - Avg time from booking to session start (priority vs broadcast)
   - Hypothesis: Priority bookings 40% faster

### Analytics Queries

```sql
-- Favorite mechanic success rate
SELECT
  COUNT(*) FILTER (WHERE preferred_mechanic_id = mechanic_id) * 100.0 / COUNT(*) as success_rate
FROM session_requests
WHERE preferred_mechanic_id IS NOT NULL;

-- Fallback rate
SELECT
  COUNT(*) FILTER (WHERE fallback_broadcast_at IS NOT NULL) * 100.0 / COUNT(*) as fallback_rate
FROM session_requests
WHERE routing_type = 'priority_broadcast';

-- Average time to acceptance
SELECT
  routing_type,
  AVG(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 60) as avg_minutes_to_accept
FROM session_requests
WHERE status = 'accepted'
GROUP BY routing_type;
```

---

## ✅ Implementation Checklist

### Backend
- [ ] Add database columns to `session_requests`
- [ ] Create migration file
- [ ] Create `GET /api/mechanics/[id]/status` endpoint
- [ ] Update `fulfillment.ts` to support `preferred_mechanic_id`
- [ ] Update broadcast logic for priority notification
- [ ] Add fallback timer mechanism

### Frontend
- [x] Add favorites section to customer dashboard
- [x] Add "Book Again" buttons with query params
- [ ] Create `MechanicAvailabilityModal` component
- [ ] Update intake page to check URL params
- [ ] Update SessionLauncher to accept new props
- [ ] Add post-service "Add to Favorites" modal

### Testing
- [ ] Test online mechanic priority booking
- [ ] Test offline mechanic with "notify & wait"
- [ ] Test fallback to broadcast after timeout
- [ ] Test adding favorites after session
- [ ] Test removing favorites from dashboard
- [ ] Load test: 100 concurrent priority bookings

### Documentation
- [x] Create implementation guide
- [ ] Update API documentation
- [ ] Create user guide for customers
- [ ] Create mechanic notification guide

---

## 🚀 Rollout Plan

### Stage 1: Beta (Week 1-2)
- Enable for 10% of customers
- Monitor success/fallback rates
- Collect user feedback

### Stage 2: Expanded Beta (Week 3-4)
- Enable for 50% of customers
- A/B test: Priority vs Standard Broadcast
- Optimize priority window duration

### Stage 3: Full Rollout (Week 5+)
- Enable for 100% of customers
- Monitor KPIs
- Iterate based on data

---

## 🔒 Edge Cases & Error Handling

### Case 1: Favorite Mechanic Deleted Account
- API returns 404 on `/api/mechanics/[id]/status`
- Show: "This mechanic is no longer available. Find another mechanic?"
- Auto-remove from favorites

### Case 2: Mechanic Accepts Then Cancels
- Immediately fallback to broadcast
- Notify customer: "Your mechanic had to cancel. Finding you another mechanic..."

### Case 3: Network Timeout During Priority Window
- Retry notification 2x
- If still no response → Fallback to broadcast

### Case 4: Customer Has Multiple Favorites
- Dashboard shows all favorites
- Customer can choose which one to book
- Track "most booked favorite" for smart defaults

---

## 📞 Support Scenarios

### Customer: "Why didn't my favorite mechanic respond?"

**Response:**
"Your favorite mechanic was notified first, but they were unavailable at that moment. We automatically connected you with another qualified mechanic to ensure you got service quickly. You can still book with your favorite again next time!"

### Customer: "Can I book with a favorite who's offline?"

**Response:**
"Yes! When you click 'Book Again,' you'll see their availability status. If they're offline, you can choose to notify them and wait, or get matched with an available mechanic immediately."

---

## 🎓 User Education

### In-App Tips

**After first session:**
"💡 Tip: Had a great experience? Add this mechanic to your favorites to rebook faster next time!"

**On dashboard (if no favorites):**
"💡 Tip: Add your favorite mechanics here to skip the search next time you need service."

**On rebooking:**
"⚡ Priority Booking: Your favorite mechanic gets notified first, with automatic fallback if they're busy."

---

## End of Implementation Guide
