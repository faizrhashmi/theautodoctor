# ⚠️ MANUAL MIGRATION REQUIRED - Phase 1

## Why Manual?

The `npx supabase db push` command is blocked by idempotency issues in unrelated pending migrations. To avoid fixing 80+ old migrations, we're executing Phase 1 directly via Supabase SQL Editor.

## ✅ Step-by-Step Instructions

### 1. Open Supabase Dashboard

Visit: https://supabase.com/dashboard

Navigate to: **Your Project → SQL Editor**

### 2. Copy Migration SQL

Open this file:
```
migrations/cert-expansion/02_up.sql
```

Copy the entire contents (158 lines)

### 3. Execute in SQL Editor

1. Paste the SQL into the SQL Editor
2. Click "Run" (or Ctrl+Enter)

### 4. Expected Output

You should see:
```
Success. No rows returned
```

**No errors expected** (migration uses IF NOT EXISTS guards)

### 5. Verify Migration

After running the SQL, verify it worked by running:

```bash
node scripts/verify-cert-migration.js
```

Expected output:
```
✅ MIGRATION SUCCESSFULLY APPLIED!

New columns detected:
  ✓ certification_type
  ✓ certification_number
  ✓ certification_authority
  ✓ certification_region
  ✓ certification_expiry_date
```

### 6. Next Steps

Once verification passes:
1. Update TypeScript types
2. Commit Phase 1
3. Proceed to Phase 2

---

## Troubleshooting

**If you see errors about columns already existing:**
- ✅ This is FINE - migration is idempotent
- Run verification script to confirm

**If you see permission errors:**
- Ensure you're logged in to the correct Supabase project
- Check that you have admin access

**If columns don't verify:**
- Check SQL Editor for error messages
- Report errors back for assistance

---

## Quick Reference

**Migration file:** `migrations/cert-expansion/02_up.sql`

**Verification:** `node scripts/verify-cert-migration.js`

**What it does:**
- Adds 5 new nullable columns to `mechanics` table
- Creates performance index on `certification_type`
- Adds CHECK constraint for valid certification types
- Preserves all existing `red_seal_*` columns

**Safety:** 100% safe, additive-only, fully reversible
