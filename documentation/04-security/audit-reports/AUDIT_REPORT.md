# Security & Code Quality Audit Report

**Project:** The Auto Doctor
**Date:** October 22, 2025
**Auditor:** Claude (Anthropic)
**Status:** In Progress

---

## Executive Summary

This document outlines security vulnerabilities, code quality issues, and performance concerns discovered during a comprehensive audit of The Auto Doctor application. Issues are categorized by severity and include actionable remediation steps.

### Overall Risk Assessment

| Category | Severity | Status |
|----------|----------|--------|
| Authentication & Authorization | **CRITICAL** | ⚠️ Partially Fixed |
| Environment Variable Security | **HIGH** | ✅ Fixed |
| Code Quality & Type Safety | **MEDIUM** | ✅ Fixed |
| Database Security (RLS) | **CRITICAL** | 🔴 Needs Review |
| Payment Security | **HIGH** | 🔴 Needs Review |
| Security Headers | **HIGH** | 🔴 Not Implemented |
| LiveKit Token Security | **HIGH** | 🔴 Needs Review |

---

## 1. Authentication & Authorization Issues

### 1.1 CRITICAL: Mechanic Routes Unprotected in Middleware

**Severity:** 🔴 CRITICAL
**Status:** ✅ FIXED
**Impact:** Customers could access mechanic-only pages; mechanics could access customer-only pages.

**Issue:**
The middleware (`src/middleware.ts`) only protected customer and admin routes. All mechanic routes were completely unprotected, allowing anyone to access:
- `/mechanic/dashboard`
- `/mechanic/availability`
- `/mechanic/session/*`
- `/mechanic/onboarding/*`

**Files Affected:**
- `src/middleware.ts` (lines 8-40, 59-100)

**Remediation:**
✅ Added `MECHANIC_PROTECTED_PREFIXES` to middleware
✅ Implemented mechanic token validation
✅ Added mechanic routes to middleware matcher

**Code Reference:**
```typescript
// src/middleware.ts:24-30
const MECHANIC_PROTECTED_PREFIXES = [
  '/mechanic/dashboard',
  '/mechanic/availability',
  '/mechanic/session',
  '/mechanic/onboarding',
]
```

---

### 1.2 CRITICAL: Duplicate Auth Logic Across Routes

**Severity:** 🔴 CRITICAL
**Status:** ✅ FIXED
**Impact:** Inconsistent security checks, maintenance burden, potential for security gaps.

**Issue:**
Every mechanic page and API route duplicated the same authentication logic:
- `src/app/mechanic/dashboard/page.tsx`
- `src/app/api/mechanics/requests/route.ts`
- `src/app/api/mechanics/requests/[id]/accept/route.ts`
- And many more...

This violates DRY principle and makes security updates error-prone.

**Remediation:**
✅ Created centralized auth guards in `src/lib/auth/guards.ts`
✅ Implemented separate guards for server components and API routes
✅ Type-safe return values for all guards

**Usage:**
```typescript
// Server Component
import { requireMechanic } from '@/lib/auth/guards'

export default async function MechanicDashboard() {
  const mechanic = await requireMechanic('/mechanic/dashboard')
  // ... mechanic is fully typed
}

// API Route
import { requireMechanicAPI } from '@/lib/auth/guards'

export async function GET(req: NextRequest) {
  const result = await requireMechanicAPI(req)
  if (result.error) return result.error

  const mechanic = result.data
  // ... mechanic is fully typed
}
```

**Files Created:**
- `src/lib/auth/guards.ts` - Centralized authentication guards

---

### 1.3 TODO: Role Isolation Tests

**Severity:** 🔴 HIGH
**Status:** 🔴 NOT IMPLEMENTED
**Impact:** Cannot verify that role isolation is working correctly.

**Required Tests:**
1. **Unit Tests** for auth guards
   - `requireMechanic()` should reject non-mechanics
   - `requireCustomer()` should reject non-customers
   - `requireAdmin()` should reject non-admins

2. **Integration Tests** for middleware
   - Customer accessing mechanic routes → 401/redirect
   - Mechanic accessing customer routes → 401/redirect
   - Anonymous accessing protected routes → 401/redirect

**Recommended Tool:** Vitest or Jest with Next.js testing utilities

---

## 2. Environment Variable Security

### 2.1 HIGH: Missing Runtime Environment Validation

**Severity:** 🔴 HIGH
**Status:** ✅ FIXED
**Impact:** App could run with missing/invalid configuration, leading to runtime errors or security issues.

**Issue:**
No validation of critical environment variables at build/runtime:
- Stripe keys
- Supabase credentials
- LiveKit credentials

Invalid or missing keys could cause silent failures or expose security vulnerabilities.

**Remediation:**
✅ Created `src/env.mjs` with Zod validation
✅ Validates all required environment variables
✅ Type-safe env access throughout app
✅ Fails fast at build time if configuration is invalid

**Files Created:**
- `src/env.mjs` - Zod-based environment validator
- `.env.local.example` - Updated with all required variables

**Usage:**
```typescript
import { env } from '@/env.mjs'

// Server-side only
const stripeKey = env.server.STRIPE_SECRET_KEY // Fully typed!

// Available everywhere
const appUrl = env.client.NEXT_PUBLIC_APP_URL // Fully typed!
```

---

## 3. Code Quality & Type Safety

### 3.1 MEDIUM: Insufficient TypeScript Strictness

**Severity:** 🟡 MEDIUM
**Status:** ✅ FIXED
**Impact:** Potential runtime errors from unused variables, unreachable code, unchecked array access.

**Issue:**
`tsconfig.json` had `strict: true` but was missing additional strict checks:
- `noUnusedLocals` - catches unused variables
- `noUnusedParameters` - catches unused function parameters
- `noImplicitReturns` - ensures all code paths return a value
- `noFallthroughCasesInSwitch` - prevents switch fallthrough bugs
- `noUncheckedIndexedAccess` - prevents array index out of bounds

**Remediation:**
✅ Enhanced `tsconfig.json` with additional strict checks
✅ Enhanced `eslint.config.mjs` with security rules

**Files Modified:**
- `tsconfig.json` (lines 20-25)
- `eslint.config.mjs` (lines 23-58)

---

### 3.2 HIGH: Dangerous APIs Not Banned

**Severity:** 🔴 HIGH
**Status:** ✅ FIXED
**Impact:** Code could use dangerous APIs like `eval()`, `new Function()`, exposing XSS vectors.

**Remediation:**
✅ Added ESLint rules to ban:
- `eval()`
- `new Function()`
- `no-implied-eval`

**ESLint Config:**
```javascript
rules: {
  "no-eval": "error",
  "no-new-func": "error",
  "no-implied-eval": "error",
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-floating-promises": "error",
}
```

---

### 3.3 MEDIUM: Missing Dependency Auditing

**Severity:** 🟡 MEDIUM
**Status:** ✅ FIXED
**Impact:** Unused dependencies bloat bundle; vulnerable dependencies expose security risks.

**Remediation:**
✅ Added `depcheck` to dev dependencies
✅ Created npm scripts for auditing:

```json
{
  "audit:security": "npm audit --audit-level=high",
  "audit:deps": "depcheck --ignores=\"@types/*,eslint-config-next\"",
  "audit:all": "npm run typecheck && npm run lint:strict && npm run audit:deps && npm run audit:security",
  "validate": "npm run typecheck && npm run lint && npm run build"
}
```

**Recommended Action:** Run `npm run audit:all` before each PR

---

## 4. Database Security (Supabase RLS)

### 4.1 CRITICAL: RLS Policies Not Audited

**Severity:** 🔴 CRITICAL
**Status:** 🔴 NOT COMPLETED
**Impact:** Users may be able to access/modify data belonging to other users.

**Required Actions:**

1. **List all tables in use:**
   - `profiles`
   - `intakes`
   - `sessions`
   - `session_requests`
   - `session_participants`
   - `session_files`
   - `mechanics`
   - `mechanic_sessions`
   - `vehicles`
   - Storage buckets: `intakes`, `user-files`

2. **For each table, verify:**
   - ✅ RLS is enabled
   - ✅ SELECT policies restrict to `auth.uid() = user_id` (or equivalent)
   - ✅ INSERT policies restrict to `auth.uid() = user_id`
   - ✅ UPDATE policies restrict to `auth.uid() = user_id`
   - ✅ DELETE policies restrict appropriately
   - ✅ No overly broad policies (e.g., `true` for all users)

3. **Check for cross-role access:**
   - Customers cannot access mechanic-only tables
   - Mechanics cannot access customer-only data (except assigned sessions)
   - Admin policies are scoped appropriately

**Recommended Tool:**
```sql
-- Run in Supabase SQL editor
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check policies for each table
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

---

## 5. Payment Security (Stripe)

### 5.1 HIGH: Webhook Security Not Verified

**Severity:** 🔴 HIGH
**Status:** 🔴 NOT COMPLETED
**Impact:** Attackers could fake webhook events and manipulate payments/sessions.

**Required Verification:**

1. **Webhook signature verification:**
   ```typescript
   const sig = req.headers.get('stripe-signature')
   const event = stripe.webhooks.constructEvent(
     body,
     sig,
     process.env.STRIPE_WEBHOOK_SECRET
   )
   ```

2. **Idempotency:**
   - Webhook events should be processed exactly once
   - Use event ID to track processed events
   - Store processed events in database

3. **Server-side pricing:**
   - NEVER trust client-provided prices
   - Always fetch from Stripe or server-controlled map
   - Verify amount matches expected price

**Files to Audit:**
- `src/app/api/webhooks/stripe/route.ts` (if exists)
- Any files calling `stripe.checkout.sessions.create()`

---

### 5.2 HIGH: Stripe Connect Security

**Severity:** 🔴 HIGH
**Status:** 🔴 NOT COMPLETED
**Impact:** Mechanics could manipulate payout amounts or access other mechanics' accounts.

**Required Verification:**

1. **Mechanic payout verification:**
   - Only allow payouts to verified Stripe Connect accounts
   - Verify `stripe_payouts_enabled` before processing payouts

2. **Account isolation:**
   - Mechanics can only access their own Stripe account
   - Mechanic ID is validated against session token

**Files to Audit:**
- `src/app/api/mechanics/stripe/onboard/route.ts`

---

## 6. LiveKit Security

### 6.1 HIGH: Token Generation Security

**Severity:** 🔴 HIGH
**Status:** 🔴 NOT COMPLETED
**Impact:** Users could join unauthorized rooms or impersonate others.

**Required Verification:**

1. **Server-side token minting:**
   - Tokens MUST be generated server-side only
   - Client must NEVER receive LiveKit API keys

2. **Room name security:**
   - Room names should be unguessable (e.g., UUIDs)
   - Room names should be scoped per session ID
   - Users should only receive tokens for their own sessions

3. **Identity verification:**
   - Token identity should match authenticated user
   - Verify user has permission to join the room

**Files to Audit:**
- `src/app/api/livekit/token/route.ts` (if exists)
- Any files using `livekit-server-sdk`

---

## 7. Email & Authentication Flows

### 7.1 MEDIUM: Open Redirect Vulnerability

**Severity:** 🟡 MEDIUM
**Status:** 🔴 NOT COMPLETED
**Impact:** Attackers could craft malicious links that redirect users to phishing sites.

**Required Actions:**

1. **Validate redirect URLs:**
   ```typescript
   // Allowlist approach
   const ALLOWED_REDIRECTS = [
     '/customer/dashboard',
     '/mechanic/dashboard',
     '/admin/intakes'
   ]

   function isAllowedRedirect(url: string): boolean {
     return ALLOWED_REDIRECTS.some(allowed => url.startsWith(allowed))
   }
   ```

2. **Audit all redirect parameters:**
   - `?redirect=`
   - `?next=`
   - `?return_to=`

**Files to Audit:**
- `src/middleware.ts`
- `src/app/auth/callback/route.ts`
- All login/logout routes

---

## 8. Security Headers

### 8.1 HIGH: Missing Security Headers

**Severity:** 🔴 HIGH
**Status:** 🔴 NOT IMPLEMENTED
**Impact:** Vulnerable to clickjacking, XSS, MIME-sniffing attacks.

**Required Headers:**

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()'
        },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://*.supabase.co https://*.livekit.cloud wss://*.livekit.cloud"
          ].join('; ')
        }
      ]
    }]
  }
}
```

---

## 9. UI/UX Bugs

### 9.1 MEDIUM: Dropdown Menu Clipping

**Severity:** 🟡 MEDIUM
**Status:** ✅ FIXED (Previous session)
**Impact:** Users cannot see dropdown options.

**Issue:**
Dropdown menus in session cards were clipped by parent `overflow: hidden`.

**Remediation:**
✅ Removed `relative` class from parent card
✅ Increased dropdown z-index to `z-[9999]`
✅ Added `backdrop-blur-xl` for visual separation

**Files Fixed:**
- `src/components/customer/SessionHistoryCard.tsx`

---

## 10. Performance

### 10.1 MEDIUM: Missing Performance Optimizations

**Severity:** 🟡 MEDIUM
**Status:** 🔴 NOT COMPLETED
**Impact:** Slow page loads, large bundle sizes, poor Core Web Vitals.

**Required Actions:**

1. **Image Optimization:**
   - Use `next/image` for all images
   - Add `loading="lazy"` for below-fold images
   - Serve images in modern formats (WebP, AVIF)

2. **Bundle Size:**
   - Analyze with `@next/bundle-analyzer`
   - Add dynamic imports for heavy components:
     ```typescript
     const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
       loading: () => <Skeleton />,
       ssr: false
     })
     ```

3. **Caching:**
   - Use `revalidate` for ISR
   - Configure CDN caching headers
   - Implement SWR for client-side data fetching

---

## Summary of Completed Work

### ✅ Completed

1. **Static Checks & Tooling**
   - ✅ Enhanced TypeScript config with strict checks
   - ✅ Enhanced ESLint config with security rules
   - ✅ Added `depcheck` for dependency auditing
   - ✅ Added npm scripts: `audit:security`, `audit:deps`, `audit:all`, `validate`

2. **Environment Security**
   - ✅ Created `src/env.mjs` with Zod validation
   - ✅ Updated `.env.local.example` with all required variables
   - ✅ Type-safe environment variable access

3. **Authentication & Authorization**
   - ✅ Created centralized auth guards (`src/lib/auth/guards.ts`)
   - ✅ Enhanced middleware to protect mechanic routes
   - ✅ Added role-based access control for all route types

4. **UI Fixes (Previous Session)**
   - ✅ Fixed dropdown z-index issues
   - ✅ Active session display with blinking icons
   - ✅ ONE active session business rule enforcement

---

## Pending Critical Work

### 🔴 High Priority

1. **Supabase RLS Audit** - Verify all tables have proper policies
2. **Stripe Webhook Security** - Verify signature verification and idempotency
3. **LiveKit Token Security** - Audit server-side token generation
4. **Security Headers** - Implement CSP, X-Frame-Options, etc.
5. **Open Redirect Prevention** - Validate all redirect parameters
6. **Integration Tests** - Write tests for role isolation

### 🟡 Medium Priority

7. **Performance Optimization** - Images, caching, bundle size
8. **Dependency Audit** - Run `npm audit` and fix vulnerabilities

---

## Next Steps

1. **Immediate:** Review and fix Supabase RLS policies
2. **Immediate:** Audit Stripe webhook security
3. **Short-term:** Implement security headers
4. **Short-term:** Write integration tests for auth
5. **Medium-term:** Performance optimization pass

---

## Appendix: Audit Commands

```bash
# Run full static checks
npm run audit:all

# Type check only
npm run typecheck

# Lint with no warnings
npm run lint:strict

# Security audit (high severity only)
npm run audit:security

# Check for unused dependencies
npm run audit:deps

# Full validation (type + lint + build)
npm run validate
```

---

**Report End**
