# Admin Monitoring and Debugging Tools

Comprehensive system monitoring, logging, and debugging tools for the AskAutoDoctor admin panel.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [System Logs Viewer](#system-logs-viewer)
- [Error Tracking Dashboard](#error-tracking-dashboard)
- [Database Query Tool](#database-query-tool)
- [System Health Monitor](#system-health-monitor)
- [Cleanup Tools](#cleanup-tools)
- [Centralized Logging](#centralized-logging)
- [API Reference](#api-reference)

---

## Overview

The admin monitoring tools provide comprehensive visibility into system operations, errors, and health status. All tools are accessible through the admin panel navigation.

### Features

- Real-time log streaming and filtering
- Error tracking with grouping and analytics
- Safe database query execution
- System health monitoring
- Automated cleanup tools
- Centralized structured logging

---

## Setup

### 1. Run Database Migration

Execute the migration to create necessary tables:

```bash
# Run the migration file
psql -f supabase/migrations/20251023000000_admin_logs_and_monitoring.sql
```

Or through Supabase dashboard:
- Go to SQL Editor
- Copy contents of `supabase/migrations/20251023000000_admin_logs_and_monitoring.sql`
- Execute

### 2. Environment Variables

Ensure these are set in your `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
STRIPE_SECRET_KEY=your_stripe_key
```

### 3. Access Admin Tools

Navigate to:
- Logs: `/admin/logs`
- Errors: `/admin/errors`
- Database: `/admin/database`
- Health: `/admin/health`
- Cleanup: `/admin/cleanup`

---

## System Logs Viewer

**Location:** `/admin/logs`

### Features

- **Real-time streaming** - Auto-refreshes every 5 seconds
- **Multi-level filtering** - Filter by error, warn, info, debug
- **Source filtering** - Filter by api, auth, session, payment, database, etc.
- **Full-text search** - Search log messages
- **Date range filtering** - Filter logs by time period
- **Auto-scroll toggle** - Keep latest logs in view
- **Export logs** - Download logs as JSON
- **Log details modal** - View full log details including metadata

### Log Levels

- **ERROR**: Critical errors requiring immediate attention
- **WARN**: Warning conditions that should be monitored
- **INFO**: General informational messages
- **DEBUG**: Detailed debug information

### Log Sources

- **api**: API route handlers
- **auth**: Authentication events
- **session**: Session lifecycle events
- **payment**: Payment processing
- **database**: Database operations
- **system**: System-level events
- **cleanup**: Cleanup operations
- **livekit**: LiveKit video service
- **email**: Email delivery

### Usage Example

```typescript
import { logger } from '@/lib/adminLogger'

// Log an error
await logger.error('api', 'Failed to process request', {
  requestId: req.id,
  userId: user.id,
  errorStack: error.stack
})

// Log session event
await logger.logSessionEvent('Session started', sessionId, {
  customerId: customer.id,
  mechanicId: mechanic.id
})
```

---

## Error Tracking Dashboard

**Location:** `/admin/errors`

### Features

- **Error grouping** - Automatically groups similar errors
- **Occurrence tracking** - Tracks how many times each error occurred
- **Affected users** - Shows which users were impacted
- **Status management** - Mark errors as open, investigating, resolved, or ignored
- **Stack traces** - Full error stack trace viewer
- **Resolution notes** - Document how errors were resolved
- **Auto-refresh** - Updates every 10 seconds

### Error Statuses

- **Open**: Newly detected errors requiring attention
- **Investigating**: Currently being investigated
- **Resolved**: Fixed and deployed
- **Ignored**: Known issues or false positives

### Workflow

1. New errors appear with "Open" status
2. Click "Details" to view full error information
3. Mark as "Investigating" while working on fix
4. Add resolution notes and mark as "Resolved" when fixed
5. Or mark as "Ignored" for known non-issues

### Usage Example

```typescript
// Errors are automatically tracked when using the logger
try {
  await riskyOperation()
} catch (error) {
  await logger.logError(error as Error, 'payment', {
    orderId: order.id,
    amount: order.total
  })
  throw error
}
```

---

## Database Query Tool

**Location:** `/admin/database`

### Features

- **SQL query editor** - Syntax-highlighted query editor
- **Read-only mode** - Only SELECT queries allowed for safety
- **Saved queries library** - Save and organize frequently used queries
- **Query history** - Track all executed queries
- **Export results** - Download as JSON or CSV
- **Execution metrics** - See query execution time and row count
- **Query categories** - Organize queries by category

### Safety Features

- Only SELECT, SHOW, DESCRIBE, EXPLAIN queries allowed
- Dangerous keywords (DROP, DELETE, UPDATE, etc.) are blocked
- All queries are logged with execution time
- Dry-run validation before execution

### Pre-loaded Queries

The tool comes with several useful queries:

- **Active Sessions** - Currently active video sessions
- **Recent Errors** - Errors from last 24 hours
- **Pending Requests** - Pending session requests
- **User Activity** - Registration and activity stats
- **Payment Transactions** - Recent payments
- **Database Table Sizes** - Storage usage by table
- **Session Duration Stats** - Average session lengths
- **Mechanic Availability** - Mechanic status overview

### Usage

1. Write or load a query
2. Click "Execute Query"
3. View results in table format
4. Export if needed
5. Save query for future use

### Example Queries

```sql
-- Get sessions created in last hour
SELECT * FROM sessions
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Count sessions by status
SELECT status, COUNT(*) as count
FROM sessions
GROUP BY status;

-- Find high-value customers
SELECT customer_id, COUNT(*) as session_count
FROM sessions
WHERE status = 'completed'
GROUP BY customer_id
HAVING COUNT(*) > 5
ORDER BY session_count DESC;
```

---

## System Health Monitor

**Location:** `/admin/health`

### Features

- **Service status indicators** - Real-time status for all services
- **Response time monitoring** - Track service response times
- **Uptime percentage** - 24-hour uptime statistics
- **Recent incidents** - Recent errors and issues
- **Auto-refresh** - Updates every 30 seconds
- **Overall system status** - At-a-glance health overview

### Monitored Services

1. **Supabase** - Database and authentication
2. **LiveKit** - Video conferencing service
3. **Stripe** - Payment processing
4. **Email** - Email delivery service
5. **Storage** - File storage service

### Status Levels

- **Healthy**: Service operating normally (green)
- **Degraded**: Service experiencing issues (yellow)
- **Down**: Service unavailable (red)

### Uptime Calculation

- Based on health checks performed every 30 seconds
- Shows percentage of successful checks in last 24 hours
- Uptime >= 99.9% is excellent (green)
- Uptime >= 95% is acceptable (yellow)
- Uptime < 95% needs attention (red)

---

## Cleanup Tools

**Location:** `/admin/cleanup`

### Features

- **Preview mode** - See what will be cleaned before executing
- **Dry-run capability** - Test cleanup without making changes
- **Cleanup history** - Track all cleanup operations
- **Safety checks** - Built-in validations to prevent data loss
- **Auto-refresh** - Updates every 30 seconds

### Cleanup Types

1. **Expired Requests**
   - Pending for more than 15 minutes
   - Status changed to "expired"

2. **Old Waiting Sessions**
   - Waiting for more than 1 hour
   - Status changed to "cancelled"

3. **Orphaned Sessions**
   - Active for more than 2 hours
   - No corresponding LiveKit room
   - Status changed to "error"

### Usage Workflow

1. **Check Stats** - View current cleanup statistics
2. **Preview** - See detailed list of items to be cleaned
3. **Dry Run** - Test cleanup without changes
4. **Execute** - Run actual cleanup
5. **Review History** - Check cleanup logs

### Safety Features

- Confirmation dialog for actual cleanup
- Dry-run mode enabled by default
- All cleanups are logged
- Preview shows exactly what will be affected

---

## Centralized Logging

**Location:** `src/lib/adminLogger.ts`

### Usage

```typescript
import { logger } from '@/lib/adminLogger'

// Error logging
await logger.error('api', 'Payment failed', {
  userId: user.id,
  amount: 100,
  errorCode: 'CARD_DECLINED'
})

// Warning logging
await logger.warn('session', 'Session timeout approaching', {
  sessionId: session.id,
  timeRemaining: 300
})

// Info logging
await logger.info('auth', 'User logged in', {
  userId: user.id,
  ip: req.ip
})

// Debug logging
await logger.debug('database', 'Query executed', {
  query: sql,
  duration: 45
})

// Specialized loggers
await logger.logApiRequest('POST', '/api/sessions', 200, 150)
await logger.logAuthEvent('Login successful', userId)
await logger.logSessionEvent('Session started', sessionId)
await logger.logPaymentEvent('Payment processed', { amount: 100 })
await logger.logError(error, 'payment')
await logger.logCleanupEvent('Cleaned expired requests', { count: 5 })
```

### Log Structure

```typescript
interface LogEntry {
  id: string
  level: 'error' | 'warn' | 'info' | 'debug'
  source: 'api' | 'auth' | 'session' | 'payment' | 'database' | 'system' | 'cleanup' | 'livekit' | 'email'
  message: string
  metadata?: {
    userId?: string
    sessionId?: string
    requestId?: string
    errorStack?: string
    duration?: number
    statusCode?: number
    [key: string]: any
  }
  created_at: string
}
```

---

## API Reference

### Logs API

#### GET `/api/admin/logs`

Get logs with filtering.

**Query Parameters:**
- `level` - Comma-separated log levels (e.g., "error,warn")
- `source` - Comma-separated sources (e.g., "api,auth")
- `search` - Search query for message text
- `startDate` - ISO date string
- `endDate` - ISO date string
- `limit` - Number of logs (default: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "logs": [/* LogEntry[] */],
  "total": 150
}
```

#### GET `/api/admin/logs/stats`

Get log statistics.

**Query Parameters:**
- `hours` - Number of hours to analyze (default: 24)

**Response:**
```json
{
  "total": 1500,
  "byLevel": {
    "error": 50,
    "warn": 200,
    "info": 1000,
    "debug": 250
  },
  "bySource": {
    "api": 500,
    "session": 400,
    "auth": 300,
    ...
  }
}
```

### Errors API

#### GET `/api/admin/errors`

Get tracked errors.

**Query Parameters:**
- `status` - Filter by status (open, investigating, resolved, ignored)
- `source` - Filter by source
- `limit` - Number of errors (default: 50)
- `offset` - Pagination offset (default: 0)

#### PATCH `/api/admin/errors/[id]`

Update error status.

**Body:**
```json
{
  "status": "resolved",
  "resolution_notes": "Fixed by updating payment gateway config"
}
```

### Database API

#### POST `/api/admin/database/query`

Execute SQL query.

**Body:**
```json
{
  "query": "SELECT * FROM sessions LIMIT 10",
  "save": true,  // optional
  "name": "Recent Sessions",  // if save=true
  "description": "Get recent sessions",  // optional
  "category": "sessions"  // optional
}
```

**Response:**
```json
{
  "data": [/* query results */],
  "executionTime": 45,
  "rowCount": 10
}
```

#### GET `/api/admin/database/saved-queries`

Get saved queries.

**Query Parameters:**
- `category` - Filter by category

#### GET `/api/admin/database/history`

Get query execution history.

**Query Parameters:**
- `limit` - Number of history items (default: 50)

### Health API

#### GET `/api/admin/health`

Get system health status.

**Response:**
```json
{
  "status": "healthy",
  "services": [
    {
      "service": "supabase",
      "status": "healthy",
      "responseTime": 45,
      "lastChecked": "2025-10-23T10:30:00Z"
    },
    ...
  ],
  "recentIncidents": [/* recent errors */],
  "uptime": {
    "supabase": {
      "total": 100,
      "healthy": 99,
      "percentage": 99.0
    },
    ...
  }
}
```

### Cleanup API

#### GET `/api/admin/cleanup/preview`

Preview cleanup actions.

**Response:**
```json
{
  "expiredRequests": {
    "count": 5,
    "items": [/* items to clean */]
  },
  "oldWaitingSessions": {
    "count": 2,
    "items": [/* items to clean */]
  },
  "potentialOrphans": {
    "count": 1,
    "items": [/* items to clean */]
  },
  "total": 8
}
```

#### POST `/api/admin/cleanup/execute`

Execute cleanup.

**Body:**
```json
{
  "dryRun": true  // default: false
}
```

**Response:**
```json
{
  "success": true,
  "dryRun": true,
  "summary": {
    "expiredRequests": 5,
    "oldWaitingSessions": 2,
    "orphanedSessions": 1,
    "totalCleaned": 8
  }
}
```

#### GET `/api/admin/cleanup/history`

Get cleanup history.

**Query Parameters:**
- `limit` - Number of history items (default: 50)

---

## Best Practices

### Logging

1. **Use appropriate log levels**
   - ERROR for critical issues
   - WARN for potential problems
   - INFO for important events
   - DEBUG for detailed diagnostics

2. **Include context in metadata**
   - Always include relevant IDs (userId, sessionId, etc.)
   - Add error stacks for exceptions
   - Include request/response data when helpful

3. **Don't log sensitive data**
   - Never log passwords, tokens, or API keys
   - Redact payment card numbers
   - Sanitize user input before logging

### Error Tracking

1. **Respond to errors quickly**
   - Check error dashboard daily
   - Set up alerts for critical errors
   - Investigate high-frequency errors first

2. **Document resolutions**
   - Always add resolution notes
   - Include what caused the error
   - Explain how it was fixed

### Database Queries

1. **Test with LIMIT first**
   - Always add LIMIT to new queries
   - Test on small result sets
   - Verify query performance

2. **Save useful queries**
   - Build a library of common queries
   - Add descriptions
   - Categorize appropriately

### Health Monitoring

1. **Monitor uptime trends**
   - Track degradation patterns
   - Set up alerts for downtime
   - Review incident reports

2. **Check before deployments**
   - Verify all services healthy
   - No open critical errors
   - Review recent logs

### Cleanup

1. **Run preview first**
   - Always check what will be cleaned
   - Use dry-run mode initially
   - Review cleanup history

2. **Schedule regular cleanups**
   - Run cleanup weekly
   - Monitor orphaned sessions
   - Keep cleanup history for auditing

---

## Troubleshooting

### Logs not appearing

1. Check database migration was run
2. Verify service role key is set
3. Check browser console for errors
4. Ensure logger is imported correctly

### Database queries failing

1. Verify query syntax is correct
2. Check for dangerous keywords
3. Ensure tables exist
4. Review error message in response

### Health checks showing "down"

1. Verify environment variables are set
2. Check service is actually running
3. Review service configuration
4. Check network connectivity

### Cleanup not working

1. Check cleanup preview first
2. Verify no database constraints
3. Review error logs
4. Check cleanup history for details

---

## Future Enhancements

Potential improvements for future versions:

- [ ] Real-time log streaming with WebSockets
- [ ] Advanced log analytics and charts
- [ ] Custom alert rules and notifications
- [ ] Performance metrics dashboard
- [ ] Cost tracking and optimization
- [ ] Automated cleanup scheduling
- [ ] Custom report generation
- [ ] Integration with external monitoring tools
- [ ] Mobile-friendly admin views
- [ ] Multi-user admin access with roles

---

## Support

For questions or issues:

1. Check this documentation first
2. Review error logs in `/admin/errors`
3. Check system health in `/admin/health`
4. Review cleanup history in `/admin/cleanup`
5. Search logs in `/admin/logs` for relevant events

---

**Version:** 1.0.0
**Last Updated:** 2025-10-23
