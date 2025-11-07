# RFQ Recursion - Root Cause Found!

## The Real Problem

The recursion **wasn't** coming from `organization_members` policies alone!

It's actually a **chain reaction** through multiple tables:

```
Customer → workshop_rfq_marketplace → workshop_roles → organization_members → RECURSION!
```

## The Full Chain

1. **Customer visits** `/customer/rfq/my-rfqs`
2. **API queries** `workshop_rfq_marketplace` table
3. **RFQ policy** (line 645-662 in migration) checks:
   ```sql
   EXISTS (
     SELECT 1 FROM workshop_roles wr  -- ← Queries workshop_roles
     WHERE wr.user_id = auth.uid() ...
   )
   ```
4. **workshop_roles RLS policy** triggers and queries:
   ```sql
   SELECT organization_id FROM organization_members  -- ← DIRECT QUERY!
   WHERE user_id = auth.uid() ...
   ```
5. **organization_members RLS policies** trigger
6. **Loop back** → INFINITE RECURSION

## Why V2 Fix Alone Wasn't Enough

**V2 fixed**:
- ✅ `organization_members` policies now use helper functions
- ✅ No recursion WITHIN organization_members table

**V2 didn't fix**:
- ❌ `workshop_roles` policies still query `organization_members` directly
- ❌ This creates recursion when OTHER tables trigger workshop_roles checks

## The Complete Solution

### Fix #1: organization_members (DONE ✅)
- Applied V2 fix
- Uses `is_org_owner_or_admin()` helper function
- No direct queries to organization_members in its own policies

### Fix #2: workshop_roles (NEEDS TO BE APPLIED)
- Update policies to use `user_organizations()` helper
- Replace direct `organization_members` queries
- File: `FIX_WORKSHOP_ROLES_RECURSION.sql`

## What Changes in workshop_roles Fix

### Before (Causes Recursion):
```sql
CREATE POLICY "Workshop members can view roles"
  ON workshop_roles
  FOR SELECT
  USING (
    workshop_id IN (
      SELECT organization_id FROM organization_members  -- ← DIRECT!
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
```

### After (Recursion-Proof):
```sql
CREATE POLICY "Workshop members can view roles"
  ON workshop_roles
  FOR SELECT
  USING (
    workshop_id IN (
      SELECT user_organizations(auth.uid())  -- ← HELPER FUNCTION!
    )
  );
```

## Why This Works

**Helper Functions with SECURITY DEFINER**:
```sql
CREATE FUNCTION user_organizations(user_id UUID)
SECURITY DEFINER  -- ← Bypasses RLS!
AS $$
  SELECT organization_id FROM organization_members
  WHERE user_id = $1 AND status = 'active';
$$;
```

- Function runs with **elevated privileges**
- **Bypasses RLS** when querying organization_members
- **Breaks the recursion chain**

## Apply the Final Fix

### Step 1: Copy the SQL
Open: `FIX_WORKSHOP_ROLES_RECURSION.sql`
Copy all contents

### Step 2: Run in Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. SQL Editor
3. Paste and Run

### Step 3: Test RFQ Page
Visit: http://localhost:3000/customer/rfq/my-rfqs

**Expected**: ✅ Loads without recursion error!

## Why the Verification Passed But Page Failed

**Verification script**:
- Uses `SUPABASE_SERVICE_ROLE_KEY`
- Service role **bypasses ALL RLS policies**
- Never triggers workshop_roles policy chain
- **Result**: Passes even with broken policies

**Actual RFQ page**:
- Uses authenticated user session (customer)
- **Triggers ALL RLS policies** in the chain
- Hits the recursion in workshop_roles
- **Result**: Infinite recursion error

## Files Created

1. ✅ `FIX_ORGANIZATION_MEMBERS_V2_SAFE.sql` - Already applied
2. ✅ `FIX_WORKSHOP_ROLES_RECURSION.sql` - **Apply this now**
3. ✅ `RECURSION_ROOT_CAUSE_FOUND.md` - This file

## Summary

**Problem**: Multiple tables querying organization_members directly → recursion chain
**Solution**: Use helper functions EVERYWHERE, not just in organization_members
**Status**: One more SQL file to apply, then you're done!

---

**Next**: Apply `FIX_WORKSHOP_ROLES_RECURSION.sql` in Supabase Dashboard
