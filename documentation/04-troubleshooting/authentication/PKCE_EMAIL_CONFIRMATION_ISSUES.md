# PKCE Email Confirmation Issues

## Overview
Troubleshooting and resolution of Supabase PKCE (Proof Key for Code Exchange) authentication flow issues that prevent automated email confirmation. This document covers the technical challenges and provides multiple solution approaches.

## Date Encountered
2025-01-07

## Issue Classification
- **Severity:** High (blocks automated email verification)
- **Status:** Workaround implemented, permanent solution pending
- **Impact:** Users cannot confirm email automatically; requires manual intervention

## Problem Description

### Error Message
```
invalid request: both auth code and code verifier should be non-empty
```

### When It Occurs
After user clicks email confirmation link sent by Supabase, they are redirected to the confirmation callback but receive the above error instead of being authenticated.

### Technical Root Cause
Supabase's PKCE flow requires:
1. **Code Verifier**: A cryptographically random string generated during initial auth request
2. **Code Challenge**: Hash of the code verifier sent to Supabase
3. **Auth Code**: Returned by Supabase in email confirmation link
4. **Code Exchange**: Browser exchanges auth code + code verifier for session token

**The Problem:** When the user clicks the email link, it opens in a potentially new browser context that doesn't have access to the original code verifier stored in the browser's session storage during signup.

### PKCE Flow Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │         │  Next.js App │         │  Supabase   │
└─────────────┘         └──────────────┘         └─────────────┘
       │                        │                        │
       │  1. User signs up      │                        │
       ├───────────────────────>│                        │
       │                        │                        │
       │  2. Generate code      │                        │
       │     verifier (PKCE)    │                        │
       │<───────────────────────│                        │
       │                        │                        │
       │  3. Store in session   │                        │
       │     storage            │                        │
       │                        │                        │
       │  4. Send signup request│                        │
       │     with code challenge│                        │
       ├────────────────────────┼───────────────────────>│
       │                        │                        │
       │                        │  5. Send confirmation  │
       │<───────────────────────┼────────────────────────│
       │     email with auth code                        │
       │                        │                        │
       │  6. User clicks email  │                        │
       │     link in NEW context│                        │
       ├───────────────────────>│                        │
       │                        │                        │
       │  7. ❌ Code verifier   │                        │
       │     NOT FOUND in       │                        │
       │     session storage    │                        │
       │                        │                        │
       │  8. Error: missing     │                        │
       │     code verifier      │                        │
       │<───────────────────────│                        │
```

## Attempted Solutions

### Solution 1: Server-Side Code Exchange (Attempted)

**Approach:** Create a server-side callback route that exchanges the auth code for a session using Supabase's server client.

**File Created:** [src/app/auth/callback/route.ts](../../../src/app/auth/callback/route.ts)

**Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/customer/dashboard'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL('/signup?error=auth', requestUrl.origin))
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  return NextResponse.redirect(new URL('/signup', requestUrl.origin))
}
```

**Result:** ❌ Still received the same PKCE error. The server-side client also requires the code verifier which is not available.

**Why It Failed:** Supabase's `exchangeCodeForSession()` method still expects the PKCE code verifier even when called server-side. The verifier is tied to the original signup session.

### Solution 2: Manual Email Confirmation (Workaround)

**Approach:** Manually confirm user emails through Supabase Dashboard until a permanent solution is implemented.

**Steps:**
1. User signs up
2. User reports not receiving confirmation or getting error
3. Admin logs into Supabase Dashboard
4. Navigate to: Authentication → Users
5. Find user by email
6. Click user row → "Email confirmed" toggle → Enable
7. Notify user they can now log in

**Result:** ✅ Works but not scalable or user-friendly.

**Use Case:** Acceptable for development and testing phase, not for production.

## Current Status

### Production Workaround
Users must be manually confirmed by admin through Supabase Dashboard.

### User Flow
```
1. User signs up
2. User receives confirmation email
3. User clicks confirmation link
4. ❌ Error occurs
5. User contacts support
6. Admin manually confirms email
7. ✅ User can log in
```

## Recommended Solutions (Not Yet Implemented)

### Option 1: Disable PKCE Flow (Quick Fix)

**Configuration:** Supabase Dashboard → Authentication → Settings

Change flow type from "PKCE" to "Implicit"

**Pros:**
- ✅ Immediate fix
- ✅ No code changes required
- ✅ Automatic email confirmation works

**Cons:**
- ⚠️ Less secure than PKCE (code exposed in URL)
- ⚠️ Not recommended for production by Supabase

**When to Use:** Development and testing environments only.

### Option 2: Passwordless Magic Link (Alternative)

**Approach:** Replace traditional signup with magic link authentication.

**Implementation:**
```typescript
// Instead of signUp with password
const { error } = await supabase.auth.signInWithOtp({
  email: email,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  }
})
```

**Pros:**
- ✅ No password to remember
- ✅ No PKCE issues
- ✅ More secure (no password leaks)
- ✅ Better UX for mobile users

**Cons:**
- ⚠️ Requires users to check email every login
- ⚠️ Slower login flow
- ⚠️ Email delivery must be reliable

### Option 3: Store Code Verifier in Cookie (Advanced)

**Approach:** Store PKCE code verifier in an HTTP-only cookie instead of session storage.

**Implementation:**
```typescript
// During signup
import { setCookie } from 'cookies-next'

// After generating code verifier
const codeVerifier = generateCodeVerifier()
setCookie('pkce_verifier', codeVerifier, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 3600 // 1 hour
})

// In callback route
import { getCookie, deleteCookie } from 'cookies-next'

const codeVerifier = getCookie('pkce_verifier', { req, res })
if (codeVerifier) {
  // Use verifier for code exchange
  // Then delete cookie
  deleteCookie('pkce_verifier', { req, res })
}
```

**Pros:**
- ✅ Maintains PKCE security
- ✅ Works across contexts
- ✅ No manual intervention

**Cons:**
- ⚠️ Requires custom Supabase client configuration
- ⚠️ More complex implementation
- ⚠️ Cookie size limitations

### Option 4: Custom Email Confirmation Handler

**Approach:** Bypass Supabase's built-in confirmation and implement custom token-based verification.

**Implementation Steps:**
1. Don't use Supabase's email confirmation
2. Generate custom verification token
3. Store token in database with expiry
4. Send custom email with verification link
5. Verify token on callback
6. Update user's `email_confirmed_at` via API

**Pros:**
- ✅ Full control over flow
- ✅ Can customize email content
- ✅ No PKCE issues

**Cons:**
- ⚠️ Significant development effort
- ⚠️ Must maintain custom verification logic
- ⚠️ Security responsibility on developer

## Comparison of Solutions

| Solution | Complexity | Security | UX | Production Ready |
|----------|------------|----------|-----|------------------|
| Manual Confirmation | Low | High | Poor | ❌ No |
| Disable PKCE | Low | Medium | Good | ⚠️ Not Recommended |
| Magic Links | Medium | High | Good | ✅ Yes |
| Cookie Storage | High | High | Good | ✅ Yes |
| Custom Handler | Very High | Medium-High | Good | ✅ Yes |

## Recommended Path Forward

### Phase 1: Immediate (Development)
Continue using manual confirmation for development and testing.

### Phase 2: Beta Launch
Implement **Magic Link authentication** for simplicity and security.

### Phase 3: Production
If password auth is required, implement **Cookie Storage** solution to maintain PKCE security.

## Related Files
- [src/app/auth/callback/route.ts](../../../src/app/auth/callback/route.ts) - Server-side callback handler (currently not working)
- [src/app/signup/SignupGate.tsx](../../../src/app/signup/SignupGate.tsx) - Signup form component

## Related Documentation
- [SIGNUP_FLOW_REDESIGN.md](../../02-feature-documentation/authentication/SIGNUP_FLOW_REDESIGN.md) - Signup form implementation
- [RESEND_EMAIL_CONFIGURATION.md](../../03-integration/email-services/RESEND_EMAIL_CONFIGURATION.md) - Email service setup

## External Resources
- [Supabase PKCE Documentation](https://supabase.com/docs/guides/auth/server-side/pkce-flow)
- [OAuth 2.0 PKCE RFC](https://datatracker.ietf.org/doc/html/rfc7636)
- [Supabase Magic Links](https://supabase.com/docs/guides/auth/auth-magic-link)

## Debug Commands

### Check User Email Confirmation Status
```sql
-- In Supabase SQL Editor
SELECT
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'user@example.com';
```

### Manually Confirm Email via SQL
```sql
-- ⚠️ Use with caution in development only
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com';
```

### Check PKCE Flow Type
Supabase Dashboard → Settings → Authentication → "Flow type"

Should show: `pkce` or `implicit`

## Testing Checklist

When implementing a solution, verify:
- [ ] User can sign up
- [ ] Confirmation email is received
- [ ] User can click confirmation link
- [ ] No PKCE errors occur
- [ ] User is automatically authenticated
- [ ] User is redirected to dashboard
- [ ] Session persists after refresh
- [ ] Logout works correctly
- [ ] User can log in again with password

## Security Considerations

### If Disabling PKCE
- Only use in development
- Re-enable before production deployment
- Document the security tradeoff
- Consider adding IP allowlisting

### If Using Magic Links
- Set short expiry (15 minutes)
- Rate limit OTP requests
- Monitor for abuse
- Provide fallback to password auth

### If Using Cookie Storage
- Use `httpOnly` flag (prevent XSS)
- Use `secure` flag (HTTPS only)
- Use `sameSite: 'lax'` (CSRF protection)
- Set appropriate expiry (1 hour max)
- Clear after successful exchange
