# AskAutoDoctor Backend API Security Audit
**Generated:** 2025-10-28
**Platform:** Next.js 14 App Router + TypeScript + Supabase
**Total Endpoints Analyzed:** 256

---

## Executive Summary

This comprehensive security audit of the AskAutoDoctor backend API has identified **multiple critical security vulnerabilities** that require immediate attention. The platform has 256 API endpoints with varying levels of authentication and security controls.

### Critical Findings Overview
- **42 endpoints (16%)** have NO authentication
- **3 CRITICAL vulnerabilities** requiring immediate fixes
- **5 HIGH severity** security issues
- **12 MEDIUM severity** issues
- **39 database tables** lack API coverage (potential orphaned features)

### Risk Level: **HIGH**
The combination of unauthenticated video token generation, file upload capabilities, and debug endpoints creates significant attack surface.

---

## 1. Authentication Analysis

### 1.1 Authentication Types in Use

| Auth Type | Endpoints | Percentage | Description |
|-----------|-----------|------------|-------------|
| None | 42 | 16% | No authentication required |
| Supabase Auth | 78 | 30% | Standard Supabase authentication (customers) |
| Supabase Admin | 89 | 35% | Supabase + admin role check |
| Mechanic Token | 34 | 13% | Custom token in `aad_mech` cookie |
| Workshop Auth | 8 | 3% | Supabase + organization membership |
| Cron Secret | 3 | 1% | Bearer token via `CRON_SECRET` |
| Stripe Webhook | 1 | <1% | Stripe signature verification |
| Mixed/Other | 1 | <1% | Multiple auth methods |

### 1.2 Unauthenticated Endpoints (42 Total)

#### Critical - Require Immediate Authentication
1. **`/api/livekit/token` (GET, POST)** - CRITICAL
   - Generates video conference tokens
   - Accepts arbitrary room and identity values
   - No session validation
   - **Impact:** Anyone can join any video session

2. **`/api/uploads/sign` (POST)** - CRITICAL
   - Generates signed upload URLs
   - No file type or size validation
   - No rate limiting
   - **Impact:** Storage exhaustion, malicious file uploads

3. **`/api/debug/cleanup-sessions` (GET, POST)** - CRITICAL
   - Triggers session cleanup operations
   - Can modify database state
   - **Impact:** Service disruption, data manipulation

4. **`/api/debug/*` (Various)** - CRITICAL
   - Multiple debug endpoints exposed
   - Include: `check-session`, `check-request`, `cleanup-*`, `force-cancel-session`, etc.
   - **Impact:** Data exposure, service manipulation

#### High - Should Have Authentication
5. **`/api/session/start` (GET)** - HIGH
   - Only validates Stripe payment, not session ownership
   - **Impact:** Session hijacking via Stripe session ID guessing

6. **`/api/contact` (POST)** - HIGH
   - No rate limiting or CAPTCHA
   - **Impact:** Spam attacks, email bombing

#### Medium - Should Be Protected
7. **`/api/health` (GET)** - INFO ONLY
   - Health check endpoint (acceptable to be public)

8. **`/api/vin/decode` (POST)** - MEDIUM
   - VIN decoder (if exists, should have rate limiting)

9. **Test endpoints:** `/api/test/*` - MEDIUM
   - Should not be in production or require auth

### 1.3 Authentication Implementation Quality

#### Mechanic Authentication (Custom)
```typescript
// Good: Proper implementation
- Uses scrypt for password hashing
- HttpOnly, SameSite cookies
- Token refresh mechanism (2hr access, 30 day refresh)
- Validates token expiration
```

**Issues:**
- No rate limiting on login attempts
- No account lockout mechanism
- No MFA support

#### Admin Authentication (Supabase)
```typescript
// Good: Uses requireAdmin middleware
- Validates Supabase session
- Checks profile.role === 'admin'
- Logs admin actions
```

**Issues:**
- Some admin endpoints may bypass middleware
- No audit trail for sensitive operations
- No MFA requirement for admins

#### Workshop Authentication (Supabase + Org)
```typescript
// Good: Multi-layer validation
- Supabase auth
- Organization membership check
- Organization type validation (workshop vs corporate)
- Role validation (owner, admin)
```

**Issues:**
- No rate limiting
- No session timeout enforcement

---

## 2. Critical Security Issues

### 2.1 CRITICAL: Unauthenticated Video Token Generation

**Endpoint:** `/api/livekit/token` (GET, POST)

**Vulnerability:**
```typescript
// Current implementation - NO AUTHENTICATION
export async function POST(req: NextRequest) {
  const payload: TokenRequestPayload = await req.json().catch(() => ({}))
  return buildTokenResponse(payload.room ?? null, payload.identity ?? null, payload.metadata ?? null)
}
```

**Attack Scenario:**
1. Attacker discovers a session room name (e.g., `aad-stripe_session_123`)
2. Calls `/api/livekit/token?room=aad-stripe_session_123&identity=fake-mechanic`
3. Receives valid LiveKit token with full permissions
4. Joins video session, can:
   - Spy on customer/mechanic conversations
   - Impersonate mechanic
   - Record sensitive information
   - Publish malicious video/audio streams

**Impact:**
- Privacy breach (GDPR violation)
- Medical/automotive advice misattribution
- Customer trust destruction
- Legal liability

**Remediation:**
```typescript
// Required fix
export async function POST(req: NextRequest) {
  // 1. Validate user authentication (Supabase or mechanic token)
  const user = await validateAuth(req)
  if (!user) return unauthorized()

  // 2. Validate session ownership/participation
  const session = await validateSessionAccess(payload.room, user.id)
  if (!session) return forbidden()

  // 3. Generate token with restricted permissions
  const token = generateToken({
    room: session.room,
    identity: user.id,
    permissions: session.role === 'mechanic'
      ? { canPublish: true, canSubscribe: true }
      : { canPublish: false, canSubscribe: true }
  })

  return NextResponse.json({ token })
}
```

**Priority:** P0 - Fix immediately

---

### 2.2 CRITICAL: Unauthenticated File Upload

**Endpoint:** `/api/uploads/sign` (POST)

**Vulnerability:**
```typescript
// Current implementation - NO AUTHENTICATION, NO VALIDATION
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured on server', 500);
  const { filename, contentType } = await req.json().catch(() => ({}));
  if (!filename) return bad('filename required');

  // Generates signed URL with no checks
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
}
```

**Attack Scenarios:**
1. **Storage Exhaustion:**
   - Attacker requests 1000s of upload URLs
   - Uploads large files to fill storage
   - Platform hits Supabase storage limits
   - Service degrades or becomes unavailable

2. **Malicious Content:**
   - Attacker uploads malware disguised as images
   - Uploads illegal content
   - Platform becomes hosting ground for abuse

3. **Phishing:**
   - Attacker uploads fake documents
   - Uses platform URLs (trusted domain) for phishing
   - Platform reputation damage

**Impact:**
- Service downtime ($$$)
- Legal liability
- Storage costs spike
- Platform abuse

**Remediation:**
```typescript
export async function POST(req: NextRequest) {
  // 1. Require authentication
  const user = await validateAuth(req)
  if (!user) return unauthorized()

  // 2. Rate limiting
  const rateLimitOk = await checkRateLimit(user.id, 'file-upload', 10, 60)
  if (!rateLimitOk) return tooManyRequests()

  // 3. Validate file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(contentType)) {
    return bad('Invalid file type')
  }

  // 4. Enforce size limits
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (fileSize > maxSize) return bad('File too large')

  // 5. Associate with user
  const path = `users/${user.id}/${Date.now()}-${sanitize(filename)}`

  // 6. Log upload request
  await logUpload(user.id, filename, contentType)

  return generateSignedUrl(path, contentType)
}
```

**Priority:** P0 - Fix immediately

---

### 2.3 CRITICAL: Debug Endpoints in Production

**Endpoints:** All `/api/debug/*` routes (18 total)

**Examples:**
- `/api/debug/cleanup-sessions` - Deletes session data
- `/api/debug/force-cancel-session` - Force cancels sessions
- `/api/debug/session-health` - Exposes internal state
- `/api/debug/cleanup-user-data` - Deletes user data
- `/api/debug/mechanic-requests` - Exposes mechanic data
- `/api/debug/check-schema` - Database schema exposure

**Vulnerability:**
All debug endpoints have **ZERO authentication**.

**Attack Scenarios:**
1. **Service Disruption:**
   ```bash
   # Attacker repeatedly calls cleanup
   while true; do
     curl -X POST https://app.com/api/debug/cleanup-sessions
   done
   # Result: Database thrashing, performance degradation
   ```

2. **Data Exposure:**
   ```bash
   curl https://app.com/api/debug/session-health
   # Returns: Internal session states, user IDs, mechanic IDs
   ```

3. **Data Deletion:**
   ```bash
   curl -X POST https://app.com/api/debug/cleanup-user-data \
     -H 'Content-Type: application/json' \
     -d '{"userId": "target-user-id"}'
   # Result: User data deleted
   ```

**Impact:**
- Service outages
- Data loss
- Privacy violations
- Regulatory non-compliance

**Remediation:**

**Option 1: Remove from production**
```typescript
// In each debug route
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Not available' }, { status: 404 })
}
```

**Option 2: Require admin authentication**
```typescript
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.authorized) return auth.response!

  // Rest of debug logic
}
```

**Priority:** P0 - Fix immediately

---

## 3. High Severity Issues

### 3.1 Session Start Without Ownership Validation

**Endpoint:** `/api/session/start` (GET)

**Vulnerability:**
```typescript
// Only validates Stripe payment, not session ownership
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')

  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    return NextResponse.json({ error: 'Session not paid yet' }, { status: 402 })
  }

  // ❌ Never checks if the requesting user paid for this session
  const room = `aad-${sessionId}`
  const identity = `cust-${sessionId}-${Date.now()}`
  // Generates token...
}
```

**Attack:** Session hijacking
1. User A purchases session → Gets Stripe session `sess_123`
2. User B discovers/guesses `sess_123`
3. User B calls `/api/session/start?session_id=sess_123`
4. User B gets LiveKit token and joins User A's session for free

**Fix:**
```typescript
export async function GET(req: NextRequest) {
  // 1. Require authentication
  const user = await getAuthenticatedUser(req)
  if (!user) return unauthorized()

  // 2. Validate session ownership
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (session.customer_email !== user.email) {
    return forbidden('Not your session')
  }

  // 3. Check if session already used
  const dbSession = await getSessionByStripeId(sessionId)
  if (dbSession && dbSession.started_at) {
    return conflict('Session already started')
  }

  // Then generate token
}
```

**Priority:** P1 - Fix within 1 week

---

### 3.2 No Rate Limiting on Authentication Endpoints

**Endpoints:**
- `/api/admin/login` (POST)
- `/api/mechanics/login` (POST)
- `/api/workshop/login` (POST)

**Vulnerability:** Brute force attacks

**Attack:**
```bash
# Automated password guessing
for password in $(cat common-passwords.txt); do
  curl -X POST https://app.com/api/mechanics/login \
    -d "email=target@email.com&password=$password"
done
```

**Impact:**
- Account compromise
- Service disruption (DOS)
- Database load

**Fix:** Implement rate limiting
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
  analytics: true,
})

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  const { success } = await ratelimit.limit(`login:${email}`)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again later.' },
      { status: 429 }
    )
  }

  // Proceed with login
}
```

**Priority:** P1 - Fix within 1 week

---

### 3.3 Contact Form Spam Vulnerability

**Endpoint:** `/api/contact` (POST)

**Vulnerability:** No rate limiting, no CAPTCHA

**Attack Scenarios:**
1. **Email Bombing:**
   ```bash
   for i in {1..1000}; do
     curl -X POST https://app.com/api/contact \
       -F "name=Spammer" \
       -F "email=spam@test.com" \
       -F "subject=Test $i" \
       -F "message=This is spam message number $i" &
   done
   ```
   - Support inbox flooded
   - Email reputation damaged
   - Resend API costs spike

2. **Storage Exhaustion:**
   - Upload max size files (10MB) repeatedly
   - Fill `contact_requests` table
   - Fill `contact-uploads` storage bucket

**Impact:**
- Support team overwhelmed
- Legitimate requests missed
- Email deliverability issues
- Costs increase

**Fix:**
```typescript
export async function POST(req: NextRequest) {
  // 1. Rate limiting by IP
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const ipLimit = await checkRateLimit(ip, 'contact-form', 3, 3600) // 3/hour
  if (!ipLimit) return tooManyRequests()

  // 2. CAPTCHA verification
  const { 'cf-turnstile-response': token } = await req.json()
  const captchaValid = await verifyCaptcha(token)
  if (!captchaValid) return bad('CAPTCHA failed')

  // 3. Content filtering
  const spamScore = await checkSpamContent(message)
  if (spamScore > 0.8) {
    await flagAsSpam({ name, email, message })
    return NextResponse.json({ message: 'Thank you' }) // Don't reveal
  }

  // Proceed with submission
}
```

**Priority:** P1 - Fix within 2 weeks

---

### 3.4 SQL Injection Risk in Admin Query Tool

**Endpoint:** `/api/admin/database/query` (POST)

**Vulnerability:** Relies on RPC function for SQL execution

```typescript
// Keyword blocking can be bypassed
const ALLOWED_COMMANDS = ['SELECT', 'SHOW', 'DESCRIBE', 'EXPLAIN', 'WITH']
const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', ...]

// ❌ Bypassable with SQL tricks:
// - "SeLeCt" (case variations)
// - "SEL/**/ECT" (comment injection)
// - Subqueries with dangerous operations
```

**Attack:**
```sql
-- Bypass keyword filter
SELECT * FROM (
  UPDATE users SET role='admin' WHERE email='attacker@test.com' RETURNING *
) AS data;

-- Or with comments
SEL/**/ECT * FROM users; DR/**/OP TABLE sessions;
```

**Impact:**
- Data exfiltration
- Potential data manipulation if RPC misconfigured
- Schema exposure

**Fix:**
1. **Use Supabase's built-in query builder** instead of raw SQL
2. **Limit RPC permissions** to read-only operations
3. **Add query result limits** (max 1000 rows)
4. **Log ALL queries** with admin user ID
5. **Add query timeout** (max 10 seconds)

```typescript
// Better implementation
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.authorized) return auth.response!

  const { table, columns, filters, limit } = await req.json()

  // Use query builder, not raw SQL
  let query = supabaseAdmin
    .from(table)
    .select(columns || '*')
    .limit(Math.min(limit || 100, 1000))

  // Apply filters safely
  if (filters) {
    filters.forEach(f => {
      query = query.eq(f.column, f.value)
    })
  }

  const { data, error } = await query

  // Log query
  await logAdminQuery(auth.user!.id, table, columns, filters)

  return NextResponse.json({ data })
}
```

**Priority:** P1 - Fix within 2 weeks

---

### 3.5 No Input Validation (Zod) on Most Endpoints

**Statistics:**
- Only 30 endpoints (12%) use Zod validation
- 98 endpoints (38%) use manual validation
- 128 endpoints (50%) have NO validation

**Examples of Missing Validation:**

1. **Mechanic availability:**
```typescript
// ❌ No validation
export async function PUT(req: NextRequest) {
  const { availability } = await req.json()
  // Directly inserts without checking:
  // - Time range validity (start < end)
  // - Day of week bounds (0-6)
  // - Time format (HH:MM)
  // - Overlapping blocks
}
```

2. **Session extension:**
```typescript
// ❌ No validation on minutes
const extensionMinutes = parseInt(metadata?.extension_minutes || '0', 10)
// What if extension_minutes is '-1000' or '9999999'?
```

**Impact:**
- Data corruption
- Application crashes
- Business logic errors
- Inconsistent state

**Fix:** Implement Zod schemas
```typescript
import { z } from 'zod'

const AvailabilitySchema = z.object({
  availability: z.array(z.object({
    weekday: z.number().min(0).max(6),
    start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    is_active: z.boolean().default(true),
  })).refine(blocks => {
    // Check for overlaps
    return !hasOverlappingBlocks(blocks)
  }, { message: 'Availability blocks cannot overlap' })
})

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const result = AvailabilitySchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.issues },
      { status: 400 }
    )
  }

  const { availability } = result.data
  // Now safe to use
}
```

**Priority:** P2 - Implement over 1 month

---

## 4. Missing API Endpoints (Database Coverage Gaps)

### 4.1 Tables with NO API Coverage (39 tables)

These tables exist in the database but have no corresponding API endpoints:

#### Workshop/Partnership Features
1. `workshop_events` - No way to query workshop activity events
2. `workshop_metrics` - Dashboard metrics not exposed
3. `workshop_alerts` - No alerts API
4. `workshop_partnership_programs` - Programs exist but no CRUD API
5. `partnership_applications` - Applications tracked but no endpoints
6. `partnership_agreements` - Agreements stored but not accessible
7. `bay_bookings` - Booking system with no API
8. `partnership_revenue_splits` - Revenue data not accessible
9. `workshop_escalation_queue` - Escalation feature incomplete
10. `workshop_escalation_preferences` - Preferences not manageable
11. `workshop_earnings` - Earnings data exists but no retrieval endpoint

#### Mechanic Features
12. `mechanic_earnings` - Earnings tracked but not queryable
13. `mechanic_earnings_breakdown` - Detailed breakdown inaccessible
14. `mechanic_clients` - Client management feature missing
15. `mechanic_documents` - Document upload/management incomplete
16. `mechanic_admin_actions` - Actions logged but not reviewable
17. `mechanic_time_off` - Time off system partial
18. `mechanic_escalation_stats` - Stats tracked but not exposed
19. `mechanic_shift_logs` - Shift tracking incomplete
20. `mechanic_profile_requirements` - Requirements defined but not enforced via API

#### Diagnostic/Repair Features
21. `diagnostic_sessions` - Diagnostic feature not implemented
22. `in_person_visits` - Visit tracking exists but no API
23. `repair_quotes` - Quote system built but no endpoints
24. `quote_modifications` - Modification tracking incomplete
25. `repair_payments` - Payment tracking separate from main payments table
26. `platform_chat_messages` - Chat feature incomplete

#### Corporate Features
27. `corporate_businesses` - Corporate accounts exist but no API
28. `corporate_employees` - Employee management missing
29. `corporate_invoices` - Invoice generation/retrieval missing
30. `corporate_vehicles` - Fleet management incomplete

#### Other Features
31. `customer_favorites` - Favorites feature not implemented
32. `session_recordings` - Recording feature exists but no retrieval
33. `waiver_signatures` - Waiver system incomplete
34. `supported_countries` - Country data not accessible via API
35. `major_cities` - City data not exposed
36. `brand_specializations` - Brand matching not implemented
37. `service_keywords` - Keyword matching incomplete
38. `pricing_tiers` - Tier system defined but not used
39. `feature_flags` - Feature flag system not implemented

### 4.2 Orphaned Features Impact

**Risk:** Database schema suggests features were planned but never completed

**Concerns:**
1. **Incomplete Features:**
   - Users may expect these features based on UI/documentation
   - Data is being collected but not accessible
   - Migrations run but functionality missing

2. **Technical Debt:**
   - Tables consume storage but provide no value
   - Maintenance overhead (backups, migrations)
   - Confusion for developers

3. **Business Impact:**
   - Revenue features incomplete (repair quotes, corporate invoices)
   - Partnership program not fully functional
   - Mechanic earnings not transparent

**Recommendation:**
- Audit each table to determine if feature is:
  - **Active but API missing** → Implement API (Priority)
  - **Deprecated** → Remove table and migrations
  - **Planned** → Document roadmap or remove

**Priority:** P3 - Address over 3 months

---

## 5. Input Validation Gaps

### 5.1 Validation Pattern Distribution

| Pattern | Count | Percentage |
|---------|-------|------------|
| None | 128 | 50% |
| Manual | 98 | 38% |
| Zod | 30 | 12% |

### 5.2 Critical Validation Gaps

1. **File Uploads:**
   - No mime type validation on `/api/uploads/sign`
   - No size limits enforced
   - No malware scanning

2. **Mechanic Availability:**
   - Time ranges not validated
   - Overlapping blocks allowed
   - Invalid day of week accepted

3. **Session Extension:**
   - Negative duration allowed
   - No maximum extension limit
   - No payment validation before extension

4. **Workshop Configuration:**
   - Coverage postal codes not validated
   - Service radius can be negative
   - Mechanic capacity not enforced

5. **Payment Metadata:**
   - Stripe metadata accepts arbitrary keys
   - No schema validation on session metadata
   - JSON fields not validated

### 5.3 Recommended Zod Schemas

Create centralized validation:

```typescript
// src/lib/validation/schemas.ts
import { z } from 'zod'

export const MechanicAvailabilitySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
}).refine(data => data.start_time < data.end_time, {
  message: 'Start time must be before end time'
})

export const SessionExtensionSchema = z.object({
  sessionId: z.string().uuid(),
  minutes: z.number().int().min(5).max(60), // 5-60 minute extensions only
  paymentIntentId: z.string().startsWith('pi_'),
})

export const FileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum([
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
  ]),
  size: z.number().max(10 * 1024 * 1024), // 10MB max
})

export const WorkshopConfigSchema = z.object({
  service_radius_km: z.number().min(1).max(100),
  mechanic_capacity: z.number().int().min(1).max(50),
  coverage_postal_codes: z.array(z.string().regex(/^[A-Z]\d[A-Z] \d[A-Z]\d$/)).optional(),
})
```

**Priority:** P2 - Implement over 1 month

---

## 6. Error Handling Issues

### 6.1 Inconsistent Error Responses

**Problem:** Different endpoints return errors in different formats

```typescript
// Format 1: Some endpoints
{ error: 'string' }

// Format 2: Other endpoints
{ success: false, error: 'string' }

// Format 3: Validation errors
{ error: 'string', fieldErrors: { field: 'error' } }

// Format 4: Admin endpoints
{ message: 'string' }
```

**Impact:**
- Frontend error handling becomes complex
- User experience inconsistent
- Debugging difficult

**Fix:** Standardize error format
```typescript
// src/lib/api/errors.ts
type ApiError = {
  success: false
  error: {
    code: string // 'UNAUTHENTICATED', 'VALIDATION_FAILED', etc.
    message: string
    details?: Record<string, unknown>
    timestamp: string
    requestId: string
  }
}

type ApiSuccess<T> = {
  success: true
  data: T
  meta?: {
    page?: number
    total?: number
  }
}

export function apiError(code: string, message: string, details?: unknown): NextResponse {
  return NextResponse.json({
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    }
  }, { status: getStatusForCode(code) })
}

export function apiSuccess<T>(data: T, meta?: unknown): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    meta,
  })
}
```

### 6.2 Missing Error Logging

**Problem:** Many endpoints don't log errors to monitoring system

**Fix:** Centralized error logging
```typescript
import * as Sentry from '@sentry/nextjs'

export async function POST(req: NextRequest) {
  try {
    // Route logic
  } catch (error) {
    // Log to monitoring
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/example',
        method: 'POST',
      },
      user: { id: user?.id },
    })

    // Log to database
    await logError({
      endpoint: '/api/example',
      error: error.message,
      stack: error.stack,
      userId: user?.id,
    })

    return apiError('INTERNAL_ERROR', 'Something went wrong')
  }
}
```

**Priority:** P2 - Implement over 1 month

---

## 7. Recommendations (Prioritized)

### Priority 0 (Immediate - This Week)

1. **Secure LiveKit Token Generation**
   - Add authentication to `/api/livekit/token`
   - Validate session ownership
   - Restrict permissions based on role
   - **Impact:** Prevents unauthorized video access
   - **Effort:** 4 hours

2. **Secure File Upload Endpoint**
   - Add authentication to `/api/uploads/sign`
   - Implement rate limiting
   - Validate file types and sizes
   - **Impact:** Prevents storage abuse
   - **Effort:** 6 hours

3. **Remove or Secure Debug Endpoints**
   - Add `requireAdmin` to all `/api/debug/*` routes
   - Or disable in production with env check
   - **Impact:** Prevents service disruption
   - **Effort:** 2 hours

### Priority 1 (High - Next 2 Weeks)

4. **Add Session Ownership Validation**
   - Fix `/api/session/start` to validate user
   - Prevent session hijacking
   - **Impact:** Prevents unauthorized session access
   - **Effort:** 4 hours

5. **Implement Rate Limiting**
   - Add to all auth endpoints
   - Add to contact form
   - Add to file uploads
   - **Impact:** Prevents brute force and spam
   - **Effort:** 8 hours
   - **Dependency:** Setup Upstash Redis

6. **Add CAPTCHA to Contact Form**
   - Implement Cloudflare Turnstile
   - Add spam detection
   - **Impact:** Reduces spam by 99%
   - **Effort:** 3 hours

7. **Harden Admin Query Tool**
   - Replace raw SQL with query builder
   - Add result limits
   - Add query timeout
   - **Impact:** Reduces SQL injection risk
   - **Effort:** 6 hours

### Priority 2 (Medium - Next Month)

8. **Implement Zod Validation**
   - Create schema library
   - Apply to top 50 endpoints
   - **Impact:** Prevents data corruption
   - **Effort:** 20 hours

9. **Standardize Error Handling**
   - Create error utility functions
   - Migrate all endpoints to standard format
   - Add Sentry integration
   - **Impact:** Better debugging and UX
   - **Effort:** 16 hours

10. **Add MFA for Admins**
    - Require 2FA for admin accounts
    - Use Supabase MFA feature
    - **Impact:** Prevents admin account compromise
    - **Effort:** 8 hours

### Priority 3 (Low - Next Quarter)

11. **Audit Orphaned Database Tables**
    - Review 39 tables with no API
    - Implement missing features or deprecate
    - **Impact:** Reduces tech debt
    - **Effort:** 40 hours

12. **Implement Comprehensive Logging**
    - Add structured logging to all endpoints
    - Create logging dashboard
    - **Impact:** Better observability
    - **Effort:** 24 hours

13. **Security Penetration Test**
    - Hire third-party security firm
    - Test authentication, authorization, data access
    - **Impact:** Uncover unknown vulnerabilities
    - **Effort:** External vendor

---

## 8. Security Checklist for New Endpoints

When creating new API endpoints, ensure:

### Authentication
- [ ] Endpoint requires authentication (unless explicitly public)
- [ ] Authentication method is appropriate for user type
- [ ] Token/session validation is implemented
- [ ] User permissions are checked (authorization)

### Input Validation
- [ ] Zod schema defined for request body
- [ ] Query parameters validated
- [ ] Path parameters validated
- [ ] File uploads validated (type, size, content)

### Rate Limiting
- [ ] Rate limits defined based on endpoint sensitivity
- [ ] Rate limiting implemented (per user or per IP)
- [ ] Rate limit headers returned to client

### Error Handling
- [ ] Try-catch block wraps all logic
- [ ] Errors logged to monitoring system
- [ ] Standardized error format returned
- [ ] Sensitive information not exposed in errors

### Data Access
- [ ] Database queries use RLS policies where applicable
- [ ] User can only access their own data
- [ ] Admin endpoints use `requireAdmin` middleware
- [ ] Query results are paginated (for list endpoints)

### Security Headers
- [ ] CORS configured correctly
- [ ] CSP headers set
- [ ] Rate limit headers included

### Testing
- [ ] Unit tests for validation logic
- [ ] Integration tests for happy path
- [ ] Security tests for unauthorized access
- [ ] Load tests for performance

---

## 9. Compliance Considerations

### GDPR (General Data Protection Regulation)

**Current Issues:**
1. **Right to Access:**
   - No single endpoint to export all user data
   - Scattered across multiple tables

2. **Right to Deletion:**
   - Some `/api/debug/cleanup-user-data` endpoint exists but unauthenticated
   - No comprehensive deletion process

3. **Data Breach Notification:**
   - Video token vulnerability constitutes a breach
   - Must notify users within 72 hours of fix

**Recommendations:**
- Implement `/api/customer/data-export` endpoint
- Implement `/api/customer/delete-account` endpoint (authenticated)
- Create data retention policies
- Document all data processing activities

### PCI DSS (Payment Card Industry)

**Status:** Compliant
- Stripe handles all payment data
- No card data stored on servers
- Webhook signature validation implemented

**Maintain compliance:**
- Never log payment details
- Continue using Stripe's secure endpoints
- Validate webhook signatures

### HIPAA Considerations

**Concern:** If medical information shared in video sessions

**Current Issues:**
- Video sessions not encrypted end-to-end (LiveKit default)
- No session recording consent tracking
- No BAA with LiveKit

**Recommendations:**
- If medical data processed, get BAA from LiveKit
- Implement consent tracking for recordings
- Add session recording disclosure

---

## 10. Monitoring and Alerting

### Recommended Alerts

1. **Security Alerts:**
   - Failed login attempts > 10 in 5 minutes
   - Admin endpoint access outside business hours
   - Debug endpoint accessed (should never happen in prod)
   - File upload rate > 100/hour per user
   - Database query execution time > 10 seconds

2. **Performance Alerts:**
   - API response time > 3 seconds (p95)
   - Error rate > 5%
   - Database connection pool exhausted

3. **Business Alerts:**
   - Session creation failure rate > 10%
   - Payment webhook processing failure
   - Stripe disputes created

### Implementation:

```typescript
// src/lib/monitoring/alerts.ts
import * as Sentry from '@sentry/nextjs'

export async function alertSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, unknown>
) {
  // Log to Sentry
  Sentry.captureMessage(`Security Event: ${event}`, {
    level: severity === 'critical' ? 'fatal' : severity,
    tags: { type: 'security' },
    extra: details,
  })

  // Log to database
  await supabaseAdmin.from('security_events').insert({
    event,
    severity,
    details,
    created_at: new Date().toISOString(),
  })

  // Send Slack alert for high/critical
  if (severity === 'high' || severity === 'critical') {
    await sendSlackAlert({
      channel: '#security-alerts',
      message: `🚨 ${severity.toUpperCase()}: ${event}`,
      details,
    })
  }
}
```

---

## 11. Conclusion

The AskAutoDoctor platform has **significant security vulnerabilities** that require immediate attention. The combination of unauthenticated video token generation, file uploads, and debug endpoints creates a high-risk attack surface.

### Immediate Action Required:
1. **Secure `/api/livekit/token`** (4 hours)
2. **Secure `/api/uploads/sign`** (6 hours)
3. **Secure `/api/debug/*` endpoints** (2 hours)

**Total P0 Effort:** ~12 hours (1.5 days)

### Next Steps:
1. Review this audit with engineering team
2. Create GitHub issues for each priority 0 item
3. Assign owners and deadlines
4. Schedule penetration test after P0 fixes deployed
5. Implement ongoing security review process for new endpoints

### Long-term Security Posture:
- Implement security checklist for all new endpoints
- Add automated security scanning to CI/CD
- Schedule quarterly security audits
- Train team on secure coding practices

---

**Audit Completed By:** Claude (Anthropic AI)
**Date:** 2025-10-28
**Next Review:** After P0 fixes deployed
