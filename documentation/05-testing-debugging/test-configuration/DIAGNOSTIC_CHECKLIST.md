# 🔍 DIAGNOSTIC CHECKLIST
## Finding Why Session Requests Don't Appear in Production

**Context**: Same database used for dev and production, but session requests appear immediately in dev and not in production.

---

## ✅ PRE-FLIGHT CHECK

Before starting diagnostics, verify:

- [ ] Recent fix (commit `50465f6`) is deployed to production
- [ ] Production is using the same Supabase project as development
- [ ] You have access to:
  - [ ] Production mechanic dashboard URL
  - [ ] Production server logs (Render/Vercel)
  - [ ] Supabase Dashboard with admin access
  - [ ] Browser DevTools (Chrome recommended)

---

## 🎯 DIAGNOSTIC STEPS (Follow in Order)

### STEP 1: Check Realtime Subscription Status

**Where**: Production mechanic dashboard browser console

**How**:
1. Open production mechanic dashboard: `https://your-production-site.com/mechanic/dashboard`
2. Open Chrome DevTools: Press `F12` or Right-click → Inspect
3. Go to **Console** tab
4. Look for subscription logs

**What to Look For**:

```javascript
// ✅ GOOD - Connection working
[MechanicDashboard] Setting up real-time subscriptions
[MechanicDashboard] Subscription status: SUBSCRIBED
✓ Real-time connection established

// ❌ BAD - Connection failed
[MechanicDashboard] Subscription status: CHANNEL_ERROR
[MechanicDashboard] Subscription status: TIMED_OUT
[MechanicDashboard] Subscription status: CLOSED
```

**Result**:
- [ ] ✅ SUBSCRIBED (go to Step 2)
- [ ] ❌ CHANNEL_ERROR (go to Fix 1A)
- [ ] ❌ TIMED_OUT (go to Fix 1B)
- [ ] ❌ CLOSED (go to Fix 1C)

---

### FIX 1A: CHANNEL_ERROR - Realtime Not Enabled

**Cause**: Realtime replication is disabled on `session_assignments` table

**Solution**:
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your **production project**
3. Click **Database** (left sidebar)
4. Click **Replication**
5. Find `session_assignments` in the table list
6. **Toggle it ON** if it's disabled
7. Wait 30 seconds for changes to propagate
8. Refresh production mechanic dashboard
9. Check console again for `SUBSCRIBED`

**Verification**:
```sql
-- Run in Supabase SQL Editor
SELECT
  tablename,
  EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE tablename = 'session_assignments'
      AND pubname = 'supabase_realtime'
  ) AS realtime_enabled
FROM pg_tables
WHERE tablename = 'session_assignments';

-- Should return: realtime_enabled = true
```

- [ ] Realtime enabled in dashboard
- [ ] SQL query confirms `realtime_enabled = true`
- [ ] Dashboard shows `SUBSCRIBED` after refresh

---

### FIX 1B: TIMED_OUT - Network or Project Issues

**Possible Causes**:
1. Supabase project is paused/sleeping (free tier)
2. Network connectivity issues
3. Firewall blocking WebSocket connections

**Solution A - Check Project Status**:
1. Go to Supabase Dashboard → **Settings** → **General**
2. Check **Project Status**
3. Should show: **"Active"** with green indicator

If status is "Paused" or "Sleeping":
- Click **"Resume Project"**
- Wait 2-3 minutes for project to wake up
- Refresh dashboard and check console

**Solution B - Check Network**:
1. Open DevTools → **Network** tab
2. Filter for `wss://` (WebSocket connections)
3. Look for connection to Supabase realtime
4. Check if connection is established or failing

**Solution C - Test Direct Connection**:
```bash
# Open: public/test-realtime-assignments.html
# Enter production credentials
# Check if connection succeeds
```

- [ ] Project status is "Active"
- [ ] WebSocket connection visible in Network tab
- [ ] Direct test page connects successfully

---

### FIX 1C: CLOSED - Connection Dropped

**Cause**: WebSocket connection established but then closed

**Check Console for Errors**:
```javascript
// Look for these patterns:
WebSocket connection closed
Realtime connection error: ...
Auth token expired
```

**Possible Solutions**:
1. **Auth token expired**: Refresh the page
2. **Connection instability**: Check server location vs Supabase region
3. **Rate limiting**: Check Supabase usage metrics

- [ ] Error message identified
- [ ] Appropriate fix applied
- [ ] Connection stays `SUBSCRIBED` after reconnecting

---

### STEP 2: Verify Assignment Creation in Database

**Where**: Supabase Dashboard → Table Editor

**How**:
1. In another tab, create a free session in production:
   - Go to: `https://your-production-site.com/intake/start`
   - Select "Free Trial" plan
   - Fill out vehicle info
   - Submit and sign waiver
2. Immediately go to Supabase Dashboard
3. Click **Table Editor** (left sidebar)
4. Select `session_assignments` table
5. Sort by `created_at` descending (newest first)
6. Look for new row created in last minute

**What to Check**:

```
Recent row should have:
- id: [UUID]
- session_id: [UUID] (not null)
- status: 'queued' (should be queued for mechanics to see)
- mechanic_id: null (not assigned yet)
- created_at: [Recent timestamp]
```

**Result**:
- [ ] ✅ Assignment exists with `status = 'queued'` (go to Step 3)
- [ ] ❌ Assignment exists with different status (go to Fix 2A)
- [ ] ❌ No assignment exists (go to Fix 2B)

---

### FIX 2A: Assignment Exists But Wrong Status

**Problem**: Assignment created but status is not `queued`

**Check Status**:
```sql
-- Run in Supabase SQL Editor
SELECT
  sa.id,
  sa.status AS assignment_status,
  sa.created_at,
  s.id AS session_id,
  s.status AS session_status,
  s.metadata->>'payment_method' AS payment_method
FROM session_assignments sa
JOIN sessions s ON sa.session_id = s.id
WHERE sa.created_at > NOW() - INTERVAL '1 hour'
ORDER BY sa.created_at DESC
LIMIT 5;
```

**Expected for Free Sessions**:
- `assignment_status`: Should be `'queued'` (mechanics can accept)
- `session_status`: Should be `'pending'` (waiting for mechanic)
- `payment_method`: Should be `'free'`

**If status is**:
- `pending_waiver`: Waiver not signed yet (expected before waiver)
- `completed`: Session already finished (shouldn't happen)
- `cancelled`: Session was cancelled
- `expired`: Session expired (check timeout)

**Action**: Determine why status is incorrect and fix root cause

- [ ] Status identified
- [ ] Root cause found
- [ ] Fix implemented

---

### FIX 2B: No Assignment Exists

**Problem**: Waiver submitted but no assignment created

**Check Server Logs**:

**In Render Dashboard**:
1. Go to your service
2. Click **Logs** tab
3. Search for `[waiver]` (use Ctrl+F)

**In Vercel Dashboard**:
1. Go to your project
2. Click **Logs**
3. Filter by time range (last 10 minutes)
4. Search for `waiver` or `assignment`

**What to Look For**:

```bash
# ✅ GOOD - Assignment created
[waiver] ✅ Created assignment {id} with status: queued
[waiver] ✅ Broadcasted assignment to mechanics

# ❌ BAD - Error occurred
[waiver] ❌ Failed to create assignment: ...
[waiver] Insert error: ...
[waiver] Error creating assignment: ...
```

**If Error Found**:
- Copy full error message
- Check error type:
  - Foreign key violation: Session doesn't exist
  - Unique constraint: Duplicate assignment
  - Permission denied: RLS blocking insert
  - Timeout: Database overloaded

**Common Fixes**:
1. **Foreign key violation**: Session wasn't created properly
2. **Permission error**: Service role key not set correctly
3. **Timeout**: Database under heavy load, retry

- [ ] Server logs checked
- [ ] Error identified (if any)
- [ ] Root cause determined
- [ ] Fix applied

---

### STEP 3: Check Assignment Visibility to Mechanics

**Where**: Production mechanic dashboard

**How**:
1. Open production mechanic dashboard
2. Look for "Available Requests" or "Queue" section
3. Count visible assignments

**Also Check API Directly**:
```javascript
// In browser console
fetch('/api/mechanic/queue')
  .then(r => r.json())
  .then(data => {
    console.log('Queue count:', data.count)
    console.log('Assignments:', data.queue)
  })
```

**Result**:
- [ ] ✅ Assignment visible in UI (Issue resolved!)
- [ ] ✅ Assignment in API response but not in UI (go to Fix 3A)
- [ ] ❌ Assignment not in API response (go to Fix 3B)

---

### FIX 3A: Assignment in API But Not in UI

**Problem**: Data is correct but UI not showing it

**Check UI State**:
```javascript
// In browser console while on mechanic dashboard
// Look for React DevTools or inspect component state

// Check if queue state has data
console.log(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)
```

**Possible Causes**:
1. UI filtering assignments (workshop/tier mismatch)
2. React state not updating
3. Assignment status not matching expected values

**Solution**:
1. Check mechanic profile:
   ```sql
   -- What tier/workshop is this mechanic?
   SELECT id, service_tier, workshop_id
   FROM mechanics
   WHERE user_id = 'current-mechanic-user-id';
   ```

2. Check assignment metadata:
   ```sql
   -- Does assignment have workshop restriction?
   SELECT
     id,
     metadata->>'workshop_id' AS restricted_to_workshop,
     status
   FROM session_assignments
   WHERE id = 'assignment-id';
   ```

3. Check client-side filtering logic in:
   - `src/app/api/mechanic/queue/route.ts` (lines 80-107)
   - `src/app/mechanic/dashboard/page.tsx` (queue rendering)

- [ ] Mechanic tier/workshop identified
- [ ] Assignment metadata checked
- [ ] Filtering logic reviewed
- [ ] UI displays assignments correctly

---

### FIX 3B: Assignment Not in API Response

**Problem**: Assignment exists in DB but API doesn't return it

**Check RLS Policies**:

```sql
-- Check if mechanic can SELECT assignments
-- Run as mechanic user (not admin)

-- First, check current user
SELECT current_user, auth.uid();

-- Then try to select assignments
SELECT id, status, session_id
FROM session_assignments
WHERE status IN ('queued', 'offered')
LIMIT 5;

-- If empty, check if mechanic exists
SELECT id FROM mechanics WHERE user_id = auth.uid();
```

**Expected**:
- `current_user`: Should be authenticated
- `auth.uid()`: Should return mechanic's user ID
- `SELECT assignments`: Should return queued assignments
- `SELECT mechanics`: Should return mechanic record

**If mechanic doesn't exist**:
- Mechanic profile not properly created
- Check `mechanics` table has row with correct `user_id`

**If SELECT returns empty**:
- RLS policy blocking access (but policies look correct)
- No assignments actually exist with status 'queued'

**Fix**:
```sql
-- Verify RLS policy exists
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'session_assignments'
  AND cmd = 'SELECT';

-- Should include:
-- "Mechanics can view assignments for realtime"
-- USING: EXISTS (SELECT 1 FROM mechanics m WHERE m.user_id = auth.uid())
```

- [ ] RLS policies verified
- [ ] Mechanic profile exists
- [ ] Mechanic can SELECT assignments
- [ ] API returns assignments correctly

---

### STEP 4: Test Realtime Events

**Where**: `public/test-realtime-assignments.html`

**How**:
1. Open file in browser: `http://localhost:3000/test-realtime-assignments.html`
2. Enter production Supabase URL and Anon Key
3. Click "Connect"
4. Wait for "✅ Connected" status
5. In another tab, create free session and sign waiver
6. Watch test page for INSERT event

**What to Look For**:

```
✅ GOOD:
📡 Subscription status: SUBSCRIBED
📨 Received insert event
Assignment ID: [UUID]
Status: queued
```

```
❌ BAD:
📡 Subscription status: CHANNEL_ERROR
❌ Subscription failed: TIMED_OUT
No events received after assignment creation
```

**Result**:
- [ ] ✅ Test page connects successfully
- [ ] ✅ INSERT event received immediately (< 1 second)
- [ ] ⚠️ INSERT event delayed (> 5 seconds) - latency issue
- [ ] ❌ No event received - realtime not working

---

### STEP 5: Run SQL Audit

**File**: `COMPREHENSIVE_DATABASE_AUDIT.sql`

**How**:
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `COMPREHENSIVE_DATABASE_AUDIT.sql`
3. Paste and execute
4. Review all output sections

**Key Sections to Check**:
- [ ] Schema matches expected structure
- [ ] RLS enabled: YES
- [ ] In realtime publication: YES
- [ ] Has full replica identity: YES
- [ ] No orphaned assignments
- [ ] No sessions without assignments (except free)
- [ ] Recent assignments show correct status

**Summary Checks** (at bottom of output):
```
✅ RLS Enabled: YES
✅ In Realtime Publication: YES
✅ Has Full Replica Identity: YES
✅ Has Foreign Key to Sessions: YES
✅ Has Status Constraint: YES
```

- [ ] All summary checks pass
- [ ] Schema matches expected
- [ ] Data integrity verified

---

## 🎯 RESULTS INTERPRETATION

### Scenario A: Everything Checks Pass
- Realtime: ✅ SUBSCRIBED
- Assignment: ✅ Created with status 'queued'
- API: ✅ Returns assignment
- UI: ✅ Shows assignment
- Test: ✅ Events received immediately

**Conclusion**: System is working correctly. Issue was temporary or already fixed.

---

### Scenario B: Realtime Fails to Connect
- Realtime: ❌ CHANNEL_ERROR or TIMED_OUT
- Assignment: ✅ Created correctly
- API: ✅ Returns assignment
- UI: ❌ Doesn't show (no realtime events)

**Root Cause**: Realtime not enabled on table or project paused

**Fix**: Enable replication in Supabase Dashboard (Fix 1A or 1B)

---

### Scenario C: Assignment Not Created
- Realtime: ✅ SUBSCRIBED
- Assignment: ❌ Not in database
- API: ❌ Empty response
- Server Logs: ❌ Shows errors

**Root Cause**: Waiver endpoint failing to create assignment

**Fix**: Check server logs, fix error in waiver endpoint

---

### Scenario D: Assignment Created But Not Visible
- Realtime: ✅ SUBSCRIBED
- Assignment: ✅ Exists in DB with status 'queued'
- API: ❌ Doesn't return it
- Test: ✅ Events received

**Root Cause**: RLS policy or API filtering blocking mechanic

**Fix**: Verify mechanic profile, check workshop/tier filtering (Fix 3B)

---

### Scenario E: Realtime Works But Delayed
- Realtime: ✅ SUBSCRIBED
- Assignment: ✅ Created
- Test: ⚠️ Events received but delayed (5+ seconds)
- Production: ⚠️ Works eventually but slow

**Root Cause**: Network latency between production server and Supabase

**Fix**: This is expected with remote servers. Consider:
- Upgrading Supabase plan for better performance
- Moving server closer to Supabase region
- Adding fallback polling for slow connections

---

## 📊 FINAL CHECKLIST

After completing diagnostics:

- [ ] Identified which scenario matches your situation
- [ ] Applied appropriate fixes
- [ ] Verified assignment creation works
- [ ] Confirmed realtime events arrive
- [ ] Tested end-to-end flow in production
- [ ] Documented findings for future reference

---

## 🆘 STILL HAVING ISSUES?

If you've completed all steps and it's still not working:

1. **Gather Evidence**:
   - Screenshot of browser console logs
   - Screenshot of Supabase table editor showing assignment
   - Copy of server logs from past 10 minutes
   - Results from SQL audit script

2. **Check Recent Changes**:
   - Any database migrations run recently?
   - Any code deployments in last 24 hours?
   - Any Supabase project settings changed?

3. **Review Files**:
   - `DATABASE_AUDIT_REPORT.md` - Full technical analysis
   - `AUDIT_SUMMARY.md` - Executive summary
   - This file - Step-by-step diagnostics

4. **Report Findings**:
   - Which scenario best matches your situation?
   - What was the status at each step?
   - What errors appeared in logs?
   - What does the SQL audit show?

---

## ✅ SUCCESS CRITERIA

You've successfully diagnosed and fixed the issue when:

1. ✅ Browser console shows `SUBSCRIBED` status
2. ✅ Assignments created with `status = 'queued'`
3. ✅ `/api/mechanic/queue` returns assignments
4. ✅ UI shows assignments immediately (within 1-2 seconds)
5. ✅ Test page receives realtime INSERT events
6. ✅ Mechanics can accept assignments successfully

**Test**: Create 3 free sessions in a row and verify all appear in mechanic queue.

---

**Good luck! 🚀**
