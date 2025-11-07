# Admin Security Fixes - Quick Implementation Guide

## 🚨 CRITICAL FIXES (30 minutes implementation time)

This guide provides copy-paste code to fix the most critical security vulnerabilities in your admin panel.

---

## Step 1: Create Admin Auth Helper (5 minutes)

Create a new file: `src/lib/auth/requireAdmin.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

interface AuthResult {
  authorized: boolean
  response?: NextResponse
  user?: any
  profile?: any
}

/**
 * Server-side admin authentication middleware
 * Use in all admin API routes
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  )

  // Check if user is authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      ),
    }
  }

  // Check if user has admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile || profile.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      ),
    }
  }

  return {
    authorized: true,
    user,
    profile,
  }
}

/**
 * For use in Server Components (not API routes)
 */
export async function requireAdminServerComponent() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookies().get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { authorized: false, user: null, profile: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    return { authorized: false, user, profile: null }
  }

  return { authorized: true, user, profile }
}
```

---

## Step 2: Fix Middleware (10 minutes)

Edit: `src/middleware.ts` around line 88-103

**BEFORE:**
```typescript
if (matchesPrefix(pathname, '/admin')) {
  if (pathname === '/admin/login') {
    return response
  }

  if (!user) {
    const loginUrl = new URL('/admin/login', request.url)
    const next = pathname === '/admin' ? '/admin/intakes' : pathname
    loginUrl.searchParams.set('next', next)
    return NextResponse.redirect(loginUrl)
  }

  // TODO: Add admin role verification here ⬅️ FIX THIS!
  return response
}
```

**AFTER:**
```typescript
if (matchesPrefix(pathname, '/admin')) {
  if (pathname === '/admin/login') {
    return response
  }

  if (!user) {
    const loginUrl = new URL('/admin/login', request.url)
    const next = pathname === '/admin' ? '/admin/intakes' : pathname
    loginUrl.searchParams.set('next', next)
    return NextResponse.redirect(loginUrl)
  }

  // ✅ FIXED: Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    console.warn(`[SECURITY] Non-admin user ${user.id} attempted to access ${pathname}`)
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}
```

---

## Step 3: Fix Emergency Cleanup Endpoint (2 minutes)

Edit: `src/app/api/admin/clear-all-sessions/route.ts`

**BEFORE (lines 16-23):**
```typescript
export async function DELETE(req: NextRequest) {
  try {
    // Optional: Add authentication check here ⬅️ UNCOMMENT THIS!
    // const authHeader = req.headers.get('authorization')
    // if (authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Delete ALL sessions...
```

**AFTER:**
```typescript
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function DELETE(req: NextRequest) {
  try {
    // ✅ FIXED: Require admin authentication
    const auth = await requireAdmin(req)
    if (!auth.authorized) {
      return auth.response!
    }

    // Log who initiated this dangerous operation
    console.warn(`[SECURITY] Admin ${auth.user?.id} initiating NUCLEAR cleanup`)

    // Delete ALL sessions...
```

---

## Step 4: Update All Admin API Routes (Pattern)

For each file in `src/app/api/admin/**/*.ts`, add this at the top of each handler:

**Example 1: Simple GET endpoint**

**BEFORE:**
```typescript
export async function GET(req: NextRequest) {
  try {
    const data = await supabaseAdmin.from('customers').select('*')
    return NextResponse.json({ data })
  }
}
```

**AFTER:**
```typescript
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function GET(req: NextRequest) {
  // ✅ Add this line
  const auth = await requireAdmin(req)
  if (!auth.authorized) return auth.response!

  try {
    const data = await supabaseAdmin.from('customers').select('*')
    return NextResponse.json({ data })
  }
}
```

**Example 2: Dynamic route with params**

**BEFORE:**
```typescript
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    // ... dangerous operation
  }
}
```

**AFTER:**
```typescript
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ✅ Add this block
  const auth = await requireAdmin(req)
  if (!auth.authorized) return auth.response!

  try {
    const body = await req.json()

    // ✅ Optional: Log admin action
    console.log(`[ADMIN] ${auth.profile?.full_name} performed action on user ${params.id}`)

    // ... dangerous operation
  }
}
```

---

## Step 5: Replace Client-Side AuthCheck (10 minutes)

**Option A: Server Component Approach (Recommended)**

Create: `src/components/admin/ServerAuthCheck.tsx`

```typescript
import { redirect } from 'next/navigation'
import { requireAdminServerComponent } from '@/lib/auth/requireAdmin'

export async function ServerAuthCheck({ children }: { children: React.ReactNode }) {
  const auth = await requireAdminServerComponent()

  if (!auth.authorized) {
    redirect('/admin/login')
  }

  return <>{children}</>
}
```

Update: `src/app/admin/layout.tsx`

**BEFORE:**
```typescript
import { AuthCheck } from '@/components/admin/AuthCheck'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AuthCheck>
        <header>...</header>
      </AuthCheck>
      <main>{children}</main>
    </div>
  )
}
```

**AFTER:**
```typescript
import { ServerAuthCheck } from '@/components/admin/ServerAuthCheck'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ServerAuthCheck>
      <div className="min-h-screen bg-slate-50">
        <header>...</header>
        <main>{children}</main>
      </div>
    </ServerAuthCheck>
  )
}
```

---

**Option B: Keep Client Component (Less Secure)**

If you must use client components, at least validate on the server:

Update: `src/components/admin/AuthCheck.tsx`

**BEFORE:**
```typescript
// @ts-nocheck ⬅️ REMOVE THIS
'use client'

export function AuthCheck({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      const hasAuth = localStorage.getItem('supabase.auth.token') // ⬅️ INSECURE
      setIsAuthenticated(!!hasAuth)
    }
    checkAuth()
  }, [])

  return isAuthenticated ? <>{children}</> : null
}
```

**AFTER:**
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function AuthCheck({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAdminRole() {
      const supabase = createClient()

      // ✅ FIXED: Actually verify with server
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/admin/login')
        return
      }

      // ✅ FIXED: Check role from database
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role !== 'admin') {
        console.warn('[SECURITY] Non-admin tried to access admin panel')
        router.push('/')
        return
      }

      setIsAdmin(true)
      setLoading(false)
    }

    checkAdminRole()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    )
  }

  return isAdmin ? <>{children}</> : null
}
```

---

## Step 6: Quick Test (5 minutes)

```bash
# 1. Start dev server
npm run dev

# 2. Open browser DevTools (F12)

# 3. Try accessing admin as non-admin
# In console, run:
fetch('/api/admin/users/customers')
  .then(r => r.json())
  .then(console.log)
# Should return: { error: "Forbidden - Admin access required" }

# 4. Try accessing /admin pages as customer
# Navigate to: http://localhost:3000/admin
# Should redirect to home page

# 5. Success! ✅ Your admin panel is now secure
```

---

## Priority Files to Update

### Critical (Do First - 10 files):
```
src/lib/auth/requireAdmin.ts ⬅️ CREATE THIS
src/middleware.ts ⬅️ FIX LINE 101
src/app/api/admin/clear-all-sessions/route.ts
src/app/api/admin/clear-session-requests/route.ts
src/app/api/admin/users/[id]/ban/route.ts
src/app/api/admin/users/[id]/suspend/route.ts
src/app/api/admin/users/customers/route.ts
src/app/api/admin/users/mechanics/route.ts
src/app/api/admin/sessions/bulk-cancel/route.ts
src/app/api/admin/sessions/force-end/route.ts
```

### High Priority (Next - 20 files):
All other files in `src/app/api/admin/` that perform:
- Data modification (POST, PUT, DELETE)
- User management
- Session manipulation
- Payment operations

### Medium Priority (After that - remaining 46 files):
Read-only GET endpoints can be done last, but should still be protected.

---

## Automated Fix Script

Create: `scripts/fix-admin-auth.sh`

```bash
#!/bin/bash

# Find all admin API routes and add requireAdmin import
find src/app/api/admin -name "route.ts" -type f | while read file; do
  # Skip if already has requireAdmin
  if grep -q "requireAdmin" "$file"; then
    echo "✅ $file already protected"
  else
    echo "🔧 Adding auth to $file"

    # Add import at top
    sed -i '1i import { requireAdmin } from "@/lib/auth/requireAdmin"' "$file"

    # Find export async function and add auth check
    # This is a naive approach - review each file manually after running
    echo "⚠️  Please manually add auth check to: $file"
  fi
done

echo ""
echo "✅ Script complete. Please review all files and add:"
echo "   const auth = await requireAdmin(req)"
echo "   if (!auth.authorized) return auth.response!"
```

---

## Verification Checklist

- [ ] Created `src/lib/auth/requireAdmin.ts`
- [ ] Fixed `src/middleware.ts` line 101 admin role check
- [ ] Updated `/api/admin/clear-all-sessions/route.ts`
- [ ] Updated at least 10 critical admin API routes
- [ ] Replaced or fixed `AuthCheck.tsx`
- [ ] Tested as non-admin user (should be blocked)
- [ ] Tested as admin user (should work normally)
- [ ] Reviewed logs for security warnings
- [ ] Committed changes with message: "🔒 SECURITY: Add admin role verification"
- [ ] Deployed to production ASAP

---

## After Deployment

Monitor your logs for these security events:

```bash
# Watch for unauthorized access attempts
grep "[SECURITY]" logs/application.log

# Expected output:
[SECURITY] Non-admin user abc-123 attempted to access /admin/customers
[SECURITY] Admin def-456 initiating NUCLEAR cleanup
```

---

## Next Steps (This Week)

1. ✅ Security fixes deployed
2. 🔄 Update remaining admin API routes (46 files)
3. 📊 Build real-time dashboard with actual stats
4. 📋 Create audit log viewer UI
5. 🚨 Set up error alerts
6. 📈 Implement analytics dashboard

---

## Support

If you encounter issues:
1. Check browser console for error messages
2. Check server logs for authentication failures
3. Verify environment variables are set correctly
4. Test with a known admin user account

**Remember**: Security first, features second. Don't skip these fixes!

---

Generated: 2025-10-27
Estimated implementation time: 30 minutes
Risk reduction: CRITICAL → LOW
