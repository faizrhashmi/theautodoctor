# Phase 2 Migration Fixes - 2025-12-07

## Errors Fixed

### Error 1: Quote Enforcement - Generated Column Not Immutable
**File:** `20251207000001_quote_enforcement_ocpa_compliance.sql`

**Original Error:**
```
ERROR: 42P17: generation expression is not immutable
```

**Root Cause:**
- Used `GENERATED ALWAYS` column with `CURRENT_DATE` function
- `CURRENT_DATE` is not immutable (changes every day)
- PostgreSQL doesn't allow non-immutable functions in generated columns

**Original Code (BROKEN):**
```sql
ADD COLUMN IF NOT EXISTS quote_expired BOOLEAN GENERATED ALWAYS AS (
  CASE
    WHEN quote_valid_until IS NOT NULL AND quote_valid_until < CURRENT_DATE THEN true
    ELSE false
  END
) STORED,
```

**Fix Applied:**
- Removed the `quote_expired` generated column
- Updated all references to check `quote_valid_until < CURRENT_DATE` directly

**Changes Made:**
1. Removed lines 39-44 (generated column definition)
2. Removed index on `quote_expired` (line 61)
3. Updated trigger function (line 128-131) to check `quote_valid_until` directly:
```sql
IF NEW.work_started_at IS NOT NULL
   AND NEW.quote_valid_until IS NOT NULL
   AND NEW.quote_valid_until < CURRENT_DATE THEN
  RAISE EXCEPTION '...';
END IF;
```
4. Updated view (line 224) to check `quote_valid_until` directly:
```sql
(rq.quote_valid_until IS NOT NULL AND rq.quote_valid_until < CURRENT_DATE
 AND rq.work_started_at IS NOT NULL) AS work_started_on_expired_quote
```

---

### Error 2: Warranty Disclosure - EXTRACT from DATE subtraction
**File:** `20251207000003_warranty_disclosure_system.sql`

**Original Error:**
```
ERROR: 42883: function pg_catalog.extract(unknown, integer) does not exist
LINE 78: EXTRACT(DAY FROM (claim_filed_date - repair_completion_date))
HINT: No function matches the given name and argument types. You might need to add explicit type casts.
```

**Root Cause:**
- In PostgreSQL, subtracting two DATE values returns an INTEGER (number of days)
- `EXTRACT(DAY FROM integer)` doesn't work - EXTRACT expects an INTERVAL or TIMESTAMP
- No need to use EXTRACT when DATE subtraction already gives us days as INTEGER

**Original Code (BROKEN):**
```sql
days_since_repair INTEGER GENERATED ALWAYS AS (
  EXTRACT(DAY FROM (claim_filed_date - repair_completion_date))
) STORED,
```

**Fix Applied:**
```sql
days_since_repair INTEGER GENERATED ALWAYS AS (
  claim_filed_date - repair_completion_date
) STORED,
```

**Explanation:**
- `claim_filed_date - repair_completion_date` directly returns INTEGER (days)
- No EXTRACT needed
- Result: `2025-12-10` - `2025-12-01` = `9` (days)

---

### Error 3: Workshop Compliance - Column gst_hst_registered Does Not Exist
**File:** `20251207000004_workshop_compliance_dashboard.sql`

**Original Error:**
```
ERROR: 42703: column o.gst_hst_registered does not exist
LINE 21:   (o.gst_hst_registered = true) AS gst_hst_registered,
```

**Root Cause:**
- The `organizations` table doesn't have a `gst_hst_registered` column
- The table has `tax_id` column instead (for storing GST/HST number)
- Migration was checking wrong column name

**Fix Applied:**
Changed line 21 from:
```sql
(o.gst_hst_registered = true) AS gst_hst_registered,
```
to:
```sql
(o.tax_id IS NOT NULL) AS gst_hst_registered,
```

**Note:** The `mechanics` table does have `gst_hst_registered` (added in Phase 1 migration), so references to `m.gst_hst_registered` are correct.

---

### Error 5: Workshop Compliance - Column has_liability_insurance Does Not Exist
**File:** `20251207000004_workshop_compliance_dashboard.sql`

**Original Error:**
```
ERROR: 42703: column o.has_liability_insurance does not exist
LINE 32:   (o.has_liability_insurance = true) AS has_liability_insurance,
```

**Root Cause:**
- The `organizations` table doesn't have a `has_liability_insurance` boolean column
- Only the `mechanics` table has this column (added in Phase 1 migration)
- The organizations table only has insurance detail columns (`insurance_expiry_date`, `insurance_coverage_amount`, `insurance_policy_number`, etc.)

**Fix Applied:**
Changed three occurrences:

1. Line 32 - has_liability_insurance check:
```sql
-- BEFORE:
(o.has_liability_insurance = true) AS has_liability_insurance,

-- AFTER:
(o.insurance_expiry_date IS NOT NULL AND o.insurance_coverage_amount IS NOT NULL) AS has_liability_insurance,
```

2. Line 78 - Insurance scoring (20 points):
```sql
-- BEFORE:
WHEN o.has_liability_insurance = true
     AND o.insurance_expiry_date > CURRENT_DATE
     AND o.insurance_coverage_amount >= 2000000 THEN 20

-- AFTER:
WHEN o.insurance_expiry_date IS NOT NULL
     AND o.insurance_expiry_date > CURRENT_DATE
     AND o.insurance_coverage_amount >= 2000000 THEN 20
```

3. Line 122 - Compliance status check:
```sql
-- BEFORE:
WHEN o.has_liability_insurance = false OR o.insurance_expiry_date < CURRENT_DATE THEN 'non_compliant_insurance'

-- AFTER:
WHEN o.insurance_expiry_date IS NULL OR o.insurance_expiry_date < CURRENT_DATE THEN 'non_compliant_insurance'
```

**Note:** References to `m.has_liability_insurance` (mechanics table) remain unchanged as that column exists.

---

### Error 4: Workshop Compliance - Relation Does Not Exist
**File:** `20251207000004_workshop_compliance_dashboard.sql`

**Original Error:**
```
ERROR: 42P01: relation "ocpa_quote_compliance_status" does not exist
LINE 144: FROM ocpa_quote_compliance_status
```

**Root Cause:**
- Migration 4 depends on views/tables created in migrations 1-3
- When migration 1 failed (due to Error 1), the view `ocpa_quote_compliance_status` was never created
- Migration 4 tried to query from non-existent view

**Fix Applied:**
- Fixed Error 1 so migration 1 completes successfully
- No changes needed to migration 4 - it will work once migration 1 succeeds

**Dependencies:**
Migration 4 requires these objects from previous migrations:
- `ocpa_quote_compliance_status` view (from migration 1)
- `ocpa_compliance_alerts` table (from migration 1)
- `quote_variance_requests` table (from migration 2)
- `repair_quotes` table with new columns (from migration 1)
- `warranty_claims` table (from migration 3)

---

## Deployment Order

Run migrations in this exact order:

```bash
1. 20251206000001_add_legal_compliance_fields.sql (Phase 1)
2. 20251207000001_quote_enforcement_ocpa_compliance.sql (FIXED)
3. 20251207000002_quote_variance_protection_10_percent_rule.sql
4. 20251207000003_warranty_disclosure_system.sql (FIXED)
5. 20251207000004_workshop_compliance_dashboard.sql
```

---

## Testing Checklist

After deploying fixed migrations:

- [ ] All 5 migrations run without errors
- [ ] View `ocpa_quote_compliance_status` exists
- [ ] View `workshop_compliance_dashboard` exists
- [ ] Table `quote_acceptance_log` exists
- [ ] Table `quote_variance_requests` exists
- [ ] Table `warranty_claims` exists
- [ ] Table `ocpa_compliance_alerts` exists
- [ ] Function `record_quote_acceptance()` exists
- [ ] Function `approve_quote_variance()` exists
- [ ] Function `file_warranty_claim()` exists
- [ ] Trigger `trigger_enforce_quote_acceptance` exists on `repair_quotes`
- [ ] Trigger `trigger_detect_variance_violation` exists on `repair_quotes`
- [ ] Trigger `trigger_calculate_warranty_dates` exists on `repair_quotes`

---

## Verification Queries

Run these queries after deployment to verify everything works:

```sql
-- Verify views exist
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN (
  'ocpa_quote_compliance_status',
  'workshop_compliance_dashboard',
  'platform_compliance_summary',
  'compliance_alert_dashboard',
  'workshops_requiring_attention',
  'mechanic_contractor_compliance',
  'compliance_trend_monthly',
  'customer_data_privacy_compliance',
  'quote_variance_compliance_status',
  'warranty_compliance_status',
  'workshop_warranty_statistics',
  'warranties_expiring_soon'
);

-- Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'quote_acceptance_log',
  'quote_variance_requests',
  'quote_variance_approval_log',
  'warranty_claims',
  'warranty_disclosure_acknowledgments',
  'ocpa_compliance_alerts'
);

-- Verify functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'record_quote_acceptance',
  'can_proceed_with_cost_increase',
  'approve_quote_variance',
  'decline_quote_variance',
  'validate_warranty_claim',
  'file_warranty_claim',
  'refresh_compliance_scores'
);

-- Verify triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN (
  'trigger_enforce_quote_acceptance',
  'trigger_detect_variance_violation',
  'trigger_calculate_warranty_dates',
  'trigger_create_ocpa_alerts',
  'trigger_create_variance_alert'
);

-- Test workshop_compliance_dashboard view (should return 0 rows if no workshops)
SELECT * FROM workshop_compliance_dashboard LIMIT 1;

-- Test platform_compliance_summary view
SELECT * FROM platform_compliance_summary;
```

---

## Rollback Plan

If issues occur after deployment:

```sql
-- Rollback in REVERSE order

-- Drop migration 4 objects
DROP VIEW IF EXISTS customer_data_privacy_compliance CASCADE;
DROP VIEW IF EXISTS compliance_trend_monthly CASCADE;
DROP VIEW IF EXISTS mechanic_contractor_compliance CASCADE;
DROP VIEW IF EXISTS workshops_requiring_attention CASCADE;
DROP VIEW IF EXISTS compliance_alert_dashboard CASCADE;
DROP VIEW IF EXISTS platform_compliance_summary CASCADE;
DROP VIEW IF EXISTS workshop_compliance_dashboard CASCADE;
DROP FUNCTION IF EXISTS refresh_compliance_scores() CASCADE;

-- Drop migration 3 objects
DROP VIEW IF EXISTS warranties_expiring_soon CASCADE;
DROP VIEW IF EXISTS workshop_warranty_statistics CASCADE;
DROP VIEW IF EXISTS warranty_compliance_status CASCADE;
DROP FUNCTION IF EXISTS file_warranty_claim CASCADE;
DROP FUNCTION IF EXISTS validate_warranty_claim CASCADE;
DROP TRIGGER IF EXISTS trigger_calculate_warranty_dates ON repair_quotes;
DROP TABLE IF EXISTS warranty_disclosure_acknowledgments CASCADE;
DROP TABLE IF EXISTS warranty_claims CASCADE;

-- Drop migration 2 objects
DROP VIEW IF EXISTS quote_variance_compliance_status CASCADE;
DROP FUNCTION IF EXISTS decline_quote_variance CASCADE;
DROP FUNCTION IF EXISTS approve_quote_variance CASCADE;
DROP FUNCTION IF EXISTS can_proceed_with_cost_increase CASCADE;
DROP TRIGGER IF EXISTS trigger_detect_variance_violation ON repair_quotes;
DROP TABLE IF EXISTS quote_variance_approval_log CASCADE;
DROP TABLE IF EXISTS quote_variance_requests CASCADE;

-- Drop migration 1 objects
DROP FUNCTION IF EXISTS record_quote_acceptance CASCADE;
DROP TRIGGER IF EXISTS trigger_create_ocpa_alerts ON repair_quotes;
DROP TRIGGER IF EXISTS trigger_enforce_quote_acceptance ON repair_quotes;
DROP VIEW IF EXISTS ocpa_quote_compliance_status CASCADE;
DROP TABLE IF EXISTS ocpa_compliance_alerts CASCADE;
DROP TABLE IF EXISTS quote_acceptance_log CASCADE;
-- (repair_quotes columns would need individual ALTER TABLE DROP COLUMN)
```

---

## Status

**All Errors Fixed:** ✅ (5 errors total)
**Ready for Deployment:** ✅
**Testing Required:** ✅

**Errors Fixed:**
1. Generated column with non-immutable CURRENT_DATE
2. EXTRACT from DATE subtraction type mismatch
3. Column o.gst_hst_registered does not exist (used tax_id instead)
4. Relation ocpa_quote_compliance_status does not exist (resolved by fixing error 1)
5. Column o.has_liability_insurance does not exist (changed to check insurance_expiry_date IS NOT NULL)

**Date Fixed:** 2025-12-07
**Fixed By:** Claude (AI Assistant)
