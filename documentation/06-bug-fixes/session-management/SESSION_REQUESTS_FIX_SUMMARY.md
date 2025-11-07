# Session Requests Not Showing - Bug Fix Summary

## Problem
Session requests from customers were not appearing on the mechanic dashboard for `mechanic.workshop@test.com` even when `cust1@test.com` created a request.

## Root Cause
The `/api/mechanics/requests` endpoint had **three critical bugs**:

### Bug 1: Wrong Table Query
**Location:** `src/app/api/mechanics/requests/route.ts:31-33`

```typescript
// WRONG - Querying wrong table
const { data: mechanicProfile, error: profileError } = await supabase
  .from('mechanic_profiles')  // ❌ Wrong table!
  .select('service_tier, workshop_id, virtual_only')
  .eq('user_id', mechanic.id)  // ❌ Using mechanic ID as user_id!
  .single();
```

**Problem:**
- Was querying `mechanic_profiles` table instead of `mechanics` table
- The `mechanics` table is the primary source for mechanic data after Supabase Auth migration
- `mechanic_profiles` is a separate table for additional profile information only

### Bug 2: Wrong ID Used for Query
The auth guard returns `mechanic.id` (from mechanics table primary key), but the code was using it as `user_id` which is incorrect.

**Correct approach:**
```typescript
// CORRECT - Query mechanics table with mechanic ID
const { data: mechanicProfile, error: profileError } = await supabase
  .from('mechanics')  // ✅ Correct table!
  .select('id, service_tier, workshop_id, user_id')
  .eq('id', mechanic.id)  // ✅ Use mechanic.id correctly!
  .single();
```

### Bug 3: Non-existent Field
**Location:** Line 76

```typescript
// WRONG - Field doesn't exist
if (mechanicProfile.virtual_only) {  // ❌ virtual_only doesn't exist!
```

**Problem:**
- The database schema doesn't have a `virtual_only` field
- The correct field is `service_tier` with value `'virtual_only'`

**Correct approach:**
```typescript
// CORRECT - Check service_tier instead
if (mechanicProfile.service_tier === 'virtual_only') {  // ✅ Correct!
```

## Files Modified

### 1. Fixed Main API Endpoint
**File:** `src/app/api/mechanics/requests/route.ts`

**Changes:**
- ✅ Changed query from `mechanic_profiles` to `mechanics` table
- ✅ Use correct ID field: `eq('id', mechanic.id)` instead of `eq('user_id', mechanic.id)`
- ✅ Query correct fields: `service_tier, workshop_id` (removed non-existent `virtual_only`)
- ✅ Fixed filtering logic to use `service_tier === 'virtual_only'` instead of `virtual_only` field
- ✅ Added better error logging with details
- ✅ Added console logs to debug filtering logic

### 2. Created Debug Endpoint
**File:** `src/app/api/debug/mechanic-requests/route.ts` (NEW)

This endpoint helps diagnose why requests aren't showing up for a specific mechanic.

## How the Fix Works

### Before Fix:
1. Mechanic logs in ✅
2. Dashboard tries to fetch pending requests ❌
3. API queries wrong table with wrong ID ❌
4. Query fails or returns no data ❌
5. No requests show on dashboard ❌

### After Fix:
1. Mechanic logs in ✅
2. Dashboard tries to fetch pending requests ✅
3. API queries `mechanics` table with correct mechanic ID ✅
4. Gets mechanic's `service_tier` and `workshop_id` ✅
5. Applies correct filtering based on mechanic type ✅
6. Returns visible session requests ✅

## Mechanic Types & Filtering Logic

The endpoint now correctly filters requests based on mechanic type:

### 1. Virtual-Only Mechanics (`service_tier = 'virtual_only'`)
- **Can see:** Only virtual, diagnostic, and chat sessions
- **Cannot see:** Workshop or physical service requests

### 2. Workshop-Affiliated Mechanics (`service_tier = 'workshop_affiliated'` + has `workshop_id`)
- **Can see:**
  - Requests assigned to their workshop
  - General requests (no workshop assigned)
- **Cannot see:** Requests assigned to other workshops

### 3. Independent Mechanics (no workshop affiliation)
- **Can see:** Only general requests (no workshop assigned)
- **Cannot see:** Requests assigned to any workshop

## Testing Instructions

### Test 1: Verify with Debug Endpoint

```bash
# Check what requests mechanic.workshop@test.com should see
curl http://localhost:3000/api/debug/mechanic-requests?email=mechanic.workshop@test.com
```

**Expected Response:**
```json
{
  "mechanic": {
    "id": "...",
    "name": "...",
    "email": "mechanic.workshop@test.com",
    "service_tier": "...",  // e.g., "workshop_affiliated" or null
    "workshop_id": "...",   // if affiliated with workshop
    "user_id": "..."
  },
  "requests": {
    "total_pending": 1,  // Total requests in system
    "visible_to_mechanic": 1,  // Requests this mechanic should see
    "all_requests": [...],
    "filtered_requests": [...]  // What actually shows
  },
  "filtering_applied": {
    "service_tier": "...",
    "workshop_id": "...",
    "rule": "..."  // Explains which filtering rule applied
  }
}
```

### Test 2: Manual Dashboard Test

1. **Create a test request as customer:**
   - Login as `cust1@test.com`
   - Go to `/intake` or start page
   - Create a new session request
   - Submit it

2. **Check mechanic dashboard:**
   - Login as `mechanic.workshop@test.com`
   - Go to `/mechanic/dashboard`
   - **Expected:** Request should now appear in "New Service Requests" section

3. **Check browser console:**
   Look for these logs:
   ```
   [MechanicsRequests] Authenticated mechanic: {id: "...", serviceTier: "...", userId: "..."}
   [MechanicsRequests] Mechanic profile: {service_tier: "...", workshop_id: "..."}
   [MechanicsRequests] Found X pending requests
   ```

### Test 3: Real-time Updates

With the dashboard open:
1. Create a new request from another browser/incognito window
2. Dashboard should automatically refresh and show the new request
3. Check console for real-time update logs

## Troubleshooting

### If requests still don't show:

#### 1. Check mechanic's service_tier
```bash
curl http://localhost:3000/api/debug/mechanic-requests?email=mechanic.workshop@test.com
```
Look at the `filtering_applied` section to see which rule is being used.

#### 2. Check if request has workshop_id
If the session request was created with a `workshop_id`, it will only be visible to:
- Mechanics from that specific workshop
- Admin users

#### 3. Check request status
Requests must have `status = 'pending'` to show on the dashboard.

#### 4. Check authentication
Make sure the mechanic is properly authenticated:
- Browser console should show successful auth logs
- `/api/mechanics/me` should return mechanic data

#### 5. Database Schema Check
Verify the mechanics table has these columns:
- `id` (primary key)
- `user_id` (references auth.users)
- `service_tier` (text, nullable)
- `workshop_id` (UUID, nullable)

## Database Migration Notes

This fix is compatible with the **Unified Supabase Auth** system where:
- Mechanics authenticate through `auth.users` (Supabase Auth)
- Mechanic details are stored in `mechanics` table
- `mechanics.user_id` links to `auth.users.id`
- Old `mechanic_sessions` table has been deprecated
- Old `aad_mech` cookie authentication has been removed

## Additional Improvements Made

1. **Better Error Logging**
   - Now logs mechanic ID, service tier, and user ID
   - Shows filtering logic being applied
   - Returns detailed error messages

2. **Debug Endpoint**
   - Helps diagnose why requests aren't showing
   - Shows filtering logic in action
   - Reveals mechanic profile data

3. **Code Comments**
   - Added explanations for filtering logic
   - Documented mechanic types
   - Clarified ID usage

## Next Steps

1. **Test with real data**
   - Login as `mechanic.workshop@test.com`
   - Create request as `cust1@test.com`
   - Verify request appears

2. **Monitor logs**
   - Check browser console
   - Check API logs
   - Use debug endpoint

3. **Verify real-time updates**
   - Test with multiple browsers
   - Verify Supabase real-time subscriptions work

## Related Files

- `src/app/api/mechanics/requests/route.ts` - Main API endpoint (FIXED)
- `src/app/mechanic/dashboard/page.tsx` - Dashboard UI
- `src/lib/auth/guards.ts` - Authentication guards
- `src/types/supabase.ts` - Database schema types
- `src/app/api/debug/mechanic-requests/route.ts` - Debug endpoint (NEW)

## Success Criteria

✅ Mechanic dashboard loads without errors
✅ Pending requests appear in "New Service Requests" section
✅ Requests are filtered correctly based on mechanic type
✅ Real-time updates work when new requests are created
✅ Debug endpoint shows correct filtering logic
✅ Console logs show successful authentication and data fetching
