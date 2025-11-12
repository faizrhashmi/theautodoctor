# CRITICAL: Address Column Name Standardization

**Date:** 2025-11-10
**Priority:** CRITICAL - Data Consistency Issue
**Status:** In Progress

---

## Root Cause

The `profiles` table has **DUPLICATE COLUMNS** with different names:

### Database Columns (both exist!)
- `province` ✅
- `state_province` ✅
- `postal_code` ✅
- `postal_zip_code` ✅

### TypeScript Types (only know about)
- `state_province` ✅
- `postal_zip_code` ✅

###  Problem
Different parts of the codebase use different column names, causing:
- TypeScript errors
- Data not saving
- Selectors not working
- Inconsistent data access

---

## ONE SOURCE OF TRUTH Decision

**Use TypeScript types as the authoritative source:**
- ✅ **Always use**: `state_province`
- ✅ **Always use**: `postal_zip_code`
- ❌ **Never use**: `province` (for database queries)
- ❌ **Never use**: `postal_code` (for database queries)

**Exception**: Frontend APIs can return `province` and `postal_code` in JSON responses for backward compatibility, but internally map from `state_province` and `postal_zip_code`.

---

## Files That Need Fixing

### ✅ Already Fixed
1. **src/app/api/customer/profile/route.ts**
   - Line 19: Changed `postal_code` → `postal_zip_code` in SELECT
   - Line 47: Maps `postal_zip_code` → `postal_code` in response
   - Line 114: Changed `province` → `state_province` in UPDATE
   - Line 118: Changed `postal_code` → `postal_zip_code` in UPDATE

### ❌ Still Need Fixing

Run this command to find all occurrences:
```bash
grep -r "\.province" src/app --include="*.ts" --include="*.tsx" | grep -v "state_province"
```

Found issues in:
- src/app/api/rfq/create/route.ts
- src/app/customer/profile/page.tsx
- src/app/mechanic/signup/page.tsx
- Various admin pages

---

## Standard Pattern

### For Database Queries
```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('profiles')
  .select('state_province, postal_zip_code')

// ❌ WRONG
const { data } = await supabase
  .from('profiles')
  .select('province, postal_code')  // TypeScript error!
```

### For API Responses (optional mapping)
```typescript
// ✅ CORRECT - Map for backward compatibility
return NextResponse.json({
  profile: {
    province: profile.state_province,      // Map from DB column
    postal_code: profile.postal_zip_code,   // Map from DB column
  }
})
```

### For Frontend State
```typescript
// Frontend can use either, but must send correct names to API
interface ProfileData {
  province: string  // ← Frontend naming
  postal_code: string  // ← Frontend naming
}

// When saving, API maps to correct column names
```

---

## Migration Strategy

1. ✅ Fix customer profile API (DONE)
2. TODO: Fix all other profile-related APIs
3. TODO: Fix mechanic signup
4. TODO: Fix RFQ creation
5. TODO: Fix admin pages
6. TODO: Eventually deprecate duplicate columns in database

---

## Testing Required

After fixing, test:
- [ ] Customer profile save/load
- [ ] Mechanic profile save/load
- [ ] Workshop profile save/load
- [ ] RFQ creation
- [ ] Location selector in all locations
- [ ] Mechanic matching (uses postal codes)

---

This document tracks the standardization effort.
