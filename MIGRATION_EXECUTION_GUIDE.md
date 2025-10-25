# Database Migration Execution Guide

## Issue Fixed

The original migration files had a **dependency order problem**:

### Before (Alphabetical execution - BROKEN):
1. ❌ `20250124_add_account_types.sql` - Tried to reference `organizations` table that doesn't exist yet
2. ❌ `20250124_create_organization_members.sql` - Tried to reference `organizations` table
3. ✅ `20250124_create_organizations.sql` - Creates the organizations table (but ran LAST!)

**Error:** `ERROR: 42P01: relation "organizations" does not exist`

### After (Fixed - Sequential execution):
1. ✅ `20250124000001_create_organizations.sql` - Creates organizations table FIRST
2. ✅ `20250124000002_create_organization_members.sql` - Creates organization_members table (references organizations)
3. ✅ `20250124000003_add_account_types.sql` - Adds account_type tracking to profiles & mechanics (references organizations)

---

## Migration Details

### Migration 1: Create Organizations Table
**File:** `20250124000001_create_organizations.sql`

**What it creates:**
- `organizations` table for workshops (B2B2C) and corporate accounts (B2B SaaS)
- Support for both organization types in a single table
- Stripe Connect integration for workshop payouts
- Subscription management for corporate accounts
- Coverage area tracking for workshops

**Key columns:**
- `organization_type`: 'corporate' or 'workshop'
- `commission_rate`: Workshop's cut (default 10%)
- `coverage_postal_codes`: Areas workshop serves
- `stripe_account_id`: For Stripe Connect payouts
- `subscription_status`: For corporate B2B SaaS billing

---

### Migration 2: Create Organization Members Table
**File:** `20250124000002_create_organization_members.sql`

**What it creates:**
- `organization_members` table for team management
- Invitation system with invite codes
- Role-based access control (owner, admin, member, viewer)

**Dependencies:**
- ✅ Requires `organizations` table (created in Migration 1)

**Key features:**
- Pending invites (user_id is NULL until accepted)
- Invite codes for `/mechanic/signup/:inviteCode` flow
- Role hierarchy: owner → admin → member → viewer
- 7-day invite expiration

---

### Migration 3: Add Account Types
**File:** `20250124000003_add_account_types.sql`

**What it adds:**

#### Profiles Table:
- `account_type`: 'individual_customer', 'corporate_customer', 'workshop_customer'
- `organization_id`: Foreign key to organizations table
- `source`: 'direct', 'workshop_referral', 'invitation', 'import'
- `referred_by_workshop_id`: Track workshop referrals

#### Mechanics Table:
- `account_type`: 'individual_mechanic', 'workshop_mechanic'
- `workshop_id`: Foreign key to organizations table
- `source`: 'direct', 'workshop_invitation', 'import'
- `requires_sin_collection`: FALSE for workshop mechanics
- `sin_encrypted`: Encrypted SIN/Business Number (AES-256-GCM)
- `sin_collection_completed_at`: Timestamp when SIN was provided
- `auto_approved`: TRUE for workshop-invited mechanics

**Dependencies:**
- ✅ Requires `organizations` table (created in Migration 1)

---

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended for testing)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run migrations **in order**:

   **Step 1:** Copy and paste `20250124000001_create_organizations.sql`
   - Click "Run"
   - Verify: "Success. No rows returned"

   **Step 2:** Copy and paste `20250124000002_create_organization_members.sql`
   - Click "Run"
   - Verify: "Success. No rows returned"

   **Step 3:** Copy and paste `20250124000003_add_account_types.sql`
   - Click "Run"
   - Verify: "Success. No rows returned"

4. Verify tables exist:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN ('organizations', 'organization_members');
   ```

5. Check columns were added to profiles:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'profiles'
     AND column_name IN ('account_type', 'organization_id', 'source', 'referred_by_workshop_id');
   ```

6. Check columns were added to mechanics:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'mechanics'
     AND column_name IN ('account_type', 'workshop_id', 'sin_encrypted', 'requires_sin_collection');
   ```

---

### Option 2: Supabase CLI (For production)

```bash
# Make sure you're in the project directory
cd c:\Users\Faiz Hashmi\theautodoctor

# Link to your Supabase project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations to remote database
npx supabase db push

# Verify migrations were applied
npx supabase db remote --project-ref YOUR_PROJECT_REF
```

---

## Verification Checklist

After running migrations, verify:

- [ ] `organizations` table exists
- [ ] `organization_members` table exists
- [ ] `profiles.account_type` column exists
- [ ] `profiles.organization_id` column exists
- [ ] `mechanics.account_type` column exists
- [ ] `mechanics.workshop_id` column exists
- [ ] `mechanics.sin_encrypted` column exists
- [ ] Existing profiles have `account_type = 'individual_customer'` (backfilled)
- [ ] Existing mechanics have `account_type = 'individual_mechanic'` (backfilled)
- [ ] Foreign key constraints work (no errors)

---

## Rollback Plan (If needed)

If something goes wrong, you can rollback by running this SQL:

```sql
-- Rollback Migration 3 (remove columns from profiles and mechanics)
ALTER TABLE profiles
  DROP COLUMN IF EXISTS account_type,
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS referred_by_workshop_id;

ALTER TABLE mechanics
  DROP COLUMN IF EXISTS account_type,
  DROP COLUMN IF EXISTS workshop_id,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS requires_sin_collection,
  DROP COLUMN IF EXISTS sin_collection_completed_at,
  DROP COLUMN IF EXISTS auto_approved,
  DROP COLUMN IF EXISTS sin_encrypted;

-- Rollback Migration 2 (drop organization_members table)
DROP TABLE IF EXISTS organization_members CASCADE;

-- Rollback Migration 1 (drop organizations table)
DROP TABLE IF EXISTS organizations CASCADE;
```

---

## Next Steps After Migrations

1. **Add environment variables** (`.env.local`):
   ```bash
   # Generate encryption key for SIN encryption
   ENCRYPTION_KEY=<run: openssl rand -hex 32>

   # Sign up for Upstash Redis (free tier: https://upstash.com)
   UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token-here
   ```

2. **Test signup flows:**
   - Customer signup → Check `account_type = 'individual_customer'`
   - Mechanic signup → Check `account_type = 'individual_mechanic'` and SIN is encrypted

3. **Monitor for errors:**
   - Check Supabase logs for foreign key constraint violations
   - Verify RLS policies don't block legitimate access

---

## Migration Files Location

```
theautodoctor/
└── supabase/
    └── migrations/
        ├── 20250124000001_create_organizations.sql         (Run 1st)
        ├── 20250124000002_create_organization_members.sql  (Run 2nd)
        └── 20250124000003_add_account_types.sql            (Run 3rd)
```

---

## Troubleshooting

### Error: "relation organizations does not exist"
**Cause:** Migrations ran out of order
**Fix:** Run migrations in sequential order (001 → 002 → 003)

### Error: "column already exists"
**Cause:** Migration was partially applied
**Fix:** Each migration uses `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, so you can safely re-run

### Error: "constraint violation"
**Cause:** Existing data conflicts with new constraints
**Fix:** Check the backfill queries in Migration 3 - they should handle existing data

---

## Support

If you encounter issues:
1. Check Supabase dashboard → Database → Logs
2. Verify the migration order
3. Check for partial migrations (some columns exist, some don't)
4. Review the rollback plan above
