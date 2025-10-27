# Quick Start: Apply AuthGuard to All Pages

## ✅ What's Already Done

1. ✅ `useAuthGuard` hook created
2. ✅ `AuthGuard` component created
3. ✅ `/customer/vehicles` - Working reference implementation
4. ✅ Standard template created

---

## 🚀 Super Quick Method (Copy-Paste)

### For ANY Page - 3-Step Process:

#### Step 1: Add imports at top
```typescript
import { AuthGuard } from '@/components/AuthGuard'
import { useAuthGuard } from '@/hooks/useAuthGuard'
```

#### Step 2: Change default export name
```typescript
// BEFORE:
export default function YourPage() {

// AFTER:
function YourPageContent() {
  const { user } = useAuthGuard({ requiredRole: 'customer' }) // or 'mechanic', 'workshop'
```

#### Step 3: Add new default export at END of file
```typescript
export default function YourPage() {
  return (
    <AuthGuard requiredRole="customer" redirectTo="/signup?redirect=/your/path">
      <YourPageContent />
    </AuthGuard>
  )
}
```

**That's it!** ✅

---

## 📋 Pages Checklist

### Customer Pages
Copy exactly as shown below for each page:

#### `/customer/dashboard/page.tsx`
```typescript
// At top, after other imports:
import { AuthGuard } from '@/components/AuthGuard'
import { useAuthGuard } from '@/hooks/useAuthGuard'

// Change line 68 from:
export default function CustomerDashboardPage() {
// To:
function CustomerDashboardPageContent() {
  const { user } = useAuthGuard({ requiredRole: 'customer' })

// At end of file, add:
export default function CustomerDashboardPage() {
  return (
    <AuthGuard requiredRole="customer" redirectTo="/signup?redirect=/customer/dashboard">
      <CustomerDashboardPageContent />
    </AuthGuard>
  )
}
```

#### `/customer/sessions/page.tsx`
```typescript
// Imports
import { AuthGuard } from '@/components/AuthGuard'
import { useAuthGuard } from '@/hooks/useAuthGuard'

// Change line 38:
export default function CustomerSessionsPage() {
// To:
function CustomerSessionsPageContent() {
  const { user } = useAuthGuard({ requiredRole: 'customer' })

// Add at end:
export default function CustomerSessionsPage() {
  return (
    <AuthGuard requiredRole="customer">
      <CustomerSessionsPageContent />
    </AuthGuard>
  )
}
```

#### `/customer/quotes/page.tsx`
Same pattern - replace function name, add hook, wrap with AuthGuard

#### `/customer/schedule/page.tsx`
Same pattern

---

### Mechanic Pages
Same exact pattern, just change role to 'mechanic':

```typescript
const { user } = useAuthGuard({ requiredRole: 'mechanic' })

<AuthGuard requiredRole="mechanic" redirectTo="/mechanic/login">
```

Apply to:
- `/mechanic/dashboard/page.tsx`
- `/mechanic/sessions/page.tsx`
- `/mechanic/profile/page.tsx`
- `/mechanic/earnings/page.tsx`
- And all other mechanic pages...

---

## 🎯 Example: Complete Before/After

### BEFORE
```typescript
'use client'

import { useState } from 'react'

export default function MyPage() {
  const [data, setData] = useState(null)

  return <div>Content</div>
}
```

### AFTER
```typescript
'use client'

import { useState } from 'react'
import { AuthGuard } from '@/components/AuthGuard'
import { useAuthGuard } from '@/hooks/useAuthGuard'

function MyPageContent() {
  const { user } = useAuthGuard({ requiredRole: 'customer' })
  const [data, setData] = useState(null)

  return <div>Content for {user.email}</div>
}

export default function MyPage() {
  return (
    <AuthGuard requiredRole="customer" redirectTo="/signup?redirect=/my/page">
      <MyPageContent />
    </AuthGuard>
  )
}
```

---

## ⚡ Even Faster: Use Find & Replace

### For Customer Pages:

1. Open file
2. Find: `export default function ([A-Za-z]+Page)`
3. Replace with: `function $1Content`
4. Add imports at top
5. Add hook after function declaration
6. Add wrapper at bottom

---

## 📊 Progress Tracking

Mark off as you complete:

### Customer (4 pages)
- [ ] dashboard/page.tsx
- [ ] sessions/page.tsx
- [ ] quotes/page.tsx
- [ ] schedule/page.tsx
- [x] vehicles/page.tsx ✅ DONE

### Mechanic (13 pages)
- [ ] dashboard/page.tsx
- [ ] dashboard/virtual/page.tsx
- [ ] sessions/page.tsx
- [ ] sessions/virtual/page.tsx
- [ ] profile/page.tsx
- [ ] earnings/page.tsx
- [ ] crm/page.tsx
- [ ] availability/page.tsx
- [ ] documents/page.tsx
- [ ] reviews/page.tsx
- [ ] analytics/page.tsx
- [ ] statements/page.tsx
- [ ] partnerships/browse/page.tsx

### Workshop (2 pages)
- [ ] dashboard/page.tsx
- [ ] analytics/page.tsx

---

## 🧪 Testing Each Page

After updating, test with these steps:

1. **Sign out completely**
2. **Clear cookies** (Dev Tools → Application → Cookies → Clear all)
3. **Visit the page**
4. **You should see**:
   - Loading spinner
   - Error message: "You are not signed in..."
   - Alert popup
   - Auto-redirect to signup
5. **Sign in**
6. **Return to page**
7. **Should work normally** ✅

---

## 🎉 Benefits You Get

After applying to all pages:

✅ **No more silent auth failures**
✅ **Clear error messages for users**
✅ **Auto-redirects work perfectly**
✅ **Professional loading states**
✅ **Role-based access control**
✅ **Consistent UX across all pages**
✅ **Less support requests**
✅ **Better security**

---

## 💡 Tips

1. **Start with customer pages** (only 4 pages, quickest wins)
2. **Test each page** after updating
3. **Use the template** - it's in `PAGE_TEMPLATE.tsx`
4. **Don't skip the imports!** Both are required
5. **Keep the user check** - `if (!user) return` as safety

---

## 🆘 Troubleshooting

### Page shows blank screen
- Check: Did you add both imports?
- Check: Did you add the useAuthGuard hook?
- Check: Did you wrap with AuthGuard?

### Infinite redirect loop
- Check: Is redirect URL correct?
- Check: Is role correct ('customer' vs 'mechanic')?

### "User undefined" error
- Make sure you added `const { user } = useAuthGuard()`
- Make sure it's INSIDE the Content component, not outside

---

## 📞 Need Help?

- Reference: `/customer/vehicles/page.tsx` (working example)
- Template: `PAGE_TEMPLATE.tsx` (copy-paste ready)
- Guide: `AUTH_GUARD_IMPLEMENTATION.md` (detailed docs)

---

**Estimated Time**:
- Customer pages: 20-30 minutes (4 pages)
- Mechanic pages: 1-2 hours (13 pages)
- Workshop pages: 15 minutes (2 pages)
- **Total: 2-3 hours for complete platform**

**Difficulty**: ⭐⭐ (Easy - just copy the pattern!)

---

Start with customer dashboard - it's the most visited page and will have the biggest impact! 🚀
