# Authentication System Migration

**Date Implemented:** January 2025
**Status:** ✅ Complete
**Category:** Architecture & Security

## Overview

Discovered and documented an authentication mismatch between the login system and dashboard, then identified that the system had already been migrated to unified Supabase Auth. The mechanic dashboard was using the old page structure instead of the new unified system.

## Problem Statement

### User Feedback
> "mechanic/dashboard is not loading after i enter my login mechanic credentials and press sign in"

### Symptoms
- Login appeared successful
- Redirect to dashboard occurred
- Dashboard showed "Loading dashboard..."
- Error in console: `Error loading mechanic: Error: Failed to load mechanic data`
- Dashboard immediately redirected back to login

## Root Cause Analysis

### Investigation Steps

**Step 1: Check Login API**
**File:** [src/app/api/mechanics/login/route.ts](../../src/app/api/mechanics/login/route.ts)

Found: Login API uses custom cookie-based authentication:
```typescript
const token = makeSessionToken()
const { error } = await supabaseAdmin.from('mechanic_sessions').insert({
  mechanic_id: mech.id,
  token,
  expires_at: expires.toISOString(),
})

res.cookies.set('aad_mech', token, {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60*60*24*30,
})
```

**Step 2: Check Dashboard Page**
**File:** [src/app/mechanic/dashboard/page.tsx](../../src/app/mechanic/dashboard/page.tsx) (OLD VERSION)

Found: Dashboard was trying to use Supabase Auth:
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  router.replace('/mechanic/login')
  return
}
```

**Step 3: Check Middleware**
**File:** [src/middleware.ts](../../src/middleware.ts:119)

Found: Middleware correctly checks for custom cookie:
```typescript
const mechanicToken = request.cookies.get('aad_mech')?.value

if (!mechanicToken) {
  const loginUrl = new URL('/mechanic/login', request.url)
  return NextResponse.redirect(loginUrl)
}
```

### The Authentication Mismatch

```
Login Flow (Custom):
┌─────────────┐
│ Login API   │
│             │
│ Creates     │──> mechanic_sessions table
│ aad_mech    │──> Cookie: aad_mech=token
│ cookie      │
└─────────────┘

Dashboard Check (Supabase Auth):
┌─────────────┐
│ Dashboard   │
│             │
│ Looks for   │──> supabase.auth.getUser() ❌
│ Supabase    │──> No Supabase session found
│ session     │──> Redirect to login
└─────────────┘
```

**Result:** Dashboard never finds a user and immediately redirects to login.

## Initial Fix Attempt

### Created /api/mechanics/me Endpoint

**File:** [src/app/api/mechanics/me/route.ts](../../src/app/api/mechanics/me/route.ts) (INITIAL VERSION)

```typescript
export async function GET(req: NextRequest) {
  const token = req.cookies.get('aad_mech')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Validate session
  const { data: session } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('mechanic_id, expires_at')
    .eq('token', token)
    .single()

  // Get mechanic data
  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email, stripe_account_id, stripe_payouts_enabled, user_id')
    .eq('id', session.mechanic_id)
    .single()

  return NextResponse.json({
    id: mechanic.user_id || mechanic.id,
    name: mechanic.name,
    email: mechanic.email,
    stripeConnected: !!mechanic.stripe_account_id,
    payoutsEnabled: !!mechanic.stripe_payouts_enabled,
  })
}
```

### Updated Dashboard to Use New Endpoint

**File:** [src/app/mechanic/dashboard/page.tsx](../../src/app/mechanic/dashboard/page.tsx) (ATTEMPTED FIX)

```typescript
export default function MechanicDashboardPage() {
  const router = useRouter()
  const [mechanic, setMechanic] = useState<Mech | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch('/api/mechanics/me')

        if (!response.ok) {
          if (response.status === 401) {
            router.replace('/mechanic/login')
            return
          }
          throw new Error('Failed to load mechanic data')
        }

        const data = await response.json()
        setMechanic(data)
      } catch (err) {
        console.error('Error loading mechanic:', err)
      }
    }
    run()
  }, [router])

  return <MechanicDashboard mechanic={mechanic} />
}
```

## Actual Solution: System Already Migrated

### Discovery

When the user restarted their dev server, we discovered the system had **already been migrated** to use Supabase Auth. The dashboard page.tsx was actually the NEW unified version:

**File:** [src/app/mechanic/dashboard/page.tsx](../../src/app/mechanic/dashboard/page.tsx) (ACTUAL CURRENT)

```typescript
export default function MechanicDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  // Auth guard - Check Supabase authentication first
  useEffect(() => {
    const checkAuth = async () => {
      // Get the current session from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/mechanic/login')
        return
      }

      // Verify this user is a mechanic
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.role !== 'mechanic') {
        await supabase.auth.signOut()
        router.replace('/mechanic/login')
        return
      }

      // Get mechanic details
      const { data: mechanic } = await supabase
        .from('mechanics')
        .select('id, service_tier')
        .eq('user_id', session.user.id)
        .single()

      setMechanicUserId(mechanic.id)
      setIsAuthenticated(true)
    }

    checkAuth()
  }, [router, supabase])
}
```

### Updated Login Page

**File:** [src/app/mechanic/login/page.tsx](../../src/app/mechanic/login/page.tsx)

The login was also updated to use Supabase Auth:

```typescript
async function handleSubmit(event: React.FormEvent) {
  event.preventDefault()
  setLoading(true)

  try {
    // Call server-side login API that uses Supabase Auth
    const loginRes = await fetch('/api/mechanic/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const loginData = await loginRes.json()

    if (!loginData.access_token || !loginData.refresh_token) {
      throw new Error('Failed to receive authentication tokens.')
    }

    // Set session in Supabase Auth
    const setRes = await fetch('/api/auth/set-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: loginData.access_token,
        refresh_token: loginData.refresh_token
      }),
    })

    if (!setRes.ok) {
      throw new Error('Failed to establish session.')
    }

    window.location.href = next
  } catch (e) {
    setError(e.message)
  }
}
```

### Updated Middleware

**File:** [src/middleware.ts](../../src/middleware.ts:254-314)

Middleware was updated to check Supabase Auth instead of custom cookies:

```typescript
// MECHANIC ROUTE PROTECTION
const isMechanicRoute = pathname.startsWith('/mechanic/')

if (isMechanicRoute) {
  // Skip public routes like login/signup
  if (isPublicMechanicRoute(pathname)) {
    return response
  }

  // UPDATED: Check Supabase Auth instead of custom cookie
  if (!user) {
    const loginUrl = new URL('/mechanic/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Verify user is a mechanic
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'mechanic') {
    console.warn(`Non-mechanic user attempted to access ${pathname}`)
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}
```

### Updated /api/mechanics/me

**File:** [src/app/api/mechanics/me/route.ts](../../src/app/api/mechanics/me/route.ts) (FINAL VERSION)

The API was updated to use unified auth guard:

```typescript
import { requireMechanicAPI } from '@/lib/auth/guards'

export async function GET(req: NextRequest) {
  // Use unified auth guard
  const result = await requireMechanicAPI(req)
  if (result.error) {
    return result.error
  }

  const mechanic = result.data

  return NextResponse.json({
    id: mechanic.id,
    user_id: mechanic.userId,
    name: mechanic.name,
    email: mechanic.email,
    stripeConnected: !!mechanic.stripeAccountId,
    payoutsEnabled: !!mechanic.stripePayoutsEnabled,
    service_tier: mechanic.serviceTier || 'virtual_only',
  })
}
```

## Architecture: Unified Supabase Auth

### Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Unified Auth System                   │
└─────────────────────────────────────────────────────────┘

1. Login
   ┌─────────────┐
   │ User enters │──> POST /api/mechanic/login
   │ credentials │
   └─────────────┘
          │
          ├──> Verify credentials (Supabase Admin)
          │
          ├──> Generate Supabase session
          │    {access_token, refresh_token}
          │
          └──> POST /api/auth/set-session
               └──> Set cookies (Supabase Auth)

2. Protected Routes (Middleware)
   ┌─────────────┐
   │ Request to  │──> Middleware intercepts
   │ /mechanic/* │
   └─────────────┘
          │
          ├──> Read Supabase cookies
          │
          ├──> supabase.auth.getUser()
          │
          ├──> Verify role in profiles table
          │
          └──> Allow or redirect

3. Dashboard
   ┌─────────────┐
   │ Dashboard   │──> supabase.auth.getSession()
   │ page loads  │
   └─────────────┘
          │
          ├──> Verify session exists
          │
          ├──> Check profiles.role = 'mechanic'
          │
          ├──> Load mechanic data
          │
          └──> Render dashboard
```

### Database Schema

**profiles table:**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('customer', 'mechanic', 'admin')),
  full_name TEXT,
  email TEXT,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**mechanics table:**
```sql
CREATE TABLE mechanics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  name TEXT,
  email TEXT,
  service_tier TEXT CHECK (service_tier IN ('virtual_only', 'hybrid', 'mobile')),
  stripe_account_id TEXT,
  stripe_payouts_enabled BOOLEAN DEFAULT false,
  availability_schedule JSONB,
  is_away BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Auth Guards

**File:** [src/lib/auth/guards.ts](../../src/lib/auth/guards.ts)

```typescript
export async function requireMechanicAPI(req: NextRequest) {
  const supabase = createServerClient(/* config */)

  // Get user from Supabase Auth
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Verify mechanic role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'mechanic') {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Get mechanic data
  const { data: mechanic } = await supabase
    .from('mechanics')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return { data: mechanic }
}
```

## Benefits of Unified System

### Security
- ✅ Single source of truth (Supabase Auth)
- ✅ Built-in token refresh
- ✅ Secure cookie management
- ✅ PKCE flow support
- ✅ Role-based access control

### Maintainability
- ✅ No custom session management
- ✅ Consistent auth flow across all user types
- ✅ Leverages Supabase RLS policies
- ✅ Standard middleware patterns

### Scalability
- ✅ Horizontal scaling support
- ✅ No session table to manage
- ✅ Built-in session pooling
- ✅ Automatic cleanup

## Migration Checklist

If migrating other routes to unified auth:

- [ ] Update login to use Supabase Auth
- [ ] Add role to profiles table
- [ ] Update middleware to check Supabase session
- [ ] Update protected pages to use supabase.auth.getSession()
- [ ] Create auth guards for API routes
- [ ] Test login flow
- [ ] Test protected route access
- [ ] Test logout
- [ ] Remove custom session tables (if any)
- [ ] Update documentation

## Testing

### Manual Test Flow

```bash
# 1. Clear all cookies and sessions
# 2. Navigate to /mechanic/login
# 3. Enter credentials
# 4. Click "Sign in"
# Expected: Redirect to /mechanic/dashboard

# 5. Verify dashboard loads
# Expected: See mechanic dashboard with data

# 6. Check browser DevTools > Application > Cookies
# Expected: See Supabase auth cookies

# 7. Refresh page
# Expected: Dashboard loads without redirect

# 8. Open /mechanic/dashboard in incognito
# Expected: Redirect to /mechanic/login

# 9. Click logout
# Expected: Cookies cleared, redirect to login
```

### Automated Tests (Recommended)

```typescript
describe('Mechanic Authentication', () => {
  it('should redirect unauthenticated users to login', async () => {
    const response = await fetch('/mechanic/dashboard')
    expect(response.redirected).toBe(true)
    expect(response.url).toContain('/mechanic/login')
  })

  it('should allow authenticated mechanics to access dashboard', async () => {
    // Login as mechanic
    await login({ email: 'mechanic@test.com', password: 'test123' })

    const response = await fetch('/mechanic/dashboard')
    expect(response.status).toBe(200)
  })

  it('should reject non-mechanics from mechanic routes', async () => {
    // Login as customer
    await login({ email: 'customer@test.com', password: 'test123' })

    const response = await fetch('/mechanic/dashboard')
    expect(response.redirected).toBe(true)
    expect(response.url).not.toContain('/mechanic')
  })
})
```

## Common Issues

### Issue: Dashboard redirects to login immediately

**Cause:** Dev server cache showing old page version

**Solution:**
```bash
# Stop dev server (Ctrl+C)
rm -rf .next
npm run dev
```

### Issue: "Not authenticated" error

**Cause:** Supabase cookies not set properly

**Solution:**
1. Check middleware cookie configuration
2. Verify `/api/auth/set-session` is called after login
3. Check browser cookies in DevTools

### Issue: "Forbidden" error

**Cause:** User authenticated but wrong role

**Solution:**
1. Check profiles table has correct role
2. Verify role check in middleware
3. Update profile role if needed:
```sql
UPDATE profiles SET role = 'mechanic' WHERE id = 'user-id';
```

## Related Documentation

- [Comprehensive Mechanic Dashboard](../features/comprehensive-mechanic-dashboard.md)
- [Supabase Import Pattern Migration](../fixes/supabase-import-pattern-migration.md)
- [Dev Server Cache Management](../troubleshooting/dev-server-cache-management.md)

## Commit History

```
commit 279cf98
Fix: Mechanic dashboard authentication to use custom session system

(Initial attempt - later replaced by unified system)
```

---

**Last Updated:** January 2025
**Maintained By:** Development Team
