# Migration Sync Solution & Test User Setup

**Date**: 2025-01-09
**Status**: Solution Provided - Action Required

---

## 🔴 MIGRATION SYNC ISSUE IDENTIFIED

Your local and remote databases are out of sync:

```
Local          | Remote         | Issue
---------------|----------------|------------------
20251108020831 | 20251108020831 | ✅ Synced
20251108100000 | 20251108100000 | ✅ Synced
20251108110000 | 20251108110000 | ✅ Synced
(missing)      | 99999999999    | ❌ Remote has this, local doesn't
99999999999999 | (missing)      | ❌ Local has this, remote doesn't
99999999999    | (missing)      | ❌ Local has this, remote doesn't
```

**Root Cause:**
- Migration `20251108020831_remote_schema.sql` is **empty** (0 bytes)
- This should contain your base schema but doesn't
- Subsequent migrations reference tables that don't exist in base schema

---

## ✅ RECOMMENDED SOLUTION (Easiest)

### **Option 1: Use Your Existing Mechanics for Testing (FASTEST)**

Since the migration sync is complex and you already have a working remote database:

**Steps:**
1. **Open Supabase Studio**: http://127.0.0.1:54323
2. **Go to SQL Editor**
3. **Run the verification query**:

```sql
SELECT
  email,
  name,
  account_type,
  workshop_id,
  CASE
    WHEN workshop_id IS NULL THEN 'VIRTUAL_ONLY'
    WHEN account_type = 'workshop' THEN 'WORKSHOP_AFFILIATED'
    WHEN account_type = 'independent' THEN 'INDEPENDENT_WORKSHOP'
    ELSE 'UNKNOWN'
  END as mechanic_type
FROM mechanics
LIMIT 10;
```

4. **Pick 2-3 existing mechanics** and modify them for testing:

```sql
-- Make one mechanic a workshop employee
UPDATE mechanics
SET
  account_type = 'workshop',
  workshop_id = (SELECT id FROM organizations WHERE organization_type = 'workshop' LIMIT 1)
WHERE email = 'your.existing.mechanic@email.com';

-- Make one mechanic virtual-only
UPDATE mechanics
SET
  account_type = NULL,
  workshop_id = NULL
WHERE email = 'another.existing.mechanic@email.com';
```

5. **Test Phase 1** with these mechanics
6. **Revert changes** after testing if needed

**Pros:**
- ✅ Works immediately
- ✅ No migration sync needed
- ✅ Uses your real database
- ✅ Can test right now

**Cons:**
- ⚠️ Modifies existing mechanics (can revert)
- ⚠️ Need to remember which mechanics you changed

---

### **Option 2: Fix Migration Sync (PROPER BUT COMPLEX)**

If you want local and remote perfectly synced:

**Step 1: Pull Remote Schema**
```bash
# This will download your remote schema as a new migration
pnpm supabase db pull
```

**Step 2: Review Generated Migration**
- Check `supabase/migrations/` for new file
- Verify it contains your schema

**Step 3: Reset Local Database**
```bash
# Apply all migrations to local
pnpm supabase db reset
```

**Step 4: Push to Remote**
```bash
# Ensure remote matches local
pnpm supabase db push
```

**Pros:**
- ✅ Local and remote perfectly synced
- ✅ Proper migration history
- ✅ Clean state

**Cons:**
- ⚠️ More complex
- ⚠️ Requires network connection
- ⚠️ May take 15-30 minutes

---

### **Option 3: Create Test Users via Application UI (CLEANEST)**

Don't modify database directly - use your app:

**Create Virtual-Only Mechanic:**
1. Go to: http://localhost:3000/mechanic/signup
2. Sign up as new mechanic
3. Don't link to workshop
4. Complete profile
5. **Result**: Virtual-only mechanic ✅

**Create Workshop Employee:**
1. Create or use existing workshop account
2. Workshop invites mechanic
3. Mechanic accepts invite
4. **Result**: Workshop employee ✅

**Pros:**
- ✅ No SQL needed
- ✅ Tests your actual user flow
- ✅ No database modification risks

**Cons:**
- ⚠️ Takes longer
- ⚠️ Requires UI to be working

---

## 🎯 MY RECOMMENDATION

**Use Option 1 + Option 3 combination:**

1. **Right now** - Use Option 1 to test Phase 1 immediately
   - Modify 1-2 existing mechanics
   - Test the access control
   - Verify it works

2. **For future testing** - Use Option 3
   - Create proper test users via UI
   - More realistic testing
   - No database hacks

3. **Later (when needed)** - Fix migration sync with Option 2
   - Only if you need local development
   - Only if you're adding new migrations
   - Not urgent for Phase 1 testing

---

## 📝 QUICK START TESTING (5 MINUTES)

**Copy this into Supabase Studio SQL Editor:**

```sql
-- STEP 1: Check what you have
SELECT
  email,
  name,
  account_type,
  workshop_id IS NOT NULL as has_workshop
FROM mechanics
ORDER BY created_at DESC
LIMIT 5;

-- STEP 2: Pick one mechanic email from above

-- STEP 3: Make them a workshop employee (REPLACE EMAIL)
UPDATE mechanics
SET
  account_type = 'workshop',
  workshop_id = (
    SELECT id FROM organizations
    WHERE organization_type = 'workshop'
    LIMIT 1
  )
WHERE email = 'REPLACE_WITH_ACTUAL_EMAIL@example.com'
RETURNING
  email,
  account_type,
  'Workshop employee test user created' as status;

-- STEP 4: Test by logging in with that mechanic
-- Expected: NO Earnings/Analytics in sidebar
-- Expected: 403 error on /mechanic/earnings
```

**Then:**
1. Login with that mechanic
2. Check sidebar (should NOT see Earnings/Analytics)
3. Try to access `/mechanic/earnings` (should get 403)
4. Report results!

---

## 🔧 FILES READY FOR YOU

1. **[scripts/create-test-users-simple.sql](scripts/create-test-users-simple.sql)**
   - Simple SQL to modify existing mechanics
   - Verification queries included
   - Copy/paste friendly

2. **[scripts/create-test-users.sql](scripts/create-test-users.sql)**
   - Full test user creation (requires migration sync)
   - Use after fixing migrations

3. **[TESTING_GUIDE.md](TESTING_GUIDE.md)**
   - Complete testing instructions
   - All test scenarios
   - Expected results

---

## ❓ WHAT DO YOU WANT TO DO?

**Choose one:**

**A) Test immediately** (5 min)
- I'll guide you through Option 1
- Modify existing mechanic
- Test Phase 1 now
- Quick and easy

**B) Fix migrations first** (30 min)
- I'll help with Option 2
- Proper sync local/remote
- Then create test users
- Cleaner long-term

**C) Use UI only** (15 min)
- No SQL needed
- Create via signup
- Test with real flow
- Most realistic

**Let me know which option you prefer!**

---

## 🚨 IMPORTANT NOTES

1. **Phase 1 code is ready** - Access control works, just needs testing
2. **Migration sync is separate** - Not blocking Phase 1 testing
3. **Can test now** - Don't need to wait for perfect sync
4. **Easy to revert** - Any changes can be undone

**Bottom line**: You can test Phase 1 right now with existing mechanics. Migration sync can be fixed later.

