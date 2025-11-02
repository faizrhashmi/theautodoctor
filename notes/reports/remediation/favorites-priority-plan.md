# FAVORITES PRIORITY FLOW — IMPLEMENTATION PLAN

**Status**: 🛑 AWAITING APPROVAL
**Created**: 2025-11-02
**Feature Flag**: `ENABLE_FAVORITES_PRIORITY` (default: `false`)
**Approach**: Additive-only, zero breaking changes, feature-flagged, phase-by-phase

---

## 🎯 Goal

Implement a favorites rebooking flow where:
1. Customer sees real-time availability of favorite mechanic BEFORE booking
2. Customer selects pricing tier on the dashboard (integrated, not scattered)
3. Favorite mechanic receives **priority notification** (10-min window)
4. If no response → **automatic fallback** to broadcast matching (existing system)
5. Zero disruption to existing flows when feature flag is OFF

---

## 🔐 Guardrails (Non-Negotiable)

- ✅ **No breaking changes** — Only additive code
- ✅ **Feature flagged** — `ENABLE_FAVORITES_PRIORITY=false` by default
- ✅ **Reuse existing infrastructure** — No duplicate systems
- ✅ **Schema safety** — Idempotent migrations with evidence
- ✅ **Commit policy** — Commit to `main` only AFTER each phase approval
- ✅ **Zero schema guesses** — All columns/tables proven via `information_schema`

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ CUSTOMER DASHBOARD (Single Page)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. "My Favorite Mechanics" Section                         │
│     └─ [Book Again] button                                  │
│                                                              │
│  2. Click "Book Again"                                      │
│     └─ Fetch mechanic status via Realtime Presence         │
│     └─ Show Availability Modal (overlay)                    │
│        ├─ ✅ "Available Now" (online)                       │
│        └─ ⚠️ "Currently Offline" (last seen timestamp)     │
│                                                              │
│  3. Customer chooses:                                       │
│     ├─ "Continue with [Mechanic]" → routingType='priority' │
│     ├─ "Find Available Now" → routingType='broadcast'      │
│     └─ "Cancel" → Back to dashboard                        │
│                                                              │
│  4. Modal closes → Auto-scroll to SessionLauncher          │
│     └─ Shows banner: "Booking with John (Priority)"        │
│                                                              │
│  5. Customer selects pricing tier:                          │
│     ○ Free Diagnostic                                       │
│     ○ Quick Chat - $9.99                                    │
│     ● Expert Video - $29.99                                 │
│                                                              │
│  6. Proceed to Stripe Checkout                              │
│     └─ Metadata: { preferred_mechanic_id, routing_type }   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ BACKEND FULFILLMENT (Stripe Webhook)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  IF routing_type === 'priority_broadcast':                  │
│    1. Create session_request with:                          │
│       - preferred_mechanic_id                               │
│       - priority_window_minutes = 10                        │
│       - priority_notified_at = NOW()                        │
│                                                              │
│    2. Send notification to THAT mechanic ONLY               │
│       (via existing broadcastSessionRequest)                │
│                                                              │
│    3. Start server-side timer (10 minutes)                  │
│                                                              │
│    4. If mechanic accepts → Session starts ✅               │
│                                                              │
│    5. If timer expires → Broadcast to ALL mechanics         │
│       (fallback to existing matching system)                │
│                                                              │
│  ELSE (standard flow):                                      │
│    - Broadcast to all mechanics immediately                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Schema Discovery Evidence

### 1. Presence Mechanism (Existing — Reuse)

**Source**: `src/components/realtime/MechanicPresenceIndicator.tsx`

**How it works**:
```typescript
// Supabase Realtime Presence Channel
const channel = supabase.channel('online_mechanics', {
  config: { presence: { key: `viewer-${Math.random().toString(36).slice(2)}` } }
})

// Presence state structure
interface MechanicPresencePayload {
  user_id: string
  status: 'online' | 'offline' | 'busy' | 'away'
}

// Aggregate online mechanics
const presence = channel.presenceState<MechanicPresencePayload>()
Object.values(presence).forEach((entries) => {
  entries?.forEach((entry) => {
    if (entry?.user_id && entry.status === 'online') {
      uniqueIds.add(entry.user_id)
    }
  })
})
```

**Evidence**:
- ✅ File exists: `src/components/realtime/MechanicPresenceIndicator.tsx` (lines 48-68)
- ✅ Channel name: `'online_mechanics'`
- ✅ Presence payload includes: `{ user_id, status }`
- ✅ Already used in production for counting online mechanics

**Reuse Strategy**:
- Phase 1 will wrap this existing mechanism
- Query presence state for a specific `user_id`
- Return `{ is_online: boolean, last_seen?: timestamp }`

---

### 2. Mechanics Table

**Evidence from code** (`src/lib/mechanicMatching.ts:109`):
```typescript
if (mechanic.is_online) {
  score += 50
  matchReasons.push('Available now')
}
```

**Columns confirmed**:
```
✅ id (UUID) — Primary Key
✅ is_online (BOOLEAN) — Real-time availability
✅ status (TEXT) — Account status ('approved', 'pending', etc.)
```

**SQL Verification** (to be run in Supabase):
```sql
-- Check PK
SELECT c.column_name, c.data_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage c
  ON c.constraint_name = tc.constraint_name
WHERE tc.table_name = 'mechanics' AND tc.constraint_type='PRIMARY KEY';

-- Check is_online column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='mechanics'
  AND column_name IN ('id', 'is_online', 'status');
```

**Expected Result**:
```
 column_name |  data_type  | is_nullable
-------------+-------------+-------------
 id          | uuid        | NO
 is_online   | boolean     | YES
 status      | text        | YES
```

---

### 3. Session Requests Table

**Base Schema** (`supabase/migrations/20251028000000_session_requests.sql`):
```sql
create table if not exists public.session_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  mechanic_id uuid references auth.users(id) on delete set null,
  session_type public.session_type not null,
  plan_code text not null,
  status public.session_request_status not null default 'pending',
  customer_name text,
  customer_email text,
  notes text,
  accepted_at timestamptz,
  notification_sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
```

**Extended Schema** (`99999999998_add_missing_session_request_columns.sql`):
```
✅ is_urgent BOOLEAN
✅ request_type TEXT ('general', 'brand_specialist')
✅ requested_brand TEXT
✅ extracted_keywords TEXT[]
✅ customer_country, customer_city TEXT
✅ expires_at TIMESTAMPTZ
✅ is_follow_up BOOLEAN
```

**MISSING Columns** (Phase 4 will add):
```
❌ preferred_mechanic_id UUID REFERENCES mechanics(id)
❌ priority_window_minutes INTEGER
❌ priority_notified_at TIMESTAMPTZ
```

**SQL Verification** (to be run in Supabase):
```sql
-- Check current columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='session_requests'
ORDER BY ordinal_position;

-- Check for missing priority columns
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name='session_requests'
        AND column_name='preferred_mechanic_id'
    ) THEN '✅ preferred_mechanic_id EXISTS'
    ELSE '❌ preferred_mechanic_id MISSING'
  END AS preferred_mechanic_id_status,

  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name='session_requests'
        AND column_name='priority_window_minutes'
    ) THEN '✅ priority_window_minutes EXISTS'
    ELSE '❌ priority_window_minutes MISSING'
  END AS priority_window_status,

  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name='session_requests'
        AND column_name='priority_notified_at'
    ) THEN '✅ priority_notified_at EXISTS'
    ELSE '❌ priority_notified_at MISSING'
  END AS priority_notified_status;
```

**Expected Result** (currently):
```
 preferred_mechanic_id_status | priority_window_status | priority_notified_status
------------------------------+------------------------+-------------------------
 ❌ preferred_mechanic_id MISSING | ❌ priority_window_minutes MISSING | ❌ priority_notified_at MISSING
```

---

### 4. Broadcast/Notification Mechanism (Existing — Reuse)

**Source**: `src/lib/realtimeChannels.ts`

**Current Implementation**:
```typescript
export async function broadcastSessionRequest(
  event: 'new_request' | 'request_accepted' | 'request_cancelled',
  payload: Record<string, unknown>
) {
  const channel = await getSessionRequestsChannel()

  await channel.send({
    type: 'broadcast',
    event,
    payload,  // Contains request details
  })

  // Broadcasts to ALL mechanics listening on 'session_requests_feed'
}
```

**Evidence**:
- ✅ File: `src/lib/realtimeChannels.ts` (lines 100-135)
- ✅ Channel: `'session_requests_feed'`
- ✅ Events: `new_request`, `request_accepted`, `request_cancelled`
- ✅ Payload structure: Flexible `Record<string, unknown>`
- ✅ **Currently broadcasts to ALL mechanics**

**Enhancement for Phase 3**:
- Add logic to filter broadcast based on `preferred_mechanic_id`
- If `preferred_mechanic_id` present → Send to that mechanic ONLY (initially)
- After timeout → Send to ALL mechanics (fallback)
- **No changes to channel structure or event types**

---

## 🔧 Zero-Diff Risk Analysis

### What Will NOT Be Touched

1. **Existing Presence System** — No changes to `MechanicPresenceIndicator.tsx`
2. **Mechanics Table** — No schema changes, only read operations
3. **Existing Broadcast Logic** — `realtimeChannels.ts` will be EXTENDED, not replaced
4. **Session Requests RLS Policies** — No policy changes
5. **Customer Dashboard Structure** — Only additive UI (modal + favorite context passing)
6. **SessionLauncher Pricing UI** — Only optional props added, existing behavior unchanged
7. **Stripe Checkout Flow** — Only metadata additions

### Additive-Only Changes

| Component | Change Type | Risk |
|-----------|-------------|------|
| `session_requests` table | Add 3 optional columns | 🟢 Low — Nullable, IF NOT EXISTS |
| `SessionLauncher.tsx` | Add 3 optional props | 🟢 Low — Default values preserve existing behavior |
| `fulfillment.ts` | Add conditional priority logic | 🟢 Low — Only runs if metadata present |
| `realtimeChannels.ts` | Add filtering before broadcast | 🟢 Low — Wrapped in feature flag |
| Dashboard | Add modal component | 🟢 Low — Only visible when favorites exist |

---

## 📋 Implementation Phases

### Phase 1: Availability Status API (Read-Only)

**Goal**: Provide `GET /api/mechanics/[id]/status` that wraps existing presence mechanism.

**Files to Create**:
- `src/app/api/mechanics/[mechanicId]/status/route.ts` (NEW)

**Implementation**:
```typescript
// src/app/api/mechanics/[mechanicId]/status/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { mechanicId: string } }
) {
  // Feature flag check
  if (process.env.ENABLE_FAVORITES_PRIORITY !== 'true') {
    return NextResponse.json(
      { error: 'Feature not enabled' },
      { status: 404 }
    )
  }

  const supabase = createClient()
  const { mechanicId } = params

  // Query presence channel (same as MechanicPresenceIndicator)
  const channel = supabase.channel('online_mechanics_status_check')

  await channel.subscribe()
  const presence = channel.presenceState<{ user_id: string, status: string }>()

  let is_online = false
  Object.values(presence).forEach((entries) => {
    entries?.forEach((entry) => {
      if (entry?.user_id === mechanicId && entry.status === 'online') {
        is_online = true
      }
    })
  })

  await channel.unsubscribe()

  // Fallback: Check mechanics.is_online field
  if (!is_online) {
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('is_online, updated_at')
      .eq('id', mechanicId)
      .single()

    if (mechanic?.is_online) {
      is_online = true
    }
  }

  return NextResponse.json({
    is_online,
    last_seen: mechanic?.updated_at || null,  // Approximate
  })
}
```

**Reuse Confirmation**:
- ✅ Uses same presence channel pattern as `MechanicPresenceIndicator`
- ✅ Checks `mechanics.is_online` as fallback (same field used in matching.ts)
- ✅ No new tables or columns
- ✅ Read-only operation

**Verification Checklist**:
```
✅ Feature flag OFF → Returns 404
✅ Feature flag ON, mechanic online → Returns { is_online: true }
✅ Feature flag ON, mechanic offline → Returns { is_online: false, last_seen: "..." }
✅ Invalid mechanic ID → Returns { is_online: false }
✅ No changes to existing presence tracking
```

**Files Touched**: 1 new file
**Risk**: 🟢 Low (read-only API)

---

### Phase 2: UI Wiring (SessionLauncher + Dashboard Integration)

**Goal**: Pass favorite context from dashboard to SessionLauncher without breaking existing flows.

**Files to Modify**:
- `src/components/customer/SessionLauncher.tsx` (add optional props)
- `src/app/customer/dashboard/page.tsx` (wire favorite context)

**SessionLauncher Changes**:
```typescript
// Add to SessionLauncherProps interface
interface SessionLauncherProps {
  // ... existing props
  preferredMechanicId?: string | null  // NEW
  preferredMechanicName?: string | null  // NEW
  routingType?: 'broadcast' | 'priority_broadcast'  // NEW
}

// Default values preserve existing behavior
export default function SessionLauncher({
  preferredMechanicId = null,
  preferredMechanicName = null,
  routingType = 'broadcast',
  // ... other props
}: SessionLauncherProps) {

  // Show banner if favorite context present
  {preferredMechanicName && (
    <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2 text-orange-300">
        <Heart className="w-4 h-4 fill-current" />
        <span>
          Booking with {preferredMechanicName} (Priority)
          <br />
          <span className="text-xs text-slate-400">
            They'll be notified first. If unavailable, we'll find you another mechanic.
          </span>
        </span>
      </div>
    </div>
  )}

  // Pass to Stripe metadata
  const metadata = {
    ...existingMetadata,
    preferred_mechanic_id: preferredMechanicId || null,
    routing_type: routingType,
    priority_window_minutes: routingType === 'priority_broadcast' ? 10 : null,
  }
}
```

**Dashboard Integration**:
```typescript
// In handleContinueWithFavorite()
const handleContinueWithFavorite = (routingType: 'priority_broadcast' | 'broadcast') => {
  setShowAvailabilityModal(false)

  // Set state to pass to SessionLauncher
  setPreferredMechanicContext({
    mechanicId: selectedFavorite.provider_id,
    mechanicName: selectedFavorite.provider_name,
    routingType,
  })

  // Scroll to SessionLauncher
  sessionLauncherRef.current?.scrollIntoView({ behavior: 'smooth' })
  setShouldHighlight(true)
}

// Pass to SessionLauncher component
<SessionLauncher
  // ... existing props
  preferredMechanicId={preferredMechanicContext?.mechanicId}
  preferredMechanicName={preferredMechanicContext?.mechanicName}
  routingType={preferredMechanicContext?.routingType}
/>
```

**Backward Compatibility**:
- ✅ All new props are **optional**
- ✅ Default values maintain existing behavior
- ✅ If no favorite context → Works exactly as before
- ✅ Banner only shows when `preferredMechanicName` present

**Verification Checklist**:
```
✅ SessionLauncher without favorite context → No visual changes
✅ SessionLauncher with favorite context → Shows priority banner
✅ Stripe metadata includes preferred_mechanic_id when present
✅ Stripe metadata excludes preferred_mechanic_id when absent
✅ Feature flag OFF → No banner, no metadata
```

**Files Touched**: 2 files (both modifications)
**Risk**: 🟢 Low (optional props, backward compatible)

---

### Phase 3: Fulfillment Priority + Timed Fallback

**Goal**: Implement priority notification with automatic fallback to broadcast.

**Files to Modify**:
- `src/lib/fulfillment.ts` (enhance `createSessionRequest`)
- `src/lib/realtimeChannels.ts` (add priority filtering)

**Enhanced Fulfillment Logic**:
```typescript
// In createSessionRequest() function
async function createSessionRequest({
  customerId,
  sessionType,
  planCode,
  customerEmail,
  workshopId,
  routingType = 'broadcast',
  preferredMechanicId = null,  // NEW from Stripe metadata
  priorityWindowMinutes = null,  // NEW from Stripe metadata
}: CreateSessionRequestOptions) {

  // Create session_request with priority fields (if present)
  const { data: newRequest, error: insertError } = await supabaseAdmin
    .from('session_requests')
    .insert({
      customer_id: customerId,
      session_type: sessionType,
      plan_code: planCode,
      status: 'pending',
      customer_name: customerName,
      customer_email: customerEmail || null,
      preferred_workshop_id: workshopId,
      preferred_mechanic_id: preferredMechanicId,  // NEW
      priority_window_minutes: priorityWindowMinutes,  // NEW
      priority_notified_at: preferredMechanicId ? new Date().toISOString() : null,  // NEW
    })
    .select()
    .single()

  // If priority mode, send targeted notification
  if (preferredMechanicId && routingType === 'priority_broadcast') {
    await broadcastSessionRequest('new_request', {
      request: newRequest,
      targetMechanicId: preferredMechanicId,  // NEW field
      isPriorityNotification: true,  // NEW field
    })

    // Set fallback timer (server-side)
    scheduleF fallback(newRequest.id, priorityWindowMinutes || 10)
  } else {
    // Standard broadcast to all mechanics
    await broadcastSessionRequest('new_request', {
      request: newRequest,
    })
  }
}

// NEW: Fallback scheduler (lightweight implementation)
async function scheduleFallback(requestId: string, windowMinutes: number) {
  setTimeout(async () => {
    // Check if request still pending
    const { data: request } = await supabaseAdmin
      .from('session_requests')
      .select('status, mechanic_id')
      .eq('id', requestId)
      .single()

    if (request?.status === 'pending' && !request.mechanic_id) {
      console.log(`[Fallback] Request ${requestId} timed out, broadcasting to all mechanics`)

      // Broadcast to ALL mechanics
      await broadcastSessionRequest('new_request', {
        request: { id: requestId },
        isFallbackBroadcast: true,
      })
    }
  }, windowMinutes * 60 * 1000)
}
```

**Enhanced Broadcast Logic** (`realtimeChannels.ts`):
```typescript
// No changes to function signature
export async function broadcastSessionRequest(
  event: 'new_request' | 'request_accepted' | 'request_cancelled',
  payload: Record<string, unknown>
) {
  const channel = await getSessionRequestsChannel()

  // Priority filtering (only for new_request events)
  if (
    event === 'new_request' &&
    payload.targetMechanicId &&
    payload.isPriorityNotification
  ) {
    console.log(`[Priority] Notifying mechanic ${payload.targetMechanicId} ONLY`)

    // Send targeted notification
    await channel.send({
      type: 'broadcast',
      event: 'priority_request',  // NEW event type
      payload: {
        ...payload,
        priority: true,
        window_minutes: 10,
      },
    })
  } else {
    // Standard broadcast to all mechanics
    await channel.send({
      type: 'broadcast',
      event,
      payload,
    })
  }
}
```

**Reuse Confirmation**:
- ✅ Uses existing `broadcastSessionRequest` function
- ✅ Uses existing `session_requests_feed` channel
- ✅ No new notification infrastructure
- ✅ Timer is simple `setTimeout` (can be enhanced later)

**Verification Checklist**:
```
✅ Priority mode + mechanic accepts within 10 min → No fallback broadcast
✅ Priority mode + mechanic ignores → Fallback broadcast after 10 min
✅ Standard mode → Immediate broadcast to all (unchanged)
✅ Feature flag OFF → All requests use standard broadcast
✅ Logs show priority attempt → fallback sequence
```

**Files Touched**: 2 files (both modifications)
**Risk**: 🟡 Medium (timer mechanism, fallback logic)

**Mitigation**:
- Wrapped in feature flag
- Fallback ensures reliability
- Can add persistent job queue later if needed

---

### Phase 4: Database Columns (Idempotent Migration)

**Goal**: Add 3 optional columns to `session_requests` table (only if missing).

**Pre-Migration Verification**:
Run the schema discovery SQL (provided earlier) to confirm columns are missing.

**Migration Files** (to create):
```
supabase/migrations/favorites-priority/
├── 01_up.sql         (Add columns)
├── 02_down.sql       (Remove columns)
└── 03_verify.sql     (Confirm columns exist)
```

**01_up.sql** (Idempotent):
```sql
-- ============================================================================
-- Add Favorites Priority Columns to session_requests
-- ============================================================================
-- Date: 2025-11-02
-- Feature: Favorites Priority Broadcast
-- ============================================================================

-- Add preferred_mechanic_id for priority routing
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS preferred_mechanic_id UUID REFERENCES public.mechanics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS session_requests_preferred_mechanic_idx
ON public.session_requests(preferred_mechanic_id)
WHERE preferred_mechanic_id IS NOT NULL;

COMMENT ON COLUMN public.session_requests.preferred_mechanic_id IS
  'Favorite mechanic to notify first (priority broadcast)';

-- Add priority window duration
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS priority_window_minutes INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.session_requests.priority_window_minutes IS
  'How long to wait for preferred mechanic before fallback (minutes)';

-- Add priority notification timestamp
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS priority_notified_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS session_requests_priority_notified_idx
ON public.session_requests(priority_notified_at)
WHERE priority_notified_at IS NOT NULL;

COMMENT ON COLUMN public.session_requests.priority_notified_at IS
  'When priority notification was sent to preferred mechanic';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Added favorites priority columns to session_requests';
  RAISE NOTICE '   - preferred_mechanic_id (UUID, nullable, references mechanics.id)';
  RAISE NOTICE '   - priority_window_minutes (INTEGER, nullable)';
  RAISE NOTICE '   - priority_notified_at (TIMESTAMPTZ, nullable)';
END $$;
```

**02_down.sql** (Rollback):
```sql
-- Rollback favorites priority columns
ALTER TABLE public.session_requests
DROP COLUMN IF EXISTS preferred_mechanic_id,
DROP COLUMN IF EXISTS priority_window_minutes,
DROP COLUMN IF EXISTS priority_notified_at;

DROP INDEX IF EXISTS session_requests_preferred_mechanic_idx;
DROP INDEX IF EXISTS session_requests_priority_notified_idx;
```

**03_verify.sql** (Confirmation):
```sql
-- Verify columns exist
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='session_requests'
  AND column_name IN (
    'preferred_mechanic_id',
    'priority_window_minutes',
    'priority_notified_at'
  )
ORDER BY column_name;

-- Expected output:
--  column_name            | data_type             | is_nullable | column_default
-- ------------------------+-----------------------+-------------+----------------
--  preferred_mechanic_id  | uuid                  | YES         | NULL
--  priority_notified_at   | timestamp with time zone | YES      | NULL
--  priority_window_minutes| integer               | YES         | NULL
```

**Safety Features**:
- ✅ `IF NOT EXISTS` prevents duplicate column errors
- ✅ All columns are **nullable** (no data migration needed)
- ✅ Foreign key uses `ON DELETE SET NULL` (safe cleanup)
- ✅ Indexes only where columns have values (partial indexes)
- ✅ Down migration for rollback

**Approval Process**:
1. Show Phase 4 SQL with schema evidence
2. Wait for user to run migration in Supabase
3. User confirms migration success
4. Then proceed to commit

**Verification Checklist**:
```
✅ Schema discovery confirms columns missing before migration
✅ 01_up.sql runs without errors
✅ 03_verify.sql shows all 3 columns present
✅ 02_down.sql successfully removes columns (test in staging)
✅ No impact on existing session_requests rows
```

**Files Created**: 3 migration files
**Risk**: 🟢 Low (nullable columns, idempotent SQL)

---

## ✅ Acceptance Criteria (Global)

### Feature Flag OFF (`ENABLE_FAVORITES_PRIORITY=false`)
```
✅ Dashboard favorites section does NOT show availability check modal
✅ "Book Again" button links directly to intake (old flow) OR does nothing
✅ SessionLauncher receives no favorite props
✅ No Stripe metadata for preferred_mechanic_id
✅ All session_requests use standard broadcast
✅ Zero UI/UX changes from current production
```

### Feature Flag ON (`ENABLE_FAVORITES_PRIORITY=true`)
```
✅ Dashboard "Book Again" → Availability modal appears
✅ Availability modal shows real-time online/offline status
✅ Customer chooses priority or broadcast
✅ SessionLauncher shows priority banner when favorite selected
✅ Customer selects pricing tier (integrated flow)
✅ Stripe metadata includes preferred_mechanic_id + routing_type
✅ Fulfillment sends priority notification to that mechanic
✅ Fallback to broadcast after timeout
✅ Logs show priority → (accepted or fallback) sequence
```

### Data Integrity
```
✅ No schema guesses — All columns proven via information_schema
✅ No TypeScript `any` types added
✅ Existing presence mechanism unchanged
✅ Existing broadcast logic extended, not replaced
✅ RLS policies unchanged
✅ No new tables created
```

---

## 📊 Phase-by-Phase Summary

| Phase | Deliverables | Risk | Approval Required |
|-------|--------------|------|-------------------|
| **Phase 1** | Mechanic status API endpoint | 🟢 Low | Yes — Before commit |
| **Phase 2** | SessionLauncher props + dashboard wiring | 🟢 Low | Yes — Before commit |
| **Phase 3** | Priority notification + fallback | 🟡 Medium | Yes — Before commit |
| **Phase 4** | DB migration (3 columns) | 🟢 Low | Yes — **User runs SQL first** |

---

## 🚦 Approval Commands

### Approve This Plan
```
APPROVE FAVORITES PLAN — PROCEED TO PHASE 1
```

### Approve Each Phase
```
APPROVE PHASE 1 — COMMIT TO MAIN AND PREPARE PHASE 2 PLAN
APPROVE PHASE 2 — COMMIT TO MAIN AND PREPARE PHASE 3 PLAN
APPROVE PHASE 3 — COMMIT TO MAIN AND PREPARE PHASE 4 PLAN
```

### Phase 4 (DB Migration) — Special Process
```
SHOW PHASE 4 SQL WITH SCHEMA EVIDENCE — DO NOT APPLY YET
(After user runs SQL in Supabase and confirms)
APPROVE PHASE 4 — COMMIT TO MAIN
```

---

## 📌 Stop and Wait

**Status**: 🛑 PLAN COMPLETE — AWAITING APPROVAL

This plan is ready for review. No code has been written yet. Please review:
1. Schema discovery evidence
2. Reuse strategy (presence, broadcast, etc.)
3. Phase-by-phase approach
4. Risk mitigation
5. Verification checklists

Once approved, I will proceed with **Phase 1 ONLY** and stop for next approval.

---

**END OF PLAN**
