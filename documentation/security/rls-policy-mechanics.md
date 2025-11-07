# Row Level Security (RLS) Policy Issues with Mechanics

**Date Documented**: October 22, 2025
**Status**: Resolved
**Category**: Security, Database, Authentication

## Overview

This document details the Row Level Security (RLS) policy mismatch that prevented mechanics from viewing pending session requests through the browser client, and the architectural solution implemented.

## The Problem

### Symptom
Mechanics could not see pending requests in their dashboard's "Incoming Requests" section, despite:
- Being properly authenticated with custom auth
- Requests existing in the database
- API route returning data successfully when tested directly

### Root Cause

The RLS policy for `session_requests` table requires Supabase Auth, but mechanics use custom authentication.

## Technical Details

### The RLS Policy

**File**: [supabase/migrations/20251028000000_session_requests.sql:51-61](c:\Users\Faiz Hashmi\theautodoctor\supabase\migrations\20251028000000_session_requests.sql)

```sql
create policy if not exists "Mechanics can view pending requests"
  on public.session_requests
  for select
  using (
    status = 'pending'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'mechanic'
    )
  );
```

**Policy Requirements**:
1. `auth.uid()` - Must return a valid Supabase Auth user ID
2. User must exist in `profiles` table
3. User's `role` must be `'mechanic'`

### The Auth Mismatch

| Component | Auth System | User ID Source |
|-----------|-------------|----------------|
| RLS Policy | Supabase Auth | `auth.uid()` |
| Mechanics | Custom Auth | `mechanics` table, `aad_mech` cookie |

**Result**: `auth.uid()` returns `NULL` for mechanics → RLS policy fails → No data returned

### Code Flow

```
┌─────────────────────────────────────┐
│  Mechanic Dashboard (Browser)      │
│  - Custom auth: aad_mech cookie ✅  │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  supabase.from('session_requests')  │
│  .select('*')                       │
│  .eq('status', 'pending')           │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Supabase Client                    │
│  - Looks for Supabase auth cookies  │
│  - Finds none ❌                    │
│  - auth.uid() = NULL                │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Row Level Security Policy          │
│  - Checks: auth.uid() exists?       │
│  - Result: NO ❌                    │
│  - Action: Deny access              │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Response: Empty array []           │
│  (Permission denied, returns empty) │
└─────────────────────────────────────┘
```

## The Solution

### Architecture: Server-Side API Route with Admin Client

Instead of querying from the browser, create a server-side API route that:
1. Verifies mechanic authentication via custom cookie
2. Uses `supabaseAdmin` client which bypasses RLS
3. Returns filtered data

```
┌─────────────────────────────────────┐
│  Mechanic Dashboard (Browser)      │
│  - Custom auth: aad_mech cookie ✅  │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  fetch('/api/mechanics/requests')   │
│  - Sends aad_mech cookie            │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  API Route (Server-Side)            │
│  - Reads aad_mech cookie            │
│  - Verifies in mechanic_sessions    │
│  - Validates mechanic exists        │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  supabaseAdmin                      │
│  .from('session_requests')          │
│  .select('*')                       │
│  .eq('status', 'pending')           │
│  - Bypasses RLS ✅                  │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Response: Full data ✅             │
│  (Admin client has full access)     │
└─────────────────────────────────────┘
```

### Implementation

**File**: [src/app/api/mechanics/requests/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\mechanics\requests\route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Helper: Verify mechanic from cookie
async function getMechanicFromCookie(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('aad_mech')?.value

  if (!token) return null

  // Verify session is valid
  const { data: session } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('mechanic_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) return null

  // Fetch mechanic details
  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email')
    .eq('id', session.mechanic_id)
    .maybeSingle()

  return mechanic
}

export async function GET(req: NextRequest) {
  // Verify mechanic authentication
  const mechanic = await getMechanicFromCookie(req)

  if (!mechanic) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use admin client to bypass RLS
  const { data: requests, error } = await supabaseAdmin
    .from('session_requests')
    .select('*')
    .eq('status', 'pending')
    .is('mechanic_id', null)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch session requests for mechanic', error)
    return NextResponse.json({ error: 'Unable to fetch requests' }, { status: 500 })
  }

  return NextResponse.json({ requests: requests || [] })
}
```

**Security Features**:
- ✅ Verifies mechanic authentication before querying
- ✅ Uses server-side only (can't be bypassed from browser)
- ✅ Returns only pending requests
- ✅ Filters out already-claimed requests (`mechanic_id is null`)
- ✅ Admin client scoped to specific queries

### Dashboard Update

**File**: [src/app/mechanic/dashboard/MechanicDashboardClient.tsx:188-227](c:\Users\Faiz Hashmi\theautodoctor\src\app\mechanic\dashboard\MechanicDashboardClient.tsx)

**Before** (Direct Supabase Query):
```typescript
const fetchRequests = async () => {
  const { data, error } = await supabase
    .from('session_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  // RLS blocks this ❌
}
```

**After** (API Route):
```typescript
const fetchRequests = async () => {
  const res = await fetch('/api/mechanics/requests')

  if (!res.ok) {
    setRequestsError('Unable to load incoming requests right now.')
    return
  }

  const { requests } = await res.json()

  setIncomingRequests(
    requests
      .map(mapRowToRequest)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  )
}
```

## Alternative Solutions Considered

### Option 1: Update RLS Policy to Support Custom Auth

```sql
-- Add policy for custom auth
create policy "Mechanics with custom auth can view pending requests"
  on public.session_requests
  for select
  using (
    status = 'pending'
    -- Can't check custom auth cookie in RLS policy ❌
  );
```

**Rejected Because**:
- RLS policies run in PostgreSQL, can't access HTTP cookies
- Would need to pass mechanic_id in every query (insecure)
- RLS is designed for Supabase Auth, not custom auth

### Option 2: Migrate Mechanics to Supabase Auth

```sql
-- Migrate mechanics to auth.users
-- Add role to profiles table
-- Update RLS policies
```

**Pros**:
- ✅ RLS policies work correctly
- ✅ Unified auth system
- ✅ Better security

**Cons**:
- ❌ Requires data migration
- ❌ Breaking change for existing mechanics
- ❌ Time-consuming

**Status**: Recommended for future, but not immediate solution

### Option 3: Disable RLS and Use Application-Level Auth

```sql
alter table public.session_requests disable row level security;
```

**Rejected Because**:
- ❌ Removes database-level security
- ❌ Easy to accidentally leak data
- ❌ Against security best practices

## Security Implications

### What We Gained
1. **Server-Side Verification**: All auth checks happen server-side
2. **Controlled Access**: Admin client only used in specific, authenticated routes
3. **Principle of Least Privilege**: Browser client has no direct table access

### What We Lost
1. **Database-Level Enforcement**: RLS no longer enforces mechanic permissions
2. **Multiple Verification Layers**: Relying on application layer only

### Mitigation Strategies

1. **Comprehensive Testing**: Test auth on every API route
2. **Logging**: Log all admin client usage for audit trail
3. **Rate Limiting**: Prevent brute force on API routes
4. **Code Reviews**: Ensure no accidental data leaks

## Testing

### Test 1: Unauthorized Access

```bash
# Without mechanic cookie
curl http://localhost:3000/api/mechanics/requests

# Expected: 401 Unauthorized
# Actual: ✅
```

### Test 2: Authorized Access

```bash
# With valid mechanic cookie (logged in as test123@mechanic.com)
curl http://localhost:3000/api/mechanics/requests \
  -H "Cookie: aad_mech=<token>"

# Expected: 200 with request data
# Actual: ✅
```

### Test 3: Expired Session

```sql
-- Expire all sessions
UPDATE mechanic_sessions SET expires_at = NOW() - INTERVAL '1 day';
```

```bash
curl http://localhost:3000/api/mechanics/requests \
  -H "Cookie: aad_mech=<old_token>"

# Expected: 401 Unauthorized
# Actual: ✅
```

## Performance Considerations

### Direct Supabase Query (Blocked by RLS)
- 1 database round-trip
- Instant failure (RLS check)
- No data transferred

### API Route with Admin Client
- 2 database round-trips (verify session + fetch requests)
- Slower (~100-200ms overhead)
- Full data transferred

**Optimization**:
- Cache mechanic session verification (5 minutes)
- Use database connection pooling
- Minimize data in SELECT queries

## Monitoring

### Logs to Monitor

```typescript
// Add structured logging
console.log('[API_MECHANICS_REQUESTS]', {
  timestamp: new Date().toISOString(),
  mechanicId: mechanic?.id,
  requestCount: requests?.length || 0,
  responseTime: Date.now() - startTime,
})
```

### Metrics to Track

1. **Auth Failures**: How many 401 responses
2. **Response Times**: P50, P95, P99 latencies
3. **Request Volume**: Requests per mechanic per day
4. **Error Rate**: Failed queries vs successful

## Related Issues

### Issue: Mechanic Accept Route Also Had RLS Problem

The accept route was also using browser Supabase client with Supabase auth.

**Fix**: Updated to use custom auth verification

**File**: [src/app/api/mechanics/requests/[id]/accept/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\mechanics\requests\[id]\accept\route.ts)

**Before**:
```typescript
const supabase = getSupabaseServer()
const { data: { user } } = await supabase.auth.getUser()
// Would fail for mechanics ❌
```

**After**:
```typescript
const mechanic = await getMechanicFromCookie(request)
if (!mechanic) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// Works with custom auth ✅
```

## Related Documentation

- [Mechanic Custom Authentication](../authentication/mechanic-custom-auth.md)
- [Incoming Requests Not Showing](../session-management/incoming-requests-not-showing.md)
- [Session Request Flow](../session-management/session-request-flow.md)

## Future Work

1. **Migrate to Supabase Auth**: Long-term solution
2. **Cache Session Verification**: Reduce database round-trips
3. **WebSocket Updates**: Real-time request notifications
4. **Rate Limiting**: Protect API routes from abuse

## References

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
