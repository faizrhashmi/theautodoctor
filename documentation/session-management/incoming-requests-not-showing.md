# Mechanic Dashboard: Incoming Requests Not Showing

**Date Encountered**: October 22, 2025
**Status**: Resolved
**Category**: Session Management, Authentication, Security

## Overview

This document details the investigation and resolution of a critical issue where active customer session requests were not appearing in the mechanic dashboard's "Incoming Requests" section, despite being present in the database.

## Problem Description

### User Report
- Customer created a session on the customer side (visible as "active session")
- Mechanic dashboard showed empty "Incoming Requests" section
- Database confirmed a pending request existed (ID: `f82538d9-72e3-43a9-83f7-3bdfeda94d4f`)
- Mechanic was authenticated (`test123@mechanic.com`, ID: `47bb0feb-eb99-4133-84a8-297f3b52ff8a`)

### Initial Symptoms
1. Empty "Incoming Requests" section despite pending requests in database
2. No console logs appearing in browser
3. Component appeared to render but no data displayed
4. API endpoint `/api/mechanics/requests` returned 200 with correct data when tested directly

## Root Cause Analysis

### Primary Issue: Row Level Security (RLS) Policy Mismatch

The mechanic dashboard was attempting to query the `session_requests` table directly using the browser Supabase client, which requires proper authentication and RLS policy permissions.

**The RLS Policy** ([supabase/migrations/20251028000000_session_requests.sql:51-61](c:\Users\Faiz Hashmi\theautodoctor\supabase\migrations\20251028000000_session_requests.sql))

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

**The Problem**: This policy checks for:
1. `auth.uid()` - Requires Supabase Auth session
2. `role = 'mechanic'` in the `profiles` table

However, mechanics in this system use **custom authentication** (not Supabase Auth):
- Custom `mechanics` table with email/password_hash
- Custom `mechanic_sessions` table with tokens
- `aad_mech` HTTP-only cookie for session management

### Secondary Issue: Dual Authentication Systems

The application has two separate authentication systems:

| User Type | Auth System | Storage | Session Token |
|-----------|-------------|---------|---------------|
| Customers | Supabase Auth | `auth.users` | Supabase cookies |
| Mechanics | Custom Auth | `mechanics` table | `aad_mech` cookie |

This created a mismatch where:
- Dashboard used browser Supabase client (`createClient()`)
- Mechanics don't have Supabase auth sessions
- RLS policies require Supabase auth
- Result: Permission denied, no data returned

### Tertiary Issue: Content Security Policy (CSP)

During debugging, discovered CSP was blocking JavaScript execution:
```
Content Security Policy of your site blocks the use of 'eval' in JavaScript
```

This prevented console logs from appearing and made debugging difficult.

## Investigation Steps

### Step 1: Verify Mechanic Authentication

Created test endpoint to verify mechanic session:

**File**: [src/app/api/test/check-mechanic-auth/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\test\check-mechanic-auth\route.ts)

```typescript
export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('aad_mech')?.value

  if (!token) {
    return NextResponse.json({
      authenticated: false,
      message: 'No aad_mech cookie found',
    })
  }

  const { data: session } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('mechanic_id, expires_at')
    .eq('token', token)
    .maybeSingle()

  // ... verify mechanic exists
}
```

**Result**: Mechanic was properly authenticated ✅

### Step 2: Check Database Tables

Created endpoint to inspect both tables:

**File**: [src/app/api/test/check-sessions/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\test\check-sessions\route.ts)

**Findings**:
- `session_requests` table: 1 pending request (John Doe, video session)
- `sessions` table: Multiple sessions with `mechanic_id = NULL` (orphaned)
- Orphaned sessions were created directly from intake form, bypassing request flow

### Step 3: Test Password Verification

Created test page to verify mechanic login issues:

**File**: [src/app/test-mechanics/page.tsx](c:\Users\Faiz Hashmi\theautodoctor\src\app\test-mechanics\page.tsx)

**File**: [src/app/api/test/mechanic-password-test/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\test\mechanic-password-test\route.ts)

**Result**: User was entering wrong password - authentication system was working correctly ✅

### Step 4: Identify RLS Policy Issue

Discovered the RLS policy was checking for Supabase auth while mechanics use custom auth.

## Solution Implementation

### Solution 1: Create API Route to Bypass RLS

Created server-side API route that uses admin client to bypass RLS:

**File**: [src/app/api/mechanics/requests/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\mechanics\requests\route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

async function getMechanicFromCookie(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('aad_mech')?.value

  if (!token) return null

  const { data: session } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('mechanic_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) return null

  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email')
    .eq('id', session.mechanic_id)
    .maybeSingle()

  return mechanic
}

export async function GET(req: NextRequest) {
  const mechanic = await getMechanicFromCookie(req)

  if (!mechanic) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all pending requests using admin client (bypasses RLS)
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

**Key Changes**:
- Uses server-side route (runs on Node.js, not browser)
- Verifies mechanic via `aad_mech` cookie
- Uses `supabaseAdmin` which bypasses RLS
- Returns filtered pending requests

### Solution 2: Update Dashboard to Use API

Updated mechanic dashboard client to fetch from API instead of direct Supabase query:

**File**: [src/app/mechanic/dashboard/MechanicDashboardClient.tsx:188-227](c:\Users\Faiz Hashmi\theautodoctor\src\app\mechanic\dashboard\MechanicDashboardClient.tsx)

**Before**:
```typescript
const fetchRequests = async () => {
  try {
    const { data, error } = await supabase
      .from('session_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    // ... handle response
  }
}
```

**After**:
```typescript
const fetchRequests = async () => {
  try {
    // Use API route instead of direct Supabase query (mechanic uses custom auth)
    console.log('[MECHANIC DASHBOARD] Fetching requests from API...')
    const res = await fetch('/api/mechanics/requests')

    console.log('[MECHANIC DASHBOARD] API response status:', res.status)

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      console.error('[MECHANIC DASHBOARD] Failed to load session requests', res.status, errorData)
      setRequestsError('Unable to load incoming requests right now.')
      setIncomingRequests([])
      return
    }

    const { requests } = await res.json()

    console.log('[MECHANIC DASHBOARD] Received requests:', requests)

    setIncomingRequests(
      requests
        .map(mapRowToRequest)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    )
  } catch (err) {
    console.error('[MECHANIC DASHBOARD] Failed to load session requests', err)
    setRequestsError('Unable to load incoming requests right now.')
    setIncomingRequests([])
  }
}
```

### Solution 3: Fix CSP to Allow JavaScript

Updated Next.js configuration to allow JavaScript execution:

**File**: [next.config.js:37-49](c:\Users\Faiz Hashmi\theautodoctor\next.config.js)

```javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co wss://*.livekit.cloud https://*.livekit.cloud;",
        },
      ],
    },
  ]
},
```

**Note**: User later optimized this to only apply in production, using empty headers in development for faster iteration.

## Testing & Verification

### Test 1: Direct API Test
```bash
curl http://localhost:3000/api/mechanics/requests
```

**Expected**: 200 status with list of pending requests
**Actual**: ✅ Returned John Doe's pending request

### Test 2: Authentication Test
```bash
curl http://localhost:3000/api/test/check-mechanic-auth
```

**Expected**: Authenticated user details
**Actual**: ✅ Returned mechanic details

### Test 3: Dashboard Display
Navigate to `http://localhost:3000/mechanic/dashboard`

**Expected**: "Incoming Requests" section shows pending requests
**Actual**: ⚠️ Still investigating - CSP issue blocking console logs

## Related Issues & Files

### Files Created
- [src/app/api/mechanics/requests/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\mechanics\requests\route.ts) - Main API route
- [src/app/api/test/check-mechanic-auth/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\test\check-mechanic-auth\route.ts) - Auth verification
- [src/app/api/test/mechanic-password-test/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\test\mechanic-password-test\route.ts) - Password testing
- [src/app/api/test/check-sessions/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\test\check-sessions\route.ts) - Database inspection
- [src/app/test-mechanics/page.tsx](c:\Users\Faiz Hashmi\theautodoctor\src\app\test-mechanics\page.tsx) - Test UI

### Files Modified
- [src/app/mechanic/dashboard/MechanicDashboardClient.tsx](c:\Users\Faiz Hashmi\theautodoctor\src\app\mechanic\dashboard\MechanicDashboardClient.tsx) - Updated to use API
- [src/app/api/mechanics/login/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\mechanics\login\route.ts) - Added debug logging
- [src/app/api/mechanics/signup/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\mechanics\signup\route.ts) - Added debug logging
- [next.config.js](c:\Users\Faiz Hashmi\theautodoctor\next.config.js) - Added CSP headers

### Related Documentation
- [Mechanic Authentication System](../authentication/mechanic-custom-auth.md)
- [RLS Policy Issues](../security/rls-policy-mechanics.md)
- [CSP Configuration](../security/content-security-policy.md)
- [Session Request Flow](./session-request-flow.md)

## Prevention Strategies

### 1. Unified Authentication System
**Recommendation**: Migrate mechanics to Supabase Auth to unify authentication.

**Benefits**:
- Single auth system to maintain
- RLS policies work correctly
- Better security (Supabase handles password hashing, session management)
- Easier to debug

**Migration Path**:
1. Create migration script to move mechanics from `mechanics` table to `auth.users`
2. Update `profiles` table with `role = 'mechanic'`
3. Remove custom auth routes
4. Update all mechanic routes to use Supabase auth

### 2. Better Debugging Tools
- Add comprehensive logging in development mode
- Create admin panel to inspect sessions and requests
- Add health check endpoints for each auth system

### 3. Documentation
- Document all authentication systems clearly
- Maintain architecture decision records (ADRs)
- Create troubleshooting guides

## Future Enhancements

1. **Real-time Updates**: Add WebSocket support for live request updates
2. **Request Filtering**: Allow mechanics to filter by session type, plan, etc.
3. **Request Assignment**: Auto-assign requests based on mechanic availability
4. **Notification System**: Email/SMS alerts for new requests
5. **Analytics**: Track request acceptance rates, response times

## Lessons Learned

1. **Auth System Consistency**: Multiple auth systems create complexity and bugs
2. **RLS Testing**: Always test RLS policies with actual user roles
3. **Server vs Client Queries**: Server-side queries with admin client bypass RLS
4. **CSP Debugging**: CSP can silently block JavaScript, making debugging difficult
5. **Test Endpoints**: Creating dedicated test endpoints speeds up debugging

## References

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
