# BOOKING WIZARD & SCHEDULING SYSTEM - INTEGRATION PLAN (REVISED)

**Date:** 2025-11-10 (Final Update - All Phases Complete)
**Status:** ✅ **PHASES 1-9 ALL COMPLETE** | Production Ready
**Implementation Docs:**
- [SCHEDULING_SYSTEM_IMPLEMENTATION_COMPLETE.md](SCHEDULING_SYSTEM_IMPLEMENTATION_COMPLETE.md)
- [PHASE_9_TESTING_AND_POLISH_COMPLETE.md](PHASE_9_TESTING_AND_POLISH_COMPLETE.md)
**Purpose:** Unified booking system with SEPARATE paths and one source of truth

## 🎉 IMPLEMENTATION STATUS

- ✅ **Phase 1-3:** BookingWizard UX improvements **COMPLETE**
- ✅ **Phase 4:** Scheduling components (ServiceTypeStep, SearchableMechanicList) **COMPLETE**
- ✅ **Phase 5:** Time selection (CalendarStep, AvailabilityService) **COMPLETE**
- ✅ **Phase 6:** Review & Payment (ReviewAndPaymentStep, API endpoints) **COMPLETE**
- ✅ **Phase 7:** Waiver flow system **COMPLETE**
- ✅ **CRITICAL FIX #1:** Calendar Availability Integration **COMPLETE**
- ✅ **CRITICAL FIX #2:** Separate Intake Forms (ScheduledSessionIntakeStep) **COMPLETE**
- ✅ **Phase 8:** Email reminders & calendar invites **COMPLETE**
- ✅ **Phase 9:** Testing & Polish **COMPLETE**

## ✅ PHASE 9: TESTING & POLISH (Complete)

**What Was Verified:**
- ✅ All UI components display correctly
- ✅ All functionality working as expected
- ✅ TypeScript compilation passes (0 errors in new code)
- ✅ Mobile responsiveness verified
- ✅ Email templates structured correctly
- ✅ 1 bug fixed (SearchableMechanicList prop)
- ✅ 1 enhancement (calendar green borders)

**Files Modified in Phase 9:**
1. `src/app/customer/schedule/SchedulingWizard.tsx` - Fixed sessionType prop
2. `src/components/customer/ModernSchedulingCalendar.tsx` - Enhanced visual indicators

**See:** [PHASE_9_TESTING_AND_POLISH_COMPLETE.md](PHASE_9_TESTING_AND_POLISH_COMPLETE.md) for full details

## ✅ CRITICAL FIXES COMPLETED

### Fix #1: Calendar Availability Integration ✅
**Issue:** ModernSchedulingCalendar not connected to AvailabilityService
**Solution:**
- Created `/api/availability/check-slots` endpoint
- Updated ModernSchedulingCalendar with availability integration
- Added visual indicators (green for available, gray + X for unavailable)
- Updated CalendarStep to pass mechanicId and sessionType

**Impact:** Prevents double-booking and respects mechanic availability

### Fix #2: Separate Intake Forms ✅
**Issue:** Using same ConcernStep for both immediate and scheduled sessions
**Solution:**
- Created `ScheduledSessionIntakeStep.tsx` (345 lines)
- 5 service types: diagnostic, repair, maintenance, inspection, consultation
- Preparation notes and special requests fields
- File upload with progress tracking
- NO "Is Urgent" checkbox (doesn't apply to scheduled)

**Impact:** Optimized UX for each user context

---

## 🎯 EXECUTIVE SUMMARY

This plan addresses the integration of the **Booking Wizard** (for immediate sessions) with the **Scheduling System** (for future appointments), using a **SEPARATE PAGE ARCHITECTURE** while maintaining a single source of truth.

### 🔑 **CRITICAL ARCHITECTURAL DECISION**

**Separate Scheduling Page vs Integrated BookingWizard:**
✅ **RECOMMENDATION: SEPARATE SCHEDULING PAGE**

**Rationale:**
- Simpler UX - Each system has clear, focused purpose
- Better mobile experience - Scheduling needs more screen space for calendar
- Easier maintenance - Two simple systems vs one complex system
- Reusability - Scheduling page handles BOTH online + in-person appointments
- Clearer mental model - "Book Now" vs "Schedule Later" are distinct user intents
- Payment flexibility - Different payment flows (upfront deposit vs full payment)

### Your Core Questions Answered (REVISED)

1. ✅ **How to design the whole system uniformly?**
   → Two separate entry points (BookingWizard for immediate, SchedulingPage for future), one source of truth (SessionFactory + AvailabilityService)

2. ✅ **How to integrate booking wizard with scheduling?**
   → Redirect to SchedulingPage when needed, pass context via sessionStorage, prevent duplicate bookings with modal

3. ✅ **How to handle offline mechanics?**
   → Show 3 options: Waitlist (stay), Schedule Instead (redirect), Browse Offline (no scheduling)

4. ✅ **What happens with waitlist?**
   → Email notification + success modal + clear next steps UI

5. ✅ **How to fix UX issues?**
   → Manual search button, reorganized UI, state management fixes, auto-advance only Steps 1-2

6. ✅ **Payment & Waiver Timing?**
   → Payment at booking (online) or deposit (in-person), Waiver on appointment day before session

7. ✅ **Just Advice Clarification?**
   → NOT free, follows same plan pricing, allows skipping vehicle selection

---

## 📋 TABLE OF CONTENTS

1. [Architectural Decision: Separate vs Integrated](#architectural-decision-separate-vs-integrated)
2. [Current State Analysis](#current-state-analysis)
3. [Revised System Design](#revised-system-design)
4. [Booking Wizard UX Improvements](#booking-wizard-ux-improvements)
5. [SchedulingPage Design](#schedulingpage-design)
6. [Payment & Waiver Strategy](#payment--waiver-strategy)
7. [Offline Mechanics Flow](#offline-mechanics-flow)
8. [One Source of Truth Architecture](#one-source-of-truth-architecture)
9. [Implementation Phases](#implementation-phases)
10. [Testing Strategy](#testing-strategy)

---

## 🏛️ ARCHITECTURAL DECISION: SEPARATE VS INTEGRATED

### The Question

**Should scheduling be integrated into BookingWizard OR should it be a separate page?**

### The Decision

✅ **SEPARATE SCHEDULING PAGE**

### Detailed Comparison

| Criteria | Integrated BookingWizard | Separate SchedulingPage | Winner |
|----------|-------------------------|------------------------|--------|
| **UX Complexity** | High - conditional steps confusing | Low - clear purpose | ✅ Separate |
| **Mobile Experience** | Poor - too many steps | Good - focused flow | ✅ Separate |
| **Code Maintenance** | Hard - lots of conditionals | Easy - two simple systems | ✅ Separate |
| **Reusability** | Limited - wizard-specific | High - handles both online/in-person | ✅ Separate |
| **Mental Model** | Confusing - "why so many steps?" | Clear - "I'm booking now" vs "I'm scheduling" | ✅ Separate |
| **Payment Flows** | Complex - needs multiple payment UIs | Simple - dedicated payment per type | ✅ Separate |
| **Calendar Integration** | Cramped - calendar in wizard step | Spacious - full-page calendar | ✅ Separate |
| **Initial Click Count** | Fewer clicks if in wizard | 1 extra click to reach page | Integrated |
| **Duplicate Booking Prevention** | Harder to detect/prevent | Easy - check on page mount | ✅ Separate |
| **Future Extensibility** | Limited - tightly coupled | High - can add features independently | ✅ Separate |

**Score: Separate 9, Integrated 1**

### User Scenarios Supporting Separate Page

**Scenario 1: Customer wants to schedule in advance**
- **Integrated:** Navigate to BookingWizard → Go through 4 steps → Get to scheduling step → Confused why so many steps for scheduling
- **Separate:** Click "Schedule Appointment" → Clear scheduling interface → Done ✅

**Scenario 2: All mechanics offline during BookingWizard**
- **Integrated:** Stay in wizard → Add scheduling steps mid-flow → Inconsistent experience
- **Separate:** Show option → "Schedule Instead" → Redirect to proper scheduling page ✅

**Scenario 3: Customer has existing appointment, wants to modify**
- **Integrated:** Have to go through entire wizard again to modify?
- **Separate:** Detect existing → "Modify Appointment" modal → Seamless ✅

**Scenario 4: In-person vs Online appointments**
- **Integrated:** Need conditionals everywhere (online skip mechanic selection? in-person show map?)
- **Separate:** Service type selector at start → Different flows handled clearly ✅

### Final Recommendation

**Use BookingWizard for:**
- ✅ Quick, immediate sessions with available mechanics
- ✅ "I need help right now" use case
- ✅ Simple 4-step flow: Vehicle → Plan → Mechanic → Concern

**Use SchedulingPage for:**
- ✅ Future appointments (hours/days/weeks ahead)
- ✅ In-person workshop visits
- ✅ "I want to plan ahead" use case
- ✅ Dedicated scheduling flow with calendar/time selection

**Both use same backend:**
- ✅ SessionFactory (single source of truth)
- ✅ AvailabilityService (time slot validation)
- ✅ Same database tables
- ✅ Same mechanic matching algorithm (when applicable)

---

## 🔍 CURRENT STATE ANALYSIS

### What Works Well ✅

1. **Matching Flow System** (Just Completed - Phases 1-7)
   - Smart matching algorithm with 10+ criteria
   - Targeted assignments (top 3 mechanics)
   - Priority badges with visual feedback
   - Database migration applied successfully

2. **Booking Wizard Structure**
   - 4-step flow: Vehicle → Plan → Mechanic → Concern
   - Location capture from customer profile
   - Plan selection (Standard vs Brand Specialist)

3. **SessionFactory**
   - Single session creation point
   - Handles customer info, vehicle info, plan selection
   - Creates session assignments

4. **Database Schema**
   - `sessions.scheduled_for` field exists (ready for use)
   - `session_assignments` table with matching fields
   - Availability tables operational

### What Needs Improvement ❌

1. **Booking Wizard UX Issues**
   - ❌ Auto-fetch mechanics on every change (too aggressive)
   - ❌ "Skip just advice" option not working
   - ❌ No manual search button (user has no control)
   - ❌ UI layout unclear (tabs → location → search bar placement)
   - ❌ Real-time polling every 30s (unnecessary API calls)

2. **Offline Mechanics Handling**
   - ❌ AllMechanicsOfflineCard shows 3 options but flow unclear
   - ❌ "Browse all mechanics" and "Schedule for later" should be one action
   - ❌ Favorites not prominently displayed
   - ❌ No "Schedule this mechanic" button on cards
   - ❌ Flow to scheduling section not defined

3. **Waitlist System**
   - ❌ No email notification sent
   - ❌ Customer gets JSON response but no clear next steps
   - ❌ No dashboard indicator that waitlist join was successful

4. **Scheduling Integration**
   - ❌ `sessions.scheduled_for` field never populated
   - ❌ No time selection UI in booking wizard
   - ❌ No integration with AvailabilityService
   - ❌ Waiver flow for scheduled appointments undefined

---

## 🎨 REVISED SYSTEM DESIGN

### High-Level System Architecture

```
Customer Dashboard
        │
        ├──────────────────────┬──────────────────────┬──────────────────────┐
        │                      │                      │                      │
   [Book Now]          [Schedule Later]       [Browse Mechanics]     [My Appointments]
   (Immediate)         (Future appts)         (View/Favorite)         (Manage bookings)
        │                      │                      │                      │
        ↓                      ↓                      ↓                      ↓
  BookingWizard          SchedulingPage        MechanicsDirectory    AppointmentsPage
        │                      │
        │                      │
  4 Steps:                7 Steps:
  1. Vehicle              1. Service Type (Online/In-person)
  2. Plan                 2. Vehicle
  3. Mechanic             3. Plan
  4. Concern              4. Mechanic
        │                 5. Time Selection
        ↓                 6. Concern
   All mechanics          7. Review & Payment
   offline?                    │
        │                      ↓
        ├─────────────────────►│
        │                      │
   Show 3 Options:             ↓
   1. Waitlist              Confirmation
   2. Schedule Instead ─────►│
      (redirect)              │
   3. Browse Offline          ↓
                         Email + Calendar
```

### Two Entry Points, One Backend

| Aspect | BookingWizard (Immediate) | SchedulingPage (Future) |
|--------|--------------------------|-------------------------|
| **Purpose** | Quick, immediate sessions | Planned appointments |
| **URL** | `/customer/book-session` | `/customer/schedule` |
| **Steps** | 4 steps (Vehicle → Plan → Mechanic → Concern) | 7 steps (Service Type → Vehicle → Plan → Mechanic → Time → Concern → Review) |
| **Mechanic Filter** | Online mechanics only | All mechanics (online/offline) |
| **Time Selection** | Immediate (now) | Calendar picker (future dates) |
| **Waiver** | Before session starts | On appointment day (15 min before) |
| **Payment** | After waiver (before session) | At booking time (online) or deposit (in-person) |
| **Session Status** | `pending` → `active` | `scheduled` → `pending` → `active` |
| **Matching Algorithm** | Runs at session creation | Runs 30 min before appointment |
| **SessionFactory Call** | `scheduledFor: null` | `scheduledFor: Date` |
| **Use Case** | "I need help right now" | "I want to plan ahead" OR "All mechanics offline" |

### Context Passing Between Systems

**From BookingWizard to SchedulingPage:**
```typescript
// When customer clicks "Schedule Instead" in offline modal
const schedulingContext = {
  vehicleId: wizardData.vehicleId,
  planType: wizardData.planType,
  concern: wizardData.concernDescription, // If already entered
  source: 'booking_wizard_offline',
  timestamp: new Date().toISOString()
}
sessionStorage.setItem('schedulingContext', JSON.stringify(schedulingContext))
router.push('/customer/schedule')
```

**In SchedulingPage:**
```typescript
// On mount, check for context from BookingWizard
useEffect(() => {
  const context = sessionStorage.getItem('schedulingContext')
  if (context) {
    const { vehicleId, planType, concern } = JSON.parse(context)
    // Pre-fill form
    setSelectedVehicle(vehicleId)
    setSelectedPlan(planType)
    setConcern(concern)
    // Clear context
    sessionStorage.removeItem('schedulingContext')
  }
}, [])
```

### Intake Data Capture During Scheduling

**IMPORTANT CLARIFICATION:** YES, SchedulingPage captures full intake data (vehicle info, concern details, uploaded files) during the booking flow.

**Data Captured:**

| Step | Component | Data Captured |
|------|-----------|---------------|
| **Step 1** | ServiceTypeStep | `serviceType: 'online' \| 'in_person'` |
| **Step 2** | VehicleStep | `vehicleId, vehicleData: { year, make, model, vin, odometer, license_plate }` |
| **Step 3** | PlanStep | `planType: 'standard' \| 'extended' \| 'premium', planPrice: number` |
| **Step 4** | SearchableMechanicList | `mechanicId, mechanicName, mechanicType` |
| **Step 5** | CalendarStep | `scheduledFor: Date (ISO 8601 UTC)` |
| **Step 6** | ConcernStep | `concernCategory, concernDescription, isUrgent, uploadedFiles: string[]` |
| **Step 7** | ReviewAndPaymentStep | `paymentIntentId` (Stripe) |

**Integration Method:**

SchedulingPage calls SessionFactory directly (NOT `/api/intake/start`):

```typescript
// In ReviewAndPaymentStep, after successful payment:
const response = await fetch('/api/sessions/create', {
  method: 'POST',
  body: JSON.stringify({
    // ⭐ Key field that makes this a scheduled session:
    scheduled_for: wizardData.scheduledFor, // ISO 8601 UTC timestamp

    // Intake data (same as immediate sessions):
    vehicle_id: wizardData.vehicleId,
    mechanic_user_id: wizardData.mechanicId,
    concern: wizardData.concernDescription,
    concern_category: wizardData.concernCategory,
    is_urgent: wizardData.isUrgent,
    uploaded_files: wizardData.uploadedFiles,
    plan: wizardData.planType,
    type: wizardData.serviceType, // 'online' or 'in_person'

    // Payment info:
    payment_intent_id: wizardData.paymentIntentId,
    amount: wizardData.planPrice
  })
})
```

**Why Direct SessionFactory vs `/api/intake/start`:**
- SessionFactory already supports `scheduled_for` parameter
- Avoids modifying intake flow (which is optimized for immediate sessions)
- **REVISED:** Uses separate ScheduledSessionIntakeStep (better UX than reusing ConcernStep)
- Reuses existing VehicleStep and PlanStep components (NO duplication)
- Simpler integration, fewer API calls

**IMPORTANT UPDATE (2025-11-10):**
After implementation review, we decided to create a separate `ScheduledSessionIntakeStep` component instead of reusing `ConcernStep`. Reasons:
- ConcernStep has "Is Urgent" checkbox (doesn't make sense for scheduled)
- ConcernStep optimized for immediate diagnosis, not planned services
- Scheduled needs: service type, prep notes, special requests
- Better UX: each flow optimized independently
- Cleaner code: no coupling between immediate and scheduled flows

**Result:**
All intake data flows: **SchedulingPage → SessionFactory → Database**

Customer gets full mechanic context before scheduled appointment starts.

---

## 🔧 BOOKING WIZARD UX IMPROVEMENTS

### Issue 1: "Skip Just Advice" - Clarification

**User Correction:** "Just Advice" is NOT free. It follows the same plan pricing.

**Purpose of "Just Advice":**
- For customers seeking advice without a specific vehicle
- Someone talking on behalf of someone else
- Buying a used car and needs pre-purchase inspection advice
- General automotive questions

**Current Problem:**
The "Skip - Just Advice" button is not working in Step 1 (Vehicle Selection).

**Root Cause:**
Need to check [VehicleStep.tsx](src/components/customer/booking-steps/VehicleStep.tsx) - button likely not wired up properly.

**Solution:**
```tsx
// In VehicleStep.tsx
const handleSkipForAdvice = () => {
  // Mark as advice-only in wizard data
  onComplete({
    vehicleId: null,
    vehicleName: 'Just Advice (No Vehicle)',
    vehicleData: null,
    isAdviceOnly: true // Flag for later steps
  })
}

// In BookingWizard.tsx - handle advice-only flow
// Steps 1-2: Same (Vehicle can be skipped, Plan is same pricing)
// Step 3: Show ALL mechanics (not vehicle-specific)
// Step 4: Concern - "What advice do you need?"
```

**Implementation:**
- Fix "Skip - Just Advice" button in VehicleStep
- Allow null vehicleId when isAdviceOnly = true
- Plan selection remains the same (Standard/Extended/Premium pricing)
- Mechanic selection shows general mechanics (not brand-specific)
- Payment required as normal

---

### Issue 2: Manual Search Button (Remove Auto-Fetch)

**Current Problem:**
Mechanics are fetched automatically on every state change, causing:
- Unnecessary API calls
- User confusion (list updates unexpectedly)
- No control over when search happens

**Current Code (MechanicStep.tsx:96-130):**
```tsx
useEffect(() => {
  fetchMechanics() // ❌ Auto-fetch
  const intervalId = setInterval(() => {
    fetchMechanics() // ❌ Poll every 30s
  }, 30000)
  return () => clearInterval(intervalId)
}, [fetchMechanics]) // ❌ Runs on any dependency change
```

**Solution - Manual Search Pattern:**
```tsx
// NEW DESIGN
export default function MechanicStep() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [searching, setSearching] = useState(false)

  // Remove useEffect auto-fetch
  // Keep fetchMechanics as callback only

  const handleSearch = async () => {
    setSearching(true)
    setHasSearched(true)
    await fetchMechanics()
    setSearching(false)
  }

  return (
    <div>
      {/* Search Controls Section */}
      <div className="search-controls">
        <LocationSelector value={location} onChange={setLocation} />
        <MechanicTypeTabs selected={type} onChange={setType} />

        {/* ⭐ NEW: Manual Search Button */}
        <button
          onClick={handleSearch}
          disabled={searching || !location}
          className="search-button"
        >
          {searching ? (
            <>
              <Loader2 className="animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search />
              Find Mechanics
            </>
          )}
        </button>
      </div>

      {/* Results Section */}
      {!hasSearched ? (
        <div className="empty-state">
          <Search className="h-12 w-12 text-slate-500" />
          <p>Select your location and click "Find Mechanics"</p>
        </div>
      ) : mechanics.length === 0 ? (
        <AllMechanicsOfflineCard />
      ) : (
        <MechanicsList mechanics={mechanics} />
      )}
    </div>
  )
}
```

**Benefits:**
- ✅ User controls when search happens
- ✅ No unnecessary API calls
- ✅ Clear empty state before search
- ✅ Loading state during search
- ✅ Better performance (no polling)

---

### Issue 3: UI Layout Reorganization

**Current Layout Issues:**
- Tabs → Location → Search bar placement unclear
- No visual hierarchy
- User doesn't know where to look first

**Recommended Layout (Top to Bottom):**

```
┌─────────────────────────────────────────────────────────┐
│  Step 3: Select Mechanic                                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. LOCATION SELECTOR (Most Important - Top)             │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📍 Toronto, ON  M5V 1A1                 [Edit] │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  2. MECHANIC TYPE TABS (Filter)                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [All Mechanics] [Brand Specialist] [My Favorites] │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  3. SEARCH BUTTON (Action - Prominent)                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │     🔍 Find Available Mechanics                  │   │
│  │     (Large, centered button with gradient)       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  4. RESULTS SECTION (Appears after search)               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Found 8 mechanics near you                       │   │
│  │                                                   │   │
│  │ [Mechanic Card 1 - Match Score 165]             │   │
│  │ [Mechanic Card 2 - Match Score 135]             │   │
│  │ ...                                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  Or if offline:                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⏰ All Mechanics Currently Offline               │   │
│  │                                                   │   │
│  │ [Offline Mechanics List with Schedule buttons]  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  [← Back]                        [Skip - Just Advice →] │
└─────────────────────────────────────────────────────────┘
```

**Visual Hierarchy:**
1. **Location** (Top) - Pre-filled from profile, user can edit
2. **Type Filter** (Below location) - Tabs for filtering
3. **Search Button** (Centered, prominent) - Primary action
4. **Results** (Below button) - Appears after search

**Code Structure:**
```tsx
<div className="mechanic-step">
  {/* 1. Location Section - Sticky at top */}
  <div className="location-section sticky top-0 bg-slate-900 z-10 pb-4">
    <h3>Where do you need service?</h3>
    <LocationSelector
      value={location}
      onChange={setLocation}
      source="profile"
    />
  </div>

  {/* 2. Filter Tabs */}
  <div className="filter-section py-4">
    <Tabs value={mechanicType} onChange={setMechanicType}>
      <Tab value="all">All Mechanics</Tab>
      <Tab value="brand_specialist">Brand Specialist</Tab>
      <Tab value="favorites">My Favorites ⭐</Tab>
    </Tabs>
  </div>

  {/* 3. Search Button - Prominent */}
  <div className="search-section py-6 flex justify-center">
    <button
      onClick={handleSearch}
      className="search-button-large"
    >
      <Search className="h-5 w-5" />
      Find Available Mechanics
    </button>
  </div>

  {/* 4. Results Section */}
  <div className="results-section">
    {!hasSearched ? (
      <EmptyState />
    ) : allOffline ? (
      <OfflineMechanicsList />
    ) : (
      <OnlineMechanicsList />
    )}
  </div>
</div>
```

---

## 💳 PAYMENT & WAIVER STRATEGY

### Critical Questions Answered

**1. When should payment be collected?**
**2. When should waiver be signed?**
**3. How to handle no-shows and cancellations?**
**4. Different flows for online vs in-person?**

---

### Payment Timing Strategy

#### **For ONLINE Diagnostic Sessions (Scheduled)**

| Timing | Action | Rationale |
|--------|--------|-----------|
| **At Booking** | Full payment charged | Reduces no-shows, confirms commitment, mechanic reserves time |
| **Before Session** | No additional payment | Already paid |
| **After Session** | No refund for completion | Service delivered as promised |

**Flow:**
```
1. Customer schedules online diagnostic session
2. Payment gateway: Charge full amount (Standard $29, Extended $49, Premium $99)
3. Confirmation email: "Payment received - Appointment confirmed"
4. On appointment day:
   a. 1-day reminder: "Your session is tomorrow"
   b. 1-hour reminder: "Your session starts in 1 hour - Click to join"
   c. 15-min reminder: "Sign waiver and join session"
5. Customer signs waiver
6. Session starts
7. Session completes → No additional charges
```

**Cancellation Policy:**
- **24+ hours before:** Full refund (minus $5 processing fee)
- **2-24 hours before:** 75% refund ($21.75 for Standard, $36.75 for Extended) - 25% to mechanic
- **<2 hours or no-show:** 50% account credit - 50% to mechanic

**Rationale:** Fair compensation to mechanic for blocked time; industry standard for professional services (doctors, lawyers charge no-show fees); legally sound when disclosed upfront; customer retains 50% value via account credit (never expires).

#### **For IN-PERSON Workshop Visits (Scheduled)**

| Timing | Action | Rationale |
|--------|--------|-----------|
| **At Booking** | Deposit charged ($15 fixed) | Confirms intent, minimal risk for customer |
| **Before Visit** | No additional payment | Deposit holds slot |
| **After Service** | Balance charged (Plan price - $15) | Pay for actual service received |

**Flow:**
```
1. Customer schedules in-person visit
2. Payment gateway: Charge deposit $15 (non-refundable after 24h)
3. Confirmation email: "Deposit received - Address: 123 Main St, Toronto"
4. On appointment day:
   a. Customer arrives at workshop
   b. Signs physical/digital waiver on tablet
   c. Mechanic performs service
   d. After completion: Charge balance (e.g., Standard $29 - $15 = $14)
5. Receipt emailed
```

**Cancellation Policy:**
- **24+ hours before:** Full deposit refund
- **<24 hours or no-show:** Deposit forfeited (mechanic compensated for reserved time)

#### **For IMMEDIATE Sessions (BookingWizard)**

| Timing | Action | Rationale |
|--------|--------|-----------|
| **After Waiver** | Full payment charged | Customer commits before session starts |
| **Before Session** | Payment must succeed | Cannot join without payment |
| **After Session** | No additional charges | Prepaid service |

**Flow:**
```
1. Customer completes booking wizard
2. Waiver page: Sign waiver
3. Payment page: Charge full amount
4. Payment success → Create session, assign mechanic
5. Redirect to session lobby
6. Session starts
```

**No cancellation** (immediate session already started)

---

### Waiver Signing Strategy

#### **For ONLINE Scheduled Sessions**

**Timing:** **On appointment day, 15 minutes before session**

**Rationale:**
- Legal validity: Waiver closer to actual service time
- Reduces "forgot to sign" issues
- Customer's intent confirmed at time of service

**Implementation:**
```
1. Email sent 15 min before appointment:
   Subject: "Your session starts soon - Sign waiver to join"
   Body: "Click here to sign waiver and enter session: [LINK]"

2. Link goes to: /customer/appointments/[id]/waiver

3. Waiver Page:
   - Shows waiver text
   - Signature canvas
   - "I agree" checkbox
   - "Sign & Join Session" button

4. After signing:
   - Waiver stored in database
   - Redirect to session lobby
   - Mechanic can see "Customer ready"
```

**Edge Case:** Customer doesn't sign waiver in time (10 min grace period)
- Session status remains "scheduled"
- Mechanic sees "Waiting for customer to sign waiver"
- After 10 min, mechanic can cancel with compensation:
  - **Mechanic receives:** 50% of session fee (fair payment for blocked time)
  - **Customer receives:** 50% as account credit (never expires, usable for future sessions)
  - **Rationale:** Customer was notified via email (24h, 1h, 15min reminders) but failed to show; mechanic showed up and reserved time; 50/50 split is industry standard and legally defensible

#### **For IN-PERSON Scheduled Visits**

**Timing:** **On arrival at workshop, before service starts**

**Rationale:**
- Physical presence confirmed
- Can use tablet for digital signature
- Paper backup available

**Implementation:**
```
1. Customer arrives at workshop
2. Receptionist/Mechanic opens tablet
3. URL: /customer/appointments/[id]/waiver?mode=in_person
4. Customer signs on tablet
5. PDF generated and emailed to customer
6. Service begins
```

#### **For IMMEDIATE Sessions (BookingWizard)**

**Timing:** **Immediately after concern submission, before payment**

**Current flow is CORRECT** - no changes needed.

---

### Payment Gateway Integration

**Recommended:** Stripe

**Implementation:**
```typescript
// src/lib/payment/stripe.ts

export async function chargeScheduledSession(
  customerId: string,
  sessionId: string,
  amount: number,
  type: 'full' | 'deposit'
) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Convert to cents
    currency: 'usd',
    customer: customerId,
    metadata: {
      session_id: sessionId,
      payment_type: type,
      timestamp: new Date().toISOString()
    },
    description: type === 'full'
      ? `Online diagnostic session - ${sessionId}`
      : `In-person visit deposit - ${sessionId}`
  })

  return paymentIntent
}
```

**For Refunds:**
```typescript
export async function refundSession(
  paymentIntentId: string,
  refundAmount: number,
  reason: 'cancellation' | 'no_show' | 'service_issue'
) {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: refundAmount * 100,
    reason: reason === 'service_issue' ? 'requested_by_customer' : undefined,
    metadata: { refund_reason: reason }
  })

  return refund
}
```

---

### Database Schema Updates

**New Table: `scheduled_payments`**

```sql
CREATE TABLE scheduled_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES auth.users(id) NOT NULL,

  -- Payment details
  payment_intent_id VARCHAR(255), -- Stripe payment intent ID
  amount_cents INTEGER NOT NULL,
  payment_type VARCHAR(20) NOT NULL, -- 'full', 'deposit', 'balance'
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'succeeded', 'failed', 'refunded'

  -- Refund tracking
  refund_amount_cents INTEGER DEFAULT 0,
  refund_reason VARCHAR(50),
  refunded_at TIMESTAMPTZ,

  -- Timestamps
  charged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_payment_type CHECK (payment_type IN ('full', 'deposit', 'balance')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded'))
);

CREATE INDEX idx_scheduled_payments_session ON scheduled_payments(session_id);
CREATE INDEX idx_scheduled_payments_customer ON scheduled_payments(customer_id);
CREATE INDEX idx_scheduled_payments_status ON scheduled_payments(status);
```

**New Table: `waiver_signatures`**

```sql
CREATE TABLE waiver_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES auth.users(id) NOT NULL,

  -- Signature data
  signature_data_url TEXT NOT NULL, -- Base64 image of signature
  ip_address VARCHAR(50),
  user_agent TEXT,
  signed_mode VARCHAR(20) NOT NULL, -- 'online', 'in_person'

  -- Legal
  waiver_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  agreed_to_terms BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  signed_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_signed_mode CHECK (signed_mode IN ('online', 'in_person'))
);

CREATE INDEX idx_waiver_signatures_session ON waiver_signatures(session_id);
CREATE INDEX idx_waiver_signatures_customer ON waiver_signatures(customer_id);
```

---

### No-Show Handling Automation

**Database Function:**
```sql
-- Auto-handle no-shows 15 minutes after scheduled time
CREATE OR REPLACE FUNCTION handle_no_shows()
RETURNS void AS $$
DECLARE
  no_show_session RECORD;
BEGIN
  -- Find sessions that are scheduled but customer didn't join
  FOR no_show_session IN
    SELECT s.id, s.scheduled_for, sp.payment_intent_id, sp.amount_cents
    FROM sessions s
    JOIN scheduled_payments sp ON sp.session_id = s.id
    WHERE s.status = 'scheduled'
    AND s.scheduled_for < NOW() - INTERVAL '15 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM waiver_signatures ws WHERE ws.session_id = s.id
    )
  LOOP
    -- Mark session as cancelled (no-show)
    UPDATE sessions
    SET status = 'cancelled', metadata = metadata || '{"cancellation_reason": "no_show"}'::jsonb
    WHERE id = no_show_session.id;

    -- Process refund (25% for online, 0% for in-person deposit)
    -- This would trigger refund via Stripe

    -- Log the no-show
    INSERT INTO session_events (session_id, event_type, metadata)
    VALUES (no_show_session.id, 'no_show', '{"auto_cancelled": true, "refund_percentage": 25}');
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run every 5 minutes via pg_cron or serverless function
SELECT cron.schedule('handle-no-shows', '*/5 * * * *', 'SELECT handle_no_shows()');
```

---

### Summary: Payment & Waiver Flow

| Session Type | Payment Timing | Payment Amount | Waiver Timing | Refund Policy |
|-------------|----------------|----------------|---------------|---------------|
| **Immediate (BookingWizard)** | After waiver, before session | Full | Before payment | N/A (session started) |
| **Scheduled Online** | At booking time | Full | 15 min before session | 100% (24h+), 50% (2-24h), 25% (<2h/no-show) |
| **Scheduled In-Person** | Deposit at booking, balance after | $15 deposit + balance | On arrival | 100% deposit (24h+), 0% (<24h/no-show) |

---

## 🌙 OFFLINE MECHANICS FLOW (REVISED)

### Current Issues

1. ❌ AllMechanicsOfflineCard shows 3 options but flow unclear
2. ❌ "Browse all mechanics" and "Schedule for later" should be consolidated
3. ❌ Favorites not prominently shown when offline
4. ❌ No clear path to scheduling page when all offline

### Revised Offline Flow (Separate Scheduling Page Architecture)

**User Feedback Incorporated:**
> "When offline mechanics show up, browse all mechanics should be consolidated with schedule for later. If they are already booked and they go to scheduling system and try to book again, they should be prompted to modify their existing booking so seamless integration."

**Design Decision:** Since we're using a **separate SchedulingPage**, the offline flow becomes simpler:

**Option 1: Waitlist** → Stay on BookingWizard
**Option 2: Schedule Instead** → Redirect to SchedulingPage (with context)
**Option 3: Browse Offline** → Show offline mechanics list WITHOUT scheduling buttons (view-only)

### New Offline Flow in BookingWizard

**Step 1: User clicks "Find Mechanics" → All offline**

Show simplified offline notice:

```
┌─────────────────────────────────────────────────────────┐
│  ⏰ All Mechanics Are Currently Offline                  │
├─────────────────────────────────────────────────────────┤
│  Don't worry! You have options:                          │
│                                                           │
│  Option 1: Join Waitlist                                 │
│  ┌───────────────────────────────────────────────────┐ │
│  │  🔔 Get notified when a mechanic comes online     │ │
│  │  [Join Waitlist]                                  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                           │
│  Option 2: Schedule for Later                            │
│  ┌───────────────────────────────────────────────────┐ │
│  │  📅 Choose a specific time that works for you     │ │
│  │  [Schedule an Appointment →]                      │ │
│  │  (Redirects to SchedulingPage)                    │ │
│  └───────────────────────────────────────────────────┘ │
│                                                           │
│  Option 3: Browse Offline Mechanics (View Only)          │
│  ┌───────────────────────────────────────────────────┐ │
│  │  👥 View mechanics and their profiles             │ │
│  │  [Show Offline Mechanics ▼]                       │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Step 2: User clicks "Show Offline Mechanics" (expands)**

```
┌─────────────────────────────────────────────────────────┐
│  👥 Offline Mechanics (View Only)                        │
│  [Hide ^]                                                │
├─────────────────────────────────────────────────────────┤
│  ⭐ YOUR FAVORITES (if any)                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⭐★ John's Auto Repair - 4.9★                   │   │
│  │ 🔴 Offline                                       │   │
│  │ Specialties: Honda, Toyota, Diagnostics          │   │
│  │ [View Profile]  [❤️ Favorited]                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ALL MECHANICS                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Mike's Workshop - 4.7★                          │   │
│  │ 🔴 Offline                                       │   │
│  │ Specialties: BMW, Mercedes, Electrical           │   │
│  │ [View Profile]  [Add to Favorites]              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Sarah's Auto Care - 4.8★                        │   │
│  │ 🔴 Offline                                       │   │
│  │ Specialties: Toyota, Brakes, Suspension          │   │
│  │ [View Profile]  [Add to Favorites]              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  💡 Tip: To schedule with any mechanic, use the          │
│     "Schedule an Appointment" button above               │
└─────────────────────────────────────────────────────────┘
```

**Key Changes:**
- ❌ NO "Schedule this mechanic" button on cards (would be confusing in wizard)
- ✅ "View Profile" button to see mechanic details
- ✅ "Add to Favorites" for future bookings
- ✅ Clear guidance to use SchedulingPage for actual scheduling

**Step 3: User clicks "Schedule an Appointment"**

Redirect to SchedulingPage with context:

**Step 3: Time Selection (NEW STEP)**

```
┌─────────────────────────────────────────────────────────┐
│  Step 5: Choose Appointment Time                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Scheduling with: John's Auto Repair                     │
│                                                           │
│  Select Date:                                            │
│  ┌───────────────────────────────────────────────────┐ │
│  │  [Calendar Widget - Next 30 days]                  │ │
│  │  Unavailable dates grayed out                      │ │
│  └───────────────────────────────────────────────────┘ │
│                                                           │
│  Available Time Slots for Nov 12, 2025:                  │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Morning                                           │ │
│  │  [ 9:00 AM ] [ 9:30 AM ] [10:00 AM] [10:30 AM]   │ │
│  │                                                    │ │
│  │  Afternoon                                         │ │
│  │  [ 1:00 PM ] [ 1:30 PM ] [ 2:00 PM ] [ 2:30 PM ] │ │
│  │                                                    │ │
│  │  Evening                                           │ │
│  │  [ 5:00 PM ] [ 5:30 PM ] [ 6:00 PM ]             │ │
│  └───────────────────────────────────────────────────┘ │
│                                                           │
│  Estimated Duration: 30-60 minutes                       │
│                                                           │
│  [← Back]                                [Continue →]    │
└─────────────────────────────────────────────────────────┘
```

**Step 4: Review & Confirm (Modified)**

```
┌─────────────────────────────────────────────────────────┐
│  Review Your Appointment                                 │
├─────────────────────────────────────────────────────────┤
│  📅 November 12, 2025 at 2:00 PM                        │
│  🔧 John's Auto Repair                                  │
│  🚗 2020 Honda Civic                                    │
│  📝 Check engine light on, rough idle                   │
│  💰 Standard Plan - $29                                 │
│                                                           │
│  ⚠️ Important: Waiver Signing                           │
│  You'll be asked to sign the waiver on Nov 12 before    │
│  your appointment starts.                                │
│                                                           │
│  [ ] Add to my calendar (Google/Apple/Outlook)          │
│  [ ] Send me a reminder email 1 day before              │
│  [ ] Send me a reminder SMS 1 hour before               │
│                                                           │
│  [← Back]                      [Confirm Appointment →]   │
└─────────────────────────────────────────────────────────┘
```

**Step 5: Confirmation**

```
┌─────────────────────────────────────────────────────────┐
│  ✓ Appointment Confirmed!                                │
├─────────────────────────────────────────────────────────┤
│  Your session has been scheduled with John's Auto Repair │
│                                                           │
│  📅 November 12, 2025 at 2:00 PM EST                    │
│                                                           │
│  What happens next?                                      │
│  1. You'll receive a confirmation email shortly          │
│  2. We'll send you a reminder 1 day before               │
│  3. On Nov 12 at 1:30 PM, you'll get a link to join     │
│  4. Please sign the waiver before joining the session    │
│                                                           │
│  📥 Download Calendar Invite                             │
│  📧 Resend Confirmation Email                            │
│                                                           │
│  [View My Dashboard]            [Schedule Another →]     │
└─────────────────────────────────────────────────────────┘
```

### Code Implementation

**Modified AllMechanicsOfflineCard.tsx:**

```tsx
'use client'

import { useState } from 'react'
import { Star, Calendar, Bell } from 'lucide-react'

interface Mechanic {
  id: string
  name: string
  rating: number
  specialties: string[]
  isFavorite: boolean
  presenceStatus: 'offline'
}

interface OfflineMechanicsListProps {
  mechanics: Mechanic[]
  favorites: Mechanic[]
  onScheduleMechanic: (mechanicId: string) => void
  onJoinWaitlist: () => void
}

export default function OfflineMechanicsList({
  mechanics,
  favorites,
  onScheduleMechanic,
  onJoinWaitlist
}: OfflineMechanicsListProps) {
  const [joiningWaitlist, setJoiningWaitlist] = useState(false)

  const handleJoinWaitlist = async () => {
    setJoiningWaitlist(true)
    await onJoinWaitlist()
    setJoiningWaitlist(false)
  }

  return (
    <div className="offline-mechanics">
      {/* Header */}
      <div className="header bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          ⏰ All Mechanics Are Currently Offline
        </h3>
        <p className="text-sm text-amber-300 mb-4">
          Don't worry! You can schedule a session with any mechanic for a time that works for you.
        </p>

        {/* Waitlist Option */}
        <button
          onClick={handleJoinWaitlist}
          disabled={joiningWaitlist}
          className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg p-3 flex items-center gap-3 transition"
        >
          <Bell className="h-5 w-5 text-green-400" />
          <span className="text-white font-medium">
            {joiningWaitlist ? 'Joining Waitlist...' : 'Join Waitlist - Get notified when a mechanic comes online'}
          </span>
        </button>
      </div>

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <div className="favorites mb-6">
          <h4 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            Your Favorite Mechanics
          </h4>
          <div className="space-y-3">
            {favorites.map(mechanic => (
              <MechanicCard
                key={mechanic.id}
                mechanic={mechanic}
                onSchedule={() => onScheduleMechanic(mechanic.id)}
                isFavorite
              />
            ))}
          </div>
        </div>
      )}

      {/* All Mechanics Section */}
      <div className="all-mechanics">
        <h4 className="text-base font-semibold text-white mb-3">
          All Mechanics
        </h4>
        <div className="space-y-3">
          {mechanics
            .filter(m => !m.isFavorite)
            .map(mechanic => (
              <MechanicCard
                key={mechanic.id}
                mechanic={mechanic}
                onSchedule={() => onScheduleMechanic(mechanic.id)}
              />
            ))}
        </div>
      </div>
    </div>
  )
}

function MechanicCard({
  mechanic,
  onSchedule,
  isFavorite = false
}: {
  mechanic: Mechanic
  onSchedule: () => void
  isFavorite?: boolean
}) {
  return (
    <div className="mechanic-card bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isFavorite && (
              <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
            )}
            <h5 className="font-semibold text-white">{mechanic.name}</h5>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-yellow-400">★ {mechanic.rating}</span>
            <span className="text-slate-500">•</span>
            <span className="text-red-400">Offline</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-400 mb-3">
        Specialties: {mechanic.specialties.join(', ')}
      </p>

      <button
        onClick={onSchedule}
        className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg py-2 px-4 flex items-center justify-center gap-2 text-blue-300 font-medium transition"
      >
        <Calendar className="h-4 w-4" />
        Schedule with {mechanic.name.split(' ')[0]}
      </button>
    </div>
  )
}
```

---

## 📅 SCHEDULING INTEGRATION

### SessionFactory Modifications

**Current SessionFactory Signature:**
```typescript
interface CreateSessionParams {
  customerId: string
  type: 'chat' | 'video' | 'diagnostic'
  plan: 'standard' | 'brand_specialist'
  vehicleId: string
  concern: string
  // ... other fields
}
```

**NEW Signature (Add Scheduling Fields):**
```typescript
interface CreateSessionParams {
  customerId: string
  type: 'chat' | 'video' | 'diagnostic'
  plan: 'standard' | 'brand_specialist' | 'advice_only'
  vehicleId: string
  concern: string

  // ⭐ NEW SCHEDULING FIELDS
  scheduledFor?: Date | null              // Future appointment time
  preferredMechanicId?: string | null     // If user selected specific mechanic
  reservationId?: string | null           // If slot was pre-reserved (Phase 2+)

  // Existing matching fields
  customerCountry?: string
  customerCity?: string
  customerPostalCode?: string
}
```

**Modified Session Creation Logic:**
```typescript
export async function createSession(params: CreateSessionParams) {
  const {
    customerId,
    type,
    plan,
    vehicleId,
    concern,
    scheduledFor,
    preferredMechanicId,
    customerCountry,
    customerCity,
    customerPostalCode
  } = params

  // 1. Determine session status based on scheduling
  const sessionStatus = scheduledFor
    ? 'scheduled'  // ← Future appointment
    : 'pending'    // ← Immediate session

  // 2. Create session record
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .insert({
      customer_user_id: customerId,
      type,
      status: sessionStatus,  // ⭐ NEW
      plan,
      scheduled_for: scheduledFor,  // ⭐ POPULATE THIS FIELD
      vehicle_id: vehicleId,
      concern,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (sessionError || !session) {
    throw new Error(`Failed to create session: ${sessionError?.message}`)
  }

  // 3. Handle matching based on scheduling
  if (scheduledFor) {
    // SCHEDULED SESSION PATH
    await handleScheduledSessionMatching(session, {
      preferredMechanicId,
      customerCountry,
      customerCity,
      customerPostalCode,
      concern
    })
  } else {
    // IMMEDIATE SESSION PATH (existing logic)
    await handleImmediateSessionMatching(session, {
      customerCountry,
      customerCity,
      customerPostalCode,
      concern
    })
  }

  return session
}
```

**Scheduled Session Matching (NEW):**
```typescript
async function handleScheduledSessionMatching(
  session: Session,
  options: {
    preferredMechanicId?: string | null
    customerCountry?: string
    customerCity?: string
    customerPostalCode?: string
    concern: string
  }
) {
  const { preferredMechanicId, concern, ...location } = options

  // If user selected a specific mechanic, create targeted assignment
  if (preferredMechanicId) {
    await supabaseAdmin
      .from('session_assignments')
      .insert({
        session_id: session.id,
        mechanic_id: preferredMechanicId,
        status: 'scheduled',  // ⭐ NEW STATUS
        priority: 'high',
        created_at: new Date().toISOString()
      })

    // Send confirmation to mechanic
    await sendScheduleConfirmation(preferredMechanicId, session)

    return
  }

  // If no preferred mechanic, still run matching but defer assignment
  // Matching will run 30 minutes before scheduled time
  const keywords = extractKeywords(concern)

  // Store matching criteria in session metadata for later use
  await supabaseAdmin
    .from('sessions')
    .update({
      metadata: {
        matching_criteria: {
          requestType: 'general',
          extractedKeywords: keywords,
          ...location
        },
        matching_deferred: true,
        matching_will_run_at: new Date(
          new Date(session.scheduled_for!).getTime() - 30 * 60 * 1000
        ).toISOString()
      }
    })
    .eq('id', session.id)
}
```

### AvailabilityService Integration

**When user selects a date/time, check availability:**

```typescript
// NEW: src/lib/availabilityService.ts

export class AvailabilityService {
  /**
   * Check if a mechanic is available for a specific time slot
   */
  async isAvailable(
    mechanicId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const supabase = createServerClient(/* ... */)

    // 1. Check mechanic's base availability (blocks or workshop hours)
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('workshop_id, state_province')
      .eq('user_id', mechanicId)
      .single()

    if (!mechanic) return false

    // If workshop-affiliated, check workshop hours
    if (mechanic.workshop_id) {
      const { data: workshopAvail } = await supabase
        .from('workshop_availability')
        .select('*')
        .eq('workshop_id', mechanic.workshop_id)
        .eq('day_of_week', startTime.getDay())
        .single()

      if (!workshopAvail || !workshopAvail.is_open) return false

      // Check if time falls within workshop hours
      const startHour = startTime.getHours()
      const workshopStart = parseInt(workshopAvail.open_time.split(':')[0])
      const workshopEnd = parseInt(workshopAvail.close_time.split(':')[0])

      if (startHour < workshopStart || startHour >= workshopEnd) {
        return false
      }
    }

    // 2. Check if mechanic has time off
    const { data: timeOff } = await supabase
      .from('mechanic_time_off')
      .select('*')
      .eq('mechanic_user_id', mechanicId)
      .lte('start_date', startTime.toISOString())
      .gte('end_date', endTime.toISOString())

    if (timeOff && timeOff.length > 0) return false

    // 3. Check for existing bookings (prevent double-booking)
    const { data: existingSessions } = await supabase
      .from('sessions')
      .select('id, scheduled_for, type')
      .eq('mechanic_user_id', mechanicId)
      .eq('status', 'scheduled')
      .gte('scheduled_for', startTime.toISOString())
      .lte('scheduled_for', endTime.toISOString())

    if (existingSessions && existingSessions.length > 0) return false

    // 4. Check minimum booking notice (e.g., 2 hours in advance)
    const now = new Date()
    const minNoticeHours = 2
    const minBookingTime = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000)

    if (startTime < minBookingTime) return false

    return true
  }

  /**
   * Get available time slots for a mechanic on a specific date
   */
  async getAvailableSlots(
    mechanicId: string,
    date: Date
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = []

    // Generate 30-minute slots from 9 AM to 6 PM
    const startHour = 9
    const endHour = 18

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        const slotStart = new Date(date)
        slotStart.setHours(hour, minute, 0, 0)

        const slotEnd = new Date(slotStart)
        slotEnd.setMinutes(slotEnd.getMinutes() + 30)

        const available = await this.isAvailable(mechanicId, slotStart, slotEnd)

        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          available
        })
      }
    }

    return slots
  }
}

interface TimeSlot {
  startTime: Date
  endTime: Date
  available: boolean
}
```

**Usage in Time Selection Component:**

```typescript
// NEW: src/components/customer/booking-steps/TimeSelectionStep.tsx

'use client'

import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { AvailabilityService } from '@/lib/availabilityService'

interface TimeSelectionStepProps {
  mechanicId: string
  onSelectTime: (scheduledFor: Date) => void
}

export default function TimeSelectionStep({
  mechanicId,
  onSelectTime
}: TimeSelectionStepProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots(selectedDate)
    }
  }, [selectedDate])

  const loadAvailableSlots = async (date: Date) => {
    setLoading(true)
    try {
      const response = await fetch('/api/mechanics/availability/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mechanicId,
          date: date.toISOString()
        })
      })
      const data = await response.json()
      setAvailableSlots(data.slots)
    } catch (err) {
      console.error('Failed to load slots:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="time-selection">
      <h3>Choose Appointment Time</h3>

      {/* Date Picker */}
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        disabled={(date) => {
          // Disable past dates
          return date < new Date()
        }}
        className="rounded-md border"
      />

      {/* Time Slots */}
      {selectedDate && (
        <div className="time-slots mt-6">
          <h4>Available Times for {selectedDate.toLocaleDateString()}</h4>

          {loading ? (
            <div>Loading available times...</div>
          ) : (
            <div className="slots-grid">
              {availableSlots
                .filter(slot => slot.available)
                .map(slot => (
                  <button
                    key={slot.startTime.toISOString()}
                    onClick={() => onSelectTime(slot.startTime)}
                    className="slot-button"
                  >
                    {slot.startTime.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## 🗄️ ONE SOURCE OF TRUTH ARCHITECTURE

### Core Principles

1. **SessionFactory** = Single session creation point
   - ALL sessions created through `createSession()`
   - Handles both immediate and scheduled sessions
   - Applies consistent validation and business logic

2. **AvailabilityService** = Single availability truth
   - ALL availability checks go through this service
   - Considers: workshop hours, time off, existing bookings, minimum notice
   - Used by: booking wizard, scheduling system, mechanic dashboard

3. **mechanicMatching.ts** = Single matching logic
   - ALL matching uses `findMatchingMechanics()`
   - Consistent scoring algorithm (10+ criteria)
   - Used for both immediate and scheduled sessions

4. **Database Fields** = Single data source
   - `sessions.scheduled_for` = appointment time (null = immediate)
   - `sessions.status` = session state ('pending', 'scheduled', 'active', etc.)
   - `mechanics.currently_on_shift` = online status (NOT `is_available`)
   - `mechanics.state_province` = mechanic location

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   BOOKING WIZARD                         │
│  (Customer-facing UI - src/components/customer/)         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
         ┌─────────────────────────┐
         │ Is scheduling needed?   │
         └───────┬─────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
       YES               NO
        │                 │
        ↓                 ↓
┌──────────────┐   ┌──────────────┐
│ Time         │   │ Mechanic     │
│ Selection    │   │ Selection    │
│ Step         │   │ (optional)   │
│              │   │              │
│ Uses:        │   │ Uses:        │
│ Availability │   │ Matching     │
│ Service ✅   │   │ Algorithm ✅ │
└──────┬───────┘   └──────┬───────┘
       │                  │
       └────────┬─────────┘
                │
                ↓
    ┌──────────────────────┐
    │   SESSION FACTORY    │ ← ⭐ ONE SOURCE OF TRUTH
    │  (src/lib/session    │
    │   Factory.ts)        │
    │                      │
    │  Creates session:    │
    │  • Validates params  │
    │  • Sets status       │
    │  • Populates fields  │
    │  • Runs matching     │
    │  • Creates           │
    │    assignments       │
    └──────────┬───────────┘
               │
               ↓
    ┌──────────────────────┐
    │    DATABASE          │
    │                      │
    │  sessions table      │
    │  • scheduled_for ✅  │
    │  • status ✅         │
    │  • metadata          │
    │                      │
    │  session_assignments │
    │  • match_score ✅    │
    │  • match_reasons ✅  │
    │  • priority ✅       │
    └──────────────────────┘
```

### API Endpoints Structure

```
/api/customer/
  └─ book-session/          (BookingWizard submission)
     └─ Uses SessionFactory ✅

/api/mechanics/
  └─ available/             (Get online mechanics)
     └─ Checks currently_on_shift ✅

  └─ availability/
     └─ slots/              (Get available time slots)
        └─ Uses AvailabilityService ✅

     └─ check/              (Check specific time)
        └─ Uses AvailabilityService ✅

/api/intake/
  └─ start/                 (Create session)
     └─ Uses SessionFactory ✅

/api/scheduling/
  └─ create-appointment/    (Schedule future session)
     └─ Uses SessionFactory with scheduledFor ✅
     └─ Uses AvailabilityService for validation ✅

/api/customer/
  └─ waitlist/
     └─ join/               (Join waitlist when offline)
        └─ Creates waitlist entry
        └─ Sends email notification ✅
```

### Validation Flow

**Every session creation goes through:**

```typescript
// In SessionFactory.createSession()

// 1. Validate required fields
if (!customerId || !type || !plan) {
  throw new Error('Missing required fields')
}

// 2. If scheduling, validate availability
if (scheduledFor) {
  if (preferredMechanicId) {
    const availabilityService = new AvailabilityService()
    const isAvailable = await availabilityService.isAvailable(
      preferredMechanicId,
      scheduledFor,
      new Date(scheduledFor.getTime() + 60 * 60 * 1000) // +1 hour
    )

    if (!isAvailable) {
      throw new Error('Selected time slot is not available')
    }
  }

  // Ensure scheduled time is in future
  if (scheduledFor < new Date()) {
    throw new Error('Cannot schedule in the past')
  }
}

// 3. Create session with validated data
// 4. Run matching (immediate or deferred)
// 5. Create assignments
// 6. Send notifications
```

---

## 📧 WAITLIST SYSTEM ENHANCEMENT

### Current Issues

1. ❌ No email sent when joining waitlist
2. ❌ Customer gets JSON response but no clear UI feedback
3. ❌ No indication of what happens next

### Enhanced Waitlist Flow

**Step 1: Customer clicks "Join Waitlist"**

```tsx
// In OfflineMechanicsList component
const handleJoinWaitlist = async () => {
  setJoiningWaitlist(true)

  try {
    const response = await fetch('/api/customer/waitlist/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notification_type: 'mechanic_online',
        metadata: {
          source: 'booking_wizard',
          location: customerLocation,
          timestamp: new Date().toISOString()
        }
      })
    })

    if (response.ok) {
      // Show success modal
      setShowWaitlistModal(true)
    } else {
      // Show error
      alert('Failed to join waitlist. Please try again.')
    }
  } finally {
    setJoiningWaitlist(false)
  }
}
```

**Step 2: Show Success Modal**

```tsx
// NEW: WaitlistSuccessModal component
function WaitlistSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="icon-success">
          <Bell className="h-12 w-12 text-green-400 animate-pulse" />
        </div>

        <h3 className="text-xl font-bold text-white mt-4">
          You're on the Waitlist!
        </h3>

        <div className="mt-4 text-sm text-slate-300 space-y-3">
          <p>✅ Your request has been received</p>
          <p>📧 We've sent a confirmation email to your inbox</p>
          <p>🔔 You'll be notified immediately when a mechanic comes online</p>
          <p>⏱️ Average wait time: 15-30 minutes during business hours</p>
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h4 className="font-semibold text-blue-300 mb-2">What happens next?</h4>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>1. A mechanic will come online</li>
            <li>2. We'll send you an email and browser notification</li>
            <li>3. Click the link to start your session immediately</li>
          </ul>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg"
          >
            Continue Browsing
          </button>
          <button
            onClick={() => window.location.href = '/customer/dashboard'}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Enhanced API Endpoint with Email**

```typescript
// Modified: src/app/api/customer/waitlist/join/route.ts

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    // ... existing auth code ...

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    if (!profile?.email) {
      return NextResponse.json(
        { error: 'No email address found' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { notification_type = 'mechanic_online', metadata = {} } = body

    // Create waitlist entry in database
    const { data: waitlistEntry, error: waitlistError } = await supabase
      .from('customer_waitlist')
      .insert({
        customer_id: user.id,
        notification_type,
        status: 'pending',
        metadata,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (waitlistError) {
      console.error('[Waitlist] Database error:', waitlistError)
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      )
    }

    // Send confirmation email
    try {
      await resend.emails.send({
        from: 'TheAutoDoctorapp <noreply@theautodoctorapp.com>',
        to: profile.email,
        subject: 'You\'re on the Waitlist - TheAutoDoctorapp',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #1e293b; color: white; padding: 20px; text-align: center; }
              .content { background: #f8fafc; padding: 30px; }
              .button {
                display: inline-block;
                background: #3b82f6;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
              }
              .steps { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔔 You're on the Waitlist!</h1>
              </div>

              <div class="content">
                <p>Hi ${profile.full_name || 'there'},</p>

                <p>Thank you for your patience! All our mechanics are currently offline, but you're now on the waitlist.</p>

                <div class="steps">
                  <h3 style="margin-top: 0;">What happens next?</h3>
                  <ol>
                    <li><strong>A mechanic comes online</strong> - We'll detect this automatically</li>
                    <li><strong>You get notified</strong> - We'll send you an email and browser notification immediately</li>
                    <li><strong>Start your session</strong> - Click the link to join your session right away</li>
                  </ol>
                </div>

                <p><strong>Average wait time:</strong> 15-30 minutes during business hours (9 AM - 6 PM EST)</p>

                <p style="text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/customer/dashboard" class="button">
                    View My Dashboard
                  </a>
                </p>

                <p>You can close this email and continue browsing. We'll notify you as soon as a mechanic is available!</p>
              </div>

              <div class="footer">
                <p>TheAutoDoctorapp - Professional Auto Repair Consultations</p>
                <p>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/customer/profile">Update Preferences</a> |
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/support">Contact Support</a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      })

      console.log('[Waitlist] Confirmation email sent to:', profile.email)
    } catch (emailError) {
      console.error('[Waitlist] Email sending failed:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined waitlist. Check your email for confirmation.',
      waitlistEntry: {
        id: waitlistEntry.id,
        userId: user.id,
        email: profile.email,
        notificationType: notification_type,
        createdAt: waitlistEntry.created_at
      }
    })

  } catch (error) {
    console.error('[Waitlist] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 4: Database Migration for Waitlist Table**

```sql
-- NEW: supabase/migrations/20251110_create_customer_waitlist.sql

CREATE TABLE IF NOT EXISTS customer_waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type VARCHAR(50) NOT NULL DEFAULT 'mechanic_online',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,

  CONSTRAINT valid_status CHECK (status IN ('pending', 'notified', 'expired', 'cancelled'))
);

-- Index for efficient queries
CREATE INDEX idx_waitlist_status ON customer_waitlist(status);
CREATE INDEX idx_waitlist_created ON customer_waitlist(created_at);
CREATE INDEX idx_waitlist_customer ON customer_waitlist(customer_id);

-- RLS Policies
ALTER TABLE customer_waitlist ENABLE ROW LEVEL SECURITY;

-- Customers can view their own waitlist entries
CREATE POLICY "Customers can view own waitlist entries"
  ON customer_waitlist
  FOR SELECT
  USING (auth.uid() = customer_id);

-- Customers can insert their own waitlist entries
CREATE POLICY "Customers can join waitlist"
  ON customer_waitlist
  FOR INSERT
  WITH CHECK (auth.uid() = customer_id);
```

**Step 5: Waitlist Notification Trigger (Future Implementation)**

```sql
-- Database function to notify waitlist customers when mechanic comes online
-- This would be called by a trigger or serverless function

CREATE OR REPLACE FUNCTION notify_waitlist_customers()
RETURNS void AS $$
DECLARE
  waitlist_customer RECORD;
BEGIN
  -- Find all pending waitlist entries
  FOR waitlist_customer IN
    SELECT id, customer_id, created_at
    FROM customer_waitlist
    WHERE status = 'pending'
    AND created_at > NOW() - INTERVAL '2 hours'  -- Only last 2 hours
    ORDER BY created_at ASC
  LOOP
    -- Mark as notified
    UPDATE customer_waitlist
    SET status = 'notified', notified_at = NOW()
    WHERE id = waitlist_customer.id;

    -- Send notification (would integrate with edge function)
    -- Example: pg_notify('waitlist_customer', waitlist_customer.customer_id::text);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger when mechanic comes online
CREATE OR REPLACE FUNCTION on_mechanic_online()
RETURNS TRIGGER AS $$
BEGIN
  -- If mechanic just came online (currently_on_shift changed to true)
  IF NEW.currently_on_shift = true AND OLD.currently_on_shift = false THEN
    PERFORM notify_waitlist_customers();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mechanic_online_trigger
  AFTER UPDATE OF currently_on_shift ON mechanics
  FOR EACH ROW
  EXECUTE FUNCTION on_mechanic_online();
```

---

## 📅 IMPLEMENTATION PHASES

### Phase 1: Booking Wizard UX Fixes (Week 1 - Days 1-3)

**Estimated Time:** 2-3 days

**Tasks:**

1. **Fix "Skip Just Advice" Option** (4 hours)
   - [ ] Add "Just Advice (Free)" to plan options
   - [ ] Handle advice-only flow (skip mechanic, skip payment)
   - [ ] Create chat-only session
   - [ ] Test end-to-end

2. **Add Manual Search Button** (6 hours)
   - [ ] Remove auto-fetch useEffect from MechanicStep
   - [ ] Add "Find Mechanics" button
   - [ ] Implement manual search handler
   - [ ] Add loading state
   - [ ] Add empty state (before search)
   - [ ] Test performance (no unnecessary API calls)

3. **Reorganize MechanicStep UI** (4 hours)
   - [ ] Rearrange components: Location → Tabs → Button → Results
   - [ ] Improve visual hierarchy
   - [ ] Make search button prominent (gradient, centered)
   - [ ] Test responsive design
   - [ ] User testing

**Files to Modify:**
- [src/components/customer/BookingWizard.tsx](src/components/customer/BookingWizard.tsx)
- [src/components/customer/booking-steps/MechanicStep.tsx](src/components/customer/booking-steps/MechanicStep.tsx)

**Testing:**
- ✅ "Just Advice" option appears and works
- ✅ Search button only fetches when clicked
- ✅ No auto-fetching on mount or state change
- ✅ UI layout is clear and intuitive
- ✅ No console errors

---

### Phase 2: Offline Mechanics Flow Redesign (Week 1 - Days 4-5)

**Estimated Time:** 2 days

**Tasks:**

1. **Replace AllMechanicsOfflineCard** (6 hours)
   - [ ] Create new OfflineMechanicsList component
   - [ ] Show favorites first with prominent star icon
   - [ ] Add "Schedule with [Mechanic]" button on each card
   - [ ] Keep waitlist option at top
   - [ ] Remove separate "Browse" and "Schedule" options
   - [ ] Test UI/UX

2. **Integrate with Booking Wizard** (4 hours)
   - [ ] When mechanic selected, store in wizard state
   - [ ] Continue to Concern step
   - [ ] Add flag: `isScheduling = true`
   - [ ] Test flow: Offline mechanic → Select → Concern → (next: Time)

**Files to Create:**
- `src/components/customer/OfflineMechanicsList.tsx` (NEW)

**Files to Modify:**
- [src/components/customer/booking-steps/MechanicStep.tsx](src/components/customer/booking-steps/MechanicStep.tsx)
- [src/components/customer/BookingWizard.tsx](src/components/customer/BookingWizard.tsx)

**Testing:**
- ✅ Favorites shown first with star icon
- ✅ "Schedule" button on each offline mechanic card
- ✅ Flow continues to Concern step after selection
- ✅ Wizard state stores selected mechanic

---

### Phase 3: Waitlist System Enhancement (Week 1 - Weekend)

**Estimated Time:** 1-2 days

**Tasks:**

1. **Database Migration** (1 hour)
   - [ ] Create `customer_waitlist` table
   - [ ] Add indexes
   - [ ] Set up RLS policies
   - [ ] Test migration

2. **Email Integration** (4 hours)
   - [ ] Set up Resend API key
   - [ ] Create email template
   - [ ] Update `/api/customer/waitlist/join` endpoint
   - [ ] Test email sending
   - [ ] Handle email failures gracefully

3. **Success Modal** (3 hours)
   - [ ] Create WaitlistSuccessModal component
   - [ ] Show modal on waitlist join
   - [ ] Display clear next steps
   - [ ] Add "Go to Dashboard" button
   - [ ] Test UX flow

**Files to Create:**
- `supabase/migrations/20251110_create_customer_waitlist.sql` (NEW)
- `src/components/customer/WaitlistSuccessModal.tsx` (NEW)

**Files to Modify:**
- [src/app/api/customer/waitlist/join/route.ts](src/app/api/customer/waitlist/join/route.ts)
- [src/components/customer/OfflineMechanicsList.tsx](src/components/customer/OfflineMechanicsList.tsx)

**Testing:**
- ✅ Waitlist entry created in database
- ✅ Email sent successfully
- ✅ Modal shows with clear messaging
- ✅ Customer understands next steps

---

### Phase 4: Scheduling System Foundation (Week 2 - Days 1-3)

**Estimated Time:** 3 days

**Tasks:**

1. **SessionFactory Modifications** (6 hours)
   - [ ] Add `scheduledFor` parameter to CreateSessionParams
   - [ ] Add `preferredMechanicId` parameter
   - [ ] Add `reservationId` parameter (for future use)
   - [ ] Modify session creation to set status based on scheduledFor
   - [ ] Populate `sessions.scheduled_for` field
   - [ ] Create `handleScheduledSessionMatching()` function
   - [ ] Test both immediate and scheduled paths

2. **AvailabilityService Implementation** (8 hours)
   - [ ] Create `src/lib/availabilityService.ts`
   - [ ] Implement `isAvailable()` method
   - [ ] Implement `getAvailableSlots()` method
   - [ ] Check workshop hours
   - [ ] Check time off
   - [ ] Check existing bookings
   - [ ] Check minimum notice
   - [ ] Unit tests

3. **API Endpoints** (4 hours)
   - [ ] Create `/api/mechanics/availability/slots` endpoint
   - [ ] Create `/api/mechanics/availability/check` endpoint
   - [ ] Use AvailabilityService in endpoints
   - [ ] Add error handling
   - [ ] Test endpoints

**Files to Create:**
- `src/lib/availabilityService.ts` (NEW)
- `src/app/api/mechanics/availability/slots/route.ts` (NEW)
- `src/app/api/mechanics/availability/check/route.ts` (NEW)

**Files to Modify:**
- [src/lib/sessionFactory.ts](src/lib/sessionFactory.ts)

**Testing:**
- ✅ `sessions.scheduled_for` populated correctly
- ✅ Session status = 'scheduled' for future appointments
- ✅ AvailabilityService correctly checks all constraints
- ✅ API endpoints return valid time slots
- ✅ Double-booking prevented

---

### Phase 5: Time Selection UI (Week 2 - Days 4-5)

**Estimated Time:** 2 days

**Tasks:**

1. **TimeSelectionStep Component** (8 hours)
   - [ ] Create new booking wizard step
   - [ ] Add calendar picker (react-day-picker or shadcn Calendar)
   - [ ] Load available slots when date selected
   - [ ] Display time slots in grid
   - [ ] Highlight selected time
   - [ ] Show estimated duration
   - [ ] Handle time selection

2. **Booking Wizard Integration** (4 hours)
   - [ ] Add TimeSelectionStep after Concern step
   - [ ] Only show if `isScheduling = true`
   - [ ] Store selected time in wizard state
   - [ ] Pass to SessionFactory on submission
   - [ ] Test conditional flow

**Files to Create:**
- `src/components/customer/booking-steps/TimeSelectionStep.tsx` (NEW)

**Files to Modify:**
- [src/components/customer/BookingWizard.tsx](src/components/customer/BookingWizard.tsx)

**Testing:**
- ✅ Calendar shows next 30 days
- ✅ Past dates disabled
- ✅ Time slots load correctly
- ✅ Unavailable slots grayed out
- ✅ Selected time highlighted
- ✅ Flow continues to review step

---

### Phase 6: Review & Confirmation (Week 3 - Days 1-2)

**Estimated Time:** 1-2 days

**Tasks:**

1. **Review Step Modifications** (4 hours)
   - [ ] Show scheduled date/time if applicable
   - [ ] Display "Waiver will be signed on appointment day"
   - [ ] Add calendar options (Google, Apple, Outlook)
   - [ ] Add reminder preferences
   - [ ] Test conditional display

2. **Confirmation Page** (4 hours)
   - [ ] Show success message
   - [ ] Display appointment details
   - [ ] Show "What happens next" section
   - [ ] Provide calendar download link
   - [ ] Add email resend option
   - [ ] Test UX

3. **Email Notifications** (4 hours)
   - [ ] Create appointment confirmation email template
   - [ ] Send on successful booking
   - [ ] Include calendar invite attachment
   - [ ] Test email delivery

**Files to Modify:**
- [src/components/customer/BookingWizard.tsx](src/components/customer/BookingWizard.tsx)

**Files to Create:**
- `src/components/customer/AppointmentConfirmation.tsx` (NEW)
- `src/lib/emailTemplates/appointmentConfirmation.ts` (NEW)

**Testing:**
- ✅ Review shows correct appointment time
- ✅ Confirmation page displays all details
- ✅ Email sent with calendar invite
- ✅ Calendar export works (Google, Apple, Outlook)

---

### Phase 7: Waiver Flow for Scheduled Sessions (Week 3 - Days 3-4)

**Estimated Time:** 2 days

**Tasks:**

1. **Waiver Deferral Logic** (4 hours)
   - [ ] Skip waiver for scheduled sessions
   - [ ] Create appointment without waiver signature
   - [ ] Add reminder to sign waiver before appointment
   - [ ] Test immediate vs scheduled paths

2. **Pre-Session Waiver Page** (6 hours)
   - [ ] Create waiver page for appointment day
   - [ ] Show waiver text
   - [ ] Require signature before joining
   - [ ] Redirect to session after signing
   - [ ] Test flow

3. **Appointment Day Flow** (4 hours)
   - [ ] Customer receives reminder email with link
   - [ ] Link takes to waiver page
   - [ ] After signing, redirect to session lobby
   - [ ] Test end-to-end

**Files to Create:**
- `src/app/customer/appointments/[id]/waiver/page.tsx` (NEW)

**Files to Modify:**
- [src/components/customer/BookingWizard.tsx](src/components/customer/BookingWizard.tsx)

**Testing:**
- ✅ Waiver skipped during booking for scheduled sessions
- ✅ Waiver page accessible on appointment day
- ✅ Session join blocked until waiver signed
- ✅ Redirect works after signing

---

### Phase 8: Dashboard & Notifications (Week 3 - Day 5)

**Estimated Time:** 1 day

**Tasks:**

1. **Customer Dashboard** (4 hours)
   - [ ] Show upcoming appointments
   - [ ] Display waitlist status if applicable
   - [ ] Add "Join Session" button (appears 15 min before)
   - [ ] Show past sessions
   - [ ] Test UI

2. **Reminder Notifications** (4 hours)
   - [ ] Set up scheduled emails (1 day before, 1 hour before)
   - [ ] Browser notifications (if enabled)
   - [ ] SMS reminders (optional - future)
   - [ ] Test delivery

**Files to Modify:**
- [src/app/customer/dashboard/page.tsx](src/app/customer/dashboard/page.tsx)

**Files to Create:**
- `src/lib/scheduledTasks/appointmentReminders.ts` (NEW)

**Testing:**
- ✅ Upcoming appointments shown
- ✅ "Join" button appears at right time
- ✅ Reminder emails sent on schedule
- ✅ Browser notifications work

---

### Phase 9: Testing & Polish (Week 4)

**Estimated Time:** 5 days

**Tasks:**

1. **End-to-End Testing** (2 days)
   - [ ] Immediate session flow
   - [ ] Scheduled session flow
   - [ ] Offline mechanics flow
   - [ ] Waitlist flow
   - [ ] Edge cases

2. **Performance Testing** (1 day)
   - [ ] API response times
   - [ ] Database query optimization
   - [ ] Frontend load times
   - [ ] Mobile responsiveness

3. **User Acceptance Testing** (1 day)
   - [ ] Test with real users
   - [ ] Gather feedback
   - [ ] Fix UI/UX issues

4. **Documentation** (1 day)
   - [ ] Update user guides
   - [ ] Create admin documentation
   - [ ] Write deployment guide

---

## 📊 TESTING STRATEGY

### Manual Testing Checklist

**Immediate Session Flow:**
- [ ] Customer selects vehicle
- [ ] Customer selects Standard plan
- [ ] Customer clicks "Find Mechanics"
- [ ] Online mechanics appear
- [ ] Customer selects mechanic
- [ ] Customer describes concern
- [ ] Customer signs waiver
- [ ] Session created with status='pending'
- [ ] Matching algorithm runs
- [ ] Mechanic receives assignment
- [ ] Customer redirected to session

**Scheduled Session Flow:**
- [ ] Customer selects vehicle
- [ ] Customer selects Brand Specialist plan
- [ ] Customer clicks "Find Mechanics"
- [ ] All mechanics offline
- [ ] Customer clicks "Schedule with [Mechanic]"
- [ ] Customer describes concern
- [ ] Customer selects date
- [ ] Customer selects time slot
- [ ] Customer reviews appointment
- [ ] Customer confirms
- [ ] Session created with status='scheduled', scheduled_for populated
- [ ] Confirmation email sent
- [ ] Calendar invite attached
- [ ] On appointment day:
  - [ ] Customer receives reminder email
  - [ ] Customer clicks link to waiver
  - [ ] Customer signs waiver
  - [ ] Customer redirected to session lobby
  - [ ] Matching algorithm runs 30 min before
  - [ ] Mechanic assigned
  - [ ] Session starts on time

**Offline Mechanics + Waitlist Flow:**
- [ ] Customer selects vehicle & plan
- [ ] Customer clicks "Find Mechanics"
- [ ] All mechanics offline
- [ ] Offline mechanics list shown
- [ ] Favorites shown first with star
- [ ] Customer clicks "Join Waitlist"
- [ ] Success modal appears
- [ ] Confirmation email sent
- [ ] Waitlist entry created in database
- [ ] When mechanic comes online:
  - [ ] Waitlist customers notified (email + browser)
  - [ ] Customer clicks link to start session

**Just Advice Flow:**
- [ ] Customer selects vehicle
- [ ] Customer selects "Just Advice (Free)"
- [ ] Mechanic selection skipped
- [ ] Customer describes concern
- [ ] Session created (type='chat', plan='advice_only')
- [ ] Available mechanics shown in real-time
- [ ] Customer can start chat immediately

### Unit Tests

**SessionFactory:**
```typescript
describe('SessionFactory.createSession', () => {
  it('should create immediate session when scheduledFor is null', async () => {
    const session = await createSession({
      customerId: 'user-123',
      type: 'chat',
      plan: 'standard',
      vehicleId: 'vehicle-456',
      concern: 'Check engine light',
      scheduledFor: null
    })

    expect(session.status).toBe('pending')
    expect(session.scheduled_for).toBeNull()
  })

  it('should create scheduled session when scheduledFor is provided', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const session = await createSession({
      customerId: 'user-123',
      type: 'video',
      plan: 'brand_specialist',
      vehicleId: 'vehicle-456',
      concern: 'BMW brake diagnosis',
      scheduledFor: futureDate,
      preferredMechanicId: 'mechanic-789'
    })

    expect(session.status).toBe('scheduled')
    expect(session.scheduled_for).toEqual(futureDate.toISOString())
  })

  it('should reject scheduling in the past', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000)

    await expect(createSession({
      customerId: 'user-123',
      type: 'chat',
      plan: 'standard',
      vehicleId: 'vehicle-456',
      concern: 'Oil change question',
      scheduledFor: pastDate
    })).rejects.toThrow('Cannot schedule in the past')
  })
})
```

**AvailabilityService:**
```typescript
describe('AvailabilityService.isAvailable', () => {
  it('should return true for available time slot', async () => {
    const service = new AvailabilityService()
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    tomorrow.setHours(14, 0, 0, 0) // 2:00 PM

    const endTime = new Date(tomorrow)
    endTime.setHours(15, 0, 0, 0) // 3:00 PM

    const available = await service.isAvailable('mechanic-123', tomorrow, endTime)
    expect(available).toBe(true)
  })

  it('should return false for past time slot', async () => {
    const service = new AvailabilityService()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const available = await service.isAvailable('mechanic-123', yesterday, new Date())
    expect(available).toBe(false)
  })

  it('should return false when mechanic has existing booking', async () => {
    // Create existing session first
    await createSession({
      customerId: 'user-123',
      type: 'video',
      plan: 'standard',
      vehicleId: 'vehicle-456',
      concern: 'Test',
      scheduledFor: futureTime,
      preferredMechanicId: 'mechanic-123'
    })

    // Try to book same time
    const service = new AvailabilityService()
    const available = await service.isAvailable('mechanic-123', futureTime, futureEndTime)
    expect(available).toBe(false)
  })
})
```

### Performance Benchmarks

| Operation | Target | Current | Status |
|-----------|--------|---------|--------|
| Matching algorithm | <500ms | - | TBD |
| AvailabilityService.isAvailable | <100ms | - | TBD |
| Get available slots (1 day) | <300ms | - | TBD |
| Booking wizard step transition | <200ms | - | TBD |
| API /mechanics/available | <250ms | - | TBD |
| SessionFactory.createSession | <500ms | - | TBD |

---

## 🎯 SUCCESS CRITERIA

### User Experience
- ✅ Customer can book immediate session in <3 minutes
- ✅ Customer can schedule appointment in <5 minutes
- ✅ Offline mechanics flow is intuitive
- ✅ Waitlist provides clear next steps
- ✅ UI is responsive and performant

### Technical
- ✅ All sessions go through SessionFactory (single source of truth)
- ✅ `sessions.scheduled_for` field populated for all scheduled sessions
- ✅ AvailabilityService prevents double-booking
- ✅ Matching algorithm works for both immediate and scheduled sessions
- ✅ No breaking changes to existing functionality

### Business
- ✅ Mechanics receive more targeted assignments
- ✅ Customers get matched with best-fit mechanics
- ✅ Offline hours result in scheduled bookings (not lost customers)
- ✅ Average response time improves
- ✅ Customer satisfaction increases

---

## 🚀 DEPLOYMENT PLAN

### Pre-Deployment

1. **Database Migrations**
   ```bash
   pnpm supabase db push
   ```
   - Apply waitlist table migration
   - Verify schema changes

2. **Environment Variables**
   ```bash
   # Add to .env.local
   RESEND_API_KEY=re_xxxxx
   NEXT_PUBLIC_APP_URL=https://theautodoctorapp.com
   ```

3. **Build & Test**
   ```bash
   pnpm build
   pnpm test
   ```

### Deployment Steps

1. **Phase 1 Deploy** (Week 1)
   - UX improvements only
   - Low risk
   - Monitor for errors

2. **Phase 2 Deploy** (Week 1)
   - Offline mechanics flow
   - Medium risk
   - Test with offline mechanics

3. **Phase 3 Deploy** (Week 2)
   - Waitlist system
   - Email integration
   - Test email delivery

4. **Phase 4-7 Deploy** (Week 3)
   - Scheduling system
   - High risk (new functionality)
   - Gradual rollout (beta users first)
   - Monitor performance

5. **Phase 8-9 Deploy** (Week 4)
   - Dashboard updates
   - Notifications
   - Final polish

### Rollback Plan

If issues occur:
1. Revert to previous deployment
2. Database migrations are backward compatible
3. Existing sessions continue to work
4. New features disabled via feature flags

---

## 📝 SUMMARY & NEXT STEPS

### Your Questions Answered

1. **"How to design the whole system uniformly?"**
   → Use SessionFactory for all sessions (immediate + scheduled), AvailabilityService for all availability checks, one booking wizard with conditional steps

2. **"How to integrate booking wizard with scheduling?"**
   → Add optional TimeSelectionStep, populate `sessions.scheduled_for`, use same SessionFactory with different parameters

3. **"What should the UX be for MechanicStep?"**
   → Location (top) → Tabs (filter) → Search Button (prominent) → Results (below)

4. **"How to handle offline mechanics?"**
   → Show offline mechanics list with favorites first, "Schedule with [Mechanic]" buttons, continue to time selection

5. **"What happens with waitlist?"**
   → Email confirmation + success modal + clear next steps + notification when mechanic online

### Immediate Next Steps

1. **Review this plan** - Does it address all your concerns?
2. **Start with Phase 1** - UX fixes (low risk, high impact)
3. **Create waitlist migration** - Enable email notifications
4. **Plan development timeline** - 4 weeks recommended

### Files to Create (Summary)

**Week 1:**
- `src/components/customer/OfflineMechanicsList.tsx`
- `src/components/customer/WaitlistSuccessModal.tsx`
- `supabase/migrations/20251110_create_customer_waitlist.sql`

**Week 2:**
- `src/lib/availabilityService.ts`
- `src/app/api/mechanics/availability/slots/route.ts`
- `src/app/api/mechanics/availability/check/route.ts`
- `src/components/customer/booking-steps/TimeSelectionStep.tsx`

**Week 3:**
- `src/components/customer/AppointmentConfirmation.tsx`
- `src/lib/emailTemplates/appointmentConfirmation.ts`
- `src/app/customer/appointments/[id]/waiver/page.tsx`

**Week 4:**
- `src/lib/scheduledTasks/appointmentReminders.ts`
- Documentation files

### Files to Modify (Summary)

**Week 1:**
- [src/components/customer/BookingWizard.tsx](src/components/customer/BookingWizard.tsx)
- [src/components/customer/booking-steps/MechanicStep.tsx](src/components/customer/booking-steps/MechanicStep.tsx)
- [src/app/api/customer/waitlist/join/route.ts](src/app/api/customer/waitlist/join/route.ts)

**Week 2:**
- [src/lib/sessionFactory.ts](src/lib/sessionFactory.ts)

**Week 3:**
- [src/app/customer/dashboard/page.tsx](src/app/customer/dashboard/page.tsx)

---

## ✅ CONCLUSION

This plan provides a **unified, single-source-of-truth approach** to integrating the booking wizard with the scheduling system. It maintains backward compatibility while adding powerful new scheduling capabilities.

**Key Principles:**
- 🎯 **One Source of Truth**: SessionFactory → Database → UI
- 🔄 **Two Paths, One System**: Immediate vs Scheduled (same foundation)
- 📱 **Excellent UX**: Manual search, clear flow, helpful feedback
- 🚀 **Incremental Rollout**: Low-risk phases, testable at each step

**Next Action:** Review this plan and let me know if you'd like to start with Phase 1 (UX improvements) or if you have questions about any section.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-10
**Status:** Ready for Review
