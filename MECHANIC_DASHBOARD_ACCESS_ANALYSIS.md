# Mechanic Dashboard Sidebar & Access Control Analysis

**Last Updated:** November 8, 2025

## Executive Summary

The mechanic dashboard exposes 10 navigation items to ALL authenticated mechanics without type-based filtering. Critical gaps:

- **Earnings page**: Accessible to workshop employees (whose payments go to workshop, not them)
- **Analytics page**: Accessible to workshop employees (shows personal earnings that don't apply)
- **No sidebar filtering**: All items shown to all mechanic types
- **No API-level checks**: `getMechanicType()` function exists but never enforced

---

## Current Dashboard Navigation (All Mechanics See All 10)

1. Dashboard - /mechanic/dashboard
2. Sessions - /mechanic/sessions  
3. Quotes - /mechanic/quotes
4. CRM - /mechanic/crm
5. **Analytics - /mechanic/analytics** ❌ NEEDS RESTRICTION
6. **Earnings - /mechanic/earnings** ❌ NEEDS RESTRICTION
7. Reviews - /mechanic/reviews
8. Documents - /mechanic/documents
9. Availability - /mechanic/availability
10. Profile - /mechanic/profile

**Source:** `src/components/mechanic/MechanicSidebar.tsx` lines 28-89

---

## Mechanic Type Classification

**Source:** `src/types/mechanic.ts` lines 94-171

### 1. VIRTUAL_ONLY
- No `workshop_id`
- Remote diagnostics only
- Earns 70% + 2% referrals
- Earnings page: RELEVANT

### 2. INDEPENDENT_WORKSHOP
- Has `workshop_id` (owns shop)
- `account_type = 'independent'`
- Can create quotes
- Earnings page: RELEVANT

### 3. WORKSHOP_AFFILIATED  
- Has `workshop_id` (works AT workshop)
- `account_type = 'workshop'`
- Payments go to WORKSHOP not mechanic
- Earnings page: NOT RELEVANT - SHOULD BE BLOCKED

---

## Critical Access Control Gaps

### Gap 1: Earnings Page (CRITICAL)

**Files affected:**
- `src/app/mechanic/earnings/page.tsx`
- `src/app/api/mechanics/earnings/route.ts`

**Problem:** No mechanic_type check. Workshop employees see personal earnings that don't apply.

**API Code (No Type Check):**
```typescript
const { data: sessions } = await supabaseAdmin
  .from('diagnostic_sessions')
  .select(...)
  .eq('mechanic_id', mechanicId)  // ← No type validation
  .eq('status', 'completed')
```

**Missing:** `if (mechanicType === WORKSHOP_AFFILIATED) return 403`

### Gap 2: Analytics Page (CRITICAL)

**Files affected:**
- `src/app/mechanic/analytics/page.tsx`
- `src/app/api/mechanics/analytics/route.ts`

**Problem:** No mechanic_type check. Workshop employees see personal analytics (revenue, earnings, daily breakdown).

**Missing Same Check:** `if (mechanicType === WORKSHOP_AFFILIATED) return 403`

### Gap 3: Sidebar Filtering (HIGH)

**File:** `src/components/mechanic/MechanicSidebar.tsx` lines 182-205

**Problem:** All NAV_ITEMS rendered unconditionally. No filtering by mechanic_type.

```typescript
{NAV_ITEMS.map((item) => {
  // ❌ Renders all items for all mechanics
  return (<Link href={item.href}>...)
})}
```

### Gap 4: Dashboard Differentiation (MEDIUM)

**File:** `src/app/mechanic/dashboard/page.tsx` lines 296-300

**Current:** Routes VIRTUAL_ONLY to separate dashboard. Doesn't differentiate INDEPENDENT_WORKSHOP vs WORKSHOP_AFFILIATED.

```typescript
if (mechanic.service_tier === 'virtual_only') {
  router.replace('/mechanic/dashboard/virtual')
  return
}
// ❌ Both independent and workshop types see same dashboard
```

---

## Access Requirements by Page

| Page | Virtual-Only | Independent | Workshop Employee |
|------|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ⚠️ |
| Sessions | ✅ | ✅ | ✅ |
| Quotes | ⚠️ Limited | ✅ | ⚠️ Role |
| CRM | ✅ | ✅ | ⚠️ |
| Analytics | ✅ | ✅ | **❌ BLOCK** |
| Earnings | ✅ | ✅ | **❌ BLOCK** |
| Reviews | ✅ | ✅ | ✅ |
| Documents | ✅ | ✅ | ✅ |
| Availability | ✅ | ✅ | ✅ |
| Profile | ✅ | ✅ | ✅ |

---

## Quick Fixes Required

### Fix 1: Add API Type Check (Earnings)

**File:** `src/app/api/mechanics/earnings/route.ts`

Add after line 20:
```typescript
const mechanicType = getMechanicType({
  workshop_id: mechanic.workshop_id,
  account_type: mechanic.account_type,
})

if (mechanicType === MechanicType.WORKSHOP_AFFILIATED) {
  return NextResponse.json(
    { error: 'Workshop employees cannot view personal earnings' },
    { status: 403 }
  )
}
```

### Fix 2: Add API Type Check (Analytics)

**File:** `src/app/api/mechanics/analytics/route.ts`

Add same check after auth validation.

### Fix 3: Filter Sidebar Items by Type

**File:** `src/components/mechanic/MechanicSidebar.tsx`

```typescript
const visibleItems = NAV_ITEMS.filter(item => {
  if (mechanicType === 'workshop') {
    return !['earnings', 'analytics'].some(t => item.href.includes(t))
  }
  return true
})

{visibleItems.map((item) => { /* render */ })}
```

---

## Summary Table: What to Block/Allow

| Mechanic Type | Should See Earnings? | Should See Analytics? | Sidebar Items |
|---|---|---|---|
| VIRTUAL_ONLY | YES | YES | All 10 |
| INDEPENDENT_WORKSHOP | YES | YES | All 10 |
| WORKSHOP_AFFILIATED | NO | NO | 8 items (no Earnings/Analytics) |

---

## Current Permission Architecture

**Authentication Only:** `requireMechanicAPI()` checks if authenticated mechanic
**Type Detection:** `getMechanicType()` exists but not called for access control
**Frontend Guards:** `useAuthGuard()` checks role='mechanic' only

**Gap:** No mechanic subtype validation anywhere in access control

---

## Implementation Priority

1. **CRITICAL:** Add mechanic_type check to /api/mechanics/earnings
2. **CRITICAL:** Add mechanic_type check to /api/mechanics/analytics
3. **HIGH:** Filter sidebar items by mechanic type
4. **HIGH:** Update dashboard to differentiate types
5. **MEDIUM:** Add frontend access guards on page load

**Estimated Effort:** 4-6 hours total
**Risk Level:** LOW (isolated changes, no breaking changes)
**Testing:** Test each mechanic type accessing restricted pages

---

## Files Needing Changes

### APIs
- `src/app/api/mechanics/earnings/route.ts` ← Add type check
- `src/app/api/mechanics/analytics/route.ts` ← Add type check

### Components
- `src/components/mechanic/MechanicSidebar.tsx` ← Filter by type

### Pages  
- `src/app/mechanic/dashboard/page.tsx` ← Differentiate dashboards
- `src/app/mechanic/analytics/page.tsx` ← Add access guard
- `src/app/mechanic/earnings/page.tsx` ← Add access guard

---

**Analysis Complete**
