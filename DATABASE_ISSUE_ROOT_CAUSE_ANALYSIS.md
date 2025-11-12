# DATABASE SCHEMA ROOT CAUSE ANALYSIS
**Date:** November 12, 2025
**Issue:** Initial audit incorrectly reported 0 mechanics and 0 workshops

---

## ROOT CAUSE

### The Problem
The initial audit script was querying **WRONG TABLE NAMES**:
- ❌ Queried: `mechanic_profiles` table
- ✅ Actual table: `mechanics` table
- ❌ Assumed: Mechanics linked via `profiles.role = 'mechanic'` AND `mechanic_profiles` join
- ✅ Reality: Mechanics are in separate `mechanics` table with their own structure

### Why This Happened
The database has **TWO DIFFERENT USER MODELS**:

#### Model 1: Auth-Based Users (profiles table)
- Used for: Customers, Workshop Admins, System Admins
- Role stored in: `profiles.role`
- Values: 'customer', 'workshop', 'workshop_admin', 'admin'

#### Model 2: Application Users (separate tables)
- Used for: Mechanics
- Stored in: `mechanics` table (completely separate from profiles)
- Has own authentication and profile data
- Links to workshops via: `mechanics.workshop_id` → `organizations.id`

---

## ACTUAL DATABASE STRUCTURE

### Correct Tables
1. **`profiles`** - Auth users (customers, workshop admins, admins)
2. **`mechanics`** - Mechanics (separate from profiles!)
3. **`organizations`** - Workshops and other business entities
4. **`session_requests`** - Session bookings
5. **`workshop_appointments`** - Workshop-specific appointments
6. **`rfqs`** - NOT YET CREATED (table doesn't exist)
7. **`quotes`** - NOT YET CREATED (table doesn't exist)

### Key Relationships
```
mechanics
  ├─ workshop_id → organizations.id (nullable for independent mechanics)
  ├─ account_type: 'individual_mechanic' | 'workshop_mechanic'
  └─ user_id: links to profiles (if auth is shared)

organizations
  ├─ organization_type: 'workshop' | 'corporate' | etc.
  └─ created_by → profiles.id

session_requests
  ├─ customer_id → profiles.id
  └─ mechanic_id → mechanics.id

workshop_appointments
  ├─ workshop_id → organizations.id
  ├─ customer_id → profiles.id
  └─ mechanic_id → mechanics.id
```

---

## CORRECTED AUDIT RESULTS

### ✅ ACTUAL DATA IN DATABASE

| Category | Count | Status |
|----------|-------|--------|
| **Total Users (profiles)** | 21 | ✅ |
| **Customers** | 6 | ✅ Exceeds target (5) |
| **Mechanics** | 7 | ⚠️ Need 15 total |
| **Workshop Admins** | 6 | ✅ |
| **Workshops** | 11 | ✅ Exceeds target (5) |
| **System Admins** | 2 | ✅ |
| **Session Requests** | 0 | ❌ (RLS issue or truly empty) |
| **Workshop Appointments** | 0 | ⚠️ |

### Mechanics Breakdown (account_type)
- **individual_mechanic**: 5 mechanics
- **workshop_mechanic**: 2 mechanics
- **Total**: 7 mechanics

### Mechanics Breakdown (workshop association)
- **Workshop-affiliated** (workshop_id NOT NULL): 3 mechanics
- **Independent** (workshop_id IS NULL): 4 mechanics
- **Total**: 7 mechanics

### Workshops Breakdown
- All 11 organizations are type 'workshop' ✅
- 8 are verified, 3 are pending/unverified
- 3 workshops are missing address and postal_code data

---

## DATA QUALITY ISSUES

### Customers (6 total)
**ALL 6 customers are missing critical location data:**

| Customer | Missing Fields |
|----------|---------------|
| ktest@askautodoctor.com | phone, city, province, postal_code, lat/lng |
| faizrhashmi@gmail.com | phone, city, province, postal_code, lat/lng |
| cust3@test.com | city, province, postal_code, lat/lng |
| cust2@test.com | province, postal_code, lat/lng |
| cust1@test.com | province, postal_code, lat/lng |
| Deleted User | (skip - deleted) |

**Impact:** Postal code matching will not work for any customer!

### Mechanics (7 total)
**3 mechanics missing critical data:**

| Mechanic | Email | Missing Fields |
|----------|-------|---------------|
| 99c254c1 | mechanic@test.com | phone, city, province, postal_code, experience |
| 0d887221 | mech1@test.com | city, province, postal_code, experience |
| 2750cdea | mech@test.com | city, province, postal_code, experience |

**4 mechanics are complete:** ✅
- independent.test@theautodoctor.com (Independent, Toronto ON, 12 yrs exp)
- employee.test@theautodoctor.com (Workshop, Toronto ON, 5 yrs exp)
- virtual.test@theautodoctor.com (Virtual, Toronto ON, 8 yrs exp)
- workshop.mechanic@test.com (Workshop, Toronto ON, 8 yrs exp, Red Seal ✅)

### Organizations/Workshops (11 total)
**3 workshops missing data:**

| Workshop | Missing Fields |
|----------|---------------|
| Test Workshop 3 | address, postal_code |
| Test Workshop 2 | address, postal_code |
| Test Workshop 1 | address, postal_code |

**8 workshops are complete** ✅

---

## SESSION REQUESTS MYSTERY

### Issue
The schema discovery script found **43 session_requests**, but the audit script found **0**.

### Possible Causes
1. **RLS Policy Issue**: Service role might be blocked by Row Level Security
2. **Different Database**: Discovery vs Audit connected to different databases
3. **Join Failure**: Foreign key joins failed silently (customer/mechanic IDs invalid)
4. **Soft Delete**: Records might be soft-deleted or filtered out

### Action Required
Investigate session_requests table directly to understand discrepancy.

---

## RFQ/QUOTES SYSTEM STATUS

### ❌ CRITICAL ISSUE
The RFQ and Quotes tables **DO NOT EXIST** or are not accessible.

### Recent Migrations Show RFQ System
Looking at migration files, I can see:
- `20251112000001_complete_rfq_marketplace_setup.sql`
- `20251112000002_dynamic_referral_fee_system.sql`
- `20251112000003_customer_quote_offers_view.sql`

### Problem
These migrations exist but tables are not accessible. This means:
1. Migrations not yet applied to database, OR
2. Tables exist but have permission issues, OR
3. Different database being queried

### Action Required
Run pending migrations to create RFQ/Quotes tables.

---

## RECOMMENDATIONS

### IMMEDIATE ACTIONS (Priority 1)

1. **Run Pending Migrations**
   ```bash
   npx supabase db push
   ```
   This should create the `rfqs` and `quotes` tables.

2. **Fix All 6 Customers - Add Location Data**
   - Add province, postal_code, latitude, longitude
   - This is CRITICAL for postal code matching

3. **Fix 3 Incomplete Mechanics**
   - Add city, province, postal_code
   - Add years_of_experience

4. **Fix 3 Incomplete Workshops**
   - Add address and postal_code

5. **Investigate Session Requests Discrepancy**
   - Check RLS policies on session_requests table
   - Verify we're querying the correct database

### NEXT ACTIONS (Priority 2)

6. **Create 8 More Mechanics** (to reach target of 15)
   - Need more variety in:
     - Geographic locations (QC, AB, BC, not just ON)
     - Account types (more workshop mechanics)
     - Certifications (Red Seal from different provinces, Quebec certs, Interprovincial)

7. **Add Certifications to Existing Mechanics**
   - Only 1 mechanic has Red Seal
   - Need examples of Quebec certificates
   - Need examples of Interprovincial certificates
   - Need brand specialist certifications

8. **Create Test RFQs and Quotes**
   - Once tables exist, populate with test data

9. **Create More Session Requests/Appointments**
   - If 43 exist, verify they're properly associated
   - If 0 exist, create test appointments

---

## TESTING READINESS SCORECARD

| Requirement | Current | Target | Status | Priority |
|-------------|---------|--------|--------|----------|
| Customers with complete data | 0 | 5 | ❌ | P1 |
| Total mechanics | 7 | 15 | ⚠️ | P2 |
| Complete mechanics | 4 | 15 | ⚠️ | P1 |
| Workshops | 11 | 5 | ✅ | - |
| Complete workshops | 8 | 5 | ✅ | - |
| RFQs table exists | No | Yes | ❌ | P1 |
| Quotes table exists | No | Yes | ❌ | P1 |
| Session requests | ? | 15 | ❌ | P2 |
| Certifications diversity | Low | High | ❌ | P2 |
| Geographic diversity | Low | High | ⚠️ | P2 |

---

## DATABASE SCHEMA LESSONS LEARNED

1. **Multiple User Models**: The system uses different tables for different user types (profiles vs mechanics)
2. **Table Naming**: Don't assume `mechanic_profiles` exists - check actual schema
3. **Auth Model**: Mechanics might have separate authentication from profiles
4. **Join Complexity**: User relationships are more complex than expected
5. **Migration Status**: Always verify migrations are applied before querying tables

---

## NEXT STEPS

1. ✅ **Review this root cause analysis**
2. **Run database migrations** to create RFQ/Quotes tables
3. **Execute data fixes** for existing users (customers, mechanics, workshops)
4. **Create additional test data** (8 more mechanics, certifications, etc.)
5. **Investigate session_requests** discrepancy
6. **Run corrected audit again** to verify all fixes

