# BOOKING WIZARD & SCHEDULING INTEGRATION - SUMMARY & ACTION PLAN

**Date:** 2025-11-10
**Status:** Ready for Implementation
**Decision:** SEPARATE SCHEDULING PAGE ARCHITECTURE ✅

---

## 🎯 KEY DECISIONS MADE

### 1. **Architecture: Separate vs Integrated** ✅

**DECISION: SEPARATE SCHEDULING PAGE**

**Why:**
- Simpler UX - Each system has clear purpose
- Better mobile experience - Calendar needs space
- Easier maintenance - Two simple systems > one complex
- Reusable for both online + in-person
- Clearer mental model for users
- **Score: 9 to 1** in favor of separate

### 2. **"Just Advice" Clarification** ✅

**CORRECTED:** "Just Advice" is NOT free
- Same plan pricing (Standard/Extended/Premium)
- Allows skipping vehicle selection
- Use cases: Pre-purchase inspection, general questions, talking on behalf of someone

### 3. **Wizard State Management** ✅

**DECISION:** Clear state when leaving wizard
- Clear sessionStorage when clicking "Back" from Step 1
- Clear sessionStorage when navigating to dashboard
- Keep state ONLY while actively in wizard
- Steps 1-2: Auto-advance ✅
- Steps 3-4: Manual "Continue" button ✅

### 4. **Payment & Waiver Timing** ✅

| Session Type | Payment | Waiver |
|-------------|---------|--------|
| **Immediate (BookingWizard)** | After waiver | Before payment |
| **Scheduled Online** | At booking (full) | 15 min before session |
| **Scheduled In-Person** | Deposit at booking, balance after | On arrival |

**Cancellation Policy (REVISED FOR FAIRNESS):**
- 24+ hours: Full refund (minus $5 fee)
- 2-24 hours: 75% refund - 25% to mechanic
- <2 hours/no-show: 50% account credit - 50% to mechanic
- **Rationale:** Fair compensation to mechanic for blocked time; industry standard; legally sound when disclosed upfront

### 5. **Offline Mechanics Flow** ✅

**3 Options in BookingWizard:**
1. **Join Waitlist** → Stay on page, email notification
2. **Schedule Instead** → Redirect to SchedulingPage (with context)
3. **Browse Offline** → Expandable list, view-only (NO schedule buttons)

**Rationale:** Since SchedulingPage exists, don't duplicate scheduling UI in wizard

### 6. **Waitlist Placement** ✅

- ✅ BookingWizard MechanicStep (when all offline) - PRIMARY
- ✅ Customer Dashboard (if previously tried) - SECONDARY
- ❌ NOT in SchedulingPage (that's for appointments)

### 7. **Intake Data Capture During Scheduling** ✅

**CONFIRMED:** YES, SchedulingPage captures full intake data (vehicle info, concern details, uploaded files).

**Data Flow:**
```
Step 2 (VehicleStep) → Captures vehicleId, year, make, model, VIN, odometer
Step 6 (ConcernStep) → Captures concern, category, urgency, uploaded files
Step 7 (ReviewAndPaymentStep) → Sends all data to SessionFactory
```

**Integration:** Direct SessionFactory call (NOT `/api/intake/start`):
- Reuses existing VehicleStep and ConcernStep components (NO duplication)
- SessionFactory already supports `scheduled_for` parameter
- All intake data stored before scheduled appointment
- Mechanic gets full context when session starts

---

## 🏗️ SYSTEM ARCHITECTURE OVERVIEW

```
Customer Dashboard
        │
        ├──────────────────┬──────────────────┐
        │                  │                  │
   [Book Now]      [Schedule Later]   [My Appointments]
        │                  │                  │
        ↓                  ↓                  ↓
  BookingWizard      SchedulingPage    AppointmentsPage
  (4 steps)          (7 steps)
        │                  │
        │                  │
  All mechanics        Service type
  offline?             selection
        │                  ↓
        ├─────────────►  Vehicle
        │                  ↓
   Show 3 options:       Plan
   1. Waitlist            ↓
   2. Schedule        Mechanic
      (redirect) ───►     ↓
   3. Browse          Time selection
      (view only)         ↓
                       Concern
                          ↓
                    Review & Payment
                          ↓
                    Confirmation + Email
```

---

## 📊 COMPARISON: TWO SYSTEMS

| Aspect | BookingWizard | SchedulingPage |
|--------|--------------|----------------|
| **Purpose** | Immediate sessions | Future appointments |
| **URL** | `/customer/book-session` | `/customer/schedule` |
| **Steps** | 4 (Vehicle → Plan → Mechanic → Concern) | 7 (Service Type → Vehicle → Plan → Mechanic → Time → Concern → Review) |
| **Mechanics** | Online only | All (online + offline) |
| **Time** | Immediate | Calendar picker |
| **Waiver** | Before session | 15 min before (or on arrival) |
| **Payment** | After waiver | At booking (or deposit) |
| **Session Status** | `pending` → `active` | `scheduled` → `pending` → `active` |
| **Matching** | At creation | 30 min before |
| **Use Case** | "Need help now" | "Plan ahead" OR "All offline" |

**Both use same backend:**
- SessionFactory (single source of truth)
- AvailabilityService (time validation)
- mechanicMatching.ts (scoring algorithm)
- Same database tables

---

## ✅ YOUR QUESTIONS ANSWERED

### Question 1: Just Advice Clarification

**Answer:** ✅ "Just Advice" is NOT free. It follows same plan pricing. Allows skipping vehicle selection for:
- General automotive questions
- Pre-purchase inspections
- Talking on behalf of someone else

**Implementation:** Fix "Skip - Just Advice" button in VehicleStep, allow null vehicleId when `isAdviceOnly = true`

---

### Question 2: UI Layout & State Management

**Answer:** ✅ Recommended layout (top to bottom):
1. **Location** (pre-filled, editable)
2. **Mechanic Type Tabs** (All / Brand Specialist / Favorites)
3. **Search Button** (prominent, manual trigger)
4. **Results** (appears after click)

**State Management:**
- Clear sessionStorage when leaving wizard (clicking "Back" from Step 1 or navigating to dashboard)
- Keep state while actively in wizard
- Steps 1-2: Auto-advance ✅
- Steps 3-4: Manual "Continue" ✅

**BookingGuide Tooltip Update:**
```typescript
{
  icon: "📍",
  text: "Select location, choose mechanic type, then click 'Find Mechanics' to search"
},
{
  icon: "🔍",
  text: "Use the search button to control when mechanics are fetched"
}
```

---

### Question 3: Payment & Waiver - When?

**Answer:** ✅

**Online Scheduled Sessions:**
- Payment: At booking time (full amount)
- Waiver: 15 min before session (email link sent)
- No-show: 25% refund to account

**In-Person Scheduled Visits:**
- Payment: Deposit ($15) at booking, balance after service
- Waiver: On arrival (tablet signature)
- No-show: Deposit forfeited

**Immediate Sessions (BookingWizard):**
- Payment: After waiver, before session
- Waiver: Immediately after concern submission
- No cancellation (session already started)

**Cancellation Policy:**
- 24+ hours: Full refund (minus $5 fee)
- 2-24 hours: 50% refund
- <2 hours: 25% refund

---

### Question 4: Separate Scheduling Page vs Integrated?

**Answer:** ✅ **SEPARATE SCHEDULING PAGE** (recommendation accepted)

**Rationale:**
1. Simpler UX - Each system focused
2. Better mobile - Calendar needs space
3. Easier maintenance - Two simple > one complex
4. Reusable - Handles both online + in-person
5. Clearer mental model - "Book Now" vs "Schedule"
6. Payment flexibility - Different flows

**Integration:**
- Pass context via sessionStorage
- Prevent duplicate bookings with modal
- Both use same SessionFactory + AvailabilityService

---

### Question 5: Offline Mechanics & Scheduling Integration

**Answer:** ✅ **3 Options:**

**Option 1: Join Waitlist**
- Stay on BookingWizard page
- Success modal shows clear next steps
- Email sent with confirmation
- Browser/email notification when mechanic online

**Option 2: Schedule Instead**
- Redirect to SchedulingPage
- Pass context: vehicleId, plan, concern (if entered)
- Pre-fill form on SchedulingPage
- Clear context after loading

**Option 3: Browse Offline**
- Expandable list of offline mechanics
- Show favorites first with ⭐★ icon (prominent)
- "View Profile" button
- "Add to Favorites" button
- NO "Schedule this mechanic" button (would be confusing)
- Tip: "To schedule, use 'Schedule an Appointment' button above"

**Duplicate Booking Prevention (in SchedulingPage):**
```tsx
useEffect(() => {
  // Check for existing appointments on mount
  const { activeAppointments } = await fetch('/api/customer/appointments/active')

  if (activeAppointments.length > 0) {
    // Show modal: "You have an existing appointment"
    // Options: "Modify Existing" or "Book Another"
  }
}, [])
```

---

## 🔧 IMPLEMENTATION PRIORITIES

### Phase 1: BookingWizard UX Fixes (Week 1)

**Priority: HIGH** - Immediate improvements

1. **Fix "Skip - Just Advice" button** (4 hours)
   - Wire up button in VehicleStep
   - Allow null vehicleId when `isAdviceOnly = true`
   - Test flow

2. **Add Manual Search Button** (6 hours)
   - Remove auto-fetch useEffect
   - Add "Find Mechanics" button
   - Show empty state before search
   - Only fetch on button click

3. **Reorganize UI Layout** (4 hours)
   - Location → Tabs → Search Button → Results
   - Update BookingGuide tooltips
   - Test responsive design

4. **Fix State Management** (2 hours)
   - Clear sessionStorage when leaving wizard
   - Keep state only while in wizard
   - Test navigation scenarios

**Total: 16 hours (2 days)**

---

### Phase 2: Offline Flow & Waitlist (Week 1-2)

**Priority: HIGH** - Critical for offline scenarios

1. **Update Offline Notice UI** (4 hours)
   - 3 clear options (Waitlist / Schedule / Browse)
   - Collapsible Browse section
   - Favorites shown first with ⭐★

2. **Waitlist System** (8 hours)
   - Database migration (`customer_waitlist` table)
   - Email integration (Resend API)
   - Success modal with clear next steps
   - API endpoint updates

3. **Context Passing** (4 hours)
   - Save wizard data to sessionStorage
   - Redirect to SchedulingPage
   - Pre-fill form on load
   - Clear context after

**Total: 16 hours (2 days)**

---

### Phase 3: SchedulingPage Foundation (Week 2-3)

**Priority: MEDIUM** - New feature

1. **Create SchedulingPage** (12 hours)
   - New page: `/customer/schedule`
   - Service type selection (Online/In-Person)
   - Vehicle, Plan, Mechanic steps (reuse components)
   - Time selection UI (calendar + slots)
   - Concern step
   - Review & payment

2. **AvailabilityService** (8 hours)
   - `isAvailable()` method
   - `getAvailableSlots()` method
   - Check workshop hours, time off, bookings
   - API endpoints

3. **Duplicate Booking Prevention** (4 hours)
   - Check existing appointments on mount
   - Modal: "Modify Existing" vs "Book Another"
   - Test flow

**Total: 24 hours (3 days)**

---

### Phase 4: Payment & Waiver System (Week 3-4)

**Priority: MEDIUM** - Critical for scheduled sessions

1. **Database Schema** (4 hours)
   - `scheduled_payments` table
   - `waiver_signatures` table
   - Migrations

2. **Stripe Integration** (12 hours)
   - `chargeScheduledSession()` function
   - `refundSession()` function
   - Webhook handlers
   - Test payment flows

3. **Waiver Pages** (8 hours)
   - `/customer/appointments/[id]/waiver`
   - Online mode (signature canvas)
   - In-person mode (tablet)
   - Email reminder 15 min before

4. **No-Show Automation** (6 hours)
   - Database function `handle_no_shows()`
   - Cron job (every 5 min)
   - Refund processing
   - Email notifications

**Total: 30 hours (4 days)**

---

### Phase 5: SessionFactory Integration (Week 4)

**Priority: HIGH** - Single source of truth

1. **Modify SessionFactory** (8 hours)
   - Add `scheduledFor` parameter
   - Add `preferredMechanicId` parameter
   - Handle scheduled vs immediate paths
   - Populate `sessions.scheduled_for` field

2. **Update Booking Wizard** (4 hours)
   - Call SessionFactory with `scheduledFor: null`
   - Test immediate sessions still work

3. **Update SchedulingPage** (4 hours)
   - Call SessionFactory with `scheduledFor: Date`
   - Test scheduled sessions created correctly

**Total: 16 hours (2 days)**

---

## 📅 TIMELINE SUMMARY

| Week | Phase | Focus | Hours | Status |
|------|-------|-------|-------|--------|
| **Week 1** | Phase 1 + 2 | BookingWizard UX + Offline/Waitlist | 32h | Ready to start |
| **Week 2** | Phase 3 | SchedulingPage Foundation | 24h | Depends on Phase 1-2 |
| **Week 3** | Phase 4 | Payment & Waiver System | 30h | Depends on Phase 3 |
| **Week 4** | Phase 5 + Testing | SessionFactory + Integration | 16h + testing | Final integration |
| **TOTAL** | | | **~100 hours** | **3-4 weeks** |

---

## 🚀 IMMEDIATE NEXT STEPS

### Step 1: Get Approval ✅

**You've provided feedback, I've incorporated it. Here's what's decided:**
- ✅ Separate SchedulingPage (not integrated into wizard)
- ✅ Payment at booking for online, deposit for in-person
- ✅ Waiver 15 min before (online) or on arrival (in-person)
- ✅ Offline flow: Waitlist / Schedule / Browse
- ✅ "Just Advice" not free, same pricing

**Do you approve this approach?** If yes, proceed to Step 2.

---

### Step 2: Start Phase 1 (Week 1 - Days 1-2)

**Tasks:**
1. Fix "Skip - Just Advice" button
2. Add manual search button (remove auto-fetch)
3. Reorganize UI layout
4. Fix state management

**Files to modify:**
- `src/components/customer/booking-steps/VehicleStep.tsx`
- `src/components/customer/booking-steps/MechanicStep.tsx`
- `src/components/customer/BookingWizard.tsx`
- `src/components/customer/BookingGuide.tsx`

**Outcome:**
- Better UX in BookingWizard
- No breaking changes
- State properly managed

---

### Step 3: Waitlist System (Week 1 - Days 3-4)

**Tasks:**
1. Create `customer_waitlist` table
2. Integrate Resend email API
3. Update offline notice UI
4. Create success modal

**Files to create:**
- `supabase/migrations/20251110_create_customer_waitlist.sql`
- `src/components/customer/WaitlistSuccessModal.tsx`

**Files to modify:**
- `src/app/api/customer/waitlist/join/route.ts`
- `src/components/customer/booking-steps/MechanicStep.tsx`

**Outcome:**
- Customers know what happens after joining waitlist
- Email confirmation sent
- Clear UI feedback

---

### Step 4: Create SchedulingPage (Week 2)

**Tasks:**
1. Create new page `/customer/schedule`
2. Reuse wizard components
3. Add time selection UI
4. Implement AvailabilityService
5. Test end-to-end

**Files to create:**
- `src/app/customer/schedule/page.tsx`
- `src/components/customer/scheduling/ServiceTypeStep.tsx`
- `src/components/customer/scheduling/TimeSelectionStep.tsx`
- `src/lib/availabilityService.ts`

**Outcome:**
- Functional scheduling system
- Calendar picker works
- Available slots shown correctly

---

## 📝 QUESTIONS FOR YOU

Before I start implementing, please confirm:

1. **Do you approve the separate SchedulingPage architecture?** (vs integrated into wizard)
   - [ ] Yes, separate page ✅ (recommended)
   - [ ] No, integrate into wizard

2. **Payment timing for online scheduled sessions:**
   - [ ] At booking (full amount) ✅ (recommended)
   - [ ] On appointment day

3. **Waiver timing for online scheduled sessions:**
   - [ ] 15 min before session ✅ (recommended)
   - [ ] At booking time
   - [ ] On appointment day (different time)

4. **Offline mechanics - should favorites be shown first?**
   - [ ] Yes, with ⭐★ icon ✅ (recommended)
   - [ ] No, show all alphabetically

5. **Should I start implementing Phase 1 now?**
   - [ ] Yes, start with BookingWizard UX fixes
   - [ ] No, wait for further discussion

---

## 📚 DOCUMENTATION FILES

1. **BOOKING_WIZARD_SCHEDULING_INTEGRATION_PLAN.md** (Main - 1200+ lines)
   - Complete technical specification
   - All sections detailed
   - Code examples included

2. **BOOKING_WIZARD_SCHEDULING_INTEGRATION_SUMMARY.md** (This file)
   - High-level decisions
   - Quick reference
   - Action plan

3. **MATCHING_FLOW_COMPLETE.md** (Previous work)
   - Smart matching system (complete)
   - Priority badges working
   - Database migration applied

---

## ✨ CONCLUSION

We have a **clear, well-architected plan** that:
- ✅ Answers all your questions
- ✅ Provides two simple systems (not one complex)
- ✅ Maintains one source of truth (SessionFactory)
- ✅ Handles both online + in-person appointments
- ✅ Has clear payment and waiver flows
- ✅ Prevents duplicate bookings
- ✅ Provides excellent offline experience

**The plan is READY FOR IMPLEMENTATION.**

**Next step:** Your approval, then I start with Phase 1 (BookingWizard UX fixes - 2 days).

---

**Let me know if you:**
1. Approve the plan as-is
2. Have questions about any section
3. Want me to start implementing Phase 1 now

I'm ready to proceed! 🚀

---

## 🔍 EXISTING SCHEDULE PAGE ASSESSMENT

**File:** `src/app/customer/schedule/page.tsx` + `src/components/customer/ModernSchedulingCalendar.tsx`

### ✅ What Already Exists (Good Foundation):

1. **Calendar UI** ✅
   - Month/date navigation with visual states
   - Time slot selection (9 AM - 8 PM, 30-min intervals)
   - Existing sessions display with conflict warnings
   - Responsive design (mobile-friendly)
   - Beautiful gradient styling matching app theme

2. **Security Features** ✅
   - Active session detection on mount
   - Prevents double booking (redirects to dashboard if active session)
   - Shows "Active Session In Progress" error modal
   - Enforces one-session-per-customer policy

3. **Basic Booking Flow** ✅
   - Select date → Select time → Confirmation modal
   - Redirects to `/intake?plan=X&scheduled_time=ISO`
   - Time conflict validation (shows existing sessions for selected date)

### ❌ What's MISSING (Critical Gaps):

1. **NO Service Type Selection** ❌
   - Current: Assumes online sessions only
   - Needed: Online vs In-Person toggle (Step 1)
   - Impact: Can't differentiate session type for availability

2. **NO Vehicle Selection** ❌
   - Current: No vehicle selection UI
   - Needed: VehicleStep component (Step 2)
   - Impact: Can't pass vehicle data to session creation

3. **NO Plan Selection in UI** ❌
   - Current: Uses `profile.preferred_plan` from database
   - Needed: Interactive PlanStep (Step 3)
   - Impact: User can't change plan during scheduling

4. **NO Mechanic Selection** ❌
   - Current: No mechanic UI at all
   - Needed: SearchableMechanicList with filters (Step 4)
   - Impact: Can't select specific mechanic or filter by brand specialist

5. **NO AvailabilityService Integration** ❌
   - Current: Shows ALL time slots 9 AM - 8 PM blindly
   - Needed: Real-time slot validation against mechanic/workshop availability
   - Impact: User might select unavailable time

6. **NO Concern Collection** ❌
   - Current: Skips concern step entirely
   - Needed: ConcernStep with description + file uploads (Step 6)
   - Impact: Mechanic has no context before appointment

7. **NO Review & Payment** ❌
   - Current: Redirects to `/intake` (unclear what happens)
   - Needed: ReviewStep with Stripe payment integration (Step 7)
   - Impact: Payment not collected at booking time

8. **NO Context Pre-filling** ❌
   - Current: Starts fresh every time
   - Needed: Check sessionStorage for data from BookingWizard
   - Impact: User has to re-enter data if redirected from offline flow

9. **NO SessionFactory Integration** ❌
   - Current: Redirects to `/intake` (old flow)
   - Needed: Direct SessionFactory call with `scheduled_for` populated
   - Impact: `sessions.scheduled_for` field never populated

### 🎯 DECISION: **YES - MODIFY EXISTING PAGE** ✅

**Rationale:**
1. Calendar UI is well-built - don't reinvent the wheel
2. Active session security already implemented correctly
3. Good UX foundation (responsive, accessible, modern)
4. Better to enhance than rebuild from scratch
5. Existing time selection logic is solid

**Modification Strategy:**

#### Phase 1: Convert to Multi-Step Wizard (Keep Calendar as Step 5)

**New Flow (7 Steps):**
```
Step 1: Service Type Selection (Online / In-Person)
Step 2: Vehicle Selection (reuse VehicleStep from BookingWizard)
Step 3: Plan Selection (reuse PlanStep from BookingWizard)
Step 4: Mechanic Selection (NEW: SearchableMechanicList)
Step 5: Time Selection (USE EXISTING ModernSchedulingCalendar)
Step 6: Concern Description (reuse ConcernStep from BookingWizard)
Step 7: Review & Payment (NEW: Stripe integration)
```

#### Phase 2: Integrate AvailabilityService

**Modify Time Slot Rendering:**
```typescript
// In ModernSchedulingCalendar.tsx - BEFORE rendering time slots

const availableSlots = useMemo(async () => {
  if (!selectedDate || !selectedMechanicId) return []

  const slots = await Promise.all(
    TIME_SLOTS.map(async (time) => {
      const [startTime, endTime] = parseTimeSlot(time, selectedDate)

      const { available, reason } = await availabilityService.isAvailable(
        selectedMechanicId,
        startTime,
        endTime,
        sessionType // 'online' or 'in_person' from Step 1
      )

      return { time, available, reason }
    })
  )

  return slots
}, [selectedDate, selectedMechanicId, sessionType])

// In render:
{availableSlots.map(slot => (
  <button
    disabled={!slot.available}
    title={slot.available ? '' : slot.reason}
    className={slot.available ? 'bg-slate-900/50' : 'bg-slate-800/30 cursor-not-allowed opacity-50'}
  >
    {slot.time}
  </button>
))}
```

#### Phase 3: Add Context Pre-filling

**On Page Mount:**
```typescript
useEffect(() => {
  // Check if redirected from BookingWizard offline flow
  const context = sessionStorage.getItem('schedulingContext')
  if (context) {
    const { vehicleId, plan, mechanicId, concern } = JSON.parse(context)

    // Pre-fill wizard data
    setWizardData(prev => ({
      ...prev,
      vehicleId,
      planType: plan,
      preferredMechanicId: mechanicId,
      concernDescription: concern,
    }))

    // Jump to appropriate step
    if (mechanicId) setCurrentStep(5) // Time selection
    else if (plan) setCurrentStep(4) // Mechanic selection

    // Clear context
    sessionStorage.removeItem('schedulingContext')
  }
}, [])
```

#### Phase 4: Replace `/intake` Redirect with SessionFactory

**In proceedToBooking():**
```typescript
const proceedToBooking = async () => {
  try {
    setActionLoading(true)

    // 1. Process payment FIRST (Stripe)
    const paymentIntent = await fetch('/api/payments/charge-scheduled', {
      method: 'POST',
      body: JSON.stringify({
        plan: wizardData.planType,
        sessionType: wizardData.serviceType,
        amount: calculateAmount(wizardData.planType, wizardData.serviceType),
      })
    })

    const { clientSecret } = await paymentIntent.json()
    const { error, paymentIntent: confirmedPayment } = await stripe.confirmPayment({
      clientSecret,
      // ... payment details
    })

    if (error) throw error

    // 2. Create session via SessionFactory
    const response = await fetch('/api/sessions/create', {
      method: 'POST',
      body: JSON.stringify({
        vehicleId: wizardData.vehicleId,
        planType: wizardData.planType,
        mechanicId: wizardData.mechanicId,
        serviceType: wizardData.serviceType,
        scheduledFor: scheduledDateTime, // ⭐ POPULATE THIS
        concern: wizardData.concernDescription,
        paymentIntentId: confirmedPayment.id,
      })
    })

    const { sessionId } = await response.json()

    // 3. Send confirmation email
    await fetch('/api/emails/appointment-confirmation', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    })

    // 4. Redirect to confirmation page
    router.push(`/customer/appointments/${sessionId}/confirmed`)

  } catch (error) {
    console.error('Booking failed:', error)
    alert('Failed to create appointment. Your card was not charged.')
  } finally {
    setActionLoading(false)
  }
}
```

#### Phase 5: Add Wizard State Management

**Similar to BookingWizard:**
```typescript
const [currentStep, setCurrentStep] = useState(1)
const [completedSteps, setCompletedSteps] = useState<number[]>([])
const [wizardData, setWizardData] = useState({
  serviceType: null, // 'online' | 'in_person'
  vehicleId: null,
  planType: null,
  mechanicId: null,
  scheduledFor: null,
  concern: '',
  // ... etc
})

// Progress pills header (similar to BookingWizard)
// Step components (reuse existing + add new ones)
// Navigation footer with Back/Continue buttons
```

### 📊 COMPARISON: Before vs After

| Aspect | Current Schedule Page | Modified Schedule Page |
|--------|----------------------|------------------------|
| **Steps** | 2 (Date → Time) | 7 (Service → Vehicle → Plan → Mechanic → Time → Concern → Review) |
| **Mechanics** | No selection | SearchableMechanicList with filters |
| **Availability** | Shows all slots blindly | AvailabilityService validates slots |
| **Payment** | Unclear (redirects to `/intake`) | Stripe at booking (Step 7) |
| **Vehicle** | Not collected | VehicleStep (Step 2) |
| **Concern** | Not collected | ConcernStep (Step 6) |
| **Context** | No pre-fill | sessionStorage from BookingWizard |
| **Session Creation** | Via `/intake` (old flow) | SessionFactory with `scheduled_for` |
| **Calendar UI** | ✅ Excellent | ✅ Keep as-is (Step 5) |
| **Security** | ✅ Active session check | ✅ Keep as-is |

### 🛠️ FILES TO MODIFY

1. **src/app/customer/schedule/page.tsx**
   - Convert to multi-step wizard
   - Add step navigation header
   - Add wizard state management
   - Remove direct ModernSchedulingCalendar render
   - Add step components rendering

2. **src/components/customer/ModernSchedulingCalendar.tsx**
   - Keep calendar UI as-is ✅
   - Add mechanic availability integration
   - Disable unavailable time slots
   - Accept `selectedMechanicId` and `sessionType` props
   - Remove `/intake` redirect, return selected time to parent

3. **src/components/customer/scheduling/** (NEW DIRECTORY)
   - `ServiceTypeStep.tsx` (Online/In-Person toggle)
   - `SchedulingVehicleStep.tsx` (wrapper around VehicleStep)
   - `SchedulingPlanStep.tsx` (wrapper around PlanStep)
   - `MechanicSelectionStep.tsx` (SearchableMechanicList)
   - `CalendarStep.tsx` (wrapper around ModernSchedulingCalendar)
   - `SchedulingConcernStep.tsx` (wrapper around ConcernStep)
   - `ReviewAndPaymentStep.tsx` (NEW: Stripe payment + review)

4. **src/lib/availabilityService.ts** (NEW)
   - `isAvailable()` method
   - `getAvailableSlots()` method
   - Mechanic type business logic

5. **src/app/api/sessions/create/route.ts** (MODIFY)
   - Accept `scheduledFor` parameter
   - Call SessionFactory with scheduled time
   - Return session ID

6. **src/app/api/payments/charge-scheduled/route.ts** (NEW)
   - Stripe payment for scheduled sessions
   - Calculate amount (online full, in-person deposit)

### ✅ FINAL ANSWER

**YES, we can and SHOULD modify the existing schedule page.**

**Why:**
1. Calendar UI is production-ready - high quality implementation
2. Security features already correct (active session blocking)
3. Responsive design matches app theme
4. Saves ~40% development time vs rebuilding from scratch

**What to Keep:**
- ModernSchedulingCalendar.tsx (calendar + time slot UI)
- Active session security check
- Responsive layout and styling
- Existing sessions conflict warnings

**What to Add:**
- 5 new wizard steps (Service Type, Vehicle, Plan, Mechanic, Concern)
- ReviewAndPaymentStep with Stripe integration
- AvailabilityService for slot validation
- Context pre-filling from BookingWizard
- SessionFactory integration with `scheduled_for`

**Timeline:**
- Phase 1 (Wizard conversion): 12 hours
- Phase 2 (AvailabilityService): 8 hours
- Phase 3 (Context pre-fill): 4 hours
- Phase 4 (Payment integration): 12 hours
- Phase 5 (Testing): 8 hours
- **Total: ~44 hours (1 week)**

This aligns perfectly with our comprehensive plan while leveraging existing high-quality code. 🚀
