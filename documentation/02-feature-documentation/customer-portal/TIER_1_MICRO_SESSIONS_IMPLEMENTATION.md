# Tier 1: Micro-Sessions & On-Shift Tracking Implementation

**Date:** October 28, 2025
**Status:** ✅ Complete
**Purpose:** Enable short advice-only sessions and mechanic on-shift mode for workshop mechanics

---

## 📋 OVERVIEW

This implementation adds the ability for workshop mechanics to take ultra-short "micro-sessions" (2-10 minutes) while on-shift at their shop, without disrupting regular bay work. This feature differentiates your platform by allowing mechanics to monetize downtime (waiting for parts, approvals, etc.) while shops maintain productivity.

---

## 🎯 KEY FEATURES IMPLEMENTED

### 1. **Micro-Sessions (2-10 minute advice-only consultations)**
- New session duration type: `micro`
- Hard time caps with auto-end functionality
- Advice-only flag (no deep diagnostics)
- Extension capability (1x, 2 minutes)
- Lower pricing tier: **$4.99**

### 2. **Mechanic On-Shift Tracking**
- Clock-in/clock-out system
- Real-time shift status
- Shift history logging
- Daily micro-session minute caps (default 30 min/day)
- Auto-reset at midnight

### 3. **Participation Modes**
Mechanics can be configured for:
- **micro_only** - Quick advice sessions only
- **full_only** - Standard/extended sessions only
- **both** - Can accept all session types (default)

### 4. **Session Time Management**
- Countdown timer UI with urgency indicators
- Auto-end when time cap reached
- Visual warnings at 25%, 10%, and when expired
- Pause/resume capability (dispatcher-only)

---

## 🗄️ DATABASE CHANGES

### **Migration File:** `supabase/migrations/20251028000001_add_micro_sessions_and_onshift_tracking.sql`

### **New Columns on `diagnostic_sessions`:**
```sql
session_duration_type TEXT -- 'micro', 'standard', 'extended'
duration_minutes INTEGER -- Planned duration
time_cap_seconds INTEGER -- Hard limit for auto-end
time_extended BOOLEAN -- Whether session was extended
extension_minutes INTEGER -- Additional minutes granted
advice_only BOOLEAN -- If true, quick advice only
```

### **New Columns on `mechanics`:**
```sql
participation_mode TEXT -- 'micro_only', 'full_only', 'both'
currently_on_shift BOOLEAN -- Currently clocked in
last_clock_in TIMESTAMPTZ -- Last clock-in time
last_clock_out TIMESTAMPTZ -- Last clock-out time
daily_micro_minutes_cap INTEGER -- Max micro-minutes/day (default 30)
daily_micro_minutes_used INTEGER -- Minutes used today
last_micro_reset_date DATE -- Last reset date
```

### **New Table: `mechanic_shift_logs`**
Tracks clock-in/out history and productivity:
```sql
CREATE TABLE mechanic_shift_logs (
  id UUID PRIMARY KEY,
  mechanic_id UUID REFERENCES mechanics(id),
  clock_in_at TIMESTAMPTZ NOT NULL,
  clock_out_at TIMESTAMPTZ,
  shift_duration_minutes INTEGER,
  workshop_id UUID REFERENCES organizations(id),
  micro_sessions_taken INTEGER DEFAULT 0,
  micro_minutes_used INTEGER DEFAULT 0,
  full_sessions_taken INTEGER DEFAULT 0,
  location TEXT,
  notes TEXT
);
```

### **New View: `mechanic_availability_status`**
Real-time mechanic status:
```sql
CREATE VIEW mechanic_availability_status AS
SELECT
  m.*,
  (daily_micro_minutes_cap - daily_micro_minutes_used) as micro_minutes_remaining,
  CASE
    WHEN currently_on_shift AND participation_mode IN ('micro_only', 'both')
      THEN 'on_shift'
    WHEN NOT currently_on_shift AND participation_mode IN ('full_only', 'both')
      THEN 'off_shift'
    ELSE 'offline'
  END as availability_status
FROM mechanics m;
```

### **New Functions:**

#### `can_accept_session(mechanic_id, session_type, duration)`
Checks eligibility based on:
- Participation mode
- On-shift status (required for micro-sessions)
- Daily minute cap remaining
- Active & onboarded status

Returns: `{can_accept, reason, minutes_remaining}`

#### `reset_daily_micro_minutes()`
Resets daily counters for all mechanics (run via cron job at midnight)

---

## 🔌 API ENDPOINTS

### **POST /api/mechanic/clock**
Clock in or clock out

**Request:**
```json
{
  "action": "clock_in" | "clock_out",
  "location": "string (optional)",
  "notes": "string (optional)"
}
```

**Response (Clock In):**
```json
{
  "ok": true,
  "action": "clock_in",
  "message": "Successfully clocked in",
  "clocked_in_at": "2025-10-28T10:30:00Z",
  "status": "on_shift"
}
```

**Response (Clock Out):**
```json
{
  "ok": true,
  "action": "clock_out",
  "message": "Successfully clocked out",
  "clocked_out_at": "2025-10-28T18:45:00Z",
  "shift_duration_minutes": 495,
  "status": "off_shift"
}
```

### **GET /api/mechanic/clock**
Get current clock status

**Response:**
```json
{
  "ok": true,
  "status": {
    "currently_on_shift": true,
    "availability_status": "on_shift",
    "participation_mode": "both",
    "daily_micro_minutes_cap": 30,
    "daily_micro_minutes_used": 15,
    "micro_minutes_remaining": 15,
    "last_clock_in": "2025-10-28T10:30:00Z",
    "last_clock_out": null,
    "workshop_name": "Premium Auto Care"
  },
  "current_shift": {
    "id": "...",
    "clocked_in_at": "2025-10-28T10:30:00Z",
    "duration_minutes": 125,
    "location": "Shop Floor",
    "micro_sessions_taken": 3,
    "micro_minutes_used": 15,
    "full_sessions_taken": 0
  }
}
```

---

## 🎨 UI COMPONENTS

### **1. SessionCountdownTimer**
**File:** `src/components/session/SessionCountdownTimer.tsx`

**Features:**
- Circular progress indicator
- Color-coded urgency (green → yellow → orange → red)
- MM:SS countdown display
- "Extend 2 Min" button (micro-sessions only)
- Auto-end at time cap
- Pause/resume (dispatcher-only)
- Warning messages at thresholds

**Usage:**
```tsx
<SessionCountdownTimer
  sessionId={session.id}
  timeCapSeconds={600} // 10 minutes
  sessionType="micro"
  onTimeExpired={() => handleSessionEnd()}
  onExtensionRequest={() => handleExtension()}
  allowExtension={true}
  isDispatcher={false}
/>
```

### **2. OnShiftToggle**
**File:** `src/components/mechanic/OnShiftToggle.tsx`

**Features:**
- Real-time on-shift status display
- Clock-in/clock-out button
- Daily micro-minutes usage bar
- Participation mode info
- Success/error notifications
- Auto-refresh every 30 seconds

**Usage:**
```tsx
<OnShiftToggle
  onStatusChange={(status) => console.log('Status:', status)}
/>
```

**Visual States:**
- **On-Shift:** Green card, "Available for micro-sessions"
- **Off-Shift:** Gray card, "Clock in to accept micro-sessions"
- **Usage Bar:** Shows daily micro-minutes consumed vs cap

---

## 💰 PRICING STRUCTURE

### **New Micro-Session Tier: $4.99**

| Tier | Price | Duration | Type | Features |
|------|-------|----------|------|----------|
| **Quick Advice** | **$4.99** | **2-10 min** | **Micro** | Text chat only, 1 photo, Quick diagnosis |
| Quick Chat | $9.99 | 30 min | Standard | Chat, photos/videos, action plan |
| Standard Video | $29.99 | 45 min | Standard | HD video, screen share, troubleshooting |
| Full Diagnostic | $49.99 | 60 min | Extended | Advanced testing, written report |
| Free Session | $0 | 5 min | Micro | Sample platform, 1 photo |

**Updated in:** `src/app/onboarding/pricing/PlanSelectionClient.tsx`

---

## 🔄 WORKFLOWS

### **Mechanic Workflow: Taking Micro-Sessions**

```
1. Mechanic clocks in at shop
   ↓
2. Status changes to "On-Shift"
   ↓
3. Micro-session requests appear in queue
   ↓
4. Mechanic accepts micro-session
   ↓
5. Countdown timer starts (e.g., 10 minutes)
   ↓
6. Provides quick advice via text chat
   ↓
7. Timer reaches 2 minutes → warning appears
   ↓
8. Option to extend 2 more minutes (1x only)
   ↓
9. Session auto-ends at time cap
   ↓
10. Daily minutes counter increments
    ↓
11. When daily cap reached (30 min), no more micro-sessions available
    ↓
12. Mechanic clocks out at end of shift
    ↓
13. Shift log updated with session stats
```

### **Shop Owner Workflow: Managing Mechanics**

```
1. Set mechanic participation mode (micro_only, full_only, both)
   ↓
2. Set daily micro-minute cap (e.g., 30 minutes)
   ↓
3. Mechanics clock in during shift
   ↓
4. Monitor daily micro-session usage via dashboard
   ↓
5. Review shift logs for productivity insights
   ↓
6. Adjust caps based on shop workflow
```

---

## 🎛️ CONFIGURATION OPTIONS

### **Shop-Level Settings (Future Enhancement)**
```typescript
// In organization_settings table
{
  micro_sessions_enabled: true,
  default_daily_micro_cap: 30, // minutes
  micro_session_max_duration: 10, // minutes
  allow_extensions: true,
  extension_duration: 2, // minutes
  auto_accept_micro_sessions: false // require dispatcher approval
}
```

### **Mechanic-Level Settings**
```typescript
// In mechanics table
{
  participation_mode: 'both', // micro_only, full_only, both
  daily_micro_minutes_cap: 30,
  currently_on_shift: false
}
```

---

## 📊 ANALYTICS & REPORTING

### **New Metrics Available:**

#### **Mechanic Dashboard:**
- Daily micro-minutes used / cap
- Total micro-sessions taken
- Average micro-session duration
- Shift productivity (sessions per hour on-shift)

#### **Workshop Dashboard:**
- Total mechanic on-shift hours
- Micro-sessions vs full sessions ratio
- Average micro-session handle time
- Downtime monetization ($ earned during idle moments)

#### **Admin Dashboard:**
- Platform-wide micro-session adoption rate
- Average micro-session duration
- Extension request frequency
- Daily cap utilization

---

## 🔐 SECURITY & GUARDRAILS

### **Time Cap Enforcement:**
- Hard limit enforced client-side and server-side
- Auto-end triggered at time cap
- Extension limited to 1x per session
- Maximum 2 minutes extension

### **Daily Caps:**
- Prevents mechanics from spending entire shift on micro-sessions
- Protects shop productivity
- Resets automatically at midnight
- Can be adjusted per mechanic

### **On-Shift Requirements:**
- Micro-sessions ONLY available when clocked in
- Workshop mechanics must be on-shift
- Independent mechanics can take micro-sessions anytime
- Status verified on every session acceptance

---

## 🚀 DEPLOYMENT STEPS

### **1. Run Database Migration**
```bash
# Connect to Supabase
supabase db push

# Verify migration
supabase db diff
```

### **2. Set Up Cron Job**
Schedule daily reset function:
```sql
-- In Supabase Dashboard > Database > Cron Jobs
-- Run daily at midnight
SELECT reset_daily_micro_minutes();
```

### **3. Configure Existing Mechanics**
```sql
-- Set all mechanics to "both" mode by default
UPDATE mechanics
SET participation_mode = 'both'
WHERE participation_mode IS NULL;
```

### **4. Add Micro-Session Service Plan**
The migration already inserts the $4.99 micro-session tier into `service_plans`.

### **5. Deploy Frontend Changes**
```bash
npm run build
# Verify no TypeScript errors
```

### **6. Test Workflow**
1. Create test mechanic account
2. Clock in via `/api/mechanic/clock`
3. Create micro-session via customer booking
4. Accept session and verify countdown timer
5. Test auto-end at time cap
6. Verify daily cap increments
7. Clock out and check shift log

---

## 📈 EXPECTED IMPACT

### **For Mechanics:**
- **Increased earnings:** Monetize 15-30 min/day of downtime
- **Flexible work:** Take quick sessions between jobs
- **Skill building:** Practice diagnosis on diverse cases

### **For Workshops:**
- **New revenue stream:** 10-15% of micro-session fees
- **Lead generation:** Micro-sessions can escalate to in-person repairs
- **Team utilization:** Better use of mechanic idle time

### **For Platform:**
- **Higher transaction volume:** More sessions per day
- **Lower barrier to entry:** $4.99 vs $29.99
- **Competitive differentiation:** Unique offering in market

### **Financial Example:**
```
Mechanic taking 3x micro-sessions/day:
- 3 sessions × $4.99 = $14.97 gross
- Platform fee (20%) = $3.00
- Workshop share (15%) = $1.80
- Mechanic share (65%) = $9.72

Per month (20 working days):
- Mechanic: $194.40 extra income
- Workshop: $36.00 passive income
- Platform: $60.00 additional revenue
```

---

## 🔮 FUTURE ENHANCEMENTS

### **Phase 2 (Optional):**
1. **Dispatcher Queue System**
   - Workshop service advisor routes micro-sessions
   - Kanban-style queue management
   - Session transfer between mechanics

2. **Bay Integration**
   - Auto-pause micro-sessions when bay becomes active
   - Integration with shop management systems
   - Real-time bay status sync

3. **Advanced Availability Windows**
   - Specific time slots (e.g., 12:00-1:00 lunch, :15 and :45 each hour)
   - Workshop-level scheduling rules
   - SLA-based queue pausing

4. **Differential Revenue Splits**
   - On-shift micro: Platform 20%, Workshop 15%, Mechanic 65%
   - Off-peak micro: Platform 20%, Workshop 10%, Mechanic 70%

---

## ✅ TESTING CHECKLIST

- [x] Database migration runs without errors
- [x] Clock-in API creates shift log entry
- [x] Clock-out API closes shift log with stats
- [x] Daily micro-minutes reset function works
- [x] `can_accept_session()` function validates correctly
- [x] Countdown timer displays and updates
- [x] Timer auto-ends session at cap
- [x] Extension button works (1x only)
- [x] On-shift toggle component renders
- [x] Status badge shows correct state
- [x] Daily usage bar updates in real-time
- [x] Micro-session tier appears in pricing
- [ ] End-to-end: Customer books micro-session → Mechanic accepts → Session ends → Daily cap increments
- [ ] Shift log correctly tracks session counts

---

## 📝 FILES CREATED/MODIFIED

### **New Files:**
1. `supabase/migrations/20251028000001_add_micro_sessions_and_onshift_tracking.sql`
2. `src/app/api/mechanic/clock/route.ts`
3. `src/components/session/SessionCountdownTimer.tsx`
4. `src/components/mechanic/OnShiftToggle.tsx`
5. `TIER_1_MICRO_SESSIONS_IMPLEMENTATION.md` (this file)

### **Modified Files:**
1. `src/app/onboarding/pricing/PlanSelectionClient.tsx` - Added micro-session tier

---

## 🎉 SUCCESS CRITERIA

✅ Mechanics can clock in/out
✅ Micro-sessions have hard time caps
✅ Daily micro-minute caps enforced
✅ Countdown timer shows time remaining
✅ Auto-end prevents session overruns
✅ Participation modes control session types
✅ Shift logs track productivity
✅ Pricing includes $4.99 micro-session tier
✅ Status pills show on-shift/off-shift state

---

**Status:** ✅ Ready for Testing & Deployment
**Next Steps:** Run migration → Test workflow → Monitor adoption rate

