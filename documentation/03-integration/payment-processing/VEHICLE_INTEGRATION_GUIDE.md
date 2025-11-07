# Vehicle Integration Guide

## Overview

This guide documents the complete integration of the vehicles table with your session requests and intakes system. The changes enable tracking vehicle service history and linking all customer interactions to specific vehicles.

## What Changed

### 1. Database Schema Changes

#### New Columns Added

**`session_requests` table:**
- `vehicle_id` (UUID, nullable) - References `vehicles(id)`
- Links session requests to specific customer vehicles

**`intakes` table:**
- `vehicle_id` (UUID, nullable) - References `vehicles(id)`
- Links intake forms to specific customer vehicles
- Legacy fields (make, model, year, vin, plate, odometer) are retained for backward compatibility

#### New Database Views

**`vehicle_service_history`** - Combined view of all services for a vehicle
- Shows both session requests and intakes
- Ordered by date
- Includes mechanic information, status, and notes

**`vehicle_session_history`** - Session-specific history
- All sessions linked to a vehicle
- Includes mechanic details and session metadata

**`vehicle_intake_history`** - Intake-specific history
- All intake forms linked to a vehicle
- Includes concern details and file information

### 2. Application Updates

#### Intake Form ([src/app/intake/page.tsx](src/app/intake/page.tsx))
- Now loads user's vehicles from the vehicles table
- Pre-selects primary vehicle for authenticated users
- Sends `vehicle_id` along with intake submission
- Maintains backward compatibility for guest/anonymous users

#### Intake API ([src/app/api/intake/start/route.ts](src/app/api/intake/start/route.ts))
- Accepts `vehicle_id` parameter
- Saves `vehicle_id` to both intakes and session_requests tables
- Links sessions to specific vehicles

#### Vehicles Management Page ([src/app/customer/vehicles/page.tsx](src/app/customer/vehicles/page.tsx))
- Added "View History" button for each vehicle
- Links to vehicle service history page

#### New: Vehicle Service History Page ([src/app/customer/vehicles/[id]/history/page.tsx](src/app/customer/vehicles/[id]/history/page.tsx))
- Shows complete service timeline for a vehicle
- Displays all sessions and intakes
- Shows mechanic information, status, dates, and notes
- Visual timeline with color-coded status badges

### 3. TypeScript Type Updates

Updated [src/types/supabase.ts](src/types/supabase.ts) with convenience exports:
```typescript
export type Vehicle = Tables<'vehicles'>
export type Intake = Tables<'intakes'>
export type SessionRequestDB = Tables<'session_requests'>
```

Note: After running migrations, regenerate types with:
```bash
npx supabase gen types typescript --local > src/types/supabase.ts
```

## Migration Files Created

All migration files are in `supabase/migrations/`:

1. **`20251028000002_add_vehicle_to_session_requests.sql`**
   - Adds `vehicle_id` column to session_requests
   - Creates index for performance
   - Safe to run multiple times (idempotent)

2. **`20251028000003_add_vehicle_to_intakes.sql`**
   - Adds `vehicle_id` column to intakes
   - Documents legacy fields
   - Creates index for performance

3. **`20251028000004_create_vehicle_service_history_view.sql`**
   - Creates three database views for service history
   - Grants access to authenticated users

4. **`20251028000005_migrate_existing_vehicle_data.sql`** (OPTIONAL)
   - Migrates historical data from intakes to vehicles table
   - Links existing intakes and session_requests to vehicles
   - Sets primary vehicle for each user
   - **Review before running in production!**

## Deployment Steps

### Step 1: Run Database Migrations

```bash
# Connect to your Supabase project
npx supabase link --project-ref YOUR_PROJECT_ID

# Run the migrations
npx supabase db push

# Or run them individually
npx supabase db execute -f supabase/migrations/20251028000002_add_vehicle_to_session_requests.sql
npx supabase db execute -f supabase/migrations/20251028000003_add_vehicle_to_intakes.sql
npx supabase db execute -f supabase/migrations/20251028000004_create_vehicle_service_history_view.sql
```

### Step 2: (Optional) Migrate Existing Data

**IMPORTANT:** Review the migration script first and test on a staging environment.

```bash
# Optional: Migrate historical vehicle data
npx supabase db execute -f supabase/migrations/20251028000005_migrate_existing_vehicle_data.sql
```

This will:
- Create vehicle records from existing intakes (for authenticated users)
- Migrate vehicle_info from profiles table
- Link existing intakes to vehicles
- Link existing session_requests to vehicles

### Step 3: Regenerate TypeScript Types

```bash
# Regenerate types to include vehicle_id in table definitions
npx supabase gen types typescript --local > src/types/supabase.ts
```

### Step 4: Build and Test

```bash
# Run TypeScript type check
npm run typecheck

# Build the application
npm run build

# Test locally
npm run dev
```

### Step 5: Deploy

```bash
# Deploy to your hosting platform (Vercel, etc.)
git add .
git commit -m "feat: integrate vehicles with session requests and intakes"
git push
```

## Testing Checklist

- [ ] Run all database migrations successfully
- [ ] Verify vehicles table has data
- [ ] Check vehicle_service_history view returns data
- [ ] Test intake form for authenticated users
  - [ ] Vehicles load correctly
  - [ ] Primary vehicle is pre-selected
  - [ ] vehicle_id is saved with intake
- [ ] Test intake form for guest users (should still work)
- [ ] View vehicle service history page
  - [ ] Vehicle details display correctly
  - [ ] Service history shows sessions and intakes
  - [ ] Status badges display properly
- [ ] Test session request creation with vehicle_id
- [ ] Verify RLS policies allow proper access

## Data Flow

### New Intake Submission (Authenticated User)

1. User navigates to intake form
2. Form loads user's vehicles from `vehicles` table
3. Primary vehicle is auto-selected
4. User fills out form and submits
5. API receives `vehicle_id` along with other data
6. Intake record created with `vehicle_id`
7. Session record created (for free/trial plans)
8. Session request created with `vehicle_id`
9. Data is now linked: `vehicle` → `intake` → `session` → `session_request`

### Viewing Service History

1. User navigates to vehicles page
2. Clicks "View History" icon for a vehicle
3. System queries `vehicle_service_history` view
4. Timeline displays all sessions and intakes for that vehicle
5. Shows mechanic names, dates, statuses, and notes

## Benefits

### For Customers
- Track service history per vehicle
- See all past sessions and intakes for each vehicle
- Quick access to vehicle-specific service records
- Better organization for multi-vehicle owners

### For Your Business
- Better data integrity and organization
- Eliminate duplicate vehicle data entry
- Track vehicle service patterns
- Enable vehicle-based analytics
- Improve customer service with complete vehicle history

### For Future Features
- Vehicle maintenance reminders
- Service package recommendations based on vehicle history
- Multi-vehicle discount programs
- Fleet management for corporate customers
- Mileage tracking over time

## Backward Compatibility

All changes are **backward compatible**:

- Guest/anonymous users can still submit intakes without vehicles table
- Legacy vehicle fields (make, model, year, etc.) in intakes are preserved
- Existing intakes without `vehicle_id` continue to work
- No breaking changes to existing functionality

## Rollback Plan

If issues arise, you can rollback by:

```sql
-- Remove vehicle_id columns (data is still in legacy fields)
ALTER TABLE public.intakes DROP COLUMN IF EXISTS vehicle_id;
ALTER TABLE public.session_requests DROP COLUMN IF EXISTS vehicle_id;

-- Drop views
DROP VIEW IF EXISTS public.vehicle_service_history;
DROP VIEW IF EXISTS public.vehicle_session_history;
DROP VIEW IF EXISTS public.vehicle_intake_history;
```

Then revert the application code changes.

## Support

For issues or questions:
1. Check migration logs for errors
2. Verify RLS policies are correct
3. Check browser console for client-side errors
4. Review Supabase logs for database errors

## Next Steps (Future Enhancements)

Consider implementing:
- [ ] Vehicle maintenance schedule tracking
- [ ] Service reminder notifications
- [ ] Mileage tracking over time
- [ ] Vehicle-specific service packages
- [ ] Export service history as PDF
- [ ] Vehicle photo uploads
- [ ] Insurance document storage
- [ ] Service cost tracking and analytics

---

**Last Updated:** October 28, 2025
**Version:** 1.0
