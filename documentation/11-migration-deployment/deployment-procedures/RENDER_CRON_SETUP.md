# Render Cron Job Setup for Session Request Expiration

## Overview

Since you're using Render (not Vercel), you'll need to set up a Render Cron Job to call the expiration endpoint every 2 minutes.

---

## Option 1: Render Cron Job (Recommended)

### Step 1: Deploy Your Web Service First

Make sure your main web service is deployed to Render:

```bash
git add .
git commit -m "feat: Add automatic session request timeout system"
git push
```

### Step 2: Create a Cron Job in Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +"** → Select **"Cron Job"**
3. **Configure the cron job:**

   - **Name**: `expire-session-requests`
   - **Environment**: Same as your web service (e.g., Node)
   - **Build Command**: Leave empty
   - **Command**:
     ```bash
     curl -X POST \
       -H "Authorization: Bearer $CRON_SECRET" \
       https://YOUR-WEB-SERVICE-URL.onrender.com/api/cron/expire-requests
     ```
   - **Schedule**: `*/2 * * * *` (every 2 minutes)

4. **Add Environment Variables:**
   - Click "Environment" tab
   - Add: `CRON_SECRET` with the same value as your web service

5. **Click "Create Cron Job"**

### Important Notes:

- Replace `YOUR-WEB-SERVICE-URL` with your actual Render web service URL
- The cron job will make an HTTP request to your deployed API
- Make sure your web service has `CRON_SECRET` set in its environment variables

---

## Option 2: External Cron Service (Alternative)

If you prefer an external service, you can use:

### cron-job.org (Free)

1. **Sign up**: https://cron-job.org/en/
2. **Create New Cron Job:**
   - **Title**: Expire Session Requests
   - **URL**: `https://YOUR-WEB-SERVICE-URL.onrender.com/api/cron/expire-requests`
   - **Schedule**: Every 2 minutes
   - **Request Method**: POST
   - **Headers**:
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     ```
3. **Save and Enable**

### EasyCron (Alternative)

1. **Sign up**: https://www.easycron.com/
2. **Create New Cron Job:**
   - **Cron Expression**: `*/2 * * * *`
   - **URL**: Your endpoint
   - **Method**: POST
   - **HTTP Headers**: Add Authorization header

---

## Option 3: Supabase pg_cron (Database-level)

If you want the cron job to run directly in your database:

### Step 1: Enable pg_cron Extension

```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Step 2: Create the Cron Job

```sql
-- Schedule the expiration function to run every 2 minutes
SELECT cron.schedule(
  'expire-session-requests',  -- Job name
  '*/2 * * * *',               -- Every 2 minutes
  $$
  SELECT expire_old_session_requests();
  $$
);
```

### Step 3: (Optional) Add Webhook for Customer Notifications

Since pg_cron runs in the database, you'll need a separate webhook to trigger customer notifications:

```sql
-- Install http extension
CREATE EXTENSION IF NOT EXISTS http;

-- Create a function that calls your API
CREATE OR REPLACE FUNCTION notify_expired_requests()
RETURNS void AS $$
DECLARE
  result record;
  expired_ids text[];
BEGIN
  -- Get expired request IDs
  SELECT expired_request_ids INTO expired_ids
  FROM expire_old_session_requests();

  -- If there are expired requests, call the API to send notifications
  IF array_length(expired_ids, 1) > 0 THEN
    PERFORM http_post(
      'https://YOUR-WEB-SERVICE-URL.onrender.com/api/internal/notify-expired',
      jsonb_build_object('request_ids', expired_ids)::text,
      'application/json'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update the cron job to call this function
SELECT cron.schedule(
  'expire-and-notify-requests',
  '*/2 * * * *',
  $$ SELECT notify_expired_requests(); $$
);
```

### Check pg_cron Status

```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;

-- Unschedule a job (if needed)
SELECT cron.unschedule('expire-session-requests');
```

---

## Testing Your Setup

### Test the Endpoint Manually

```bash
# Replace with your actual URL and CRON_SECRET
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app.onrender.com/api/cron/expire-requests

# Should return:
# {
#   "success": true,
#   "expiredCount": N,
#   "expiredIds": [...],
#   "timestamp": "..."
# }
```

### Test Without Authentication (Debug)

```bash
# GET endpoint for testing (no auth required in dev)
curl https://your-app.onrender.com/api/cron/expire-requests

# Returns what would be expired without actually expiring them
```

### Verify in Database

```sql
-- Check for expired requests
SELECT * FROM session_requests
WHERE status = 'expired'
ORDER BY updated_at DESC
LIMIT 10;

-- Check for requests that should be expired
SELECT id, customer_name, created_at, expires_at,
       NOW() - expires_at as overdue_by
FROM session_requests
WHERE status = 'pending'
  AND expires_at < NOW()
ORDER BY expires_at;
```

---

## Monitoring

### Check Cron Job Logs

**Render Cron Job:**
- Go to your cron job in Render Dashboard
- Click "Logs" tab
- Should see successful runs every 2 minutes

**External Service:**
- Check execution history in the service dashboard
- Look for failed requests or errors

**Supabase pg_cron:**
```sql
SELECT jobid, jobname, schedule, command,
       nodename, nodeport, database, username
FROM cron.job;

SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'expire-session-requests')
ORDER BY start_time DESC
LIMIT 20;
```

### Application Logs

Check your Render web service logs for:
```
[expire-requests] Starting expiration check...
[expire-requests] Expired N requests
[expire-requests] Sent expiration notification to customer@email.com
```

---

## Troubleshooting

### Cron Job Not Running

**Render Cron Job:**
- Check cron job logs for errors
- Verify the URL is correct
- Ensure `CRON_SECRET` is set

**External Service:**
- Check service dashboard for failed executions
- Verify headers are set correctly
- Check for rate limits

**pg_cron:**
```sql
-- Check if extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check for errors
SELECT * FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC;
```

### 401 Unauthorized

```bash
# Check CRON_SECRET matches
echo "Web Service Secret: $CRON_SECRET"
echo "Cron Job Secret: [check in Render dashboard]"

# They must match exactly!
```

### Requests Not Expiring

```sql
-- Check if expires_at is set
SELECT COUNT(*) as without_expiration
FROM session_requests
WHERE status = 'pending' AND expires_at IS NULL;

-- If > 0, backfill them:
UPDATE session_requests
SET expires_at = created_at + INTERVAL '15 minutes'
WHERE status = 'pending' AND expires_at IS NULL;
```

### No Email Notifications

Check environment variables:
```bash
# These must be set in your Render web service
RESEND_API_KEY=re_xxxxx
REQUEST_ALERT_FROM_EMAIL="Auto Doctor <notifications@theautodoctor.com>"
```

---

## Recommended Setup

**For Production:** Use Render Cron Job (Option 1)
- Native integration with Render
- Easy to monitor
- Same environment as web service

**For Simplicity:** Use Supabase pg_cron (Option 3)
- Runs in database (no external dependencies)
- Reliable and fast
- No HTTP requests needed (except for notifications)

**For Flexibility:** Use External Service (Option 2)
- Works with any hosting provider
- Easy to switch providers
- More control over execution

---

## Cost Considerations

- **Render Cron Job**: Free tier includes cron jobs
- **cron-job.org**: Free tier supports every 2 minutes
- **Supabase pg_cron**: Included with Supabase (no extra cost)
- **EasyCron**: Free tier limits frequency

---

## Next Steps

1. Choose your preferred option (Render Cron Job recommended)
2. Set up the cron job following the instructions above
3. Test it manually first
4. Monitor logs to ensure it's running
5. Create a test request and wait 15 minutes to verify

Questions? Check the main documentation: [SESSION_REQUEST_TIMEOUT.md](docs/SESSION_REQUEST_TIMEOUT.md)
