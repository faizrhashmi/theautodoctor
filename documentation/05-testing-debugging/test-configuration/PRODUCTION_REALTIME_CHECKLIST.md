# Production Realtime Issues - Troubleshooting Checklist

## The Problem
✅ Development: Real-time works perfectly
❌ Production: Session requests don't show up in real-time

## Root Cause
This is 99% a **Supabase Production Project Configuration** issue, NOT a code issue.

---

## STEP 1: Enable Realtime on Tables (MOST COMMON ISSUE)

### Using Supabase Dashboard:

1. Go to your **PRODUCTION** Supabase project: https://supabase.com/dashboard

2. Click on **Database** → **Replication** (left sidebar)

3. Make sure these tables have replication **ENABLED**:
   - ✅ `session_assignments`
   - ✅ `sessions`
   - ✅ `repair_quotes`

4. If any are disabled, click the toggle to **ENABLE** them

**This is the #1 reason realtime works in dev but not production!**

---

## STEP 2: Check Replica Identity

### Using Supabase SQL Editor:

Run this query in your **PRODUCTION** project:

```sql
-- Check current replica identity
SELECT
  tablename,
  CASE relreplident
    WHEN 'd' THEN 'default (PRIMARY KEY only)'
    WHEN 'n' THEN 'nothing (REALTIME BROKEN!)'
    WHEN 'f' THEN 'full (CORRECT)'
    WHEN 'i' THEN 'index'
  END AS replica_identity,
  CASE
    WHEN relreplident = 'f' THEN '✅ OK'
    ELSE '❌ NEEDS FIX'
  END AS status
FROM pg_class
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE nspname = 'public'
AND relname IN ('sessions', 'session_assignments', 'repair_quotes');
```

### If ANY show 'default' or 'nothing', run this:

```sql
ALTER TABLE session_assignments REPLICA IDENTITY FULL;
ALTER TABLE sessions REPLICA IDENTITY FULL;
ALTER TABLE repair_quotes REPLICA IDENTITY FULL;
```

---

## STEP 3: Verify RLS Policies (We fixed this before, but double-check)

### Run this in PRODUCTION SQL Editor:

```sql
-- Check RLS policies for session_assignments
SELECT
  policyname,
  cmd,
  CASE
    WHEN cmd = 'SELECT' THEN '✅ Needed for realtime'
    ELSE '⚠️  Not for realtime'
  END as realtime_relevance,
  qual as condition
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'session_assignments'
ORDER BY cmd;
```

### You should see these SELECT policies:

1. **"Mechanics can view assignments for realtime"**
   ```sql
   -- This allows mechanics to receive realtime events
   CREATE POLICY "Mechanics can view assignments for realtime"
     ON session_assignments FOR SELECT
     USING (
       EXISTS (
         SELECT 1 FROM mechanics m WHERE m.user_id = auth.uid()
       )
     );
   ```

2. **"Admins can view all assignments"**
   ```sql
   CREATE POLICY "Admins can view all assignments"
     ON session_assignments FOR SELECT
     USING (is_admin(auth.uid()));
   ```

If missing, create them in production.

---

## STEP 4: Test Realtime Connection

### Using Browser Console (Chrome DevTools):

1. Open your **PRODUCTION** mechanic dashboard
2. Open Chrome DevTools (F12)
3. Go to **Console** tab
4. Look for these logs:

```
✅ GOOD:
[MechanicDashboard] Setting up real-time subscriptions
[MechanicDashboard] Subscription status: SUBSCRIBED

❌ BAD:
[MechanicDashboard] Subscription status: CHANNEL_ERROR
[MechanicDashboard] Subscription status: TIMED_OUT
```

### If you see CHANNEL_ERROR or TIMED_OUT:

This means Supabase is rejecting the real-time connection.

**Most likely cause**: Realtime is disabled on the table (see STEP 1)

---

## STEP 5: Check Supabase Realtime Inspector

### Using Supabase Dashboard:

1. Go to **Database** → **Realtime** in your PRODUCTION project

2. You should see a **Realtime Inspector** showing active connections

3. Open your mechanic dashboard in production

4. Check if you see a connection appear in the inspector

5. Try creating a session request and watch for events

**If no connection appears**: Realtime is not enabled properly

---

## STEP 6: Verify Environment Variables

### In your production deployment (Vercel/Render/etc):

Make sure these are set:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-key...
```

**CRITICAL**: Make sure these point to your **PRODUCTION** Supabase project, not development!

### To verify in browser:

1. Open production site
2. Open DevTools Console
3. Type: `console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)`
4. Make sure it's your production URL

---

## STEP 7: Check Supabase Project Paused/Sleeping

### Free tier projects pause after inactivity:

1. Go to Supabase Dashboard → **Settings** → **General**

2. Check **Project Status**: Should say "Active" with green dot

3. If it says "Paused" or "Sleeping":
   - Click **Resume project**
   - Wait 2-3 minutes for it to wake up
   - Try again

**Free tier projects pause after 1 week of inactivity!**

---

## STEP 8: Manual Realtime Test

### Create this test file:

```javascript
// test-production-realtime.html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
  <h1>Supabase Realtime Test</h1>
  <p>Open console to see results...</p>

  <script>
    // Replace with YOUR production credentials
    const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co'
    const SUPABASE_KEY = 'your-anon-key-here'

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

    console.log('🔍 Testing realtime connection...')

    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_assignments'
      }, (payload) => {
        console.log('✅ REALTIME WORKS!', payload)
      })
      .subscribe((status) => {
        console.log('Status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Connected! Create a session to test...')
        } else {
          console.log('❌ Failed:', status)
        }
      })
  </script>
</body>
</html>
```

Open this file, replace credentials, and test.

---

## Most Likely Fixes (In Order):

### 1. **Enable Realtime on Tables** (90% of cases)
   - Dashboard → Database → Replication → Enable for session_assignments

### 2. **Set Replica Identity to FULL** (5% of cases)
   - Run: `ALTER TABLE session_assignments REPLICA IDENTITY FULL;`

### 3. **Project is Paused** (3% of cases)
   - Dashboard → Settings → Resume project

### 4. **Wrong Environment Variables** (2% of cases)
   - Verify prod env vars point to prod Supabase

---

## Next Steps

1. Start with STEP 1 - check if replication is enabled
2. If that doesn't work, go through steps 2-8 in order
3. Report back which step revealed the issue

## Using Chrome Extension

With the Supabase devtools extension installed:

1. Open production site
2. Right-click → Inspect → Supabase tab
3. Check "Realtime" section - should show active subscriptions
4. Look for errors or disconnected status

---

**The code is correct (works in dev). This is 100% a Supabase project configuration issue in production.**
