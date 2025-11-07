# Database Schema Mismatches and Constraint Issues

**Date Identified:** November 7, 2025
**Context:** Dummy mechanic creation and profile completion analysis
**Status:** ⚠️ Active Issues Documented

---

## Overview

During the implementation of dummy mechanic data and profile completion testing, several schema mismatches and constraint inconsistencies were discovered. This document catalogs these issues, their impact, and recommended solutions.

---

## Issue 1: profile_photo Column Missing

### Problem Description

**Discovered When:** Calculating profile completion for brand specialist mechanic

**Error Context:**
```javascript
// Requirements table expects:
mechanic_profile_requirements.field_name = 'profile_photo'
Weight: 10 points (brand specialists)

// But mechanics table:
❌ No profile_photo_url column exists
❌ No profile_photo column exists
❌ No avatar_url column exists
```

### Impact

**Severity:** Medium
- Brand specialists automatically lose 10 points (-9%)
- Maximum score becomes 100/110 = 91% instead of 100%
- Still above 80% threshold, so mechanics can accept sessions
- But can never reach 100% completion

### Root Cause

**Analysis:**
1. Profile requirements were added to database
2. UI/frontend was designed to support profile photos
3. Database migration to add column was never created or applied
4. System checks for field that doesn't exist

**Check Function:**
```typescript
// File: src/lib/profileCompletion.ts:132
case 'profile_photo':
  return !!mechanic.profile_photo_url; // ❌ Column doesn't exist
```

### Solutions

#### Option 1: Add Column (Recommended)
```sql
-- File: Create new migration
-- supabase/migrations/YYYYMMDD_add_profile_photo_to_mechanics.sql

ALTER TABLE public.mechanics
  ADD COLUMN profile_photo_url TEXT;

COMMENT ON COLUMN public.mechanics.profile_photo_url IS
  'URL to mechanic profile photo (stored in Supabase Storage)';

-- Index for faster queries (optional)
CREATE INDEX idx_mechanics_profile_photo
  ON public.mechanics(profile_photo_url)
  WHERE profile_photo_url IS NOT NULL;
```

**Test After Migration:**
```bash
node scripts/check-profile-completion.js
# Should show profile_photo as present or missing (not error)
```

#### Option 2: Remove from Requirements
```sql
DELETE FROM mechanic_profile_requirements
WHERE field_name = 'profile_photo';

-- Recalculate all mechanics
UPDATE mechanics
SET profile_completion_score = NULL,
    updated_at = NOW();
```

**Impact:** Brand specialists no longer need profile photo

#### Option 3: Make Optional for Now
```sql
UPDATE mechanic_profile_requirements
SET required_for_specialist = FALSE
WHERE field_name = 'profile_photo';
```

**Impact:** Profile photo becomes bonus points, not required

### Prevention

1. **Schema Validation Script:**
```typescript
// scripts/validate-requirements-schema.js
async function validateRequirements() {
  const requirements = await getRequirements();
  const mechanicColumns = await getMechanicTableColumns();

  for (const req of requirements) {
    const columnExists = mechanicColumns.includes(req.field_name) ||
                        fieldMappings[req.field_name];

    if (!columnExists) {
      console.warn(`❌ Requirement '${req.field_name}' expects column that doesn't exist`);
    }
  }
}
```

2. **Pre-deployment Checks:**
```bash
# Add to CI/CD pipeline
npm run validate:schema
npm run validate:requirements
```

---

## Issue 2: account_type Constraint Mismatch

### Problem Description

**Discovered When:** Creating dummy mechanic with `account_type: 'workshop'`

**Error:**
```
PostgreSQL Error 23514:
new row for relation "mechanics" violates check constraint "mechanics_account_type_check"
```

### Current State

**Active Constraint:**
```sql
-- File: supabase/migrations/20250124000003_add_account_types.sql
CHECK (account_type IN ('individual_mechanic', 'workshop_mechanic'))
```

**Actual Values in Database:**
```sql
SELECT DISTINCT account_type FROM mechanics;
-- Results:
-- 'individual_mechanic'
-- 'workshop_mechanic'
```

### Pending Migration

**Future Constraint:**
```sql
-- File: supabase/migrations/99990009_phase2_fix_type_mismatches.sql
-- ⏳ NOT YET APPLIED

-- Update old values
UPDATE mechanics SET account_type = 'independent'
WHERE account_type = 'individual_mechanic';

UPDATE mechanics SET account_type = 'workshop'
WHERE account_type = 'workshop_mechanic';

-- Add new constraint
ALTER TABLE mechanics DROP CONSTRAINT mechanics_account_type_check;
ALTER TABLE mechanics
  ADD CONSTRAINT mechanics_account_type_check
  CHECK (account_type IN ('independent', 'workshop'));
```

### Impact

**Severity:** Low
- Scripts must use current values (`individual_mechanic`, `workshop_mechanic`)
- Code may be written for future values (`independent`, `workshop`)
- Migration exists but not applied (intentional staging)

### Workaround

**Use current constraint values:**
```typescript
// ❌ Don't use (future values)
account_type: 'workshop'
account_type: 'independent'

// ✅ Use (current values)
account_type: 'workshop_mechanic'
account_type: 'individual_mechanic'
```

### Solution

**When ready to standardize:**
```bash
# Apply the migration
psql $DATABASE_URL -f supabase/migrations/99990009_phase2_fix_type_mismatches.sql

# Verify
SELECT DISTINCT account_type FROM mechanics;
# Should show: 'independent', 'workshop'

# Update all code references
grep -r "individual_mechanic" src/
grep -r "workshop_mechanic" src/
# Replace with new values
```

### Related Code Locations

**Check for these values:**
- [src/lib/profileCompletion.ts](../../src/lib/profileCompletion.ts) - May reference account types
- [src/types/mechanic.ts](../../src/types/mechanic.ts) - Type definitions
- [src/types/supabase.ts](../../src/types/supabase.ts) - Generated types
- API routes filtering by account_type

---

## Issue 3: shop_affiliation Constraint

### Problem Description

**Discovered When:** Setting `shop_affiliation: 'workshop'` for workshop mechanic

**Error:**
```
PostgreSQL Error 23514:
new row for relation "mechanics" violates check constraint "mechanics_shop_affiliation_check"
```

### Constraint Definition

**File:** `supabase/migrations/20251023000001_upgrade_mechanics_credentials.sql`

```sql
ADD COLUMN IF NOT EXISTS shop_affiliation TEXT
  CHECK (shop_affiliation IN ('independent', 'dealership', 'franchise', 'mobile'));
```

**Valid Values:**
- `independent` - Self-employed mechanic
- `dealership` - Works at car dealership
- `franchise` - Works at franchise shop (Midas, Jiffy Lube, etc.)
- `mobile` - Mobile mechanic (travels to customers)

**Invalid Values:**
- ❌ `workshop` - Not a valid value despite having workshop_id!

### Impact

**Severity:** Low
- Workshop-affiliated mechanics must choose from valid values
- `dealership` is appropriate for workshop location
- Semantic confusion: `workshop_id` exists but can't use `shop_affiliation: 'workshop'`

### Workaround

```typescript
// For workshop-affiliated mechanic working at physical location:
{
  account_type: 'workshop_mechanic',
  workshop_id: '<uuid>',
  shop_affiliation: 'dealership', // ✅ Valid value
  shop_name: 'Elite Auto Care Workshop',
  can_perform_physical_work: true
}
```

### Solution Options

#### Option 1: Add 'workshop' to Constraint
```sql
ALTER TABLE mechanics DROP CONSTRAINT IF EXISTS mechanics_shop_affiliation_check;
ALTER TABLE mechanics
  ADD CONSTRAINT mechanics_shop_affiliation_check
  CHECK (shop_affiliation IN ('independent', 'dealership', 'franchise', 'mobile', 'workshop'));
```

#### Option 2: Rename 'dealership' to 'workshop'
```sql
-- More breaking change
UPDATE mechanics SET shop_affiliation = 'workshop'
WHERE shop_affiliation = 'dealership' AND workshop_id IS NOT NULL;

ALTER TABLE mechanics DROP CONSTRAINT mechanics_shop_affiliation_check;
ALTER TABLE mechanics
  ADD CONSTRAINT mechanics_shop_affiliation_check
  CHECK (shop_affiliation IN ('independent', 'workshop', 'franchise', 'mobile'));
```

#### Option 3: Document Current Mapping
```typescript
// Keep constraint as-is, document mapping:
const shopAffiliationMap = {
  workshop_mechanic_at_location: 'dealership',
  independent_mobile: 'mobile',
  franchise_location: 'franchise',
  self_employed: 'independent'
};
```

**Recommendation:** Option 1 (add 'workshop') is clearest and least breaking

---

## Issue 4: Field Name Inconsistencies

### Problem Description

**Context:** Profile completion requirements use different field names than actual columns

### Mapping Table

| Requirement Field | Actual Column | Check Function Handles | Issue |
|-------------------|---------------|----------------------|-------|
| `full_name` | `name` | ⚠️ Partially | Need to check both |
| `years_experience` | `years_of_experience` | ✅ Yes | Handles both names |
| `certifications_uploaded` | `other_certifications` | ✅ Yes | Maps correctly |
| `availability_set` | `is_available` | ✅ Yes | Maps correctly |
| `stripe_connected` | `stripe_account_id` | ✅ Yes | Maps correctly |
| `profile_photo` | ❌ None | ❌ No | Column missing |
| `country` | `country` | ✅ Yes | Direct match |
| `city` | `city` | ✅ Yes | Direct match |

### Impact

**Severity:** Low
- Check function handles most mappings
- Some fields like `full_name` may fail if only `name` is set
- Not consistent which makes maintenance harder

### Current Check Function

**File:** [src/lib/profileCompletion.ts:120-171](../../src/lib/profileCompletion.ts#L120-L171)

```typescript
function checkFieldCompletion(fieldName: string, mechanic: any): boolean {
  switch (fieldName) {
    case 'full_name':
      // ⚠️ Checks full_name OR name
      return !!mechanic.full_name && mechanic.full_name.trim().length > 0;
      // Should be: return !!(mechanic.full_name || mechanic.name)

    case 'years_experience':
    case 'years_of_experience':
      // ✅ Handles both
      const yearsExp = mechanic.years_of_experience || mechanic.years_experience;
      return typeof yearsExp === 'number' && yearsExp > 0;

    // ... other cases
  }
}
```

### Solution

**Update check function:**
```typescript
case 'full_name':
  // Check both possible column names
  return !!(mechanic.full_name || mechanic.name);
```

**Or standardize schema:**
```sql
-- Add full_name as alias or rename
ALTER TABLE mechanics RENAME COLUMN name TO full_name;

-- Or add computed column
ALTER TABLE mechanics ADD COLUMN full_name TEXT
  GENERATED ALWAYS AS (name) STORED;
```

---

## Issue 5: Missing Columns Referenced in Code

### Problem Description

During profile completion check, several columns are referenced that may not exist:

```typescript
// File: src/lib/profileCompletion.ts

case 'certifications_uploaded':
  // Checks mechanic.certifications (array)
  return Array.isArray(mechanic.certifications) && mechanic.certifications.length > 0;
  // ⚠️ Column name is 'certification_documents' not 'certifications'
```

### Actual Column Names

**From schema:**
```
certification_documents TEXT[] -- ✅ This exists
other_certifications JSONB     -- ✅ This exists
certifications ???             -- ❌ Doesn't exist
```

### Fixed Check Function

```typescript
case 'certifications_uploaded':
  // Check actual column names
  return (
    (Array.isArray(mechanic.certification_documents) &&
     mechanic.certification_documents.length > 0) ||
    (mechanic.other_certifications &&
     Object.keys(mechanic.other_certifications).length > 0)
  );
```

**File:** Update [src/lib/profileCompletion.ts:145-147](../../src/lib/profileCompletion.ts#L145-L147)

---

## Testing and Validation

### Schema Validation Script

**File:** Create [scripts/validate-schema-requirements.js](../../scripts/validate-schema-requirements.js)

```javascript
const { createClient } = require('@supabase/supabase-js');

async function validateSchema() {
  const supabase = createClient(/*...*/);

  // 1. Get all requirements
  const { data: requirements } = await supabase
    .from('mechanic_profile_requirements')
    .select('field_name');

  // 2. Get actual mechanic table columns
  const { data: sample } = await supabase
    .from('mechanics')
    .select('*')
    .limit(1)
    .single();

  const actualColumns = Object.keys(sample);

  // 3. Check each requirement
  const fieldMappings = {
    'full_name': 'name',
    'years_experience': 'years_of_experience',
    'certifications_uploaded': 'other_certifications',
    'availability_set': 'is_available',
    'stripe_connected': 'stripe_account_id'
  };

  console.log('Schema Validation Report\n');

  for (const req of requirements) {
    const field = req.field_name;
    const mappedField = fieldMappings[field] || field;
    const exists = actualColumns.includes(mappedField);

    if (!exists) {
      console.log(`❌ ${field} → ${mappedField} (MISSING)`);
    } else {
      console.log(`✅ ${field} → ${mappedField}`);
    }
  }
}

validateSchema();
```

### Run Validation

```bash
node scripts/validate-schema-requirements.js
```

**Expected Output:**
```
Schema Validation Report

✅ full_name → name
✅ email → email
✅ phone → phone
❌ profile_photo → profile_photo_url (MISSING)
✅ years_experience → years_of_experience
✅ red_seal_certified → red_seal_certified
✅ certifications_uploaded → other_certifications
✅ specializations → specializations
✅ service_keywords → service_keywords
✅ availability_set → is_available
✅ stripe_connected → stripe_account_id
✅ country → country
✅ city → city
```

---

## Summary of Issues

| Issue | Severity | Status | Recommended Action |
|-------|----------|--------|-------------------|
| profile_photo missing | Medium | ⚠️ Active | Add column or remove requirement |
| account_type values | Low | ⚠️ Pending migration | Apply when ready |
| shop_affiliation 'workshop' | Low | ⚠️ Active | Add to constraint or document |
| full_name vs name | Low | ⚠️ Active | Update check function |
| certifications array | Low | ⚠️ Active | Fix check function |

---

## Recommended Action Plan

### Phase 1: Immediate (This Week)

1. **Fix Check Functions:**
```bash
# Update profileCompletion.ts
# Fix full_name to check both columns
# Fix certifications to check actual columns
```

2. **Document Workarounds:**
```bash
# Update all scripts to use correct values
# Add comments explaining constraints
```

3. **Add Validation to CI/CD:**
```bash
# Create schema validation script
# Run on every deployment
```

### Phase 2: Short-term (Next Sprint)

1. **Add profile_photo Column:**
```sql
ALTER TABLE mechanics ADD COLUMN profile_photo_url TEXT;
```

2. **Add 'workshop' to shop_affiliation:**
```sql
ALTER TABLE mechanics DROP CONSTRAINT mechanics_shop_affiliation_check;
ALTER TABLE mechanics ADD CONSTRAINT mechanics_shop_affiliation_check
  CHECK (shop_affiliation IN ('independent', 'dealership', 'franchise', 'mobile', 'workshop'));
```

3. **Create Migration Checklist:**
- List all pending migrations
- Document dependencies
- Test on staging first

### Phase 3: Medium-term (Future Sprint)

1. **Apply account_type Migration:**
```bash
# When ready, apply 99990009_phase2_fix_type_mismatches.sql
# Update all code references
# Run comprehensive tests
```

2. **Standardize Field Names:**
- Decide on canonical names
- Create migration plan
- Update all code

3. **Add Schema Tests:**
```typescript
// Add to test suite
describe('Schema Consistency', () => {
  it('should have all required columns', () => {/*...*/});
  it('should match requirements table', () => {/*...*/});
});
```

---

## Related Documentation

- [Dummy Mechanic Setup](../testing/dummy-mechanic-setup.md)
- [Profile Completion System](../features/profile-completion-system.md)
- [Test Scripts Reference](../development/test-scripts-reference.md)
- [Database Migrations Guide](./database-migrations.md) *(if exists)*

---

**Last Updated:** November 7, 2025
**Issues Identified:** 5
**Critical Issues:** 0
**Action Required:** Yes (Phase 1 fixes)
