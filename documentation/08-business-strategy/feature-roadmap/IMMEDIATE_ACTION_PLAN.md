# Immediate Action Plan - Mechanic Matching System

**Date**: 2025-11-08
**Priority**: CRITICAL
**User Feedback**: Testing reveals mechanics not showing up

---

## 🔴 CRITICAL FINDINGS

### Issue Summary

User is testing as a customer and cannot see Alex Thomson (who is a workshop mechanic and is online) when clicking "Choose Specific Mechanic". Shows "No mechanics available right now".

**Root Causes Identified**:

1. **Missing Country Parameter**: SessionWizard wasn't passing `customer_country` to API ✅ FIXED
2. **Mechanic Profile Incomplete**: Alex Thomson likely missing required data (to verify)
3. **Workshop vs Virtual Distinction**: System doesn't differentiate between workshop and virtual mechanics
4. **No Postal Code Capture**: Mechanics have no way to enter postal code
5. **No Auto-Match Preview**: "First Available" doesn't show who customer will be matched with

---

## 🎯 IMMEDIATE FIXES (COMPLETED)

### Fix #1: Add Country Parameter to API Call ✅

**File**: `src/components/customer/SessionWizard.tsx` (Line 193)

**Change Made**:
```typescript
// ✅ Always include country for better matching (default to Canada for now)
params.set('customer_country', 'Canada')
```

**Status**: ✅ COMPLETED

**Test**: Try "Choose Specific Mechanic" again - mechanics should now appear

---

## 📋 NEXT STEPS (PRIORITY ORDER)

### Step 1: Verify Alex Thomson's Database Record (URGENT - 5 min)

**Action**: Check if Alex Thomson has correct flags set

**Required Values**:
- `status` = 'approved'
- `can_accept_sessions` = true
- `is_available` = true (or check if he's clocked in via `/api/mechanic/clock`)
- `country` = 'Canada' or similar

**How to Check**:
1. Go to Supabase Dashboard → Table Editor → `mechanics`
2. Search for "Alex Thomson"
3. Verify all flags are correct
4. If `is_available` = false, check if he's clocked in

**Note**: The system has two availability systems:
- **Clock In/Out**: Via OnShiftToggle (for micro-sessions)
- **is_available flag**: For real-time matching

**Possible Issue**: Alex might be clocked out, so `is_available` = false

---

### Step 2: Add `is_workshop` Distinction (2-3 hours)

**Problem**: System doesn't differentiate between workshop and virtual mechanics

**Solution**: Implement hybrid mechanic system

**Database Changes**:
```sql
-- Add is_workshop flag
ALTER TABLE mechanics
ADD COLUMN is_workshop BOOLEAN DEFAULT FALSE;

-- Update Alex Thomson (example)
UPDATE mechanics
SET is_workshop = TRUE
WHERE name LIKE '%Alex Thomson%';
```

**API Endpoint Enhancement** (`src/app/api/mechanics/available/route.ts`):
```typescript
// Add session_type parameter
const sessionType = searchParams.get('session_type') // 'virtual' | 'physical' | 'any'

// Filter logic
if (sessionType === 'physical') {
  // Only workshops
  query = query.eq('is_workshop', true)
} else if (sessionType === 'virtual') {
  // Both virtual and workshops (workshops can do virtual too)
  // No filter needed
}
```

**UI Changes**:
- Add workshop badge to mechanic cards
- Show "🏭 Workshop + Virtual" vs "💻 Virtual Only"

---

### Step 3: Add Postal Code to Mechanic Profiles (1-2 hours)

**Current State**: Backend captures postal code in signup, but UI might not show it

**Files to Check/Modify**:

1. **Mechanic Signup** - `src/app/mechanic/signup/page.tsx`
   - Ensure postal code field is visible
   - Add helper text: "Helps customers find you locally"

2. **Mechanic Profile Edit** - `src/app/mechanic/profile/page.tsx`
   - Add postal code field for updating

3. **Database**: `mechanics.postal_code` column already exists ✅

**Test**: Alex Thomson should be able to add postal code M5V 3A8

---

### Step 4: Replace City Dropdown with Free-Text (1 hour)

**Problem**: City selection is limited dropdown

**Solution**:
```tsx
{/* Province Dropdown */}
<select name="province" required>
  <option value="">Select Province</option>
  <option value="ON">Ontario</option>
  <option value="BC">British Columbia</option>
  <option value="AB">Alberta</option>
  <option value="QC">Quebec</option>
  <option value="MB">Manitoba</option>
  <option value="SK">Saskatchewan</option>
  <option value="NS">Nova Scotia</option>
  <option value="NB">New Brunswick</option>
  <option value="NL">Newfoundland and Labrador</option>
  <option value="PE">Prince Edward Island</option>
  <option value="YT">Yukon</option>
  <option value="NT">Northwest Territories</option>
  <option value="NU">Nunavut</option>
</select>

{/* City Free-Text Input */}
<input
  type="text"
  name="city"
  placeholder="Enter your city or suburb (e.g., Mississauga, Scarborough)"
  required
/>

{/* Postal Code (Optional but Recommended) */}
<input
  type="text"
  name="postalCode"
  placeholder="e.g., M5V 3A8"
  maxLength={7}
/>
<p className="text-xs text-slate-400">
  📍 Recommended: Helps local customers find you
</p>
```

---

### Step 5: Implement Auto-Match Preview (4-6 hours)

**User's Vision**:
> "In every case, auto matching should also show in a beautiful way the mechanic a customer is matched with so they can check their profile ahead of time before even going ahead with the session."

**Implementation**:

When customer selects "First Available":

```tsx
// Fetch top matched mechanic immediately
useEffect(() => {
  if (mechanicSelection === 'first-available') {
    fetchTopMatchedMechanic()
  }
}, [mechanicSelection, selectedMechanicType, customerPostalCode])

const fetchTopMatchedMechanic = async () => {
  setLoadingTopMatch(true)

  const params = new URLSearchParams()
  params.set('request_type', selectedMechanicType === 'specialist' ? 'brand_specialist' : 'general')
  params.set('customer_country', 'Canada')
  params.set('limit', '1')  // Only top match

  if (selectedMechanicType === 'specialist' && vehicle?.make) {
    params.set('requested_brand', vehicle.make)
  }

  if (customerPostalCode) {
    params.set('customer_postal_code', customerPostalCode)
  }

  const response = await fetch(`/api/mechanics/available?${params.toString()}`)
  const data = await response.json()

  if (data.mechanics && data.mechanics.length > 0) {
    setTopMatchedMechanic(data.mechanics[0])
  }

  setLoadingTopMatch(false)
}
```

**UI Display**:
```tsx
{mechanicSelection === 'first-available' && topMatchedMechanic && (
  <div className="mt-4 rounded-xl border-2 border-green-500 bg-green-500/10 p-4">
    {/* Success Header */}
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-full bg-green-500/20">
        <CheckCircle className="h-6 w-6 text-green-400" />
      </div>
      <div>
        <h4 className="font-bold text-white text-lg">Perfect Match Found!</h4>
        <p className="text-sm text-green-300">We found the best mechanic for your needs</p>
      </div>
    </div>

    {/* Mechanic Preview Card */}
    <MechanicSelectionCard
      mechanic={topMatchedMechanic}
      isSelected={true}
      onSelect={() => {}}
      showMatchScore={true}
    />

    {/* Action Buttons */}
    <div className="mt-4 flex gap-3">
      <button
        onClick={handleContinueWithMatch}
        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
      >
        <Check className="h-5 w-5" />
        Continue with {topMatchedMechanic.name}
      </button>

      <button
        onClick={() => setMechanicSelection('specific')}
        className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg flex items-center gap-2"
      >
        <Users className="h-5 w-5" />
        See Other Options
      </button>
    </div>
  </div>
)}
```

**Benefits**:
- Customer sees exactly who they're getting
- Transparency builds trust
- Option to browse alternatives
- Beautiful UI showcasing mechanic credentials
- Match score + reasons visible

---

### Step 6: Fix Availability System Integration (2-3 hours)

**Current System**:
- OnShiftToggle: Clock in/out system
- is_available: Real-time availability flag

**Problem**: These might not be synced

**Solution**: When mechanic clocks in, update `is_available` flag

**File**: `src/app/api/mechanic/clock/route.ts`

**Add to clock_in logic**:
```typescript
// When mechanic clocks in
await supabase
  .from('mechanics')
  .update({
    is_available: true,
    last_seen_at: new Date().toISOString()
  })
  .eq('user_id', user.id)
```

**Add to clock_out logic**:
```typescript
// When mechanic clocks out
await supabase
  .from('mechanics')
  .update({
    is_available: false,
    last_seen_at: new Date().toISOString()
  })
  .eq('user_id', user.id)
```

---

## 🧪 TESTING CHECKLIST

After implementing above fixes, test:

### Test 1: Basic Mechanic Visibility
- [ ] Customer goes to SessionWizard
- [ ] Selects "Choose Specific Mechanic"
- [ ] Sees list of available mechanics
- [ ] Alex Thomson appears in list
- [ ] Shows correct status (online/offline)

### Test 2: Auto-Match Preview
- [ ] Customer selects "First Available"
- [ ] Sees preview card with top matched mechanic
- [ ] Can click "Continue with [Name]"
- [ ] Can click "See Other Options" to browse

### Test 3: Workshop vs Virtual
- [ ] Workshop mechanics show "🏭 Workshop" badge
- [ ] Virtual mechanics show "💻 Virtual" badge
- [ ] Both appear in search results
- [ ] Equal visibility (no bias)

### Test 4: Location Matching
- [ ] Customer enters postal code M5V 3A8
- [ ] Alex Thomson (M5V area) gets higher match score
- [ ] Match reasons show "Same area (M5V)"
- [ ] Mechanics outside area still visible but lower score

### Test 5: Availability System
- [ ] Mechanic clocks in → `is_available` = true
- [ ] Mechanic appears in customer search
- [ ] Mechanic clocks out → `is_available` = false
- [ ] Mechanic disappears from "available now" search

---

## 📊 IMPLEMENTATION TIMELINE

| Task | Priority | Time | Status |
|------|----------|------|--------|
| Add country parameter to API | CRITICAL | 5 min | ✅ DONE |
| Verify Alex Thomson's record | URGENT | 5 min | ⏳ PENDING |
| Add is_workshop distinction | HIGH | 2-3 hours | ⏳ PENDING |
| Add postal code to profiles | HIGH | 1-2 hours | ⏳ PENDING |
| Replace city dropdown | MEDIUM | 1 hour | ⏳ PENDING |
| Implement auto-match preview | HIGH | 4-6 hours | ⏳ PENDING |
| Fix availability sync | HIGH | 2-3 hours | ⏳ PENDING |
| End-to-end testing | CRITICAL | 2-3 hours | ⏳ PENDING |

**Total Estimated Time**: 13-19 hours

**Recommended Approach**: Complete HIGH priority items first, then MEDIUM

---

## 🎯 QUICK WIN (NEXT 30 MINUTES)

To get Alex Thomson showing up immediately:

1. **Check Alex Thomson's record in Supabase** (2 min)
   - Verify `status = 'approved'`
   - Verify `can_accept_sessions = true`
   - Check `is_available` value

2. **If is_available = false, have Alex clock in** (1 min)
   - Alex goes to mechanic dashboard
   - Clicks "Clock In" button
   - This should set `is_available = true`

3. **If still not working, manually update** (1 min)
   ```sql
   UPDATE mechanics
   SET
     is_available = TRUE,
     can_accept_sessions = TRUE,
     status = 'approved',
     country = 'Canada',
     city = 'Toronto'  -- or his actual city
   WHERE name LIKE '%Alex Thomson%';
   ```

4. **Test again** (1 min)
   - Customer selects "Choose Specific Mechanic"
   - Should now see Alex Thomson

---

## 💡 USER'S FULL VISION

Based on feedback, here's the complete vision:

1. **✅ Full Integration** - Not partial, complete everything together
2. **✅ Auto-Match Preview** - Show who customer gets even for "First Available"
3. **✅ Beautiful UI** - Showcase mechanic profile before customer proceeds
4. **✅ Province + Free-Text City** - Not limited dropdown
5. **✅ Postal Code Everywhere** - Customer AND mechanic profiles
6. **✅ Workshop Support** - Hybrid system supporting both virtual and workshop mechanics
7. **✅ No Anti-Workshop Bias** - Equal visibility and fair revenue model

**I agree 100% with this vision. Let's implement it completely!**

---

## 📞 NEXT ACTIONS

**IMMEDIATE (Next 30 min)**:
1. Check Alex Thomson's database record
2. Ensure he's clocked in (is_available = true)
3. Test mechanic selection again

**TODAY (Next 4-6 hours)**:
1. Implement auto-match preview
2. Add is_workshop distinction
3. Test end-to-end

**THIS WEEK (Next 8-12 hours)**:
1. Add postal code to profiles
2. Fix city dropdown
3. Sync availability system
4. Complete testing

**Let's start with the quick win to get Alex Thomson visible, then proceed with full implementation!**
