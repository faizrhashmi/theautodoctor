# FAVORITES & SPECIALISTS INTEGRATION - UNIFIED PLAN
**Date:** November 11, 2025
**Status:** READY FOR APPROVAL

---

## KEY INSIGHT: FAVORITES CAN BE SPECIALISTS OR STANDARD

### Your Requirement:
> "same thing should apply to favorites too by the way, so treat it as we are treating specialist, so favorites can be either specialists or standard"

### The Problem:
A user's **favorite mechanic** could be:
1. **Standard mechanic** → No specialist premium
2. **Brand specialist** (e.g., BMW certified) → Should charge +$15 premium

**Current Code Analysis:**
Looking at [MechanicStep.tsx:194-200](src/components/customer/booking-steps/MechanicStep.tsx#L194-L200):

```tsx
// Dynamic pricing: Apply specialist premium if:
// 1. User selected "Specialist" tab, OR
// 2. User selected "Favorites" tab AND the mechanic is a brand specialist
const applySpecialistPremium =
  mechanicType === 'brand_specialist' ||
  (mechanicType === 'favorite' && mechanic.isBrandSpecialist)
```

**Status:** ✅ **ALREADY IMPLEMENTED!**

Your code already handles this correctly! When user books a favorite who is a specialist, the premium is applied.

---

## UNIFIED FLOW: SPECIALISTS PAGE + FAVORITES

### Scenario Matrix:

| Entry Point | Mechanic Type | Is Specialist? | Premium Applied? | Flow |
|-------------|---------------|----------------|------------------|------|
| Specialists Page → BMW | Brand Specialist | Yes | ✅ Yes (+$15) | Skip to Step 2, pre-select specialist tab |
| Dashboard → Favorite Mechanic | Standard | No | ❌ No | Normal flow, standard pricing |
| Dashboard → Favorite Mechanic | Brand Specialist | Yes | ✅ Yes (+$15) | Normal flow, show premium in Step 2 |
| Wizard → Favorites Tab | Mixed | Depends | ✅ Dynamic | Show badge on specialist cards |

---

## REQUIRED UPDATES FOR FAVORITES FLOW

### Update 1: Favorites Tab Should Show Specialist Badges

**File:** `src/components/customer/MechanicCard.tsx`

**Add specialist indicator for favorites:**
```tsx
{/* In MechanicCard component */}
{mechanic.isBrandSpecialist && (
  <div className="absolute top-2 right-2">
    <div className="bg-orange-500/20 border border-orange-500/40 rounded-full px-2 py-1 flex items-center gap-1">
      <Crown className="h-3 w-3 text-orange-400" />
      <span className="text-xs font-semibold text-orange-300">Specialist</span>
    </div>
  </div>
)}
```

**Result:** Users can see which favorites are specialists before selecting

---

### Update 2: Step 2 (Plan) Should Show Conditional Premium for Favorites

**File:** `src/components/customer/booking-steps/PlanStep.tsx`

**Current State:** Step 2 shows specialist premium if `requestedBrand` is set (from specialists page)

**Required Change:** Also show premium if favorite mechanic is a specialist

**Add state to track favorite specialist:**
```tsx
const [favoriteMechanicData, setFavoriteMechanicData] = useState<{
  id: string
  name: string
  isBrandSpecialist: boolean
  certifiedBrands: string[]
  specialistPremium: number
} | null>(null)
```

**Fetch favorite mechanic data if coming from favorites flow:**
```tsx
useEffect(() => {
  async function fetchFavoriteMechanic() {
    // If user is coming from favorites (mechanicType = 'favorite' in wizardData)
    if (wizardData.mechanicId && wizardData.mechanicType === 'favorite') {
      const { data: mechanic } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          certifications (
            brand,
            certification_type
          )
        `)
        .eq('id', wizardData.mechanicId)
        .single()

      if (mechanic) {
        const isBrandSpecialist = mechanic.certifications && mechanic.certifications.length > 0
        const certifiedBrands = mechanic.certifications?.map(c => c.brand) || []

        // Get specialist premium (use first brand's premium if multiple)
        let premium = 15 // default
        if (isBrandSpecialist && certifiedBrands.length > 0) {
          const { data: brand } = await supabase
            .from('brands')
            .select('specialist_premium')
            .eq('brand_name', certifiedBrands[0])
            .single()

          if (brand?.specialist_premium) {
            premium = brand.specialist_premium
          }
        }

        setFavoriteMechanicData({
          id: mechanic.id,
          name: mechanic.full_name,
          isBrandSpecialist,
          certifiedBrands,
          specialistPremium: premium
        })
      }
    }
  }
  fetchFavoriteMechanic()
}, [wizardData.mechanicId, wizardData.mechanicType])
```

**Update pricing breakdown to show favorite specialist premium:**
```tsx
{/* Pricing Summary */}
{selectedPlan && (
  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mt-6">
    <h3 className="text-lg font-semibold text-white mb-4">Pricing Summary</h3>

    <div className="space-y-2 text-sm mb-4">
      <div className="flex justify-between text-slate-300">
        <span>{getPlanLabel(selectedPlan)}</span>
        <span>${getPlanPrice(selectedPlan)}</span>
      </div>

      {/* Show specialist premium from either source */}
      {(wizardData.requestedBrand || (favoriteMechanicData?.isBrandSpecialist)) && (
        <>
          <div className="flex justify-between text-orange-300">
            <span>
              {wizardData.requestedBrand
                ? `${wizardData.requestedBrand} Specialist Premium`
                : `${favoriteMechanicData?.certifiedBrands[0]} Specialist Premium (${favoriteMechanicData?.name})`
              }
            </span>
            <span>
              +${(wizardData.specialistPremium || favoriteMechanicData?.specialistPremium || 15).toFixed(2)}
            </span>
          </div>

          <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between text-white font-bold text-lg">
            <span>Total</span>
            <span>
              ${(
                getPlanPrice(selectedPlan) +
                (wizardData.specialistPremium || favoriteMechanicData?.specialistPremium || 0)
              ).toFixed(2)}
            </span>
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg mt-4">
            <input
              type="checkbox"
              checked={acceptedSpecialistPremium}
              onChange={(e) => setAcceptedSpecialistPremium(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-orange-500"
              required
            />
            <span className="text-sm text-slate-200">
              I understand{' '}
              {favoriteMechanicData?.name
                ? `${favoriteMechanicData.name} is a specialist`
                : `there is a specialist premium`
              }{' '}
              with an additional{' '}
              <strong>
                ${(wizardData.specialistPremium || favoriteMechanicData?.specialistPremium || 15).toFixed(2)}
              </strong>{' '}
              charge, and I agree to this.
            </span>
          </label>
        </>
      )}

      {/* No specialist premium - standard pricing only */}
      {!wizardData.requestedBrand && !favoriteMechanicData?.isBrandSpecialist && (
        <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between text-white font-bold text-lg">
          <span>Total</span>
          <span>${getPlanPrice(selectedPlan).toFixed(2)}</span>
        </div>
      )}
    </div>
  </div>
)}
```

---

### Update 3: Dashboard "Book Now" Should Pass Favorite Status

**File:** `src/app/customer/dashboard/page.tsx` (or wherever favorites are displayed)

**When user clicks "Book Now" on a favorite mechanic:**
```tsx
const handleBookFavorite = (mechanic: FavoriteMechanic) => {
  // Store favorite context
  const bookingContext = {
    mechanicId: mechanic.id,
    mechanicName: mechanic.name,
    mechanicType: 'favorite',
    isBrandSpecialist: mechanic.isBrandSpecialist,
    certifiedBrands: mechanic.certifiedBrands || [],
    timestamp: new Date().toISOString()
  }

  sessionStorage.setItem('bookingContext', JSON.stringify(bookingContext))

  // Navigate to BookingWizard
  router.push('/customer/book-session?source=favorites')
}
```

**BookingWizard detects favorites context:**
```tsx
// In BookingWizard.tsx - Add to existing useEffect
useEffect(() => {
  const bookingContext = sessionStorage.getItem('bookingContext')
  if (bookingContext) {
    const { mechanicId, mechanicName, mechanicType, isBrandSpecialist, certifiedBrands } =
      JSON.parse(bookingContext)

    setWizardData(prev => ({
      ...prev,
      mechanicId,
      mechanicName,
      mechanicType,
      isBrandSpecialist,
      certifiedBrands
    }))

    // If favorite is a specialist, we'll show premium in Step 2
    // User still goes through all steps for legal compliance
  }
}, [])
```

---

## COMPLETE USER FLOWS

### Flow 1: User Clicks Specialist from Specialists Page

```
Specialists Page        BookingWizard
─────────────────       ──────────────
[BMW]            →      Step 1: Vehicle (banner: "Booking BMW Specialist")
                        ↓
                        Step 2: Plan + Pricing ($29.99 + $15 = $44.99) + Checkbox
                        ↓
                        Step 3: Brand Specialists tab PRE-SELECTED, BMW only
                        ↓
                        Step 4: Concern
                        ↓
                        Submit → Waiver → Session ($44.99 charged)
```

**Specialist Premium:** ✅ Applied (from brands table)
**User Consent:** ✅ Required (checkbox in Step 2)

---

### Flow 2: User Books Standard Favorite from Dashboard

```
Dashboard               BookingWizard
──────────             ──────────────
[Book John Smith]  →   Step 1: Vehicle
(Standard Mechanic)    ↓
                       Step 2: Plan ($29.99 only, no premium)
                       ↓
                       Step 3: Skip (favorite already selected) OR show for confirmation
                       ↓
                       Step 4: Concern
                       ↓
                       Submit → Waiver → Session ($29.99 charged)
```

**Specialist Premium:** ❌ Not applied (standard mechanic)
**User Consent:** ❌ Not required (no premium)

---

### Flow 3: User Books SPECIALIST Favorite from Dashboard

```
Dashboard                    BookingWizard
──────────                  ──────────────
[Book Sarah Lee]       →    Step 1: Vehicle
(BMW Specialist)            ↓
                            Step 2: Plan + Pricing ($29.99 + $15 = $44.99) + Checkbox
                            ↓  ⚠️ Banner: "Sarah Lee is a BMW specialist (+$15)"
                            ↓
                            Step 3: Skip OR show for confirmation
                            ↓
                            Step 4: Concern
                            ↓
                            Submit → Waiver → Session ($44.99 charged)
```

**Specialist Premium:** ✅ Applied (favorite is specialist)
**User Consent:** ✅ Required (checkbox in Step 2)

---

### Flow 4: User Selects Favorite in Wizard Favorites Tab

```
BookingWizard
──────────────
Step 1: Vehicle
↓
Step 2: Plan ($29.99 base)
↓
Step 3: Click "Favorites" tab
        ├─ Shows favorite mechanics
        ├─ Cards with 🏆 badges for specialists
        ├─ User clicks standard favorite → No premium
        └─ User clicks specialist favorite → Premium added dynamically
↓
See pricing update in real-time:
"Sarah Lee selected - BMW Specialist (+$15)"
Total updates to $44.99
↓
Modal: "I understand Sarah Lee is a specialist (+$15 charge)"
[Accept] [Choose Different Mechanic]
↓
Step 4: Concern
↓
Submit → Waiver → Session
```

**Specialist Premium:** ✅ Applied dynamically based on selection
**User Consent:** ✅ Required (modal confirmation)

---

## IMPLEMENTATION UPDATES

### Additional Changes for Favorites Support:

#### 1. Add Specialist Badge to MechanicCard (5 min)
```tsx
// src/components/customer/MechanicCard.tsx - Add at top right of card
{mechanic.isBrandSpecialist && (
  <div className="absolute top-2 right-2 z-10">
    <div className="bg-gradient-to-r from-orange-500/30 to-yellow-500/30 border border-orange-400/50 rounded-full px-2.5 py-1 flex items-center gap-1.5 backdrop-blur-sm">
      <Crown className="h-3.5 w-3.5 text-orange-300" />
      <span className="text-xs font-bold text-orange-200">
        {mechanic.certifiedBrands?.[0] || 'Specialist'}
      </span>
    </div>
  </div>
)}
```

#### 2. Update PlanStep to Detect Favorite Specialists (20 min)
- Add `favoriteMechanicData` state
- Fetch mechanic certifications if `mechanicType === 'favorite'`
- Show conditional pricing breakdown
- Require checkbox if favorite is specialist

#### 3. Add Real-Time Premium Update in Step 3 (30 min)
When user selects a favorite specialist in Step 3:

```tsx
// src/components/customer/booking-steps/MechanicStep.tsx
const handleMechanicSelect = async (mechanicId: string) => {
  const mechanic = mechanics.find(m => m.id === mechanicId)
  if (!mechanic) return

  // Check if mechanic is specialist
  if (mechanicType === 'favorite' && mechanic.isBrandSpecialist) {
    // Fetch specialist premium
    const { data: brand } = await supabase
      .from('brands')
      .select('specialist_premium')
      .eq('brand_name', mechanic.certifiedBrands[0])
      .single()

    const premium = brand?.specialist_premium || 15

    // Show confirmation modal
    setSpecialistConfirmModal({
      mechanicName: mechanic.name,
      brand: mechanic.certifiedBrands[0],
      premium,
      previousTotal: wizardData.planPrice || 0,
      newTotal: (wizardData.planPrice || 0) + premium
    })
    return // Wait for user to confirm
  }

  // Continue with normal selection...
}
```

**Modal:**
```tsx
{specialistConfirmModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="bg-slate-900 border border-orange-500/30 rounded-xl p-6 max-w-md">
      <div className="flex items-start gap-4 mb-4">
        <Crown className="h-8 w-8 text-orange-400" />
        <div>
          <h3 className="text-lg font-bold text-white mb-2">
            Specialist Selected
          </h3>
          <p className="text-sm text-slate-300 mb-3">
            <strong>{specialistConfirmModal.mechanicName}</strong> is a{' '}
            <strong>{specialistConfirmModal.brand}</strong> specialist.
          </p>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Base price:</span>
              <span className="text-slate-300">
                ${specialistConfirmModal.previousTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Specialist premium:</span>
              <span className="text-orange-400">
                +${specialistConfirmModal.premium.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-700">
              <span className="text-white">New total:</span>
              <span className="text-white">
                ${specialistConfirmModal.newTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer p-2 bg-orange-500/10 border border-orange-500/30 rounded text-xs">
            <input
              type="checkbox"
              checked={acceptSpecialistPremiumModal}
              onChange={(e) => setAcceptSpecialistPremiumModal(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-slate-200">
              I understand and agree to the ${specialistConfirmModal.premium.toFixed(2)}{' '}
              specialist premium
            </span>
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            setSpecialistConfirmModal(null)
            setAcceptSpecialistPremiumModal(false)
          }}
          className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold"
        >
          Choose Different Mechanic
        </button>
        <button
          onClick={() => {
            if (!acceptSpecialistPremiumModal) {
              alert('Please accept the specialist premium to continue')
              return
            }
            // Proceed with selection, add premium to wizardData
            confirmMechanicSelection(specialistConfirmModal.mechanicId, specialistConfirmModal.premium)
            setSpecialistConfirmModal(null)
          }}
          disabled={!acceptSpecialistPremiumModal}
          className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          Confirm Selection
        </button>
      </div>
    </div>
  </div>
)}
```

#### 4. Update Dashboard "Book Favorite" Button (10 min)
- Add `bookingContext` to sessionStorage
- Include `isBrandSpecialist` and `certifiedBrands` fields
- Navigate to `/customer/book-session?source=favorites`

---

## UNIFIED PRICING MATRIX

| Mechanic Type | Is Specialist? | Entry Point | Premium Applied? | Where Disclosed? | Consent Required? |
|---------------|----------------|-------------|------------------|------------------|-------------------|
| Standard | No | Wizard | ❌ No | Step 2 (base price only) | ❌ No |
| Brand Specialist | Yes | Specialists Page | ✅ Yes | Step 2 (breakdown + checkbox) | ✅ Yes |
| Favorite (Standard) | No | Dashboard | ❌ No | Step 2 (base price only) | ❌ No |
| Favorite (Specialist) | Yes | Dashboard | ✅ Yes | Step 2 (breakdown + checkbox) | ✅ Yes |
| Favorite (Standard) | No | Wizard Favorites Tab | ❌ No | Real-time (no modal) | ❌ No |
| Favorite (Specialist) | Yes | Wizard Favorites Tab | ✅ Yes | Real-time (modal) | ✅ Yes |

---

## CANADIAN LEGAL COMPLIANCE CHECKLIST

For specialist premiums, regardless of entry point:

### ✅ Price Transparency (Consumer Protection Act)
- [ ] Total price shown BEFORE final commitment
- [ ] Breakdown of base + premium displayed
- [ ] Premium amount clearly labeled
- [ ] Updates in real-time if selection changes

### ✅ Informed Consent (Contract Law)
- [ ] User explicitly accepts premium (checkbox or modal)
- [ ] Clear description of what premium is for
- [ ] Option to decline (choose different mechanic)
- [ ] Consent recorded in database

### ✅ No Hidden Fees (Competition Act)
- [ ] No surprises at payment stage
- [ ] All charges disclosed upfront
- [ ] No automatic premium application without consent

---

## TESTING SCENARIOS (UPDATED)

### ✅ Test 1: Book Standard Mechanic
1. Go to Step 3, select standard mechanic
2. **Expected:** No premium, base price only
3. Step 4 → Submit → Waiver → **Total = Base price**

### ✅ Test 2: Book Specialist from Specialists Page
1. Click "BMW" on specialists page
2. Complete Steps 1-2, accept +$15 premium
3. Step 3 shows BMW specialists only
4. **Expected:** Total = Base + $15

### ✅ Test 3: Book Standard Favorite from Dashboard
1. Click "Book Now" on standard favorite
2. Complete Steps 1-2
3. **Expected:** No premium, base price only

### ✅ Test 4: Book Specialist Favorite from Dashboard
1. Click "Book Now" on BMW specialist favorite
2. Step 2 shows premium + checkbox
3. **Expected:** Total = Base + $15, consent required

### ✅ Test 5: Select Specialist Favorite in Wizard
1. Go through Steps 1-2 normally
2. Step 3: Click "Favorites" tab
3. Click specialist favorite card (has 🏆 badge)
4. **Expected:** Modal appears with pricing, checkbox required
5. Accept → Continue → **Total updates to Base + $15**

### ✅ Test 6: Select Standard Favorite in Wizard
1. Same as Test 5, but click standard favorite (no badge)
2. **Expected:** No modal, no premium, continues normally

---

## IMPLEMENTATION TIME (UPDATED)

### Original Estimate: 2.5 hours
### Favorites Support: +1 hour

**New Total: 3.5 hours**

### Breakdown:
- Database setup: 10 min (unchanged)
- Specialists page integration: 100 min (unchanged)
- **Favorites badge on cards: 5 min** ← NEW
- **Favorites detection in Step 2: 20 min** ← NEW
- **Real-time premium modal in Step 3: 30 min** ← NEW
- **Dashboard booking context: 10 min** ← NEW
- Testing: 40 min (+15 min for favorites scenarios)

---

## SUMMARY: SPECIALISTS + FAVORITES UNIFIED

### Key Points:

1. **Specialists Page → Wizard:**
   - Pre-selects brand specialist tab
   - Shows premium in Step 2 with checkbox
   - Filters to requested brand only

2. **Dashboard → Favorite (Standard):**
   - Normal flow, no premium
   - Base pricing only

3. **Dashboard → Favorite (Specialist):**
   - Same as specialists page flow
   - Shows premium in Step 2 with checkbox
   - May skip Step 3 (already selected) or show for confirmation

4. **Wizard → Favorites Tab:**
   - Cards show 🏆 badges for specialists
   - Selecting standard = no modal, no premium
   - Selecting specialist = modal with pricing + checkbox

5. **All Flows:**
   - ✅ Dynamic pricing from database
   - ✅ Canadian legal compliance
   - ✅ User consent required for premiums
   - ✅ Clear visual indicators
   - ✅ No duplicate steps

---

## YOUR APPROVAL NEEDED (UPDATED)

Please confirm:
- [ ] **Favorites integration plan approved**
- [ ] **Specialist badge on favorite cards approved**
- [ ] **Real-time premium modal for favorite specialists approved**
- [ ] **Unified pricing disclosure approach approved**
- [ ] **3.5 hour implementation estimate acceptable**
- [ ] **Ready to proceed with full implementation**

---

**Once you approve, I will:**
1. Implement all specialists page integration (Phases 1-8 from previous doc)
2. Add favorites detection and badges
3. Add real-time premium modal for favorites
4. Test all 6 scenarios
5. Provide final verification checklist

Let me know if this covers everything or if you have questions! 🚀
