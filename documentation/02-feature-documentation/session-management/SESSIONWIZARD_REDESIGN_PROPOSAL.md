# SessionWizard Redesign Proposal
**Date**: January 9, 2025
**Goal**: Simplify SessionWizard for better UX without touching intake/waiver

---

## Problem Analysis

### Current Issues
1. **Too many steps** (Vehicle → Plan → Mechanic Type → Launch)
2. **Weird flow**: Choose mechanic type THEN see postal code/matching on same screen
3. **Vehicle addition bug**: New vehicle doesn't show immediately
4. **Cognitive overload**: Too much information at once
5. **Slow loading**: All data loads upfront

### What's Working Well
✅ /intake page (don't touch)
✅ Waiver flow (don't touch)
✅ Vehicle modal UI
✅ Plan selection cards

---

## Proposed New Flow: 2 Simple Steps

### Step 1: "What & Who" - Vehicle + Plan Selection (Combined)
**User thinks**: "What car needs help? What type of session do I want?"

```
┌─────────────────────────────────────────────────────────┐
│ Step 1 of 2: Select Vehicle & Session Type              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ WHICH VEHICLE?                                           │
│                                                          │
│ ┌──────────────┐ ┌──────────────┐                      │
│ │ 🚗 2024      │ │ 🚙 2019      │ [+ Add Vehicle]       │
│ │ Honda Civic  │ │ Toyota RAV4  │                      │
│ │ ✓ Selected   │ │              │                      │
│ └──────────────┘ └──────────────┘                      │
│                                                          │
│ WHAT TYPE OF SESSION?                                   │
│                                                          │
│ ┌────────────────────────────────────────────┐          │
│ │ ○ Standard Session ($49)                   │          │
│ │   General mechanic • 30 min video call     │          │
│ └────────────────────────────────────────────┘          │
│                                                          │
│ ┌────────────────────────────────────────────┐          │
│ │ ● Specialist Session ($59) +$10            │          │
│ │   Honda expert • 30 min video call         │          │
│ │   ✓ Recommended for your Honda Civic      │          │
│ └────────────────────────────────────────────┘          │
│                                                          │
│                       [Continue to Mechanic Selection →]│
└─────────────────────────────────────────────────────────┘
```

**Key UX Improvements**:
- ✅ Combines vehicle + plan (fewer steps)
- ✅ Smart recommendation: "Specialist recommended for your Honda"
- ✅ Clear, focused choices
- ✅ Fast: Only loads vehicles + plans (no mechanic data yet)

---

### Step 2: "Find Your Mechanic" - Smart Matching
**User thinks**: "Who will help me? When can they help?"

```
┌─────────────────────────────────────────────────────────┐
│ Step 2 of 2: Find Your Perfect Mechanic                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 📍 YOUR LOCATION (helps us find local mechanics)        │
│    [M5V 3A8_______]  📍 Toronto, ON detected           │
│                                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                          │
│ 🎯 BEST MATCH FOR YOU                                   │
│                                                          │
│ ┌─────────────────────────────────────────────────┐    │
│ │ ✓ Perfect Match Found!                          │    │
│ │                                                  │    │
│ │ [Photo] John Smith        ● Available now  [95] │    │
│ │         Honda Specialist               Match    │    │
│ │         ⭐ 4.8 • 12 yrs • 50+ sessions          │    │
│ │         📍 Toronto, ON (M5V) - Same area        │    │
│ │         🏆 Red Seal Certified                    │    │
│ │                                                  │    │
│ │         Why John?                                │    │
│ │         • Online right now                       │    │
│ │         • Honda specialist (your car)            │    │
│ │         • In your neighborhood (M5V)             │    │
│ │         • 4.8★ rated by 45 customers             │    │
│ │                                                  │    │
│ │ [✓ Continue with John]  [See 8 More Mechanics] │    │
│ └─────────────────────────────────────────────────┘    │
│                                                          │
│                                 [← Back] [Continue →]   │
└─────────────────────────────────────────────────────────┘
```

**If user clicks "See 8 More Mechanics"**:
```
┌─────────────────────────────────────────────────────────┐
│ Browse All Available Mechanics (9 found)                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 🔍 [Search by name...] [⭐ Favorites Only] [Sort: Match]│
│                                                          │
│ ┌─────────────────────────────────────────────────┐    │
│ │ [Photo] John Smith ● Online            [95] ✓   │    │
│ │         Honda specialist • ⭐ 4.8 • 12 yrs      │    │
│ │         📍 Toronto (M5V) • 🏆 Red Seal          │    │
│ └─────────────────────────────────────────────────┘    │
│                                                          │
│ ┌─────────────────────────────────────────────────┐    │
│ │ [Photo] Sarah Chen 🟡 Away (2m ago)    [87]     │    │
│ │         Honda specialist • ⭐ 4.9 • 15 yrs      │    │
│ │         📍 Mississauga (L5B) • 🏆 Red Seal      │    │
│ └─────────────────────────────────────────────────┘    │
│                                                          │
│ ┌─────────────────────────────────────────────────┐    │
│ │ [Photo] Mike Lee ⚫ Offline (1h ago)   [75]     │    │
│ │         General mechanic • ⭐ 4.6 • 8 yrs       │    │
│ │         📍 Toronto (M4B)                         │    │
│ └─────────────────────────────────────────────────┘    │
│                                                          │
│ [+6 more]                                                │
│                                                          │
│                       [← Back to Best Match] [Continue] │
└─────────────────────────────────────────────────────────┘
```

**Key UX Improvements**:
- ✅ Postal code first (sets context for matching)
- ✅ Auto-match shows immediately (fast path)
- ✅ "See more" is optional (power users only)
- ✅ Clear status indicators (online/away/offline)
- ✅ Only loads mechanic data on Step 2 (performance)

---

## Comparison: Before vs After

### Before (Current)
```
Step 1: Vehicle
Step 2: Plan
Step 3: Mechanic Type (Standard/Specialist)
        THEN postal code appears
        THEN matching happens
        ↓
Navigate to /intake
```
**Problems**:
- 3 separate steps for related choices
- Mechanic type choice happens before seeing who's available
- Postal code + matching feel tacked on

### After (Proposed)
```
Step 1: Vehicle + Plan (combined, smart recommendation)
Step 2: Location → Auto-match → Optional browse
        ↓
Navigate to /intake
```
**Benefits**:
- 2 clear steps
- See best match immediately
- Postal code → matching feels natural
- Faster loading (lazy load mechanics)

---

## Technical Implementation

### Step 1: Combine Vehicle + Plan Selection

**Logic Changes**:
```typescript
// Smart plan recommendation based on vehicle
const recommendedPlan = useMemo(() => {
  if (!selectedVehicle) return null

  const vehicle = vehicles.find(v => v.id === selectedVehicle)
  if (!vehicle) return null

  // Recommend specialist if premium brand
  const premiumBrands = ['BMW', 'Mercedes', 'Audi', 'Tesla', 'Porsche', 'Lexus']
  if (premiumBrands.includes(vehicle.make)) {
    return 'specialist'
  }

  return 'standard'
}, [selectedVehicle, vehicles])

// Show recommendation badge
{plan.slug === recommendedPlan && (
  <div className="text-sm text-orange-400">
    ✓ Recommended for your {vehicle.make}
  </div>
)}
```

**State Management**:
```typescript
const [currentStep, setCurrentStep] = useState(1) // Only 2 steps now
const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
const [selectedPlan, setSelectedPlan] = useState<string>('standard')

// Derived state
const mechanicType = selectedPlan === 'specialist' ? 'specialist' : 'standard'

// No need for separate mechanicType state!
```

**UI Layout**:
```typescript
const renderStep1 = () => (
  <div className="space-y-6">
    {/* Vehicle Selection */}
    <div>
      <h3 className="text-lg font-bold text-white mb-3">Which Vehicle?</h3>
      <div className="grid grid-cols-2 gap-3">
        {vehicles.map(vehicle => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            selected={selectedVehicle === vehicle.id}
            onSelect={setSelectedVehicle}
          />
        ))}
        <AddVehicleButton onClick={() => setShowAddVehicleModal(true)} />
      </div>
    </div>

    {/* Plan Selection (only show if vehicle selected) */}
    {selectedVehicle && (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <h3 className="text-lg font-bold text-white mb-3">
          What Type of Session?
        </h3>
        <div className="space-y-3">
          {availablePlans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={selectedPlan === plan.slug}
              recommended={plan.slug === recommendedPlan}
              onSelect={() => setSelectedPlan(plan.slug)}
            />
          ))}
        </div>
      </div>
    )}

    {/* Continue button */}
    {selectedVehicle && selectedPlan && (
      <button onClick={() => setCurrentStep(2)}>
        Continue to Mechanic Selection →
      </button>
    )}
  </div>
)
```

---

### Step 2: Location + Auto-Match

**Load mechanics only on Step 2**:
```typescript
// Fetch top match when reaching Step 2
useEffect(() => {
  if (currentStep === 2) {
    fetchTopMatchedMechanic()
  }
}, [currentStep])

const fetchTopMatchedMechanic = async () => {
  setLoadingTopMatch(true)

  const vehicle = vehicles.find(v => v.id === selectedVehicle)
  const params = new URLSearchParams()

  // Determine request type based on plan
  params.set('request_type', selectedPlan === 'specialist' ? 'brand_specialist' : 'general')

  if (selectedPlan === 'specialist' && vehicle) {
    params.set('requested_brand', vehicle.make)
  }

  if (customerPostalCode) {
    params.set('customer_postal_code', customerPostalCode)
  }

  params.set('customer_country', 'Canada')
  params.set('limit', '1') // Only top match

  const response = await fetch(`/api/mechanics/available?${params}`)
  const data = await response.json()

  if (data.mechanics?.length > 0) {
    setTopMatchedMechanic(data.mechanics[0])
    setSelectedMechanicId(data.mechanics[0].id) // Auto-select
  }

  setLoadingTopMatch(false)
}
```

**UI Layout**:
```typescript
const renderStep2 = () => (
  <div className="space-y-6">
    {/* Postal Code Input */}
    <div>
      <label className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
        📍 Your Location
        <span className="text-slate-400 text-xs font-normal">
          (helps us find local mechanics)
        </span>
      </label>
      <input
        type="text"
        placeholder="M5V 3A8"
        value={customerPostalCode}
        onChange={(e) => setCustomerPostalCode(e.target.value.toUpperCase())}
        maxLength={7}
        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg"
      />
    </div>

    {/* Auto-Match Preview */}
    {loadingTopMatch ? (
      <LoadingMechanicCard />
    ) : topMatchedMechanic ? (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          🎯 Best Match For You
        </h3>

        <div className="border-2 border-green-500 bg-green-500/10 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-green-500/20">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h4 className="font-bold text-white text-lg">Perfect Match Found!</h4>
              <p className="text-sm text-green-300">We found the best mechanic for your needs</p>
            </div>
          </div>

          <MechanicSelectionCard
            mechanic={topMatchedMechanic}
            isSelected={true}
            onSelect={() => {}}
            showMatchScore={true}
            compact={false}
          />

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleContinue}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-bold"
            >
              ✓ Continue with {topMatchedMechanic.name}
            </button>

            <button
              onClick={() => setShowMechanicBrowser(true)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium"
            >
              See {totalAvailableMechanics - 1} More
            </button>
          </div>
        </div>
      </div>
    ) : (
      <NoMechanicsAvailable />
    )}

    {/* Mechanic Browser Modal (overlay) */}
    {showMechanicBrowser && (
      <MechanicBrowserModal
        mechanics={availableMechanics}
        selectedId={selectedMechanicId}
        onSelect={setSelectedMechanicId}
        onClose={() => setShowMechanicBrowser(false)}
        onContinue={handleContinue}
      />
    )}
  </div>
)
```

---

## Fix: Vehicle Addition Bug

### Issue
After adding vehicle, it doesn't show in the list immediately.

### Root Cause Analysis
Looking at the code (line 323), `await fetchVehicles()` is called, which should refresh the list. The issue might be:

1. **Race condition**: State update happens before fetch completes
2. **API caching**: `/api/customer/vehicles` returns stale data
3. **Optimistic update missing**: Should add vehicle to state immediately

### Solution: Optimistic Update

```typescript
const handleAddVehicle = useCallback(async () => {
  if (!newVehicle.year || !newVehicle.make || !newVehicle.model) {
    return
  }

  setAddingVehicle(true)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: insertedVehicle, error } = await supabase
      .from('vehicles')
      .insert({
        user_id: user.id,
        year: newVehicle.year,
        make: newVehicle.make,
        brand: newVehicle.make,
        model: newVehicle.model,
        vin: newVehicle.vin || null,
        is_primary: vehicles.length === 0,
      })
      .select()
      .single()

    if (error) throw error

    // ✅ FIX: Optimistic update - add vehicle to state immediately
    if (insertedVehicle) {
      setVehicles(prev => [...prev, insertedVehicle])
      setSelectedVehicle(insertedVehicle.id)
    }

    // Close modal and reset form
    setShowAddVehicleModal(false)
    setNewVehicle({ year: '', make: '', model: '', vin: '' })

    // ✅ OPTIONAL: Refresh in background to ensure sync
    fetchVehicles().catch(console.error)

  } catch (error) {
    console.error('[SessionWizard] Error adding vehicle:', error)
    // Show error toast
  } finally {
    setAddingVehicle(false)
  }
}, [newVehicle, vehicles.length, supabase])
```

**Also verify** that the vehicle shows on `/customer/vehicles` page by checking if that page has cache invalidation.

---

## Performance Optimizations

### 1. Lazy Load Step 2 Components
```typescript
const MechanicSelectionCard = lazy(() => import('./MechanicSelectionCard'))
const MechanicBrowserModal = lazy(() => import('./MechanicBrowserModal'))

// Only load when Step 2 is reached
{currentStep === 2 && (
  <Suspense fallback={<LoadingMechanicCard />}>
    <MechanicSelectionCard ... />
  </Suspense>
)}
```

### 2. Debounce Postal Code Search
```typescript
import { useDebounce } from '@/hooks/useDebounce'

const debouncedPostalCode = useDebounce(customerPostalCode, 500)

useEffect(() => {
  if (currentStep === 2 && debouncedPostalCode) {
    fetchTopMatchedMechanic()
  }
}, [currentStep, debouncedPostalCode])
```

### 3. Prefetch Plans Data
Already done via `PlansContext` - good!

### 4. Memoize Recommended Plan
```typescript
const recommendedPlan = useMemo(() => {
  // ... calculation
}, [selectedVehicle, vehicles])
```

---

## Mobile Responsiveness

### Key Adjustments
```typescript
// Step 1: Stack vehicle cards on mobile
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  {vehicles.map(...)}
</div>

// Step 2: Full-width mechanic card on mobile
<div className="w-full">
  <MechanicSelectionCard compact={isMobile} />
</div>

// Buttons: Stack on mobile
<div className="flex flex-col sm:flex-row gap-3">
  <button className="w-full sm:w-auto">Continue</button>
  <button className="w-full sm:w-auto">See More</button>
</div>
```

---

## Summary of Changes

### What Changes
1. ✅ **Combine Steps 1 & 2** → Vehicle + Plan in one step
2. ✅ **Smart Recommendation** → "Specialist recommended for your BMW"
3. ✅ **Postal Code First** → Sets context before matching
4. ✅ **Auto-Match Preview** → Show best mechanic immediately
5. ✅ **Optional Browse** → "See more" button for power users
6. ✅ **Fix Vehicle Bug** → Optimistic update when adding vehicle
7. ✅ **Lazy Loading** → Only load mechanic data on Step 2
8. ✅ **Better Status Indicators** → Online/Away/Offline badges

### What Stays the Same
✅ /intake page (unchanged)
✅ Waiver flow (unchanged)
✅ API endpoints (only enhance `/api/mechanics/available`)
✅ Database schema (no changes needed)

### Impact
- **User Experience**: 🚀 Much better (2 steps instead of 3, clearer flow)
- **Performance**: 🚀 Faster (lazy load mechanics)
- **Code Complexity**: ➡️ Same (just reorganized)
- **Breaking Changes**: ❌ None (only internal refactor)

---

## Migration Plan

### Phase 1: Fix Vehicle Bug (Quick Win)
- Add optimistic update to vehicle addition
- Test on both SessionWizard and /customer/vehicles page
- **Time**: 30 minutes

### Phase 2: Reorganize Steps 1-2
- Combine vehicle + plan into Step 1
- Move mechanic selection to Step 2
- Test flow end-to-end
- **Time**: 2-3 hours

### Phase 3: Add Auto-Match Preview
- Implement postal code input
- Add top match preview card
- Add "See more" browse option
- **Time**: 4-6 hours

### Phase 4: Polish & Optimize
- Add lazy loading
- Add debouncing
- Mobile responsiveness testing
- **Time**: 2-3 hours

**Total Estimated Time**: 1-2 days

---

## Next Steps

Would you like me to:
1. **Fix the vehicle addition bug first** (quick win)
2. **Start implementing the 2-step redesign**
3. **Create a prototype/mockup** to review first
4. **Something else?**

Let me know and I'll proceed!
