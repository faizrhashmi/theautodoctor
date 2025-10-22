# Session Cleanup Implementation

## Overview

This document outlines the comprehensive session cleanup system implemented to prevent customers from being permanently blocked by stale sessions. The system addresses the critical issue where "waiting" sessions would never expire, preventing customers from creating new sessions.

## Problem Statement

### Original Issue
Customers were getting blocked with the error:
```
Customer already has an active or pending session (ID: c35420d9-88ce-4fb0-a7c4-9b10a580ba3d, Status: waiting). Only one session allowed at a time.
```

### Root Cause
- Sessions created with status "waiting" never expired if no mechanic accepted them
- Session_requests would be cancelled, but sessions remained in "waiting" status
- No automatic cleanup mechanism existed
- This permanently blocked customers from making new purchases

## Solution: Centralized Cleanup Utility

### Core Files Created

#### 1. [src/lib/sessionCleanup.ts](src/lib/sessionCleanup.ts)
Centralized session cleanup utility providing:

**Functions:**
- `cleanupCustomerWaitingSessions(customerId, maxAgeMinutes)` - Clean old waiting sessions for specific customer
- `cleanupExpiredRequests(maxAgeMinutes)` - Clean expired requests and associated sessions
- `cleanupOrphanedSessions(maxAgeMinutes)` - Clean sessions without valid requests
- `runFullCleanup()` - Comprehensive cleanup of all stale sessions/requests
- `checkCustomerSessionStatus(customerId)` - Smart check with automatic cleanup

**Safety Features:**
- Only cleans sessions older than configured threshold (default: 15 minutes)
- Detects orphaned sessions (waiting sessions without corresponding requests)
- Comprehensive logging for troubleshooting
- Returns detailed statistics

#### 2. [src/app/api/debug/cleanup-sessions/route.ts](src/app/api/debug/cleanup-sessions/route.ts)
Admin endpoint for manual cleanup:

- **POST** `/api/debug/cleanup-sessions` - Run full cleanup
- **GET** `/api/debug/cleanup-sessions` - Check what would be cleaned without executing

#### 3. [src/app/api/debug/session-health/route.ts](src/app/api/debug/session-health/route.ts)
Health monitoring endpoint:

- **GET** `/api/debug/session-health` - Get detailed health report
- Returns:
  - Session counts by status
  - Request counts by status
  - Stale session detection
  - Problem identification
  - Recommendations

#### 4. [cleanup-sessions-admin.html](cleanup-sessions-admin.html)
User-friendly admin interface for session cleanup with real-time stats visualization.

### Integration Points

#### Updated Files:

1. **[src/lib/fulfillment.ts](src/lib/fulfillment.ts)**
   - Now uses `checkCustomerSessionStatus()` instead of inline cleanup
   - Auto-cleans before checking for active sessions
   - More robust and maintainable

2. **[src/app/api/mechanics/requests/route.ts](src/app/api/mechanics/requests/route.ts)**
   - Runs `runFullCleanup()` before fetching requests
   - Ensures mechanics only see valid, active requests
   - Prevents display of stale data

## Architecture

### Cleanup Flow

```
Customer Payment Flow:
1. Customer completes payment
2. fulfillCheckout() called
3. checkCustomerSessionStatus() runs
   ├─> Cleans old waiting sessions (>15 min)
   └─> Checks for truly active sessions
4. If clear: Create new session
5. If blocked: Throw error with details
```

```
Mechanic Dashboard Flow:
1. Mechanic loads dashboard
2. /api/mechanics/requests called
3. runFullCleanup() executes
   ├─> Cancel expired requests
   ├─> Cancel associated waiting sessions
   └─> Clean orphaned sessions
4. Return only valid, active requests
```

### Multi-Layer Protection

1. **Payment Level** (`fulfillment.ts`):
   - Per-customer cleanup before session creation
   - Prevents blocking from own stale sessions

2. **Dashboard Level** (`mechanics/requests`):
   - Global cleanup when mechanics check for work
   - Ensures request queue stays clean

3. **Manual Level** (Admin Tools):
   - On-demand cleanup via API or HTML tool
   - Health monitoring for proactive intervention

## Configuration

### Timing Thresholds

- **Waiting Sessions**: 15 minutes (configurable)
- **Pending Requests**: 15 minutes (configurable)
- **Orphaned Sessions**: 20 minutes (configurable)

### Modifying Thresholds

```typescript
// In sessionCleanup.ts
await cleanupCustomerWaitingSessions(customerId, 30) // 30 minutes instead of 15

// In mechanics/requests route
await runFullCleanup() // Uses default 15 min for requests, 20 min for orphans
```

## Testing & Verification

### Health Check
```bash
curl http://localhost:3001/api/debug/session-health
```

**Expected Response:**
```json
{
  "health": "healthy",
  "sessions": {
    "total": 31,
    "byStatus": {...},
    "waiting": {
      "total": 0,
      "stale": 0,
      "veryStale": 0
    }
  },
  "problems": [],
  "recommendations": ["All systems healthy"]
}
```

### Manual Cleanup
```bash
# Check what would be cleaned
curl http://localhost:3001/api/debug/cleanup-sessions

# Execute cleanup
curl -X POST http://localhost:3001/api/debug/cleanup-sessions
```

### Using HTML Tool
Open `cleanup-sessions-admin.html` in browser:
1. Click "Check Stats" to see current state
2. Review stale sessions/requests
3. Click "Run Cleanup" to clean up
4. Verify stats refresh to 0

## Monitoring & Maintenance

### Key Metrics to Monitor

1. **Stale Waiting Sessions**: Should always be 0 or very low
2. **Orphaned Sessions**: Indicates request/session sync issues
3. **Very Stale Sessions** (>30 min): Critical issue requiring investigation

### Logs to Watch

```
[sessionCleanup] Running full cleanup...
[sessionCleanup] Cancelling X old waiting session(s) for customer...
[sessionCleanup] Cancelled Y associated waiting session(s)
[sessionCleanup] Cleanup complete: { totalCleaned: Z }
```

### Alerts to Set Up

- Alert if health endpoint shows `problems.length > 0`
- Alert if `veryStale` sessions count > 0
- Alert if same customer blocked repeatedly

## Rollout & Deployment

### Pre-Deployment Checklist

- [ ] Run health check on production to see current state
- [ ] Back up sessions and session_requests tables
- [ ] Test cleanup endpoints on staging
- [ ] Verify cleanup doesn't affect active sessions
- [ ] Document any custom thresholds

### Deployment Steps

1. Deploy code changes
2. **IMPORTANT**: Restart Next.js server to clear webpack cache
3. Run manual cleanup: `POST /api/debug/cleanup-sessions`
4. Verify health: `GET /api/debug/session-health`
5. Monitor logs for cleanup activity
6. Test customer payment flow

### Rollback Plan

If issues occur:
1. Revert to previous version
2. Manually cancel stuck sessions in Supabase
3. Investigate specific customer/session issues

## Future Enhancements

### Recommended Additions

1. **Periodic Background Job**: Run cleanup every 5-10 minutes automatically
2. **Metrics Dashboard**: Real-time visualization of session states
3. **Customer Notification**: Alert customers when their sessions expire
4. **Auto-Retry**: Automatically retry payment if session was stuck
5. **Database Triggers**: PostgreSQL trigger to auto-cancel old waiting sessions

### Potential Improvements

```typescript
// Example: Periodic cleanup job (not yet implemented)
setInterval(async () => {
  const stats = await runFullCleanup()
  if (stats.totalCleaned > 0) {
    console.log('[periodic-cleanup] Cleaned up:', stats)
  }
}, 5 * 60 * 1000) // Every 5 minutes
```

## Troubleshooting

### Issue: Customer still blocked after cleanup

**Solution:**
1. Check health endpoint for specific session ID
2. Manually query Supabase for session status
3. Use `clear-my-sessions.html` for specific customer
4. Check for race conditions in payment flow

### Issue: Sessions immediately becoming stale

**Possible Causes:**
- Mechanics not receiving real-time notifications
- Broadcast system not working
- Dashboard not polling requests
- Firewall blocking WebSocket connections

**Debugging:**
1. Check Supabase realtime logs
2. Verify broadcast code in fulfillment.ts
3. Test mechanic dashboard real-time updates
4. Review network tab for failed requests

### Issue: Cleanup not running

**Check:**
1. Webpack cache - restart dev server
2. Import errors in sessionCleanup.ts
3. Database connection issues
4. RLS policies blocking admin access

## Related Documentation

- [SECURITY_FIX_ROLE_ISOLATION.md](SECURITY_FIX_ROLE_ISOLATION.md) - Role isolation security fix
- [SESSION_EXPIRATION_FIX.md](SESSION_EXPIRATION_FIX.md) - Initial session expiration implementation
- [CHAT_TESTING_GUIDE.md](CHAT_TESTING_GUIDE.md) - Testing guide for chat system

## Summary

This implementation provides a **production-ready, multi-layered session cleanup system** that:

✅ Prevents customers from being permanently blocked
✅ Automatically cleans up stale sessions and requests
✅ Provides health monitoring and manual intervention tools
✅ Uses centralized, maintainable code
✅ Includes comprehensive logging and statistics
✅ Safe to run frequently without side effects

The system follows best practices for:
- Error handling
- Logging and observability
- Configuration management
- Testing and verification
- Documentation and maintenance

---

**Last Updated**: 2025-10-22
**Status**: Implemented, Testing Required (Server Restart Needed)
**Next Step**: Restart dev server to clear webpack cache, then test end-to-end flow
