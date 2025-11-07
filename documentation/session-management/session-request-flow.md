# Session Request Flow

**Date Documented**: October 22, 2025
**Status**: Active
**Category**: Session Management, Business Logic

## Overview

This document explains the two different flows for creating sessions in the Auto Doctor application, and why this dual-flow architecture was causing confusion.

## The Two Tables

### session_requests Table

**Purpose**: Stores pending requests that need mechanic acceptance.

**Schema**: [supabase/migrations/20251028000000_session_requests.sql](c:\Users\Faiz Hashmi\theautodoctor\supabase\migrations\20251028000000_session_requests.sql)

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

**Status Values**: `pending`, `accepted`, `cancelled`

### sessions Table

**Purpose**: Stores actual sessions (scheduled, active, or completed).

**Schema**: [supabase/2025-02-14_enhanced_sessions.sql](c:\Users\Faiz Hashmi\theautodoctor\supabase\2025-02-14_enhanced_sessions.sql)

```sql
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  mechanic_id uuid references profiles(id),
  customer_user_id uuid references auth.users(id),
  customer_email text,
  plan text not null,
  type public.session_type not null,
  status public.session_status not null,
  stripe_session_id text unique,
  intake_id uuid,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  scheduled_for timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes int,
  metadata jsonb default '{}'::jsonb
);
```

**Status Values**: `pending`, `scheduled`, `waiting`, `live`, `completed`, `cancelled`

## Flow 1: Request → Accept (Proper Flow)

This is the intended flow for mechanics to accept customer requests.

### Step-by-Step

```
┌─────────────────────┐
│   Customer          │
│   Creates Request   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  POST /api/requests                 │
│  - Customer authenticated           │
│  - Validates session type & plan    │
│  - Creates session_requests row     │
│  - Status: 'pending'                │
│  - mechanic_id: NULL                │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  session_requests table             │
│  - id: uuid                         │
│  - customer_id: user.id             │
│  - status: 'pending'                │
│  - mechanic_id: NULL                │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Mechanic Dashboard                 │
│  "Incoming Requests"                │
│  - Queries pending requests         │
│  - Shows customer details           │
│  - "Accept" button visible          │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Mechanic clicks "Accept"           │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  POST /api/mechanics/requests/      │
│       [id]/accept                   │
│  - Verifies mechanic auth           │
│  - Updates session_requests:        │
│    * status: 'accepted'             │
│    * mechanic_id: mechanic.id       │
│    * accepted_at: now()             │
│  - Creates sessions row:            │
│    * mechanic_id: mechanic.id       │
│    * customer_user_id: customer_id  │
│    * status: 'waiting'              │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  sessions table                     │
│  - id: uuid (new)                   │
│  - mechanic_id: mechanic.id ✅      │
│  - customer_user_id: customer.id    │
│  - status: 'waiting'                │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Both Dashboards                    │
│  - Customer: "Active Session"       │
│  - Mechanic: "Upcoming Sessions"    │
└─────────────────────────────────────┘
```

### Code: Create Request

**File**: [src/app/api/requests/route.ts:63-129](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\requests\route.ts)

```typescript
export async function POST(request: NextRequest) {
  const supabase = getSupabaseServer()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionType, planCode, notes } = await request.json()

  // Validate inputs
  if (!SUPPORTED_SESSION_TYPES.has(sessionType)) {
    return NextResponse.json({ error: 'Unsupported session type' }, { status: 400 })
  }

  // Get customer name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const customerName = profile?.full_name ?? user.email ?? 'Customer'

  // Create pending request
  const { data: inserted, error: insertError } = await supabase
    .from('session_requests')
    .insert({
      customer_id: user.id,
      session_type: sessionType,
      plan_code: planCode,
      notes,
      customer_name: customerName,
      customer_email: user.email ?? null,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: 'Unable to create session request' }, { status: 500 })
  }

  // Broadcast to mechanics
  void broadcastSessionRequest('new_request', {
    id: inserted.id,
    customerName: inserted.customer_name ?? 'Customer',
    sessionType: inserted.session_type,
    planCode: inserted.plan_code,
    createdAt: inserted.created_at,
  })

  // Send email notifications
  void maybeEmailMechanics(inserted)

  return NextResponse.json({ request: toSessionRequest(inserted) }, { status: 201 })
}
```

### Code: Accept Request

**File**: [src/app/api/mechanics/requests/[id]/accept/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\mechanics\requests\[id]\accept\route.ts)

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = params.id

  // Verify mechanic authentication
  const mechanic = await getMechanicFromCookie(request)
  if (!mechanic) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  // Update session_requests to accepted
  const { data: accepted, error: updateError } = await supabaseAdmin
    .from('session_requests')
    .update({
      mechanic_id: mechanic.id,
      status: 'accepted',
      accepted_at: now
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .is('mechanic_id', null)
    .select()
    .maybeSingle()

  if (updateError || !accepted) {
    return NextResponse.json({ error: 'Unable to accept request' }, { status: 500 })
  }

  // Create session row
  const { data: sessionRow, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .insert({
      mechanic_id: mechanic.id,
      customer_user_id: accepted.customer_id,
      customer_email: accepted.customer_email,
      status: 'waiting',
      plan: accepted.plan_code,
      type: accepted.session_type,
      stripe_session_id: `req_${accepted.id}`,
      scheduled_start: now,
      scheduled_end: now,
      scheduled_for: now,
      metadata: {
        request_id: accepted.id,
        customer_id: accepted.customer_id,
        customer_name: accepted.customer_name ?? 'Customer',
      },
    })
    .select('id')
    .single()

  // Broadcast acceptance
  void broadcastSessionRequest('request_accepted', {
    id: accepted.id,
    mechanicId: accepted.mechanic_id,
    mechanicName: mechanic.name ?? mechanic.email ?? 'Mechanic',
  })

  return NextResponse.json({
    request: toSessionRequest(accepted),
    session: sessionRow ? { id: sessionRow.id } : null
  })
}
```

## Flow 2: Intake Form (Direct Session Creation)

This flow bypasses the request system and creates sessions directly.

### Step-by-Step

```
┌─────────────────────┐
│   Customer          │
│   Fills Intake Form │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  POST /api/intake/start             │
│  - Creates intake record            │
│  - Creates session directly         │
│  - mechanic_id: NULL ⚠️             │
│  - status: 'live' or 'pending'      │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  sessions table                     │
│  - id: uuid                         │
│  - mechanic_id: NULL ⚠️             │
│  - customer_user_id: user.id        │
│  - status: 'live'                   │
│  - plan: 'free'                     │
│  - metadata.source: 'intake'        │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Customer Dashboard                 │
│  "Active Sessions"                  │
│  - Shows session as active ✅       │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Mechanic Dashboard                 │
│  "Incoming Requests"                │
│  - Empty! ⚠️                        │
│  (Session not in session_requests)  │
└─────────────────────────────────────┘
```

### The Problem

1. Customer completes intake form
2. Session created directly in `sessions` table
3. No row in `session_requests` table
4. `mechanic_id` is `NULL` (no mechanic assigned)
5. Customer sees "active session" ✅
6. Mechanic sees nothing ❌

### Why This Happened

Looking at database results from `GET /api/test/check-sessions`:

```json
{
  "sessions": {
    "count": 10,
    "recent": [
      {
        "id": "105ae74b-86e6-4141-b336-48df69b430a6",
        "plan": "free",
        "status": "live",
        "mechanic_id": null,  // ⚠️ No mechanic assigned
        "metadata": {
          "plan": "free",
          "source": "intake",  // ⚠️ Created from intake
          "intake_id": "069d7772-a690-4ec2-9852-5dcaa73f83f7"
        }
      }
    ]
  }
}
```

## The Decision: Which Flow to Use?

After discussion, we decided on **Flow 1: Request → Accept** as the primary flow.

### Reasoning

**Flow 1 (Request → Accept) Advantages**:
- ✅ Mechanics can see and accept requests
- ✅ Better control over mechanic assignment
- ✅ Prevents orphaned sessions
- ✅ Allows mechanics to see request details before accepting
- ✅ Supports scheduling/availability logic

**Flow 2 (Intake Direct) Disadvantages**:
- ❌ Creates orphaned sessions (mechanic_id = NULL)
- ❌ No mechanic notification
- ❌ Customer waits indefinitely
- ❌ No clear handoff mechanism
- ❌ Confusing for both parties

### Implementation Strategy

**Short Term**:
- Keep both flows operational
- Fix Flow 1 to work properly (this session's work)
- Document the differences

**Long Term**:
- Migrate all session creation to Flow 1
- Update intake form to create requests instead of sessions
- Add "claim session" feature for orphaned sessions
- Or: Add mechanic auto-assignment logic

## Orphaned Sessions Issue

### Problem

Multiple sessions exist with `mechanic_id = NULL`:

```sql
SELECT id, status, mechanic_id, customer_user_id, plan, type, created_at
FROM sessions
WHERE mechanic_id IS NULL
ORDER BY created_at DESC;
```

Results: 10 orphaned sessions found (including the one the user reported).

### Solutions

#### Option 1: Manual Cleanup
```sql
-- Delete orphaned sessions older than 1 day
DELETE FROM sessions
WHERE mechanic_id IS NULL
  AND created_at < NOW() - INTERVAL '1 day';
```

#### Option 2: Convert to Requests
```sql
-- For each orphaned session, create a request
INSERT INTO session_requests (
  customer_id,
  session_type,
  plan_code,
  status,
  customer_name,
  customer_email,
  metadata
)
SELECT
  customer_user_id,
  type,
  plan,
  'pending',
  metadata->>'customer_name',
  customer_email,
  jsonb_build_object('migrated_from_session', id)
FROM sessions
WHERE mechanic_id IS NULL
  AND status IN ('pending', 'live');
```

#### Option 3: Auto-Assign Logic
```typescript
// Cron job or trigger to auto-assign orphaned sessions
async function assignOrphanedSessions() {
  const { data: orphaned } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .is('mechanic_id', null)
    .in('status', ['pending', 'live'])

  for (const session of orphaned || []) {
    // Find available mechanic
    const mechanic = await findAvailableMechanic(session.type)

    if (mechanic) {
      await supabaseAdmin
        .from('sessions')
        .update({ mechanic_id: mechanic.id })
        .eq('id', session.id)

      // Notify mechanic
      await notifyMechanic(mechanic, session)
    }
  }
}
```

## Related Documentation

- [Incoming Requests Not Showing](./incoming-requests-not-showing.md)
- [Mechanic Custom Authentication](../authentication/mechanic-custom-auth.md)
- [Database Schema Reference](../database/schema-reference.md)

## Future Enhancements

1. **Unified Session Creation**: Single flow for all session types
2. **Smart Mechanic Assignment**: Auto-assign based on availability, expertise, location
3. **Request Expiration**: Auto-cancel requests after 24 hours
4. **Session Cleanup**: Cron job to clean up orphaned sessions
5. **Better UI**: Show different sections for "Requests to Accept" vs "Active Sessions" vs "Completed Sessions"

## References

- [Database Normalization](https://en.wikipedia.org/wiki/Database_normalization)
- [Finite State Machines](https://en.wikipedia.org/wiki/Finite-state_machine) (for session status management)
