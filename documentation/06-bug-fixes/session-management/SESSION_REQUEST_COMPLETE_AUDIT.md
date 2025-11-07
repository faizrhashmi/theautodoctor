# Session Request System - Complete Audit & Fix

**Date:** 2025-01-26
**Status:** 🔴 BROKEN - Multiple Issues Found

---

## 🔍 EXECUTIVE SUMMARY

The session request system that allows mechanics to see and accept customer requests is **completely broken** due to multiple cascading issues:

1. ❌ Database migration not applied (missing `metadata` column)
2. ❌ Enum mismatch ('unattended' doesn't exist)
3. ❌ Silent failures in session_request creation
4. ❌ Dashboard can't display requests because they're never created

**Result:** Customers wait forever, mechanics see nothing.

---

## 🐛 ISSUES FOUND

### **Issue #1: Database Schema Out of Sync** 🔴 CRITICAL

**Problem:** The `session_requests` table is missing the `metadata` column.

**Evidence:**
```
Error: "Could not find the 'metadata' column of 'session_requests' in the schema cache"
```

**What Should Exist (from migration):**
```sql
-- File: supabase/migrations/20251028000000_session_requests.sql
create table public.session_requests (
  ...
  metadata jsonb not null default '{}'::jsonb  ← SHOULD EXIST
);
```

**What Actually Exists:** `metadata` column is missing

**Fix Required:** Run the migration on your database

---

### **Issue #2: Enum Value Mismatch** 🔴 CRITICAL

**Problem:** Code uses `'unattended'` status but enum only has `'pending'`, `'accepted'`, `'cancelled'`.

**Evidence:**
```sql
-- Migration defines:
create type session_request_status as enum ('pending', 'accepted', 'cancelled');

-- But code tries to use:
.in('status', ['pending', 'unattended'])  ← BREAKS!
```

**Files Affected:**
- `src/app/api/mechanic/accept/route.ts` (FIXED ✅)
- `src/lib/sessionCleanup.ts` (FIXED ✅)
- `src/app/api/mechanics/requests/route.ts` (needs check)

**Status:** Fixed in code, but if you want 'unattended' feature, need to update enum

---

### **Issue #3: Silent Failure in Request Creation** 🟡 HIGH

**Problem:** When session_request creation fails, it's caught and silently ignored.

**Code:**
```typescript
// File: src/app/api/intake/start/route.ts:221-223
try {
  // Create session_request...
} catch (error) {
  console.error('[intake] Error creating session request:', error);
  // Don't fail the whole flow if this fails  ← SILENT FAILURE!
}
```

**Why This Is Bad:**
- Customer thinks everything worked
- Session created but NO session_request
- Mechanics never see the request
- Customer waits forever

**Fix:** Should return error or retry

---

### **Issue #4: Foreign Key References Wrong Table** 🟡 MEDIUM

**Original Migration:**
```sql
mechanic_id uuid references auth.users(id)  ← WRONG!
```

**Fixed Migration:**
```sql
-- File: 20251022000002_fix_session_requests_mechanic_fkey.sql
mechanic_id uuid references public.mechanics(id)  ← CORRECT!
```

**Status:** Fixed in migration file, but did you apply it?

---

## 📊 CURRENT STATE

### **Test Results for Session: 62e91166-c36b-4bd5-bc51-5b168f1bd176**

```json
{
  "session": {
    "id": "62e91166-c36b-4bd5-bc51-5b168f1bd176",
    "status": "pending",
    "customer_user_id": "f4d90392-118c-4738-ab16-94689f039f2a",
    "mechanic_id": null,
    "created_at": "2025-10-27T00:38:41",
    "plan": "free",
    "type": "chat",
    "intake_id": "aa031ec2-a916-4b09-8242-da0f43bc4a76"
  },
  "session_request": null  ← MISSING!
}
```

**What's Happening:**
1. ✅ Customer submitted intake form
2. ✅ Session created in `sessions` table
3. ❌ Session_request creation FAILED (metadata column doesn't exist)
4. ❌ Customer redirected to `/chat/[id]` - waiting forever
5. ❌ Mechanic dashboard shows NOTHING

---

## 🔧 COMPLETE FIX PLAN

### **Step 1: Check Database Migrations**

Run this query on your database:
```sql
-- Check if table exists and what columns it has
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'session_requests'
ORDER BY ordinal_position;
```

**Expected columns:**
- id
- created_at
- updated_at
- customer_id
- mechanic_id
- session_type
- plan_code
- status
- customer_name
- customer_email
- notes
- accepted_at
- notification_sent_at
- **metadata** ← CHECK IF THIS EXISTS

---

### **Step 2: Apply Missing Migration**

If `metadata` column is missing:

```bash
# Connect to your Supabase database
psql <your_database_connection_string>

# Run the migration
\i supabase/migrations/20251028000000_session_requests.sql
```

**OR** if table needs to be recreated:

```sql
-- Add missing column
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
```

---

### **Step 3: Fix Foreign Key (if not done)**

```sql
-- Check current foreign key
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS foreign_table
FROM pg_constraint
WHERE conname LIKE '%session_requests%mechanic%';

-- If it references auth.users instead of mechanics, fix it:
ALTER TABLE public.session_requests
  DROP CONSTRAINT IF EXISTS session_requests_mechanic_id_fkey;

ALTER TABLE public.session_requests
  ADD CONSTRAINT session_requests_mechanic_id_fkey
  FOREIGN KEY (mechanic_id)
  REFERENCES public.mechanics(id)
  ON DELETE SET NULL;
```

---

### **Step 4: Update RLS Policies**

The RLS policies currently check `auth.uid()` but mechanics use custom session auth. Update them:

```sql
-- Drop old policy
DROP POLICY IF EXISTS "Mechanics can accept requests" ON public.session_requests;

-- Create new policy (service role bypass)
CREATE POLICY "Allow service role full access"
  ON public.session_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

### **Step 5: Manually Create Missing Request**

For the current stuck session, create the request manually:

```sql
INSERT INTO public.session_requests (
  customer_id,
  session_type,
  plan_code,
  status,
  customer_name,
  customer_email,
  metadata
)
SELECT
  customer_user_id,
  type::text,
  plan,
  'pending',
  'Customer',  -- Update with actual name if you have it
  NULL,
  jsonb_build_object(
    'session_id', id,
    'intake_id', intake_id,
    'created_manually', true
  )
FROM sessions
WHERE id = '62e91166-c36b-4bd5-bc51-5b168f1bd176';
```

---

### **Step 6: Fix Code Silent Failure**

Update `src/app/api/intake/start/route.ts`:

```typescript
// Line 176-224: Remove try-catch or make it fail loudly
if (user?.id) {
  // ... participant creation ...

  // Create session_request - CRITICAL, don't silently fail
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const customerName = profile?.full_name || email || 'Customer';

  // Cancel old pending requests
  await supabaseAdmin
    .from('session_requests')
    .update({ status: 'cancelled' })
    .eq('customer_id', user.id)
    .eq('status', 'pending')
    .is('mechanic_id', null);

  // Create new request - FAIL IF THIS FAILS
  const { data: newRequest, error: requestError } = await supabaseAdmin
    .from('session_requests')
    .insert({
      customer_id: user.id,
      session_type: 'chat',
      plan_code: plan,
      status: 'pending',
      customer_name: customerName,
      customer_email: email || null,
      metadata: {
        session_id: sessionId,
        intake_id: intakeId,
        urgent,
      },
    })
    .select()
    .single();

  if (requestError) {
    console.error('[INTAKE] CRITICAL: Failed to create session_request:', requestError);
    // Delete the session since request creation failed
    await supabaseAdmin.from('sessions').delete().eq('id', sessionId);
    return NextResponse.json({
      error: 'Failed to create session request. Please try again.',
      details: requestError.message
    }, { status: 500 });
  }

  console.log(`[INTAKE] Created session_request ${newRequest.id} for session ${sessionId}`);

  // Broadcast notification
  if (newRequest) {
    const { broadcastSessionRequest } = await import('@/lib/sessionRequests');
    void broadcastSessionRequest('new_request', { request: newRequest });
  }
}
```

---

## ✅ VERIFICATION CHECKLIST

After applying fixes, verify:

- [ ] `metadata` column exists in `session_requests` table
- [ ] `mechanic_id` foreign key references `mechanics(id)` not `auth.users(id)`
- [ ] RLS policies allow service_role to insert/update
- [ ] Enum only has `'pending'`, `'accepted'`, `'cancelled'` (OR add 'unattended')
- [ ] Code doesn't reference 'unattended' (OR add to enum first)
- [ ] Test: Customer submits → session_request created ✅
- [ ] Test: Mechanic dashboard shows request ✅
- [ ] Test: Mechanic can accept ✅
- [ ] Test: Both redirect to session ✅

---

## 🧪 TESTING SCRIPT

```bash
# 1. Check schema
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='session_requests';"

# 2. Check pending requests
curl http://localhost:3000/api/debug/pending-requests | jq

# 3. Create test session_request manually (replace IDs)
curl -X POST http://localhost:3000/api/debug/create-missing-request \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"YOUR_SESSION_ID_HERE"}'

# 4. Check mechanic API
curl http://localhost:3000/api/mechanics/requests?status=pending | jq

# 5. Test accept (as mechanic, replace requestId)
curl -X POST http://localhost:3000/api/mechanic/accept \
  -H "Content-Type: application/json" \
  -d '{"requestId":"YOUR_REQUEST_ID_HERE"}'
```

---

## 📋 SUMMARY

| Component | Status | Issue | Fix |
|-----------|--------|-------|-----|
| Database Schema | ❌ BROKEN | Missing `metadata` column | Apply migration |
| Enum Definition | ⚠️ MISMATCH | Code uses 'unattended', enum doesn't have it | Remove from code (done) |
| Request Creation | ❌ BROKEN | Silently fails, no session_request created | Remove try-catch |
| Foreign Keys | ⚠️ NEEDS CHECK | May reference wrong table | Apply fix migration |
| RLS Policies | ⚠️ NEEDS CHECK | May block service_role | Update policies |
| Dashboard | ❌ NO DATA | Can't show requests that don't exist | Fix above issues |
| Accept API | ✅ FIXED | Enum issue fixed | Done |

---

## 🚀 QUICK FIX FOR YOUR CURRENT STUCK SESSION

Run this SQL to manually create the missing request:

```sql
INSERT INTO session_requests (
  customer_id,
  session_type,
  plan_code,
  status,
  customer_name,
  metadata
)
VALUES (
  'f4d90392-118c-4738-ab16-94689f039f2a',
  'chat',
  'free',
  'pending',
  'Customer',
  '{"session_id":"62e91166-c36b-4bd5-bc51-5b168f1bd176","intake_id":"aa031ec2-a916-4b09-8242-da0f43bc4a76","created_manually":true}'::jsonb
);
```

Then refresh mechanic dashboard - request should appear!

---

**Next Steps:** Tell me which step you want to start with, or if you want me to create a single consolidated migration file to fix everything.
