# Smart Workshop Mechanic Solution - Geographic Non-Compete

**Date**: 2025-11-08
**Status**: REVISED SOLUTION

---

## 🎯 THE REAL CHALLENGE

### What We Need:
1. ✅ Workshop mechanics CAN work off-shift (happy mechanics, more platform availability)
2. ✅ Workshop mechanics DON'T steal workshop's local customers (happy workshops)
3. ✅ Fair compensation for everyone
4. ✅ Maximum mechanic availability on platform

### The Insight:
**Workshops only care about LOCAL competition, not global**

A workshop in Toronto doesn't care if their mechanic helps someone in Vancouver. They care if their mechanic steals their Toronto customers.

---

## ✅ THE SMART SOLUTION

### **Three Operating Modes for Workshop Mechanics**

#### **Mode 1: ON-SHIFT (Clocked in by workshop)**
- Status: `clocked_in_by_admin = true`
- Available for: Virtual sessions
- Revenue: **100% to workshop**
- Geographic restriction: None (can help anyone)
- Why: Mechanic is on employer's time

#### **Mode 2: OFF-SHIFT - LOCAL EXCLUSION (Default off-shift mode)**
- Status: `clocked_in_by_admin = false`, `is_available = true`
- Available for: Virtual sessions
- Revenue: **95% to mechanic** (like independent)
- Geographic restriction: **EXCLUDED from workshop's local area**
- Implementation: Cannot see/accept sessions from customers within 50km of workshop
- Why: Mechanic can freelance BUT can't steal workshop's local customers

#### **Mode 3: OFF-SHIFT - WITH REVENUE SHARE (Optional agreement)**
- Status: `clocked_in_by_admin = false`, `is_available = true`, `revenue_share_enabled = true`
- Available for: Virtual sessions (including local area)
- Revenue: **Workshop gets 20-40%, mechanic gets 55-75%**
- Geographic restriction: None (can serve local customers too)
- Why: Workshop gets cut of mechanic's off-shift work in exchange for allowing local customers

---

## 💡 HOW IT WORKS

### Scenario 1: Workshop in Toronto, Mechanic lives in Mississauga

**ON-SHIFT (9am-5pm):**
- Mechanic clocked in at workshop
- Can help customers anywhere in Canada
- Workshop gets 100% of session fees
- Mechanic gets hourly wage

**OFF-SHIFT - Mode 2 (Default, 6pm-11pm):**
- Mechanic at home, turns on availability
- Platform shows them customers from:
  - ✅ Vancouver
  - ✅ Montreal
  - ✅ Calgary
  - ❌ Toronto area (50km exclusion zone)
  - ❌ Mississauga (within exclusion zone)
- Mechanic gets 95% of fees
- Workshop gets 0% (but protected from local competition)

**OFF-SHIFT - Mode 3 (Optional agreement, 6pm-11pm):**
- Workshop agrees: "You can serve local customers off-shift if I get 30% cut"
- Mechanic agrees: "I prefer 65% of more customers than 95% of fewer"
- Platform shows them ALL customers including Toronto
- Revenue split: Mechanic 65%, Workshop 30%, Platform 5%

---

## 🗄️ DATABASE SCHEMA

```sql
ALTER TABLE mechanics ADD COLUMN off_shift_mode VARCHAR(50) DEFAULT 'local_exclusion'
  CHECK (off_shift_mode IN ('local_exclusion', 'revenue_share', 'blocked'));

ALTER TABLE mechanics ADD COLUMN exclusion_radius_km INTEGER DEFAULT 50;

ALTER TABLE mechanics ADD COLUMN off_shift_revenue_share_pct INTEGER DEFAULT 0
  CHECK (off_shift_revenue_share_pct >= 0 AND off_shift_revenue_share_pct <= 40);

-- Workshop settings
ALTER TABLE workshops ADD COLUMN allow_employee_local_freelance BOOLEAN DEFAULT FALSE;
ALTER TABLE workshops ADD COLUMN employee_revenue_share_pct INTEGER DEFAULT 30
  CHECK (employee_revenue_share_pct >= 20 AND employee_revenue_share_pct <= 40);
```

---

## 🧮 REVENUE CALCULATIONS

### Example: $50 session fee

**Mode 1: ON-SHIFT**
```
Customer pays $50
Platform keeps: $2.50 (5%)
Workshop gets: $47.50 (95%)
Mechanic gets: $0 (earns hourly wage)
```

**Mode 2: OFF-SHIFT - Local Exclusion**
```
Customer pays $50
Platform keeps: $2.50 (5%)
Mechanic gets: $47.50 (95%)
Workshop gets: $0 (but local customers protected)
```

**Mode 3: OFF-SHIFT - Revenue Share (30% to workshop)**
```
Customer pays $50
Platform keeps: $2.50 (5%)
Remaining: $47.50

Workshop gets: $14.25 (30% of $47.50)
Mechanic gets: $33.25 (70% of $47.50)
```

---

## 🎯 GEOGRAPHIC FILTERING LOGIC

```typescript
// When mechanic is OFF-SHIFT with local_exclusion mode
async function getAvailableSessionsForMechanic(mechanicId: string) {
  const mechanic = await getMechanic(mechanicId)

  if (mechanic.mechanic_type === 'workshop_employee' &&
      !mechanic.clocked_in_by_admin &&
      mechanic.off_shift_mode === 'local_exclusion') {

    // Get workshop location
    const workshop = await getWorkshop(mechanic.workshop_id)

    // Get all pending sessions
    const allSessions = await getPendingSessions()

    // Filter out sessions within exclusion radius
    const availableSessions = allSessions.filter(session => {
      const distance = calculateDistance(
        workshop.postal_code,
        session.customer_postal_code
      )

      return distance > mechanic.exclusion_radius_km
    })

    return availableSessions
  }

  // For independent or ON-SHIFT, show all sessions
  return getPendingSessions()
}
```

---

## 🎨 DASHBOARD UI

### Workshop Employee Dashboard - OFF-SHIFT

```
┌─────────────────────────────────────────────────────┐
│ ⚪ OFF SHIFT - Freelance Mode                       │
│ [Turn On Availability]                              │
│                                                     │
│ Current Setting: Local Exclusion (Default)         │
│ • You can serve customers outside 50km             │
│ • You keep 95% of session fees                     │
│ • Local customers (Toronto area) excluded          │
│                                                     │
│ Want to serve local customers too?                 │
│ [Request Revenue Share Agreement]                  │
│ → Serve all customers (including local)            │
│ → Workshop gets 30%, you get 65%                   │
│ → More potential customers for you                 │
│                                                     │
│ [Turn On Availability] [Settings]                  │
└─────────────────────────────────────────────────────┘
```

### Workshop Admin Dashboard

```
┌─────────────────────────────────────────────────────┐
│ AutoFix Workshop - Employee Settings               │
│                                                     │
│ Mike Johnson (Workshop Employee)                   │
│ ┌─────────────────────────────────────────────────┐│
│ │ Current Status: OFF SHIFT                       ││
│ │                                                 ││
│ │ Off-Shift Freelance Mode: Local Exclusion       ││
│ │ • Can work off-shift outside your area          ││
│ │ • Local customers (50km) protected              ││
│ │ • You get 0% of their off-shift earnings        ││
│ │                                                 ││
│ │ Alternative: Enable Revenue Sharing             ││
│ │ [✓] Allow local customers off-shift             ││
│ │ [ ] Workshop gets 30% of off-shift sessions     ││
│ │ [ ] Mechanic gets 65% (vs 95% without local)    ││
│ │                                                 ││
│ │ Why enable this?                                ││
│ │ • Extra passive income for workshop             ││
│ │ • Employee gets more customers (higher volume)  ││
│ │ • Win-win: You earn from their off-hours work   ││
│ │                                                 ││
│ │ [Save Settings]                                 ││
│ └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## 🧠 PSYCHOLOGY & INCENTIVES

### For Workshop Mechanics:

**Option A: Local Exclusion (Default)**
- Keep 95% of earnings
- But fewer customers (excluded from 50km radius)
- Good if they live far from workshop
- Good if workshop's area has few customers

**Option B: Revenue Share Agreement**
- Keep only 65% of earnings
- But WAY more customers (all of Canada including local)
- Good if they live near workshop
- Good if workshop's area has many customers
- **Math**: 65% of 10 sessions > 95% of 4 sessions

### For Workshops:

**Option A: Local Exclusion (Default)**
- 0% passive income
- But local customers 100% protected
- Good for workshops that want total control
- Good for competitive markets

**Option B: Enable Revenue Share**
- 30% passive income from employee's off-shift work
- Employee can serve local customers off-shift
- **Math**: Earn money while you sleep (mechanic works 6pm-11pm, workshop earns 30%)
- Good for workshops that want extra revenue stream
- Builds loyalty (mechanic earns more, stays longer)

---

## 📊 COMPARISON: OLD vs NEW

### OLD SOLUTION (Too Restrictive)
```
Workshop Mechanic OFF-SHIFT: ❌ Cannot work at all
Result:
  - Unhappy mechanics
  - Fewer mechanics on platform
  - Workshops happy but platform loses
```

### NEW SOLUTION (Smart Compromise)
```
Workshop Mechanic OFF-SHIFT:
  ✅ Can work (outside local area)
  ✅ OR can work everywhere (with revenue share)

Result:
  - Happy mechanics (can earn extra)
  - More mechanics on platform
  - Workshops protected (local exclusion OR get paid)
  - Platform wins (more availability)
```

---

## 🎯 ADDRESSING YOUR CONCERNS

### "What will workshop mechanics do when not on shift?"

✅ **SOLVED**: They CAN work off-shift freely, just not in workshop's local area (50km). They serve customers in other cities. Platform gets more availability.

### "This creates less availability"

✅ **SOLVED**: Actually INCREASES availability! Mechanics work off-shift serving non-local customers. Plus optional revenue share allows local too.

### "Workshops won't sign up fearing competition"

✅ **SOLVED**: Workshops protected by:
- Geographic exclusion (mechanic can't steal local customers)
- OR revenue share (workshop earns passive income from mechanic's off-shift work)

### "Mechanics want to earn on the side"

✅ **SOLVED**: They can! Just not competing with their employer's local territory. Still have access to millions of customers outside 50km.

---

## 💰 BUSINESS MODEL FAIRNESS

### Independent Mechanic
- Work anywhere, anytime
- Keep 95%
- Full autonomy

### Workshop Employee - ON SHIFT
- Workshop controls availability
- Workshop gets 100%
- Mechanic gets hourly wage

### Workshop Employee - OFF SHIFT (Local Exclusion)
- Mechanic controls availability
- Mechanic gets 95%
- Geographic restriction: Outside 50km of workshop
- Workshop gets 0% but local protection

### Workshop Employee - OFF SHIFT (Revenue Share)
- Mechanic controls availability
- Mechanic gets 65%
- Workshop gets 30%
- Platform gets 5%
- No geographic restriction
- **Both parties agree voluntarily**

---

## 🚀 IMPLEMENTATION

### Phase 1: Add Geographic Filtering
```typescript
// Calculate distance between postal codes (FSA-based approximation)
function calculateDistance(postalCode1: string, postalCode2: string): number {
  const fsa1 = postalCode1.substring(0, 3)
  const fsa2 = postalCode2.substring(0, 3)

  if (fsa1 === fsa2) return 0 // Same FSA ≈ 0-10km

  // Use FSA coordinate lookup table or API
  // For now, approximate:
  // Same first letter = same province ≈ 20-100km
  // Different first letter = different region ≈ 200+ km

  if (fsa1[0] === fsa2[0]) return 40 // Conservative estimate
  return 200 // Different regions
}
```

### Phase 2: Session Filtering
```typescript
// Filter sessions based on mechanic mode
if (mechanic.off_shift_mode === 'local_exclusion') {
  sessions = sessions.filter(s => {
    const distance = calculateDistance(
      workshop.postal_code,
      s.customer_postal_code
    )
    return distance > mechanic.exclusion_radius_km
  })
}
```

### Phase 3: Revenue Routing
```typescript
// Route revenue based on mode
if (mechanic.clocked_in_by_admin) {
  // ON-SHIFT: 100% to workshop
  revenue.workshop = sessionFee * 0.95
  revenue.mechanic = 0
} else if (mechanic.off_shift_mode === 'revenue_share') {
  // OFF-SHIFT with revenue share
  const workshopShare = sessionFee * 0.95 * (workshop.employee_revenue_share_pct / 100)
  revenue.workshop = workshopShare
  revenue.mechanic = sessionFee * 0.95 - workshopShare
} else {
  // OFF-SHIFT local exclusion
  revenue.mechanic = sessionFee * 0.95
  revenue.workshop = 0
}
```

---

## ✅ SUCCESS METRICS

### For Mechanics
- ✅ Can earn extra income off-shift
- ✅ Clear rules (no gray area)
- ✅ Optional: Choose higher volume (revenue share) or higher margin (local exclusion)

### For Workshops
- ✅ Local customers protected (geographic exclusion)
- ✅ Optional: Passive income from employee off-shift work
- ✅ No fear of platform stealing their business

### For Platform
- ✅ Maximum mechanic availability
- ✅ Workshops become partners, not enemies
- ✅ Scalable model
- ✅ Fair to all parties

---

## 🎉 THE BEAUTY OF THIS MODEL

**It's OPTIONAL and FLEXIBLE:**

1. **Conservative Workshop**: Uses local exclusion, 0% revenue share
   - Mechanic can still freelance (just not locally)
   - Workshop fully protected

2. **Progressive Workshop**: Enables revenue share at 30%
   - Mechanic earns more (more customers)
   - Workshop earns passive income
   - Both benefit

3. **Mechanic's Choice**:
   - Prefers margin? → Stick with local exclusion (95%)
   - Prefers volume? → Request revenue share (65% but 3x customers)

**Everyone wins. Nobody forced. Pure incentive alignment.**

---

**THIS is the solution. What do you think?**
