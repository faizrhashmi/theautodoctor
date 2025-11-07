# Signup Flow Analysis: B2C → B2B2C → B2B SaaS Transition

**Date**: 2025-10-24
**Focus**: Identify problems blocking smooth business model transitions
**Related**: [FEATURE_TOGGLE_STRATEGY.md](./FEATURE_TOGGLE_STRATEGY.md), [AUTH_STRATEGY_BEST_PRACTICES.md](./AUTH_STRATEGY_BEST_PRACTICES.md)

---

## Executive Summary

Your current signup flows are **designed for pure B2C** and will create major friction when transitioning to B2B2C (workshops) and B2B SaaS models.

**Critical Problems**:
1. ❌ **No account type tracking** - Can't differentiate B2C vs B2B2C vs B2B SaaS customers
2. ❌ **Mechanic signup assumes independence** - No workshop affiliation path
3. ❌ **Corporate signup is a dead-end** - Creates leads, not functional accounts
4. ❌ **Payment model conflicts** - Individual Stripe accounts conflict with workshop splits
5. ❌ **No multi-user support** - Corporate accounts can't manage teams

**Impact**: Without fixing these, you'll need to **rewrite signup flows** for each business model transition instead of using toggles.

**Recommendation**: Implement a **unified account architecture** with role/source tracking that works across all three models.

---

## Table of Contents

1. [Business Model Evolution](#business-model-evolution)
2. [Current Signup Flows Analysis](#current-signup-flows-analysis)
3. [Critical Problems by Model](#critical-problems-by-model)
4. [Unified Account Architecture](#unified-account-architecture)
5. [Recommended Signup Flows](#recommended-signup-flows)
6. [Database Schema Changes](#database-schema-changes)
7. [Feature Toggle Integration](#feature-toggle-integration)
8. [Implementation Roadmap](#implementation-roadmap)

---

## Business Model Evolution

### Phase 1: B2C (Current)
**Model**: Individual customers book individual mechanics

**Actors**:
- **Customer** (individual) → **Mechanic** (independent contractor)

**Signup Flows**:
- ✅ Customer signup (SignupGate + customer/signup)
- ✅ Mechanic signup (6-step application)
- ⚠️ Corporate signup (creates lead, not account)

**Revenue**: Commission on customer → mechanic transactions (15-20%)

---

### Phase 2: B2B2C (Future - Workshops)
**Model**: Customers book through workshops who provide mechanics

**Actors**:
- **Customer** (individual) → **Workshop** (business) → **Mechanic** (workshop employee/affiliate)

**New Signup Flows Needed**:
- ❌ Workshop admin signup
- ❌ Workshop-invited mechanic signup (simplified)
- ❌ Customer booking through workshop referral

**Revenue**: Commission on customer payments, split with workshop (Platform 15%, Workshop 10%, Mechanic 75%)

---

### Phase 3: B2B SaaS (Future - Workshops as Customers)
**Model**: Workshops use platform as their management software

**Actors**:
- **Workshop** (SaaS subscriber) → Manages own mechanics and customers

**New Signup Flows Needed**:
- ❌ Workshop SaaS subscription signup
- ❌ Workshop bulk-imports mechanics
- ❌ Workshop bulk-imports corporate customers

**Revenue**: Monthly SaaS subscription ($99-$499/mo) + transaction fees

---

## Current Signup Flows Analysis

### 1. Customer Signup (SignupGate)

**File**: [src/app/signup/SignupGate.tsx](src/app/signup/SignupGate.tsx)

**Current Flow**:
```
1. User fills form (name, phone, DOB, address, email, password)
2. Accepts waiver (18+ certification)
3. Creates Supabase auth user with metadata:
   - role: "customer" (HARD-CODED)
   - full_name, phone, vehicle_hint, date_of_birth, address, city, country
4. Email verification required
5. Redirect to customer dashboard
```

**Problems for B2B2C/B2B SaaS**:

| Problem | Impact | Business Model Affected |
|---------|--------|-------------------------|
| **Hard-coded role: "customer"** | Can't differentiate individual vs corporate customer | B2B2C, B2B SaaS |
| **No account type field** | Can't track if customer came through workshop referral | B2B2C |
| **No parent account relationship** | Corporate accounts can't link sub-users | B2B SaaS |
| **No workshop_id tracking** | Can't assign customer to originating workshop | B2B2C |
| **No source attribution** | Can't track if customer is workshop-referred vs direct | B2B2C |
| **Single-user model** | Corporate customers can't add team members | B2B SaaS |

**Current Database Entry**:
```json
{
  "id": "uuid",
  "email": "customer@example.com",
  "user_metadata": {
    "role": "customer", // ← HARD-CODED
    "full_name": "John Doe",
    "phone": "+1234567890"
  }
}
```

**What's Missing**:
```json
{
  "account_type": "individual" | "corporate" | "workshop_customer",
  "source": "direct" | "workshop_referral" | "corporate_parent",
  "parent_account_id": null, // For sub-accounts
  "workshop_id": null, // If referred by workshop
  "organization_name": null // For corporate accounts
}
```

---

### 2. Customer Signup (Detailed)

**File**: [src/app/customer/signup/page.tsx](src/app/customer/signup/page.tsx)

**Current Flow** (3-step):
```
Step 1: Account Details (name, email, phone, password)
Step 2: Address + Preferences (language, referral source, newsletter)
Step 3: Confirmation + Waiver
```

**Problems for B2B2C/B2B SaaS**:

| Problem | Impact | Business Model Affected |
|---------|--------|-------------------------|
| **Referral source dropdown only** | Can't capture workshop referral code | B2B2C |
| **No workshop selection** | Can't choose preferred workshop | B2B2C |
| **No corporate account option** | Individual signup only | B2B SaaS |
| **No team invitation flow** | Can't join existing corporate account | B2B SaaS |

**Referral Source Dropdown** (Current):
```typescript
const REFERRAL_SOURCES = [
  'Google Search',
  'Social Media',
  'Friend or Family',
  'Online Ad',
  'YouTube',
  'Blog or Article',
  'Other',
]
```

**What's Missing**:
- "Workshop Referral" option with workshop selection dropdown
- "Corporate Team Invitation" option with invite code
- Workshop-specific signup URL like `/signup?workshop=abc-auto-shop&code=XYZ123`

---

### 3. Corporate Signup

**File**: [src/app/corporate/signup/page.tsx](src/app/corporate/signup/page.tsx)

**Current Flow**:
```
1. Company info (name, email, phone, website)
2. Business details (type, industry, fleet size)
3. Address
4. Primary contact person
5. Additional info (registration #, tax ID, usage estimates)
6. Submit application → CREATES LEAD (not account)
7. Sales team follows up
```

**Problems for B2B2C/B2B SaaS**:

| Problem | Impact | Business Model Affected |
|---------|--------|-------------------------|
| **Creates lead, not account** | Can't log in immediately | B2B SaaS |
| **No account activation path** | Manual sales process required | B2B SaaS |
| **No auto-provisioning** | Can't self-serve activate | B2B SaaS |
| **No user creation** | Primary contact doesn't get login | B2B SaaS |
| **No team management** | Can't invite additional users | B2B SaaS |
| **Sales-only flow** | Can't convert to self-serve SaaS | B2B SaaS |

**What Should Happen** (B2B SaaS model):
```
1. Company fills signup form
2. Creates corporate account (not lead)
3. Primary contact gets login credentials
4. Redirects to workspace setup:
   - Add team members
   - Import mechanics (CSV)
   - Set up billing
   - Configure settings
5. Activate subscription
6. Start using platform
```

**Current**: Lead → Sales call → Manual setup (2-3 weeks)
**Should Be**: Signup → Activate → Start using (15 minutes)

---

### 4. Mechanic Signup

**File**: [src/app/mechanic/signup/page.tsx](src/app/mechanic/signup/page.tsx)

**Current Flow** (6-step):
```
Step 1: Personal Info (name, email, phone, password, address, DOB, SIN)
Step 2: Credentials (years exp, specializations, Red Seal, certs)
Step 3: Shop Info (affiliation: independent/dealership/franchise/mobile)
Step 4: Insurance & Background (liability insurance, CRC)
Step 5: Banking (Stripe Connect notice)
Step 6: Review & Submit
```

**Problems for B2B2C**:

| Problem | Impact | Business Model Affected |
|---------|--------|-------------------------|
| **Assumes independent mechanic** | No workshop affiliation option | B2B2C |
| **Collects SIN for all** | Workshop employees don't need to provide SIN (workshop handles taxes) | B2B2C |
| **6 steps too long** | Workshop mechanics have simplified onboarding | B2B2C |
| **Direct Stripe Connect** | Conflicts with workshop payment splitting | B2B2C |
| **No invitation flow** | Can't join via workshop invite link | B2B2C |
| **Shop affiliation limited** | Options don't include "Workshop Affiliate" | B2B2C |

**Shop Affiliation Options** (Current):
```typescript
shopAffiliation: 'independent' | 'dealership' | 'franchise' | 'mobile'
```

**What's Missing**:
- `'workshop_employee'` - Mechanic employed by a workshop
- `'workshop_affiliate'` - Independent mechanic partnering with workshop
- Invite code input for workshop invitation
- Workshop-specific signup URL: `/mechanic/signup?workshop=abc-shop&invite=XYZ`

**Workshop Mechanic Onboarding Should Be**:
```
1. Mechanic clicks workshop invite link
2. Simple 2-step form:
   - Personal info (name, email, phone, password)
   - Accept terms
3. Workshop pre-verified:
   - Insurance (covered by workshop)
   - Background check (done by workshop)
   - Certifications (uploaded by workshop admin)
4. Immediate approval → Start working
```

**Current**: 6 steps, 20+ minutes, documents upload, admin review (2-3 days)
**Should Be** (workshop mechanics): 2 steps, 5 minutes, instant approval

---

### 5. Mechanic Signup (API)

**File**: [src/app/api/mechanic/signup/route.ts](src/app/api/mechanic/signup/route.ts)

**Current Code** (Simplified):
```typescript
export async function POST(req: NextRequest) {
  const formData = await req.json()

  // TODO: Implement proper encryption for SIN
  const sinEncrypted = formData.sin // ← Currently plain text!

  const { data: mechanic } = await supabase
    .from('mechanics')
    .insert({
      email: formData.email,
      full_name: formData.fullName,
      phone: formData.phone,
      sin_encrypted: sinEncrypted, // ← Should be encrypted
      // ... other fields
      application_status: 'pending',
      background_check_status: 'pending'
    })

  // Upload documents
  // Create mechanic_sessions token
  // Return success
}
```

**Problems**:

| Problem | Impact | Business Model Affected |
|---------|--------|-------------------------|
| **No workshop_id field** | Can't link mechanic to workshop | B2B2C |
| **No source tracking** | Can't tell if direct signup vs workshop invite | B2B2C |
| **application_status always 'pending'** | Workshop-invited mechanics should be auto-approved | B2B2C |
| **Collects SIN always** | Workshop employees don't need SIN collection | B2B2C |
| **One auth approach** | No differentiation for workshop employees | B2B2C |

---

## Critical Problems by Model

### B2C (Current) - Problems Even in Current Model

| # | Problem | Impact | Fix Priority |
|---|---------|--------|--------------|
| 1 | **SIN stored in plain text** | SECURITY RISK, LEGAL LIABILITY | 🔴 Critical |
| 2 | **OAuth disabled in signup** | Lower conversion rates | 🟡 High |
| 3 | **Corporate signup doesn't create accounts** | Sales friction | 🟢 Medium |
| 4 | **6-step mechanic signup too long** | 40-50% drop-off expected | 🟡 High |

---

### B2B2C (Workshops) - Blockers

| # | Problem | Why It Blocks B2B2C | Workaround? | Fix Required |
|---|---------|---------------------|-------------|--------------|
| 1 | **No workshop entity in database** | Can't create workshops | ❌ No | Add `workshops` table |
| 2 | **No workshop_id in mechanics table** | Can't link mechanic to workshop | ❌ No | Add `workshop_id` column |
| 3 | **No workshop_id in customers table** | Can't track workshop referrals | ⚠️ Partial (use metadata) | Add `referred_by_workshop_id` column |
| 4 | **Mechanic signup requires SIN** | Workshop employees shouldn't provide SIN | ⚠️ Partial (make optional) | Conditional SIN collection |
| 5 | **Direct Stripe Connect onboarding** | Conflicts with workshop payment splits | ❌ No | Workshop-aware payment setup |
| 6 | **No workshop invitation flow** | Can't invite mechanics | ❌ No | Create `/mechanic/signup/:inviteCode` flow |
| 7 | **No workshop signup flow** | Can't onboard workshops | ❌ No | Create `/workshop/signup` flow |

---

### B2B SaaS (Workshops as Customers) - Blockers

| # | Problem | Why It Blocks B2B SaaS | Workaround? | Fix Required |
|---|---------|------------------------|-------------|--------------|
| 1 | **Corporate signup creates lead, not account** | Can't self-serve activate | ❌ No | Auto-create account + workspace |
| 2 | **No multi-user/team management** | Corporate accounts single-user | ❌ No | Add organization members table |
| 3 | **No workspace concept** | Can't isolate corporate data | ❌ No | Add `workspaces` table |
| 4 | **No role hierarchy** | Can't have admin/member roles | ❌ No | Add `workspace_roles` enum |
| 5 | **No bulk import** | Can't import existing mechanics/customers | ⚠️ Partial (manual entry) | CSV import feature |
| 6 | **No subscription/billing** | Can't charge monthly SaaS fee | ❌ No | Stripe subscription integration |

---

## Unified Account Architecture

### Concept: One Signup System, Multiple Paths

Instead of separate signup flows for each business model, use a **unified architecture** with routing based on:
1. **Account type** (individual, corporate, workshop)
2. **User role** (customer, mechanic, workshop_admin, corporate_admin)
3. **Source** (direct, workshop_referral, invitation)

**Benefits**:
- ✅ **Toggle-friendly**: Enable/disable workshop or corporate features without rewriting signup
- ✅ **Scalable**: Add new account types without touching core signup logic
- ✅ **Consistent UX**: Similar onboarding experience across all types
- ✅ **Easier maintenance**: One codebase to maintain

---

### Database Schema: Account Types & Roles

**New Table: `account_types`** (Enum or lookup table)
```sql
CREATE TYPE account_type AS ENUM (
  'individual_customer',    -- B2C customer (current)
  'corporate_customer',     -- B2B customer (enterprise fleet)
  'workshop_customer',      -- B2B2C customer (booked through workshop)
  'individual_mechanic',    -- B2C mechanic (independent)
  'workshop_mechanic',      -- B2B2C mechanic (affiliated with workshop)
  'workshop_business',      -- B2B2C provider (workshop offering services)
  'platform_admin'          -- Admin
);
```

**New Table: `organizations`** (Workspaces for corporate/workshop accounts)
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_type TEXT NOT NULL CHECK (organization_type IN ('corporate', 'workshop')),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- For subdomain/URL: abc-auto-shop.askautodoctor.com

  -- Contact info
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,

  -- Address
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT,

  -- Business details
  business_registration_number TEXT,
  tax_id TEXT,
  industry TEXT,

  -- Workshop-specific
  coverage_postal_codes TEXT[], -- Areas workshop serves
  mechanic_capacity INTEGER, -- Max mechanics
  commission_rate DECIMAL(5,2) DEFAULT 10.00, -- Workshop's cut (%)

  -- Subscription (B2B SaaS)
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled')),
  subscription_tier TEXT CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Stripe Connect (for workshop payouts)
  stripe_account_id TEXT,
  stripe_account_status TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_type ON organizations(organization_type);
CREATE INDEX idx_organizations_subscription ON organizations(subscription_status, subscription_tier);
```

**New Table: `organization_members`** (Team management)
```sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}', -- Granular permissions

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'removed')),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  invite_code TEXT UNIQUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id, status);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_invite ON organization_members(invite_code);
```

**Update: `profiles` table**
```sql
ALTER TABLE profiles ADD COLUMN account_type TEXT
  CHECK (account_type IN ('individual_customer', 'corporate_customer', 'workshop_customer'));

ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id);

ALTER TABLE profiles ADD COLUMN source TEXT DEFAULT 'direct'
  CHECK (source IN ('direct', 'workshop_referral', 'invitation', 'import'));

ALTER TABLE profiles ADD COLUMN referred_by_workshop_id UUID REFERENCES organizations(id);

CREATE INDEX idx_profiles_account_type ON profiles(account_type);
CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_profiles_workshop_referral ON profiles(referred_by_workshop_id);
```

**Update: `mechanics` table**
```sql
ALTER TABLE mechanics ADD COLUMN account_type TEXT DEFAULT 'individual_mechanic'
  CHECK (account_type IN ('individual_mechanic', 'workshop_mechanic'));

ALTER TABLE mechanics ADD COLUMN workshop_id UUID REFERENCES organizations(id);

ALTER TABLE mechanics ADD COLUMN source TEXT DEFAULT 'direct'
  CHECK (source IN ('direct', 'workshop_invitation', 'import'));

ALTER TABLE mechanics ADD COLUMN requires_sin_collection BOOLEAN DEFAULT TRUE;

ALTER TABLE mechanics ADD COLUMN auto_approved BOOLEAN DEFAULT FALSE; -- For workshop invites

CREATE INDEX idx_mechanics_workshop ON mechanics(workshop_id);
CREATE INDEX idx_mechanics_account_type ON mechanics(account_type);
```

---

## Recommended Signup Flows

### Flow 1: Individual Customer Signup (B2C)

**URL**: `/signup` (default)

**Current**: ✅ Keep existing SignupGate flow

**Changes**:
```diff
+ Set account_type = 'individual_customer'
+ Set source = 'direct'
+ Set organization_id = null
```

**No breaking changes**. Works with toggle system.

---

### Flow 2: Workshop-Referred Customer Signup (B2B2C)

**URL**: `/signup?workshop=abc-auto-shop&ref=summer-promo`

**New Flow**:
```
1. Customer clicks workshop referral link
2. Pre-fills workshop name at top: "You're booking with ABC Auto Shop"
3. Same signup form as B2C
4. On submit:
   - Set account_type = 'workshop_customer'
   - Set referred_by_workshop_id = workshop.id
   - Set source = 'workshop_referral'
   - Set metadata.referral_code = 'summer-promo'
5. After signup, customer sees workshop-specific dashboard
6. Sessions automatically routed to workshop mechanics
```

**Visual Difference**:
```
┌─────────────────────────────────────────────────┐
│  🔧 Booking with ABC Auto Shop                  │
│  ─────────────────────────────────────────────  │
│                                                  │
│  [Normal signup form fields...]                 │
│                                                  │
│  ✓ Your session will be handled by certified   │
│    mechanics from ABC Auto Shop                 │
└─────────────────────────────────────────────────┘
```

**Toggle Check**:
```typescript
const workshopReferralsEnabled = await isFeatureEnabled('workshop_referrals', {
  workshopId: workshopSlug
})

if (!workshopReferralsEnabled) {
  // Redirect to normal signup
  router.push('/signup')
}
```

---

### Flow 3: Corporate Account Signup (B2B SaaS)

**URL**: `/corporate/signup`

**Current**: Creates lead only
**New**: Creates functional account + workspace

**Updated Flow**:
```
1. Company info (same as current)
2. Primary contact info
3. Submit → AUTO-CREATE:
   - Organization record
   - Auth user for primary contact
   - Organization member (role: 'owner')
   - Send email with login link
4. Redirect to workspace setup wizard:
   - Add logo
   - Invite team members
   - Import mechanics (CSV) [if applicable]
   - Set up billing
   - Activate subscription
5. Dashboard access granted
```

**Database Inserts**:
```typescript
// 1. Create organization
const { data: org } = await supabase.from('organizations').insert({
  organization_type: 'corporate',
  name: formData.companyName,
  slug: slugify(formData.companyName),
  email: formData.companyEmail,
  // ... other fields
  subscription_status: 'trial', // 14-day free trial
  subscription_tier: 'starter'
}).select().single()

// 2. Create auth user for primary contact
const { data: authUser } = await supabase.auth.signUp({
  email: formData.contactEmail,
  password: generateTempPassword(),
  options: {
    data: {
      role: 'corporate_admin',
      full_name: formData.contactName,
      organization_id: org.id
    },
    emailRedirectTo: `${origin}/corporate/onboarding`
  }
})

// 3. Link user to organization
await supabase.from('organization_members').insert({
  organization_id: org.id,
  user_id: authUser.user.id,
  role: 'owner',
  joined_at: new Date().toISOString()
})

// 4. Send welcome email with setup link
```

**Toggle Check**:
```typescript
const selfServeCorporateEnabled = await isFeatureEnabled('corporate_self_serve_signup')

if (!selfServeCorporateEnabled) {
  // Old flow: create lead, notify sales
  await createSalesLead(formData)
  router.push('/corporate/signup/success')
} else {
  // New flow: create account, redirect to onboarding
  await createCorporateAccount(formData)
  router.push('/corporate/onboarding')
}
```

---

### Flow 4: Workshop Signup (B2B2C Provider)

**URL**: `/workshop/signup` (NEW)

**Flow**:
```
1. Workshop business info:
   - Business name
   - Business email
   - Business phone
   - Website
   - Address
   - Business registration number
   - Tax ID
2. Coverage area:
   - Postal codes workshop serves
   - Service radius
3. Certifications & Insurance:
   - Business liability insurance
   - Certifications (optional)
4. Payout setup:
   - Stripe Connect onboarding
   - Bank account verification
5. Primary admin account:
   - Admin name
   - Admin email
   - Admin phone
   - Password
6. Review & Submit
7. Approval process (1-2 days)
8. Redirect to workshop dashboard
```

**Database Inserts**:
```typescript
const { data: org } = await supabase.from('organizations').insert({
  organization_type: 'workshop',
  name: formData.businessName,
  slug: slugify(formData.businessName),
  // ... other fields
  coverage_postal_codes: formData.postalCodes,
  mechanic_capacity: 10, // Default
  commission_rate: 10.00, // Workshop gets 10%
  subscription_status: null, // Workshops don't pay subscription (they earn commission)
}).select().single()

// Create admin user
const { data: authUser } = await supabase.auth.signUp({
  email: formData.adminEmail,
  password: formData.password,
  options: {
    data: {
      role: 'workshop_admin',
      full_name: formData.adminName,
      organization_id: org.id
    }
  }
})

// Link admin to workshop
await supabase.from('organization_members').insert({
  organization_id: org.id,
  user_id: authUser.user.id,
  role: 'owner'
})
```

**Toggle Check**:
```typescript
const workshopSignupEnabled = await isFeatureEnabled('workshop_signup')

if (!workshopSignupEnabled) {
  return <div>Workshop signups are not yet available. Please contact sales.</div>
}
```

---

### Flow 5: Workshop-Invited Mechanic Signup (B2B2C)

**URL**: `/mechanic/signup/:inviteCode` (NEW)

**Flow**:
```
1. Mechanic clicks invite link from workshop
2. Pre-filled workshop name: "Join ABC Auto Shop"
3. Simplified 2-step form:
   Step 1: Personal info (name, email, phone, password, address)
   Step 2: Accept terms
4. NO document upload (workshop handles verification)
5. NO insurance upload (covered by workshop)
6. NO SIN collection (workshop handles taxes)
7. Immediate approval (auto_approved = true)
8. Redirect to mechanic dashboard
```

**Database Inserts**:
```typescript
// Verify invite code
const { data: invite } = await supabase
  .from('organization_members')
  .select('*, organizations(*)')
  .eq('invite_code', inviteCode)
  .single()

if (!invite || invite.status !== 'active') {
  throw new Error('Invalid or expired invitation')
}

// Create mechanic
const { data: mechanic } = await supabase.from('mechanics').insert({
  email: formData.email,
  full_name: formData.fullName,
  phone: formData.phone,
  workshop_id: invite.organization_id, // ← Link to workshop
  account_type: 'workshop_mechanic',
  source: 'workshop_invitation',
  requires_sin_collection: false, // ← Workshop handles taxes
  auto_approved: true, // ← Skip admin review
  application_status: 'approved',
  background_check_status: 'verified_by_workshop'
}).select().single()

// Mark invite as used
await supabase.from('organization_members').update({
  user_id: authUser.user.id,
  joined_at: new Date().toISOString()
}).eq('id', invite.id)
```

**Toggle Check**:
```typescript
const workshopMechanicInvitesEnabled = await isFeatureEnabled('workshop_mechanic_invites', {
  workshopId: invite.organization_id
})

if (!workshopMechanicInvitesEnabled) {
  // Redirect to normal mechanic signup
  router.push('/mechanic/signup')
}
```

---

### Flow 6: Independent Mechanic Signup (B2C)

**URL**: `/mechanic/signup` (existing)

**Current**: ✅ Keep existing 6-step flow

**Changes**:
```diff
+ Set account_type = 'individual_mechanic'
+ Set source = 'direct'
+ Set workshop_id = null
+ Set requires_sin_collection = true
```

**Toggle Integration**:
```typescript
// In Step 3: Shop Information
const workshopAffiliationEnabled = await isFeatureEnabled('workshop_mechanic_affiliation')

if (workshopAffiliationEnabled) {
  // Show additional option: "I'm affiliated with a workshop"
  // If selected, show workshop search/selection
  // Still go through full onboarding but link to workshop
}
```

---

## Database Schema Changes

### Migration 1: Add Account Type Tracking

```sql
-- File: 20250124_add_account_types.sql

-- Add account type to profiles
ALTER TABLE profiles
  ADD COLUMN account_type TEXT
    CHECK (account_type IN ('individual_customer', 'corporate_customer', 'workshop_customer')),
  ADD COLUMN organization_id UUID REFERENCES organizations(id),
  ADD COLUMN source TEXT DEFAULT 'direct'
    CHECK (source IN ('direct', 'workshop_referral', 'invitation', 'import')),
  ADD COLUMN referred_by_workshop_id UUID REFERENCES organizations(id);

-- Set default for existing users
UPDATE profiles SET account_type = 'individual_customer' WHERE account_type IS NULL;
ALTER TABLE profiles ALTER COLUMN account_type SET DEFAULT 'individual_customer';

-- Indexes
CREATE INDEX idx_profiles_account_type ON profiles(account_type);
CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_profiles_workshop_referral ON profiles(referred_by_workshop_id);

-- Add account type to mechanics
ALTER TABLE mechanics
  ADD COLUMN account_type TEXT DEFAULT 'individual_mechanic'
    CHECK (account_type IN ('individual_mechanic', 'workshop_mechanic')),
  ADD COLUMN workshop_id UUID REFERENCES organizations(id),
  ADD COLUMN source TEXT DEFAULT 'direct'
    CHECK (source IN ('direct', 'workshop_invitation', 'import')),
  ADD COLUMN requires_sin_collection BOOLEAN DEFAULT TRUE,
  ADD COLUMN auto_approved BOOLEAN DEFAULT FALSE;

-- Indexes
CREATE INDEX idx_mechanics_workshop ON mechanics(workshop_id);
CREATE INDEX idx_mechanics_account_type ON mechanics(account_type);
```

---

### Migration 2: Create Organizations Table

```sql
-- File: 20250124_create_organizations.sql

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_type TEXT NOT NULL CHECK (organization_type IN ('corporate', 'workshop')),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  -- Contact
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,

  -- Address
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Canada',

  -- Business
  business_registration_number TEXT,
  tax_id TEXT,
  industry TEXT,

  -- Workshop-specific
  coverage_postal_codes TEXT[],
  mechanic_capacity INTEGER DEFAULT 10,
  commission_rate DECIMAL(5,2) DEFAULT 10.00,

  -- Subscription (Corporate)
  subscription_status TEXT DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled')),
  subscription_tier TEXT
    CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Stripe Connect (Workshop)
  stripe_account_id TEXT,
  stripe_account_status TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_type ON organizations(organization_type);
CREATE INDEX idx_organizations_subscription ON organizations(subscription_status, subscription_tier);
CREATE INDEX idx_organizations_coverage ON organizations USING GIN (coverage_postal_codes);

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Organization members can view their organization
CREATE POLICY "Organization members can view their org"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can modify organizations
CREATE POLICY "Organization admins can update"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
```

---

### Migration 3: Create Organization Members Table

```sql
-- File: 20250124_create_organization_members.sql

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',

  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended', 'removed')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  invite_expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, user_id)
);

-- Indexes
CREATE INDEX idx_org_members_org ON organization_members(organization_id, status);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_invite ON organization_members(invite_code, status);

-- RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Members can view other members in their organization
CREATE POLICY "Organization members can view members"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can add/remove members
CREATE POLICY "Admins can manage members"
  ON organization_members FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
```

---

## Feature Toggle Integration

### Toggle Points in Signup Flows

**1. Workshop Referral Signup**
```typescript
// In SignupGate.tsx
const workshopSlug = searchParams.get('workshop')

if (workshopSlug) {
  const enabled = await isFeatureEnabled('workshop_referrals', {
    workshopId: workshopSlug
  })

  if (!enabled) {
    router.push('/signup') // Redirect to normal signup
  }
}
```

**2. Corporate Self-Serve Signup**
```typescript
// In corporate/signup/page.tsx
const selfServeEnabled = await isFeatureEnabled('corporate_self_serve')

if (!selfServeEnabled) {
  // Old flow: create lead
  await createLead(formData)
  router.push('/corporate/signup/success')
} else {
  // New flow: create account
  await createAccount(formData)
  router.push('/corporate/onboarding')
}
```

**3. Workshop Mechanic Invitations**
```typescript
// In mechanic/signup/[inviteCode]/page.tsx
const workshopInvitesEnabled = await isFeatureEnabled('workshop_mechanic_invites')

if (!workshopInvitesEnabled) {
  return <div>Workshop invitations are not yet available</div>
}
```

**4. Workshop Signup**
```typescript
// In workshop/signup/page.tsx
const workshopSignupEnabled = await isFeatureEnabled('workshop_signup')

if (!workshopSignupEnabled) {
  return <div>Workshop signups coming soon. Contact sales for early access.</div>
}
```

---

### Feature Toggle Definitions

Add to `feature_toggles` table seed:

```sql
INSERT INTO feature_toggles (feature_key, display_name, description, enabled, rollout_strategy) VALUES
  -- B2B2C Workshop Features
  ('workshop_signup', 'Workshop Account Signup', 'Allow workshops to create accounts and onboard', false, 'all'),
  ('workshop_referrals', 'Workshop Customer Referrals', 'Allow customers to sign up via workshop referral links', false, 'whitelist'),
  ('workshop_mechanic_invites', 'Workshop Mechanic Invitations', 'Allow workshops to invite mechanics with simplified onboarding', false, 'whitelist'),
  ('workshop_mechanic_affiliation', 'Mechanic Workshop Affiliation', 'Allow independent mechanics to affiliate with workshops during signup', false, 'all'),

  -- B2B SaaS Corporate Features
  ('corporate_self_serve', 'Corporate Self-Serve Signup', 'Allow corporate accounts to sign up and activate without sales call', false, 'all'),
  ('corporate_team_management', 'Corporate Team Management', 'Allow corporate accounts to invite and manage team members', false, 'all'),
  ('corporate_bulk_import', 'Corporate Bulk Import', 'Allow corporate accounts to import mechanics/customers via CSV', false, 'all');
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Goal**: Add account type tracking without breaking existing flows

**Tasks**:
1. ✅ Run migrations:
   - Add account_type columns to profiles and mechanics
   - Create organizations table
   - Create organization_members table
2. ✅ Update existing signup flows to set account_type:
   - Customer signup → 'individual_customer'
   - Mechanic signup → 'individual_mechanic'
3. ✅ Backfill existing data:
   - Set all existing customers to 'individual_customer'
   - Set all existing mechanics to 'individual_mechanic'
4. ✅ Add feature toggles (all disabled)

**Validation**:
- [ ] All existing signups still work
- [ ] No breaking changes to user experience
- [ ] All existing users have account_type set

---

### Phase 2: Workshop Infrastructure (Week 3-6)
**Goal**: Build workshop signup and mechanic invitation flows

**Tasks**:
1. ✅ Create workshop signup page ([/workshop/signup](src/app/workshop/signup/page.tsx))
2. ✅ Create workshop admin dashboard
3. ✅ Create mechanic invitation flow:
   - Generate invite codes
   - Email invite links
   - Simplified signup page
4. ✅ Create workshop mechanic list page
5. ✅ Test end-to-end:
   - Workshop signs up
   - Workshop invites mechanic
   - Mechanic accepts invitation
   - Mechanic linked to workshop

**Feature Toggles**:
- Enable `workshop_signup` for beta workshops (whitelist)
- Enable `workshop_mechanic_invites` for beta workshops

---

### Phase 3: Workshop Referral System (Week 7-8)
**Goal**: Allow workshops to refer customers

**Tasks**:
1. ✅ Create workshop referral link generator
2. ✅ Update customer signup to detect workshop referrals
3. ✅ Add workshop branding to signup page
4. ✅ Update session assignment to prioritize workshop mechanics
5. ✅ Create workshop dashboard: view referred customers

**Feature Toggles**:
- Enable `workshop_referrals` for beta workshops

---

### Phase 4: Corporate Self-Serve (Week 9-10)
**Goal**: Allow corporate accounts to sign up and activate instantly

**Tasks**:
1. ✅ Update corporate signup to create account (not lead)
2. ✅ Create corporate onboarding wizard:
   - Upload logo
   - Invite team members
   - Set up billing
3. ✅ Create team member invitation flow
4. ✅ Create team management dashboard
5. ✅ Integrate Stripe subscriptions

**Feature Toggles**:
- Enable `corporate_self_serve` globally
- Enable `corporate_team_management` globally

---

### Phase 5: Gradual Rollout (Week 11-12)
**Goal**: Enable features for all users

**Tasks**:
1. ✅ Monitor workshop signups (10% → 50% → 100%)
2. ✅ Monitor corporate signups
3. ✅ Collect feedback and iterate
4. ✅ Enable all toggles globally

---

## Summary & Next Steps

### Current State: ❌ Not Ready for B2B2C/B2B SaaS

**Blockers**:
1. No account type differentiation
2. No workshop entity in database
3. No workshop-mechanic linking
4. Corporate signup doesn't create accounts
5. Mechanic signup assumes independence

**Impact**: Cannot transition to B2B2C or B2B SaaS without rewriting signup flows

---

### Recommended State: ✅ Toggle-Ready Unified Architecture

**Changes**:
1. Add `account_type` to profiles and mechanics
2. Create `organizations` table (workshops + corporate)
3. Create `organization_members` table (team management)
4. Add workshop signup flow
5. Add workshop mechanic invitation flow
6. Add workshop referral tracking
7. Update corporate signup to create accounts
8. Integrate with feature toggle system

**Impact**: Can transition between business models by toggling features on/off without code changes

---

### Implementation Priority

**Critical (Do First)**:
1. Database schema migrations (account_type, organizations)
2. Backfill existing data
3. Update existing signups to set account_type

**High Priority (Needed for B2B2C)**:
1. Workshop signup flow
2. Workshop mechanic invitation
3. Workshop referral tracking

**Medium Priority (Needed for B2B SaaS)**:
1. Corporate self-serve signup
2. Team management
3. Bulk import

---

**Ready to proceed?** Start with Phase 1 (Foundation) to prepare your architecture for smooth transitions.
