# In-Person Visit Scheduling Flow - Audit Report
**Date:** 2025-11-12
**Status:** 🔴 INCOMPLETE - Critical gaps identified

## Executive Summary

The in-person visit scheduling flow **exists but is incomplete**. While the UI properly captures service type selection, **critical business logic for mechanic filtering and workshop validation is missing**.

### Quick Status
- ✅ UI allows in-person vs online selection
- ✅ Pricing differentiation ($15 deposit for in-person)
- ❌ **No mechanic filtering by physical work capability**
- ❌ **No workshop address validation**
- ❌ Balance payment workflow unclear

---

## Critical Issues Found

### 🔴 Issue #1: Virtual-Only Mechanics Appear in In-Person Searches

**Problem:**
The `/api/mechanics/available` endpoint ignores the `sessionType` parameter. Virtual-only mechanics appear when users search for in-person visits.

**Impact:**
- Users can select mechanics who cannot perform physical work
- Booking fails or creates confusion
- Poor user experience

**Location:**
`src/app/api/mechanics/available/route.ts` - Lines 12-268

**Current Code:**
```typescript
// SearchableMechanicList passes sessionType:
const params = new URLSearchParams({ sessionType: sessionType })

// But API ignores it - NO filtering by mechanic_type or can_perform_physical_work
```

**Required Fix:**
```typescript
// Add after line 27:
const sessionType = searchParams.get('sessionType') as 'online' | 'in_person' | null

// Add after line 63:
if (sessionType === 'in_person') {
  query = query.neq('mechanic_type', 'virtual_only')
  query = query.not('workshop_id', 'is', null) // Require workshop
}
```

---

### 🔴 Issue #2: No Workshop Address Validation

**Problem:**
System doesn't validate that selected mechanic has a workshop address for in-person bookings.

**Impact:**
- Users can book in-person visits with mechanics who have no physical location
- No address confirmation before payment
- User arrives at non-existent location

**Location:**
- `src/components/customer/scheduling/ReviewAndPaymentStep.tsx`
- `src/components/customer/scheduling/SearchableMechanicList.tsx`

**Current State:**
Workshop address IS displayed in mechanic cards (Lines 467-477 of SearchableMechanicList), but:
- Not shown in review/payment step
- Not validated before booking
- No Google Maps link
- No directions

**Required Fix:**
Add workshop address validation and prominent display in review step with map link.

---

### 🟡 Issue #3: Inconsistent Session Type Mapping

**Problem:**
When user selects "in-person", it's mapped to session type `'diagnostic'` instead of a clear physical visit type.

**Location:**
`src/app/api/sessions/create-scheduled/route.ts` - Line 115

**Current Code:**
```typescript
type: sessionType === 'online' ? 'video' : 'diagnostic',
```

**Impact:**
- Confusion between online diagnostics and in-person visits
- Session type doesn't clearly indicate physical service
- May cause issues in reporting/analytics

**Consideration:**
Is `'diagnostic'` the correct type for in-person, or should it be `'physical'` or `'workshop_visit'`?

---

### 🟡 Issue #4: No Address Confirmation Step

**Problem:**
User never explicitly confirms the workshop address before booking.

**Impact:**
- User may not notice where they need to go
- No opportunity to verify location is convenient
- Potential no-shows or cancellations

**Missing Elements:**
- Workshop address in review step
- Distance from customer location
- Google Maps integration
- Operating hours display

---

### 🟢 Issue #5: Deposit Amount Hardcoded

**Problem:**
$15 deposit for in-person visits is hardcoded in `ReviewAndPaymentStep.tsx`

**Location:** Line 141
```typescript
return 15 // $15 deposit - HARDCODED
```

**Impact:**
- Cannot adjust deposit per service type
- Cannot vary by mechanic or plan
- Inflexible pricing

**Recommendation:**
Move to configuration file or database setting.

---

## Data Flow Analysis

### Complete User Journey

1. **Service Type Selection** → `sessionType: 'in_person'` ✅
2. **Vehicle Selection** → `vehicleId`, `vehicleData` ✅
3. **Plan Selection** → `planType`, `planPrice` ✅
4. **Mechanic Search** → Shows ALL mechanics ❌ (should filter)
5. **Mechanic Selection** → Workshop address shown but not validated ⚠️
6. **Calendar/Time** → `scheduledFor` ✅
7. **Concern/Intake** → Service details ✅
8. **Review & Payment** → No workshop address ❌, $15 deposit ✅
9. **Session Creation** → Type mapped to 'diagnostic' ⚠️
10. **Email Confirmation** → Includes workshop info ✅

### Wizard Data Structure

```typescript
wizardData = {
  sessionType: 'in_person',           // ✅ Captured
  vehicleId: '...',                   // ✅ Captured
  planType: 'premium',                // ✅ Captured
  planPrice: 29.99,                   // ✅ Captured
  mechanicId: '...',                  // ✅ Captured
  mechanicName: 'Alex Thompson',      // ✅ Captured

  // MISSING for in-person:
  mechanicType: null,                 // ❌ Not captured
  workshopName: null,                 // ❌ Not captured
  workshopAddress: null,              // ❌ Not captured
  workshopDistance: null,             // ❌ Not captured

  scheduledFor: '2025-11-15T10:00',  // ✅ Captured
  serviceType: 'repair',              // ✅ Captured
  serviceDescription: '...',          // ✅ Captured
}
```

---

## Files Involved

### Frontend Components
1. `src/components/customer/scheduling/ServiceTypeStep.tsx` - ✅ Working
2. `src/components/customer/scheduling/SearchableMechanicList.tsx` - ⚠️ Needs validation
3. `src/components/customer/scheduling/ReviewAndPaymentStep.tsx` - ❌ Missing address
4. `src/app/customer/schedule/SchedulingWizard.tsx` - ⚠️ Missing workshop data

### Backend APIs
1. `src/app/api/mechanics/available/route.ts` - ❌ **CRITICAL** No filtering
2. `src/app/api/sessions/create-scheduled/route.ts` - ⚠️ Type mapping inconsistent
3. `src/lib/availabilityService.ts` - ✅ Respects mechanic types (but not called for filtering)

### Supporting Files
1. `src/types/mechanic.ts` - ✅ `canPerformPhysicalWork()` exists but unused
2. `src/config/featureFlags.ts` - Could add in-person feature flag

---

## Recommended Implementation Priority

### Phase 1: Critical Fixes (High Priority)
1. **Add sessionType filtering to mechanics API**
   - File: `src/app/api/mechanics/available/route.ts`
   - Filter out virtual-only mechanics for in-person
   - Require workshop_id for in-person bookings
   - Return workshop address in response

2. **Add workshop validation in mechanic selection**
   - File: `src/components/customer/scheduling/SearchableMechanicList.tsx`
   - Validate mechanic has workshop before allowing selection
   - Show clear error if incompatible

3. **Add workshop address to review step**
   - File: `src/components/customer/scheduling/ReviewAndPaymentStep.tsx`
   - Display full workshop address prominently
   - Add Google Maps link
   - Confirm user understands visit location

### Phase 2: UX Improvements (Medium Priority)
4. **Add workshop data to wizard state**
   - File: `src/app/customer/schedule/SchedulingWizard.tsx`
   - Capture `workshopName`, `workshopAddress`
   - Pass to session creation API

5. **Move deposit to configuration**
   - Create `src/config/pricing.ts`
   - Make deposit amount configurable

6. **Add distance calculation**
   - Show distance from customer location to workshop
   - Help user choose convenient mechanic

### Phase 3: Polish (Low Priority)
7. **Add workshop operating hours**
   - Display in mechanic card and calendar
   - Prevent booking outside hours

8. **Clarify balance payment workflow**
   - Document how remaining balance is collected
   - Add UI for post-service payment

9. **Consider mobile service support**
   - Flag for mechanics who come to customer
   - Address collection for mobile visits

---

## Code Snippets for Fixes

### Fix #1: API Filtering
```typescript
// src/app/api/mechanics/available/route.ts
// Add after line 27:
const sessionType = searchParams.get('sessionType') as 'online' | 'in_person' | null

// Add after line 63:
if (sessionType === 'in_person') {
  query = query
    .neq('mechanic_type', 'virtual_only')
    .not('workshop_id', 'is', null)
}

// Update select to include workshop address (line 32):
.select(`
  id, user_id, name, email,
  rating, years_of_experience,
  currently_on_shift, last_clock_in,
  is_brand_specialist, brand_specializations,
  service_keywords, country, city, postal_code,
  completed_sessions, red_seal_certified,
  profile_completion_score, certification_expiry_date,
  account_status, suspended_until,
  workshop_id, shop_affiliation,
  mechanic_type,
  organizations:workshop_id (
    id, name,
    address_line1, city, state_province, postal_code
  )
`)
```

### Fix #2: Workshop Validation
```typescript
// src/components/customer/scheduling/SearchableMechanicList.tsx
// Add in handleSelectMechanic:
if (sessionType === 'in_person') {
  if (selectedMechanic.mechanic_type === 'virtual_only') {
    setError('This mechanic only offers online diagnostics.')
    return
  }

  if (!selectedMechanic.workshop?.address_line1) {
    setError('This mechanic has no workshop address on file.')
    return
  }
}
```

### Fix #3: Workshop Display in Review
```typescript
// src/components/customer/scheduling/ReviewAndPaymentStep.tsx
// Add after vehicle section:
{wizardData.sessionType === 'in_person' && (
  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
    <div className="flex items-start gap-3">
      <MapPin className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-sm font-medium text-amber-200">Service Location</div>
        <div className="text-white font-semibold mt-1">{wizardData.workshopName}</div>
        <div className="text-sm text-slate-300 mt-1">
          {wizardData.workshopAddress?.address}<br/>
          {wizardData.workshopAddress?.city}, {wizardData.workshopAddress?.province} {wizardData.workshopAddress?.postal}
        </div>
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(
            `${wizardData.workshopAddress?.address}, ${wizardData.workshopAddress?.city}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-amber-400 hover:underline mt-2 inline-flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" />
          Get Directions
        </a>
      </div>
    </div>
  </div>
)}
```

---

## Testing Checklist

Before considering in-person flow complete, verify:

- [ ] Virtual-only mechanics do NOT appear in in-person searches
- [ ] Workshop-affiliated mechanics DO appear in in-person searches
- [ ] Independent workshop mechanics DO appear in in-person searches
- [ ] Mechanic card shows workshop address for in-person bookings
- [ ] Cannot select mechanic without workshop for in-person
- [ ] Workshop address displays in review/payment step
- [ ] Google Maps link opens correct location
- [ ] $15 deposit amount displays for in-person
- [ ] Balance due message shows correctly ($planPrice - $15)
- [ ] Session created with payment_status: 'deposit_paid'
- [ ] Session type set appropriately (currently 'diagnostic')
- [ ] Confirmation email includes workshop name and address
- [ ] Calendar respects mechanic availability for in-person
- [ ] User can complete full in-person booking flow
- [ ] Post-service balance payment workflow documented

---

## Conclusion

The in-person visit flow has good UI/UX foundation but **critical backend filtering and validation is missing**. The main risk is users booking with mechanics who cannot perform the requested service.

**Immediate Priority:**
Fix mechanic filtering in `/api/mechanics/available` to prevent virtual-only mechanics from appearing in in-person searches.

**Secondary Priority:**
Add workshop address validation and prominent display throughout the booking flow.

The fixes are straightforward and can be implemented in 2-4 hours of development time.

---

**Audit completed:** 2025-11-12
**Next steps:** Implement Phase 1 critical fixes
