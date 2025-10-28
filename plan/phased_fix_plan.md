# AskAutoDoctor Platform: 3-Phase Implementation Roadmap

**Version:** 1.0
**Date:** 2025-10-28
**Total Estimated Effort:** 400-540 hours (10-13.5 weeks)
**Based On:** Backend API Audit, Database Schema Audit, Frontend Audit, Authentication System Audit

---

## Executive Summary

This document provides a **comprehensive, prioritized roadmap** to address critical vulnerabilities, improve code quality, and complete missing features across the AskAutoDoctor platform.

### Key Findings
- **117 pages** analyzed
- **256 API endpoints** (42 unauthenticated, 15+ security vulnerabilities)
- **30+ database tables** missing RLS policies
- **40+ missing indexes** causing performance issues
- **0% validation coverage** - no React Hook Form or Zod
- **15% feature completeness** - analytics, earnings, CRM incomplete
- **4 authentication systems** causing complexity

### Strategic Approach
1. **Phase 1 (Weeks 1-2):** Fix critical security vulnerabilities and broken functionality
2. **Phase 2 (Weeks 3-6):** Improve data integrity, validation, and code quality
3. **Phase 3 (Weeks 7-12):** Complete incomplete features and polish UX

---

## Phase 1: Critical Security & Stability (Weeks 1-2)

**Objective:** Eliminate critical security vulnerabilities and fix broken functionality that prevents normal operation.

**Success Criteria:**
- [ ] No unauthenticated access to sensitive endpoints
- [ ] All navigation links functional (no 404s)
- [ ] All tables protected by RLS
- [ ] Application doesn't crash on errors
- [ ] Basic toast notification system operational

**Estimated Effort:** 40-60 hours (1-2 weeks with 1-2 developers)

---

### P0: Critical Security Fixes (Week 1)

#### Task 1.1: Secure Unauthenticated API Endpoints ⚠️ CRITICAL
**Priority:** P0
**Effort:** 8 hours
**Risk:** High - active exploit risk

**Affected Endpoints:**
```typescript
// CRITICAL - Anyone can get video/chat tokens
/api/livekit/token (NO AUTH)
  → Fix: Add requireCustomerAPI() or requireMechanicAPI()
  → Database: livekit_rooms
  → Risk: Unauthorized session access

// CRITICAL - Anyone can upload files
/api/uploads/sign (NO AUTH)
  → Fix: Add requireCustomerAPI() or requireMechanicAPI()
  → Database: session_files
  → Risk: Storage abuse, malicious file uploads

// HIGH - Debug endpoints exposed
/api/debug/* (42 endpoints, NO AUTH)
  → Fix: Remove or protect with requireAdminAPI()
  → Database: sessions, session_requests, mechanics
  → Risk: Data exposure, system manipulation

// MEDIUM - Contact form abuse
/api/contact (NO AUTH, NO RATE LIMIT)
  → Fix: Add CAPTCHA + rate limiting
  → Database: contact_requests
  → Risk: Spam, DDoS

// HIGH - Health check exposes sensitive data
/api/health (NO AUTH)
  → Fix: Add requireAdminAPI() or sanitize response
  → Database: Multiple tables
  → Risk: Information disclosure
```

**Implementation Steps:**
1. Add auth guards to `/api/livekit/token/route.ts`:
```typescript
import { requireCustomerAPI } from '@/lib/auth/guards'

export async function POST(req: NextRequest) {
  const customer = await requireCustomerAPI(req)
  if (!customer.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... rest of implementation
}
```

2. Add auth guards to `/api/uploads/sign/route.ts` (same pattern)

3. Protect or remove debug endpoints:
```typescript
// Option 1: Protect with admin auth
import { requireAdminAPI } from '@/lib/auth/guards'
export async function POST(req: NextRequest) {
  const admin = await requireAdminAPI(req)
  if (!admin.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // ... debug logic
}

// Option 2: Remove in production
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Not available' }, { status: 404 })
}
```

4. Add CAPTCHA to contact form:
```typescript
// Install: npm install @hcaptcha/react-hcaptcha
// /api/contact/route.ts
const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY
const verifyResponse = await fetch('https://hcaptcha.com/siteverify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `secret=${hcaptchaSecret}&response=${captchaToken}`
})
if (!verifyResponse.ok) {
  return NextResponse.json({ error: 'Invalid CAPTCHA' }, { status: 400 })
}
```

**Files to Modify:**
- `src/app/api/livekit/token/route.ts`
- `src/app/api/uploads/sign/route.ts`
- `src/app/api/debug/*/route.ts` (42 files)
- `src/app/api/contact/route.ts`
- `src/app/api/health/route.ts`

**Testing:**
- [ ] Attempt to call `/api/livekit/token` without auth → Should return 401
- [ ] Attempt to call `/api/uploads/sign` without auth → Should return 401
- [ ] Attempt to call debug endpoints in production → Should return 404 or 403
- [ ] Submit contact form without CAPTCHA → Should fail
- [ ] Submit contact form 10 times in 1 minute → Should be rate limited

---

#### Task 1.2: Add Missing RLS Policies ⚠️ CRITICAL
**Priority:** P0
**Effort:** 12 hours
**Risk:** High - data exposure

**Affected Tables (30+ tables without proper RLS):**
```sql
-- CRITICAL - Session data exposed
session_files (NO RLS POLICIES)
mechanic_time_off (BROKEN AUTH CHECK)
service_plans (PUBLIC READ)
chat_messages (RECURSIVE POLICY - infinite loop risk)
organization_members (RECURSIVE POLICY)

-- HIGH - Financial data exposed
fee_applications (NO DELETE POLICY)
payments (PARTIAL RLS)
micro_sessions (NO POLICIES)

-- MEDIUM - Operational data
partnership_programs (NO POLICIES)
partnership_applications (NO POLICIES)
admin_logs (NO POLICIES)
error_logs (NO POLICIES)
```

**Implementation:**
Create migration file: `supabase/migrations/99990013_phase1_critical_rls_policies.sql`

```sql
-- Enable RLS on critical tables
ALTER TABLE session_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_applications ENABLE ROW LEVEL SECURITY;

-- Session files - only session participants can access
CREATE POLICY "Users can view their own session files"
  ON session_files FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM sessions
      WHERE customer_id = auth.uid()
         OR mechanic_id = (SELECT id FROM mechanics WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can view all session files"
  ON session_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Mechanic time off - only own records
DROP POLICY IF EXISTS "Mechanics can manage their own time off" ON mechanic_time_off;
CREATE POLICY "Mechanics can manage their own time off"
  ON mechanic_time_off FOR ALL
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics
      WHERE email = (SELECT email FROM mechanic_sessions WHERE token = current_setting('request.headers')::json->>'cookie')
    )
  );

-- Service plans - read-only for authenticated users
CREATE POLICY "Authenticated users can view active plans"
  ON service_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON service_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Fix recursive chat_messages policy
DROP POLICY IF EXISTS "Users can view messages in their sessions" ON chat_messages;
CREATE POLICY "Users can view messages in their sessions"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM sessions
      WHERE customer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM mechanic_sessions ms
      JOIN mechanics m ON ms.mechanic_id = m.id
      JOIN sessions s ON s.mechanic_id = m.id
      WHERE s.id = chat_messages.session_id
        AND ms.token = current_setting('request.headers')::json->>'cookie'
    )
  );

-- Micro sessions - mechanics only
CREATE POLICY "Mechanics can manage their own micro sessions"
  ON micro_sessions FOR ALL
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics
      WHERE email = (SELECT email FROM mechanic_sessions WHERE token = current_setting('request.headers')::json->>'cookie')
    )
  );

-- Partnership programs - public read, admin write
CREATE POLICY "Anyone can view active programs"
  ON partnership_programs FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage programs"
  ON partnership_programs FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Partnership applications - applicant + admin
CREATE POLICY "Mechanics can view their own applications"
  ON partnership_applications FOR SELECT
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics
      WHERE email = (SELECT email FROM mechanic_sessions WHERE token = current_setting('request.headers')::json->>'cookie')
    )
  );

CREATE POLICY "Admins can view all applications"
  ON partnership_applications FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

**Testing:**
- [ ] Customer cannot access other customers' session files
- [ ] Mechanic cannot access other mechanics' time-off records
- [ ] Unauthenticated users cannot read service plans
- [ ] Chat message policy doesn't cause infinite recursion
- [ ] Test with 100+ concurrent requests (no stack overflow)

---

#### Task 1.3: Fix Broken Navigation Links
**Priority:** P0
**Effort:** 4 hours
**Risk:** Low - UX issue

**Broken Links:**
```typescript
// Customer navbar - 404 error
/customer/messages → NO PAGE EXISTS
  → Fix: Create page OR remove link

// Admin shell - missing implementations
/admin/(shell)/feature-flags → NO BACKEND
/admin/(shell)/profile-completion → NO API
/admin/(shell)/analytics/overview → NO IMPLEMENTATION

// Workshop settings
/workshop/settings/revenue → MISSING UPDATE API
```

**Implementation:**
1. **Option A:** Create missing pages
```typescript
// src/app/customer/messages/page.tsx
'use client'
import { useAuthGuard } from '@/hooks/useAuthGuard'

export default function CustomerMessagesPage() {
  const { isLoading, user } = useAuthGuard({ requiredRole: 'customer' })

  if (isLoading) return <div>Loading...</div>
  if (!user) return null

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      <p className="text-slate-400">Coming soon - Direct messaging with your mechanic</p>
    </div>
  )
}
```

2. **Option B:** Remove broken links
```typescript
// src/components/customer/CustomerNavbar.tsx
// Remove or comment out:
<Link href="/customer/messages">Messages</Link>
```

**Recommended:** Option B (remove) for now, Option A (create) in Phase 3.

**Testing:**
- [ ] Click all customer navbar links → No 404 errors
- [ ] Click all admin shell links → No 404 errors
- [ ] Click all workshop links → No 404 errors

---

#### Task 1.4: Add Error Boundaries
**Priority:** P0
**Effort:** 6 hours
**Risk:** Medium - app crashes

**Current Issue:**
- No error boundaries in app
- Any React error crashes entire page
- No user-friendly error messages

**Implementation:**
```typescript
// src/components/ErrorBoundary.tsx
'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Optional: Send to error reporting service
    if (typeof window !== 'undefined') {
      fetch('/api/admin/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        }),
      }).catch(console.error)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
          <div className="max-w-md w-full bg-slate-800 border border-red-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            </div>
            <p className="text-slate-300 mb-4">
              We encountered an unexpected error. This has been logged and our team will investigate.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4">
                <summary className="text-sm text-slate-400 cursor-pointer">Error Details</summary>
                <pre className="mt-2 p-2 bg-slate-900 rounded text-xs text-red-400 overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors w-full justify-center font-semibold"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

**Wrap critical components:**
```typescript
// src/app/customer/layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function CustomerLayout({ children }) {
  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        {children}
      </div>
    </ErrorBoundary>
  )
}

// Repeat for mechanic, admin, workshop layouts
```

**Testing:**
- [ ] Throw error in customer dashboard → Shows error boundary
- [ ] Throw error in mechanic dashboard → Shows error boundary
- [ ] Error logged to `/api/admin/errors`
- [ ] Click "Reload Page" → Page reloads successfully

---

#### Task 1.5: Implement Toast Notification System
**Priority:** P0
**Effort:** 8 hours
**Risk:** Low - UX improvement

**Current Issue:**
- Using `alert()` for all notifications (poor UX)
- No success/error/warning feedback
- No persistent notification history

**Implementation:**
```typescript
// Install: npm install react-hot-toast
// src/app/providers.tsx
'use client'

import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  )
}

// src/lib/toast.ts
import toast from 'react-hot-toast'

export const showToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  loading: (message: string) => toast.loading(message),
  promise: async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((err: any) => string)
    }
  ) => toast.promise(promise, messages),
}
```

**Replace all `alert()` calls:**
```typescript
// Before:
alert('Session accepted!')

// After:
import { showToast } from '@/lib/toast'
showToast.success('Session accepted!')

// For async operations:
const acceptRequest = async (requestId: string) => {
  await showToast.promise(
    fetch('/api/mechanic/accept', {
      method: 'POST',
      body: JSON.stringify({ requestId }),
    }),
    {
      loading: 'Accepting request...',
      success: 'Request accepted! Redirecting...',
      error: 'Failed to accept request',
    }
  )
}
```

**Files to Update (estimated 50+ files):**
- All dashboard pages
- All form submission handlers
- All API error handlers

**Testing:**
- [ ] Submit contact form → See toast notification
- [ ] Accept session request → See loading + success toast
- [ ] API error → See error toast
- [ ] Toast auto-dismisses after 4 seconds
- [ ] Can manually dismiss toast

---

### P0: Database Performance (Week 1-2)

#### Task 1.6: Add Critical Missing Indexes
**Priority:** P0
**Effort:** 6 hours
**Risk:** Medium - performance degradation

**Missing Indexes (40+ total, adding 15 most critical):**

Create migration: `supabase/migrations/99990014_phase1_critical_indexes.sql`

```sql
-- Sessions table - most queried
CREATE INDEX IF NOT EXISTS idx_sessions_customer_id_created_at
  ON sessions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_mechanic_id_status
  ON sessions(mechanic_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_status_created_at
  ON sessions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_workshop_id
  ON sessions(workshop_id) WHERE workshop_id IS NOT NULL;

-- Session requests - real-time matching
CREATE INDEX IF NOT EXISTS idx_session_requests_status_created_at
  ON session_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_requests_mechanic_id
  ON session_requests(mechanic_id) WHERE mechanic_id IS NOT NULL;

-- Mechanics - availability queries
CREATE INDEX IF NOT EXISTS idx_mechanics_is_available
  ON mechanics(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_mechanics_workshop_id
  ON mechanics(workshop_id) WHERE workshop_id IS NOT NULL;

-- Repair quotes - customer queries
CREATE INDEX IF NOT EXISTS idx_repair_quotes_session_id
  ON repair_quotes(session_id);
CREATE INDEX IF NOT EXISTS idx_repair_quotes_customer_id_status
  ON repair_quotes(customer_id, status);

-- Chat messages - session queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id_created_at
  ON chat_messages(session_id, created_at ASC);

-- Session files - session queries
CREATE INDEX IF NOT EXISTS idx_session_files_session_id
  ON session_files(session_id);

-- Mechanic sessions - auth lookups
CREATE INDEX IF NOT EXISTS idx_mechanic_sessions_token
  ON mechanic_sessions(token) WHERE expires_at > now();
CREATE INDEX IF NOT EXISTS idx_mechanic_sessions_mechanic_id
  ON mechanic_sessions(mechanic_id);

-- Profiles - role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles(role);
```

**Performance Testing:**
```sql
-- Before indexes
EXPLAIN ANALYZE
SELECT * FROM sessions
WHERE customer_id = 'uuid'
ORDER BY created_at DESC
LIMIT 10;
-- Expected: Seq Scan (slow)

-- After indexes
EXPLAIN ANALYZE
SELECT * FROM sessions
WHERE customer_id = 'uuid'
ORDER BY created_at DESC
LIMIT 10;
-- Expected: Index Scan (fast)
```

**Testing:**
- [ ] Customer dashboard loads in <500ms
- [ ] Mechanic request queue loads in <200ms
- [ ] Admin session list loads in <1s (with 10k+ records)
- [ ] Run `EXPLAIN ANALYZE` on top 10 queries → All use indexes

---

### P1: Authentication Improvements (Week 2)

#### Task 1.7: Add Page-Level Auth Guards
**Priority:** P1
**Effort:** 10 hours
**Risk:** Low - defense in depth

**Current Issue:**
- 0 of 117 pages use page-level auth guards
- Only middleware protection (single point of failure)
- No secondary verification

**Implementation:**
Update all protected pages to use auth guards:

```typescript
// Customer pages (27 pages)
// src/app/customer/*/page.tsx
import { useAuthGuard } from '@/hooks/useAuthGuard'

export default function CustomerPage() {
  const { isLoading, user } = useAuthGuard({ requiredRole: 'customer' })

  if (isLoading) return <LoadingSpinner />
  if (!user) return null // Hook handles redirect

  // Rest of component
}

// Mechanic pages (35 pages) - client components
// src/app/mechanic/*/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MechanicPage() {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch('/api/mechanics/me')
      if (!response.ok) {
        router.replace('/mechanic/login')
        return
      }
      setAuthenticated(true)
      setLoading(false)
    }
    checkAuth()
  }, [router])

  if (loading) return <LoadingSpinner />
  if (!authenticated) return null

  // Rest of component
}

// Admin pages (25 pages) - server components
// src/app/admin/(shell)/*/page.tsx
import { requireAdmin } from '@/lib/auth/guards'

export default async function AdminPage() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    redirect('/admin/login')
  }

  // Rest of component
}
```

**Files to Update:**
- 27 customer pages
- 35 mechanic pages
- 25 admin pages
- 10 workshop pages
- **Total: ~100 pages**

**Testing:**
- [ ] Access protected page without auth → Redirects to login
- [ ] Access with auth → Page loads normally
- [ ] Middleware bypassed (simulate) → Page-level guard catches
- [ ] No infinite redirect loops

---

#### Task 1.8: Standardize Logout Across All User Types
**Priority:** P1
**Effort:** 4 hours
**Risk:** Low - consistency

**Current Issue:**
- Customer logout: client-side only (no API call)
- Mechanic logout: proper API call + hard redirect ✓
- Admin logout: proper API call ✓
- Workshop logout: unknown implementation

**Implementation:**
Standardize all logout flows:

```typescript
// src/lib/logout.ts
export async function performLogout(userType: 'customer' | 'mechanic' | 'admin' | 'workshop') {
  try {
    // 1. Call server logout API
    const endpoints = {
      customer: '/api/customer/logout',
      mechanic: '/api/mechanics/logout',
      admin: '/api/admin/logout',
      workshop: '/api/workshop/logout',
    }

    await fetch(endpoints[userType], {
      method: 'POST',
      credentials: 'include',
    })

    // 2. Clear client storage
    localStorage.clear()
    sessionStorage.clear()

    // 3. Hard redirect (clears all state)
    const redirects = {
      customer: '/',
      mechanic: '/mechanic/login',
      admin: '/admin/login',
      workshop: '/workshop/login',
    }

    window.location.href = redirects[userType]
  } catch (error) {
    console.error('Logout error:', error)
    // Fail-safe: redirect anyway
    window.location.href = '/'
  }
}

// Usage in components:
import { performLogout } from '@/lib/logout'

<button onClick={() => performLogout('customer')}>
  Sign Out
</button>
```

**Update logout API endpoints:**
```typescript
// src/app/api/customer/logout/route.ts
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createServerClient(...)

  // Sign out from Supabase
  await supabase.auth.signOut()

  // Clear cookies
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('sb-access-token')
  response.cookies.delete('sb-refresh-token')

  return response
}
```

**Testing:**
- [ ] Customer logout → Clears tokens + redirects to /
- [ ] Mechanic logout → Clears cookie + DB session + redirects
- [ ] Admin logout → Clears Supabase session + redirects
- [ ] Cannot access protected pages after logout

---

## Phase 1 Deliverables

**Week 1:**
- [ ] All critical API endpoints secured (Task 1.1)
- [ ] RLS policies added to 30+ tables (Task 1.2)
- [ ] Broken navigation links fixed (Task 1.3)
- [ ] Error boundaries implemented (Task 1.4)

**Week 2:**
- [ ] Toast notification system implemented (Task 1.5)
- [ ] Critical indexes added (Task 1.6)
- [ ] Page-level auth guards added to 100+ pages (Task 1.7)
- [ ] Logout standardized across all user types (Task 1.8)

**Phase 1 Total:** 58 hours (1.5 weeks with 2 developers)

---

## Phase 2: Quality & Validation (Weeks 3-6)

**Objective:** Improve data integrity, user experience, and code quality through validation, error handling, and performance optimization.

**Success Criteria:**
- [ ] All forms have validation (React Hook Form + Zod)
- [ ] Consistent error messages across platform
- [ ] 30%+ test coverage on critical flows
- [ ] No brute force attacks possible
- [ ] Query performance improved by 50%+

**Estimated Effort:** 120-160 hours (3-4 weeks with 2 developers)

---

### P1: Form Validation & Error Handling (Weeks 3-4)

#### Task 2.1: Implement React Hook Form + Zod Validation
**Priority:** P1
**Effort:** 40 hours
**Risk:** Medium - requires refactoring

**Current Issue:**
- 0% validation coverage
- Manual state management in all forms
- Inconsistent error messages
- No client-side validation

**Setup:**
```bash
npm install react-hook-form @hookform/resolvers zod
```

**Create Validation Schemas:**
```typescript
// src/lib/validations/auth.ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
    .optional(),
})

// src/lib/validations/intake.ts
export const intakeSchema = z.object({
  year: z.number().min(1900).max(new Date().getFullYear() + 1),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  vin: z.string()
    .length(17, 'VIN must be exactly 17 characters')
    .regex(/^[A-HJ-NPR-Z0-9]+$/, 'Invalid VIN format')
    .optional(),
  odometer: z.number().min(0).max(1000000),
  concern: z.string().min(10, 'Please describe your concern (min 10 characters)').max(1000),
  urgent: z.boolean().optional(),
})

// src/lib/validations/quote.ts
export const quoteSchema = z.object({
  labor_hours: z.number().min(0.5).max(100),
  labor_rate: z.number().min(50).max(500),
  parts_cost: z.number().min(0).max(50000),
  parts_list: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().min(1),
    unit_price: z.number().min(0),
  })),
  diagnosis: z.string().min(20, 'Diagnosis must be at least 20 characters'),
  recommended_repairs: z.string().min(20),
  notes: z.string().optional(),
})

// src/lib/validations/mechanic.ts
export const mechanicProfileSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  years_experience: z.number().min(0).max(60),
  certifications: z.array(z.string()).min(1, 'At least one certification required'),
  specializations: z.array(z.string()),
  hourly_rate: z.number().min(50).max(500).optional(),
  bio: z.string().max(500).optional(),
})
```

**Refactor Forms:**
```typescript
// Before (manual state management):
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [error, setError] = useState('')

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault()
  if (!email || !password) {
    setError('All fields required')
    return
  }
  // ... submit logic
}

// After (React Hook Form + Zod):
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '@/lib/validations/auth'
import type { z } from 'zod'

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    // ... handle response
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Email</label>
        <input {...register('email')} type="email" />
        {errors.email && <p className="text-red-500">{errors.email.message}</p>}
      </div>

      <div>
        <label>Password</label>
        <input {...register('password')} type="password" />
        {errors.password && <p className="text-red-500">{errors.password.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
```

**Forms to Refactor (Priority Order):**
1. `/login` - Customer login (HIGH)
2. `/signup` - Customer signup (HIGH)
3. `/intake` - Vehicle intake form (HIGH)
4. `/mechanic/login` - Mechanic login (HIGH)
5. `/mechanic/signup` - Mechanic signup (HIGH)
6. `/workshop/signup` - Workshop signup (HIGH)
7. `/contact` - Contact form (MEDIUM)
8. `/customer/profile` - Profile editing (MEDIUM)
9. `/mechanic/profile` - Mechanic profile (MEDIUM)
10. `/mechanic/session/[id]/complete` - Quote creation (MEDIUM)
11. `/workshop/quotes/create/[sessionId]` - Workshop quote (MEDIUM)
12. `/admin/fees` - Fee rules (LOW)
13. All other forms (LOW)

**Testing:**
- [ ] Submit empty form → Shows validation errors
- [ ] Submit invalid email → Shows email error
- [ ] Submit weak password → Shows password requirements
- [ ] Submit valid form → No validation errors, submits successfully
- [ ] Validation errors clear when corrected

**Files to Update:** ~30 form components

---

#### Task 2.2: Standardize API Error Handling
**Priority:** P1
**Effort:** 16 hours
**Risk:** Low - consistency

**Current Issue:**
- Inconsistent error responses across 256 endpoints
- No standard error format
- No error codes
- No helpful error messages

**Create Error Utility:**
```typescript
// src/lib/api-errors.ts
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    }
  }
}

export const Errors = {
  // Authentication
  UNAUTHORIZED: (details?: any) => new APIError(401, 'UNAUTHORIZED', 'Authentication required', details),
  FORBIDDEN: (details?: any) => new APIError(403, 'FORBIDDEN', 'Access forbidden', details),
  INVALID_CREDENTIALS: () => new APIError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),

  // Validation
  VALIDATION_ERROR: (details: any) => new APIError(400, 'VALIDATION_ERROR', 'Validation failed', details),
  REQUIRED_FIELD: (field: string) => new APIError(400, 'REQUIRED_FIELD', `${field} is required`),
  INVALID_FORMAT: (field: string) => new APIError(400, 'INVALID_FORMAT', `${field} has invalid format`),

  // Resources
  NOT_FOUND: (resource: string) => new APIError(404, 'NOT_FOUND', `${resource} not found`),
  ALREADY_EXISTS: (resource: string) => new APIError(409, 'ALREADY_EXISTS', `${resource} already exists`),

  // Business Logic
  SESSION_ALREADY_ACTIVE: () => new APIError(409, 'SESSION_ALREADY_ACTIVE', 'You already have an active session'),
  MECHANIC_UNAVAILABLE: () => new APIError(409, 'MECHANIC_UNAVAILABLE', 'No mechanics available at this time'),
  INSUFFICIENT_BALANCE: () => new APIError(402, 'INSUFFICIENT_BALANCE', 'Insufficient account balance'),

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: (retryAfter: number) => new APIError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests', { retryAfter }),

  // Server
  INTERNAL_ERROR: () => new APIError(500, 'INTERNAL_ERROR', 'An unexpected error occurred'),
  DATABASE_ERROR: () => new APIError(500, 'DATABASE_ERROR', 'Database operation failed'),
}

// Error handler middleware
export function handleAPIError(error: unknown): Response {
  console.error('API Error:', error)

  if (error instanceof APIError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode })
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      Errors.VALIDATION_ERROR(error.flatten()).toJSON(),
      { status: 400 }
    )
  }

  // Unknown errors
  return NextResponse.json(
    Errors.INTERNAL_ERROR().toJSON(),
    { status: 500 }
  )
}
```

**Standardize Error Responses:**
```typescript
// Before (inconsistent):
return NextResponse.json({ error: 'Not found' }, { status: 404 })
return NextResponse.json({ message: 'Invalid input' }, { status: 400 })
return new Response('Unauthorized', { status: 401 })

// After (standardized):
import { Errors, handleAPIError } from '@/lib/api-errors'

export async function GET(req: NextRequest) {
  try {
    const session = await db.sessions.findOne(...)
    if (!session) {
      throw Errors.NOT_FOUND('Session')
    }
    return NextResponse.json({ data: session })
  } catch (error) {
    return handleAPIError(error)
  }
}
```

**Client-Side Error Handling:**
```typescript
// src/lib/api-client.ts
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ data?: T; error?: string }> {
  try {
    const response = await fetch(endpoint, options)
    const json = await response.json()

    if (!response.ok) {
      // Standardized error format
      const errorMessage = json.error?.message || 'An error occurred'
      showToast.error(errorMessage)
      return { error: errorMessage }
    }

    return { data: json.data || json }
  } catch (error) {
    const message = 'Network error. Please check your connection.'
    showToast.error(message)
    return { error: message }
  }
}

// Usage:
const { data, error } = await apiCall<Session>('/api/sessions/123')
if (error) {
  // Error already shown via toast
  return
}
// Use data...
```

**Testing:**
- [ ] 404 error returns standard format
- [ ] Validation error returns field details
- [ ] Auth error returns 401 with code
- [ ] Rate limit error includes retry-after
- [ ] Client shows user-friendly error messages

**Files to Update:** All 256 API route files

---

#### Task 2.3: Implement Rate Limiting on Auth Endpoints
**Priority:** P1
**Effort:** 8 hours
**Risk:** Low - security

**Current Issue:**
- No rate limiting on login endpoints
- Brute force attacks possible
- No account lockout mechanism

**Implementation:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Login rate limit: 5 attempts per 15 minutes
export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
})

// Contact form: 3 submissions per hour
export const contactRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '60 m'),
})

// API calls: 100 per minute
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
})

// Helper function
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; retryAfter?: number }> {
  const { success, limit, reset, remaining } = await limiter.limit(identifier)

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000)
    return { success: false, retryAfter }
  }

  return { success: true }
}
```

**Apply to Auth Endpoints:**
```typescript
// src/app/api/mechanics/login/route.ts
import { loginRateLimit, checkRateLimit } from '@/lib/rate-limit'
import { Errors, handleAPIError } from '@/lib/api-errors'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    // Rate limit by email
    const rateLimitCheck = await checkRateLimit(loginRateLimit, email)
    if (!rateLimitCheck.success) {
      throw Errors.RATE_LIMIT_EXCEEDED(rateLimitCheck.retryAfter!)
    }

    // ... rest of login logic
  } catch (error) {
    return handleAPIError(error)
  }
}
```

**Endpoints to Protect:**
- POST `/api/mechanics/login` (5 per 15 min)
- POST `/api/admin/login` (5 per 15 min)
- POST `/api/workshop/login` (5 per 15 min)
- POST `/api/customer/signup` (3 per hour)
- POST `/api/mechanic/signup` (3 per hour)
- POST `/api/contact` (3 per hour)
- POST `/api/customer/forgot-password` (3 per hour)

**Testing:**
- [ ] 6th login attempt within 15 min → 429 error
- [ ] Wait 15 minutes → Can login again
- [ ] 4th contact submission within 1 hour → 429 error
- [ ] Different email addresses → Separate limits

---

### P2: Testing Infrastructure (Weeks 4-5)

#### Task 2.4: Set Up Jest + React Testing Library
**Priority:** P1
**Effort:** 12 hours
**Risk:** Low - foundation

**Setup:**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom @types/jest
```

**Configuration:**
```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/_*.{js,jsx,ts,tsx}',
  ],
  coverageThresholds: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
}

module.exports = createJestConfig(customJestConfig)

// jest.setup.js
import '@testing-library/jest-dom'

// package.json scripts
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**Example Test:**
```typescript
// src/components/__tests__/ErrorBoundary.test.tsx
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'

const ThrowError = () => {
  throw new Error('Test error')
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders error UI when child throws', () => {
    // Suppress console.error for this test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
    spy.mockRestore()
  })

  it('shows reload button in error state', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Reload Page/i)).toBeInTheDocument()
    spy.mockRestore()
  })
})
```

**Testing:**
- [ ] `npm test` runs successfully
- [ ] Coverage report generated
- [ ] CI/CD integration (GitHub Actions)

---

#### Task 2.5: Write Tests for Critical Flows
**Priority:** P1
**Effort:** 24 hours
**Risk:** Medium - requires understanding

**Critical Flows to Test:**

**1. Authentication Flow (8 hours)**
```typescript
// src/lib/auth/__tests__/guards.test.ts
import { requireCustomerAPI, requireMechanicAPI, requireAdminAPI } from '../guards'
import { NextRequest } from 'next/server'

describe('Auth Guards', () => {
  describe('requireCustomerAPI', () => {
    it('returns ok for authenticated customer', async () => {
      const req = new NextRequest('http://localhost/api/test', {
        headers: { cookie: 'valid_supabase_session' },
      })
      const result = await requireCustomerAPI(req)
      expect(result.ok).toBe(true)
      expect(result.user).toBeDefined()
    })

    it('returns error for unauthenticated request', async () => {
      const req = new NextRequest('http://localhost/api/test')
      const result = await requireCustomerAPI(req)
      expect(result.ok).toBe(false)
      expect(result.status).toBe(401)
    })
  })

  describe('requireMechanicAPI', () => {
    it('returns ok for valid mechanic token', async () => {
      const req = new NextRequest('http://localhost/api/test', {
        headers: { cookie: 'aad_mech=valid_token' },
      })
      const result = await requireMechanicAPI(req)
      expect(result.ok).toBe(true)
      expect(result.mechanic).toBeDefined()
    })

    it('returns error for invalid token', async () => {
      const req = new NextRequest('http://localhost/api/test', {
        headers: { cookie: 'aad_mech=invalid_token' },
      })
      const result = await requireMechanicAPI(req)
      expect(result.ok).toBe(false)
      expect(result.status).toBe(401)
    })
  })
})
```

**2. Session Creation Flow (8 hours)**
```typescript
// src/app/api/__tests__/session-creation.test.ts
import { POST as createSession } from '../session/start/route'

describe('Session Creation', () => {
  it('creates diagnostic session for customer', async () => {
    const req = new Request('http://localhost/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intakeId: 'intake-123',
        sessionType: 'diagnostic',
      }),
    })

    const response = await createSession(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.sessionId).toBeDefined()
    expect(data.sessionType).toBe('diagnostic')
  })

  it('rejects session if customer has active session', async () => {
    // Setup: Create existing active session
    // Then:
    const req = new Request('http://localhost/api/session/start', {
      method: 'POST',
      body: JSON.stringify({ intakeId: 'intake-456' }),
    })

    const response = await createSession(req)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error.code).toBe('SESSION_ALREADY_ACTIVE')
  })
})
```

**3. Quote Creation Flow (8 hours)**
```typescript
// src/app/api/mechanic/__tests__/quote-creation.test.ts
describe('Quote Creation', () => {
  it('creates valid quote for completed session', async () => {
    const quoteData = {
      sessionId: 'session-123',
      laborHours: 2.5,
      laborRate: 120,
      partsCost: 450,
      diagnosis: 'Brake pad replacement needed',
      recommendedRepairs: 'Replace front brake pads and rotors',
    }

    const req = new Request('http://localhost/api/mechanic/sessions/complete', {
      method: 'POST',
      body: JSON.stringify(quoteData),
    })

    const response = await createQuote(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.quoteId).toBeDefined()
    expect(data.totalCost).toBe(2.5 * 120 + 450) // 750
  })

  it('validates quote fields', async () => {
    const invalidQuote = {
      sessionId: 'session-123',
      laborHours: -1, // Invalid
    }

    const req = new Request('http://localhost/api/mechanic/sessions/complete', {
      method: 'POST',
      body: JSON.stringify(invalidQuote),
    })

    const response = await createQuote(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })
})
```

**Test Coverage Goals:**
- Authentication: 80%+
- Session management: 60%+
- Quote creation: 70%+
- Form validation: 50%+
- Overall: 30%+

**Testing:**
- [ ] All tests pass
- [ ] Coverage report shows 30%+ overall
- [ ] CI runs tests on every PR

---

### P2: Performance Optimization (Week 5-6)

#### Task 2.6: Add Remaining Database Indexes
**Priority:** P2
**Effort:** 8 hours
**Risk:** Low - performance

**Add 25+ remaining indexes:**

Create migration: `supabase/migrations/99990015_phase2_remaining_indexes.sql`

```sql
-- Vehicle-related indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin) WHERE vin IS NOT NULL;

-- Quote-related indexes
CREATE INDEX IF NOT EXISTS idx_repair_quotes_workshop_id ON repair_quotes(workshop_id) WHERE workshop_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_repair_quotes_mechanic_id ON repair_quotes(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_repair_quotes_created_at ON repair_quotes(created_at DESC);

-- Partnership indexes
CREATE INDEX IF NOT EXISTS idx_partnership_applications_mechanic_id ON partnership_applications(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_partnership_applications_status ON partnership_applications(status);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_workshop_analytics_daily_workshop_date
  ON workshop_analytics_daily(workshop_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workshop_analytics_monthly_workshop_month
  ON workshop_analytics_monthly(workshop_id, month DESC);

-- Organization indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);

-- Admin indexes
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON contact_requests(created_at DESC);

-- Waiver indexes
CREATE INDEX IF NOT EXISTS idx_waiver_signatures_user_id ON waiver_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_waiver_signatures_intake_id ON waiver_signatures(intake_id);

-- Intake indexes
CREATE INDEX IF NOT EXISTS idx_intakes_user_id_created_at ON intakes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intakes_status ON intakes(status);
CREATE INDEX IF NOT EXISTS idx_intakes_urgent ON intakes(urgent) WHERE urgent = true;

-- Corporate indexes
CREATE INDEX IF NOT EXISTS idx_corporate_businesses_status ON corporate_businesses(status);
CREATE INDEX IF NOT EXISTS idx_corporate_employees_business_id ON corporate_employees(business_id);

-- Time-off indexes
CREATE INDEX IF NOT EXISTS idx_mechanic_time_off_mechanic_id_dates
  ON mechanic_time_off(mechanic_id, start_date, end_date);

-- Fee indexes
CREATE INDEX IF NOT EXISTS idx_fee_applications_session_id ON fee_applications(session_id);
CREATE INDEX IF NOT EXISTS idx_fee_applications_mechanic_id ON fee_applications(mechanic_id);
```

**Performance Testing:**
```sql
-- Test all critical queries with EXPLAIN ANALYZE
EXPLAIN ANALYZE SELECT * FROM sessions WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 20;
EXPLAIN ANALYZE SELECT * FROM repair_quotes WHERE customer_id = $1 AND status = 'pending';
EXPLAIN ANALYZE SELECT * FROM mechanics WHERE is_available = true AND workshop_id = $1;
-- All should use Index Scan, not Seq Scan
```

---

#### Task 2.7: Optimize API Data Fetching Patterns
**Priority:** P2
**Effort:** 16 hours
**Risk:** Medium - requires refactoring

**Current Issues:**
- Over-fetching (selecting all columns when only few needed)
- N+1 queries (fetching related data in loops)
- No pagination on large lists
- No data caching

**Optimizations:**

**1. Reduce Over-Fetching:**
```typescript
// Before: Fetches all 30+ columns
const { data } = await supabase
  .from('sessions')
  .select('*')

// After: Only fetch needed columns
const { data } = await supabase
  .from('sessions')
  .select('id, status, created_at, customer_id, mechanic_id')
```

**2. Fix N+1 Queries:**
```typescript
// Before: N+1 query problem
const sessions = await supabase.from('sessions').select('*')
for (const session of sessions) {
  const mechanic = await supabase
    .from('mechanics')
    .select('full_name')
    .eq('id', session.mechanic_id)
    .single()
  // ... use mechanic
}

// After: Single query with join
const sessions = await supabase
  .from('sessions')
  .select(`
    id,
    status,
    created_at,
    mechanic:mechanics(id, full_name, email)
  `)
```

**3. Add Pagination:**
```typescript
// src/app/api/customer/sessions/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const { data, count, error } = await supabase
    .from('sessions')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil((count || 0) / limit),
    },
  })
}
```

**4. Add Response Caching:**
```typescript
// src/app/api/mechanics/available-count/route.ts
export async function GET(req: NextRequest) {
  const { data, error } = await supabase
    .from('mechanics')
    .select('id', { count: 'exact' })
    .eq('is_available', true)

  const response = NextResponse.json({ available_now: data?.length || 0 })

  // Cache for 30 seconds
  response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')

  return response
}
```

**APIs to Optimize (Priority Order):**
1. `GET /api/customer/sessions` - Add pagination
2. `GET /api/mechanic/dashboard/stats` - Reduce over-fetching
3. `GET /api/admin/sessions/stats` - Add pagination + caching
4. `GET /api/customer/quotes` - Fix N+1 queries
5. `GET /api/mechanics/requests` - Optimize query

**Testing:**
- [ ] Dashboard loads in <500ms (was 2s+)
- [ ] Paginated lists show correct page numbers
- [ ] Cache headers present on cacheable endpoints
- [ ] No N+1 queries in logs

---

## Phase 2 Deliverables

**Week 3-4:**
- [ ] React Hook Form + Zod implemented on 30+ forms (Task 2.1)
- [ ] Standardized error handling across 256 endpoints (Task 2.2)
- [ ] Rate limiting on 7 auth endpoints (Task 2.3)
- [ ] Jest + RTL testing infrastructure (Task 2.4)

**Week 5-6:**
- [ ] Tests for authentication, sessions, quotes (Task 2.5)
- [ ] 30%+ test coverage achieved
- [ ] Remaining 25+ indexes added (Task 2.6)
- [ ] API data fetching optimized (Task 2.7)

**Phase 2 Total:** 124 hours (3 weeks with 2 developers)

---

## Phase 3: Completeness & Polish (Weeks 7-12)

**Objective:** Complete incomplete features, improve UX, and add comprehensive testing.

**Success Criteria:**
- [ ] All analytics pages functional
- [ ] All earnings pages complete
- [ ] CRM features implemented
- [ ] Component library created
- [ ] 60%+ test coverage
- [ ] E2E tests for critical flows
- [ ] WCAG 2.1 AA compliance
- [ ] Performance budgets met

**Estimated Effort:** 240-320 hours (6-8 weeks with 2-3 developers)

---

### P2: Complete Analytics & Earnings (Weeks 7-9)

#### Task 3.1: Implement Mechanic Analytics
**Priority:** P2
**Effort:** 24 hours
**Risk:** Medium - requires new tables

**Current State:** `/mechanic/analytics` page exists but has NO BACKEND

**Requirements:**
- Session metrics (total, completed, cancelled, avg duration)
- Revenue metrics (total, by month, average per session)
- Performance metrics (rating, response time, completion rate)
- Charts (sessions over time, revenue over time, breakdown by type)

**Database Schema:**
```sql
-- Create mechanic analytics tables
CREATE TABLE mechanic_analytics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Session metrics
  total_sessions INTEGER DEFAULT 0,
  completed_sessions INTEGER DEFAULT 0,
  cancelled_sessions INTEGER DEFAULT 0,
  average_session_duration_minutes INTEGER,

  -- Revenue metrics
  total_revenue DECIMAL(10,2) DEFAULT 0,
  platform_fees DECIMAL(10,2) DEFAULT 0,
  net_earnings DECIMAL(10,2) DEFAULT 0,

  -- Performance metrics
  average_rating DECIMAL(3,2),
  total_reviews INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(mechanic_id, date)
);

CREATE TABLE mechanic_analytics_monthly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of month

  -- Aggregated metrics
  total_sessions INTEGER DEFAULT 0,
  completed_sessions INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  net_earnings DECIMAL(10,2) DEFAULT 0,
  average_rating DECIMAL(3,2),

  -- Session type breakdown
  diagnostic_sessions INTEGER DEFAULT 0,
  chat_sessions INTEGER DEFAULT 0,
  video_sessions INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(mechanic_id, month)
);

-- Create indexes
CREATE INDEX idx_mechanic_analytics_daily_mechanic_date
  ON mechanic_analytics_daily(mechanic_id, date DESC);
CREATE INDEX idx_mechanic_analytics_monthly_mechanic_month
  ON mechanic_analytics_monthly(mechanic_id, month DESC);

-- Enable RLS
ALTER TABLE mechanic_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_analytics_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mechanics can view their own analytics"
  ON mechanic_analytics_daily FOR SELECT
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics
      WHERE email = (SELECT email FROM mechanic_sessions WHERE token = current_setting('request.headers')::json->>'cookie')
    )
  );

CREATE POLICY "Mechanics can view their own monthly analytics"
  ON mechanic_analytics_monthly FOR SELECT
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics
      WHERE email = (SELECT email FROM mechanic_sessions WHERE token = current_setting('request.headers')::json->>'cookie')
    )
  );
```

**API Implementation:**
```typescript
// src/app/api/mechanics/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireMechanicAPI } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const mechanic = await requireMechanicAPI(req)
  if (!mechanic.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || '30days' // 7days, 30days, 90days, 1year
  const supabase = createClient()

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  if (period === '7days') startDate.setDate(endDate.getDate() - 7)
  else if (period === '30days') startDate.setDate(endDate.getDate() - 30)
  else if (period === '90days') startDate.setDate(endDate.getDate() - 90)
  else startDate.setFullYear(endDate.getFullYear() - 1)

  // Fetch daily analytics
  const { data: dailyData, error } = await supabase
    .from('mechanic_analytics_daily')
    .select('*')
    .eq('mechanic_id', mechanic.mechanic.id)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }

  // Calculate summary metrics
  const summary = {
    totalSessions: dailyData.reduce((sum, day) => sum + day.total_sessions, 0),
    completedSessions: dailyData.reduce((sum, day) => sum + day.completed_sessions, 0),
    cancelledSessions: dailyData.reduce((sum, day) => sum + day.cancelled_sessions, 0),
    totalRevenue: dailyData.reduce((sum, day) => sum + parseFloat(day.total_revenue), 0),
    netEarnings: dailyData.reduce((sum, day) => sum + parseFloat(day.net_earnings), 0),
    averageRating: dailyData.length > 0
      ? dailyData.reduce((sum, day) => sum + (day.average_rating || 0), 0) / dailyData.length
      : 0,
    completionRate: dailyData.reduce((sum, day) => sum + day.total_sessions, 0) > 0
      ? (dailyData.reduce((sum, day) => sum + day.completed_sessions, 0) / dailyData.reduce((sum, day) => sum + day.total_sessions, 0)) * 100
      : 0,
  }

  // Format for charts
  const chartData = dailyData.map(day => ({
    date: day.date,
    sessions: day.total_sessions,
    revenue: parseFloat(day.total_revenue),
    rating: day.average_rating,
  }))

  return NextResponse.json({
    summary,
    chartData,
    period,
  })
}
```

**Frontend Implementation:**
```typescript
// src/app/mechanic/analytics/page.tsx - Update to fetch real data
'use client'

import { useState, useEffect } from 'react'
import { LineChart, BarChart } from '@/components/charts'

export default function MechanicAnalyticsPage() {
  const [period, setPeriod] = useState('30days')
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true)
      const response = await fetch(`/api/mechanics/analytics?period=${period}`)
      const data = await response.json()
      setAnalytics(data)
      setLoading(false)
    }
    fetchAnalytics()
  }, [period])

  if (loading) return <div>Loading analytics...</div>

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>

      {/* Period selector */}
      <div className="mb-6">
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="1year">Last Year</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 p-6 rounded-lg">
          <div className="text-sm text-slate-400 mb-2">Total Sessions</div>
          <div className="text-3xl font-bold text-white">{analytics.summary.totalSessions}</div>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg">
          <div className="text-sm text-slate-400 mb-2">Completion Rate</div>
          <div className="text-3xl font-bold text-green-500">{analytics.summary.completionRate.toFixed(1)}%</div>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg">
          <div className="text-sm text-slate-400 mb-2">Total Revenue</div>
          <div className="text-3xl font-bold text-blue-500">${analytics.summary.totalRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg">
          <div className="text-sm text-slate-400 mb-2">Average Rating</div>
          <div className="text-3xl font-bold text-orange-500">{analytics.summary.averageRating.toFixed(2)}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Sessions Over Time</h2>
          <LineChart data={analytics.chartData} xKey="date" yKey="sessions" />
        </div>
        <div className="bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Revenue Over Time</h2>
          <BarChart data={analytics.chartData} xKey="date" yKey="revenue" />
        </div>
      </div>
    </div>
  )
}
```

**Cron Job to Update Analytics:**
```typescript
// src/app/api/cron/update-mechanic-analytics/route.ts
export async function GET(req: NextRequest) {
  // Verify cron secret
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toISOString().split('T')[0]

  // Aggregate data for each mechanic
  const { data: mechanics } = await supabase.from('mechanics').select('id')

  for (const mechanic of mechanics) {
    // Calculate metrics for yesterday
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('mechanic_id', mechanic.id)
      .gte('created_at', `${dateStr} 00:00:00`)
      .lt('created_at', `${dateStr} 23:59:59`)

    const totalSessions = sessions.length
    const completedSessions = sessions.filter(s => s.status === 'completed').length
    const cancelledSessions = sessions.filter(s => s.status === 'cancelled').length

    // Calculate revenue
    const { data: fees } = await supabase
      .from('fee_applications')
      .select('mechanic_payout')
      .in('session_id', sessions.map(s => s.id))

    const totalRevenue = fees.reduce((sum, f) => sum + parseFloat(f.mechanic_payout), 0)

    // Insert/update analytics
    await supabase
      .from('mechanic_analytics_daily')
      .upsert({
        mechanic_id: mechanic.id,
        date: dateStr,
        total_sessions: totalSessions,
        completed_sessions: completedSessions,
        cancelled_sessions: cancelledSessions,
        total_revenue: totalRevenue,
        // ... other metrics
      })
  }

  return NextResponse.json({ success: true })
}
```

**Testing:**
- [ ] Analytics page loads with real data
- [ ] Period selector updates charts
- [ ] Summary metrics accurate
- [ ] Charts render correctly
- [ ] Cron job updates daily

---

#### Task 3.2: Implement Workshop Analytics
**Priority:** P2
**Effort:** 20 hours
**Risk:** Medium - complex aggregations

**Current State:** `/workshop/analytics` page exists but shows LIMITED DATA

**Requirements:**
- Workshop performance metrics
- Mechanic performance comparison
- Revenue analytics
- Diagnostic session metrics
- Customer satisfaction scores

**Similar implementation to Task 3.1 but with workshop-specific metrics**

---

#### Task 3.3: Complete Earnings Pages
**Priority:** P2
**Effort:** 20 hours
**Risk:** Medium - financial data

**Current State:**
- `/mechanic/earnings` shows BASIC earnings only
- `/mechanic/statements` has NO DETAILED DATA
- No breakdown by session type
- No fee breakdown
- No export functionality

**Requirements:**
- Detailed earnings by session
- Fee breakdown (platform fee, workshop split)
- Date range filtering
- Export to CSV/PDF
- Payment history
- Pending vs. paid earnings

**API Implementation:**
```typescript
// src/app/api/mechanics/earnings/route.ts
export async function GET(req: NextRequest) {
  const mechanic = await requireMechanicAPI(req)
  if (!mechanic.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  // Fetch sessions with fee applications
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      id,
      created_at,
      ended_at,
      session_type,
      status,
      fee_applications (
        id,
        base_price,
        platform_fee_amount,
        workshop_split_amount,
        mechanic_payout,
        payment_status
      )
    `)
    .eq('mechanic_id', mechanic.mechanic.id)
    .eq('status', 'completed')
    .gte('ended_at', startDate)
    .lte('ended_at', endDate)
    .order('ended_at', { ascending: false })

  // Calculate totals
  const summary = {
    totalEarnings: 0,
    platformFees: 0,
    workshopSplit: 0,
    netPayout: 0,
    pendingAmount: 0,
    paidAmount: 0,
  }

  const details = sessions.map(session => {
    const fee = session.fee_applications[0]
    if (!fee) return null

    summary.totalEarnings += parseFloat(fee.base_price)
    summary.platformFees += parseFloat(fee.platform_fee_amount)
    summary.workshopSplit += parseFloat(fee.workshop_split_amount || '0')
    summary.netPayout += parseFloat(fee.mechanic_payout)

    if (fee.payment_status === 'paid') {
      summary.paidAmount += parseFloat(fee.mechanic_payout)
    } else {
      summary.pendingAmount += parseFloat(fee.mechanic_payout)
    }

    return {
      sessionId: session.id,
      date: session.ended_at,
      type: session.session_type,
      basePrice: fee.base_price,
      platformFee: fee.platform_fee_amount,
      workshopSplit: fee.workshop_split_amount,
      payout: fee.mechanic_payout,
      status: fee.payment_status,
    }
  }).filter(Boolean)

  return NextResponse.json({ summary, details })
}
```

---

### P2: Complete CRM Features (Week 10)

#### Task 3.4: Implement Mechanic CRM
**Priority:** P2
**Effort:** 24 hours
**Risk:** Medium - new feature

**Current State:** `/mechanic/crm` has BASIC IMPLEMENTATION ONLY

**Requirements:**
- Customer list with session history
- Customer notes and tags
- Follow-up reminders
- Customer communication log
- Customer lifetime value
- Repeat customer tracking

**Database Schema:**
```sql
CREATE TABLE mechanic_client_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE mechanic_client_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mechanic_id, customer_id, tag)
);

CREATE TABLE mechanic_client_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  note TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_client_notes_mechanic_customer ON mechanic_client_notes(mechanic_id, customer_id);
CREATE INDEX idx_client_tags_mechanic ON mechanic_client_tags(mechanic_id);
CREATE INDEX idx_client_reminders_mechanic_date ON mechanic_client_reminders(mechanic_id, reminder_date);

-- RLS
ALTER TABLE mechanic_client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_client_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_client_reminders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Mechanics can manage their own client notes"
  ON mechanic_client_notes FOR ALL
  USING (mechanic_id IN (SELECT id FROM mechanics WHERE email = current_setting('request.headers')::json->>'cookie'));
```

**Implementation similar to analytics with full CRUD operations**

---

### P3: Component Library & UX Polish (Weeks 11-12)

#### Task 3.5: Create Component Library
**Priority:** P3
**Effort:** 32 hours
**Risk:** Low - foundation

**Current Issue:**
- Duplicate UI components across pages
- Inconsistent styling
- No reusable component patterns
- No component documentation

**Create Reusable Components:**

**1. Card Component:**
```typescript
// src/components/ui/Card.tsx
import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  variant?: 'default' | 'gradient' | 'bordered'
  padding?: 'sm' | 'md' | 'lg'
  hover?: boolean
  className?: string
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  className = ''
}: CardProps) {
  const variants = {
    default: 'bg-slate-800/50 backdrop-blur-sm border border-slate-700',
    gradient: 'bg-gradient-to-br from-slate-800/50 to-slate-800/30 backdrop-blur-sm border border-slate-700',
    bordered: 'bg-slate-900/50 border-2 border-slate-700',
  }

  const paddings = {
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  }

  const hoverClass = hover ? 'hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all' : ''

  return (
    <div className={`rounded-lg shadow ${variants[variant]} ${paddings[padding]} ${hoverClass} ${className}`}>
      {children}
    </div>
  )
}
```

**2. Button Component:**
```typescript
// src/components/ui/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-orange-500 hover:bg-orange-600 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={`
        ${variants[variant]}
        ${sizes[size]}
        rounded-lg font-semibold
        transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center gap-2 justify-center
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
      {!loading && icon}
      {children}
    </button>
  )
}
```

**3. Modal Component:**
```typescript
// src/components/ui/Modal.tsx
'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className={`w-full ${sizes[size]} transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 p-6 text-left align-middle shadow-xl transition-all`}>
                <Dialog.Title as="div" className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium leading-6 text-white">
                    {title}
                  </h3>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-white transition-colors"
                    onClick={onClose}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Title>

                <div className="mt-2">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
```

**4. Table Component:**
```typescript
// src/components/ui/Table.tsx
interface Column<T> {
  key: keyof T
  label: string
  render?: (value: any, row: T) => React.ReactNode
}

interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
  loading?: boolean
  emptyMessage?: string
}

export function Table<T>({ data, columns, keyField, loading, emptyMessage }: TableProps<T>) {
  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (data.length === 0) {
    return <div className="text-center py-8 text-slate-400">{emptyMessage || 'No data'}</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700">
            {columns.map(col => (
              <th key={String(col.key)} className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={String(row[keyField])} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
              {columns.map(col => (
                <td key={String(col.key)} className="px-4 py-3 text-sm text-slate-200">
                  {col.render ? col.render(row[col.key], row) : String(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**5. Form Input Components:**
```typescript
// src/components/ui/Input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helpText?: string
}

export function Input({ label, error, helpText, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-2
          bg-slate-800 border rounded-lg
          text-white placeholder-slate-500
          focus:outline-none focus:ring-2 focus:ring-orange-500
          ${error ? 'border-red-500' : 'border-slate-700'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      {helpText && !error && <p className="mt-1 text-sm text-slate-400">{helpText}</p>}
    </div>
  )
}
```

**Components to Create:**
- [x] Card
- [x] Button
- [x] Modal
- [x] Table
- [x] Input
- [ ] Select
- [ ] Checkbox
- [ ] Radio
- [ ] Textarea
- [ ] Badge
- [ ] Spinner
- [ ] Skeleton
- [ ] Tabs
- [ ] Accordion
- [ ] Tooltip
- [ ] Dropdown

---

#### Task 3.6: Add E2E Tests with Playwright
**Priority:** P3
**Effort:** 24 hours
**Risk:** Medium - requires setup

**Setup:**
```bash
npm install --save-dev @playwright/test
npx playwright install
```

**Configuration:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

**Critical E2E Tests:**
```typescript
// e2e/customer-session-flow.spec.ts
import { test, expect } from '@playwright/test'

test('customer can complete full session flow', async ({ page }) => {
  // 1. Sign up
  await page.goto('/signup')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'SecurePass123')
  await page.fill('input[name="fullName"]', 'Test User')
  await page.click('button[type="submit"]')

  // 2. Fill intake form
  await page.waitForURL('/intake')
  await page.fill('input[name="year"]', '2020')
  await page.fill('input[name="make"]', 'Toyota')
  await page.fill('input[name="model"]', 'Camry')
  await page.fill('textarea[name="concern"]', 'Engine making strange noise')
  await page.click('button:has-text("Continue")')

  // 3. Select plan
  await page.waitForURL('/onboarding/pricing')
  await page.click('button:has-text("Select Diagnostic")')

  // 4. Start session
  await page.waitForURL('/customer/dashboard')
  await expect(page.locator('text=Active Session')).toBeVisible()

  // 5. Verify session started
  await expect(page.locator('text=Waiting for mechanic')).toBeVisible()
})

// e2e/mechanic-accept-session.spec.ts
test('mechanic can accept and complete session', async ({ page }) => {
  // 1. Login
  await page.goto('/mechanic/login')
  await page.fill('input[name="email"]', 'mechanic@test.com')
  await page.fill('input[name="password"]', '12345678')
  await page.click('button[type="submit"]')

  // 2. View pending requests
  await page.waitForURL('/mechanic/dashboard')
  await expect(page.locator('text=New Service Requests')).toBeVisible()

  // 3. Accept request
  await page.click('button:has-text("Accept Request")')

  // 4. Complete session
  await page.waitForURL(/\/diagnostic\//)
  await page.click('button:has-text("Complete Session")')

  // 5. Submit quote
  await page.fill('input[name="laborHours"]', '2')
  await page.fill('input[name="laborRate"]', '120')
  await page.fill('textarea[name="diagnosis"]', 'Worn belt needs replacement')
  await page.click('button:has-text("Submit Quote")')

  // 6. Verify completion
  await expect(page.locator('text=Quote sent successfully')).toBeVisible()
})
```

**Tests to Write:**
1. Customer signup → intake → session creation
2. Mechanic login → accept request → complete session
3. Admin login → view sessions → export data
4. Workshop login → view escalations → create quote
5. Error handling (network errors, validation errors)
6. Accessibility (keyboard navigation, screen readers)

---

#### Task 3.7: Improve Accessibility (WCAG 2.1 AA)
**Priority:** P3
**Effort:** 20 hours
**Risk:** Low - compliance

**Current Issues:**
- No ARIA labels
- Poor keyboard navigation
- Low color contrast in some areas
- No focus indicators
- Missing alt text on images

**Implementation:**

**1. Add ARIA Labels:**
```typescript
// Before:
<button onClick={handleSubmit}>Submit</button>

// After:
<button
  onClick={handleSubmit}
  aria-label="Submit intake form"
>
  Submit
</button>

// Before:
<input type="text" />

// After:
<input
  type="text"
  id="email"
  aria-describedby="email-help"
  aria-invalid={!!errors.email}
  aria-required="true"
/>
```

**2. Improve Keyboard Navigation:**
```typescript
// Add keyboard handlers
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    handleClick()
  }
}

<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={handleKeyDown}
  aria-label="Action description"
>
  Click me
</div>
```

**3. Add Focus Indicators:**
```css
/* global.css */
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  button {
    border: 2px solid currentColor;
  }
}
```

**4. Fix Color Contrast:**
Run audit:
```bash
npm install --save-dev @axe-core/playwright
```

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('should not have any automatically detectable accessibility issues', async ({ page }) => {
  await page.goto('/')

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()

  expect(accessibilityScanResults.violations).toEqual([])
})
```

**5. Add Skip Links:**
```typescript
// src/components/layout/SkipToContent.tsx
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-orange-500 text-white px-4 py-2 rounded-lg z-50"
    >
      Skip to main content
    </a>
  )
}

// Add to all layouts
<SkipToContent />
<main id="main-content">
  {children}
</main>
```

**Testing:**
- [ ] Keyboard navigation works on all pages
- [ ] Screen reader announces all elements correctly
- [ ] Color contrast passes WCAG AA (4.5:1 for normal text)
- [ ] Focus indicators visible on all interactive elements
- [ ] No accessibility violations in axe scan

---

## Phase 3 Deliverables

**Week 7-9:**
- [ ] Mechanic analytics complete (Task 3.1)
- [ ] Workshop analytics complete (Task 3.2)
- [ ] Earnings pages complete (Task 3.3)

**Week 10:**
- [ ] CRM features complete (Task 3.4)

**Week 11-12:**
- [ ] Component library created (Task 3.5)
- [ ] E2E tests written (Task 3.6)
- [ ] Accessibility improved to WCAG AA (Task 3.7)
- [ ] 60%+ test coverage achieved

**Phase 3 Total:** 164 hours (4-5 weeks with 2-3 developers)

---

## Summary & Timeline

### Total Effort Breakdown

**Phase 1 (Weeks 1-2):** 58 hours
- Critical security fixes
- Database performance
- Authentication improvements

**Phase 2 (Weeks 3-6):** 124 hours
- Form validation
- Error handling
- Testing infrastructure
- Performance optimization

**Phase 3 (Weeks 7-12):** 164 hours
- Analytics & earnings
- CRM features
- Component library
- E2E tests & accessibility

**Grand Total:** 346 hours (8-9 weeks with 2 developers, or 6-7 weeks with 3 developers)

---

### Resource Allocation

**Recommended Team:**
- 2 Senior Full-Stack Developers
- 1 QA Engineer (Part-time for Phases 2-3)
- 1 DevOps Engineer (Part-time for CI/CD setup)

**Alternative (Faster):**
- 3 Senior Full-Stack Developers
- 1 QA Engineer (Full-time)
- Complete in 6-7 weeks

---

### Risk Mitigation

**High-Risk Items:**
1. RLS policy migration (Phase 1) - Test thoroughly in staging
2. Form validation refactor (Phase 2) - Incremental rollout
3. Analytics implementation (Phase 3) - Start with mechanic, then workshop

**Mitigation Strategies:**
- Deploy to staging environment first
- Feature flags for gradual rollout
- Daily standups to catch issues early
- Weekly stakeholder demos

---

### Success Metrics

**Phase 1:**
- 0 critical security vulnerabilities
- 0 navigation 404 errors
- 100% RLS coverage on sensitive tables
- <500ms dashboard load time

**Phase 2:**
- 100% form validation coverage
- 30%+ test coverage
- 0 rate limit bypass vulnerabilities
- 50%+ reduction in API response times

**Phase 3:**
- 60%+ test coverage
- WCAG 2.1 AA compliance
- <2s Lighthouse performance score >90
- 0 incomplete features

---

## Appendix

### Tools & Technologies

**Required:**
- React Hook Form + Zod (validation)
- Jest + RTL (unit testing)
- Playwright (E2E testing)
- React Hot Toast (notifications)
- Upstash Redis (rate limiting)

**Optional (Nice to Have):**
- Sentry (error reporting)
- Storybook (component documentation)
- Recharts or Chart.js (analytics charts)
- Headless UI (accessible components)

---

### Database Migration Strategy

**For all migrations:**
1. Create migration file with timestamp
2. Test on local database first
3. Deploy to staging
4. Run automated tests
5. Deploy to production during low-traffic window
6. Monitor for errors
7. Rollback plan ready

**Critical Migrations:**
- RLS policies (Phase 1)
- Indexes (Phase 1 & 2)
- Analytics tables (Phase 3)

---

### Testing Strategy

**Unit Tests (30% coverage):**
- All auth guards
- All form validation schemas
- All API error handlers
- Critical utility functions

**Integration Tests (Key Flows):**
- Session creation flow
- Quote creation flow
- Payment flow
- Mechanic matching flow

**E2E Tests (Critical Paths):**
- Customer signup → session → quote
- Mechanic signup → accept → complete
- Admin login → manage → export

**Performance Tests:**
- Dashboard load time <500ms
- API response time <200ms
- Database query time <100ms

---

**End of Document**
