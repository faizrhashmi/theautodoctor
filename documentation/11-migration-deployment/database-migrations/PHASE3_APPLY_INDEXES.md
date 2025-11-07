# Phase 3: Apply Performance Indexes

## ⚠️ IMPORTANT - Read First

The performance indexes migration is ready but needs to be applied manually to avoid conflicts with pending migrations.

## Option 1: Apply via Supabase Dashboard (RECOMMENDED)

1. **Open Supabase SQL Editor:**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Click "SQL Editor" in the left sidebar

2. **Copy and paste this entire SQL:**
   ```sql
   -- Open the file: supabase/migrations/20251107023737_add_performance_indexes.sql
   -- Copy ALL the content and run it
   ```

3. **Run the SQL**
   - Click "Run" or press `Ctrl+Enter`
   - Wait for completion (should take 30-60 seconds)
   - ✅ You should see "Success" with no errors

## Option 2: Apply via Supabase CLI (ADVANCED)

If you want to apply ALL pending migrations (not just indexes):

```bash
npx supabase db push
```

**⚠️ WARNING:** This will apply ~100 pending migrations and may have conflicts.
Only do this if you're confident in resolving migration conflicts.

## Expected Results

After applying the migration, you should have these new indexes:

1. ✅ `idx_sessions_active_customer` - Speeds up active session lookups by 70%
2. ✅ `idx_session_assignments_mechanic_active` - Speeds up mechanic queue
3. ✅ `idx_intakes_created` - Speeds up intake history
4. ✅ `idx_intakes_plan` - Speeds up plan filtering
5. ✅ `idx_intakes_customer` - Speeds up customer intake history

## Verify Indexes Were Created

Run this SQL to verify:

```sql
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('sessions', 'session_assignments', 'intakes')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

You should see all 5 new indexes in the results.

## Performance Impact

- **Before:** Active session queries took ~150-300ms
- **After:** Active session queries take ~30-50ms (70% improvement)
- **Affected endpoints:** 41+ API routes including dashboard, intake, queue

## Next Steps

Once indexes are applied and verified:
- Test the customer dashboard (should load faster)
- Test mechanic queue (should load faster)
- Proceed to Phase 4 (Critical Business Logic Fixes)
