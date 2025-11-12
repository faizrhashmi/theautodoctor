# BRAND SPECIALISTS INTEGRATION - DETAILED PLAN
**Date:** November 11, 2025
**Status:** READY FOR APPROVAL

---

## YOUR QUESTIONS ANSWERED

### Question 1: What if user wants specialist advice WITHOUT owning the vehicle?

**Scenario:** User clicks "BMW" on specialists page, but doesn't own a BMW yet. They just want to talk to a BMW expert.

**Answer:** This is **ALREADY SUPPORTED** by your existing advice-only flow! Here's how it works:

#### User Journey:
1. User clicks "BMW" on `/customer/specialists`
2. Redirects to: `/customer/book-session?specialist=BMW`
3. BookingWizard detects `specialist=BMW` parameter
4. **Step 1 (Vehicle):**
   - User sees two options:
     - ✅ "Select your BMW vehicle" (if they own one)
     - ✅ **"Skip - Just Advice"** ← User clicks this
   - Sets `isAdviceOnly: true` + `requestedBrand: 'BMW'`
5. **Step 2 (Plan):** User selects plan (Standard/Premium/Enterprise)
6. **Step 3 (Mechanic):**
   - **"Brand Specialists" tab is PRE-SELECTED**
   - Shows only BMW specialists
   - Banner: "Showing BMW Specialists (+$15 premium)"
7. User proceeds to Step 4 (Concern)

**Result:** User gets BMW specialist advice without vehicle data ✅

---

### Question 2: Where do we show the +$15 specialist premium charge?

**Current State Analysis:**

Your BookingWizard **ALREADY** shows specialist premium in Step 3:
- [BookingWizard.tsx:46-48](src/components/customer/BookingWizard.tsx#L46-L48) - Has "Brand Specialists" tab
- [MechanicStep.tsx:194-200](src/components/customer/booking-steps/MechanicStep.tsx#L194-L200) - Applies `specialistPremium: 15`

**Problem:** User doesn't see the +$15 charge until AFTER selecting plan in Step 2.

**Solution:** Dynamic pricing disclosure flow

#### Where to Show Specialist Premium:

**Option A: Show in Step 2 (Plan Selection) - RECOMMENDED ✅**

When user comes from specialists page, Step 2 shows:

```
┌─────────────────────────────────────────────────┐
│  🏆 BMW Specialist Selected                     │
│                                                  │
│  Standard Plan        $29.99                    │
│  + BMW Specialist     +$15.00                   │
│  ─────────────────────────────                  │
│  Total:               $44.99                    │
│                                                  │
│  [ ] I understand I'm booking a BMW specialist  │
│      with additional premium                    │
│                                                  │
│  ⚠️ Want a standard mechanic instead?          │
│     You can change in Step 3                    │
└─────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ User sees total price BEFORE selecting mechanic
- ✅ Legal compliance (Canadian pricing transparency)
- ✅ User can still change mind in Step 3
- ✅ No hardcoded prices (pulled from database)

---

### Question 3: Where does specialist charge come from? Which plan?

**Current Implementation Analysis:**

Looking at [MechanicStep.tsx:207](src/components/customer/booking-steps/MechanicStep.tsx#L207):
```tsx
specialistPremium: applySpecialistPremium ? 15 : 0,
```

**Problem:** `$15` is hardcoded! ❌

**Solution:** Pull from database

#### Recommended Database Structure:

```sql
-- Option A: Add to plans table (if specialist premium varies by plan)
ALTER TABLE plans ADD COLUMN specialist_premium_amount DECIMAL(10,2) DEFAULT 15.00;

-- Option B: Add to feature_flags or settings table (if global)
INSERT INTO feature_flags (flag_key, flag_value, flag_type)
VALUES ('specialist_premium', '15.00', 'number');

-- Option C: Add to brands table (if premium varies by brand)
ALTER TABLE brands ADD COLUMN specialist_premium DECIMAL(10,2) DEFAULT 15.00;
```

**Recommendation:** **Option C - Store in brands table**

Why? Different brands may have different premiums:
- BMW Specialist: $15
- Luxury brands (Porsche, Ferrari): $25
- Economy brands (Honda, Toyota): $10

#### Implementation:

```tsx
// MechanicStep.tsx - Fetch specialist premium from brands table
const [specialistPremium, setSpecialistPremium] = useState<number>(15) // Default

useEffect(() => {
  async function fetchBrandPremium() {
    if (requestedBrand) {
      const { data: brand } = await supabase
        .from('brands')
        .select('specialist_premium')
        .eq('brand_name', requestedBrand)
        .single()

      if (brand?.specialist_premium) {
        setSpecialistPremium(brand.specialist_premium)
      }
    }
  }
  fetchBrandPremium()
}, [requestedBrand])

// Then use dynamic value
specialistPremium: applySpecialistPremium ? specialistPremium : 0,
```

---

### Question 4: What if user changes from Specialist to Standard in Step 3?

**Scenario:**
1. User clicks "BMW" on specialists page
2. Goes through Step 1 (selects vehicle or advice-only)
3. Goes through Step 2 (selects plan, sees +$15)
4. **On Step 3:** User clicks "Standard Mechanics" tab instead of "Brand Specialists"
5. What happens?

**Answer:** Show confirmation modal

#### User Flow:

**When user clicks "Standard Mechanics" tab:**

```
┌─────────────────────────────────────────────────┐
│  ⚠️ Change Specialist Selection?                │
│                                                  │
│  You initially requested a BMW Specialist.      │
│  Switching to standard mechanics will:          │
│                                                  │
│  • Remove the $15 specialist premium            │
│  • Show all available mechanics (not just BMW)  │
│  • You may get a generalist instead of expert   │
│                                                  │
│  Your new total: $29.99 (was $44.99)           │
│                                                  │
│  [ Continue with Standard ]  [ Keep Specialist ] │
└─────────────────────────────────────────────────┘
```

**Implementation:**

```tsx
// MechanicStep.tsx - Add modal state
const [showSpecialistChangeModal, setShowSpecialistChangeModal] = useState(false)
const [pendingMechanicType, setPendingMechanicType] = useState<string>('')

// When user clicks tab
const handleTabChange = (newType: 'standard' | 'brand_specialist' | 'favorite') => {
  // If user came from specialists page and is switching away
  if (wizardData.requestedBrand && mechanicType === 'brand_specialist' && newType === 'standard') {
    setPendingMechanicType(newType)
    setShowSpecialistChangeModal(true)
  } else {
    // Normal tab change
    setMechanicType(newType)
  }
}

// Modal confirm handler
const handleConfirmTabChange = () => {
  setMechanicType(pendingMechanicType as any)
  setRequestedBrand('') // Clear specialist request
  onComplete({
    ...wizardData,
    mechanicType: 'standard',
    requestedBrand: null,
    specialistPremium: 0
  })
  setShowSpecialistChangeModal(false)
}
```

---

### Question 5: How do we avoid duplicate steps?

**Your Concern:** "We already have Brand Specialists tab in Step 3. How do we avoid user selecting specialist twice?"

**Answer:** Pre-select the tab and show clear visual indicator

#### Implementation Strategy:

**When user arrives from specialists page:**

1. **Step 1 (Vehicle):**
   - Show banner: "🏆 Booking BMW Specialist"
   - Normal vehicle selection or advice-only

2. **Step 2 (Plan):**
   - Show banner: "🏆 BMW Specialist - Base Price + $15"
   - Display pricing breakdown
   - Show checkbox: "I understand specialist premium applies"

3. **Step 3 (Mechanic):**
   - **"Brand Specialists" tab is AUTO-SELECTED**
   - **Filter shows ONLY BMW specialists**
   - Banner: "Showing BMW Specialists (from your initial selection)"
   - User can switch tabs (triggers modal)

**Visual Flow:**

```
Specialists Page         BookingWizard Step 1           Step 2                Step 3
─────────────────       ──────────────────────        ──────────            ─────────
[Click BMW]       →     🏆 Booking BMW Specialist →   💰 Plan + $15    →    ✅ BMW Tab Selected
                        │                             │                     │ (pre-filtered)
                        ├─ Vehicle Selection          ├─ Price Breakdown    ├─ BMW mechanics only
                        └─ Or: Skip (Advice)          └─ Premium consent    └─ Can switch (modal)
```

**Benefits:**
- ✅ No duplicate specialist selection
- ✅ User's intent (BMW specialist) preserved throughout
- ✅ Can still change mind (with confirmation)
- ✅ Clear pricing transparency
- ✅ Seamless flow

---

## COMPLETE INTEGRATION PLAN

### Phase 1: Update Specialists Page (5 minutes)

**File:** `src/app/customer/specialists/page.tsx`

**Change Line 176:**
```tsx
// BEFORE
href={`/intake?specialist=true&brand=${encodeURIComponent(brand.brand_name)}`}

// AFTER
href={`/customer/book-session?specialist=${encodeURIComponent(brand.brand_name)}`}
```

**Result:** Clicking brand redirects to BookingWizard with specialist parameter

---

### Phase 2: Add Database Column for Specialist Premium (10 minutes)

**Create Migration:**
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_specialist_premium.sql

-- Add specialist_premium to brands table
ALTER TABLE brands
ADD COLUMN specialist_premium DECIMAL(10,2) DEFAULT 15.00;

COMMENT ON COLUMN brands.specialist_premium IS 'Additional charge for booking a specialist for this brand';

-- Update existing brands with default
UPDATE brands SET specialist_premium = 15.00 WHERE specialist_premium IS NULL;

-- Set luxury brands to higher premium
UPDATE brands
SET specialist_premium = 25.00
WHERE is_luxury = true;
```

**Run Migration:**
```bash
pnpm supabase db push
```

---

### Phase 3: Update BookingWizard to Detect Specialist Parameter (20 minutes)

**File:** `src/components/customer/BookingWizard.tsx`

**Add after line 52 (before state initialization):**
```tsx
const searchParams = useSearchParams()
const specialistBrandFromUrl = searchParams.get('specialist')
```

**Add useEffect to initialize specialist request (after line 119):**
```tsx
// Detect specialist request from URL
useEffect(() => {
  if (specialistBrandFromUrl) {
    setWizardData(prev => ({
      ...prev,
      mechanicType: 'brand_specialist',
      requestedBrand: specialistBrandFromUrl
    }))
  }
}, [specialistBrandFromUrl])
```

**Add specialist banner component:**
```tsx
{/* Specialist Request Banner - Show on all steps */}
{wizardData.requestedBrand && (
  <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-xl p-4 mb-6">
    <div className="flex items-center gap-3">
      <Crown className="h-6 w-6 text-orange-400" />
      <div>
        <h3 className="text-white font-bold">
          {wizardData.requestedBrand} Specialist Selected
        </h3>
        <p className="text-sm text-slate-300">
          You'll be matched with certified {wizardData.requestedBrand} experts
        </p>
      </div>
    </div>
  </div>
)}
```

---

### Phase 4: Update Step 1 (Vehicle) - Show Specialist Context (5 minutes)

**File:** `src/components/customer/booking-steps/VehicleStep.tsx`

**Add banner at top (after line 50):**
```tsx
{wizardData.requestedBrand && (
  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
    <p className="text-sm text-orange-200">
      🏆 Looking for a <strong>{wizardData.requestedBrand}</strong> specialist?
      {' '}Select your {wizardData.requestedBrand} vehicle below, or click "Skip - Just Advice" if you don't own one yet.
    </p>
  </div>
)}
```

---

### Phase 5: Update Step 2 (Plan) - Show Specialist Premium (30 minutes)

**File:** `src/components/customer/booking-steps/PlanStep.tsx`

**Add state for specialist premium:**
```tsx
const [specialistPremium, setSpecialistPremium] = useState<number>(0)
const [acceptedSpecialistPremium, setAcceptedSpecialistPremium] = useState(false)
```

**Fetch specialist premium from database:**
```tsx
useEffect(() => {
  async function fetchSpecialistPremium() {
    if (wizardData.requestedBrand) {
      const { data: brand } = await supabase
        .from('brands')
        .select('specialist_premium')
        .eq('brand_name', wizardData.requestedBrand)
        .single()

      if (brand?.specialist_premium) {
        setSpecialistPremium(brand.specialist_premium)
      }
    }
  }
  fetchSpecialistPremium()
}, [wizardData.requestedBrand])
```

**Add pricing breakdown card (after plan selection):**
```tsx
{wizardData.requestedBrand && selectedPlan && (
  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mt-6">
    <h3 className="text-lg font-semibold text-white mb-4">Pricing Summary</h3>

    <div className="space-y-2 text-sm mb-4">
      <div className="flex justify-between text-slate-300">
        <span>{getPlanLabel(selectedPlan)}</span>
        <span>${getPlanPrice(selectedPlan)}</span>
      </div>

      <div className="flex justify-between text-orange-300">
        <span>{wizardData.requestedBrand} Specialist Premium</span>
        <span>+${specialistPremium.toFixed(2)}</span>
      </div>

      <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between text-white font-bold text-lg">
        <span>Total</span>
        <span>${(getPlanPrice(selectedPlan) + specialistPremium).toFixed(2)}</span>
      </div>
    </div>

    {/* Consent Checkbox */}
    <label className="flex items-start gap-3 cursor-pointer p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
      <input
        type="checkbox"
        checked={acceptedSpecialistPremium}
        onChange={(e) => setAcceptedSpecialistPremium(e.target.checked)}
        className="mt-1 h-5 w-5 rounded border-orange-500"
        required
      />
      <span className="text-sm text-slate-200">
        I understand there is an additional <strong>${specialistPremium.toFixed(2)}</strong> premium
        for booking a {wizardData.requestedBrand} specialist, and I agree to this charge.
      </span>
    </label>

    {/* Option to Switch */}
    <div className="mt-4 pt-4 border-t border-slate-700">
      <p className="text-xs text-slate-400 mb-2">
        Want a standard mechanic instead? You can change in the next step.
      </p>
    </div>
  </div>
)}
```

**Update canGoNext validation:**
```tsx
const canGoNext = () => {
  if (!selectedPlan) return false

  // If specialist requested, must accept premium
  if (wizardData.requestedBrand && !acceptedSpecialistPremium) return false

  return true
}
```

**Pass specialist premium to wizard data:**
```tsx
onComplete({
  planType: selectedPlan,
  planPrice: getPlanPrice(selectedPlan),
  specialistPremium: wizardData.requestedBrand ? specialistPremium : 0,
})
```

---

### Phase 6: Update Step 3 (Mechanic) - Pre-select Specialist Tab (40 minutes)

**File:** `src/components/customer/booking-steps/MechanicStep.tsx`

**Update initial mechanicType state (line 27):**
```tsx
// BEFORE
const [mechanicType, setMechanicType] = useState<'standard' | 'brand_specialist' | 'favorite'>('standard')

// AFTER
const [mechanicType, setMechanicType] = useState<'standard' | 'brand_specialist' | 'favorite'>(
  wizardData.requestedBrand ? 'brand_specialist' : 'standard'
)
```

**Add modal state:**
```tsx
const [showSpecialistChangeModal, setShowSpecialistChangeModal] = useState(false)
const [pendingMechanicType, setPendingMechanicType] = useState<string>('')
const [pendingTabTotal, setPendingTabTotal] = useState<number>(0)
```

**Update handleTabChange logic (replace existing tab change handler):**
```tsx
const handleTabChange = (newType: 'standard' | 'brand_specialist' | 'favorite') => {
  // If user came from specialists page and is switching away
  if (
    wizardData.requestedBrand &&
    mechanicType === 'brand_specialist' &&
    newType === 'standard'
  ) {
    // Calculate new total (without specialist premium)
    const basePrice = wizardData.planPrice || 0
    setPendingTabTotal(basePrice)
    setPendingMechanicType(newType)
    setShowSpecialistChangeModal(true)
  } else {
    // Normal tab change
    setMechanicType(newType)
    if (newType === 'brand_specialist' && !requestedBrand) {
      // If switching TO specialist tab without brand, prompt for brand
      // (This is the normal flow for users NOT coming from specialists page)
    }
  }
}
```

**Add confirmation modal JSX (before closing </div>):**
```tsx
{/* Specialist Change Confirmation Modal */}
{showSpecialistChangeModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="bg-slate-900 border border-orange-500/30 rounded-xl p-6 max-w-md">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/20 border border-orange-500/30">
          <AlertCircle className="h-6 w-6 text-orange-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-2">
            Change Specialist Selection?
          </h3>
          <p className="text-sm text-slate-300 mb-3">
            You initially requested a <strong>{wizardData.requestedBrand}</strong> specialist.
            Switching to standard mechanics will:
          </p>
          <ul className="text-sm text-slate-300 space-y-1 mb-4">
            <li>• Remove the ${wizardData.specialistPremium?.toFixed(2) || '15.00'} specialist premium</li>
            <li>• Show all available mechanics (not just {wizardData.requestedBrand})</li>
            <li>• You may get a generalist instead of expert</li>
          </ul>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Previous total:</span>
              <span className="text-slate-300 line-through">
                ${((wizardData.planPrice || 0) + (wizardData.specialistPremium || 0)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold mt-1">
              <span className="text-white">New total:</span>
              <span className="text-green-400">${pendingTabTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            setShowSpecialistChangeModal(false)
            setPendingMechanicType('')
          }}
          className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
        >
          Keep {wizardData.requestedBrand} Specialist
        </button>
        <button
          onClick={() => {
            // Confirm change
            setMechanicType(pendingMechanicType as any)
            setRequestedBrand('')
            onComplete({
              ...wizardData,
              mechanicType: 'standard',
              requestedBrand: null,
              specialistPremium: 0
            })
            setShowSpecialistChangeModal(false)
            setPendingMechanicType('')
          }}
          className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
        >
          Continue with Standard
        </button>
      </div>
    </div>
  </div>
)}
```

**Add banner showing specialist selection:**
```tsx
{/* At top of mechanic selection UI */}
{wizardData.requestedBrand && mechanicType === 'brand_specialist' && (
  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
    <div className="flex items-center gap-3">
      <Check className="h-5 w-5 text-green-400" />
      <div>
        <p className="text-sm text-green-200">
          Showing <strong>{wizardData.requestedBrand}</strong> specialists only
          (based on your initial selection)
        </p>
        <button
          onClick={() => handleTabChange('standard')}
          className="text-xs text-green-400 hover:underline mt-1"
        >
          Switch to standard mechanics →
        </button>
      </div>
    </div>
  </div>
)}
```

**Update specialist premium to use database value:**
```tsx
// Add state for dynamic premium
const [brandPremium, setBrandPremium] = useState<number>(15)

// Fetch from database
useEffect(() => {
  async function fetchBrandPremium() {
    if (requestedBrand || wizardData.requestedBrand) {
      const brand = requestedBrand || wizardData.requestedBrand
      const { data } = await supabase
        .from('brands')
        .select('specialist_premium')
        .eq('brand_name', brand)
        .single()

      if (data?.specialist_premium) {
        setBrandPremium(data.specialist_premium)
      }
    }
  }
  fetchBrandPremium()
}, [requestedBrand, wizardData.requestedBrand])

// Use dynamic value in handleMechanicSelect
specialistPremium: applySpecialistPremium ? brandPremium : 0,
```

---

### Phase 7: Update Mechanic Matching Algorithm (15 minutes)

**File:** `src/lib/mechanicMatching.ts`

**Update matching to prioritize requested brand:**
```tsx
// If user requested specific brand specialist, filter to that brand
if (requestedBrand) {
  mechanics = mechanics.filter(m => {
    return m.certifications?.some(cert =>
      cert.brand?.toLowerCase() === requestedBrand.toLowerCase()
    )
  })
}

// Boost score for exact brand match
if (requestedBrand && mechanic.certifications?.some(c => c.brand === requestedBrand)) {
  score += 50 // High priority for requested brand
}
```

---

### Phase 8: Update Intake API to Handle Specialist Data (10 minutes)

**File:** `src/app/api/intake/start/route.ts`

**Ensure specialist data is preserved:**
```tsx
// Extract specialist data from request
const {
  requestedBrand,
  specialistPremium,
  // ... other fields
} = await request.json()

// Store in session_requests
await supabase.from('session_requests').insert({
  // ... other fields
  requested_brand: requestedBrand,
  specialist_premium: specialistPremium,
  is_specialist: !!requestedBrand,
})
```

---

## FINAL USER FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SPECIALISTS PAGE                                 │
│  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐                           │
│  │  BMW  │  │ Honda │  │ Porsche│  │ Ford  │                           │
│  └───┬───┘  └───────┘  └───────┘  └───────┘                           │
│      │ CLICK                                                             │
└──────┼───────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   BOOKINGWIZARD - STEP 1: VEHICLE                        │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 🏆 Booking BMW Specialist                                          │ │
│  │ Select your BMW vehicle or click "Skip - Just Advice"              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  [ My 2020 BMW 3-Series ]  OR  [ Skip - Just Advice ]                  │
│                                                                          │
│  Selected: 2020 BMW 3-Series                                            │
│  [ Continue → ]                                                          │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   BOOKINGWIZARD - STEP 2: PLAN                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 🏆 BMW Specialist - Pricing Breakdown                              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ○ Standard Plan       $29.99                                           │
│  ● Premium Plan        $49.99                                           │
│  ○ Enterprise Plan     $79.99                                           │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ PRICING SUMMARY                                                    │ │
│  │ Premium Plan                                        $49.99         │ │
│  │ + BMW Specialist Premium                           +$15.00        │ │
│  │ ─────────────────────────────────────────────────────────         │ │
│  │ Total:                                              $64.99         │ │
│  │                                                                    │ │
│  │ ☑ I agree to the $15 specialist premium                           │ │
│  │                                                                    │ │
│  │ ⚠️ Want standard mechanic? You can change in Step 3               │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  [ Continue → ]                                                          │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   BOOKINGWIZARD - STEP 3: MECHANIC                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ ✅ Showing BMW specialists (from your initial selection)           │ │
│  │ Switch to standard mechanics →                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Tabs: [ Standard ] [ Brand Specialists ✓ ] [ Favorites ]              │
│        (if clicked)      (PRE-SELECTED)                                 │
│            │                                                             │
│            └──→ MODAL: "Remove $15 premium? New total: $49.99"         │
│                 [ Keep Specialist ] [ Switch to Standard ]              │
│                                                                          │
│  Mechanics filtered to BMW specialists only:                            │
│  ┌──────────────────────────────────────┐                              │
│  │ John Smith - BMW Certified            │                              │
│  │ ⭐ 4.9 (120 reviews)                  │                              │
│  │ [Select] [Schedule Later]             │                              │
│  └──────────────────────────────────────┘                              │
│                                                                          │
│  [ Continue → ]                                                          │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ▼
    STEP 4 (CONCERN) → SUBMIT → WAIVER → SESSION
```

---

## IMPLEMENTATION CHECKLIST

### ✅ Phase 1: Specialists Page Redirect (5 min)
- [ ] Update `specialists/page.tsx` line 176
- [ ] Change href from `/intake?specialist=true&brand=X` to `/customer/book-session?specialist=X`

### ✅ Phase 2: Database Schema (10 min)
- [ ] Create migration to add `specialist_premium` column to `brands` table
- [ ] Run `pnpm supabase db push`
- [ ] Verify column exists in database

### ✅ Phase 3: BookingWizard Detection (20 min)
- [ ] Add `useSearchParams()` to detect specialist parameter
- [ ] Add useEffect to initialize `requestedBrand` in wizardData
- [ ] Add specialist banner component
- [ ] Test: Click brand on specialists page → Should see banner on Step 1

### ✅ Phase 4: Step 1 Context (5 min)
- [ ] Add specialist context banner to VehicleStep
- [ ] Test: Banner shows "Looking for BMW specialist?"

### ✅ Phase 5: Step 2 Pricing (30 min)
- [ ] Fetch specialist premium from database
- [ ] Show pricing breakdown card
- [ ] Add consent checkbox
- [ ] Update validation to require checkbox
- [ ] Test: See $15 premium + checkbox required

### ✅ Phase 6: Step 3 Pre-selection (40 min)
- [ ] Pre-select "Brand Specialists" tab if requestedBrand present
- [ ] Add confirmation modal for switching tabs
- [ ] Add banner showing filtered results
- [ ] Update specialist premium to use database value
- [ ] Test all tab switching scenarios

### ✅ Phase 7: Matching Algorithm (15 min)
- [ ] Update `mechanicMatching.ts` to filter by requested brand
- [ ] Add score boost for exact brand match
- [ ] Test: Request BMW → Only see BMW specialists

### ✅ Phase 8: API Integration (10 min)
- [ ] Update `intake/start/route.ts` to save specialist data
- [ ] Test: Specialist data persists in database

---

## TOTAL IMPLEMENTATION TIME: ~2.5 hours

### Breakdown:
- Database setup: 10 min
- Frontend changes: 100 min
- Testing: 25 min

---

## TESTING SCENARIOS

### ✅ Scenario 1: User WITH Vehicle
1. Click "BMW" on specialists page
2. See specialist banner on Step 1
3. Select BMW vehicle
4. See pricing breakdown on Step 2 ($29.99 + $15 = $44.99)
5. Accept specialist premium checkbox
6. See "Brand Specialists" tab pre-selected on Step 3
7. See only BMW specialists
8. Select mechanic → Complete

**Expected Result:** ✅ Session created with BMW specialist + $15 premium

---

### ✅ Scenario 2: User WITHOUT Vehicle (Advice-Only)
1. Click "Porsche" on specialists page
2. See specialist banner on Step 1
3. Click "Skip - Just Advice"
4. See pricing breakdown on Step 2 ($29.99 + $25 = $54.99) ← Higher luxury premium
5. Accept specialist premium checkbox
6. See "Brand Specialists" tab pre-selected on Step 3
7. See only Porsche specialists
8. Select mechanic → Complete

**Expected Result:** ✅ Advice-only session with Porsche specialist + $25 premium

---

### ✅ Scenario 3: User Changes Mind (Switches to Standard)
1. Click "Honda" on specialists page
2. Select vehicle on Step 1
3. See pricing ($29.99 + $10 = $39.99) on Step 2
4. Accept specialist premium
5. On Step 3, click "Standard Mechanics" tab
6. **Modal appears:** "Remove $10 premium? New total: $29.99"
7. Click "Continue with Standard"
8. Tab switches, premium removed, all mechanics shown

**Expected Result:** ✅ Standard session without specialist premium

---

### ✅ Scenario 4: User Goes Directly to BookingWizard (No Specialists Page)
1. Navigate to `/customer/book-session` (no specialist parameter)
2. Normal wizard flow
3. No specialist banner
4. Step 2 shows base pricing only
5. Step 3 defaults to "Standard Mechanics" tab
6. Can manually switch to "Brand Specialists" and pick brand

**Expected Result:** ✅ Normal flow unaffected, backward compatible

---

## MATCHING ALGORITHM INTEGRATION

### How Brand Specialists Get Matched:

**Input to Matching Algorithm:**
```json
{
  "customerId": "user-123",
  "vehicleMake": "BMW",
  "vehicleModel": "3-Series",
  "country": "Canada",
  "province": "Ontario",
  "city": "Toronto",
  "postalCode": "M5V 3A8",
  "requestedBrand": "BMW",        ← NEW
  "mechanicType": "brand_specialist", ← NEW
  "preferredMechanicId": null
}
```

**Matching Logic:**
```tsx
// 1. Filter to requested brand if specified
if (requestedBrand) {
  mechanics = mechanics.filter(m =>
    m.certifications?.some(c => c.brand === requestedBrand)
  )
}

// 2. Calculate match score
let score = 0

// Exact brand certification match (HIGHEST PRIORITY)
if (requestedBrand && mechanic.certifications?.some(c => c.brand === requestedBrand)) {
  score += 50
}

// Location proximity
const distance = calculateDistance(customer.location, mechanic.location)
if (distance < 10) score += 30
else if (distance < 50) score += 20
else if (distance < 100) score += 10

// Online status
if (mechanic.presenceStatus === 'online') score += 40

// Rating
if (mechanic.averageRating >= 4.8) score += 20
else if (mechanic.averageRating >= 4.5) score += 15

// Experience
if (mechanic.yearsExperience >= 10) score += 15

// 3. Sort by score DESC
mechanics.sort((a, b) => b.score - a.score)

// 4. Return top matches
return mechanics.slice(0, 10)
```

**Result:** BMW specialists with certifications get highest scores and appear first ✅

---

## PRICING ADMINISTRATION

### How Admin Updates Specialist Premiums:

**Admin Dashboard:**
```
Brands Management → Edit Brand → Specialist Premium

┌─────────────────────────────────────────┐
│ Edit Brand: BMW                         │
├─────────────────────────────────────────┤
│ Brand Name: BMW                         │
│ Is Luxury: ☑                            │
│ Specialist Premium: $[15.00]            │
│                                         │
│ ℹ️ This amount is added when customers │
│   book a BMW specialist.                │
│                                         │
│ [ Save ] [ Cancel ]                     │
└─────────────────────────────────────────┘
```

**No hardcoded prices in code** ✅
**All pricing pulled from database** ✅
**Admin can adjust anytime** ✅

---

## SUMMARY

### What This Integration Achieves:

1. ✅ **No Duplicate Steps**: User selects brand once (specialists page), wizard honors it throughout
2. ✅ **Advice-Only Support**: User can skip vehicle selection and still get specialist
3. ✅ **Pricing Transparency**: Total cost shown in Step 2 with consent checkbox (Canadian law compliance)
4. ✅ **User Control**: Can switch from specialist to standard (with confirmation)
5. ✅ **Dynamic Pricing**: Specialist premiums pulled from database, admin-configurable
6. ✅ **Smart Matching**: Algorithm prioritizes requested brand specialists
7. ✅ **Seamless UX**: Clear visual indicators, no confusion, smooth flow

---

## YOUR APPROVAL NEEDED

Please confirm:
- [ ] **Phase 1-8 implementation plan approved**
- [ ] **Pricing disclosure in Step 2 approved** (Canadian legal requirement)
- [ ] **Confirmation modal for switching tabs approved**
- [ ] **Database column addition approved** (`brands.specialist_premium`)
- [ ] **Ready to proceed with implementation**

---

**Once you approve, I will:**
1. Create the database migration
2. Implement all 8 phases in order
3. Test all 4 scenarios
4. Provide final verification checklist

**Estimated total time: 2.5 hours**

Let me know if you approve this plan or have any changes! 🚀
