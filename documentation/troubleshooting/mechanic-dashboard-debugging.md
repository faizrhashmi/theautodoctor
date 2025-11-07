# Mechanic Dashboard Debugging Guide

**Date Created**: October 22, 2025
**Category**: Troubleshooting, Development

## Overview

This guide documents the debugging techniques and tools used to troubleshoot issues with the mechanic dashboard, specifically focusing on the "Incoming Requests not showing" problem.

## Debugging Methodology

### Step 1: Verify the Problem

**Questions to Ask**:
1. Is the data in the database?
2. Is the user authenticated?
3. Are there any JavaScript errors?
4. Are API calls succeeding?
5. Is the component rendering?

### Step 2: Check Database

Create test endpoints to inspect database state directly.

**Tool**: Database Inspection Endpoint

**File**: [src/app/api/test/check-sessions/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\test\check-sessions\route.ts)

```typescript
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    // Check session_requests
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    // Check sessions
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      session_requests: {
        count: requests?.length || 0,
        error: requestsError?.message,
        recent: requests,
      },
      sessions: {
        count: sessions?.length || 0,
        error: sessionsError?.message,
        recent: sessions,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

**Usage**:
```bash
curl http://localhost:3000/api/test/check-sessions | jq
```

**What to Look For**:
- ✅ Are there pending requests in `session_requests`?
- ✅ Are there orphaned sessions (mechanic_id = NULL)?
- ✅ Do the request IDs match what user expects?

### Step 3: Verify Authentication

**Tool**: Authentication Check Endpoint

**File**: [src/app/api/test/check-mechanic-auth/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\test\check-mechanic-auth\route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('aad_mech')?.value

    if (!token) {
      return NextResponse.json({
        authenticated: false,
        message: 'No aad_mech cookie found',
        allCookies: cookieStore.getAll().map(c => c.name)
      })
    }

    const { data: session } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: 'Session not found or expired',
        hasToken: true
      })
    }

    const isExpired = new Date(session.expires_at) < new Date()

    const { data: mechanic } = await supabaseAdmin
      .from('mechanics')
      .select('id, name, email')
      .eq('id', session.mechanic_id)
      .maybeSingle()

    return NextResponse.json({
      authenticated: !!mechanic,
      mechanic: mechanic,
      sessionExpired: isExpired,
      expiresAt: session.expires_at
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

**Usage**:
```bash
# Visit in browser (cookies are automatically sent)
http://localhost:3000/api/test/check-mechanic-auth
```

**Expected Response** (Authenticated):
```json
{
  "authenticated": true,
  "mechanic": {
    "id": "47bb0feb-eb99-4133-84a8-297f3b52ff8a",
    "name": "Test Mechanic",
    "email": "test123@mechanic.com"
  },
  "sessionExpired": false,
  "expiresAt": "2025-11-21T02:09:22.828+00:00"
}
```

**Expected Response** (Not Authenticated):
```json
{
  "authenticated": false,
  "message": "No aad_mech cookie found",
  "allCookies": []
}
```

### Step 4: Test Password Verification

When users report "can't login", verify if it's a password issue.

**Tool**: Password Test Endpoint

**File**: [src/app/api/test/mechanic-password-test/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\test\mechanic-password-test\route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyPassword, hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Get the mechanic from database
    const { data: mech, error } = await supabaseAdmin
      .from('mechanics')
      .select('id, email, password_hash')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!mech) {
      return NextResponse.json({
        found: false,
        message: 'No mechanic found with this email'
      })
    }

    // Test password verification
    const isValid = verifyPassword(password, mech.password_hash)

    // Also create a new hash for comparison
    const newHash = hashPassword(password)

    return NextResponse.json({
      found: true,
      mechanicId: mech.id,
      email: mech.email,
      passwordValid: isValid,
      storedHashFormat: mech.password_hash?.includes(':') ? 'correct (salt:hash)' : 'incorrect',
      storedHashLength: mech.password_hash?.length || 0,
      testNewHash: newHash,
      testNewHashVerify: verifyPassword(password, newHash),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

**Usage** (via Test UI):
1. Visit `http://localhost:3000/test-mechanics`
2. Enter email and password
3. Click "Test Password"

**Response When Password is Wrong**:
```json
{
  "found": true,
  "mechanicId": "bb9c7fde-dd8c-4e64-a7c8-a6911c7b9e7a",
  "email": "faizlunatic@gmail.com",
  "passwordValid": false,  // ❌ Wrong password
  "storedHashFormat": "correct (salt:hash)",
  "storedHashLength": 161,
  "testNewHash": "a9b3e58d...",
  "testNewHashVerify": true
}
```

### Step 5: Add Console Logging

Add strategic console logs to trace execution flow.

**Component Level**:

**File**: [src/app/mechanic/dashboard/MechanicDashboardClient.tsx:74](c:\Users\Faiz Hashmi\theautodoctor\src\app\mechanic\dashboard\MechanicDashboardClient.tsx)

```typescript
export default function MechanicDashboardClient({ mechanic }: MechanicDashboardClientProps) {
  const supabase = useMemo(() => createClient(), [])
  const mechanicId = mechanic.id

  console.log('[MECHANIC DASHBOARD CLIENT] Component rendered, mechanicId:', mechanicId)

  // ... rest of component
}
```

**API Call Level**:

```typescript
const fetchRequests = async () => {
  try {
    console.log('[MECHANIC DASHBOARD] Fetching requests from API...')
    const res = await fetch('/api/mechanics/requests')

    console.log('[MECHANIC DASHBOARD] API response status:', res.status)

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      console.error('[MECHANIC DASHBOARD] Failed to load session requests', res.status, errorData)
      return
    }

    const { requests } = await res.json()

    console.log('[MECHANIC DASHBOARD] Received requests:', requests)
    console.log('[MECHANIC DASHBOARD] Request count:', requests.length)

    setIncomingRequests(requests.map(mapRowToRequest))
  } catch (err) {
    console.error('[MECHANIC DASHBOARD] Failed to load session requests', err)
  }
}
```

**Server-Side Logging**:

**File**: [src/app/api/mechanics/login/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\mechanics\login\route.ts)

```typescript
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  console.log('[MECHANIC LOGIN] Attempt for email:', email)

  // Fetch mechanic
  const { data: mech, error } = await supabaseAdmin
    .from('mechanics')
    .select('id, password_hash')
    .eq('email', email)
    .maybeSingle()

  console.log('[MECHANIC LOGIN] Database query result:', { found: !!mech, error: error?.message })

  if (!mech) {
    console.log('[MECHANIC LOGIN] No mechanic found for email:', email)
    return bad('Invalid credentials', 401)
  }

  const ok = verifyPassword(password, mech.password_hash)
  console.log('[MECHANIC LOGIN] Password verification:', ok)

  if (!ok) return bad('Invalid credentials', 401)

  // Create session
  const token = makeSessionToken()
  const { error: sErr } = await supabaseAdmin.from('mechanic_sessions').insert({
    mechanic_id: mech.id,
    token,
    expires_at: new Date(Date.now() + 1000*60*60*24*30).toISOString(),
  })

  console.log('[MECHANIC LOGIN] Session creation:', { success: !sErr, error: sErr?.message })

  console.log('[MECHANIC LOGIN] Success! Cookie set for mechanic:', mech.id)

  return res
}
```

### Step 6: Check Browser Console

**Open DevTools**:
1. Press F12
2. Click "Console" tab
3. Check "All levels" filter (not just "Errors")
4. Look for:
   - Red errors
   - CSP violations
   - Network errors
   - Missing resources

**Common Issues**:
- CSP blocking eval: "Content Security Policy of your site blocks the use of 'eval'"
- Network errors: "Failed to fetch"
- Auth errors: "401 Unauthorized"
- CORS errors: "No 'Access-Control-Allow-Origin' header"

### Step 7: Check Network Tab

**Open DevTools → Network Tab**:
1. Filter by "Fetch/XHR"
2. Look for API calls
3. Check status codes
4. Inspect request/response

**What to Look For**:
- ✅ Request to `/api/mechanics/requests` exists
- ✅ Status code 200 (not 401, 500)
- ✅ Response contains data
- ✅ Cookies are being sent

## Test UI Tool

Created a comprehensive test page for manual testing.

**File**: [src/app/test-mechanics/page.tsx](c:\Users\Faiz Hashmi\theautodoctor\src\app\test-mechanics\page.tsx)

```typescript
'use client'

import { useEffect, useState } from 'react'

export default function TestMechanicsPage() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkTables()
  }, [])

  const checkTables = async () => {
    const res = await fetch('/api/test/check-mechanics-tables')
    const data = await res.json()
    setStatus(data)
    setLoading(false)
  }

  const testSignup = async () => {
    // ... signup test
  }

  const testLogin = async () => {
    // ... login test
  }

  const testPassword = async () => {
    // ... password test
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-bold">Mechanics Table Test</h1>

      {/* Table Status */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="font-semibold mb-2">Database Tables Status:</h2>
        <pre className="bg-slate-100 p-4 rounded overflow-auto text-xs">
          {JSON.stringify(status, null, 2)}
        </pre>
      </div>

      {/* Signup Test */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="font-semibold mb-4">Test Signup</h2>
        <button onClick={testSignup} className="rounded bg-blue-600 px-4 py-2 text-white">
          Test Signup
        </button>
      </div>

      {/* Login Test */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="font-semibold mb-4">Test Login</h2>
        <button onClick={testPassword} className="rounded bg-purple-600 px-4 py-2 text-white">
          Test Password
        </button>
        <button onClick={testLogin} className="rounded bg-green-600 px-4 py-2 text-white">
          Test Login
        </button>
      </div>
    </div>
  )
}
```

**Usage**:
1. Visit `http://localhost:3000/test-mechanics`
2. See database status automatically
3. Test signup/login flows
4. See detailed results

## Common Issues & Solutions

### Issue: Empty Console

**Symptom**: Browser console shows nothing

**Possible Causes**:
1. CSP blocking JavaScript
2. Console filter set to "Errors only"
3. Component not rendering at all
4. JavaScript crash before logs

**Debug Steps**:
1. Check CSP headers: DevTools → Network → Select any request → Headers
2. Check console filters: Console tab → Filter dropdown
3. Check if page loaded: View page source, look for `<script>` tags
4. Check for syntax errors: Look for red underlines in editor

**Solution**: See [Content Security Policy Documentation](../security/content-security-policy.md)

### Issue: 401 Unauthorized

**Symptom**: API calls return 401

**Possible Causes**:
1. No authentication cookie
2. Cookie expired
3. Wrong cookie name
4. Cookie not being sent (CORS)

**Debug Steps**:
1. Check cookies: DevTools → Application → Cookies → Select domain
2. Look for `aad_mech` cookie
3. Test auth endpoint: Visit `/api/test/check-mechanic-auth`
4. Try logging in again

**Solution**: Re-login at `/mechanic/login`

### Issue: Password "Invalid Credentials"

**Symptom**: Login fails with "Invalid credentials" but user insists password is correct

**Possible Causes**:
1. User entered different password during signup vs login
2. Password was changed and user forgot
3. Typo in email (wrong account)
4. Extra spaces in password field

**Debug Steps**:
1. Use password test endpoint: `/api/test/mechanic-password-test`
2. Try signup again with known password
3. Check database for multiple accounts with similar emails

**Solution**: Create new account with known password for testing

### Issue: Data in Database But Not in UI

**Symptom**: Database check shows data, but dashboard is empty

**Possible Causes**:
1. RLS policy blocking query
2. Component not fetching data
3. API route returning wrong data
4. Mapping function failing
5. State not updating

**Debug Steps**:
1. Check API directly: `curl http://localhost:3000/api/mechanics/requests`
2. Check browser Network tab for API call
3. Check console for mapping errors
4. Add console logs to component

**Solution**: See [RLS Policy Issues](../security/rls-policy-mechanics.md)

## Debugging Checklist

When investigating dashboard issues, go through this checklist:

- [ ] **Database**: Is the data in the database?
  - [ ] Check `session_requests` table
  - [ ] Check `sessions` table
  - [ ] Look for orphaned records (NULL foreign keys)

- [ ] **Authentication**: Is the user authenticated?
  - [ ] Visit `/api/test/check-mechanic-auth`
  - [ ] Check for `aad_mech` cookie in DevTools
  - [ ] Verify session hasn't expired

- [ ] **API**: Are API calls working?
  - [ ] Check browser Network tab
  - [ ] Look for 200 status codes
  - [ ] Test API directly with curl
  - [ ] Check server logs

- [ ] **Browser**: Is JavaScript running?
  - [ ] Check browser console for errors
  - [ ] Check for CSP violations
  - [ ] Verify components are rendering
  - [ ] Look for console logs

- [ ] **Security**: Are security policies allowing requests?
  - [ ] Check RLS policies
  - [ ] Check CSP headers
  - [ ] Verify CORS configuration

## Performance Debugging

### Check API Response Times

```typescript
const startTime = Date.now()
const res = await fetch('/api/mechanics/requests')
console.log('API response time:', Date.now() - startTime, 'ms')
```

### Check Component Render Times

```typescript
useEffect(() => {
  const startTime = performance.now()

  // ... component logic

  console.log('Component render time:', performance.now() - startTime, 'ms')
}, [])
```

### Monitor Network Waterfall

DevTools → Network → Look for:
- Slow DNS resolution
- Long TTFB (Time To First Byte)
- Large payloads
- Blocking requests

## Related Documentation

- [Incoming Requests Not Showing](../session-management/incoming-requests-not-showing.md)
- [Mechanic Authentication](../authentication/mechanic-custom-auth.md)
- [RLS Policy Issues](../security/rls-policy-mechanics.md)
- [Content Security Policy](../security/content-security-policy.md)

## Tools Summary

| Tool | Purpose | URL |
|------|---------|-----|
| Database Inspector | Check table contents | `/api/test/check-sessions` |
| Auth Checker | Verify authentication | `/api/test/check-mechanic-auth` |
| Password Tester | Test password validity | `/api/test/mechanic-password-test` |
| Test UI | Manual testing interface | `/test-mechanics` |
| Requests API | Fetch pending requests | `/api/mechanics/requests` |

## Best Practices

1. **Add Logging Early**: Don't wait until there's a problem
2. **Use Structured Logs**: Include context (user ID, request ID, etc.)
3. **Create Test Endpoints**: Make debugging easier
4. **Document as You Go**: Write docs while solving issues
5. **Test in Production-Like Environment**: Catch issues before deployment
