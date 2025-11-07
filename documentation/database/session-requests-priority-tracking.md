# Session Requests Priority Tracking - Database Schema Evolution

**Date Implemented**: November 2, 2025 (Phase 4)
**Table**: `session_requests`
**Category**: Database Schema Evolution
**Status**: ✅ **PRODUCTION READY**

---

## Overview

This document details the evolution of the `session_requests` table to support the Favorites Priority Broadcast system, specifically focusing on the database schema changes made in Phase 4.

### What Changed

Added **3 new columns** to the `session_requests` table for tracking priority notification flow:

1. `preferred_mechanic_id` - UUID foreign key to mechanics
2. `priority_window_minutes` - Configurable priority duration (default 10)
3. `priority_notified_at` - Timestamp when priority notification sent

### Why This Matters

**Before (Phase 3 - JSONB Metadata):**
- Priority data stored in `metadata` JSONB column
- ❌ Not queryable with standard SQL
- ❌ No type safety (required `as any` casts)
- ❌ No indexes
- ❌ No foreign key validation
- ❌ Difficult for analytics

**After (Phase 4 - Dedicated Columns):**
- Priority data in dedicated typed columns
- ✅ Queryable with standard SQL
- ✅ Full TypeScript type safety
- ✅ 3 specialized indexes for performance
- ✅ Foreign key constraint prevents invalid mechanic IDs
- ✅ Easy analytics with JOIN, GROUP BY, aggregations

---

## Schema Definition

### New Columns

| Column Name | Type | Nullable | Default | Description |
|-------------|------|----------|---------|-------------|
| `preferred_mechanic_id` | UUID | YES | NULL | Foreign key to mechanics table - the favorite mechanic who receives priority notification |
| `priority_window_minutes` | INTEGER | NO | 10 | Duration in minutes for the priority window before fallback broadcast |
| `priority_notified_at` | TIMESTAMPTZ | YES | NULL | Timestamp when priority notification was sent to preferred mechanic |

### Column Details

#### preferred_mechanic_id

**Purpose**: Identifies which mechanic should receive priority notification

**Constraints**:
```sql
CONSTRAINT session_requests_preferred_mechanic_id_fkey
  FOREIGN KEY (preferred_mechanic_id)
  REFERENCES public.mechanics(id)
  ON DELETE SET NULL
```

**Behavior**:
- `NULL`: No priority flow (standard broadcast)
- Valid UUID: Priority notification sent to this mechanic
- ON DELETE SET NULL: If mechanic deleted, session request remains valid

**Usage**:
```sql
-- Find all requests for a specific favorite mechanic
SELECT * FROM session_requests
WHERE preferred_mechanic_id = '<mechanic-uuid>';

-- Count priority requests per mechanic
SELECT preferred_mechanic_id, COUNT(*)
FROM session_requests
WHERE preferred_mechanic_id IS NOT NULL
GROUP BY preferred_mechanic_id;
```

#### priority_window_minutes

**Purpose**: Configurable duration for priority window

**Constraints**:
- NOT NULL (always has a value)
- DEFAULT 10 (10-minute priority window)

**Behavior**:
- Currently hardcoded to 10 in application code
- Column allows for future dynamic configuration
- Could be adjusted per-mechanic or per-plan

**Future Usage**:
```sql
-- Premium mechanics get longer priority window
UPDATE session_requests
SET priority_window_minutes = 15
WHERE preferred_mechanic_id IN (SELECT id FROM mechanics WHERE tier = 'premium');
```

#### priority_notified_at

**Purpose**: Track when priority notification was sent

**Constraints**:
- Nullable (NULL if priority flow not used)
- TIMESTAMPTZ (timezone-aware)

**Behavior**:
- `NULL`: Priority flow not used or notification failed
- Timestamp: Priority notification sent at this time
- Used to calculate timeout (notified_at + window_minutes)

**Usage**:
```sql
-- Find requests where priority window expired
SELECT * FROM session_requests
WHERE priority_notified_at IS NOT NULL
  AND status = 'pending'
  AND NOW() - priority_notified_at > INTERVAL '10 minutes';

-- Calculate average response time
SELECT AVG(EXTRACT(EPOCH FROM (accepted_at - priority_notified_at))) / 60 AS avg_minutes
FROM session_requests
WHERE priority_notified_at IS NOT NULL
  AND accepted_at IS NOT NULL
  AND mechanic_id = preferred_mechanic_id;
```

---

## Foreign Key Relationships

### preferred_mechanic_id → mechanics(id)

**Constraint Name**: `session_requests_preferred_mechanic_id_fkey`

**SQL Definition**:
```sql
ALTER TABLE public.session_requests
ADD CONSTRAINT session_requests_preferred_mechanic_id_fkey
FOREIGN KEY (preferred_mechanic_id)
REFERENCES public.mechanics(id)
ON DELETE SET NULL;
```

**Behavior**:
- **ON DELETE SET NULL**: If mechanic is deleted, `preferred_mechanic_id` set to NULL (session remains valid)
- **Validation**: Cannot insert invalid mechanic UUID
- **Referential Integrity**: Database enforces valid mechanic references

**Error Example**:
```sql
-- Try to insert invalid mechanic ID
INSERT INTO session_requests (preferred_mechanic_id, ...)
VALUES ('00000000-0000-0000-0000-000000000000', ...);

-- ERROR: insert or update on table "session_requests" violates foreign key constraint
-- DETAIL: Key (preferred_mechanic_id)=(00000000-0000-0000-0000-000000000000) is not present in table "mechanics".
```

---

## Indexes

### Index 1: Preferred Mechanic Lookup

**Name**: `session_requests_preferred_mechanic_idx`

**SQL**:
```sql
CREATE INDEX IF NOT EXISTS session_requests_preferred_mechanic_idx
ON public.session_requests(preferred_mechanic_id)
WHERE preferred_mechanic_id IS NOT NULL;
```

**Purpose**: Fast lookups by preferred mechanic

**Use Cases**:
```sql
-- Query optimized by this index
SELECT * FROM session_requests
WHERE preferred_mechanic_id = '<uuid>';

-- This query also uses the index
SELECT COUNT(*) FROM session_requests
WHERE preferred_mechanic_id = '<uuid>'
  AND status = 'accepted';
```

**Performance**:
- Partial index (only non-NULL values)
- Smaller index size → faster queries
- B-tree index type (default)

---

### Index 2: Priority Analytics

**Name**: `session_requests_priority_analytics_idx`

**SQL**:
```sql
CREATE INDEX IF NOT EXISTS session_requests_priority_analytics_idx
ON public.session_requests(preferred_mechanic_id, priority_notified_at, status)
WHERE preferred_mechanic_id IS NOT NULL;
```

**Purpose**: Optimize analytics queries with multiple conditions

**Use Cases**:
```sql
-- Query optimized by this index
SELECT
  preferred_mechanic_id,
  COUNT(*) AS total,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) AS accepted
FROM session_requests
WHERE preferred_mechanic_id IS NOT NULL
  AND priority_notified_at IS NOT NULL
GROUP BY preferred_mechanic_id;

-- Response time analytics (also optimized)
SELECT
  preferred_mechanic_id,
  AVG(EXTRACT(EPOCH FROM (accepted_at - priority_notified_at))) AS avg_response_seconds
FROM session_requests
WHERE preferred_mechanic_id IS NOT NULL
  AND priority_notified_at IS NOT NULL
  AND status = 'accepted'
GROUP BY preferred_mechanic_id;
```

**Performance**:
- Composite index (3 columns)
- Covers common analytics query patterns
- Enables index-only scans (no table lookup needed)

---

### Index 3: Priority Timeout Detection

**Name**: `session_requests_priority_timeout_idx`

**SQL**:
```sql
CREATE INDEX IF NOT EXISTS session_requests_priority_timeout_idx
ON public.session_requests(priority_notified_at, status)
WHERE priority_notified_at IS NOT NULL AND status = 'pending';
```

**Purpose**: Fast identification of requests where priority window expired

**Use Cases**:
```sql
-- Find all requests where priority expired (optimized)
SELECT * FROM session_requests
WHERE priority_notified_at IS NOT NULL
  AND status = 'pending'
  AND NOW() - priority_notified_at > INTERVAL '10 minutes';

-- Count expired priority requests (optimized)
SELECT COUNT(*) FROM session_requests
WHERE priority_notified_at IS NOT NULL
  AND status = 'pending'
  AND NOW() - priority_notified_at > MAKE_INTERVAL(mins => priority_window_minutes);
```

**Performance**:
- Highly selective partial index
- Only indexes pending requests with priority notification
- Critical for background fallback jobs

---

## Migration SQL

### File Location
**Path**: [supabase/migrations/20250102000001_favorites_priority_columns.sql](../../supabase/migrations/20250102000001_favorites_priority_columns.sql)

### Migration Highlights

**Idempotent Design**:
```sql
-- Safe to run multiple times
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS preferred_mechanic_id UUID;

-- Foreign key with existence check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'session_requests_preferred_mechanic_id_fkey'
  ) THEN
    ALTER TABLE public.session_requests
    ADD CONSTRAINT session_requests_preferred_mechanic_id_fkey...
  END IF;
END $$;

-- Indexes with IF NOT EXISTS
CREATE INDEX IF NOT EXISTS session_requests_preferred_mechanic_idx...
```

**Verification Block**:
```sql
DO $$
DECLARE
  -- Variables for verification
BEGIN
  -- Check columns exist
  -- Check foreign key exists
  -- Check indexes created
  -- Report results with RAISE NOTICE
END $$;
```

**Expected Output**:
```
NOTICE:  ✅ Column added: preferred_mechanic_id (UUID)
NOTICE:  ✅ Column added: priority_window_minutes (INTEGER, default 10)
NOTICE:  ✅ Column added: priority_notified_at (TIMESTAMPTZ)
NOTICE:  ✅ Foreign key: preferred_mechanic_id → mechanics(id)
NOTICE:  ✅ Indexes created: 3 priority-related indexes
NOTICE:  ============================================
NOTICE:  ✅ Phase 4 Migration Complete!
```

---

## Data Flow

### Insert Flow (Session Request Creation)

```typescript
// When customer books via favorite mechanic
const { data: newRequest } = await supabaseAdmin
  .from('session_requests')
  .insert({
    customer_id: customerId,
    session_type: sessionType,
    plan_code: planCode,
    status: 'pending',
    customer_name: customerName,
    customer_email: customerEmail || null,

    // Phase 4: Priority tracking columns
    preferred_mechanic_id: preferredMechanicId || null,
    priority_window_minutes: 10,
    // priority_notified_at: NULL (not yet sent)
  })
  .select()
  .single()
```

### Update Flow (Priority Notification Sent)

```typescript
// After sending priority notification
const { error } = await supabaseAdmin
  .from('session_requests')
  .update({
    priority_notified_at: new Date().toISOString()
  })
  .eq('id', sessionRequestId)
```

### Query Flow (Check Timeout)

```typescript
// Check if priority window expired
const { data: sessionRequest } = await supabaseAdmin
  .from('session_requests')
  .select('id, status, mechanic_id, priority_notified_at, priority_window_minutes')
  .eq('id', sessionRequestId)
  .maybeSingle()

// Calculate if timeout occurred
const notifiedAt = new Date(sessionRequest.priority_notified_at)
const windowMinutes = sessionRequest.priority_window_minutes
const now = new Date()
const elapsedMinutes = (now - notifiedAt) / (1000 * 60)

if (elapsedMinutes > windowMinutes) {
  // Priority window expired - trigger fallback broadcast
}
```

---

## Analytics Queries

### Priority Success Rate by Mechanic

```sql
SELECT
  m.first_name || ' ' || m.last_name AS mechanic_name,
  COUNT(*) AS total_priority_requests,
  COUNT(CASE
    WHEN sr.status = 'accepted'
      AND sr.mechanic_id = sr.preferred_mechanic_id
    THEN 1
  END) AS accepted_by_preferred,
  ROUND(
    100.0 * COUNT(CASE
      WHEN sr.status = 'accepted'
        AND sr.mechanic_id = sr.preferred_mechanic_id
      THEN 1
    END) / NULLIF(COUNT(*), 0),
    2
  ) AS priority_success_rate_percent
FROM session_requests sr
JOIN mechanics m ON m.id = sr.preferred_mechanic_id
WHERE sr.preferred_mechanic_id IS NOT NULL
  AND sr.priority_notified_at IS NOT NULL
GROUP BY m.id, mechanic_name
HAVING COUNT(*) >= 5  -- Minimum 5 requests for statistical significance
ORDER BY priority_success_rate_percent DESC, total_priority_requests DESC;
```

**Uses Index**: `session_requests_priority_analytics_idx`

---

### Average Priority Response Time

```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (sr.accepted_at - sr.priority_notified_at))) / 60 AS avg_response_minutes,
  MIN(EXTRACT(EPOCH FROM (sr.accepted_at - sr.priority_notified_at))) / 60 AS min_response_minutes,
  MAX(EXTRACT(EPOCH FROM (sr.accepted_at - sr.priority_notified_at))) / 60 AS max_response_minutes,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (sr.accepted_at - sr.priority_notified_at))) / 60 AS median_response_minutes
FROM session_requests sr
WHERE sr.preferred_mechanic_id IS NOT NULL
  AND sr.priority_notified_at IS NOT NULL
  AND sr.accepted_at IS NOT NULL
  AND sr.mechanic_id = sr.preferred_mechanic_id  -- Only accepted by preferred mechanic
  AND sr.accepted_at > sr.priority_notified_at;  -- Sanity check
```

**Uses Index**: `session_requests_priority_analytics_idx`

---

### Priority Timeout Rate

```sql
SELECT
  COUNT(*) AS total_priority_requests,
  COUNT(CASE
    WHEN NOW() - sr.priority_notified_at > MAKE_INTERVAL(mins => sr.priority_window_minutes)
      AND sr.status = 'pending'
    THEN 1
  END) AS timed_out_requests,
  ROUND(
    100.0 * COUNT(CASE
      WHEN NOW() - sr.priority_notified_at > MAKE_INTERVAL(mins => sr.priority_window_minutes)
        AND sr.status = 'pending'
      THEN 1
    END) / NULLIF(COUNT(*), 0),
    2
  ) AS timeout_rate_percent
FROM session_requests sr
WHERE sr.preferred_mechanic_id IS NOT NULL
  AND sr.priority_notified_at IS NOT NULL;
```

**Uses Index**: `session_requests_priority_timeout_idx`

---

### Customer Favorite Behavior

```sql
-- How often do customers book via favorites?
SELECT
  COUNT(CASE WHEN preferred_mechanic_id IS NOT NULL THEN 1 END) AS priority_bookings,
  COUNT(CASE WHEN preferred_mechanic_id IS NULL THEN 1 END) AS standard_bookings,
  ROUND(
    100.0 * COUNT(CASE WHEN preferred_mechanic_id IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0),
    2
  ) AS priority_usage_rate_percent
FROM session_requests
WHERE created_at > NOW() - INTERVAL '30 days';  -- Last 30 days
```

---

## TypeScript Integration

### Before Migration (Phase 3)

```typescript
// Metadata approach - no type safety
await supabaseAdmin
  .from('session_requests')
  .update({
    metadata: {
      priority_notified_at: new Date().toISOString(),
      priority_mechanic_id: mechanicId,
      priority_window_minutes: 10
    } as any  // ❌ Type cast required, no autocomplete
  })
```

### After Migration (Phase 4)

```typescript
// Column approach - full type safety
await supabaseAdmin
  .from('session_requests')
  .update({
    priority_notified_at: new Date().toISOString()
    // ✅ TypeScript knows this column exists
    // ✅ Autocomplete suggests correct column name
    // ✅ Type checking ensures correct data type
  })
  .eq('id', sessionRequestId)

// TypeScript interface (auto-generated from schema)
interface SessionRequest {
  id: string
  customer_id: string
  mechanic_id: string | null
  status: 'pending' | 'accepted' | 'cancelled'
  // ... other columns
  preferred_mechanic_id: string | null  // ✅ Typed
  priority_window_minutes: number       // ✅ Typed
  priority_notified_at: string | null   // ✅ Typed
}
```

### Regenerating Types

```bash
# After running migration, regenerate TypeScript types
npx supabase gen types typescript --local > src/types/supabase.ts
```

---

## Rollback Procedure

If Phase 4 migration needs to be rolled back:

```sql
-- Step 1: Drop indexes
DROP INDEX IF EXISTS session_requests_preferred_mechanic_idx;
DROP INDEX IF EXISTS session_requests_priority_analytics_idx;
DROP INDEX IF EXISTS session_requests_priority_timeout_idx;

-- Step 2: Drop foreign key constraint
ALTER TABLE public.session_requests
DROP CONSTRAINT IF EXISTS session_requests_preferred_mechanic_id_fkey;

-- Step 3: Drop columns
ALTER TABLE public.session_requests
DROP COLUMN IF EXISTS preferred_mechanic_id;

ALTER TABLE public.session_requests
DROP COLUMN IF EXISTS priority_window_minutes;

ALTER TABLE public.session_requests
DROP COLUMN IF EXISTS priority_notified_at;

-- Step 4: Revert feature flag
UPDATE feature_flags
SET is_enabled = false
WHERE flag_key = 'ENABLE_FAVORITES_PRIORITY';
```

**Note**: Rollback is safe because:
- Columns are nullable (except priority_window_minutes which has default)
- Application code gracefully handles missing columns
- No data loss (Phase 3 still works with metadata approach)

---

## Monitoring & Maintenance

### Key Metrics to Monitor

1. **Priority Success Rate**: % of priority requests accepted by preferred mechanic
2. **Priority Timeout Rate**: % of priority requests that timeout and fallback
3. **Average Response Time**: How long preferred mechanics take to respond
4. **Index Performance**: Query execution times for priority-related queries

### Database Maintenance

**Index Statistics**:
```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'session_requests'
  AND indexname LIKE '%priority%'
ORDER BY idx_scan DESC;
```

**Table Bloat Check**:
```sql
-- Check if table needs VACUUM
SELECT
  schemaname,
  tablename,
  n_live_tup,
  n_dead_tup,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_tuple_percent
FROM pg_stat_user_tables
WHERE tablename = 'session_requests';

-- Run VACUUM if needed
VACUUM ANALYZE session_requests;
```

---

## Related Documentation

- **[Favorites Priority Broadcast System](../features/favorites-priority-broadcast-system.md)** - Complete feature overview
- **[Phase 4 Verification Plan](../../notes/reports/remediation/phase4-verification.md)** - Testing guide
- **session_requests Table Schema** - Complete table documentation

---

## Appendix: Complete Schema Snapshot

```sql
-- Complete session_requests table definition (priority columns only)
CREATE TABLE IF NOT EXISTS public.session_requests (
  -- ... other columns ...

  -- Phase 4: Priority Tracking Columns
  preferred_mechanic_id UUID
    CONSTRAINT session_requests_preferred_mechanic_id_fkey
    REFERENCES public.mechanics(id)
    ON DELETE SET NULL,

  priority_window_minutes INTEGER NOT NULL DEFAULT 10,

  priority_notified_at TIMESTAMPTZ,

  -- ... other columns ...
);

-- Indexes
CREATE INDEX session_requests_preferred_mechanic_idx
  ON session_requests(preferred_mechanic_id)
  WHERE preferred_mechanic_id IS NOT NULL;

CREATE INDEX session_requests_priority_analytics_idx
  ON session_requests(preferred_mechanic_id, priority_notified_at, status)
  WHERE preferred_mechanic_id IS NOT NULL;

CREATE INDEX session_requests_priority_timeout_idx
  ON session_requests(priority_notified_at, status)
  WHERE priority_notified_at IS NOT NULL AND status = 'pending';

-- Column comments
COMMENT ON COLUMN session_requests.preferred_mechanic_id IS
  'UUID of the favorite mechanic who receives priority notification (10-minute window). NULL if no favorite or standard broadcast.';

COMMENT ON COLUMN session_requests.priority_window_minutes IS
  'Duration in minutes for priority notification window before fallback broadcast. Default: 10 minutes.';

COMMENT ON COLUMN session_requests.priority_notified_at IS
  'Timestamp when priority notification was sent to preferred_mechanic_id. NULL if priority flow not used.';
```

---

**Status**: ✅ Migration complete and production-ready
**Last Updated**: November 2, 2025
**Migration File**: `20250102000001_favorites_priority_columns.sql`
**Next Steps**: Run migration in production, monitor analytics queries
