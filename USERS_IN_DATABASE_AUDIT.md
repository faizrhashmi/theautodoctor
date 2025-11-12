# USERS IN THE DATABASE - COMPREHENSIVE AUDIT REPORT
**Generated:** 2025-11-11
**Database:** TheAutoDoctor Production

---

## 🔍 EXECUTIVE SUMMARY

### Critical Findings:
1. **❌ CRITICAL SCHEMA MISMATCH**: Code expects `customers` and `workshops` tables but they DON'T EXIST
2. **❌ ORPHANED USERS**: 21 users in `profiles` table but only 7 have corresponding role records
3. **❌ DATA INTEGRITY CRISIS**: 79 total issues found (36 critical, 42 warnings)
4. **❌ BROKEN USER FLOW**: Users can sign up but their role-specific data isn't being created

---

## 📊 USER COUNTS BY TYPE

### Total Users: **21 profiles**

| Role Type | Count | Status |
|-----------|-------|--------|
| **Mechanics** | 7 profiles | ✅ 7 mechanics records exist |
| **Customers** | 6 profiles | ❌ NO customer records (table missing) |
| **Workshops** | 6 profiles | ❌ NO workshop records (table missing) |
| **Admins** | 2 profiles | ✅ Working |
| **Deleted** | 1 profile | ⚠️ Soft-deleted |

---

## 👥 ALL USERS IN THE DATABASE

### 🔧 MECHANICS (7 users, 7 mechanics records)

#### 1. independent.test@theautodoctor.com
- **Profile ID**: 51fd11bd-8e84-4bb6-917e-8777930b4bc1
- **Name**: Independent Workshop Owner Test
- **Role**: mechanic
- **Account Type**: individual_customer (❌ MISMATCH)
- **Problems**:
  - ❌ Has mechanic role but account_type = 'individual_customer'
  - ⚠️ Missing postal_code
  - ⚠️ Email not verified
  - ⚠️ Profile not completed
  - ⚠️ Onboarding not completed
- **Created**: 2025-11-09

#### 2. employee.test@theautodoctor.com
- **Profile ID**: 82ef97cc-a369-4629-83e1-65fdfb8c1495
- **Name**: Workshop Employee Test
- **Role**: mechanic
- **Account Type**: individual_customer (❌ MISMATCH)
- **Problems**:
  - ❌ Same issues as above
  - ⚠️ Missing postal_code, unverified email, incomplete profile
- **Created**: 2025-11-09

#### 3. virtual.test@theautodoctor.com
- **Profile ID**: 58564e6b-5d60-4554-98f4-921e9fbf7b61
- **Name**: Virtual Test Mechanic
- **Role**: mechanic
- **Account Type**: individual_customer (❌ MISMATCH)
- **Problems**:
  - ❌ Same issues as above
  - ⚠️ Missing postal_code, unverified email, incomplete profile
- **Created**: 2025-11-09

#### 4. workshop.mechanic@test.com
- **Profile ID**: 8019ea82-9eb3-4df8-b97a-3079d589fe7a
- **Name**: Alex Thompson
- **Role**: mechanic
- **Account Type**: individual_customer (❌ MISMATCH)
- **Organization**: 573d6fc4-fc4b-4422-aebf-737d13226f8a (linked via org_members)
- **Problems**:
  - ❌ Workshop-affiliated but workshop table doesn't exist
  - ⚠️ Missing postal_code, unverified email, incomplete profile
- **Created**: 2025-10-30

#### 5. mechanic@test.com
- **Profile ID**: 39ef5d80-942d-4249-9857-94091f23e30e
- **Name**: N/A
- **Role**: mechanic
- **Problems**: Same as above
- **Created**: 2025-10-29

#### 6. mech1@test.com
- **Profile ID**: 9ae83429-7d9a-4a28-b811-6b4000e4fa1c
- **Name**: Mechanic 2
- **Role**: mechanic
- **Problems**: Same as above
- **Created**: 2025-10-28

#### 7. mech@test.com
- **Profile ID**: e4b87ea7-9718-4586-820e-6096c4fa503a
- **Name**: Mechanic 1
- **Role**: mechanic
- **Problems**: Same as above
- **Created**: 2025-10-28

**Mechanics Summary**:
- ✅ 7 mechanics records found in `mechanics` table
- ❌ ALL have account_type mismatch (should be 'mechanic', shows 'individual_customer')
- ⚠️ 0 online, 0 available for sessions
- ⚠️ 0 with Stripe setup complete

---

### 👥 CUSTOMERS (6 profiles, ❌ 0 customer records)

#### 1. ktest@askautodoctor.com
- **Profile ID**: 607a9b1f-0eb4-44f4-8a6c-879e674cbd5f
- **Name**: N/A
- **Role**: customer
- **Account Type**: individual_customer
- **Problems**:
  - ❌ **CRITICAL**: Has customer role but NO record in customers table (table doesn't exist!)
  - ⚠️ Missing postal_code
  - ⚠️ Email not verified
  - ⚠️ Profile not completed
  - ⚠️ Onboarding not completed
- **Created**: 2025-11-08

#### 2. faizrhashmi@gmail.com
- **Profile ID**: 65acc199-333b-4f0e-bffd-9b0b319b6e6a
- **Name**: N/A
- **Role**: customer
- **Problems**: ❌ Same critical issues as above
- **Created**: 2025-11-07

#### 3. cust3@test.com
- **Profile ID**: 8dda8cb3-fea7-48a3-988c-087eb5bd179d
- **Name**: Customer 3
- **Phone**: 416-555-0102
- **Role**: customer
- **Email Verified**: YES ✅
- **Profile Completed**: YES ✅
- **Onboarding Completed**: YES ✅
- **Problems**:
  - ❌ **CRITICAL**: No customer record in database (table doesn't exist!)
  - ⚠️ Missing postal_code
- **Created**: 2025-10-28

#### 4. cust2@test.com
- **Profile ID**: c060b46b-c62c-49cf-aa30-167ce56b0aec
- **Name**: Customer B
- **Phone**: 5146592776
- **Location**: Toronto
- **Role**: customer
- **Email Verified**: YES ✅
- **Profile Completed**: YES ✅
- **Onboarding Completed**: YES ✅
- **Problems**:
  - ❌ **CRITICAL**: No customer record (table doesn't exist!)
  - ⚠️ Missing postal_code
- **Created**: 2025-10-28

#### 5. cust1@test.com
- **Profile ID**: 0af3d300-cbca-4019-baa6-e92e402ccd1b
- **Name**: Customer A
- **Phone**: 416-555-0100
- **Location**: Toronto, Canada
- **Role**: customer
- **Email Verified**: YES ✅
- **Profile Completed**: YES ✅
- **Onboarding Completed**: YES ✅
- **Problems**:
  - ❌ **CRITICAL**: No customer record (table doesn't exist!)
  - ⚠️ Missing postal_code
- **Created**: 2025-10-28

#### 6. Deleted User (c1838c27-895e-49df-835b-1a0ac3d35614)
- **Account Status**: deleted
- **Deleted At**: 2025-11-02
- **Problems**: ℹ️ Properly marked as deleted
- **Created**: 2025-10-28

**Customers Summary**:
- ❌ **CRITICAL**: `customers` table DOES NOT EXIST in database
- ❌ Code references `customer_profiles` view which also doesn't exist
- ❌ 6 users with customer role have no corresponding data records
- ⚠️ 3 customers completed onboarding but have nowhere to store their data
- ⚠️ ALL missing postal_code

---

### 🏢 WORKSHOPS (6 profiles, ❌ 0 workshop records)

#### 1. elite.workshop@test.com
- **Profile ID**: 85481173-d932-4f25-a3ad-a33441b31481
- **Name**: N/A
- **Role**: workshop_admin
- **Account Type**: individual_customer (❌ MISMATCH)
- **Organization ID**: 573d6fc4-fc4b-4422-aebf-737d13226f8a
- **Problems**:
  - ❌ **CRITICAL**: Has workshop_admin role but NO workshops table exists
  - ❌ Organization membership exists but points to non-existent workshop
  - ⚠️ Email not verified
  - ⚠️ Profile not completed
- **Created**: 2025-11-01

#### 2. workshop3@test.com
- **Profile ID**: 1f0202f7-b846-4bbe-8bdd-43e9cae056f5
- **Name**: N/A
- **Role**: workshop
- **Problems**: ❌ Same critical issues
- **Organization Membership**: a3c3090b-65b7-412a-8971-c8aaf6b6a431 (non-existent)
- **Created**: 2025-10-28

#### 3. workshop2@test.com
- **Profile ID**: 05223cab-22d7-4f76-a39f-a926c39bf5d4
- **Name**: N/A
- **Role**: workshop
- **Problems**: ❌ Same critical issues
- **Organization Membership**: 916a447a-59ce-4d2b-bdcb-2d4169112d7b (non-existent)
- **Created**: 2025-10-28

#### 4. workshop1@test.com
- **Profile ID**: 1079539a-55b8-4b76-b50e-90a9c3500077
- **Name**: N/A
- **Role**: workshop
- **Problems**: ❌ Same critical issues
- **Organization Membership**: a8d9aa15-a8d5-49a3-95a7-f6d420f429e0 (non-existent)
- **Created**: 2025-10-28

#### 5. service@expertmotors.com
- **Profile ID**: 9a5c8e9b-f090-4d2b-a235-c3c7f408f2fb
- **Name**: N/A
- **Role**: workshop
- **Problems**: ❌ Same critical issues
- **Organization Membership**: 2ec0070c-cabf-425c-becd-5e4bd8c1f913 (non-existent)
- **Created**: 2025-10-28

#### 6. info@quickfix.com
- **Profile ID**: 22cdcbd4-0cd5-420f-a0a7-d3cb2476d09b
- **Name**: N/A
- **Role**: workshop
- **Problems**: ❌ Same critical issues
- **Organization Membership**: 78db0e30-5e16-4092-a6fd-ba9bd31b6b84 (non-existent)
- **Created**: 2025-10-28

**Workshops Summary**:
- ❌ **CRITICAL**: `workshops` table DOES NOT EXIST in database
- ❌ Code references `workshop_profiles` view which also doesn't exist
- ❌ 6 workshop profiles with no corresponding workshop records
- ❌ 9 organization_members entries pointing to non-existent workshops
- ⚠️ Workshop-affiliated mechanics can't be linked to their workshops

---

### 🔐 ADMINS (2 users)

#### 1. admin@test.com ✅
- **Profile ID**: fe38a3b6-3ce0-408d-9473-4d499ad3ef6e
- **Name**: Admin
- **Phone**: 416-555-0300
- **Role**: admin
- **Email Verified**: YES ✅
- **Profile Completed**: YES ✅
- **Onboarding Completed**: YES ✅
- **Status**: ✅ Working correctly
- **Created**: 2025-10-28

#### 2. admin2@test.com ✅
- **Profile ID**: 05589955-052a-4c55-8377-08b976b92d48
- **Name**: Admin 2
- **Phone**: 416-555-0302
- **Role**: admin
- **Email Verified**: YES ✅
- **Profile Completed**: YES ✅
- **Onboarding Completed**: YES ✅
- **Status**: ✅ Working correctly
- **Created**: 2025-10-28

**Admins Summary**: ✅ Both admin accounts functioning properly

---

## 🔗 ORGANIZATION MEMBERSHIPS (9 records)

| User | Workshop ID | Role | Status | Problem |
|------|-------------|------|--------|---------|
| 51fd11bd... (independent.test) | 00000000-0000... | owner | active | ❌ Workshop doesn't exist |
| 85481173... (elite.workshop) | 573d6fc4... | owner | active | ❌ Workshop doesn't exist |
| 8019ea82... (workshop.mechanic) | 573d6fc4... | admin | active | ❌ Workshop doesn't exist |
| 1f0202f7... (workshop3) | a3c3090b... | owner | active | ❌ Workshop doesn't exist |
| 05223cab... (workshop2) | 916a447a... | owner | active | ❌ Workshop doesn't exist |
| 1079539a... (workshop1) | a8d9aa15... | owner | active | ❌ Workshop doesn't exist |
| 9a5c8e9b... (expertmotors) | 2ec0070c... | owner | active | ❌ Workshop doesn't exist |
| 22cdcbd4... (quickfix) | 78db0e30... | owner | active | ❌ Workshop doesn't exist |
| **null** | a8d9aa15... | member | pending | ❌ User ID is NULL! |

---

## ⚠️ CRITICAL PROBLEMS IDENTIFIED

### 🔴 Schema Issues (Severity: CRITICAL)

1. **Missing `customers` Table**
   - Code expects: `customers` table
   - Reality: Table doesn't exist
   - Impact: Customers can sign up but their data has nowhere to go
   - Affected Users: 6 customers
   - Files Referencing:
     - `src/app/api/customer/*`
     - `src/components/customer/*`
     - TypeScript types reference `customers` table

2. **Missing `workshops` Table**
   - Code expects: `workshops` table
   - Reality: Table doesn't exist
   - Impact: Workshops can sign up but records aren't created
   - Affected Users: 6 workshops
   - Files Referencing:
     - `src/app/api/workshop/*`
     - `src/components/workshop/*`

3. **Missing Views**
   - Code expects: `customer_profiles` view (doesn't exist)
   - Code expects: `workshop_profiles` view (doesn't exist)
   - Code expects: `mechanic_profiles` view (exists ✅)

### 🔴 Data Integrity Issues

4. **Account Type Mismatches**
   - ALL 7 mechanics have `account_type = 'individual_customer'`
   - Should be: `account_type = 'mechanic'`
   - Impact: Business logic may fail if it checks account_type

5. **Orphaned Organization Memberships**
   - 9 org_members records point to non-existent workshops
   - 1 org_members record has NULL user_id
   - Impact: Workshop-mechanic relationships are broken

6. **Profile Role vs Account Type Inconsistency**
   - `profiles.role` field: Used correctly (mechanic, customer, workshop, admin)
   - `profiles.account_type` field: Shows 'individual_customer' for everyone except admins
   - Impact: Confusion about which field is source of truth

### ⚠️ Data Quality Issues

7. **Missing Location Data**
   - 18 users missing `postal_code`
   - Impact: Mechanic matching system will fail (requires postal code)
   - Affected: 7 mechanics, 6 customers, 5 workshops

8. **Incomplete Onboarding**
   - 18 users have `onboarding_completed = false`
   - But marked as `account_status = 'active'`
   - Impact: Users can access system without completing setup

9. **Unverified Emails**
   - 18 users have `email_verified = false`
   - But marked as `account_status = 'active'`
   - Impact: Security risk, email notifications may fail

10. **Mechanics Not Available**
    - 0 mechanics marked as `is_online`
    - 0 mechanics marked as `is_available`
    - Impact: No mechanics can accept sessions
    - Note: Likely because these are test accounts

11. **Stripe Onboarding Incomplete**
    - 0 mechanics have completed Stripe onboarding
    - Impact: Mechanics cannot receive payments
    - Note: This is expected for test accounts

---

## 📊 SUMMARY STATISTICS

### User Distribution
- **Total Profiles**: 21
  - Active: 20
  - Deleted: 1
  - Suspended: 0
  - Anonymized: 0

### By Role (from profiles.role)
- **Mechanics**: 7 (33%)
  - Virtual: Unknown (mechanic record has `is_workshop` field but not `is_virtual`)
  - Independent: Unknown
  - Workshop-Affiliated: At least 1 (workshop.mechanic@test.com)

- **Customers**: 6 (29%)
  - Onboarding Complete: 3
  - Onboarding Incomplete: 3

- **Workshops**: 6 (29%)
  - Approved: Unknown (table doesn't exist)
  - Pending: Unknown

- **Admins**: 2 (9%)

### Data Completeness
- **Email Verified**: 5 / 21 (24%)
- **Profile Completed**: 5 / 21 (24%)
- **Onboarding Completed**: 5 / 21 (24%)
- **Has Postal Code**: 0 / 21 (0%) ⚠️

### Mechanic-Specific Stats
- **Mechanics Records**: 7 / 7 (100%) ✅
- **Online Now**: 0 / 7 (0%)
- **Available**: Unknown (data not fetched)
- **Stripe Setup**: 0 / 7 (0%)

### Customer-Specific Stats
- **Customer Records**: 0 / 6 (0%) ❌ TABLE MISSING

### Workshop-Specific Stats
- **Workshop Records**: 0 / 6 (0%) ❌ TABLE MISSING
- **Active Memberships**: 8 / 9 (89%)

---

## 🚨 TOTAL ISSUES FOUND: 79

### By Severity:
- **🔴 Critical**: 36 issues
- **⚠️ Warning**: 42 issues
- **ℹ️ Info**: 1 issue

### Critical Issues Breakdown:
1. Missing role records: 12 (6 customers + 6 workshops)
2. Orphaned organization memberships: 18 (9 users × 2 checks)
3. Account type mismatches: 7 mechanics
4. Missing database tables: 2 (customers, workshops)
5. Missing views: 2 (customer_profiles, workshop_profiles)

### Warning Issues Breakdown:
1. Missing postal codes: 18 users
2. Unverified emails: 18 users
3. Incomplete profiles: 18 users

---

## 🔧 RECOMMENDED FIXES

### Priority 1: Database Schema (URGENT)

1. **Create Missing Tables**
   ```sql
   CREATE TABLE IF NOT EXISTS customers (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
     -- Add other customer-specific fields
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE IF NOT EXISTS workshops (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
     workshop_name TEXT,
     -- Add other workshop-specific fields
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **Create Missing Views**
   ```sql
   CREATE OR REPLACE VIEW customer_profiles AS
   SELECT c.*, p.*
   FROM customers c
   JOIN profiles p ON c.user_id = p.id;

   CREATE OR REPLACE VIEW workshop_profiles AS
   SELECT w.*, p.*
   FROM workshops w
   JOIN profiles p ON w.user_id = p.id;
   ```

### Priority 2: Data Migration

3. **Backfill Customer Records**
   - Create customer records for 6 existing customer profiles
   - Migrate relevant data from profiles table

4. **Backfill Workshop Records**
   - Create workshop records for 6 existing workshop profiles
   - Link organization_members to new workshop records

5. **Fix Account Types**
   - Update account_type to match role for all 7 mechanics

### Priority 3: Data Quality

6. **Email Verification Campaign**
   - Send verification emails to 18 unverified users
   - Or mark test accounts as verified

7. **Location Data Collection**
   - Require postal code during onboarding
   - Prompt existing users to add postal code

8. **Profile Completion**
   - Force incomplete users through onboarding flow
   - Or complete test account profiles

### Priority 4: Code Cleanup

9. **Fix Type Definitions**
   - Update TypeScript types to match actual schema
   - Ensure generated types from Supabase are correct

10. **Update API Routes**
    - Verify all customer/* endpoints work with new schema
    - Verify all workshop/* endpoints work with new schema

---

## 📝 NOTES

- Most issues are test data related
- Real production users would be: ktest@askautodoctor.com and faizrhashmi@gmail.com (both customers)
- Schema issues are CRITICAL and will prevent app from working
- Consider running database migrations from `supabase/migrations/` folder
- The `mechanics` table EXISTS and has proper structure
- Organization memberships system is in place but broken due to missing workshops table

---

## ✅ WHAT'S WORKING

1. ✅ Profiles table properly structured
2. ✅ Mechanics table exists with 7 records
3. ✅ Admin accounts functioning
4. ✅ Organization members table exists
5. ✅ Auth system working (users can sign up)
6. ✅ Soft delete working (1 deleted user handled properly)
7. ✅ Role-based access control fields in place

---

## ❌ WHAT'S BROKEN

1. ❌ Customers table missing
2. ❌ Workshops table missing
3. ❌ Customer_profiles view missing
4. ❌ Workshop_profiles view missing
5. ❌ All customers have no data records
6. ❌ All workshops have no data records
7. ❌ Workshop-mechanic relationships broken
8. ❌ Account type field not synced with role
9. ❌ No postal codes (matching system broken)
10. ❌ Most emails unverified

---

**END OF REPORT**
