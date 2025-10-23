# Chat Session Flow Analysis

## Current Flow

### Customer Journey
1. **Fill Intake** (`/intake`)
   - Session created with `status: 'pending'`
   - `customer_user_id` set
   - `mechanic_id` = NULL

2. **Sign Waiver** (`/intake/waiver`)
   - Waiver saved
   - ✅ NOW FIXED: Redirects to `/thank-you?session=xxx&plan=trial`

3. **Thank You Page** (`/thank-you`)
   - Finds session by ID
   - "Start session now" → `/chat/[session-id]`

4. **Join Chat** (`/chat/[session-id]`)
   - Auth check: Must be logged in
   - Role determined: customer (because `customer_user_id` matches)
   - Passes to ChatRoomV3:
     - `userId` = customer's user ID
     - `userRole` = 'customer'
     - `mechanicId` = NULL (no mechanic assigned yet)
     - `customerId` = customer's user ID

5. **ChatRoomV3 Presence Tracking**
   - Subscribes to `chat:session-[id]:presence` channel
   - Tracks presence with `userId` = customer ID
   - Checks presence:
     ```typescript
     mechanicPresent = Object.keys(state).some(key => key === mechanicId) // FALSE (mechanicId is NULL)
     customerPresent = Object.keys(state).some(key => key === customerId) // TRUE (customer is present)
     ```
   - Shows: "Waiting for mechanic to join"

### Mechanic Journey
1. **See Request** (Mechanic Dashboard)
   - Session request appears in real-time
   - Status: 'pending'

2. **Accept Request**
   - Calls API to assign mechanic
   - Updates session:
     - `mechanic_id` = mechanic's ID
     - `status` = 'waiting'

3. **Join Chat** (`/chat/[session-id]`)
   - Auth check: Mechanic cookie present
   - Role determined: mechanic (because `mechanic_id` matches)
   - Passes to ChatRoomV3:
     - `userId` = mechanic's ID
     - `userRole` = 'mechanic'
     - `mechanicId` = mechanic's ID
     - `customerId` = customer's user ID

4. **ChatRoomV3 Presence Tracking**
   - Subscribes to `chat:session-[id]:presence` channel
   - Tracks presence with `userId` = mechanic ID
   - Realtime subscription updates `mechanicId` in state
   - Checks presence:
     ```typescript
     mechanicPresent = Object.keys(state).some(key => key === mechanicId) // Should be TRUE
     customerPresent = Object.keys(state).some(key => key === customerId) // Should be TRUE
     ```

## Potential Issues

### Issue 1: Presence Channel Key Format ❓

**Question**: What is the key format in Supabase presence state?

Supabase Realtime presence uses the connection's UUID as the key by default, NOT the user_id!

**Current Code** (LINE 183-188):
```typescript
await presenceChannel.track({
  user_id: userId,
  role: userRole,
  online_at: new Date().toISOString(),
})
```

**Problem**:
- The key is a connection UUID (e.g., "1234-5678-9012")
- But we're checking: `Object.keys(state).some(key => key === mechanicId)`
- This will NEVER match because mechanicId is a user ID, not a connection UUID!

**Fix Needed**:
We need to check the PAYLOAD, not the KEY:
```typescript
const mechanicIsPresent = Object.values(state).some(
  (entries: any[]) => entries.some((entry: any) => entry.user_id === mechanicId)
)
const customerIsPresent = Object.values(state).some(
  (entries: any[]) => entries.some((entry: any) => entry.user_id === customerId)
)
```

### Issue 2: mechanicId Initially NULL

When customer first joins:
- `mechanicId` = NULL
- Customer's presence tracked
- Check: `mechanicPresent = false` (correct, no mechanic yet)

When mechanic accepts and session updates:
- Realtime subscription fires
- `setMechanicId(updated.mechanic_id)` updates state
- But presence sync might not fire immediately
- Need to ensure presence check re-runs after mechanicId updates

## Recommended Fixes

### Fix 1: Correct Presence Check (CRITICAL)

**File**: `src/app/chat/[id]/ChatRoomV3.tsx:167-171`

```typescript
// BEFORE (BROKEN)
const mechanicIsPresent = Object.keys(state).some(key => key === mechanicId)
const customerIsPresent = Object.keys(state).some(key => key === customerId)

// AFTER (FIXED)
const mechanicIsPresent = mechanicId && Object.values(state).some(
  (entries: any[]) => Array.isArray(entries) && entries.some((entry: any) => entry.user_id === mechanicId)
)
const customerIsPresent = customerId && Object.values(state).some(
  (entries: any[]) => Array.isArray(entries) && entries.some((entry: any) => entry.user_id === customerId)
)
```

### Fix 2: Add Logging for Debugging

Add console logs to see actual presence state:
```typescript
.on('presence', { event: 'sync' }, () => {
  const state = presenceChannel.presenceState()
  console.log('[ChatRoom] Full presence state:', JSON.stringify(state, null, 2))
  console.log('[ChatRoom] Looking for mechanicId:', mechanicId)
  console.log('[ChatRoom] Looking for customerId:', customerId)

  // ... presence checks
})
```

## Testing Steps

### Test 1: Customer Joins First
1. Customer fills intake → signs waiver → clicks "Join Session"
2. Check console: Should see customer's presence tracked
3. Should show: "Waiting for mechanic to join"
4. `customerPresent` should be TRUE
5. `mechanicPresent` should be FALSE

### Test 2: Mechanic Accepts and Joins
1. Mechanic accepts session in dashboard
2. Mechanic clicks "Start Session"
3. Check console: Should see both presences
4. Should NO LONGER show "Waiting for..."
5. `customerPresent` should be TRUE
6. `mechanicPresent` should be TRUE
7. Session should auto-start

### Test 3: Session Start
1. When both present, should call `/api/sessions/[id]/start`
2. Status should change from 'waiting' → 'live'
3. Timer should start counting down
4. Chat should be fully functional

## Current Status

✅ **Fixed**: Waiver redirect - session ID now passed to thank-you page
❌ **BROKEN**: Presence tracking - checking keys instead of payload values
⚠️  **NEEDS TESTING**: Session start after both join

## Next Actions

1. Fix presence check logic in ChatRoomV3.tsx
2. Add debug logging
3. Test complete flow end-to-end
4. Verify session auto-starts when both join
