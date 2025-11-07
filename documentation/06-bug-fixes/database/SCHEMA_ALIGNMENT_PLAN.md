# Database Schema Alignment Plan

## Executive Summary

**Critical Finding**: Your local migration files contain table definitions that **do not exist** in your Supabase production database. This means recent migrations have NOT been applied to production.

## Analysis Results

### Audit Date: 2025-10-27
### Database: Supabase (qtkouemogsymqrzkysar.supabase.co)

---

## Part 1: Missing Tables (High Priority)

These tables are **defined in migration files** but **DO NOT exist** in Supabase:

### 1. ❌ `mechanic_time_off` - CRITICAL
- **Status**: Used by active API code
- **Migration**: NOT FOUND in any migration file
- **API Route**: `/api/mechanic/time-off` (GET, POST, DELETE)
- **Used By**: Mechanic availability page
- **Impact**: **BREAKS MECHANIC AVAILABILITY FEATURE**
- **Action Required**: **CREATE NEW MIGRATION**

```sql
-- NEEDS TO BE CREATED
CREATE TABLE mechanic_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2. ❌ `repair_quotes` table (alias issue)
- **Status**: Defined in migration as `repair_quotes`
- **Migration File**: `20250127000001_add_repair_quote_system.sql` (line 151)
- **Issue**: Migration exists but NOT applied to Supabase
- **Action Required**: **RUN MIGRATION ON SUPABASE**

### 3. ❌ `customer_favorites` table (naming issue)
- **Status**: Defined as `customer_favorites` in migration
- **Code Uses**: `favorites` (wrong name)
- **Migration File**: `20250127000001_add_repair_quote_system.sql` (line 423)
- **Issue**: Table created with different name + migration not applied
- **Action Required**: **RUN MIGRATION + UPDATE CODE** to use `customer_favorites`

### 4. ❌ `platform_chat_messages` table (alias issue)
- **Status**: Defined in migration as `platform_chat_messages`
- **Code May Use**: `messages`
- **Migration File**: `20250127000001_add_repair_quote_system.sql` (line 386)
- **Action Required**: **RUN MIGRATION** or **UPDATE CODE** to use `platform_chat_messages`

### 5. ❌ Partnership System Tables (not applied)
The following tables are defined in `20250128000000_add_partnership_system.sql` but **NOT in Supabase**:
- `workshop_partnership_programs` (line 54)
- `partnership_applications` (line 121)  ✅ EXISTS but empty
- `partnership_agreements` (line 162)
- `bay_bookings` (line 208) ✅ EXISTS but empty
- `partnership_revenue_splits` (line 271)
- `mechanic_clients` (line 333)
- `mechanic_earnings_breakdown` (line 382)

**Action Required**: **RUN PARTNERSHIP MIGRATION ON SUPABASE**

### 6. ❌ `session_recordings` table
- **Status**: Defined in migration
- **Migration File**: `20251020023736_professional_video_session_system.sql` (line 150)
- **Issue**: Migration file exists but table not in Supabase
- **Action Required**: **VERIFY MIGRATION WAS APPLIED**

---

## Part 2: Column Name Mismatches (Fixed)

### ✅ `mechanic_availability`
- **Issue**: Code used `weekday`, `is_active`
- **Actual**: Database has `day_of_week`, `is_available`
- **Status**: **FIXED** - API now maps correctly
- **Files Fixed**: `src/app/api/mechanic/availability/route.ts`

---

## Part 3: Column Name Differences (Working As Intended)

These are NOT bugs - code correctly uses different column names for different tables:

### ✅ `profiles.full_name` vs `mechanics.name`
- Different tables, different schemas
- **No action needed**

###  ✅ `vehicles.user_id` (NOT `customer_user_id`)
- Code correctly uses `user_id`
- **No action needed**

### ✅ `session_requests.customer_id` (NOT `customer_user_id`)
- Code correctly uses `customer_id`
- **No action needed**

### ✅ `diagnostic_sessions` missing `intake_id`
- Table empty, may be designed differently
- **Need to verify** if this is intentional

---

## Part 4: Tables That Don't Exist Anywhere

These tables don't exist in migrations OR database:

### ❌ `admin_users`
- Not defined anywhere
- Code may reference it
- **Action**: Search codebase for usage

### ❌ `fees` (alias for `platform_fee_rules`?)
- Migration has `platform_fee_rules` table
- Code may use `fees` as shorthand
- **Action**: Check if code uses `fees` or `platform_fee_rules`

### ❌ `workshops` (alias for `organizations`?)
- No `workshops` table
- May use `organizations` table filtered by `organization_type = 'workshop'`
- **Action**: Verify code uses `organizations` not `workshops`

### ❌ `reviews`
- Not in any migration
- May be future feature
- **Action**: Check if actively used in code

---

## Root Cause Analysis

### Why Are Tables Missing?

1. **Migrations Not Applied to Supabase**
   - Files exist: `20250127000001_add_repair_quote_system.sql`
   - Files exist: `20250128000000_add_partnership_system.sql`
   - But tables don't exist in database
   - **Conclusion**: Migrations were never run against production Supabase

2. **mechanic_time_off Never Created**
   - No migration file exists for this table
   - But API code expects it
   - **Conclusion**: Table was added to code without creating migration

---

## Recommended Actions

### IMMEDIATE (Critical - Breaks Features)

1. **Create `mechanic_time_off` migration**
   ```bash
   # Create new migration file
   supabase/migrations/20251027000000_add_mechanic_time_off.sql
   ```

2. **Apply missing migrations to Supabase**
   - Run `20250127000001_add_repair_quote_system.sql`
   - Run `20250128000000_add_partnership_system.sql`
   - Run `20251020023736_professional_video_session_system.sql` (verify)
   - Run new `mechanic_time_off` migration

### SHORT TERM (Prevents Future Issues)

3. **Verify migration application process**
   - Check if migrations are manually applied
   - Set up automatic migration runner
   - Document migration process

4. **Fix table name inconsistencies**
   - Update code to use `customer_favorites` (not `favorites`)
   - Update code to use `platform_chat_messages` (not `messages`)
   - Update code to use `organizations` (not `workshops`)
   - Update code to use `platform_fee_rules` (not `fees`)

### LONG TERM (Best Practices)

5. **Add migration tracking**
   - Create `schema_migrations` table
   - Track which migrations have been applied
   - Prevent partial migrations

6. **Add schema validation tests**
   - Test that expected tables exist
   - Test that expected columns exist
   - Run before deployment

---

## Files to Create/Modify

### 1. New Migration: `mechanic_time_off`
```
supabase/migrations/20251027000000_add_mechanic_time_off.sql
```

### 2. Migration Application Script
```
scripts/apply-migrations-to-supabase.sh
```

### 3. Schema Validation Script
```
scripts/validate-schema.js
```

---

## Testing Plan

1. **After creating `mechanic_time_off` migration**:
   - Apply to local database
   - Test mechanic availability page
   - Verify time-off CRUD operations work

2. **After applying all missing migrations**:
   - Run `scripts/full-schema-audit.js` again
   - Verify all tables exist
   - Check for remaining mismatches

3. **After fixing table name inconsistencies**:
   - Search codebase for old names
   - Update all references
   - Run integration tests

---

## Priority Order

1. ✅ **DONE**: Fix `mechanic_availability` column names
2. ⚠️  **NOW**: Create `mechanic_time_off` table
3. ⚠️  **NOW**: Apply missing migrations to Supabase
4. 📋 **NEXT**: Fix table name inconsistencies in code
5. 📋 **NEXT**: Add migration tracking system
6. 📋 **LATER**: Add schema validation tests

---

## Questions to Resolve

1. **How are migrations applied to Supabase?**
   - Manual SQL execution?
   - Supabase CLI?
   - Automatic on deploy?

2. **Are there separate databases?**
   - Local development DB?
   - Staging DB?
   - Production DB?

3. **Which database should be source of truth?**
   - Migration files (local)
   - Supabase database (current)
   - Need to align both

---

## Next Steps

**Ready to proceed with fixes. Which would you like to do first?**

A) Create `mechanic_time_off` migration and apply it
B) Apply all missing migrations to Supabase
C) Create schema validation system
D) Fix all table name inconsistencies at once
