# Test Scripts Reference - November 2025 Session

**Date Created:** November 7, 2025
**Purpose:** Dummy mechanic testing and database verification
**Total Scripts:** 7 primary scripts

---

## Overview

This document catalogs all test scripts created during the November 7, 2025 development session focused on creating dummy mechanics with Supabase Auth integration and investigating profile completion issues.

---

## Script Categories

### 1. Dummy Data Creation
- [create-dummy-mechanic-supabase-auth.js](#1-create-dummy-mechanic-supabase-authjs) ✅ Primary
- [create-dummy-mechanic.js](#2-create-dummy-mechanicjs) ⚠️ Legacy

### 2. Verification Scripts
- [verify-supabase-auth-integration.js](#3-verify-supabase-auth-integrationjs)
- [verify-dummy-mechanic.js](#4-verify-dummy-mechanicjs)

### 3. Profile Completion Analysis
- [check-profile-completion.js](#5-check-profile-completionjs)
- [check-profile-requirements.js](#6-check-profile-requirementsjs)
- [final-profile-status.js](#7-final-profile-statusjs)

### 4. Database Schema Utilities
- [check-mechanics-schema.js](#8-check-mechanics-schemajs)
- [check-existing-mechanics.js](#9-check-existing-mechanicsjs)
- [check-constraints.js](#10-check-constraintsjs)

### 5. Fix/Update Scripts
- [fix-profile-to-100.js](#11-fix-profile-to-100js)

---

## Script Details

### 1. create-dummy-mechanic-supabase-auth.js

**File:** [scripts/create-dummy-mechanic-supabase-auth.js](../../scripts/create-dummy-mechanic-supabase-auth.js)

**Purpose:** Create fully approved workshop-affiliated mechanic with Supabase Auth integration

**Usage:**
```bash
node scripts/create-dummy-mechanic-supabase-auth.js
```

**What it does:**
1. Creates/updates workshop organization (`Elite Auto Care Workshop`)
2. Creates Supabase Auth user (`workshop.mechanic@test.com`)
3. Creates profile record with `role='mechanic'`
4. Creates/updates mechanic record linked via `user_id`
5. Verifies all linkages and integrations

**Output:**
```
========================================
Creating Dummy Mechanic with Supabase Auth
========================================

Step 1: Creating/Updating workshop organization...
✅ Workshop ready: Elite Auto Care Workshop
   ID: 573d6fc4-fc4b-4422-aebf-737d13226f8a

Step 2: Creating Supabase Auth user...
✅ Auth user created: 8019ea82-9eb3-4df8-b97a-3079d589fe7a

Step 3: Creating/Updating profile...
✅ Profile ready

Step 4: Creating/Updating mechanic record...
✅ Mechanic created: Alex Thompson
   Mechanic ID: c62837da-8ff1-4218-afbe-3da2e940dfd7
   User ID: 8019ea82-9eb3-4df8-b97a-3079d589fe7a

========================================
🎉 Setup Complete!
========================================

🔑 LOGIN CREDENTIALS:
   Email: workshop.mechanic@test.com
   Password: 1234
```

**Database Changes:**
- Inserts/updates in `auth.users`
- Inserts/updates in `profiles`
- Inserts/updates in `mechanics`
- Inserts/updates in `organizations`

**Dependencies:**
- `@supabase/supabase-js`
- `dotenv`
- Environment: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Key Features:**
- ✅ Supabase Auth compatible
- ✅ Workshop affiliation
- ✅ Physical work capability
- ✅ Brand specialist configuration
- ✅ 100% profile completion data
- ✅ Idempotent (safe to run multiple times)

---

### 2. create-dummy-mechanic.js

**File:** [scripts/create-dummy-mechanic.js](../../scripts/create-dummy-mechanic.js)

**Purpose:** ⚠️ Legacy script - Creates mechanic with password_hash (deprecated)

**Status:** **DO NOT USE** - Use [create-dummy-mechanic-supabase-auth.js](#1-create-dummy-mechanic-supabase-authjs) instead

**Why deprecated:**
- Uses `password_hash` column (deprecated)
- Does not create Supabase Auth user
- Does not link via `user_id`
- Not compatible with new auth system

**Historical Note:**
This was the original script created before discovering the Supabase Auth migration.

---

### 3. verify-supabase-auth-integration.js

**File:** [scripts/verify-supabase-auth-integration.js](../../scripts/verify-supabase-auth-integration.js)

**Purpose:** Comprehensive verification of Supabase Auth integration

**Usage:**
```bash
node scripts/verify-supabase-auth-integration.js
```

**What it checks:**
1. ✅ Auth user exists in `auth.users`
2. ✅ Profile exists with `role='mechanic'`
3. ✅ Mechanic has `user_id` linked
4. ✅ `auth.users.id` ←→ `profiles.id` match
5. ✅ `auth.users.id` ←→ `mechanics.user_id` match
6. ✅ Login works with email/password
7. ✅ RLS policies compatible

**Output:**
```
========================================
VERIFYING SUPABASE AUTH INTEGRATION
========================================

1️⃣  Checking auth.users table...
   ✅ Auth user exists
      ID: 8019ea82-9eb3-4df8-b97a-3079d589fe7a
      Email: workshop.mechanic@test.com
      Email Confirmed: YES

2️⃣  Checking profiles table...
   ✅ Profile exists
      Role: mechanic

3️⃣  Checking mechanics table...
   ✅ Mechanic exists
      User ID: 8019ea82-9eb3-4df8-b97a-3079d589fe7a

4️⃣  Verifying linkages...
   ✅ LINKED: auth.users.id ←→ mechanics.user_id
   ✅ LINKED: auth.users.id ←→ profiles.id

5️⃣  Testing authentication...
   ✅ Login SUCCESSFUL
   ✅ Sign out successful

6️⃣  Checking RLS compatibility...
   ✅ Compatible with requireMechanicAPI: YES

========================================
✅ ALL CHECKS PASSED!
========================================
```

**Use When:**
- After creating dummy mechanic
- After auth-related changes
- Troubleshooting login issues
- Verifying production migration

---

### 4. verify-dummy-mechanic.js

**File:** [scripts/verify-dummy-mechanic.js](../../scripts/verify-dummy-mechanic.js)

**Purpose:** Detailed report of mechanic profile data

**Usage:**
```bash
node scripts/verify-dummy-mechanic.js
```

**What it shows:**
- Workshop details
- Mechanic details
- Account status
- Workshop affiliation
- Credentials & experience
- Specializations
- Location & service info
- Performance metrics
- Payment & insurance status

**Output Format:**
```
🏢 WORKSHOP DETAILS
==================
Name: Elite Auto Care Workshop
Email: elite.workshop@test.com
Status: active
...

👨‍🔧 MECHANIC DETAILS
==================
Name: Alex Thompson
Email: workshop.mechanic@test.com
...

📝 ACCOUNT STATUS
==================
Application Status: approved ✅
Profile Completion: 100% ✅
Can Accept Sessions: YES ✅
...
```

**Use When:**
- Verifying mechanic data is correct
- Checking all fields are populated
- Debugging data issues
- Documentation/reporting

---

### 5. check-profile-completion.js

**File:** [scripts/check-profile-completion.js](../../scripts/check-profile-completion.js)

**Purpose:** Analyze profile completion score and identify missing fields

**Usage:**
```bash
node scripts/check-profile-completion.js
```

**What it checks:**
- Current stored completion score
- Field-by-field breakdown by category
- Missing required fields
- Whether mechanic can accept sessions

**Output:**
```
========================================
CHECKING PROFILE COMPLETION
========================================

📊 CURRENT STATUS
==================
Profile Completion Score: 91%
Can Accept Sessions: YES ✅

📋 FIELD BREAKDOWN
==================

BASIC INFO (40 points):
  Name: ✅ "Alex Thompson"
  Email: ✅ "workshop.mechanic@test.com"
  Phone: ✅ "+14165559876"
  Profile Photo: ⚠️  Missing

CREDENTIALS (30 points):
  Years of Experience: ✅ 8 years
  Red Seal Certified: ✅ YES
  Certifications Uploaded: ✅ YES

...

❌ MISSING REQUIRED FIELDS:
   - profile_photo

💡 RECOMMENDATIONS
==================
✅ Profile is 91% complete (above 80% threshold)
   Mechanic can accept sessions
```

**Use When:**
- Troubleshooting "cannot accept sessions" issues
- Identifying missing profile fields
- Understanding completion score calculation
- Helping mechanics reach 80%+

---

### 6. check-profile-requirements.js

**File:** [scripts/check-profile-requirements.js](../../scripts/check-profile-requirements.js)

**Purpose:** Display all requirements from database and calculate score dynamically

**Usage:**
```bash
node scripts/check-profile-requirements.js
```

**What it shows:**
1. All fields in `mechanic_profile_requirements` table
2. Which fields are required for general vs brand specialists
3. Point values for each field
4. Calculation of dummy mechanic against requirements
5. Schema mismatch detection

**Output:**
```
========================================
CHECKING PROFILE REQUIREMENTS TABLE
========================================

Found 13 profile requirements:

┌──────────────────┬───────────┬────────┬──────────────┐
│ Field Name       │ Category  │ Weight │ Required     │
├──────────────────┼───────────┼────────┼──────────────┤
│ full_name        │ basic     │ 10     │ ✓ Gen, ✓ Spec│
│ email            │ basic     │ 10     │ ✓ Gen, ✓ Spec│
│ profile_photo    │ basic     │ 10     │ ✓ Spec       │
...

Total weight for general mechanics: 70
Total weight for brand specialists: 110

========================================
CHECKING DUMMY MECHANIC AGAINST REQUIREMENTS
========================================

✅ full_name                      +10 points
✅ email                          +10 points
❌ profile_photo                  missing 10 points
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CALCULATED SCORE: 100 / 110 = 91%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Use When:**
- Understanding the requirements system
- Debugging score calculation
- Finding schema mismatches
- Planning profile completion features

---

### 7. final-profile-status.js

**File:** [scripts/final-profile-status.js](../../scripts/final-profile-status.js)

**Purpose:** Comprehensive status report with schema mismatch detection

**Usage:**
```bash
node scripts/final-profile-status.js
```

**What it provides:**
- Stored database values
- Dynamically calculated values
- Comparison between the two
- Schema issue detection
- Missing fields categorized by schema vs data

**Output:**
```
═══════════════════════════════════════════════════════
  FINAL PROFILE STATUS REPORT
═══════════════════════════════════════════════════════

🔍 CURRENT STORED VALUES
Profile Completion Score (DB): 100%
Can Accept Sessions (DB): YES ✅

📊 DYNAMIC CALCULATION
Calculated Score: 91%
Can Accept Sessions: YES ✅

❌ MISSING FIELDS (1):
  • profile_photo (-10 pts) ❌ Column missing from schema

═══════════════════════════════════════════════════════
  SUMMARY
═══════════════════════════════════════════════════════

✅ MECHANIC CAN ACCEPT SESSIONS!
   Current Score: 91% (Threshold: 80%)

   ⚠️  SCHEMA ISSUES:
      - profile_photo (need to add column)
```

**Use When:**
- Troubleshooting score discrepancies
- Final verification before testing
- Identifying schema issues
- Understanding why scores differ

---

### 8. check-mechanics-schema.js

**File:** [scripts/check-mechanics-schema.js](../../scripts/check-mechanics-schema.js)

**Purpose:** Display all columns in mechanics table

**Usage:**
```bash
node scripts/check-mechanics-schema.js
```

**What it does:**
- Queries a mechanic to get all column names
- Displays available columns
- Useful for schema verification

**Output:**
```
Available columns in mechanics table:
[
  'id', 'created_at', 'name', 'email', 'phone',
  'user_id', 'stripe_account_id', 'years_of_experience',
  'specializations', 'workshop_id', 'can_accept_sessions',
  ...
]
```

**Use When:**
- Checking if a column exists
- Understanding table structure
- Before creating migrations
- Debugging field references

---

### 9. check-existing-mechanics.js

**File:** [scripts/check-existing-mechanics.js](../../scripts/check-existing-mechanics.js)

**Purpose:** List all existing mechanics and their configuration

**Usage:**
```bash
node scripts/check-existing-mechanics.js
```

**What it shows:**
- All mechanics in database
- Their account types
- Workshop affiliations
- Service configurations

**Output:**
```
Found 3 mechanics:
[
  {
    "id": "99c254c1-...",
    "name": "Test Mechanic",
    "email": "mechanic@test.com",
    "account_type": "individual_mechanic",
    "workshop_id": null,
    "can_perform_physical_work": false
  },
  ...
]

✅ Example successful mechanic config:
account_type: individual_mechanic
service_tier: virtual_only
```

**Use When:**
- Seeing what data exists
- Finding example configurations
- Checking constraint values
- Before creating new mechanics

---

### 10. check-constraints.js

**File:** [scripts/check-constraints.js](../../scripts/check-constraints.js)

**Purpose:** Test database constraints with actual insert attempts

**Usage:**
```bash
node scripts/check-constraints.js
```

**What it does:**
- Attempts to insert test data with various values
- Reports which values pass/fail constraints
- Helps identify valid enum values

**Output:**
```
✅ Independent account type works
❌ Error with workshop: constraint violation

Valid account_type values:
- individual_mechanic
- workshop_mechanic
```

**Use When:**
- Discovering constraint values
- Troubleshooting insert errors
- Before migrations
- Documentation

---

### 11. fix-profile-to-100.js

**File:** [scripts/fix-profile-to-100.js](../../scripts/fix-profile-to-100.js)

**Purpose:** Attempt to bring profile completion to 100%

**Usage:**
```bash
node scripts/fix-profile-to-100.js
```

**What it does:**
1. Checks current profile status
2. Identifies fixable missing fields
3. Attempts to add missing data
4. Recalculates completion score
5. Reports new score

**Note:** Cannot fix schema issues (e.g., missing profile_photo column)

**Output:**
```
========================================
FIXING PROFILE TO 100%
========================================

Current status:
  Profile Photo: ❌ Missing (column doesn't exist)
  Country: ✅ "Canada"
  City: ✅ "Toronto"

Applying fixes...
✅ Country already set
✅ City already set
⚠️  Cannot add profile photo (column missing)

NEW CALCULATED SCORE: 91%
(Cannot reach 100% due to schema issue)
```

**Use When:**
- Trying to reach 100% completion
- Fixing data gaps
- Understanding what can/cannot be fixed

---

## Common Usage Patterns

### Initial Setup
```bash
# 1. Create dummy mechanic
node scripts/create-dummy-mechanic-supabase-auth.js

# 2. Verify auth integration
node scripts/verify-supabase-auth-integration.js

# 3. Check profile details
node scripts/verify-dummy-mechanic.js
```

### Troubleshooting Profile Completion
```bash
# 1. Check current score
node scripts/check-profile-completion.js

# 2. See requirements table
node scripts/check-profile-requirements.js

# 3. Get comprehensive report
node scripts/final-profile-status.js

# 4. Try to fix (if possible)
node scripts/fix-profile-to-100.js
```

### Schema Investigation
```bash
# 1. See all columns
node scripts/check-mechanics-schema.js

# 2. Check existing data
node scripts/check-existing-mechanics.js

# 3. Test constraints
node scripts/check-constraints.js
```

### Complete Workflow
```bash
# Complete setup and verification workflow
npm run create:dummy-mechanic && \
npm run verify:auth && \
npm run verify:profile
```

*(Add these to package.json scripts section)*

---

## Environment Requirements

All scripts require:

**File:** `.env.local`

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

**Node Modules:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.75.1",
    "dotenv": "^17.2.3"
  }
}
```

---

## Script Output Conventions

### Status Indicators
- ✅ Success / Present / Passed
- ❌ Error / Missing / Failed
- ⚠️  Warning / Partially Complete
- ℹ️  Information / Note

### Section Headers
```
========================================
SECTION TITLE
========================================
```

### Progress Indicators
```
Step 1: Creating resource...
✅ Resource created

Step 2: Verifying...
✅ Verification passed
```

---

## Adding New Scripts

### Template
```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function myScript() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('\n========================================');
  console.log('MY SCRIPT TITLE');
  console.log('========================================\n');

  try {
    // Script logic here

    console.log('✅ Success!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

myScript();
```

### Best Practices
1. **Always use service role key** for admin operations
2. **Handle errors gracefully** with try/catch
3. **Provide clear output** with status indicators
4. **Be idempotent** when possible (safe to run multiple times)
5. **Document in this file** with purpose, usage, and output
6. **Use consistent formatting** (see conventions above)

---

## Related Documentation

- [Dummy Mechanic Setup](../testing/dummy-mechanic-setup.md)
- [Supabase Auth Migration](../authentication/supabase-auth-migration.md)
- [Profile Completion System](../features/profile-completion-system.md)
- [Database Schema Mismatches](../troubleshooting/database-schema-mismatches.md)

---

**Last Updated:** November 7, 2025
**Total Scripts Documented:** 11
**Primary Scripts:** 7
**Utility Scripts:** 4
