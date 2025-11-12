# In-Person Visit Scheduling - Phase 2 Analysis
**Date:** 2025-11-12
**Status:** PHASE 1 COMPLETE ✅ | PHASE 2 READY FOR REVIEW

## Phase 1 Completion Summary

### ✅ Implemented (Phase 1)
1. **sessionType filtering in mechanics API** - Virtual-only mechanics excluded
2. **Workshop address in API response** - Full address data returned
3. **Mechanic selection validation** - Prevents incompatible selections
4. **Workshop data in wizard** - Captures and stores workshop info
5. **Workshop display in review** - Prominent with FREE Google Maps link

### 🎯 Result
- In-person bookings now properly filter mechanics
- Users see workshop address before payment
- One-click FREE directions via Google Maps URL scheme

---

## Phase 2: Proposed Enhancements

### 1. Move Deposit Amount to Configuration
**Current State:** Hardcoded `$15` in ReviewAndPaymentStep.tsx

**Priority:** 🟡 Medium
**Effort:** 1 hour
**Cost Impact:** None

**Rationale:**
- Different service types may need different deposits
- Business may want to adjust deposit strategy
- Premium plans might have higher deposits

**Implementation:**
```typescript
// Create src/config/pricing.ts
export const PRICING_CONFIG = {
  deposits: {
    in_person: {
      standard: 15,
      premium: 25,
      specialist: 30
    },
    online: {
      // No deposit - full payment upfront
    }
  }
}
```

**Recommendation:** ✅ **WORTH DOING**
- Simple change, high flexibility
- Allows business model experimentation
- Can adjust deposits per plan type

---

### 2. Add Distance Calculation
**Feature:** Show distance from customer location to workshop

**Priority:** 🟡 Medium
**Effort:** 4-6 hours
**Cost Impact:** POTENTIALLY $$

**Implementation Options:**

#### Option A: Google Maps Distance Matrix API
- **Cost:** First $200/month FREE, then $5 per 1000 requests
- **Accuracy:** Best (considers traffic, routing)
- **Complexity:** Medium (requires API key, error handling)
- **Example:** "2.3 miles (8 min drive)"

#### Option B: Haversine Formula (Straight-line)
- **Cost:** 100% FREE
- **Accuracy:** Good enough for sorting/filtering
- **Complexity:** Low (pure math)
- **Example:** "2.1 miles (straight line)"

```typescript
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959 // Earth radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c // Distance in miles
}
```

**Recommendation:** ⚠️ **CONSIDER OPTION B FIRST**
- Haversine is FREE and sufficient for "nearby" sorting
- Can upgrade to Google API later if needed
- Most users just want to know "how far roughly"
- Reserve paid API for critical features only

**If Implementing:**
1. Start with Haversine (FREE)
2. Add "Approx. X miles away" to mechanic cards
3. Sort mechanics by distance (nearest first)
4. Monitor user feedback
5. Upgrade to paid API only if users complain about accuracy

---

### 3. Display Workshop Operating Hours
**Feature:** Show workshop hours in calendar, prevent booking outside hours

**Priority:** 🟡 Medium
**Effort:** 6-8 hours
**Cost Impact:** None (database already has `workshop_availability` table)

**Current Database Schema:**
```sql
CREATE TABLE workshop_availability (
  id UUID PRIMARY KEY,
  workshop_id UUID REFERENCES organizations(id),
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
  is_open BOOLEAN,
  open_time TIME,
  close_time TIME,
  ...
)
```

**Implementation:**
1. Fetch workshop hours when mechanic selected
2. Display in mechanic card: "Mon-Fri 8am-6pm, Sat 9am-5pm"
3. Gray out unavailable time slots in calendar
4. Show warning if booking outside hours

**Recommendation:** ✅ **WORTH DOING**
- Prevents confusion/no-shows
- Data already exists in database
- Good UX improvement
- Reduces customer support burden

---

### 4. Balance Payment Workflow
**Feature:** Document or implement post-service balance collection

**Priority:** 🔴 High (Documentation)
**Effort:** 2-3 hours (documentation) OR 20+ hours (implementation)
**Cost Impact:** None for docs, Stripe fees for implementation

**Current State:**
- Customer pays $15 deposit at booking
- Review step says "Balance of $X due after service"
- **NO documented workflow for collecting balance**

**Questions to Answer:**
1. When is balance collected?
   - Automatically after session marked complete?
   - Manually by mechanic/admin?
   - Customer-initiated payment?

2. What if customer doesn't pay balance?
   - Block future bookings?
   - Send payment reminders?
   - Collections process?

3. How is balance calculated?
   - Fixed (planPrice - deposit)?
   - Adjustable by mechanic (actual work done)?
   - Include additional parts/labor?

**Recommendation:** 🚨 **DOCUMENT FIRST, THEN BUILD**
1. **Phase 2A:** Document the intended workflow
   - Who triggers balance payment?
   - What happens if not paid?
   - How are disputes handled?
2. **Phase 2B:** Implement based on documented workflow
3. **DO NOT BUILD** without clear business logic

**Suggested Workflow (for documentation):**
```
1. Session completed by mechanic
2. Mechanic reviews work done, confirms final price
3. System sends balance due email to customer
4. Customer has 7 days to pay via portal
5. After payment, mechanic can leave review
6. If unpaid after 7 days, account flagged (can't book new sessions)
```

---

### 5. Mobile Service Support
**Feature:** Mechanics who come to customer location

**Priority:** 🟢 Low (Future Enhancement)
**Effort:** 12-15 hours
**Cost Impact:** None (existing payment system)

**Requirements:**
1. Add `offers_mobile_service` flag to mechanics table
2. For mobile service, collect customer address (not workshop)
3. Calculate travel fee based on distance
4. Show "Mobile Service Available" badge
5. Display "Mechanic will come to you" in review

**Recommendation:** ⏸️ **DEFER TO PHASE 3+**
- Not critical for MVP
- Requires additional fields and logic
- Address validation complexity
- Travel fee calculations
- Insurance/liability considerations

---

### 6. Workshop Photos/Gallery
**Feature:** Show workshop images to build trust

**Priority:** 🟢 Low
**Effort:** 8-10 hours
**Cost Impact:** Storage costs (minimal if using Supabase storage)

**Implementation:**
- Add `workshop_images` table or JSON field
- Display 2-3 photos in mechanic card
- "View Workshop" modal with gallery

**Recommendation:** ⏸️ **NICE TO HAVE, NOT CRITICAL**
- Good for conversion
- But requires mechanics to upload photos
- May have low adoption initially
- Consider after core features stable

---

### 7. Workshop Reviews/Ratings
**Feature:** Separate ratings for workshop vs mechanic

**Priority:** 🟡 Medium
**Effort:** 10-12 hours
**Cost Impact:** None

**Current State:**
- Reviews are for mechanics
- No separate workshop ratings

**Value:**
- Customers can rate facility quality
- Separate from mechanic skill rating
- "Clean facility: 4.8/5, Mechanic skill: 4.9/5"

**Recommendation:** 🤔 **EVALUATE NEED**
- Adds complexity to review system
- Most customers care about end result, not facility
- Consider only if workshops request this feature

---

## Google Maps Integration - Cost Analysis

### FREE Option (Implemented ✅)
**Method:** URL Scheme
```
https://maps.google.com/?q=ADDRESS
```
**Cost:** $0 forever
**Limitations:** Opens in new tab, can't embed map
**Sufficient For:** Directions link (what we implemented)

### Paid Options (Not Needed Yet)

#### Embed API (Interactive Map)
**Cost:** $7 per 1000 map loads (after $200 free)
**Use Case:** Showing map on page
**Recommendation:** ❌ NOT NEEDED - URL scheme works

#### Distance Matrix API
**Cost:** $5 per 1000 requests (after $200 free)
**Use Case:** Accurate distance/drive time calculations
**Recommendation:** ⏸️ DEFER - Use Haversine first

#### Places API
**Cost:** $17 per 1000 searches
**Use Case:** Workshop address autocomplete
**Recommendation:** ❌ NOT NEEDED - Admin enters addresses

### Monthly Cost Estimate
**Current (Phase 1):** $0/month ✅
**If adding distance (Haversine):** $0/month ✅
**If adding distance (Google API):** ~$5-15/month (depends on traffic)

**Recommendation:**
- Stay with FREE options for now
- Only pay for Google APIs if users demand accuracy
- $200/month free tier likely covers initial growth

---

## Phase 2 Priority Ranking

### HIGH PRIORITY (Do Soon)
1. ✅ **Document balance payment workflow** (2-3 hours)
   - Unblock future development
   - No code needed, just write the process

2. ✅ **Move deposit to config** (1 hour)
   - Quick win, high flexibility
   - Enables future pricing experiments

### MEDIUM PRIORITY (Do Later)
3. 🔄 **Workshop operating hours** (6-8 hours)
   - Good UX, prevents booking errors
   - Data already exists

4. 🔄 **Distance calculation (Haversine)** (4-6 hours)
   - FREE implementation
   - Helps users choose convenient mechanic
   - Don't pay for Google API yet

### LOW PRIORITY (Backlog)
5. ⏸️ **Mobile service support** - Phase 3+
6. ⏸️ **Workshop photos** - Nice to have
7. ⏸️ **Separate workshop ratings** - Evaluate need first

---

## Recommended Phase 2 Implementation Order

### Week 1
1. **Document balance payment workflow** - DONE FIRST
2. **Move deposit to configuration** - Quick win

### Week 2
3. **Implement workshop hours display** - Best ROI

### Week 3+
4. **Add distance calculation (Haversine)** - FREE option
5. Monitor user feedback, iterate

---

## Cost Summary

| Feature | Implementation | Monthly Cost |
|---------|---------------|--------------|
| Phase 1 (Completed) | Done ✅ | $0 |
| Google Maps (URL) | Done ✅ | $0 |
| Deposit config | 1 hour | $0 |
| Balance workflow docs | 2-3 hours | $0 |
| Workshop hours | 6-8 hours | $0 |
| Distance (Haversine) | 4-6 hours | $0 |
| Distance (Google API) | 4-6 hours | ~$10-15 |
| Mobile service | 12-15 hours | $0 |
| Workshop photos | 8-10 hours | ~$1-2 (storage) |

**Total Phase 2 Cost (without Google API):** $0/month recurring
**Development Time:** 15-20 hours
**Value:** High - Prevents booking errors, improves UX

---

## Testing Checklist for Phase 1

Before moving to Phase 2, verify Phase 1 works:

- [ ] Virtual-only mechanics DO NOT appear in in-person searches
- [ ] Workshop mechanics DO appear in in-person searches
- [ ] Cannot select virtual-only mechanic for in-person (shows alert)
- [ ] Cannot select mechanic without address for in-person (shows alert)
- [ ] Workshop address displays in mechanic card
- [ ] Workshop address displays in review step (amber box)
- [ ] Google Maps link opens correct location
- [ ] "Get Directions" link works in new tab
- [ ] $15 deposit shown for in-person bookings
- [ ] Full amount shown for online bookings
- [ ] Can complete full in-person booking flow
- [ ] Confirmation email includes workshop address

---

## Conclusion

**Phase 1: COMPLETE ✅**
- Critical issues fixed
- System now functional for in-person bookings
- $0 monthly cost (FREE Google Maps)

**Phase 2: RECOMMENDED APPROACH**
1. Document balance payment workflow (HIGH)
2. Move deposit to config (QUICK WIN)
3. Add workshop hours (GOOD ROI)
4. Add distance with Haversine (FREE)
5. Defer mobile service, photos, separate ratings

**Key Decision: Google Maps**
- **Current:** FREE URL scheme (sufficient)
- **Don't upgrade** to paid APIs until user feedback demands it
- Monitor usage, upgrade only if necessary

**Total Investment:**
- Development: 15-20 hours
- Monthly Cost: $0
- Value: High

---

**Next Steps:**
1. Test Phase 1 implementation
2. Get stakeholder approval on Phase 2 priorities
3. Document balance payment workflow
4. Implement deposit configuration
5. Proceed with workshop hours and distance

**Questions for Review:**
1. Is the balance payment workflow documented elsewhere?
2. Should deposits vary by plan type?
3. Is Haversine distance sufficient, or must it be Google API?
4. Are workshop operating hours enforced strictly, or just displayed?
5. Is mobile service a near-term priority?
