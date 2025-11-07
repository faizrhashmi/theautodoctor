# Database Migrations - Major Overhaul

## Step 0: Data Hygiene (RUN FIRST)

**Purpose:** Clean up the database before implementing new logic. Removes broken rows, orphan links, and stale sessions.

### How to Run:

1. **Open Supabase SQL Editor:**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Navigate to: SQL Editor → New Query

2. **Copy and paste:** `migrations/00_data_hygiene.sql`

3. **Run the migration:**
   - Click "Run" or press `Ctrl+Enter`
   - Watch the NOTICE messages in the output

4. **Review the output:**
   - Check status distributions
   - Verify "weird statuses" count is 0 or very low
   - Review counts of normalized/fixed records

5. **Commit or Rollback:**
   ```sql
   -- If everything looks good:
   COMMIT;

   -- If something looks wrong:
   ROLLBACK;
   ```

### What It Does:

| Step | Action | Impact |
|------|--------|--------|
| **0.1** | Create backups | Snapshot tables to `backup` schema |
| **0.2** | Normalize statuses | Replace NULL/unknown → 'pending' |
| **0.3** | Fix timestamps | Ensure `created_at` defaults exist |
| **0.4** | Release dangling refs | Free mechanics from cancelled request sessions |
| **0.5** | End stuck sessions | Mark sessions >12h old as completed |
| **0.6** | Archive orphans | Cancel old sessions with no mechanic/customer |
| **0.7** | Cancel orphaned requests | Cancel accepted requests with no matching session |

### Expected Output:

```
NOTICE:  ✓ Backup created:
NOTICE:    - sessions: 1234 rows
NOTICE:    - session_requests: 567 rows
NOTICE:  ✓ Normalized 12 session status(es)
NOTICE:  ✓ Normalized 5 request status(es)
NOTICE:  ✓ Timestamp defaults ensured
NOTICE:  ✓ Released 3 session(s) with cancelled/expired requests
NOTICE:  ✓ Ended 8 stale live session(s) (>12h old)
NOTICE:  ✓ Archived 45 old orphan session(s)
NOTICE:  ✓ Cancelled 2 orphaned accepted request(s)

NOTICE:  === SESSIONS STATUS DISTRIBUTION ===
NOTICE:    completed     : 856
NOTICE:    cancelled     : 234
NOTICE:    waiting       : 45
NOTICE:    live          : 12
NOTICE:    pending       : 87

NOTICE:  === REQUESTS STATUS DISTRIBUTION ===
NOTICE:    cancelled     : 345
NOTICE:    pending       : 123
NOTICE:    accepted      : 5
NOTICE:    expired       : 89

NOTICE:  === WEIRD STATUS CHECK ===
NOTICE:    Sessions with unknown status: 0
NOTICE:    Requests with unknown status: 0
NOTICE:    ✓ All statuses normalized!

NOTICE:  === DATA HYGIENE COMPLETE ===
NOTICE:  Review the output above. If everything looks good, COMMIT.
NOTICE:  If not, ROLLBACK and restore from backup schema.
```

### Rollback Instructions:

If you need to undo the changes:

```sql
-- 1. Rollback the transaction
ROLLBACK;

-- 2. Restore from backup (if already committed)
BEGIN;

DELETE FROM public.sessions;
INSERT INTO public.sessions
SELECT * FROM backup.sessions_before_hygiene;

DELETE FROM public.session_requests;
INSERT INTO public.session_requests
SELECT * FROM backup.session_requests_before_hygiene;

COMMIT;
```

### Safety Features:

✅ **Transaction-based** - Everything wrapped in BEGIN/COMMIT
✅ **Automatic backups** - Creates snapshots before any changes
✅ **Idempotent** - Safe to run multiple times
✅ **Verification** - Shows status counts before commit
✅ **Manual commit** - You control when changes are final

### After Running:

Once committed, your database will be clean and ready for the next steps of the major overhaul. All:
- ✅ Statuses normalized
- ✅ Dangling references fixed
- ✅ Stuck sessions ended
- ✅ Orphaned data archived
- ✅ Timestamps consistent

---

## Next Steps:

After data hygiene is complete and committed, proceed to the next migration steps (coming soon).
