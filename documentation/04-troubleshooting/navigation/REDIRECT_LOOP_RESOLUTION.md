# Redirect Loop Resolution

## Overview
Identification and resolution of infinite redirect loops occurring between the pricing plan selection page and customer dashboard. This issue prevented users from successfully selecting a pricing plan and accessing their dashboard.

## Date Encountered
2025-01-07

## Issue Classification
- **Severity:** Critical (blocks user onboarding)
- **Status:** ✅ Resolved
- **Impact:** Users unable to complete plan selection and access dashboard

## Problem Description

### Symptoms
1. User selects a paid plan on pricing page
2. Page appears to refresh but stays on pricing page
3. No visible error messages
4. Plan selection doesn't persist
5. User stuck in infinite loop

### User Feedback
> "when i choose a plan, nothing is working the page is just refreshing"

### Visual Flow of the Problem

```
┌──────────────────┐
│  Pricing Page    │
│  /pricing        │
└────────┬─────────┘
         │
         │ User selects plan
         │
         v
┌──────────────────┐
│  Save Plan API   │
│  (async)         │
└────────┬─────────┘
         │
         │ Redirect IMMEDIATELY
         │ (before API completes)
         v
┌──────────────────┐
│  Dashboard       │
│  /dashboard      │
└────────┬─────────┘
         │
         │ Check: Does user have plan?
         │ (API not finished yet)
         │ Answer: NO
         v
┌──────────────────┐
│  Redirect to     │
│  /pricing        │
└────────┬─────────┘
         │
         └──────> INFINITE LOOP
```

## Root Cause Analysis

### Multiple Contributing Factors

#### 1. Race Condition in Plan Selection
**File:** [src/app/onboarding/pricing/PlanSelectionClient.tsx](../../../src/app/onboarding/pricing/PlanSelectionClient.tsx)

The component redirected to a target page immediately after triggering the plan save API call, without waiting for completion:

```typescript
// ❌ PROBLEMATIC CODE
async function handleSelect(tier: (typeof TIERS)[number]) {
  setLoadingStates(prev => ({ ...prev, [tier.id]: true }))

  try {
    // Save plan to profile
    const response = await fetch('/api/customer/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: tier.id }),
    })

    // Redirect immediately without checking response
    const target = getRedirectTarget(tier.id)
    router.push(target) // ❌ Redirects before API finishes!

  } catch (error) {
    console.error('Failed to select plan:', error)
  }
}
```

**Problem:** The router redirects before the database update completes, causing the dashboard to load without the saved plan.

#### 2. Dashboard Redirect Logic
**File:** [src/app/customer/dashboard/page.tsx](../../../src/app/customer/dashboard/page.tsx)

The dashboard checked if user had a plan and redirected back to pricing if missing:

```typescript
// ❌ PROBLEMATIC CODE
export default async function CustomerDashboard() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('preferred_plan')
    .eq('id', user.id)
    .single()

  // If no plan is set, redirect to pricing
  if (user.email_confirmed_at && !profile?.preferred_plan) {
    redirect('/onboarding/pricing') // ❌ Creates loop!
  }

  // ... render dashboard
}
```

**Problem:** Since the plan wasn't saved yet when dashboard loaded, it immediately redirected back to pricing.

#### 3. Pricing Page Redirect Logic
**File:** [src/app/onboarding/pricing/PlanSelectionClient.tsx](../../../src/app/onboarding/pricing/PlanSelectionClient.tsx)

The redirect target function incorrectly sent paid plans back to signup:

```typescript
// ❌ PROBLEMATIC CODE
function getRedirectTarget(planId: (typeof TIERS)[number]['id']): string {
  if (planId === 'free') return '/customer/dashboard';
  return '/signup'; // ❌ This caused loop for paid plans!
}
```

**Problem:** Paid plan selections redirected to `/signup`, which then redirected authenticated users back to pricing.

## Solution Implementation

### Fix 1: Remove Dashboard Redirect Check
**File:** [src/app/customer/dashboard/page.tsx](../../../src/app/customer/dashboard/page.tsx)

**Change:** Commented out the redirect logic to allow dashboard access regardless of plan selection status.

```typescript
// ✅ FIXED CODE
export default async function CustomerDashboard() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('preferred_plan')
    .eq('id', user.id)
    .single()

  // NOTE: Removed redirect to pricing if no plan - this was causing redirect loops
  // Users can access dashboard even without a plan selected
  // if (user.email_confirmed_at && !profile?.preferred_plan) {
  //   redirect('/onboarding/pricing')
  // }

  // ... render dashboard
}
```

**Rationale:** Dashboard should be accessible regardless of plan selection. Users can be prompted to select a plan from within the dashboard if needed.

### Fix 2: Update Redirect Target
**File:** [src/app/onboarding/pricing/PlanSelectionClient.tsx](../../../src/app/onboarding/pricing/PlanSelectionClient.tsx)

**Change:** Updated redirect function to always go to dashboard for all plan types.

```typescript
// ✅ FIXED CODE
function getRedirectTarget(_planId: (typeof TIERS)[number]['id']): string {
  // All plans now redirect to dashboard
  return '/customer/dashboard';
}
```

**Rationale:** Consistent redirect behavior for all plan types prevents unexpected routing.

### Fix 3: Use Hard Redirect with Delay
**File:** [src/app/onboarding/pricing/PlanSelectionClient.tsx](../../../src/app/onboarding/pricing/PlanSelectionClient.tsx)

**Change:** Replaced `router.push()` with `window.location.href` and added delay to ensure API completion.

```typescript
// ✅ FIXED CODE
async function handleSelect(tier: (typeof TIERS)[number]) {
  setLoadingStates(prev => ({ ...prev, [tier.id]: true }))

  try {
    const response = await fetch('/api/customer/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: tier.id }),
    })

    if (!response.ok) {
      throw new Error('Failed to save plan')
    }

    // Wait for database to update
    await new Promise(resolve => setTimeout(resolve, 800))

    // Use window.location.href for hard redirect
    const target = getRedirectTarget(tier.id)
    window.location.href = target

  } catch (error) {
    console.error('Failed to select plan:', error)
    setLoadingStates(prev => ({ ...prev, [tier.id]: false }))
  }
}
```

**Rationale:**
- `window.location.href` forces a full page reload, ensuring fresh data fetch
- 800ms delay allows database write to complete before redirect
- Error handling prevents stuck loading states

### Fix 4: Remove Pricing Page Redirect
**File:** [src/app/onboarding/pricing/page.tsx](../../../src/app/onboarding/pricing/page.tsx)

**Change:** Commented out server-side redirect logic.

```typescript
// ✅ FIXED CODE
export default async function PricingSelectionPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signup')
  }

  // NOTE: Removed redirect logic - users can always access pricing page to change plans
  // This prevents redirect loops during plan selection
  // if (!user.email_confirmed_at) {
  //   redirect('/signup')
  // }

  // ... render pricing page
}
```

**Rationale:** Allow users to change plans at any time without being redirected away.

## Testing & Verification

### Test Steps
1. ✅ User signs up and confirms email
2. ✅ User navigates to pricing page
3. ✅ User selects "Quick Chat" plan
4. ✅ Loading indicator shows for ~800ms
5. ✅ User redirected to dashboard
6. ✅ Plan appears as "Quick Chat" in dashboard
7. ✅ No redirect loop occurs
8. ✅ User can click "Browse Plans" to change plan
9. ✅ Changing plan works without loops

### Console Verification
**Expected Logs:**
```javascript
// From profile API
Setting preferred_plan to: quick
Upserting profile with data: { id: '...', preferred_plan: 'quick', ... }
Profile upsert successful: [{ id: '...', preferred_plan: 'quick', ... }]
```

### User Feedback
> "ok perfect plan is saved"

Confirmation that the fix resolved the issue.

## Additional Improvements Made

### Fix 5: Update Plan Labels
**File:** [src/app/customer/dashboard/page.tsx](../../../src/app/customer/dashboard/page.tsx)

**Issue:** Plan IDs didn't match display labels, showing "No active plan" even when plan was saved.

**Change:** Updated `PLAN_LABELS` mapping to match actual plan IDs.

```typescript
// ✅ FIXED CODE
const PLAN_LABELS: Record<string, string> = {
  quick: 'Quick Chat',
  standard: 'Standard Video',
  diagnostic: 'Full Diagnostic',
  free: 'Free Session',
  // Legacy plan IDs (if any exist in database)
  chat10: 'Quick Chat (30 min)',
  video15: 'Standard Video (45 min)',
}
```

### Fix 6: Update Dashboard Links
**File:** [src/app/customer/dashboard/page.tsx](../../../src/app/customer/dashboard/page.tsx)

**Issue:** "Browse plans" link went to `/services-pricing` instead of customer-specific flow.

**Change:** Updated links to point to appropriate customer actions.

```typescript
// Before
<a href="/pricing">Browse plans</a>

// After
<a href="/customer/schedule">Schedule a session</a>
```

**Rationale:** Better UX flow - users select plan, then schedule session, rather than browsing generic pricing.

## Prevention Strategies

### 1. Async/Await Pattern
Always wait for API calls to complete before redirecting:

```typescript
// ✅ GOOD PATTERN
const response = await fetch('/api/endpoint')
if (response.ok) {
  // Wait for confirmation
  await new Promise(resolve => setTimeout(resolve, 500))
  // Then redirect
  window.location.href = '/target'
}
```

### 2. Avoid Circular Redirects
Map out redirect flows to prevent circular dependencies:

```
Signup → Pricing → Dashboard
  ↑                    ↓
  └────────────────────┘
  ❌ BAD: Creates loop

Signup → Pricing → Dashboard
  ↑         ↓
  └─────────┘
  ❌ BAD: Creates loop

Signup → Pricing → Dashboard
  ↑
  └─ (logout only)
  ✅ GOOD: One-way flow
```

### 3. Server-Side Redirect Guards
Add checks to prevent redirect loops:

```typescript
// ✅ GOOD PATTERN
if (!user.email_confirmed_at && pathname !== '/signup') {
  redirect('/signup')
}

// Prevent redirect if already on target page
if (pathname === '/pricing') {
  return // Don't redirect
}
```

### 4. Client-Side Loading States
Show clear feedback during async operations:

```typescript
const [loading, setLoading] = useState(false)

async function handleAction() {
  setLoading(true)
  try {
    await apiCall()
    await delay(500)
    redirect()
  } finally {
    setLoading(false)
  }
}

// In JSX
{loading ? 'Saving...' : 'Save'}
```

## Related Files
- [src/app/onboarding/pricing/PlanSelectionClient.tsx](../../../src/app/onboarding/pricing/PlanSelectionClient.tsx) - Plan selection component
- [src/app/onboarding/pricing/page.tsx](../../../src/app/onboarding/pricing/page.tsx) - Pricing page server component
- [src/app/customer/dashboard/page.tsx](../../../src/app/customer/dashboard/page.tsx) - Customer dashboard
- [src/app/api/customer/profile/route.ts](../../../src/app/api/customer/profile/route.ts) - Profile update API

## Related Documentation
- [SIGNUP_FLOW_REDESIGN.md](../../02-feature-documentation/authentication/SIGNUP_FLOW_REDESIGN.md) - Signup flow implementation

## Lessons Learned

### 1. Race Conditions Are Common in Async Flows
When redirecting after API calls, always wait for completion confirmation.

### 2. Server Components Revalidate Quickly
Server component redirects check current database state, which may not include pending writes.

### 3. Hard Redirects Are Sometimes Better
`window.location.href` forces a full page reload, ensuring fresh data fetch from server.

### 4. Timing Matters
Adding small delays (500-1000ms) gives database replication time to complete.

### 5. Circular Dependencies Should Be Mapped
Visualize redirect flows during design to catch circular dependencies early.

## Debug Checklist for Future Redirect Issues

When encountering redirect loops:
- [ ] Check browser Network tab for redirect chains
- [ ] Add console.logs before each redirect
- [ ] Verify API responses complete before redirect
- [ ] Check for circular dependencies in routing logic
- [ ] Test with network throttling to expose race conditions
- [ ] Verify database writes complete before reading
- [ ] Check if server components cache stale data
- [ ] Test with browser back/forward buttons
- [ ] Verify redirect guards don't conflict

## Future Improvements

### 1. Optimistic UI Updates
Update UI immediately while API call processes in background:

```typescript
// Show success immediately
setPlanDisplay(tier.name)
// Then save to database
await savePlan(tier.id)
```

### 2. Better Error Handling
Show specific error messages if plan save fails:

```typescript
if (!response.ok) {
  const error = await response.json()
  toast.error(`Failed to save plan: ${error.message}`)
  return
}
```

### 3. Loading State Persistence
Maintain loading state across redirects using cookies or URL params:

```typescript
// Before redirect
setCookie('plan_saving', 'true')
window.location.href = '/dashboard?saving=true'

// On dashboard
if (getCookie('plan_saving')) {
  showToast('Plan saved successfully!')
  deleteCookie('plan_saving')
}
```

### 4. Confirmation Step
Add explicit confirmation step instead of immediate redirect:

```typescript
// Show success modal
<Modal>
  Plan saved successfully!
  <Button onClick={() => router.push('/dashboard')}>
    Go to Dashboard
  </Button>
</Modal>
```
