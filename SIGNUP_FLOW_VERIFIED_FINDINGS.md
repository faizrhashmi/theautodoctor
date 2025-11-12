# SIGNUP FLOW - VERIFIED FINDINGS & ACTION PLAN
**Generated:** 2025-11-10 (Deep Dive Analysis)
**Status:** Ready for Implementation

---

## EXECUTIVE SUMMARY

After thorough analysis of all signup flows, I've verified your concerns and identified critical issues. Here's what I found:

### ✅ WHAT I VERIFIED

1. **Password Reset Page:** ❌ CONFIRMED MISSING - `/customer/reset-password` does NOT exist
2. **Signup Page Designs:** They look VERY similar (all use same dark gradient), need differentiation
3. **Mechanic Approval:** Works but INCOMPLETE - missing approval emails and Stripe automation
4. **Customer Signup Validation:** Missing postal code collection (CRITICAL for mechanic matching)
5. **Source of Truth:** SignupGate.tsx is the active customer signup (customer/signup/page.tsx uses deleted components)
6. **Forgot Password Links:** ❌ MISSING on ALL login pages (mechanic, workshop, admin)
7. **Subscription System:** ✅ FULLY IMPLEMENTED with credit-based system via feature flags

### 🔴 CRITICAL ISSUES (Must Fix Immediately)

| Priority | Issue | Impact | Fix Time |
|----------|-------|--------|----------|
| P0 | Password reset page missing | Users can't reset passwords | 2-4 hours |
| P0 | Postal code not collected in customer signup | Mechanic matching broken | 1 hour |
| P0 | No forgot password links on login pages | Poor UX, support burden | 1 hour |
| P1 | Mechanic approval emails not sent | Mechanics don't know they're approved | 4-8 hours |
| P1 | No phone validation in customer signup | Bad data quality | 30 min |
| P2 | Signup pages look identical | Brand confusion | 2-4 hours |

---

## 1. PASSWORD RESET - VERIFIED FINDINGS

### FINDING 1.1: Reset Page Does NOT Exist ❌

**Verification Method:** Searched entire codebase for `/customer/reset-password`

**What Exists:**
- ✅ Forgot password form: `/forgot-password` → [src/app/(auth)/forgot-password/page.tsx](src/app/(auth)/forgot-password/page.tsx)
- ✅ Forgot password API: `POST /api/customer/forgot-password` → [src/app/api/customer/forgot-password/route.ts](src/app/api/customer/forgot-password/route.ts)
- ✅ Email service configured (Resend API)

**What's MISSING:**
- ❌ Reset password page: `/customer/reset-password` (referenced in API line 31 but doesn't exist)
- ❌ Token validation logic
- ❌ New password form
- ❌ Password update handler

**Current Broken Flow:**
```
User → /forgot-password → Enter email → Email sent ✅
    ↓
User clicks email link → Redirects to /customer/reset-password
    ↓
❌ 404 ERROR - Page not found
```

**Expected Flow:**
```
User → /forgot-password → Enter email → Email sent
    ↓
User clicks email link → /customer/reset-password?token=xxx
    ↓
Extract token → Validate with Supabase
    ↓
Show "Set New Password" form
    ↓
Submit → supabase.auth.updateUser({ password })
    ↓
Success → Redirect to login
```

### FINDING 1.2: No Forgot Password Links ❌

**Verified on ALL login pages:**

| Login Page | Forgot Password Link | File |
|------------|---------------------|------|
| Customer (uses signup flow) | ❌ Missing | N/A (no dedicated login page) |
| Mechanic | ❌ Missing | [src/app/mechanic/login/page.tsx](src/app/mechanic/login/page.tsx) |
| Workshop | ❌ Missing | [src/app/workshop/login/page.tsx](src/app/workshop/login/page.tsx) |
| Admin | ❌ Missing | [src/app/admin/login/AdminLoginClient.tsx](src/app/admin/login/AdminLoginClient.tsx) |

**All login pages have:**
- Email + password inputs ✅
- Submit button ✅
- Signup link ✅
- NO "Forgot Password?" link ❌

---

## 2. SIGNUP PAGE DESIGNS - VERIFIED ANALYSIS

### FINDING 2.1: All Pages Use Same Visual Foundation

**Color Scheme Comparison:**

| Element | Customer | Mechanic | Workshop |
|---------|----------|----------|----------|
| Background | `from-slate-950 via-slate-900 to-slate-950` | Same | Same |
| Primary Brand Color | Orange-500/600 | Orange-500/600 | Orange-500/600 |
| Submit Button (Final) | Orange gradient | GREEN gradient | GREEN gradient |
| Form Card | Frosted glass white/10 | White/5 backdrop blur | White/5 backdrop blur |
| Icon Badge | Orange/Red gradient | Orange-600 solid | Orange gradient |

**Distinctive Elements:**

**Customer ([src/app/signup/page.tsx](src/app/signup/page.tsx)):**
- Two-column layout (benefits + form)
- Multiple gradient icon badges (orange, blue, green)
- Marketing copy on left side
- Single-page form (no steps)
- Icon: User group with video call

**Mechanic ([src/app/mechanic/signup/page.tsx](src/app/mechanic/signup/page.tsx)):**
- **6-step wizard** with progress bar
- Wrench icon (distinctive)
- Green submit button (vs orange for customer)
- Much more complex validation
- Auto-save to localStorage
- Icon: Wrench

**Workshop ([src/app/workshop/signup/page.tsx](src/app/workshop/signup/page.tsx)):**
- **4-step wizard** with progress bar
- Building icon (distinctive)
- Green submit button
- Business-focused fields
- Icon: Building2

### FINDING 2.2: Recommendations for Differentiation

**Customer:**
- KEEP: Orange branding, two-column layout, marketing focus
- ADD: Unique hero image or illustration
- ENHANCE: Add customer testimonials or trust badges

**Mechanic:**
- CHANGE: Use blue or teal primary color (not orange)
- KEEP: 6-step wizard, wrench icon, green submit
- ADD: "Professional" badge or certification badge visual

**Workshop:**
- CHANGE: Use purple or indigo primary color (not orange)
- KEEP: 4-step wizard, building icon, green submit
- ADD: "Business Account" badge or different header style

---

## 3. MECHANIC APPROVAL FLOW - VERIFIED FINDINGS

### FINDING 3.1: What Works ✅

**Signup Data Capture:**
- ✅ All 6 steps functional
- ✅ Document upload working (Supabase Storage)
- ✅ Multi-certification support (JSONB storage)
- ✅ Draft auto-save (localStorage + API)

**Admin Review:**
- ✅ Applications dashboard at `/admin/mechanics/applications`
- ✅ Detailed modal with all application data
- ✅ Document preview/download
- ✅ Filter by status (pending/approved/rejected)
- ✅ Search by name/email

**Database:**
- ✅ Complete audit trail (`mechanic_admin_actions` table)
- ✅ All fields properly stored
- ✅ Status tracking (draft → pending → approved)

### FINDING 3.2: What's Broken ❌

**File:** [src/app/api/admin/mechanics/[id]/approve/route.ts](src/app/api/admin/mechanics/[id]/approve/route.ts)

**Lines 60-61:**
```typescript
// TODO: Send approval email to mechanic
// TODO: Send notification about Stripe Connect onboarding
```

**Missing:**
1. ❌ Approval email template doesn't exist
2. ❌ Rejection email template doesn't exist
3. ❌ No Stripe Connect account creation on approval
4. ❌ No Stripe onboarding link sent
5. ❌ No "application received" confirmation email

**Current Broken Flow:**
```
Mechanic submits application
    ↓
Admin approves via dashboard ✅
    ↓
Database updated ✅
    ↓
❌ NO EMAIL SENT TO MECHANIC
❌ NO STRIPE ACCOUNT CREATED
    ↓
Mechanic must:
  1. Somehow know they're approved (check dashboard?)
  2. Log in manually
  3. Navigate to payment settings
  4. Click "Set up payments"
  5. Complete Stripe onboarding
    ↓
ONLY THEN can accept sessions
```

### FINDING 3.3: Mandatory Fields Analysis

**ALL fields marked required ARE validated ✅**

**Step 1 - Personal (ALL REQUIRED):**
- name, email, phone, password
- address, city, province, postalCode
- dateOfBirth (must be 18+)
- sinOrBusinessNumber (optional, feature-flagged)

**Step 2 - Credentials (MINIMUM 1 certification required):**
- certifications array (must have length > 0)
- yearsOfExperience (must be > 0)
- specializations (must select at least 1)

**Step 3 - Shop:**
- shopAffiliation (required, dropdown)
- shopName, shopAddress (conditional based on affiliation)

**Step 4 - Insurance & Background (ALL REQUIRED):**
- liabilityInsurance checkbox (must be true)
- insurancePolicyNumber
- insuranceExpiry (must be future date)
- criminalRecordCheck checkbox (must be true)
- Documents: insurance + CRC uploads required

**Validation Status:** ✅ All properly linked to profile/mechanics table

### FINDING 3.4: Future Automation Recommendations

**Phase 1 (Critical - 1-2 weeks):**
1. Create mechanic email templates
2. Send approval/rejection emails
3. Auto-create Stripe Connect account on approval
4. Send Stripe onboarding link in approval email

**Phase 2 (High Value - 2-4 weeks):**
5. Integrate Certn or Checkr for background checks
6. Auto-trigger background check on application submit
7. Webhook handler for background check completion
8. Admin sees background check status in dashboard

**Phase 3 (Enhanced - 4-8 weeks):**
9. AWS Textract for document OCR
10. Auto-extract certification numbers from uploads
11. Verify Red Seal with provincial APIs
12. Auto-approve if all checks pass

**Estimated Costs:**
- Background check: $40-80 CAD per mechanic
- Document OCR: $0.50 per document
- Red Seal verification: Free (public APIs)
- Development time Phase 1: 40-60 hours

---

## 4. CUSTOMER SIGNUP VALIDATION - VERIFIED FINDINGS

### FINDING 4.1: Source of Truth = SignupGate.tsx ✅

**Verified:** [src/app/signup/SignupGate.tsx](src/app/signup/SignupGate.tsx) is the ACTIVE customer signup

**Alternative flow ([src/app/customer/signup/page.tsx](src/app/customer/signup/page.tsx)) is BROKEN:**
- Uses deleted components: `CountrySelector`, `AddressAutocomplete`
- Would crash if user navigated to it
- Better validation but non-functional

**Recommendation:** Keep SignupGate, delete alternative flow after salvaging its better validation logic

### FINDING 4.2: Critical Missing Field - Postal Code ❌

**Verified:** SignupGate does NOT collect postal code

**Evidence:**
1. Form state (Line 22-32): NO `postalCode` field
2. Form inputs: Only has address, city, country (no postal)
3. API expects it (Line 95 in route.ts): `postal_zip_code: address.postalCode`
4. Database has field: `postal_zip_code TEXT` in profiles table
5. Location matching depends on it: `20251109020800_add_customer_postal_code.sql`

**Impact:**
- Mechanic matching algorithm can't work (needs postal code proximity)
- Location-based features broken
- Data quality issue

**Fix Required:**
```typescript
// Add after city field (around line 436)
<div>
  <label className="block text-sm font-semibold text-slate-200">
    Postal Code <span className="text-rose-400">*</span>
  </label>
  <input
    type="text"
    required
    value={form.postalCode}
    onChange={(e) => setForm(prev => ({ ...prev, postalCode: e.target.value.toUpperCase() }))}
    placeholder="M5V 3A8 or 90210"
    pattern="[A-Z]\d[A-Z]\s?\d[A-Z]\d|\d{5}(-\d{4})?"
    className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3..."
  />
</div>
```

### FINDING 4.3: Weak Validation ⚠️

**Phone Number:**
- Current: Only checks if not empty
- Fix: Add regex `/^\+?1?[\s.-]?\(?[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/`

**Email:**
- Current: HTML5 validation only
- Fix: Add explicit regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

**Address:**
- Current: Only checks if not empty
- Fix: Add minimum length (5 chars)

### FINDING 4.4: All Fields Are Mandatory ✅

**Current Required Fields:**
- firstName, lastName ✅
- phone ✅
- dateOfBirth (18+) ✅
- address, city, country ✅
- email, password ✅
- waiver acceptance ✅

**Missing but SHOULD be required:**
- ❌ postal code
- ⚠️ province/state (currently missing entirely)

**Validation Feedback:**
- ✅ Inline errors for: firstName, lastName, DOB, password
- ❌ No inline errors for: phone, email, address, city, country
- Fix: Add onChange validation to ALL fields

---

## 5. RATE LIMITING STRATEGY

### FINDING 5.1: Rate Limiter Exists But Not Used

**File:** [src/lib/ratelimit.ts](src/lib/ratelimit.ts)

**Defined Limiters:**
```typescript
// Line 83-94: Password reset limiter (3 per hour per email)
export const passwordResetRateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'password_reset',
})
```

**Status:** ❌ NOT USED in `/api/customer/forgot-password/route.ts`

### FINDING 5.2: Implementation Plan

**Required Changes:**

**File:** [src/app/api/customer/forgot-password/route.ts](src/app/api/customer/forgot-password/route.ts)

**Add after line 16:**
```typescript
import { passwordResetRateLimiter } from '@/lib/ratelimit'

export async function POST(req: Request) {
  const { email } = await req.json()

  // Rate limiting (MUST be before any other logic to prevent enumeration)
  const identifier = email.toLowerCase().trim()
  const { success, reset } = await passwordResetRateLimiter.limit(identifier)

  if (!success) {
    const resetTime = new Date(reset).toLocaleTimeString()
    return NextResponse.json(
      {
        error: `Too many password reset attempts. Please try again after ${resetTime}`,
        retryAfter: reset
      },
      { status: 429 }
    )
  }

  // Rest of existing code...
}
```

**Additional Rate Limiters Needed:**

```typescript
// Signup rate limiting (5 per hour per IP)
export const signupRateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'signup',
})

// Login rate limiting (10 per 15 min per IP)
export const loginRateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'login',
})

// Email verification resend (3 per hour per email)
export const emailVerificationRateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'email_verification',
})
```

**Apply to:**
- `/api/customer/signup` - signupRateLimiter by IP
- `/api/mechanic/signup` - signupRateLimiter by IP
- `/api/workshop/signup` - signupRateLimiter by IP
- `/api/customer/forgot-password` - passwordResetRateLimiter by email ✅
- `/api/mechanic/login` - loginRateLimiter by IP
- `/api/workshop/login` - loginRateLimiter by IP
- `/api/admin/login` - loginRateLimiter by IP (stricter: 5 per 15 min)

---

## 6. SUBSCRIPTION/CREDIT SYSTEM - VERIFIED FINDINGS

### FINDING 6.1: Fully Implemented ✅

**Database Tables:**
- ✅ `service_plans` - Plans with PAYG + subscription types
- ✅ `customer_subscriptions` - Active subscriptions with credit balance
- ✅ `credit_transactions` - Complete audit trail
- ✅ `credit_pricing` - Dynamic credit costs by session type

**API Endpoints:**
- ✅ GET/POST `/api/customer/subscriptions` - Create/view subscriptions
- ✅ POST `/api/customer/subscriptions/cancel` - Cancel subscriptions
- ✅ GET `/api/customer/credits` - Credit balance + transactions
- ✅ GET `/api/credit-pricing` - Current pricing

**Feature Flag:**
- Location: `feature_flags` table, key: `subscriptions`
- Status: ❌ DISABLED by default
- Enable via: Admin UI → Feature Flags → Toggle "Subscription Plans"

### FINDING 6.2: Source of Truth = service_plans Table ✅

**Primary:** Database-driven plans in `service_plans` table
**Admin UI:** `/admin/plans` for CRUD operations
**Deprecated:** `src/config/pricing.ts` (kept for backward compatibility)

**Current Plans:**
- **PAYG:** free ($0), quick ($9.99), standard ($29.99), diagnostic ($49.99)
- **Subscriptions:** starter ($85/mo, 30 credits), regular ($216/mo, 80 credits), premium ($459/mo, 180 credits)

### FINDING 6.3: Credit Flow Verified

**Allocation (Monthly Cron):**
- Cron: `/api/cron/allocate-credits`
- Process:
  1. Find subscriptions with next_billing_date ≤ NOW()
  2. Rollover credits (capped by max_rollover_credits)
  3. Expire excess credits
  4. Add new monthly allocation
  5. Record transactions

**Deduction (Session Creation):**
- Location: `/api/intake/start` lines 164-242
- Process:
  1. Check if use_credits = true
  2. Get credit cost from credit_pricing table
  3. Call deduct_session_credits() database function (ATOMIC with row locking)
  4. Create session
  5. Rollback if deduction fails

**Refund (Session Cancellation):**
- Function: refund_session_credits()
- Returns credits to balance
- Records refund transaction

**Pricing by Session Type:**
- quick + standard: 3 credits
- video + standard: 10 credits
- diagnostic + standard: 17 credits
- quick + specialist: 10 credits (+7 premium)
- video + specialist: 17 credits (+7 premium)
- diagnostic + specialist: 27 credits (+10 premium)

---

## 7. SOURCE OF TRUTH CONFLICTS - VERIFIED

### FINDING 7.1: Email Duplication

**Stored in 3 places:**
1. `auth.users.email` - PRIMARY ✅
2. `profiles.email` - Denormalized copy
3. `mechanics.email` - Denormalized copy with UNIQUE constraint

**Issues:**
- No sync mechanism (changes to auth.users don't propagate)
- Unique constraint on mechanics.email could conflict

**Resolution:**
1. Remove email from profiles table
2. Remove email from mechanics table
3. Always JOIN auth.users for email
4. Update ALL queries

### FINDING 7.2: Location Field Duplication

**profiles table has BOTH:**
- `postal_zip_code` - Used by API
- `postal_code` - Duplicate from migration

**profiles table has BOTH:**
- `state_province` - Used by API
- `province` - Duplicate from migration

**mechanics table has BOTH:**
- `state_province` - Legacy
- `province` - Current

**Resolution:**
1. Standardize to `postal_code` and `province`
2. Drop `postal_zip_code` and `state_province`
3. Migration to copy data before drop

### FINDING 7.3: API Usage Analysis

**All APIs Use:**
- `auth.users.email` indirectly via Supabase Auth ✅
- `profiles.postal_zip_code` - NEEDS UPDATE to `postal_code`
- `profiles.state_province` - NEEDS UPDATE to `province`

---

## 8. MECHANIC APPROVAL EMAIL DESIGN

### FINDING 8.1: Email Templates Needed

**File to Create:** `src/lib/email/mechanicTemplates.ts`

**Required Functions:**

**1. Approval Email:**
```typescript
export function mechanicApprovalEmail({
  mechanicName,
  email,
  stripeOnboardingUrl,
  dashboardUrl,
  notes
}: {
  mechanicName: string
  email: string
  stripeOnboardingUrl: string
  dashboardUrl: string
  notes?: string
}): { subject: string; html: string }
```

**Content:**
- Congratulations header
- Approved status notification
- Next step: Complete Stripe onboarding
- CTA button → Stripe Connect
- Dashboard link
- Support contact

**2. Rejection Email:**
```typescript
export function mechanicRejectionEmail({
  mechanicName,
  email,
  rejectionReason,
  reapplyUrl,
  supportEmail
}: {
  mechanicName: string
  email: string
  rejectionReason: string
  reapplyUrl?: string
  supportEmail: string
}): { subject: string; html: string }
```

**Content:**
- Respectful rejection notice
- Reason for rejection
- Path to appeal/reapply
- Support contact

**3. Application Received Email:**
```typescript
export function mechanicApplicationReceivedEmail({
  mechanicName,
  email,
  applicationId,
  estimatedReviewTime
}: {
  mechanicName: string
  email: string
  applicationId: string
  estimatedReviewTime: string
}): { subject: string; html: string }
```

**Content:**
- Application received confirmation
- What happens next
- Timeline expectations (2-3 business days)
- Contact for questions

### FINDING 8.2: Integration Points

**Approval Route:** [src/app/api/admin/mechanics/[id]/approve/route.ts](src/app/api/admin/mechanics/[id]/approve/route.ts)

**Add after line 58 (after database update):**
```typescript
// 1. Create Stripe Connect account
const stripeAccount = await stripe.accounts.create({
  type: 'express',
  email: mechanic.email,
  country: 'CA', // Should use mechanic.country
  capabilities: { transfers: { requested: true } },
  business_type: 'individual',
  metadata: { mechanic_id: mechanicId }
})

// 2. Update mechanic with Stripe account ID
await supabaseAdmin
  .from('mechanics')
  .update({ stripe_account_id: stripeAccount.id })
  .eq('id', mechanicId)

// 3. Create onboarding link
const accountLink = await stripe.accountLinks.create({
  account: stripeAccount.id,
  refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/mechanic/onboarding/stripe?refresh=true`,
  return_url: `${process.env.NEXT_PUBLIC_APP_URL}/mechanic/onboarding/stripe/complete`,
  type: 'account_onboarding'
})

// 4. Send approval email
const emailTemplate = mechanicApprovalEmail({
  mechanicName: mechanic.name,
  email: mechanic.email,
  stripeOnboardingUrl: accountLink.url,
  dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/mechanic/dashboard`,
  notes
})

await sendEmail({
  to: mechanic.email,
  subject: emailTemplate.subject,
  html: emailTemplate.html
})

console.log('[ADMIN] Approval email sent to:', mechanic.email)
```

---

## 9. EMAIL RETRY LOGIC DESIGN

### FINDING 9.1: Current Email System

**Service:** Resend API ([src/lib/email/emailService.ts](src/lib/email/emailService.ts))
**Current Logic:**
- Single send attempt
- Throws error on failure
- No retry mechanism
- No queue

### FINDING 9.2: Recommended Retry Strategy

**Option 1: Simple Retry (Immediate Implementation)**

```typescript
// src/lib/email/emailService.ts
export async function sendEmailWithRetry({
  to,
  subject,
  html,
  maxRetries = 3,
  retryDelay = 1000
}: SendEmailParams & {
  maxRetries?: number
  retryDelay?: number
}): Promise<EmailResult> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendEmail({ to, subject, html })

      // Log success
      console.log(`[Email] Sent successfully on attempt ${attempt}:`, result.id)

      return { success: true, id: result.id, attempt }
    } catch (error) {
      lastError = error as Error

      console.error(`[Email] Attempt ${attempt}/${maxRetries} failed:`, error)

      // Don't retry on permanent failures
      if (isPermanentFailure(error)) {
        break
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // All retries failed
  console.error('[Email] All retry attempts failed:', lastError)

  // Log to database for manual followup
  await logFailedEmail({ to, subject, error: lastError?.message })

  throw new Error(`Failed to send email after ${maxRetries} attempts: ${lastError?.message}`)
}

function isPermanentFailure(error: any): boolean {
  // Don't retry on these errors
  const permanentErrors = [
    'invalid_email',
    'recipient_blocked',
    'domain_not_verified'
  ]

  return permanentErrors.some(err =>
    error?.message?.toLowerCase().includes(err)
  )
}
```

**Option 2: Queue-Based (Production-Ready)**

**Using Upstash QStash (Serverless Queue):**

```typescript
// src/lib/email/emailQueue.ts
import { Client } from '@upstash/qstash'

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!
})

export async function queueEmail({
  to,
  subject,
  html,
  priority = 'normal'
}: QueueEmailParams) {
  // Publish to queue
  const result = await qstash.publishJSON({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/email/process`,
    body: { to, subject, html },
    retries: 3,
    delay: priority === 'urgent' ? 0 : 60 // Batch normal emails
  })

  // Log to database
  await supabaseAdmin.from('email_queue').insert({
    message_id: result.messageId,
    to,
    subject,
    status: 'queued',
    priority,
    scheduled_for: new Date()
  })

  return result
}

// /api/email/process - Webhook handler
export async function POST(req: Request) {
  const { to, subject, html } = await req.json()

  try {
    await sendEmail({ to, subject, html })

    // Update status
    await supabaseAdmin
      .from('email_queue')
      .update({ status: 'sent', sent_at: new Date() })
      .eq('to', to)
      .eq('subject', subject)
      .order('created_at', { ascending: false })
      .limit(1)

  } catch (error) {
    // QStash will auto-retry
    throw error
  }
}
```

### FINDING 9.3: Email Queue Table Design

```sql
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT, -- From email provider
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  template_name TEXT, -- e.g., 'mechanic_approval'
  template_data JSONB, -- For re-rendering if needed

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued',
    'processing',
    'sent',
    'failed',
    'permanent_failure'
  )),

  -- Retry tracking
  attempts INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,

  -- Scheduling
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent', 'normal', 'low')),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,

  -- Metadata
  user_id UUID REFERENCES auth.users(id),
  related_entity_type TEXT, -- 'mechanic_application', 'session', etc.
  related_entity_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_queue_status ON email_queue(status, scheduled_for);
CREATE INDEX idx_email_queue_user ON email_queue(user_id);
CREATE INDEX idx_email_queue_priority ON email_queue(priority, created_at);
```

### FINDING 9.4: Implementation Recommendation

**Phase 1 (Immediate):**
- Use simple retry logic (Option 1)
- 3 retries with exponential backoff
- Log failures to database
- Cost: Free (no new services)
- Time: 2-3 hours

**Phase 2 (Production):**
- Implement email_queue table
- Add queue-based sending (Option 2)
- Monitor via admin dashboard
- Cost: ~$10/month (Upstash QStash)
- Time: 8-12 hours

---

## 10. COMPLETE ACTION PLAN

### WEEK 1: Critical Fixes (P0)

**Day 1-2: Password Reset (4-6 hours)**
1. Create `/customer/reset-password` page
2. Extract token from URL
3. Validate token with Supabase
4. Show password reset form
5. Handle password update
6. Add success/error states

**Day 2-3: Postal Code Collection (2 hours)**
1. Add postalCode to SignupGate form state
2. Add postal code input field (with validation)
3. Update API payload to include postal code
4. Test mechanic matching with postal codes

**Day 3-4: Forgot Password Links (2 hours)**
1. Add "Forgot Password?" link to mechanic login
2. Add "Forgot Password?" link to workshop login
3. Add "Forgot Password?" link to admin login
4. Test links redirect to `/forgot-password`

**Day 4-5: Phone Validation (1 hour)**
1. Add phone validation regex to SignupGate
2. Add inline error display
3. Add onChange validation
4. Test with various phone formats

### WEEK 2: High Priority (P1)

**Day 1-3: Mechanic Approval Emails (8-12 hours)**
1. Create `mechanicTemplates.ts` with 3 email templates
2. Update approve route to send approval email
3. Add Stripe Connect account creation
4. Send Stripe onboarding link
5. Update reject route to send rejection email
6. Add application received email to signup flow
7. Test complete approval workflow

**Day 3-4: Rate Limiting (4 hours)**
1. Enable passwordResetRateLimiter in forgot-password API
2. Add signupRateLimiter to signup routes
3. Add loginRateLimiter to login routes
4. Test rate limiting behavior
5. Add friendly error messages

**Day 5: Email Retry Logic (4 hours)**
1. Implement sendEmailWithRetry function
2. Add exponential backoff
3. Create email_queue table
4. Log failed emails
5. Test retry behavior

### WEEK 3: Medium Priority (P2)

**Day 1-3: Signup Page Differentiation (8 hours)**
1. Customer: Keep orange, add unique visuals
2. Mechanic: Change to blue/teal theme
3. Workshop: Change to purple/indigo theme
4. Update icons and badges
5. Test responsive design

**Day 3-5: Source of Truth Cleanup (8 hours)**
1. Create migration to standardize location fields
2. Remove duplicate email fields
3. Update all API queries
4. Test all signup flows
5. Test all profile updates

### WEEK 4: Enhancements

**Day 1-2: Enhanced Validation (4 hours)**
1. Add address format validation
2. Add city validation (letters only)
3. Add province/state dropdown
4. Add postal code format validation (CA/US)
5. Improve error messages

**Day 3-5: Testing & Documentation (8 hours)**
1. End-to-end testing all signup flows
2. Test password reset flow
3. Test mechanic approval flow
4. Document new processes
5. Update API documentation

---

## 11. FINAL VERIFICATION SUMMARY

| Finding | Verified | Status | Priority | Fix Time |
|---------|----------|--------|----------|----------|
| Password reset page missing | ✅ Confirmed | ❌ Missing | P0 | 4-6 hours |
| Postal code not collected | ✅ Confirmed | ❌ Missing | P0 | 1-2 hours |
| Forgot password links missing | ✅ Confirmed | ❌ Missing | P0 | 1-2 hours |
| Signup pages look same | ✅ Confirmed | ⚠️ Similar | P2 | 8 hours |
| Mechanic approval incomplete | ✅ Confirmed | ⚠️ Partial | P1 | 8-12 hours |
| Phone validation weak | ✅ Confirmed | ⚠️ Weak | P1 | 30 min |
| Source of truth = SignupGate | ✅ Confirmed | ✅ Correct | ℹ️ | N/A |
| Rate limiting not used | ✅ Confirmed | ❌ Missing | P1 | 4 hours |
| Subscription system works | ✅ Confirmed | ✅ Complete | ℹ️ | N/A |
| Source of truth conflicts | ✅ Confirmed | ⚠️ Exists | P2 | 8 hours |

---

## 12. ESTIMATED COSTS

**Development Time:**
- Week 1 (P0): 10-12 hours
- Week 2 (P1): 20-24 hours
- Week 3 (P2): 16 hours
- Week 4 (Enhancement): 12 hours
- **Total: 58-64 hours**

**At $100/hour: $5,800-6,400**

**Third-Party Services:**
- Email (Resend): $0 (current plan sufficient)
- Rate Limiting (Upstash Redis): $0 (current plan)
- Queue (QStash): $10/month (optional, Phase 2)
- **Total additional: $0-10/month**

---

## NEXT STEPS

1. **Review this document** and prioritize which issues to fix first
2. **Choose implementation approach:**
   - Option A: Fix everything (4 weeks, $6k)
   - Option B: Fix P0 only (1 week, $1.5k)
   - Option C: Fix P0+P1 (2 weeks, $3.5k)
3. **Approve specific fixes** you want implemented
4. **I'll provide exact code** for each approved fix

**Ready to proceed?** Let me know which option you'd like and I'll start generating the implementation code.