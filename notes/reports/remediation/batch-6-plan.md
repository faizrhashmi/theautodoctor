# Batch 6 Security Remediation Plan — Shared / Other Layers

**Date:** 2025-11-01
**Branch:** (TBD after approval)
**Status:** 🟡 READ-ONLY PLANNING PHASE
**Scope:** Global utilities, middleware, configuration, debug endpoints

---

## Executive Summary

Batch 6 addresses **7 critical (P0) security vulnerabilities** and **4 high-priority (P1) issues** across shared infrastructure, middleware, debug tooling, and configuration management. Unlike previous batches focused on specific attack surfaces (API, Admin, Session/Video), Batch 6 targets **cross-cutting concerns** that affect the entire application.

### Critical Findings

| ID | Issue | Severity | Impact | Affected |
|----|-------|----------|--------|----------|
| **P0-1** | Debug Endpoints Exposed in Production | 🔴 Critical | 33/55 debug endpoints unprotected | Entire platform |
| **P0-2** | Rate Limiter Fails Open on Error | 🔴 Critical | Brute force attacks enabled | Auth endpoints |
| **P0-3** | Middleware Excessive Logging | 🔴 Critical | PII leaked in production logs | All routes |
| **P0-4** | Duplicate Auth Guard Implementations | 🔴 High | Inconsistent security enforcement | API routes |
| **P0-5** | Missing Production Environment Gating | 🔴 Critical | Debug tools accessible in prod | /api/debug/* |
| **P0-6** | Hardcoded Configuration Values | 🟡 Medium | Deployment inconsistency | Multiple files |
| **P0-7** | Cookie Clearing Inconsistencies | 🔴 High | Session persistence bugs | Logout flows |

**Total Risk Exposure:** 55 debug endpoints, 43 sensitive log statements, 3 duplicate auth systems, 337 API routes

---

## 1. Scope & Findings

### 1.1 Audit Targets

Examined the following areas:
- ✅ **55 debug endpoints** in `/api/debug/*`
- ✅ **Middleware** (`src/middleware.ts`) - 437 lines, 43 console.log statements
- ✅ **Rate limiting** (`src/lib/ratelimit.ts`) - fail-open behavior
- ✅ **Auth guards** (3 separate implementations)
- ✅ **Configuration** (`src/config/pricing.ts`)
- ✅ **Shared libraries** in `src/lib/*`

### 1.2 P0 Vulnerabilities (Must Fix)

#### **P0-1: Debug Endpoints Exposed in Production**

**Risk:** 33 out of 55 debug endpoints (60%) have **NO authentication** and are accessible in production.

**Evidence:**
```bash
# Total debug endpoints: 55
$ find src/app/api/debug -name "route.ts" | wc -l
55

# Protected with withDebugAuth: 22 (40%)
$ grep -rl "withDebugAuth" src/app/api/debug | wc -l
22

# UNPROTECTED: 33 (60%)
# Examples:
# - /api/debug/force-end-session (modifies DB)
# - /api/debug/production-check (exposes env vars)
# - /api/debug/force-cancel-session (bypasses FSM)
# - /api/debug/grant-workshop-access (privilege escalation)
# - /api/debug/reset-mechanic-password (account takeover)
```

**Impact:**
- **Account takeover** via password reset endpoints
- **Privilege escalation** via workshop access grants
- **Data manipulation** via session force-end/cancel
- **Information disclosure** via production-check endpoint

**Affected Files:**
- `src/app/api/debug/force-end-session/route.ts` (lines 1-156)
- `src/app/api/debug/production-check/route.ts` (lines 1-64)
- `src/app/api/debug/grant-workshop-access/route.ts`
- `src/app/api/debug/reset-mechanic-password/route.ts`
- ... and 29 other debug endpoints

---

#### **P0-2: Rate Limiter Fails Open on Redis Error**

**Risk:** When Redis/Upstash is unavailable, rate limiting is **bypassed entirely**, allowing unlimited authentication attempts.

**Evidence:**
```typescript
// src/lib/ratelimit.ts:179
} catch (error) {
  console.error('[RateLimit] Error checking rate limit:', error)
  // ❌ SECURITY ISSUE: Fail open - allows request on error
  return { allowed: true }
}
```

**Impact:**
- **Brute force attacks** against login/signup endpoints succeed when Redis is down
- **DDoS amplification** during Redis outages
- **Password spray attacks** can enumerate accounts

**Affected Files:**
- `src/lib/ratelimit.ts:179` - checkRateLimit function

---

#### **P0-3: Middleware Excessive Logging in Production**

**Risk:** 43 `console.log` statements in middleware leak **Personally Identifiable Information (PII)** in production logs.

**Evidence:**
```typescript
// src/middleware.ts - Examples of leaked data:
console.log(`[MIDDLEWARE] Reading cookie: ${name}`, value ? 'PRESENT' : 'MISSING') // Line 108
console.log(`[MIDDLEWARE] User authenticated: ${user.email}`) // Line 169
console.log(`[MIDDLEWARE] User ID: ${user.id}`) // Line 209
console.log(`[MIDDLEWARE] User email: ${user.email}`) // Line 210
```

**Total Logs:** 43 console statements across middleware (verified via grep)

**Impact:**
- **GDPR/PIPEDA violations** - PII in server logs
- **Compliance risk** - emails, user IDs logged without consent
- **Log storage costs** - excessive verbosity in production
- **Security incident forensics pollution** - noise obscures real threats

**Affected Files:**
- `src/middleware.ts:108, 113, 120, 137, 142, 156, 169, 199, 209, 210, 227, 232, 237, 254, 255, 258, 260, 274, 275, 281, 287, 291, 308, 309, 312, 342, 374, 375, 390, 392, 397, 402, 407` (43 total)

---

#### **P0-4: Duplicate Auth Guard Implementations**

**Risk:** Three separate admin authentication systems with **inconsistent behavior** and **no centralized security policy**.

**Evidence:**
```
src/lib/auth/guards.ts          - requireAdminAPI()
src/lib/auth/requireAdmin.ts    - requireAdmin()
src/lib/auth/sessionGuards.ts   - (session-specific)
```

**Behavioral Differences:**
| Implementation | Error Handling | Response Format | Used In |
|----------------|----------------|-----------------|---------|
| `guards.ts:requireAdminAPI()` | Returns NextResponse | `{ error, data }` | Most API routes |
| `requireAdmin.ts:requireAdmin()` | Returns NextResponse | `{ authorized, response }` | Some admin routes |
| `guards.ts:requireAdmin()` | Throws redirect | Server components only | Admin pages |

**Impact:**
- **Security bypass** - developers may use wrong guard
- **Inconsistent error messages** - poor UX
- **Maintenance burden** - bugs fixed in one but not others
- **Testing complexity** - duplicate test coverage needed

**Affected Files:**
- `src/lib/auth/guards.ts:393-441` - requireAdminAPI()
- `src/lib/auth/requireAdmin.ts:24-88` - requireAdmin()
- `src/lib/auth/guards.ts:182-213` - requireAdmin() (server component version)

---

#### **P0-5: Missing Production Environment Gating**

**Risk:** `withDebugAuth` protects some endpoints but **NODE_ENV check allows dev mode bypasses** even in staging/production.

**Evidence:**
```typescript
// src/lib/debugAuth.ts:31
const isDevelopment = process.env.NODE_ENV === 'development'

if (isDevelopment) {
  console.log(`[DEBUG AUTH] Development mode - allowing access to: ${endpoint}`)
  return { authorized: true } // ❌ Bypasses admin check
}
```

**Problem:** If production is deployed with `NODE_ENV=development`, ALL debug endpoints are open.

**Impact:**
- **Environment misconfiguration** leads to total security bypass
- **No defense-in-depth** - single env var controls all debug access
- **Staging environments** may be misconfigured and vulnerable

**Affected Files:**
- `src/lib/debugAuth.ts:31-38` - verifyDebugAccess()

---

#### **P0-6: Hardcoded Configuration Values** (Medium Priority)

**Risk:** Pricing and feature constants scattered across codebase instead of centralized configuration.

**Evidence:**
```typescript
// src/config/pricing.ts:49-52
chat10: {
  name: 'Quick Chat (30 min)',
  priceCents: 999,  // ❌ Hardcoded
```

**Scattered Constants:**
- Platform fees (e.g., 15% in some files, 20% in others)
- Session durations (30, 45, 60 minutes)
- File size limits (25MB in some places, 10MB in others)
- Rate limit thresholds (5 attempts, 3 attempts, 10 attempts)

**Impact:**
- **Inconsistent pricing** - different values in different flows
- **Deployment errors** - changes require code deploys
- **A/B testing impossible** - can't experiment with pricing
- **Audit trail missing** - no record of price changes

**Affected Files:**
- `src/config/pricing.ts:49-85`
- `src/app/video/[id]/VideoSessionClient.tsx:26-30` (PLAN_DURATIONS)
- `src/app/api/sessions/[id]/files/route.ts:36` (25MB limit)
- `src/lib/ratelimit.ts:49, 68, 87, 106, 125` (rate limits)

---

#### **P0-7: Cookie Clearing Inconsistencies**

**Risk:** Logout flows clear cookies inconsistently, leaving **stale auth cookies** that cause session bugs.

**Evidence:**
```typescript
// src/middleware.ts:140-153 - Clears specific cookies
const authCookies = ['sb-access-token', 'sb-refresh-token']

// But some areas use different cookie names or patterns:
// - Some clear "sb-*" prefixed cookies
// - Some only clear access/refresh tokens
// - Logout routes may clear different sets
```

**Impact:**
- **Session persistence after logout** - security issue
- **"Already logged in" errors** - user can't re-login
- **Cross-role contamination** - mechanic cookie + customer session
- **Browser cache issues** - stale cookies served

**Affected Files:**
- `src/middleware.ts:140-165` - Auth error cookie clearing
- `src/app/api/customer/logout/route.ts`
- `src/app/api/mechanic/logout/route.ts`
- `src/app/api/admin/logout/route.ts` (if exists)

---

### 1.3 P1 Issues (Should Fix)

#### **P1-1: No Compliance Hook Enforcement**

**Finding:** CASL/PIPEDA compliance modules exist but are **not enforced** in email/messaging routes.

**Evidence:**
- `src/lib/notifications/compliance-notifications.ts` exists
- `src/lib/pdf/templates/CASLComplianceReport.tsx` exists
- No grep matches in `/api/chat/*` or `/api/email/*` routes

**Recommendation:** Audit in Batch 7 (if needed) - not critical for initial security fixes.

---

## 2. Proposed Fixes (READ-ONLY - No Implementation Yet)

### Fix P0-1: Debug Endpoint Protection

**Strategy:** Add middleware-level blocking + enforce `withDebugAuth` on all debug routes.

**Steps:**
1. Update `src/middleware.ts` to block `/api/debug/*` in production:
   ```typescript
   // Add to middleware matcher (line 421):
   if (pathname.startsWith('/api/debug')) {
     if (process.env.NODE_ENV === 'production') {
       // Block at middleware level for defense-in-depth
       return NextResponse.json({ error: 'Not found' }, { status: 404 })
     }
   }
   ```

2. Add `withDebugAuth` to the **33 unprotected endpoints**:
   ```typescript
   // Pattern for each endpoint:
   import { withDebugAuth } from '@/lib/debugAuth'

   async function handler(req: NextRequest) {
     // Existing logic...
   }

   export const GET = withDebugAuth(handler)
   export const POST = withDebugAuth(handler)
   ```

3. Create migration helper script to identify missing guards:
   ```bash
   # Script: scripts/audit-debug-auth.sh
   # Lists all debug endpoints without withDebugAuth
   ```

**Files to Change:**
- `src/middleware.ts:421` - Add debug endpoint matcher
- `src/app/api/debug/*/route.ts` - 33 files need withDebugAuth wrapper

**Testing:**
- Verify `/api/debug/*` returns 404 in production
- Verify admin can still access in production
- Verify dev mode still works

---

### Fix P0-2: Rate Limiter Fail-Closed Policy

**Strategy:** Change checkRateLimit to **fail closed** (block on error) with circuit breaker.

**Steps:**
1. Modify `src/lib/ratelimit.ts:179`:
   ```typescript
   } catch (error) {
     console.error('[RateLimit] Error checking rate limit:', error)

     // P0-2 FIX: Fail closed in production
     if (process.env.NODE_ENV === 'production') {
       return {
         allowed: false,
         error: 'Rate limiting service temporarily unavailable. Please try again.',
       }
     }

     // In development, allow for easier testing
     return { allowed: true }
   }
   ```

2. Add circuit breaker pattern (optional - P1):
   ```typescript
   // Track consecutive Redis failures
   // After N failures, temporarily bypass rate limiting
   // Restore when Redis recovers
   ```

3. Add monitoring/alerting when rate limiter fails

**Files to Change:**
- `src/lib/ratelimit.ts:179` - checkRateLimit error handler

**Testing:**
- Simulate Redis outage (stop Upstash container)
- Verify login returns 429 error
- Verify descriptive error message shown

---

### Fix P0-3: Remove Production Logging

**Strategy:** Wrap all middleware logging in `isDevelopment` checks.

**Steps:**
1. Add environment check at top of `src/middleware.ts`:
   ```typescript
   const isDevelopment = process.env.NODE_ENV === 'development'
   const isProduction = process.env.NODE_ENV === 'production'
   ```

2. Wrap each console.log statement:
   ```typescript
   // Before:
   console.log(`[MIDDLEWARE] User authenticated: ${user.email}`)

   // After:
   if (isDevelopment) {
     console.log(`[MIDDLEWARE] User authenticated: ${user.email}`)
   }
   ```

3. Keep **security warnings** in production (console.warn, console.error)

4. Alternative: Use structured logger that respects LOG_LEVEL env var

**Files to Change:**
- `src/middleware.ts:108, 113, 120...` (43 statements) - Wrap in isDevelopment

**Testing:**
- Set NODE_ENV=production locally
- Verify no PII logged
- Verify security warnings still appear

---

### Fix P0-4: Unify Auth Guards

**Strategy:** Deprecate duplicate implementations, consolidate to `src/lib/auth/guards.ts`.

**Steps:**
1. Mark `src/lib/auth/requireAdmin.ts` as deprecated:
   ```typescript
   /**
    * @deprecated Use requireAdminAPI from '@/lib/auth/guards' instead.
    * This file will be removed in a future release.
    */
   ```

2. Update all imports to use guards.ts:
   ```typescript
   // Before:
   import { requireAdmin } from '@/lib/auth/requireAdmin'

   // After:
   import { requireAdminAPI } from '@/lib/auth/guards'
   ```

3. Add JSDoc to guards.ts explaining which function to use when

4. (Future cleanup) Remove requireAdmin.ts after migration complete

**Files to Change:**
- `src/lib/auth/requireAdmin.ts:1` - Add deprecation notice
- Search and replace imports across codebase (estimated 20-30 files)

**Testing:**
- Verify all admin routes still protected
- Run typecheck to catch import errors
- Test admin login flow end-to-end

---

### Fix P0-5: Strengthen Debug Auth Gating

**Strategy:** Add additional AAD_ENV check as defense-in-depth.

**Steps:**
1. Add new environment variable for explicit production marker:
   ```bash
   # .env.production
   AAD_ENV=production  # Explicit production marker
   ```

2. Update `src/lib/debugAuth.ts:31`:
   ```typescript
   const isDevelopment = process.env.NODE_ENV === 'development'
   const isProduction = process.env.AAD_ENV === 'production' // ✅ Additional check

   // P0-5 FIX: Require both checks to pass
   if (isDevelopment && !isProduction) {
     console.log(`[DEBUG AUTH] Development mode - allowing access`)
     return { authorized: true }
   }

   // Otherwise, require admin authentication
   ```

3. Document in deployment guide that AAD_ENV must be set

**Files to Change:**
- `src/lib/debugAuth.ts:31-38` - Add AAD_ENV check
- `.env.example` - Document AAD_ENV variable
- Deployment docs - Add AAD_ENV setup step

**Testing:**
- Test with NODE_ENV=development + AAD_ENV=production (should block)
- Test with NODE_ENV=production + AAD_ENV unset (should block)
- Test with NODE_ENV=development + AAD_ENV unset (should allow)

---

### Fix P0-6: Centralize Configuration (P1 Priority)

**Strategy:** Move hardcoded values to database-backed config system.

**Steps:**
1. Use existing `service_plans` table for pricing (already migrated)

2. Create `platform_config` table for other constants:
   ```sql
   CREATE TABLE platform_config (
     key TEXT PRIMARY KEY,
     value JSONB NOT NULL,
     category TEXT,
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. Add config management API:
   ```typescript
   // GET /api/admin/config
   // PUT /api/admin/config
   ```

4. Create React hook: `usePlatformConfig(key)`

**Files to Change:**
- New migration file
- `src/app/api/admin/config/route.ts` (new)
- `src/hooks/usePlatformConfig.ts` (new)

**Testing:**
- Verify config updates reflected without redeploy
- Test fallback to hardcoded values if DB unavailable

---

### Fix P0-7: Standardize Cookie Clearing

**Strategy:** Create utility function for consistent cookie clearing.

**Steps:**
1. Create `src/lib/auth/cookies.ts`:
   ```typescript
   export function clearAllAuthCookies(response: NextResponse) {
     const cookieNames = [
       'sb-access-token',
       'sb-refresh-token',
       // Add any other auth-related cookies
     ]

     cookieNames.forEach(name => {
       response.cookies.set({
         name,
         value: '',
         maxAge: 0,
         path: '/',
       })
     })
   }
   ```

2. Update all logout routes to use utility:
   ```typescript
   import { clearAllAuthCookies } from '@/lib/auth/cookies'

   const response = NextResponse.json({ success: true })
   clearAllAuthCookies(response)
   return response
   ```

3. Update middleware.ts to use same utility

**Files to Change:**
- `src/lib/auth/cookies.ts` (new file)
- `src/middleware.ts:140-165` - Use utility function
- `src/app/api/customer/logout/route.ts`
- `src/app/api/mechanic/logout/route.ts`

**Testing:**
- Logout and verify all cookies cleared
- Check browser DevTools → Application → Cookies
- Verify can re-login without "already logged in" errors

---

## 3. Testing & Verification Plan

### 3.1 Pre-Implementation Verification

**Before making any code changes:**

1. ✅ Run current build:
   ```bash
   npm run build
   npm run typecheck
   ```

2. ✅ Document baseline metrics:
   ```bash
   # Debug endpoints
   find src/app/api/debug -name "*.ts" | wc -l  # Should be 55

   # Console logs in middleware
   grep -c "console\." src/middleware.ts  # Should be 43

   # Auth guard files
   find src/lib/auth -name "*.ts" | wc -l
   ```

3. ✅ Export current production logs (sample) for PII audit

### 3.2 Post-Implementation Testing

**After applying fixes:**

#### Test P0-1: Debug Endpoint Protection

```bash
# Test 1: Production blocking
export NODE_ENV=production
export AAD_ENV=production

curl http://localhost:3000/api/debug/production-check
# Expected: 404 Not Found

# Test 2: Admin access in production
curl -H "Cookie: sb-access-token=<admin-token>" \
  http://localhost:3000/api/debug/production-check
# Expected: 200 OK (if using withDebugAuth)

# Test 3: Dev mode still works
export NODE_ENV=development
unset AAD_ENV

curl http://localhost:3000/api/debug/production-check
# Expected: 200 OK
```

**Evidence Required:**
- ✅ Screenshot of 404 response in production mode
- ✅ Logs showing "Debug endpoint blocked in production"

---

#### Test P0-2: Rate Limiter Fail-Closed

```bash
# Test 1: Normal operation
curl -X POST http://localhost:3000/api/customer/signup \
  -d '{"email": "test@example.com", "password": "pass123"}'
# Expected: 200 OK or 429 (if already rate limited)

# Test 2: Simulate Redis failure
docker stop <upstash-redis-container>

curl -X POST http://localhost:3000/api/customer/signup \
  -d '{"email": "test2@example.com", "password": "pass456"}'
# Expected: 429 Too Many Requests (fail-closed)

# Test 3: Verify error message
# Expected: "Rate limiting service temporarily unavailable"
```

**Evidence Required:**
- ✅ 429 response when Redis is down
- ✅ Error message matches expected text

---

#### Test P0-3: No PII in Production Logs

```bash
# Test: Check production logs for PII
export NODE_ENV=production
export AAD_ENV=production

# Trigger middleware execution
curl http://localhost:3000/customer/dashboard

# Check server logs
grep -i "user.*email" logs/app.log
# Expected: NO MATCHES

grep -i "user.*id.*uuid" logs/app.log
# Expected: NO MATCHES

# Security warnings should still appear
grep -i "\[SECURITY\]" logs/app.log
# Expected: MATCHES (warnings preserved)
```

**Evidence Required:**
- ✅ Log excerpt showing no PII
- ✅ Confirmation that security warnings still logged

---

#### Test P0-4: Auth Guard Unification

```bash
# Test: Verify all admin routes use guards.ts
grep -r "from '@/lib/auth/requireAdmin'" src/app/api
# Expected: 0 matches (all migrated)

grep -r "requireAdminAPI" src/app/api
# Expected: Multiple matches (unified guard)

# Test admin route protection
curl http://localhost:3000/api/admin/plans
# Expected: 401 Unauthorized

curl -H "Cookie: sb-access-token=<admin-token>" \
  http://localhost:3000/api/admin/plans
# Expected: 200 OK
```

**Evidence Required:**
- ✅ Grep results showing migration complete
- ✅ Admin route returns 401 without auth

---

#### Test P0-5: Debug Auth Strengthened

```bash
# Test 1: Production mode blocks debug
export NODE_ENV=development  # Misconfigured
export AAD_ENV=production    # Correct production marker

curl http://localhost:3000/api/debug/session-health
# Expected: 403 Forbidden (admin auth required)

# Test 2: True dev mode allows
export NODE_ENV=development
unset AAD_ENV

curl http://localhost:3000/api/debug/session-health
# Expected: 200 OK
```

**Evidence Required:**
- ✅ 403 response when AAD_ENV=production
- ✅ Logs showing "Production mode - verifying admin access"

---

#### Test P0-7: Cookie Clearing Consistency

```bash
# Test 1: Logout clears all cookies
# Login first
curl -X POST http://localhost:3000/signup \
  -d '{"email": "test@example.com", "password": "pass123"}'

# Check cookies
# Browser DevTools → Application → Cookies
# Note: sb-access-token, sb-refresh-token present

# Logout
curl -X POST http://localhost:3000/api/customer/logout

# Check cookies again
# Expected: sb-access-token, sb-refresh-token REMOVED

# Test 2: Can re-login immediately
curl -X POST http://localhost:3000/signup \
  -d '{"email": "test@example.com", "password": "pass123", "mode": "login"}'
# Expected: 200 OK (no "already logged in" error)
```

**Evidence Required:**
- ✅ Screenshot showing cookies cleared
- ✅ Successful re-login without errors

---

### 3.3 Regression Testing

**Ensure existing functionality still works:**

- [ ] Customer login/signup flow
- [ ] Mechanic login/dashboard access
- [ ] Admin dashboard access
- [ ] Session creation and video calls
- [ ] File uploads (within rate limits)
- [ ] Chat messaging
- [ ] Payment flows (Stripe integration)

---

### 3.4 Production Verification (Post-Deployment)

**After deploying to production:**

1. **Verify debug endpoints blocked:**
   ```bash
   curl https://app.theautodoctor.com/api/debug/production-check
   # Expected: 404 Not Found
   ```

2. **Check production logs for PII:**
   ```bash
   # View last 100 lines of application logs
   # Verify no email addresses or user IDs present
   ```

3. **Monitor rate limiter behavior:**
   ```bash
   # Check Upstash Redis dashboard
   # Verify rate limit hits are recorded
   # Confirm no spike in authentication attempts
   ```

4. **Test admin access to debug tools:**
   ```bash
   # Login as admin
   # Visit /admin/debug (if exists) or use API directly
   # Verify can access debug endpoints with admin auth
   ```

---

## 4. Rollback & Safety Plan

### 4.1 Pre-Deployment Safety Checks

**Before merging to main:**

1. ✅ All tests passing (see Testing Plan above)
2. ✅ TypeScript build successful (`npm run build`)
3. ✅ No new linting errors (`npm run lint`)
4. ✅ Peer review completed (minimum 1 reviewer)
5. ✅ Deployment runbook prepared (see below)

### 4.2 Deployment Runbook

**Step-by-step deployment process:**

```bash
# 1. Backup current production database
pg_dump $DATABASE_URL > backups/pre-batch-6-$(date +%Y%m%d).sql

# 2. Deploy code to staging first
git checkout remediate/batch-6
npm run build
# Deploy to staging environment

# 3. Run verification tests on staging
./scripts/verify-batch-6.sh --env=staging

# 4. If staging tests pass, deploy to production
# Deploy to production environment

# 5. Verify production deployment
./scripts/verify-batch-6.sh --env=production

# 6. Monitor for 30 minutes
# Watch error rates, login success rates, API response times
```

### 4.3 Rollback Procedures

**If critical issues occur after deployment:**

#### **Rollback Option 1: Revert Code (Fast)**

```bash
# 1. Revert to previous commit
git revert <batch-6-commit-sha>
git push origin main

# 2. Redeploy previous version
# Trigger deployment pipeline

# 3. Verify rollback successful
curl https://app.theautodoctor.com/health
```

**Time to rollback:** ~5 minutes
**Data loss:** None (code-only changes)

---

#### **Rollback Option 2: Feature Flags (Partial)**

If only specific fixes are problematic:

```bash
# Add emergency feature flags to .env
DEBUG_ENDPOINTS_ENABLED=true    # Re-enable debug endpoints
RATE_LIMITER_FAIL_OPEN=true     # Revert to fail-open
MIDDLEWARE_LOGGING=true         # Re-enable verbose logs

# Restart application
# Verify specific feature restored
```

**Time to rollback:** ~2 minutes
**Scope:** Granular (can rollback individual fixes)

---

#### **Rollback Option 3: Database Restore (Nuclear)**

**Only if database changes cause issues (P0-6 config table):**

```bash
# 1. Stop application
systemctl stop app

# 2. Restore database backup
psql $DATABASE_URL < backups/pre-batch-6-YYYYMMDD.sql

# 3. Restart application
systemctl start app
```

**Time to rollback:** ~10 minutes
**Data loss:** Any data created after backup

---

### 4.4 Monitoring & Alerting

**Post-deployment monitoring (first 24 hours):**

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate | >5% increase | Investigate immediately |
| Login failures | >20% increase | Check rate limiter |
| Debug endpoint 404s | >10/minute | Check middleware blocking |
| Cookie-related errors | >5 occurrences | Check cookie clearing logic |
| Redis connection failures | >3 in 10 minutes | Alert on-call engineer |

**Tools:**
- Application logs: `tail -f /var/log/app/production.log`
- Uptime monitoring: Pingdom/UptimeRobot
- Error tracking: Sentry
- APM: New Relic / Datadog (if available)

---

## 5. Estimated Effort & Dependencies

### 5.1 Development Effort

| Fix | Complexity | Estimated Time | Risk |
|-----|------------|----------------|------|
| **P0-1: Debug Endpoint Protection** | Medium | 4 hours | Low |
| **P0-2: Rate Limiter Fail-Closed** | Low | 1 hour | Medium |
| **P0-3: Remove Production Logging** | Low | 2 hours | Low |
| **P0-4: Unify Auth Guards** | Medium | 3 hours | Medium |
| **P0-5: Strengthen Debug Auth** | Low | 1 hour | Low |
| **P0-6: Centralize Configuration** | High | 8 hours | High |
| **P0-7: Standardize Cookie Clearing** | Low | 2 hours | Low |
| **Testing & Verification** | - | 4 hours | - |
| **Documentation** | - | 2 hours | - |
| **Total** | - | **27 hours** | - |

**Timeline:** 3-4 business days for a single engineer

### 5.2 Dependencies

**External Dependencies:**
- ✅ Upstash Redis (for rate limiting) - already configured
- ✅ Supabase (for auth) - already configured
- ❌ None for this batch

**Internal Dependencies:**
- ✅ Batch 5 (Session/Video/Chat) must be completed first
- ⚠️ P0-6 (Config centralization) can be deferred to Batch 7 if timeline critical

**Environment Variables Required:**
```bash
# New variables for Batch 6
AAD_ENV=production           # Explicit production marker
LOG_LEVEL=error              # Optional: Control log verbosity
RATE_LIMITER_FAIL_CLOSED=true # Optional: Override fail-closed behavior
```

### 5.3 Breaking Changes

**None expected.** All fixes are additive or internal behavior changes.

**Potential User Impact:**
- ⚠️ P0-2 (fail-closed rate limiter): Users may see "service unavailable" during Redis outages (acceptable trade-off for security)
- ⚠️ P0-3 (logging reduction): Debugging production issues may be slightly harder (mitigated by structured logging)

---

## 6. Success Criteria

**Batch 6 is considered complete when:**

### Code Quality
- ✅ All 55 debug endpoints protected (middleware block + withDebugAuth)
- ✅ Rate limiter fails closed in production
- ✅ Zero PII in production logs
- ✅ Single unified auth guard system (guards.ts)
- ✅ AAD_ENV check enforced for debug access
- ✅ Consistent cookie clearing across all logout flows

### Security Posture
- ✅ No public access to debug endpoints in production
- ✅ Brute force attacks blocked even during Redis outages
- ✅ GDPR/PIPEDA compliance improved (no PII logging)
- ✅ Defense-in-depth: middleware block + auth guards

### Testing
- ✅ All tests in verification plan passing
- ✅ Zero regressions in existing functionality
- ✅ Production deployment verified for 24 hours

### Documentation
- ✅ This plan document complete
- ✅ Post-deployment verification report created
- ✅ Deployment runbook reviewed by ops team

---

## 7. Next Steps (AWAITING APPROVAL)

**Current Status:** 🟡 READ-ONLY PLANNING PHASE

**This plan is awaiting explicit user approval. Do NOT proceed with implementation until you receive:**

```
APPROVE PLAN 6 — proceed to IMPLEMENT
```

**After approval, the implementation workflow will be:**

1. ✅ Create branch: `remediate/batch-6`
2. ✅ Implement P0 fixes in order: P0-1 → P0-2 → P0-3 → P0-4 → P0-5 → P0-7
3. ✅ Defer P0-6 (config centralization) to future batch if timeline critical
4. ✅ Run full testing suite
5. ✅ Create verification report with evidence
6. ✅ Submit PR for review
7. ✅ Deploy to staging → production
8. ✅ Monitor for 24 hours

**Estimated Timeline After Approval:** 3-4 business days

---

## Appendix A: File Reference Index

**Files to Modify:**

| Priority | File | Lines | Change Type |
|----------|------|-------|-------------|
| P0-1 | `src/middleware.ts` | 421 | Add debug endpoint matcher |
| P0-1 | `src/app/api/debug/*/route.ts` | Various | Add withDebugAuth (33 files) |
| P0-2 | `src/lib/ratelimit.ts` | 179 | Change fail-open to fail-closed |
| P0-3 | `src/middleware.ts` | 108, 113, 120... | Wrap logs in isDevelopment (43 lines) |
| P0-4 | `src/lib/auth/requireAdmin.ts` | 1 | Add deprecation notice |
| P0-4 | Multiple API routes | Various | Update imports (20-30 files) |
| P0-5 | `src/lib/debugAuth.ts` | 31-38 | Add AAD_ENV check |
| P0-7 | `src/lib/auth/cookies.ts` | NEW | Create utility function |
| P0-7 | `src/middleware.ts` | 140-165 | Use cookie utility |
| P0-7 | `src/app/api/*/logout/route.ts` | Various | Use cookie utility (3 files) |

**Files to Create:**

| File | Purpose |
|------|---------|
| `src/lib/auth/cookies.ts` | Cookie clearing utility (P0-7) |
| `scripts/audit-debug-auth.sh` | Verify debug endpoints protected (P0-1) |
| `scripts/verify-batch-6.sh` | Post-deployment verification (Testing) |
| `notes/reports/remediation/batch-6-verification.md` | Evidence of testing (Post-impl) |

---

## Appendix B: Risk Matrix

| ID | Issue | Likelihood | Impact | Risk Score | Mitigation |
|----|-------|------------|--------|------------|------------|
| P0-1 | Debug endpoints exploited | High | Critical | **9/10** | Middleware block + auth guards |
| P0-2 | Brute force during outage | Medium | High | **7/10** | Fail-closed policy |
| P0-3 | PII leaked in logs | High | Medium | **7/10** | Remove prod logging |
| P0-4 | Wrong guard used | Low | Medium | **5/10** | Unify + deprecate |
| P0-5 | Env misconfiguration | Low | Critical | **7/10** | Dual check (NODE_ENV + AAD_ENV) |
| P0-6 | Config inconsistency | Medium | Low | **4/10** | DB-backed config (defer) |
| P0-7 | Session bugs | Medium | Medium | **6/10** | Cookie utility |

**Overall Batch 6 Risk Level:** 🔴 **HIGH** (without remediation)
**Post-Remediation Risk Level:** 🟢 **LOW**

---

**Report Generated:** 2025-11-01
**Engineer:** Claude (Lead Remediator)
**Status:** ✅ PLAN COMPLETE - AWAITING APPROVAL
