# COMPLETE SIGNUP FLOW ANALYSIS - ALL USER TYPES

**Generated:** 2025-11-10
**Scope:** Business Logic, Database Schema, APIs, Emails, Notifications, Authorizations, Approvals, Account Transitions, Forgot Password
**Analysis Depth:** Deep dive with source of truth validation

---

## EXECUTIVE SUMMARY

### Critical Findings

🔴 **P0 - CRITICAL ISSUES:**
1. **Duplicate Customer Signup Flows** - Two implementations exist (SignupGate.tsx vs customer/signup/page.tsx)
2. **Broken Password Reset** - Reset page doesn't exist, users get 404 after clicking email link
3. **Location Data Inconsistency** - Customer signup missing postal_code, affecting mechanic matching
4. **Source of Truth Conflicts** - Email duplicated across 3 tables, location fields duplicated with different names

🟡 **P1 - HIGH PRIORITY:**
5. **No Self-Service Password Reset** - Only customers can reset (but it's broken), mechanics/admins/workshops have no flow
6. **Incomplete Email System** - Mechanic approval emails are TODOs, workshop emails partially implemented
7. **No Subscription Upgrades/Downgrades** - Only create and cancel, no plan changes
8. **Missing Workshop Mechanic Invitations** - Account type exists but invitation flow incomplete

🟢 **P2 - MEDIUM PRIORITY:**
9. **Inconsistent Onboarding Tracking** - Different systems for each user type
10. **No Rate Limiting** - Signup and password reset endpoints vulnerable to spam

---

## 1. SIGNUP FLOWS - DETAILED ANALYSIS

### 1.1 CUSTOMER SIGNUP

#### Two Competing Implementations

**ACTIVE FLOW:** `/signup` → SignupGate.tsx
- **Location:** [src/app/signup/SignupGate.tsx](src/app/signup/SignupGate.tsx) (661 lines)
- **Entry Point:** [src/app/signup/page.tsx](src/app/signup/page.tsx)
- **API:** [src/app/api/customer/signup/route.ts](src/app/api/customer/signup/route.ts)

**INACTIVE FLOW:** `/customer/signup` → Multi-step wizard
- **Location:** [src/app/customer/signup/page.tsx](src/app/customer/signup/page.tsx) (985 lines)
- **Status:** More comprehensive (PIPEDA compliant), but NOT used
- **Features:** Address autocomplete, better validation, explicit consent tracking

#### Data Collected (Active Flow)

```typescript
{
  firstName: string,
  lastName: string,
  phone: string,
  vehicle: string,
  dateOfBirth: string,  // Must be 18+
  address: string,
  city: string,
  country: string,       // Default: "Canada"
  email: string,
  password: string,      // Min 8 chars, letters + numbers
  waiver_accepted: boolean  // REQUIRED
}
```

**MISSING FIELDS:**
- ❌ `postal_code` / `postal_zip_code` - Critical for mechanic matching
- ❌ `province` / `state_province` - Needed for location-based services

#### Database Operations

**Sequence:**
1. Create `auth.users` (Supabase Auth) with `role: 'customer'`
2. Trigger creates base `profiles` record
3. API upserts `profiles` with complete data:
   ```sql
   -- src/app/api/customer/signup/route.ts:78-122
   profiles {
     id: auth_user_id,
     role: 'customer',
     account_type: 'individual_customer',
     full_name, phone, vehicle_hint, date_of_birth,
     city, country, address_line1,
     waiver_accepted, waiver_accepted_at, waiver_ip_address
   }
   ```
4. Insert `waiver_acceptances` table
5. Call `grant_customer_consent` RPC for PIPEDA compliance

#### Issues Found

| Issue | Impact | Location |
|-------|--------|----------|
| Two signup implementations | Confusion, duplication | SignupGate.tsx vs customer/signup/page.tsx |
| Missing postal_code | Mechanic matching broken | SignupGate.tsx:22-32 |
| Missing province | Location services incomplete | SignupGate.tsx:22-32 |
| Field name mismatch | API expects `state_province`, form has `country` only | route.ts vs SignupGate.tsx |

---

### 1.2 MECHANIC SIGNUP

#### Flow Overview

**Entry:** [src/app/mechanic/signup/page.tsx](src/app/mechanic/signup/page.tsx) (1269 lines)
**Type:** 6-step wizard with auto-save drafts
**API:** [src/app/api/mechanic/signup/route.ts](src/app/api/mechanic/signup/route.ts)

#### Step-by-Step Data Collection

**Step 1: Personal Information**
```typescript
{
  name: string,
  email: string,
  phone: string,
  password: string,  // Min 8 chars
  confirmPassword: string,
  address: string,
  city: string,
  province: string,         // Dropdown (Canadian provinces)
  postalCode: string,       // ✅ COMPLETE location data
  country: string,          // Default: "Canada"
  dateOfBirth: string,      // Must be 18+
  sinOrBusinessNumber: string  // Optional (feature flag controlled)
}
```

**Step 2: Credentials** (MINIMUM 1 required)
```typescript
{
  certifications: [
    {
      type: 'red_seal' | 'provincial' | 'ase' | 'cpa_quebec' | 'manufacturer' | 'other',
      number: string,
      region?: string,  // For red_seal, provincial
      state?: string,   // For ASE
      authority?: string,  // For provincial
      manufacturer?: string,  // For manufacturer certs
      document: File
    }
  ],
  yearsOfExperience: number,
  specializations: string[]  // From predefined list
}
```

**Step 3: Shop Information**
```typescript
{
  shopAffiliation: 'independent' | 'dealership' | 'franchise' | 'mobile',
  shopName?: string,           // Required if not mobile/independent
  shopAddress?: string,
  businessLicenseNumber?: string,
  businessLicenseDocument?: File
}
```

**Step 4: Insurance & Background** (ALL REQUIRED)
```typescript
{
  liabilityInsurance: true,  // Checkbox
  insurancePolicyNumber: string,
  insuranceExpiry: date,
  insuranceDocument: File,
  criminalRecordCheck: true,  // Checkbox
  crcDocument: File  // Must be < 6 months old
}
```

**Step 5: Banking** (Info only)
- Explains Stripe Connect
- Terms acceptance checkbox
- Actual banking setup happens POST-APPROVAL

**Step 6: Review**
- Summary of all data
- Edit buttons for each step
- Submit application

#### Database Operations

**Sequence:**
1. Create `auth.users` with `role: 'mechanic'`
2. Create `profiles` with `account_type: 'independent_mechanic'`
3. **Encrypt SIN** using `encryptPII()` function
4. Create `mechanics` table record:
   ```sql
   -- src/app/api/mechanic/signup/route.ts:154-234
   mechanics {
     user_id: auth_user_id,
     account_type: 'independent',
     application_status: 'pending',  -- Awaits admin approval

     -- Personal
     name, email, phone, date_of_birth,
     full_address, city, province, postal_code, country,
     sin_encrypted,  -- ✅ PII encrypted

     -- Credentials (dual-write pattern)
     certification_type,  -- Primary cert
     certification_number,
     other_certifications: JSONB,  -- All certs
     years_of_experience,
     specializations,

     -- Shop
     shop_affiliation, shop_name, shop_address,

     -- Compliance
     liability_insurance, insurance_policy_number, insurance_expiry,
     criminal_record_check,

     -- Documents (array of URLs)
     certification_documents[],
     insurance_document,
     crc_document,

     -- Status
     application_status: 'pending',
     background_check_status: 'pending',
     service_tier: 'virtual_only',  -- Default until approved
     current_step: 6
   }
   ```
5. Insert `mechanic_documents` (one row per uploaded file)
6. Insert `mechanic_admin_actions` (log application submission)

#### Approval Workflow

**Admin View:** [src/app/admin/(shell)/mechanics/applications/page.tsx](src/app/admin/(shell)/mechanics/applications/page.tsx)

**Approval API:** [src/app/api/admin/mechanics/[id]/approve/route.ts](src/app/api/admin/mechanics/[id]/approve/route.ts)

**Flow:**
```
Application Submitted (status: 'pending')
           ↓
Admin views application dashboard
           ↓
Admin reviews:
  - Red Seal certification
  - Years of experience
  - Insurance documents
  - Criminal record check
  - Uploaded documents
           ↓
Admin approves → POST /api/admin/mechanics/[id]/approve
           ↓
Update mechanics table:
  application_status = 'approved'
  background_check_status = 'approved'
  approved_at = NOW()
  reviewed_by = admin.id
           ↓
Log to mechanic_admin_actions
           ↓
🚨 TODO: Send approval email (NOT IMPLEMENTED)
🚨 TODO: Send Stripe Connect link (NOT IMPLEMENTED)
           ↓
Mechanic must manually navigate to Stripe onboarding
```

#### Issues Found

| Issue | Impact | Location |
|-------|--------|----------|
| Approval email not sent | Mechanics don't know they're approved | approve/route.ts:60-61 |
| Stripe link not sent | Manual process, poor UX | approve/route.ts:61 |
| TypeScript errors | `@ts-nocheck` used instead of fixing | approve/route.ts:1 |
| No OAuth flow | Google/Apple signup only works for customers | N/A |

---

### 1.3 WORKSHOP SIGNUP

#### Flow Overview

**Entry:** [src/app/workshop/signup/page.tsx](src/app/workshop/signup/page.tsx) (396 lines)
**Type:** 4-step wizard
**API:** [src/app/api/workshop/signup/route.ts](src/app/api/workshop/signup/route.ts)

#### Step-by-Step Data Collection

**Step 1: Basic Information**
```typescript
{
  workshopName: string,
  contactName: string,  // Owner/manager
  email: string,
  phone: string,
  password: string,  // Min 8 chars
  confirmPassword: string
}
```

**Step 2: Business Details**
```typescript
{
  businessRegistrationNumber: string,  // REQUIRED
  taxId: string,  // GST/HST - REQUIRED
  website: string,  // Optional
  industry: string  // Dropdown (8 options)
}
```

**Industries:**
- Independent Auto Repair Shop
- Dealership Service Center
- Franchise Service Center
- Specialty Shop
- Mobile Mechanic Network
- Fleet Maintenance
- Other

**Step 3: Coverage & Location**
```typescript
{
  address: string,
  city: string,
  province: string,  // Dropdown
  postalCode: string,
  coveragePostalCodes: string[],  // Array of FSA codes (3-6 chars)
  serviceRadiusKm: number,  // Default: 25
  mechanicCapacity: number,  // Default: 10
  commissionRate: number  // Default: 10% (from WORKSHOP_PRICING constant)
}
```

**Step 4: Review**
- Summary + Terms acceptance (REQUIRED)
- Edit buttons for each section

#### Database Operations

**Sequence:**
1. **Generate unique slug** from workshop name:
   ```typescript
   // src/app/api/workshop/signup/route.ts:111-127
   function generateSlug(name: string): string {
     return name.toLowerCase()
       .replace(/[^a-z0-9\s-]/g, '')
       .replace(/\s+/g, '-')
       .trim()
   }
   // Check uniqueness, append number if collision
   ```

2. Create `auth.users` with `role: 'workshop_admin'`

3. Create `organizations` table:
   ```sql
   -- route.ts:161-187
   organizations {
     organization_type: 'workshop',
     name, slug,  -- Slug is UNIQUE
     email, phone, website,
     address, city, province, postal_code, country,
     business_registration_number,
     tax_id,
     industry,
     coverage_postal_codes,  -- JSONB array
     service_radius_km,
     mechanic_capacity,
     commission_rate,
     subscription_status: 'none',  -- Workshops don't have subscriptions
     status: 'pending',  -- Requires admin approval
     verification_status: 'pending',
     created_by: auth_user_id
   }
   ```

4. Create `organization_members`:
   ```sql
   -- route.ts:200-215
   organization_members {
     organization_id,
     user_id: auth_user_id,
     role: 'owner',  -- Workshop creator is always owner
     status: 'active',
     joined_at: NOW(),
     invited_by: auth_user_id  -- Self-invited
   }
   ```

5. Create `profiles`:
   ```sql
   profiles {
     id: auth_user_id,
     role: 'workshop_admin',
     account_type: 'workshop_customer',
     organization_id
   }
   ```

6. **Send emails** (✅ IMPLEMENTED):
   - Confirmation email to workshop
   - Admin notification email

7. **Track analytics** event: `workshop_signup_success`

#### Approval Workflow

**Admin View:** [src/app/admin/(shell)/workshops/applications/page.tsx](src/app/admin/(shell)/workshops/applications/page.tsx)

**Approval API:** [src/app/api/admin/workshops/[id]/approve/route.ts](src/app/api/admin/workshops/[id]/approve/route.ts)

**Flow:**
```
Workshop Signup (status: 'pending')
           ↓
Admin views workshop applications
           ↓
Admin reviews:
  - Business registration number
  - Tax ID (GST/HST)
  - Industry type
  - Coverage area (postal codes)
  - Service capacity
           ↓
Admin approves → POST /api/admin/workshops/[id]/approve
           ↓
Update organizations:
  status = 'active'
  verification_status = 'verified'
           ↓
Log to admin_actions table
           ↓
Track approval event (analytics)
           ↓
✅ Send approval email with dashboard link
           ↓
Workshop can access full platform
```

#### Issues Found

| Issue | Impact | Location |
|-------|--------|----------|
| Business license document not uploaded | Form field exists but not used | page.tsx:234 vs route.ts (no upload) |
| No workshop mechanic invitation flow | Can't add mechanics to team | Feature missing |
| No redirect parameter support | Can't deep-link after signup | Success page has no redirect |

---

## 2. DATABASE SCHEMA - SOURCE OF TRUTH ANALYSIS

### 2.1 Core Tables

#### auth.users (Supabase Auth - AUTHENTICATION SOURCE OF TRUTH)

```sql
-- Managed by Supabase, NOT in migrations
id UUID PRIMARY KEY
email TEXT UNIQUE  -- ✅ PRIMARY source for email
encrypted_password TEXT
email_confirmed_at TIMESTAMP
raw_user_meta_data JSONB  -- Stores initial role
```

**Role Storage:**
```json
{
  "role": "customer" | "mechanic" | "admin" | "workshop_admin"
}
```

#### profiles (UNIFIED CUSTOMER/ADMIN PROFILES)

**File:** [supabase/customer_auth_schema_v2.sql](supabase/customer_auth_schema_v2.sql)

**Key Finding:** ❌ NO SEPARATE "customers" TABLE EXISTS

```sql
id UUID PRIMARY KEY REFERENCES auth.users(id)

-- Account Classification
role TEXT  -- ⚠️ NO CHECK constraint (flexible)
account_type TEXT CHECK (account_type IN (
  'individual_customer',    -- B2C
  'corporate_customer',     -- B2B corporate member
  'workshop_customer'       -- B2B2C workshop-referred
))
account_status TEXT  -- ⚠️ NO CHECK constraint

-- Location (DUPLICATED FIELDS)
address_line1 TEXT
address_line2 TEXT
city TEXT
state_province TEXT
postal_zip_code TEXT  -- ⚠️ Duplicate of postal_code
country TEXT
province TEXT
postal_code TEXT      -- ⚠️ Duplicate of postal_zip_code
latitude NUMERIC
longitude NUMERIC

-- Organization Relationships
organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL
referred_by_workshop_id UUID REFERENCES organizations(id) ON DELETE SET NULL
source TEXT CHECK (source IN (
  'direct',
  'workshop_referral',
  'invitation',
  'import'
))
```

**CRITICAL ISSUES:**
1. ✅ Both `postal_zip_code` AND `postal_code` exist
2. ✅ Both `state_province` AND `province` exist
3. ❌ Customer signup only fills `address_line1`, not `postal_code`

#### mechanics (MECHANIC-SPECIFIC DATA)

**File:** Multiple migrations (evolved schema)

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
email TEXT UNIQUE  -- ⚠️ Duplicates auth.users.email

-- Account Classification
account_type TEXT CHECK (account_type IN (
  'individual_mechanic',
  'workshop_mechanic'
))
account_status TEXT CHECK (account_status IN (
  'active',
  'suspended',
  'banned',
  'pending'
))

-- Location (DUPLICATED FIELDS)
city TEXT
province TEXT
state_province TEXT  -- ⚠️ Duplicate of province
country TEXT
postal_code TEXT
full_address TEXT
latitude NUMERIC
longitude NUMERIC

-- Workshop Relationship
workshop_id UUID REFERENCES organizations(id) ON DELETE SET NULL
invited_by UUID REFERENCES organizations(id) ON DELETE SET NULL
is_workshop BOOLEAN DEFAULT false

-- Application & Approval
application_status TEXT CHECK (application_status IN (
  'draft',
  'pending',
  'under_review',
  'approved',
  'rejected',
  'additional_info_required'
))
approved_at TIMESTAMP
approved_by UUID REFERENCES auth.users(id)

-- Certifications (Upgraded: 20251023000001)
certification_type TEXT  -- Primary cert (backward compat)
certification_number TEXT
other_certifications JSONB  -- All certifications
years_of_experience INTEGER

-- SIN/Tax
sin_encrypted TEXT  -- ✅ Encrypted PII
requires_sin_collection BOOLEAN DEFAULT true

-- Stripe Connect
stripe_account_id TEXT
stripe_charges_enabled BOOLEAN DEFAULT false
stripe_onboarding_completed BOOLEAN DEFAULT false
stripe_payouts_enabled BOOLEAN DEFAULT false

-- Service Configuration
service_tier TEXT
can_accept_sessions BOOLEAN DEFAULT true
is_available BOOLEAN DEFAULT true

-- Suspension (Added: 20251109000001_1)
suspended_until TIMESTAMP
ban_reason TEXT
```

#### organizations (WORKSHOPS & CORPORATE ACCOUNTS)

**File:** [supabase_backup_/migrations/20250124000001_create_organizations.sql](supabase_backup_/migrations/20250124000001_create_organizations.sql)

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

organization_type TEXT CHECK (organization_type IN (
  'corporate',   -- B2B SaaS
  'workshop'     -- B2B2C marketplace
))

name TEXT
slug TEXT UNIQUE  -- ✅ URL-safe identifier

-- Workshop-Specific
coverage_postal_codes TEXT[]  -- FSA codes served
service_radius_km INTEGER
mechanic_capacity INTEGER DEFAULT 10
commission_rate DECIMAL(5,2) DEFAULT 10.00

-- Subscription (B2B SaaS)
subscription_status TEXT CHECK (subscription_status IN (
  'trial', 'active', 'past_due', 'canceled', 'none'
))
subscription_tier TEXT CHECK (subscription_tier IN (
  'starter', 'professional', 'enterprise'
))

-- Stripe Connect (Workshops)
stripe_account_id TEXT
stripe_account_status TEXT CHECK (stripe_account_status IN (
  'pending', 'verified', 'restricted', 'rejected'
))

-- Status
status TEXT CHECK (status IN (
  'pending', 'active', 'suspended', 'closed'
))
verification_status TEXT CHECK (verification_status IN (
  'unverified', 'pending', 'verified', 'rejected'
))
```

#### organization_members (TEAM MEMBERSHIP)

**File:** [supabase_backup_/migrations/20250124000002_create_organization_members.sql](supabase_backup_/migrations/20250124000002_create_organization_members.sql)

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE

role TEXT CHECK (role IN (
  'owner',   -- Full control
  'admin',   -- Manage members
  'member',  -- Standard access
  'viewer'   -- Read-only
))

status TEXT CHECK (status IN (
  'pending',    -- Invited, not joined
  'active',     -- Active member
  'suspended',  -- Temporarily disabled
  'removed'     -- Deleted
))

-- Invitation System
invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex')
invite_email TEXT
invited_by UUID REFERENCES auth.users(id)
invite_expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')

UNIQUE(organization_id, user_id)
```

### 2.2 Data Duplication Analysis

#### Email (3 locations)

| Table | Field | Purpose | Source of Truth? |
|-------|-------|---------|------------------|
| auth.users | email | Authentication | ✅ PRIMARY |
| profiles | email | Denormalized for queries | ❌ Secondary |
| mechanics | email | Denormalized + legacy unique constraint | ❌ Secondary |

**Sync Issues:**
- ❌ Email changes in auth.users don't auto-update profiles/mechanics
- ❌ No database trigger to maintain consistency

#### Location Fields (2 patterns)

**profiles:**
- `postal_zip_code` (one field)
- `postal_code` (DUPLICATE)
- `state_province` (one field)
- `province` (DUPLICATE)

**mechanics:**
- `postal_code` (one field)
- `state_province` (one field)
- `province` (DUPLICATE)

**Recommendation:** Standardize to `postal_code` and `province`, drop duplicates

#### Name Fields (2 formats)

| Table | Field | Format |
|-------|-------|--------|
| profiles | full_name | "John Doe" |
| mechanics | name | "John Doe" |

**Issue:** Different column names for same data

### 2.3 Database Triggers

#### handle_new_user() - Auto Profile Creation

**File:** [supabase/customer_auth_schema_v2.sql:145-164](supabase/customer_auth_schema_v2.sql)

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email_verified = NEW.email_confirmed_at IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

**What it does:**
- ✅ Automatically creates profiles record when auth.users record is created
- ✅ Extracts role from user_metadata
- ✅ Sets email_verified based on email_confirmed_at

#### auto_update_mechanic_type() - 30-Day Cooling Period

**File:** [supabase/migrations/20251109000002_add_cooling_period.sql:2-46](supabase/migrations/20251109000002_add_cooling_period.sql)

```sql
CREATE OR REPLACE FUNCTION auto_update_mechanic_type()
RETURNS TRIGGER AS $$
BEGIN
  -- When workshop_id is set
  IF NEW.workshop_id IS NOT NULL AND
     (OLD.workshop_id IS NULL OR OLD.workshop_id != NEW.workshop_id) THEN

    -- Check if owner
    IF (SELECT EXISTS (
      SELECT 1 FROM organizations
      WHERE id = NEW.workshop_id AND created_by = NEW.user_id
    )) THEN
      NEW.account_type := 'individual_mechanic';  -- Owner/Operator
    ELSE
      NEW.account_type := 'workshop_mechanic';   -- Employee
    END IF;

  -- When workshop_id is removed (termination)
  ELSIF NEW.workshop_id IS NULL AND OLD.workshop_id IS NOT NULL THEN
    NEW.account_type := 'independent_mechanic';
    NEW.service_tier := 'virtual_only';
    NEW.account_status := 'suspended';
    NEW.suspended_until := (NOW() + INTERVAL '30 days')::timestamp;
    NEW.ban_reason := 'Cooling period after workshop termination. You can resume work in 30 days.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**What it does:**
- ✅ Auto-sets `account_type` based on workshop relationship
- ✅ Enforces 30-day cooling period when mechanic leaves workshop
- ✅ Prevents immediate competition with former employer

#### ensure_workshop_owner_membership() - Auto Org Membership

**File:** [supabase/migrations/20251109000003_auto_create_org_membership.sql:4-74](supabase/migrations/20251109000003_auto_create_org_membership.sql)

```sql
CREATE OR REPLACE FUNCTION ensure_workshop_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workshop_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if mechanic is owner
  IF (SELECT EXISTS (
    SELECT 1 FROM organizations
    WHERE id = NEW.workshop_id AND created_by = NEW.user_id
  )) THEN
    -- Ensure organization_members record exists
    INSERT INTO organization_members (
      user_id, organization_id, role, status, joined_at
    ) VALUES (
      NEW.user_id, NEW.workshop_id, 'owner', 'active', NOW()
    )
    ON CONFLICT (organization_id, user_id) DO UPDATE SET
      role = 'owner', status = 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**What it does:**
- ✅ Automatically creates organization_members record for workshop owners
- ✅ Ensures dual-mode mechanics have access to both dashboards

---

## 3. EMAIL & NOTIFICATION SYSTEMS

### 3.1 Email Service Infrastructure

#### Core Email Service

**File:** [src/lib/email/emailService.ts](src/lib/email/emailService.ts)

**Provider:** Resend.com (SMTP)
- **API:** `https://api.resend.com/emails`
- **From:** `AskAutoDoctor <noreply@askautodoctor.com>`
- **Support Email:** `support@askautodoctor.com`

**Implementation:**
```typescript
// Line 12-45
export async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email')
    return null
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'AskAutoDoctor <noreply@askautodoctor.com>',
      to, subject, html,
    }),
  })
}
```

**Email Layout:** Responsive HTML template with:
- Blue gradient header
- Centered content area
- Footer with support email
- Mobile-friendly design

### 3.2 Email Templates

#### Customer Session Emails

**Location:** [src/lib/email/templates/](src/lib/email/templates/)

| Template | File | Trigger | Status |
|----------|------|---------|--------|
| Booking Confirmed | bookingConfirmed.ts | Session created | ✅ Implemented |
| Mechanic Assigned | mechanicAssigned.ts | Mechanic accepts session | ✅ Implemented |
| Session Starting | sessionStarting.ts | 15 min before session | ✅ Implemented |
| Session Ended | sessionEnded.ts | Session completed | ✅ Implemented |
| Summary Delivered | summaryDelivered.ts | Diagnostic summary ready | ✅ Implemented |

#### Workshop Emails

**Location:** [src/lib/email/workshopTemplates.ts](src/lib/email/workshopTemplates.ts)

| Template | Function | Trigger | Status |
|----------|----------|---------|--------|
| Signup Confirmation | workshopSignupConfirmationEmail() | Workshop signup | ✅ Implemented |
| Admin Notification | adminWorkshopSignupNotification() | New workshop signup | ✅ Implemented |
| Approval | workshopApprovalEmail() | Admin approves workshop | ✅ Implemented |
| Rejection | workshopRejectionEmail() | Admin rejects workshop | ✅ Implemented |

**Implementation:**
```typescript
// src/app/api/workshop/signup/route.ts:254-294
// ✅ Email sent on signup
await sendEmail({
  to: email,
  ...workshopSignupConfirmationEmail({ workshopName, contactName, slug })
})

await sendEmail({
  to: process.env.ADMIN_EMAIL,
  ...adminWorkshopSignupNotification({ workshopName, email, phone, city })
})
```

#### Mechanic Emails

**Status:** 🚨 **MISSING - CRITICAL GAP**

| Template | Trigger | Status |
|----------|---------|--------|
| Approval Email | Admin approves mechanic | ❌ TODO comment in code |
| Rejection Email | Admin rejects mechanic | ❌ TODO comment in code |
| Stripe Connect Link | After approval | ❌ TODO comment in code |

**Evidence:**
```typescript
// src/app/api/admin/mechanics/[id]/approve/route.ts:60-61
// TODO: Send approval email to mechanic
// TODO: Send Stripe Connect onboarding link
```

### 3.3 In-App Notifications

#### Notifications Table

**File:** [supabase/migrations_backup/20251029000001_create_notifications_table.sql](supabase/migrations_backup/20251029000001_create_notifications_table.sql)

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN (
    'request_created',
    'request_accepted',
    'request_rejected',
    'session_started',
    'session_completed',
    'session_cancelled',
    'message_received',
    'payment_received',
    'quote_received'
  )),
  payload JSONB,  -- Event details
  read_at TIMESTAMPTZ,  -- NULL if unread
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_notifications_user_id_created_at` - Fast user queries
- `idx_notifications_user_id_read_at WHERE read_at IS NULL` - Unread count

**RLS Policies:**
- Users can view own notifications
- Users can update own notifications (mark as read)
- System can insert notifications (via service role)
- Users can delete own notifications

#### Notification Components

**UI Components:**
- [src/components/notifications/NotificationBell.tsx](src/components/notifications/NotificationBell.tsx)
- [src/components/notifications/NotificationCenter.tsx](src/components/notifications/NotificationCenter.tsx)

**Implementation:** Real-time notification bell with unread count badge

### 3.4 Browser Push Notifications

**File:** [src/lib/browserNotifications.ts](src/lib/browserNotifications.ts)

**Feature Flag:** `features.mechBrowserNotifications`

**Functionality:**
```typescript
// Tier 3: Native browser push notifications when tab inactive

// Request permission
ensureNotificationPermission()

// Send notification (only if tab inactive)
notifyViaBrowser({
  requestId: '...',
  customerName: '...',
  vehicle: '...',
  concern: '...'
})
```

**Conditions:**
- Only shows when tab is in background (`document.visibilityState !== 'visible'`)
- Requires permission grant
- Auto-dismisses after a few seconds
- Click focuses window

### 3.5 Email Triggers Summary

#### Customer Journey

```
Signup → ✅ Supabase verification email (automatic)
        ↓
Profile Complete → ❌ No email
        ↓
Book Session → ✅ Booking confirmed email
        ↓
Mechanic Assigned → ✅ Mechanic assigned email
        ↓
15 min before session → ✅ Session starting email
        ↓
Session ends → ✅ Session ended email
        ↓
Summary ready → ✅ Summary delivered email
```

#### Mechanic Journey

```
Signup → ✅ Supabase verification email (automatic)
        ↓
Application submitted → ❌ No confirmation email
        ↓
Admin reviews → ❌ No "under review" email
        ↓
Approved → 🚨 TODO: Approval email NOT SENT
        ↓
        → 🚨 TODO: Stripe Connect link NOT SENT
        ↓
Rejected → 🚨 TODO: Rejection email NOT SENT
```

#### Workshop Journey

```
Signup → ✅ Confirmation email to workshop
        ↓
        → ✅ Notification email to admin
        ↓
Admin reviews → ❌ No "under review" email
        ↓
Approved → ✅ Approval email with dashboard link
        ↓
Rejected → ✅ Rejection email with support contact
```

---

## 4. AUTHORIZATION & ACCESS CONTROL

### 4.1 Middleware Protection

**File:** [src/middleware.ts:458-475](src/middleware.ts)

**Protected Routes:**
```typescript
matcher: [
  '/admin/:path*',     // Admin only
  '/mechanic/:path*',  // Mechanics only
  '/workshop/:path*',  // Workshop members only
  '/customer/:path*',  // Authenticated customers
  '/video/:path*',     // Session participants
  '/chat/:path*',      // Session participants
  '/diagnostic/:path*' // Session participants
]
```

#### Admin Route Protection

**Logic:** [middleware.ts:190-250](src/middleware.ts)

```typescript
// 1. Get Supabase Auth user
const { data: { user } } = await supabase.auth.getUser()

// 2. Fetch profile.role
const { data: profile } = await supabase
  .from('profiles')
  .select('role, full_name, email')
  .eq('id', user.id)
  .maybeSingle()

// 3. Check role
if (!profile || profile.role !== 'admin') {
  // Log security warning
  console.warn(`[Middleware] Unauthorized admin access attempt by ${user.email}`)

  // Redirect to homepage
  return NextResponse.redirect(new URL('/', req.url))
}

// 4. Allow access
```

**Public Admin Routes:**
- `/admin/login`

#### Mechanic Route Protection

**Logic:** [middleware.ts:254-314](src/middleware.ts)

```typescript
// 1. Get Supabase Auth user
// 2. Fetch profile.role
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .maybeSingle()

// 3. Check role
if (!profile || profile.role !== 'mechanic') {
  return NextResponse.redirect(new URL('/', req.url))
}

// 4. Verify mechanic profile exists
const { data: mechanic } = await supabase
  .from('mechanics')
  .select('id')
  .eq('user_id', user.id)
  .maybeSingle()

if (!mechanic) {
  return NextResponse.redirect(new URL('/mechanic/login?error=no-profile', req.url))
}

// 5. Allow access
```

**Public Mechanic Routes:**
- `/mechanic/login`
- `/mechanic/signup`
- `/mechanic/onboarding`

**Redirect Pattern:**
- Unauthenticated → `/mechanic/login?redirect={path}`
- Non-mechanic → `/` (homepage)

#### Workshop Route Protection

**Logic:** [middleware.ts:318-388](src/middleware.ts)

```typescript
// 1. Get Supabase Auth user
// 2. Check organization membership
const { data: membership } = await supabaseAdmin  // ⚠️ Uses admin client to bypass RLS
  .from('organization_members')
  .select(`
    id, role, status,
    organizations (organization_type, status)
  `)
  .eq('user_id', user.id)
  .eq('status', 'active')
  .maybeSingle()

// 3. Verify organization type
if (!membership ||
    membership.organizations.organization_type !== 'workshop' ||
    membership.organizations.status !== 'active') {
  return NextResponse.redirect(new URL('/', req.url))
}

// 4. Allow access
```

**Public Workshop Routes:**
- `/workshop/login`
- `/workshop/signup`

**Unique Aspects:**
- Uses `supabaseAdmin` to bypass RLS (necessary to check membership)
- Checks both user status AND organization status
- Verifies organization_type = 'workshop' (not corporate)

#### Customer Route Protection

**Logic:** [middleware.ts:391-453](src/middleware.ts)

```typescript
// 1. Get Supabase Auth user
// 2. Fetch profile
const { data: profile } = await supabase
  .from('profiles')
  .select('id, role, full_name, email')
  .eq('id', user.id)
  .maybeSingle()

// 3. Check profile exists
if (!profile) {
  return NextResponse.redirect(new URL('/', req.url))
}

// 4. Allow access (any authenticated user with profile)
```

**Public Customer Routes:**
- `/customer/signup`
- `/customer/verify-email`
- `/forgot-password`

**Unique Aspects:**
- Does NOT check specific role
- Any user with a profile can access customer routes
- Most permissive protection (enables multi-role accounts)

### 4.2 API Route Guards

**File:** [src/lib/auth/guards.ts](src/lib/auth/guards.ts) (619 lines)

#### Guard Functions

| Guard | Returns | Usage | Location |
|-------|---------|-------|----------|
| `requireAdmin()` | `{ profile }` or throws | Server components | Lines 185-216 |
| `requireAdminAPI()` | `{ data, error }` | API routes | Lines 399-447 |
| `requireMechanic()` | `{ profile, mechanic }` or throws | Server components | Lines 79-126 |
| `requireMechanicAPI()` | `{ data, error }` | API routes | Lines 237-317 |
| `requireCustomer()` | `{ profile }` or throws | Server components | Lines 140-177 |
| `requireCustomerAPI()` | `{ data, error }` | API routes | Lines 333-392 |
| `requireWorkshopAPI()` | `{ data, error }` | API routes | Lines 463-544 |

#### API Guard Pattern

```typescript
// Example: Mechanic API route
export async function POST(req: Request) {
  // 1. Call guard
  const result = await requireMechanicAPI(req)

  // 2. Check for error
  if (result.error) {
    return result.error  // NextResponse.json({ error }, { status: 401 })
  }

  // 3. Use authenticated data
  const mechanic = result.data

  // 4. Proceed with business logic
}
```

#### Session Participant Guard

**File:** [src/lib/auth/sessionGuards.ts:40-178](src/lib/auth/sessionGuards.ts)

**Purpose:** Validate user is customer OR mechanic in a session

```typescript
export async function requireSessionParticipant(req: Request, sessionId: string) {
  // 1. Get Supabase Auth user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // 2. Fetch session
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) {
    // Try diagnostic_sessions table
    const { data: diagnosticSession } = await supabase
      .from('diagnostic_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    if (!diagnosticSession) {
      return { error: NextResponse.json({ error: 'Session not found' }, { status: 404 }) }
    }
    session = diagnosticSession
  }

  // 3. Check if user is customer
  if (session.customer_id === user.id) {
    return { data: { user, session, role: 'customer' } }
  }

  // 4. Check if user is mechanic
  const { data: mechanic } = await supabase
    .from('mechanics')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (mechanic && mechanic.id === session.mechanic_id) {
    return { data: { user, session, role: 'mechanic' } }
  }

  // 5. Neither customer nor mechanic
  return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
}
```

**Use Cases:**
- `/video/[sessionId]` page
- `/api/sessions/[id]/*` endpoints
- `/chat/[sessionId]` page

### 4.3 Workshop RBAC System

**File:** [src/lib/auth/permissions.ts](src/lib/auth/permissions.ts) (362 lines)

#### Workshop Roles

```typescript
type WorkshopRole = 'owner' | 'admin' | 'service_advisor' | 'mechanic'
```

#### Permission Matrix

| Permission | Owner | Admin | Service Advisor | Mechanic |
|------------|-------|-------|-----------------|----------|
| `can_diagnose` | ✅ | ✅ | ❌ | ✅ |
| `can_send_quotes` | ✅ | ✅ | ✅ | ❌ |
| `can_see_pricing` | ✅ | ✅ | ✅ | ❌ |
| `can_manage_mechanics` | ✅ | ✅ | ❌ | ❌ |
| `can_view_analytics` | ✅ | ✅ | ❌ | ❌ |
| `can_manage_settings` | ✅ | ❌ | ❌ | ❌ |

**Implementation:**
```typescript
// Lines 29-62
const ROLE_PERMISSIONS: Record<WorkshopRole, Permissions> = {
  owner: {
    can_diagnose: true,
    can_send_quotes: true,
    can_see_pricing: true,
    can_manage_mechanics: true,
    can_view_analytics: true,
    can_manage_settings: true,
  },
  admin: {
    can_diagnose: true,
    can_send_quotes: true,
    can_see_pricing: true,
    can_manage_mechanics: true,
    can_view_analytics: true,
    can_manage_settings: false,  // Only owner
  },
  service_advisor: {
    can_diagnose: false,
    can_send_quotes: true,
    can_see_pricing: true,
    can_manage_mechanics: false,
    can_view_analytics: false,
    can_manage_settings: false,
  },
  mechanic: {
    can_diagnose: true,
    can_send_quotes: false,
    can_see_pricing: false,
    can_manage_mechanics: false,
    can_view_analytics: false,
    can_manage_settings: false,
  },
}
```

#### Permission Check Functions

```typescript
// Get user's role in workshop
getWorkshopRole(workshopId: string, userId: string): Promise<WorkshopRole | null>

// Check specific permission
canPerformAction(workshopId: string, userId: string, action: keyof Permissions): Promise<boolean>

// Throw error if not allowed
requirePermission(workshopId: string, userId: string, action: keyof Permissions): Promise<void>

// Batch permission check for UI
checkMultiplePermissions(workshopId: string, userId: string, actions: string[]): Promise<Record<string, boolean>>
```

#### Team Management Functions

```typescript
// Add user to workshop
addWorkshopMember(workshopId: string, email: string, role: WorkshopRole): Promise<void>

// Change user's role (cannot demote owner)
updateWorkshopMemberRole(workshopId: string, userId: string, newRole: WorkshopRole): Promise<void>

// Remove user (cannot remove owner)
removeWorkshopMember(workshopId: string, userId: string): Promise<void>
```

### 4.4 Row Level Security (RLS)

#### profiles Table

**File:** [supabase/customer_auth_schema_v2.sql:175-197](supabase/customer_auth_schema_v2.sql)

```sql
-- Users can view own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

#### organizations Table

**File:** [supabase_backup_/migrations/20250124000001_create_organizations.sql:105-113](supabase_backup_/migrations/20250124000001_create_organizations.sql)

```sql
-- Platform admins can manage all organizations
CREATE POLICY "Platform admins can manage organizations"
  ON organizations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Organization members can view their org
CREATE POLICY "Organization members can view their org"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Organization admins can update
CREATE POLICY "Organization admins can update"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );
```

#### organization_members Table

**File:** [supabase_backup_/migrations/20250124000002_create_organization_members.sql:63-93](supabase_backup_/migrations/20250124000002_create_organization_members.sql)

```sql
-- Members can view other members in their org
CREATE POLICY "Organization members can view members"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Owners and admins can manage members
CREATE POLICY "Organization admins can manage members"
  ON organization_members FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Platform admins can manage all memberships
CREATE POLICY "Platform admins can manage memberships"
  ON organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
```

---

## 5. ACCOUNT TRANSITIONS & UPGRADES

### 5.1 Account Type System

**Key Finding:** System uses **FIXED ACCOUNT TYPES** with **INTEGRATION LINKING**, NOT traditional role conversion

#### Customer Account Types

```typescript
// profiles.account_type
type CustomerAccountType =
  | 'individual_customer'    // B2C direct signup
  | 'corporate_customer'     // B2B corporate member
  | 'workshop_customer'      // B2B2C workshop-referred
```

**Transitions:** ❌ NO cross-type changes implemented

#### Mechanic Account Types

```typescript
// mechanics.account_type
type MechanicAccountType =
  | 'independent_mechanic'   // Independent contractor
  | 'workshop_mechanic'      // Workshop employee
```

**Transitions:** ✅ Via workshop linking (see 5.2)

### 5.2 Mechanic Account Transitions

#### Independent → Workshop Employee

**Trigger:** Workshop sends invitation, mechanic accepts

**API:** [src/app/api/mechanic/workshop-signup/route.ts:120-169](src/app/api/mechanic/workshop-signup/route.ts)

**Flow:**
```
1. Workshop creates invitation in organization_members
   status: 'pending'
   invite_code: unique 16-char hex
   invite_expires_at: NOW() + 7 days

2. Mechanic uses invite code at workshop-signup endpoint

3. Create/update mechanics record:
   user_id: auth_user_id
   account_type: 'workshop'  (auto-set by trigger)
   workshop_id: organization_id
   invited_by: organization_id
   invite_accepted_at: NOW()

4. Update organization_members:
   status: 'active'
   joined_at: NOW()

5. Mechanic now has workshop affiliation
```

**Data Preservation:**
- ✅ Original auth.users unchanged
- ✅ Original profiles updated (not replaced)
- ✅ Historical session data retained

#### Workshop Employee → Independent

**Trigger:** Workshop removes mechanic OR mechanic leaves

**API:** [src/app/api/workshop/mechanics/[mechanicId]/remove/route.ts](src/app/api/workshop/mechanics/[mechanicId]/remove/route.ts)

**Auto-trigger:** [supabase/migrations/20251109000002_add_cooling_period.sql:29-42](supabase/migrations/20251109000002_add_cooling_period.sql)

**Flow:**
```
1. Workshop admin removes mechanic

2. Set mechanics.workshop_id = NULL

3. Database trigger runs automatically:
   account_type = 'independent_mechanic'
   service_tier = 'virtual_only'
   account_status = 'suspended'
   suspended_until = NOW() + 30 days
   ban_reason = 'Cooling period after workshop termination...'

4. 30-day cooling period enforced

5. After 30 days, mechanic can work independently again
```

**Business Rule:** 30-day cooling period prevents immediate competition

#### Independent → Workshop Owner

**Trigger:** Mechanic creates their own workshop

**Auto-linking:** [supabase/migrations/20251109000003_auto_create_org_membership.sql:24-60](supabase/migrations/20251109000003_auto_create_org_membership.sql)

**Flow:**
```
1. Mechanic creates organization (via workshop signup)

2. organizations.created_by = mechanic.user_id

3. Update mechanics:
   workshop_id = organization_id
   account_type = 'individual_mechanic'  (NOT 'workshop')

4. Trigger detects ownership:
   IF organizations.created_by = mechanic.user_id THEN
     INSERT INTO organization_members (
       user_id, organization_id, role: 'owner', status: 'active'
     )

5. Mechanic gains dual-mode access:
   - /mechanic/dashboard (personal sessions)
   - /workshop/dashboard (business management)
```

**Result:** "Owner-Operator" model - mechanic with workshop access

### 5.3 Cross-Role Transitions

#### Customer → Mechanic

**Status:** ❌ NOT IMPLEMENTED

**Theoretical Path:**
1. Admin would need to manually create new auth.users with role='mechanic'
2. Create mechanics table record
3. Link to old customer account (no schema support for this)

**Why Not Implemented:** Separate role hierarchies by design

#### Mechanic → Customer

**Status:** ❌ NOT IMPLEMENTED

**Current Behavior:** Mechanics CAN use customer routes because middleware checks profile existence, not specific role

#### Dual-Role Accounts

**Current Support:**
- ✅ Mechanic can BE customer (profile.role='mechanic' can access /customer/*)
- ✅ Workshop owner can BE mechanic (dual dashboard access)
- ❌ Customer CANNOT be mechanic (requires separate signup)

### 5.4 Subscription Upgrades/Downgrades

**Status:** ❌ NOT IMPLEMENTED

#### Current Subscription Features

**Available:**
- ✅ Create subscription: `POST /api/customer/subscriptions`
- ✅ Cancel subscription: `POST /api/customer/subscriptions/cancel`
- ✅ View subscription: `GET /api/customer/subscriptions`

**Missing:**
- ❌ Change plan: No endpoint exists
- ❌ Pro-rating: No calculation logic
- ❌ Credit migration: No plan-to-plan transfer
- ❌ Stripe subscription modification: No `stripe.subscriptions.update()` calls

#### Subscription Table

**File:** Referenced in [src/app/api/customer/subscriptions/route.ts](src/app/api/customer/subscriptions/route.ts)

```sql
customer_subscriptions {
  customer_id UUID,
  plan_id UUID REFERENCES service_plans(id),
  status TEXT ('active' | 'past_due' | 'canceled'),
  current_credits INTEGER,
  billing_cycle_start TIMESTAMP,
  billing_cycle_end TIMESTAMP,
  next_billing_date TIMESTAMP,
  stripe_subscription_id TEXT
}
```

**Constraint:** ONE active subscription per customer (enforced at API level)

#### Cancellation Modes

**Immediate:**
```typescript
{
  status: 'canceled',
  ended_at: NOW(),
  current_credits: 0  // Credits forfeited
}
```

**End of Period:**
```typescript
{
  cancel_at_period_end: true,
  auto_renew: false
  // Credits preserved until period end
}
```

#### What's Needed for Upgrades/Downgrades

```typescript
// DOES NOT EXIST - Theoretical implementation
POST /api/customer/subscriptions/change-plan
{
  new_plan_id: string,
  change_type: 'upgrade' | 'downgrade',
  effective_date: 'immediate' | 'next_billing_cycle'
}
```

**Required Implementation:**
1. Pro-rating calculation (unused days/credits)
2. Stripe subscription update
3. Credit conversion (old plan → new plan)
4. Billing cycle adjustment

### 5.5 Data Migration on Account Changes

#### Workshop Integration Data Flow

**When Mechanic Joins Workshop:**

```
auth.users (UNCHANGED)
  ↓
profiles (UPDATED, not replaced)
  role: 'mechanic'
  organization_id: workshop_id  (NEW)
  ↓
mechanics (UPDATED)
  workshop_id: organization_id  (NEW)
  account_type: 'workshop_mechanic'  (CHANGED by trigger)
  invited_by: organization_id  (NEW)
  ↓
organization_members (INSERTED)
  user_id, organization_id, role, status: 'active'
```

**Foreign Key Rules:**
```sql
-- ALL workshop relationships use ON DELETE SET NULL
profiles.organization_id REFERENCES organizations(id) ON DELETE SET NULL
mechanics.workshop_id REFERENCES organizations(id) ON DELETE SET NULL
```

**What This Means:**
- ✅ Workshop deletion does NOT delete mechanic accounts
- ✅ Mechanic reverts to independent status automatically
- ✅ No cascade deletes that would lose user data

#### When Mechanic Leaves Workshop

**Data Preserved:**
- ✅ Stripe account ID
- ✅ Historical session data
- ✅ Earnings records
- ✅ Reviews and ratings
- ✅ Profile information
- ✅ Auth credentials

**Data Changed:**
- account_type: 'independent_mechanic'
- service_tier: 'virtual_only'
- account_status: 'suspended'
- suspended_until: NOW() + 30 days

**No Data Loss:** System preserves ALL historical data

---

## 6. FORGOT PASSWORD IMPLEMENTATION

### 6.1 Customer Password Reset

#### UI Flow

**Page:** [src/app/(auth)/forgot-password/page.tsx](src/app/(auth)/forgot-password/page.tsx)

**Features:**
- Email input with validation
- "Check your email" success message
- Shows reset link expiry: **30 minutes** (line 87)
- "Try again" button if email not received

**Issues:**
- ❌ Link back to `/signup` (should be dynamic based on user type)
- ❌ Reset page doesn't exist (404 error)

#### API Implementation

**Endpoint:** `POST /api/customer/forgot-password`
**File:** [src/app/api/customer/forgot-password/route.ts](src/app/api/customer/forgot-password/route.ts)

**Logic:**
```typescript
// Lines 17-43
export async function POST(req: Request) {
  const { email } = await req.json()

  // 1. Check if user exists (security: return success either way)
  const { data: user } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (!user) {
    // Prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists, a reset link has been sent',
    })
  }

  // 2. Send reset email via Supabase
  await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/customer/reset-password`,
  })

  // 3. Return success
  return NextResponse.json({ success: true })
}
```

**Security Issues:**
1. ❌ NO rate limiting (passwordResetRateLimiter exists but not used)
2. ❌ NO CAPTCHA
3. ✅ Email enumeration prevention (returns success even if user doesn't exist)

#### Reset Page (Missing)

**Expected URL:** `/customer/reset-password?token=xxx&type=recovery`

**Status:** ❌ PAGE DOES NOT EXIST

**Impact:** Users clicking email links get 404 error - **CRITICAL BUG**

**Should Contain:**
- Token extraction from URL
- New password input
- Confirm password input
- Password strength indicator
- Submit button
- Calls `supabase.auth.updateUser({ password: newPassword })`

### 6.2 Mechanic/Admin/Workshop Password Reset

**Status:** ❌ NO SELF-SERVICE RESET

**Evidence:**
- Mechanic login: [src/app/mechanic/login/page.tsx](src/app/mechanic/login/page.tsx) - NO forgot password link
- Workshop login: [src/app/workshop/login/page.tsx](src/app/workshop/login/page.tsx) - NO forgot password link
- Admin login: [src/app/admin/login/page.tsx](src/app/admin/login/page.tsx) - NO forgot password link

**Alternative:** Admin-assisted password reset

### 6.3 Admin Password Reset (For Any User)

**Endpoint:** `POST /api/admin/users/[id]/reset-password`
**File:** [src/app/api/admin/users/[id]/reset-password/route.ts](src/app/api/admin/users/[id]/reset-password/route.ts)

**Flow:**
```typescript
// Lines 23-75
export async function POST(req: Request, { params }) {
  // 1. Admin authentication
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error

  // 2. Generate recovery link (not sent via email)
  const { data } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: user.email,
  })

  // 3. Log admin action
  await supabaseAdmin.from('admin_actions').insert({
    admin_id: admin.id,
    action_type: 'password_reset',
    target_type: 'user',
    target_id: userId,
  })

  // 4. Return reset link (admin manually sends to user)
  return NextResponse.json({
    success: true,
    resetLink: data.properties.action_link,
  })
}
```

**Usage Context:**
- Admin Dashboard → Customers page → "Reset Password" button
- Admin Dashboard → Mechanics page → "Reset Password" button

**UX:** Admin copies link and manually sends to user (via email, phone, etc.)

### 6.4 Password Validation

#### Signup Password Requirements

**File:** [src/app/customer/signup/page.tsx:108-145](src/app/customer/signup/page.tsx)

**Requirements:**
- Minimum length: 8 characters
- Strength calculation (points system):
  - Length ≥ 8: +1 point
  - Length ≥ 12: +1 point
  - Mixed case (a-z & A-Z): +1 point
  - Contains digits: +1 point
  - Contains special chars: +1 point
- **Required strength:** 3+ points
- Error message: "Password is too weak. Add uppercase, numbers, and symbols"

**Reset Password Validation:**
- ❌ UNKNOWN (page doesn't exist)
- Likely uses Supabase default: minimum 6 characters

### 6.5 Rate Limiting

**Defined:** [src/lib/ratelimit.ts:83-94](src/lib/ratelimit.ts)

```typescript
// Password reset rate limiter (3 resets per hour per email)
export const passwordResetRateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'password_reset',
})
```

**Status:** ❌ DEFINED BUT NOT USED

**Risk:** Attackers can spam password reset requests

### 6.6 Token Security

**Handled by Supabase:**
- Tokens are cryptographically secure
- Single-use tokens
- Time-limited (30 minutes per UI, but configurable in Supabase dashboard)
- Validated server-side by Supabase

**Custom Code:** No custom token handling = no custom vulnerabilities

### 6.7 Edge Cases

| Scenario | Status | Behavior |
|----------|--------|----------|
| User doesn't exist | ✅ Handled | Returns success (prevents email enumeration) |
| Email not verified | ⚠️ Unknown | No explicit check in code |
| User suspended/banned | ❌ Not handled | Suspended users can request resets |
| Workshop member | ❌ Not supported | No workshop forgot password flow |
| Mechanic | ❌ Not supported | Must use admin-assisted reset |
| Admin | ❌ Not supported | Must use scripts or contact platform owner |

---

## 7. SOURCE OF TRUTH INCONSISTENCIES

### 7.1 Email Storage

**Problem:** Email duplicated across 3 tables

| Table | Field | Unique? | Source of Truth? |
|-------|-------|---------|------------------|
| auth.users | email | ✅ Yes | ✅ PRIMARY |
| profiles | email | ❌ No | ❌ Denormalized |
| mechanics | email | ✅ Yes | ❌ Denormalized |

**Issues:**
1. Email changes in auth.users don't auto-propagate
2. No database trigger to maintain consistency
3. mechanics.email has UNIQUE constraint (could conflict)

**Recommendation:**
- Use auth.users.email as single source
- Remove email from profiles and mechanics
- Use JOIN when needed: `profiles JOIN auth.users ON profiles.id = auth.users.id`

### 7.2 Location Fields

**Problem:** Inconsistent field names and duplication

#### profiles Table

```sql
-- BOTH exist (duplication)
postal_zip_code TEXT
postal_code TEXT

-- BOTH exist (duplication)
state_province TEXT
province TEXT
```

#### mechanics Table

```sql
-- BOTH exist (duplication)
state_province TEXT
province TEXT
```

**Impact:**
- ❌ Customer signup only sets `address_line1`, not `postal_code`
- ❌ Mechanic matching broken (can't match by postal code)
- ❌ Location-based queries fragmented

**Recommendation:**
- Standardize to `postal_code` and `province`
- Drop `postal_zip_code` and `state_province`
- Migration to copy data before drop

### 7.3 Name Fields

**Problem:** Different column names for same data

| Table | Field |
|-------|-------|
| profiles | full_name |
| mechanics | name |

**Recommendation:**
- Standardize to `full_name`
- Update mechanics table migration

### 7.4 Role vs Account Type

**Problem:** Overlapping but inconsistent systems

#### profiles.role

```typescript
type Role = 'customer' | 'mechanic' | 'admin' | 'workshop_admin'
```

- ❌ NO CHECK constraint (can be any string)
- Set during signup in `auth.users.raw_user_meta_data`
- Copied to profiles by trigger

#### profiles.account_type

```typescript
type AccountType = 'individual_customer' | 'corporate_customer' | 'workshop_customer'
```

- ✅ CHECK constraint enforced
- Only for customer-type accounts

#### mechanics.account_type

```typescript
type MechanicAccountType = 'independent_mechanic' | 'workshop_mechanic'
```

- ✅ CHECK constraint enforced
- Only for mechanic accounts

**Confusion:**
- `role` = functional role (what you can do)
- `account_type` = business relationship (how you signed up)

**Recommendation:**
- Add CHECK constraint to profiles.role
- Document clear distinction between role and account_type

### 7.5 Account Status

**Problem:** Multiple status fields with different meanings

#### profiles.account_status

```sql
account_status TEXT  -- ⚠️ NO CHECK constraint
```

**Common Values:**
- 'active'
- 'suspended'
- 'closed'

#### mechanics.account_status

```sql
account_status TEXT CHECK (account_status IN (
  'active', 'suspended', 'banned', 'pending'
))
```

#### mechanics.application_status

```sql
application_status TEXT CHECK (application_status IN (
  'draft', 'pending', 'under_review', 'approved', 'rejected', 'additional_info_required'
))
```

**Confusion:**
- `account_status` = current account state
- `application_status` = signup approval state

**Recommendation:**
- Add CHECK constraint to profiles.account_status
- Keep separate status fields (serve different purposes)

### 7.6 Stripe Account ID

**Problem:** Duplicated across tables

| Table | Field | Purpose |
|-------|-------|---------|
| profiles | stripe_account_id | Rare (only for customers with Connect) |
| mechanics | stripe_account_id | Common (all mechanics need payouts) |
| organizations | stripe_account_id | Workshops (Connect) |
| organizations | stripe_customer_id | B2B SaaS subscriptions |

**Recommendation:**
- Keep separate (different Stripe account types)
- profiles.stripe_account_id rarely used (consider removing)

---

## 8. CRITICAL ISSUES SUMMARY

### P0 - CRITICAL (Fix Immediately)

| Issue | Impact | Location | Fix |
|-------|--------|----------|-----|
| **Broken Password Reset** | Users can't reset passwords | /customer/reset-password doesn't exist | Create reset password page |
| **Mechanic Approval Emails Missing** | Mechanics don't know they're approved | approve/route.ts:60-61 | Implement email templates and sending |
| **Location Data Missing** | Mechanic matching broken | SignupGate.tsx:22-32 | Add postal_code to customer signup |
| **Duplicate Customer Signup** | Confusion, inconsistency | SignupGate.tsx vs customer/signup/page.tsx | Consolidate or remove one |

### P1 - HIGH PRIORITY (Fix Soon)

| Issue | Impact | Location | Fix |
|-------|--------|----------|-----|
| **No Self-Service Password Reset** | Poor UX for mechanics/admins/workshops | No forgot-password pages | Create forgot-password flows for all user types |
| **No Rate Limiting** | Spam vulnerability | forgot-password/route.ts | Implement passwordResetRateLimiter |
| **No Subscription Upgrades** | Can't change plans | No change-plan endpoint | Create subscription modification endpoint |
| **Source of Truth Conflicts** | Data inconsistency | Email, location fields duplicated | Database refactoring migration |
| **Workshop Mechanic Invitations Incomplete** | Can't add mechanics to team | Feature missing | Implement invitation flow |

### P2 - MEDIUM PRIORITY (Backlog)

| Issue | Impact | Location | Fix |
|-------|--------|----------|-----|
| **Inconsistent Onboarding Tracking** | Different systems per user type | Various | Unified onboarding table |
| **No CHECK Constraints** | profiles.role can be any string | profiles table | Add CHECK constraints |
| **Redundant Location Fields** | Confusion, duplication | postal_zip_code vs postal_code | Standardize field names |
| **No CAPTCHA** | Bot signup vulnerability | Signup forms | Add reCAPTCHA v3 |
| **TypeScript Errors** | @ts-nocheck used | approve/route.ts | Fix auth variable references |

---

## 9. RECOMMENDATIONS

### 9.1 Immediate Actions

**Week 1:**
1. ✅ Create `/customer/reset-password` page with token validation
2. ✅ Implement mechanic approval email templates
3. ✅ Add postal_code collection to customer signup
4. ✅ Implement rate limiting on password reset endpoint

**Week 2:**
5. ✅ Create forgot-password flows for mechanics, admins, workshops
6. ✅ Add "Forgot Password?" links to all login pages
7. ✅ Consolidate duplicate customer signup flows
8. ✅ Fix TypeScript errors in approval routes

### 9.2 Database Refactoring

**Phase 1: Location Fields**
```sql
-- Migration: Standardize location fields
ALTER TABLE profiles DROP COLUMN postal_zip_code;
ALTER TABLE profiles DROP COLUMN state_province;
ALTER TABLE mechanics DROP COLUMN state_province;

-- Ensure all code uses postal_code and province
```

**Phase 2: Email Deduplication**
```sql
-- Migration: Remove email from profiles and mechanics
ALTER TABLE profiles DROP COLUMN email;
ALTER TABLE mechanics DROP COLUMN email;

-- Update all queries to JOIN auth.users for email
```

**Phase 3: Add CHECK Constraints**
```sql
-- Migration: Add missing constraints
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'mechanic', 'admin', 'workshop_admin'));

ALTER TABLE profiles
  ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status IN ('active', 'suspended', 'closed'));
```

### 9.3 Feature Completeness

**Subscription Management:**
1. Create `POST /api/customer/subscriptions/change-plan` endpoint
2. Implement pro-rating calculation
3. Add Stripe subscription modification
4. Create credit migration logic

**Workshop Features:**
5. Complete workshop mechanic invitation flow
6. Implement bulk mechanic imports
7. Add workshop analytics dashboard
8. Create workshop-specific email templates

**Email System:**
9. Implement all TODO email templates
10. Add email retry logic for failures
11. Create email preview system for admins
12. Add email tracking (opens, clicks)

### 9.4 Security Enhancements

**High Priority:**
1. Add reCAPTCHA v3 to all signup forms
2. Implement rate limiting on all authentication endpoints
3. Add account lockout after failed login attempts
4. Enable MFA for admin accounts

**Medium Priority:**
5. Add password strength requirements to reset flow
6. Implement session timeout with auto-logout
7. Add IP-based suspicious activity detection
8. Create security audit log for all admin actions

### 9.5 UX Improvements

**Onboarding:**
1. Unified onboarding progress tracker across all user types
2. Interactive tutorials for first-time users
3. Contextual help tooltips
4. Progress indicators on multi-step forms

**Email:**
5. Standardize email design across all templates
6. Add email preferences center
7. Implement email digest options
8. Create SMS backup for critical notifications

**Dashboard:**
9. Role-appropriate welcome messages
10. Quick action buttons for common tasks
11. Contextual help based on account status
12. Personalized recommendations

---

## 10. APPENDIX: FILE REFERENCE INDEX

### Signup Flows

#### Customer
- [src/app/signup/page.tsx](src/app/signup/page.tsx) - Main signup landing
- [src/app/signup/SignupGate.tsx](src/app/signup/SignupGate.tsx) - Active signup form (661 lines)
- [src/app/customer/signup/page.tsx](src/app/customer/signup/page.tsx) - Inactive multi-step (985 lines)
- [src/app/api/customer/signup/route.ts](src/app/api/customer/signup/route.ts) - Signup API (252 lines)
- [src/app/customer/complete-profile/page.tsx](src/app/customer/complete-profile/page.tsx) - OAuth completion (290 lines)

#### Mechanic
- [src/app/mechanic/signup/page.tsx](src/app/mechanic/signup/page.tsx) - 6-step wizard (1269 lines)
- [src/app/api/mechanic/signup/route.ts](src/app/api/mechanic/signup/route.ts) - Signup API (359 lines)
- [src/app/mechanic/signup/success/page.tsx](src/app/mechanic/signup/success/page.tsx) - Success page

#### Workshop
- [src/app/workshop/signup/page.tsx](src/app/workshop/signup/page.tsx) - 4-step wizard (396 lines)
- [src/app/api/workshop/signup/route.ts](src/app/api/workshop/signup/route.ts) - Signup API (308 lines)
- [src/app/workshop/signup/success/page.tsx](src/app/workshop/signup/success/page.tsx) - Success page

### Database Schema
- [supabase/customer_auth_schema_v2.sql](supabase/customer_auth_schema_v2.sql) - profiles table
- [supabase_backup_/migrations/20250124000001_create_organizations.sql](supabase_backup_/migrations/20250124000001_create_organizations.sql) - organizations
- [supabase_backup_/migrations/20250124000002_create_organization_members.sql](supabase_backup_/migrations/20250124000002_create_organization_members.sql) - members
- [supabase_backup_/migrations/20250124000003_add_account_types.sql](supabase_backup_/migrations/20250124000003_add_account_types.sql) - account types
- [supabase/migrations/20251109000002_add_cooling_period.sql](supabase/migrations/20251109000002_add_cooling_period.sql) - cooling period
- [supabase/migrations/20251109000003_auto_create_org_membership.sql](supabase/migrations/20251109000003_auto_create_org_membership.sql) - owner membership

### Authorization
- [src/middleware.ts](src/middleware.ts) - Route protection (456 lines)
- [src/lib/auth/guards.ts](src/lib/auth/guards.ts) - Auth guards (619 lines)
- [src/lib/auth/sessionGuards.ts](src/lib/auth/sessionGuards.ts) - Session participant validation (179 lines)
- [src/lib/auth/permissions.ts](src/lib/auth/permissions.ts) - Workshop RBAC (362 lines)

### Approvals
- [src/app/admin/(shell)/mechanics/applications/page.tsx](src/app/admin/(shell)/mechanics/applications/page.tsx) - Mechanic approvals UI (524 lines)
- [src/app/api/admin/mechanics/[id]/approve/route.ts](src/app/api/admin/mechanics/[id]/approve/route.ts) - Approve API (74 lines)
- [src/app/api/admin/mechanics/[id]/reject/route.ts](src/app/api/admin/mechanics/[id]/reject/route.ts) - Reject API (76 lines)
- [src/app/admin/(shell)/workshops/applications/page.tsx](src/app/admin/(shell)/workshops/applications/page.tsx) - Workshop approvals UI (531 lines)
- [src/app/api/admin/workshops/[id]/approve/route.ts](src/app/api/admin/workshops/[id]/approve/route.ts) - Approve API (140 lines)
- [src/app/api/admin/workshops/[id]/reject/route.ts](src/app/api/admin/workshops/[id]/reject/route.ts) - Reject API (140 lines)

### Email System
- [src/lib/email/emailService.ts](src/lib/email/emailService.ts) - Core email service
- [src/lib/email/templates/bookingConfirmed.ts](src/lib/email/templates/bookingConfirmed.ts) - Booking confirmation
- [src/lib/email/templates/mechanicAssigned.ts](src/lib/email/templates/mechanicAssigned.ts) - Mechanic assignment
- [src/lib/email/templates/sessionStarting.ts](src/lib/email/templates/sessionStarting.ts) - Session reminder
- [src/lib/email/templates/sessionEnded.ts](src/lib/email/templates/sessionEnded.ts) - Session completion
- [src/lib/email/templates/summaryDelivered.ts](src/lib/email/templates/summaryDelivered.ts) - Summary delivery
- [src/lib/email/workshopTemplates.ts](src/lib/email/workshopTemplates.ts) - Workshop emails

### Notifications
- [supabase/migrations_backup/20251029000001_create_notifications_table.sql](supabase/migrations_backup/20251029000001_create_notifications_table.sql) - Notifications schema
- [src/components/notifications/NotificationBell.tsx](src/components/notifications/NotificationBell.tsx) - Notification UI
- [src/components/notifications/NotificationCenter.tsx](src/components/notifications/NotificationCenter.tsx) - Notification center
- [src/lib/browserNotifications.ts](src/lib/browserNotifications.ts) - Browser push notifications

### Password Reset
- [src/app/(auth)/forgot-password/page.tsx](src/app/(auth)/forgot-password/page.tsx) - Forgot password UI
- [src/app/api/customer/forgot-password/route.ts](src/app/api/customer/forgot-password/route.ts) - Reset API
- [src/app/api/admin/users/[id]/reset-password/route.ts](src/app/api/admin/users/[id]/reset-password/route.ts) - Admin reset
- [src/lib/ratelimit.ts](src/lib/ratelimit.ts) - Rate limiting (83-94)

### Account Transitions
- [src/app/api/mechanic/workshop-signup/route.ts](src/app/api/mechanic/workshop-signup/route.ts) - Workshop invitation acceptance
- [src/app/api/workshop/mechanics/[mechanicId]/remove/route.ts](src/app/api/workshop/mechanics/[mechanicId]/remove/route.ts) - Workshop removal
- [src/app/api/customer/subscriptions/route.ts](src/app/api/customer/subscriptions/route.ts) - Subscription management
- [src/app/api/customer/subscriptions/cancel/route.ts](src/app/api/customer/subscriptions/cancel/route.ts) - Subscription cancel

### Type Definitions
- [src/types/supabase.ts](src/types/supabase.ts) - Database types (2310-3600)
- [src/types/mechanic.ts](src/types/mechanic.ts) - Mechanic types (338 lines)

---

**End of Report**

This comprehensive analysis covers all aspects of the signup process for all three user types (customer, mechanic, workshop), including business logic, database schema, APIs, emails, notifications, authorizations, approvals, account transitions, and password reset flows.

**Key Takeaway:** The platform has a well-architected foundation but suffers from critical gaps in email notifications, password reset functionality, and data consistency that need immediate attention before scaling.