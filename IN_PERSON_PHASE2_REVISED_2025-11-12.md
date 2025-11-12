# In-Person Phase 2: REVISED Implementation Plan
**Date:** 2025-11-12
**Status:** Awaiting Approval
**Based On:** Clarified business model and legal requirements

---

## 🎯 Executive Summary

Based on your clarifications, Phase 2 has been **significantly redesigned** to:
1. Implement mechanic-controlled availability (not workshop-controlled)
2. Use full pre-payment model (not deposit model)
3. Integrate Stripe Connect for guaranteed commission collection
4. Comply with Canadian payment regulations

**Total Estimated Effort:** 40-50 hours
**Monthly Recurring Cost:** $0 (using Haversine for distance, FREE Google Maps URLs)
**Risk Level:** MEDIUM (Stripe Connect integration complexity)

---

## 📊 Revised Phase 2 Priorities

### PHASE 2A: Critical Business Logic (16-20 hours)
**Must implement before public launch**

| Priority | Feature | Effort | Cost | Blocker? |
|----------|---------|--------|------|----------|
| 🔴 **P0** | Mechanic Availability System | 8-10 hrs | $0 | YES |
| 🔴 **P0** | Full Pre-Payment Implementation | 2-3 hrs | $0 | YES |
| 🔴 **P0** | Stripe Connect Integration | 6-8 hrs | $0* | YES |

*Stripe Connect is free to integrate, but charges 0.25% per transaction on top of regular processing fees

### PHASE 2B: User Experience Enhancements (12-16 hours)
**Important but not blockers**

| Priority | Feature | Effort | Cost | Blocker? |
|----------|---------|--------|------|----------|
| 🟡 **P1** | Workshop Hours Display | 4-6 hrs | $0 | NO |
| 🟡 **P1** | Distance Calculation (Haversine) | 3-4 hrs | $0 | NO |
| 🟡 **P1** | Separate In-Person Pricing | 2-3 hrs | $0 | NO |
| 🟡 **P1** | Cancellation & Refund Flow | 3-4 hrs | $0 | NO |

### PHASE 2C: Nice-to-Have Features (12-15 hours)
**Future enhancements**

| Priority | Feature | Effort | Cost | Blocker? |
|----------|---------|--------|------|----------|
| 🟢 **P2** | Workshop Photos | 4-5 hrs | $0 | NO |
| 🟢 **P2** | Special Closures (Holidays) | 3-4 hrs | $0 | NO |
| 🟢 **P2** | Workshop Ratings (Separate) | 5-6 hrs | $0 | NO |

---

## 🔴 PHASE 2A: Critical Implementation

### P0-1: Mechanic Availability System (8-10 hours)

**Goal:** Allow mechanics to set when they're available for in-person appointments, respecting workshop operating hours for affiliated mechanics.

#### Database Schema

**New Table: `mechanic_availability`**
```sql
CREATE TABLE mechanic_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_available BOOLEAN NOT NULL DEFAULT true,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(mechanic_id, day_of_week)
);

CREATE INDEX idx_mechanic_availability_mechanic_id ON mechanic_availability(mechanic_id);
CREATE INDEX idx_mechanic_availability_day_available ON mechanic_availability(day_of_week, is_available);

COMMENT ON TABLE mechanic_availability IS 'Mechanic availability for in-person appointments. For workshop_affiliated mechanics, times must be within workshop operating hours.';
```

**Validation Trigger:**
```sql
CREATE OR REPLACE FUNCTION validate_mechanic_availability()
RETURNS TRIGGER AS $$
DECLARE
  v_mechanic_type TEXT;
  v_workshop_id UUID;
  v_workshop_hours RECORD;
BEGIN
  -- Get mechanic details
  SELECT mechanic_type, workshop_id
  INTO v_mechanic_type, v_workshop_id
  FROM mechanics
  WHERE id = NEW.mechanic_id;

  -- If workshop_affiliated, validate against workshop hours
  IF v_mechanic_type = 'workshop_affiliated' THEN
    SELECT open_time, close_time, is_open
    INTO v_workshop_hours
    FROM workshop_availability
    WHERE workshop_id = v_workshop_id
      AND day_of_week = NEW.day_of_week;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Workshop availability not set for this day. Contact workshop admin.';
    END IF;

    IF NOT v_workshop_hours.is_open THEN
      RAISE EXCEPTION 'Workshop is closed on this day. Cannot set mechanic availability.';
    END IF;

    IF NEW.start_time < v_workshop_hours.open_time THEN
      RAISE EXCEPTION 'Start time % is before workshop opens at %',
        NEW.start_time, v_workshop_hours.open_time;
    END IF;

    IF NEW.end_time > v_workshop_hours.close_time THEN
      RAISE EXCEPTION 'End time % is after workshop closes at %',
        NEW.end_time, v_workshop_hours.close_time;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_mechanic_availability
  BEFORE INSERT OR UPDATE ON mechanic_availability
  FOR EACH ROW EXECUTE FUNCTION validate_mechanic_availability();
```

**Seed Default Availability:**
```sql
-- Insert default Mon-Fri 9-5 availability for all existing mechanics
INSERT INTO mechanic_availability (mechanic_id, day_of_week, is_available, start_time, end_time)
SELECT
  m.id,
  day,
  CASE WHEN day IN (1, 2, 3, 4, 5) THEN true ELSE false END,
  '09:00'::TIME,
  '17:00'::TIME
FROM mechanics m
CROSS JOIN generate_series(0, 6) AS day
WHERE m.mechanic_type IN ('independent_workshop', 'workshop_affiliated')
  AND NOT EXISTS (
    SELECT 1 FROM mechanic_availability ma
    WHERE ma.mechanic_id = m.id
  );
```

#### API Endpoint: Manage Availability

**File:** `src/app/api/mechanic/availability/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

// GET: Fetch mechanic's current availability
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get mechanic record
  const { data: mechanic, error: mechanicError } = await supabase
    .from('mechanics')
    .select('id, mechanic_type, workshop_id')
    .eq('user_id', user.id)
    .single()

  if (mechanicError || !mechanic) {
    return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
  }

  // Get availability
  const { data: availability, error } = await supabase
    .from('mechanic_availability')
    .select('*')
    .eq('mechanic_id', mechanic.id)
    .order('day_of_week', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If workshop_affiliated, also fetch workshop hours for context
  let workshopHours = null
  if (mechanic.mechanic_type === 'workshop_affiliated' && mechanic.workshop_id) {
    const { data: hours } = await supabase
      .from('workshop_availability')
      .select('*')
      .eq('workshop_id', mechanic.workshop_id)
      .order('day_of_week', { ascending: true })

    workshopHours = hours
  }

  return NextResponse.json({
    availability,
    workshopHours,
    mechanicType: mechanic.mechanic_type
  })
}

// POST: Update availability
export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { availability } = body // Array of { day_of_week, is_available, start_time, end_time }

  // Get mechanic record
  const { data: mechanic, error: mechanicError } = await supabase
    .from('mechanics')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (mechanicError || !mechanic) {
    return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
  }

  // Upsert availability (trigger will validate against workshop hours)
  const promises = availability.map((slot: any) =>
    supabase
      .from('mechanic_availability')
      .upsert({
        mechanic_id: mechanic.id,
        day_of_week: slot.day_of_week,
        is_available: slot.is_available,
        start_time: slot.start_time,
        end_time: slot.end_time
      }, {
        onConflict: 'mechanic_id,day_of_week'
      })
  )

  try {
    await Promise.all(promises)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

#### Frontend: Mechanic Dashboard - Availability UI

**File:** `src/app/mechanic/availability/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Clock, Calendar, AlertCircle } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function MechanicAvailabilityPage() {
  const [availability, setAvailability] = useState<any[]>([])
  const [workshopHours, setWorkshopHours] = useState<any[]>([])
  const [mechanicType, setMechanicType] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAvailability()
  }, [])

  const fetchAvailability = async () => {
    try {
      const res = await fetch('/api/mechanic/availability')
      const data = await res.json()
      setAvailability(data.availability)
      setWorkshopHours(data.workshopHours || [])
      setMechanicType(data.mechanicType)
    } catch (error) {
      console.error('Failed to fetch availability:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleDay = (dayOfWeek: number) => {
    setAvailability(prev =>
      prev.map(slot =>
        slot.day_of_week === dayOfWeek
          ? { ...slot, is_available: !slot.is_available }
          : slot
      )
    )
  }

  const handleTimeChange = (dayOfWeek: number, field: 'start_time' | 'end_time', value: string) => {
    setAvailability(prev =>
      prev.map(slot =>
        slot.day_of_week === dayOfWeek
          ? { ...slot, [field]: value }
          : slot
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/mechanic/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save')
      }

      alert('Availability saved successfully!')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">In-Person Appointment Availability</h1>

      {mechanicType === 'workshop_affiliated' && workshopHours.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <div className="font-semibold text-blue-900 mb-2">Workshop Operating Hours</div>
              <div className="text-sm text-blue-700">
                You can only set your availability within your workshop's operating hours:
                <ul className="mt-2 space-y-1">
                  {workshopHours.map((hours: any) => (
                    <li key={hours.day_of_week}>
                      <strong>{DAYS[hours.day_of_week]}:</strong>{' '}
                      {hours.is_open
                        ? `${hours.open_time} - ${hours.close_time}`
                        : 'Closed'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {availability.map((slot: any) => {
          const workshopHour = workshopHours.find((h: any) => h.day_of_week === slot.day_of_week)

          return (
            <div key={slot.day_of_week} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="w-32">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slot.is_available}
                    onChange={() => handleToggleDay(slot.day_of_week)}
                    disabled={mechanicType === 'workshop_affiliated' && workshopHour && !workshopHour.is_open}
                    className="w-5 h-5"
                  />
                  <span className="font-medium">{DAYS[slot.day_of_week]}</span>
                </label>
              </div>

              {slot.is_available ? (
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <input
                    type="time"
                    value={slot.start_time}
                    onChange={(e) => handleTimeChange(slot.day_of_week, 'start_time', e.target.value)}
                    className="px-3 py-2 border rounded"
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={slot.end_time}
                    onChange={(e) => handleTimeChange(slot.day_of_week, 'end_time', e.target.value)}
                    className="px-3 py-2 border rounded"
                  />
                </div>
              ) : (
                <span className="text-gray-400">Not Available</span>
              )}

              {mechanicType === 'workshop_affiliated' && workshopHour && !workshopHour.is_open && (
                <span className="text-sm text-gray-500 italic">
                  (Workshop closed)
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Availability'}
        </button>
      </div>
    </div>
  )
}
```

#### Update Mechanic Search Query

**File:** `src/app/api/mechanics/available/route.ts`

**Add after line 79 (session type filtering):**

```typescript
// Filter by mechanic availability for in-person bookings
if (sessionType === 'in_person') {
  const requestedDate = searchParams.get('date') // YYYY-MM-DD
  const requestedTime = searchParams.get('time') // HH:MM

  if (requestedDate && requestedTime) {
    const dayOfWeek = new Date(requestedDate).getDay()

    query = query
      .select(`
        *,
        mechanic_availability!inner(*)
      `)
      .eq('mechanic_availability.day_of_week', dayOfWeek)
      .eq('mechanic_availability.is_available', true)
      .lte('mechanic_availability.start_time', requestedTime)
      .gte('mechanic_availability.end_time', requestedTime)
  }
}
```

**Effort Breakdown:**
- Migration file: 1 hour
- API endpoint: 2 hours
- Frontend UI: 4 hours
- Update search query: 1 hour
- Testing: 2 hours
- **Total: 10 hours**

---

### P0-2: Full Pre-Payment Implementation (2-3 hours)

**Goal:** Charge full session amount upfront for in-person bookings (no deposit model).

#### Update Pricing Configuration

**File:** `src/config/pricing.ts`

```typescript
export const PRICING = {
  // Existing online plans
  'quick-advice': {
    name: '30-Minute Quick Advice',
    price: 5000, // $50.00 in cents
    duration: 30,
    stripePriceId: process.env.STRIPE_PRICE_QUICK_ADVICE,
    sessionType: 'online'
  },
  'deep-dive': {
    name: '60-Minute Deep Dive',
    price: 7500,
    duration: 60,
    stripePriceId: process.env.STRIPE_PRICE_DEEP_DIVE,
    sessionType: 'online'
  },

  // NEW: In-person plans (20% higher pricing)
  'in-person-60': {
    name: '60-Minute In-Person Diagnostic',
    price: 8000, // $80.00 (vs $50 online for 30min)
    duration: 60,
    stripePriceId: process.env.STRIPE_PRICE_IN_PERSON_60,
    sessionType: 'in_person'
  },
  'in-person-90': {
    name: '90-Minute In-Person Diagnostic',
    price: 11000, // $110.00
    duration: 90,
    stripePriceId: process.env.STRIPE_PRICE_IN_PERSON_90,
    sessionType: 'in_person'
  }
}
```

#### Update Review & Payment Step

**File:** `src/components/customer/scheduling/ReviewAndPaymentStep.tsx`

**Remove deposit logic, charge full amount:**

```typescript
// Line ~260: Update payment amount logic
const paymentAmount = wizardData.planPrice // Always full amount

// Remove this entire section (lines ~265-275):
// const depositAmount = sessionType === 'in_person' ? 1500 : planPrice
// const balanceAmount = sessionType === 'in_person' ? planPrice - 1500 : 0

// Update payment button text (line ~320):
<button
  onClick={handlePayment}
  disabled={isProcessing}
  className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg"
>
  {isProcessing ? (
    <Loader2 className="animate-spin mx-auto h-6 w-6" />
  ) : (
    `Pay ${formatCurrency(wizardData.planPrice)} & Confirm Booking`
  )}
</button>

// Update confirmation message:
<div className="text-sm text-slate-400 mt-2">
  {sessionType === 'in_person'
    ? 'Full payment due now. Refundable up to 24 hours before appointment.'
    : 'Full payment due now. Service starts immediately after payment.'}
</div>
```

#### Add Database Field for Refund Eligibility

**Migration:** `supabase/migrations/[timestamp]_add_refund_fields.sql`

```sql
ALTER TABLE diagnostic_sessions
ADD COLUMN is_refundable BOOLEAN DEFAULT true,
ADD COLUMN refund_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN cancellation_reason TEXT,
ADD COLUMN cancelled_by TEXT CHECK (cancelled_by IN ('customer', 'mechanic', 'admin'));

COMMENT ON COLUMN diagnostic_sessions.is_refundable IS 'Whether session is eligible for refund (depends on cancellation policy)';
COMMENT ON COLUMN diagnostic_sessions.refund_deadline IS 'Deadline for free cancellation (usually 24 hours before scheduled time)';
```

**Effort Breakdown:**
- Update pricing config: 30 min
- Update review step UI: 1 hour
- Add refund fields migration: 30 min
- Testing: 30 min
- **Total: 2.5 hours**

---

### P0-3: Stripe Connect Integration (6-8 hours)

**Goal:** Automatically collect platform commission from workshop payments using Stripe Connect destination charges.

#### Database Schema Updates

**Migration:** `supabase/migrations/[timestamp]_add_stripe_connect.sql`

```sql
-- Add Stripe Connect fields to organizations (workshops)
ALTER TABLE organizations
ADD COLUMN stripe_account_id TEXT UNIQUE,
ADD COLUMN stripe_account_type TEXT CHECK (stripe_account_type IN ('standard', 'express', 'custom')),
ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT false,
ADD COLUMN stripe_details_submitted BOOLEAN DEFAULT false,
ADD COLUMN stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN stripe_onboarded_at TIMESTAMP WITH TIME ZONE;

-- Add Stripe Connect fields to mechanics (for independent mechanics)
ALTER TABLE mechanics
ADD COLUMN stripe_account_id TEXT UNIQUE,
ADD COLUMN stripe_account_type TEXT CHECK (stripe_account_type IN ('standard', 'express', 'custom')),
ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT false,
ADD COLUMN stripe_details_submitted BOOLEAN DEFAULT false,
ADD COLUMN stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN stripe_onboarded_at TIMESTAMP WITH TIME ZONE;

-- Index for lookups
CREATE INDEX idx_organizations_stripe_account ON organizations(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
CREATE INDEX idx_mechanics_stripe_account ON mechanics(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
```

#### API: Workshop Stripe Onboarding

**File:** `src/app/api/workshop/stripe/onboard/route.ts` (already exists, update it)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get workshop organization
  const { data: workshop, error: workshopError } = await supabase
    .from('organizations')
    .select('id, name, email, stripe_account_id')
    .eq('id', req.nextUrl.searchParams.get('workshop_id'))
    .single()

  if (workshopError || !workshop) {
    return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
  }

  try {
    let accountId = workshop.stripe_account_id

    // Create Stripe Connect account if doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express', // Easier onboarding for workshops
        country: 'CA',
        email: workshop.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        business_type: 'company',
        metadata: {
          workshop_id: workshop.id,
          workshop_name: workshop.name
        }
      })

      accountId = account.id

      // Save to database
      await supabase
        .from('organizations')
        .update({
          stripe_account_id: accountId,
          stripe_account_type: 'express'
        })
        .eq('id', workshop.id)
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/workshop/stripe/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/workshop/dashboard?stripe_onboarding=complete`,
      type: 'account_onboarding'
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error: any) {
    console.error('[Stripe Connect] Onboarding error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

#### API: Check Stripe Connect Status

**File:** `src/app/api/workshop/stripe/status/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { stripe } from '@/lib/stripe'

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workshopId = req.nextUrl.searchParams.get('workshop_id')

  const { data: workshop } = await supabase
    .from('organizations')
    .select('stripe_account_id, stripe_onboarding_complete')
    .eq('id', workshopId)
    .single()

  if (!workshop?.stripe_account_id) {
    return NextResponse.json({
      connected: false,
      onboarding_complete: false
    })
  }

  try {
    // Fetch latest status from Stripe
    const account = await stripe.accounts.retrieve(workshop.stripe_account_id)

    const isComplete = account.details_submitted &&
                       account.charges_enabled &&
                       account.payouts_enabled

    // Update database if status changed
    if (isComplete !== workshop.stripe_onboarding_complete) {
      await supabase
        .from('organizations')
        .update({
          stripe_onboarding_complete: isComplete,
          stripe_details_submitted: account.details_submitted,
          stripe_charges_enabled: account.charges_enabled,
          stripe_payouts_enabled: account.payouts_enabled,
          stripe_onboarded_at: isComplete ? new Date().toISOString() : null
        })
        .eq('id', workshopId)
    }

    return NextResponse.json({
      connected: true,
      onboarding_complete: isComplete,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled
    })
  } catch (error: any) {
    console.error('[Stripe Connect] Status check error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

#### Update Payment Processing for In-Person Sessions

**File:** `src/app/api/sessions/create-scheduled/route.ts`

**Add destination charge logic:**

```typescript
// Around line ~150, after creating Stripe payment intent:

if (sessionType === 'in_person') {
  // Get workshop's Stripe account
  const { data: workshop } = await supabaseAdmin
    .from('organizations')
    .select('stripe_account_id, stripe_charges_enabled')
    .eq('id', workshopId)
    .single()

  if (!workshop?.stripe_account_id || !workshop.stripe_charges_enabled) {
    return NextResponse.json({
      error: 'Workshop is not set up to accept payments. Please contact support.'
    }, { status: 400 })
  }

  // Get platform commission rate
  const { data: feeSettings } = await supabaseAdmin
    .from('platform_fee_settings')
    .select('platform_commission_percent')
    .single()

  const commissionRate = feeSettings?.platform_commission_percent || 5.0
  const commissionAmount = Math.round(planPrice * (commissionRate / 100))
  const workshopAmount = planPrice - commissionAmount

  // Create destination charge
  const paymentIntent = await stripe.paymentIntents.create({
    amount: planPrice,
    currency: 'cad',
    customer: stripeCustomerId,
    payment_method: paymentMethodId,
    confirm: true,
    transfer_data: {
      destination: workshop.stripe_account_id,
      amount: workshopAmount // Workshop gets this amount
    },
    metadata: {
      session_id: sessionId,
      session_type: 'in_person',
      mechanic_id: mechanicId,
      workshop_id: workshopId,
      platform_commission: commissionAmount,
      commission_rate: commissionRate
    }
  })

  // Platform keeps the commission automatically
} else {
  // Existing online session payment logic
  const paymentIntent = await stripe.paymentIntents.create({
    amount: planPrice,
    currency: 'cad',
    customer: stripeCustomerId,
    payment_method: paymentMethodId,
    confirm: true,
    metadata: {
      session_id: sessionId,
      session_type: 'online',
      mechanic_id: mechanicId
    }
  })
}
```

#### Workshop Dashboard: Onboarding Banner

**File:** `src/app/workshop/dashboard/page.tsx`

**Add banner at top:**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'

export default function WorkshopDashboard() {
  const [stripeStatus, setStripeStatus] = useState<any>(null)

  useEffect(() => {
    fetchStripeStatus()
  }, [])

  const fetchStripeStatus = async () => {
    const res = await fetch('/api/workshop/stripe/status?workshop_id=xxx')
    const data = await res.json()
    setStripeStatus(data)
  }

  const handleStripeOnboarding = async () => {
    const res = await fetch('/api/workshop/stripe/onboard?workshop_id=xxx', {
      method: 'POST'
    })
    const data = await res.json()
    window.location.href = data.url
  }

  return (
    <div className="p-6">
      {/* Stripe Connect Status Banner */}
      {stripeStatus && !stripeStatus.onboarding_complete && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-yellow-900 mb-1">
                Complete Payment Setup
              </div>
              <div className="text-sm text-yellow-800 mb-3">
                You need to complete Stripe Connect onboarding to accept in-person bookings and receive payments.
              </div>
              <button
                onClick={handleStripeOnboarding}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold"
              >
                Complete Setup Now
              </button>
            </div>
          </div>
        </div>
      )}

      {stripeStatus?.onboarding_complete && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-900 font-semibold">
              Payment setup complete! You can now accept in-person bookings.
            </span>
          </div>
        </div>
      )}

      {/* Rest of dashboard */}
    </div>
  )
}
```

**Effort Breakdown:**
- Database migration: 1 hour
- Onboarding API: 2 hours
- Status check API: 1 hour
- Update payment processing: 2 hours
- Dashboard banner UI: 1 hour
- Testing: 1-2 hours
- **Total: 8 hours**

---

## 🟡 PHASE 2B: User Experience Enhancements

### P1-1: Workshop Hours Display (4-6 hours)

Show workshop operating hours in mechanic cards and booking flow.

**Files to Update:**
1. `src/components/customer/scheduling/MechanicCard.tsx` - Add hours badge
2. `src/components/customer/scheduling/ReviewAndPaymentStep.tsx` - Show hours below address
3. `src/app/api/mechanics/available/route.ts` - Include workshop hours in response

**Implementation:**
```typescript
// In MechanicCard.tsx
{sessionType === 'in_person' && mechanic.workshopHours && (
  <div className="text-xs text-slate-400 mt-2">
    <Clock className="h-3 w-3 inline mr-1" />
    Today: {mechanic.workshopHours.open_time} - {mechanic.workshopHours.close_time}
  </div>
)}
```

**Effort:** 4-6 hours

---

### P1-2: Distance Calculation (Haversine) (3-4 hours)

Show "X km away" on mechanic cards using FREE Haversine formula.

**New Utility Function:** `src/utils/distance.ts`

```typescript
// Haversine formula for straight-line distance
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}
```

**API Update:** Add lat/lng to workshop data, calculate distance server-side.

**Cost:** $0/month (pure math calculation)

**Effort:** 3-4 hours

---

### P1-3: Separate In-Person Pricing (2-3 hours)

Create distinct service plans for in-person vs online.

**Database Migration:**
```sql
INSERT INTO service_plans (slug, name, price, duration_minutes, session_type, stripe_price_id, is_active)
VALUES
  ('in-person-60', '60-Minute In-Person Diagnostic', 8000, 60, 'in_person', 'price_xxx', true),
  ('in-person-90', '90-Minute In-Person Diagnostic', 11000, 90, 'in_person', 'price_yyy', true);
```

**Effort:** 2-3 hours

---

### P1-4: Cancellation & Refund Flow (3-4 hours)

Implement 24-hour cancellation policy with refunds.

**Business Rules:**
- Cancel >24hrs before appointment: 90% refund (10% cancellation fee)
- Cancel <24hrs before appointment: No refund
- Mechanic cancels: Full refund + $10 credit

**API:** `src/app/api/sessions/[id]/cancel/route.ts`

**Effort:** 3-4 hours

---

## 🟢 PHASE 2C: Nice-to-Have Features

### P2-1: Workshop Photos (4-5 hours)
### P2-2: Special Closures/Holidays (3-4 hours)
### P2-3: Workshop Ratings (5-6 hours)

*(Deferred to later phases)*

---

## 💰 Cost Summary

| Feature | Monthly Cost | One-Time Cost |
|---------|--------------|---------------|
| Stripe Connect | 0.25% per transaction* | $0 |
| Haversine Distance | $0 | $0 |
| Google Maps URL | $0 | $0 |
| Database Storage | ~$0.50 | $0 |
| **TOTAL** | **~$25-50/mo** | **$0** |

*Assuming $10,000/month in transactions = $25 Stripe Connect fee

---

## ⏱️ Implementation Timeline

**Sprint 1 (Week 1): Phase 2A - Critical**
- Days 1-2: Mechanic availability system (10 hrs)
- Day 3: Full pre-payment implementation (2.5 hrs)
- Days 4-5: Stripe Connect integration (8 hrs)
- **Total: 20.5 hours**

**Sprint 2 (Week 2): Phase 2B - Enhancements**
- Day 1: Workshop hours display (5 hrs)
- Day 2: Distance calculation (4 hrs)
- Day 3: Separate pricing (3 hrs)
- Day 4: Cancellation flow (4 hrs)
- **Total: 16 hours**

**Sprint 3 (Future): Phase 2C - Nice-to-Haves**
- TBD based on user feedback

---

## 🚨 Blockers & Risks

### HIGH RISK:
1. **Stripe Connect Complexity:** First-time implementation may hit edge cases (8-10 hrs budget)
2. **Workshop Resistance:** Workshops may not want to onboard to Stripe (business risk)

### MEDIUM RISK:
3. **Availability Validation:** Workshop-affiliated mechanics may try to set invalid hours (mitigated by trigger)
4. **Payment Timing:** 7-day authorization limit may affect far-future bookings

### LOW RISK:
5. **Distance Accuracy:** Haversine gives straight-line distance (not driving distance)

---

## ✅ Success Criteria

Phase 2 is COMPLETE when:

1. ✅ Mechanics can set their own availability (respecting workshop hours)
2. ✅ Full pre-payment works for in-person bookings
3. ✅ Stripe Connect automatically deducts platform commission
4. ✅ Workshop hours display in booking flow
5. ✅ Distance shows on mechanic cards
6. ✅ Cancellation policy enforced with refunds
7. ✅ Zero payment disputes (workshop can't skip commission)

---

## 📞 Next Steps

1. **Review this revised plan** - Confirm all business logic is correct
2. **Approve Phase 2A** - Start with critical features
3. **Stripe API Keys** - Ensure test/live keys configured
4. **Workshop Communication** - Notify workshops about Stripe Connect requirement
5. **Testing Plan** - Define test cases for payment flow

**Awaiting your approval to proceed with Phase 2A implementation.**
