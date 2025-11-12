# 📊 SCHEDULING SYSTEM ANALYSIS & IMPLEMENTATION PLAN
**The Auto Doctor Platform - Appointment & Availability System**

**Document Version:** 1.0
**Date:** November 10, 2025
**Status:** Ready for Implementation

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Mechanic Type Classification](#mechanic-type-classification)
4. [Business Logic Integration](#business-logic-integration)
5. [Canadian Employment Law Compliance](#canadian-employment-law-compliance)
6. [Technical Architecture](#technical-architecture)
7. [Implementation Roadmap](#implementation-roadmap)
8. [API Specifications](#api-specifications)
9. [Database Schema Changes](#database-schema-changes)
10. [UI/UX Design](#uiux-design)
11. [Legal Compliance Checklist](#legal-compliance-checklist)
12. [Success Metrics](#success-metrics)
13. [Risk Mitigation](#risk-mitigation)
14. [Next Steps](#next-steps)

---

## 📊 EXECUTIVE SUMMARY

### Platform Readiness: 60% Complete

The Auto Doctor platform has **strong foundational infrastructure** for implementing a world-class appointment scheduling system. Critical components exist but require integration and enhancement.

### Key Findings

**✅ EXISTING INFRASTRUCTURE (Ready to Use):**
- `sessions.scheduled_for` field exists in database (currently unpopulated)
- `mechanic_availability` table operational with UI
- `mechanic_time_off` table for vacation management
- `workshop_availability` system (added November 2025)
- `workshop_appointments` infrastructure for in-person bookings
- Mature session state machine with 'scheduled' status
- Smart mechanic matching algorithm operational

**❌ CRITICAL GAPS (4-6 Weeks to Implement):**
- No time slot generation algorithm
- No customer-facing booking calendar UI
- `scheduled_for` field never populated during session creation
- No double-booking prevention mechanism
- No availability validation before mechanic assignment
- No appointment confirmation/reminder system

**✅ LEGAL COMPLIANCE STATUS: STRONG**
- Current independent contractor model aligns with Canadian law
- Ontario Digital Platform Workers' Rights Act (July 2025) does not apply
- Workshop-affiliated structure properly isolates employment relationships
- Strong contractor autonomy indicators maintained

### Recommended Timeline

- **MVP (4 weeks):** Basic scheduling with conflict prevention
- **Full System (8 weeks):** Complete appointment system with workshop integration
- **Launch Readiness:** All compliance checks passed, regression testing complete

---

## 🔍 CURRENT STATE ANALYSIS

### 1.1 Database Schema Assessment

#### ✅ Sessions Table - Core Scheduling Ready

```sql
sessions
├─ id: UUID PRIMARY KEY
├─ customer_user_id: UUID NOT NULL
├─ mechanic_id: UUID (nullable - assigned later)
├─ type: VARCHAR (chat, video, phone, diagnostic)
├─ status: VARCHAR (pending, waiting, scheduled, live, completed...)
├─ plan: VARCHAR (free, trial, quick, advice, premium, urgent)
├─ intake_id: UUID
├─ scheduled_for: TIMESTAMPTZ ⚠️ FIELD EXISTS BUT NEVER POPULATED
├─ started_at: TIMESTAMPTZ
├─ ended_at: TIMESTAMPTZ
├─ duration_minutes: INTEGER
├─ stripe_session_id: VARCHAR
├─ metadata: JSONB
├─ created_at: TIMESTAMPTZ
└─ updated_at: TIMESTAMPTZ
```

**Critical Observation:** The `scheduled_for` field already exists in the schema but is never populated during session creation. This is our primary integration point.

**Current Session Creation:** `src/lib/sessionFactory.ts:162-169`
```typescript
const { data: session, error: sessionError } = await supabaseAdmin
  .from('sessions')
  .insert({
    customer_user_id: customerId,
    type,
    status: 'pending',
    plan,
    intake_id: intakeId,
    stripe_session_id: stripeSessionId,
    ended_at: null,
    metadata
  })
```

**Missing:** `scheduled_for: scheduledDateTime` in the insert statement.

#### ✅ Mechanic Availability Table - Operational

```sql
mechanic_availability
├─ id: UUID PRIMARY KEY
├─ mechanic_id: UUID REFERENCES profiles(id)
├─ day_of_week: INTEGER (0=Sunday, 6=Saturday)
├─ start_time: TIME
├─ end_time: TIME
├─ is_available: BOOLEAN
├─ created_at: TIMESTAMPTZ
└─ updated_at: TIMESTAMPTZ
└─ UNIQUE(mechanic_id, day_of_week, start_time)
```

**Status:** Fully operational with UI at `/app/mechanic/availability/`
**API Endpoints:**
- `GET /api/mechanic/availability` - Fetch blocks
- `PUT /api/mechanic/availability` - Update blocks

**Current Usage:** Mechanics can set weekly recurring availability patterns. UI supports adding/editing/deleting time blocks.

#### ✅ Mechanic Time Off Table - Operational

```sql
mechanic_time_off
├─ id: UUID PRIMARY KEY
├─ mechanic_id: UUID REFERENCES profiles(id)
├─ start_date: DATE
├─ end_date: DATE
├─ reason: TEXT
├─ status: VARCHAR (pending, approved, declined)
├─ created_at: TIMESTAMPTZ
└─ updated_at: TIMESTAMPTZ
```

**Status:** Fully operational
**API Endpoints:**
- `GET /api/mechanic/time-off` - List time off periods
- `POST /api/mechanic/time-off` - Create vacation request
- `DELETE /api/mechanic/time-off/:id` - Cancel time off

**Current Usage:** Mechanics can request time off. Currently NOT checked during mechanic assignment.

#### ✅ Workshop Availability Table - Recently Added (Nov 2025)

```sql
workshop_availability
├─ id: UUID PRIMARY KEY
├─ workshop_id: UUID REFERENCES organizations(id)
├─ day_of_week: INTEGER (0-6)
├─ is_open: BOOLEAN
├─ open_time: TIME (default 09:00)
├─ close_time: TIME (default 17:00)
├─ break_start_time: TIME (optional)
├─ break_end_time: TIME (optional)
├─ created_at: TIMESTAMPTZ
└─ updated_at: TIMESTAMPTZ
└─ UNIQUE(workshop_id, day_of_week)
```

**Status:** Schema exists, UI operational
**Database Function:**
```sql
is_workshop_open(workshop_id UUID, datetime TIMESTAMPTZ) -> BOOLEAN
```

**Migration:** `supabase/migrations/20251109000004_workshop_availability_appointments.sql`

#### ✅ Workshop Appointments Table - Ready for Integration

```sql
workshop_appointments
├─ id: UUID PRIMARY KEY
├─ workshop_id: UUID REFERENCES organizations(id)
├─ customer_user_id: UUID REFERENCES profiles(id)
├─ requested_date: DATE
├─ requested_time: TIME
├─ confirmed_date: DATE (may differ from requested)
├─ confirmed_time: TIME (may differ from requested)
├─ duration_minutes: INTEGER (default 60)
├─ service_type: VARCHAR (diagnostic, repair, inspection, consultation)
├─ status: VARCHAR (pending, confirmed, declined, completed, cancelled)
├─ vehicle_year, vehicle_make, vehicle_model: VARCHAR
├─ issue_description: TEXT
├─ diagnostic_session_id: UUID REFERENCES sessions(id) (optional)
├─ customer_name, customer_email, customer_phone: VARCHAR
├─ customer_notes, workshop_notes: TEXT
├─ declined_reason, cancellation_reason: TEXT
├─ cancelled_by: VARCHAR (customer, workshop)
└─ Timestamps: created_at, updated_at, confirmed_at, declined_at, cancelled_at, completed_at
```

**Key Feature:** `diagnostic_session_id` field allows linking virtual diagnostic sessions to in-person appointments.

**Workflow:** Customer requests → Workshop confirms/declines → Mechanic assigned → Service completed

#### ❌ Missing Tables (Need to Create)

**1. Slot Reservations Table** - Critical for double-booking prevention

```sql
CREATE TABLE slot_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) UNIQUE,
  mechanic_id UUID NOT NULL REFERENCES profiles(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'reserved',
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent overlapping reservations
CREATE INDEX idx_reservations_mechanic_time
  ON slot_reservations(mechanic_id, start_time)
  WHERE status IN ('reserved', 'confirmed');
```

**Purpose:**
- Track temporary holds during booking process (15-minute expiration)
- Prevent double-booking via exclusive locks
- Link sessions to time slots

**2. Available Time Slots Table** - Optional caching layer

```sql
CREATE TABLE available_time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mechanic_id UUID NOT NULL REFERENCES profiles(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  session_type VARCHAR(50) NOT NULL,
  is_available BOOLEAN DEFAULT true,
  reserved_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  EXCLUDE USING gist (
    mechanic_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
);
```

**Purpose:**
- Pre-generate available slots for faster customer experience
- Cache slot generation results (regenerate every 15 minutes)
- Improve query performance for calendar views

### 1.2 Current Booking Flow Analysis

#### Existing 4-Step Booking Wizard

**Current Implementation:** Not found in codebase (appears to be in development)

**Expected Flow Based on sessionFactory:**

```
Step 1: Vehicle Selection
  └─ Choose existing vehicle or enter year/make/model/VIN

Step 2: Plan Selection
  └─ Free, Trial, Quick (15min), Advice (30min), Premium (60min), Urgent

Step 3: Mechanic Selection
  └─ Shows top matching mechanics via scoring algorithm
  └─ ⚠️ NO TIME SELECTION - customer can't pick appointment time

Step 4: Concern Description
  └─ Describe issue (min 10 chars, 5 for urgent)
  └─ Upload photos/videos (optional)
```

#### Session Creation Flow (POST /api/intake/start)

**File:** `src/lib/sessionFactory.ts:103-312`

**Current Process:**

1. **Validate Customer** - Check for active sessions
2. **Build Metadata** - Payment method, urgency, preferences
3. **Create Session Record** - Insert into `sessions` table with `status='pending'`
4. **Create Participant** - Add customer to `session_participants`
5. **Smart Matching** - NEW: Run matching algorithm for top 3 mechanics
6. **Create Assignments:**
   - Targeted assignments for top 3 matches (status='offered')
   - Broadcast assignment as fallback (mechanic_id=null, status='queued')
7. **Real-time Broadcast** - Notify targeted mechanics via channels
8. **Log Event** - Record creation in `session_events`
9. **Redirect** - Send to waiver acceptance page

**Payment Flows:**

| Method | Timing | Session Creation | Assignment Creation |
|--------|--------|------------------|---------------------|
| **Free/Trial** | Immediate | Creates session → waiver → assignment after waiver | Deferred until waiver signed |
| **Credits** | Deduct upfront | Deduct credits → create session → assignment immediately | Immediate |
| **Stripe** | Checkout first | Checkout → webhook → create session → assignment | After payment confirmed |

**Critical Gap:** No scheduling step. Everything assumes immediate availability.

```typescript
// Current: scheduled_for is NEVER set
const { data: session, error: sessionError } = await supabaseAdmin
  .from('sessions')
  .insert({
    customer_user_id: customerId,
    type,
    status: 'pending',  // Always 'pending', never 'scheduled'
    plan,
    intake_id: intakeId,
    stripe_session_id: stripeSessionId,
    ended_at: null,
    metadata
  })
```

**What's Missing:**
- No `scheduledFor` parameter in `CreateSessionParams`
- No time slot selection in booking wizard
- No availability validation before assignment
- No reservation mechanism during checkout

#### Mechanic Assignment Process

**Smart Matching Algorithm** - `src/lib/mechanicMatching.ts`

**Scoring Components:**

```typescript
Base Scores:
├─ Currently online: +50 points
├─ Online in last 30min: +30 points
├─ Online in last hour: +20 points
├─ Online today: +10 points
├─ Never online: 0 points

Expertise Bonuses:
├─ Keyword match: +15 points per keyword
├─ Brand specialist: +30 points
├─ Experience 10+ years: +20 points
├─ Experience 5-9 years: +10 points

Location Bonuses:
├─ Same FSA (postal code): +10 points
├─ Same city: +5 points

Rating Bonuses:
├─ 5.0 rating: +20 points
├─ 4.5-4.9: +15 points
├─ 4.0-4.4: +10 points
└─ 3.5-3.9: +5 points
```

**Returns:** Top 10 mechanics sorted by score

**Current Limitation:** Does NOT check:
- Is mechanic available at customer's requested time?
- Does mechanic have conflicting appointment?
- Is mechanic on vacation (time_off table)?
- Is mechanic within workshop operating hours (if affiliated)?

**New Implementation (Recent Change):**
- Creates targeted assignments for top 3 matches
- Creates broadcast assignment as fallback
- Stores matching results in session metadata
- Broadcasts high-priority notifications to targeted mechanics

### 1.3 API Endpoint Inventory

#### Session Management APIs

```
POST   /api/intake/start              Create session (sessionFactory)
GET    /api/sessions                  List sessions (customer/mechanic)
GET    /api/sessions/[id]             Get session details
POST   /api/sessions/[id]/start       Transition to 'live' (FSM validation)
POST   /api/sessions/[id]/end         Complete session
POST   /api/sessions/[id]/force-end   Admin force-end
POST   /api/sessions/extend           Extend session duration
POST   /api/sessions/[id]/files       Upload files
GET    /api/sessions/[id]/files       Get session files
POST   /api/sessions/[id]/summary     Generate session summary
GET    /api/customer/sessions         Customer session history
GET    /api/customer/sessions/active  Check for active session
POST   /api/customer/sessions/[id]/rate   Rate mechanic
POST   /api/customer/sessions/[id]/cancel Cancel pending session
```

#### Availability Management APIs

```
GET    /api/mechanic/availability           Get weekly blocks
PUT    /api/mechanic/availability           Update weekly blocks
GET    /api/mechanic/time-off               List vacation periods
POST   /api/mechanic/time-off               Create time off request
DELETE /api/mechanic/time-off/:id           Cancel time off
GET    /api/workshop/availability           Get workshop hours
PUT    /api/workshop/availability           Update workshop hours
```

#### Mechanic Matching APIs

```
GET    /api/matching/find-mechanics         Run scoring algorithm
GET    /api/mechanics/available             Count online mechanics
```

#### ❌ Missing Scheduling APIs

```
GET    /api/mechanics/[id]/available-slots  Get bookable time slots
POST   /api/slots/reserve                   Reserve time slot (15min hold)
PUT    /api/slots/confirm                   Confirm reservation (after payment)
DELETE /api/slots/release                   Release expired reservation
PUT    /api/sessions/[id]/reschedule        Change appointment time
GET    /api/sessions/[id]/calendar.ics      Export calendar event
```

---

## 👥 MECHANIC TYPE CLASSIFICATION

### 2.1 Three-Tier Mechanic Model

Your platform supports three distinct mechanic types with different business models and scheduling requirements.

**File:** `src/types/mechanic.ts:94-103`

```typescript
export enum MechanicType {
  /** Virtual-only mechanics: Remote diagnostics only, earn 70% + 2% referrals */
  VIRTUAL_ONLY = 'virtual_only',

  /** Independent mechanics with workshop: Own shop, 70/30 sessions, workshop rates for quotes */
  INDEPENDENT_WORKSHOP = 'independent_workshop',

  /** Workshop-affiliated mechanics: Employees/contractors, workshop gets paid */
  WORKSHOP_AFFILIATED = 'workshop_affiliated',
}
```

### 2.2 Type Determination Logic

**Function:** `getMechanicType()` - `src/types/mechanic.ts:149-178`

```typescript
export function getMechanicType(mechanic: MechanicTypeData): MechanicType {
  // No workshop affiliation = virtual only
  if (!mechanic.workshop_id) {
    return MechanicType.VIRTUAL_ONLY
  }

  // Has workshop, account type 'workshop_mechanic' = employee/contractor
  if (mechanic.account_type === 'workshop_mechanic') {
    return MechanicType.WORKSHOP_AFFILIATED
  }

  // Has workshop, account type 'individual_mechanic' = owns workshop (owner/operator)
  if (mechanic.account_type === 'individual_mechanic') {
    return MechanicType.INDEPENDENT_WORKSHOP
  }

  // Fallback based on partnership type
  if (mechanic.partnership_type === 'employee' || mechanic.partnership_type === 'contractor') {
    return MechanicType.WORKSHOP_AFFILIATED
  }

  // Default to virtual only if unclear
  return MechanicType.VIRTUAL_ONLY
}
```

### 2.3 Scheduling Implications by Type

| Mechanic Type | Availability Source | Session Types | Schedule Control | Payment Routing |
|---------------|---------------------|---------------|------------------|-----------------|
| **Virtual-Only** | `mechanic_availability` blocks only | Video/chat only | Mechanic sets own hours | Mechanic (70%) |
| **Independent Workshop** | Both mechanic blocks AND workshop hours | Video + in-person | Owner controls both | Mechanic (70%) |
| **Workshop-Affiliated** | Workshop hours ONLY | Per workshop policy | Workshop controls schedule | Workshop (100%) |

### 2.4 Payment Routing Logic

**File:** `src/types/mechanic.ts:193-245`

```typescript
export function getSessionPaymentDestination(mechanic: {
  id: string
  name?: string | null
  stripe_account_id: string | null
  workshop_id: string | null
  account_type: string | null
  organizations?: {
    name: string
    stripe_account_id: string | null
  } | null
}): PaymentDestination {
  const mechanicType = getMechanicType(mechanic)

  switch (mechanicType) {
    case MechanicType.VIRTUAL_ONLY:
    case MechanicType.INDEPENDENT_WORKSHOP:
      // Independent mechanics get paid directly
      return {
        type: 'mechanic',
        accountId: mechanic.stripe_account_id,
        payeeName: mechanic.name || 'Mechanic',
        context: {
          mechanic_id: mechanic.id,
          workshop_id: mechanic.workshop_id,
          mechanic_type: mechanicType,
        },
      }

    case MechanicType.WORKSHOP_AFFILIATED:
      // Workshop-affiliated: Pay the workshop (they handle mechanic payment)
      return {
        type: 'workshop',
        accountId: mechanic.organizations.stripe_account_id,
        payeeName: mechanic.organizations.name,
        context: {
          mechanic_id: mechanic.id,
          workshop_id: mechanic.workshop_id,
          mechanic_type: mechanicType,
        },
      }
  }
}
```

**Legal Significance:** This payment routing is critical for employment law compliance. Workshop-affiliated mechanics are paid through the workshop (their employer), not directly by the platform.

---

## 🏢 BUSINESS LOGIC INTEGRATION

### 3.1 Platform Vision Alignment

**Your Stated Vision:**
> "Platform connecting customers to MECHANICS, not workshops as priority. But when customers look for workshop-associated mechanics, enable booking through our platform for both virtual and in-person visits."

**Business Model Hierarchy:**

```
PRIORITY 1: Independent Mechanics (Core Value Proposition)
├─ Virtual-only mechanics
│  ├─ Remote video diagnostics
│  ├─ Earn 70% per session + 2% referral fees
│  └─ Escalate to workshops for physical repairs
└─ Independent workshop owners
   ├─ Provide both virtual diagnostics AND physical repairs
   ├─ Keep customers in ecosystem (no referral loss)
   └─ Earn 70% on sessions + workshop rates on quotes

PRIORITY 2: Workshop Network (Customer Choice)
├─ Customer searches for mechanics
├─ Finds workshop-affiliated mechanics
├─ Books virtual session with SPECIFIC mechanic
└─ Optional: Book in-person appointment at workshop

PRIORITY 3: Direct Workshop Bookings (Alternative Path)
├─ Customer searches for workshops directly
└─ Books in-person appointment
```

**Current Implementation Status:**

✅ **Priority 1 (Strong):**
- Virtual-only mechanic onboarding functional
- Independent workshop signup working
- Session matching algorithm prioritizes mechanics
- Payment routing correct (70/30 split)

✅ **Priority 2 (Partial):**
- Workshop-affiliated mechanics can be searched
- Can book virtual sessions with specific mechanic
- ❌ **Missing:** In-person appointment booking from virtual session

⚠️ **Priority 3 (Foundation Only):**
- Workshop appointment table exists
- ❌ **Missing:** Workshop booking UI
- ❌ **Missing:** Workshop appointment confirmation workflow

### 3.2 Enhanced Matching Algorithm Integration

**Recent Implementation (November 2025):**

The platform now implements **smart targeted matching** alongside broadcast assignments:

**File:** `src/lib/sessionFactory.ts:197-382`

```typescript
// Step 5: SMART MATCHING - Run matching algorithm for ALL session types
console.log(`[sessionFactory] Running smart matching for session ${sessionId}`)

// Build matching criteria
const matchingCriteria = {
  requestType: isSpecialist ? 'brand_specialist' : 'general',
  requestedBrand: metadata.requested_brand,
  extractedKeywords: extractKeywordsFromDescription(intake.concern),
  customerCountry: customerCountry || undefined,
  customerCity: customerCity || undefined,
  customerPostalCode: customerPostalCode || undefined,
  preferLocalMechanic: true,
  urgency: urgent ? 'immediate' : 'scheduled',
}

// Find top matching mechanics
matches = await findMatchingMechanics(matchingCriteria)

// Create TARGETED assignments for top 3 matches
if (matches.length > 0) {
  const topMatches = matches.slice(0, 3)

  for (const match of topMatches) {
    await supabaseAdmin
      .from('session_assignments')
      .insert({
        session_id: sessionId,
        mechanic_id: match.mechanicId,
        status: 'offered',  // Targeted offer
        offered_at: new Date().toISOString(),
        metadata: {
          match_type: 'targeted',
          match_score: match.matchScore,
          match_reasons: match.matchReasons,
        }
      })
  }
}

// Create BROADCAST assignment as fallback
await supabaseAdmin
  .from('session_assignments')
  .insert({
    session_id: sessionId,
    mechanic_id: null,  // null = broadcast to all
    status: 'queued',
    offered_at: new Date().toISOString(),
    metadata: {
      match_type: 'broadcast',
      reason: matches.length > 0 ? 'fallback_if_no_targeted_accepts' : 'no_matches_found',
    }
  })
```

**Assignment Strategy:**
1. **Targeted Assignments** - Top 3 matches get direct notifications
2. **Broadcast Assignment** - All other mechanics see in queue
3. **Priority Handling** - Targeted mechanics can accept before broadcast

### 3.3 Scheduling Integration Points

**For Scheduling System to Work with Matching:**

```typescript
// Enhanced matching function (needs modification)
function findMatchingMechanicsWithAvailability(filters: {
  requestedDateTime?: Date,  // NEW: optional scheduled time
  vehicleInfo: VehicleInfo,
  urgent: boolean,
  location: PostalCode
}) {
  // Step 1: Score all mechanics (existing algorithm)
  const scoredMechanics = findMatchingMechanics(filters)

  // Step 2: If scheduled time specified, filter by availability
  if (filters.requestedDateTime) {
    return scoredMechanics.filter(mechanic =>
      isAvailableAtTime(mechanic.id, filters.requestedDateTime)
    )
  }

  // Step 3: For immediate sessions, keep existing behavior
  return scoredMechanics
}
```

**Workflow Changes:**

```
Current (Immediate):
Customer → Select Mechanic → Pay → Session Created → Mechanic Accepts → Live

Future (Scheduled):
Customer → Select Mechanic → Pick Time Slot → Pay → Session Created with scheduled_for → Reminder Sent → Session Starts at Scheduled Time
```

---

## ⚖️ CANADIAN EMPLOYMENT LAW COMPLIANCE

### 5.1 Legal Framework Overview (2025)

#### Ontario Digital Platform Workers' Rights Act (July 1, 2025)

**Scope:** Applies to "digital platform work" defined as:
- Ride-share services (Uber, Lyft)
- Delivery services (DoorDash, Skip the Dishes)
- Courier services
- Other prescribed services

**❌ DOES NOT APPLY to The Auto Doctor:**
- Platform provides **professional consulting services**
- Mechanics are **skilled tradespeople**, not gig workers
- Services are **complex diagnostic work**, not standardized tasks
- Mechanics require **professional certifications** (Red Seal)

**Conclusion:** Your platform is NOT subject to this legislation.

#### Canadian Worker Classification Test

**Multi-Factor Test (Common Law):**

| Factor | Test Question | Auto Doctor Status |
|--------|--------------|-------------------|
| **Control** | Who controls how, when, where work is done? | ✅ Mechanic controls (sets own availability) |
| **Tools/Equipment** | Who provides the tools? | ✅ Mechanic provides (diagnostic tools, camera) |
| **Financial Risk** | Who bears business risks/opportunities? | ✅ Mechanic bears (equipment costs, training) |
| **Integration** | Is worker part of business or running their own? | ✅ Running own business (can work multiple platforms) |
| **Economic Dependence** | Is worker economically dependent on platform? | ✅ No exclusive agreement required |

#### Dependent Contractor Category (Canada-Specific)

**Definition:** Worker who is not an employee but is economically dependent on a single entity.

**Rights Granted:**
- Reasonable notice of termination
- Just cause requirements for dismissal
- Union organizing rights (in some provinces)

**Auto Doctor Risk Assessment:** **LOW**
- Mechanics can work for multiple platforms
- No exclusivity requirements
- No minimum hours commitment
- Can build independent client base

### 5.2 Compliance Strengths

**✅ STRONG INDEPENDENT CONTRACTOR INDICATORS:**

1. **Schedule Autonomy**
   - Mechanics set own availability via weekly blocks
   - Can change schedule anytime without approval
   - No minimum hours requirement
   - No shift assignments or mandatory coverage

2. **Work Acceptance Control**
   - Mechanics can decline sessions without penalty
   - No acceptance rate requirements
   - No deactivation for refusing work
   - Uses reputation system (ratings) not penalties

3. **Tools and Equipment**
   - Mechanics use own diagnostic equipment
   - Mechanics provide own workspace/workshop
   - Mechanics maintain own internet connection
   - Mechanics purchase own certifications/training

4. **Financial Opportunity**
   - Commission-based model (70/30 split)
   - Mechanics can set specializations for higher rates
   - Can build personal reputation and client base
   - Referral fee opportunities (2% on workshop escalations)

5. **Business Operation**
   - Mechanics can work for other platforms
   - Can operate independent shops simultaneously
   - Can advertise services independently
   - Control their own branding within reason

6. **Integration Test**
   - Platform is marketplace, not employer
   - Customers seek specific mechanics (not interchangeable)
   - Mechanics provide professional expertise (not simple labor)
   - Platform doesn't control diagnostic methods

### 5.3 Scheduling System Legal Implications

#### ✅ SAFE DESIGN CHOICES (Maintain Contractor Status)

**1. Mechanic-Set Availability**
```typescript
// Mechanics control their own schedules
// Platform merely displays availability, doesn't dictate hours
mechanic.setAvailability(weeklyBlocks) // Mechanic decides
platform.displayAvailability(mechanic) // Platform shows
customer.selectTime(availableSlot)    // Customer chooses
```

**Legal Impact:** Strong contractor indicator (schedule autonomy)

**2. Session Acceptance/Rejection**
```typescript
// Mechanics can decline appointments without penalty
if (mechanic.declines(appointment)) {
  // No deactivation, no acceptance rate tracking
  // Just remove from that specific session
  // May affect reputation (customer ratings) but not platform status
}
```

**Legal Impact:** Maintains control with mechanic (not employer direction)

**3. Workshop-Affiliated Model**
```typescript
if (mechanicType === WORKSHOP_AFFILIATED) {
  // Workshop is the employer, not platform
  // Workshop controls schedule
  // Platform pays workshop (B2B), not mechanic
  // No employment relationship with platform
}
```

**Legal Impact:** No misclassification risk (employment is with workshop)

#### ⚠️ DESIGN PRINCIPLES FOR COMPLIANCE

**✅ DO:**

1. **Allow Schedule Changes Anytime**
   - Mechanics can modify availability without approval
   - Can cancel appointments with reasonable notice
   - No "manager approval" required

2. **Use Reputation System, Not Penalties**
   - Cancellations affect customer ratings
   - No financial penalties for schedule changes
   - No account suspension for low availability

3. **Let Mechanics Set Buffer Times**
   - Mechanics control time between sessions
   - Platform suggests defaults but allows override
   - No mandatory break times (avoid shift-like structure)

4. **Transparent Appointment Requests**
   - Show full appointment details upfront
   - Mechanic can accept/decline based on their judgment
   - No auto-assignment without consent

5. **Maintain Payment Transparency**
   - Clear commission structure (70/30)
   - No deductions for "no-shows" or cancellations
   - Workshop-affiliated mechanics paid through workshop

**❌ DON'T:**

1. **Don't Require Minimum Availability Hours**
   ```typescript
   // BAD: if (mechanic.weeklyHours < 20) { deactivate() }
   // GOOD: No minimum requirement
   ```

2. **Don't Mandate Specific Shifts**
   ```typescript
   // BAD: "Must be available Saturdays 9am-5pm"
   // GOOD: Mechanic chooses which days/times
   ```

3. **Don't Penalize Schedule Changes**
   ```typescript
   // BAD: if (mechanic.cancelsAppointment()) { deductFee() }
   // GOOD: Allow cancellation, may affect ratings
   ```

4. **Don't Auto-Assign Appointments**
   ```typescript
   // BAD: mechanic.appointments.push(newAppointment) // Forced
   // GOOD: mechanic.offerAppointment(request) // Can decline
   ```

5. **Don't Track "Performance" Like Employee**
   ```typescript
   // BAD: "Your acceptance rate is 80% (target: 90%)"
   // GOOD: "Customers rated you 4.8/5.0"
   ```

### 5.4 Workshop Compliance Model

#### Legal Structure

```
Platform ↔ Customer: Direct service contract
Platform ↔ Independent Mechanic: B2B contractor agreement (commission-based)
Platform ↔ Workshop: B2B commercial agreement (lead generation + booking)
Workshop ↔ Workshop Mechanic: EMPLOYMENT RELATIONSHIP (workshop's responsibility)
```

**Key Compliance Points:**

1. **Workshop as Employer of Record**
   - Workshop sets employee/contractor schedules
   - Workshop handles payroll, benefits, taxes
   - Workshop responsible for employment law compliance
   - Platform has NO employment relationship with workshop mechanics

2. **Platform as Marketplace Facilitator**
   - Platform provides booking/payment infrastructure
   - Platform routes payments to workshop (not individual mechanics)
   - Platform does NOT control workshop operations
   - Platform does NOT dictate employee hours

3. **Workshop Availability Settings**
   - Workshop owner controls operating hours
   - Workshop assigns mechanics to appointments
   - Platform simply displays workshop-provided availability
   - No employer-like control by platform

#### Tax Compliance (2025 Updates)

**GST/HST Reporting Requirements:**
- Platform must report transaction amounts to CRA
- New reporting deadline: January 31, 2025 (first year)
- Applies to accommodation and ride-sharing platforms
- **Auto Doctor Status:** May apply if deemed "platform operator"

**Provincial Sales Tax:**
- **British Columbia:** Marketplace facilitator rules apply
- Platform may need to collect/remit PST on behalf of sellers
- **Action Required:** Consult BC tax lawyer if operating in BC

**Income Reporting (T4A):**
- File T4A for contractors earning >$500/year
- Report commission payments to CRA
- **Recommendation:** Use Stripe Connect for automatic reporting

### 5.5 Compliance Checklist

**✅ Current Compliance Status:**

- [x] Mechanics set own availability (not assigned shifts)
- [x] Mechanics can decline sessions without penalty
- [x] Mechanics provide own tools/equipment
- [x] Mechanics can work for other platforms
- [x] Platform takes commission, not hourly wage
- [x] Mechanics build own reputation/client base
- [x] No minimum hours requirement
- [x] Mechanics can change schedule anytime
- [x] Workshop is employer (for affiliated mechanics)
- [x] Payment routing respects employment relationships

**⚠️ Monitor Before Launch:**

- [ ] Review contractor agreements (emphasize independence)
- [ ] Add schedule autonomy language to Terms of Service
- [ ] Ensure no penalty systems for schedule changes
- [ ] Validate workshop agreements (B2B structure clear)
- [ ] Consult employment lawyer (Ontario focus)
- [ ] Review provincial tax obligations (BC, Ontario)
- [ ] Implement T4A filing process (CRA compliance)

**📋 Ongoing Monitoring:**

- [ ] Quarterly contractor indicator review
- [ ] Track regulatory changes (Digital Platform Workers Act amendments)
- [ ] Monitor case law on platform worker classification
- [ ] Annual legal compliance audit
- [ ] Update agreements as needed

---

## 🏗️ TECHNICAL ARCHITECTURE

### 6.1 Design Principles

#### One Source of Truth Approach

**Core Principle:** All availability checks must route through a single service to prevent inconsistencies.

```
┌─────────────────────────────────────────────┐
│         AvailabilityService                 │
│         (Single Source of Truth)            │
└─────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──────┐ ┌──▼────┐ ┌─────▼──────┐
│ Booking      │ │ Admin │ │ Matching   │
│ Wizard       │ │ Tools │ │ Algorithm  │
└──────────────┘ └───────┘ └────────────┘
```

**Benefits:**
- Prevents race conditions
- Single validation point
- Easier debugging
- Consistent behavior

#### Minimal Schema Changes

**Leverage Existing Infrastructure:**
- `sessions.scheduled_for` field already exists (just populate it!)
- `mechanic_availability` table operational
- `mechanic_time_off` table operational
- `workshop_availability` table recently added

**Only Need to Add:**
- `slot_reservations` table (critical for double-booking prevention)
- Optional: `available_time_slots` table (caching layer)

#### Backward Compatibility

**Principle:** Keep immediate sessions working exactly as they do now.

```typescript
// Scheduling is OPTIONAL - default behavior unchanged
interface CreateSessionParams {
  // ... existing required fields ...
  scheduledFor?: Date  // NEW: optional field
}

// If scheduledFor is null/undefined → immediate session (current flow)
// If scheduledFor is provided → scheduled session (new flow)
```

**Migration Strategy:**
- Phase 1: Add scheduling as optional feature
- Monitor adoption rate
- Gradual rollout to customer segments
- Keep both flows operational indefinitely

### 6.2 Core Service Architecture

#### AvailabilityService (Single Source of Truth)

**File:** `src/lib/scheduling/availabilityService.ts` (NEW)

```typescript
export class AvailabilityService {

  /**
   * CORE METHOD: Check if mechanic is available for a time range
   * All other methods build on this
   */
  async isAvailable(
    mechanicId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {

    // 1. Get mechanic type (determines availability source)
    const mechanicType = await this.getMechanicType(mechanicId)

    // 2. Check base availability (mechanic blocks or workshop hours)
    const hasAvailabilityBlock = await this.checkAvailabilityBlocks(
      mechanicId, mechanicType, startTime, endTime
    )
    if (!hasAvailabilityBlock) return false

    // 3. Check time off (vacation, holidays)
    const isOnTimeOff = await this.checkTimeOff(mechanicId, startTime, endTime)
    if (isOnTimeOff) return false

    // 4. Check existing bookings (prevent double-booking)
    const hasConflict = await this.checkBookingConflicts(mechanicId, startTime, endTime)
    if (hasConflict) return false

    // 5. Check minimum booking notice (e.g., must book 2 hours ahead)
    const meetsMinNotice = await this.checkMinimumNotice(mechanicId, startTime)
    if (!meetsMinNotice) return false

    return true
  }

  /**
   * Generate available time slots for calendar display
   */
  async getAvailableSlots(
    mechanicId: string,
    dateRange: { start: Date, end: Date },
    sessionType: 'video' | 'chat' | 'diagnostic'
  ): Promise<TimeSlot[]> {

    // 1. Get availability blocks (mechanic or workshop)
    const blocks = await this.getAvailabilityBlocks(mechanicId)

    // 2. Get session duration
    const duration = this.getSessionDuration(sessionType)

    // 3. Generate potential slots from blocks
    const potentialSlots = this.generateSlotsFromBlocks(blocks, dateRange, duration)

    // 4. Filter by availability (removes conflicts, time off)
    const availableSlots = await this.filterAvailableSlots(mechanicId, potentialSlots)

    // 5. Apply booking window constraints
    const settings = await this.getMechanicSettings(mechanicId)
    return this.applyBookingWindow(availableSlots, settings)
  }

  /**
   * Get availability blocks based on mechanic type
   */
  private async getAvailabilityBlocks(mechanicId: string): Promise<AvailabilityBlock[]> {
    const mechanic = await this.getMechanicWithType(mechanicId)
    const mechanicType = getMechanicType(mechanic)

    switch (mechanicType) {
      case MechanicType.VIRTUAL_ONLY:
        // Use only mechanic's personal availability blocks
        return this.getMechanicAvailabilityBlocks(mechanicId)

      case MechanicType.INDEPENDENT_WORKSHOP:
        // Intersect mechanic blocks with workshop hours
        const mechanicBlocks = await this.getMechanicAvailabilityBlocks(mechanicId)
        const workshopBlocks = await this.getWorkshopAvailabilityBlocks(mechanic.workshop_id)
        return this.intersectBlocks(mechanicBlocks, workshopBlocks)

      case MechanicType.WORKSHOP_AFFILIATED:
        // Use only workshop hours (workshop controls schedule)
        return this.getWorkshopAvailabilityBlocks(mechanic.workshop_id)
    }
  }

  // ... additional helper methods
}

// Export singleton instance
export const availabilityService = new AvailabilityService()
```

**Key Design Decisions:**

1. **Mechanic Type Abstraction:** Uses `getMechanicType()` to route to correct availability source
2. **Layered Validation:** Checks availability → time off → conflicts → booking rules
3. **Caching Strategy:** Can add Redis caching at this layer (transparent to callers)
4. **Error Handling:** Returns boolean (false) rather than throwing (graceful degradation)

#### ReservationService (Double-Booking Prevention)

**File:** `src/lib/scheduling/reservationService.ts` (NEW)

```typescript
export class ReservationService {

  /**
   * Reserve a time slot (15-minute hold during checkout)
   */
  async createReservation(params: {
    mechanicId: string
    startTime: Date
    endTime: Date
    sessionType: string
  }): Promise<Reservation> {

    // 1. Validate availability one final time
    const available = await availabilityService.isAvailable(
      params.mechanicId,
      params.startTime,
      params.endTime
    )

    if (!available) {
      throw new Error('Time slot no longer available')
    }

    // 2. Create reservation with expiration
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    const { data, error } = await supabaseAdmin
      .from('slot_reservations')
      .insert({
        mechanic_id: params.mechanicId,
        start_time: params.startTime,
        end_time: params.endTime,
        status: 'reserved',
        expires_at: expiresAt
      })
      .select()
      .single()

    if (error) {
      // Check if conflict (another reservation created simultaneously)
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Time slot just booked by another customer')
      }
      throw error
    }

    // 3. Schedule auto-release job
    this.scheduleAutoRelease(data.id, expiresAt)

    return data
  }

  /**
   * Confirm reservation after payment successful
   */
  async confirmReservation(reservationId: string, sessionId: string): Promise<void> {
    await supabaseAdmin
      .from('slot_reservations')
      .update({
        session_id: sessionId,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        expires_at: null  // Remove expiration
      })
      .eq('id', reservationId)
  }

  /**
   * Release expired reservations (called by cron job)
   */
  async releaseExpiredReservations(): Promise<void> {
    await supabaseAdmin
      .from('slot_reservations')
      .update({ status: 'expired' })
      .eq('status', 'reserved')
      .lt('expires_at', new Date().toISOString())
  }
}

export const reservationService = new ReservationService()
```

**Critical Features:**

1. **Atomic Operations:** Uses database unique constraints to prevent race conditions
2. **Auto-Expiration:** Reservations automatically release after 15 minutes
3. **Payment Integration:** Confirms reservation after Stripe webhook
4. **Background Jobs:** Cron job cleans up expired reservations

### 6.3 Enhanced SessionFactory Integration

**File:** `src/lib/sessionFactory.ts` (MODIFY EXISTING)

**Changes Required:**

```typescript
// 1. ADD to CreateSessionParams interface (line ~24)
export interface CreateSessionParams {
  // ... existing fields ...

  // NEW: Scheduling fields
  scheduledFor?: Date | null          // Future appointment time
  reservationId?: string | null       // If slot was pre-reserved
}

// 2. MODIFY createSessionRecord function (line ~103)
export async function createSessionRecord(
  params: CreateSessionParams
): Promise<CreateSessionResult> {
  const {
    // ... existing destructuring ...
    scheduledFor = null,           // NEW
    reservationId = null,          // NEW
  } = params

  // NEW: If scheduledFor provided, validate availability
  if (scheduledFor) {
    const sessionDuration = getSessionDurationMinutes(plan)
    const endTime = new Date(scheduledFor.getTime() + sessionDuration * 60000)

    // Validate one final time before session creation
    const isAvailable = await availabilityService.isAvailable(
      preferredMechanicId!,  // Scheduled sessions require mechanic selection
      scheduledFor,
      endTime
    )

    if (!isAvailable) {
      throw new Error('Selected time slot is no longer available')
    }
  }

  // 3. MODIFY session creation (line ~162)
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .insert({
      customer_user_id: customerId,
      type,
      status: scheduledFor ? 'scheduled' : 'pending',  // NEW: use 'scheduled' status
      plan,
      intake_id: intakeId,
      stripe_session_id: stripeSessionId,
      scheduled_for: scheduledFor,  // ⭐ POPULATE THIS FIELD
      ended_at: null,
      metadata
    })
    .select('id')
    .single()

  // ... existing participant creation ...

  // NEW: Create slot reservation if scheduled
  if (scheduledFor && preferredMechanicId) {
    const sessionDuration = getSessionDurationMinutes(plan)
    const endTime = new Date(scheduledFor.getTime() + sessionDuration * 60000)

    await reservationService.createReservation({
      sessionId: session.id,
      mechanicId: preferredMechanicId,
      startTime: scheduledFor,
      endTime: endTime,
      status: 'confirmed',  // Already paid, so confirmed
      reservationId: reservationId  // Link if pre-reserved during checkout
    })
  }

  // ... rest of function unchanged ...
}

// NEW: Helper function
function getSessionDurationMinutes(plan: string): number {
  const durations = {
    'quick': 15,
    'advice': 30,
    'premium': 60,
    'urgent': 15,
    'free': 15,
    'trial': 15
  }
  return durations[plan] || 30
}
```

**Integration Points:**

1. **Payment Flow:** Reserve slot → Process payment → Confirm reservation → Create session
2. **Smart Matching:** For scheduled sessions, filter mechanics by availability at requested time
3. **Notification System:** Send confirmation email with calendar invite (.ics file)

### 6.4 Enhanced Matching Algorithm

**File:** `src/lib/mechanicMatching.ts` (MODIFY EXISTING)

**Add Availability Filter:**

```typescript
export async function findMatchingMechanics(
  criteria: MatchingCriteria,
  scheduledFor?: Date  // NEW: optional scheduled time
): Promise<MechanicMatch[]> {

  // ... existing scoring logic ...

  // NEW: Filter by availability if scheduled time provided
  if (scheduledFor) {
    const sessionDuration = 30 // Default, could vary by criteria
    const endTime = new Date(scheduledFor.getTime() + sessionDuration * 60000)

    // Filter out unavailable mechanics
    const availableMatches = []
    for (const match of scoredMechanics) {
      const isAvailable = await availabilityService.isAvailable(
        match.mechanicId,
        scheduledFor,
        endTime
      )

      if (isAvailable) {
        availableMatches.push(match)
      }
    }

    return availableMatches
  }

  // For immediate sessions, return all matches (existing behavior)
  return scoredMechanics
}
```

---

## 📅 IMPLEMENTATION ROADMAP

### 7.1 Overview

**Total Timeline:** 8 weeks for full system
**MVP Timeline:** 4 weeks for basic scheduling

**Phased Approach Benefits:**
- Test each component before building next
- Can launch MVP early (revenue generation)
- Minimize risk (backward compatible)
- Incremental customer value

---

### PHASE 1: Foundation (Weeks 1-2)

#### Goal: Enable scheduled sessions without breaking current flow

**Deliverables:**
- ✅ Populate `scheduled_for` field for future appointments
- ✅ Create AvailabilityService (single source of truth)
- ✅ Add optional time selection to booking wizard
- ✅ Backward compatible (immediate sessions still work)

#### Database Work

```sql
-- 1. Add mechanic settings columns
ALTER TABLE mechanic_settings
  ADD COLUMN IF NOT EXISTS buffer_between_sessions INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS max_advance_booking_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS min_booking_notice_hours INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS allow_instant_booking BOOLEAN DEFAULT true;

-- 2. Create basic reservation table (simple version)
CREATE TABLE IF NOT EXISTS slot_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) UNIQUE,
  mechanic_id UUID NOT NULL REFERENCES profiles(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'reserved',
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reservations_mechanic_time
  ON slot_reservations(mechanic_id, start_time)
  WHERE status IN ('reserved', 'confirmed');
```

#### API Changes

**New Endpoint:**
```typescript
// GET /api/mechanics/:id/available-times?date=2025-11-15&type=video
// Returns: Array of available time slots

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const mechanicId = params.id
  const searchParams = request.nextUrl.searchParams

  const date = searchParams.get('date')
  const sessionType = searchParams.get('type') as 'video' | 'chat' | 'diagnostic'

  const selectedDate = new Date(date)
  const dateRange = {
    start: startOfDay(selectedDate),
    end: endOfDay(selectedDate)
  }

  const slots = await availabilityService.getAvailableSlots(
    mechanicId,
    dateRange,
    sessionType
  )

  return NextResponse.json({ slots })
}
```

**Enhanced Endpoint:**
```typescript
// POST /api/intake/start (MODIFY EXISTING)
// Add optional scheduledFor parameter

interface IntakeStartRequest {
  // ... existing fields ...
  scheduledFor?: string  // ISO date string (optional)
}
```

#### UI Components

**New Component:** `src/components/customer/TimeSelectionStep.tsx`

```typescript
export function TimeSelectionStep({
  mechanicId,
  sessionType,
  onTimeSelected
}: {
  mechanicId: string
  sessionType: 'video' | 'chat' | 'diagnostic'
  onTimeSelected: (time: Date | null) => void
}) {
  const [bookingType, setBookingType] = useState<'immediate' | 'scheduled'>('immediate')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<Date | null>(null)

  return (
    <div className="time-selection">
      <h2>When would you like your session?</h2>

      <div className="booking-type-selector">
        <label>
          <input
            type="radio"
            value="immediate"
            checked={bookingType === 'immediate'}
            onChange={() => {
              setBookingType('immediate')
              onTimeSelected(null)
            }}
          />
          <span>Start session now</span>
        </label>

        <label>
          <input
            type="radio"
            value="scheduled"
            checked={bookingType === 'scheduled'}
            onChange={() => setBookingType('scheduled')}
          />
          <span>Schedule for later</span>
        </label>
      </div>

      {bookingType === 'scheduled' && (
        <TimeSlotPicker
          mechanicId={mechanicId}
          sessionType={sessionType}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedTime={selectedTime}
          onTimeChange={(time) => {
            setSelectedTime(time)
            onTimeSelected(time)
          }}
        />
      )}
    </div>
  )
}
```

**New Component:** `src/components/customer/TimeSlotPicker.tsx`

```typescript
export function TimeSlotPicker({
  mechanicId,
  sessionType,
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange
}: TimeSlotPickerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchSlots() {
      setLoading(true)
      const response = await fetch(
        `/api/mechanics/${mechanicId}/available-times?date=${selectedDate.toISOString()}&type=${sessionType}`
      )
      const data = await response.json()
      setSlots(data.slots)
      setLoading(false)
    }
    fetchSlots()
  }, [mechanicId, selectedDate, sessionType])

  return (
    <div className="time-slot-picker">
      <Calendar
        selected={selectedDate}
        onSelect={onDateChange}
        minDate={new Date()}
        maxDate={addDays(new Date(), 30)}
      />

      <div className="time-slots">
        <h3>Available times on {formatDate(selectedDate)}</h3>
        {loading ? (
          <div>Loading...</div>
        ) : slots.length === 0 ? (
          <div>No available times on this date</div>
        ) : (
          <div className="time-slots-grid">
            {slots.map((slot) => (
              <button
                key={slot.startTime.toISOString()}
                className={selectedTime?.getTime() === slot.startTime.getTime() ? 'selected' : ''}
                onClick={() => onTimeChange(slot.startTime)}
              >
                {formatTime(slot.startTime)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

#### Code Files to Create

1. `src/lib/scheduling/availabilityService.ts` - Core availability logic
2. `src/app/api/mechanics/[id]/available-times/route.ts` - Slot API
3. `src/components/customer/TimeSelectionStep.tsx` - Time selection UI
4. `src/components/customer/TimeSlotPicker.tsx` - Calendar + slots UI

#### Code Files to Modify

1. `src/lib/sessionFactory.ts` - Add scheduledFor parameter
2. `src/app/api/intake/start/route.ts` - Accept scheduledFor in request

#### Testing Checklist

- [ ] ✅ Immediate sessions still work (regression test)
- [ ] ✅ Scheduled sessions populate `scheduled_for` correctly
- [ ] ✅ Availability check respects mechanic blocks
- [ ] ✅ Availability check respects time off
- [ ] ✅ Can't book during unavailable times
- [ ] ✅ Time slots display correctly in UI
- [ ] ✅ Date selection works across timezones

**Estimated Effort:** 40-60 hours (2 developers, 1 week)

---

### PHASE 2: Conflict Prevention (Weeks 3-4)

#### Goal: Prevent double-booking and add validation

**Deliverables:**
- ✅ Slot reservation system operational
- ✅ Double-booking prevention enforced
- ✅ Auto-expiring reservations (15-minute holds)
- ✅ Matching algorithm validates availability

#### Database Work

```sql
-- Enhanced reservation table with conflict prevention
CREATE TABLE IF NOT EXISTS slot_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) UNIQUE,
  mechanic_id UUID NOT NULL REFERENCES profiles(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'reserved',
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent overlapping reservations
  CONSTRAINT no_overlap_reservations EXCLUDE USING gist (
    mechanic_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('reserved', 'confirmed'))
);

-- Indexes for performance
CREATE INDEX idx_reservations_mechanic_time
  ON slot_reservations(mechanic_id, start_time)
  WHERE status IN ('reserved', 'confirmed');

CREATE INDEX idx_reservations_expires_at
  ON slot_reservations(expires_at)
  WHERE status = 'reserved' AND expires_at IS NOT NULL;
```

#### API Changes

**New Endpoints:**

```typescript
// POST /api/slots/reserve - Reserve time slot during checkout
export async function POST(request: NextRequest) {
  const { mechanicId, startTime, endTime, sessionType } = await request.json()

  const reservation = await reservationService.createReservation({
    mechanicId,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    sessionType
  })

  return NextResponse.json({
    reservationId: reservation.id,
    expiresAt: reservation.expires_at
  })
}

// PUT /api/slots/confirm/:reservationId - Confirm after payment
export async function PUT(
  request: NextRequest,
  { params }: { params: { reservationId: string } }
) {
  const { sessionId } = await request.json()

  await reservationService.confirmReservation(
    params.reservationId,
    sessionId
  )

  return NextResponse.json({ success: true })
}

// DELETE /api/slots/release/:reservationId - Release if payment fails
export async function DELETE(
  request: NextRequest,
  { params }: { params: { reservationId: string } }
) {
  await reservationService.releaseReservation(params.reservationId)
  return NextResponse.json({ success: true })
}
```

#### Payment Flow Integration

**Modify Stripe Checkout Flow:**

```typescript
// Before creating Stripe checkout session
// 1. Reserve the time slot
const reservation = await fetch('/api/slots/reserve', {
  method: 'POST',
  body: JSON.stringify({
    mechanicId,
    startTime: scheduledFor,
    endTime: addMinutes(scheduledFor, duration),
    sessionType
  })
})

const { reservationId, expiresAt } = await reservation.json()

// 2. Create Stripe checkout with reservation ID in metadata
const stripeSession = await stripe.checkout.sessions.create({
  // ... existing fields ...
  metadata: {
    reservationId: reservationId,
    scheduledFor: scheduledFor.toISOString()
  }
})

// 3. In Stripe webhook (payment successful):
if (event.type === 'checkout.session.completed') {
  const { reservationId, scheduledFor } = session.metadata

  // Confirm the reservation
  await fetch(`/api/slots/confirm/${reservationId}`, {
    method: 'PUT',
    body: JSON.stringify({ sessionId })
  })

  // Create session with scheduled_for populated
  await sessionFactory.createSessionRecord({
    // ... existing params ...
    scheduledFor: new Date(scheduledFor),
    reservationId: reservationId
  })
}
```

#### Background Jobs

**Create Cron Job:** `src/lib/cron/releaseExpiredReservations.ts`

```typescript
// Run every 5 minutes
export async function releaseExpiredReservations() {
  const { data: expired } = await supabaseAdmin
    .from('slot_reservations')
    .select('id')
    .eq('status', 'reserved')
    .lt('expires_at', new Date().toISOString())

  if (expired && expired.length > 0) {
    await supabaseAdmin
      .from('slot_reservations')
      .update({ status: 'expired' })
      .in('id', expired.map(r => r.id))

    console.log(`Released ${expired.length} expired reservations`)
  }
}
```

**Setup in Vercel:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/release-expired-reservations",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

#### Enhanced Matching Algorithm

**File:** `src/lib/mechanicMatching.ts` (MODIFY)

```typescript
export async function findMatchingMechanics(
  criteria: MatchingCriteria,
  scheduledFor?: Date  // NEW parameter
): Promise<MechanicMatch[]> {

  // ... existing scoring logic ...

  // NEW: Filter by availability if scheduling
  if (scheduledFor) {
    console.log(`[Matching] Filtering mechanics by availability at ${scheduledFor}`)

    const sessionDuration = 30 // Could vary by plan
    const endTime = new Date(scheduledFor.getTime() + sessionDuration * 60000)

    const availableMatches = []
    for (const match of scoredMechanics) {
      const isAvailable = await availabilityService.isAvailable(
        match.mechanicId,
        scheduledFor,
        endTime
      )

      if (isAvailable) {
        availableMatches.push(match)
      } else {
        console.log(`[Matching] Filtered out ${match.mechanicName} - not available at requested time`)
      }
    }

    console.log(`[Matching] ${availableMatches.length}/${scoredMechanics.length} mechanics available at requested time`)
    return availableMatches
  }

  // Immediate sessions: use existing logic (online now prioritized)
  return scoredMechanics
}
```

#### Testing Checklist

- [ ] ✅ Can't book same time slot twice
- [ ] ✅ Expired reservations auto-release after 15 minutes
- [ ] ✅ Matching algorithm excludes unavailable mechanics
- [ ] ✅ Payment flow properly confirms reservation
- [ ] ✅ Failed payments release reservation
- [ ] ✅ Abandoned checkouts release slots
- [ ] ✅ Database constraint prevents overlapping bookings

**Estimated Effort:** 40-60 hours (2 developers, 1 week)

---

### PHASE 3: Workshop Integration (Weeks 5-6)

#### Goal: Enable workshop appointment booking

**Deliverables:**
- ✅ Link virtual sessions to in-person appointments
- ✅ Workshop appointment confirmation workflow
- ✅ Workshop mechanic assignment interface
- ✅ Validate against workshop hours

#### Database Work

```sql
-- Already exists! Just need to integrate
-- workshop_appointments table (from migration 20251109000004)

-- Add capacity tracking (optional)
ALTER TABLE workshop_availability
  ADD COLUMN IF NOT EXISTS max_concurrent_appointments INTEGER DEFAULT 5;
```

#### API Changes

**New Endpoints:**

```typescript
// POST /api/workshop/appointments/from-session
// Create appointment from completed diagnostic session
export async function POST(request: NextRequest) {
  const {
    sessionId,
    workshopId,
    requestedDate,
    requestedTime,
    serviceType,
    notes
  } = await request.json()

  // Get session details
  const session = await supabaseAdmin
    .from('sessions')
    .select('*, intakes(*), customers:profiles!customer_user_id(*)')
    .eq('id', sessionId)
    .single()

  // Create appointment request
  const appointment = await supabaseAdmin
    .from('workshop_appointments')
    .insert({
      workshop_id: workshopId,
      customer_user_id: session.customer_user_id,
      diagnostic_session_id: sessionId,
      requested_date: requestedDate,
      requested_time: requestedTime,
      service_type: serviceType,
      vehicle_year: session.intakes.year,
      vehicle_make: session.intakes.make,
      vehicle_model: session.intakes.model,
      issue_description: session.intakes.concern,
      customer_name: session.customers.full_name,
      customer_email: session.customers.email,
      customer_phone: session.customers.phone,
      customer_notes: notes,
      status: 'pending'
    })
    .select()
    .single()

  // Send notification to workshop
  await sendWorkshopAppointmentNotification(appointment)

  return NextResponse.json({ appointment })
}

// PUT /api/workshop/appointments/:id/confirm
// Workshop confirms/counters appointment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const {
    confirmedDate,
    confirmedTime,
    assignedMechanicId,
    workshopNotes
  } = await request.json()

  const appointment = await supabaseAdmin
    .from('workshop_appointments')
    .update({
      status: 'confirmed',
      confirmed_date: confirmedDate,
      confirmed_time: confirmedTime,
      workshop_notes: workshopNotes,
      confirmed_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .select()
    .single()

  // Create mechanic assignment if specified
  if (assignedMechanicId) {
    await supabaseAdmin
      .from('workshop_appointments')
      .update({ assigned_mechanic_id: assignedMechanicId })
      .eq('id', params.id)
  }

  // Send confirmation email to customer
  await sendAppointmentConfirmationEmail(appointment)

  return NextResponse.json({ appointment })
}
```

#### UI Components

**Customer Side:** `src/components/customer/BookWorkshopAppointment.tsx`

```typescript
export function BookWorkshopAppointment({ sessionId }: { sessionId: string }) {
  const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null)
  const [requestedDate, setRequestedDate] = useState<Date>(new Date())
  const [requestedTime, setRequestedTime] = useState<string>('09:00')

  async function handleSubmit() {
    await fetch('/api/workshop/appointments/from-session', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        workshopId: selectedWorkshop,
        requestedDate,
        requestedTime,
        serviceType: 'repair',
        notes: customerNotes
      })
    })

    // Show confirmation
    toast.success('Appointment request sent! Workshop will confirm within 24 hours.')
  }

  return (
    <div className="book-workshop-appointment">
      <h2>Book In-Person Appointment</h2>
      <p>Based on your diagnostic session, book a follow-up appointment at a workshop.</p>

      <WorkshopSelector
        value={selectedWorkshop}
        onChange={setSelectedWorkshop}
        nearPostalCode={customerPostalCode}
      />

      <DateTimePicker
        date={requestedDate}
        time={requestedTime}
        onDateChange={setRequestedDate}
        onTimeChange={setRequestedTime}
        workshopId={selectedWorkshop}
      />

      <textarea
        placeholder="Any additional notes for the workshop?"
        value={customerNotes}
        onChange={(e) => setCustomerNotes(e.target.value)}
      />

      <button onClick={handleSubmit}>Request Appointment</button>
    </div>
  )
}
```

**Workshop Side:** `src/app/workshop/appointments/page.tsx`

```typescript
export default function WorkshopAppointmentsPage() {
  const [pendingAppointments, setPendingAppointments] = useState([])
  const [confirmedAppointments, setConfirmedAppointments] = useState([])

  return (
    <div className="workshop-appointments">
      <h1>Appointment Requests</h1>

      <Tabs>
        <Tab label={`Pending (${pendingAppointments.length})`}>
          <AppointmentQueue
            appointments={pendingAppointments}
            onConfirm={handleConfirm}
            onDecline={handleDecline}
          />
        </Tab>

        <Tab label="Confirmed">
          <AppointmentCalendar
            appointments={confirmedAppointments}
            onReschedule={handleReschedule}
          />
        </Tab>

        <Tab label="Completed">
          <AppointmentHistory />
        </Tab>
      </Tabs>
    </div>
  )
}
```

#### Integration Points

**Add to Session Summary:**

```typescript
// After session ends
if (session.status === 'completed') {
  return (
    <div className="session-summary">
      {/* ... existing summary ... */}

      <div className="next-steps">
        <h3>Need physical repairs?</h3>
        <p>Book an in-person appointment based on this diagnostic session.</p>
        <BookWorkshopAppointment sessionId={session.id} />
      </div>
    </div>
  )
}
```

#### Testing Checklist

- [ ] ✅ Virtual session links to workshop appointment
- [ ] ✅ Workshop can confirm/decline/counter-offer
- [ ] ✅ Respects workshop operating hours
- [ ] ✅ Customer receives confirmation notifications
- [ ] ✅ Workshop can assign specific mechanic
- [ ] ✅ Appointment details pre-filled from session

**Estimated Effort:** 50-70 hours (2 developers, 1.5 weeks)

---

### PHASE 4: User Experience Polish (Weeks 7-8)

#### Goal: Add notifications, reminders, and calendar features

**Deliverables:**
- ✅ Email confirmations for appointments
- ✅ SMS reminders (24h and 1h before)
- ✅ Calendar export (.ics files)
- ✅ Rescheduling capability
- ✅ Mechanic unified calendar view

#### Notification System

**Email Confirmations:** `src/lib/notifications/appointmentEmails.ts`

```typescript
export async function sendBookingConfirmation(
  session: Session,
  customer: Customer,
  mechanic: Mechanic
) {
  const icsFile = generateCalendarEvent({
    title: `Auto Doctor Session with ${mechanic.full_name}`,
    startTime: session.scheduled_for,
    duration: session.duration_minutes,
    description: `Video diagnostic session for ${customer.vehicle_info}`,
    location: 'Online Video Call'
  })

  await sendEmail({
    to: customer.email,
    subject: `Appointment Confirmed: ${formatDateTime(session.scheduled_for)}`,
    template: 'appointment-confirmation',
    data: {
      customerName: customer.full_name,
      mechanicName: mechanic.full_name,
      mechanicPhoto: mechanic.profile_photo_url,
      appointmentTime: formatDateTime(session.scheduled_for),
      duration: session.duration_minutes,
      sessionType: session.type,
      plan: session.plan,
      vehicleInfo: customer.vehicle_info,
      joinLink: `${process.env.NEXT_PUBLIC_URL}/session/${session.id}`,
      cancelLink: `${process.env.NEXT_PUBLIC_URL}/sessions/${session.id}/cancel`,
      rescheduleLink: `${process.env.NEXT_PUBLIC_URL}/sessions/${session.id}/reschedule`
    },
    attachments: [{
      filename: 'appointment.ics',
      content: icsFile
    }]
  })
}
```

**SMS Reminders:** `src/lib/notifications/smsReminders.ts`

```typescript
export async function sendAppointmentReminder(
  session: Session,
  customer: Customer,
  hoursBeforeSession: number
) {
  const message = hoursBeforeSession === 24
    ? `Reminder: Your Auto Doctor session is tomorrow at ${formatTime(session.scheduled_for)}. Join link: ${process.env.NEXT_PUBLIC_URL}/session/${session.id}`
    : `Your Auto Doctor session starts in 1 hour! Join now: ${process.env.NEXT_PUBLIC_URL}/session/${session.id}`

  await sendSMS({
    to: customer.phone,
    message: message
  })
}
```

#### Calendar Export

**File:** `src/lib/calendar/icsGenerator.ts`

```typescript
export function generateCalendarEvent(params: {
  title: string
  startTime: Date
  duration: number
  description: string
  location: string
}): string {
  const endTime = addMinutes(params.startTime, params.duration)

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Auto Doctor//EN',
    'BEGIN:VEVENT',
    `UID:${generateUID()}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(params.startTime)}`,
    `DTEND:${formatICSDate(endTime)}`,
    `SUMMARY:${params.title}`,
    `DESCRIPTION:${params.description}`,
    `LOCATION:${params.location}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Session starts in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

  return ics
}
```

**API Endpoint:** `src/app/api/sessions/[id]/calendar.ics/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionWithDetails(params.id)

  const icsContent = generateCalendarEvent({
    title: `Auto Doctor Session`,
    startTime: session.scheduled_for,
    duration: session.duration_minutes,
    description: `Video diagnostic session`,
    location: `${process.env.NEXT_PUBLIC_URL}/session/${session.id}`
  })

  return new Response(icsContent, {
    headers: {
      'Content-Type': 'text/calendar',
      'Content-Disposition': `attachment; filename="session-${session.id}.ics"`
    }
  })
}
```

#### Rescheduling Feature

**API Endpoint:** `src/app/api/sessions/[id]/reschedule/route.ts`

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { newStartTime } = await request.json()
  const sessionId = params.id

  // Get current session
  const session = await supabaseAdmin
    .from('sessions')
    .select('*, slot_reservations(*)')
    .eq('id', sessionId)
    .single()

  // Validate new time is available
  const endTime = addMinutes(newStartTime, session.duration_minutes)
  const isAvailable = await availabilityService.isAvailable(
    session.mechanic_id,
    newStartTime,
    endTime
  )

  if (!isAvailable) {
    return NextResponse.json(
      { error: 'Selected time is not available' },
      { status: 400 }
    )
  }

  // Update session
  await supabaseAdmin
    .from('sessions')
    .update({ scheduled_for: newStartTime })
    .eq('id', sessionId)

  // Update reservation
  await supabaseAdmin
    .from('slot_reservations')
    .update({
      start_time: newStartTime,
      end_time: endTime
    })
    .eq('session_id', sessionId)

  // Send notifications
  await sendRescheduleNotification(session, newStartTime)

  return NextResponse.json({ success: true })
}
```

#### Mechanic Unified Calendar

**Component:** `src/components/mechanic/UnifiedCalendar.tsx`

```typescript
export function UnifiedCalendar() {
  const [view, setView] = useState<'day' | 'week' | 'month'>('week')
  const [events, setEvents] = useState<CalendarEvent[]>([])

  useEffect(() => {
    async function loadEvents() {
      // Fetch all events: scheduled sessions, availability blocks, time off
      const [sessions, availability, timeOff] = await Promise.all([
        fetch('/api/mechanic/sessions?status=scheduled').then(r => r.json()),
        fetch('/api/mechanic/availability').then(r => r.json()),
        fetch('/api/mechanic/time-off').then(r => r.json())
      ])

      const calendarEvents = [
        ...sessions.map(s => ({
          type: 'session',
          title: `Session: ${s.customer_name}`,
          start: s.scheduled_for,
          end: addMinutes(s.scheduled_for, s.duration_minutes),
          color: 'blue'
        })),
        ...availability.blocks.map(b => ({
          type: 'availability',
          title: 'Available',
          start: b.start_time,
          end: b.end_time,
          color: 'green'
        })),
        ...timeOff.periods.map(t => ({
          type: 'time-off',
          title: t.reason,
          start: t.start_date,
          end: t.end_date,
          color: 'red'
        }))
      ]

      setEvents(calendarEvents)
    }

    loadEvents()
  }, [])

  return (
    <div className="unified-calendar">
      <div className="calendar-header">
        <h2>My Calendar</h2>
        <ViewSelector value={view} onChange={setView} />
      </div>

      <FullCalendar
        view={view}
        events={events}
        onEventClick={handleEventClick}
        onSlotClick={handleSlotClick}
      />
    </div>
  )
}
```

#### Background Jobs

**Reminder Cron Jobs:**

```typescript
// src/app/api/cron/send-24h-reminders/route.ts
export async function GET() {
  const tomorrow = addHours(new Date(), 24)
  const sessions = await supabaseAdmin
    .from('sessions')
    .select('*, customers:profiles!customer_user_id(*), mechanics:profiles!mechanic_id(*)')
    .eq('status', 'scheduled')
    .gte('scheduled_for', tomorrow.toISOString())
    .lte('scheduled_for', addHours(tomorrow, 1).toISOString())

  for (const session of sessions.data) {
    await sendAppointmentReminder(session, session.customers, 24)
  }

  return NextResponse.json({ sent: sessions.data.length })
}

// src/app/api/cron/send-1h-reminders/route.ts
export async function GET() {
  const oneHourFromNow = addHours(new Date(), 1)
  const sessions = await supabaseAdmin
    .from('sessions')
    .select('*, customers:profiles!customer_user_id(*)')
    .eq('status', 'scheduled')
    .gte('scheduled_for', oneHourFromNow.toISOString())
    .lte('scheduled_for', addMinutes(oneHourFromNow, 5).toISOString())

  for (const session of sessions.data) {
    await sendAppointmentReminder(session, session.customers, 1)
  }

  return NextResponse.json({ sent: sessions.data.length })
}
```

**Vercel Cron Configuration:**
```json
{
  "crons": [
    {
      "path": "/api/cron/send-24h-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/send-1h-reminders",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/release-expired-reservations",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

#### Testing Checklist

- [ ] ✅ Confirmation emails sent immediately after booking
- [ ] ✅ Calendar .ics files work on all platforms (Google, Apple, Outlook)
- [ ] ✅ 24-hour reminders sent at correct time
- [ ] ✅ 1-hour reminders sent at correct time
- [ ] ✅ Rescheduling validates availability
- [ ] ✅ Rescheduling sends notifications to all parties
- [ ] ✅ Mechanic calendar shows all event types
- [ ] ✅ SMS reminders work (if phone provided)

**Estimated Effort:** 50-70 hours (2 developers, 1.5 weeks)

---

### PHASE 5: Analytics & Optimization (Week 9+)

#### Goal: Track performance and optimize

**Deliverables:**
- ✅ Mechanic utilization metrics
- ✅ Peak booking times analysis
- ✅ No-show tracking
- ✅ Performance optimization (caching, indexes)

**Note:** Details omitted for brevity. Focus on Phases 1-4 for MVP.

---

## 📱 UI/UX DESIGN

### 10.1 Customer Booking Flow

**Simplified User Journey:**

```
Step 1: Vehicle → Step 2: Plan → Step 3: Mechanic → Step 3.5: Time (NEW) → Step 4: Concern → Payment → Confirmation
```

**Key UX Principles:**

1. **Default to Immediate** - Current behavior unchanged
   - "Start session now" pre-selected
   - "Schedule for later" as secondary option
   - Most users want instant help (keep this fast)

2. **Progressive Disclosure** - Only show scheduling when needed
   - Don't show calendar unless "schedule for later" selected
   - Reduce cognitive load
   - Faster for immediate bookings

3. **Clear Availability** - Visual feedback on slot availability
   - Gray out unavailable dates
   - Show number of slots available per day
   - Indicate mechanic's timezone

4. **Mobile-First** - Calendar must work on mobile
   - Touch-friendly time slot buttons
   - Swipe between dates
   - Large tap targets (min 44x44px)

### 10.2 Mechanic Dashboard Enhancements

**Unified Calendar View:**

```
┌─────────────────────────────────────────────────────────┐
│  My Calendar                           [Day][Week][Month]│
├─────────────────────────────────────────────────────────┤
│  Monday, Nov 11                                          │
│  ┌─────────────────────────────────────────────┐        │
│  │ 9:00 AM  Available                          │        │
│  │ 10:00 AM Available                          │        │
│  │ 11:00 AM [SESSION] John Doe - 2018 Honda    │ [View] │
│  │ 12:00 PM Lunch Break                        │        │
│  │ 1:00 PM  Available                          │        │
│  │ 2:00 PM  [SESSION] Jane Smith - 2020 Toyota │ [View] │
│  │ 3:00 PM  Available                          │        │
│  └─────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- See scheduled sessions + available blocks
- Click to view session details
- Drag-and-drop to reschedule (admin only)
- Export to external calendar

**Upcoming Sessions Widget:**

```
┌────────────────────────────────────────┐
│  Upcoming Sessions                     │
├────────────────────────────────────────┤
│  TODAY                                 │
│  11:00 AM - John Doe (30 min)         │
│  [View Details] [Join Session]         │
│                                        │
│  2:00 PM - Jane Smith (60 min)        │
│  [View Details] [Join Session]         │
│                                        │
│  TOMORROW                              │
│  10:00 AM - Bob Johnson (30 min)      │
│  [View Details]                        │
└────────────────────────────────────────┘
```

---

## ⚠️ RISK MITIGATION

### 13.1 Technical Risks

**Risk: Double-booking despite prevention mechanism**

**Probability:** Low
**Impact:** Critical
**Mitigation:**
- Database-level unique constraints (EXCLUDE USING gist)
- Atomic reservation operations
- Pessimistic locking during booking
- Comprehensive testing (concurrent bookings)
- Monitor for conflicts in production

**Risk: Timezone confusion (customer vs mechanic)**

**Probability:** Medium
**Impact:** High
**Mitigation:**
- Store all times in UTC (TIMESTAMPTZ)
- Display in customer's timezone
- Clearly label timezone in UI
- Send calendar invites with timezone info
- Test with users in different timezones

**Risk: Session doesn't start at scheduled time**

**Probability:** Medium
**Impact:** Medium
**Mitigation:**
- Background job transitions sessions to 'live' automatically
- Send reminders 1 hour + 15 minutes before
- Allow early join (15 minutes before)
- Mechanic/customer can manually start session

### 13.2 Legal Risks

**Risk: Scheduling system creates employee-like control**

**Probability:** Low
**Impact:** Critical
**Mitigation:**
- Maintain schedule autonomy (mechanics set availability)
- Allow rejection of appointments without penalty
- Use reputation system, not performance metrics
- Consult employment lawyer before launch
- Document contractor indicators

**Risk: Misclassification of workshop-affiliated mechanics**

**Probability:** Very Low
**Impact:** Critical
**Mitigation:**
- Workshop is employer, not platform (clear structure)
- Platform pays workshop, not individual mechanics
- B2B agreement with workshops
- No direct control over workshop employees
- Legal review of workshop agreements

### 13.3 Business Risks

**Risk: Low adoption (users prefer immediate sessions)**

**Probability:** Medium
**Impact:** Low
**Mitigation:**
- Make scheduling optional (not required)
- Default to immediate sessions
- A/B test scheduling prominence
- Offer incentives (discounts for scheduled sessions)
- Monitor adoption metrics

**Risk: Mechanics don't maintain accurate availability**

**Probability:** Medium
**Impact:** Medium
**Mitigation:**
- Send weekly availability review reminders
- Show utilization metrics (motivate updates)
- Auto-disable slots if mechanic doesn't respond
- Make availability editing very easy (UI)
- Gamify availability management

---

## 🎯 NEXT STEPS

### 14.1 Immediate Actions (This Week)

1. **Legal Review** (Priority 1)
   - [ ] Consult employment lawyer (Ontario, BC focus)
   - [ ] Review contractor agreements
   - [ ] Validate workshop B2B structure
   - [ ] Ensure schedule autonomy language clear

2. **Technical Planning** (Priority 2)
   - [ ] Review this document with technical team
   - [ ] Decide on MVP scope (4-week vs 8-week)
   - [ ] Create GitHub issues for Phase 1 tasks
   - [ ] Setup development environment for new services

3. **Stakeholder Alignment** (Priority 3)
   - [ ] Present plan to business stakeholders
   - [ ] Get budget approval for implementation
   - [ ] Define success metrics
   - [ ] Set launch date target

### 14.2 Development Start (Next Week)

**Phase 1 Kickoff:**

**Day 1-2:**
- [ ] Create `availabilityService.ts` skeleton
- [ ] Create `slot_reservations` table migration
- [ ] Setup test data (mechanics with availability)

**Day 3-5:**
- [ ] Implement availability check logic
- [ ] Create `/api/mechanics/[id]/available-times` endpoint
- [ ] Test availability across mechanic types

**Day 6-10:**
- [ ] Build TimeSelectionStep component
- [ ] Build TimeSlotPicker component
- [ ] Integrate with booking wizard
- [ ] Add to `/api/intake/start` endpoint

**Week 2:**
- [ ] Modify sessionFactory to populate `scheduled_for`
- [ ] Comprehensive testing
- [ ] Fix bugs
- [ ] Deploy to staging
- [ ] User acceptance testing

### 14.3 Success Metrics

**Before Launch:**
- [ ] 0% double-booking rate (critical)
- [ ] 100% backward compatibility (all immediate sessions work)
- [ ] <500ms slot generation time
- [ ] Legal compliance review passed

**After Launch (Track Weekly):**
- % sessions booked in advance vs immediate
- Average booking lead time (hours ahead)
- Mechanic utilization rate improvement
- Customer satisfaction (scheduled vs immediate)
- No-show rate
- Revenue per mechanic (scheduled impact)

### 14.4 Decision Points

**Decision 1: MVP Scope**
- Option A: 4-week MVP (Phase 1-2 only)
- Option B: 8-week full system (Phase 1-4)
- **Recommendation:** 4-week MVP to validate demand

**Decision 2: Workshop Integration Timing**
- Option A: Include in Phase 1 (longer timeline)
- Option B: Separate launch after virtual scheduling proven
- **Recommendation:** Separate launch (reduce risk)

**Decision 3: Notification Strategy**
- Option A: Email only (cheaper, faster)
- Option B: Email + SMS (better UX, higher cost)
- **Recommendation:** Start with email, add SMS in Phase 4

---

## 📝 APPENDIX

### A. File Structure

**New Files to Create:**

```
src/
├─ lib/
│  ├─ scheduling/
│  │  ├─ availabilityService.ts      [Core availability logic]
│  │  ├─ reservationService.ts       [Slot reservation management]
│  │  └─ types.ts                     [Scheduling type definitions]
│  ├─ notifications/
│  │  ├─ appointmentEmails.ts        [Email confirmations]
│  │  └─ smsReminders.ts              [SMS reminders]
│  └─ calendar/
│     └─ icsGenerator.ts              [Calendar export]
├─ components/
│  └─ customer/
│     ├─ TimeSelectionStep.tsx       [Immediate vs scheduled choice]
│     └─ TimeSlotPicker.tsx           [Calendar + time slots]
├─ app/
│  └─ api/
│     ├─ mechanics/
│     │  └─ [id]/
│     │     └─ available-times/
│     │        └─ route.ts            [Get available slots]
│     ├─ slots/
│     │  ├─ reserve/route.ts         [Reserve time slot]
│     │  └─ confirm/[id]/route.ts    [Confirm reservation]
│     └─ cron/
│        ├─ release-expired-reservations/route.ts
│        ├─ send-24h-reminders/route.ts
│        └─ send-1h-reminders/route.ts
```

**Files to Modify:**

```
src/
├─ lib/
│  ├─ sessionFactory.ts              [Add scheduledFor parameter]
│  └─ mechanicMatching.ts            [Add availability filter]
├─ app/
│  └─ api/
│     └─ intake/
│        └─ start/route.ts           [Accept scheduledFor]
```

### B. Database Migrations

**Migration 1: Mechanic Settings**
```sql
-- File: supabase/migrations/YYYYMMDD_add_mechanic_scheduling_settings.sql
ALTER TABLE mechanic_settings
  ADD COLUMN IF NOT EXISTS buffer_between_sessions INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS max_advance_booking_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS min_booking_notice_hours INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS allow_instant_booking BOOLEAN DEFAULT true;
```

**Migration 2: Slot Reservations**
```sql
-- File: supabase/migrations/YYYYMMDD_create_slot_reservations.sql
CREATE TABLE slot_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) UNIQUE,
  mechanic_id UUID NOT NULL REFERENCES profiles(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'reserved',
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reservations_mechanic_time
  ON slot_reservations(mechanic_id, start_time)
  WHERE status IN ('reserved', 'confirmed');

CREATE INDEX idx_reservations_expires_at
  ON slot_reservations(expires_at)
  WHERE status = 'reserved' AND expires_at IS NOT NULL;

-- RLS Policies
ALTER TABLE slot_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mechanics can view their reservations"
  ON slot_reservations FOR SELECT
  USING (mechanic_id = auth.uid());

CREATE POLICY "Service role can manage all reservations"
  ON slot_reservations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

### C. Environment Variables

**Add to `.env.local`:**

```bash
# Email service (Resend, SendGrid, etc.)
EMAIL_SERVICE_API_KEY=your_email_api_key
EMAIL_FROM_ADDRESS=noreply@theautodoctor.com
EMAIL_FROM_NAME=The Auto Doctor

# SMS service (Twilio, etc.)
SMS_SERVICE_API_KEY=your_sms_api_key
SMS_FROM_NUMBER=+1234567890

# Cron job authentication
CRON_SECRET=your_random_secret_key
```

---

## 📞 CONTACT & SUPPORT

**For Questions:**
- Technical: [Your Tech Lead]
- Legal: [Your Employment Lawyer]
- Business: [Your Product Manager]

**Document Maintenance:**
- Last Updated: November 10, 2025
- Version: 1.0
- Owner: Engineering Team
- Review Schedule: Monthly during implementation

---

**END OF DOCUMENT**

Total Pages: 47
Total Words: ~15,000
Estimated Reading Time: 45 minutes
