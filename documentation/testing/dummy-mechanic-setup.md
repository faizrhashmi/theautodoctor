# Dummy Mechanic Setup for End-to-End Testing

**Date Created:** November 7, 2025
**Purpose:** End-to-end testing of workshop-affiliated mechanic flow with Supabase Auth
**Status:** ✅ Fully Implemented and Verified

---

## Overview

This document details the creation and configuration of a fully approved dummy mechanic with complete workshop affiliation for testing The Auto Doctor platform's B2B2C business model. The mechanic is configured with Supabase Auth integration and meets all profile completion requirements.

## Business Context

### B2B2C Model
The Auto Doctor operates on a B2B2C (Business-to-Business-to-Consumer) model:

- **Workshops (B2B):** Business customers that employ/affiliate mechanics
- **Mechanics (B):** Service providers working for workshops or independently
- **End Customers (C):** Car owners requesting services

### Physical Work Capability
A key requirement is mechanics who can perform **both virtual diagnostics and physical repair work** at workshop locations, supporting the hybrid service model.

---

## Implementation Details

### Created Resources

#### 1. Workshop Organization
**Entity:** Elite Auto Care Workshop

```javascript
{
  id: '573d6fc4-fc4b-4422-aebf-737d13226f8a',
  organization_type: 'workshop',
  name: 'Elite Auto Care Workshop',
  email: 'elite.workshop@test.com',
  phone: '+14165551234',
  address: '456 Professional Blvd, Unit 12',
  city: 'Toronto',
  province: 'ON',
  postal_code: 'M4B 1B3',
  status: 'active',
  verification_status: 'verified',
  mechanic_capacity: 15,
  commission_rate: 12.00,
  service_radius_km: 25,
  coverage_postal_codes: ['M4B', 'M4C', 'M4E', 'M4K', 'M4L', 'M4M', 'M5A', 'M5B']
}
```

**Database Location:** `public.organizations` table

#### 2. Supabase Auth User
**Entity:** Alex Thompson (Auth User)

```javascript
{
  id: '8019ea82-9eb3-4df8-b97a-3079d589fe7a',
  email: 'workshop.mechanic@test.com',
  email_confirmed: true,
  password: '1234' // Stored securely in Supabase Auth
}
```

**Database Location:** `auth.users` table

#### 3. Profile Record
**Entity:** Mechanic Profile

```javascript
{
  id: '8019ea82-9eb3-4df8-b97a-3079d589fe7a', // Same as auth user
  role: 'mechanic',
  email: 'workshop.mechanic@test.com',
  full_name: 'Alex Thompson',
  account_type: 'individual_customer'
}
```

**Database Location:** `public.profiles` table

#### 4. Mechanic Record
**Entity:** Workshop-Affiliated Mechanic

```javascript
{
  // IDs and Authentication
  id: 'c62837da-8ff1-4218-afbe-3da2e940dfd7',
  user_id: '8019ea82-9eb3-4df8-b97a-3079d589fe7a', // ✅ Linked to Supabase Auth

  // Basic Info
  name: 'Alex Thompson',
  email: 'workshop.mechanic@test.com',
  phone: '+14165559876',

  // Workshop Affiliation
  account_type: 'workshop_mechanic',
  workshop_id: '573d6fc4-fc4b-4422-aebf-737d13226f8a',
  invited_by: '573d6fc4-fc4b-4422-aebf-737d13226f8a',
  invite_accepted_at: '2025-09-30T03:37:02.761Z',

  // Approval Status
  application_status: 'approved',
  background_check_status: 'approved',
  approved_at: '2025-10-05T03:37:02.761Z',

  // Profile Completion
  profile_completion_score: 91,
  can_accept_sessions: true,

  // Credentials
  years_of_experience: 8,
  red_seal_certified: true,
  red_seal_number: 'RS-ON-87654321',
  red_seal_province: 'ON',
  red_seal_expiry_date: '2027-04-23',
  other_certifications: {
    ASE: ['A1', 'A4', 'A6', 'A8'],
    manufacturer: ['Honda Master', 'Toyota Level 2']
  },

  // Specializations
  specializations: [
    'brakes', 'suspension', 'diagnostics',
    'electrical', 'engine', 'transmission'
  ],
  service_keywords: [
    'brake repair', 'brake inspection', 'suspension repair',
    'shock replacement', 'diagnostic scan', 'check engine light',
    'electrical troubleshooting', 'alternator repair',
    'battery replacement', 'engine repair', 'transmission service'
  ],

  // Brand Specialist
  is_brand_specialist: true,
  brand_specializations: ['Honda', 'Toyota', 'Mazda', 'Nissan'],
  specialist_tier: 'brand',

  // Physical Work Capability (KEY FOR B2B2C)
  shop_affiliation: 'dealership',
  can_perform_physical_work: true,
  prefers_physical: true,
  participation_mode: 'both', // Can do virtual AND physical

  // Performance
  rating: 4.9,
  completed_sessions: 47,

  // Payment
  stripe_account_id: 'acct_test_...',
  stripe_onboarding_completed: true,
  stripe_charges_enabled: true,
  stripe_payouts_enabled: true,
  banking_info_completed: true,

  // Insurance & Compliance
  liability_insurance: true,
  insurance_policy_number: 'INS-...',
  insurance_expiry: '2026-09-25',
  criminal_record_check: true,
  crc_date: '2025-08-31'
}
```

**Database Location:** `public.mechanics` table

---

## Database Linkage Flow

```
┌─────────────────────────────────────────┐
│ auth.users                              │
│ ID: 8019ea82-9eb3-4df8-b97a-3079d589fe7a│
│ Email: workshop.mechanic@test.com       │
│ Password: 1234 (hashed)                 │
└──────────────┬──────────────────────────┘
               │ (id)
               ↓
┌─────────────────────────────────────────┐
│ profiles                                │
│ ID: 8019ea82-... (same as auth)         │
│ Role: mechanic                          │
│ Full Name: Alex Thompson                │
└──────────────┬──────────────────────────┘
               │ (id → mechanics.user_id)
               ↓
┌─────────────────────────────────────────┐
│ mechanics                               │
│ ID: c62837da-8ff1-4218-afbe-3da2e940dfd7│
│ user_id: 8019ea82-... (linked)          │
│ workshop_id: 573d6fc4-... (linked)      │
│ Profile: 91% complete                   │
│ Can Accept Sessions: YES                │
└──────────────┬──────────────────────────┘
               │ (workshop_id)
               ↓
┌─────────────────────────────────────────┐
│ organizations                           │
│ ID: 573d6fc4-fc4b-4422-aebf-737d13226f8a│
│ Name: Elite Auto Care Workshop          │
│ Type: workshop                          │
│ Status: active                          │
└─────────────────────────────────────────┘
```

---

## Creation Scripts

### Primary Script
**File:** [scripts/create-dummy-mechanic-supabase-auth.js](../../scripts/create-dummy-mechanic-supabase-auth.js)

**Usage:**
```bash
node scripts/create-dummy-mechanic-supabase-auth.js
```

**What it does:**
1. Creates/updates workshop organization
2. Creates Supabase Auth user
3. Creates profile record with `role='mechanic'`
4. Creates/updates mechanic record linked via `user_id`
5. Verifies all linkages

### Verification Scripts

#### 1. Verify Supabase Auth Integration
**File:** [scripts/verify-supabase-auth-integration.js](../../scripts/verify-supabase-auth-integration.js)

```bash
node scripts/verify-supabase-auth-integration.js
```

**Checks:**
- ✅ Auth user exists
- ✅ Profile linked correctly
- ✅ Mechanic has `user_id`
- ✅ Login works
- ✅ RLS policies compatible

#### 2. Check Profile Completion
**File:** [scripts/check-profile-completion.js](../../scripts/check-profile-completion.js)

```bash
node scripts/check-profile-completion.js
```

**Checks:**
- Profile completion score
- Required fields status
- Missing fields breakdown
- Session acceptance eligibility

#### 3. Final Profile Status
**File:** [scripts/final-profile-status.js](../../scripts/final-profile-status.js)

```bash
node scripts/final-profile-status.js
```

**Provides:**
- Database stored values
- Dynamic calculation from requirements
- Schema mismatch detection
- Comprehensive status report

---

## Login Credentials

```
URL: http://localhost:3000/mechanic/login
Email: workshop.mechanic@test.com
Password: 1234
```

**Authentication Method:** Supabase Auth (JWT tokens)

---

## Testing Workflow

### 1. Mechanic Dashboard Testing

```bash
# Login
Navigate to: http://localhost:3000/mechanic/login
Email: workshop.mechanic@test.com
Password: 1234

# Expected Results
✅ Successful login (no errors)
✅ Redirect to /mechanic/dashboard
✅ Profile shows 91%+ completion
✅ Workshop affiliation displayed
✅ Can accept sessions toggle enabled
✅ All credentials visible
```

### 2. End-to-End Customer Flow

#### As Customer:
1. Create session request
2. Select service type (brake repair, diagnostics, etc.)
3. Choose virtual or physical service
4. Submit request

#### As Mechanic (Alex Thompson):
1. Login as workshop.mechanic@test.com
2. View pending session request
3. Accept request
4. Complete session workflow
5. Provide diagnosis/recommendations
6. Mark as complete

#### Verify:
- Workshop commission calculated (12%)
- Mechanic earnings recorded
- Session history updated
- Customer receives invoice
- Payment processing works

### 3. Workshop Integration Testing

```bash
# Verify workshop mechanics roster
# Check session routing to workshop
# Verify commission split
# Test physical service request handling
```

---

## Profile Completion Analysis

### Current Status
- **Database Score:** 100% (manually set)
- **Calculated Score:** 91% (based on requirements)
- **Threshold Required:** 80%
- **Result:** ✅ **CAN ACCEPT SESSIONS**

### Missing Fields (9%)
**profile_photo** (-10 points) - Column doesn't exist in mechanics table (schema issue)

### Score Breakdown

| Category | Points Earned | Total Possible | Status |
|----------|---------------|----------------|--------|
| Basic Info | 40 | 40 | ✅ Complete |
| Credentials | 30 | 30 | ✅ Complete |
| Experience | 20 | 20 | ✅ Complete |
| Location | 10 | 10 | ✅ Complete |
| Availability | 5 | 5 | ✅ Complete |
| Payment | 5 | 5 | ✅ Complete |
| **Brand Specialist Bonus** | -10 | +10 | ❌ Profile photo missing |
| **TOTAL** | **100** | **110** | **91%** |

**Note:** Brand specialists (like Alex) have higher requirements (+10 points for profile photo)

---

## Database Constraints Found

### 1. Account Type Constraint
**Current Values:** `individual_mechanic`, `workshop_mechanic`
**Future Values:** `independent`, `workshop` (after migration `99990009_phase2_fix_type_mismatches.sql`)

```sql
-- Current constraint
CHECK (account_type IN ('individual_mechanic', 'workshop_mechanic'))

-- Future constraint (not yet applied)
CHECK (account_type IN ('independent', 'workshop'))
```

### 2. Shop Affiliation Constraint
**Valid Values:** `independent`, `dealership`, `franchise`, `mobile`

```sql
CHECK (shop_affiliation IN ('independent', 'dealership', 'franchise', 'mobile'))
```

**Note:** `workshop` is NOT a valid value despite being workshop-affiliated

---

## Key Features Configured

### Physical Work Capability ✅
This is critical for the B2B2C model:

```javascript
{
  can_perform_physical_work: true,
  prefers_physical: true,
  participation_mode: 'both', // Virtual AND physical
  shop_affiliation: 'dealership',
  workshop_id: '<uuid>', // Affiliated with workshop
  shop_name: 'Elite Auto Care Workshop'
}
```

**What this enables:**
- ✅ Accept virtual diagnostic sessions
- ✅ Accept physical repair work at workshop
- ✅ Travel to customer locations (if mobile enabled)
- ✅ Work on-site at workshop facility

### Brand Specialist Configuration ✅
```javascript
{
  is_brand_specialist: true,
  brand_specializations: ['Honda', 'Toyota', 'Mazda', 'Nissan'],
  specialist_tier: 'brand',
  other_certifications: {
    ASE: ['A1', 'A4', 'A6', 'A8'],
    manufacturer: ['Honda Master', 'Toyota Level 2']
  }
}
```

---

## Troubleshooting

### If Login Fails

1. **Verify auth user exists:**
```bash
node scripts/verify-supabase-auth-integration.js
```

2. **Check linkages manually:**
```sql
-- Check auth user
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE email = 'workshop.mechanic@test.com';

-- Check profile
SELECT id, role, account_type
FROM profiles
WHERE email = 'workshop.mechanic@test.com';

-- Check mechanic linkage
SELECT id, user_id, email, can_accept_sessions
FROM mechanics
WHERE email = 'workshop.mechanic@test.com';
```

3. **Recreate if needed:**
```bash
node scripts/create-dummy-mechanic-supabase-auth.js
```

### If Profile Completion Shows Incorrect Value

**Possible causes:**
1. Frontend cache (refresh page)
2. Requirements table out of sync
3. Schema mismatches (profile_photo column missing)

**Solutions:**
```bash
# Check calculated vs stored values
node scripts/final-profile-status.js

# Force recalculation
node scripts/check-profile-completion.js
```

### If Session Acceptance Disabled

**Check these fields:**
```javascript
can_accept_sessions === true  // Must be true
is_available === true          // Must be true
application_status === 'approved'  // Must be approved
profile_completion_score >= 80     // Must be 80+
```

---

## Cleanup for Production

Before deploying to production:

```sql
-- Delete auth user (cascades to profile)
DELETE FROM auth.users WHERE email = 'workshop.mechanic@test.com';

-- Delete mechanic record
DELETE FROM mechanics WHERE email = 'workshop.mechanic@test.com';

-- Delete workshop
DELETE FROM organizations WHERE email = 'elite.workshop@test.com';
```

---

## Related Documentation

- [Supabase Auth Migration](../authentication/supabase-auth-migration.md)
- [Profile Completion System](../features/profile-completion-system.md)
- [Schema Mismatches](../troubleshooting/schema-mismatches.md)
- [Test Scripts Reference](../development/test-scripts-reference.md)
- [Workshop Escalation System](../features/workshop-escalation-system.md)

---

## Future Enhancements

### 1. Add Profile Photo Support
```sql
ALTER TABLE mechanics ADD COLUMN profile_photo_url TEXT;
```

### 2. Apply Type Standardization Migration
```bash
# Run migration to standardize enum values
# File: supabase/migrations/99990009_phase2_fix_type_mismatches.sql
```

### 3. Add Availability Schedule
Currently uses simple `is_available` boolean. Consider adding:
- Availability blocks (time slots)
- Recurring schedules
- Calendar integration

### 4. Enhanced Workshop Features
- Multi-workshop affiliation
- Workshop switching
- Commission tier system
- Performance-based bonuses

---

**Last Updated:** November 7, 2025
**Verified Working:** ✅ Yes
**Ready for Testing:** ✅ Yes
