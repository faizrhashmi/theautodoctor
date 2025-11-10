# Virtual vs Workshop Mechanics - Platform Policy

**Date**: 2025-11-08
**Objective**: Support both virtual mechanics AND workshops without favoring one over the other

---

## 🎯 CORE PRINCIPLE

**"Hybrid Ecosystem Strategy"** - TheAutoDoctor should be a marketplace that serves BOTH virtual mechanics and workshops, letting customers choose based on their needs, not platform bias.

---

## 📋 MECHANIC TYPES

### Type 1: Virtual Mechanic (Remote Diagnostic)
**Services**:
- Video/chat consultations
- Remote diagnostics
- Advice and guidance
- Pre-diagnosis before workshop visit
- Post-repair follow-ups

**Availability**:
- Can work from anywhere
- Online/offline status
- Real-time sessions
- No physical location required

**Revenue Model**:
- Session fees (chat, video, diagnostic)
- Escalation to workshops (referral fees)
- Subscription services

---

### Type 2: Workshop Mechanic (Physical + Virtual)
**Services**:
- Everything virtual mechanics offer (chat/video)
- PLUS physical repair services at their shop
- Can quote actual repair work
- Can schedule in-person appointments

**Availability**:
- Shop hours (9 AM - 6 PM typical)
- May offer virtual services after hours
- Location-specific (customers need to visit)
- Can accept both virtual AND physical bookings

**Revenue Model**:
- Virtual session fees (same as virtual mechanics)
- Physical repair revenue (direct to workshop)
- Platform gets % only on virtual sessions
- NO platform fees on physical repairs (customer pays workshop directly)

---

## 🚫 WHAT NOT TO DO (Anti-Workshop Behaviors)

### ❌ DON'T:
1. **Hide workshops from virtual sessions** - Workshops should appear in virtual mechanic searches
2. **Charge platform fees on physical repairs** - This would kill workshop adoption
3. **Force customers to choose "virtual only"** - Let them see all options
4. **Rank virtual mechanics higher than workshops** - Equal visibility
5. **Prevent workshops from offering virtual services** - They should be able to do both
6. **Take fees on referral revenue** - If workshop does the physical work, they keep 100%

### ❌ ANTI-COMPETITIVE PRACTICES TO AVOID:
- "Virtual mechanics are better" messaging
- Hiding workshop search results
- Charging workshops more than virtual mechanics
- Requiring exclusive virtual-only contracts
- Preventing workshops from listing their physical services

---

## ✅ RECOMMENDED POLICY (Pro-Hybrid)

### 1. Unified Mechanic Listing

**All mechanics (virtual AND workshop) appear together in search results with clear labels:**

```
Search Results for "BMW specialist near Toronto":

1. 🏭 Alex Thomson - BMW Workshop
   ⚡ Virtual sessions available
   🔧 Physical repairs at shop
   📍 123 Main St, Toronto
   Rating: 4.9 ⭐ (247 sessions)

2. 💻 Sarah Chen - Virtual BMW Specialist
   ⚡ Online diagnostics only
   📍 Serves all of Ontario remotely
   Rating: 4.8 ⭐ (189 sessions)

3. 🏭 Toronto Auto Clinic - Multi-Brand Workshop
   ⚡ Virtual + physical
   🔧 Specializes in European cars
   📍 456 Oak Ave, Toronto
   Rating: 4.7 ⭐ (312 sessions)
```

**Benefits**:
- Customer sees ALL options
- Clear distinction (icon + label)
- No platform bias
- Workshops get same visibility as virtual mechanics

---

### 2. Session Type Selection

**When customer books, they choose session type:**

```
Step 1: Choose Session Type
□ Virtual Session Only
  - Chat/video consultation
  - Remote diagnosis
  - $15-45 per session

□ Request Quote for Physical Repair
  - Video diagnosis + repair estimate
  - Can schedule shop visit
  - Session fee + repair cost

□ Not Sure Yet
  - Start with virtual diagnosis
  - Decide on physical repair later
```

**Implementation**:
- Virtual-only mechanics can ONLY offer "Virtual Session"
- Workshops can offer BOTH "Virtual Session" AND "Request Quote"
- Customer decides what they need
- Platform doesn't push one over the other

---

### 3. Pricing & Revenue Model

#### For Virtual Sessions (Both Types):
| Party | Fee |
|-------|-----|
| Platform | Session fee (100%) - pays mechanic after |
| Mechanic | 95% of session fee (platform keeps 5%) |
| Workshop | 95% of session fee (platform keeps 5%) |

**Example**: $30 video session
- Customer pays: $30
- Platform keeps: $1.50 (5%)
- Mechanic/Workshop gets: $28.50

#### For Physical Repairs (Workshop Only):
| Party | Fee |
|-------|-----|
| Customer | Pays workshop DIRECTLY (no platform involvement) |
| Workshop | Keeps 100% of repair revenue |
| Platform | $0 - NO fees on physical work |

**Example**: $500 brake repair
- Customer pays workshop: $500
- Platform gets: $0
- Workshop keeps: $500

**Why This Works**:
- Workshops aren't penalized for their core business
- Platform makes money on virtual value-add (diagnostics)
- Workshops have incentive to join (free marketing, virtual income, 100% repair revenue)
- No conflict of interest

---

### 4. Availability System

#### Virtual Mechanics:
```
Status: 🟢 Online / 🟡 Away / ⚪ Offline
Can set availability: 24/7 if they want
Real-time toggle: "Available now" switch
```

#### Workshop Mechanics:
```
Status:
  🟢 Shop Open + Virtual Available
  🟡 Shop Closed + Virtual Available (after hours)
  ⚪ Completely Offline

Shop Hours: Mon-Fri 9 AM - 6 PM
Virtual Hours: Mon-Fri 9 AM - 9 PM (extended)

Toggle Options:
  □ Accept virtual sessions now
  □ Accept physical bookings
  □ After-hours virtual only
```

**Key Points**:
- Workshops can offer virtual sessions beyond shop hours
- Workshop status shows BOTH shop availability AND virtual availability
- Customers know when they can visit vs when they can video call

---

### 5. Matching Algorithm (Fair to Both)

**Scoring System** (same for virtual and workshop):

| Factor | Points | Virtual | Workshop |
|--------|--------|---------|----------|
| Available now | 50 | ✅ | ✅ |
| FSA match | 40 | N/A | ✅ (physical location) |
| Same city | 35 | N/A | ✅ (physical location) |
| Brand specialist | 30 | ✅ | ✅ |
| Same country | 25 | ✅ | ✅ |
| Experience | 20 | ✅ | ✅ |
| Rating | 15 | ✅ | ✅ |
| Red Seal | 10 | ✅ | ✅ |
| Sessions completed | 12 | ✅ | ✅ |

**Location Matching**:
- If customer wants physical repair → workshops get location bonuses (FSA, city)
- If customer wants virtual only → location doesn't matter, everyone eligible
- If customer is flexible → both types shown, workshops get small local bonus

**No Bias**: Virtual mechanics don't get extra points. Workshops don't get penalized.

---

### 6. Customer Flow

#### Scenario A: Customer Wants Virtual Diagnosis
```
1. Customer: "I have a check engine light"
2. Platform: Shows ALL mechanics (virtual + workshop)
3. Customer chooses: Alex Thomson (Workshop)
4. Session type: Virtual video session ($30)
5. Outcome:
   - Alex diagnoses: "Needs new O2 sensor"
   - Alex offers: "I can do this for $250 if you come to my shop"
   - Customer can:
     ✅ Book with Alex (pays Alex directly)
     ✅ Get quote from other shops
     ✅ DIY repair themselves
```

**Platform Revenue**: $30 session fee (keeps $1.50)
**Workshop Revenue**: $30 session + potential $250 repair (100% theirs)

---

#### Scenario B: Customer Wants Quote for Physical Repair
```
1. Customer: "I need brake pads replaced"
2. Platform: Shows ONLY workshops (virtual mechanics hidden)
3. Customer chooses: Toronto Auto Clinic
4. Session type: "Quote for Physical Repair" ($30 diagnostic fee)
5. Outcome:
   - Video diagnosis + quote provided
   - Quote: $450 for brake pad replacement
   - Customer books appointment at shop
   - Pays $450 directly to workshop
```

**Platform Revenue**: $30 diagnostic fee (keeps $1.50)
**Workshop Revenue**: $30 diagnostic + $450 repair (100% theirs)

---

#### Scenario C: Customer Not Sure
```
1. Customer: "Car making weird noise"
2. Platform: Shows ALL mechanics
3. Customer chooses: Sarah Chen (Virtual specialist)
4. Session type: Virtual diagnostic ($30)
5. Outcome:
   - Sarah diagnoses: "Needs professional inspection, might be transmission"
   - Sarah refers: "I recommend XYZ Workshop for this"
   - Platform shows nearby workshops
   - Customer books with recommended workshop
```

**Platform Revenue**: $30 session (keeps $1.50)
**Virtual Mechanic Revenue**: $28.50
**Workshop Revenue** (if customer books): $X (100% theirs)

---

## 🎨 UI/UX RECOMMENDATIONS

### Mechanic Type Badge
```tsx
{mechanic.isWorkshop ? (
  <div className="flex items-center gap-2">
    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded">
      🏭 Workshop
    </span>
    <span className="text-xs text-slate-400">Virtual + Physical</span>
  </div>
) : (
  <div className="flex items-center gap-2">
    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs font-medium rounded">
      💻 Virtual
    </span>
    <span className="text-xs text-slate-400">Remote only</span>
  </div>
)}
```

### Availability Indicator
```tsx
{mechanic.isWorkshop ? (
  <div className="space-y-1">
    <PresenceIndicator status="online" lastSeenText="Shop open now" />
    <p className="text-xs text-slate-400">
      📍 123 Main St, Toronto | 9 AM - 6 PM
    </p>
    <p className="text-xs text-green-400">
      ⚡ Virtual sessions available until 9 PM
    </p>
  </div>
) : (
  <PresenceIndicator status="online" lastSeenText="Available now" />
)}
```

### Service Options
```tsx
{mechanic.isWorkshop && (
  <div className="mt-2 flex gap-2">
    <button className="btn-sm btn-primary">
      💻 Virtual Session ($30)
    </button>
    <button className="btn-sm btn-secondary">
      🔧 Get Repair Quote
    </button>
  </div>
)}
```

---

## 🔧 TECHNICAL IMPLEMENTATION

### Database Schema

```sql
-- Add is_workshop flag to mechanics table
ALTER TABLE mechanics
ADD COLUMN is_workshop BOOLEAN DEFAULT FALSE;

-- Add workshop-specific fields
ALTER TABLE mechanics
ADD COLUMN shop_address TEXT,
ADD COLUMN shop_hours JSONB,
ADD COLUMN accepts_physical_bookings BOOLEAN DEFAULT FALSE,
ADD COLUMN virtual_hours JSONB;

-- Example shop_hours format:
{
  "monday": {"open": "09:00", "close": "18:00"},
  "tuesday": {"open": "09:00", "close": "18:00"},
  "wednesday": {"open": "09:00", "close": "18:00"},
  "thursday": {"open": "09:00", "close": "18:00"},
  "friday": {"open": "09:00", "close": "18:00"},
  "saturday": {"open": "10:00", "close": "16:00"},
  "sunday": null
}

-- Example virtual_hours format:
{
  "monday": {"open": "09:00", "close": "21:00"},
  "tuesday": {"open": "09:00", "close": "21:00"},
  ...
}
```

### API Endpoint Enhancement

```typescript
// GET /api/mechanics/available
export async function GET(req: NextRequest) {
  const sessionType = searchParams.get('session_type') // 'virtual' | 'physical' | 'any'

  let query = supabase
    .from('mechanics')
    .select('*')
    .eq('status', 'approved')
    .eq('can_accept_sessions', true)

  // Filter by session type
  if (sessionType === 'physical') {
    // Only workshops that accept physical bookings
    query = query.eq('is_workshop', true).eq('accepts_physical_bookings', true)
  } else if (sessionType === 'virtual') {
    // Both virtual mechanics AND workshops (workshops can do virtual too)
    // No additional filter needed
  }

  // ... rest of matching logic
}
```

### Availability Toggle

```tsx
// In mechanic dashboard
function AvailabilityToggle({ mechanic }) {
  const [virtualAvailable, setVirtualAvailable] = useState(mechanic.is_available)
  const [physicalAvailable, setPhysicalAvailable] = useState(mechanic.accepts_physical_bookings)

  if (mechanic.is_workshop) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Virtual Sessions</h4>
            <p className="text-xs text-slate-400">Accept video/chat consultations</p>
          </div>
          <Toggle
            checked={virtualAvailable}
            onChange={setVirtualAvailable}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Physical Bookings</h4>
            <p className="text-xs text-slate-400">Accept shop appointments</p>
          </div>
          <Toggle
            checked={physicalAvailable}
            onChange={setPhysicalAvailable}
          />
        </div>

        {virtualAvailable && (
          <p className="text-xs text-green-400">
            ✅ You're visible for virtual sessions now
          </p>
        )}

        {physicalAvailable && (
          <p className="text-xs text-blue-400">
            ✅ Customers can request quotes for physical repairs
          </p>
        )}
      </div>
    )
  }

  // Virtual mechanic - simple toggle
  return (
    <div className="flex items-center justify-between">
      <div>
        <h4 className="font-semibold">Available for Sessions</h4>
        <p className="text-xs text-slate-400">Accept new virtual sessions</p>
      </div>
      <Toggle
        checked={virtualAvailable}
        onChange={setVirtualAvailable}
      />
    </div>
  )
}
```

---

## 📊 BUSINESS MODEL COMPARISON

| Revenue Source | Virtual Mechanic | Workshop Mechanic |
|---------------|------------------|-------------------|
| Platform session fee | ✅ 5% of $15-45 | ✅ 5% of $15-45 |
| Physical repair revenue | ❌ N/A | ✅ 100% (no platform fee) |
| Referral fees | ⚠️ Optional | ⚠️ Optional (to other shops) |
| Subscription plans | ✅ Possible | ✅ Possible |

**Win-Win**:
- Platform: Makes money on virtual value-add
- Virtual mechanics: 95% of all session revenue
- Workshops: 95% session revenue + 100% repair revenue + free marketing
- Customers: More options, transparent pricing

---

## 🎯 SUMMARY

### DO THIS:
1. ✅ Unified search (show both types together)
2. ✅ Clear labels (🏭 Workshop vs 💻 Virtual)
3. ✅ Equal visibility in matching algorithm
4. ✅ NO platform fees on physical repairs
5. ✅ Let workshops offer virtual services
6. ✅ Separate availability toggles for shop vs virtual

### DON'T DO THIS:
1. ❌ Hide workshops from search
2. ❌ Charge platform fees on physical work
3. ❌ Rank virtual mechanics higher
4. ❌ Force exclusive contracts
5. ❌ Prevent workshops from virtual services

### RESULT:
- **Workshops are happy**: Free marketing, keep 100% of repair revenue, can earn extra from virtual
- **Virtual mechanics are happy**: Fair competition, no platform bias
- **Customers are happy**: More choice, transparent options
- **Platform is happy**: Revenue from virtual value-add, growing marketplace

**THIS IS THE "UBER FOR AUTO REPAIR" MODEL**: Platform connects both types, takes a small cut on the connection (virtual session), but doesn't interfere with the core business (physical repairs).

---

**Let's implement this hybrid model! It's fair, pro-business, and customer-friendly.**
