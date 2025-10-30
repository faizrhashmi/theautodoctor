# Dummy Workshop Mechanic Setup

## Overview

A fully approved, production-ready dummy mechanic has been created for end-to-end testing of The Auto Doctor platform. This mechanic is affiliated with a workshop and can perform both virtual and physical automotive services.

**✅ SUPABASE AUTH COMPATIBLE** - This mechanic uses Supabase Auth (not legacy authentication) and works with your new unified auth system.

## What Was Created

### 1. Workshop Organization
**Elite Auto Care Workshop**
- **Email:** elite.workshop@test.com
- **Location:** 456 Professional Blvd, Unit 12, Toronto, ON M4B 1B3
- **Status:** Active & Verified
- **Type:** Workshop (for B2B2C model)
- **Capacity:** 15 mechanics
- **Commission Rate:** 12%
- **Service Radius:** 25km
- **Coverage Areas:** M4B, M4C, M4E, M4K, M4L, M4M, M5A, M5B postal codes

### 2. Workshop-Affiliated Mechanic
**Alex Thompson**
- **Email:** workshop.mechanic@test.com
- **Password:** 1234
- **Phone:** +14165559876
- **Mechanic ID:** c62837da-8ff1-4218-afbe-3da2e940dfd7
- **Auth User ID:** 8019ea82-9eb3-4df8-b97a-3079d589fe7a ✅
- **Profile Role:** mechanic ✅

## Mechanic Profile Details

### Account Status ✅
- **Account Type:** Workshop Mechanic
- **Application Status:** APPROVED
- **Background Check:** APPROVED
- **Profile Completion:** 100%
- **Can Accept Sessions:** YES
- **Currently Available:** YES

### Workshop Affiliation ✅
- **Affiliated With:** Elite Auto Care Workshop
- **Invitation Status:** Accepted (30 days ago)
- **Shop Name:** Elite Auto Care Workshop
- **Shop Type:** Dealership
- **Can Perform Physical Work:** YES (this is key for your B2B2C model)

### Credentials & Experience ✅
- **Years of Experience:** 8 years
- **Red Seal Certified:** YES
  - Red Seal Number: RS-ON-87654321
  - Province: Ontario
  - Expiry: April 23, 2027
- **ASE Certifications:** A1, A4, A6, A8
- **Manufacturer Certifications:**
  - Honda Master Technician
  - Toyota Level 2

### Specializations ✅
**Primary Areas:**
- Brakes
- Suspension
- Diagnostics
- Electrical Systems
- Engine Repair
- Transmission Service

**Brand Specialist:**
- Honda
- Toyota
- Mazda
- Nissan

**Service Keywords:**
- Brake repair & inspection
- Suspension repair & shock replacement
- Diagnostic scanning
- Check engine light diagnosis
- Electrical troubleshooting
- Alternator & battery service
- Engine & transmission service

### Performance Metrics ⭐
- **Rating:** 4.9/5.0
- **Completed Sessions:** 47
- **Service Mode:** Both virtual and physical

### Payment & Compliance ✅
- **Stripe Account:** Fully configured
- **Payouts Enabled:** YES
- **Banking Info:** Complete
- **Liability Insurance:** Active
  - Policy: INS-D40EVR766X
  - Expiry: September 25, 2026
- **Criminal Record Check:** Completed (August 31, 2025)

## How to Test

### 1. Mechanic Login
```
URL: http://localhost:3000/mechanic/login
Email: workshop.mechanic@test.com
Password: 1234
```

### 2. Testing Workflow

#### A. Mechanic Dashboard Testing
1. Login with the credentials above
2. Navigate to `/mechanic/dashboard`
3. Verify:
   - Profile shows 100% completion
   - Workshop affiliation is displayed
   - Can accept sessions toggle is enabled
   - All credentials are visible

#### B. End-to-End Customer Flow
1. **As a Customer:**
   - Create a new session request
   - Select a service (e.g., brake inspection, diagnostics)
   - Specify if you want physical or virtual service
   - Submit the request

2. **As the Mechanic (Alex Thompson):**
   - Login to mechanic dashboard
   - See the pending session request
   - Accept the request
   - Complete the session workflow
   - Provide diagnosis/recommendations
   - Mark session as complete

3. **Verify:**
   - Payment processing works
   - Workshop commission is calculated (12%)
   - Session history is recorded
   - Customer receives invoice
   - Mechanic earnings are tracked

#### C. Workshop Integration Testing
1. Verify mechanic appears in workshop's mechanic roster
2. Test that sessions are routed to workshop mechanics
3. Verify commission split between mechanic and workshop
4. Check that physical service requests are properly handled

## Business Model Notes

### Your B2B2C Model
This setup supports your business model where:

1. **Workshops (B2B):**
   - Elite Auto Care Workshop is the business customer
   - They employ/affiliate mechanics
   - They earn commission on sessions (12%)
   - They can serve customers in their service radius

2. **Mechanics (B):**
   - Alex Thompson works for the workshop
   - Can perform both virtual and physical work
   - Affiliated with workshop but can also work independently
   - Shares earnings with workshop per commission structure

3. **End Customers (C):**
   - Can request services from workshop-affiliated mechanics
   - Can choose virtual or physical services
   - Benefit from workshop's reputation and oversight

### Physical Work Capability ✅
**Key Configuration:**
- `can_perform_physical_work: true`
- `prefers_physical: true`
- `participation_mode: both` (can do virtual AND physical)
- `shop_affiliation: dealership` (has physical location)
- `workshop_id` is set (affiliated with workshop)

This means Alex can:
- Accept virtual diagnostic sessions
- Accept physical repair work at the workshop
- Travel to customer locations (if mobile services enabled)
- Work on-site at the workshop facility

## Scripts for Management

### Create/Recreate Dummy Data (Supabase Auth)
```bash
node scripts/create-dummy-mechanic-supabase-auth.js
```
This creates:
- ✅ Supabase Auth user in `auth.users`
- ✅ Profile with `role='mechanic'`
- ✅ Mechanic record linked via `user_id`

### Verify Supabase Auth Integration
```bash
node scripts/verify-supabase-auth-integration.js
```
This verifies:
- ✅ Auth user exists
- ✅ Profile linked correctly
- ✅ Mechanic has `user_id`
- ✅ Login works
- ✅ RLS policies compatible

### Legacy Script (Old Auth - Don't Use)
```bash
node scripts/create-dummy-mechanic.js  # Uses password_hash - deprecated
```

### Other Utility Scripts
```bash
node scripts/verify-dummy-mechanic.js
node scripts/check-mechanics-schema.js
node scripts/check-existing-mechanics.js
```

## Database Records

### Auth Users Table (Supabase Auth)
- User ID: `8019ea82-9eb3-4df8-b97a-3079d589fe7a`
- Table: `auth.users`
- Email: `workshop.mechanic@test.com`
- Password: `1234`
- Email Confirmed: ✅ YES

### Profiles Table
- ID: `8019ea82-9eb3-4df8-b97a-3079d589fe7a` (same as auth user)
- Table: `public.profiles`
- Role: `mechanic`
- Account Type: `individual_customer`

### Mechanics Table
- Mechanic ID: `c62837da-8ff1-4218-afbe-3da2e940dfd7`
- User ID: `8019ea82-9eb3-4df8-b97a-3079d589fe7a` ✅ **LINKED TO AUTH**
- Table: `public.mechanics`
- Workshop Link: `workshop_id = 573d6fc4-fc4b-4422-aebf-737d13226f8a`

### Organizations Table
- ID: `573d6fc4-fc4b-4422-aebf-737d13226f8a`
- Table: `public.organizations`
- Type: `workshop`

### Linkage Flow
```
auth.users (8019ea82...)
    ↓ (id)
profiles (8019ea82...)
    ↓ (role=mechanic)
mechanics (user_id=8019ea82...)
    ↓ (workshop_id)
organizations (573d6fc4...)
```

## Important Database Constraints

Based on the database schema, here are the constraints to be aware of:

### Account Type
- **Valid Values:** `individual_mechanic`, `workshop_mechanic`
- Note: NOT `independent` or `workshop` (older migration not yet applied)

### Shop Affiliation
- **Valid Values:** `independent`, `dealership`, `franchise`, `mobile`
- Note: NOT `workshop`

## Troubleshooting

### If Login Fails

This mechanic uses **Supabase Auth**. If you see login issues:

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

### If Session Acceptance Fails
Check these fields:
- `can_accept_sessions` should be `true`
- `is_available` should be `true`
- `application_status` should be `'approved'`
- `profile_completion_score` should be >= 80

### If Workshop Affiliation Not Showing
Verify:
- `workshop_id` matches the organization ID
- `invited_by` matches the organization ID
- `invite_accepted_at` is set
- Organization status is `'active'`

## Authentication Architecture

### ✅ Current Setup (Supabase Auth)

Your platform now uses **unified Supabase Auth**:

1. **Auth Layer:** `auth.users` - Handles authentication
2. **Profile Layer:** `profiles` - Stores role (mechanic, customer, admin)
3. **Data Layer:** `mechanics` - Stores mechanic-specific data, linked via `user_id`

**Key Features:**
- ✅ No legacy `mechanic_sessions` table needed (dropped in migration `20251029000011`)
- ✅ Uses `requireMechanicAPI` middleware (checks `auth.uid()`)
- ✅ RLS policies based on `user_id`
- ✅ Password stored securely in Supabase Auth (not `password_hash` column)

### 🔄 Migration Status

**Completed:**
- ✅ `20251029000004_unify_auth_system.sql` - Added `user_id` to mechanics
- ✅ `20251029000011_drop_mechanic_sessions_table.sql` - Removed legacy table
- ✅ `20251029000012_drop_password_hash_column.sql` - Removed legacy column (if exists)

**Not Yet Applied:**
- ⏳ `99990009_phase2_fix_type_mismatches.sql` - Changes account_type values
  - This will change `individual_mechanic` → `independent` and `workshop_mechanic` → `workshop`

## Next Steps for Production

Before deploying to production, ensure:

1. **Remove Test Data:**
   ```sql
   -- Delete auth user (cascades to profile)
   DELETE FROM auth.users WHERE email = 'workshop.mechanic@test.com';

   -- Delete mechanic record
   DELETE FROM mechanics WHERE email = 'workshop.mechanic@test.com';

   -- Delete workshop
   DELETE FROM organizations WHERE email = 'elite.workshop@test.com';
   ```

2. **Optional: Apply Type Standardization:**
   - Run `99990009_phase2_fix_type_mismatches.sql` if you want standardized enum values
   - Only apply if you've updated all code to use new values

## Support

For issues or questions:
- Check the database constraints in migration files
- Review RLS policies on mechanics and organizations tables
- Ensure all required environment variables are set
- Verify Stripe configuration for payment processing

---

**Created:** October 29, 2025
**Purpose:** End-to-end testing of workshop-affiliated mechanic flow
**Status:** ✅ Ready for testing
