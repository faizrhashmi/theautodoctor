# Session Request Timeout Implementation - Complete Summary

## Problem Statement

**Issue:** Orphaned session requests persist in the system when mechanics don't respond, causing:
- Stuck requests in pending state indefinitely
- Confusion for customers waiting for responses
- No automatic cleanup or timeout mechanism
- No customer notification when requests go unanswered

## Solution Overview

Implemented a comprehensive automatic timeout and expiration system with:
- **15-minute timeout** for pending requests
- **Automatic status change** to 'expired'
- **Email notifications** to customers
- **Real-time UI updates** removing expired requests
- **Proper FSM enforcement** for state transitions
- **Health monitoring** via debug endpoints

---

## Changes Made

### 1. Database Changes

#### Migration File: `supabase/migrations/99990021_add_request_timeout.sql`

**New Column:**
```sql
ALTER TABLE session_requests ADD COLUMN expires_at TIMESTAMPTZ;
```

**New Function:**
```sql
CREATE FUNCTION expire_old_session_requests()
RETURNS TABLE (expired_count INTEGER, expired_request_ids TEXT[])
```
- Marks pending requests as 'expired' when `expires_at < NOW()`
- Returns count and IDs of expired requests

**New Trigger:**
```sql
CREATE TRIGGER trigger_set_session_request_expiration
BEFORE INSERT ON session_requests
```
- Automatically sets `expires_at = created_at + 15 minutes` on new requests

**New Index:**
```sql
CREATE INDEX idx_session_requests_expiration
ON session_requests(status, expires_at)
WHERE status = 'pending' AND expires_at IS NOT NULL
```
- Optimizes expiration queries

---

### 2. State Machine

#### New File: `src/lib/sessionRequestFsm.ts`

Enforces valid state transitions for session requests:

```typescript
pending → accepted   // Mechanic accepts
pending → expired    // Timeout reached
pending → cancelled  // Customer cancels
```

Terminal states: `accepted`, `expired`, `cancelled`, `unattended`

**Key Functions:**
- `canRequestTransition(from, to)` - Check if transition is valid
- `assertRequestTransition(from, to)` - Throw error if invalid
- `isRequestAwaitingMechanic(state)` - Check if awaiting response
- `isRequestResolved(state)` - Check if terminal state

---

### 3. Request Creation Update

#### Modified: `src/app/api/requests/route.ts`

**Added expiration timestamp:**
```typescript
const expiresAt = new Date()
expiresAt.setMinutes(expiresAt.getMinutes() + 15)

await supabase.from('session_requests').insert({
  // ... existing fields
  expires_at: expiresAt.toISOString(),
})
```

---

### 4. Automatic Expiration Cron Job

#### New File: `src/app/api/cron/expire-requests/route.ts`

**Functionality:**
- Runs every 2 minutes via Vercel Cron
- Calls `expire_old_session_requests()` database function
- Broadcasts expiration events to real-time listeners
- Sends email notifications to customers
- Protected by `CRON_SECRET` environment variable

**Key Features:**
- POST endpoint for cron execution
- GET endpoint for manual testing/debugging
- Comprehensive error handling
- Detailed logging

**Email Notification:**
- Explains timeout occurred
- Confirms no charges made
- Provides link to submit new request
- Suggests trying during business hours

---

### 5. Render Cron Configuration

**Note:** Since you're using Render (not Vercel), you'll need to set up a Render Cron Job separately.

See **[RENDER_CRON_SETUP.md](RENDER_CRON_SETUP.md)** for detailed setup instructions.

The cron job should:
- Call `POST /api/cron/expire-requests` every 2 minutes
- Include `Authorization: Bearer $CRON_SECRET` header
- Run against your deployed Render web service URL

---

### 6. Enhanced Debug Endpoints

#### Modified: `src/app/api/debug/session-requests/route.ts`

**New Metrics:**
- `shouldBeExpiredButArent` - Requests past expiration that haven't been marked
- `stuckRequests` - Pending requests older than 30 minutes
- `statusBreakdown` - Count by status
- `expiredRequests` - Recently expired requests

**Sample Response:**
```json
{
  "summary": {
    "totalRequests": 20,
    "pendingWithNullMechanic": 2,
    "expiredRequests": 5,
    "shouldBeExpiredButArent": 0,
    "stuckRequests": 0,
    "statusBreakdown": {
      "pending": 2,
      "accepted": 10,
      "expired": 5,
      "cancelled": 3
    }
  },
  "allRequests": [...],
  "pendingRequests": [...],
  "expiredRequests": [...],
  "shouldBeExpired": [],
  "stuckRequests": []
}
```

#### Modified: `src/app/api/debug/cleanup-ghost-requests/route.ts`

**Enhanced Cleanup:**
- Expires stuck requests properly (instead of deleting)
- Calls `expire_old_session_requests()` function
- Removes very old requests (>7 days) by deleting
- Provides detailed cleanup summary

---

### 7. Customer UI Component

#### New File: `src/components/customer/PendingRequestBanner.tsx`

**Features:**
- Live countdown timer showing time remaining
- Real-time updates via Supabase subscriptions
- Auto-removes when request is accepted/expired
- Allow customer to cancel request
- Visual indicators (pulsing animation, color changes)
- Expired state with instructions

**Usage:**
```tsx
<PendingRequestBanner initialRequest={pendingRequest} />
```

---

### 8. Type Updates

#### Modified: `src/types/supabase.ts`

Added `expires_at` field to `session_requests` table types:

```typescript
session_requests: {
  Row: {
    // ... existing fields
    expires_at: string | null
  }
  Insert: {
    // ... existing fields
    expires_at?: string | null
  }
  Update: {
    // ... existing fields
    expires_at?: string | null
  }
}
```

---

### 9. Documentation

#### New File: `docs/SESSION_REQUEST_TIMEOUT.md`

Comprehensive documentation covering:
- System architecture
- Configuration
- Testing procedures
- Monitoring guidelines
- Troubleshooting
- File reference

#### Updated: `.env.example`

Added new environment variables:
```bash
# Email notifications
REQUEST_ALERT_FROM_EMAIL="Auto Doctor <notifications@theautodoctor.com>"
REQUEST_ALERT_RECIPIENTS=mechanic1@example.com,mechanic2@example.com

# Cron Job Security
CRON_SECRET=your-random-secret-here

# Debug endpoint security
DEBUG_SECRET=your-debug-secret-here
```

---

## Deployment Checklist

### 1. Environment Variables

Add to Render Environment Variables (in your web service settings):
```bash
CRON_SECRET=<generate with: openssl rand -hex 32>
REQUEST_ALERT_FROM_EMAIL="Auto Doctor <notifications@theautodoctor.com>"
REQUEST_ALERT_RECIPIENTS=<your-mechanic-emails>
```

### 2. Database Migration

**IMPORTANT:** Review the migration file before running!

```bash
# Run the migration
npx supabase db push

# Or apply via Supabase dashboard:
# Copy contents of supabase/migrations/99990021_add_request_timeout.sql
# Paste into SQL Editor and execute
```

**Verification:**
```sql
-- Check column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'session_requests' AND column_name = 'expires_at';

-- Check function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'expire_old_session_requests';

-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'trigger_set_session_request_expiration';

-- Test the function
SELECT * FROM expire_old_session_requests();
```

### 3. Render Cron Setup

Set up a Render Cron Job to call your expiration endpoint.

**Three options:**
1. **Render Cron Job** (Recommended) - Native Render integration
2. **Supabase pg_cron** - Database-level cron
3. **External Service** (cron-job.org) - Third-party service

**Detailed setup instructions:** See [RENDER_CRON_SETUP.md](RENDER_CRON_SETUP.md)

**Quick Setup (Render Cron Job):**
1. Go to Render Dashboard
2. New + → Cron Job
3. Command: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-app.onrender.com/api/cron/expire-requests`
4. Schedule: `*/2 * * * *`
5. Add `CRON_SECRET` environment variable

### 4. Test the System

**Create a test request:**
```bash
# 1. Create request via UI or API
# 2. Wait 15 minutes OR manually trigger expiration

# Manually trigger (for testing):
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/expire-requests
```

**Check debug endpoint:**
```bash
curl -H "Authorization: Bearer YOUR_DEBUG_SECRET" \
  https://your-domain.com/api/debug/session-requests
```

---

## Monitoring

### Key Metrics to Track

1. **Expiration Rate**
   - What % of requests expire vs. get accepted?
   - High rate (>30%) indicates mechanic shortage

2. **Time to Acceptance**
   - Average time from creation to acceptance
   - Should be <5 minutes during business hours

3. **Stuck Requests**
   - Requests pending for >30 minutes
   - Should be 0 (cron should handle them)

### Alerts to Set Up

Create alerts for:
- Expiration rate > 30%
- Pending requests > 10
- Stuck requests detected
- Cron job failures

---

## Testing Scenarios

### Scenario 1: Normal Flow
1. Customer creates request
2. Mechanic accepts within 15 minutes
3. Status changes to 'accepted'
4. Request never expires

### Scenario 2: Timeout Flow
1. Customer creates request
2. No mechanic accepts
3. After 15 minutes, cron job runs
4. Status changes to 'expired'
5. Customer receives email notification
6. UI removes pending request banner

### Scenario 3: Manual Cancellation
1. Customer creates request
2. Customer clicks cancel button
3. Status changes to 'cancelled'
4. Banner disappears immediately

### Scenario 4: Stuck Request Recovery
1. Request somehow gets stuck (expires_at passed but status still pending)
2. Debug endpoint shows in `shouldBeExpired`
3. Manual cleanup endpoint fixes it
4. Status changes to 'expired'

---

## Rollback Plan

If issues arise:

### Quick Disable
```sql
-- Disable the trigger temporarily
DROP TRIGGER IF EXISTS trigger_set_session_request_expiration ON session_requests;

-- Or disable cron in Vercel dashboard
```

### Full Rollback
```sql
-- Remove column
ALTER TABLE session_requests DROP COLUMN IF EXISTS expires_at;

-- Drop function
DROP FUNCTION IF EXISTS expire_old_session_requests();

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_set_session_request_expiration ON session_requests;

-- Drop index
DROP INDEX IF EXISTS idx_session_requests_expiration;
```

Then:
- Revert code changes
- Remove vercel.json
- Redeploy

---

## Files Modified/Created

### New Files (12)
1. `supabase/migrations/99990021_add_request_timeout.sql` - Migration
2. `src/lib/sessionRequestFsm.ts` - State machine
3. `src/app/api/cron/expire-requests/route.ts` - Cron job
4. `src/components/customer/PendingRequestBanner.tsx` - UI component
5. `docs/SESSION_REQUEST_TIMEOUT.md` - Documentation
6. `RENDER_CRON_SETUP.md` - Render cron setup guide
7. `REQUEST_TIMEOUT_IMPLEMENTATION.md` - This file

### Modified Files (4)
1. `src/app/api/requests/route.ts` - Added expires_at
2. `src/app/api/debug/session-requests/route.ts` - Enhanced monitoring
3. `src/app/api/debug/cleanup-ghost-requests/route.ts` - Proper expiration
4. `src/types/supabase.ts` - Added expires_at field
5. `.env.example` - Added new env vars

---

## Support & Troubleshooting

### Common Issues

**Issue: Requests not expiring**
- Check cron job is running (Vercel logs)
- Verify CRON_SECRET is set
- Test database function manually
- Check for requests missing expires_at

**Issue: Notifications not sent**
- Verify RESEND_API_KEY is set
- Check customer has valid email
- Review Resend dashboard
- Check application logs

**Issue: Real-time updates not working**
- Ensure Supabase Realtime is enabled
- Check RLS policies
- Verify client subscriptions
- Browser console for errors

### Debug Commands

```sql
-- Find stuck requests
SELECT * FROM session_requests
WHERE status = 'pending'
  AND expires_at < NOW()
ORDER BY created_at DESC;

-- Manually expire them
SELECT * FROM expire_old_session_requests();

-- Check recent expirations
SELECT * FROM session_requests
WHERE status = 'expired'
ORDER BY updated_at DESC
LIMIT 10;

-- Stats by status
SELECT status, COUNT(*)
FROM session_requests
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

---

## Success Criteria

The implementation is successful when:

✅ New requests automatically have `expires_at` timestamp
✅ Cron job runs every 2 minutes without errors
✅ Requests expire after 15 minutes if not accepted
✅ Customers receive email notifications
✅ UI updates in real-time (banner disappears)
✅ Debug endpoints show accurate metrics
✅ No stuck requests remain in system
✅ State transitions follow FSM rules

---

## Next Steps (Optional Enhancements)

1. **Configurable Timeouts**
   - Per-plan timeout durations
   - Business hours vs after-hours timeouts

2. **Smart Retries**
   - Auto-retry expired requests
   - Queue system for high-demand periods

3. **Predictive Warnings**
   - Warn customers at 5 minutes remaining
   - Suggest alternative times

4. **Analytics Dashboard**
   - Real-time request metrics
   - Mechanic response time tracking
   - Expiration trend analysis

---

**Implementation Date:** 2025-10-28
**Status:** ✅ Complete - Ready for Testing
**Priority:** P0 - Critical Bug Fix
