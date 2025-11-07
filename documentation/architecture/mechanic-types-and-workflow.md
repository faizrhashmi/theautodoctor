# Mechanic Types and Workflow

**Date:** November 7, 2025
**Status:** ✅ Documented
**Context:** Analysis from escalation system implementation

## Overview

TheAutoDoctor supports two distinct types of mechanics with different capabilities, workflows, and business models. Understanding these types is critical for implementing features correctly.

## Mechanic Types

### 1. Virtual-Only Mechanics

**Profile:**
- Independent contractors working remotely
- Conduct video-based diagnostics
- Cannot perform physical repairs
- Serve customers nationwide

**Capabilities:**
- ✅ Accept diagnostic requests
- ✅ Conduct 15-60 minute video sessions
- ✅ Submit diagnosis and recommendations
- ✅ Escalate to workshops for repairs
- ✅ Earn referral fees (5%)
- ❌ Cannot create repair quotes themselves
- ❌ Cannot perform physical work
- ❌ No workshop affiliation required

**Revenue Model:**
```
Diagnostic Session: $25 base
Referral Fee: 5% of approved repairs
Example: $25 + ($1,200 × 5%) = $85 total
```

**Database Fields:**
```typescript
{
  service_tier: 'virtual_only',
  partnership_type: 'none',
  can_perform_physical_work: false,
  prefers_virtual: true,
  prefers_physical: false,
  workshop_id: null
}
```

**File:** [src/app/api/mechanics/onboarding/service-tier/route.ts](../../src/app/api/mechanics/onboarding/service-tier/route.ts:135-142)

```typescript
if (service_tier === 'virtual_only') {
  // Virtual-only mechanics
  updates.partnership_type = 'none'
  updates.can_perform_physical_work = false
  updates.prefers_virtual = true
  updates.prefers_physical = false
}
```

### 2. Workshop Partner Mechanics

**Profile:**
- Affiliated with a physical workshop
- Conduct virtual diagnostics AND physical repairs
- Work on-site at workshop location
- Serve local customers primarily

**Capabilities:**
- ✅ Accept diagnostic requests
- ✅ Conduct video sessions
- ✅ Submit diagnosis
- ✅ Perform physical repairs (at workshop)
- ✅ Work with workshop service advisors
- ✅ Access workshop tools and bays
- ❌ Cannot create quotes (only service advisors can)

**Revenue Model:**
```
Diagnostic Session: Split with workshop
Physical Repair: Hourly wage from workshop
(Revenue split negotiated by workshop)
```

**Database Fields:**
```typescript
{
  service_tier: 'workshop_partner',
  partnership_type: 'employee',
  can_perform_physical_work: true,
  prefers_physical: true,
  workshop_id: 'uuid', // Required
  workshop_role: 'mechanic'
}
```

**File:** [src/app/api/mechanics/onboarding/service-tier/route.ts](../../src/app/api/mechanics/onboarding/service-tier/route.ts:144-156)

```typescript
else if (service_tier === 'workshop_partner') {
  // Workshop partner - need workshop affiliation
  // If they already have a workshop_id, set them as employee
  if (mechanic.workshop_id) {
    updates.partnership_type = 'employee'
    updates.can_perform_physical_work = true
    updates.prefers_physical = true
  } else {
    // No workshop yet - they need to find a partner
    updates.partnership_type = 'none'
    updates.can_perform_physical_work = false
    updates.prefers_physical = true
  }
}
```

## Workshop Roles

Mechanics affiliated with workshops have additional role-based permissions.

### Role Hierarchy

```
Workshop Owner
  ↓ (Full control)
Admin
  ↓ (Management permissions)
Service Advisor
  ↓ (Quote creation only)
Mechanic
  ↓ (Diagnostics only)
```

### Role Permissions Matrix

| Permission | Owner | Admin | Service Advisor | Mechanic |
|------------|-------|-------|-----------------|----------|
| Diagnose vehicles | ✅ | ❌ | ❌ | ✅ |
| Create quotes | ✅ | ❌ | ✅ | ❌ |
| See pricing | ✅ | ❌ | ✅ | ❌ |
| Manage mechanics | ✅ | ✅ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ❌ | ❌ |
| Manage settings | ✅ | ✅ | ❌ | ❌ |

**File:** [src/lib/auth/permissions.ts](../../src/lib/auth/permissions.ts:29-62)

```typescript
export const ROLE_PERMISSIONS: Record<WorkshopRole, RolePermissions> = {
  owner: {
    can_diagnose: true,
    can_send_quotes: true,
    can_see_pricing: true,
    can_manage_mechanics: true,
    can_view_analytics: true,
    can_manage_settings: true
  },
  service_advisor: {
    can_diagnose: false, // Service advisors don't diagnose
    can_send_quotes: true,
    can_see_pricing: true,
    can_manage_mechanics: false,
    can_view_analytics: false,
    can_manage_settings: false
  },
  mechanic: {
    can_diagnose: true,
    can_send_quotes: false, // Mechanics don't send quotes
    can_see_pricing: false, // Mechanics don't see pricing
    can_manage_mechanics: false,
    can_view_analytics: false,
    can_manage_settings: false
  }
}
```

### Role Definitions

#### Owner
- **Purpose:** Business owner with full control
- **Typical User:** Workshop owner/manager
- **Key Functions:**
  - Diagnose vehicles (if certified mechanic)
  - Create and approve quotes
  - Manage all mechanics and staff
  - View business analytics
  - Configure workshop settings
  - Invite new team members

#### Admin
- **Purpose:** Workshop manager without quote permissions
- **Typical User:** Shop manager, team lead
- **Key Functions:**
  - Manage mechanics and scheduling
  - View analytics and performance
  - Configure operational settings
  - Cannot create quotes (financial control)

#### Service Advisor
- **Purpose:** Customer-facing quote specialist
- **Typical User:** Service writer, customer service rep
- **Key Functions:**
  - Create repair quotes
  - See pricing and margins
  - Communicate with customers
  - Accept escalated sessions
  - Cannot diagnose (technical work)

#### Mechanic
- **Purpose:** Technical diagnostic specialist
- **Typical User:** Certified mechanic
- **Key Functions:**
  - Conduct diagnostics
  - Submit findings and recommendations
  - Cannot create quotes (business decision)
  - Cannot see pricing (operational separation)

## Workflows

### Virtual-Only Mechanic Workflow

```
1. Customer requests diagnostic
   ↓
2. Mechanic accepts request
   ↓
3. Video session (15-60 minutes)
   ↓
4. Mechanic submits diagnosis
   ↓
5A. OPTION A: Escalate to workshop
    → Workshop creates quote
    → Customer approves
    → Mechanic earns 5% referral

5B. OPTION B (FUTURE): Create quote with partnership
    → Mechanic has pre-approved partnership
    → Creates quote directly
    → Earns higher percentage
```

### Workshop Partner Mechanic Workflow

```
1. Customer requests diagnostic
   ↓
2. Mechanic accepts request
   ↓
3. Video session (15-60 minutes)
   ↓
4. Mechanic submits diagnosis
   ↓
5. Mechanic suggests next steps:
   → "Visit workshop in person" (physical inspection)
   → "Escalate to service advisor" (quote needed)
   ↓
6. Service advisor creates quote
   ↓
7. Customer approves
   ↓
8. Mechanic performs repair at workshop
```

## Sign-Up Flows

### Virtual-Only Mechanic Sign-Up

**File:** [src/app/mechanic/signup/page.tsx](../../src/app/mechanic/signup/page.tsx)

**Steps:**
1. Create account (email, password, basic info)
2. Select service tier: "Virtual Only"
3. Complete certifications
4. Upload documents (driver's license, certifications)
5. Background check
6. Stripe Connect onboarding
7. Application review
8. Approval → Can accept sessions

**Requirements:**
- Valid mechanic certifications
- Clean background check
- Stripe account for payments
- No workshop affiliation needed

### Workshop Mechanic Sign-Up

**File:** [src/app/api/mechanic/workshop-signup/route.ts](../../src/app/api/mechanic/workshop-signup/route.ts:94-142)

**Steps:**
1. Workshop sends invitation with code
2. Mechanic clicks invitation link
3. Create account with invitation code
4. Auto-assigned to workshop
5. Auto-approved (workshop vouches for them)
6. Select workshop role (mechanic/service advisor)
7. Can start immediately

**Code:**
```typescript
const { data: mech, error: mechError } = await supabaseAdmin
  .from('mechanics')
  .insert({
    name,
    email,
    phone,
    password_hash,
    date_of_birth: dateOfBirth,

    // Account type tracking (for B2B2C)
    account_type: 'workshop',
    source: 'workshop_invitation',
    workshop_id: invite.organization_id,
    invited_by: invite.organization_id,
    invite_accepted_at: new Date().toISOString(),
    requires_sin_collection: false, // Workshop mechanics are EXEMPT
    sin_encrypted: null,
    sin_collection_completed_at: null,
    auto_approved: true, // Auto-approve workshop mechanics

    // Application status - AUTO-APPROVED
    application_status: 'approved',
    background_check_status: 'pending',
    application_submitted_at: new Date().toISOString(),
    approval_date: new Date().toISOString(),
    current_step: 2,
  })
```

**Key Differences:**
- ✅ Auto-approved (workshop vouches)
- ✅ No SIN collection (workshop employee)
- ✅ Immediate access to platform
- ✅ Workshop ID pre-assigned

## User Feedback & Requirements

### User Statement (November 7, 2025)

> "FROM WHAT WE BUILT EXPLAIN ME THE MECHANIC ASSOCIATED WITH WORKSHOP, HOW ARE THEY SIGNING ON OUR PLATFORM AND HOW IS WORKSHOP HANDLING THAT"

> "I REMEMBER THE STRATEGY I PROPOSED WAS THAT THE MECHANIC CONDUCTS VIRTUAL DIAGNOSTICS, THEN SUGGESTS EITHER TO VISIT IN PERSON OR ESCALATES TO SERVICE ADVISOR FOR QUOTATION, AM I RIGHT?"

> "FOR VIRTUAL ITS GONNA BE A LITTLE DIFFERENT, HE CHECKS THE CAR, THEN IF HE HAS PARTNERSHIP WITH ANYONE, HE PREPARES THE QUOTE HIMSELF AND SENDS OVER TO THE PERSON AND IF THEY APPROVE, PLATFORM HANDLES THE REST"

### Clarified Strategy

**Workshop Mechanics:**
1. Conduct virtual diagnostics
2. Suggest: Visit in person OR escalate to service advisor
3. Service advisor creates quote
4. If approved, mechanic performs repair

**Virtual Mechanics (Current):**
1. Conduct diagnostics
2. Escalate to workshop
3. Workshop creates quote
4. Mechanic earns 5% referral

**Virtual Mechanics (Future - Partnership System):**
1. Conduct diagnostics
2. Has pre-approved partnership with workshop/supplier
3. Creates quote directly
4. Sends to customer
5. Platform handles transaction
6. Earns higher percentage

**See:** [Partnership System Future](../troubleshooting/partnership-system-future.md)

## Database Schema

### Mechanics Table

**Key Fields for Type Differentiation:**

```sql
CREATE TABLE mechanics (
  id UUID PRIMARY KEY,

  -- Account type
  service_tier TEXT, -- 'virtual_only' | 'workshop_partner'
  account_type TEXT, -- 'independent' | 'workshop' | 'corporate'

  -- Workshop affiliation
  workshop_id UUID REFERENCES organizations(id),
  workshop_role TEXT, -- 'owner' | 'admin' | 'service_advisor' | 'mechanic'
  partnership_type TEXT, -- 'none' | 'employee' | 'contractor' | 'partner'

  -- Capabilities
  can_perform_physical_work BOOLEAN,
  prefers_virtual BOOLEAN,
  prefers_physical BOOLEAN,

  -- Onboarding
  source TEXT, -- 'direct_signup' | 'workshop_invitation' | 'partnership'
  invited_by UUID,
  auto_approved BOOLEAN DEFAULT false
);
```

### Organizations Table (Workshops)

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  organization_type TEXT, -- 'workshop' | 'parts_supplier' | 'corporate'

  -- Workshop details
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  coverage_postal_codes TEXT[],
  service_radius_km INTEGER,

  -- Capacity
  mechanic_capacity INTEGER,

  -- Business
  commission_rate DECIMAL(5,2),
  stripe_account_id TEXT,

  -- Status
  status TEXT, -- 'pending' | 'active' | 'suspended'
  verification_status TEXT
);
```

## Quote Creation Authority

### Who Can Create Quotes?

**Virtual-Only Mechanics:**
- ❌ Cannot create quotes currently
- ✅ Can escalate to workshops
- 🔮 Future: Can create with partnership approval

**Workshop Mechanics:**
- ❌ Cannot create quotes
- ✅ Can escalate to service advisor
- ✅ Service advisor creates quote

**Service Advisors:**
- ✅ Can create quotes
- ✅ See pricing and margins
- ✅ Accept escalated sessions

**Workshop Owners:**
- ✅ Can create quotes
- ✅ Full pricing control
- ✅ Approve/reject service advisor quotes

### Quote Creation Flow

**File:** [src/app/api/workshop/quotes/create/route.ts](../../src/app/api/workshop/quotes/create/route.ts:108-143)

```typescript
const { data: quote, error: quoteError } = await supabaseAdmin
  .from('repair_quotes')
  .insert({
    customer_id: session.customer_id,
    diagnostic_session_id: diagnostic_session_id,
    workshop_id: session.workshop_id,
    mechanic_id: session.workshop_id ? null : session.mechanic_id,
    diagnosing_mechanic_id: session.mechanic_id,
    quoting_user_id: quotingUserId, // Service advisor or owner
    line_items: line_items,
    labor_cost: labor_cost,
    parts_cost: parts_cost,
    subtotal: subtotal,
    platform_fee_percent: platform_fee_percent,
    platform_fee_amount: platform_fee_amount,
    customer_total: customer_total,
    provider_receives: provider_receives,
    status: 'pending',
    sent_at: new Date().toISOString()
  })
```

**Key Points:**
- `diagnosing_mechanic_id`: Mechanic who did diagnostic
- `quoting_user_id`: Service advisor/owner who created quote
- `workshop_id`: Workshop providing the service
- Separates diagnostic from quote creation

## Earnings Models

### Virtual-Only Mechanic

**Per Session:**
```
Diagnostic: $25 base
Complexity bonus: +$0-5
Total diagnostic: $25-30

If escalated and approved:
Repair quote: $1,200 (example)
Referral fee: 5% = $60

TOTAL: $85-90 per customer
```

**Monthly Example:**
```
50 diagnostics @ $25 = $1,250
15 escalations × $800 × 5% = $600 referral

TOTAL: $1,850/month
```

### Workshop Mechanic

**Per Session:**
```
Diagnostic: Split with workshop (negotiated)
Example: $15 to mechanic, $10 to workshop

Physical repair: Hourly wage
Example: $30/hour × 4 hours = $120

TOTAL: $15 (diagnostic) + $120 (repair) = $135
```

**Monthly Example:**
```
20 diagnostics @ $15 = $300
10 repairs @ $120 avg = $1,200
Base salary: $3,000

TOTAL: $4,500/month
```

## Decision Tree: Which Type Am I?

```
Do you have a physical workshop?
├─ YES → Workshop Partner
│   ├─ Are you the owner?
│   │   └─ YES → Owner role
│   ├─ Do you create quotes?
│   │   └─ YES → Service Advisor role
│   └─ Do you only diagnose/repair?
│       └─ YES → Mechanic role
│
└─ NO → Virtual-Only
    ├─ Do you want to perform repairs?
    │   └─ YES → Consider workshop partnership
    └─ Do you only want to diagnose?
        └─ YES → Virtual-Only is perfect
```

## Migration Paths

### Virtual → Workshop Partner

**Scenario:** Virtual mechanic gets physical workshop

**Steps:**
1. Find workshop willing to partner
2. Workshop sends invitation
3. Mechanic accepts invitation
4. Account updated:
   ```typescript
   service_tier: 'workshop_partner'
   workshop_id: 'uuid'
   workshop_role: 'mechanic'
   can_perform_physical_work: true
   ```
5. Can now do physical repairs

### Workshop Mechanic → Virtual-Only

**Scenario:** Mechanic leaves workshop

**Steps:**
1. Workshop admin removes mechanic
2. Account updated:
   ```typescript
   workshop_id: null
   workshop_role: null
   service_tier: 'virtual_only'
   can_perform_physical_work: false
   ```
3. Back to virtual diagnostics only

## Common Misconceptions

### ❌ Myth: All mechanics can create quotes

**Reality:** Only service advisors and owners can create quotes. Regular mechanics (both virtual and workshop) cannot.

**Reason:** Business decision-making should be separate from technical diagnosis.

### ❌ Myth: Virtual mechanics can't earn as much

**Reality:** With escalation system, virtual mechanics can earn 3-4× more per customer through referral fees.

**Example:** $25 diagnostic + $60 referral = $85 total (vs. $25 before)

### ❌ Myth: Workshop mechanics are employees

**Reality:** Workshop mechanics can be employees OR contractors. The relationship is defined by the workshop.

**Platform's Role:** Platform doesn't dictate employment status, workshops do.

### ❌ Myth: You need a workshop to make good money

**Reality:** Virtual-only mechanics with high escalation rates can earn significant income without workshop overhead.

**Numbers:** 50 sessions/month × $85 avg = $4,250/month

## Future Enhancements

### Partnership System

**Status:** Planned for Phase 2

**Concept:** Virtual mechanics can form partnerships with workshops/suppliers and create quotes directly.

**Benefits:**
- Higher revenue for mechanics (keep more of quote)
- Faster quotes for customers
- Workshop gets pre-qualified referrals
- Platform maintains transaction control

**See:** [Partnership System Future](../troubleshooting/partnership-system-future.md)

### Corporate Mechanics

**Status:** Future consideration

**Concept:** Mechanics employed by corporate fleets for internal diagnostics.

**Use Case:** Company has fleet of vehicles, hires mechanics for diagnostics via platform.

## Related Documentation

- [Workshop Escalation System](../features/workshop-escalation-system.md) - Escalation implementation
- [Platform Retention Strategy](../business-strategy/platform-retention-strategy.md) - Why this matters
- [Workshop Escalation API](../api/workshop-escalation-api.md) - API reference
- [Partnership System Future](../troubleshooting/partnership-system-future.md) - Future plans

## Quick Reference

### Service Tier Selection

**File:** [src/app/mechanic/onboarding/service-tier/page.tsx](../../src/app/mechanic/onboarding/service-tier/page.tsx:27-51)

**Virtual-Only:**
- Remote diagnostics
- No workshop needed
- Earn through escalations

**Workshop Partner:**
- Diagnostic + physical repairs
- Workshop affiliation required
- Earn wage + diagnostic split

### Role Permission Check

**File:** [src/lib/auth/permissions.ts](../../src/lib/auth/permissions.ts)

```typescript
import { can } from '@/lib/auth/permissions'

// Check if user can create quotes
if (can(mechanic.workshop_role, 'send_quotes')) {
  // Show quote creation UI
}

// Check if user can diagnose
if (can(mechanic.workshop_role, 'diagnose')) {
  // Show diagnostic tools
}
```

---

**Last Updated:** November 7, 2025
**Status:** ✅ Complete Documentation
**Maintained By:** Development Team
