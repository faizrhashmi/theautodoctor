# Mechanic Availability API Fix

## Problem
The mechanic availability page was showing "failed to load availability" error.

## Root Cause
**Column name mismatch** between the database schema and the API code.

### Database Schema (Actual)
From migration `20251020023736_professional_video_session_system.sql`:
```sql
CREATE TABLE public.mechanic_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  ...
);
```

**Database columns**: `day_of_week`, `is_available`

### API Code (Before Fix)
The API was using:
- `weekday` instead of `day_of_week`
- `is_active` instead of `is_available`

This caused SQL errors like:
```
column mechanic_availability.weekday does not exist
```

## Solution
Updated `/api/mechanic/availability/route.ts` to:

1. **GET endpoint**:
   - Query using correct database column names (`day_of_week`, `is_available`)
   - Map results to frontend-expected names (`weekday`, `is_active`)

2. **PUT endpoint**:
   - Map frontend names (`weekday`, `is_active`) back to database column names (`day_of_week`, `is_available`)

## Files Changed
- `src/app/api/mechanic/availability/route.ts` - Fixed column name mapping

## Database Verification
Created test scripts to verify database schema:
- `scripts/test-availability-columns.js` - Tests which column names exist
- `check_availability_schema.sql` - SQL queries for manual verification

Test results confirmed:
```
✓ day_of_week (NOT weekday)
✓ is_available (NOT is_active)
```

## Status
✅ **FIXED** - Availability page should now load correctly

## Testing
1. Navigate to `/mechanic/availability`
2. Page should load without errors
3. Can add/edit/delete availability blocks
4. Can save changes successfully
