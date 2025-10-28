# Session Request Timeout System

## Overview

This document describes the automatic timeout and expiration system for session requests that prevents orphaned requests from persisting indefinitely when mechanics don't respond.

## Problem Solved

**Before:**
- Session requests would stay in "pending" status forever if no mechanic accepted
- Customers would see stuck requests in their dashboard
- No automatic cleanup mechanism existed
- No customer notification when requests went unanswered

**After:**
- Requests automatically expire after 15 minutes
- Customers receive email notifications when requests expire
- Real-time UI updates remove expired requests
- Debug endpoints monitor stuck requests
- Proper FSM enforces valid state transitions

## Architecture

### Database Schema

#### New Column: `expires_at`
```sql
ALTER TABLE session_requests ADD COLUMN expires_at TIMESTAMPTZ;
```

The `expires_at` timestamp is automatically set to 15 minutes from creation via:
1. Application logic in `/api/requests/route.ts`
2. Database trigger `trigger_set_session_request_expiration`

### State Machine

**Session Request FSM** ([lib/sessionRequestFsm.ts](../src/lib/sessionRequestFsm.ts))

Valid state transitions:
```
pending → accepted   (mechanic accepts)
pending → expired    (timeout reached)
pending → cancelled  (customer cancels)

accepted → [terminal]
expired → [terminal]
cancelled → [terminal]
```

### Components

#### 1. Database Migration
**File:** `supabase/migrations/99990021_add_request_timeout.sql`

Creates:
- `expires_at` column
- `expire_old_session_requests()` function
- `set_session_request_expiration()` trigger
- Index for efficient expiration queries

#### 2. Request Creation
**File:** `src/app/api/requests/route.ts`

When creating a request:
```typescript
const expiresAt = new Date()
expiresAt.setMinutes(expiresAt.getMinutes() + 15)

await supabase.from('session_requests').insert({
  // ... other fields
  expires_at: expiresAt.toISOString(),
})
```

#### 3. Cron Job
**File:** `src/app/api/cron/expire-requests/route.ts`

Runs every 2 minutes via Vercel Cron:
- Calls `expire_old_session_requests()` database function
- Broadcasts expiration events to real-time listeners
- Sends email notifications to customers
- Protected by `CRON_SECRET` env variable

**Render Cron Configuration:**

Since you're using Render, set up a Render Cron Job in your dashboard:
- **Command**: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-app.onrender.com/api/cron/expire-requests`
- **Schedule**: `*/2 * * * *` (every 2 minutes)

See [RENDER_CRON_SETUP.md](../RENDER_CRON_SETUP.md) for detailed instructions.

#### 4. Customer Notifications
**File:** `src/app/api/cron/expire-requests/route.ts`

Sends email via Resend when request expires:
- Explains timeout occurred
- Confirms no charges made
- Provides link to submit new request
- Suggests trying during business hours

#### 5. UI Components

**PendingRequestBanner** ([components/customer/PendingRequestBanner.tsx](../src/components/customer/PendingRequestBanner.tsx))
- Shows countdown timer
- Real-time updates via Supabase subscriptions
- Auto-removes when request is accepted/expired
- Allows customer to cancel request

#### 6. Debug Endpoints

**Enhanced Session Requests Endpoint**
- `GET /api/debug/session-requests`
- Shows pending, expired, and stuck requests
- Identifies requests that should be expired but aren't
- Status breakdown and health metrics

**Enhanced Cleanup Endpoint**
- `POST /api/debug/cleanup-ghost-requests`
- Expires stuck requests properly (instead of deleting)
- Removes very old requests (>7 days)
- Provides detailed cleanup summary

## Configuration

### Environment Variables

```bash
# Required for email notifications
RESEND_API_KEY=re_xxxxx
REQUEST_ALERT_FROM_EMAIL="Auto Doctor <notifications@theautodoctor.com>"

# Required for cron job security
CRON_SECRET=your-random-secret-here
```

### Timeout Duration

Default: **15 minutes**

To change, update in two places:

1. **Database Trigger**
```sql
-- In migration file
NEW.expires_at := NEW.created_at + INTERVAL '15 minutes';
```

2. **Application Code**
```typescript
// In src/app/api/requests/route.ts
expiresAt.setMinutes(expiresAt.getMinutes() + 15)
```

## Testing

### Manual Testing

1. **Create a test request:**
```bash
# Create request via API or UI
# Request will expire in 15 minutes
```

2. **Check pending requests:**
```bash
curl -H "Authorization: Bearer YOUR_SECRET" \
  https://your-domain.com/api/debug/session-requests
```

3. **Manually trigger expiration:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/expire-requests
```

4. **View expired requests:**
```sql
SELECT * FROM session_requests WHERE status = 'expired' ORDER BY created_at DESC;
```

### Automated Testing

```typescript
// Test expiration function
SELECT * FROM expire_old_session_requests();

// Should return:
// { expired_count: N, expired_request_ids: [...] }
```

## Monitoring

### Key Metrics

1. **Pending Request Count**
   - Should rarely exceed 5-10
   - High count indicates mechanic availability issue

2. **Expiration Rate**
   - Track percentage of requests that expire
   - High rate indicates mechanic shortage

3. **Time to Acceptance**
   - Average time from creation to acceptance
   - Should be under 5 minutes during business hours

### Alerts

Set up alerts for:
- Expiration rate > 30%
- Pending requests > 10
- Stuck requests (pending > 30 minutes)

## Troubleshooting

### Requests Not Expiring

**Check:**
1. Is the cron job running?
   ```bash
   # Check Vercel logs
   vercel logs --follow
   ```

2. Is the database function working?
   ```sql
   SELECT * FROM expire_old_session_requests();
   ```

3. Are requests missing `expires_at`?
   ```sql
   SELECT COUNT(*) FROM session_requests
   WHERE status = 'pending' AND expires_at IS NULL;
   ```

### Customers Not Receiving Notifications

**Check:**
1. Is `RESEND_API_KEY` set?
2. Does customer have valid email?
3. Check Resend dashboard for delivery status
4. Check application logs for errors

### Real-time Updates Not Working

**Check:**
1. Supabase Realtime is enabled
2. RLS policies allow reading requests
3. Client subscriptions are active
4. Browser console for errors

## Database Functions

### `expire_old_session_requests()`

Marks expired requests and returns stats:

```sql
SELECT * FROM expire_old_session_requests();

-- Returns:
-- expired_count: 3
-- expired_request_ids: ['uuid1', 'uuid2', 'uuid3']
```

### `set_session_request_expiration()`

Trigger function that runs on INSERT:
- Sets `expires_at` to `created_at + 15 minutes`
- Only for pending requests without expiration

## File Reference

### Core Files
- `/src/lib/sessionRequestFsm.ts` - State machine
- `/src/app/api/requests/route.ts` - Request creation
- `/src/app/api/cron/expire-requests/route.ts` - Cron job
- `/supabase/migrations/99990021_add_request_timeout.sql` - Migration

### UI Components
- `/src/components/customer/PendingRequestBanner.tsx` - Customer UI
- `/src/components/customer/ActiveSessionsManager.tsx` - Session display

### Debug Endpoints
- `/src/app/api/debug/session-requests/route.ts` - Monitoring
- `/src/app/api/debug/cleanup-ghost-requests/route.ts` - Cleanup

### Type Definitions
- `/src/types/supabase.ts` - Database types
- `/src/types/session.ts` - Session types

## Future Enhancements

1. **Configurable Timeout**
   - Per-plan timeout durations
   - Business hours vs after-hours timeouts

2. **Smart Retries**
   - Auto-retry expired requests during peak hours
   - Queue system for high-demand periods

3. **Predictive Notifications**
   - Warn customers before expiration
   - Suggest alternative times

4. **Analytics Dashboard**
   - Real-time request metrics
   - Mechanic response times
   - Expiration trends

## Support

For issues or questions:
- Check debug endpoints first
- Review application logs
- Contact development team with request IDs
