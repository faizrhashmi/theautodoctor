# PHASE 3: FULFILLMENT PRIORITY NOTIFICATION — IMPLEMENTATION PLAN

**Date**: 2025-11-02
**Status**: 📋 PLANNING — AWAITING APPROVAL
**Dependencies**: Phase 1 ✅ Complete, Phase 2 ✅ Complete
**Feature Flag**: `ENABLE_FAVORITES_PRIORITY=false` (default)

---

## 📋 Phase 3 Objective

Implement the **backend fulfillment logic** for favorites priority flow:
1. Read favorite context from `/intake` page and Stripe metadata
2. Notify preferred mechanic first (10-minute priority window)
3. Automatically fall back to broadcast if no response
4. All changes feature-gated, backward compatible

---

## 🎯 What Phase 3 Will Do

### Current Flow (Before Phase 3)
1. Customer completes Stripe checkout → Webhook fires
2. `createSessionRequest()` creates session_requests record
3. `broadcastSessionRequest()` notifies **ALL** available mechanics
4. First mechanic to accept wins

### New Flow (Phase 3 - Feature Flag ON)
1. Customer completes Stripe checkout → Webhook fires with favorite metadata
2. `createSessionRequest()` reads `preferred_mechanic_id` from metadata
3. **IF** preferred mechanic exists:
   - Notify ONLY preferred mechanic first
   - Set 10-minute timer
   - **IF** mechanic accepts within 10 min → Session matched ✅
   - **IF** 10 min expires with no response → Fall back to broadcast
4. **ELSE** (no preferred mechanic):
   - Standard broadcast (unchanged)

### Key Behavior
- **Non-blocking**: Fulfillment continues normally if priority fails
- **Timed fallback**: 10-minute window, then automatic broadcast
- **Zero downtime**: No customer waits indefinitely
- **Audit trail**: Log all priority attempts in session metadata

---

## 🔍 Files to Modify

### 1. `/intake` Page (Frontend)
**File**: `src/app/intake/page.tsx` (estimated location)
**Changes**: Read URL params and store in session state

**Current State** (Need to verify):
- Reads `plan`, `specialist`, `urgent` from URL
- Stores in local state
- Passes to Stripe checkout metadata

**Phase 3 Changes**:
- Read `preferred_mechanic_id` and `routing_type` from URL params
- Store in local state
- Add to Stripe checkout metadata object
- No breaking changes (params optional)

**Estimated LOC**: +5 lines

---

### 2. Fulfillment Logic (Backend)
**File**: `src/lib/fulfillment.ts`
**Function**: `createSessionRequest()`

**Current Behavior**:
```typescript
export async function createSessionRequest(sessionData: SessionRequestData) {
  // 1. Create session_requests record
  // 2. Broadcast to all available mechanics
  // 3. Return session ID
}
```

**Phase 3 Changes**:

#### A. Read Favorite Context from Metadata
```typescript
const preferredMechanicId = sessionData.metadata?.preferred_mechanic_id
const routingType = sessionData.metadata?.routing_type

// Feature flag check
const priorityEnabled = process.env.ENABLE_FAVORITES_PRIORITY === 'true'
const shouldUsePriority = priorityEnabled &&
                          routingType === 'priority_broadcast' &&
                          preferredMechanicId
```

#### B. Conditional Routing Logic
```typescript
if (shouldUsePriority) {
  // Phase 3: Priority notification flow
  await notifyPreferredMechanic(sessionId, preferredMechanicId)

  // Set fallback timer (10 minutes)
  scheduleFallbackBroadcast(sessionId, preferredMechanicId, 10 * 60 * 1000)
} else {
  // Standard broadcast (unchanged)
  await broadcastSessionRequest(sessionId)
}
```

**Estimated LOC**: +30 lines

---

### 3. Priority Notification Function (New)
**File**: `src/lib/fulfillment.ts`
**Function**: `notifyPreferredMechanic()` (new)

**Purpose**: Send targeted notification to preferred mechanic only

**Implementation**:
```typescript
async function notifyPreferredMechanic(
  sessionId: string,
  mechanicId: string
): Promise<void> {
  // 1. Verify mechanic exists and is approved
  const mechanic = await supabase
    .from('mechanics')
    .select('id, status, is_online')
    .eq('id', mechanicId)
    .eq('status', 'approved')
    .maybeSingle()

  if (!mechanic) {
    console.warn(`[Priority] Mechanic ${mechanicId} not found or not approved`)
    // Fall back immediately to broadcast
    await broadcastSessionRequest(sessionId)
    return
  }

  // 2. Send priority notification via Realtime channel
  // Reuse existing channel: 'session_requests_feed'
  const channel = supabase.channel('session_requests_feed')

  await channel.send({
    type: 'broadcast',
    event: 'priority_session_request',
    payload: {
      session_id: sessionId,
      mechanic_id: mechanicId,
      priority_window_minutes: 10,
      message: 'A customer you helped before is requesting you specifically!'
    }
  })

  // 3. Log priority notification in session metadata
  await supabase
    .from('session_requests')
    .update({
      metadata: supabase.raw(`
        metadata || '{"priority_notified_at": "${new Date().toISOString()}"}'::jsonb
      `)
    })
    .eq('id', sessionId)

  console.log(`[Priority] Notified mechanic ${mechanicId} for session ${sessionId}`)
}
```

**Estimated LOC**: +40 lines

---

### 4. Fallback Timer Function (New)
**File**: `src/lib/fulfillment.ts`
**Function**: `scheduleFallbackBroadcast()` (new)

**Purpose**: Automatically broadcast to all mechanics if preferred mechanic doesn't respond

**Implementation**:
```typescript
function scheduleFallbackBroadcast(
  sessionId: string,
  preferredMechanicId: string,
  delayMs: number
): void {
  setTimeout(async () => {
    try {
      // 1. Check if session is still unmatched
      const { data: session } = await supabase
        .from('session_requests')
        .select('status, matched_mechanic_id')
        .eq('id', sessionId)
        .single()

      if (!session) {
        console.warn(`[Fallback] Session ${sessionId} not found`)
        return
      }

      // 2. If already matched, do nothing
      if (session.status === 'matched' || session.matched_mechanic_id) {
        console.log(`[Fallback] Session ${sessionId} already matched, skipping broadcast`)
        return
      }

      // 3. If still pending, broadcast to all mechanics
      console.log(`[Fallback] Priority window expired for session ${sessionId}, broadcasting...`)

      await broadcastSessionRequest(sessionId, {
        excludeMechanicId: preferredMechanicId, // Optional: give priority to others
        reason: 'priority_timeout'
      })

      // 4. Log fallback in metadata
      await supabase
        .from('session_requests')
        .update({
          metadata: supabase.raw(`
            metadata || '{"fallback_broadcast_at": "${new Date().toISOString()}"}'::jsonb
          `)
        })
        .eq('id', sessionId)

    } catch (error) {
      console.error(`[Fallback] Error in fallback broadcast for ${sessionId}:`, error)
      // Ensure we broadcast even on error
      await broadcastSessionRequest(sessionId)
    }
  }, delayMs)
}
```

**Key Features**:
- **Idempotent**: Checks if session already matched before broadcasting
- **Resilient**: Broadcasts even on error (customer never stuck)
- **Logged**: Records fallback in metadata for analytics
- **Non-blocking**: Uses setTimeout (doesn't block fulfillment)

**Estimated LOC**: +45 lines

---

### 5. Enhanced Broadcast Function (Optional)
**File**: `src/lib/realtimeChannels.ts`
**Function**: `broadcastSessionRequest()`

**Current Signature**:
```typescript
export async function broadcastSessionRequest(sessionId: string)
```

**Phase 3 Enhancement** (Optional):
```typescript
export async function broadcastSessionRequest(
  sessionId: string,
  options?: {
    excludeMechanicId?: string  // Don't notify this mechanic (already notified)
    reason?: 'priority_timeout' | 'standard'
  }
)
```

**Why**:
- Avoid duplicate notifications to preferred mechanic
- Provide context in broadcast payload
- Optional - can skip if not needed

**Estimated LOC**: +5 lines (parameter handling)

---

## 🔒 Safety Measures

### 1. Feature Flag Gating
```typescript
// Every priority code path checks flag
if (process.env.ENABLE_FAVORITES_PRIORITY !== 'true') {
  // Skip priority logic, use standard broadcast
  await broadcastSessionRequest(sessionId)
  return
}
```

### 2. Graceful Degradation
```typescript
// If preferred mechanic invalid, fall back immediately
if (!mechanic || mechanic.status !== 'approved') {
  console.warn('[Priority] Mechanic invalid, falling back to broadcast')
  await broadcastSessionRequest(sessionId)
  return
}
```

### 3. Timeout Guarantee
```typescript
// Customer never waits > 10 minutes
setTimeout(() => broadcastSessionRequest(sessionId), 10 * 60 * 1000)
```

### 4. Error Handling
```typescript
try {
  await notifyPreferredMechanic(sessionId, mechanicId)
  scheduleFallbackBroadcast(sessionId, mechanicId, 600000)
} catch (error) {
  console.error('[Priority] Error in priority flow:', error)
  // Fall back to standard broadcast on ANY error
  await broadcastSessionRequest(sessionId)
}
```

---

## 📊 Metadata Structure

### session_requests.metadata (JSONB)
```json
{
  "preferred_mechanic_id": "123e4567-e89b-12d3-a456-426614174000",
  "routing_type": "priority_broadcast",
  "priority_notified_at": "2025-11-02T12:34:56.789Z",
  "priority_window_minutes": 10,
  "fallback_broadcast_at": "2025-11-02T12:44:56.789Z",
  "fallback_reason": "no_response"
}
```

**Fields**:
- `preferred_mechanic_id`: UUID of favorite mechanic
- `routing_type`: Always `"priority_broadcast"` for this flow
- `priority_notified_at`: Timestamp when preferred mechanic was notified
- `priority_window_minutes`: Duration of priority window (always 10)
- `fallback_broadcast_at`: Timestamp when fallback broadcast occurred
- `fallback_reason`: Why fallback happened (`"no_response"`, `"mechanic_offline"`, etc.)

**Why JSONB**:
- No schema changes needed (Phase 4)
- Flexible for analytics
- Easy to query with Postgres JSON operators

---

## 🧪 Testing Strategy

### Test Scenario 1: Priority Flow - Mechanic Accepts
**Setup**:
- `ENABLE_FAVORITES_PRIORITY=true`
- Customer books with favorite (mechanic online)
- Mechanic accepts within 10 minutes

**Expected**:
1. ✅ Only preferred mechanic notified
2. ✅ Mechanic receives `priority_session_request` event
3. ✅ Mechanic accepts session
4. ✅ Session matched immediately
5. ✅ Fallback timer cancelled (session already matched)
6. ✅ No broadcast to other mechanics

**Verification**:
- Check `session_requests.metadata` has `priority_notified_at`
- Check `session_requests.metadata` does NOT have `fallback_broadcast_at`
- Check `session_requests.status = 'matched'`
- Check `session_requests.matched_mechanic_id = preferred_mechanic_id`

---

### Test Scenario 2: Priority Flow - Mechanic Ignores (Timeout)
**Setup**:
- `ENABLE_FAVORITES_PRIORITY=true`
- Customer books with favorite (mechanic online)
- Mechanic does NOT respond within 10 minutes

**Expected**:
1. ✅ Preferred mechanic notified first
2. ✅ 10-minute timer starts
3. ✅ After 10 minutes, fallback broadcast fires
4. ✅ All other mechanics notified
5. ✅ First available mechanic accepts
6. ✅ Session matched

**Verification**:
- Check `session_requests.metadata` has `priority_notified_at`
- Check `session_requests.metadata` has `fallback_broadcast_at` (10 min later)
- Check `session_requests.status = 'matched'`
- Check `session_requests.matched_mechanic_id` may NOT be preferred mechanic

---

### Test Scenario 3: Priority Flow - Mechanic Offline
**Setup**:
- `ENABLE_FAVORITES_PRIORITY=true`
- Customer books with favorite (mechanic OFFLINE)
- Preferred mechanic not available

**Expected**:
1. ✅ Priority notification sent (even if offline)
2. ✅ 10-minute timer starts
3. ✅ After 10 minutes, fallback broadcast fires
4. ✅ Other mechanics notified
5. ✅ Session matched with available mechanic

**Verification**:
- Check `session_requests.metadata` has `priority_notified_at`
- Check `session_requests.metadata` has `fallback_broadcast_at`
- Check session matched with different mechanic

---

### Test Scenario 4: Standard Broadcast (No Favorite)
**Setup**:
- `ENABLE_FAVORITES_PRIORITY=true`
- Customer books WITHOUT selecting favorite
- `routing_type` NOT set to `priority_broadcast`

**Expected**:
1. ✅ Standard broadcast to all mechanics
2. ✅ No priority notification
3. ✅ No timer set
4. ✅ First available mechanic accepts

**Verification**:
- Check `session_requests.metadata` does NOT have `preferred_mechanic_id`
- Check `session_requests.metadata` does NOT have `priority_notified_at`
- Check standard broadcast behavior (unchanged)

---

### Test Scenario 5: Feature Flag OFF
**Setup**:
- `ENABLE_FAVORITES_PRIORITY=false`
- Customer books with favorite context in URL
- Metadata includes `preferred_mechanic_id`

**Expected**:
1. ✅ Priority logic skipped (feature flag OFF)
2. ✅ Standard broadcast to all mechanics
3. ✅ No priority notification
4. ✅ System behaves as if favorite not selected

**Verification**:
- Check standard broadcast fires
- Check NO priority-specific metadata added
- Check session matched normally

---

## 🔄 Sequence Diagram

```
Customer → Stripe → Webhook → Fulfillment
                                  |
                                  v
                    [Feature Flag Check]
                                  |
                    +-------------+-------------+
                    |                           |
                    v                           v
          [Priority Broadcast]         [Standard Broadcast]
                    |                           |
                    v                           |
        Notify ONLY preferred mechanic          |
                    |                           |
                    v                           |
          [Start 10-min timer]                  |
                    |                           |
          +---------+---------+                 |
          |                   |                 |
          v                   v                 v
   [Mechanic accepts]   [10 min timeout]   [Broadcast ALL]
          |                   |                 |
          v                   v                 v
    [Session matched]   [Fallback broadcast] [Session matched]
                              |
                              v
                        [Session matched]
```

---

## 📁 File Structure Summary

```
src/
├── app/
│   └── intake/
│       └── page.tsx             # Read favorite params from URL, add to Stripe metadata
├── lib/
│   ├── fulfillment.ts           # Main changes
│   │   ├── createSessionRequest()        # Enhanced with priority routing
│   │   ├── notifyPreferredMechanic()     # NEW - priority notification
│   │   └── scheduleFallbackBroadcast()   # NEW - 10-min timer
│   └── realtimeChannels.ts      # Optional enhancement
│       └── broadcastSessionRequest()     # Add excludeMechanicId param (optional)
└── types/
    └── fulfillment.ts           # Optional: Add types for priority options

notes/reports/remediation/
├── phase3-plan.md               # This file
└── phase3-verification.md       # To be created after implementation
```

---

## ✅ Implementation Checklist

### Step 1: Update /intake Page
- [ ] Read `preferred_mechanic_id` from URL params
- [ ] Read `routing_type` from URL params
- [ ] Store in local state
- [ ] Add to Stripe checkout metadata
- [ ] Test: Verify metadata passed to webhook

### Step 2: Enhance fulfillment.ts
- [ ] Add `notifyPreferredMechanic()` function
- [ ] Add `scheduleFallbackBroadcast()` function
- [ ] Update `createSessionRequest()` with conditional routing
- [ ] Add feature flag checks
- [ ] Add error handling with graceful fallback

### Step 3: Optional - Enhance broadcastSessionRequest()
- [ ] Add optional `excludeMechanicId` parameter
- [ ] Add optional `reason` parameter
- [ ] Update function signature
- [ ] Maintain backward compatibility

### Step 4: Testing
- [ ] Test Scenario 1: Mechanic accepts within 10 min
- [ ] Test Scenario 2: Mechanic ignores (timeout)
- [ ] Test Scenario 3: Mechanic offline
- [ ] Test Scenario 4: Standard broadcast (no favorite)
- [ ] Test Scenario 5: Feature flag OFF

### Step 5: Verification
- [ ] Create `phase3-verification.md`
- [ ] Document test results
- [ ] Verify metadata structure
- [ ] Verify no breaking changes

---

## ⚠️ Known Limitations

### 1. setTimeout in Serverless Environment
**Issue**: Vercel/serverless functions have execution time limits
**Mitigation**:
- 10-minute timer runs in background
- If function times out, session still in database
- Next webhook/cron can pick up orphaned sessions
- Future: Move to scheduled job (Vercel Cron, Supabase Functions)

**Impact**: Low - most sessions match within seconds

### 2. No Cancellation of Timer
**Issue**: If mechanic accepts, timer still fires (but checks session status)
**Mitigation**:
- Fallback function checks if session already matched
- If matched, early return (no duplicate broadcast)

**Impact**: None - just a harmless check

### 3. Hard-Coded 10-Minute Window
**Issue**: Not configurable per customer or plan
**Mitigation**:
- 10 minutes is reasonable for all use cases
- Could add env var `PRIORITY_WINDOW_MINUTES` if needed

**Impact**: Low - 10 min is industry standard

---

## 🎯 Success Criteria

### All Must Pass ✅

1. **Priority Notification** → Preferred mechanic receives targeted notification
2. **Fallback Broadcast** → System broadcasts after 10 min if no response
3. **No Stuck Sessions** → Customer never waits indefinitely
4. **Feature Flag Gating** → All priority logic skipped when flag OFF
5. **Backward Compatible** → Standard broadcast unchanged
6. **Error Resilient** → Falls back to broadcast on ANY error
7. **Metadata Logged** → All priority events recorded in session metadata
8. **No Breaking Changes** → Existing flows work identically

---

## 📝 Next Steps After Phase 3

### Phase 4: Database Migration (Final)
- Add `preferred_mechanic_id` column to `session_requests`
- Add `priority_window_minutes` column
- Add `priority_notified_at` column
- Migrate JSONB metadata to typed columns (optional)
- Update RLS policies

### Future Enhancements (Post-Phase 4)
- Real-time countdown timer in mechanic UI
- Customer notification when preferred mechanic accepts
- Analytics dashboard for priority success rate
- Configurable priority window per plan tier
- Multi-mechanic priority (fallback chain)

---

## 🛑 STOP — AWAITING APPROVAL

**Planning Status**: ✅ COMPLETE
**Implementation Status**: 🟡 PENDING APPROVAL

**Review this plan and approve when ready.**

**To proceed with Phase 3 implementation**:
```
APPROVE PHASE 3 — PROCEED WITH IMPLEMENTATION
```

**If changes needed to plan**:
Specify what needs adjustment and I will revise.

---

**END OF PHASE 3 PLAN**
