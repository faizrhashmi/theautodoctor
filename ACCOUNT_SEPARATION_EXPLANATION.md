# Account Separation & Workshop Disconnection - Complete Explanation

**Date**: 2025-11-08
**Topic**: What happens when mechanic leaves workshop

---

## 🎯 THE SCENARIO YOU'RE ASKING ABOUT

```
1. Mike creates account on platform as independent mechanic
2. AutoFix Workshop invites Mike to join as employee
3. Mike accepts invitation → Dual-mode activated
4. Mike works for 6 months
5. Mike quits AutoFix Workshop
6. Workshop admin removes Mike from their team

QUESTION: What happens to Mike's account?
```

---

## ✅ THE ANSWER: ACCOUNT STAYS WITH MIKE

### **Two Separate Things:**

**Thing 1: Mike's Platform Account** (PERMANENT)
- Created by Mike
- Owned by Mike
- Exists forever (or until Mike deletes it)
- Has Mike's Stripe, tax info, profile

**Thing 2: Workshop Integration** (TEMPORARY)
- Link/connection between Mike's account and Workshop
- Created when Mike accepts workshop invitation
- Can be disconnected by either party
- When disconnected, Mike's account remains

---

## 🔗 HOW IT WORKS TECHNICALLY

### **Database Structure:**

```sql
-- Mike's Account (PERMANENT - Mike owns this)
CREATE TABLE mechanics (
  id UUID PRIMARY KEY,  -- Mike's permanent ID
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255),
  email VARCHAR(255),
  stripe_account_id VARCHAR(255),  -- Mike's personal Stripe
  created_at TIMESTAMP
);

-- Workshop's Account (SEPARATE - Workshop owns this)
CREATE TABLE workshops (
  id UUID PRIMARY KEY,  -- AutoFix's permanent ID
  owner_user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255),
  stripe_account_id VARCHAR(255),  -- AutoFix's business Stripe
  created_at TIMESTAMP
);

-- The CONNECTION (TEMPORARY - Can be deleted)
CREATE TABLE workshop_integrations (
  id UUID PRIMARY KEY,
  mechanic_id UUID REFERENCES mechanics(id),  -- Points to Mike
  workshop_id UUID REFERENCES workshops(id),  -- Points to AutoFix

  -- Integration settings
  work_schedule JSONB,
  geographic_restrictions JSONB,

  -- Status
  status VARCHAR(50) DEFAULT 'active',
  -- Can be: 'active', 'disconnected', 'cooling_period'

  created_at TIMESTAMP,
  disconnected_at TIMESTAMP,
  cooling_period_end_date TIMESTAMP
);
```

### **Visual Representation:**

```
BEFORE EMPLOYMENT:
┌─────────────────┐
│ Mike's Account  │
│ (Independent)   │
│                 │
│ Stripe: Mike's  │
│ Status: Active  │
└─────────────────┘

DURING EMPLOYMENT:
┌─────────────────┐          ┌──────────────────┐
│ Mike's Account  │◄─────────┤ Integration Link │
│ (Independent)   │          │                  │
│                 │          │ Schedule: 9-5    │
│ Stripe: Mike's  │          │ Geo: 50km block  │
│ Status: Active  │          │ Status: ACTIVE   │
└─────────────────┘          └────────┬─────────┘
                                      │
                                      │
                             ┌────────▼─────────┐
                             │ AutoFix Workshop │
                             │                  │
                             │ Stripe: AutoFix's│
                             │ Status: Active   │
                             └──────────────────┘

AFTER MIKE QUITS:
┌─────────────────┐          ┌──────────────────┐
│ Mike's Account  │◄─────────┤ Integration Link │
│ (Independent)   │          │                  │
│                 │          │ Status: DISCONNECTED
│ Stripe: Mike's  │          │ Disconnected: 2025-11-15
│ Status: Active  │✅        │ Cooling: 30 days │
└─────────────────┘          └────────┬─────────┘
     ↑                                │
     │                                │
     │                       ┌────────▼─────────┐
     │                       │ AutoFix Workshop │
     │                       │                  │
     └─── Mike's account     │ (Mike removed)   │
          STILL EXISTS       └──────────────────┘
```

---

## 📋 WHAT HAPPENS STEP-BY-STEP

### **Step 1: Mike Quits (Gives Notice)**

**Mike's action**: "I quit AutoFix Workshop"

**System does**:
```sql
UPDATE workshop_integrations
SET
  status = 'notice_period',
  notice_given_date = NOW()
WHERE mechanic_id = mike.id
  AND workshop_id = autofixworkshop.id
  AND status = 'active';
```

**Result**:
- ✅ Mike's account still exists
- ✅ Integration status = 'notice_period'
- ✅ Mike still works for AutoFix (2-week notice)
- ✅ During notice: Revenue routing still active

---

### **Step 2: Workshop Admin Removes Mike**

**Workshop action**: Admin clicks "Remove Employee" in dashboard

**System does**:
```sql
UPDATE workshop_integrations
SET
  status = 'disconnected',
  disconnected_at = NOW(),
  cooling_period_end_date = NOW() + INTERVAL '30 days'
WHERE mechanic_id = mike.id
  AND workshop_id = autofixworkshop.id;

-- Mike's account is NOT deleted, NOT modified
-- Only the LINK is disconnected
```

**Result**:
- ✅ Mike's account STILL EXISTS (unchanged)
- ✅ Integration link status = 'disconnected'
- ✅ Revenue routing STOPS
- ✅ Geographic restrictions STILL ACTIVE (30-day cooling)
- ✅ Mike can work independently immediately

---

### **Step 3: Mike Works Independently**

**Immediately after disconnection**:

```
Mike's Account Status:
┌────────────────────────────────────────────────┐
│ Account: ACTIVE ✅                             │
│ Type: Independent Mechanic                     │
│ Stripe: Mike's personal account                │
│                                                │
│ Previous Employment: AutoFix Workshop          │
│ Status: DISCONNECTED                           │
│ Cooling Period: 29 days remaining              │
│                                                │
│ RESTRICTIONS (During Cooling Period):          │
│ ⚠️ Toronto 50km customers STILL BLOCKED       │
│ ✅ Can serve customers outside Toronto         │
│                                                │
│ After cooling period (29 days):                │
│ ✅ All restrictions will be lifted             │
│ ✅ Full access to all Canadian customers       │
└────────────────────────────────────────────────┘
```

**Mike can accept sessions**:
```typescript
// System checks when Mike tries to accept session
async function canAcceptSession(mechanicId: string, customerPostalCode: string) {
  const mechanic = await getMechanic(mechanicId)

  // Check if mechanic has any active cooling period
  const coolingPeriods = await db.query(`
    SELECT * FROM workshop_integrations
    WHERE mechanic_id = $1
      AND status = 'disconnected'
      AND cooling_period_end_date > NOW()
  `, [mechanicId])

  if (coolingPeriods.length > 0) {
    // Still in cooling period, check geographic restrictions
    for (const integration of coolingPeriods) {
      if (isInRestrictedZone(customerPostalCode, integration)) {
        return {
          allowed: false,
          reason: 'Customer in restricted zone (cooling period active)',
          days_remaining: calculateDaysRemaining(integration.cooling_period_end_date)
        }
      }
    }
  }

  // No restrictions OR customer outside restricted zone
  return {
    allowed: true,
    recipient_stripe_account: mechanic.stripe_account_id,  // Mike's Stripe
    revenue_split: {
      mechanic: 95%,
      platform: 5%
    }
  }
}
```

---

### **Step 4: Cooling Period Ends (30 Days Later)**

**Automatic system process**:
```sql
-- Runs daily at midnight
UPDATE workshop_integrations
SET status = 'expired'
WHERE status = 'disconnected'
  AND cooling_period_end_date < NOW();
```

**Result**:
```
Mike's Account Status:
┌────────────────────────────────────────────────┐
│ Account: ACTIVE ✅                             │
│ Type: Independent Mechanic                     │
│ Stripe: Mike's personal account                │
│                                                │
│ Previous Employment: AutoFix Workshop          │
│ Status: EXPIRED (cooling period ended)         │
│                                                │
│ RESTRICTIONS: NONE ✅                          │
│ ✅ Can serve ALL Canadian customers            │
│ ✅ Toronto area now accessible                 │
│ ✅ Full independence restored                  │
└────────────────────────────────────────────────┘
```

---

## 🔍 WORKSHOP'S VIEW

### **During Employment:**

```
AutoFix Workshop Dashboard

Team Members:
┌────────────────────────────────────────────────┐
│ Mike Johnson                                   │
│ Status: 🟢 Active Employee                    │
│ Schedule: Mon-Fri 9am-5pm                      │
│                                                │
│ This Week's Performance:                       │
│ • Workshop sessions: 15 → $712.50 to you      │
│ • Independent activity: 8 sessions (verified) │
│                                                │
│ [View Details] [Edit Schedule] [Remove]        │
└────────────────────────────────────────────────┘
```

### **After Mike Quits (Admin Removes Him):**

```
AutoFix Workshop Dashboard

Team Members:
┌────────────────────────────────────────────────┐
│ No active employees                            │
│ [Add Employee]                                 │
└────────────────────────────────────────────────┘

Past Employees:
┌────────────────────────────────────────────────┐
│ Mike Johnson                                   │
│ Status: ⚪ Disconnected (Nov 15, 2025)        │
│ Employment period: 6 months                    │
│ Total revenue generated: $18,450               │
│                                                │
│ Cooling period: Active (29 days remaining)     │
│ Geographic protection: Still enforced ✅       │
│                                                │
│ [View History] [Re-invite]                     │
└────────────────────────────────────────────────┘
```

**Key Points**:
- ✅ Workshop can see Mike is disconnected
- ✅ Workshop can see cooling period is active (protection continues)
- ✅ Workshop can still see historical data
- ✅ Workshop CAN re-invite Mike later (if both agree)
- ✅ Mike is NOT deleted from system, just disconnected

---

## 🎭 DIFFERENT SCENARIOS

### **Scenario 1: Amicable Separation**

```
Mike: "I'm moving to Vancouver, can't work at your shop anymore"
Workshop: "Understood, good luck! Thanks for 6 months"

System:
1. Workshop admin clicks "Remove Employee"
2. System offers: "Apply cooling period?" [Yes] [No, full trust]
3. Workshop chooses: [No, full trust]
4. Mike's account: Immediately unrestricted ✅
5. Mike can serve Toronto customers immediately
```

### **Scenario 2: Bad Separation**

```
Mike: "I quit, I'm opening my own shop in Toronto"
Workshop: "You're trying to steal my customers!"

System:
1. Workshop admin clicks "Remove Employee"
2. System offers: "Apply cooling period?" [Yes] [No, full trust]
3. Workshop chooses: [Yes, 30 days]
4. Mike's account: Toronto blocked for 30 days ⚠️
5. Mike can still work (outside Toronto)
6. After 30 days: Full access restored
```

### **Scenario 3: Mike Has Multiple Workshop Jobs**

```
Mike works for:
- AutoFix Workshop (Toronto) - Mon-Wed 9am-5pm
- QuickLube Shop (Mississauga) - Thu-Fri 9am-5pm

Mike quits AutoFix, keeps QuickLube:

System:
┌────────────────────────────────────────────────┐
│ Mike's Account                                 │
│                                                │
│ Workshop Integrations:                         │
│                                                │
│ 1. AutoFix Workshop                            │
│    Status: DISCONNECTED ⚪                     │
│    Cooling: 29 days                            │
│    Restriction: Toronto 50km                   │
│                                                │
│ 2. QuickLube Shop                              │
│    Status: ACTIVE 🟢                          │
│    Schedule: Thu-Fri 9am-5pm                   │
│    Restriction: Mississauga 50km               │
│                                                │
│ Combined Restrictions (Independent Mode):      │
│ ❌ Toronto 50km (AutoFix cooling)             │
│ ❌ Mississauga 50km (QuickLube active)        │
│ ✅ Rest of Canada available                   │
└────────────────────────────────────────────────┘

Revenue Routing:
- Thu-Fri 9am-5pm: Sessions → QuickLube Stripe
- All other times: Sessions → Mike's Stripe
  (except blocked zones)
```

---

## 🛡️ DATA RETENTION & PRIVACY

### **What Workshop Can See After Disconnection:**

**Can See (Historical Business Records)**:
```sql
SELECT
  session_id,
  customer_name,
  session_date,
  revenue_to_workshop,
  mechanic_name
FROM workshop_session_history
WHERE workshop_id = autofixworkshop.id
  AND mechanic_id = mike.id
  AND session_date BETWEEN employment_start AND employment_end;
```

**Example**:
```
Historical Sessions (Your Business Records):
┌────────────────────────────────────────────────┐
│ Oct 15, 2025 10:30am                           │
│ Customer: John Smith - Brake noise            │
│ Revenue to workshop: $47.50                    │
│ Mechanic: Mike Johnson                         │
└────────────────────────────────────────────────┘

Total sessions by Mike during employment: 450
Total revenue generated for workshop: $18,450
```

**Cannot See (Privacy Protected)**:
- ❌ Mike's current independent sessions
- ❌ Mike's current earnings
- ❌ Mike's new workshop integrations (if any)
- ❌ Mike's personal Stripe balance

**Can See (Limited - Cooling Period Verification Only)**:
- ✅ Whether cooling period is active
- ✅ Number of days remaining
- ✅ Whether geographic restrictions are enforced

---

## 🔐 SECURITY & CONTROL

### **Who Can Disconnect the Integration?**

**Option 1: Workshop Admin Removes Mike**
```typescript
// Workshop admin clicks "Remove Employee"
async function workshopRemovesEmployee(workshopId: string, mechanicId: string) {
  // Verify admin is owner of workshop
  const workshop = await getWorkshop(workshopId)
  const currentUser = await getCurrentUser()

  if (workshop.owner_user_id !== currentUser.id) {
    throw new Error('Not authorized')
  }

  // Disconnect integration
  await db.query(`
    UPDATE workshop_integrations
    SET
      status = 'disconnected',
      disconnected_at = NOW(),
      disconnected_by = 'workshop',
      cooling_period_end_date = NOW() + INTERVAL '30 days'
    WHERE workshop_id = $1 AND mechanic_id = $2
  `, [workshopId, mechanicId])

  // Mike's account is NOT touched
  // Only the link is disconnected
}
```

**Option 2: Mike Leaves Workshop**
```typescript
// Mike clicks "Leave Workshop" in his settings
async function mechanicLeavesWorkshop(mechanicId: string, workshopId: string) {
  // Verify current user is the mechanic
  const mechanic = await getMechanic(mechanicId)
  const currentUser = await getCurrentUser()

  if (mechanic.user_id !== currentUser.id) {
    throw new Error('Not authorized')
  }

  // Disconnect integration
  await db.query(`
    UPDATE workshop_integrations
    SET
      status = 'disconnected',
      disconnected_at = NOW(),
      disconnected_by = 'mechanic',
      cooling_period_end_date = NOW() + INTERVAL '30 days'
    WHERE workshop_id = $1 AND mechanic_id = $2
  `, [workshopId, mechanicId])

  // Mike's account is still his
  // He just disconnected from workshop
}
```

**Key Point**:
- ✅ Disconnecting = Breaking the link
- ❌ NOT deleting Mike's account
- ✅ Mike's account exists before, during, and after employment

---

## 📊 LIFECYCLE DIAGRAM

```
TIME →

Day 0: Mike Creates Account
├── Account Type: Independent
├── Stripe: Mike's
└── Status: Active ✅

Day 30: AutoFix Invites Mike
├── Mike receives invitation
├── Mike reviews terms
└── Mike can accept or decline

Day 31: Mike Accepts
├── Integration created (link)
├── Mike's account: Still independent
├── Dual-mode activated
└── Both modes available

Day 31-210: Employment (6 months)
├── Mon-Fri 9-5: Workshop mode → AutoFix Stripe
├── After hours: Independent mode → Mike's Stripe
├── Mike's account: Still his
└── Integration: Active link

Day 210: Mike Quits
├── Mike gives 2-week notice
├── Integration status: Notice period
└── Mike's account: Still active

Day 224: Last Day of Work
├── Workshop admin removes Mike
├── Integration status: Disconnected
├── Mike's account: STILL EXISTS ✅
├── Cooling period: Starts (30 days)
└── Restrictions: Still active

Day 225-254: Cooling Period
├── Mike works independently
├── Toronto blocked (cooling period)
├── Rest of Canada available
└── Mike's account: Fully active

Day 254: Cooling Period Ends
├── Integration status: Expired
├── Restrictions: Lifted
├── Mike's account: Full independence
└── Mike can serve any customer

Day 255+: Future
├── Mike could join another workshop
├── Mike could rejoin AutoFix (if both agree)
├── Mike could stay independent forever
└── Mike's account: ALWAYS HIS ✅
```

---

## ✅ FINAL ANSWER TO YOUR QUESTION

**Q: "Workshop admin will delete him from the team, so how account will remain?"**

**A: The account ALWAYS remains because:**

1. **Separate Entities**:
   - Mike's account = Permanent (owned by Mike)
   - Workshop integration = Temporary link (can be deleted)
   - Deleting the LINK doesn't delete the ACCOUNT

2. **Like Real World Analogy**:
   ```
   Mike has Gmail account (mike@gmail.com)
   Mike's work uses Google Workspace
   Mike connects personal Gmail to work Google Workspace
   Mike quits job
   Work admin removes Mike from Google Workspace

   Result: Mike's personal Gmail still exists! ✅

   Same concept:
   Mike has platform account
   Mike connects to AutoFix Workshop
   Mike quits
   AutoFix removes Mike from workshop

   Result: Mike's platform account still exists! ✅
   ```

3. **Database Design**:
   ```sql
   -- Mike's account (NEVER deleted by workshop)
   mechanics table: Mike's row stays forever

   -- Workshop integration (CAN be deleted)
   workshop_integrations table: Link row deleted/disconnected

   -- Deleting link ≠ Deleting account
   ```

4. **Revenue Routing Changes**:
   ```
   Before disconnection:
   - 9am-5pm: Sessions → AutoFix Stripe
   - After 5pm: Sessions → Mike's Stripe

   After disconnection:
   - All times: Sessions → Mike's Stripe
   (except cooling period restrictions)
   ```

5. **Mike's Permissions**:
   ```
   Before: Dual-mode (workshop + independent)
   After: Independent only (link removed)
   Account: STILL EXISTS, STILL ACTIVE ✅
   ```

---

**BOTTOM LINE**:

**Workshop "deleting" Mike from their team = Disconnecting the integration link**

**It does NOT = Deleting Mike's account**

**Mike's account is his property, created by him, exists independently of any workshop relationships.**

**Workshop integration is just a TEMPORARY CONNECTION, like plugging in a cable. Unplugging the cable doesn't destroy either device.**

---

**Does this clarify the account separation? The key is: Account ownership vs Integration link.**
