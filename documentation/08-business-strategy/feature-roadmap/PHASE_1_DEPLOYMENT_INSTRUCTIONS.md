# Phase 1: Critical Fixes - Deployment Instructions

## Overview
Phase 1 addresses the 3 most critical database issues blocking core functionality.

**Status**: ✅ Migration files created, ready to deploy
**Estimated Time**: 30 minutes to deploy + test
**Impact**: Unblocks 9 tables, fixes data integrity, fixes admin panel

---

## Pre-Deployment Checklist

- [ ] Backup database before applying migrations
- [ ] Have rollback plan ready
- [ ] Notify team of deployment window
- [ ] Stop any running cron jobs temporarily

---

## Migration Files Created

### 1. `99990001_phase1_add_missing_rls_policies.sql`
**Purpose**: Adds RLS policies for 9 tables that were blocking ALL operations
**Fixes**:
- repair_quotes
- diagnostic_sessions
- in_person_visits
- quote_modifications
- platform_fee_rules
- repair_payments
- platform_chat_messages
- customer_favorites
- workshop_roles

**Runtime**: ~5 seconds

### 2. `99990002_phase1_fix_chat_messages_foreign_key.sql`
**Purpose**: Restores sender_id validation with trigger + CHECK constraint
**Fixes**:
- chat_messages.sender_id orphaned records
- Adds validation trigger
- Cleans up existing invalid data

**Runtime**: ~10 seconds (may be longer if many invalid records)

### 3. `99990003_phase1_fix_recursive_admin_policies.sql`
**Purpose**: Fixes infinite recursion in admin policies
**Fixes**:
- Creates SECURITY DEFINER helper functions
- Fixes 10+ recursive policies across 7 tables
- Fixes mechanic custom auth policies

**Runtime**: ~15 seconds

---

## Deployment Steps

### Option A: Via Supabase Dashboard (RECOMMENDED)

1. Go to https://app.supabase.com/project/YOUR_PROJECT/sql
2. Copy contents of `99990001_phase1_add_missing_rls_policies.sql`
3. Paste and click "RUN"
4. Wait for success message
5. Repeat for `99990002` and `99990003`

### Option B: Via Command Line

```bash
# Set your database URL
export DATABASE_URL="postgresql://..."

# Apply migrations in order
psql $DATABASE_URL -f supabase/migrations/99990001_phase1_add_missing_rls_policies.sql
psql $DATABASE_URL -f supabase/migrations/99990002_phase1_fix_chat_messages_foreign_key.sql
psql $DATABASE_URL -f supabase/migrations/99990003_phase1_fix_recursive_admin_policies.sql
```

### Option C: Via Supabase CLI

```bash
cd theautodoctor

# Apply migrations
npx supabase db push

# Or apply individually
npx supabase db execute -f supabase/migrations/99990001_phase1_add_missing_rls_policies.sql
npx supabase db execute -f supabase/migrations/99990002_phase1_fix_chat_messages_foreign_key.sql
npx supabase db execute -f supabase/migrations/99990003_phase1_fix_recursive_admin_policies.sql
```

---

## Post-Deployment Verification

### 1. Check Migration Success

Run this query in Supabase SQL Editor:

```sql
-- Verify all policies were created
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename IN (
  'repair_quotes',
  'diagnostic_sessions',
  'in_person_visits',
  'quote_modifications',
  'platform_fee_rules',
  'repair_payments',
  'platform_chat_messages',
  'customer_favorites',
  'workshop_roles'
)
ORDER BY tablename, policyname;

-- Should return 25+ policies
```

### 2. Check Helper Functions

```sql
-- Verify SECURITY DEFINER functions exist
SELECT
  proname,
  prosecdef
FROM pg_proc
WHERE proname IN ('is_admin', 'is_authenticated_mechanic', 'get_authenticated_mechanic_id');

-- Should return 3 rows with prosecdef = true
```

### 3. Check chat_messages Validation

```sql
-- Verify trigger exists
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'validate_chat_message_sender_trigger';

-- Should return 1 row with tgenabled = 'O' (enabled)
```

---

## Testing Checklist

### Test 1: Customer Favorites (Was Blocked)
```typescript
// Try in browser console at /customer/profile
await fetch('/api/customer/favorites', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customer_id: 'your-user-id',
    mechanic_id: 'some-mechanic-id'
  })
})
// Should succeed (200 OK) instead of RLS policy error
```

### Test 2: Chat Messages (Was Missing sender_id)
```typescript
// Try sending a chat message
await fetch('/api/chat/send-message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: 'session-id',
    content: 'Test message',
    sender_id: 'your-user-id'  // Should validate this
  })
})
// Should succeed and enforce sender_id validation
```

### Test 3: Admin Panel (Was Broken)
```
1. Login as admin
2. Go to /admin/users
3. Try to view all profiles
4. Should load without infinite recursion errors
```

### Test 4: Mechanic Dashboard (Was Using Recursive Policies)
```
1. Login as mechanic
2. Go to /mechanic/dashboard
3. View assigned sessions
4. Should load without query timeouts
```

---

## Expected Results

### Before Phase 1:
- ❌ customer_favorites: "row violates row-level security policy"
- ❌ repair_quotes: Cannot create quotes
- ❌ chat_messages: sender_id NULL or invalid
- ❌ Admin panel: Infinite recursion, query timeouts
- ❌ Mechanic dashboard: Slow queries

### After Phase 1:
- ✅ customer_favorites: Can save/delete favorites
- ✅ repair_quotes: Can create and manage quotes
- ✅ chat_messages: sender_id validated and required
- ✅ Admin panel: Fast, no recursion
- ✅ Mechanic dashboard: Fast queries

---

## Rollback Plan

If issues occur, run these commands to revert:

```sql
-- Rollback Step 1: Drop new policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
    AND policyname LIKE '%full access%'
    OR policyname LIKE '%Service role%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Rollback Step 2: Drop chat message validation
DROP TRIGGER IF EXISTS validate_chat_message_sender_trigger ON chat_messages;
DROP FUNCTION IF EXISTS validate_chat_message_sender();
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_valid;

-- Rollback Step 3: Drop helper functions
DROP FUNCTION IF EXISTS is_admin(UUID);
DROP FUNCTION IF EXISTS is_authenticated_mechanic(UUID);
DROP FUNCTION IF EXISTS get_authenticated_mechanic_id();
```

---

## Monitoring

After deployment, monitor for these errors:

```typescript
// Watch for RLS violations (should decrease)
SELECT
  COUNT(*) as error_count,
  message
FROM admin_errors
WHERE created_at > NOW() - INTERVAL '1 hour'
AND message LIKE '%row-level security%'
GROUP BY message;

// Watch for chat message validation errors (should appear if bad data submitted)
SELECT
  COUNT(*) as error_count
FROM admin_errors
WHERE created_at > NOW() - INTERVAL '1 hour'
AND message LIKE '%Invalid sender_id%';
```

---

## Success Metrics

**Measure before and after**:
1. API error rate (should decrease)
2. Query response times (should improve)
3. Admin panel load time (should improve dramatically)
4. RLS policy violation errors (should drop to ~0)

---

## Support

**If issues occur**:
1. Check Supabase logs: Dashboard → Logs → Postgres Logs
2. Run verification queries above
3. Check API error logs
4. Roll back if critical issues
5. Contact development team

---

## Next Steps

After Phase 1 is deployed and verified:
- [ ] Begin Phase 2 (High Priority Fixes)
- [ ] Update monitoring dashboards
- [ ] Document any unexpected issues
- [ ] Schedule Phase 2 deployment

---

**Deployment Owner**: _____________
**Deployment Date**: _____________
**Sign-off**: _____________
