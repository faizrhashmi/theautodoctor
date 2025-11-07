# Migration Fix Summary

## Problem Identified

The migration files had **circular dependency errors** where SQL policies referenced tables that didn't exist yet.

### Error 1: `create_organizations.sql`
```
ERROR: 42P01: relation "organization_members" does not exist
```

**Root cause:** Lines 102-121 created RLS policies that referenced the `organization_members` table before it was created.

```sql
-- This failed because organization_members doesn't exist yet!
CREATE POLICY "Organization members can view their org"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members  -- ❌ TABLE DOESN'T EXIST
      WHERE user_id = auth.uid()
    )
  );
```

### Error 2: `create_organization_members.sql`
```
ERROR: 42P01: relation "organizations" does not exist
```

**Root cause:** Was running before `create_organizations.sql` due to alphabetical sorting.

### Error 3: `add_account_types.sql`
```
ERROR: 42P01: relation "organizations" does not exist
```

**Root cause:** Foreign key constraints referenced `organizations` table before it existed.

---

## Solution Applied

### Fix 1: File Renaming (Sequential Execution Order)

Renamed files to enforce correct execution order:

```
BEFORE (alphabetical):
❌ 20250124_add_account_types.sql (ran 1st)
❌ 20250124_create_organization_members.sql (ran 2nd)
❌ 20250124_create_organizations.sql (ran 3rd)

AFTER (sequential):
✅ 20250124000001_create_organizations.sql (runs 1st)
✅ 20250124000002_create_organization_members.sql (runs 2nd)
✅ 20250124000003_add_account_types.sql (runs 3rd)
```

### Fix 2: Moved RLS Policies

Removed circular dependency by moving RLS policies that reference `organization_members` from Migration 1 to Migration 2:

**File: 20250124000001_create_organizations.sql**
- ✅ Creates `organizations` table
- ✅ Creates indexes
- ✅ Enables RLS
- ✅ Creates platform admin policy (no circular dependency)
- ❌ REMOVED: Policies that reference `organization_members` (moved to Migration 2)

**File: 20250124000002_create_organization_members.sql**
- ✅ Creates `organization_members` table (references `organizations` - OK because it exists)
- ✅ Creates indexes
- ✅ Creates RLS policies for `organization_members` table
- ✅ **NEW:** Added RLS policies for `organizations` table at the END (after both tables exist)

---

## Migration Execution Flow

### Step 1: Run `20250124000001_create_organizations.sql`

**What it creates:**
- ✅ `organizations` table
- ✅ Indexes on organizations
- ✅ RLS enabled with platform admin policy
- ✅ Functions: `update_organizations_updated_at()`, `generate_organization_slug()`
- ✅ Triggers for auto-updating `updated_at`

**What it does NOT create:**
- ❌ RLS policies that reference `organization_members` (deferred to Step 2)

**Result:** Organizations table exists and can be referenced by foreign keys.

---

### Step 2: Run `20250124000002_create_organization_members.sql`

**What it creates:**
- ✅ `organization_members` table (foreign key to `organizations` works because it exists)
- ✅ Indexes on organization_members
- ✅ RLS policies for `organization_members` table
- ✅ Functions: `update_organization_members_updated_at()`, `set_organization_member_joined_at()`, `ensure_organization_has_owner()`
- ✅ Helper functions: `user_has_org_role()`, `user_is_org_member()`, `get_user_org_role()`
- ✅ **RLS policies for `organizations` table** (moved here from Migration 1)

**Why this works:**
- Both `organizations` and `organization_members` tables exist when the RLS policies are created
- No circular dependency errors

---

### Step 3: Run `20250124000003_add_account_types.sql`

**What it creates:**
- ✅ `account_type` column in `profiles` table
- ✅ `organization_id` foreign key in `profiles` (references `organizations` - OK because it exists)
- ✅ `source` tracking in `profiles`
- ✅ `referred_by_workshop_id` foreign key in `profiles`
- ✅ `account_type` column in `mechanics` table
- ✅ `workshop_id` foreign key in `mechanics` (references `organizations` - OK because it exists)
- ✅ `sin_encrypted` column in `mechanics`
- ✅ Backfills existing data with default values
- ✅ Creates indexes for performance

**Why this works:**
- `organizations` table exists (created in Step 1)
- All foreign key constraints can be satisfied

---

## Verification Steps

After running all three migrations, verify the following:

### 1. Check Tables Exist

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('organizations', 'organization_members')
ORDER BY table_name;
```

Expected result:
```
organization_members
organizations
```

### 2. Check RLS Policies

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('organizations', 'organization_members')
ORDER BY tablename, policyname;
```

Expected result (5 policies total):
```
organizations | Organization admins can update
organizations | Organization members can view their org
organizations | Platform admins can manage organizations
organization_members | Organization admins can manage members
organization_members | Organization members can view members
organization_members | Platform admins can manage memberships
```

### 3. Check Foreign Keys Work

```sql
-- Check profiles.organization_id foreign key
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('profiles', 'mechanics')
  AND kcu.column_name IN ('organization_id', 'workshop_id', 'referred_by_workshop_id');
```

### 4. Check Column Existence

```sql
-- Profiles columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('account_type', 'organization_id', 'source', 'referred_by_workshop_id')
ORDER BY column_name;

-- Mechanics columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'mechanics'
  AND column_name IN ('account_type', 'workshop_id', 'sin_encrypted', 'requires_sin_collection')
ORDER BY column_name;
```

---

## Files Modified

### 1. `20250124000001_create_organizations.sql`
**Changes:**
- ❌ Removed lines 102-121 (RLS policies that referenced `organization_members`)
- ✅ Added comment explaining policies moved to Migration 2

**Before (lines 102-121):**
```sql
CREATE POLICY "Organization members can view their org"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can update"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );
```

**After:**
```sql
-- Note: Additional RLS policies that reference organization_members will be created
-- in migration 20250124000002_create_organization_members.sql after that table exists

-- Policy: Platform admins can manage all organizations
CREATE POLICY "Platform admins can manage organizations"
  ON organizations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
```

### 2. `20250124000002_create_organization_members.sql`
**Changes:**
- ✅ Added RLS policies for `organizations` table at the end (lines 236-263)

**Added at end of file:**
```sql
-- ============================================================================
-- Additional RLS policies for organizations table
-- ============================================================================
-- Note: These policies are created here (after organization_members table exists)
-- because they reference the organization_members table

-- Policy: Organization members can view their organization
CREATE POLICY "Organization members can view their org"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

-- Policy: Organization owners and admins can update their organization
CREATE POLICY "Organization admins can update"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );
```

### 3. `20250124000003_add_account_types.sql`
**Changes:**
- No changes needed (file renamed for execution order)

---

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run migrations **in order**:

   **Step 1:** Open and run `20250124000001_create_organizations.sql`
   - Copy entire file contents
   - Paste into SQL Editor
   - Click "Run"
   - ✅ Expected: "Success. No rows returned"

   **Step 2:** Open and run `20250124000002_create_organization_members.sql`
   - Copy entire file contents
   - Paste into SQL Editor
   - Click "Run"
   - ✅ Expected: "Success. No rows returned"

   **Step 3:** Open and run `20250124000003_add_account_types.sql`
   - Copy entire file contents
   - Paste into SQL Editor
   - Click "Run"
   - ✅ Expected: "Success. No rows returned" (may show UPDATE count if existing data)

4. Run verification queries (see "Verification Steps" above)

---

## What Changed vs Original Files

| Aspect | Original (Broken) | Fixed |
|--------|------------------|-------|
| **File names** | `20250124_xxx.sql` (alphabetical) | `20250124000001_xxx.sql` (sequential) |
| **Execution order** | Random/alphabetical | Enforced sequential (001 → 002 → 003) |
| **RLS policies** | In same file as table creation | Moved to file where dependencies exist |
| **Circular dependencies** | ❌ Yes (organization_members referenced before creation) | ✅ No (both tables exist when policies created) |

---

## Success Criteria

✅ All three migrations run without errors
✅ Both `organizations` and `organization_members` tables exist
✅ All RLS policies are created (5 total)
✅ Foreign keys work: `profiles.organization_id`, `mechanics.workshop_id`
✅ Existing data backfilled: `account_type = 'individual_customer'` for profiles
✅ Existing data backfilled: `account_type = 'individual_mechanic'` for mechanics

---

## Next Steps After Successful Migration

1. **Add environment variables** to `.env.local`:
   ```bash
   # Generate encryption key
   ENCRYPTION_KEY=<run: openssl rand -hex 32>

   # Upstash Redis (free tier: https://upstash.com)
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token
   ```

2. **Test signup flows:**
   - Customer signup → Verify `account_type = 'individual_customer'` in profiles
   - Mechanic signup → Verify `account_type = 'individual_mechanic'` and SIN is encrypted

3. **Monitor for errors:**
   - Check Supabase logs for RLS policy violations
   - Verify foreign key constraints work correctly
   - Test organization member invitations

---

## Rollback (If Needed)

If something goes wrong, rollback in reverse order:

```sql
-- Rollback Step 3
ALTER TABLE profiles DROP COLUMN IF EXISTS account_type CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS source CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS referred_by_workshop_id CASCADE;

ALTER TABLE mechanics DROP COLUMN IF EXISTS account_type CASCADE;
ALTER TABLE mechanics DROP COLUMN IF EXISTS workshop_id CASCADE;
ALTER TABLE mechanics DROP COLUMN IF EXISTS sin_encrypted CASCADE;
ALTER TABLE mechanics DROP COLUMN IF EXISTS requires_sin_collection CASCADE;

-- Rollback Step 2
DROP TABLE IF EXISTS organization_members CASCADE;

-- Rollback Step 1
DROP TABLE IF EXISTS organizations CASCADE;
```
