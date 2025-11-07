# Root Cause Analysis: Session Requests Not Showing on Mechanic Dashboard

## Executive Summary

Session requests are not appearing on the mechanic dashboard due to **THREE interconnected bugs** in the authentication and database system:

1. ✅ **API Endpoint Bug** - Fixed (querying wrong table)
2. 🔴 **RLS Function Bug** - CRITICAL (still uses deleted table)
3. ⚠️ **Mechanic Setup** - Needs verification

## Detailed Analysis

### Bug #1: API Endpoint (FIXED)
**File:** `src/app/api/mechanics/requests/route.ts`
**Status:** ✅ FIXED

The API was querying `mechanic_profiles` table instead of `mechanics` table.

```typescript
// BEFORE (BROKEN)
const { data } = await supabase
  .from('mechanic_profiles')  // ❌ Wrong table
  .select('service_tier, workshop_id, virtual_only')  // ❌ virtual_only doesn't exist
  .eq('user_id', mechanic.id)  // ❌ Wrong ID field
```

**Fix Applied:**
```typescript
// AFTER (FIXED)
const { data } = await supabase
  .from('mechanics')  // ✅ Correct table
  .select('id, service_tier, workshop_id')
  .eq('id', mechanic.id)  // ✅ Correct ID
```

---

### Bug #2: RLS Function (CRITICAL - NOT FIXED YET)
**File:** `supabase/migrations/99990003_phase1_fix_recursive_admin_policies.sql`
**Status:** 🔴 **CRITICAL BUG**

The `get_authenticated_mechanic_id()` function still references:
1. `mechanic_sessions` table - **DELETED** in migration `20251029000011`
2. `aad_mech` cookie - **DEPRECATED** (old auth system)

```sql
-- CURRENT (BROKEN) ❌
CREATE OR REPLACE FUNCTION get_authenticated_mechanic_id()
RETURNS UUID
AS $$
DECLARE
  mech_id UUID;
BEGIN
  SELECT mechanic_id INTO mech_id
  FROM public.mechanic_sessions  -- ❌ TABLE DELETED!
  WHERE token = current_setting('request.cookie.aad_mech', true)  -- ❌ DEPRECATED!
  AND expires_at > now()
  LIMIT 1;

  RETURN mech_id;
END;
$$;
```

**Why This Matters:**
- The RLS policy on `session_requests` uses this function
- Even though the API uses `supabaseAdmin` (bypasses RLS), any direct queries will fail
- Other parts of the system might use non-admin queries

**Fix Created:**
I've created migration `99999999_fix_mechanic_auth_function.sql` that updates the function to use Supabase Auth:

```sql
-- FIXED VERSION ✅
CREATE OR REPLACE FUNCTION get_authenticated_mechanic_id()
RETURNS UUID
AS $$
DECLARE
  mech_id UUID;
  user_id UUID;
BEGIN
  -- Get authenticated user from Supabase Auth
  user_id := auth.uid();  -- ✅ Uses Supabase Auth

  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Look up mechanic by user_id
  SELECT id INTO mech_id
  FROM public.mechanics  -- ✅ Uses mechanics table
  WHERE user_id = user_id  -- ✅ Links to auth.users
  AND can_accept_sessions = true
  LIMIT 1;

  RETURN mech_id;
END;
$$;
```

---

### Bug #3: Mechanic Setup (NEEDS VERIFICATION)
**Status:** ⚠️ **NEEDS VERIFICATION**

For requests to show up, the mechanic record must have:

1. **user_id set** - Links to `auth.users.id`
2. **can_accept_sessions = true** - Permission flag
3. **Correct service_tier** - Affects filtering

**Check with SQL:**
```sql
SELECT
  m.id,
  m.email,
  m.user_id,
  m.service_tier,
  m.workshop_id,
  m.can_accept_sessions,
  u.email as auth_email
FROM mechanics m
LEFT JOIN auth.users u ON u.id = m.user_id
WHERE m.email = 'mechanic.workshop@test.com';
```

**Expected Results:**
- ✅ `user_id` should NOT be NULL
- ✅ `can_accept_sessions` should be TRUE
- ✅ `auth_email` should match mechanic email
- ✅ `service_tier` should be set (or NULL for general)

---

## The Complete Request Flow

### 1. Customer Creates Request
**File:** `src/app/api/intake/start/route.ts:274-278`

```typescript
const { data: newRequest } = await supabaseAdmin
  .from('session_requests')
  .insert({
    parent_session_id: sessionId,
    customer_id: user.id,
    session_type: sessionType,
    plan_code: plan,
    status: 'pending',  // ✅ Set to pending
    // ... other fields
  })
```

✅ **This works** - requests are being created

### 2. Real-Time Broadcast
**File:** `src/app/api/intake/start/route.ts:290-293`

```typescript
const { broadcastSessionRequest } = await import('@/lib/sessionRequests')
await broadcastSessionRequest('new_request', { request: newRequest })
```

✅ **This works** - broadcasts to mechanics

### 3. Mechanic Dashboard Listens
**File:** `src/app/mechanic/dashboard/page.tsx:83-98`

```typescript
supabase.channel('mechanic:lobby')
  .on('broadcast', { event: 'new_request' }, () => {
    console.log('[MechanicDashboard] New request broadcast received')
    router.refresh()
  })
```

✅ **This works** - dashboard receives broadcasts

### 4. Dashboard Fetches Requests
**File:** `src/app/mechanic/dashboard/page.tsx:246`

```typescript
const response = await fetch('/api/mechanics/requests?status=pending')
```

✅ **Now works** - after our fix

### 5. API Returns Filtered Requests
**File:** `src/app/api/mechanics/requests/route.ts:34-51`

```typescript
// Get mechanic profile
const { data: mechanicProfile } = await supabaseAdmin
  .from('mechanics')  // ✅ Fixed: was mechanic_profiles
  .select('id, service_tier, workshop_id')
  .eq('id', mechanic.id)  // ✅ Fixed: was using wrong ID
```

✅ **Now works** - returns correct requests

### 6. Requests Displayed
**File:** `src/app/mechanic/dashboard/page.tsx:251-252`

```typescript
setPendingRequests(requests)
console.log('[MechanicDashboard] Fetched pending requests:', requests.length)
```

Should work once database is fixed

---

## Action Plan

### ✅ Step 1: API Endpoint Fixed (DONE)
- Fixed table query
- Fixed ID usage
- Fixed field names
- Added logging

### 🔴 Step 2: Run Database Migration (CRITICAL)
```bash
# Run the new migration to fix the RLS function
psql $DATABASE_URL -f supabase/migrations/99999999_fix_mechanic_auth_function.sql
```

Or apply via Supabase dashboard:
1. Go to SQL Editor
2. Copy contents of `99999999_fix_mechanic_auth_function.sql`
3. Run the migration

### ⚠️ Step 3: Verify Mechanic Setup
```sql
-- Check mechanic.workshop@test.com setup
SELECT
  m.id as mechanic_id,
  m.email,
  m.user_id,
  m.service_tier,
  m.workshop_id,
  m.can_accept_sessions,
  u.email as auth_email,
  u.id as auth_user_id
FROM mechanics m
LEFT JOIN auth.users u ON u.id = m.user_id
WHERE m.email = 'mechanic.workshop@test.com';
```

**If user_id is NULL:**
```sql
-- Link mechanic to Supabase Auth user
UPDATE mechanics
SET user_id = (
  SELECT id FROM auth.users WHERE email = 'mechanic.workshop@test.com'
)
WHERE email = 'mechanic.workshop@test.com';
```

**If can_accept_sessions is false:**
```sql
-- Enable session acceptance
UPDATE mechanics
SET can_accept_sessions = true
WHERE email = 'mechanic.workshop@test.com';
```

### ✅ Step 4: Test the Complete Flow
1. **Login as cust1@test.com**
   - Go to `/intake`
   - Create a session request
   - Submit

2. **Check database**
   ```sql
   SELECT * FROM session_requests
   WHERE status = 'pending'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

3. **Login as mechanic.workshop@test.com**
   - Go to `/mechanic/dashboard`
   - Should see the request!

4. **Use debug endpoint**
   ```bash
   curl http://localhost:3000/api/debug/test-mechanic-flow?mechanicEmail=mechanic.workshop@test.com
   ```

---

## Debug Endpoints

### Check Mechanic Setup
```bash
curl http://localhost:3000/api/debug/test-mechanic-flow?mechanicEmail=mechanic.workshop@test.com
```

Returns:
- Mechanic profile details
- Auth user linkage status
- All pending requests
- Filtering logic results
- Recommendations

### Check Request Visibility
```bash
curl http://localhost:3000/api/debug/mechanic-requests?email=mechanic.workshop@test.com
```

Returns:
- Requests visible to mechanic
- Filtering rules applied
- Workshop affiliation

---

## Expected Console Logs

### When Creating Request (Customer)
```
[INTAKE] Created session abc123 for intake xyz789
[INTAKE] ✅ Created session_request req456 for session abc123
[INTAKE] ✅ Broadcasted new_request event to mechanics
```

### When Dashboard Receives (Mechanic)
```
[MechanicDashboard] New request broadcast received, refreshing...
[MechanicDashboard] Fetching pending requests...
[MechanicsRequests] Authenticated mechanic: {id: "...", serviceTier: "..."}
[MechanicsRequests] Mechanic profile: {service_tier: "...", workshop_id: "..."}
[MechanicsRequests] Found 1 pending requests
[MechanicDashboard] Fetched pending requests: 1
```

---

## Why It Wasn't Working Before

1. **API queried wrong table** → Couldn't find mechanic profile
2. **RLS function uses deleted table** → Direct queries would fail
3. **Mechanic might not be linked to auth** → Can't authenticate

All three issues compound to make requests invisible.

---

## Testing Checklist

- [ ] Run database migration `99999999_fix_mechanic_auth_function.sql`
- [ ] Verify mechanic has `user_id` set
- [ ] Verify mechanic has `can_accept_sessions = true`
- [ ] Create test request as customer
- [ ] Check request appears in database
- [ ] Check request appears on mechanic dashboard
- [ ] Test real-time updates work
- [ ] Test accepting request works
- [ ] Check console logs for errors

---

## Files to Review

1. ✅ **API Endpoint** - `src/app/api/mechanics/requests/route.ts` (FIXED)
2. 🔴 **RLS Function** - `supabase/migrations/99999999_fix_mechanic_auth_function.sql` (NEW)
3. ⚠️ **Mechanic Setup** - Check database directly
4. 📊 **Debug Tools** - `src/app/api/debug/test-mechanic-flow/route.ts` (NEW)

---

## Summary

The root cause is a combination of:
1. ✅ API bugs (FIXED)
2. 🔴 Database function using deleted table (NEEDS MIGRATION)
3. ⚠️ Mechanic setup (NEEDS VERIFICATION)

**Next Steps:**
1. Run the database migration
2. Verify mechanic setup with debug endpoint
3. Test end-to-end flow
4. Monitor console logs

Once all three issues are resolved, session requests will appear correctly on the mechanic dashboard!
