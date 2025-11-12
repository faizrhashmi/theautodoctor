# IMPLEMENTATION PLAN: CRITICAL FIXES - November 12, 2025

**Date:** November 12, 2025
**Status:** 📋 READY FOR REVIEW & APPROVAL
**Total Estimated Time:** 21.5 hours (3 days)
**Related Analysis:** [CRITICAL_FIXES_2025-11-12.md](CRITICAL_FIXES_2025-11-12.md)

---

## EXECUTIVE SUMMARY

This plan outlines the step-by-step implementation of 10 critical fixes identified in today's audit. Issues are organized by priority and day, with clear acceptance criteria and testing requirements.

**Priority Breakdown:**
- 🔴 **CRITICAL (3 issues):** Favorites, Pricing, Reviews - 9 hours
- 🟡 **HIGH (2 issues):** Mechanic View, Thank You Page - 4.25 hours
- 🟢 **MEDIUM (5 issues):** Polish & UX improvements - 8.25 hours

---

## DAY 1: CRITICAL FIXES (7 HOURS)

### Issue #2: Fix Favorites System 🔴
**Priority:** CRITICAL
**Time:** 2.5 hours
**Status:** ❌ Not Started

#### Problem
- Customers cannot add mechanics to favorites
- Two conflicting API routes causing errors
- AddToFavorites component cannot remove favorites
- Missing TypeScript types

#### Implementation Steps

**Step 1: Fix AddToFavorites Remove Functionality (30 min)**
- [ ] Open `src/components/customer/AddToFavorites.tsx`
- [ ] Replace lines 29-35 alert with actual DELETE call
- [ ] Add mechanic_name to component props
- [ ] Test remove functionality

**Code Change:**
```tsx
// File: src/components/customer/AddToFavorites.tsx
// Lines 29-35 - Replace with:

const handleRemove = async () => {
  const response = await fetch(
    `/api/customer/mechanics/favorites?mechanic_id=${providerId}`,
    { method: 'DELETE' }
  )

  if (response.ok) {
    setIsFavorite(false)
  } else {
    const error = await response.json()
    alert(`Failed to remove from favorites: ${error.error}`)
  }
}
```

**Step 2: Migrate AddToFavorites to Route 2 (30 min)**
- [ ] Update POST endpoint from `/api/customer/favorites` to `/api/customer/mechanics/favorites`
- [ ] Change request body schema
- [ ] Test add functionality

**Code Change:**
```tsx
// File: src/components/customer/AddToFavorites.tsx
// Lines 38-43 - Replace with:

const handleAdd = async () => {
  const response = await fetch('/api/customer/mechanics/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mechanic_id: providerId,
      mechanic_name: providerName
    })
  })

  if (response.ok) {
    setIsFavorite(true)
  } else {
    const error = await response.json()
    alert(`Failed to add to favorites: ${error.error}`)
  }
}
```

**Step 3: Regenerate TypeScript Types (10 min)**
- [ ] Run: `npx supabase gen types typescript --linked > src/types/supabase.ts`
- [ ] Verify customer_favorites table is now typed
- [ ] Commit updated types

**Step 4: Remove @ts-ignore Comments (15 min)**
- [ ] Open `src/app/api/customer/mechanics/favorites/route.ts`
- [ ] Remove all 4 `@ts-ignore` comments (lines 40, 153, 169, 230)
- [ ] Verify TypeScript compiles without errors

**Step 5: Unified Error Handling (30 min)**
- [ ] Create `src/lib/apiErrors.ts` utility
- [ ] Update MechanicCard.tsx error handling
- [ ] Update MyMechanicsDashboardCard.tsx error handling
- [ ] Update AddToFavorites.tsx error handling

**Step 6: Deprecate Old Route (15 min)**
- [ ] Update `src/app/api/customer/favorites/route.ts` to return 410 Gone
- [ ] Add migration notice in response

#### Acceptance Criteria
- [ ] Can add mechanic to favorites from MechanicCard
- [ ] Can remove mechanic from favorites (both components)
- [ ] Favorites appear in My Mechanics page
- [ ] No TypeScript errors
- [ ] Consistent error messages across all components
- [ ] Only one API route used (`/api/customer/mechanics/favorites`)

#### Testing Checklist
```bash
# Manual Tests
1. Navigate to /customer/book-session
2. Select vehicle and plan
3. On mechanic step, click "Add to Favorites" on a mechanic
4. Verify success message appears
5. Navigate to /customer/my-mechanics
6. Verify mechanic appears in favorites list
7. Click "Remove from Favorites"
8. Verify mechanic removed
9. Check browser console for errors (should be none)
```

---

### Issue #1: Fix Specialist Pricing & Wizard Intelligence 🔴
**Priority:** CRITICAL
**Time:** 2.25 hours
**Status:** ❌ Not Started

#### Problem
- Specialist page shows hardcoded "$29.99+" instead of dynamic pricing
- Free plan doesn't clear specialist premium
- Vehicle-specialist mismatch not detected
- Dashboard back button doesn't warn about unsaved progress

#### Implementation Steps

**Step 1: Fix Hardcoded Pricing Display (30 min)**
- [ ] Create new API route: `src/app/api/brands/pricing-range/route.ts`
- [ ] Update `src/app/customer/specialists/page.tsx` to fetch dynamic pricing
- [ ] Replace hardcoded $29.99+ with dynamic range

**New File:** `src/app/api/brands/pricing-range/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('brand_specializations')
    .select('specialist_premium')
    .order('specialist_premium', { ascending: true })

  if (!data || data.length === 0) {
    return NextResponse.json({ min: 15, max: 50 })
  }

  const min = data[0].specialist_premium
  const max = data[data.length - 1].specialist_premium

  return NextResponse.json({ min, max })
}
```

**Code Change:** `src/app/customer/specialists/page.tsx`
```tsx
// Add state (after line 22)
const [pricingRange, setPricingRange] = useState<{ min: number; max: number } | null>(null)

// Add useEffect (after line 42)
useEffect(() => {
  async function fetchPricingRange() {
    const response = await fetch('/api/brands/pricing-range')
    const data = await response.json()
    setPricingRange(data)
  }
  fetchPricingRange()
}, [])

// Replace lines 127-133
<div className="text-2xl sm:text-3xl font-bold text-orange-400 mb-1">
  {pricingRange
    ? `$${pricingRange.min.toFixed(2)} - $${pricingRange.max.toFixed(2)}`
    : 'Loading...'
  }
</div>
<div className="text-xs sm:text-sm text-slate-400">Specialist Premium Range</div>
```

**Step 2: Free Plan Clears Specialist Premium (15 min)**
- [ ] Update `src/components/customer/booking-steps/PlanStep.tsx`
- [ ] Modify handlePlanSelect function (lines 108-119)

**Code Change:**
```tsx
// File: src/components/customer/booking-steps/PlanStep.tsx
// Lines 108-119 - Update:

const handlePlanSelect = (planId: string) => {
  const planData = plans.find((p) => p.id === planId || p.slug === planId)
  if (!planData) return

  setSelectedPlan(planId)

  // ✅ FIX: If free plan selected, clear specialist premium
  const isFree = planId === 'free' || planData.priceValue === 0

  onComplete({
    planType: planId,
    planPrice: planData.priceValue,
    specialistPremium: isFree ? 0 : specialistPremium,
    specialistPremiumAccepted: isFree ? false : acceptedSpecialistPremium,
  })
}
```

**Step 3: Vehicle-Specialist Mismatch Detection (45 min)**
- [ ] Update `src/components/customer/BookingWizard.tsx`
- [ ] Add useEffect to detect vehicle-brand mismatch
- [ ] Add confirmation dialog

**Code Change:**
```tsx
// File: src/components/customer/BookingWizard.tsx
// Add after line 174 (after existing useEffect):

useEffect(() => {
  // Detect vehicle-specialist brand mismatch
  if (wizardData.vehicleId && wizardData.requestedBrand && wizardData.vehicleData) {
    const vehicleMake = wizardData.vehicleData.make?.toLowerCase()
    const requestedBrand = wizardData.requestedBrand.toLowerCase()

    if (vehicleMake && vehicleMake !== requestedBrand) {
      const shouldReset = window.confirm(
        `⚠️ Mismatch Detected\n\n` +
        `You selected a ${wizardData.vehicleData.make} vehicle but requested a ${wizardData.requestedBrand} specialist.\n\n` +
        `Would you like to:\n` +
        `• YES: Reset to standard mechanic search\n` +
        `• NO: Continue with ${wizardData.requestedBrand} specialist (they may decline)`
      )

      if (shouldReset) {
        setWizardData(prev => ({
          ...prev,
          mechanicType: 'standard',
          requestedBrand: null,
          mechanicId: null,
          mechanicName: '',
          specialistPremium: 0,
          specialistPremiumAccepted: false
        }))
        setCompletedSteps(prev => prev.filter(s => s <= 1))
      }
    }
  }
}, [wizardData.vehicleId, wizardData.vehicleData, wizardData.requestedBrand])
```

**Step 4: Dashboard Navigation Protection (15 min)**
- [ ] Update handleBack function in BookingWizard.tsx (lines 387-395)

**Code Change:**
```tsx
// File: src/components/customer/BookingWizard.tsx
// Lines 387-395 - Replace:

const handleBack = () => {
  if (currentStep === 1) {
    // Check for unsaved progress
    const hasProgress = wizardData.vehicleId || wizardData.planType || wizardData.mechanicId

    if (hasProgress) {
      const confirmed = window.confirm(
        'You have selections in progress. They will be saved if you return later.\n\n' +
        'Continue to dashboard?'
      )
      if (!confirmed) return
    }

    router.push('/customer/dashboard')
  } else {
    setCurrentStep(Math.max(1, currentStep - 1))
  }
}
```

**Step 5: Mechanic Change Complete Reset (30 min)**
- [ ] Update `src/components/customer/booking-steps/MechanicStep.tsx`
- [ ] Enhance change mechanic handler

**Code Change:**
```tsx
// File: src/components/customer/booking-steps/MechanicStep.tsx
// Add handler around line 250:

const handleMechanicChange = () => {
  const previousType = wizardData.mechanicType
  const newType = 'standard' // or whatever new type

  if (previousType === 'brand_specialist' && newType !== 'brand_specialist') {
    const confirmed = window.confirm(
      '⚠️ Changing from Brand Specialist\n\n' +
      'Switching to a standard mechanic will reset your progress and remove the specialist premium.\n\n' +
      'Continue?'
    )

    if (confirmed) {
      // Complete reset
      sessionStorage.removeItem('bookingWizardData')
      sessionStorage.removeItem('bookingWizardCompletedSteps')
      sessionStorage.setItem('bookingWizardStep', '1')
      router.push('/customer/book-session')
    }
  }
}
```

#### Acceptance Criteria
- [ ] Specialist page shows dynamic pricing range from database
- [ ] Free plan automatically clears specialist premium
- [ ] Vehicle-brand mismatch shows warning dialog
- [ ] Dashboard back button warns if progress exists
- [ ] Mechanic type change triggers appropriate reset
- [ ] Specialist premium reflected in all pricing summaries

#### Testing Checklist
```bash
# Test 1: Dynamic Pricing
1. Navigate to /customer/specialists
2. Verify pricing shows range (e.g., "$15.00 - $50.00")
3. Check network tab - should call /api/brands/pricing-range

# Test 2: Free Plan Clears Premium
1. Start booking flow from specialists (select Audi)
2. Complete vehicle selection
3. On plan step, select "Free Session"
4. Verify specialist premium is NOT shown in summary
5. Select "Standard" plan
6. Verify specialist premium IS shown

# Test 3: Vehicle Mismatch
1. Select Audi specialist from specialists page
2. On vehicle step, select a BMW vehicle
3. Verify alert appears warning about mismatch
4. Click YES to reset
5. Verify specialist selection cleared

# Test 4: Dashboard Navigation
1. Select vehicle and plan in wizard
2. Click back button on step 1
3. Verify confirmation dialog appears
4. Click Cancel - should stay in wizard
5. Click OK - should navigate to dashboard
```

---

### Issue #4: Add Mechanic Request View Details 🟡
**Priority:** HIGH
**Time:** 2.5 hours
**Status:** ❌ Not Started

#### Problem
- Mechanics cannot view full request details before accepting
- Missing "View Details" button on request cards
- Attachments not accessible before accepting session

#### Implementation Steps

**Step 1: Add View Button to SessionCard (30 min)**
- [ ] Open `src/components/sessions/SessionCard.tsx`
- [ ] Add onViewDetails prop
- [ ] Add View Details button (lines 277-295)

**Code Change:**
```tsx
// File: src/components/sessions/SessionCard.tsx
// Add to interface (line 15):
interface SessionCardProps {
  // ... existing props
  onViewDetails?: (sessionId: string) => void
  showViewButton?: boolean
}

// Add button before Accept button (line 278):
{showViewButton && onViewDetails && (
  <button
    onClick={(e) => {
      e.stopPropagation()
      onViewDetails(session.id)
    }}
    className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
  >
    <Eye className="h-4 w-4" />
    View Details
  </button>
)}
```

**Step 2: Update Mechanic Dashboard (20 min)**
- [ ] Open `src/app/mechanic/dashboard/page.tsx`
- [ ] Add state for modal (after line 60)
- [ ] Update SessionCard usage (line 702-717)
- [ ] Add modal component (end of return statement)

**Code Change:**
```tsx
// File: src/app/mechanic/dashboard/page.tsx
// Add state (after line 60):
const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
const [showDetailsModal, setShowDetailsModal] = useState(false)

// Update SessionCard (lines 702-717):
<SessionCard
  key={session.id}
  session={session}
  onAccept={handleAcceptRequest}
  onViewDetails={(id) => {
    setSelectedSessionId(id)
    setShowDetailsModal(true)
  }}
  showViewButton={true}
/>

// Add modal at end (before closing main div):
{showDetailsModal && selectedSessionId && (
  <MechanicSessionDetailsModal
    sessionId={selectedSessionId}
    onClose={() => {
      setShowDetailsModal(false)
      setSelectedSessionId(null)
    }}
  />
)}
```

**Step 3: Enhance Attachments Section (45 min)**
- [ ] Open `src/components/mechanic/MechanicSessionDetailsModal.tsx`
- [ ] Update attachments section (lines 414-444)
- [ ] Add preview modal
- [ ] Add file type icons

**Code Change:**
```tsx
// File: src/components/mechanic/MechanicSessionDetailsModal.tsx
// Add imports:
import { FileImage, FileVideo, FileText, Download, Eye, X } from 'lucide-react'

// Add state:
const [previewFile, setPreviewFile] = useState<any | null>(null)

// Replace lines 414-444 with enhanced version:
{session.files && session.files.length > 0 && (
  <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
      <Paperclip className="h-4 w-4" />
      Customer Attachments ({session.files.length})
    </h3>
    <div className="space-y-2">
      {session.files.map((file: any, index: number) => {
        const isImage = file.type?.startsWith('image/')
        const isVideo = file.type?.startsWith('video/')

        return (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              {isImage && <FileImage className="h-5 w-5 text-blue-400" />}
              {isVideo && <FileVideo className="h-5 w-5 text-purple-400" />}
              {!isImage && !isVideo && <FileText className="h-5 w-5 text-slate-400" />}

              <div>
                <div className="text-white text-sm font-medium">{file.name}</div>
                <div className="text-slate-400 text-xs">
                  {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(isImage || isVideo) && (
                <button
                  onClick={() => setPreviewFile(file)}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  title="Preview"
                >
                  <Eye className="h-4 w-4 text-white" />
                </button>
              )}

              <a
                href={file.url}
                download={file.name}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="h-4 w-4 text-white" />
              </a>
            </div>
          </div>
        )
      })}
    </div>
  </div>
)}

{/* Preview Modal */}
{previewFile && (
  <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
    <div className="relative max-w-5xl max-h-[90vh]">
      <button
        onClick={() => setPreviewFile(null)}
        className="absolute -top-12 right-0 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg"
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {previewFile.type?.startsWith('image/') && (
        <img
          src={previewFile.url}
          alt={previewFile.name}
          className="max-w-full max-h-[85vh] rounded-lg"
        />
      )}

      {previewFile.type?.startsWith('video/') && (
        <video
          src={previewFile.url}
          controls
          className="max-w-full max-h-[85vh] rounded-lg"
        />
      )}
    </div>
  </div>
)}

// Add helper function at component level:
function formatFileSize(bytes: number): string {
  if (!bytes) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
```

**Step 4: Verify API Returns Files (15 min)**
- [ ] Check `src/app/api/mechanic/sessions/[sessionId]/route.ts`
- [ ] Ensure files are included in response
- [ ] Test API returns file data

**Code Change (if needed):**
```tsx
// File: src/app/api/mechanic/sessions/[sessionId]/route.ts
// Update query (lines 40-60):

const { data: session } = await supabaseAdmin
  .from('sessions')
  .select(`
    *,
    customer:profiles!sessions_customer_user_id_fkey(full_name, email, phone),
    vehicle:vehicles(*),
    files:session_files(*)
  `)
  .eq('id', sessionId)
  .single()
```

#### Acceptance Criteria
- [ ] "View Details" button appears on all request cards in dashboard
- [ ] Clicking View opens modal with full session details
- [ ] Modal shows complete concern description
- [ ] All attachments listed with file info
- [ ] Can preview images/videos
- [ ] Can download any attachment
- [ ] Modal can be closed without accepting session

#### Testing Checklist
```bash
# Test 1: View Button Appears
1. Login as mechanic
2. Navigate to /mechanic/dashboard
3. Verify "View Details" button on each request card

# Test 2: Modal Opens
1. Click "View Details" on any request
2. Verify modal opens with full details
3. Check concern description is complete
4. Verify customer and vehicle info shown

# Test 3: Attachments
1. Find session with attachments
2. Click "View Details"
3. Verify all files listed
4. Click preview on image - should open preview
5. Click download - should download file
6. Close preview modal
7. Close details modal

# Test 4: Accept Still Works
1. View details of a session
2. Close modal without accepting
3. Click "Accept Request" button
4. Verify session accepted normally
```

---

## DAY 2: HIGH PRIORITY + REVIEWS (6 HOURS)

### Issue #5: Fix Thank You Page Information 🟡
**Priority:** HIGH
**Time:** 1.75 hours
**Status:** ❌ Not Started

#### Problem
- Text says "other mechanics can join" (only booked mechanic should join)
- Price not displayed dynamically
- Mechanic invite link wording is misleading

#### Implementation Steps

**Step 1: Fix Misleading Copy (10 min)**
- [ ] Open `src/app/thank-you/page.tsx`
- [ ] Update line 180-182

**Code Change:**
```tsx
// File: src/app/thank-you/page.tsx
// Lines 180-182 - Replace:

<li className="flex items-start gap-3">
  <span className="mt-1 h-2 w-2 rounded-full bg-orange-300" />
  {dbSessionId && preferredMechanicId
    ? "Your selected mechanic will join the session when it starts. You'll receive a notification when they're ready."
    : "When you're ready, click 'Start session now' to enter the workspace. You can invite a trusted mechanic using the link below."
  }
</li>
```

**Step 2: Dynamic Price Display (30 min)**
- [ ] Add final_price to session query
- [ ] Calculate displayAmount correctly
- [ ] Handle free/trial sessions

**Code Change:**
```tsx
// File: src/app/thank-you/page.tsx
// Lines 51-65 - Update session query:

const { data: sessionRecord } = await supabaseAdmin
  .from('sessions')
  .select('id, type, plan, final_price')
  .eq('id', directSessionId)
  .maybeSingle()

if (sessionRecord) {
  dbSessionId = sessionRecord.id
  const resolvedType = ((sessionRecord.type as SessionType) ?? sessionType ?? 'chat') as SessionType
  sessionType = resolvedType
  sessionRoute = `${ROUTE_BY_TYPE[resolvedType]}/${sessionRecord.id}`
  plan = plan ?? (sessionRecord.plan as string | null) ?? plan

  // Get price from session
  if (sessionRecord.final_price) {
    amountTotal = sessionRecord.final_price * 100 // Convert to cents
  }
}

// Lines 142-144 - Update display calculation:
const displayAmount = amountTotal
  ? `$${(amountTotal / 100).toFixed(2)}`
  : planName?.includes('Complimentary') || planName?.includes('Trial')
  ? '$0.00'
  : null

// Lines 154-163 - Update display:
<p className="mt-3 text-sm text-slate-300">
  {displayAmount !== null ? (
    <>
      {amountTotal && amountTotal > 0 ? 'Payment confirmed for ' : 'Booked '}
      <span className="font-semibold text-white">{planName}</span>
      {displayAmount && ` - ${displayAmount}`}.
      We have emailed your {amountTotal && amountTotal > 0 ? 'receipt and ' : ''}session details.
    </>
  ) : (
    <>
      Booked <span className="font-semibold text-white">{planName}</span>.
      We have emailed your session details.
    </>
  )}
</p>
```

**Step 3: Clarify Mechanic Invite Section (25 min)**
- [ ] Query for preferred mechanic info
- [ ] Update section copy based on context

**Code Change:**
```tsx
// File: src/app/thank-you/page.tsx
// Add after line 65:

let preferredMechanicId: string | null = null
let preferredMechanicName: string | null = null

if (dbSessionId && supabaseAdmin) {
  const { data: participants } = await supabaseAdmin
    .from('session_participants')
    .select(`
      mechanic_id,
      role,
      mechanic:profiles!session_participants_mechanic_id_fkey(full_name)
    `)
    .eq('session_id', dbSessionId)
    .eq('role', 'mechanic')
    .limit(1)
    .maybeSingle()

  if (participants) {
    preferredMechanicId = participants.mechanic_id
    preferredMechanicName = (participants.mechanic as any)?.full_name || null
  }
}

// Lines 206-216 - Replace entire section:
{dbSessionId && (
  <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 shadow-sm backdrop-blur-sm">
    <h2 className="text-lg font-semibold text-white">
      {preferredMechanicId ? 'Mechanic Assigned' : 'Invite Your Mechanic'}
    </h2>
    <p className="mt-2 text-sm text-slate-300">
      {preferredMechanicId ? (
        <>
          <strong className="text-orange-300">{preferredMechanicName}</strong> has been notified
          and will join when the session starts. You'll receive a notification when they're ready.
        </>
      ) : (
        <>
          Share this secure link with your trusted mechanic or shop.
          <strong className="text-orange-300"> Only authorized users with this link can join.</strong>
        </>
      )}
    </p>
    {!preferredMechanicId && (
      <div className="mt-4">
        <MechanicInvite sessionId={dbSessionId} />
      </div>
    )}
  </section>
)}
```

#### Acceptance Criteria
- [ ] Copy accurately reflects only booked mechanic can join
- [ ] Price displays correctly for all session types (free, trial, paid)
- [ ] $0.00 shown for complimentary sessions
- [ ] Mechanic invite section shows only when no mechanic pre-selected
- [ ] Preferred mechanic name displayed when pre-selected

#### Testing Checklist
```bash
# Test 1: Free Session
1. Book a free session
2. Navigate to thank-you page
3. Verify shows "$0.00" or "Complimentary"
4. Verify copy doesn't say "Payment confirmed"

# Test 2: Paid Session
1. Book standard session ($49.99)
2. Complete Stripe checkout
3. Redirect to thank-you page
4. Verify shows "$49.99"
5. Verify says "Payment confirmed"

# Test 3: Pre-Selected Mechanic
1. Book session with specific mechanic
2. Complete booking flow
3. On thank-you page, verify shows mechanic name
4. Verify says "has been notified"
5. Verify invite link NOT shown

# Test 4: No Pre-Selected Mechanic
1. Book session without selecting mechanic
2. On thank-you page, verify invite section shown
3. Verify copy says "Share with trusted mechanic"
```

---

### Issue #12: Audit & Fix Reviews System 🔴
**Priority:** CRITICAL
**Time:** 4 hours
**Status:** ❌ Not Started

#### Problem
- Reviews page not working
- Unknown which APIs are involved
- Inconsistent API polling methods across site

#### Implementation Steps

**Step 1: Locate & Audit Reviews Components (30 min)**
- [ ] Find reviews page: `find src/app -path "*mechanic/reviews*"`
- [ ] Find reviews components: `find src/components -name "*Review*"`
- [ ] Document current implementation
- [ ] Check browser console for errors

**Step 2: Create/Fix Reviews API Route (45 min)**
- [ ] Create `src/app/api/mechanic/reviews/route.ts`
- [ ] Implement GET endpoint
- [ ] Calculate stats (average, total, positive/neutral/negative)
- [ ] Test API manually

**New File:** `src/app/api/mechanic/reviews/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get mechanic ID
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!mechanic) {
      return NextResponse.json({ error: 'Mechanic profile not found' }, { status: 404 })
    }

    // Fetch reviews
    const { data: reviews, error } = await supabase
      .from('session_reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        helpful_count,
        session:sessions(type, id),
        customer:profiles!session_reviews_customer_id_fkey(full_name)
      `)
      .eq('mechanic_id', mechanic.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[reviews] Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }

    // Calculate statistics
    const total = reviews.length
    const average = total > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / total
      : 0
    const positive = reviews.filter(r => r.rating >= 4).length
    const neutral = reviews.filter(r => r.rating === 3).length
    const negative = reviews.filter(r => r.rating <= 2).length

    const stats = {
      total,
      average: Math.round(average * 10) / 10, // Round to 1 decimal
      positive,
      neutral,
      negative,
    }

    return NextResponse.json({
      success: true,
      reviews,
      stats
    })

  } catch (error: any) {
    console.error('[reviews] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 3: Create/Fix Reviews Page Component (60 min)**
- [ ] Create or update `src/app/mechanic/reviews/page.tsx`
- [ ] Implement SWR for data fetching
- [ ] Add stats header
- [ ] Add reviews list
- [ ] Handle loading and error states

**New/Updated File:** `src/app/mechanic/reviews/page.tsx`
```tsx
'use client'

import { useState } from 'react'
import { Star, ThumbsUp, MessageSquare, TrendingUp, Loader2, AlertCircle } from 'lucide-react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function MechanicReviewsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/mechanic/reviews', fetcher, {
    refreshInterval: 30000, // Refresh every 30s
    revalidateOnFocus: true,
    revalidateOnReconnect: true
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
          <p className="text-slate-300">Loading reviews...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="text-white font-semibold mb-1">Error Loading Reviews</h3>
              <p className="text-red-300 text-sm">{error.message || 'Failed to load reviews'}</p>
              <button
                onClick={() => mutate()}
                className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const reviews = data?.reviews || []
  const stats = data?.stats || { average: 0, total: 0, positive: 0, neutral: 0, negative: 0 }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Customer Reviews</h1>
          <p className="text-slate-400 text-sm">
            Your customer feedback and ratings from completed sessions
          </p>
        </div>

        {/* Stats Header */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Average Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-1">
                {stats.average.toFixed(1)}
              </div>
              <div className="flex items-center justify-center gap-1 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(stats.average)
                        ? 'text-orange-400 fill-orange-400'
                        : 'text-slate-600'
                    }`}
                  />
                ))}
              </div>
              <div className="text-sm text-slate-400">
                {stats.total} {stats.total === 1 ? 'review' : 'reviews'}
              </div>
            </div>

            {/* Breakdown */}
            <div className="flex-1 grid grid-cols-3 gap-4 w-full">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {stats.positive}
                </div>
                <div className="text-xs text-slate-400">Positive</div>
                <div className="text-xs text-slate-500">4-5 stars</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {stats.neutral}
                </div>
                <div className="text-xs text-slate-400">Neutral</div>
                <div className="text-xs text-slate-500">3 stars</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {stats.negative}
                </div>
                <div className="text-xs text-slate-400">Negative</div>
                <div className="text-xs text-slate-500">1-2 stars</div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-12 text-center">
            <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No reviews yet</p>
            <p className="text-slate-500 text-sm mt-1">
              Complete sessions to start receiving customer feedback
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review: any) => (
              <div
                key={review.id}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-white font-semibold">
                      {review.customer?.full_name || 'Anonymous Customer'}
                    </div>
                    <div className="text-sm text-slate-400">
                      {new Date(review.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating
                            ? 'text-orange-400 fill-orange-400'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {review.comment && (
                  <p className="text-slate-300 text-sm mb-3 leading-relaxed">
                    {review.comment}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    Session: {review.session?.type || 'Unknown'}
                  </span>
                  {review.helpful_count > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {review.helpful_count} found helpful
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 4: Standardize API Polling Site-Wide (60 min)**
- [ ] Create `docs/API_POLLING_STANDARDS.md` document
- [ ] Audit all pages for polling patterns
- [ ] Document current methods
- [ ] Recommend standardization

**New File:** `docs/API_POLLING_STANDARDS.md`
```markdown
# API Polling Standards

## Recommended Approaches

### 1. Real-Time Updates (High Priority)
**Use:** Supabase Realtime subscriptions
**When:** Session status, presence, live data
**Example:** ActiveSessionBanner, mechanic queue

### 2. Static/Cached Data
**Use:** SWR with smart revalidation
**When:** Profiles, plans, reviews, history
**Example:** Reviews page, mechanic profile

### 3. Manual Polling (Fallback)
**Use:** setTimeout with exponential backoff
**When:** Realtime connection fails
**Example:** ActiveSessionBanner fallback

## Implementation Patterns

[Include code examples from document]
```

**Step 5: Add Realtime Reviews (Optional) (45 min)**
- [ ] Create `listenToReviews` in `src/lib/realtimeListeners.ts`
- [ ] Update reviews page to use realtime
- [ ] Test real-time review updates

#### Acceptance Criteria
- [ ] Reviews page loads without errors
- [ ] Shows accurate statistics (average, total, breakdown)
- [ ] All reviews display correctly
- [ ] Loading state shown while fetching
- [ ] Error state shown if API fails
- [ ] Retry button works
- [ ] SWR refreshes data every 30s
- [ ] API polling standards documented

#### Testing Checklist
```bash
# Test 1: Page Loads
1. Login as mechanic who has reviews
2. Navigate to /mechanic/reviews
3. Verify page loads without console errors
4. Verify stats shown correctly

# Test 2: No Reviews
1. Login as new mechanic (no reviews)
2. Navigate to /mechanic/reviews
3. Verify empty state shown
4. Verify no errors

# Test 3: API Failure Handling
1. Open browser DevTools
2. Block /api/mechanic/reviews in Network tab
3. Refresh page
4. Verify error message shown
5. Click Retry
6. Unblock request
7. Verify data loads

# Test 4: Auto Refresh
1. Open reviews page
2. Wait 30 seconds
3. Check Network tab - should see automatic refresh call
```

---

## DAY 3: POLISH & UX (8.5 HOURS)

### Issue #6: Feature Flag for Camera/Mic Bypass 🟢
**Priority:** MEDIUM
**Time:** 2.5 hours
**Status:** ❌ Not Started

#### Problem
Need temporary feature flag for testing without camera/microphone

#### Implementation Steps

**Step 1: Create Feature Flag Config (15 min)**
- [ ] Update `src/config/featureFlags.ts`

**Code Change:**
```typescript
// File: src/config/featureFlags.ts (add to existing)

export const FEATURE_FLAGS = {
  // ... existing flags

  experimental: {
    bypassMediaCheck: {
      enabled: false,
      description: 'Skip camera/microphone permission check',
      adminOnly: true,
      expiresAt: '2025-12-31',
    }
  }
}

export function isFeatureEnabled(category: string, feature: string): boolean {
  const flag = (FEATURE_FLAGS as any)[category]?.[feature]
  if (!flag) return false

  if (flag.expiresAt && new Date(flag.expiresAt) < new Date()) {
    return false
  }

  return flag.enabled
}
```

**Step 2: Implement Bypass Logic (20 min)**
- [ ] Find media check component
- [ ] Add bypass logic

**Step 3: Build Admin UI (45 min)**
- [ ] Create `src/app/admin/settings/experimental/page.tsx`

**New File:** `src/app/admin/settings/experimental/page.tsx`
```tsx
'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { AlertTriangle, FlaskConical, Loader2 } from 'lucide-react'

export default function ExperimentalFeaturesPage() {
  const [bypassMedia, setBypassMedia] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadFlags() {
      try {
        const response = await fetch('/api/admin/feature-flags')
        if (response.ok) {
          const data = await response.json()
          setBypassMedia(data.experimental?.bypassMediaCheck || false)
        }
      } catch (error) {
        console.error('Failed to load feature flags:', error)
      } finally {
        setLoading(false)
      }
    }
    loadFlags()
  }, [])

  const handleToggle = async (enabled: boolean) => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'experimental',
          feature: 'bypassMediaCheck',
          enabled
        })
      })

      if (response.ok) {
        setBypassMedia(enabled)
        alert(`Feature ${enabled ? 'enabled' : 'disabled'}. Restart app to apply changes.`)
      } else {
        alert('Failed to update feature flag')
      }
    } catch (error) {
      console.error('Error updating flag:', error)
      alert('Error updating feature flag')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <FlaskConical className="h-7 w-7 text-orange-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Experimental Features</h1>
            <p className="text-slate-400 text-sm">
              Temporary features for testing and development
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-yellow-300 font-semibold">Production Warning</h3>
              <p className="text-yellow-200/80 text-sm mt-1">
                These features bypass critical security and UX checks.
                Only enable for development/testing. Never enable in production.
              </p>
            </div>
          </div>
        </div>

        {/* Feature List */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-6">
              <h3 className="text-white font-semibold mb-1">
                Bypass Camera/Microphone Check
              </h3>
              <p className="text-slate-400 text-sm mb-2">
                Skip media device permission checks when joining video sessions.
                Useful for testing on machines without cameras/mics.
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Admin Only</span>
                <span>•</span>
                <span>Expires: Dec 31, 2025</span>
                <span>•</span>
                <span className={bypassMedia ? 'text-orange-400 font-semibold' : ''}>
                  {bypassMedia ? 'ACTIVE' : 'Inactive'}
                </span>
              </div>
            </div>
            <Switch
              checked={bypassMedia}
              onCheckedChange={handleToggle}
              disabled={saving}
            />
          </div>
        </div>

        {/* Status */}
        <div className="mt-6 text-center text-sm text-slate-500">
          {bypassMedia ? (
            <span className="text-orange-400 font-semibold">
              ⚠️ 1 experimental feature active
            </span>
          ) : (
            'No experimental features active'
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Create API Route (30 min)**
- [ ] Create `src/app/api/admin/feature-flags/route.ts`

**Step 5: Add Database Persistence (Optional) (30 min)**
- [ ] Create migration for feature_flags table
- [ ] Update API to use database

#### Acceptance Criteria
- [ ] Admin can access /admin/settings/experimental
- [ ] Toggle switch enables/disables bypass
- [ ] Video sessions skip media check when enabled
- [ ] Flag expires after Dec 31, 2025
- [ ] Non-admins cannot access page

---

### Issue #8: Enhance ActiveSessionBanner Prominence 🟢
**Priority:** MEDIUM
**Time:** 1 hour
**Status:** ❌ Not Started

#### Implementation Steps

**Step 1: Add Pulse Animation (10 min)**
**Step 2: Add Animated Border (15 min)**
**Step 3: Add Icon Animation (10 min)**
**Step 4: Test on Multiple Pages (15 min)**
**Step 5: Adjust Animation Timing (10 min)**

[See detailed implementation in CRITICAL_FIXES document]

---

### Issue #9: Fix Font Size Uniformity 🟢
**Priority:** MEDIUM
**Time:** 1.25 hours
**Status:** ❌ Not Started

#### Implementation Steps

**Step 1: Audit Sessions Page (15 min)**
**Step 2: Compare with Other Pages (15 min)**
**Step 3: Update to Standard Sizes (30 min)**
**Step 4: Create Standards Document (25 min)**

[See detailed implementation in CRITICAL_FIXES document]

---

### Issue #10: Reorganize Profile Postal Code 🟢
**Priority:** MEDIUM
**Time:** 1.25 hours
**Status:** ❌ Not Started

#### Implementation Steps

**Step 1: Locate Duplicate Fields (10 min)**
**Step 2: Identify Correct Field (10 min)**
**Step 3: Update Form Layout (30 min)**
**Step 4: Add Validation (20 min)**
**Step 5: Test Form Submission (15 min)**

[See detailed implementation in CRITICAL_FIXES document]

---

### Issue #11: Audit Onboarding Guide 🟢
**Priority:** MEDIUM
**Time:** 2.5 hours
**Status:** ❌ Not Started

#### Implementation Steps

**Step 1: Locate Component (15 min)**
**Step 2: Audit Tracking Logic (30 min)**
**Step 3: Implement Missing Tracking (60 min)**
**Step 4: Remove Redundant Button (15 min)**
**Step 5: Test Completion Tracking (30 min)**

[See detailed implementation in CRITICAL_FIXES document]

---

## DEPLOYMENT STRATEGY

### Pre-Deployment Checklist
- [ ] All changes committed to feature branch
- [ ] All tests passing locally
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Baseline metrics captured

### Staging Deployment
1. Deploy to staging environment
2. Run full test suite
3. Manual QA testing (4-6 hours)
4. Performance testing
5. Get stakeholder approval

### Production Deployment (Phased)
**Phase 1: Low-Risk Fixes (Day 1)**
- Deploy Issue #8 (Banner)
- Deploy Issue #9 (Fonts)
- Deploy Issue #10 (Postal Code)
- Monitor for 2 hours

**Phase 2: API Changes (Day 2)**
- Deploy Issue #2 (Favorites)
- Deploy Issue #4 (Mechanic View)
- Deploy Issue #12 (Reviews)
- Monitor for 4 hours

**Phase 3: Business Logic (Day 3)**
- Deploy Issue #1 (Specialist Pricing)
- Deploy Issue #5 (Thank You Page)
- Deploy Issue #6 (Feature Flag)
- Deploy Issue #11 (Onboarding)
- Monitor for 24 hours

### Monitoring Metrics
- Error rate (target: <0.1%)
- API response time (target: <500ms)
- User complaints (target: 0)
- Feature adoption (favorites, reviews)

---

## ROLLBACK PROCEDURES

### Immediate Rollback (Emergency)
```bash
# Full rollback
git revert HEAD~3..HEAD
git push origin main
vercel --prod
```

### Partial Rollback (Single Feature)
```bash
# Revert specific commit
git log --oneline  # Find commit hash
git revert <commit-hash>
git push origin main
```

### Feature Flag Disable
```bash
# For experimental features
# Go to /admin/settings/experimental
# Toggle feature off
# No deployment needed
```

---

## SUCCESS CRITERIA

### Immediate (24 hours post-deployment)
- [ ] Zero critical errors in production
- [ ] All automated tests passing
- [ ] No user-reported issues
- [ ] Performance metrics stable

### Short-term (1 week)
- [ ] Favorites usage increases 20%+
- [ ] Specialist bookings maintain/increase
- [ ] Review engagement increases 15%+
- [ ] Support tickets decrease 50%

### Long-term (1 month)
- [ ] User satisfaction improves
- [ ] System reliability >99.9%
- [ ] API costs reduced 20%
- [ ] Feature adoption tracked

---

## TEAM ASSIGNMENTS

### Developer 1 (Day 1)
- Issue #2: Favorites System
- Issue #1: Specialist Pricing

### Developer 2 (Day 1-2)
- Issue #4: Mechanic View
- Issue #5: Thank You Page

### Developer 3 (Day 2)
- Issue #12: Reviews System

### Developer 4 (Day 3)
- Issues #6, #8, #9, #10, #11 (Polish tasks)

---

## BUDGET & RESOURCES

**Development Time:** 21.5 hours
**QA Testing Time:** 8 hours
**Total:** 29.5 hours

**Cost Estimate:**
- Development: 21.5h × $100/h = $2,150
- QA Testing: 8h × $75/h = $600
- **Total Cost:** $2,750

**Timeline:**
- Development: 3 days
- QA & Staging: 1 day
- Production Deploy: 1 day (phased)
- **Total:** 5 business days

---

## APPROVAL SIGNATURES

**Plan Reviewed By:** ___________________ Date: ___________

**Technical Lead Approval:** ___________________ Date: ___________

**Product Owner Approval:** ___________________ Date: ___________

**Ready to Proceed:** ☐ YES  ☐ NO  ☐ REVISIONS NEEDED

**Comments:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**Document Version:** 1.0
**Created:** November 12, 2025
**Last Updated:** November 12, 2025
**Status:** 📋 AWAITING APPROVAL
**Next Review:** Upon approval or request for changes
