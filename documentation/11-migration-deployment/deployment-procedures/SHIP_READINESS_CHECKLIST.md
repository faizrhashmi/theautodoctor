# 🚀 SHIP-READINESS CHECKLIST
## Customer Journey Overhaul - Final Audit Report
**Generated:** 2025-01-03
**Status:** 🟡 READY WITH MINOR FIXES REQUIRED

---

## ✅ **1. ROUTE & LINK INTEGRITY**

### 🟢 **PASSED** - Central routing system exists in [src/lib/routes.ts](src/lib/routes.ts)
- ✅ `routeFor.*` for UI navigation
- ✅ `apiRouteFor.*` for API calls
- ✅ `deepLinkFor.*` for notifications/emails
- ✅ `emailLinkFor.*` for email templates

### ⚠️ **FIXES REQUIRED** - 20 hardcoded routes found

**Files with hardcoded `/customer/` routes:**
1. [src/app/customer/vehicles/[id]/history/page.tsx](src/app/customer/vehicles/[id]/history/page.tsx:145) - 4 instances
2. [src/app/customer/vehicles/page.tsx](src/app/customer/vehicles/page.tsx:194) - 1 instance
3. [src/components/customer/SessionLauncher.tsx](src/components/customer/SessionLauncher.tsx:516) - 2 instances (`/customer/plans`)
4. [src/components/customer/SessionJoinCard.tsx](src/components/customer/SessionJoinCard.tsx:147) - 1 instance
5. [src/components/customer/RecommendationsWidget.tsx](src/components/customer/RecommendationsWidget.tsx:131) - 1 instance
6. [src/app/customer/settings/privacy/**](src/app/customer/settings/privacy) - 4 instances
7. [src/app/customer/sessions/page.tsx](src/app/customer/sessions/page.tsx:333) - 1 instance
8. [src/app/customer/rfq/**](src/app/customer/rfq) - 6 instances

**Files with `/signup?mode=login` (DEPRECATED):**
1. [src/app/intake/page.tsx:67](src/app/intake/page.tsx:67) - `redirectTo: '/signup?mode=login'`
2. [src/app/diagnostic/[id]/VideoSessionClient.tsx:1305](src/app/diagnostic/[id]/VideoSessionClient.tsx:1305) - window redirect
3. [src/app/video/[id]/VideoSessionClient.tsx:1855](src/app/video/[id]/VideoSessionClient.tsx:1855) - window redirect

### 📋 **ACTION ITEMS:**
```typescript
// REPLACE ALL HARDCODED ROUTES WITH:
import { routeFor } from '@/lib/routes'

// EXAMPLES:
href="/customer/dashboard" → href={routeFor.customerDashboard()}
href="/customer/vehicles" → href={routeFor.customerVehicles()}
href="/customer/plans" → href={routeFor.pricing()}
href="/signup?mode=login" → href={routeFor.login()}
```

### 🔧 **ESLint Rule Recommendation:**
```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "Literal[value=/^\\/(customer|mechanic|workshop|video|chat|signup\\?mode)/]",
        "message": "Use routeFor.* from @/lib/routes instead of hardcoded paths"
      }
    ]
  }
}
```

---

## ✅ **2. NOTIFICATIONS: DEEP-LINKS + CREATION COVERAGE**

### 🟢 **PASSED** - Deep-links implemented in [NotificationCenter.tsx](src/components/notifications/NotificationCenter.tsx)

**Notification Types with Deep-Links (17 total):**

| Type | Deep-Link Destination | Status |
|------|----------------------|--------|
| `request_created` | `routeFor.mechanicDashboard({ request })` | ✅ |
| `request_submitted` | `routeFor.customerSessions()` | ✅ |
| `request_accepted` | `routeFor.mechanicDashboard({ request })` | ✅ |
| `session_started` | `routeFor.chat()` or `routeFor.video()` | ✅ |
| `session_completed` | `/sessions/{id}/summary` | ⚠️ Use `routeFor.sessionReport()` |
| `summary_ready` | `/sessions/{id}/summary` | ⚠️ Use `routeFor.sessionReport()` |
| `message_received` | `routeFor.chat(session_id)` | ✅ |
| `quote_received` | `routeFor.quote(quote_id)` | ✅ |
| `payment_received` | `routeFor.workshopAnalytics()` or `routeFor.mechanicEarnings()` | ✅ |
| `session_cancelled` | `routeFor.session(session_id)` | ✅ |
| `request_rejected` | `routeFor.customerSessions()` | ✅ |
| **Phase 3.2 - Repair Notifications** | | |
| `repair_job_created` | `/customer/repairs/{id}` | ⚠️ Use `routeFor.repair()` |
| `repair_job_update` | `/customer/repairs/{id}` | ⚠️ Use `routeFor.repair()` |
| `repair_status_changed` | `/customer/repairs/{id}` | ⚠️ Use `routeFor.repair()` |
| `repair_ready_for_pickup` | `/customer/repairs/{id}` | ⚠️ Use `routeFor.repair()` |
| `repair_parts_ordered` | `/customer/repairs/{id}` | ⚠️ Use `routeFor.repair()` |
| `repair_waiting_approval` | `/customer/repairs/{id}/approve` | ⚠️ Use `routeFor.repair()` |
| **Phase 3 - RFQ Notifications** | | |
| `rfq_bid_received` | `/customer/rfq/{id}/bids` | ⚠️ Use `routeFor.rfqBids()` |
| `rfq_accepted` | `/customer/rfq/{id}/accepted` | ⚠️ Use `routeFor.rfqDetails()` |

### ⚠️ **FIXES REQUIRED** - Replace hardcoded paths with `routeFor.*`
```typescript
// IN NotificationCenter.tsx:
// Lines 156, 165, 207-227, 240, 249, 257
// REPLACE:
router.push(`/sessions/${payload.session_id}/summary`)
router.push(`/customer/repairs/${payload.repair_job_id}`)
router.push(`/customer/rfq/${payload.rfq_id}/bids`)

// WITH:
router.push(routeFor.sessionReport(payload.session_id))
router.push(routeFor.repair(payload.repair_job_id))
router.push(routeFor.rfqBids(payload.rfq_id))
```

### 🔍 **CREATION COVERAGE AUDIT**

**Confirmed Notification Creators:**
- ✅ [src/lib/session/summaryGenerator.ts](src/lib/session/summaryGenerator.ts) - Creates `summary_ready` notification
- ✅ [src/lib/rfq/notifications.ts](src/lib/rfq/notifications.ts) - RFQ notification creator
- ✅ Database triggers auto-create `session_started`, `session_completed`, `request_*` notifications

### 📋 **ACTION ITEM:** Create centralized notification creator utility
```typescript
// src/lib/notifications/creator.ts
export async function createNotification(params: {
  user_id: string
  type: string
  payload: Record<string, any>
}): Promise<void> {
  await supabaseAdmin.from('notifications').insert({
    user_id: params.user_id,
    type: params.type,
    payload: params.payload,
    created_at: new Date().toISOString()
  })
}
```

---

## ✅ **3. STRIPE WEBHOOKS & IDEMPOTENCY**

### 🟢 **PASSED** - Idempotency implemented in [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts)

**Idempotency Checks:**
- ✅ `isEventProcessed()` checks `stripe_events` table for duplicate event IDs (lines 27-40)
- ✅ `markEventProcessed()` inserts event ID after processing (lines 42-54)
- ✅ `payment_intents` table uses UPSERT for idempotent storage (line 115)
- ✅ Session extensions use UNIQUE constraint on `payment_intent_id` (line 145-149)

**Event Handling:**
1. ✅ `checkout.session.completed` - Creates session request
2. ✅ `payment_intent.succeeded` - Activates session (status → 'live')
3. ⚠️ `charge.refunded` - **NOT IMPLEMENTED** in current webhook
4. ⚠️ `charge.dispute.created` - **NOT IMPLEMENTED** in current webhook

### ⚠️ **MISSING:** Refund & Dispute handlers

**Required Additions:**
```typescript
async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent

  // Update payment_intents table
  await supabaseAdmin
    .from('payment_intents')
    .update({ status: 'refunded', refunded_at: new Date().toISOString() })
    .eq('id', paymentIntentId)

  // Update sessions table
  await supabaseAdmin
    .from('sessions')
    .update({ payment_status: 'refunded' })
    .eq('payment_intent_id', paymentIntentId)

  // Create notification
  await createNotification({
    user_id: charge.metadata?.customer_id,
    type: 'payment_refunded',
    payload: { amount: charge.amount_refunded / 100, reason: charge.refunds?.data[0]?.reason }
  })

  console.log(`✓ Audit: ${charge.id} | refunded | ${charge.amount_refunded / 100} ${charge.currency}`)
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  // Flag for admin review
  await supabaseAdmin.from('admin_flags').insert({
    type: 'payment_dispute',
    entity_id: dispute.charge,
    metadata: { reason: dispute.reason, amount: dispute.amount }
  })

  console.log(`⚠️  Audit: ${dispute.id} | dispute_created | ${dispute.amount / 100} ${dispute.currency}`)
}
```

### 📋 **ACTION ITEMS:**
1. Add refund handler
2. Add dispute handler
3. Add concise audit logging for all events
4. Add retry logic with exponential backoff

---

## ⚠️ **4. REFUNDS & ESCROW GUARDRAILS**

### 🔴 **FAILED** - Refund endpoint not found

**Expected Endpoint:** `/api/repair-payments/[paymentId]/refund`
**Status:** ❌ NOT IMPLEMENTED

### 📋 **ACTION ITEMS:**
1. **Create refund endpoint** at [src/app/api/repair-payments/[paymentId]/refund/route.ts](src/app/api/repair-payments/[paymentId]/refund/route.ts)
2. **Implement guardrails:**
   ```typescript
   // Only allow refunds for payments in 'held' status
   const { data: payment } = await supabase
     .from('repair_payments')
     .select('escrow_status, amount_cents')
     .eq('id', paymentId)
     .single()

   if (payment.escrow_status !== 'held') {
     return NextResponse.json({ error: 'Only held payments can be refunded' }, { status: 400 })
   }

   // Record in refunds table
   await supabase.from('refunds').insert({
     payment_id: paymentId,
     amount_cents: refundAmount,
     type: isFullRefund ? 'full' : 'partial',
     reason,
     initiated_by: userId
   })

   // Create notifications
   await createNotification({
     user_id: customerId,
     type: 'refund_processed',
     payload: { amount: refundAmount / 100, type: isFullRefund ? 'full' : 'partial' }
   })
   ```

3. **UI Badge:**
   - Show "Refunded" or "Partially Refunded" badge in repair payment cards
   - Display refund amount and reason

---

## ✅ **5. SESSION SUMMARY → RFQ PREFILL QA**

### 🟢 **PASSED** - Both entry points prefill RFQ from summary

**Entry Points:**
1. ✅ [SessionCompletionModal.tsx](src/components/session/SessionCompletionModal.tsx) - "Get Quotes" button
2. ✅ [sessions/[id]/report/page.tsx](src/app/sessions/[id]/report/page.tsx) - Session report page

**Prefill Logic:**
```typescript
// Both use same approach:
const rfqUrl = `/customer/rfq/create?session_id=${sessionId}&prefill=true`

// RFQ create page reads:
const sessionId = searchParams.get('session_id')
if (sessionId && searchParams.get('prefill') === 'true') {
  // Fetch summary and prefill form
}
```

**Fallback:**
- ✅ If summary missing: Graceful fallback with empty form (no blocking)

---

## ✅ **6. REPAIR TRACKING COHESION**

### 🟢 **PASSED** - Webhook → quote acceptance → repair_jobs flow exists

**Flow:**
1. ✅ Webhook receives `payment_intent.succeeded` for quote/RFQ bid
2. ✅ Updates `repair_payments` table with `escrow_status = 'held'`
3. ✅ Triggers `repair_quotes` status → 'approved'
4. ✅ Database trigger creates `repair_jobs` record
5. ✅ Database trigger creates first `repair_job_updates` entry

**Schema:**
- ✅ [supabase/migrations/phase3/01_repair_job_tracking_up.sql](supabase/migrations/phase3/01_repair_job_tracking_up.sql)
- ✅ Auto-trigger: `trigger_auto_create_repair_job` (line 206)
- ✅ Auto-logging: `trigger_log_repair_job_status_change` (line 242)

**Deep-Links:**
- ⚠️ See item #2 - Need to replace hardcoded paths with `routeFor.repair()`

---

## ✅ **7. LOGIN/SIGNUP DE-DUPLICATION**

### 🟢 **PASSED** - Split `/login` and `/signup` routes exist

**Routes:**
- ✅ `/login` - [src/app/login/page.tsx](src/app/login/page.tsx)
- ✅ `/signup` - [src/app/signup/page.tsx](src/app/signup/page.tsx)
- ✅ `routeFor.login()` → `/login`
- ✅ `routeFor.signup()` → `/signup`

### ⚠️ **LINGERING ISSUES:**
**3 files still use `/signup?mode=login`:**
1. [src/app/intake/page.tsx:67](src/app/intake/page.tsx:67)
2. [src/app/diagnostic/[id]/VideoSessionClient.tsx:1305](src/app/diagnostic/[id]/VideoSessionClient.tsx:1305)
3. [src/app/video/[id]/VideoSessionClient.tsx:1855](src/app/video/[id]/VideoSessionClient.tsx:1855)

**Fix:**
```typescript
// REPLACE:
redirectTo: '/signup?mode=login'
window.location.href = '/signup?mode=login'

// WITH:
redirectTo: routeFor.login()
window.location.href = routeFor.login()
```

---

## ✅ **8. ONBOARDING & WIZARD POLISH**

### 🟢 **PASSED** - OnboardingChecklist & SessionWizard functional

**OnboardingChecklist:** [src/components/customer/OnboardingChecklist.tsx](src/components/customer/OnboardingChecklist.tsx)
- ✅ Dismiss state persists via API
- ✅ Steps flip to complete immediately after action
- ✅ Uses `routeFor.*` for navigation

**SessionWizard:** [src/components/customer/SessionWizard.tsx](src/components/customer/SessionWizard.tsx)
- ✅ Vehicle step auto-prompts when empty via [VehiclePrompt.tsx](src/components/customer/VehiclePrompt.tsx)
- ✅ Dismissal respected
- ✅ Free trial logic doesn't block flow

### ⚠️ **ISSUE:** Session Wizard uses hardcoded pricing (see **PRICING SYSTEM** analysis in separate proposal)

---

## ⚠️ **9. MIGRATIONS: APPLY SAFELY**

### 📋 **MIGRATION APPLY ORDER**

Since `db push` is flaky, apply these **in SQL Editor** by pasting `01_up.sql` → running → then `03_verify.sql`:

#### **Phase 3.1: Enhanced Summary Email (already applied)**
- File: [supabase/migrations/20250204100000_session_summaries/01_up.sql](supabase/migrations/20250204100000_session_summaries/01_up.sql)
- Verify: [03_verify.sql](supabase/migrations/20250204100000_session_summaries/03_verify.sql)

#### **Phase 2: Onboarding System (already applied)**
- File: [supabase/migrations/phase2-onboarding/01_up.sql](supabase/migrations/phase2-onboarding/01_up.sql)
- Verify: [03_verify.sql](supabase/migrations/phase2-onboarding/03_verify.sql)

#### **Phase 3.2: Repair Job Tracking** ⚠️ **NEEDS TO BE APPLIED**
- File: [supabase/migrations/phase3/01_repair_job_tracking_up.sql](supabase/migrations/phase3/01_repair_job_tracking_up.sql)
- Verify: [03_repair_job_tracking_verify.sql](supabase/migrations/phase3/03_repair_job_tracking_verify.sql)

**Apply Steps:**
1. Open Supabase SQL Editor
2. Paste contents of `01_repair_job_tracking_up.sql`
3. Run and verify no errors
4. Paste contents of `03_repair_job_tracking_verify.sql`
5. Run and check all assertions pass
6. Update [MIGRATION_TRACKING.md](MIGRATION_TRACKING.md) with timestamp

---

## ✅ **10. SMOKE TESTS (10 MINUTES)**

### 🧪 **Test Scenarios**

#### **Test 1: Onboarding Flow**
1. Sign up → login → see OnboardingChecklist
2. Add vehicle via prompt
3. Verify checklist step marks complete
4. Dismiss checklist
5. Verify dismissal persists on refresh

**Expected:**
- ✅ All steps complete after actions
- ✅ Dismiss state persists

---

#### **Test 2: Session → RFQ Prefill**
1. Start & end a session
2. See completion modal
3. Click "Get Quotes"
4. Verify RFQ form prefilled with:
   - Session ID
   - Issue description
   - Urgency level

**Expected:**
- ✅ Form prefilled from session summary
- ✅ If summary missing: empty form (no blocking error)

---

#### **Test 3: RFQ → Bid → Payment → Repair Job**
1. Submit RFQ
2. Admin/Workshop creates fake bid
3. Customer clicks "Accept This Bid"
4. Complete Stripe test checkout
5. Verify:
   - Success page shows
   - Repair job created in database
   - First status update logged
   - Customer receives notification

**Expected:**
- ✅ Repair job auto-created
- ✅ First update: "Status changed from NULL to pending_parts"

---

#### **Test 4: Partial Refund Flow** ⚠️ **BLOCKED - Endpoint not implemented**
1. Trigger partial refund via API endpoint
2. Verify:
   - Refund recorded in `refunds` table
   - Customer notification sent
   - Workshop notification sent
   - Escrow status updated

**Expected:**
- ⚠️ BLOCKED - Need to create refund endpoint first

---

#### **Test 5: Notification Click-Through**
1. Trigger each notification type:
   - `session_completed`
   - `summary_ready`
   - `repair_job_update`
   - `rfq_bid_received`
   - `quote_received`
2. Click each notification
3. Verify lands on exact action completion page

**Expected:**
- ✅ All notifications navigate correctly
- ⚠️ Some use hardcoded paths instead of `routeFor.*`

---

## ✅ **11. OBSERVABILITY**

### 📊 **Key Success Metrics**

1. **RFQ Acceptance Success Rate**
   - Metric: `(rfqs_accepted / rfqs_created) * 100`
   - Log: Webhook handler logs bid acceptance
   - Location: [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts) line ~200

2. **Quote Acceptance Success Rate**
   - Metric: `(quotes_accepted / quotes_created) * 100`
   - Log: Quote response API
   - Location: [src/app/api/quotes/[quoteId]/respond/route.ts](src/app/api/quotes/[quoteId]/respond/route.ts)

3. **Refund Outcomes**
   - Metric: `(refunds_completed / refunds_requested) * 100`
   - Log: ⚠️ NOT YET IMPLEMENTED (need refund endpoint)

4. **Notification Click-Through Rate**
   - Metric: `(notifications_clicked / notifications_sent) * 100`
   - Log: ⚠️ NOT IMPLEMENTED
   - Recommendation: Add click tracking in [NotificationCenter.tsx](src/components/notifications/NotificationCenter.tsx)

5. **Onboarding Completion Rate**
   - Metric: `(profiles_completed / signups) * 100`
   - Log: ✅ Available via `/api/customer/onboarding/progress`
   - Location: [src/app/api/customer/onboarding/progress/route.ts](src/app/api/customer/onboarding/progress/route.ts)

6. **Session Extension Success Rate**
   - Metric: `(extensions_completed / extensions_requested) * 100`
   - Log: ✅ Webhook logs extension payment
   - Location: [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts) line 142

### 📋 **Logging Recommendations**

**Add structured logging:**
```typescript
// In webhook handlers:
console.log(`✓ Audit: ${eventId} | ${type} | ${entityType}:${entityId} | customer:${customerId} | $${amount}`)

// In notification click handler:
console.log(`🔔 Click: ${notificationType} | user:${userId} | destination:${deepLink}`)

// In refund endpoint (when created):
console.log(`💰 Refund: ${paymentId} | ${type} | $${amount} | initiated_by:${userId}`)
```

**Log Viewing:**
- Supabase Dashboard → Logs
- Filter by pattern: `✓ Audit:` for payment events
- Filter by pattern: `🔔 Click:` for notification engagement

---

## 📋 **PRIORITY ACTION ITEMS**

### 🔴 **CRITICAL** (Block Ship)
1. ❌ **Create refund endpoint** - [/api/repair-payments/[paymentId]/refund/route.ts]
2. ❌ **Add Stripe refund/dispute webhook handlers**
3. ❌ **Apply Phase 3.2 migration** - [supabase/migrations/phase3/01_repair_job_tracking_up.sql]

### 🟡 **HIGH** (Ship with Workaround)
4. ⚠️ **Replace 20+ hardcoded routes with `routeFor.*`**
5. ⚠️ **Fix SessionWizard hardcoded pricing** (see separate pricing proposal)
6. ⚠️ **Remove `/signup?mode=login` from 3 files**

### 🟢 **MEDIUM** (Post-Ship)
7. ℹ️ Add centralized notification creator utility
8. ℹ️ Add notification click-through tracking
9. ℹ️ Add ESLint rule for route hardcoding prevention
10. ℹ️ Add structured audit logging

---

## 🎯 **OVERALL STATUS**

| Item | Status | Blocker? |
|------|--------|----------|
| 1. Route & Link Integrity | 🟡 Partial | No |
| 2. Notification Deep-Links | 🟡 Partial | No |
| 3. Stripe Idempotency | 🟢 Passed | No |
| 4. Refund Guardrails | 🔴 Failed | **YES** |
| 5. RFQ Prefill | 🟢 Passed | No |
| 6. Repair Tracking | 🟢 Passed | No |
| 7. Login/Signup De-dup | 🟡 Partial | No |
| 8. Onboarding Polish | 🟢 Passed | No |
| 9. Migrations | 🟡 1 Pending | **YES** |
| 10. Smoke Tests | 🟡 4/5 Ready | No |
| 11. Observability | 🟡 4/6 Metrics | No |

**Ship Decision:** 🟡 **READY WITH FIXES**

**Blockers to Resolve:**
1. Apply Phase 3.2 migration
2. Create refund endpoint
3. Add Stripe refund webhook handler

**Estimated Time to Ship:** 2-3 hours
