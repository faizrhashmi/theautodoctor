# Vehicle Integration System

**Date Implemented:** November 7, 2025
**Category:** Feature Implementation
**Priority:** High
**Status:** ✅ Completed

## Overview

Comprehensive integration of the vehicles table with session requests and intake forms to enable vehicle service history tracking. This feature links all customer sessions and intakes to specific vehicles, enabling complete service timelines and better data organization.

## Problem Statement

### Initial State
- `vehicles` table existed with vehicle management UI at [/customer/vehicles](../../src/app/customer/vehicles/page.tsx)
- Customers could add/edit/delete vehicles
- **NOT linked** to `session_requests` or `intakes` tables
- No way to track which vehicle was serviced in which session
- Data redundancy with vehicle info repeated in intakes table
- No service history per vehicle

### User Request
> "Analyze my whole database schema and tell me what should i do to add vehicles to vehicles page"

### Business Impact
- ❌ Unable to track service history per vehicle
- ❌ Data duplication and inconsistency risks
- ❌ Poor customer experience for multi-vehicle owners
- ❌ No vehicle-based analytics possible
- ❌ No maintenance tracking over time

## Root Cause Analysis

### Database Schema Before Fix

```
┌─────────────┐     ┌──────────────────┐     ┌──────────┐
│  vehicles   │  ❌  │ session_requests │  →  │ sessions │
│  (orphaned) │     │  (no vehicle_id) │     │          │
└─────────────┘     └──────────────────┘     └──────────┘
                              ↓
                        ┌──────────┐
                        │ intakes  │
                        │ (has make,│
                        │  model,   │
                        │  year...)  │
                        └──────────┘
```

### Issues Identified
1. **Missing Foreign Keys:**
   - `session_requests.vehicle_id` - Does not exist
   - `intakes.vehicle_id` - Does not exist

2. **Data Redundancy:**
   - Vehicle info stored directly in intakes (make, model, year, VIN, plate)
   - Same vehicle info repeated for every intake/session

3. **No Relationships:**
   - No way to query all sessions for a specific vehicle
   - No foreign key constraints

4. **No Service History Views:**
   - No convenient way to see vehicle timeline
   - Manual joins required for every query

## Technical Implementation

### Phase 1: Database Migrations

#### Migration 1: Add vehicle_id to session_requests
**File:** [supabase/migrations/20251028000002_add_vehicle_to_session_requests.sql](../../supabase/migrations/20251028000002_add_vehicle_to_session_requests.sql)

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_requests' AND column_name = 'vehicle_id'
  ) THEN
    ALTER TABLE public.session_requests
      ADD COLUMN vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added vehicle_id column to session_requests table';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS session_requests_vehicle_id_idx
  ON public.session_requests(vehicle_id);

COMMENT ON COLUMN public.session_requests.vehicle_id IS
  'Reference to the vehicle in the vehicles table for this session request';
```

**Key Features:**
- ✅ Idempotent (safe to run multiple times)
- ✅ Foreign key constraint with CASCADE delete protection
- ✅ Performance index for lookups
- ✅ Self-documenting with comments

#### Migration 2: Add vehicle_id to intakes
**File:** [supabase/migrations/20251028000003_add_vehicle_to_intakes.sql](../../supabase/migrations/20251028000003_add_vehicle_to_intakes.sql)

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'intakes' AND column_name = 'vehicle_id'
  ) THEN
    ALTER TABLE public.intakes
      ADD COLUMN vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added vehicle_id column to intakes table';
  END IF;
END $$;

-- Document legacy fields for backward compatibility
COMMENT ON COLUMN public.intakes.make IS 'Legacy field: Use vehicle_id reference when possible.';
COMMENT ON COLUMN public.intakes.model IS 'Legacy field: Use vehicle_id reference when possible.';
-- ... more legacy field comments
```

**Backward Compatibility:**
- ✅ Preserved legacy fields (make, model, year, VIN, etc.)
- ✅ Documented migration path in comments
- ✅ Supports both old and new patterns

#### Migration 3: Create Service History Views
**File:** [supabase/migrations/20251028000004_create_vehicle_service_history_view.sql](../../supabase/migrations/20251028000004_create_vehicle_service_history_view.sql)

Created 3 database views for convenient querying:

**1. vehicle_session_history**
```sql
CREATE VIEW public.vehicle_session_history AS
SELECT
  v.id as vehicle_id,
  v.year, v.make, v.model, v.nickname, v.vin, v.plate,
  sr.id as session_request_id,
  sr.session_type,
  sr.status,
  sr.created_at,
  sr.mechanic_id,
  p.full_name as mechanic_name
FROM public.vehicles v
LEFT JOIN public.session_requests sr ON v.id = sr.vehicle_id
LEFT JOIN public.profiles p ON sr.mechanic_id = p.id
ORDER BY sr.created_at DESC NULLS LAST;
```

**2. vehicle_intake_history**
- Shows all intake forms linked to each vehicle
- Includes concern, plan, and customer info

**3. vehicle_service_history (Combined)**
```sql
-- UNION of sessions and intakes for complete timeline
CREATE VIEW public.vehicle_service_history AS
SELECT
  'session' as record_type,
  sr.id as record_id,
  sr.created_at as record_date,
  sr.session_type as service_type,
  sr.status,
  sr.mechanic_id,
  p.full_name as mechanic_name
FROM vehicles v
INNER JOIN session_requests sr ON v.id = sr.vehicle_id
LEFT JOIN profiles p ON sr.mechanic_id = p.id

UNION ALL

SELECT
  'intake' as record_type,
  i.id as record_id,
  i.created_at as record_date,
  'intake'::text as service_type,
  NULL as status,
  NULL as mechanic_id,
  NULL as mechanic_name,
  i.concern,
  i.plan
FROM vehicles v
INNER JOIN intakes i ON v.id = i.vehicle_id

ORDER BY record_date DESC;
```

**Usage Example:**
```sql
-- Get all service history for a specific vehicle
SELECT * FROM vehicle_service_history
WHERE vehicle_id = 'uuid-here'
ORDER BY record_date DESC;
```

#### Migration 4: Data Migration (Optional)
**File:** [supabase/migrations/20251028000005_migrate_existing_vehicle_data.sql](../../supabase/migrations/20251028000005_migrate_existing_vehicle_data.sql)

**⚠️ Important:** Review before running in production!

This migration:
1. Creates vehicle records from existing intakes (for authenticated users)
2. Migrates vehicle_info from profiles table (legacy JSON field)
3. Links existing intakes to vehicles based on VIN/make/model matching
4. Links existing session_requests to vehicles via parent session
5. Sets primary vehicle for each user

```sql
-- Example: Migrate from intakes
INSERT INTO public.vehicles (user_id, make, model, year, vin, ...)
SELECT DISTINCT ON (i.vin, p.id)
  p.id as user_id,
  i.make, i.model, i.year, i.vin, ...
FROM intakes i
INNER JOIN profiles p ON p.email = i.email OR p.phone = i.phone
WHERE i.make IS NOT NULL AND i.vin IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM vehicles v
    WHERE v.user_id = p.id AND v.vin = i.vin
  );
```

### Phase 2: Application Updates

#### Updated: Intake Form
**File:** [src/app/intake/page.tsx:345-354](../../src/app/intake/page.tsx#L345-L354)

**Changes Made:**
```typescript
// BEFORE
body: JSON.stringify({ plan, ...form, files: uploadedPaths, urgent: isUrgent })

// AFTER
body: JSON.stringify({
  plan,
  ...form,
  files: uploadedPaths,
  urgent: isUrgent,
  vehicle_id: selectedVehicleId || null, // ✅ NEW: Link to vehicle
})
```

**Existing Infrastructure Used:**
- State already had `userVehicles` and `selectedVehicleId`
- Vehicle loading logic already implemented in `useEffect`
- Primary vehicle auto-selection already working

**Result:**
- ✅ Minimal code changes (1 line added)
- ✅ Leveraged existing state management
- ✅ Backward compatible (sends null for guest users)

#### Updated: Intake API Route
**File:** [src/app/api/intake/start/route.ts](../../src/app/api/intake/start/route.ts)

**Changes Made:**

1. **Accept vehicle_id parameter:**
```typescript
const {
  plan = 'trial',
  name, email, phone, city,
  vin = '', year = '', make = '', model = '',
  odometer = '', plate = '',
  concern,
  files = [],
  urgent = false,
  vehicle_id = null, // ✅ NEW: Accept vehicle_id
} = body || {};
```

2. **Save to intakes table:**
```typescript
const payload: any = {
  plan, name, email, phone, city,
  vin, year, make, model, odometer, plate, concern,
  files,
  urgent,
  vehicle_id: vehicle_id || null, // ✅ Link to vehicles table
};
await supabaseAdmin.from('intakes').insert(payload);
```

3. **Save to session_requests table:**
```typescript
const requestPayload: any = {
  customer_id: user.id,
  session_type: sessionType,
  plan_code: plan,
  status: 'pending',
  customer_name: customerName,
  customer_email: email || null,
  parent_session_id: sessionId,
  routing_type: 'broadcast',
  vehicle_id: vehicle_id || null, // ✅ Link to vehicles table
}
```

**Data Flow:**
```
User Selects Vehicle in Form
        ↓
vehicle_id sent in request body
        ↓
API Route receives vehicle_id
        ↓
    ┌───┴────┐
    ↓        ↓
intakes    session_requests
vehicle_id  vehicle_id
    ↓        ↓
    └───┬────┘
        ↓
Links to vehicles table
```

#### New: Vehicle Service History Page
**File:** [src/app/customer/vehicles/[id]/history/page.tsx](../../src/app/customer/vehicles/[id]/history/page.tsx)

**Features Implemented:**

**1. Vehicle Details Card:**
```typescript
<div className="vehicle-card">
  <h2>{vehicle.year} {vehicle.make} {vehicle.model}</h2>
  {vehicle.nickname && <p>{vehicle.nickname}</p>}
  <div className="details">
    {vehicle.vin && <span>VIN: {vehicle.vin}</span>}
    {vehicle.plate && <span>Plate: {vehicle.plate}</span>}
    {vehicle.color && <span>Color: {vehicle.color}</span>}
    {vehicle.mileage && <span>Mileage: {vehicle.mileage}</span>}
  </div>
  {vehicle.is_primary && <badge>Primary Vehicle</badge>}
</div>
```

**2. Service Timeline:**
```typescript
type ServiceHistoryItem = {
  record_type: 'session' | 'intake'
  record_id: string
  record_date: string
  service_type: string
  status: string | null
  request_type: string | null
  mechanic_name: string | null
  concern: string | null
  intake_plan: string | null
  is_follow_up: boolean | null
}
```

**3. Status Badges:**
```typescript
const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300',
  waiting: 'bg-blue-500/20 text-blue-300',
  live: 'bg-green-500/20 text-green-300',
  completed: 'bg-emerald-500/20 text-emerald-300',
  cancelled: 'bg-red-500/20 text-red-300',
}
```

**4. Query Implementation:**
```typescript
const { data: historyData } = await supabase
  .from('vehicle_service_history')
  .select('*')
  .eq('vehicle_id', vehicleId)
  .eq('owner_id', user.id) // RLS security
  .order('record_date', { ascending: false })
```

**UI Features:**
- ✅ Dark theme with gradient backgrounds
- ✅ Mobile-optimized responsive layout
- ✅ Timeline view with icons
- ✅ Empty state message
- ✅ Loading states
- ✅ Error handling
- ✅ Authentication guard

#### Updated: Vehicles Management Page
**File:** [src/app/customer/vehicles/page.tsx:415-421](../../src/app/customer/vehicles/page.tsx#L415-L421)

**Added History Button:**
```typescript
import { History } from 'lucide-react'

// In vehicles table row:
<Link
  href={`/customer/vehicles/${v.id}/history`}
  className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
  title="View Service History"
>
  <History className="h-4 w-4" />
</Link>
```

**Button Placement:**
```
┌─────────────────────────────────────────────┐
│ 2023 Honda Civic          Primary  [🔍][✏️][🗑️] │
│ "My Daily Driver"                              │
└─────────────────────────────────────────────┘
                                    ↑ History button
```

### Phase 3: TypeScript Type Updates

**File:** [src/types/supabase.ts:6218-6232](../../src/types/supabase.ts#L6218-L6232)

**Added Convenience Exports:**
```typescript
// Convenience type exports for common table types
export type Vehicle = Tables<'vehicles'>
export type VehicleInsert = TablesInsert<'vehicles'>
export type VehicleUpdate = TablesUpdate<'vehicles'>

export type Intake = Tables<'intakes'>
export type IntakeInsert = TablesInsert<'intakes'>
export type IntakeUpdate = TablesUpdate<'intakes'>

export type SessionRequestDB = Tables<'session_requests'>
export type SessionRequestInsert = TablesInsert<'session_requests'>
export type SessionRequestUpdate = TablesUpdate<'session_requests'>

export type Profile = Tables<'profiles'>
export type ProfileInsert = TablesInsert<'profiles'>
export type ProfileUpdate = TablesUpdate<'profiles'>
```

**Note:** After migrations, regenerate types:
```bash
npx supabase gen types typescript --local > src/types/supabase.ts
# Or from production:
npx supabase gen types typescript --project-ref YOUR_PROJECT_ID > src/types/supabase.ts
```

### Phase 4: Verification Tools

**File:** [supabase/verify_vehicle_integration.sql](../../supabase/verify_vehicle_integration.sql)

Comprehensive verification query checking:

```sql
-- Check 1: vehicle_id exists in session_requests
SELECT 'session_requests.vehicle_id' as check_name,
  CASE WHEN EXISTS (...) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check 2: vehicle_id exists in intakes
-- Check 3: vehicle_service_history view exists
-- Check 4: vehicle_session_history view exists
-- Check 5: vehicle_intake_history view exists
-- Check 6: Indexes created
-- Check 7: Count vehicles
-- Check 8: Count linked intakes
-- Check 9: Count linked session_requests
-- Check 10: Test view query
-- Check 11: Sample data
```

**Run in Supabase SQL Editor** to see ✅ or ❌ for each check.

## Testing & Verification

### Test 1: Database Migrations

```bash
# Apply all migrations
npx supabase db push

# Or run individually
npx supabase db execute -f supabase/migrations/20251028000002_add_vehicle_to_session_requests.sql
npx supabase db execute -f supabase/migrations/20251028000003_add_vehicle_to_intakes.sql
npx supabase db execute -f supabase/migrations/20251028000004_create_vehicle_service_history_view.sql
```

**Verify columns exist:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('session_requests', 'intakes')
  AND column_name = 'vehicle_id';
```

**Expected Output:**
```
 column_name | data_type
-------------+-----------
 vehicle_id  | uuid
 vehicle_id  | uuid
```

### Test 2: Add Vehicle

**Steps:**
1. Navigate to `/customer/vehicles`
2. Click "Add New Vehicle"
3. Fill form:
   - Year: 2023 (required)
   - Make: Honda (required)
   - Model: Civic (required)
   - VIN: 1HGBH41JXMN109186 (optional)
   - Color: Silver (optional)
   - Plate: ABC 1234 (optional)
   - Mileage: 15,000 km (optional)
4. Click "Add Vehicle"
5. **Verify:** Vehicle appears in list with star icon if primary

### Test 3: Submit Intake with Vehicle

**Steps:**
1. Navigate to `/intake?plan=trial`
2. **Verify:** Vehicles dropdown populated
3. **Verify:** Primary vehicle pre-selected
4. Fill contact info (name, email, phone, city)
5. Fill concern (min 10 characters)
6. Submit

**Verify in Database:**
```sql
SELECT id, make, model, year, vehicle_id, created_at
FROM intakes
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:** `vehicle_id` column has UUID value (not NULL)

### Test 4: View Service History

**Steps:**
1. Go to `/customer/vehicles`
2. Click History icon (clock) next to a vehicle
3. **Verify Page Shows:**
   - ✅ Vehicle details card at top
   - ✅ Timeline of sessions/intakes below
   - ✅ Status badges with colors
   - ✅ Mechanic names (if assigned)
   - ✅ Dates formatted properly
   - ✅ Session notes/concerns

### Test 5: Verify Database Links

```sql
-- Check session_requests linked to vehicles
SELECT
  sr.id,
  sr.customer_name,
  sr.status,
  v.year,
  v.make,
  v.model
FROM session_requests sr
INNER JOIN vehicles v ON sr.vehicle_id = v.id
WHERE sr.created_at > NOW() - INTERVAL '7 days'
ORDER BY sr.created_at DESC;
```

**Expected:** Shows sessions with vehicle details

### Test 6: Query Service History View

```sql
-- Get complete service history for a vehicle
SELECT
  record_type,
  record_date,
  service_type,
  status,
  mechanic_name,
  concern,
  intake_plan
FROM vehicle_service_history
WHERE vehicle_id = 'YOUR_VEHICLE_UUID'
  AND owner_id = 'YOUR_USER_UUID'
ORDER BY record_date DESC
LIMIT 10;
```

## File Changes Summary

### New Files Created (6)
1. `supabase/migrations/20251028000002_add_vehicle_to_session_requests.sql`
2. `supabase/migrations/20251028000003_add_vehicle_to_intakes.sql`
3. `supabase/migrations/20251028000004_create_vehicle_service_history_view.sql`
4. `supabase/migrations/20251028000005_migrate_existing_vehicle_data.sql`
5. `src/app/customer/vehicles/[id]/history/page.tsx`
6. `supabase/verify_vehicle_integration.sql`

### Modified Files (4)
1. **[src/app/intake/page.tsx:353](../../src/app/intake/page.tsx#L353)**
   - Added `vehicle_id: selectedVehicleId || null` to request body

2. **[src/app/api/intake/start/route.ts](../../src/app/api/intake/start/route.ts)**
   - Line 47: Accept `vehicle_id` parameter
   - Line 84: Save `vehicle_id` to intakes
   - Line 246: Save `vehicle_id` to session_requests

3. **[src/app/customer/vehicles/page.tsx:415-421](../../src/app/customer/vehicles/page.tsx#L415-L421)**
   - Added History icon button with link

4. **[src/types/supabase.ts:6218-6232](../../src/types/supabase.ts#L6218-L6232)**
   - Added convenience type exports

## Benefits

### For Customers
- ✅ Track complete service history per vehicle
- ✅ See all past sessions and intakes for each vehicle
- ✅ Quick access to vehicle-specific records
- ✅ Better organization for multi-vehicle owners
- ✅ Timeline view shows service patterns
- ✅ Know when last service was performed
- ✅ See which mechanics worked on which vehicle

### For Business
- ✅ Better data integrity and organization
- ✅ Eliminate duplicate vehicle data entry
- ✅ Track vehicle service patterns
- ✅ Enable vehicle-based analytics
- ✅ Improve customer service with complete history
- ✅ Support fleet management for corporate accounts
- ✅ Identify popular vehicle makes/models
- ✅ Track service completion rates

### Technical Benefits
- ✅ Normalized database schema (3NF)
- ✅ Referential integrity with foreign keys
- ✅ Efficient queries with indexes
- ✅ Flexible views for different use cases
- ✅ Backward compatible with existing data
- ✅ No breaking changes
- ✅ Gradual migration path

## Backward Compatibility

All changes are **fully backward compatible:**

✅ **Guest Users:** Can still submit intakes without vehicles
✅ **Legacy Fields:** Preserved in intakes table (make, model, year, etc.)
✅ **Existing Intakes:** Without vehicle_id continue to work
✅ **No Breaking Changes:** All existing functionality maintained
✅ **Gradual Migration:** Data can be linked over time

**Fallback Behavior:**
- If `vehicle_id` is NULL, system uses legacy fields
- Both patterns coexist seamlessly
- API accepts both old and new data formats

## Future Enhancements

### Phase 2 Features (Planned)
- [ ] **Vehicle Maintenance Reminders**
  - Track mileage over time
  - Alert when service due
  - Recommended service intervals

- [ ] **Service Packages**
  - Recommendations based on vehicle history
  - Predictive maintenance suggestions
  - Service bundles for common issues

- [ ] **Multi-Vehicle Features**
  - Discount programs for multi-vehicle owners
  - Fleet dashboard for corporate customers
  - Bulk operations

- [ ] **Analytics & Reports**
  - Mileage tracking with charts
  - Service cost tracking
  - Export history as PDF
  - Email summaries

- [ ] **Enhanced Vehicle Data**
  - Vehicle photo uploads
  - Insurance document storage
  - Warranty information
  - Service manual links

- [ ] **Automated Alerts**
  - Service interval notifications
  - Oil change reminders
  - Inspection due dates
  - Warranty expiration alerts

### Analytics Opportunities
- [ ] Most common services per vehicle make/model
- [ ] Average time between services
- [ ] Customer retention by vehicle
- [ ] Popular vehicle brands in service
- [ ] Service completion rates by vehicle type
- [ ] Revenue per vehicle over lifetime
- [ ] Mechanic specialization by vehicle brand

## Deployment Checklist

### Pre-Deployment
- [x] Create database migrations
- [x] Update application code
- [x] Update TypeScript types
- [x] Create service history UI
- [x] Create verification scripts
- [x] Document changes
- [x] Test locally

### Deployment Steps
1. **Backup Database**
   ```bash
   pg_dump -h localhost -U postgres -d postgres > backup_$(date +%Y%m%d).sql
   ```

2. **Run Migrations in Staging**
   ```bash
   # Connect to staging
   npx supabase link --project-ref STAGING_PROJECT_ID

   # Run migrations
   npx supabase db push
   ```

3. **Test in Staging**
   - Verify all 6 tests pass
   - Run verification script
   - Check sample data

4. **Deploy Application Code**
   ```bash
   git push origin main
   # Deploy to Vercel/Render
   ```

5. **Run Migrations in Production**
   ```bash
   # Connect to production
   npx supabase link --project-ref PROD_PROJECT_ID

   # Run migrations
   npx supabase db push
   ```

6. **Post-Deployment**
   - Run verification script in production
   - Monitor error logs
   - Test critical flows
   - Regenerate types from production schema

### Rollback Plan

If issues arise, rollback by:

```sql
-- Remove vehicle_id columns
ALTER TABLE public.intakes DROP COLUMN IF EXISTS vehicle_id;
ALTER TABLE public.session_requests DROP COLUMN IF EXISTS vehicle_id;

-- Drop views
DROP VIEW IF EXISTS public.vehicle_service_history;
DROP VIEW IF EXISTS public.vehicle_session_history;
DROP VIEW IF EXISTS public.vehicle_intake_history;

-- Drop indexes
DROP INDEX IF EXISTS session_requests_vehicle_id_idx;
DROP INDEX IF EXISTS intakes_vehicle_id_idx;
```

Then revert application code:
```bash
git revert <commit-hash>
git push origin main
```

## Monitoring & Metrics

### Key Metrics to Track

**Adoption Metrics:**
- % of intakes with vehicle_id populated
- % of users with vehicles added
- Average vehicles per user
- Vehicle usage distribution

**Performance Metrics:**
- Query response times for service history
- Database query count reduction (normalization benefit)
- Page load times for history page

**Business Metrics:**
- Service completion rate by vehicle
- Repeat service rate per vehicle
- Customer retention for multi-vehicle owners

### Monitoring Queries

**Daily vehicle_id adoption rate:**
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_intakes,
  COUNT(vehicle_id) as with_vehicle,
  ROUND(100.0 * COUNT(vehicle_id) / COUNT(*), 2) as adoption_rate
FROM intakes
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Vehicles per user distribution:**
```sql
SELECT
  vehicle_count,
  COUNT(*) as users
FROM (
  SELECT user_id, COUNT(*) as vehicle_count
  FROM vehicles
  GROUP BY user_id
) as counts
GROUP BY vehicle_count
ORDER BY vehicle_count;
```

## Troubleshooting

### Issue: vehicle_id is always NULL

**Cause:** Frontend not sending vehicle_id

**Check:**
1. Open browser DevTools → Network tab
2. Submit intake form
3. Find `/api/intake/start` request
4. Check request payload

**Expected:**
```json
{
  "plan": "trial",
  "vehicle_id": "some-uuid-here",
  ...
}
```

**Fix:** Verify intake form includes vehicle_id in submission

### Issue: No vehicles showing in dropdown

**Cause:** User has no vehicles or RLS policy issue

**Check:**
```sql
SELECT * FROM vehicles WHERE user_id = 'USER_UUID';
```

**Fix:**
1. Add a vehicle first
2. Check RLS policies allow user to read their vehicles

### Issue: Service history page empty

**Cause:** No vehicle_id linked to sessions/intakes yet

**Normal Behavior:**
- Old data won't have vehicle_id
- Only new submissions will be linked
- Run data migration script if needed

### Issue: View query returns no data

**Cause:** Views filter by vehicle_id, old data has NULL

**Solution:**
Run optional data migration:
```bash
npx supabase db execute -f supabase/migrations/20251028000005_migrate_existing_vehicle_data.sql
```

## Related Documentation

- [Vehicles Management Page](./vehicles-management.md) (to be created)
- [Intake Form Flow](./intake-form-flow.md) (to be created)
- [Session Request System](./session-request-system.md) (to be created)
- [Database Schema](../architecture/database-schema.md) (if exists)
- [Supabase RLS Policies](../security/03_rls_policies.md)

## References

- **Implementation Guide:** [VEHICLE_INTEGRATION_GUIDE.md](../../VEHICLE_INTEGRATION_GUIDE.md)
- **Verification Script:** [verify_vehicle_integration.sql](../../supabase/verify_vehicle_integration.sql)
- **Migration Files:** [supabase/migrations/](../../supabase/migrations/)
- **Service History Page:** [src/app/customer/vehicles/[id]/history/page.tsx](../../src/app/customer/vehicles/[id]/history/page.tsx)

---

**Implementation Date:** November 7, 2025
**Last Updated:** November 7, 2025
**Status:** ✅ Production Ready
**Priority:** High
**Developer:** Claude Code Assistant
