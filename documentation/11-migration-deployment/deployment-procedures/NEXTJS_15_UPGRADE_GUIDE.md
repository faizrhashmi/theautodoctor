# Next.js 15 Upgrade Guide

## Current Version: 14.2.11 → Target: 15.x

## Breaking Changes to Address

### 1. **React 19 Required**
Next.js 15 requires React 19 (currently using React 18)

### 2. **Async Request APIs** (CRITICAL)
The following APIs are now async and require `await`:
- `cookies()`
- `headers()`
- `params`
- `searchParams`

**Example of what needs changing:**

```typescript
// ❌ OLD (Next.js 14)
export default function Page({ params, searchParams }) {
  const id = params.id
  const query = searchParams.query
}

// ✅ NEW (Next.js 15)
export default async function Page({ params, searchParams }) {
  const { id } = await params
  const { query } = await searchParams
}
```

### 3. **fetch() Caching Changes**
- No longer caches by default (was opt-out, now opt-in)
- Must explicitly add `cache: 'force-cache'` to cache

### 4. **Route Handlers Caching**
- GET route handlers are no longer cached by default
- Add `export const dynamic = 'force-static'` to cache

---

## Step-by-Step Upgrade Process

### Phase 1: Pre-Upgrade Checks ✅

**Before upgrading, ensure everything is committed:**

```bash
git status
git add .
git commit -m "Pre Next.js 15 upgrade - working state"
git push
```

**Create a backup branch:**

```bash
git checkout -b nextjs-15-upgrade
```

---

### Phase 2: Update Dependencies

**Option A: Automatic (Recommended)**

```bash
# Use Next.js codemod tool
npx @next/codemod@latest upgrade latest
```

This will:
- Update package.json automatically
- Apply necessary codemods
- Update TypeScript types

**Option B: Manual**

```bash
pnpm add next@latest react@latest react-dom@latest
pnpm add -D @types/react@latest @types/react-dom@latest
```

---

### Phase 3: Apply Breaking Changes

#### 3.1: Update Async Request APIs

**Files that need changes:**

1. **All route handlers using `cookies()` or `headers()`:**

```bash
# Find all files using cookies() or headers()
grep -r "cookies()" --include="*.ts" --include="*.tsx" src/app/api/
grep -r "headers()" --include="*.ts" --include="*.tsx" src/app/api/
```

**Example fixes:**

```typescript
// Before:
import { cookies } from 'next/headers'

export async function GET() {
  const token = cookies().get('auth-token')
  // ...
}

// After:
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')
  // ...
}
```

2. **All page components using `params` or `searchParams`:**

```bash
# Find all page.tsx files
find src/app -name "page.tsx"
```

**Example fixes:**

```typescript
// Before:
export default function Page({ params }: { params: { id: string } }) {
  const sessionId = params.id
  // ...
}

// After:
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params
  // ...
}
```

#### 3.2: Update fetch() Calls

**Files using fetch():**

```bash
grep -r "fetch(" --include="*.ts" --include="*.tsx" src/
```

**Add explicit caching where needed:**

```typescript
// For data that should be cached:
const data = await fetch('https://api.example.com/data', {
  cache: 'force-cache', // Add this
  next: { revalidate: 3600 } // Optional: revalidate after 1 hour
})

// For data that should NOT be cached (default now):
const data = await fetch('https://api.example.com/data', {
  cache: 'no-store' // Explicit, but now default
})
```

#### 3.3: Update Route Handlers

**Add dynamic export to non-cached routes:**

```typescript
// For API routes that should NOT be cached (most of yours)
export const dynamic = 'force-dynamic' // Add this line

export async function GET(request: Request) {
  // Your code
}
```

---

### Phase 4: TypeScript Updates

**Update tsconfig.json if needed:**

```json
{
  "compilerOptions": {
    "target": "ES2022",  // Update if lower
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext"
  }
}
```

---

### Phase 5: Test Everything

**Run type checking:**

```bash
pnpm run typecheck
```

**Fix any type errors that appear**

**Run development server:**

```bash
pnpm dev
```

**Test critical flows:**
1. ✅ Customer session creation (free + paid)
2. ✅ Mechanic queue loading
3. ✅ Real-time updates
4. ✅ File uploads
5. ✅ Authentication (customer + mechanic)
6. ✅ Payment flows

---

### Phase 6: Production Deployment

**Only deploy after thorough testing:**

```bash
# Test build
pnpm build

# If build succeeds:
git add .
git commit -m "Upgrade to Next.js 15"
git push origin nextjs-15-upgrade

# Create PR and merge to main after testing
```

---

## High-Impact Files to Review

Based on your codebase, these files **definitely** need updates:

### API Routes (cookies/headers usage):

```
src/app/api/auth/[...nextauth]/route.ts
src/app/api/mechanic/queue/route.ts
src/app/api/customer/sessions/route.ts
src/app/api/waiver/submit/route.ts
src/lib/supabase/middleware.ts
```

### Pages (params/searchParams usage):

```
src/app/chat/[sessionId]/page.tsx
src/app/video/[sessionId]/page.tsx
src/app/diagnostic/[sessionId]/page.tsx
src/app/mechanic/sessions/[sessionId]/page.tsx
```

### Components (fetch usage):

```
src/components/customer/SessionLauncher.tsx
src/components/customer/SessionWizard.tsx
src/components/mechanic/MechanicQueue.tsx
```

---

## Estimated Time

- **Small project**: 2-4 hours
- **Your project size**: 6-8 hours
  - Phase 2 (Update deps): 10 mins
  - Phase 3 (Breaking changes): 4-5 hours
  - Phase 4 (TypeScript): 30 mins
  - Phase 5 (Testing): 2 hours

---

## Benefits of Next.js 15

✅ **Performance**:
- Faster builds with Turbopack
- Improved hydration
- Better caching control

✅ **Developer Experience**:
- React 19 features (use, useOptimistic, etc.)
- Better error messages
- Improved TypeScript support

✅ **Production**:
- Better memory management
- Improved streaming
- Enhanced ISR

---

## Rollback Plan

If something breaks:

```bash
# Rollback to Next.js 14
git checkout main
git branch -D nextjs-15-upgrade

# Or manual rollback:
pnpm add next@14.2.11 react@18 react-dom@18
pnpm add -D @types/react@18 @types/react-dom@18
```

---

## Do You Want Me To:

1. **Start the upgrade now?** (I'll do it step-by-step with you)
2. **Create a testing checklist first?**
3. **Wait until after your current production deploy?** (Recommended)

The upgrade is **mostly mechanical** - it's about adding `await` in the right places. But testing is critical!
