# CRITICAL: Column Mismatch Audit Report
**Date:** November 13, 2025
**Issue:** Multiple API routes using non-existent database columns
**Impact:** 500 errors on mechanics API and potentially other endpoints

---

## ROOT CAUSE

Yesterday's Phase 1 implementation docs referenced columns that **DON'T EXIST** in the database:

### Missing Columns

| Documented Column | Actual Database Column | Table |
|------------------|----------------------|-------|
| ❌ `mechanic_type` | ✅ `participation_mode` | `mechanics` |
| ❌ `address_line1` | ✅ `address` | `organizations` |
| ❌ `state_province` | ✅ `province` | `organizations` |

**Note:** The `profiles` table DOES have `address_line1` and `state_province`, but the `organizations` table uses different names.

---

## ACTUAL DATABASE SCHEMA

### `mechanics` table
- ✅ HAS: `participation_mode`, `can_perform_physical_work`, `account_type`
- ❌ MISSING: `mechanic_type`

### `organizations` table
- ✅ HAS: `address`, `province`, `postal_code`
- ❌ MISSING: `address_line1`, `state_province`

### `profiles` table
- ✅ HAS: `address_line1`, `state_province`, `postal_zip_code`
- ✅ DIFFERENT from organizations!

---

## FILES FIXED

### ✅ Fixed Files

1. **[src/app/api/mechanics/available/route.ts](src/app/api/mechanics/available/route.ts)**
   - Line 57: Changed `mechanic_type` → `participation_mode` in SELECT
   - Line 61-63: Changed `address_line1` → `address`, `state_province` → `province`
   - Line 76: Changed `.neq('mechanic_type', 'virtual_only')` → `.eq('can_perform_physical_work', true)`
   - Line 256: Changed `mechanic.mechanic_type` → `mechanic.participation_mode`
   - Line 260-262: Changed organizations column names to correct ones

---

## FILES THAT NEED FIXING

### 🔴 Critical (Breaking APIs)

1. **[src/app/api/appointments/create-in-person-diagnostic/route.ts](src/app/api/appointments/create-in-person-diagnostic/route.ts:67)**
   ```typescript
   // Line 67: WRONG
   .select('id, user_id, workshop_id, mechanic_type')

   // Should be:
   .select('id, user_id, workshop_id, participation_mode')
   ```

2. **[src/app/api/admin/users/mechanics/[id]/type-history/route.ts](src/app/api/admin/users/mechanics/[id]/type-history/route.ts:22)**
   - References `mechanic_type_change_log` table (may not exist)

3. **[src/app/api/admin/users/mechanics/[id]/update-type/route.ts](src/app/api/admin/users/mechanics/[id]/update-type/route.ts)**
   - Line 96: References `mechanic_type_change_log`
   - Line 111: Uses `mechanic_type` field

4. **[src/app/api/sessions/[id]/end/route.ts](src/app/api/sessions/[id]/end/route.ts)**
   - Line 262, 276: Uses `mechanic_type` in payment metadata

5. **[src/app/api/workshop/mechanics/[mechanicId]/remove/route.ts](src/app/api/workshop/mechanics/[mechanicId]/remove/route.ts:68)**
   - References `mechanic_type_change_log`

### ⚠️  Medium Priority (Frontend Components)

6. **[src/components/customer/scheduling/SearchableMechanicList.tsx](src/components/customer/scheduling/SearchableMechanicList.tsx)**
   - Line 22: TypeScript type defines `mechanic_type`
   - Line 169: Checks `mechanic.mechanic_type === 'virtual_only'`
   - Line 468, 473, 478: Display badges based on `mechanic_type`

7. **[src/components/customer/FavoriteMechanicCard.tsx](src/components/customer/FavoriteMechanicCard.tsx:25)**
   - TypeScript interface has `mechanic_type: string`

---

## RECOMMENDED FIX STRATEGY

### Option 1: Use Existing Columns (RECOMMENDED)

**For mechanic type logic:**
- Use `participation_mode` for type differentiation
- Use `can_perform_physical_work` boolean for virtual-only check
- Use `account_type` for independent vs workshop employee

**For organization addresses:**
- Always use `address`, `province`, `postal_code` when querying `organizations`
- Use `address_line1`, `state_province`, `postal_zip_code` when querying `profiles`

### Option 2: Create Migration (Not Recommended)

Add `mechanic_type` column to mechanics table, but this duplicates existing logic spread across `participation_mode`, `can_perform_physical_work`, and `account_type`.

---

## MAPPING GUIDE

### Mechanic Type Logic

**Old (Documentation):**
```typescript
if (mechanic.mechanic_type === 'virtual_only') {
  // virtual only logic
}
```

**New (Actual Database):**
```typescript
if (!mechanic.can_perform_physical_work) {
  // virtual only logic
}

// OR for more nuance:
if (mechanic.participation_mode === 'virtual') {
  // virtual only logic
}
```

### Workshop/Organization Address

**Wrong (organizations table):**
```typescript
.select(`
  organizations:workshop_id (
    address_line1,
    state_province
  )
`)
```

**Correct (organizations table):**
```typescript
.select(`
  organizations:workshop_id (
    address,
    province
  )
`)
```

---

## TESTING REQUIRED

After fixes:

- [ ] Test `/api/mechanics/available` - mechanics load correctly
- [ ] Test in-person booking flow - mechanics filter correctly
- [ ] Test workshop address display - shows correct address
- [ ] Test admin mechanic type management
- [ ] Test session payment logic
- [ ] Test appointment creation

---

## IMMEDIATE ACTION ITEMS

1. ✅ Fix `/api/mechanics/available` - DONE
2. ⏳ Fix `/api/appointments/create-in-person-diagnostic`
3. ⏳ Fix `/api/sessions/[id]/end`
4. ⏳ Fix `SearchableMechanicList` component
5. ⏳ Fix admin mechanic type routes (or remove if unused)
6. ⏳ Update TypeScript types to match reality
7. ⏳ Test all booking flows

---

## WHY THIS HAPPENED

The Phase 1 implementation docs were written based on an **assumed schema** rather than the **actual database schema**. The column `mechanic_type` was planned but never migrated. The documentation then propagated this non-existent column throughout the codebase.

**Lesson:** Always query the actual database schema before writing code that references columns.

---

**Status:** 🔴 CRITICAL - Multiple breaking issues
**Priority:** P0 - Blocks customer booking flow
**Next Steps:** Fix remaining API routes and components

