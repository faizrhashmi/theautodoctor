# Favorites System - Integrated Flow Summary

## ✅ Addresses User Requirements

**User Concerns:**
1. ✅ Where does customer choose pricing/session type when rebooking?
2. ✅ System should be well-integrated, not scattered
3. ✅ Customer should see availability notification before booking

---

## 🎯 The Integrated Solution

### Everything Happens on the Dashboard (ONE Page)

```
Customer Dashboard
├─ 1. "My Favorite Mechanics" Section (visible if has favorites)
├─ 2. Click "Book Again" button
├─ 3. Availability Modal (pops up on same page)
├─ 4. Choose option → Modal closes
├─ 5. Auto-scroll to SessionLauncher (same page)
├─ 6. Select Pricing Tier (Free/$9.99/$29.99/etc.)
└─ 7. Proceed to Stripe Checkout
```

**Result**: Cohesive, single-page experience with NO scattered redirects

---

## 📱 Step-by-Step User Flow

### Step 1: Customer Sees Their Favorites

**Location**: Dashboard → "My Favorite Mechanics" section

**Display**:
```
┌───────────────────────────────────────────┐
│ ❤️ My Favorite Mechanics                 │
├───────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────┐ │
│ │ John Smith      │  │ Mike's Garage   │ │
│ │ 🔧 Independent  │  │ 🏢 Workshop     │ │
│ │                  │  │                  │ │
│ │ Services: 3     │  │ Services: 5     │ │
│ │ Spent: $245.00  │  │ Spent: $890.00  │ │
│ │                  │  │                  │ │
│ │ [⚡ Book Again] │  │ [⚡ Book Again] │ │
│ └─────────────────┘  └─────────────────┘ │
└───────────────────────────────────────────┘
```

---

### Step 2: Click "Book Again"

**What Happens**:
1. JavaScript function `handleBookFavorite(favorite)` executes
2. Fetches mechanic's real-time status: `GET /api/mechanics/[id]/status`
3. Receives: `{ is_online: true/false, last_seen: timestamp }`
4. Shows availability modal (overlay on same page)

**No Page Navigation** - Modal appears instantly

---

### Step 3: Availability Modal Shows Status

#### Scenario A: Mechanic is ONLINE ✅

```
┌──────────────────────────────────────────┐
│  Book with John Smith                    │
├──────────────────────────────────────────┤
│                                           │
│  🟢 Available Now                        │
│                                           │
│  [⚡ Continue with John Smith]           │
│  [ Find Available Mechanic Now ]         │
│  [ Cancel ]                               │
│                                           │
│  ℹ️ John will be notified immediately    │
└──────────────────────────────────────────┘
```

#### Scenario B: Mechanic is OFFLINE ⚠️

```
┌──────────────────────────────────────────┐
│  Book with John Smith                    │
├──────────────────────────────────────────┤
│                                           │
│  ⚪ Currently Offline                    │
│     Last seen 2 hours ago                │
│                                           │
│  [⚡ Notify & Wait for John]             │
│  [ Find Available Mechanic Now ]         │
│  [ Cancel ]                               │
│                                           │
│  ℹ️ John will get priority notification. │
│  If no response in 10 min, we'll find    │
│  you another mechanic.                   │
└──────────────────────────────────────────┘
```

---

### Step 4: Customer Makes Choice

**Option 1**: Continue with John (or Notify & Wait)
- Modal closes
- Page auto-scrolls to SessionLauncher section
- Highlight effect shows where to select plan
- Context saved: `selectedFavorite = { id, name, routing: 'priority_broadcast' }`

**Option 2**: Find Available Mechanic Now
- Modal closes
- Page auto-scrolls to SessionLauncher
- Context saved: `routing: 'broadcast'` (no favorite priority)

**Option 3**: Cancel
- Modal closes
- Returns to dashboard view
- No action taken

---

### Step 5: Customer Selects Pricing Tier

**Location**: SessionLauncher component (same page, scrolled into view)

**Display**:
```
┌──────────────────────────────────────────────┐
│  📍 Booking with John Smith (Priority)       │
│  ───────────────────────────────────────────│
│                                               │
│  Choose Your Service Plan:                   │
│                                               │
│  ○ Free Diagnostic (First-time only)         │
│  ○ Quick Chat - $9.99 (10 min text)          │
│  ● Expert Video - $29.99 (30 min video)      │
│  ○ Premium Session - $49.99 (60 min)         │
│                                               │
│  [Continue to Checkout]                       │
└──────────────────────────────────────────────┘
```

**Key Detail**: Banner shows "Booking with John Smith (Priority)" to remind customer of their choice

---

### Step 6: Proceed to Stripe Checkout

**When "Continue to Checkout" clicked**:

1. Creates Stripe checkout session with metadata:
```json
{
  "plan": "expert_video",
  "preferred_mechanic_id": "abc123",
  "routing_type": "priority_broadcast",
  "provider_type": "independent"
}
```

2. Redirects to Stripe payment page
3. After payment → Webhook triggers fulfillment
4. System creates `session_request` with priority settings

---

### Step 7: Backend Priority Notification

**Fulfillment Logic**:
```typescript
// In fulfillment.ts after Stripe webhook

if (metadata.routing_type === 'priority_broadcast') {
  // Send push notification to ONLY this mechanic
  await notifyMechanic(metadata.preferred_mechanic_id, {
    customer_name: "John Doe",
    session_type: "video",
    priority: true
  })

  // Set 10-minute timer
  setTimeout(() => {
    checkIfAccepted(session_id)
    if (!accepted) {
      // Fallback: Broadcast to all mechanics
      broadcastToAllMechanics(session_id)
    }
  }, 10 * 60 * 1000)

} else {
  // Standard broadcast to all mechanics
  broadcastToAllMechanics(session_id)
}
```

---

## 🔑 Key Integration Points

### 1. Dashboard State Management

**Manages everything in ONE place**:
```typescript
const [selectedFavorite, setSelectedFavorite] = useState(null)
const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
const [mechanicAvailability, setMechanicAvailability] = useState(null)
```

### 2. Smooth Transitions

**No page reloads - everything is smooth**:
- Click button → Modal fades in (CSS transition)
- Choose option → Modal fades out, scroll animation
- SessionLauncher highlights with pulse effect
- Customer never loses context

### 3. SessionLauncher Integration

**Receives favorite context via props**:
```tsx
<SessionLauncher
  accountType={accountType}
  hasUsedFreeSession={hasUsedFreeSession}
  availableMechanics={availableMechanics}
  // NEW PROPS:
  preferredMechanicId={selectedFavorite?.provider_id}
  preferredMechanicName={selectedFavorite?.provider_name}
  routingType={selectedFavorite ? 'priority_broadcast' : 'broadcast'}
/>
```

**SessionLauncher shows banner when favorite selected**:
```jsx
{preferredMechanicName && (
  <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3 mb-4">
    <div className="flex items-center gap-2 text-orange-300">
      <Heart className="w-4 h-4 fill-current" />
      <span>Booking with {preferredMechanicName} (Priority)</span>
    </div>
  </div>
)}
```

---

## 🎨 Visual Flow Diagram

```
Dashboard (Single Page)
│
├─ [Favorites Section] ──────────────────┐
│   "My Favorite Mechanics"              │
│   - John Smith                         │
│   - Mike's Garage                      │
│   - Each has "Book Again" button       │
│                                         │
│  User clicks "Book Again" ─────────┐   │
│                                     ↓   │
│  [Availability Modal] ←────────────┘   │
│   Shows: Online/Offline status         │
│   Options:                              │
│   1. Continue with favorite             │
│   2. Find someone else                  │
│   3. Cancel                             │
│                                         │
│  User chooses option ──────────────┐   │
│                                     ↓   │
│  [Auto-scroll Animation]                │
│         ↓                               │
│  [SessionLauncher] ←───────────────┘   │
│   Shows: "Booking with John (Priority)"│
│   Plans:                                │
│   ○ Free Diagnostic                     │
│   ○ Quick Chat - $9.99                  │
│   ● Expert Video - $29.99               │
│   ○ Premium - $49.99                    │
│                                         │
│  User selects plan ──────────────────┐ │
│                                       ↓ │
│  [Proceed to Checkout] ──────────────> Stripe
│                                         │
└─────────────────────────────────────────┘
```

**Result**: Entire flow on ONE page until Stripe checkout

---

## 🚀 Implementation Status

### ✅ Completed
- [x] Dashboard favorites section with "Book Again" buttons
- [x] `handleBookFavorite()` function to check availability
- [x] Availability modal with online/offline status
- [x] Three options: Priority, Broadcast, Cancel
- [x] Auto-scroll to SessionLauncher with highlight effect
- [x] State management for favorite context

### 🔄 In Progress
- [ ] Create `GET /api/mechanics/[id]/status` endpoint
- [ ] Update SessionLauncher to accept favorite props
- [ ] Pass favorite context through Stripe metadata
- [ ] Update fulfillment.ts for priority notification

### 📝 Remaining
- [ ] Database migration for priority columns
- [ ] Backend priority broadcast logic
- [ ] Fallback timer mechanism
- [ ] Post-service "Add to Favorites" prompt

---

## 📊 Why This Flow is Better

### Before (Scattered Approach) ❌
1. Dashboard → Click link
2. Redirect to intake page
3. Fill form
4. Redirect to SessionLauncher (different page)
5. Select plan
6. Redirect to Stripe
7. **Multiple page loads, lost context, confusing**

### After (Integrated Approach) ✅
1. Dashboard → Click button
2. Modal pops up (same page)
3. Choose option, modal closes
4. Scroll to SessionLauncher (same page)
5. Select plan
6. Proceed to Stripe
7. **ONE page, smooth transitions, clear context**

---

## 🎯 Answers to Your Questions

### Q: "Where is the pricing option when booking favorite?"
**A**: After the availability modal closes, the page auto-scrolls to the SessionLauncher section **on the same page**, where all pricing tiers are displayed. The customer selects their plan before proceeding to checkout.

### Q: "Don't make it scattered everywhere"
**A**: Everything happens on the dashboard until Stripe checkout. No unnecessary redirects. The flow is:
Dashboard → Modal (overlay) → Scroll (same page) → SessionLauncher (same page) → Stripe

### Q: "Customer should get notification if mechanic is not available"
**A**: Before ANY booking flow starts, we check the mechanic's online status via API. The availability modal shows:
- ✅ "Available Now" (green) if online
- ⚠️ "Currently Offline - Last seen X ago" if offline
- Customer chooses: Wait for them OR find someone available now

---

## 🔧 Next Steps

1. **Create mechanic status API endpoint**
   - `GET /api/mechanics/[mechanicId]/status`
   - Returns: `{ is_online: boolean, last_seen: timestamp }`

2. **Update SessionLauncher component**
   - Accept `preferredMechanicId`, `preferredMechanicName`, `routingType` props
   - Show banner when favorite is selected
   - Pass metadata to Stripe checkout

3. **Update fulfillment logic**
   - Read `preferred_mechanic_id` from Stripe metadata
   - Implement priority notification to that mechanic
   - Set fallback timer for broadcast

4. **Database migration**
   - Add columns to `session_requests` table
   - Track priority notifications and fallback

---

## 🎉 End Result

A **cohesive, integrated favorites rebooking system** that:
- ✅ Shows real-time availability before booking
- ✅ Allows pricing selection in the normal flow
- ✅ Stays on ONE page until checkout
- ✅ Provides fallback reliability
- ✅ Gives customers full control and transparency
- ✅ Feels professional and well-designed

**Not scattered. Not confusing. Just smooth.**
