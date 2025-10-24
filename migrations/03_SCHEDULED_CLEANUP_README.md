# Migration 03: Scheduled Cleanup - Setup Guide

## Overview

This migration creates automated cleanup functions for abandoned sessions and no-show customers/mechanics.

## Cleanup Functions

### 1. Customer No-Shows (10 min timeout)
**Function:** `cleanup_customer_no_shows()`
- **When:** Request accepted but customer hasn't joined for 10+ minutes
- **Action:** Cancel request → `status = 'cancelled'`
- **Effect:** Frees mechanic to accept other requests

### 2. Mechanic No-Shows (5 min timeout)
**Function:** `cleanup_mechanic_no_shows()`
- **When:** Session in `waiting` status for 5+ minutes with no mechanic join
- **Action:**
  - Cancel session → `status = 'cancelled'`
  - Reset request → `status = 'pending'`, `mechanic_id = NULL`
- **Effect:** Request returns to queue for another mechanic

### 3. Stuck Live Sessions (3 hour timeout)
**Function:** `cleanup_stuck_live_sessions()`
- **When:** Session in `live` or `reconnecting` status for 3+ hours
- **Action:** End session → `status = 'cancelled'`
- **Effect:** Prevents infinite sessions, frees resources

### 4. Master Cleanup
**Function:** `run_scheduled_cleanup()`
- Runs all 3 cleanup functions in sequence
- Returns summary of affected records
- Includes error handling for each step

---

## Installation

### Step 1: Run the Migration

In Supabase Dashboard → SQL Editor:

```sql
-- Run the migration file
\i migrations/03_scheduled_cleanup.sql
```

Or copy/paste the entire contents of `03_scheduled_cleanup.sql` into the SQL Editor.

### Step 2: Verify Functions Created

```sql
-- Check functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'cleanup_%'
ORDER BY routine_name;
```

Expected output:
- `cleanup_customer_no_shows`
- `cleanup_mechanic_no_shows`
- `cleanup_stuck_live_sessions`
- `run_scheduled_cleanup`

---

## Testing

### Dry Run (Preview)

The migration automatically runs a dry run showing what would be affected:

```sql
-- This was already run during migration, but you can run it again:
SELECT
  id,
  status,
  EXTRACT(EPOCH FROM (NOW() - accepted_at)) / 60 AS elapsed_minutes
FROM public.session_requests
WHERE
  status = 'accepted'
  AND accepted_at IS NOT NULL
  AND accepted_at < NOW() - INTERVAL '10 minutes'
LIMIT 10;
```

### Manual Test Run

```sql
-- Run all cleanups manually
SELECT * FROM run_scheduled_cleanup();
```

Output will show:
```
cleanup_type         | affected_count | run_at
---------------------|----------------|-------------------------
customer_no_shows    | 3              | 2025-01-15 10:30:00+00
mechanic_no_shows    | 1              | 2025-01-15 10:30:00+00
stuck_sessions       | 0              | 2025-01-15 10:30:00+00
```

### Test Individual Functions

```sql
-- Test customer no-shows only
SELECT * FROM cleanup_customer_no_shows();

-- Test mechanic no-shows only
SELECT * FROM cleanup_mechanic_no_shows();

-- Test stuck sessions only
SELECT * FROM cleanup_stuck_live_sessions();
```

---

## Scheduling Options

### Option A: Supabase Edge Functions (Recommended)

Create a Supabase Edge Function that runs on a schedule.

#### 1. Create Edge Function

**File:** `supabase/functions/scheduled-cleanup/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Run scheduled cleanup
    const { data, error } = await supabaseAdmin.rpc('run_scheduled_cleanup')

    if (error) {
      console.error('[CLEANUP] Error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('[CLEANUP] Success:', data)

    return new Response(
      JSON.stringify({
        success: true,
        results: data,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[CLEANUP] Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

#### 2. Deploy Edge Function

```bash
# Deploy the function
supabase functions deploy scheduled-cleanup

# Set up secrets (if needed)
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 3. Schedule with Cron

In Supabase Dashboard → Database → Cron Jobs (or use pg_cron):

```sql
-- Run cleanup every 5 minutes
SELECT cron.schedule(
  'scheduled-cleanup',
  '*/5 * * * *', -- Every 5 minutes
  $$ SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/scheduled-cleanup',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) $$
);
```

Or run every minute for more aggressive cleanup:

```sql
SELECT cron.schedule(
  'scheduled-cleanup',
  '* * * * *', -- Every minute
  $$ SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/scheduled-cleanup',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) $$
);
```

### Option B: Direct pg_cron (Alternative)

If you have `pg_cron` enabled directly in your database:

```sql
-- Enable pg_cron (may require Supabase support)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup every 5 minutes
SELECT cron.schedule(
  'run-scheduled-cleanup',
  '*/5 * * * *', -- Every 5 minutes
  $$ SELECT run_scheduled_cleanup(); $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- Unschedule if needed
SELECT cron.unschedule('run-scheduled-cleanup');
```

### Option C: External Cron Service

Use an external service like:
- **Vercel Cron** (if using Vercel)
- **GitHub Actions** (scheduled workflows)
- **AWS EventBridge** (if using AWS)

Create API endpoint: `/api/scheduled-cleanup`

```typescript
// src/app/api/scheduled-cleanup/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  // Verify authorization (use secret token)
  const authHeader = req.headers.get('authorization')
  const expectedToken = process.env.CRON_SECRET

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('run_scheduled_cleanup')

    if (error) throw error

    return NextResponse.json({
      success: true,
      results: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[CLEANUP] Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

Then schedule with Vercel cron:

**File:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/scheduled-cleanup",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

---

## Monitoring

### Check Cleanup Logs

If using Supabase Edge Functions:

```bash
# View function logs
supabase functions logs scheduled-cleanup
```

### Check Database Logs

In Supabase Dashboard → Logs → Database:

Look for `[CLEANUP]` messages showing:
- Number of customer no-shows cancelled
- Number of mechanic no-shows released
- Number of stuck sessions ended

### Check Cron Job Status

```sql
-- View cron jobs
SELECT * FROM cron.job;

-- View cron job run history
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

---

## Adjusting Timeouts

Edit the migration file if you need different timeout values:

```sql
-- In cleanup_customer_no_shows():
DECLARE
  timeout_minutes INTEGER := 10; -- Change to 15 for 15 minutes

-- In cleanup_mechanic_no_shows():
DECLARE
  timeout_minutes INTEGER := 5; -- Change to 3 for 3 minutes

-- In cleanup_stuck_live_sessions():
DECLARE
  timeout_hours INTEGER := 3; -- Change to 2 for 2 hours
```

Then re-run the migration:

```sql
DROP FUNCTION IF EXISTS cleanup_customer_no_shows();
DROP FUNCTION IF EXISTS cleanup_mechanic_no_shows();
DROP FUNCTION IF EXISTS cleanup_stuck_live_sessions();
DROP FUNCTION IF EXISTS run_scheduled_cleanup();

-- Then run updated migration
```

---

## Verification Checklist

- [ ] Migration 03 executed successfully
- [ ] All 4 functions created (verify with `\df cleanup_*`)
- [ ] Dry run shows expected candidates for cleanup
- [ ] Manual test run works: `SELECT * FROM run_scheduled_cleanup();`
- [ ] Edge Function deployed (if using Option A)
- [ ] Cron job scheduled and running
- [ ] Logs show cleanup running on schedule
- [ ] Check after 10 minutes: old accepted requests cancelled
- [ ] Check after 5 minutes: waiting sessions released

---

## Troubleshooting

### "Function does not exist"

```sql
-- Verify functions are in the right schema
SELECT routine_schema, routine_name
FROM information_schema.routines
WHERE routine_name LIKE 'cleanup_%';

-- If in wrong schema, recreate in public schema
SET search_path TO public;
```

### "Permission denied"

Edge Functions need `service_role` key to execute RPC:

```typescript
// Use service role key, not anon key
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') // Not SUPABASE_ANON_KEY
)
```

### "Cron job not running"

```sql
-- Check if pg_cron is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- If not enabled, contact Supabase support or use Edge Functions
```

### "Nothing being cleaned up"

```sql
-- Check if there are actually records to clean
SELECT COUNT(*) FROM session_requests
WHERE status = 'accepted'
  AND accepted_at < NOW() - INTERVAL '10 minutes';

-- If 0, create test data or wait for real usage
```

---

## Next Steps

After scheduling is confirmed working:

1. **Monitor for 24 hours** - Check logs for any errors
2. **Verify cleanup is working** - Check session_requests and sessions tables
3. **Adjust timeouts if needed** - Based on real usage patterns
4. **Set up alerts** - Notify team if cleanup fails or stops running
5. **Document in runbook** - Add to operations documentation

---

## Related Files

- `migrations/03_scheduled_cleanup.sql` - Migration file with functions
- `supabase/functions/scheduled-cleanup/index.ts` - Edge Function (if using Option A)
- `src/app/api/scheduled-cleanup/route.ts` - API endpoint (if using Option C)
- `vercel.json` - Cron configuration (if using Vercel)
