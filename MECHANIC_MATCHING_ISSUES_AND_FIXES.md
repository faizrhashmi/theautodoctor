# Mechanic Matching Issues & Comprehensive Fix Plan

**Date**: 2025-11-08
**Reported By**: User Testing
**Severity**: HIGH - Blocking core functionality

---

## 🔴 CRITICAL ISSUES IDENTIFIED

### Issue 1: Mechanics Not Showing Up - "No mechanics available"

**Problem**: When customer selects "Choose Specific Mechanic", they see "No mechanics available right now" even though Alex Thomson is online.

**Root Causes**:

1. **Missing Required Filters in API Query**
   - API requires `status = 'approved'` AND `can_accept_sessions = true`
   - If Alex Thomson doesn't have these flags set correctly, he won't appear
   - Need to verify database values

2. **No Country/City Parameters Being Passed**
   - SessionWizard is NOT passing `customer_country` or `customer_city` to API
   - API location matching code expects these parameters
   - Without them, mechanics with location data might get lower scores

**File**: `src/components/customer/SessionWizard.tsx:189-200`
```typescript
const params = new URLSearchParams()
params.set('request_type', selectedMechanicType === 'specialist' ? 'brand_specialist' : 'general')

if (selectedMechanicType === 'specialist' && vehicle?.make) {
  params.set('requested_brand', vehicle.make)
}

if (customerPostalCode) {
  params.set('customer_postal_code', customerPostalCode)
}

params.set('limit', '10')
// ❌ MISSING: customer_country and customer_city parameters!
```

---

### Issue 2: No Postal Code Field in Mechanic Profile

**Problem**: Mechanics have no way to enter their postal code during signup or in their profile.

**Impact**:
- FSA matching cannot work (no mechanic postal codes to compare)
- Location-based matching relies only on country/city (very broad)
- The entire postal code proximity feature is non-functional

**Required Fixes**:
1. Add postal code field to mechanic signup form
2. Add postal code field to mechanic profile edit page
3. Make it optional but highly recommended
4. Add validation for Canadian postal code format (A1A 1A1)

**Files to Modify**:
- `src/app/api/mechanic/signup/route.ts` - Already captures `postalCode` (line 28-40) ✅
- `src/app/mechanic/profile/page.tsx` - Need to add postal code display/edit
- Database: `mechanics.postal_code` column already exists ✅

---

### Issue 3: Limited City Selection (Dropdown Issue)

**Problem**: City selection is a small dropdown list instead of allowing free-text input with province selection.

**Current Implementation**: Hardcoded city list (not scalable)

**Desired Implementation**:
1. **Province/State Dropdown** - Select province first
2. **City Free-Text Input** - Allow mechanics to type their city/suburb
3. **Optional Postal Code** - For precise FSA matching
4. **Auto-complete** - Suggest popular cities based on province

**Why This Matters**:
- Canada has 5,000+ cities/towns/suburbs
- Hardcoded list will never cover everyone
- Small towns/suburbs need representation
- Free-text is more flexible and user-friendly

---

### Issue 4: Auto-Matching Preview Not Implemented

**Problem**: When customer chooses "First Available" (auto-match), they don't see WHO they're matched with before proceeding.

**User's Vision**:
> "In every case, auto matching should also show in a beautiful way considering the delivery of the UI the mechanic a customer is matched with so they can check their profile ahead of time before even going ahead with the session."

**Current Behavior**:
- Customer selects "First Available"
- Immediately proceeds to intake form
- No preview of who they'll be matched with
- Mechanic assignment happens AFTER payment/waiver

**Desired Behavior**:
- Customer selects "First Available"
- API fetches top matched mechanic
- Shows beautiful preview card:
  - "✅ We found the perfect match for you!"
  - Mechanic name, photo, rating, expertise
  - 🟢 Online status
  - Match score + reasons
  - "This mechanic will help you" message
- Customer can either:
  - ✅ "Continue with [Mechanic Name]" (proceed)
  - 🔄 "See other options" (browse alternatives)

**Benefits**:
- Transparency (customer knows who they're getting)
- Trust building (see credentials before committing)
- Better UX (informed decision)
- Reduced anxiety (no blind assignment)

---

## 🛠️ COMPREHENSIVE FIX PLAN

### Phase 1: Immediate Fixes (Critical - 2 hours)

#### Fix 1.1: Add Country/City Parameters to SessionWizard

**File**: `src/components/customer/SessionWizard.tsx`

**Current Code** (lines 184-216):
```typescript
const fetchAvailableMechanics = async () => {
  try {
    setLoadingMechanics(true)
    const vehicle = vehicles.find(v => v.id === selectedVehicle)

    const params = new URLSearchParams()
    params.set('request_type', selectedMechanicType === 'specialist' ? 'brand_specialist' : 'general')

    if (selectedMechanicType === 'specialist' && vehicle?.make) {
      params.set('requested_brand', vehicle.make)
    }

    if (customerPostalCode) {
      params.set('customer_postal_code', customerPostalCode)
    }

    params.set('limit', '10')

    const response = await fetch(`/api/mechanics/available?${params.toString()}`)
    // ...
  }
}
```

**Fixed Code**:
```typescript
const fetchAvailableMechanics = async () => {
  try {
    setLoadingMechanics(true)
    const vehicle = vehicles.find(v => v.id === selectedVehicle)

    const params = new URLSearchParams()
    params.set('request_type', selectedMechanicType === 'specialist' ? 'brand_specialist' : 'general')

    if (selectedMechanicType === 'specialist' && vehicle?.make) {
      params.set('requested_brand', vehicle.make)
    }

    // ✅ ADD: Always pass country for better matching
    params.set('customer_country', 'Canada')  // Default for now, or get from user profile

    if (customerPostalCode) {
      params.set('customer_postal_code', customerPostalCode)

      // ✅ ADD: Extract city from postal code if possible
      // Or allow customer to select city in wizard
    }

    params.set('limit', '10')

    const response = await fetch(`/api/mechanics/available?${params.toString()}`)
    // ...
  }
}
```

#### Fix 1.2: Verify Alex Thomson's Database Flags

**Action**: Check database to ensure Alex Thomson has:
- `status = 'approved'` ✅
- `can_accept_sessions = true` ✅
- `is_available = true` ✅

**SQL Query**:
```sql
SELECT
  id,
  name,
  email,
  status,
  can_accept_sessions,
  is_available,
  country,
  city,
  postal_code,
  is_brand_specialist,
  brand_specializations
FROM mechanics
WHERE name LIKE '%Alex%'
   OR name LIKE '%Thomson%';
```

**If Missing**: Update Alex Thomson's record:
```sql
UPDATE mechanics
SET
  status = 'approved',
  can_accept_sessions = true,
  is_available = true
WHERE name LIKE '%Alex Thomson%';
```

---

### Phase 2: Location System Overhaul (4-6 hours)

#### Fix 2.1: Add Province + Free-Text City to Mechanic Signup

**File**: `src/app/api/mechanic/signup/route.ts`

**Current** (lines 28-40):
```typescript
const {
  name,
  email,
  password,
  phone,
  // Location
  address,
  city,
  province,
  postalCode,
  country,
  // ...
} = body;
```

This already exists! ✅ But the UI needs to be updated to allow free-text city input.

#### Fix 2.2: Update Mechanic Signup Form UI

**File**: `src/app/mechanic/signup/page.tsx` (or wherever signup form is)

**Changes Needed**:
1. Replace city dropdown with free-text input
2. Add province dropdown (Canadian provinces + "Other")
3. Make postal code visible and recommended (currently might be hidden)
4. Add helpful text: "Enter your postal code for better local matching"

**Example UI**:
```tsx
{/* Province Dropdown */}
<select name="province" required>
  <option value="">Select Province</option>
  <option value="ON">Ontario</option>
  <option value="BC">British Columbia</option>
  <option value="AB">Alberta</option>
  <option value="QC">Quebec</option>
  {/* ... all provinces */}
</select>

{/* City Free-Text Input */}
<input
  type="text"
  name="city"
  placeholder="e.g., Toronto, Mississauga, Scarborough"
  required
/>

{/* Postal Code */}
<input
  type="text"
  name="postalCode"
  placeholder="e.g., M5V 3A8"
  maxLength={7}
/>
<p className="text-xs text-slate-400">
  📍 Helps customers find local mechanics in your area
</p>
```

#### Fix 2.3: Add Postal Code to Mechanic Profile Edit

**File**: `src/app/mechanic/profile/page.tsx`

**Add postal code field** (similar to signup form)

---

### Phase 3: Auto-Match Preview Implementation (6-8 hours)

#### Feature 3.1: "First Available" Preview Card

**When customer selects "First Available"**:

1. **Fetch Top Match Immediately**:
```typescript
// In SessionWizard.tsx, when mechanicSelection changes to 'first-available'
useEffect(() => {
  if (mechanicSelection === 'first-available') {
    fetchTopMatchedMechanic()
  }
}, [mechanicSelection])

const fetchTopMatchedMechanic = async () => {
  const params = new URLSearchParams()
  params.set('request_type', selectedMechanicType === 'specialist' ? 'brand_specialist' : 'general')
  params.set('customer_country', 'Canada')
  params.set('limit', '1')  // Only get top match

  const response = await fetch(`/api/mechanics/available?${params.toString()}`)
  const data = await response.json()

  if (data.mechanics && data.mechanics.length > 0) {
    setTopMatchedMechanic(data.mechanics[0])
  }
}
```

2. **Show Beautiful Preview Card**:
```tsx
{mechanicSelection === 'first-available' && topMatchedMechanic && (
  <div className="mt-4 p-4 rounded-xl border-2 border-green-500 bg-green-500/10">
    {/* Success Badge */}
    <div className="flex items-center gap-2 mb-3">
      <div className="p-2 rounded-full bg-green-500/20">
        <Check className="h-5 w-5 text-green-400" />
      </div>
      <div>
        <h4 className="font-bold text-white">Perfect Match Found!</h4>
        <p className="text-xs text-green-300">We found the best mechanic for your needs</p>
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
    <div className="mt-3 flex gap-2">
      <button
        onClick={() => handleContinueWithMatch()}
        className="flex-1 btn-primary"
      >
        ✅ Continue with {topMatchedMechanic.name}
      </button>
      <button
        onClick={() => setMechanicSelection('specific')}
        className="btn-secondary"
      >
        🔄 See Other Options
      </button>
    </div>
  </div>
)}
```

3. **Benefits**:
- Customer sees exactly who they're getting
- Builds trust before commitment
- Option to browse alternatives if not satisfied
- Beautiful UI showing mechanic's credentials
- Match score transparency

---

### Phase 4: Enhanced Matching Logic (2-3 hours)

#### Fix 4.1: Add Customer Location to SessionWizard

**Current Issue**: SessionWizard doesn't capture customer's city/province

**Solution**: Add location section in Step 3B (after postal code):

```tsx
{/* Step 3B: Location Input */}
<div className="pt-2 space-y-3">
  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
    Your Location (Helps find local mechanics)
  </p>

  {/* Province Dropdown */}
  <select
    value={customerProvince}
    onChange={(e) => setCustomerProvince(e.target.value)}
    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white"
  >
    <option value="">Select Province (Optional)</option>
    <option value="ON">Ontario</option>
    <option value="BC">British Columbia</option>
    {/* ... */}
  </select>

  {/* City Free-Text */}
  <input
    type="text"
    placeholder="City/Town (e.g., Toronto, Mississauga)"
    value={customerCity}
    onChange={(e) => setCustomerCity(e.target.value)}
    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white"
  />

  {/* Postal Code */}
  <input
    type="text"
    placeholder="Postal Code (e.g., M5V 3A8)"
    value={customerPostalCode}
    onChange={(e) => setCustomerPostalCode(e.target.value.toUpperCase())}
    maxLength={7}
    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white"
  />

  <p className="text-xs text-slate-500">
    💡 Your location helps us find the best local mechanics for you
  </p>
</div>
```

#### Fix 4.2: Update API Call to Include All Location Data

```typescript
const params = new URLSearchParams()
params.set('request_type', selectedMechanicType === 'specialist' ? 'brand_specialist' : 'general')
params.set('customer_country', 'Canada')

if (customerCity) {
  params.set('customer_city', customerCity)
}

if (customerPostalCode) {
  params.set('customer_postal_code', customerPostalCode)
}

if (selectedMechanicType === 'specialist' && vehicle?.make) {
  params.set('requested_brand', vehicle.make)
}

params.set('limit', mechanicSelection === 'first-available' ? '1' : '10')
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Immediate (Phase 1) - 2 hours
- [ ] Add `customer_country` to SessionWizard API call
- [ ] Verify Alex Thomson's database flags (status, can_accept_sessions, is_available)
- [ ] Test mechanic list appears correctly
- [ ] Fix any database issues preventing mechanics from showing

### Short-term (Phase 2) - 4-6 hours
- [ ] Update mechanic signup form to allow free-text city input
- [ ] Keep province dropdown, make city free-text
- [ ] Make postal code visible and recommended in signup
- [ ] Add postal code to mechanic profile edit page
- [ ] Test location matching with real data

### Medium-term (Phase 3) - 6-8 hours
- [ ] Implement "First Available" preview card
- [ ] Fetch top matched mechanic when "First Available" selected
- [ ] Show beautiful preview with mechanic details
- [ ] Add "Continue with [Name]" vs "See Other Options" buttons
- [ ] Test user flow end-to-end

### Enhancement (Phase 4) - 2-3 hours
- [ ] Add location section to SessionWizard Step 3
- [ ] Province dropdown for customer
- [ ] City free-text for customer
- [ ] Update API calls to include all location parameters
- [ ] Test location-based matching accuracy

---

## 🎯 PRIORITY ORDER

**TODAY (Critical)**:
1. ✅ Fix Alex Thomson showing up (database flags + API parameters)
2. ✅ Add `customer_country` to API call
3. ✅ Test mechanic list populates

**THIS WEEK (High Priority)**:
1. Auto-match preview implementation (Phase 3)
2. Location system overhaul (Phase 2)
3. Enhanced matching logic (Phase 4)

**NEXT SPRINT (Nice to Have)**:
1. Province-based matching enhancements
2. Distance calculation (km-based)
3. Mechanic profile photos
4. Customer reviews integration

---

## 🔍 DEBUGGING STEPS

### Step 1: Verify Database State

**Check Alex Thomson's Record**:
```sql
SELECT * FROM mechanics WHERE name LIKE '%Alex%' OR name LIKE '%Thomson%';
```

**Expected Values**:
- `status` = 'approved'
- `can_accept_sessions` = true
- `is_available` = true
- `country` = 'Canada' (or similar)
- `city` = (some city)

### Step 2: Test API Directly

**In Browser Console** (while on SessionWizard page):
```javascript
fetch('/api/mechanics/available?request_type=general&customer_country=Canada&limit=10')
  .then(r => r.json())
  .then(data => console.log(data))
```

**Expected**: Should return array of mechanics including Alex Thomson

### Step 3: Check Browser Console for Errors

Look for:
- Network errors (404, 500)
- API response errors
- JavaScript console errors

---

## 💡 USER'S VISION SUMMARY

Based on your feedback, here's what you want:

1. **✅ Full Integration** - Not partial deployment, complete everything together
2. **✅ Auto-Match Preview** - Show matched mechanic even for "First Available"
3. **✅ Beautiful UI** - Showcase mechanic profile before customer proceeds
4. **✅ Province + Free-Text City** - Not limited dropdown, allow any city/suburb
5. **✅ Postal Code for Mechanics** - Add to signup and profile
6. **✅ Transparency** - Customer sees profile before committing to session

**I AGREE 100%** - Let's do complete integration with all these enhancements. The partial deployment would have left gaps that hurt the user experience.

---

## 🚀 NEXT STEPS

1. **Investigate** - Check Alex Thomson's database record
2. **Quick Fix** - Add country parameter to API call
3. **Full Implementation** - Complete all 4 phases above
4. **Testing** - Test with real mechanics and customers
5. **Deploy** - Push complete solution to production

**Estimated Total Time**: 14-19 hours for complete integration

**Let's start with Phase 1 (immediate fixes) and work our way through all phases to deliver the complete vision!**
