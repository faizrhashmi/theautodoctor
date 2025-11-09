# Workshop Mechanic Business Model - Complete Solution

**Date**: 2025-11-08
**Status**: PROPOSED SOLUTION

---

## 🎯 THE BUSINESS CHALLENGE

### Three Types of Mechanics

1. **Independent Virtual Mechanics**
   - Self-employed, work from anywhere
   - Clock in/out when they want
   - Keep 95% of session fees (platform takes 5%)
   - Full autonomy

2. **Workshop Employees (ON-SHIFT)**
   - Working at physical workshop during business hours
   - Employer pays their salary/hourly wage
   - Can they take virtual sessions during work hours?
   - Who gets the money?

3. **Workshop Employees (OFF-SHIFT)**
   - Same person, but after their work shift ends
   - At home, not at workshop
   - Can they moonlight as virtual mechanics?
   - How to prevent competition with their employer?

### The Dilemma

❌ **If workshop mechanics can moonlight**: Workshops won't sign up (fear of competition)
❌ **If workshop mechanics can't moonlight**: Mechanics prefer to be independent (more money)
❌ **If on-shift sessions go to workshop**: Mechanics have no incentive
❌ **If on-shift sessions go to mechanic**: Workshop loses control

---

## ✅ THE WINNING SOLUTION

### **"Workshop Partnership Program" with Time-Based Revenue Sharing**

---

## 🏗️ THREE-TIER MECHANIC SYSTEM

### **Tier 1: Independent Virtual Mechanic**
- **Status**: `mechanic_type = 'independent'`
- **Clock In/Out**: Anytime they want
- **Revenue Split**: Keep 95%, platform takes 5%
- **Physical Shop**: No
- **Employer**: Self-employed
- **Dashboard Access**: Full control

---

### **Tier 2: Workshop Employee (Verified)**
- **Status**: `mechanic_type = 'workshop_employee'`
- **Employer**: Linked to workshop account via `workshop_id`
- **Two Operating Modes**:

#### **Mode A: ON-SHIFT (Clocked in at workshop)**
- **Clock In**: Only workshop admin can clock them in
- **Sessions**: Can accept virtual sessions
- **Revenue**: **100% goes to workshop account** (not mechanic)
- **Why**: Mechanic is on employer's time, using employer's equipment/wifi
- **Dashboard**: Shows "ON SHIFT - Sessions go to [Workshop Name]"
- **Mechanic Benefit**: Gets paid hourly/salary by workshop (not session fees)
- **Workshop Benefit**: Gets extra revenue stream without hiring more staff

#### **Mode B: OFF-SHIFT (Personal time)**
- **Clock In**: Workshop admin clocks them out OR shift ends automatically
- **Status**: `is_available = false` (NOT available for sessions)
- **Revenue**: N/A - Cannot take sessions while employed by workshop
- **Why**: Prevents competition with employer
- **Protection Period**: Cannot take sessions for **48 hours after shift ends**
- **Dashboard**: Shows "Off Shift - Sessions disabled per workshop agreement"

---

### **Tier 3: Workshop Owner/Independent Contractor**
- **Status**: `mechanic_type = 'workshop_owner'`
- **Physical Shop**: Yes (`is_workshop = true`)
- **Virtual Sessions**: Yes (can offer both)
- **Revenue Split**: Keep 95% of virtual sessions, 0% platform fee on physical repairs
- **Clock In/Out**: Controls own availability + employee availability

---

## 💰 REVENUE FLOWS

### Independent Virtual Mechanic
```
Customer pays $50 → Platform takes $2.50 (5%) → Mechanic gets $47.50
```

### Workshop Employee (ON-SHIFT)
```
Customer pays $50 → Platform takes $2.50 (5%) → Workshop gets $47.50 → Mechanic gets $0 (gets hourly wage instead)
```

### Workshop Owner (Virtual Session)
```
Customer pays $50 → Platform takes $2.50 (5%) → Workshop owner gets $47.50
```

### Workshop Owner (Physical Repair via Platform)
```
Customer books repair for $500 → Platform takes $0 (0%) → Workshop gets $500
Platform shows workshop to customer (lead generation value)
```

---

## 🔐 PREVENTING THE "MOONLIGHTING" PROBLEM

### Why Workshop Employees Can't Freelance

**Problem**: If workshop mechanic can work independently after hours, they'll:
1. Steal workshop customers ("call me directly")
2. Compete with employer
3. Be tired during work hours
4. Eventually quit to go fully independent

**Solution**: **Employment Agreement + Cooldown Period**

When mechanic signs up as `workshop_employee`:
1. ✅ Workshop admin must approve and link account
2. ✅ Mechanic signs digital agreement: "While employed by [Workshop], I agree not to take independent sessions on this platform"
3. ✅ If mechanic wants to go independent, they must:
   - Give workshop 30-day notice
   - Workshop admin "releases" them in system
   - 48-hour cooldown period before can accept independent sessions
   - Workshop can optionally give "exit bonus" to maintain relationship

### Database Enforcement

```sql
-- Mechanics table
ALTER TABLE mechanics ADD COLUMN mechanic_type VARCHAR(50) CHECK (mechanic_type IN ('independent', 'workshop_employee', 'workshop_owner'));
ALTER TABLE mechanics ADD COLUMN workshop_id UUID REFERENCES workshops(id);
ALTER TABLE mechanics ADD COLUMN employment_status VARCHAR(50) CHECK (employment_status IN ('active', 'notice_period', 'released'));
ALTER TABLE mechanics ADD COLUMN release_date TIMESTAMP; -- Date workshop released mechanic
ALTER TABLE mechanics ADD COLUMN can_accept_independent_sessions BOOLEAN DEFAULT FALSE;

-- Business Rule
-- workshop_employee can ONLY accept sessions when clocked in by workshop admin
-- All session revenue goes to workshop_id, not mechanic
```

---

## 🎁 WHAT'S IN IT FOR EVERYONE?

### For Workshops
✅ **Extra revenue stream** from virtual sessions during downtime
✅ **No competition** - employees can't moonlight
✅ **Better utilization** - mechanics earn money for workshop when not working on cars
✅ **Employee retention** - mechanics get engaging work (not just standing around)
✅ **0% platform fee on physical repairs** - full revenue on core business
✅ **Lead generation** - platform shows workshop to local customers

### For Workshop Mechanics (Employees)
✅ **Stable job** with hourly wage/salary
✅ **Engaging work** - help customers remotely during downtime
✅ **Skill development** - get better at diagnostics
✅ **No financial risk** - don't need to worry about finding customers
✅ **Optional**: Earn bonuses if workshop shares virtual session revenue
✅ **Clear path to independence** - can become independent later (with proper notice)

### For Independent Mechanics
✅ **No restrictions** - full autonomy
✅ **95% revenue share** - keep almost all money
✅ **Flexible schedule** - work whenever they want
✅ **No employer** - true independence

### For Platform
✅ **Workshops won't fear the platform** - we're partners, not competitors
✅ **More mechanics available** - workshop employees during work hours
✅ **Higher quality** - workshop-verified mechanics
✅ **Revenue from both** - virtual sessions (5%) + potential physical repair leads

---

## 🖥️ DASHBOARD DIFFERENCES

### Independent Mechanic Dashboard
```
┌─────────────────────────────────────┐
│ 🟢 You're Online                    │
│ [Clock Out]                         │
│                                     │
│ Earnings Today: $142.50            │
│ Sessions Completed: 3              │
│ Your Share: 95% ($135.37)          │
│ Platform Fee: 5% ($7.13)           │
│                                     │
│ [Session Queue] [Profile] [Stats]  │
└─────────────────────────────────────┘
```

### Workshop Employee Dashboard (ON-SHIFT)
```
┌─────────────────────────────────────┐
│ 🟢 ON SHIFT at AutoFix Workshop     │
│ [Cannot clock out - Contact manager]│
│                                     │
│ Workshop Earnings Today: $95.00    │
│ Sessions You Completed: 2          │
│ Revenue to Workshop: $90.25        │
│ Your Hourly Wage: $25/hr           │
│                                     │
│ ⚠️ All session fees go to workshop  │
│ (You earn hourly wage from employer)│
│                                     │
│ [Session Queue] [Profile]          │
└─────────────────────────────────────┘
```

### Workshop Employee Dashboard (OFF-SHIFT)
```
┌─────────────────────────────────────┐
│ ⚪ OFF SHIFT                         │
│ [Cannot accept sessions]            │
│                                     │
│ You are employed by AutoFix Workshop│
│ Per your employment agreement, you  │
│ cannot accept independent sessions  │
│ while employed.                     │
│                                     │
│ Want to go independent?             │
│ [Request Release from Workshop]     │
│ (Requires 30-day notice)            │
│                                     │
│ [View My Stats] [Profile]          │
└─────────────────────────────────────┘
```

### Workshop Owner/Admin Dashboard
```
┌─────────────────────────────────────┐
│ AutoFix Workshop - Admin Panel      │
│                                     │
│ Your Virtual Sessions Today: $285   │
│ Employee Sessions (Your Revenue):   │
│   • Mike Johnson (ON-SHIFT): $95   │
│   • Sarah Chen (ON-SHIFT): $142    │
│   • Carlos Rodriguez (OFF): $0     │
│                                     │
│ Physical Repair Leads: 3 new       │
│                                     │
│ [Manage Employees]                 │
│ ┌─────────────────────────────────┐│
│ │ Mike Johnson                    ││
│ │ Status: 🟢 ON SHIFT            ││
│ │ [Clock Out]                    ││
│ │ Sessions Today: 2 ($95)        ││
│ └─────────────────────────────────┘│
│                                     │
│ [Clock In Employee] [Add Employee] │
└─────────────────────────────────────┘
```

---

## 🛠️ IMPLEMENTATION CHANGES

### Database Schema

```sql
-- Create workshops table
CREATE TABLE workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id),
  shop_address TEXT,
  shop_hours JSONB,
  phone VARCHAR(50),
  email VARCHAR(255),
  revenue_share_with_employees INTEGER DEFAULT 0, -- Optional: 0-30% bonus to employees
  created_at TIMESTAMP DEFAULT NOW()
);

-- Update mechanics table
ALTER TABLE mechanics ADD COLUMN mechanic_type VARCHAR(50) DEFAULT 'independent'
  CHECK (mechanic_type IN ('independent', 'workshop_employee', 'workshop_owner'));
ALTER TABLE mechanics ADD COLUMN workshop_id UUID REFERENCES workshops(id);
ALTER TABLE mechanics ADD COLUMN employment_status VARCHAR(50) DEFAULT 'active'
  CHECK (employment_status IN ('active', 'notice_period', 'released'));
ALTER TABLE mechanics ADD COLUMN release_date TIMESTAMP;
ALTER TABLE mechanics ADD COLUMN notice_given_date TIMESTAMP;
ALTER TABLE mechanics ADD COLUMN clocked_in_by_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE mechanics ADD COLUMN shift_start_time TIMESTAMP;
ALTER TABLE mechanics ADD COLUMN shift_end_time TIMESTAMP;

-- Session revenue tracking
ALTER TABLE session_requests ADD COLUMN revenue_recipient_type VARCHAR(50)
  CHECK (revenue_recipient_type IN ('mechanic', 'workshop'));
ALTER TABLE session_requests ADD COLUMN revenue_recipient_id UUID; -- mechanic.id or workshop.id
ALTER TABLE session_requests ADD COLUMN revenue_amount DECIMAL(10,2);
ALTER TABLE session_requests ADD COLUMN platform_fee DECIMAL(10,2);
```

### API Endpoints to Create

1. **POST /api/workshop/clock-in-employee**
   - Workshop admin clocks in employee
   - Sets `is_available = true`, `clocked_in_by_admin = true`
   - Records `shift_start_time`

2. **POST /api/workshop/clock-out-employee**
   - Workshop admin clocks out employee
   - Sets `is_available = false`, `clocked_in_by_admin = false`
   - Records `shift_end_time`

3. **POST /api/mechanic/request-release**
   - Employee requests to leave workshop
   - Sets `employment_status = 'notice_period'`
   - Records `notice_given_date`
   - Notifies workshop admin

4. **POST /api/workshop/release-employee**
   - Workshop admin approves release
   - Sets `employment_status = 'released'`
   - Records `release_date`
   - After 48 hours: `mechanic_type = 'independent'`

### Business Logic Rules

```typescript
// When mechanic accepts session
async function assignSessionRevenue(session_id, mechanic_id) {
  const mechanic = await getMechanic(mechanic_id)

  if (mechanic.mechanic_type === 'workshop_employee' && mechanic.clocked_in_by_admin) {
    // Revenue goes to workshop
    await updateSession(session_id, {
      revenue_recipient_type: 'workshop',
      revenue_recipient_id: mechanic.workshop_id,
      revenue_amount: sessionFee * 0.95, // Workshop gets 95%
      platform_fee: sessionFee * 0.05
    })
  } else if (mechanic.mechanic_type === 'independent' || mechanic.mechanic_type === 'workshop_owner') {
    // Revenue goes to mechanic
    await updateSession(session_id, {
      revenue_recipient_type: 'mechanic',
      revenue_recipient_id: mechanic.id,
      revenue_amount: sessionFee * 0.95,
      platform_fee: sessionFee * 0.05
    })
  } else {
    throw new Error('Workshop employee cannot accept sessions when off-shift')
  }
}

// Check if mechanic can accept sessions
function canAcceptSessions(mechanic) {
  if (mechanic.mechanic_type === 'independent') return true
  if (mechanic.mechanic_type === 'workshop_owner') return true
  if (mechanic.mechanic_type === 'workshop_employee' && mechanic.clocked_in_by_admin) return true
  return false
}
```

---

## 🎯 ADDRESSING YOUR SPECIFIC CONCERNS

### "Mechanics would prefer to be virtual mechanics because they would think why would they take sessions while at work"

**Solution**: They CAN'T take independent sessions while employed. It's enforced by system. They have 3 choices:
1. Work as workshop employee (stable wage, no hustle)
2. Work as independent mechanic (hustle, variable income)
3. Start with workshop, learn the business, then request release to go independent (with proper notice)

### "Workshops will not sign up thinking their mechanics are being empowered which they won't like"

**Solution**: Workshops CONTROL the relationship:
- Workshop admin must approve mechanic linking
- Workshop admin controls clock in/out
- Workshop gets 100% of session revenue during shifts
- Mechanic CANNOT moonlight while employed
- Workshop can "release" mechanic if they misbehave
- 0% platform fee on physical repairs (we help workshop, not compete)

### "I want win-win for all and the platform without hurting the interests of workshops firstly"

**Solution**: Workshops BENEFIT from platform:
- Extra revenue stream (virtual sessions during slow periods)
- Better employee utilization (mechanics help customers remotely during downtime)
- Lead generation (platform shows workshop to local customers for physical repairs)
- Employee retention (mechanics engaged, not bored)
- Optional: Revenue sharing bonus (workshop can give 10-30% bonus to mechanics to incentivize good service)

---

## 📋 IMPLEMENTATION ROADMAP

### Phase 1: Database & Core Logic (4-6 hours)
- [ ] Create workshops table
- [ ] Add mechanic_type columns
- [ ] Create workshop admin signup flow
- [ ] Build employee linking system
- [ ] Implement revenue routing logic

### Phase 2: Dashboard Modifications (6-8 hours)
- [ ] Create workshop admin dashboard
- [ ] Modify mechanic dashboard based on mechanic_type
- [ ] Add clock-in/out controls for workshop admin
- [ ] Show different UI for ON-SHIFT vs OFF-SHIFT
- [ ] Add "Request Release" flow

### Phase 3: Session Assignment (2-3 hours)
- [ ] Update session matching to respect mechanic_type
- [ ] Route revenue to correct recipient (workshop vs mechanic)
- [ ] Add revenue tracking and reporting

### Phase 4: Legal & Agreements (2-3 hours)
- [ ] Create employment agreement template
- [ ] Digital signature flow
- [ ] Workshop-mechanic contract management

---

## ✅ SUCCESS CRITERIA

### For Workshops
- Can clock employees in/out remotely
- Receives 100% of session revenue during employee shifts
- Pays 0% platform fee on physical repairs
- Can release employees with proper notice

### For Mechanics
- Clear separation: employee (stable) vs independent (hustle)
- Cannot be forced to moonlight
- Cannot compete with employer
- Clear path to independence if desired

### For Platform
- Fair revenue model (5% on virtual, 0% on physical)
- No workshop-mechanic conflicts
- Scalable business model
- Legal compliance

---

**This model creates TRUE alignment of interests. Workshops don't fear us, mechanics have clear choices, and platform grows sustainably.**
