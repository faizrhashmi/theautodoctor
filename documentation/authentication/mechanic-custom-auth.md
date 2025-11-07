# Mechanic Custom Authentication System

**Date Documented**: October 22, 2025
**Status**: Active (Pending Migration to Supabase Auth)
**Category**: Authentication, Security

## Overview

This document details the custom authentication system used for mechanics in the Auto Doctor application. This system exists alongside Supabase Auth (used for customers) and creates a dual-authentication architecture.

## System Architecture

### Authentication Flow

```
┌─────────────┐
│   Mechanic  │
│   Signup    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  POST /api/mechanics/signup     │
│  - Validate email/password      │
│  - Hash password (scrypt)       │
│  - Insert into mechanics table  │
│  - Create session token         │
│  - Set aad_mech cookie          │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  mechanics table                │
│  - id (uuid)                    │
│  - email (unique)               │
│  - password_hash                │
│  - name, phone                  │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  mechanic_sessions table        │
│  - token (unique)               │
│  - mechanic_id (FK)             │
│  - expires_at                   │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  HTTP-only Cookie: aad_mech     │
│  - Value: session token         │
│  - Max-Age: 30 days             │
│  - SameSite: lax                │
│  - Secure: production only      │
└─────────────────────────────────┘
```

### Database Schema

#### mechanics Table
**File**: [supabase/2025-10-18_mechanics.sql:4-11](c:\Users\Faiz Hashmi\theautodoctor\supabase\2025-10-18_mechanics.sql)

```sql
create table if not exists public.mechanics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text unique not null,
  phone text,
  password_hash text not null
);
```

#### mechanic_sessions Table
**File**: [supabase/2025-10-18_mechanics.sql:14-20](c:\Users\Faiz Hashmi\theautodoctor\supabase\2025-10-18_mechanics.sql)

```sql
create table if not exists public.mechanic_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  mechanic_id uuid not null references public.mechanics(id) on delete cascade,
  token text unique not null
);
```

**RLS**: Row Level Security is enabled but no policies defined (service role bypasses RLS).

## Implementation Details

### Password Hashing

**File**: [src/lib/auth.ts:33-49](c:\Users\Faiz Hashmi\theautodoctor\src\lib\auth.ts)

```typescript
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const KEY_LENGTH = 64

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPassword(password: string, encoded: string) {
  if (!encoded) return false
  const [salt, storedHash] = encoded.split(':')
  if (!salt || !storedHash) return false

  const derived = scryptSync(password, salt, KEY_LENGTH)
  const expected = Buffer.from(storedHash, 'hex')

  if (expected.length !== derived.length) return false
  return timingSafeEqual(expected, derived)
}
```

**Security Features**:
- Uses Node.js `crypto` module (battle-tested)
- scrypt algorithm (memory-hard, resistant to GPUs)
- Random 16-byte salt per password
- Timing-safe comparison to prevent timing attacks
- 64-byte derived key length

### Session Token Generation

**File**: [src/lib/auth.ts:51-53](c:\Users\Faiz Hashmi\theautodoctor\src\lib\auth.ts)

```typescript
export function makeSessionToken(bytes = 32) {
  return randomBytes(bytes).toString('hex')
}
```

**Properties**:
- 32 bytes (256 bits) of entropy
- Hex-encoded (64 characters)
- Cryptographically secure random

### Signup Route

**File**: [src/app/api/mechanics/signup/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\mechanics\signup\route.ts)

```typescript
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured on server', 500);

  const { name, email, phone, password } = await req.json().catch(() => ({}));

  console.log('[MECHANIC SIGNUP] Attempt for email:', email);

  if (!email || !password) return bad('Email and password are required');

  const password_hash = hashPassword(password);

  // Create mechanic record
  const { data: mech, error } = await supabaseAdmin.from('mechanics')
    .insert({ name, email, phone, password_hash })
    .select('id').single();

  console.log('[MECHANIC SIGNUP] Database insert result:', {
    success: !!mech,
    error: error?.message,
    code: error?.code
  });

  if (error) {
    if (error.code === '23505') return bad('Email already registered', 409);
    return bad(error.message, 500);
  }

  // Create session
  const token = makeSessionToken();
  const expires = new Date(Date.now() + 1000*60*60*24*30); // 30 days

  const { error: sErr } = await supabaseAdmin.from('mechanic_sessions').insert({
    mechanic_id: mech.id,
    token,
    expires_at: expires.toISOString(),
  });

  console.log('[MECHANIC SIGNUP] Session creation:', {
    success: !sErr,
    error: sErr?.message
  });

  if (sErr) return bad(sErr.message, 500);

  // Set HTTP-only cookie
  const res = NextResponse.json({ ok: true });
  res.cookies.set('aad_mech', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60*60*24*30,
  });

  console.log('[MECHANIC SIGNUP] Success! Mechanic created:', mech.id);

  return res;
}
```

### Login Route

**File**: [src/app/api/mechanics/login/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\mechanics\login\route.ts)

```typescript
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured on server', 500);

  const { email, password } = await req.json().catch(() => ({}));

  console.log('[MECHANIC LOGIN] Attempt for email:', email);

  if (!email || !password) return bad('Email and password are required');

  // Fetch mechanic by email
  const { data: mech, error } = await supabaseAdmin.from('mechanics')
    .select('id, password_hash')
    .eq('email', email).maybeSingle();

  console.log('[MECHANIC LOGIN] Database query result:', {
    found: !!mech,
    error: error?.message
  });

  if (error) return bad(error.message, 500);

  if (!mech) {
    console.log('[MECHANIC LOGIN] No mechanic found for email:', email);
    return bad('Invalid credentials', 401);
  }

  // Verify password
  const ok = verifyPassword(password, mech.password_hash);
  console.log('[MECHANIC LOGIN] Password verification:', ok);

  if (!ok) return bad('Invalid credentials', 401);

  // Create new session
  const token = makeSessionToken();
  const expires = new Date(Date.now() + 1000*60*60*24*30);

  const { error: sErr } = await supabaseAdmin.from('mechanic_sessions').insert({
    mechanic_id: mech.id,
    token,
    expires_at: expires.toISOString(),
  });

  console.log('[MECHANIC LOGIN] Session creation:', {
    success: !sErr,
    error: sErr?.message
  });

  if (sErr) return bad(sErr.message, 500);

  // Set HTTP-only cookie
  const res = NextResponse.json({ ok: true });
  res.cookies.set('aad_mech', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60*60*24*30,
  });

  console.log('[MECHANIC LOGIN] Success! Cookie set for mechanic:', mech.id);

  return res;
}
```

### Authentication Verification

Used by protected routes to verify mechanic authentication:

```typescript
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
```

**Usage Example**: [src/app/api/mechanics/requests/route.ts:21-25](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\mechanics/requests\route.ts)

## Common Issues & Solutions

### Issue 1: "Invalid Credentials" on Login

**Symptom**: User signs up successfully but can't login with same credentials.

**Root Cause**: User entering different password during login than signup.

**Solution**:
- Added password test endpoint to verify password matching
- Added detailed logging to identify where auth fails
- Created test UI for easier debugging

**Test Endpoint**: [src/app/api/test/mechanic-password-test/route.ts](c:\Users\Faiz Hashmi\theautodoctor\src\app\api\test\mechanic-password-test\route.ts)

```typescript
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const { data: mech } = await supabaseAdmin
    .from('mechanics')
    .select('id, email, password_hash')
    .eq('email', email)
    .maybeSingle()

  if (!mech) {
    return NextResponse.json({ found: false })
  }

  const isValid = verifyPassword(password, mech.password_hash)
  const newHash = hashPassword(password)

  return NextResponse.json({
    found: true,
    mechanicId: mech.id,
    passwordValid: isValid,
    storedHashFormat: mech.password_hash?.includes(':') ? 'correct (salt:hash)' : 'incorrect',
    storedHashLength: mech.password_hash?.length || 0,
    testNewHash: newHash,
    testNewHashVerify: verifyPassword(password, newHash),
  })
}
```

### Issue 2: RLS Policies Don't Apply

**Symptom**: Mechanic can't query tables directly from browser.

**Root Cause**: RLS policies check for `auth.uid()` which requires Supabase Auth. Mechanics use custom auth.

**Solution**: Use server-side API routes with `supabaseAdmin` to bypass RLS.

**See**: [RLS Policy Issues Documentation](../security/rls-policy-mechanics.md)

### Issue 3: Session Cookie Not Persisting

**Possible Causes**:
1. Browser blocking third-party cookies
2. Incorrect `SameSite` attribute
3. Missing `Secure` flag in production
4. Domain mismatch

**Debug Steps**:
```typescript
// Check if cookie is being set
console.log('Setting cookie:', {
  name: 'aad_mech',
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60*60*24*30,
})

// Check if cookie is being read
const cookieStore = cookies()
const token = cookieStore.get('aad_mech')?.value
console.log('Reading cookie:', token ? 'PRESENT' : 'MISSING')
```

## Security Considerations

### Strengths

1. **Password Hashing**: scrypt with random salt
2. **HTTP-Only Cookies**: Prevents XSS attacks
3. **Session Expiry**: 30-day maximum
4. **Timing-Safe Comparison**: Prevents timing attacks
5. **Server-Side Validation**: All auth logic on backend

### Weaknesses

1. **No Email Verification**: Anyone can sign up with any email
2. **No Rate Limiting**: Vulnerable to brute force attacks
3. **No Multi-Factor Authentication**: Single factor only
4. **No Password Requirements**: No complexity rules
5. **No Account Recovery**: Forgot password not implemented
6. **Manual Session Management**: Could have bugs vs. battle-tested solution

### Recommendations

1. **Migrate to Supabase Auth**: Benefits from:
   - Email verification built-in
   - Rate limiting
   - MFA support
   - Password requirements
   - Account recovery
   - Battle-tested security

2. **If Keeping Custom Auth**:
   - Add email verification
   - Implement rate limiting (e.g., 5 attempts per 15 minutes)
   - Add password requirements (min length, complexity)
   - Add forgot password flow
   - Add account lockout after failed attempts
   - Add audit logging

## Comparison: Custom Auth vs Supabase Auth

| Feature | Custom Auth | Supabase Auth |
|---------|-------------|---------------|
| Email/Password | ✅ | ✅ |
| OAuth (Google, etc.) | ❌ | ✅ |
| Email Verification | ❌ | ✅ |
| Password Reset | ❌ | ✅ |
| MFA | ❌ | ✅ |
| Rate Limiting | ❌ | ✅ |
| Session Management | Manual | Automatic |
| RLS Integration | ❌ | ✅ |
| Security Audits | Your responsibility | Supabase team |
| Maintenance | Your responsibility | Supabase team |

## Migration Path to Supabase Auth

### Phase 1: Setup
1. Enable Supabase Auth for mechanics
2. Add `role = 'mechanic'` to profiles table
3. Update RLS policies to check role

### Phase 2: Data Migration
```sql
-- For each mechanic in mechanics table:
-- 1. Create Supabase auth user
-- 2. Insert profile with role='mechanic'
-- 3. Mark old mechanic as migrated
```

### Phase 3: Route Updates
1. Replace signup route with Supabase Auth signup
2. Replace login route with Supabase Auth login
3. Update all auth verification to use Supabase Auth
4. Remove custom auth routes

### Phase 4: Cleanup
1. Remove `mechanics` and `mechanic_sessions` tables
2. Remove custom auth helper functions
3. Update documentation

## Related Documentation

- [Session Management: Incoming Requests Not Showing](../session-management/incoming-requests-not-showing.md)
- [RLS Policy Issues](../security/rls-policy-mechanics.md)
- [Dual Authentication Architecture](./dual-auth-architecture.md)

## References

- [scrypt Key Derivation](https://en.wikipedia.org/wiki/Scrypt)
- [HTTP-Only Cookies](https://owasp.org/www-community/HttpOnly)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
