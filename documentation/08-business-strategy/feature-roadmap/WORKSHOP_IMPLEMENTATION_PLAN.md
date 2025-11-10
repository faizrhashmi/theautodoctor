# Workshop Mechanic System - Implementation Plan

**Date**: 2025-11-08
**Priority**: HIGH
**Estimated Time**: 14-20 hours

---

## 📊 WHAT WE'RE BUILDING

A three-tier mechanic system that prevents workshop-mechanic conflicts while creating value for everyone.

---

## 🗄️ PHASE 1: DATABASE SCHEMA (2-3 hours)

### Migration 1: Create Workshops Table

```sql
-- File: supabase/migrations/100000000001_create_workshops.sql

CREATE TABLE workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id) NOT NULL,
  shop_address TEXT,
  city VARCHAR(100),
  province VARCHAR(50),
  postal_code VARCHAR(10),
  country VARCHAR(100) DEFAULT 'Canada',
  phone VARCHAR(50),
  email VARCHAR(255),
  shop_hours JSONB, -- {"monday": {"open": "08:00", "close": "17:00"}, ...}
  accepts_physical_bookings BOOLEAN DEFAULT TRUE,
  revenue_share_with_employees INTEGER DEFAULT 0 CHECK (revenue_share_with_employees >= 0 AND revenue_share_with_employees <= 30),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX idx_workshops_owner ON workshops(owner_user_id);
CREATE INDEX idx_workshops_status ON workshops(status) WHERE status = 'active';
CREATE INDEX idx_workshops_location ON workshops(city, province, country);

-- RLS policies
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workshop owners can view their own workshop"
  ON workshops FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Workshop owners can update their own workshop"
  ON workshops FOR UPDATE
  USING (owner_user_id = auth.uid());

CREATE POLICY "Anyone can view active workshops"
  ON workshops FOR SELECT
  USING (status = 'active');
```

### Migration 2: Update Mechanics Table

```sql
-- File: supabase/migrations/100000000002_add_mechanic_types.sql

-- Add mechanic type columns
ALTER TABLE mechanics
ADD COLUMN mechanic_type VARCHAR(50) DEFAULT 'independent'
  CHECK (mechanic_type IN ('independent', 'workshop_employee', 'workshop_owner')),
ADD COLUMN workshop_id UUID REFERENCES workshops(id) ON DELETE SET NULL,
ADD COLUMN employment_status VARCHAR(50) DEFAULT 'active'
  CHECK (employment_status IN ('active', 'notice_period', 'released')),
ADD COLUMN notice_given_date TIMESTAMP,
ADD COLUMN release_date TIMESTAMP,
ADD COLUMN clocked_in_by_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN shift_start_time TIMESTAMP,
ADD COLUMN shift_end_time TIMESTAMP,
ADD COLUMN last_shift_duration INTEGER; -- in minutes

-- Business rule: workshop employees must have workshop_id
CREATE OR REPLACE FUNCTION check_workshop_employee_has_workshop()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mechanic_type = 'workshop_employee' AND NEW.workshop_id IS NULL THEN
    RAISE EXCEPTION 'Workshop employees must be linked to a workshop';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_workshop_employee_linked
  BEFORE INSERT OR UPDATE ON mechanics
  FOR EACH ROW
  EXECUTE FUNCTION check_workshop_employee_has_workshop();

-- Indexes
CREATE INDEX idx_mechanics_type ON mechanics(mechanic_type);
CREATE INDEX idx_mechanics_workshop ON mechanics(workshop_id) WHERE workshop_id IS NOT NULL;
CREATE INDEX idx_mechanics_clocked_in ON mechanics(clocked_in_by_admin) WHERE clocked_in_by_admin = TRUE;

-- Update is_available logic: workshop employees can only be available when clocked in by admin
CREATE OR REPLACE FUNCTION enforce_workshop_employee_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mechanic_type = 'workshop_employee' THEN
    -- Workshop employees can only be available when clocked in by admin
    IF NEW.is_available = TRUE AND NEW.clocked_in_by_admin = FALSE THEN
      RAISE EXCEPTION 'Workshop employees can only be available when clocked in by admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_employee_availability
  BEFORE INSERT OR UPDATE ON mechanics
  FOR EACH ROW
  EXECUTE FUNCTION enforce_workshop_employee_availability();
```

### Migration 3: Update Session Requests for Revenue Routing

```sql
-- File: supabase/migrations/100000000003_add_revenue_routing.sql

ALTER TABLE session_requests
ADD COLUMN revenue_recipient_type VARCHAR(50)
  CHECK (revenue_recipient_type IN ('mechanic', 'workshop')),
ADD COLUMN revenue_recipient_id UUID, -- References either mechanics.id or workshops.id
ADD COLUMN revenue_amount DECIMAL(10,2),
ADD COLUMN platform_fee DECIMAL(10,2),
ADD COLUMN workshop_employee_bonus DECIMAL(10,2) DEFAULT 0; -- Optional bonus from workshop

-- Index for revenue reporting
CREATE INDEX idx_session_revenue_recipient ON session_requests(revenue_recipient_type, revenue_recipient_id);

COMMENT ON COLUMN session_requests.revenue_recipient_type IS 'Who receives the session revenue: mechanic (independent/owner) or workshop (for employee sessions)';
COMMENT ON COLUMN session_requests.revenue_recipient_id IS 'ID of the recipient (mechanics.id or workshops.id)';
COMMENT ON COLUMN session_requests.workshop_employee_bonus IS 'Optional bonus paid to employee from workshop revenue share';
```

### Migration 4: Create Workshop Employees Junction Table

```sql
-- File: supabase/migrations/100000000004_create_workshop_employees.sql

CREATE TABLE workshop_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  employment_start_date TIMESTAMP DEFAULT NOW(),
  employment_end_date TIMESTAMP,
  hourly_wage DECIMAL(10,2), -- Optional, for workshop records
  agreement_signed BOOLEAN DEFAULT FALSE,
  agreement_signed_at TIMESTAMP,
  can_be_clocked_in BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(mechanic_id) -- Mechanic can only work for one workshop at a time
);

CREATE INDEX idx_workshop_employees_workshop ON workshop_employees(workshop_id);
CREATE INDEX idx_workshop_employees_mechanic ON workshop_employees(mechanic_id);

-- RLS
ALTER TABLE workshop_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workshop owners can manage their employees"
  ON workshop_employees FOR ALL
  USING (workshop_id IN (SELECT id FROM workshops WHERE owner_user_id = auth.uid()));

CREATE POLICY "Mechanics can view their own employment"
  ON workshop_employees FOR SELECT
  USING (user_id = auth.uid());
```

---

## 🔧 PHASE 2: API ENDPOINTS (4-6 hours)

### Endpoint 1: Workshop Clock-In Employee

```typescript
// File: src/app/api/workshop/clock-in-employee/route.ts

import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()

  // Verify user is workshop owner
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { mechanic_id } = await request.json()

  // Verify this mechanic is employed by this user's workshop
  const { data: workshop } = await supabase
    .from('workshops')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  if (!workshop) {
    return NextResponse.json({ error: 'No workshop found' }, { status: 404 })
  }

  const { data: mechanic } = await supabase
    .from('mechanics')
    .select('*')
    .eq('id', mechanic_id)
    .eq('workshop_id', workshop.id)
    .eq('mechanic_type', 'workshop_employee')
    .single()

  if (!mechanic) {
    return NextResponse.json({ error: 'Mechanic not found or not your employee' }, { status: 404 })
  }

  // Clock in mechanic
  const { error: updateError } = await supabase
    .from('mechanics')
    .update({
      is_available: true,
      clocked_in_by_admin: true,
      shift_start_time: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    })
    .eq('id', mechanic_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Mechanic clocked in' })
}
```

### Endpoint 2: Workshop Clock-Out Employee

```typescript
// File: src/app/api/workshop/clock-out-employee/route.ts

import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { mechanic_id } = await request.json()

  // Verify ownership
  const { data: workshop } = await supabase
    .from('workshops')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  if (!workshop) {
    return NextResponse.json({ error: 'No workshop found' }, { status: 404 })
  }

  const { data: mechanic } = await supabase
    .from('mechanics')
    .select('shift_start_time')
    .eq('id', mechanic_id)
    .eq('workshop_id', workshop.id)
    .single()

  if (!mechanic) {
    return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
  }

  // Calculate shift duration
  const shiftDuration = mechanic.shift_start_time
    ? Math.floor((new Date().getTime() - new Date(mechanic.shift_start_time).getTime()) / 60000)
    : 0

  // Clock out mechanic
  const { error: updateError } = await supabase
    .from('mechanics')
    .update({
      is_available: false,
      clocked_in_by_admin: false,
      shift_end_time: new Date().toISOString(),
      last_shift_duration: shiftDuration,
      last_seen_at: new Date().toISOString()
    })
    .eq('id', mechanic_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Mechanic clocked out',
    shift_duration_minutes: shiftDuration
  })
}
```

### Endpoint 3: Get Workshop Dashboard Data

```typescript
// File: src/app/api/workshop/dashboard/route.ts

import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get workshop
  const { data: workshop } = await supabase
    .from('workshops')
    .select('*')
    .eq('owner_user_id', user.id)
    .single()

  if (!workshop) {
    return NextResponse.json({ error: 'No workshop found' }, { status: 404 })
  }

  // Get employees
  const { data: employees } = await supabase
    .from('mechanics')
    .select('*')
    .eq('workshop_id', workshop.id)
    .eq('mechanic_type', 'workshop_employee')

  // Get today's revenue
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: todaySessions } = await supabase
    .from('session_requests')
    .select('revenue_amount, mechanic_id')
    .eq('revenue_recipient_type', 'workshop')
    .eq('revenue_recipient_id', workshop.id)
    .gte('created_at', today.toISOString())

  const totalRevenue = todaySessions?.reduce((sum, session) => sum + (session.revenue_amount || 0), 0) || 0

  return NextResponse.json({
    workshop,
    employees: employees || [],
    today_revenue: totalRevenue,
    today_sessions: todaySessions?.length || 0
  })
}
```

---

## 🎨 PHASE 3: UI COMPONENTS (6-8 hours)

### Component 1: Workshop Admin Dashboard

```tsx
// File: src/app/workshop/dashboard/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Power, PowerOff, Users, DollarSign } from 'lucide-react'

export default function WorkshopDashboard() {
  const [workshop, setWorkshop] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    const response = await fetch('/api/workshop/dashboard')
    const data = await response.json()
    setWorkshop(data.workshop)
    setEmployees(data.employees)
    setLoading(false)
  }

  const handleClockIn = async (mechanicId: string) => {
    await fetch('/api/workshop/clock-in-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mechanic_id: mechanicId })
    })
    fetchDashboardData() // Refresh
  }

  const handleClockOut = async (mechanicId: string) => {
    await fetch('/api/workshop/clock-out-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mechanic_id: mechanicId })
    })
    fetchDashboardData() // Refresh
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">{workshop?.name} - Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs">Today's Revenue</span>
          </div>
          <p className="text-2xl font-bold text-white">${workshop?.today_revenue?.toFixed(2) || '0.00'}</p>
        </div>
        {/* Add more stats */}
      </div>

      {/* Employees */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="h-5 w-5" />
          Your Mechanics
        </h2>

        {employees.map((employee) => (
          <div key={employee.id} className="bg-slate-800 p-4 rounded-lg flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">{employee.name}</h3>
              <p className="text-sm text-slate-400">
                {employee.clocked_in_by_admin ? (
                  <span className="text-green-400">🟢 ON SHIFT</span>
                ) : (
                  <span className="text-slate-500">⚪ OFF SHIFT</span>
                )}
              </p>
            </div>

            {employee.clocked_in_by_admin ? (
              <button
                onClick={() => handleClockOut(employee.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <PowerOff className="h-4 w-4" />
                Clock Out
              </button>
            ) : (
              <button
                onClick={() => handleClockIn(employee.id)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Power className="h-4 w-4" />
                Clock In
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Component 2: Modified Mechanic Dashboard

```tsx
// File: src/components/mechanic/MechanicDashboardHeader.tsx

'use client'

import { AlertCircle } from 'lucide-react'

interface MechanicDashboardHeaderProps {
  mechanicType: 'independent' | 'workshop_employee' | 'workshop_owner'
  clockedInByAdmin: boolean
  workshopName?: string
  isAvailable: boolean
}

export default function MechanicDashboardHeader({
  mechanicType,
  clockedInByAdmin,
  workshopName,
  isAvailable
}: MechanicDashboardHeaderProps) {

  if (mechanicType === 'workshop_employee') {
    if (clockedInByAdmin) {
      return (
        <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/20 rounded-full">
              <AlertCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">🟢 ON SHIFT at {workshopName}</h3>
              <p className="text-sm text-green-300 mt-1">
                All session fees go to the workshop. You earn your hourly wage from your employer.
              </p>
              <p className="text-xs text-green-400 mt-2">
                Contact your manager to clock out.
              </p>
            </div>
          </div>
        </div>
      )
    } else {
      return (
        <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-slate-600 rounded-full">
              <AlertCircle className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">⚪ OFF SHIFT</h3>
              <p className="text-sm text-slate-400 mt-1">
                You are employed by {workshopName}. Per your employment agreement, you cannot accept independent sessions while employed.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Ask your manager to clock you in to start accepting sessions (revenue goes to workshop).
              </p>
            </div>
          </div>
        </div>
      )
    }
  }

  // Independent or workshop owner - show normal dashboard
  return null
}
```

---

## ⚡ PHASE 4: BUSINESS LOGIC (2-3 hours)

### Update Session Assignment Logic

```typescript
// File: src/lib/sessionRevenueRouter.ts

export async function assignSessionRevenue(
  sessionId: string,
  mechanicId: string,
  sessionFee: number
) {
  const supabase = createClient()

  // Get mechanic details
  const { data: mechanic } = await supabase
    .from('mechanics')
    .select('mechanic_type, workshop_id, clocked_in_by_admin')
    .eq('id', mechanicId)
    .single()

  if (!mechanic) {
    throw new Error('Mechanic not found')
  }

  const platformFee = sessionFee * 0.05
  const revenueAmount = sessionFee * 0.95

  let revenueRecipientType: 'mechanic' | 'workshop'
  let revenueRecipientId: string

  if (
    mechanic.mechanic_type === 'workshop_employee' &&
    mechanic.clocked_in_by_admin &&
    mechanic.workshop_id
  ) {
    // Revenue goes to workshop
    revenueRecipientType = 'workshop'
    revenueRecipientId = mechanic.workshop_id
  } else {
    // Revenue goes to mechanic (independent or workshop owner)
    revenueRecipientType = 'mechanic'
    revenueRecipientId = mechanicId
  }

  // Update session
  await supabase
    .from('session_requests')
    .update({
      revenue_recipient_type: revenueRecipientType,
      revenue_recipient_id: revenueRecipientId,
      revenue_amount: revenueAmount,
      platform_fee: platformFee
    })
    .eq('id', sessionId)

  return {
    revenueRecipientType,
    revenueRecipientId,
    revenueAmount,
    platformFee
  }
}
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Database
- [ ] Create workshops table migration
- [ ] Update mechanics table with mechanic_type columns
- [ ] Add revenue routing columns to session_requests
- [ ] Create workshop_employees junction table
- [ ] Add database triggers for business rules
- [ ] Push all migrations to Supabase

### API Endpoints
- [ ] POST /api/workshop/clock-in-employee
- [ ] POST /api/workshop/clock-out-employee
- [ ] GET /api/workshop/dashboard
- [ ] POST /api/workshop/add-employee
- [ ] POST /api/mechanic/request-release
- [ ] POST /api/workshop/release-employee

### UI Components
- [ ] Workshop admin dashboard
- [ ] Employee management panel
- [ ] Modified mechanic dashboard (shows different UI based on mechanic_type)
- [ ] Workshop signup flow
- [ ] Employee invitation flow

### Business Logic
- [ ] Revenue routing logic
- [ ] Clock-in/out enforcement
- [ ] Session assignment based on mechanic_type
- [ ] Reporting for workshops

### Testing
- [ ] Test independent mechanic flow
- [ ] Test workshop employee ON-SHIFT flow
- [ ] Test workshop employee OFF-SHIFT restrictions
- [ ] Test revenue routing (workshop vs mechanic)
- [ ] Test clock-in/out controls

---

## 🎯 SUCCESS CRITERIA

✅ Workshop admin can clock employees in/out
✅ Workshop employees only available when clocked in by admin
✅ Revenue goes to workshop for employee sessions
✅ Workshop employees CANNOT accept sessions when off-shift
✅ Independent mechanics unaffected
✅ Workshop owners can do both virtual and physical
✅ Dashboard shows different UI based on mechanic_type

---

**This implementation solves your business dilemma completely. Workshops are protected, mechanics have clear paths, and platform creates value for all parties.**
