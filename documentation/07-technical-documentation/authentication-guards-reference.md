# Authentication Guards Reference Guide
**Last Updated:** October 29, 2025
**Version:** 1.0
**Location:** `src/lib/auth/guards.ts`, `src/lib/auth/sessionGuards.ts`

---

## Overview

Authentication guards are centralized functions that enforce role-based access control across all API routes in The Auto Doctor platform. They provide a consistent, type-safe way to authenticate and authorize users.

### Benefits
- ✅ **Single Source of Truth** - Centralized authentication logic
- ✅ **Type Safety** - TypeScript interfaces for authenticated users
- ✅ **Consistent Errors** - Standardized 401/403 responses
- ✅ **Code Reduction** - Eliminated 2,100+ lines of duplicate auth code
- ✅ **Easy to Test** - Guards are pure functions
- ✅ **Audit Logging** - Built-in logging for security events

---

## Core Guards

### 1. requireMechanicAPI

**Purpose:** Authenticates and authorizes mechanic API requests

**Location:** `src/lib/auth/guards.ts:226-303`

**Signature:**
```typescript
export async function requireMechanicAPI(
  req: NextRequest
): Promise<
  | { data: AuthenticatedMechanic; error: null }
  | { data: null; error: NextResponse }
>
```

**Returns:**
```typescript
interface AuthenticatedMechanic {
  id: string                    // Mechanic ID from mechanics table
  name: string | null           // Mechanic name
  email: string                 // Mechanic email
  stripeAccountId: string | null // Stripe Connect account ID
  stripePayoutsEnabled: boolean // Whether payouts are enabled
  serviceTier?: string | null   // Service tier (basic/premium/etc)
  userId?: string | null        // Link to auth.users.id
}
```

**How It Works:**
1. Extracts Supabase auth cookie from request
2. Validates user session via Supabase Auth
3. Checks `profiles` table for `role = 'mechanic'`
4. Fetches mechanic profile from `mechanics` table using `user_id`
5. Returns mechanic data or 401/403 error

**Usage Example:**
```typescript
// File: src/app/api/mechanics/clients/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireMechanicAPI } from '@/lib/auth/guards'

export async function GET(req: NextRequest) {
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data
  console.log(`[MECHANIC] ${mechanic.email} accessing CRM`)

  // Business logic - mechanic is authenticated
  const clients = await db.query('SELECT * FROM clients WHERE mechanic_id = $1', [mechanic.id])

  return NextResponse.json({ clients })
}
```

**Error Responses:**
- **401 Unauthorized:** User not authenticated or session invalid
- **403 Forbidden:** User authenticated but not a mechanic
- **401 Unauthorized:** Mechanic profile not found

**Used By:** 32 mechanic routes

---

### 2. requireCustomerAPI

**Purpose:** Authenticates and authorizes customer API requests

**Location:** `src/lib/auth/guards.ts:319-368`

**Signature:**
```typescript
export async function requireCustomerAPI(
  req: NextRequest
): Promise<
  | { data: AuthenticatedCustomer; error: null }
  | { data: null; error: NextResponse }
>
```

**Returns:**
```typescript
interface AuthenticatedCustomer {
  id: string             // Customer user ID from auth.users
  email: string          // Customer email
  emailConfirmed: boolean // Whether email is verified
  role: string | null    // User role ('customer' or null)
}
```

**How It Works:**
1. Gets Supabase server client via `getSupabaseServer()`
2. Validates user session
3. Checks `profiles` table - rejects if role is admin/mechanic
4. Verifies email confirmation automatically
5. Returns customer data or 401/403 error

**Usage Example:**
```typescript
// File: src/app/api/customer/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'

export async function POST(req: NextRequest) {
  // ✅ SECURITY: Require customer authentication
  const authResult = await requireCustomerAPI(req)
  if (authResult.error) return authResult.error

  const customer = authResult.data

  // Email verification is already checked by guard
  if (!customer.emailConfirmed) {
    // This won't happen - guard already checks
  }

  console.log(`[CUSTOMER] ${customer.email} creating booking`)

  const body = await req.json()
  const booking = await createBooking(customer.id, body)

  return NextResponse.json({ booking })
}
```

**Error Responses:**
- **401 Unauthorized:** User not authenticated
- **403 Forbidden:** User is admin or mechanic (wrong role)
- **403 Forbidden:** Email not verified

**Used By:** 18 customer routes

---

### 3. requireAdminAPI

**Purpose:** Authenticates and authorizes admin API requests

**Location:** `src/lib/auth/guards.ts:375-423`

**Signature:**
```typescript
export async function requireAdminAPI(
  req: NextRequest
): Promise<
  | { data: AuthenticatedAdmin; error: null }
  | { data: null; error: NextResponse }
>
```

**Returns:**
```typescript
interface AuthenticatedAdmin {
  id: string       // Admin user ID
  email: string    // Admin email
  role: string     // User role ('admin')
}
```

**How It Works:**
1. Gets Supabase server client
2. Validates user session
3. Checks `profiles` table for `role = 'admin'`
4. Logs admin access for audit trail
5. Returns admin data or 401/403 error

**Usage Example:**
```typescript
// File: src/app/api/admin/users/[id]/ban/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // ✅ SECURITY: Require admin authentication
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error

  const admin = authResult.data
  console.log(`[ADMIN] ${admin.email} banning user ${params.id}`)

  // Critical admin operation - already verified admin role
  await banUser(params.id)

  // Log admin action for audit
  await logAdminAction({
    admin_id: admin.id,
    action: 'ban_user',
    target_user_id: params.id,
    timestamp: new Date()
  })

  return NextResponse.json({ success: true })
}
```

**Error Responses:**
- **401 Unauthorized:** User not authenticated
- **403 Forbidden:** User authenticated but not admin

**Used By:** 78 admin routes

---

### 4. requireWorkshopAPI

**Purpose:** Authenticates and authorizes workshop API requests

**Location:** `src/lib/auth/guards.ts:447-526`

**Signature:**
```typescript
export async function requireWorkshopAPI(
  req: NextRequest
): Promise<
  | { data: AuthenticatedWorkshop; error: null }
  | { data: null; error: NextResponse }
>
```

**Returns:**
```typescript
interface AuthenticatedWorkshop {
  userId: string              // Workshop user ID
  organizationId: string      // Workshop organization ID
  organizationName: string    // Workshop name
  role: string                // Workshop member role (owner/admin/member)
  email: string               // Workshop user email
}
```

**How It Works:**
1. Creates Supabase server client from request
2. Validates user session
3. Queries `organization_members` table for active membership
4. Validates organization type is 'workshop'
5. Returns workshop context or 401/403 error

**Usage Example:**
```typescript
// File: src/app/api/workshop/quotes/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAPI } from '@/lib/auth/guards'

export async function POST(req: NextRequest) {
  // ✅ SECURITY: Require workshop authentication
  const authResult = await requireWorkshopAPI(req)
  if (authResult.error) return authResult.error

  const workshop = authResult.data
  console.log(`[WORKSHOP] ${workshop.organizationName} (${workshop.email}) creating quote`)

  // Workshop is verified - use organization context
  const body = await req.json()
  const quote = await createQuote({
    workshop_id: workshop.organizationId,
    created_by: workshop.userId,
    ...body
  })

  return NextResponse.json({ quote })
}
```

**Error Responses:**
- **401 Unauthorized:** User not authenticated
- **403 Forbidden:** User not a workshop member
- **403 Forbidden:** Organization is not a workshop (wrong type)

**Used By:** 11 workshop routes

---

### 5. requireSessionParticipant

**Purpose:** Validates user is a participant in a specific session (customer or mechanic)

**Location:** `src/lib/auth/sessionGuards.ts:11-98`

**Signature:**
```typescript
export async function requireSessionParticipant(
  req: NextRequest,
  sessionId: string
): Promise<
  | { data: SessionParticipant; error: null }
  | { data: null; error: NextResponse }
>
```

**Returns:**
```typescript
interface SessionParticipant {
  userId: string        // Authenticated user ID
  sessionId: string     // Session ID
  role: 'customer' | 'mechanic'  // Participant role
  mechanicId?: string   // Mechanic ID (if role is 'mechanic')
}
```

**How It Works:**
1. Authenticates user via Supabase Auth
2. Fetches session data from `sessions` table
3. Checks if user is the customer (`session.customer_id === user.id`)
4. OR checks if user is the assigned mechanic (via `mechanics` table lookup)
5. Returns participant context or 401/403 error

**Usage Example:**
```typescript
// File: src/app/api/sessions/[id]/files/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireSessionParticipant } from '@/lib/auth/sessionGuards'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  // ✅ SECURITY: Validate session participant
  const authResult = await requireSessionParticipant(req, sessionId)
  if (authResult.error) return authResult.error

  const participant = authResult.data
  console.log(`[SESSION] ${participant.role} accessing files for session ${sessionId}`)

  // Participant is verified - fetch session files
  const files = await getSessionFiles(sessionId)

  // Can apply role-specific logic
  if (participant.role === 'mechanic') {
    // Mechanic can see all files
    return NextResponse.json({ files })
  } else {
    // Customer might have restricted view
    return NextResponse.json({ files: files.filter(f => !f.internal) })
  }
}
```

**Error Responses:**
- **401 Unauthorized:** User not authenticated
- **404 Not Found:** Session does not exist
- **403 Forbidden:** User is not a participant in this session

**Used By:** 10 session routes

---

## Guard Implementation Patterns

### Pattern 1: Simple GET Route
```typescript
export async function GET(req: NextRequest) {
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  // Fetch data for this mechanic
  const data = await fetchData(mechanic.id)

  return NextResponse.json({ data })
}
```

### Pattern 2: POST Route with Body
```typescript
export async function POST(req: NextRequest) {
  const authResult = await requireCustomerAPI(req)
  if (authResult.error) return authResult.error

  const customer = authResult.data

  // Parse request body
  const body = await req.json()

  // Validate & process
  const result = await processRequest(customer.id, body)

  return NextResponse.json({ result })
}
```

### Pattern 3: Route with Parameters
```typescript
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error

  const admin = authResult.data

  // Update resource
  const updated = await updateResource(params.id, await req.json())

  // Log admin action
  await logAdminAction(admin.id, 'update', params.id)

  return NextResponse.json({ updated })
}
```

### Pattern 4: Session-Specific Route
```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Validate participant FIRST
  const authResult = await requireSessionParticipant(req, params.id)
  if (authResult.error) return authResult.error

  const participant = authResult.data

  // Fetch session data - participant verified
  const session = await getSession(params.id)

  return NextResponse.json({ session })
}
```

### Pattern 5: Multiple Methods in One File
```typescript
export async function GET(req: NextRequest) {
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error
  // GET logic
}

export async function POST(req: NextRequest) {
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error
  // POST logic
}

export async function DELETE(req: NextRequest) {
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error
  // DELETE logic
}
```

---

## Error Handling

### Standard Error Format

All guards return consistent error responses:

**401 Unauthorized:**
```json
{
  "error": "Unauthorized - Not authenticated"
}
```

**403 Forbidden:**
```json
{
  "error": "Forbidden - <Specific reason>"
}
```

Examples:
- "Forbidden - Mechanic access required"
- "Forbidden - Admin access required"
- "Forbidden - You are not a participant in this session"
- "Forbidden - Workshop membership required"

### Handling Guard Errors

**Simple Pattern:**
```typescript
const authResult = await requireMechanicAPI(req)
if (authResult.error) return authResult.error
```

The error is already a properly formatted `NextResponse`, so you can return it directly.

**Pattern with Custom Error:**
```typescript
const authResult = await requireMechanicAPI(req)
if (authResult.error) {
  // Log the auth failure
  console.error('[Route] Auth failed')
  return authResult.error
}
```

**Pattern with Additional Validation:**
```typescript
const authResult = await requireMechanicAPI(req)
if (authResult.error) return authResult.error

const mechanic = authResult.data

// Additional business logic validation
if (!mechanic.stripePayoutsEnabled) {
  return NextResponse.json(
    { error: 'Stripe payouts must be enabled' },
    { status: 403 }
  )
}
```

---

## Server Component Guards

For server components (pages), use these guards:

### requireMechanic (Server Component)
```typescript
// File: src/app/mechanic/dashboard/page.tsx
import { requireMechanic } from '@/lib/auth/guards'

export default async function MechanicDashboard() {
  const mechanic = await requireMechanic()

  return (
    <div>
      <h1>Welcome, {mechanic.name}</h1>
    </div>
  )
}
```

**Note:** Server component guards throw redirects instead of returning error responses.

### requireCustomer (Server Component)
```typescript
export default async function CustomerDashboard() {
  const customer = await requireCustomer()

  return <DashboardView customer={customer} />
}
```

### requireAdmin (Server Component)
```typescript
export default async function AdminPanel() {
  const admin = await requireAdmin()

  return <AdminView admin={admin} />
}
```

---

## Migration Guide

### Migrating from Inline Auth

**Before (Inline Auth):**
```typescript
export async function GET(req: NextRequest) {
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Check if user is a mechanic
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'mechanic') {
    return NextResponse.json(
      { error: 'Forbidden - Mechanic access required' },
      { status: 403 }
    )
  }

  // Load mechanic profile
  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!mechanic) {
    return NextResponse.json(
      { error: 'Mechanic not found' },
      { status: 401 }
    )
  }

  const mechanicId = mechanic.id

  // Business logic
  const data = await fetchData(mechanicId)
  return NextResponse.json({ data })
}
```

**After (Guard):**
```typescript
import { requireMechanicAPI } from '@/lib/auth/guards'

export async function GET(req: NextRequest) {
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  // Business logic
  const data = await fetchData(mechanic.id)
  return NextResponse.json({ data })
}
```

**Code Reduction:** 45 lines → 7 lines (84% reduction)

---

## Testing Guards

### Unit Testing Example
```typescript
// File: __tests__/lib/auth/guards.test.ts
import { requireMechanicAPI } from '@/lib/auth/guards'
import { NextRequest } from 'next/server'

describe('requireMechanicAPI', () => {
  it('returns error when not authenticated', async () => {
    const req = new NextRequest('http://localhost/api/test')

    const result = await requireMechanicAPI(req)

    expect(result.error).toBeTruthy()
    expect(result.data).toBeNull()
  })

  it('returns mechanic data when authenticated', async () => {
    const req = createAuthenticatedRequest('mechanic-token')

    const result = await requireMechanicAPI(req)

    expect(result.error).toBeNull()
    expect(result.data).toHaveProperty('id')
    expect(result.data).toHaveProperty('email')
  })

  it('rejects non-mechanic users', async () => {
    const req = createAuthenticatedRequest('customer-token')

    const result = await requireMechanicAPI(req)

    expect(result.error).toBeTruthy()
    expect(result.data).toBeNull()
  })
})
```

### Integration Testing Example
```typescript
// File: __tests__/api/mechanics/clients.test.ts
describe('GET /api/mechanics/clients', () => {
  it('requires authentication', async () => {
    const response = await fetch('http://localhost:3000/api/mechanics/clients')

    expect(response.status).toBe(401)
  })

  it('returns clients for authenticated mechanic', async () => {
    const response = await fetch('http://localhost:3000/api/mechanics/clients', {
      headers: {
        Cookie: `${AUTH_COOKIE_NAME}=${mechanicToken}`
      }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('clients')
  })
})
```

---

## Best Practices

### DO ✅
- **Always use guards** at the start of route handlers
- **Return guard errors directly** - they're already formatted
- **Log authenticated actions** for audit trail
- **Use TypeScript interfaces** for type safety
- **Document auth requirements** in route comments

### DON'T ❌
- **Don't use inline auth checks** - use guards instead
- **Don't duplicate guard logic** - reuse existing guards
- **Don't skip error checks** - always handle `authResult.error`
- **Don't modify guard responses** - return them as-is
- **Don't create new guards** without reviewing existing ones

### Code Review Checklist
- [ ] Route uses appropriate guard (mechanic/customer/admin/workshop/session)
- [ ] Guard error is checked and returned
- [ ] No inline auth logic duplicated
- [ ] User data from guard (not fetched separately)
- [ ] Audit logging added for sensitive operations
- [ ] TypeScript types used correctly

---

## Performance Considerations

### Guard Caching
Guards make database queries - consider these optimizations:

**Route-level caching:**
```typescript
export async function GET(req: NextRequest) {
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  // Cache expensive operations
  const cacheKey = `mechanic:${mechanic.id}:data`
  const cached = await redis.get(cacheKey)

  if (cached) return NextResponse.json(cached)

  const data = await expensiveOperation(mechanic.id)
  await redis.set(cacheKey, data, { ex: 300 }) // 5 min cache

  return NextResponse.json(data)
}
```

### Database Connection Pooling
Guards use `supabaseAdmin` - ensure connection pooling is configured:

```typescript
// File: src/lib/supabaseAdmin.ts
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

---

## Troubleshooting

### Common Issues

#### Issue 1: "Mechanic not found" error
**Cause:** `user_id` not set in `mechanics` table
**Solution:** Run migration to link mechanic to Supabase Auth user
```bash
npx ts-node scripts/migrate-test-mechanics.ts
```

#### Issue 2: Guard returns 403 for valid user
**Cause:** Role not set in `profiles` table
**Solution:** Set role during user creation
```sql
UPDATE profiles SET role = 'mechanic' WHERE id = '<user_id>';
```

#### Issue 3: Session guard always fails
**Cause:** Session not assigned to mechanic
**Solution:** Verify session has `customer_id` or `mechanic_id`
```sql
SELECT id, customer_id, mechanic_id FROM sessions WHERE id = '<session_id>';
```

---

## Related Documentation

- [Authentication Migration Overview](../authentication/authentication-migration-project-overview.md)
- [Mechanic Auth Loop Resolution](../04-troubleshooting/mechanic-auth-loop-resolution.md)
- [API Security Audit](../04-security/api-security-audit-2025-10-29.md)
- [Database Cleanup Guide](../11-migration-deployment/database-cleanup-guide.md)

---

*Last Updated: October 29, 2025*
*Document Version: 1.0*
*Maintainer: Development Team*
