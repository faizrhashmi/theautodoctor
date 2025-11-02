# PHASE 2: UI WIRING — IMPLEMENTATION PLAN

**Date**: 2025-11-02
**Status**: 🛑 AWAITING APPROVAL
**Feature Flag**: `ENABLE_FAVORITES_PRIORITY=false` (default)
**Phase**: 2 of 4

---

## 🎯 Goal

Connect the favorites availability modal (already on dashboard) to SessionLauncher with backward-compatible props, enabling favorite context to flow from dashboard → SessionLauncher → Stripe metadata.

**Key Requirement**: Zero breaking changes. All new props optional with safe defaults.

---

## 📋 What Will Be Implemented

### 1. SessionLauncher Enhanced Props

**File**: `src/components/customer/SessionLauncher.tsx`

**Changes**: Add 3 optional props to existing interface

**Current Props** (existing, keep unchanged):
```typescript
interface SessionLauncherProps {
  accountType?: string
  hasUsedFreeSession?: boolean | null
  isB2CCustomer?: boolean
  availableMechanics: number
  workshopId?: string | null
  organizationId?: string | null
}
```

**New Props** (additive only):
```typescript
interface SessionLauncherProps {
  // ... existing props above

  // NEW: Favorites Priority Context (Phase 2)
  preferredMechanicId?: string | null
  preferredMechanicName?: string | null
  routingType?: 'broadcast' | 'priority_broadcast'
}
```

**Default Values** (preserve existing behavior):
```typescript
export default function SessionLauncher({
  // ... existing props
  preferredMechanicId = null,           // NEW: defaults to null
  preferredMechanicName = null,         // NEW: defaults to null
  routingType = 'broadcast',            // NEW: defaults to broadcast
}: SessionLauncherProps) {
```

**Backward Compatibility Guarantee**:
- ✅ All new props are **optional** (`?` in TypeScript)
- ✅ All new props have **safe defaults** (null or 'broadcast')
- ✅ If no favorite context passed → Works exactly as before
- ✅ Existing SessionLauncher usages continue to work without changes

---

### 2. Priority Banner (Conditional Rendering)

**Location**: Inside SessionLauncher component, above plan selection

**Implementation**:
```tsx
// NEW: Show priority banner only when favorite context present
{preferredMechanicName && routingType === 'priority_broadcast' && (
  <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4 mb-6">
    <div className="flex items-start gap-3">
      <Heart className="w-5 h-5 text-orange-400 fill-current flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="text-white font-semibold mb-1">
          Booking with {preferredMechanicName} (Priority)
        </h3>
        <p className="text-sm text-slate-300">
          {preferredMechanicName} will be notified first and has 10 minutes to accept.
          If unavailable, we'll automatically find you another qualified mechanic.
        </p>
      </div>
    </div>
  </div>
)}
```

**Visibility Logic**:
- Shows ONLY when `preferredMechanicName` is present AND `routingType === 'priority_broadcast'`
- Hidden when favorite context is null (existing behavior)
- Hidden when `routingType === 'broadcast'` (customer chose "find available now")

---

### 3. Stripe Metadata Enhancement

**File**: `src/components/customer/SessionLauncher.tsx`

**Current Metadata** (keep unchanged):
```typescript
const metadata = {
  intake_id: intakeId || null,
  customer_email: customerEmail,
  slot_id: slotId,
  // ... other existing fields
}
```

**Enhanced Metadata** (additive):
```typescript
const metadata = {
  // ... all existing fields above

  // NEW: Favorites Priority Context
  preferred_mechanic_id: preferredMechanicId || null,
  routing_type: routingType,
  priority_window_minutes: routingType === 'priority_broadcast' ? 10 : null,
}
```

**Conditional Logic**:
- `preferred_mechanic_id`: Included when present, null otherwise
- `routing_type`: Always included (defaults to 'broadcast')
- `priority_window_minutes`: Only set when priority mode (10 minutes window)

**Stripe Webhook Compatibility**:
- Existing fulfillment code ignores unknown metadata fields ✅
- Phase 3 will read these new fields
- If Phase 3 not deployed → Extra metadata fields are simply ignored (safe)

---

### 4. Dashboard Integration

**File**: `src/app/customer/dashboard/page.tsx`

**Current State** (already implemented, just needs wiring):
- ✅ Favorites section exists (lines 803-912)
- ✅ Availability modal exists (lines 1312-1379)
- ✅ `handleBookFavorite()` function exists (lines 403-427)
- ✅ `handleContinueWithFavorite()` function exists (lines 429-446)

**Changes Needed**: Pass favorite context to SessionLauncher

**Current SessionLauncher Usage** (existing):
```tsx
<SessionLauncher
  accountType={accountType}
  hasUsedFreeSession={hasUsedFreeSession}
  isB2CCustomer={isB2CCustomer}
  availableMechanics={availability?.available_count || 0}
  workshopId={workshopId}
  organizationId={organizationId}
/>
```

**Enhanced Usage** (add 3 new props):
```tsx
<SessionLauncher
  // ... all existing props above

  // NEW: Pass favorite context (when present)
  preferredMechanicId={selectedFavorite?.provider_id || null}
  preferredMechanicName={selectedFavorite?.provider_name || null}
  routingType={favoriteRoutingType || 'broadcast'}
/>
```

**New State Variable Needed**:
```typescript
// Add to dashboard component state
const [favoriteRoutingType, setFavoriteRoutingType] = useState<'broadcast' | 'priority_broadcast'>('broadcast')
```

**Update `handleContinueWithFavorite`**:
```typescript
const handleContinueWithFavorite = (routingType: 'priority_broadcast' | 'broadcast') => {
  setShowAvailabilityModal(false)
  setFavoriteRoutingType(routingType)  // NEW: Store routing type

  // Scroll to SessionLauncher (existing code)
  if (sessionLauncherRef.current) {
    sessionLauncherRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setShouldHighlight(true)
    setTimeout(() => setShouldHighlight(false), 2000)
  }
}
```

---

## 🔍 Backward Compatibility Analysis

### Test Case 1: Existing Dashboard Usage (No Favorites)
**Scenario**: Customer dashboard without clicking "Book Again"

**Before Phase 2**:
```tsx
<SessionLauncher
  accountType="individual"
  hasUsedFreeSession={false}
  // ... other props
/>
```

**After Phase 2**:
```tsx
<SessionLauncher
  accountType="individual"
  hasUsedFreeSession={false}
  // ... other props
  preferredMechanicId={null}      // NEW: defaults to null
  preferredMechanicName={null}    // NEW: defaults to null
  routingType="broadcast"         // NEW: defaults to broadcast
/>
```

**Result**:
- ✅ No banner shown (name is null)
- ✅ Metadata includes `routing_type: 'broadcast'` (default)
- ✅ Behavior identical to current production

---

### Test Case 2: Existing Intake Page Usage
**Scenario**: Other parts of the app that use SessionLauncher

**Current Code** (hypothetical):
```tsx
<SessionLauncher
  accountType={accountType}
  availableMechanics={10}
/>
```

**After Phase 2** (no changes needed):
- TypeScript won't complain (props are optional)
- Defaults apply automatically
- No visual changes
- No behavioral changes

**Result**: ✅ Zero breaking changes for existing usages

---

### Test Case 3: Favorite Context Present
**Scenario**: Customer clicks "Book Again", chooses priority

**Props Passed**:
```tsx
<SessionLauncher
  // ... existing props
  preferredMechanicId="123e4567-e89b-12d3-a456-426614174000"
  preferredMechanicName="John Smith"
  routingType="priority_broadcast"
/>
```

**Result**:
- ✅ Orange priority banner appears
- ✅ Banner says "Booking with John Smith (Priority)"
- ✅ Customer can still select any pricing tier (normal flow)
- ✅ Stripe metadata includes favorite context
- ✅ Rest of UI unchanged

---

## 📊 Files to Modify

| File | Changes | Lines Changed | Risk |
|------|---------|---------------|------|
| `SessionLauncher.tsx` | Add 3 optional props, banner, metadata | ~40 | 🟢 Low |
| `dashboard/page.tsx` | Add state variable, pass props | ~10 | 🟢 Low |

**Total**: 2 files, ~50 lines of additive code
**Breaking Changes**: 0

---

## ✅ Verification Checklist

### Pre-Implementation Verification
- [ ] ✅ Confirm `selectedFavorite` state exists in dashboard
- [ ] ✅ Confirm `handleContinueWithFavorite` function exists
- [ ] ✅ Confirm availability modal is functional
- [ ] ✅ Confirm SessionLauncher is imported in dashboard

### Implementation Verification
- [ ] Add 3 optional props to SessionLauncher interface
- [ ] Add default values in function signature
- [ ] Implement priority banner (conditional rendering)
- [ ] Enhance Stripe metadata object
- [ ] Add `favoriteRoutingType` state to dashboard
- [ ] Update `handleContinueWithFavorite` to set routing type
- [ ] Pass new props to SessionLauncher component

### Post-Implementation Testing

#### Test 1: Feature Flag OFF (Current State)
**Setup**: `ENABLE_FAVORITES_PRIORITY=false`

**Expected**:
- Dashboard loads normally ✅
- Favorites section visible (already exists) ✅
- "Book Again" button visible ✅
- Clicking "Book Again" → Availability modal appears ✅
- Modal shows mechanic online/offline status ✅
- Choosing "Continue" → Modal closes, scrolls to SessionLauncher ✅
- **BUT**: Priority banner does NOT show (flag OFF) ✅
- Stripe metadata includes `routing_type: 'broadcast'` ✅
- Session created normally (no priority logic yet - Phase 3) ✅

#### Test 2: Standard Booking (No Favorite)
**Setup**: Customer clicks "Start Session" button (not "Book Again")

**Expected**:
- SessionLauncher appears normally ✅
- No priority banner visible ✅
- Pricing tiers displayed normally ✅
- Select plan → Stripe checkout ✅
- Metadata does NOT include `preferred_mechanic_id` ✅
- Metadata includes `routing_type: 'broadcast'` (default) ✅

#### Test 3: Favorite Booking with Priority
**Setup**:
- Click "Book Again"
- Mechanic online
- Choose "Continue with [Mechanic]"

**Expected**:
- Modal closes ✅
- Scrolls to SessionLauncher ✅
- **Priority banner appears** ✅
- Banner text: "Booking with [Name] (Priority)" ✅
- Customer selects pricing tier ✅
- Proceed to Stripe ✅
- Stripe metadata includes:
  - `preferred_mechanic_id`: "[mechanic_uuid]" ✅
  - `routing_type`: "priority_broadcast" ✅
  - `priority_window_minutes`: 10 ✅

#### Test 4: Favorite Booking with Broadcast
**Setup**:
- Click "Book Again"
- Mechanic offline
- Choose "Find Available Mechanic Now"

**Expected**:
- Modal closes ✅
- Scrolls to SessionLauncher ✅
- **No priority banner** (routing_type is 'broadcast') ✅
- Customer selects pricing tier ✅
- Proceed to Stripe ✅
- Stripe metadata includes:
  - `preferred_mechanic_id`: null ✅
  - `routing_type`: "broadcast" ✅
  - `priority_window_minutes`: null ✅

#### Test 5: TypeScript Compilation
**Expected**:
```bash
npm run build
```
- ✅ No TypeScript errors
- ✅ No type mismatches
- ✅ All existing SessionLauncher usages compile without changes

#### Test 6: Console Errors
**Expected**:
- ✅ No errors in browser console
- ✅ No warnings about missing props
- ✅ No React warnings

---

## 🎨 Visual Examples

### Before (No Favorite Context)
```
┌────────────────────────────────────┐
│  Choose Your Service Plan:         │
│                                     │
│  ○ Free Diagnostic                 │
│  ○ Quick Chat - $9.99               │
│  ● Expert Video - $29.99            │
│                                     │
│  [Continue to Checkout]             │
└────────────────────────────────────┘
```

### After (With Priority Context)
```
┌────────────────────────────────────┐
│  ┌─────────────────────────────┐  │
│  │ ❤️ Booking with John Smith  │  │
│  │    (Priority)                │  │
│  │                              │  │
│  │ John will be notified first  │  │
│  │ and has 10 minutes to accept.│  │
│  │ If unavailable, we'll find   │  │
│  │ another mechanic.            │  │
│  └─────────────────────────────┘  │
│                                     │
│  Choose Your Service Plan:         │
│                                     │
│  ○ Free Diagnostic                 │
│  ○ Quick Chat - $9.99               │
│  ● Expert Video - $29.99            │
│                                     │
│  [Continue to Checkout]             │
└────────────────────────────────────┘
```

---

## 🔒 Safety Features

### 1. Type Safety
```typescript
// TypeScript will catch:
routingType: 'invalid'  // ❌ Error: Type '"invalid"' is not assignable

// TypeScript will allow:
routingType: 'broadcast'           // ✅ Valid
routingType: 'priority_broadcast'  // ✅ Valid
routingType: undefined             // ✅ Valid (uses default)
```

### 2. Null Safety
```typescript
// Safe null handling
preferredMechanicName && routingType === 'priority_broadcast' && (
  // Banner only renders when both conditions true
)

// Metadata null handling
preferred_mechanic_id: preferredMechanicId || null
// If undefined, becomes null (not undefined in JSON)
```

### 3. Default Fallbacks
```typescript
// Even if parent forgets to pass props
const { routingType = 'broadcast' } = props
// Always has a safe default value
```

---

## 🚦 Implementation Steps (Sequential)

### Step 1: Update SessionLauncher Interface
```typescript
// Add to existing interface
interface SessionLauncherProps {
  // ... existing props
  preferredMechanicId?: string | null
  preferredMechanicName?: string | null
  routingType?: 'broadcast' | 'priority_broadcast'
}
```

### Step 2: Add Default Values in Function Signature
```typescript
export default function SessionLauncher({
  accountType,
  hasUsedFreeSession,
  // ... existing params
  preferredMechanicId = null,
  preferredMechanicName = null,
  routingType = 'broadcast',
}: SessionLauncherProps) {
```

### Step 3: Add Priority Banner (After Component Header, Before Plan Selection)
```tsx
{/* Priority Booking Banner - NEW */}
{preferredMechanicName && routingType === 'priority_broadcast' && (
  <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4 mb-6">
    {/* Banner content */}
  </div>
)}
```

### Step 4: Enhance Stripe Metadata
Find the Stripe checkout creation code and add:
```typescript
metadata: {
  // ... existing metadata
  preferred_mechanic_id: preferredMechanicId || null,
  routing_type: routingType,
  priority_window_minutes: routingType === 'priority_broadcast' ? 10 : null,
}
```

### Step 5: Update Dashboard State
```typescript
// Add new state variable
const [favoriteRoutingType, setFavoriteRoutingType] = useState<'broadcast' | 'priority_broadcast'>('broadcast')
```

### Step 6: Update handleContinueWithFavorite
```typescript
const handleContinueWithFavorite = (routingType: 'priority_broadcast' | 'broadcast') => {
  setShowAvailabilityModal(false)
  setFavoriteRoutingType(routingType)  // Store routing type

  // Existing scroll logic...
}
```

### Step 7: Pass Props to SessionLauncher
```tsx
<SessionLauncher
  // ... existing props
  preferredMechanicId={selectedFavorite?.provider_id || null}
  preferredMechanicName={selectedFavorite?.provider_name || null}
  routingType={favoriteRoutingType}
/>
```

---

## 📝 Code Review Focus Points

### Before Approval, Verify:
1. **No breaking changes**: Existing SessionLauncher usages work unchanged
2. **Type safety**: All new props properly typed
3. **Default values**: All optional props have safe defaults
4. **Conditional rendering**: Banner only shows when appropriate
5. **Metadata structure**: No conflicts with existing fields
6. **State management**: Dashboard state properly updated
7. **UI/UX flow**: Smooth transition from modal → launcher
8. **Backward compatibility**: Works with and without favorite context

---

## 🎯 Success Criteria

### Must Pass All:
1. ✅ TypeScript compiles without errors
2. ✅ Dashboard loads without favorite context (standard flow)
3. ✅ Dashboard loads with favorite context (priority flow)
4. ✅ Priority banner visible when appropriate
5. ✅ Priority banner hidden when not appropriate
6. ✅ Stripe metadata includes favorite context when present
7. ✅ Stripe metadata excludes favorite context when absent
8. ✅ No console errors or warnings
9. ✅ No visual regressions in SessionLauncher
10. ✅ Smooth scroll animation works

---

## 🛑 STOP — AWAITING APPROVAL

**Phase 2 Status**: 📝 PLAN READY

**To Proceed**:
```
APPROVE PHASE 2 — PROCEED WITH IMPLEMENTATION
```

**If Adjustments Needed**:
Request changes and I'll update the plan before implementing.

---

**Phase 2 of 4** — UI wiring with zero breaking changes
