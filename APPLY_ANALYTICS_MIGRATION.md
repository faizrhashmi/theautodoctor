# How to Apply Workshop Analytics Migration

**Migration File:** `supabase/migrations/20250125_workshop_analytics_tables.sql`

## Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the **SQL Editor** section

2. **Copy the Migration SQL**
   - Open the file: `supabase/migrations/20250125_workshop_analytics_tables.sql`
   - Copy the entire contents (314 lines)

3. **Run the Migration**
   - Paste the SQL into the SQL Editor
   - Click "Run" button
   - You should see success messages about tables being created

4. **Verify Tables Created**
   - Go to Table Editor
   - Look for these new tables:
     - `workshop_events` - Event tracking table
     - `workshop_metrics` - Aggregated metrics table
     - `workshop_alerts` - Alert management table

## Option 2: Via Supabase CLI (If Project is Linked)

```bash
# First, link your project if not already linked
npx supabase link --project-ref your-project-ref

# Then push the migration
npx supabase db push
```

## What This Migration Creates

### 1. **workshop_events** Table
- Tracks all workshop-related events
- Includes: signup events, approvals, rejections, email events, invitations
- Has indexes for fast querying
- RLS policies for security

### 2. **workshop_metrics** Table
- Stores aggregated daily/weekly/monthly metrics
- Includes KPIs like signup conversion rate, approval times, invite acceptance
- Updated by cron jobs (to be created)

### 3. **workshop_alerts** Table
- Stores automated alerts
- Three severity levels: critical, warning, info
- Can be acknowledged by admins
- Auto-resolve capability

## Post-Migration Verification

Run this SQL to verify all tables were created:

```sql
-- Check tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('workshop_events', 'workshop_metrics', 'workshop_alerts');

-- Check indexes were created
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('workshop_events', 'workshop_metrics', 'workshop_alerts');

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('workshop_events', 'workshop_metrics', 'workshop_alerts');
```

Expected output:
- 3 tables found
- Multiple indexes per table
- rowsecurity = true for all tables

## Test the Event Tracking

After migration, test that tracking works:

```sql
-- Insert a test event
INSERT INTO workshop_events (
  event_type,
  event_category,
  metadata,
  success
) VALUES (
  'test_event',
  'activity',
  '{"test": true}'::jsonb,
  true
) RETURNING id, created_at;

-- You should get back an ID and timestamp
-- Delete the test event
DELETE FROM workshop_events WHERE metadata->>'test' = 'true';
```

## Troubleshooting

### Error: "relation already exists"
- Tables may already be created
- Check Table Editor to verify

### Error: "permission denied"
- Make sure you're using the service_role key
- Or run as database owner in SQL Editor

### Error: "role 'authenticated' does not exist"
- This is a Supabase built-in role
- Should exist by default
- Contact support if missing

## Next Steps

After migration is applied:

1. **Test Workshop Signup**
   - Create a test workshop
   - Check `workshop_events` table for new events

2. **Test Admin Actions**
   - Approve/reject a workshop
   - Check for approval/rejection events

3. **Monitor Events**
   ```sql
   -- View recent events
   SELECT event_type, event_category, created_at, success
   FROM workshop_events
   ORDER BY created_at DESC
   LIMIT 20;
   ```

## Migration Status Checklist

- [ ] Migration SQL copied to Supabase
- [ ] Migration executed successfully
- [ ] All 3 tables created
- [ ] Indexes created
- [ ] RLS policies enabled
- [ ] Test event inserted and deleted
- [ ] Workshop signup creates events
- [ ] Admin actions create events

---

**Note:** The analytics system will start collecting data immediately after migration. The dashboards and aggregation jobs will be created in subsequent phases.