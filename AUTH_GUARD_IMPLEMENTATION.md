# Authentication Guard Implementation Guide

## ✅ What Was Implemented

We've created a comprehensive authentication error handling system that provides:

1. **Clear error messages** - Users see friendly messages like "Your session has expired. Please sign in again."
2. **Automatic redirects** - Unauthenticated users are redirected to the appropriate sign-in page
3. **Loading states** - Users see a professional loading screen while authentication is verified
4. **Role-based access** - Pages can require specific roles (customer, mechanic, admin)

---

## 📦 Components Created

### 1. `useAuthGuard` Hook
**File**: `src/hooks/useAuthGuard.ts`

A custom React hook that handles authentication checking and error handling.

**Features**:
- Automatic authentication verification
- Clear error messages for common auth errors
- Automatic redirect on auth failure
- Role-based access control
- Loading state management

**Usage**:
```typescript
const { user, loading, error, isAuthenticated } = useAuthGuard({
  redirectTo: '/signup',
  requiredRole: 'customer'
})
```

---

### 2. `AuthGuard` Component
**File**: `src/components/AuthGuard.tsx`

A wrapper component that protects entire pages from unauthorized access.

**Features**:
- Wraps page content
- Shows loading state automatically
- Shows error state with clear messages
- Auto-redirects unauthenticated users
- Customizable loading/error components

**Usage**:
```typescript
export default function ProtectedPage() {
  return (
    <AuthGuard requiredRole="customer">
      <YourPageContent />
    </AuthGuard>
  )
}
```

---

## 🚀 How to Apply to Any Page

### Option 1: Using AuthGuard Component (Recommended)

**Before**:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function YourPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signup')
      }
    }
    checkAuth()
  }, [])

  return <div>Your content</div>
}
```

**After**:
```typescript
'use client'

import { AuthGuard } from '@/components/AuthGuard'
import { useAuthGuard } from '@/hooks/useAuthGuard'

function YourPageContent() {
  const { user } = useAuthGuard()

  // Your page logic here
  // user is guaranteed to exist when this renders

  return <div>Your content</div>
}

export default function YourPage() {
  return (
    <AuthGuard requiredRole="customer" redirectTo="/signup?redirect=/your-page">
      <YourPageContent />
    </AuthGuard>
  )
}
```

---

### Option 2: Using useAuthGuard Hook Only

For pages that need more control:

```typescript
'use client'

import { useAuthGuard } from '@/hooks/useAuthGuard'
import { Loader2 } from 'lucide-react'

export default function YourPage() {
  const { user, loading, error, isAuthenticated } = useAuthGuard({
    redirectTo: '/signup',
    requiredRole: 'customer'
  })

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin" />
    </div>
  }

  if (error || !isAuthenticated) {
    return <div className="text-red-500">{error}</div>
  }

  // user is guaranteed to exist here
  return <div>Your authenticated content</div>
}
```

---

## 📋 Pages That Need Auth Guard

### Customer Pages (Priority: HIGH)
Apply `requiredRole="customer"`:

- ✅ `/customer/vehicles/page.tsx` - **DONE** (Reference implementation)
- ⚠️ `/customer/dashboard/page.tsx`
- ⚠️ `/customer/sessions/page.tsx`
- ⚠️ `/customer/quotes/page.tsx`
- ⚠️ `/customer/schedule/page.tsx`

### Mechanic Pages (Priority: HIGH)
Apply `requiredRole="mechanic"`:

- ⚠️ `/mechanic/dashboard/page.tsx`
- ⚠️ `/mechanic/dashboard/virtual/page.tsx`
- ⚠️ `/mechanic/sessions/page.tsx`
- ⚠️ `/mechanic/sessions/virtual/page.tsx`
- ⚠️ `/mechanic/profile/page.tsx`
- ⚠️ `/mechanic/earnings/page.tsx`
- ⚠️ `/mechanic/crm/page.tsx`
- ⚠️ `/mechanic/availability/page.tsx`
- ⚠️ `/mechanic/documents/page.tsx`
- ⚠️ `/mechanic/reviews/page.tsx`
- ⚠️ `/mechanic/analytics/page.tsx`
- ⚠️ `/mechanic/statements/page.tsx`
- ⚠️ `/mechanic/partnerships/browse/page.tsx`
- ⚠️ `/mechanic/partnerships/applications/page.tsx`

### Workshop Pages (Priority: MEDIUM)
Apply `requiredRole="workshop"` or check manually:

- ⚠️ `/workshop/dashboard/page.tsx`
- ⚠️ `/workshop/analytics/page.tsx`

### Admin Pages (Priority: LOW)
Most admin pages already have auth checks, but can be enhanced:

- ⚠️ `/admin/(shell)/**/page.tsx` - Multiple pages

---

## 🔧 Step-by-Step Migration Guide

### Step 1: Import the Components
```typescript
import { AuthGuard } from '@/components/AuthGuard'
import { useAuthGuard } from '@/hooks/useAuthGuard'
```

### Step 2: Rename Your Component
```typescript
// Change this:
export default function YourPage() {

// To this:
function YourPageContent() {
```

### Step 3: Add useAuthGuard Hook
```typescript
function YourPageContent() {
  const { user } = useAuthGuard({ requiredRole: 'customer' })

  // Rest of your component
}
```

### Step 4: Remove Old Auth Checks
```typescript
// REMOVE these:
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  router.push('/signup')
  return
}

// REPLACE with:
if (!user) return // Simple early return
```

### Step 5: Wrap with AuthGuard
```typescript
export default function YourPage() {
  return (
    <AuthGuard requiredRole="customer" redirectTo="/signup?redirect=/your-page">
      <YourPageContent />
    </AuthGuard>
  )
}
```

---

## 💡 Error Messages Reference

The system automatically translates technical Supabase errors into user-friendly messages:

| Technical Error | User-Friendly Message |
|----------------|----------------------|
| `invalid_grant` | Your session has expired. Please sign in again. |
| `invalid_token` | Your session is invalid. Please sign in again. |
| `user_not_found` | User not found. Please sign in again. |
| `session_not_found` | Your session has expired. Please sign in again. |
| `refresh_token_not_found` | Your session has expired. Please sign in again. |
| No user | You are not signed in. Please sign in to continue. |
| Wrong role | Access denied. This page requires [role] access. |

---

## 🎨 Customization Options

### Custom Loading Component
```typescript
<AuthGuard
  loadingComponent={
    <div className="custom-loading">
      <MySpinner />
    </div>
  }
>
  <YourContent />
</AuthGuard>
```

### Custom Error Component
```typescript
<AuthGuard
  errorComponent={
    <div className="custom-error">
      <MyErrorDisplay />
    </div>
  }
>
  <YourContent />
</AuthGuard>
```

### Custom Error Handler
```typescript
const { user } = useAuthGuard({
  onAuthError: (error) => {
    // Log to analytics
    analytics.track('auth_error', { error })

    // Show toast
    toast.error(error)
  }
})
```

---

## 🧪 Testing Auth Errors

To test the auth error handling:

1. **Test Expired Session**:
   - Sign in
   - Wait for session to expire (or manually clear tokens in browser dev tools)
   - Try to access a protected page
   - Should see: "Your session has expired. Please sign in again."

2. **Test No Session**:
   - Open protected page in incognito/private window
   - Should see: "You are not signed in. Please sign in to continue."

3. **Test Wrong Role**:
   - Sign in as customer
   - Try to access mechanic page
   - Should see: "Access denied. This page requires mechanic access."

---

## 📊 Implementation Status

### Completed ✅
- [x] `useAuthGuard` hook created
- [x] `AuthGuard` component created
- [x] Reference implementation on `/customer/vehicles` page
- [x] Error message mapping
- [x] Auto-redirect functionality
- [x] Role-based access control

### In Progress ⚠️
- [ ] Apply to all customer pages
- [ ] Apply to all mechanic pages
- [ ] Apply to workshop pages
- [ ] Apply to admin pages

### Estimated Time
- **Per page**: 5-10 minutes
- **Total customer pages (5)**: 30-50 minutes
- **Total mechanic pages (13)**: 1-2 hours
- **Complete implementation**: 2-3 hours

---

## 🚨 Common Pitfalls to Avoid

### ❌ Don't Do This
```typescript
// Accessing user before checking auth
export default function BadPage() {
  const { user } = useAuthGuard()

  // ERROR: user might be null!
  const name = user.email

  return <div>{name}</div>
}
```

### ✅ Do This Instead
```typescript
export default function GoodPage() {
  const { user } = useAuthGuard()

  // AuthGuard prevents rendering until user exists
  return <div>{user?.email || 'Loading...'}</div>
}

// OR better yet:
function GoodPageContent() {
  const { user } = useAuthGuard()
  // user is guaranteed to exist here
  return <div>{user.email}</div>
}

export default function GoodPage() {
  return (
    <AuthGuard>
      <GoodPageContent />
    </AuthGuard>
  )
}
```

---

## 📞 Support

If you encounter issues:
1. Check browser console for detailed error logs
2. Verify Supabase auth is configured correctly
3. Ensure user roles are set up in database
4. Test with `/customer/vehicles` page as reference

---

## 🎯 Next Steps

1. **Phase 1**: Apply to all customer pages (30-50 min)
2. **Phase 2**: Apply to all mechanic pages (1-2 hours)
3. **Phase 3**: Apply to workshop pages (30 min)
4. **Phase 4**: Test all auth flows (1 hour)
5. **Phase 5**: Document any issues and refine

**Total Estimated Time**: 3-4 hours for complete implementation

---

## 📝 Example: Full Page Migration

### Before
```typescript
// src/app/customer/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/signup')
      return
    }
    setLoading(false)
  }

  if (loading) return <div>Loading...</div>

  return <div>Dashboard content</div>
}
```

### After
```typescript
// src/app/customer/dashboard/page.tsx
'use client'

import { AuthGuard } from '@/components/AuthGuard'
import { useAuthGuard } from '@/hooks/useAuthGuard'

function DashboardContent() {
  const { user } = useAuthGuard({ requiredRole: 'customer' })

  // user is guaranteed to exist here
  // No need for loading state or auth checking!

  return <div>Dashboard content for {user.email}</div>
}

export default function Dashboard() {
  return (
    <AuthGuard requiredRole="customer" redirectTo="/signup?redirect=/customer/dashboard">
      <DashboardContent />
    </AuthGuard>
  )
}
```

**Lines of code reduced**: ~20 lines → ~15 lines
**Auth bugs eliminated**: ✅
**User experience**: Much better with clear error messages!

---

## 🎉 Benefits

1. ✅ **Consistent error handling** across all pages
2. ✅ **Better user experience** with clear messages
3. ✅ **Less code duplication**
4. ✅ **Easier maintenance**
5. ✅ **Automatic redirects** to appropriate pages
6. ✅ **Role-based access control** built-in
7. ✅ **Loading states** handled automatically

---

**Created**: Today
**Last Updated**: Today
**Maintainer**: Development Team
