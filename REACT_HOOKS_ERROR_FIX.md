# React Hooks Error - Fix Guide

**Error:** `TypeError: Cannot read properties of null (reading 'useContext') at usePathname`

## Diagnosis

This error is occurring in Next.js's internal error boundary, which suggests:
1. There's a runtime error in one of your components
2. The error boundary is having trouble rendering due to hot reload state issues

## Solution

### Option 1: Restart Dev Server (Quickest)

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
pnpm dev
```

### Option 2: Clear Cache and Restart

```bash
# Stop the dev server first (Ctrl+C)
# Then clear the .next cache:
rm -rf .next
# Or on Windows:
rmdir /s /q .next

# Restart:
pnpm dev
```

### Option 3: Check for Underlying Errors

The error log shows:
```
GET /api/customer/active-sessions 404 in 3824ms
```

This suggests the real issue might be a missing API endpoint. Let me check if this endpoint exists.

## Verified Components

All these components correctly have `'use client'` directive:
- ✅ `src/app/mechanic/layout.tsx`
- ✅ `src/app/workshop/layout.tsx`
- ✅ `src/components/layout/ConditionalMainWrapper.tsx`
- ✅ `src/components/providers/ClientThemeProvider.tsx`
- ✅ All sidebar components

## Missing API Endpoint

The error shows a 404 for `/api/customer/active-sessions`. You may need to:

1. Create this endpoint, or
2. Update the code that's calling it to use the correct endpoint (`/api/customer/sessions/active`)

## Prevention

To prevent this error in the future:
1. Always add `'use client'` to components that use React hooks
2. Restart your dev server after major changes
3. Clear `.next` cache if you see hydration errors

## Current Status

- ✅ All migration work complete
- ✅ Database schema up to date
- ⚠️ Runtime error needs dev server restart
- 🔧 Missing `/api/customer/active-sessions` endpoint

## Next Steps

1. Restart your dev server
2. Test the customer flow
3. If the error persists, check browser console for the actual underlying error
4. Create the missing API endpoint if needed
