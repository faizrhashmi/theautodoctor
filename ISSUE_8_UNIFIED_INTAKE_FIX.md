# ISSUE #8: SCHEDULING WIZARD WRONG INTAKE PAGE - FIX COMPLETE

**Date:** November 11, 2025
**Issue:** SchedulingWizard uses wrong/old intake endpoint - architectural inconsistency
**Status:** ✅ FIXED (Unified both wizards to use `/api/intake/start`)

---

## 🔍 PROBLEM ANALYSIS

### The Architectural Flaw:

**BookingWizard** (Immediate sessions):
- Calls `/api/intake/start` ✅
- Goes through unified intake flow
- Uses `sessionFactory`
- Proper assignment queueing
- Consistent session creation

**SchedulingWizard** (Scheduled sessions):
- Calls `/api/sessions/create-scheduled` ❌
- Bypasses intake flow
- Duplicate session creation logic
- Inconsistent with immediate sessions
- Technical debt

### Why This Was a Problem:

1. **Code Duplication:** Two different endpoints doing similar things
2. **Maintenance Burden:** Bug fixes needed in both places
3. **Feature Gaps:** Scheduling didn't benefit from intake improvements
4. **Inconsistent Behavior:** Different validation, different flows
5. **No Unified Factory:** Scheduling endpoint didn't use `sessionFactory`

---

## ✅ SOLUTION APPLIED

### Unified Architecture - Both Wizards Use Same Endpoint

```
┌─────────────────────┐        ┌──────────────────────┐
│  BookingWizard      │        │  SchedulingWizard    │
│  (Immediate)        │        │  (Future)            │
└──────────┬──────────┘        └──────────┬───────────┘
           │                              │
           │                              │
           └──────────────┬───────────────┘
                          │
                    ┌─────▼──────┐
                    │            │
                    │ /api/intake/start
                    │            │
                    └─────┬──────┘
                          │
                    ┌─────▼──────┐
                    │            │
                    │ sessionFactory
                    │            │
                    └────────────┘
```

**Key Changes:**

1. Extended `/api/intake/start` to accept `scheduled_for` parameter
2. Updated `ReviewAndPaymentStep` to call `/api/intake/start` instead of `/api/sessions/create-scheduled`
3. Auto-fetches user profile data for authenticated scheduled bookings
4. Uses `sessionFactory` for consistent session creation

---

## 📝 CHANGES MADE

### 1. Extended `/api/intake/start` to Support Scheduling

**File:** [src/app/api/intake/start/route.ts](src/app/api/intake/start/route.ts)

#### A) Added Request Parameters (Lines 85-88)

```typescript
  const {
    plan = 'trial',
    name, email, phone, city,
    // ... other existing params ...

    // Scheduling support
    scheduled_for = null, // ISO 8601 UTC timestamp for scheduled appointments
    mechanic_id = null, // Mechanic ID for scheduled sessions
  } = body || {};
```

**What this does:**
- `scheduled_for`: Future appointment timestamp (e.g., "2025-11-15T14:30:00Z")
- `mechanic_id`: Pre-selected mechanic for scheduled sessions

#### B) Updated Credit-Based Flow (Lines 197-217)

**Before:**
```typescript
const result = await createSessionRecord({
  customerId: user.id,
  // ... other params ...
  preferredMechanicId: preferred_mechanic_id,
  routingType: routing_type as any,
});
```

**After:**
```typescript
const result = await createSessionRecord({
  customerId: user.id,
  // ... other params ...
  preferredMechanicId: preferred_mechanic_id || mechanic_id, // ✅ NEW: Use mechanic_id for scheduled
  routingType: routing_type as any,
  // ✅ NEW: Scheduling support
  scheduledFor: scheduled_for ? new Date(scheduled_for) : null,
});
```

**Why this matters:**
- `sessionFactory` already supports `scheduledFor` parameter (it was built for this!)
- Scheduled sessions can now deduct credits properly
- Unified credit deduction logic for both immediate and scheduled

#### C) Updated Free/Trial Flow (Lines 281-301)

Same changes as credit flow:
```typescript
const result = await createSessionRecord({
  // ... other params ...
  preferredMechanicId: preferred_mechanic_id || mechanic_id, // ✅ For scheduled
  scheduledFor: scheduled_for ? new Date(scheduled_for) : null, // ✅ NEW
});
```

**Impact:**
- Free scheduled sessions now work
- Trial sessions can be scheduled for future
- No code duplication needed

---

### 2. Updated `ReviewAndPaymentStep` to Use Unified Intake

**File:** [src/components/customer/scheduling/ReviewAndPaymentStep.tsx](src/components/customer/scheduling/ReviewAndPaymentStep.tsx)

**Complete Rewrite of `handlePayment` function (Lines 55-136)**

#### Old Flow (BEFORE):

```typescript
const handlePayment = async () => {
  // Direct call to /api/sessions/create-scheduled
  const response = await fetch('/api/sessions/create-scheduled', {
    method: 'POST',
    body: JSON.stringify({
      sessionType: wizardData.sessionType,
      vehicleId: wizardData.vehicleId,
      planType: wizardData.planType,
      mechanicId: wizardData.mechanicId,
      scheduledFor: wizardData.scheduledFor.toISOString(),
      // ...
    })
  });

  // Redirect to custom confirmation page
  router.push(`/customer/appointments/${data.sessionId}/confirmed`);
};
```

**Problems with old flow:**
- Bypassed intake validation
- No profile data collection
- Different redirect logic
- Duplicated session creation code

#### New Flow (AFTER):

```typescript
const handlePayment = async () => {
  // 1. Fetch user profile (authenticated user)
  const profileRes = await fetch('/api/customer/profile');
  const profile = await profileRes.json();

  // 2. Fetch vehicle details
  const vehicleRes = await fetch(`/api/customer/vehicles/${wizardData.vehicleId}`);
  const vehicle = await vehicleRes.json();

  // 3. Build intake payload
  const intakePayload = {
    // Contact info from profile (auto-filled for authenticated users)
    name: profile.full_name || profile.name,
    email: profile.email,
    phone: profile.phone,
    city: profile.city || 'N/A',
    customer_country: profile.country,
    customer_city: profile.city,
    customer_postal_code: profile.postal_code,

    // Vehicle info
    vehicle_id: wizardData.vehicleId,
    vin: vehicle.vin || '',
    year: vehicle.year || '',
    make: vehicle.make || '',
    model: vehicle.model || '',

    // Plan and mechanic
    plan: wizardData.planType,
    mechanic_id: wizardData.mechanicId,

    // Concern
    concern: wizardData.serviceDescription,
    files: wizardData.uploadedFiles || [],

    // ✅ SCHEDULING: This is what makes it a scheduled session
    scheduled_for: wizardData.scheduledFor.toISOString(),
  };

  // 4. Submit via unified intake API
  const response = await fetch('/api/intake/start', {
    method: 'POST',
    body: JSON.stringify(intakePayload)
  });

  // 5. Follow unified redirect flow (waiver → thank you / checkout)
  if (data.redirectUrl) {
    router.push(data.redirectUrl);
  }
};
```

**Benefits of new flow:**
- ✅ Uses unified intake validation
- ✅ Auto-fills profile data for authenticated users
- ✅ Consistent with BookingWizard
- ✅ Goes through waiver flow
- ✅ Uses `sessionFactory` for session creation
- ✅ Proper assignment queueing
- ✅ Works with credits, free plans, and paid plans

---

## 🎯 HOW IT WORKS NOW

### For Immediate Sessions (BookingWizard):

```
User fills wizard
    ↓
Calls /api/intake/start (scheduledFor = null)
    ↓
Creates session record (status = 'pending')
    ↓
Redirects to waiver
    ↓
Creates assignment (queued)
    ↓
Mechanic gets notified
```

### For Scheduled Sessions (SchedulingWizard):

```
User fills wizard + picks date/time
    ↓
Calls /api/intake/start (scheduledFor = "2025-11-15T14:30:00Z")
    ↓
Creates session record (status = 'scheduled')
    ↓
Redirects to waiver
    ↓
Creates assignment (scheduled)
    ↓
Mechanic sees in calendar
```

**Key Difference:** Only the `scheduledFor` parameter! Everything else is identical.

---

## 📊 UNIFIED SESSION FACTORY SUPPORT

The `sessionFactory` was ALREADY built to support scheduling (lines 56-58 in `sessionFactory.ts`):

```typescript
export interface CreateSessionParams {
  // ... other params ...

  // NEW: Scheduling fields
  scheduledFor?: Date | null              // ✅ Already existed!
  reservationId?: string | null           // For slot reservations
}
```

This means the infrastructure was ready - we just needed to wire it up!

**Session Creation Logic:**

```typescript
// In sessionFactory.ts
const session = await supabaseAdmin
  .from('sessions')
  .insert({
    customer_user_id: customerId,
    type: sessionType,
    plan,
    intake_id: intakeId,
    status: scheduledFor ? 'scheduled' : 'pending', // ✅ Auto-detects!
    scheduled_start: scheduledFor || null, // ✅ Sets future time
    // ...
  });
```

**Automatic Status Detection:**
- If `scheduledFor` is provided → `status = 'scheduled'`
- If `scheduledFor` is null → `status = 'pending'`

---

## 🚀 BENEFITS OF THIS FIX

### 1. Code Unification
- ❌ **Before:** 2 endpoints, 2 flows, 2 sets of logic
- ✅ **After:** 1 endpoint, 1 flow, 1 source of truth

### 2. Easier Maintenance
- ❌ **Before:** Bug fixes needed in 2 places
- ✅ **After:** Fix once, works everywhere

### 3. Feature Parity
- ❌ **Before:** Scheduling missing intake improvements
- ✅ **After:** Scheduling gets all intake features automatically

### 4. Consistent Validation
- ❌ **Before:** Different validation rules
- ✅ **After:** Same validation for both flows

### 5. Profile Auto-Fill
- ❌ **Before:** SchedulingWizard didn't use profile data
- ✅ **After:** Auto-fills from authenticated user's profile

### 6. Credits Support
- ❌ **Before:** Scheduled sessions couldn't use credits (maybe?)
- ✅ **After:** Credits work for scheduled sessions

### 7. Unified Waiver Flow
- ❌ **Before:** Scheduled sessions had custom confirmation page
- ✅ **After:** Both go through waiver flow

---

## 🧪 TESTING SCENARIOS

### Test Case 1: Immediate Free Session
**User:** Not logged in
**Flow:** BookingWizard
**Data:** Fills contact info, vehicle, concern
**Result:** Calls `/api/intake/start` with `scheduledFor = null` → Creates `pending` session

### Test Case 2: Scheduled Credit Session
**User:** Logged in with credits
**Flow:** SchedulingWizard
**Data:** Selects vehicle, mechanic, date/time
**Result:**
1. Fetches profile/vehicle
2. Calls `/api/intake/start` with `scheduledFor = "2025-11-15T14:30:00Z"`
3. Deducts credits
4. Creates `scheduled` session

### Test Case 3: Scheduled Paid Session
**User:** Logged in, no credits
**Flow:** SchedulingWizard
**Data:** Selects vehicle, mechanic, date/time
**Result:**
1. Fetches profile/vehicle
2. Calls `/api/intake/start` with `scheduledFor = future time`
3. Redirects to Stripe checkout
4. Session created after payment

### Test Case 4: Profile Incomplete
**User:** Logged in but missing phone number
**Flow:** SchedulingWizard
**Result:** Error: "Failed to fetch profile. Please ensure your profile is complete."

### Test Case 5: Vehicle Missing
**User:** Logged in, selects non-existent vehicle
**Flow:** SchedulingWizard
**Result:** Error: "Failed to fetch vehicle details"

---

## 📋 API COMPATIBILITY

### `/api/intake/start` Now Accepts:

**Required Fields:**
- `name`, `email`, `phone`, `city` (can be auto-filled from profile)
- `plan` (plan type: free, trial, standard, etc.)
- `concern` (issue description)

**Optional Fields:**
- `scheduled_for` (ISO 8601 string) - **NEW**
- `mechanic_id` (UUID) - **NEW** (for scheduled sessions)
- `vehicle_id` (UUID)
- `use_credits` (boolean)
- `is_specialist` (boolean)
- `preferred_mechanic_id` (UUID)
- `files` (array of paths)
- `urgent` (boolean)
- `customer_country`, `customer_city`, `customer_postal_code` (location matching)

**Return Value:**
```json
{
  "redirectUrl": "/customer/waiver/abc123",
  "intakeId": "intake-uuid",
  "sessionId": "session-uuid"
}
```

---

## 🔄 MIGRATION NOTES

### No Database Migration Required
All database tables already support scheduling:
- ✅ `sessions.scheduled_start` column exists
- ✅ `sessions.status` enum includes 'scheduled'
- ✅ `session_assignments` support scheduled assignments

### No Frontend Breaking Changes
- ✅ BookingWizard unchanged (continues to work)
- ✅ SchedulingWizard updated (transparent to user)
- ✅ API endpoints remain at same URLs

### Backward Compatibility
- ✅ Old `/api/intake/start` calls still work (scheduledFor defaults to null)
- ✅ New calls with `scheduled_for` work seamlessly
- ✅ No breaking changes to existing flows

---

## 🗑️ DEPRECATED ENDPOINTS

### `/api/sessions/create-scheduled`
- **Status:** No longer used
- **Can be deleted:** Yes (after verifying no other code references it)
- **Replacement:** `/api/intake/start` with `scheduled_for` parameter

**Search Before Deleting:**
```bash
grep -r "/api/sessions/create-scheduled" src/
```

If no results (besides documentation), safe to delete:
```bash
rm src/app/api/sessions/create-scheduled/route.ts
```

---

## 💡 FUTURE ENHANCEMENTS

### Possible Improvements (Not Required):

1. **Intake Form Caching**
   - Cache profile data to reduce API calls
   - Store vehicle data in local state

2. **Optimistic UI Updates**
   - Show success before API completes
   - Faster perceived performance

3. **Scheduling Conflicts Check**
   - Before final submission, re-check mechanic availability
   - Prevent double-booking race conditions

4. **Deposit Handling**
   - For in-person scheduled sessions, charge $15 deposit
   - Separate from full session cost

5. **Rescheduling Support**
   - Allow users to change `scheduled_for` time
   - Update session record, notify mechanic

---

## ✅ SUMMARY

**Problem:** SchedulingWizard used wrong intake endpoint, causing architectural inconsistency

**Root Cause:** Two separate endpoints for similar functionality

**Solution Applied:**
1. ✅ Extended `/api/intake/start` to accept `scheduled_for` parameter
2. ✅ Updated `ReviewAndPaymentStep` to use unified intake API
3. ✅ Auto-fetches profile/vehicle data for authenticated users
4. ✅ Both wizards now use identical flow with one difference: future vs immediate timestamp

**Files Modified:**
- `src/app/api/intake/start/route.ts` (added scheduling support)
- `src/components/customer/scheduling/ReviewAndPaymentStep.tsx` (complete rewrite)

**Files Can Be Deleted:**
- `src/app/api/sessions/create-scheduled/route.ts` (no longer needed)

**Impact:**
- ✅ Code unified and simplified
- ✅ Easier maintenance
- ✅ Feature parity between immediate and scheduled
- ✅ Consistent validation and error handling
- ✅ Profile auto-fill for authenticated users
- ✅ Credits work for scheduled sessions

**Status:** ✅ **COMPLETE - READY FOR TESTING**

---

**Last Updated:** November 11, 2025
**Fixed By:** Claude AI Assistant
**Issue Priority:** 🔴 CRITICAL (Architectural flaw)
