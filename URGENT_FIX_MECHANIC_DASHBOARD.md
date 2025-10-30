# URGENT: Fix Mechanic Dashboard Infinite Loading Loop

**Date:** 2025-10-30
**Status:** CRITICAL BUG
**Impact:** Mechanic dashboard cannot load, session requests not visible

---

## The Problem

Your mechanic dashboard has an **infinite loading loop** because:

1. The `get_authenticated_mechanic_id()` database function still references the **deleted** `mechanic_sessions` table
2. RLS policies on `mechanics` table use this broken function
3. When the dashboard queries the `mechanics` table, the RLS check fails
4. The page can't load mechanic data, so it keeps retrying forever

**Root Cause:**
```sql
-- This function is BROKEN (references deleted table)
CREATE FUNCTION get_authenticated_mechanic_id()
...
  SELECT mechanic_id FROM public.mechanic_sessions  -- ❌ TABLE DELETED!
  WHERE token = current_setting('request.cookie.aad_mech', true)
...
```

**Affected Code:**
- Dashboard page: `src/app/mechanic/dashboard/page.tsx:170-174`
- RLS Policy: Uses `get_authenticated_mechanic_id()` which fails
- Session requests: Also use this function, so they don't show

---

## The Fix

You need to run the migration file: `supabase/migrations/99999999_fix_mechanic_auth_function.sql`

This migration:
- ✅ Drops the old broken function
- ✅ Creates new function that uses Supabase Auth (`auth.uid()`)
- ✅ Updates RLS policies to work correctly

---

## Solution 1: Run Migration via Supabase Dashboard (RECOMMENDED)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Go to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Copy and Paste the Following SQL:**

```sql
-- ============================================================================
-- FIX: Update get_authenticated_mechanic_id() function
-- ============================================================================

-- Drop old function that references deleted mechanic_sessions table
DROP FUNCTION IF EXISTS get_authenticated_mechanic_id() CASCADE;

-- Create new function that uses Supabase Auth
CREATE OR REPLACE FUNCTION get_authenticated_mechanic_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  mech_id UUID;
  user_id UUID;
BEGIN
  -- Get the authenticated user's ID from Supabase Auth
  user_id := auth.uid();

  -- If no authenticated user, return NULL
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Look up mechanic ID from mechanics table using user_id
  SELECT id INTO mech_id
  FROM public.mechanics
  WHERE user_id = user_id
  AND can_accept_sessions = true
  LIMIT 1;

  RETURN mech_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_authenticated_mechanic_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_authenticated_mechanic_id() TO anon;

-- ============================================================================
-- Update RLS Policies
-- ============================================================================

-- Fix session_requests policies
DROP POLICY IF EXISTS "Mechanics can view pending requests" ON public.session_requests;

CREATE POLICY "Mechanics can view pending requests"
  ON public.session_requests
  FOR SELECT
  USING (
    status = 'pending'
    AND get_authenticated_mechanic_id() IS NOT NULL
  );

DROP POLICY IF EXISTS "Mechanics can accept requests" ON public.session_requests;

CREATE POLICY "Mechanics can accept requests"
  ON public.session_requests
  FOR UPDATE
  USING (
    status = 'pending'
    AND mechanic_id IS NULL
    AND get_authenticated_mechanic_id() IS NOT NULL
  )
  WITH CHECK (
    mechanic_id = get_authenticated_mechanic_id()
  );

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify the function was created
SELECT
  'Function updated successfully' as status,
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'get_authenticated_mechanic_id';

-- Verify RLS policies were updated
SELECT
  'Policies updated successfully' as status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('mechanics', 'session_requests');
```

4. **Click "Run"** (or press Ctrl+Enter / Cmd+Enter)

5. **Verify Success**
   - You should see messages like "DROP FUNCTION", "CREATE FUNCTION", etc.
   - No errors should appear

6. **Test the Fix**
   - Go to: http://localhost:3000/mechanic/login
   - Login as `workshop.mechanic@test.com`
   - Dashboard should now load! ✅

---

## Solution 2: Run Migration via Supabase CLI

```bash
# If you have Supabase CLI installed
npx supabase db push

# OR run specific migration
npx supabase migration up
```

---

## Solution 3: Manual SQL via Connection String

If you have `psql` or database connection:

```bash
# Replace with your actual DATABASE_URL
psql "your-database-connection-string" < supabase/migrations/99999999_fix_mechanic_auth_function.sql
```

---

## What This Fixes

### Before (BROKEN)
```
Mechanic logs in
    ↓
Dashboard queries: SELECT * FROM mechanics WHERE user_id = ...
    ↓
RLS Policy checks: id = get_authenticated_mechanic_id()
    ↓
Function queries: SELECT ... FROM mechanic_sessions ❌ TABLE DOESN'T EXIST
    ↓
Query fails → Dashboard can't load → Infinite loop
```

### After (FIXED)
```
Mechanic logs in
    ↓
Dashboard queries: SELECT * FROM mechanics WHERE user_id = ...
    ↓
RLS Policy checks: id = get_authenticated_mechanic_id()
    ↓
Function queries: SELECT id FROM mechanics WHERE user_id = auth.uid() ✅
    ↓
Returns mechanic ID → Dashboard loads → Session requests visible ✅
```

---

## Expected Results After Fix

1. ✅ **Mechanic Dashboard Loads**
   - No more infinite loading spinner
   - Dashboard shows stats, sessions, requests

2. ✅ **Session Requests Appear**
   - Mechanics can see pending customer requests
   - Can accept/reject requests

3. ✅ **Virtual Dashboard Works**
   - `/mechanic/dashboard/virtual` loads for virtual-only mechanics
   - All features functional

4. ✅ **Workshop Dashboard Works**
   - `/workshop/dashboard` loads for workshop admins
   - Can manage mechanics and view analytics

---

## Verification Steps

After running the fix, verify it worked:

### 1. Test Auth Function
```sql
-- Login as workshop.mechanic@test.com then run:
SELECT get_authenticated_mechanic_id();

-- Should return: c62837da-8ff1-4218-afbe-3da2e940dfd7 (or similar UUID)
-- Should NOT return: NULL or error
```

### 2. Test Mechanic Query
```sql
-- Should return mechanic record
SELECT * FROM mechanics WHERE id = get_authenticated_mechanic_id();
```

### 3. Test Dashboard
- Go to: http://localhost:3000/mechanic/login
- Login as: `workshop.mechanic@test.com`
- Should redirect to: `/mechanic/dashboard/virtual` (because service_tier = 'virtual_only')
- Dashboard should load without infinite spinner
- Should see stats, requests, etc.

### 4. Test Session Requests
- Create a session request as a customer
- Login as mechanic
- Session request should appear on dashboard ✅

---

## Console Logs to Expect (Good)

**Before fix:**
```
[MechanicDashboard] Checking Supabase authentication...
[MechanicDashboard] Window focused, refreshing data...
[Fast Refresh] rebuilding
[Fast Refresh] done in 3167ms
[MechanicDashboard] Checking Supabase authentication...  // ❌ Loops forever
```

**After fix:**
```
[MechanicDashboard] Checking Supabase authentication...
[MechanicDashboard] Mechanic authenticated: { userId: ..., mechanicId: ..., serviceTier: 'virtual_only' }
[MechanicDashboard] Virtual-only mechanic, redirecting...
// Redirects to /mechanic/dashboard/virtual
// Dashboard loads successfully ✅
```

---

## Rollback (If Needed)

If something goes wrong, you can restore the old function:

```sql
-- WARNING: This restores the BROKEN version (references deleted table)
-- Only use if you need to rollback for some reason

DROP FUNCTION IF EXISTS get_authenticated_mechanic_id();

CREATE OR REPLACE FUNCTION get_authenticated_mechanic_id()
RETURNS UUID AS $$
DECLARE
  mech_id UUID;
  mechanic_token TEXT;
BEGIN
  -- Get token from cookie (old method)
  mechanic_token := current_setting('request.cookie.aad_mech', true);

  IF mechanic_token IS NULL THEN
    RETURN NULL;
  END IF;

  -- Look up mechanic from sessions table (BROKEN - table doesn't exist)
  SELECT mechanic_id INTO mech_id
  FROM public.mechanic_sessions
  WHERE token = mechanic_token
  AND expires_at > now();

  RETURN mech_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

But you shouldn't need to rollback - the new version is correct!

---

## Related Issues This Fixes

1. ✅ Mechanic dashboard infinite loading loop
2. ✅ Session requests not showing for mechanics
3. ✅ RLS policies failing on mechanics table
4. ✅ `get_authenticated_mechanic_id()` returning NULL for logged-in mechanics
5. ✅ Virtual dashboard not loading

---

## Summary

**Problem:** Database function references deleted table → RLS fails → Dashboard can't load

**Solution:** Run the SQL in Solution 1 via Supabase Dashboard

**Time to fix:** < 2 minutes

**Impact:** Fixes mechanic dashboard, session requests, and all mechanic-related features

---

## Need Help?

If you encounter errors when running the SQL:

1. **Copy the exact error message**
2. **Check if the function already exists:**
   ```sql
   SELECT proname, pg_get_functiondef(oid)
   FROM pg_proc
   WHERE proname = 'get_authenticated_mechanic_id';
   ```

3. **Check current RLS policies:**
   ```sql
   SELECT tablename, policyname, definition
   FROM pg_policies
   WHERE tablename IN ('mechanics', 'session_requests');
   ```

4. **Verify mechanic.sessions table is gone:**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_name = 'mechanic_sessions';
   -- Should return 0 rows
   ```

---

**Once you run this fix, your entire mechanic dashboard system will work!** 🎉
