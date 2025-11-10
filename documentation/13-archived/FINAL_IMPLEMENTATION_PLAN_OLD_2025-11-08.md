# Final Implementation Plan - Dual-Mode Mechanic System

**Date**: 2025-11-08
**Status**: APPROVED - READY FOR IMPLEMENTATION
**Estimated Timeline**: 6-8 weeks
**Priority**: HIGH

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Implementation Phases](#implementation-phases)
4. [Database Schema](#database-schema)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Plan](#deployment-plan)

---

## 🎯 EXECUTIVE SUMMARY

### **What We're Building**

A **dual-mode mechanic system** that allows mechanics to work BOTH as:
1. **Workshop employees** (during work hours - revenue to workshop)
2. **Independent contractors** (after hours - revenue to mechanic)

With automatic mode switching, geographic controls, and full legal compliance.

### **Key Features**

✅ **Auto-Match Preview** - Customers see who they'll be matched with
✅ **Dual-Mode Accounts** - One account, two operating modes
✅ **Workshop Controls** - Admin can clock in/out employees, set policies
✅ **Geographic Restrictions** - Workshop chooses: Trust/Protected/Strict
✅ **Automatic Mode Switching** - Time-based, database-enforced
✅ **Privacy Protection** - Independent earnings hidden from workshop
✅ **Cooling Period** - 30-day protection after employment ends
✅ **Stripe Integration** - Separate accounts for mechanic/workshop
✅ **Postal Code Matching** - Location-based mechanic selection
✅ **Legal Compliance** - Platform as broker, proper contractor status

### **Business Impact**

**Revenue Projections**:
- Conservative: +$650K annually
- Moderate: +$1.3M annually
- Aggressive: +$1.95M annually

**Implementation Cost**: $45,000
**Payback Period**: 1-2 months
**ROI**: 1,344% annually

---

## 🏗️ SYSTEM ARCHITECTURE

### **Core Components**

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                  PLATFORM LAYER                     │
│  (Broker - Owns customer relationships)            │
│                                                     │
└──────────┬─────────────────────────┬────────────────┘
           │                         │
           ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│  MECHANIC        │      │  WORKSHOP        │
│  (Independent    │◄────►│  (Employer)      │
│   Contractor)    │      │                  │
│                  │      │  Controls:       │
│  Owns:           │      │  - Work schedule │
│  - Account       │      │  - Clock in/out  │
│  - Stripe        │      │  - Geo policy    │
│  - Profile       │      │  - Cooling period│
└──────────────────┘      └──────────────────┘
         │
         │ Integration Link
         │ (Can be disconnected)
         ▼
┌──────────────────────────────────────┐
│  DUAL-MODE SYSTEM                    │
│                                      │
│  Mode A: Workshop (During hours)     │
│  └─ Revenue → Workshop Stripe        │
│                                      │
│  Mode B: Independent (After hours)   │
│  └─ Revenue → Mechanic Stripe        │
│     └─ Geographic filter applied     │
└──────────────────────────────────────┘
```

### **Data Flow**

```
Customer Books Session
        │
        ▼
Platform Matches Customer → Mechanic
        │
        ▼
Check: What mode is mechanic in?
        │
        ├─── During Work Hours (9am-5pm Mon-Fri)
        │    └─ Workshop Mode Active
        │       ├─ Check: Is customer in restricted zone?
        │       │  ├─ No → Allow session
        │       │  └─ Yes → Allow (workshop controls work hours)
        │       └─ Revenue → Workshop Stripe Account
        │
        └─── Outside Work Hours (after 5pm, weekends)
             └─ Independent Mode Active
                ├─ Check: Any workshop integration?
                │  ├─ Yes → Check geographic restriction
                │  │  ├─ Customer in restricted zone? → Block
                │  │  └─ Customer outside zone? → Allow
                │  └─ No → Allow all customers
                └─ Revenue → Mechanic Stripe Account
```

---

## 📅 IMPLEMENTATION PHASES

### **PHASE 1: FOUNDATION (Week 1-2)**

**Goal**: Database schema, basic dual-mode structure

**Tasks**:
1. ✅ Create database migrations
   - workshops table
   - workshop_integrations table
   - mechanic_type fields
   - revenue_routing fields

2. ✅ Update existing tables
   - mechanics: Add dual-mode fields
   - session_requests: Add revenue routing
   - session_payments: Add recipient tracking

3. ✅ Backend utilities
   - Mode detection logic
   - Geographic distance calculator
   - Revenue routing service
   - Stripe dual-account handler

**Deliverables**:
- 6 database migrations
- Revenue routing service (TypeScript)
- Geographic utilities (FSA matching)
- Unit tests for core logic

**Success Criteria**:
- Database schema deployed to production
- All foreign keys and constraints working
- No breaking changes to existing functionality

---

### **PHASE 2: WORKSHOP ADMIN (Week 3-4)**

**Goal**: Workshop signup, employee management, clock in/out

**Tasks**:

**2.1 Workshop Signup Flow**
- Workshop registration page
- Stripe Connect onboarding for workshops
- Workshop profile setup
- Insurance verification upload

**2.2 Workshop Dashboard**
- Employee list view
- Clock in/out controls
- Revenue tracking (work-hour sessions)
- Independent activity monitoring (privacy-protected)
- Geographic policy settings

**2.3 Employee Management**
- Invite mechanic flow
- Employee acceptance process
- Schedule configuration
- Geographic restriction settings
- Employee removal/disconnection

**2.4 API Endpoints**
```
POST   /api/workshop/signup
GET    /api/workshop/dashboard
POST   /api/workshop/invite-mechanic
POST   /api/workshop/clock-in-employee
POST   /api/workshop/clock-out-employee
DELETE /api/workshop/remove-employee
PATCH  /api/workshop/update-policy
GET    /api/workshop/revenue-report
```

**Deliverables**:
- Workshop admin dashboard (complete)
- Employee management UI
- Clock in/out system
- 8 API endpoints
- Workshop Terms of Service agreement flow

**Success Criteria**:
- Workshop can sign up and complete onboarding
- Workshop can invite mechanic
- Workshop can clock employees in/out
- Revenue routing works correctly during work hours

---

### **PHASE 3: MECHANIC DUAL-MODE (Week 5-6)**

**Goal**: Mechanic accepts invitations, dual-mode operation

**Tasks**:

**3.1 Mechanic Dashboard Updates**
- Dual-mode status indicator
- Workshop invitation acceptance flow
- Current mode display (Workshop vs Independent)
- Schedule visibility
- Geographic restriction display
- Earnings split view (work vs independent)

**3.2 Mode Switching**
- Automatic time-based switching
- Manual override prevention (workshop controlled)
- Mode indicator in session queue
- Revenue routing based on mode

**3.3 Disconnection Handling**
- Workshop removes mechanic → Auto-downgrade notification
- Cooling period activation
- Geographic restrictions during cooling
- Account restoration after cooling period

**3.4 Stripe Integration**
- Mechanic's personal Stripe account (independent earnings)
- Workshop Stripe account (work-hour earnings)
- Dual payment routing
- Transaction tagging by mode

**3.5 API Endpoints**
```
GET    /api/mechanic/invitations
POST   /api/mechanic/accept-invitation
POST   /api/mechanic/decline-invitation
GET    /api/mechanic/integrations
POST   /api/mechanic/leave-workshop
GET    /api/mechanic/earnings-split
GET    /api/mechanic/current-mode
```

**Deliverables**:
- Updated mechanic dashboard
- Invitation acceptance flow
- Dual-mode UI components
- 6 API endpoints
- Stripe dual-routing implementation

**Success Criteria**:
- Mechanic can accept workshop invitation
- Mode switches automatically based on schedule
- Revenue routes to correct Stripe account
- Mechanic sees clear mode indicators
- Disconnection flows work correctly

---

### **PHASE 4: CUSTOMER EXPERIENCE (Week 7)**

**Goal**: Auto-match preview, location-based matching, postal codes

**Tasks**:

**4.1 Auto-Match Preview** (ALREADY COMPLETE ✅)
- Fetch top matched mechanic when "First Available" selected
- Beautiful preview card showing mechanic profile
- Match score and reasons display
- Option to see other mechanics

**4.2 Postal Code Collection**
- Add postal code to mechanic signup
- Add postal code to mechanic profile edit
- Add postal code to customer intake form
- Postal code validation (Canadian format)

**4.3 Location-Based Matching**
- FSA (Forward Sortation Area) matching
- Distance calculation (50km radius detection)
- Geographic filtering for independent mode
- Match score adjustment for proximity

**4.4 City/Province Input**
- Replace city dropdown with province select + free-text city
- Support all Canadian cities and suburbs
- Province validation
- City autocomplete (optional enhancement)

**4.5 SessionWizard Enhancement**
- Display mechanic's workshop affiliation (if applicable)
- Show "Mike from AutoFix Workshop" vs "Mike (Independent)"
- Transparent about who gets revenue

**Deliverables**:
- Postal code fields in all forms
- FSA matching algorithm
- Geographic filtering service
- Province + free-text city inputs
- Enhanced SessionWizard UI

**Success Criteria**:
- Customers see auto-match preview
- Postal codes collected and stored
- Location-based matching works
- Geographic restrictions enforced
- City input accepts any value

---

### **PHASE 5: LEGAL & COMPLIANCE (Week 8)**

**Goal**: Terms of Service, agreements, privacy compliance

**Tasks**:

**5.1 Legal Documents**
- Platform Terms of Service (updated)
- Workshop Services Agreement
- Mechanic Independent Contractor Agreement
- Workshop-Mechanic Employment Agreement (template)
- Non-Solicitation Clause (template)
- Privacy Policy (PIPEDA compliance)

**5.2 Agreement Flows**
- Digital signature for all agreements
- Checkbox acceptance with date/time logging
- PDF generation for records
- Email confirmation of acceptance

**5.3 Privacy Implementation**
- Independent earnings hidden from workshop
- Customer data minimization (cities only for verification)
- Data retention policies
- GDPR/PIPEDA compliance audit

**5.4 Tax Compliance**
- T4A generation for mechanics
- T4A generation for workshops
- Revenue tracking by recipient type
- Annual tax reporting system

**5.5 Contact Info Detection**
- Chat message scanning for phone numbers, emails
- Automatic blocking of prohibited content
- Violation flagging and warnings
- Escalation to account suspension

**Deliverables**:
- 6 legal documents (reviewed by lawyer)
- Digital signature system
- Privacy-compliant data architecture
- T4A generation system
- Contact info detection service

**Success Criteria**:
- All users sign updated Terms of Service
- Agreements properly stored and retrievable
- Privacy audit passes
- Tax reporting ready for year-end
- Contact info sharing blocked automatically

---

### **PHASE 6: TESTING & LAUNCH (Week 9-10)**

**Goal**: End-to-end testing, bug fixes, production launch

**Tasks**:

**6.1 Unit Testing**
- Revenue routing logic
- Mode switching logic
- Geographic filtering
- Stripe integration
- 90% code coverage target

**6.2 Integration Testing**
- Workshop signup → Employee invitation → Acceptance → Clock in → Session → Revenue
- Mechanic independent → Session → Revenue
- Mechanic dual-mode → Work hours → Independent hours
- Employee removal → Cooling period → Restoration

**6.3 User Acceptance Testing (UAT)**
- Beta with 3-5 friendly workshops
- Beta with 10-15 mechanics (mix of independent and dual-mode)
- Customer testing with auto-match preview
- Feedback collection and iteration

**6.4 Performance Testing**
- Geographic filtering performance (handle 10,000 mechanics)
- Revenue routing speed (< 100ms)
- Dashboard load times (< 2 seconds)
- Database query optimization

**6.5 Security Testing**
- Privacy breach attempts (workshop accessing independent data)
- Mode switching bypass attempts
- Geographic restriction bypass attempts
- Stripe account switching attempts
- SQL injection, XSS, CSRF testing

**6.6 Bug Fixes & Polish**
- Fix all critical bugs
- Fix high-priority bugs
- Document known minor bugs
- UI polish and responsive design

**6.7 Documentation**
- Workshop onboarding guide
- Mechanic dual-mode guide
- Customer help center updates
- API documentation
- Admin troubleshooting guide

**Deliverables**:
- Test suite (90% coverage)
- UAT report with feedback
- Performance benchmarks
- Security audit report
- User documentation

**Success Criteria**:
- Zero critical bugs
- UAT participants satisfied (4.5/5 average rating)
- Performance targets met
- Security audit passed
- Documentation complete

---

## 🗄️ DATABASE SCHEMA

### **Migration 1: Create Workshops Table**

```sql
-- File: supabase/migrations/20250108000001_create_workshops.sql

CREATE TABLE workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Business info
  name VARCHAR(255) NOT NULL,
  shop_address TEXT,
  city VARCHAR(100),
  province VARCHAR(50),
  postal_code VARCHAR(10),
  country VARCHAR(100) DEFAULT 'Canada',
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Operating details
  shop_hours JSONB,
  accepts_physical_bookings BOOLEAN DEFAULT TRUE,

  -- Payment
  stripe_account_id VARCHAR(255),
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,

  -- Policies
  default_geographic_policy VARCHAR(50) DEFAULT 'protected_territory'
    CHECK (default_geographic_policy IN ('full_trust', 'protected_territory', 'strict')),
  default_restriction_radius_km INTEGER DEFAULT 50,
  default_cooling_period_days INTEGER DEFAULT 30,

  -- Status
  status VARCHAR(50) DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'suspended', 'closed')),

  -- Insurance
  insurance_verified BOOLEAN DEFAULT FALSE,
  insurance_expiry_date DATE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workshops_owner ON workshops(owner_user_id);
CREATE INDEX idx_workshops_status ON workshops(status) WHERE status = 'active';
CREATE INDEX idx_workshops_location ON workshops(city, province);
CREATE INDEX idx_workshops_stripe ON workshops(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- RLS Policies
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workshop owners can manage their workshop"
  ON workshops FOR ALL
  USING (owner_user_id = auth.uid());

CREATE POLICY "Public can view active workshops"
  ON workshops FOR SELECT
  USING (status = 'active');

-- Updated at trigger
CREATE TRIGGER update_workshops_updated_at
  BEFORE UPDATE ON workshops
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE workshops IS 'Physical workshops that can employ mechanics';
COMMENT ON COLUMN workshops.default_geographic_policy IS 'Default policy for new employees: full_trust, protected_territory, or strict';
```

### **Migration 2: Create Workshop Integrations Table**

```sql
-- File: supabase/migrations/20250108000002_create_workshop_integrations.sql

CREATE TABLE workshop_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE NOT NULL,
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,

  -- Schedule
  work_days JSONB DEFAULT '["monday","tuesday","wednesday","thursday","friday"]'::jsonb,
  work_start_time TIME DEFAULT '09:00:00',
  work_end_time TIME DEFAULT '17:00:00',
  timezone VARCHAR(50) DEFAULT 'America/Toronto',

  -- Geographic Policy
  geographic_policy VARCHAR(50) DEFAULT 'protected_territory'
    CHECK (geographic_policy IN ('full_trust', 'protected_territory', 'strict')),
  restriction_radius_km INTEGER DEFAULT 50,

  -- Employment Status
  status VARCHAR(50) DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'notice_period', 'disconnected', 'expired')),

  -- Important Dates
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  employment_start_date DATE,
  employment_end_date DATE,
  notice_given_date DATE,
  disconnected_at TIMESTAMP,
  cooling_period_days INTEGER DEFAULT 30,
  cooling_period_end_date DATE,

  -- Disconnection Info
  disconnected_by VARCHAR(50) CHECK (disconnected_by IN ('workshop', 'mechanic', 'platform')),
  disconnection_reason TEXT,

  -- Workshop can see
  workshop_can_see_independent_count BOOLEAN DEFAULT TRUE,
  workshop_can_see_customer_cities BOOLEAN DEFAULT TRUE,

  -- Agreement
  employment_agreement_signed BOOLEAN DEFAULT FALSE,
  employment_agreement_signed_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(mechanic_id, workshop_id, status) WHERE status IN ('invited', 'active')
);

-- Indexes
CREATE INDEX idx_workshop_integrations_mechanic ON workshop_integrations(mechanic_id);
CREATE INDEX idx_workshop_integrations_workshop ON workshop_integrations(workshop_id);
CREATE INDEX idx_workshop_integrations_status ON workshop_integrations(status);
CREATE INDEX idx_workshop_integrations_cooling ON workshop_integrations(cooling_period_end_date)
  WHERE status = 'disconnected' AND cooling_period_end_date > NOW();

-- RLS Policies
ALTER TABLE workshop_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workshops can manage their integrations"
  ON workshop_integrations FOR ALL
  USING (
    workshop_id IN (SELECT id FROM workshops WHERE owner_user_id = auth.uid())
  );

CREATE POLICY "Mechanics can view their integrations"
  ON workshop_integrations FOR SELECT
  USING (
    mechanic_id IN (SELECT id FROM mechanics WHERE user_id = auth.uid())
  );

CREATE POLICY "Mechanics can accept/decline invitations"
  ON workshop_integrations FOR UPDATE
  USING (
    mechanic_id IN (SELECT id FROM mechanics WHERE user_id = auth.uid())
    AND status = 'invited'
  );

-- Updated at trigger
CREATE TRIGGER update_workshop_integrations_updated_at
  BEFORE UPDATE ON workshop_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE workshop_integrations IS 'Links mechanics to workshops (dual-mode employment)';
COMMENT ON COLUMN workshop_integrations.geographic_policy IS 'How to handle independent work: full_trust (no restrictions), protected_territory (radius block), strict (province block)';
COMMENT ON COLUMN workshop_integrations.cooling_period_days IS 'Days to maintain geographic restrictions after disconnection';
```

### **Migration 3: Update Mechanics Table**

```sql
-- File: supabase/migrations/20250108000003_update_mechanics_dual_mode.sql

-- Add dual-mode fields
ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS province VARCHAR(50),
ADD COLUMN IF NOT EXISTS city_free_text VARCHAR(100);

-- Add comment
COMMENT ON COLUMN mechanics.postal_code IS 'Canadian postal code for location matching (e.g., M5V 3A8)';
COMMENT ON COLUMN mechanics.city_free_text IS 'Free-text city name (replaced dropdown)';

-- Create index for postal code FSA matching
CREATE INDEX idx_mechanics_postal_fsa ON mechanics((SUBSTRING(postal_code, 1, 3)));

-- Create function to extract FSA
CREATE OR REPLACE FUNCTION get_postal_fsa(postal VARCHAR(10))
RETURNS VARCHAR(3) AS $$
BEGIN
  RETURN UPPER(SUBSTRING(postal, 1, 3));
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### **Migration 4: Update Session Requests**

```sql
-- File: supabase/migrations/20250108000004_update_session_requests_revenue.sql

ALTER TABLE session_requests
ADD COLUMN IF NOT EXISTS customer_postal_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS revenue_recipient_type VARCHAR(50)
  CHECK (revenue_recipient_type IN ('mechanic', 'workshop')),
ADD COLUMN IF NOT EXISTS revenue_recipient_id UUID,
ADD COLUMN IF NOT EXISTS workshop_integration_id UUID REFERENCES workshop_integrations(id),
ADD COLUMN IF NOT EXISTS mechanic_mode_at_time VARCHAR(50)
  CHECK (mechanic_mode_at_time IN ('independent', 'workshop'));

-- Indexes
CREATE INDEX idx_session_requests_revenue_recipient
  ON session_requests(revenue_recipient_type, revenue_recipient_id);
CREATE INDEX idx_session_requests_workshop_integration
  ON session_requests(workshop_integration_id) WHERE workshop_integration_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN session_requests.revenue_recipient_type IS 'Who receives revenue: mechanic (independent mode) or workshop (workshop mode)';
COMMENT ON COLUMN session_requests.mechanic_mode_at_time IS 'What mode was mechanic in when session started';
```

### **Migration 5: Create Session Payments Table**

```sql
-- File: supabase/migrations/20250108000005_create_session_payments.sql

CREATE TABLE session_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  session_id UUID REFERENCES session_requests(id) ON DELETE CASCADE NOT NULL,

  -- Payment Recipient
  recipient_type VARCHAR(50) NOT NULL
    CHECK (recipient_type IN ('mechanic', 'workshop')),
  recipient_id UUID NOT NULL,
  recipient_stripe_account_id VARCHAR(255) NOT NULL,

  -- Amounts (in cents)
  session_fee_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  recipient_amount_cents INTEGER NOT NULL,

  -- Context
  was_during_workshop_hours BOOLEAN DEFAULT FALSE,
  workshop_integration_id UUID REFERENCES workshop_integrations(id),

  -- Geographic Info (for verification only, privacy-protected)
  customer_city VARCHAR(100),
  customer_postal_code_fsa VARCHAR(3),

  -- Stripe
  stripe_payment_intent_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255),
  payment_status VARCHAR(50) DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed')),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_session_payments_session ON session_payments(session_id);
CREATE INDEX idx_session_payments_recipient ON session_payments(recipient_type, recipient_id);
CREATE INDEX idx_session_payments_workshop_integration ON session_payments(workshop_integration_id)
  WHERE workshop_integration_id IS NOT NULL;
CREATE INDEX idx_session_payments_status ON session_payments(payment_status);

-- RLS Policies
ALTER TABLE session_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mechanics can view their payments"
  ON session_payments FOR SELECT
  USING (
    recipient_type = 'mechanic'
    AND recipient_id IN (SELECT id FROM mechanics WHERE user_id = auth.uid())
  );

CREATE POLICY "Workshops can view their payments"
  ON session_payments FOR SELECT
  USING (
    recipient_type = 'workshop'
    AND recipient_id IN (SELECT id FROM workshops WHERE owner_user_id = auth.uid())
  );

-- Comments
COMMENT ON TABLE session_payments IS 'Tracks revenue routing and Stripe payments for sessions';
COMMENT ON COLUMN session_payments.customer_postal_code_fsa IS 'First 3 chars of postal code only (privacy - for geographic verification)';
```

### **Migration 6: Create Violation Logs Table**

```sql
-- File: supabase/migrations/20250108000006_create_violation_logs.sql

CREATE TABLE violation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Who
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE,
  workshop_integration_id UUID REFERENCES workshop_integrations(id),
  session_id UUID REFERENCES session_requests(id),

  -- What
  violation_type VARCHAR(50) NOT NULL
    CHECK (violation_type IN (
      'contact_info_sharing',
      'geographic_restriction',
      'active_solicitation',
      'mode_bypass_attempt',
      'other'
    )),

  -- Details
  description TEXT,
  evidence JSONB,
  severity VARCHAR(50) DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Status
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'warned', 'suspended', 'dismissed')),
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES auth.users(id),
  action_taken TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_violation_logs_mechanic ON violation_logs(mechanic_id);
CREATE INDEX idx_violation_logs_status ON violation_logs(status) WHERE status = 'pending';
CREATE INDEX idx_violation_logs_severity ON violation_logs(severity) WHERE severity IN ('high', 'critical');

-- RLS Policies
ALTER TABLE violation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage violations"
  ON violation_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE violation_logs IS 'Tracks violations of platform policies (contact sharing, solicitation, etc)';
```

---

## 🔧 BACKEND IMPLEMENTATION

### **Core Services**

**File Structure**:
```
src/lib/
├── dualMode/
│   ├── modeDetection.ts        # Detect current mode for mechanic
│   ├── revenueRouting.ts       # Route revenue to correct Stripe account
│   ├── geographicFilter.ts     # Filter customers by location
│   ├── coolingPeriod.ts        # Handle cooling period logic
│   └── types.ts                # TypeScript interfaces
├── stripe/
│   ├── workshopConnect.ts      # Workshop Stripe Connect onboarding
│   ├── dualPayment.ts          # Handle dual-account payments
│   └── transferService.ts      # Stripe transfers
└── violations/
    ├── contactDetection.ts     # Scan for contact info in messages
    └── violationHandler.ts     # Log and handle violations
```

### **Mode Detection Service**

```typescript
// File: src/lib/dualMode/modeDetection.ts

import { createClient } from '@/lib/supabase'

export type MechanicMode = 'independent' | 'workshop'

export interface ModeDetectionResult {
  mode: MechanicMode
  workshopIntegrationId?: string
  workshopId?: string
  workshopName?: string
  geographicRestrictions?: {
    policy: 'full_trust' | 'protected_territory' | 'strict'
    restrictionRadiusKm?: number
    workshopPostalCode?: string
  }
}

/**
 * Determines current operating mode for a mechanic
 * Based on time, day of week, and active workshop integrations
 */
export async function detectMechanicMode(
  mechanicId: string,
  timestamp: Date = new Date()
): Promise<ModeDetectionResult> {
  const supabase = createClient()

  // Get all active workshop integrations for this mechanic
  const { data: integrations, error } = await supabase
    .from('workshop_integrations')
    .select(`
      *,
      workshop:workshops(id, name, postal_code)
    `)
    .eq('mechanic_id', mechanicId)
    .eq('status', 'active')

  if (error) throw error

  if (!integrations || integrations.length === 0) {
    // No workshop integrations - mechanic is independent
    return { mode: 'independent' }
  }

  // Check if current time falls within any workshop's schedule
  const currentDay = timestamp.toLocaleDateString('en-US', { weekday: 'lowercase' })
  const currentTime = timestamp.toTimeString().substring(0, 5) // "HH:MM"

  for (const integration of integrations) {
    const workDays = integration.work_days || []
    const workStart = integration.work_start_time || '09:00:00'
    const workEnd = integration.work_end_time || '17:00:00'

    if (workDays.includes(currentDay)) {
      if (currentTime >= workStart.substring(0, 5) && currentTime < workEnd.substring(0, 5)) {
        // Currently during this workshop's hours
        return {
          mode: 'workshop',
          workshopIntegrationId: integration.id,
          workshopId: integration.workshop_id,
          workshopName: integration.workshop?.name,
          geographicRestrictions: {
            policy: integration.geographic_policy,
            restrictionRadiusKm: integration.restriction_radius_km,
            workshopPostalCode: integration.workshop?.postal_code
          }
        }
      }
    }
  }

  // Outside all workshop hours - independent mode
  // But still need to apply geographic restrictions from all active integrations
  return {
    mode: 'independent',
    geographicRestrictions: {
      policy: integrations[0].geographic_policy, // Use first integration's policy
      restrictionRadiusKm: integrations[0].restriction_radius_km,
      workshopPostalCode: integrations[0].workshop?.postal_code
    }
  }
}

/**
 * Check if a mechanic can accept a session based on mode and restrictions
 */
export async function canAcceptSession(
  mechanicId: string,
  customerPostalCode: string
): Promise<{ allowed: boolean; reason?: string; mode: MechanicMode }> {
  const modeResult = await detectMechanicMode(mechanicId)

  if (modeResult.mode === 'workshop') {
    // Workshop mode - can accept any customer (workshop controls work hours)
    return {
      allowed: true,
      mode: 'workshop'
    }
  }

  // Independent mode - check geographic restrictions
  if (modeResult.geographicRestrictions?.policy === 'full_trust') {
    return {
      allowed: true,
      mode: 'independent'
    }
  }

  // Check if customer is in restricted zone
  const isRestricted = await isCustomerInRestrictedZone(
    customerPostalCode,
    modeResult.geographicRestrictions?.workshopPostalCode || '',
    modeResult.geographicRestrictions?.restrictionRadiusKm || 50
  )

  if (isRestricted) {
    return {
      allowed: false,
      reason: 'Customer in restricted geographic zone per employment agreement',
      mode: 'independent'
    }
  }

  return {
    allowed: true,
    mode: 'independent'
  }
}

/**
 * Check if customer is in restricted zone (FSA-based approximation)
 */
async function isCustomerInRestrictedZone(
  customerPostalCode: string,
  workshopPostalCode: string,
  radiusKm: number
): Promise<boolean> {
  if (!customerPostalCode || !workshopPostalCode) return false

  const customerFSA = customerPostalCode.substring(0, 3).toUpperCase()
  const workshopFSA = workshopPostalCode.substring(0, 3).toUpperCase()

  // Exact FSA match = definitely within radius
  if (customerFSA === workshopFSA) return true

  // For more accurate distance, would use lat/long lookup
  // For now, use FSA first letter as province approximation
  if (radiusKm >= 100) {
    // Strict mode (100+ km) - block entire province
    return customerFSA[0] === workshopFSA[0]
  }

  // Protected territory mode (50km) - only block exact FSA
  return false
}
```

### **Revenue Routing Service**

```typescript
// File: src/lib/dualMode/revenueRouting.ts

import { createClient } from '@/lib/supabase'
import { detectMechanicMode } from './modeDetection'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export interface RevenueRoutingResult {
  recipientType: 'mechanic' | 'workshop'
  recipientId: string
  recipientStripeAccountId: string
  sessionFeeCents: number
  platformFeeCents: number
  recipientAmountCents: number
  mode: 'independent' | 'workshop'
  workshopIntegrationId?: string
}

/**
 * Determines where session revenue should go
 */
export async function routeSessionRevenue(
  sessionId: string,
  mechanicId: string,
  sessionFeeCents: number,
  timestamp: Date = new Date()
): Promise<RevenueRoutingResult> {
  const supabase = createClient()

  // Detect current mode
  const modeResult = await detectMechanicMode(mechanicId, timestamp)

  // Calculate fees (5% platform fee)
  const platformFeeCents = Math.round(sessionFeeCents * 0.05)
  const recipientAmountCents = sessionFeeCents - platformFeeCents

  if (modeResult.mode === 'workshop') {
    // Workshop mode - revenue goes to workshop
    const { data: integration } = await supabase
      .from('workshop_integrations')
      .select('workshop_id, workshops(stripe_account_id, name)')
      .eq('id', modeResult.workshopIntegrationId!)
      .single()

    if (!integration?.workshops?.stripe_account_id) {
      throw new Error('Workshop Stripe account not configured')
    }

    return {
      recipientType: 'workshop',
      recipientId: integration.workshop_id,
      recipientStripeAccountId: integration.workshops.stripe_account_id,
      sessionFeeCents,
      platformFeeCents,
      recipientAmountCents,
      mode: 'workshop',
      workshopIntegrationId: modeResult.workshopIntegrationId
    }
  } else {
    // Independent mode - revenue goes to mechanic
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('stripe_account_id')
      .eq('id', mechanicId)
      .single()

    if (!mechanic?.stripe_account_id) {
      throw new Error('Mechanic Stripe account not configured')
    }

    return {
      recipientType: 'mechanic',
      recipientId: mechanicId,
      recipientStripeAccountId: mechanic.stripe_account_id,
      sessionFeeCents,
      platformFeeCents,
      recipientAmountCents,
      mode: 'independent'
    }
  }
}

/**
 * Execute the payment transfer to correct account
 */
export async function executePaymentTransfer(
  routing: RevenueRoutingResult,
  paymentIntentId: string
): Promise<{ transferId: string; status: string }> {
  try {
    // Transfer funds to recipient's Stripe account
    const transfer = await stripe.transfers.create({
      amount: routing.recipientAmountCents,
      currency: 'cad',
      destination: routing.recipientStripeAccountId,
      transfer_group: paymentIntentId,
      metadata: {
        session_id: paymentIntentId,
        recipient_type: routing.recipientType,
        recipient_id: routing.recipientId,
        mode: routing.mode
      }
    })

    return {
      transferId: transfer.id,
      status: 'completed'
    }
  } catch (error) {
    console.error('[Revenue Routing] Transfer failed:', error)
    throw error
  }
}

/**
 * Log the payment in session_payments table
 */
export async function logSessionPayment(
  sessionId: string,
  routing: RevenueRoutingResult,
  stripeTransferId: string,
  customerCity?: string,
  customerPostalCodeFSA?: string
): Promise<void> {
  const supabase = createClient()

  await supabase.from('session_payments').insert({
    session_id: sessionId,
    recipient_type: routing.recipientType,
    recipient_id: routing.recipientId,
    recipient_stripe_account_id: routing.recipientStripeAccountId,
    session_fee_cents: routing.sessionFeeCents,
    platform_fee_cents: routing.platformFeeCents,
    recipient_amount_cents: routing.recipientAmountCents,
    was_during_workshop_hours: routing.mode === 'workshop',
    workshop_integration_id: routing.workshopIntegrationId,
    customer_city: customerCity,
    customer_postal_code_fsa: customerPostalCodeFSA,
    stripe_transfer_id: stripeTransferId,
    payment_status: 'completed',
    completed_at: new Date().toISOString()
  })
}
```

---

## 🎨 FRONTEND IMPLEMENTATION

### **Workshop Admin Dashboard**

```typescript
// File: src/app/workshop/dashboard/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Clock, Users, DollarSign, Settings, AlertTriangle } from 'lucide-react'

interface Employee {
  id: string
  name: string
  email: string
  status: 'invited' | 'active' | 'disconnected'
  currentlyClocked: boolean
  integration: {
    workDays: string[]
    workStartTime: string
    workEndTime: string
    geographicPolicy: 'full_trust' | 'protected_territory' | 'strict'
    restrictionRadiusKm: number
  }
  stats: {
    workshopSessionsThisWeek: number
    workshopRevenueThisWeek: number
    independentSessionsThisWeek: number
    independentCities: string[]
    violations: number
  }
}

export default function WorkshopDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [todayRevenue, setTodayRevenue] = useState(0)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/workshop/dashboard')
      const data = await response.json()
      setEmployees(data.employees || [])
      setTodayRevenue(data.todayRevenue || 0)
    } catch (error) {
      console.error('[Workshop Dashboard] Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClockIn = async (employeeId: string) => {
    try {
      const response = await fetch('/api/workshop/clock-in-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mechanic_id: employeeId })
      })

      if (response.ok) {
        fetchDashboardData() // Refresh
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to clock in employee')
      }
    } catch (error) {
      console.error('[Clock In] Error:', error)
      alert('Failed to clock in employee')
    }
  }

  const handleClockOut = async (employeeId: string) => {
    try {
      const response = await fetch('/api/workshop/clock-out-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mechanic_id: employeeId })
      })

      if (response.ok) {
        fetchDashboardData() // Refresh
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to clock out employee')
      }
    } catch (error) {
      console.error('[Clock Out] Error:', error)
      alert('Failed to clock out employee')
    }
  }

  const handleRemoveEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to remove this employee? They will enter cooling period.')) {
      return
    }

    try {
      const response = await fetch('/api/workshop/remove-employee', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mechanic_id: employeeId })
      })

      if (response.ok) {
        fetchDashboardData() // Refresh
        alert('Employee removed. They will enter 30-day cooling period.')
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to remove employee')
      }
    } catch (error) {
      console.error('[Remove Employee] Error:', error)
      alert('Failed to remove employee')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Workshop Dashboard</h1>
          <p className="text-slate-400">Manage your team and monitor performance</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-5 w-5 text-green-400" />
              <span className="text-sm text-slate-400">Today's Revenue</span>
            </div>
            <p className="text-3xl font-bold text-white">
              ${(todayRevenue / 100).toFixed(2)}
            </p>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-blue-400" />
              <span className="text-sm text-slate-400">Active Employees</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {employees.filter(e => e.status === 'active').length}
            </p>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-5 w-5 text-orange-400" />
              <span className="text-sm text-slate-400">Clocked In Now</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {employees.filter(e => e.currentlyClocked).length}
            </p>
          </div>
        </div>

        {/* Employee List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Team
          </h2>

          {employees.length === 0 ? (
            <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 text-center">
              <p className="text-slate-400 mb-4">No employees yet</p>
              <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg">
                Invite Mechanic
              </button>
            </div>
          ) : (
            employees.map(employee => (
              <div
                key={employee.id}
                className="bg-slate-800 p-6 rounded-lg border border-slate-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{employee.name}</h3>
                    <p className="text-sm text-slate-400">{employee.email}</p>
                  </div>

                  {employee.currentlyClocked ? (
                    <span className="flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                      <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                      ON SHIFT
                    </span>
                  ) : (
                    <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-sm">
                      OFF SHIFT
                    </span>
                  )}
                </div>

                {/* Employee Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Workshop Sessions</p>
                    <p className="text-lg font-bold text-white">
                      {employee.stats.workshopSessionsThisWeek}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Workshop Revenue</p>
                    <p className="text-lg font-bold text-green-400">
                      ${(employee.stats.workshopRevenueThisWeek / 100).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Independent Activity</p>
                    <p className="text-lg font-bold text-white">
                      {employee.stats.independentSessionsThisWeek} sessions
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Cities: {employee.stats.independentCities.join(', ') || 'None'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Violations</p>
                    <p className={`text-lg font-bold ${employee.stats.violations > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {employee.stats.violations}
                    </p>
                  </div>
                </div>

                {/* Geographic Policy */}
                <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-400 mb-2">Geographic Policy:</p>
                  <div className="flex items-center gap-2">
                    {employee.integration.geographicPolicy === 'full_trust' && (
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">
                        ✓ Full Trust (No restrictions)
                      </span>
                    )}
                    {employee.integration.geographicPolicy === 'protected_territory' && (
                      <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs">
                        Protected Territory ({employee.integration.restrictionRadiusKm}km block)
                      </span>
                    )}
                    {employee.integration.geographicPolicy === 'strict' && (
                      <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs">
                        Strict Mode (Province-wide block)
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {employee.currentlyClocked ? (
                    <button
                      onClick={() => handleClockOut(employee.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      Clock Out
                    </button>
                  ) : (
                    <button
                      onClick={() => handleClockIn(employee.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      Clock In
                    </button>
                  )}

                  <button
                    onClick={() => handleRemoveEmployee(employee.id)}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg"
                  >
                    Remove
                  </button>

                  <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg">
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 🧪 TESTING STRATEGY

### **Test Scenarios**

**1. Independent Mechanic Flow**
```
✓ Mechanic creates account
✓ Mechanic completes Stripe onboarding
✓ Mechanic sets postal code
✓ Customer books session
✓ Revenue goes to mechanic's Stripe (95%)
✓ Platform gets 5%
```

**2. Workshop Signup & Employee Invitation**
```
✓ Workshop creates account
✓ Workshop completes Stripe Connect
✓ Workshop invites mechanic (Mike)
✓ Mike receives invitation
✓ Mike accepts invitation
✓ Integration created with status 'active'
```

**3. Dual-Mode Session During Work Hours**
```
✓ Workshop clocks in Mike (9am)
✓ Mode detection returns 'workshop'
✓ Customer books session with Mike
✓ Revenue routes to workshop's Stripe (95%)
✓ Platform gets 5%
✓ Session logged with mode='workshop'
```

**4. Dual-Mode Session After Hours**
```
✓ Workshop shift ends (5pm)
✓ Mode detection returns 'independent'
✓ Customer books session with Mike
✓ Check geographic restriction
✓ If customer outside restricted zone → Allow
✓ Revenue routes to Mike's Stripe (95%)
✓ Session logged with mode='independent'
```

**5. Geographic Restriction Enforcement**
```
✓ Customer in Toronto (M5V)
✓ Mike's workshop in Toronto (M5V)
✓ Policy: Protected Territory 50km
✓ Time: After hours (independent mode)
✓ System blocks session
✓ Mike doesn't see this customer in queue
```

**6. Employee Removal & Cooling Period**
```
✓ Workshop admin removes Mike
✓ Integration status → 'disconnected'
✓ Cooling period starts (30 days)
✓ Mike receives notification
✓ Mike's account still active ✓
✓ Geographic restrictions remain active
✓ Mike can work (outside Toronto)
✓ After 30 days: Restrictions lifted
```

**7. Contact Info Detection**
```
✓ Mike sends message with phone number
✓ System detects pattern
✓ Message blocked
✓ Violation logged
✓ Mike receives warning
✓ After 3 violations: Account suspended
```

**8. Customer Returns to Mike**
```
✓ Sarah worked with Mike at AutoFix
✓ Mike quit AutoFix 2 months ago
✓ Sarah books session on platform
✓ Gets matched with Mike (now independent)
✓ Platform shows notice
✓ Revenue routes to Mike (95%)
✓ Platform gets 5%
✓ NO violation (platform-mediated)
```

---

## 🚀 DEPLOYMENT PLAN

### **Pre-Deployment Checklist**

- [ ] All database migrations tested locally
- [ ] All database migrations tested on staging
- [ ] Stripe Connect tested (workshop accounts)
- [ ] Stripe dual-routing tested
- [ ] Geographic filtering performance tested
- [ ] Mode detection accuracy verified
- [ ] Privacy protection verified (workshop can't see independent earnings)
- [ ] Legal documents reviewed by lawyer
- [ ] Terms of Service updated
- [ ] Privacy Policy updated (PIPEDA)
- [ ] User documentation complete
- [ ] Customer support trained
- [ ] Monitoring/alerts configured
- [ ] Rollback plan documented

### **Deployment Steps**

**Week 9: Staging Deployment**
1. Deploy database migrations to staging
2. Deploy backend code to staging
3. Deploy frontend code to staging
4. Run integration tests on staging
5. Beta test with 3-5 friendly workshops
6. Collect feedback and fix bugs

**Week 10: Production Deployment**
1. Database migrations (during low-traffic window)
2. Backend deployment (blue-green deployment)
3. Frontend deployment
4. Enable feature flags gradually
5. Monitor error rates and performance
6. Rollback if critical issues

**Post-Deployment Monitoring (Week 11+)**
- Error rate < 0.1%
- API response times < 200ms p95
- Revenue routing accuracy 100%
- Geographic filtering accuracy > 95%
- User satisfaction > 4.5/5

---

## 📊 SUCCESS METRICS

### **Technical Metrics**
- Mode detection accuracy: > 99%
- Revenue routing accuracy: 100%
- Geographic filtering accuracy: > 95%
- API response times: < 200ms p95
- Database query times: < 50ms p95
- Zero revenue routing errors

### **Business Metrics**
- Workshop signups: 20+ in first month
- Dual-mode mechanics: 50+ in first month
- Revenue increase: +$50K/month
- Customer satisfaction: > 4.5/5
- Workshop satisfaction: > 4.5/5
- Mechanic satisfaction: > 4.5/5

### **Compliance Metrics**
- Zero privacy violations
- Zero payment routing errors
- 100% Terms of Service acceptance
- Zero legal disputes
- T4A generation 100% accurate

---

## 📚 DOCUMENTATION

### **User Documentation**

1. **Workshop Onboarding Guide**
   - How to sign up
   - Stripe Connect setup
   - Inviting mechanics
   - Clock in/out procedures
   - Setting geographic policies
   - Reading reports

2. **Mechanic Dual-Mode Guide**
   - Understanding dual-mode
   - Accepting workshop invitations
   - How mode switching works
   - Geographic restrictions explained
   - Earnings tracking
   - Leaving workshop

3. **Customer Help Center**
   - Auto-match preview explained
   - Choosing mechanics
   - Understanding mechanic types
   - "Mike from AutoFix" vs "Mike (Independent)"

### **Technical Documentation**

1. **API Documentation**
   - All endpoints documented
   - Request/response examples
   - Error codes
   - Rate limits
   - Authentication

2. **Database Schema Documentation**
   - All tables documented
   - Column descriptions
   - Relationships diagram
   - Indexes explained

3. **Admin Troubleshooting Guide**
   - Common issues and fixes
   - Revenue routing debugging
   - Mode detection issues
   - Geographic filtering problems

---

## ✅ FINAL CHECKLIST BEFORE IMPLEMENTATION

- [ ] All stakeholders have reviewed this plan
- [ ] Legal counsel has reviewed dual-mode model
- [ ] Accounting has reviewed T4A implications
- [ ] Customer support trained on new features
- [ ] Budget approved ($45,000)
- [ ] Timeline approved (8 weeks)
- [ ] Beta test workshops identified (3-5)
- [ ] Beta test mechanics identified (10-15)
- [ ] Rollback plan documented
- [ ] Success criteria agreed upon

---

**STATUS**: ✅ **READY FOR IMPLEMENTATION**

**NEXT STEP**: Begin Phase 1 (Database Schema) upon approval

**ESTIMATED COMPLETION**: 8 weeks from start date

**EXPECTED ROI**: 1,344% annually

---

**Prepared by**: Development Team
**Date**: 2025-11-08
**Approved by**: _________________ Date: _______
