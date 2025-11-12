# Phase 1 In-Person Scheduling - Verification Checklist
**Date:** 2025-11-12
**Status:** Implementation Complete - Ready for Testing

## Implementation Summary

### ✅ Completed Changes

1. **Mechanics API Filtering** ([src/app/api/mechanics/available/route.ts](src/app/api/mechanics/available/route.ts#L27-L79))
   - Added `sessionType` parameter extraction
   - Added filter: `neq('mechanic_type', 'virtual_only')` for in-person
   - Added requirement: `not('workshop_id', 'is', null)` for in-person
   - Extended query to include full workshop address from organizations table

2. **Workshop Address in API Response** ([src/app/api/mechanics/available/route.ts](src/app/api/mechanics/available/route.ts#L256-L265))
   - Added `mechanicType`, `canPerformPhysicalWork`, `workshopId` fields
   - Added `workshopAddress` object with full address details
   - Mapped from joined `organizations` table data

3. **Mechanic Selection Validation** ([src/components/customer/scheduling/SearchableMechanicList.tsx](src/components/customer/scheduling/SearchableMechanicList.tsx#L165-L198))
   - Validates mechanic is not virtual-only for in-person bookings
   - Validates mechanic has workshop address for in-person bookings
   - Shows user-friendly alert messages if validation fails
   - Captures and passes workshop data to wizard

4. **Wizard Data Structure** ([src/app/customer/schedule/SchedulingWizard.tsx](src/app/customer/schedule/SchedulingWizard.tsx#L52-L54))
   - Added `mechanicType` field
   - Added `workshopName` field
   - Added `workshopAddress` object

5. **Review Step Workshop Display** ([src/components/customer/scheduling/ReviewAndPaymentStep.tsx](src/components/customer/scheduling/ReviewAndPaymentStep.tsx#L210-L238))
   - Added prominent amber-highlighted workshop address section
   - Added MapPin icon for visual clarity
   - Shows full address with proper formatting
   - Added FREE Google Maps directions link
   - Only displays for in-person sessions

6. **TypeScript Interface Updates** ([src/components/customer/scheduling/ReviewAndPaymentStep.tsx](src/components/customer/scheduling/ReviewAndPaymentStep.tsx#L28-L36))
   - Added `workshopName?: string` to interface
   - Added `workshopAddress` object type definition
   - Fixed field reference from `concernDescription` to `serviceDescription`

---

## Testing Checklist

### 🧪 Test 1: In-Person Mechanic Filtering
**Objective:** Verify only in-person capable mechanics appear in search results

**Steps:**
1. Navigate to `/customer/schedule`
2. Select "In-Person Visit" as session type
3. Proceed through vehicle selection
4. Reach mechanic selection step

**Expected Results:**
- ✅ Only mechanics with workshop addresses should appear
- ✅ Virtual-only mechanics should NOT appear
- ✅ All displayed mechanics should have physical location capability

**Verification:**
Check network tab: GET `/api/mechanics/available?sessionType=in_person`
- Response should only include mechanics with `workshopAddress` populated
- Response should NOT include mechanics with `mechanicType: 'virtual_only'`

---

### 🧪 Test 2: Mechanic Selection Validation
**Objective:** Verify validation prevents incompatible selections

**Steps:**
1. Follow Test 1 steps to reach mechanic selection
2. If any virtual-only mechanics appear (shouldn't happen), try to select one
3. If any mechanics without addresses appear (shouldn't happen), try to select one

**Expected Results:**
- ✅ Alert shown: "This mechanic only offers online diagnostics"
- ✅ Alert shown: "This mechanic has no workshop address on file"
- ✅ Selection blocked, cannot proceed to next step

**Note:** This is a safety net validation - API filtering should prevent these mechanics from appearing at all.

---

### 🧪 Test 3: Workshop Data Capture
**Objective:** Verify workshop information is captured during selection

**Steps:**
1. Follow Test 1 steps
2. Select an in-person capable mechanic
3. Open browser DevTools → Console
4. Check for `wizardData` updates

**Expected Results:**
- ✅ `workshopName` should be populated
- ✅ `workshopAddress` object should contain:
  - `address`: Street address
  - `city`: City name
  - `province`: Province/state
  - `postal`: Postal code
  - `country`: Country (optional)

---

### 🧪 Test 4: Workshop Display in Review Step
**Objective:** Verify workshop address displays correctly before payment

**Steps:**
1. Complete booking flow to review/payment step
2. Scroll to find workshop address section

**Expected Results:**
- ✅ Amber-highlighted box displays with MapPin icon
- ✅ "Service Location" label shown
- ✅ Workshop name displayed prominently
- ✅ Full address formatted correctly:
  ```
  [Workshop Name]
  [Address Line 1]
  [City], [Province] [Postal Code]
  [Country]
  ```
- ✅ "Get Directions" link visible with ExternalLink icon

---

### 🧪 Test 5: Google Maps Directions Link
**Objective:** Verify FREE Google Maps integration works

**Steps:**
1. Reach review step with workshop address displayed
2. Click "Get Directions" link

**Expected Results:**
- ✅ Opens in new tab (`target="_blank"`)
- ✅ Opens Google Maps with workshop location pre-filled
- ✅ URL format: `https://maps.google.com/?q=[encoded address]`
- ✅ Google Maps shows correct location
- ✅ No API key required (FREE forever)

**Verification URL Pattern:**
```
https://maps.google.com/?q=123+Main+St%2C+Toronto%2C+Ontario
```

---

### 🧪 Test 6: Deposit Amount Display
**Objective:** Verify correct deposit amount for in-person bookings

**Steps:**
1. View review/payment step for in-person booking

**Expected Results:**
- ✅ "Deposit (Due Now)" label displayed
- ✅ Amount shows: **$15**
- ✅ Balance message: "Balance of $[planPrice - 15] due after service"
- ✅ Confirm button: "Confirm & Pay $15"

**Note:** Full payment workflow is Phase 2 (not yet implemented).

---

### 🧪 Test 7: Online vs In-Person Comparison
**Objective:** Verify different behavior between session types

**Test 7A - In-Person Booking:**
- ✅ Workshop mechanics shown
- ✅ Workshop address displayed in review
- ✅ Google Maps link present
- ✅ Deposit: $15 due now
- ✅ Balance due after service

**Test 7B - Online Booking:**
- ✅ All mechanics shown (including virtual-only)
- ✅ NO workshop address section
- ✅ NO Google Maps link
- ✅ Full amount due now (no deposit/balance split)

---

### 🧪 Test 8: Edge Cases

**Test 8A - Mechanic with No Workshop:**
1. Attempt to book in-person with mechanic missing workshop
2. Expected: Should not appear in search results

**Test 8B - Virtual-Only Mechanic:**
1. Attempt to book in-person with virtual-only mechanic
2. Expected: Should not appear in search results

**Test 8C - Incomplete Address:**
1. Mechanic has workshop_id but organizations table missing data
2. Expected: workshopAddress should be null, validation should block

**Test 8D - Missing sessionType Parameter:**
1. API called without `sessionType` parameter
2. Expected: Returns all mechanics (no filtering)

---

## API Response Validation

### Sample Expected Response (In-Person)

```json
{
  "mechanics": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "Alex Thompson",
      "mechanicType": "independent_workshop",
      "canPerformPhysicalWork": true,
      "workshopId": "uuid",
      "workshopName": "Thompson Auto Care",
      "workshopAddress": {
        "address": "123 Main Street",
        "city": "Toronto",
        "province": "Ontario",
        "postal": "M5V 1A1",
        "country": "Canada"
      },
      "rating": 4.8,
      "yearsExperience": 10,
      "isAvailable": true
    }
  ]
}
```

### Invalid Response (Should NOT Appear for In-Person)

```json
{
  "mechanics": [
    {
      "mechanicType": "virtual_only",  // ❌ SHOULD BE FILTERED OUT
      "workshopAddress": null           // ❌ SHOULD BE FILTERED OUT
    }
  ]
}
```

---

## Browser Console Tests

### Test Console Logging

Open browser DevTools and run:

```javascript
// Check wizard data structure
console.log(wizardData)

// Should contain (for in-person):
{
  sessionType: 'in_person',
  mechanicId: '...',
  mechanicName: 'Alex Thompson',
  workshopName: 'Thompson Auto Care',
  workshopAddress: {
    address: '123 Main Street',
    city: 'Toronto',
    province: 'Ontario',
    postal: 'M5V 1A1',
    country: 'Canada'
  }
}
```

---

## Network Tab Verification

### Request to Check
```
GET /api/mechanics/available?sessionType=in_person&customer_city=Toronto&...
```

### Expected Response Headers
```
Status: 200 OK
Content-Type: application/json
```

### Expected Response Body
- All mechanics have `workshopAddress` populated
- No mechanics with `mechanicType: 'virtual_only'`
- All mechanics have `workshopId` not null

---

## Rollback Plan (If Issues Found)

If critical issues discovered during testing:

1. **API Filtering Broken:**
   - Revert: `src/app/api/mechanics/available/route.ts` lines 27, 74-79
   - Impact: All mechanics will appear again (pre-Phase 1 behavior)

2. **Workshop Address Missing:**
   - Revert: `src/app/api/mechanics/available/route.ts` lines 58-66, 256-265
   - Impact: No workshop address data in API response

3. **Review Step Broken:**
   - Revert: `src/components/customer/scheduling/ReviewAndPaymentStep.tsx` lines 210-238
   - Impact: Workshop address won't display, but booking still works

---

## Known Limitations (Phase 2 Items)

The following are intentionally NOT implemented in Phase 1:

1. ❌ Balance payment collection workflow (Phase 2 Priority 1)
2. ❌ Workshop operating hours display (Phase 2 Priority 3)
3. ❌ Distance calculation to workshop (Phase 2 Priority 4)
4. ❌ Configurable deposit amount (Phase 2 Priority 2)
5. ❌ Mobile service support (Phase 3+)
6. ❌ Workshop photos (Phase 3+)

---

## Success Criteria

Phase 1 is considered SUCCESSFUL if:

✅ Virtual-only mechanics do not appear for in-person bookings
✅ Workshop address displays in review step
✅ Google Maps directions link works (opens correct location)
✅ $15 deposit displays correctly for in-person
✅ No TypeScript errors
✅ No console errors during booking flow
✅ User can complete full in-person booking end-to-end

---

## Post-Testing Actions

After testing passes:

1. ✅ Mark Phase 1 as VERIFIED
2. ✅ Document any edge cases discovered
3. ✅ Proceed to Phase 2 implementation approval
4. ✅ Consider removing debug logging (e.g., Alex Thompson console.log)

---

## Contact for Issues

If testing reveals issues:

- Check git diff to see what changed
- Review [IN_PERSON_PHASE2_ANALYSIS_2025-11-12.md](IN_PERSON_PHASE2_ANALYSIS_2025-11-12.md) for context
- Test with different mechanics to isolate issue
- Check browser console for client-side errors
- Check server logs for API errors

---

**Last Updated:** 2025-11-12
**Phase 1 Status:** ✅ Implementation Complete - Awaiting Testing
**Next Step:** User testing and verification
