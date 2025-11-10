# Video Session Mechanic Name Display Bug

**Date:** 2025-11-07
**Status:** ❌ BUG CONFIRMED - Fix Ready to Apply
**Severity:** P1 - Significant UX Issue
**Affected Area:** Video Sessions (Customer Side Only)

---

## Summary

When a customer joins a video session BEFORE a mechanic is assigned, the header displays **"👤 Customer"** instead of the mechanic's name. After the customer leaves and returns, it correctly shows the mechanic name with a clickable profile button.

---

## Expected vs Actual Behavior

### Expected Behavior
Customer sees mechanic name in header from the moment the mechanic joins:
```
🔧 John Smith [i]  (clickable to view profile)
```

### Actual Behavior

**First Join (before mechanic assigned):**
```
👤 Customer  (not clickable, fallback text)
```

**After Leave & Return (mechanic already assigned):**
```
🔧 John Smith [i]  (clickable, works correctly)
```

---

## Root Cause Analysis

### The Problem Flow

1. **Customer Creates Session**
   - Session created with `mechanic_id = null` (waiting for mechanic)
   - Status: 'pending' or 'waiting'

2. **Customer Joins Video Page**
   - Server ([page.tsx:143-151](src/app/video/[id]/page.tsx#L143-L151)) checks if `session.mechanic_id` exists
   - Since `mechanic_id` is null, server skips mechanic name fetch:
   ```typescript
   let mechanicName: string | null = null
   let mechanicUserId: string | null = null
   if (session.mechanic_id) {  // ❌ FALSE - mechanic not assigned yet
     // This block is skipped
   }
   ```
   - Server passes `mechanicName = null` and `mechanicUserId = null` to client

3. **VideoSessionClient Initializes**
   - [Line 1196](src/app/video/[id]/VideoSessionClient.tsx#L1196): Receives `mechanicName: _mechanicName` (null)
   - [Line 1208](src/app/video/[id]/VideoSessionClient.tsx#L1208): State initialized with null value:
   ```typescript
   const [mechanicName, setMechanicName] = useState<string | null>(_mechanicName)  // null
   ```

4. **Header Displays Fallback Text**
   - [Line 2795](src/app/video/[id]/VideoSessionClient.tsx#L2795): Checks condition:
   ```typescript
   {_userRole === 'customer' && mechanicName && _mechanicId ? (
     // Show mechanic name button
   ) : (
     // Show fallback  ❌ THIS EXECUTES
     {_userRole === 'mechanic' ? '🔧 Mechanic' : '👤 Customer'}
   )}
   ```
   - Since `mechanicName` is null, fallback shows **"👤 Customer"**

5. **Mechanic Accepts and Joins**
   - Session updated in database: `mechanic_id = <mechanic-id>`
   - Status changed to 'live'
   - Realtime listener ([line 1439-1474](src/app/video/[id]/VideoSessionClient.tsx#L1439-L1474)) receives update:
   ```typescript
   .on('postgres_changes', { event: 'UPDATE', ... }, async (payload) => {
     const newStatus = payload.new?.status
     if (newStatus === 'cancelled' || newStatus === 'completed') {
       // Only handles status changes ❌
     }
   })
   ```
   - **PROBLEM**: Listener only checks for status = 'completed'/'cancelled'
   - **PROBLEM**: Listener does NOT check for `mechanic_id` changes
   - **PROBLEM**: `mechanicName` state is never updated

6. **Customer Leaves and Returns**
   - Server fetches fresh session data
   - NOW `session.mechanic_id` exists
   - Server fetches mechanic name successfully
   - Client receives correct `mechanicName` value
   - Header displays correctly ✅

---

## Technical Details

### Server-Side Code (Working Correctly)

**File:** [src/app/video/[id]/page.tsx](src/app/video/[id]/page.tsx#L140-L151)

```typescript
// Fetch mechanic name and user_id if assigned
let mechanicName: string | null = null
let mechanicUserId: string | null = null
if (session.mechanic_id) {  // Only fetches if mechanic assigned
  const { data: mechanicData } = await supabaseAdmin
    .from('mechanics')
    .select('name, user_id')
    .eq('id', session.mechanic_id)
    .maybeSingle()
  mechanicName = mechanicData?.name || null
  mechanicUserId = mechanicData?.user_id || null
}
```

**Issue:** Server-side code is correct, but it only runs on initial page load. When mechanic_id changes mid-session, the client doesn't refetch.

### Client-Side State (Missing Update Logic)

**File:** [src/app/video/[id]/VideoSessionClient.tsx](src/app/video/[id]/VideoSessionClient.tsx)

**State Initialization (Line 1208):**
```typescript
const [mechanicName, setMechanicName] = useState<string | null>(_mechanicName)
```

**Problem:** `setMechanicName` is NEVER called after initialization!

```bash
$ grep -n "setMechanicName" VideoSessionClient.tsx
1208:  const [mechanicName, setMechanicName] = useState<string | null>(_mechanicName)
```

Only one occurrence = state is set once and never updated.

### Realtime Listener (Incomplete)

**File:** [src/app/video/[id]/VideoSessionClient.tsx](src/app/video/[id]/VideoSessionClient.tsx#L1439-L1474)

**Current Code:**
```typescript
.on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'sessions',
  filter: `id=eq.${sessionId}`,
}, async (payload) => {
  console.log('[VIDEO SECURITY L3] 🔄 Session status changed:', payload)
  const newStatus = payload.new?.status

  if (newStatus === 'cancelled' || newStatus === 'completed') {
    // Handles session ending
  }
  // ❌ MISSING: Check for mechanic_id changes
})
```

**What's Missing:**
- No check for `payload.new?.mechanic_id` changes
- No fetch for mechanic name when mechanic_id is assigned
- No call to `setMechanicName()` to update state

---

## The Fix

### Add Mechanic Assignment Handling to Realtime Listener

**File to Modify:** [src/app/video/[id]/VideoSessionClient.tsx](src/app/video/[id]/VideoSessionClient.tsx#L1449-L1464)

**Current Code (Lines 1449-1464):**
```typescript
async (payload) => {
  console.log('[VIDEO SECURITY L3] 🔄 Session status changed:', payload)
  const newStatus = payload.new?.status

  if (newStatus === 'cancelled' || newStatus === 'completed') {
    console.log(`[VIDEO SECURITY L3] ✅ Session ${newStatus}, showing modal...`)
    setIsRoomConnected(false)
    await fetchAndShowCompletionModal()
  }
}
```

**Fixed Code:**
```typescript
async (payload) => {
  console.log('[VIDEO SECURITY L3] 🔄 Session updated:', payload)
  const newStatus = payload.new?.status
  const newMechanicId = payload.new?.mechanic_id
  const oldMechanicId = payload.old?.mechanic_id

  // Handle mechanic assignment (new mechanic joined)
  if (newMechanicId && newMechanicId !== oldMechanicId && _userRole === 'customer') {
    console.log('[VIDEO] 🔧 Mechanic assigned, fetching name...', { mechanicId: newMechanicId })

    try {
      const { data: mechanicData } = await supabaseAdmin
        .from('mechanics')
        .select('name, user_id')
        .eq('id', newMechanicId)
        .maybeSingle()

      if (mechanicData) {
        console.log('[VIDEO] ✅ Mechanic name fetched:', mechanicData.name)
        setMechanicName(mechanicData.name)
        setMechanicId(mechanicData.user_id)
      }
    } catch (error) {
      console.error('[VIDEO] Failed to fetch mechanic name:', error)
    }
  }

  // Handle session ending
  if (newStatus === 'cancelled' || newStatus === 'completed') {
    console.log(`[VIDEO SECURITY L3] ✅ Session ${newStatus}, showing modal...`)
    setIsRoomConnected(false)
    await fetchAndShowCompletionModal()
  }
}
```

### Additional State Variable Needed

**Add near line 1208:**
```typescript
const [mechanicName, setMechanicName] = useState<string | null>(_mechanicName)
const [mechanicId, setMechanicId] = useState<string | null>(_mechanicId)  // ✅ ADD THIS
const [customerName, setCustomerName] = useState<string | null>(_customerName)
```

This allows updating the mechanicId state when the mechanic joins.

---

## Why "Customer Leaves and Returns" Works

When the customer returns to the session:
1. **Server runs fresh query** (page.tsx)
2. **mechanic_id now exists** in database
3. **Server fetches mechanic name** successfully
4. **Client receives correct props** on mount
5. **Header displays correctly** ✅

But this is not ideal because:
- ❌ Customer must leave and return to see mechanic name
- ❌ Poor user experience
- ❌ Looks broken during first join

---

## Testing the Fix

### Before Fix
1. Create video session as customer
2. Join session page
3. **Verify:** Header shows "👤 Customer"
4. Mechanic accepts and joins
5. **Verify:** Header STILL shows "👤 Customer" ❌
6. Customer leaves and returns
7. **Verify:** Header NOW shows "🔧 John Smith" ✅

### After Fix
1. Create video session as customer
2. Join session page
3. **Verify:** Header shows "👤 Customer" (expected, no mechanic yet)
4. Mechanic accepts and joins
5. **Verify:** Header IMMEDIATELY updates to "🔧 John Smith" ✅
6. Customer can click name to view profile ✅

---

## Impact Assessment

### User Experience Impact
- ⚠️ **MEDIUM-HIGH:** Customer doesn't know who their mechanic is until they reload
- ⚠️ **TRUST ISSUE:** Shows generic "Customer" text which looks broken
- ⚠️ **CONFUSING:** Customer might think mechanic hasn't joined yet when they have

### Business Impact
- ❌ Reduces customer confidence in platform
- ❌ Hides mechanic credentials/expertise during session
- ❌ Poor first impression for new customers

### Scope
- ✅ Video sessions: AFFECTED
- ✅ Chat sessions: NOT AFFECTED (different code path, might have same issue - needs checking)
- ✅ Customer side: AFFECTED
- ✅ Mechanic side: NOT AFFECTED (different logic for customer name)

---

## Comparison: Chat vs Video

**Chat Session (ChatRoomV3.tsx):**
- Need to verify if same issue exists
- Uses similar pattern but different realtime handling
- Might need same fix

**Video Session (VideoSessionClient.tsx):**
- Confirmed bug present
- Fix ready to apply

---

## Files to Modify

| File | Lines | Purpose |
|------|-------|---------|
| [VideoSessionClient.tsx](src/app/video/[id]/VideoSessionClient.tsx#L1208) | ~1208 | Add `mechanicId` state variable |
| [VideoSessionClient.tsx](src/app/video/[id]/VideoSessionClient.tsx#L1449-L1464) | ~1449-1464 | Add mechanic assignment handler |

**Total:** 1 file, ~15 lines of code

---

## Priority & Timeline

**Priority:** P1 - Important UX Bug
**Recommended Timeline:** Fix within 1 day
**Risk:** LOW - Simple state update logic
**Impact:** HIGH - Fixes significant UX issue

---

## Related Issues

**Already Fixed:**
- Bug #1 (Chat): Mechanic name showing wrong in chat sessions ✅

**Needs Investigation:**
- Does chat session have the same mechanic assignment issue?
- Should we add similar realtime updates for customer name on mechanic side?

---

## Summary

This bug occurs because:
1. ✅ Server-side fetching is correct (works on page load)
2. ❌ Client-side state is never updated after initial mount
3. ❌ Realtime listener only handles status changes, not mechanic assignment

The fix is simple:
- Add mechanic assignment detection to realtime listener
- Fetch mechanic name when mechanic_id changes
- Update state with new mechanic name
- Header automatically re-renders with correct name

---

**Status:** ✅ ROOT CAUSE IDENTIFIED - FIX READY TO APPLY

Should I apply this fix now?
