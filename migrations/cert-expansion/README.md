# Phase 1 Migration - Additive Schema

## Overview

This migration adds generic certification columns to the `mechanics` table while preserving all existing Red Seal columns.

## Files

| File | Purpose |
|------|---------|
| `01_introspect.sql` | Read-only queries to check current state BEFORE migration |
| `02_up.sql` | Main migration - adds new columns (IDEMPOTENT) |
| `03_verify.sql` | Verification queries to confirm migration success |
| `02_down.sql` | Rollback script (removes new columns only) |

## How to Run

### Step 1: Pre-flight Check

Run `01_introspect.sql` in Supabase SQL Editor to see current state:

```sql
-- Copy/paste contents of 01_introspect.sql
```

**Expected output:**
- 7 certification-related columns exist (red_seal_*, other_certifications)
- 0 new certification_* columns (they don't exist yet)
- 4 total mechanics (1 Red Seal, 3 non-Red Seal)

### Step 2: Run Migration

Run `02_up.sql` in Supabase SQL Editor:

```sql
-- Copy/paste contents of 02_up.sql
```

**This will:**
- Add 5 new columns (certification_type, certification_number, certification_authority, certification_region, certification_expiry_date)
- Create performance index on certification_type
- Add CHECK constraint for valid certification types
- Keep all old red_seal_* columns untouched

**Expected output:**
```
BEGIN
NOTICE: ✅ Column certification_type added
NOTICE: ✅ Column certification_number added
NOTICE: ✅ Column certification_authority added
NOTICE: ✅ Column certification_region added
NOTICE: ✅ Column certification_expiry_date added
NOTICE: ✅ Index created
COMMIT
```

### Step 3: Verify Migration

Run `03_verify.sql` in Supabase SQL Editor:

```sql
-- Copy/paste contents of 03_verify.sql
```

**Expected output:**
```
NOTICE: ✅ PASS: All new columns exist
NOTICE: ✅ PASS: All legacy red_seal_* columns still exist

migration_status: ✅ MIGRATION SUCCESSFUL
```

**If verification fails, run `02_down.sql` to rollback.**

### Step 4: Update TypeScript Types

After successful migration, TypeScript types need to be updated:

```bash
# Generate new types from Supabase
pnpm supabase gen types typescript --linked > src/types/supabase-new.ts

# Review and merge with existing types
```

Or manually add to `src/types/supabase.ts`:

```typescript
// Add to mechanics table interface
certification_type: 'red_seal' | 'provincial' | 'ase' | 'cpa_quebec' | 'manufacturer' | 'other' | null
certification_number: string | null
certification_authority: string | null
certification_region: string | null
certification_expiry_date: string | null

/** @deprecated Use certification_* fields instead */
red_seal_certified: boolean | null
/** @deprecated Use certification_number instead */
red_seal_number: string | null
```

## Rollback

If anything goes wrong, run `02_down.sql`:

```sql
-- Copy/paste contents of 02_down.sql
```

**This will:**
- Drop all 5 new certification_* columns
- Drop the performance index
- Preserve all red_seal_* columns (no data loss)

## Safety Guarantees

✅ **Idempotent:** Can run multiple times safely (uses IF NOT EXISTS)
✅ **Additive:** No columns dropped, no data deleted
✅ **Backward Compatible:** All old red_seal_* columns kept
✅ **Transactional:** All changes in a single transaction (all-or-nothing)
✅ **Rollback Safe:** 02_down.sql reverts cleanly

## Next Steps

After successful verification:
1. Commit migration files to git
2. Update TypeScript types
3. Proceed to Phase 2 (Dual-read/write helpers)
