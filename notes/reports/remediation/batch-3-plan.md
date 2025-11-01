# Batch 3 Security Remediation Plan — Workshop Layer

**Date:** 2025-11-01
**Scope:** Workshop Surface (Pages, Components, APIs)
**Priority:** P0-P2 Issues
**Status:** PLANNING (Not Implemented)

---

## 1. Executive Summary

Batch 3 addresses **32** critical issues in the Workshop layer:
- **P0:** 9 files with @ts-nocheck suppressing type safety
- **P1:** 11 hardcoded fee percentages (10%, 15%)
- **P1:** 10 TODO/PLACEHOLDER items indicating incomplete features
- **P2:** Schema drift and inconsistencies (investigation required)

**Goal:** Eliminate all P0-P2 issues without breaking existing workshop flows.

**Risk Level:** MEDIUM (established surface, requires careful testing)

---

## 2. Detailed Findings

### P0-1: TypeScript Safety Disabled (@ts-nocheck)

**Files Affected:** 9 files

#### Finding P0-1a: Workshop Signup Page
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\workshop\signup\page.tsx:1`
- **Issue:** `@ts-nocheck` suppresses all type checking
- **Risk:** HIGH - Type errors can cause runtime failures in signup flow
- **Line:** 1
- **Context:** Client-side workshop signup form with multi-step wizard

#### Finding P0-1b: Workshop Signup API
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\api\workshop\signup\route.ts:1`
- **Issue:** `@ts-nocheck` suppresses all type checking
- **Risk:** HIGH - API errors undetected, critical signup endpoint
- **Line:** 1
- **Context:** Creates auth user, organization record, and profile

#### Finding P0-1c: Workshop Dashboard Page
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\workshop\dashboard\page.tsx:1`
- **Issue:** `@ts-nocheck` suppresses all type checking
- **Risk:** HIGH - Dashboard is primary workshop interface
- **Line:** 1
- **Context:** Main workshop admin dashboard with metrics and sessions

#### Finding P0-1d: Workshop Dashboard API
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\api\workshop\dashboard\route.ts:1`
- **Issue:** `@ts-nocheck` suppresses all type checking
- **Risk:** HIGH - Data integrity issues in dashboard metrics
- **Line:** 1
- **Context:** Aggregates earnings, sessions, and workshop stats

#### Finding P0-1e: Workshop Diagnostics Page
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\workshop\diagnostics\page.tsx:1`
- **Issue:** `@ts-nocheck` suppresses all type checking
- **Risk:** HIGH - Diagnostics session management
- **Line:** 1
- **Context:** Lists all diagnostic sessions for workshop

#### Finding P0-1f: Signup Success Page
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\workshop\signup\success\page.tsx:1`
- **Issue:** `@ts-nocheck` suppresses all type checking
- **Risk:** MEDIUM - Post-signup confirmation page
- **Line:** 1
- **Context:** Success confirmation after workshop application submitted

#### Finding P0-1g: Invite Mechanic API
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\api\workshop\invite-mechanic\route.ts:1`
- **Issue:** `@ts-nocheck` suppresses all type checking
- **Risk:** HIGH - Mechanic invitation flow critical
- **Line:** 1
- **Context:** Creates mechanic invitations and sends emails

#### Finding P0-1h: Workshop Signup Steps Component
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\components\workshop\WorkshopSignupSteps.tsx:1`
- **Issue:** `@ts-nocheck` suppresses all type checking
- **Risk:** HIGH - Shared component used in signup flow
- **Line:** 1
- **Context:** Multi-step signup form components (Step1-4)

#### Finding P0-1i: Invite Mechanic Modal
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\components\workshop\InviteMechanicModal.tsx:1`
- **Issue:** `@ts-nocheck` suppresses all type checking
- **Risk:** MEDIUM - Modal for mechanic invitations
- **Line:** 1
- **Context:** UI component for inviting mechanics to workshop

**Impact:**
- Type safety completely disabled across critical workshop surfaces
- Runtime errors not caught at compile time
- Breaking changes go undetected
- Refactoring is dangerous without type information
- TypeScript benefits (autocomplete, refactor tools) disabled

**Proposed Fix:**
1. Remove `@ts-nocheck` from all 9 files
2. Fix underlying type errors one by one
3. Add proper TypeScript interfaces for all data structures
4. Import types from shared interfaces
5. Use type assertions only where absolutely necessary (e.g., `as const`)

---

### P1-1: Hardcoded Commission Rates

**Files Affected:** 11 files

#### Finding P1-1a: Signup Form Default
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\workshop\signup\page.tsx:109`
- **Issue:** `commissionRate: 10.0` hardcoded in form state
- **Risk:** MEDIUM - Cannot change rates without code deployment
- **Code:**
```typescript
// Line 109
commissionRate: 10.0,
```

#### Finding P1-1b: Signup API Fallback
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\api\workshop\signup\route.ts:166`
- **Issue:** `commissionRate || 10.0` hardcoded fallback
- **Risk:** MEDIUM - Database will store hardcoded value
- **Code:**
```typescript
// Line 166
commission_rate: commissionRate || 10.0,
```

#### Finding P1-1c: Signup Success Page Display
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\workshop\signup\success\page.tsx:163`
- **Issue:** "10% commission" displayed in UI text
- **Risk:** LOW - Informational text, but should match config
- **Code:**
```typescript
// Line 163
<p className="text-xs text-slate-400">10% commission on all mechanic sessions</p>
```

#### Finding P1-1d: Signup Steps Component (Marketing Copy)
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\components\workshop\WorkshopSignupSteps.tsx:108`
- **Issue:** "Earn 10% commission" in benefits list
- **Risk:** LOW - Marketing copy
- **Code:**
```typescript
// Line 108
<li>• Earn 10% commission on all sessions</li>
```

#### Finding P1-1e: Signup Steps Component (Help Text)
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\components\workshop\WorkshopSignupSteps.tsx:359`
- **Issue:** "Default: 10%" in form help text
- **Risk:** LOW - UI help text
- **Code:**
```typescript
// Line 359
Your share of each session fee (Default: 10%)
```

#### Finding P1-1f: Signup Steps Component (Fee Breakdown)
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\components\workshop\WorkshopSignupSteps.tsx:371`
- **Issue:** "Platform: 15%" hardcoded in fee split display
- **Risk:** MEDIUM - Shows incorrect fee structure if platform fee changes
- **Code:**
```typescript
// Line 371
Platform: 15% | Workshop: {formData.commissionRate}% | Mechanic: {85 - formData.commissionRate}%
```

#### Finding P1-1g: Workshop Settings Revenue Page
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\workshop\settings\revenue\page.tsx:37`
- **Issue:** `useState(15)` - Default 15% revenue share
- **Risk:** MEDIUM - Settings page should load from config/DB
- **Code:**
```typescript
// Line 37
const [revenueShare, setRevenueShare] = useState(15) // Default 15%
```

#### Finding P1-1h: Workshop Onboarding Agreement
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\workshop\onboarding\agreement\page.tsx:42`
- **Issue:** "10%" mentioned in legal agreement text
- **Risk:** HIGH - Legal document must match actual rates
- **Code:**
```typescript
// Line 42
• Obtaining customer authorization before exceeding estimate by 10%
```
**Note:** This is for OCPA compliance (10% variance rule), NOT commission rate. Keep as-is.

#### Finding P1-1i: TypeScript Interface Comment
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\workshop\signup\page.tsx:55`
- **Issue:** Comment says "default 10%"
- **Risk:** LOW - Documentation only
- **Code:**
```typescript
// Line 55
commissionRate: number // Workshop's cut (default 10%)
```

**Summary Table:**

| File | Line | Value | Type | Risk |
|------|------|-------|------|------|
| signup/page.tsx | 109 | 10.0 | Form default | MEDIUM |
| signup/route.ts | 166 | 10.0 | API fallback | MEDIUM |
| signup/success/page.tsx | 163 | 10% | Display text | LOW |
| WorkshopSignupSteps.tsx | 108 | 10% | Marketing copy | LOW |
| WorkshopSignupSteps.tsx | 359 | 10% | Help text | LOW |
| WorkshopSignupSteps.tsx | 371 | 15% | Platform fee | MEDIUM |
| settings/revenue/page.tsx | 37 | 15 | React state | MEDIUM |
| signup/page.tsx | 55 | 10% | Comment | LOW |

**Impact:**
- Fee changes require code deployment
- No admin control over rates
- Potential pricing inconsistencies across surfaces
- Marketing materials may become outdated
- Cannot A/B test different commission rates

**Proposed Fix:**
1. Create centralized config: `C:\Users\Faiz Hashmi\theautodoctor\src\config\workshopPricing.ts`
2. Replace all hardcoded values with config imports
3. Update UI text to use template strings with config values
4. Consider database-driven rates for future (Phase 2)
5. Document rate change process for marketing/legal teams

---

### P1-2: TODO/PLACEHOLDER Items

**Files Affected:** 10 files

#### Finding P1-2a: Email Notifications Missing (HIGH PRIORITY)
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\api\workshop\signup\route.ts:238-239`
- **Issue:** TODOs for email sending not implemented
- **Risk:** MEDIUM - Poor user experience, workshops don't get confirmation
- **Code:**
```typescript
// Lines 238-239
// TODO: Send confirmation email to workshop
// TODO: Send notification to admin team for review
```
**Impact:** Workshops apply but receive no confirmation email

#### Finding P1-2b: Quote Customer Notification Missing (HIGH PRIORITY)
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\api\workshop\quotes\create\route.ts:164`
- **Issue:** Customer not notified when quote is ready
- **Risk:** MEDIUM - Customer doesn't know quote is available
- **Code:**
```typescript
// Line 164
// TODO: Send notification to customer about new quote
```
**Impact:** Manual follow-up required, delays quote acceptance

#### Finding P1-2c: Diagnostic Completion Notification Missing (MEDIUM PRIORITY)
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\api\workshop\diagnostics\[sessionId]\complete\route.ts:119`
- **Issue:** Service advisor not notified when diagnostic complete
- **Risk:** MEDIUM - Quote creation delayed
- **Code:**
```typescript
// Line 119
// TODO: Send notification to service advisor that quote needs to be created
```
**Impact:** Manual coordination required

#### Finding P1-2d: Dashboard Revenue Calculation TODO (MEDIUM PRIORITY)
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\api\workshop\dashboard\route.ts:117`
- **Issue:** Session tracking and revenue calculation not implemented
- **Risk:** MEDIUM - Dashboard shows incomplete data
- **Code:**
```typescript
// Line 117
// TODO: Implement session tracking and revenue calculation
```
**Impact:** Workshops can't see accurate earnings

#### Finding P1-2e: Analytics Total Revenue TODO (LOW PRIORITY)
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\workshop\analytics\page.tsx:136`
- **Issue:** Total revenue calculation placeholder
- **Risk:** LOW - Analytics feature incomplete
- **Code:**
```typescript
// Line 136
total_revenue: 0 // TODO: Calculate from sessions
```

#### Finding P1-2f: File Upload Not Implemented (MEDIUM PRIORITY)
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\workshop\diagnostics\[sessionId]\complete\page.tsx:384`
- **Issue:** File upload for diagnostic evidence not implemented
- **Risk:** MEDIUM - Mechanics can't attach photos/videos
- **Code:**
```typescript
// Line 384
{/* TODO: Implement file upload */}
```
**Impact:** Manual file sharing via email

#### Finding P1-2g: Customer ID Placeholder (MEDIUM PRIORITY)
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\workshop\quotes\create\[sessionId]\page.tsx:185`
- **Issue:** Using customer name instead of proper ID
- **Risk:** MEDIUM - Data integrity issue
- **Code:**
```typescript
// Line 185
customer_id: session?.customer_name, // TODO: Use actual customer ID
```
**Impact:** Quote may not link to correct customer

#### Finding P1-2h: Workshop ID TODO (LOW PRIORITY)
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\workshop\quotes\page.tsx:81`
- **Issue:** Workshop ID should come from authenticated session
- **Risk:** LOW - Already addressed by auth guards
- **Code:**
```typescript
// Line 81
// TODO: Get from authenticated session
```

#### Finding P1-2i: Customer Name Join TODO (LOW PRIORITY)
- **File:** `C:\Users\Faiz Hashmi\theautodoctor\src\app\api\workshop\diagnostics\[sessionId]\complete\route.ts:183`
- **Issue:** Customer name hardcoded instead of joined from table
- **Risk:** LOW - Display issue only
- **Code:**
```typescript
// Line 183
customer_name: 'Customer Name', // TODO: Join with customer table
```

**Priority Summary:**

**HIGH Priority (Must fix in Batch 3):**
1. Workshop signup confirmation email (P1-2a)
2. Admin notification for workshop review (P1-2a)
3. Customer quote notification (P1-2b)

**MEDIUM Priority (Consider for Batch 3 or defer):**
4. Diagnostic completion notification (P1-2c)
5. Dashboard revenue calculation (P1-2d)
6. File upload implementation (P1-2f)
7. Customer ID fix (P1-2g)

**LOW Priority (Defer to backlog):**
8. Analytics revenue calculation (P1-2e)
9. Workshop ID comment cleanup (P1-2h)
10. Customer name join (P1-2i)

**Impact:**
- Poor user experience (missing notifications)
- Manual coordination overhead
- Incomplete features visible to users
- Data integrity concerns

**Proposed Approach:**
- HIGH: Implement in Batch 3 using email service (SendGrid, AWS SES, or Resend)
- MEDIUM: Implement high-value items, defer complex ones (file upload)
- LOW: Add to product backlog for future sprints

---

### P2-1: Schema Drift Concerns

**Investigation Required:**
1. Verify `organizations` table has all required columns
2. Check `organization_members` foreign key constraints
3. Confirm `commission_rate` column exists and type is correct
4. Validate workshop status and verification workflow
5. Check if unused columns exist from previous iterations

**Potential Issues:**
- Code assumes columns that may not exist
- Missing indexes on frequently queried fields
- No database constraints matching business rules
- Enum values in code don't match DB enum types

**Proposed Investigation:**
```sql
-- Step 1: Verify organizations table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Check for workshop organizations
SELECT
  id,
  name,
  organization_type,
  commission_rate,
  status,
  verification_status,
  created_at
FROM organizations
WHERE organization_type = 'workshop'
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: Verify foreign keys
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'organization_members'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Step 4: Check indexes on workshop queries
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('organizations', 'organization_members', 'diagnostic_sessions', 'repair_quotes')
ORDER BY tablename, indexname;

-- Step 5: Verify status enums match code
SELECT
  DISTINCT status,
  verification_status,
  COUNT(*) as count
FROM organizations
WHERE organization_type = 'workshop'
GROUP BY status, verification_status;
```

**Risk Assessment:**
- **HIGH:** If `commission_rate` column missing, signups will fail
- **MEDIUM:** Missing indexes could cause performance issues
- **LOW:** Status enum mismatches (code handles gracefully)

---

## 3. Remediation Plan

### Phase 1: Remove @ts-nocheck (P0)

**Files to Fix:** 9 files
**Estimated Time:** 3-4 hours
**Risk:** LOW (fixes are localized)

**Steps:**
1. Remove `@ts-nocheck` from file
2. Run `npm run typecheck` to see errors
3. Fix type errors one by one:
   - Add missing type imports (e.g., `import type { ...}`)
   - Fix function signatures (add return types)
   - Add proper interfaces for data structures
   - Fix `any` types with specific types
   - Use type assertions sparingly (only when necessary)
4. Verify no runtime behavior changes
5. Test affected flows manually

**Example Fix Pattern:**

```typescript
// ❌ BEFORE
// @ts-nocheck
const handleSubmit = async (data) => {
  const response = await fetch('/api/workshop/signup', {
    method: 'POST',
    body: JSON.stringify(data)
  })
  const result = await response.json()
  return result
}

// ✅ AFTER
interface SignupResponse {
  success: boolean
  organizationId?: string
  slug?: string
  message?: string
  error?: string
}

interface WorkshopSignupData {
  workshopName: string
  contactName: string
  email: string
  // ... other fields
}

const handleSubmit = async (data: WorkshopSignupData): Promise<SignupResponse> => {
  const response = await fetch('/api/workshop/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error(`Signup failed: ${response.statusText}`)
  }

  const result: SignupResponse = await response.json()
  return result
}
```

**Common Type Fixes Needed:**

1. **Add Response Types:**
```typescript
interface DashboardStats {
  totalRevenue: number
  activeSession: number
  pendingQuotes: number
  completedSessions: number
}
```

2. **Fix Event Handlers:**
```typescript
// Before: onChange={handleChange}
// After:
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target
  updateForm({ [name]: value })
}
```

3. **Fix Async Functions:**
```typescript
// Add proper return types for all async functions
async function fetchDashboard(): Promise<DashboardStats> {
  // ...
}
```

4. **Import Next.js Types:**
```typescript
import type { NextRequest } from 'next/server'
import type { Metadata } from 'next'
```

**File-by-File Priority:**

1. **Start with APIs** (routes.ts files) - Most critical
   - `src/app/api/workshop/signup/route.ts`
   - `src/app/api/workshop/dashboard/route.ts`
   - `src/app/api/workshop/invite-mechanic/route.ts`

2. **Then Pages** (page.tsx files)
   - `src/app/workshop/signup/page.tsx`
   - `src/app/workshop/dashboard/page.tsx`
   - `src/app/workshop/diagnostics/page.tsx`
   - `src/app/workshop/signup/success/page.tsx`

3. **Finally Components**
   - `src/components/workshop/WorkshopSignupSteps.tsx`
   - `src/components/workshop/InviteMechanicModal.tsx`

---

### Phase 2: Centralize Commission Rates (P1)

**Files to Fix:** 11 files (but 8 actual code changes)
**Estimated Time:** 2 hours
**Risk:** LOW (simple refactor)

**Steps:**

**Step 1: Create Config File**

Create `C:\Users\Faiz Hashmi\theautodoctor\src\config\workshopPricing.ts`:

```typescript
/**
 * Workshop Pricing Configuration
 *
 * Centralized configuration for all workshop-related fees and rates.
 * Changing values here will update across the entire application.
 *
 * IMPORTANT: These are default values. Future enhancement will allow
 * per-workshop rates stored in the database.
 */

export const WORKSHOP_PRICING = {
  /**
   * Default commission rate for workshops
   * Workshop receives this percentage of the session fee
   * Example: 10% means workshop gets $10 on a $100 session
   */
  DEFAULT_COMMISSION_RATE: 10.0,

  /**
   * Platform service fee (taken from customer payment)
   * Example: 15% means platform takes $15 on a $100 session
   */
  DEFAULT_PLATFORM_FEE_PERCENT: 15.0,

  /**
   * Maximum allowed commission rate
   * Prevents data entry errors
   */
  MAX_COMMISSION_RATE: 25.0,

  /**
   * Minimum allowed commission rate
   * Ensures workshops are compensated fairly
   */
  MIN_COMMISSION_RATE: 5.0,

  /**
   * Default revenue share for workshop settings page
   * This is the percentage workshop receives after platform fee
   */
  DEFAULT_REVENUE_SHARE_PERCENT: 15.0,

  /**
   * Calculate mechanic percentage from workshop commission
   * Total = 100% - Platform Fee - Workshop Commission
   */
  calculateMechanicRate: (commissionRate: number): number => {
    return 100 - WORKSHOP_PRICING.DEFAULT_PLATFORM_FEE_PERCENT - commissionRate
  },
} as const

/**
 * Validate commission rate is within acceptable bounds
 */
export function isValidCommissionRate(rate: number): boolean {
  return (
    rate >= WORKSHOP_PRICING.MIN_COMMISSION_RATE &&
    rate <= WORKSHOP_PRICING.MAX_COMMISSION_RATE
  )
}

/**
 * Get formatted commission rate for display
 */
export function formatCommissionRate(rate: number): string {
  return `${rate.toFixed(1)}%`
}
```

**Step 2: Update All Files**

**2a. Signup Page Form Default**
```typescript
// File: src/app/workshop/signup/page.tsx
import { WORKSHOP_PRICING } from '@/config/workshopPricing'

// Line 109: Change from:
commissionRate: 10.0,

// To:
commissionRate: WORKSHOP_PRICING.DEFAULT_COMMISSION_RATE,
```

**2b. Signup API Fallback**
```typescript
// File: src/app/api/workshop/signup/route.ts
import { WORKSHOP_PRICING } from '@/config/workshopPricing'

// Line 166: Change from:
commission_rate: commissionRate || 10.0,

// To:
commission_rate: commissionRate || WORKSHOP_PRICING.DEFAULT_COMMISSION_RATE,
```

**2c. Signup Success Page Display**
```typescript
// File: src/app/workshop/signup/success/page.tsx
import { WORKSHOP_PRICING, formatCommissionRate } from '@/config/workshopPricing'

// Line 163: Change from:
<p className="text-xs text-slate-400">10% commission on all mechanic sessions</p>

// To:
<p className="text-xs text-slate-400">
  {formatCommissionRate(WORKSHOP_PRICING.DEFAULT_COMMISSION_RATE)} commission on all mechanic sessions
</p>
```

**2d. Workshop Signup Steps Component**
```typescript
// File: src/components/workshop/WorkshopSignupSteps.tsx
import { WORKSHOP_PRICING, formatCommissionRate } from '@/config/workshopPricing'

// Line 108: Change from:
<li>• Earn 10% commission on all sessions</li>

// To:
<li>• Earn {formatCommissionRate(WORKSHOP_PRICING.DEFAULT_COMMISSION_RATE)} commission on all sessions</li>

// Line 359: Change from:
Your share of each session fee (Default: 10%)

// To:
Your share of each session fee (Default: {formatCommissionRate(WORKSHOP_PRICING.DEFAULT_COMMISSION_RATE)})

// Line 371: Change from:
Platform: 15% | Workshop: {formData.commissionRate}% | Mechanic: {85 - formData.commissionRate}%

// To:
Platform: {formatCommissionRate(WORKSHOP_PRICING.DEFAULT_PLATFORM_FEE_PERCENT)} |
Workshop: {formatCommissionRate(formData.commissionRate)} |
Mechanic: {formatCommissionRate(WORKSHOP_PRICING.calculateMechanicRate(formData.commissionRate))}
```

**2e. Workshop Settings Revenue Page**
```typescript
// File: src/app/workshop/settings/revenue/page.tsx
import { WORKSHOP_PRICING } from '@/config/workshopPricing'

// Line 37: Change from:
const [revenueShare, setRevenueShare] = useState(15) // Default 15%

// To:
const [revenueShare, setRevenueShare] = useState(WORKSHOP_PRICING.DEFAULT_REVENUE_SHARE_PERCENT)
```

**2f. Update TypeScript Interface Comment**
```typescript
// File: src/app/workshop/signup/page.tsx
// Line 55: Change from:
commissionRate: number // Workshop's cut (default 10%)

// To:
commissionRate: number // Workshop's cut (default from config)
```

**Step 3: Verification**

```bash
# Search for remaining hardcoded rates (should only find config file and OCPA 10% rule)
grep -rn "10\.0\|10%" src/app/workshop src/components/workshop src/app/api/workshop | grep -v "workshopPricing" | grep -v "WORKSHOP_PRICING" | grep -v "exceeding estimate by 10%"

# Expected: Only the OCPA compliance mention in agreement page
```

---

### Phase 3: Resolve TODO Items (P1-P2)

**High Priority TODOs (Implement in Batch 3):**

**3a. Email Service Setup**

First, choose email provider (recommendation: **Resend** for simplicity):

```bash
npm install resend
```

Create email service:

```typescript
// File: src/lib/email/workshopEmails.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface WorkshopSignupEmailData {
  workshopName: string
  contactName: string
  email: string
  slug: string
}

/**
 * Send confirmation email to workshop after signup
 */
export async function sendWorkshopConfirmationEmail(data: WorkshopSignupEmailData) {
  try {
    await resend.emails.send({
      from: 'TheAutoDoctor <onboarding@theautodoctor.ca>',
      to: data.email,
      subject: `Welcome to TheAutoDoctor - Application Received`,
      html: `
        <h1>Welcome to TheAutoDoctor, ${data.workshopName}!</h1>
        <p>Dear ${data.contactName},</p>
        <p>Thank you for applying to join TheAutoDoctor's workshop network.</p>
        <p><strong>Your Application Status:</strong> Under Review</p>
        <p>Our team will review your application within 2-3 business days. You'll receive an email once your workshop is approved.</p>
        <p><strong>What's Next?</strong></p>
        <ul>
          <li>We'll verify your business registration and credentials</li>
          <li>Once approved, you'll receive login instructions</li>
          <li>You can then invite mechanics and start accepting diagnostic sessions</li>
        </ul>
        <p>If you have questions, reply to this email or contact support@theautodoctor.ca</p>
        <p>Best regards,<br>The TheAutoDoctor Team</p>
      `,
    })
    console.log('[EMAIL] Workshop confirmation sent to:', data.email)
  } catch (error) {
    console.error('[EMAIL] Failed to send workshop confirmation:', error)
    // Don't throw - email failure shouldn't block signup
  }
}

/**
 * Send notification to admin team about new workshop application
 */
export async function sendAdminWorkshopNotification(data: WorkshopSignupEmailData) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@theautodoctor.ca'

  try {
    await resend.emails.send({
      from: 'TheAutoDoctor System <system@theautodoctor.ca>',
      to: adminEmail,
      subject: `New Workshop Application: ${data.workshopName}`,
      html: `
        <h2>New Workshop Application Submitted</h2>
        <p><strong>Workshop:</strong> ${data.workshopName}</p>
        <p><strong>Contact:</strong> ${data.contactName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Slug:</strong> ${data.slug}</p>
        <p><a href="https://theautodoctor.ca/admin/workshops">Review Application →</a></p>
      `,
    })
    console.log('[EMAIL] Admin notification sent')
  } catch (error) {
    console.error('[EMAIL] Failed to send admin notification:', error)
  }
}

/**
 * Send notification to customer about new quote
 */
export async function sendQuoteNotificationEmail(data: {
  customerEmail: string
  customerName: string
  workshopName: string
  quoteId: string
}) {
  try {
    await resend.emails.send({
      from: 'TheAutoDoctor <quotes@theautodoctor.ca>',
      to: data.customerEmail,
      subject: `Your Repair Quote from ${data.workshopName}`,
      html: `
        <h1>Your Repair Quote is Ready</h1>
        <p>Hi ${data.customerName},</p>
        <p>${data.workshopName} has prepared a repair quote for your vehicle.</p>
        <p><strong><a href="https://theautodoctor.ca/customer/quotes/${data.quoteId}">View Your Quote →</a></strong></p>
        <p>You can review the detailed breakdown and accept or decline the quote from your dashboard.</p>
        <p>Best regards,<br>The TheAutoDoctor Team</p>
      `,
    })
    console.log('[EMAIL] Quote notification sent to:', data.customerEmail)
  } catch (error) {
    console.error('[EMAIL] Failed to send quote notification:', error)
  }
}
```

**3b. Update Signup Route to Send Emails**

```typescript
// File: src/app/api/workshop/signup/route.ts
import { sendWorkshopConfirmationEmail, sendAdminWorkshopNotification } from '@/lib/email/workshopEmails'

// Replace lines 238-239 with:
// Send confirmation email to workshop
await sendWorkshopConfirmationEmail({
  workshopName,
  contactName,
  email,
  slug: org.slug,
})

// Send notification to admin team for review
await sendAdminWorkshopNotification({
  workshopName,
  contactName,
  email,
  slug: org.slug,
})
```

**3c. Update Quote Creation to Send Email**

```typescript
// File: src/app/api/workshop/quotes/create/route.ts
import { sendQuoteNotificationEmail } from '@/lib/email/workshopEmails'

// After line 164, add:
// Send notification to customer about new quote
const { data: customer } = await supabaseAdmin
  .from('profiles')
  .select('email, full_name')
  .eq('id', session.customer_id)
  .single()

if (customer) {
  await sendQuoteNotificationEmail({
    customerEmail: customer.email,
    customerName: customer.full_name,
    workshopName: workshop.organizationName,
    quoteId: quote.id,
  })
}
```

**Medium Priority TODOs (Consider for Batch 3 or defer):**

4. **Dashboard revenue calculation** - Defer to separate analytics PR
5. **File upload implementation** - Defer (requires S3/Cloudinary setup)
6. **Customer ID fix** - Quick fix, include in Batch 3

**Quick Fix for Customer ID:**
```typescript
// File: src/app/workshop/quotes/create/[sessionId]/page.tsx
// Line 185: Change from:
customer_id: session?.customer_name, // TODO: Use actual customer ID

// To:
customer_id: session?.customer_id, // Use actual customer ID from session
```

**Low Priority TODOs (Defer to backlog):**
- Analytics revenue calculation
- Workshop ID comment cleanup (just delete the TODO)
- Customer name join (cosmetic improvement)

---

### Phase 4: Schema Validation (P2)

**⚠️ CRITICAL: SQL MIGRATION SAFETY**

**Pre-Migration Investigation:**

Run these queries in Supabase SQL Editor to understand current state:

```sql
-- Investigation Query 1: List all columns in organizations table
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Investigation Query 2: Check workshop records
SELECT
  id,
  name,
  slug,
  organization_type,
  commission_rate,
  mechanic_capacity,
  status,
  verification_status,
  created_at
FROM organizations
WHERE organization_type = 'workshop'
ORDER BY created_at DESC
LIMIT 5;

-- Investigation Query 3: Check if commission_rate column exists
SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'organizations'
    AND column_name = 'commission_rate'
    AND table_schema = 'public'
) AS commission_rate_exists;

-- Investigation Query 4: Check indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'organizations'
  AND schemaname = 'public'
ORDER BY indexname;

-- Investigation Query 5: Check foreign keys on organization_members
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'organization_members'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';
```

**Migration Guidelines:**

1. ✅ **NEVER** assume schema structure
2. ✅ **ALWAYS** use `IF NOT EXISTS` / `IF EXISTS`
3. ✅ **ALWAYS** make migrations idempotent
4. ✅ Introspect schema BEFORE writing migration
5. ✅ Test on staging/local first
6. ✅ Document what each migration does and why

**Example Safe Migration (Only if column is actually missing):**

```sql
-- Migration: Add missing workshop pricing columns
-- Date: 2025-11-01
-- Batch: 3 - Workshop Layer Remediation
-- Author: Security Team

-- Check and add commission_rate column if missing
DO $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations'
      AND column_name = 'commission_rate'
      AND table_schema = 'public'
  ) THEN
    -- Add column with default value
    ALTER TABLE organizations
    ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 10.0;

    COMMENT ON COLUMN organizations.commission_rate IS
      'Workshop commission rate as percentage (e.g., 10.0 = 10%)';

    RAISE NOTICE 'Added commission_rate column to organizations';
  ELSE
    RAISE NOTICE 'Column commission_rate already exists, skipping';
  END IF;
END $$;

-- Add index on organization_type for faster workshop queries
CREATE INDEX IF NOT EXISTS idx_organizations_type
ON organizations(organization_type);

-- Add composite index for workshop status queries
CREATE INDEX IF NOT EXISTS idx_organizations_workshop_status
ON organizations(organization_type, status, verification_status)
WHERE organization_type = 'workshop';

-- Add index on slug for workshop profile lookups
CREATE INDEX IF NOT EXISTS idx_organizations_slug
ON organizations(slug);
```

**Verification After Migration:**

```sql
-- Verify column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name = 'commission_rate';

-- Verify indexes created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'organizations'
  AND indexname LIKE 'idx_organizations%';

-- Test query performance
EXPLAIN ANALYZE
SELECT * FROM organizations
WHERE organization_type = 'workshop'
  AND status = 'approved';
```

---

## 4. Testing & Verification Plan

### 4.1 Pre-Implementation Tests

**Baseline Checks:**

```bash
# 1. Type check current state (expect errors)
cd "C:\Users\Faiz Hashmi\theautodoctor"
npm run typecheck 2>&1 | tee baseline-typecheck.log
grep -c "error" baseline-typecheck.log # Record baseline error count

# 2. Build current state (should succeed despite @ts-nocheck)
npm run build

# 3. List all @ts-nocheck files
grep -r "@ts-nocheck" src/app/workshop src/components/workshop src/app/api/workshop | tee baseline-ts-nocheck.log

# 4. List all hardcoded rates
grep -rn "10\.0\|0\.10\|15%\|0\.15\|15\.0" src/app/workshop src/components/workshop src/app/api/workshop | tee baseline-hardcoded-rates.log

# 5. Count TODO items
grep -rn "TODO" src/app/workshop src/components/workshop src/app/api/workshop | wc -l
```

**Create Test Workshop Account:**

```sql
-- Create test workshop for manual testing
INSERT INTO organizations (
  organization_type,
  name,
  slug,
  email,
  phone,
  status,
  verification_status,
  commission_rate
) VALUES (
  'workshop',
  'Test Workshop (Batch 3 Testing)',
  'test-workshop-batch3',
  'test-workshop@example.com',
  '555-0123',
  'approved',
  'verified',
  10.0
) RETURNING id;
```

### 4.2 Post-Implementation Tests

#### Phase 1 Tests: Type Safety Restored

**Test 1.1: No @ts-nocheck Remaining**
```bash
grep -r "@ts-nocheck" src/app/workshop src/components/workshop src/app/api/workshop
# Expected: 0 matches (command should return nothing)
```

**Test 1.2: TypeScript Compilation Succeeds**
```bash
npm run typecheck
# Expected: No errors in workshop files (or only known acceptable errors)
```

**Test 1.3: Build Succeeds**
```bash
npm run build
# Expected: Build completes successfully
# Check for any new warnings related to workshop files
```

**Test 1.4: No New `any` Types Introduced**
```bash
# Search for 'any' types in workshop files (should be minimal)
grep -rn ": any\|any\[\]\|<any>" src/app/workshop src/components/workshop src/app/api/workshop
# Review each match - should only be in edge cases
```

#### Phase 2 Tests: Centralized Configuration

**Test 2.1: Config File Created**
```bash
test -f "C:\Users\Faiz Hashmi\theautodoctor\src\config\workshopPricing.ts" && echo "✅ Config file exists" || echo "❌ Config file missing"
```

**Test 2.2: No Hardcoded Rates (Except Config)**
```bash
# Search for hardcoded rates (exclude config file and OCPA rule)
grep -rn "10\.0\|10%\|15\.0\|15%" src/app/workshop src/components/workshop src/app/api/workshop \
  | grep -v "workshopPricing" \
  | grep -v "WORKSHOP_PRICING" \
  | grep -v "exceeding estimate by 10%" \
  | grep -v "config/"
# Expected: 0 matches
```

**Test 2.3: Config Imports Used**
```bash
# Count imports of WORKSHOP_PRICING
grep -r "WORKSHOP_PRICING" src/app/workshop src/components/workshop src/app/api/workshop | wc -l
# Expected: At least 8 imports (one per file that uses rates)
```

**Test 2.4: Config Values Accurate**
```typescript
// Manual verification: Open src/config/workshopPricing.ts
// Verify:
// - DEFAULT_COMMISSION_RATE: 10.0
// - DEFAULT_PLATFORM_FEE_PERCENT: 15.0
// - MIN_COMMISSION_RATE: 5.0
// - MAX_COMMISSION_RATE: 25.0
```

#### Phase 3 Tests: Email Functionality

**Test 3.1: Email Service Module Created**
```bash
test -f "C:\Users\Faiz Hashmi\theautodoctor\src\lib\email\workshopEmails.ts" && echo "✅ Email module exists" || echo "❌ Email module missing"
```

**Test 3.2: Environment Variables Set**
```bash
# Check .env.local for RESEND_API_KEY
grep "RESEND_API_KEY" .env.local
# Expected: RESEND_API_KEY=re_xxxxx

grep "ADMIN_EMAIL" .env.local
# Expected: ADMIN_EMAIL=admin@theautodoctor.ca
```

**Test 3.3: Workshop Signup Email Sent**
```bash
# Manual test:
# 1. Go to http://localhost:3000/workshop/signup
# 2. Fill out all 4 steps with valid data
# 3. Submit application
# 4. Check email inbox (or Resend dashboard logs)
# Expected: Confirmation email received
# Expected: Admin notification received
```

**Test 3.4: Quote Notification Email Sent**
```bash
# Manual test:
# 1. Login as workshop admin
# 2. Complete a diagnostic session
# 3. Create a quote for the session
# 4. Check customer's email inbox
# Expected: Quote notification email received
```

**Test 3.5: TODOs Resolved**
```bash
# Search for the specific TODOs we addressed
grep -n "TODO: Send confirmation email to workshop" src/app/api/workshop/signup/route.ts
# Expected: No match (TODO should be replaced with actual code)

grep -n "TODO: Send notification to customer about new quote" src/app/api/workshop/quotes/create/route.ts
# Expected: No match
```

#### Phase 4 Tests: Schema Validation

**Test 4.1: Schema Introspection Complete**
```sql
-- Verify all investigation queries run successfully
-- (Run the 5 queries from Phase 4)
```

**Test 4.2: Migration Applied (If Needed)**
```sql
-- If migration was created, verify it applied
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name = 'commission_rate';
-- Expected: 1 row returned
```

**Test 4.3: Indexes Created**
```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'organizations'
  AND indexname LIKE 'idx_organizations%';
-- Expected: At least 3 indexes
```

### 4.3 Functional Verification Tests

#### Test F1: Workshop Signup Flow (End-to-End)

```bash
# Manual Test Procedure:
# 1. Navigate to http://localhost:3000/workshop/signup
# 2. Complete Step 1 (Basic Info):
#    - Workshop Name: "Test Auto Shop"
#    - Contact: "John Doe"
#    - Email: "john@testautoshop.com"
#    - Phone: "555-1234"
#    - Password: "TestPass123!"
# 3. Complete Step 2 (Business Details):
#    - Registration #: "BN123456789"
#    - Tax ID: "123456789RT0001"
#    - Industry: "Independent Auto Repair Shop"
# 4. Complete Step 3 (Coverage):
#    - Address: "123 Main St"
#    - City: "Toronto"
#    - Province: "Ontario"
#    - Postal: "M5H 2N2"
#    - Coverage: "M5H"
# 5. Complete Step 4 (Review):
#    - Verify commission shows from config (10%)
#    - Accept terms
# 6. Submit

# Expected Results:
# ✅ Success page shows
# ✅ Commission rate displays correctly (from config)
# ✅ Email sent to workshop (check inbox or Resend logs)
# ✅ Email sent to admin
# ✅ Organization created in database
# ✅ No TypeScript errors in console
```

**Verification Queries:**
```sql
-- Check organization created
SELECT * FROM organizations
WHERE email = 'john@testautoshop.com'
ORDER BY created_at DESC
LIMIT 1;

-- Verify commission_rate stored correctly
SELECT id, name, commission_rate, status, verification_status
FROM organizations
WHERE email = 'john@testautoshop.com';
-- Expected: commission_rate = 10.00

-- Check organization_members created
SELECT om.*, p.full_name
FROM organization_members om
JOIN profiles p ON p.id = om.user_id
WHERE om.organization_id = (
  SELECT id FROM organizations
  WHERE email = 'john@testautoshop.com'
);
-- Expected: 1 member with role='owner'
```

#### Test F2: Workshop Dashboard Access

```bash
# Manual Test:
# 1. Login as workshop admin (use test account)
# 2. Navigate to /workshop/dashboard
# 3. Verify dashboard loads without errors
# Expected:
# ✅ Dashboard displays metrics
# ✅ No console errors
# ✅ TypeScript types are respected
```

#### Test F3: Quote Creation Flow

```bash
# Manual Test:
# 1. Login as workshop admin
# 2. Go to diagnostic sessions
# 3. Select a completed session
# 4. Click "Create Quote"
# 5. Fill out quote form:
#    - Labor: $500
#    - Parts: $300
#    - Notes: "Test quote"
# 6. Submit quote
# Expected:
# ✅ Quote created successfully
# ✅ Customer receives email notification
# ✅ Commission calculated using config values
# ✅ No TypeScript errors
```

**Verification:**
```sql
-- Check quote created
SELECT * FROM repair_quotes
ORDER BY created_at DESC
LIMIT 1;

-- Verify fee calculations
SELECT
  id,
  subtotal,
  platform_fee_percent,
  platform_fee_amount,
  customer_total,
  provider_receives
FROM repair_quotes
ORDER BY created_at DESC
LIMIT 1;
-- Verify platform_fee_percent matches config
```

#### Test F4: Commission Rate Configuration

```bash
# Manual Test:
# 1. Update config: Change DEFAULT_COMMISSION_RATE to 12.0
# 2. Restart dev server
# 3. Open signup page
# 4. Verify Step 4 shows 12% as default
# 5. Change back to 10.0
# Expected:
# ✅ Config change immediately reflected
# ✅ No hardcoded values still showing 10%
```

#### Test F5: Type Safety Verification

```bash
# Test 1: Try to pass invalid data types
# Edit signup/page.tsx and try:
# commissionRate: "not a number" // Should show TypeScript error

# Test 2: Try to access non-existent properties
# updateForm({ nonExistentField: 'value' }) // Should show TS error

# Test 3: Try to call API with wrong payload
# fetch('/api/workshop/signup', {
#   body: JSON.stringify({ wrong: 'data' })
# }) // Should show TS error

# Expected:
# ✅ TypeScript catches all type errors at compile time
# ✅ VS Code shows red squiggles for invalid code
# ✅ npm run typecheck fails on type errors
```

### 4.4 Performance Tests

```bash
# Test P1: Page Load Time
# Use Chrome DevTools to measure:
# - /workshop/signup load time
# - /workshop/dashboard load time
# Expected: < 2 seconds

# Test P2: API Response Time
# Use Network tab to measure:
# - POST /api/workshop/signup
# - GET /api/workshop/dashboard
# Expected: < 500ms

# Test P3: Database Query Performance
```

```sql
-- Test workshop queries with EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM organizations
WHERE organization_type = 'workshop'
  AND status = 'approved'
ORDER BY created_at DESC
LIMIT 10;
-- Expected: Uses index, execution time < 10ms
```

### 4.5 Regression Tests

**Test R1: Existing Workshops Not Affected**
```sql
-- Verify all existing workshop records still valid
SELECT COUNT(*) as total_workshops
FROM organizations
WHERE organization_type = 'workshop';

-- Check for any NULL commission_rates (should have default)
SELECT COUNT(*) as workshops_without_commission
FROM organizations
WHERE organization_type = 'workshop'
  AND commission_rate IS NULL;
-- Expected: 0
```

**Test R2: Other User Flows Still Work**
```bash
# Manual tests:
# 1. Customer signup - should still work
# 2. Customer dashboard - should still work
# 3. Admin dashboard - should still work
# Expected: No regressions
```

**Test R3: Mechanic Flows Still Work**
```bash
# Manual test:
# 1. Mechanic signup
# 2. Mechanic dashboard
# 3. Mechanic accepting session
# Expected: No impact from workshop changes
```

---

## 5. Rollback / Safety Plan

### Rollback Triggers

Immediately rollback if:
- ❌ TypeScript errors block build
- ❌ Runtime errors in workshop signup flow
- ❌ Data corruption in organizations table
- ❌ Commission calculations incorrect
- ❌ Email sending fails completely
- ❌ Dashboard doesn't load for existing workshops
- ❌ Critical functionality broken

Consider rollback if:
- ⚠️ Minor UI issues in workshop pages
- ⚠️ Some emails not sending (but signup still works)
- ⚠️ Performance degradation > 20%
- ⚠️ Multiple user reports of issues

### Rollback Procedures

#### **Quick Full Rollback**

```bash
# Step 1: Identify commit to revert
git log --oneline -10
# Find the merge commit for Batch 3

# Step 2: Revert the commit
git revert <commit-hash>

# Step 3: Push revert
git push origin main

# Step 4: Redeploy (Vercel will auto-deploy)
# Or manually trigger:
vercel --prod
```

#### **Partial Rollback (By Phase)**

**Rollback Phase 1 Only (Type Safety):**
```bash
# Re-add @ts-nocheck to problematic files
echo "// @ts-nocheck" | cat - "C:\Users\Faiz Hashmi\theautodoctor\src\app\workshop\signup\page.tsx" > temp && mv temp "C:\Users\Faiz Hashmi\theautodoctor\src\app\workshop\signup\page.tsx"

# Repeat for other files as needed
git add .
git commit -m "ROLLBACK: Re-add @ts-nocheck to workshop files"
git push origin main
```

**Rollback Phase 2 Only (Config Centralization):**
```bash
# Revert config changes
git checkout HEAD~1 -- "C:\Users\Faiz Hashmi\theautodoctor\src\config\workshopPricing.ts"
git checkout HEAD~1 -- "C:\Users\Faiz Hashmi\theautodoctor\src\app\workshop\signup\page.tsx"
git checkout HEAD~1 -- "C:\Users\Faiz Hashmi\theautodoctor\src\app\api\workshop\signup\route.ts"
# ... revert other files

git commit -m "ROLLBACK: Revert centralized pricing config"
git push origin main
```

**Rollback Phase 3 Only (Email):**
```bash
# Disable email sending by commenting out calls
# Or set environment variable:
echo "DISABLE_EMAILS=true" >> .env.production

# Redeploy
vercel --prod
```

**Rollback Phase 4 Only (Schema Changes):**
```sql
-- If migration added columns, optionally remove them:
-- (Only if safe - check dependencies first!)
ALTER TABLE organizations
DROP COLUMN IF EXISTS commission_rate;

-- If migration added indexes, remove them:
DROP INDEX IF EXISTS idx_organizations_type;
DROP INDEX IF EXISTS idx_organizations_workshop_status;
DROP INDEX IF EXISTS idx_organizations_slug;
```

#### **Emergency Hotfix Procedures**

**Scenario 1: TypeScript Errors Block Build**

```bash
# Quick fix: Add @ts-nocheck back to failing files temporarily
# Then create proper fix in separate PR

# Create hotfix branch
git checkout -b hotfix/batch3-ts-errors
echo "// @ts-nocheck" | cat - src/app/workshop/signup/page.tsx > temp && mv temp src/app/workshop/signup/page.tsx
git add .
git commit -m "HOTFIX: Re-add @ts-nocheck to signup page"
git push origin hotfix/batch3-ts-errors
```

**Scenario 2: Database Migration Fails**

```sql
-- Roll back migration manually
-- Check migration number:
SELECT * FROM _migrations
ORDER BY executed_at DESC
LIMIT 5;

-- If Supabase migration system used:
-- Contact Supabase support or manually revert
```

**Scenario 3: Email Service Down**

```bash
# Disable email temporarily
# Update code to catch and log errors without failing
export DISABLE_EMAILS=true
vercel --prod

# Or update .env.production in Vercel dashboard
```

### Monitoring After Deployment

**First 1 Hour:**
- ✅ Monitor Vercel logs for errors
- ✅ Check Sentry for exceptions (if configured)
- ✅ Test signup flow manually
- ✅ Verify emails are sending (check Resend dashboard)

**First 24 Hours:**
- ✅ Monitor workshop signup rate (should not drop)
- ✅ Check for error spikes in logs
- ✅ Verify commission calculations correct
- ✅ Test all workshop flows manually

**First Week:**
- ✅ Collect user feedback
- ✅ Monitor performance metrics
- ✅ Check database for data integrity
- ✅ Verify no regression reports

### Rollback Decision Matrix

| Issue | Severity | Action | Timeline |
|-------|----------|--------|----------|
| Build fails | CRITICAL | Immediate rollback | 5 minutes |
| Runtime errors | CRITICAL | Immediate rollback | 10 minutes |
| Data corruption | CRITICAL | Rollback + DB restore | 15 minutes |
| Signup broken | HIGH | Rollback within 30 min | 30 minutes |
| Email not sending | MEDIUM | Hotfix within 2 hours | 2 hours |
| UI glitches | LOW | Fix in next PR | 1-2 days |
| Performance issues | MEDIUM | Investigate, fix if >20% | 4 hours |

---

## 6. Effort Estimates & Dependencies

### Time Estimates

| Phase | Task | Effort | Risk | Assignee |
|-------|------|--------|------|----------|
| **Phase 1** | Remove @ts-nocheck from 9 files | 3-4 hours | LOW | Backend/Frontend Dev |
| - | Fix TypeScript errors in APIs (3 files) | 1-2 hours | LOW | |
| - | Fix TypeScript errors in pages (4 files) | 1-2 hours | LOW | |
| - | Fix TypeScript errors in components (2 files) | 1 hour | LOW | |
| **Phase 2** | Create config file | 30 min | LOW | Backend Dev |
| - | Update 8 files to use config | 1.5 hours | LOW | |
| - | Test commission calculations | 30 min | LOW | |
| **Phase 3** | Set up email service (Resend) | 1 hour | MEDIUM | Backend Dev |
| - | Create email templates | 1 hour | LOW | |
| - | Implement workshop signup emails | 1 hour | MEDIUM | |
| - | Implement quote notification emails | 1 hour | MEDIUM | |
| - | Test email delivery | 1 hour | MEDIUM | |
| - | Fix customer ID issue (quick win) | 15 min | LOW | |
| **Phase 4** | Schema introspection (SQL queries) | 1 hour | LOW | Database Admin |
| - | Create migration (if needed) | 1 hour | MEDIUM | |
| - | Test migration on staging | 30 min | MEDIUM | |
| - | Apply migration to production | 15 min | HIGH | |
| **Testing** | Pre-implementation baseline tests | 30 min | LOW | QA |
| - | Post-implementation verification tests | 2 hours | LOW | QA |
| - | End-to-end functional tests | 2 hours | MEDIUM | QA |
| - | Performance tests | 1 hour | LOW | QA |
| - | Regression tests | 1 hour | LOW | QA |
| **Documentation** | Update developer docs | 1 hour | LOW | Tech Writer |
| - | Update API documentation | 30 min | LOW | |
| **Total** | | **22-26 hours** | **MEDIUM** | |

**Breakdown by Role:**
- Backend Developer: 10-12 hours
- Frontend Developer: 4-5 hours
- QA Engineer: 6-7 hours
- Database Admin: 1.5-2 hours
- Tech Writer: 1.5 hours

**Parallelization Opportunities:**
- Phase 1 and Phase 2 can be done simultaneously (different files)
- Phase 3 (email) can be done in parallel with Phase 4 (schema)
- Testing can begin as soon as each phase completes

**Realistic Timeline:**
- **With 2 developers:** 2-3 days
- **With 1 developer:** 4-5 days
- **Including testing and review:** Add 1-2 days

**Total Calendar Time:** 5-7 business days

### Dependencies

#### **Prerequisites (Must Complete First):**
- ✅ Batch 6 completed (auth guards unified) - **DONE**
- ✅ Access to Supabase admin panel
- ✅ Staging environment available for testing
- ✅ Email service account (Resend, SendGrid, or AWS SES)
- ✅ Admin approval for schema changes (if needed)

#### **Blockers (Could Delay Implementation):**
- ❌ Email service setup requires domain verification (can take 24-48 hours)
- ❌ Schema changes require DB admin approval and maintenance window
- ❌ Testing requires test workshop accounts and data
- ❌ Production deployment requires stakeholder approval

#### **Nice-to-Have (Can Proceed Without):**
- ⚪ Sentry or error tracking setup (for monitoring)
- ⚪ Analytics dashboard to track signup rates
- ⚪ Automated E2E tests (Playwright/Cypress)

### Follow-up Work (Future Batches/Sprints)

**Immediate Follow-ups (Next Sprint):**
1. **Admin UI for Rate Management**
   - Create `/admin/workshop-pricing` page
   - Allow per-workshop commission rate overrides
   - Audit log for rate changes
   - Estimated: 8 hours

2. **Enhanced Email Templates**
   - Use React Email for better templates
   - Add workshop branding to emails
   - Localization (French for Quebec)
   - Estimated: 6 hours

3. **File Upload Implementation**
   - Set up S3 or Cloudinary
   - Add file upload to diagnostic completion
   - Store file references in database
   - Estimated: 12 hours

**Medium-term Follow-ups (Next Month):**
4. **Dashboard Revenue Analytics**
   - Implement accurate revenue calculations
   - Add charts and graphs
   - Export to CSV functionality
   - Estimated: 16 hours

5. **Workshop Approval Workflow**
   - Admin dashboard for pending workshops
   - Approve/reject with comments
   - Automated background checks integration
   - Estimated: 20 hours

6. **Mechanic Capacity Management**
   - Auto-accept sessions based on capacity
   - Mechanic schedule management
   - Conflict detection
   - Estimated: 24 hours

**Long-term Follow-ups (Next Quarter):**
7. **Dynamic Pricing System**
   - Database-driven commission rates
   - Time-based pricing (surge pricing)
   - Geographic pricing variations
   - Estimated: 40 hours

8. **Workshop Performance Metrics**
   - Average response time
   - Customer satisfaction scores
   - Quote acceptance rates
   - Estimated: 32 hours

---

## 7. Risk Assessment

### High Risk Items

#### Risk H1: Removing @ts-nocheck May Expose Hidden Bugs
- **Impact:** Build failures, runtime errors
- **Probability:** MEDIUM
- **Mitigation:**
  - Fix type errors incrementally (one file at a time)
  - Test thoroughly after each file
  - Keep staging deployment for testing
  - Have rollback plan ready
- **Contingency:** Re-add @ts-nocheck temporarily, fix in separate PR

#### Risk H2: Commission Rate Changes Have Financial Impact
- **Impact:** Incorrect payouts, financial losses
- **Probability:** LOW (if tested properly)
- **Mitigation:**
  - Verify calculations in staging first
  - Test with real dollar amounts
  - Compare before/after calculations
  - Get stakeholder approval on config values
- **Contingency:** Immediate rollback if calculations wrong

#### Risk H3: Email Service Failures
- **Impact:** Workshops don't receive confirmation, poor UX
- **Probability:** MEDIUM (third-party dependency)
- **Mitigation:**
  - Use reliable email service (Resend recommended)
  - Implement retry logic
  - Log all email attempts
  - Don't fail signup if email fails (log and continue)
  - Add email status to admin dashboard
- **Contingency:** Manual email follow-up, investigate email service

### Medium Risk Items

#### Risk M1: Schema Migration Failures
- **Impact:** Database corruption, downtime
- **Probability:** LOW (if following safety rules)
- **Mitigation:**
  - Introspect schema BEFORE migration
  - Use idempotent migrations only
  - Test on staging first
  - Have database backup before migration
  - Use IF EXISTS / IF NOT EXISTS
- **Contingency:** Restore from backup, rollback migration

#### Risk M2: TODO Resolution Incomplete
- **Impact:** Features still incomplete, technical debt
- **Probability:** MEDIUM
- **Mitigation:**
  - Prioritize TODOs (HIGH first)
  - Document deferred TODOs
  - Set up follow-up tasks
  - Get stakeholder approval on priorities
- **Contingency:** Defer medium/low priority TODOs to future sprints

#### Risk M3: Performance Degradation
- **Impact:** Slower page loads, poor UX
- **Probability:** LOW
- **Mitigation:**
  - Add database indexes (Phase 4)
  - Test query performance with EXPLAIN ANALYZE
  - Monitor page load times
  - Use React.memo for components if needed
- **Contingency:** Add more indexes, optimize queries

### Low Risk Items

#### Risk L1: Config Centralization Breaks Existing Logic
- **Impact:** Minor UI inconsistencies
- **Probability:** VERY LOW (simple refactor)
- **Mitigation:**
  - Test all surfaces that display rates
  - Verify calculations still correct
  - Check both signup and dashboard
- **Contingency:** Quick hotfix to update values

#### Risk L2: Type Fixes Introduce Breaking Changes
- **Impact:** Minor runtime issues
- **Probability:** LOW (TypeScript is compile-time)
- **Mitigation:**
  - Review all type changes carefully
  - Test all code paths
  - Avoid using `as any` or `@ts-ignore`
- **Contingency:** Rollback specific file, re-fix properly

#### Risk L3: Email Templates Look Bad
- **Impact:** Unprofessional appearance, poor brand image
- **Probability:** MEDIUM
- **Mitigation:**
  - Use simple HTML templates initially
  - Get design review if possible
  - Test in multiple email clients
  - Plan follow-up for React Email
- **Contingency:** Improve templates in follow-up sprint

### Risk Mitigation Summary

| Risk ID | Risk | Mitigation | Owner |
|---------|------|------------|-------|
| H1 | Type errors block build | Incremental fixes, testing | Dev Lead |
| H2 | Commission calculations wrong | Staging tests, verification | Finance + Dev |
| H3 | Email service failures | Retry logic, logging | Backend Dev |
| M1 | Schema migration fails | Introspection, idempotent SQL | DBA |
| M2 | TODOs incomplete | Prioritization, documentation | Product Manager |
| M3 | Performance degradation | Indexes, monitoring | Backend Dev |

---

## 8. Implementation Checklist

### Pre-Implementation (Before Starting)

- [ ] Read this entire remediation plan
- [ ] Review SQL migration safety rules
- [ ] Backup production database (Supabase automatic backup)
- [ ] Set up staging environment (Vercel preview deployment)
- [ ] Run baseline tests (Section 4.1)
- [ ] Create implementation branch: `git checkout -b remediate/batch-3`
- [ ] Install dependencies: `npm install resend`
- [ ] Set up email service account (Resend.com)
- [ ] Configure environment variables in `.env.local`:
  - `RESEND_API_KEY=re_xxxxx`
  - `ADMIN_EMAIL=admin@theautodoctor.ca`
- [ ] Notify team of upcoming changes
- [ ] Schedule deployment window (low-traffic time)

### Phase 1: @ts-nocheck Removal

**API Files (Priority 1):**
- [ ] Remove @ts-nocheck from `src/app/api/workshop/signup/route.ts`
  - [ ] Fix type errors
  - [ ] Run `npm run typecheck`
  - [ ] Test signup API manually
  - [ ] Commit: `git commit -m "Fix: Remove @ts-nocheck from workshop signup API"`

- [ ] Remove @ts-nocheck from `src/app/api/workshop/dashboard/route.ts`
  - [ ] Fix type errors
  - [ ] Run `npm run typecheck`
  - [ ] Test dashboard API manually
  - [ ] Commit changes

- [ ] Remove @ts-nocheck from `src/app/api/workshop/invite-mechanic/route.ts`
  - [ ] Fix type errors
  - [ ] Run `npm run typecheck`
  - [ ] Test invite mechanic flow
  - [ ] Commit changes

**Page Files (Priority 2):**
- [ ] Remove @ts-nocheck from `src/app/workshop/signup/page.tsx`
  - [ ] Fix type errors
  - [ ] Run `npm run typecheck`
  - [ ] Test signup form in browser
  - [ ] Commit changes

- [ ] Remove @ts-nocheck from `src/app/workshop/dashboard/page.tsx`
  - [ ] Fix type errors
  - [ ] Run `npm run typecheck`
  - [ ] Test dashboard page in browser
  - [ ] Commit changes

- [ ] Remove @ts-nocheck from `src/app/workshop/diagnostics/page.tsx`
  - [ ] Fix type errors
  - [ ] Run `npm run typecheck`
  - [ ] Test diagnostics page
  - [ ] Commit changes

- [ ] Remove @ts-nocheck from `src/app/workshop/signup/success/page.tsx`
  - [ ] Fix type errors
  - [ ] Run `npm run typecheck`
  - [ ] Test success page
  - [ ] Commit changes

**Component Files (Priority 3):**
- [ ] Remove @ts-nocheck from `src/components/workshop/WorkshopSignupSteps.tsx`
  - [ ] Fix type errors
  - [ ] Run `npm run typecheck`
  - [ ] Test all 4 signup steps
  - [ ] Commit changes

- [ ] Remove @ts-nocheck from `src/components/workshop/InviteMechanicModal.tsx`
  - [ ] Fix type errors
  - [ ] Run `npm run typecheck`
  - [ ] Test modal functionality
  - [ ] Commit changes

**Phase 1 Verification:**
- [ ] Run full typecheck: `npm run typecheck`
- [ ] Run build: `npm run build`
- [ ] Verify no @ts-nocheck remaining: `grep -r "@ts-nocheck" src/app/workshop src/components/workshop src/app/api/workshop`
- [ ] Test all workshop flows manually
- [ ] Push Phase 1 changes: `git push origin remediate/batch-3`

### Phase 2: Config Centralization

- [ ] Create config file: `src/config/workshopPricing.ts`
  - [ ] Add all constants (see Phase 2 in Section 3)
  - [ ] Add helper functions
  - [ ] Add JSDoc comments
  - [ ] Commit: `git commit -m "Add: Centralized workshop pricing config"`

- [ ] Update `src/app/workshop/signup/page.tsx` (line 109)
  - [ ] Import WORKSHOP_PRICING
  - [ ] Replace hardcoded 10.0
  - [ ] Update interface comment (line 55)
  - [ ] Commit changes

- [ ] Update `src/app/api/workshop/signup/route.ts` (line 166)
  - [ ] Import WORKSHOP_PRICING
  - [ ] Replace hardcoded 10.0 fallback
  - [ ] Commit changes

- [ ] Update `src/app/workshop/signup/success/page.tsx` (line 163)
  - [ ] Import WORKSHOP_PRICING and formatCommissionRate
  - [ ] Replace hardcoded "10%" with dynamic value
  - [ ] Commit changes

- [ ] Update `src/components/workshop/WorkshopSignupSteps.tsx`
  - [ ] Import WORKSHOP_PRICING and formatCommissionRate
  - [ ] Update line 108 (marketing copy)
  - [ ] Update line 359 (help text)
  - [ ] Update line 371 (fee breakdown)
  - [ ] Commit changes

- [ ] Update `src/app/workshop/settings/revenue/page.tsx` (line 37)
  - [ ] Import WORKSHOP_PRICING
  - [ ] Replace useState(15) default
  - [ ] Commit changes

**Phase 2 Verification:**
- [ ] Search for hardcoded rates: `grep -rn "10\.0\|10%\|15\.0\|15%" src/app/workshop src/components/workshop src/app/api/workshop | grep -v "workshopPricing" | grep -v "WORKSHOP_PRICING" | grep -v "exceeding estimate"`
- [ ] Verify config imports: `grep -r "WORKSHOP_PRICING" src/app/workshop src/components/workshop src/app/api/workshop | wc -l`
- [ ] Test signup flow - verify 10% displays correctly
- [ ] Test commission rate input validation
- [ ] Push Phase 2 changes

### Phase 3: TODO Resolution

**Email Service Setup:**
- [ ] Sign up for Resend account (or chosen email service)
- [ ] Verify domain (theautodoctor.ca)
- [ ] Get API key
- [ ] Add to `.env.local`: `RESEND_API_KEY=re_xxxxx`
- [ ] Add to Vercel environment variables

**Email Module Creation:**
- [ ] Create directory: `mkdir -p src/lib/email`
- [ ] Create file: `src/lib/email/workshopEmails.ts`
- [ ] Implement `sendWorkshopConfirmationEmail` function
- [ ] Implement `sendAdminWorkshopNotification` function
- [ ] Implement `sendQuoteNotificationEmail` function
- [ ] Add error handling and logging
- [ ] Commit: `git commit -m "Add: Workshop email notification system"`

**Email Integration:**
- [ ] Update `src/app/api/workshop/signup/route.ts`
  - [ ] Import email functions
  - [ ] Replace TODO at line 238 with `sendWorkshopConfirmationEmail()`
  - [ ] Replace TODO at line 239 with `sendAdminWorkshopNotification()`
  - [ ] Add try-catch for email errors
  - [ ] Commit changes

- [ ] Update `src/app/api/workshop/quotes/create/route.ts`
  - [ ] Import email functions
  - [ ] Fetch customer data
  - [ ] Replace TODO at line 164 with `sendQuoteNotificationEmail()`
  - [ ] Add try-catch for email errors
  - [ ] Commit changes

**Quick Fixes:**
- [ ] Fix customer ID issue in `src/app/workshop/quotes/create/[sessionId]/page.tsx`
  - [ ] Line 185: Change from `customer_name` to `customer_id`
  - [ ] Commit: `git commit -m "Fix: Use actual customer_id instead of customer_name"`

- [ ] Remove obsolete TODO comment in `src/app/workshop/quotes/page.tsx` (line 81)
  - [ ] Delete TODO comment (auth already handled by guards)
  - [ ] Commit changes

**Phase 3 Verification:**
- [ ] Test workshop signup email delivery
- [ ] Test admin notification email delivery
- [ ] Test quote notification email delivery
- [ ] Check Resend dashboard for sent emails
- [ ] Verify email content displays correctly
- [ ] Test email error handling (disconnect internet)
- [ ] Verify TODOs removed: `grep -n "TODO: Send" src/app/api/workshop/signup/route.ts`
- [ ] Push Phase 3 changes

### Phase 4: Schema Validation

**Investigation:**
- [ ] Open Supabase SQL Editor
- [ ] Run Investigation Query 1 (organizations table structure)
- [ ] Run Investigation Query 2 (workshop records sample)
- [ ] Run Investigation Query 3 (commission_rate column exists)
- [ ] Run Investigation Query 4 (indexes check)
- [ ] Run Investigation Query 5 (foreign keys check)
- [ ] Document findings in a comment at top of migration file

**Migration Creation (Only if needed):**
- [ ] Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_batch3_workshop_schema.sql`
- [ ] Add comments explaining what and why
- [ ] Write idempotent SQL with IF EXISTS / IF NOT EXISTS
- [ ] Add commission_rate column if missing
- [ ] Add indexes for performance
- [ ] Test migration on local Supabase instance
- [ ] Commit: `git commit -m "Add: Batch 3 workshop schema migration"`

**Migration Testing:**
- [ ] Apply migration to staging database
- [ ] Verify column exists: Run verification query
- [ ] Verify indexes created: Run indexes query
- [ ] Test workshop signup on staging
- [ ] Test dashboard queries performance
- [ ] Check for any errors in Supabase logs

**Migration Production:**
- [ ] Schedule maintenance window (if needed)
- [ ] Notify users of potential brief downtime
- [ ] Backup database (Supabase automatic)
- [ ] Apply migration to production
- [ ] Verify migration applied successfully
- [ ] Test workshop signup immediately
- [ ] Monitor for errors

**Phase 4 Verification:**
- [ ] Confirm schema matches code expectations
- [ ] Verify indexes improve query performance
- [ ] Test all workshop database operations
- [ ] Push Phase 4 changes

### Testing (Post-Implementation)

**Automated Tests:**
- [ ] Run all tests: `npm run test`
- [ ] Run typecheck: `npm run typecheck`
- [ ] Run build: `npm run build`
- [ ] Run linter: `npm run lint`

**Manual Tests (Section 4.2-4.3):**
- [ ] Test F1: Workshop signup flow end-to-end
- [ ] Test F2: Workshop dashboard access
- [ ] Test F3: Quote creation flow
- [ ] Test F4: Commission rate configuration
- [ ] Test F5: Type safety verification

**Verification Tests:**
- [ ] No @ts-nocheck remaining (Test 1.1)
- [ ] TypeScript compilation succeeds (Test 1.2)
- [ ] Build succeeds (Test 1.3)
- [ ] No hardcoded rates except OCPA rule (Test 2.2)
- [ ] Config imports used everywhere (Test 2.3)
- [ ] Emails sending successfully (Tests 3.3, 3.4)
- [ ] TODOs resolved (Test 3.5)
- [ ] Schema validated (Tests 4.1-4.3)

**Regression Tests:**
- [ ] Existing workshops not affected (Test R1)
- [ ] Customer flows still work (Test R2)
- [ ] Mechanic flows still work (Test R3)

**Performance Tests:**
- [ ] Page load times acceptable (< 2s)
- [ ] API response times acceptable (< 500ms)
- [ ] Database queries optimized (< 10ms)

### Documentation

- [ ] Update workshop onboarding guide
  - [ ] Document new email notifications
  - [ ] Update commission rate information
  - [ ] Add troubleshooting section

- [ ] Update API documentation
  - [ ] Document email behavior
  - [ ] Update TypeScript types
  - [ ] Add examples with config usage

- [ ] Update developer setup guide
  - [ ] Add email service setup instructions
  - [ ] Document environment variables needed
  - [ ] Add testing instructions

- [ ] Create troubleshooting guide
  - [ ] Common email issues
  - [ ] Commission rate questions
  - [ ] Type error resolution

- [ ] Update README.md
  - [ ] Add workshop pricing config section
  - [ ] Document email service requirements

### Deployment

**Pre-Deployment:**
- [ ] Create pull request with full description
- [ ] Link to this remediation plan in PR
- [ ] Request code review from 2+ developers
- [ ] Get approval from security lead
- [ ] Get approval from product manager
- [ ] Schedule deployment for low-traffic window

**Staging Deployment:**
- [ ] Merge to staging branch
- [ ] Deploy to Vercel preview
- [ ] Run full test suite on staging
- [ ] Get QA sign-off
- [ ] Monitor staging for 24 hours

**Production Deployment:**
- [ ] Merge PR to main branch
- [ ] Vercel auto-deploys to production
- [ ] Monitor Vercel deployment logs
- [ ] Verify deployment successful
- [ ] Test signup immediately after deploy
- [ ] Test dashboard immediately after deploy

**Post-Deployment Monitoring:**

**First Hour:**
- [ ] Monitor Vercel logs for errors
- [ ] Check Sentry (if configured) for exceptions
- [ ] Test workshop signup manually
- [ ] Verify emails sending (check Resend dashboard)
- [ ] Check database for new workshop records

**First 24 Hours:**
- [ ] Monitor workshop signup rate (compare to baseline)
- [ ] Check for error spikes in logs
- [ ] Verify commission calculations correct in all new quotes
- [ ] Test all workshop flows manually (signup, dashboard, quotes)
- [ ] Respond to any user reports immediately

**First Week:**
- [ ] Collect user feedback from workshops
- [ ] Monitor performance metrics (page load times, API response times)
- [ ] Check database for data integrity issues
- [ ] Verify no regression reports
- [ ] Document any issues discovered

**First Month:**
- [ ] Review metrics: signup rate, email delivery rate, error rates
- [ ] Identify any follow-up improvements needed
- [ ] Plan next batch based on learnings
- [ ] Update remediation plan template with learnings

### Final Sign-off

- [ ] All checklist items completed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Team notified of completion
- [ ] Post-implementation review scheduled
- [ ] Mark Batch 3 as COMPLETE ✅

---

## 9. Documentation Updates

After Batch 3 implementation, the following documentation must be updated:

### Developer Documentation

**File: `docs/workshop/README.md`**
```markdown
# Workshop System

## Pricing Configuration

Workshop commission rates are centralized in `src/config/workshopPricing.ts`.

**Default Values:**
- Workshop Commission: 10%
- Platform Fee: 15%
- Minimum Commission: 5%
- Maximum Commission: 25%

**Changing Rates:**
To change default rates, edit `src/config/workshopPricing.ts`.
Future: Per-workshop rates will be configurable in admin UI.

## Email Notifications

The system sends automated emails for:
- Workshop signup confirmation
- Admin review notifications
- Quote ready notifications to customers

**Email Service:** Resend
**Configuration:** See `.env.local` for `RESEND_API_KEY`
```

**File: `docs/setup/environment.md`**
```markdown
# Environment Variables

## Required for Workshop Features

RESEND_API_KEY=re_xxxxxxxxxxxxx
ADMIN_EMAIL=admin@theautodoctor.ca

## Optional

DISABLE_EMAILS=false  # Set to true to disable email sending
```

**File: `docs/api/workshop.md`**
```markdown
# Workshop API Endpoints

## POST /api/workshop/signup

Creates new workshop application.

**Behavior:**
- Creates auth user
- Creates organization record
- Sends confirmation email to workshop
- Sends notification email to admin

**Commission Rate:**
- Default: 10% (from config)
- Can be customized during signup (5-25% range)
```

### User-Facing Documentation

**File: `public/docs/workshop-onboarding.pdf`**
- Update commission rate information
- Add email notification expectations
- Update signup process screenshots
- Add troubleshooting section for common issues

**File: Workshop FAQ**
```markdown
## What commission rate do workshops earn?

By default, workshops earn 10% commission on each mechanic session.
The platform fee is 15%, and the remaining 75% goes to the mechanic.

## Will I receive a confirmation email after signing up?

Yes! You'll receive a confirmation email immediately after submitting
your application. Our team reviews applications within 2-3 business days.

## How will I know when a customer receives my quote?

Customers receive an automatic email notification when you create a quote.
You can track quote status in your dashboard.
```

### API Documentation

**Update Swagger/OpenAPI specs** (if used):
```yaml
/api/workshop/signup:
  post:
    summary: Create workshop application
    requestBody:
      properties:
        commissionRate:
          type: number
          default: 10.0
          minimum: 5.0
          maximum: 25.0
          description: Workshop commission rate percentage
    responses:
      200:
        description: Application submitted, confirmation email sent
```

### Internal Documentation

**File: `CHANGELOG.md`**
```markdown
## [1.x.0] - 2025-11-XX

### Added
- Centralized workshop pricing configuration
- Automated email notifications for workshop signup
- Quote notification emails to customers
- Database indexes for workshop queries

### Fixed
- Removed @ts-nocheck from all workshop files
- TypeScript type safety restored
- Customer ID bug in quote creation

### Changed
- Commission rates now configurable via central config
- All hardcoded fees replaced with config values
```

**File: `docs/architecture/decisions/ADR-XXX-workshop-pricing.md`**
```markdown
# ADR XXX: Centralized Workshop Pricing Configuration

## Status: Accepted

## Context
Commission rates were hardcoded throughout the application,
making changes difficult and error-prone.

## Decision
Create centralized config at `src/config/workshopPricing.ts`
with all workshop-related pricing constants.

## Consequences
- Easy to change rates (single file)
- Consistent rates across all surfaces
- Future: Can be extended to database-driven rates
- Marketing/legal teams know where to find rate info
```

---

## 10. Success Criteria

### ✅ Must Have (Required for Batch 3 Approval)

**Type Safety:**
- [ ] All 9 `@ts-nocheck` directives removed
- [ ] `npm run typecheck` passes with zero errors in workshop files
- [ ] `npm run build` succeeds without warnings

**Configuration:**
- [ ] No hardcoded commission rates (except config file and OCPA 10% rule)
- [ ] All 8 files use `WORKSHOP_PRICING` config
- [ ] Config file has proper JSDoc comments

**Email Functionality:**
- [ ] Workshop signup confirmation email sends
- [ ] Admin notification email sends
- [ ] Quote notification email sends to customer
- [ ] Email failures logged but don't block operations

**Functional Requirements:**
- [ ] Workshop signup flow completes successfully
- [ ] Workshop dashboard loads without errors
- [ ] Quote creation works end-to-end
- [ ] Commission calculations accurate

**Data Integrity:**
- [ ] All workshop records have valid commission_rate
- [ ] Customer ID used (not customer_name) in quotes
- [ ] No database errors in workshop queries

**Testing:**
- [ ] All automated tests pass
- [ ] All manual verification tests pass (Section 4.2)
- [ ] All functional tests pass (Section 4.3)
- [ ] Regression tests show no issues

**Documentation:**
- [ ] Developer setup guide updated
- [ ] API documentation updated
- [ ] Troubleshooting guide created

### ✅ Should Have (Highly Desirable)

**Code Quality:**
- [ ] No `any` types except where truly necessary
- [ ] All functions have return types
- [ ] All interfaces properly documented
- [ ] Code follows project style guide

**Performance:**
- [ ] Database indexes added for workshop queries
- [ ] Query execution time < 10ms (with indexes)
- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms

**Testing:**
- [ ] Test coverage > 80% for new email module
- [ ] E2E tests added for signup flow (Playwright)
- [ ] Performance benchmarks documented

**User Experience:**
- [ ] Email templates professional and branded
- [ ] Error messages clear and helpful
- [ ] Loading states for async operations
- [ ] Success confirmations visible

**Medium Priority TODOs:**
- [ ] Dashboard revenue calculation implemented
- [ ] Diagnostic completion notification implemented

### ✅ Nice to Have (Future Enhancements)

**Advanced Features:**
- [ ] React Email templates (vs plain HTML)
- [ ] Email preview in development
- [ ] Email sending queue (vs immediate)
- [ ] Retry logic for failed emails

**Low Priority TODOs:**
- [ ] Analytics revenue calculation
- [ ] Customer name join in queries
- [ ] File upload for diagnostics

**Developer Experience:**
- [ ] Automated database schema tests
- [ ] Email sending mock in tests
- [ ] Storybook stories for workshop components
- [ ] API client library with proper types

**Monitoring:**
- [ ] Sentry error tracking
- [ ] Email delivery rate dashboard
- [ ] Workshop signup conversion funnel
- [ ] Performance monitoring dashboard

### Acceptance Criteria Summary

**For Security Lead Approval:**
- ✅ All P0 issues resolved (@ts-nocheck removed)
- ✅ All P1 critical issues resolved (emails sending)
- ✅ Type safety restored
- ✅ No security regressions

**For Engineering Manager Approval:**
- ✅ Code quality standards met
- ✅ All tests passing
- ✅ Documentation complete
- ✅ Performance acceptable

**For Product Owner Approval:**
- ✅ High-priority TODOs implemented
- ✅ Workshop signup flow functional
- ✅ Email notifications working
- ✅ User-facing documentation updated

### Definition of Done

Batch 3 is considered **DONE** when:

1. ✅ All "Must Have" criteria met
2. ✅ At least 80% of "Should Have" criteria met
3. ✅ Code reviewed and approved by 2+ developers
4. ✅ Tested on staging for 24+ hours without issues
5. ✅ Deployed to production successfully
6. ✅ Monitored for 1 week without major issues
7. ✅ All stakeholders have signed off
8. ✅ Documentation published and accessible
9. ✅ Follow-up tasks created for deferred items
10. ✅ Post-implementation review completed

---

## 11. Open Questions

### Technical Questions

**Q1: Email Service Selection**
- **Question:** Resend, SendGrid, AWS SES, or other?
- **Options:**
  - **Resend:** Simple API, good deliverability, $20/month for 50k emails
  - **SendGrid:** Enterprise features, complex pricing
  - **AWS SES:** Cheapest, requires AWS setup, good for high volume
- **Recommendation:** Start with Resend (simple, reliable)
- **Decision Needed By:** Before Phase 3 implementation
- **Decision Maker:** Backend Lead

**Q2: Email Template Technology**
- **Question:** Plain HTML, React Email, MJML, or other?
- **Options:**
  - **Plain HTML:** Simple, works everywhere, harder to maintain
  - **React Email:** Modern, component-based, requires build step
  - **MJML:** Responsive email framework, learning curve
- **Recommendation:** Start with plain HTML, migrate to React Email in follow-up
- **Decision Needed By:** Before Phase 3 implementation
- **Decision Maker:** Frontend Lead

**Q3: Schema Changes Required?**
- **Question:** Does commission_rate column actually exist?
- **Investigation:** Run introspection queries (Phase 4)
- **If Missing:** Create migration
- **If Exists:** Skip migration, add indexes only
- **Decision Needed By:** During Phase 4 investigation
- **Decision Maker:** Database Admin

**Q4: Per-Workshop Rate Customization**
- **Question:** Should workshops be able to set their own rates?
- **Business Impact:** More flexibility vs. complexity
- **Current:** Global default rate
- **Future:** Database-driven per-workshop rates with admin approval
- **Recommendation:** Defer to future sprint (not Batch 3)
- **Decision Needed By:** After Batch 3 (planning for next quarter)
- **Decision Maker:** Product Manager

### Process Questions

**Q5: Workshop Approval Process**
- **Question:** Fully automated, manual review, or hybrid?
- **Current:** All workshops set to "pending" status, require manual approval
- **Options:**
  - **Manual:** Admin reviews each application (current)
  - **Automated:** Auto-approve based on criteria
  - **Hybrid:** Auto-approve some, manual review others
- **Recommendation:** Keep manual for now, add admin dashboard for review
- **Decision Needed By:** Follow-up sprint planning
- **Decision Maker:** Product Manager + Legal

**Q6: Email Sending Failures**
- **Question:** What happens if email fails during signup?
- **Options:**
  - **Block signup:** User sees error, must retry
  - **Log and continue:** Signup succeeds, log failure, manual follow-up
  - **Retry queue:** Queue failed emails for retry
- **Recommendation:** Log and continue (don't block signup)
- **Implementation:** Log to database, admin can see failed emails
- **Decision Needed By:** Before Phase 3 implementation
- **Decision Maker:** Product Manager + Backend Lead

**Q7: Commission Rate Validation**
- **Question:** Should we enforce rate limits strictly?
- **Current:** Min 5%, Max 25%
- **Business Logic:**
  - Too low: Workshop not compensated fairly
  - Too high: Mechanic earnings too low
- **Enforcement:** Client-side + server-side validation
- **Override:** Should admins be able to override?
- **Recommendation:** Enforce strictly, admin override in future
- **Decision Needed By:** Before Phase 2 implementation
- **Decision Maker:** Product Manager

### Business Questions

**Q8: Rate Change Communication**
- **Question:** How do we notify existing workshops if default rate changes?
- **Scenario:** Platform changes default from 10% to 12%
- **Impact:** Existing workshops with 10% - do they stay at 10% or update?
- **Options:**
  - **Grandfather:** Keep existing at 10%
  - **Update all:** Update all to 12%
  - **Opt-in:** Let workshops choose
- **Recommendation:** Grandfather existing, new workshops get new rate
- **Decision Needed By:** Before deploying rate changes
- **Decision Maker:** Product Manager + Legal + Finance

**Q9: Geographic Rate Variations**
- **Question:** Should commission rates vary by province/region?
- **Example:** Higher rates in expensive cities (Toronto, Vancouver)?
- **Complexity:** HIGH (requires database-driven rates)
- **Business Value:** Competitive advantage in different markets
- **Recommendation:** Defer to future (after per-workshop rates)
- **Decision Needed By:** Q2 2026 planning
- **Decision Maker:** Product Manager + Finance

**Q10: Email Preferences**
- **Question:** Can workshops opt out of certain emails?
- **Legal:** Transactional emails (signup confirmation) can't be opted out
- **Marketing:** Future newsletters, promotions - need opt-out
- **Recommendation:** All current emails are transactional, no opt-out needed yet
- **Future:** Add email preferences when adding marketing emails
- **Decision Needed By:** Before marketing emails introduced
- **Decision Maker:** Product Manager + Legal

### Testing Questions

**Q11: Test Data Strategy**
- **Question:** Should we create seed data for testing?
- **Needed:** Test workshop accounts, test diagnostic sessions, test quotes
- **Options:**
  - **Manual:** Create test data manually
  - **Seed script:** Automated seed data generation
  - **Fixtures:** Jest/Playwright fixtures
- **Recommendation:** Create seed script for development
- **Decision Needed By:** Before testing phase
- **Decision Maker:** QA Lead

**Q12: E2E Test Coverage**
- **Question:** Do we need Playwright/Cypress tests for workshop flows?
- **Current:** Manual testing only
- **Value:** Automated regression tests, CI/CD integration
- **Cost:** Setup time, maintenance overhead
- **Recommendation:** Add E2E tests for critical flows (signup, quote creation)
- **Decision Needed By:** Post-Batch 3 (follow-up sprint)
- **Decision Maker:** QA Lead + Engineering Manager

---

## 12. References

### Internal Documentation
- **Batch 6 Plan:** `C:\Users\Faiz Hashmi\theautodoctor\notes\reports\remediation\batch-6-plan.md`
- **Project README:** `C:\Users\Faiz Hashmi\theautodoctor\README.md`
- **Database Schema:** Supabase Dashboard → Database → Tables

### External Resources
- **TypeScript Best Practices:** https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- **Next.js API Routes:** https://nextjs.org/docs/api-routes/introduction
- **Resend Documentation:** https://resend.com/docs
- **Supabase Auth:** https://supabase.com/docs/guides/auth
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/

### Tools & Services
- **Email Service:** Resend (https://resend.com)
- **Email Testing:** Resend Logs Dashboard
- **Error Tracking:** Sentry (if configured)
- **Deployment:** Vercel
- **Database:** Supabase (PostgreSQL)

### Code Standards
- **TypeScript Style Guide:** Follow project `.eslintrc.js`
- **Commit Message Format:** Conventional Commits
  - `feat:` New features
  - `fix:` Bug fixes
  - `refactor:` Code refactoring
  - `test:` Adding tests
  - `docs:` Documentation updates
- **Branch Naming:** `remediate/batch-3` for implementation
- **PR Template:** Use `.github/PULL_REQUEST_TEMPLATE.md`

### Related Issues/PRs
- **Batch 1:** (Customer layer remediation)
- **Batch 2:** (Mechanic layer remediation)
- **Batch 6:** (Auth guards unification) - **COMPLETED**
- **Future:** Admin rate management UI (planned)

---

## 13. Appendix

### Appendix A: Example TypeScript Fixes

**Example 1: API Route Type Safety**
```typescript
// ❌ BEFORE (@ts-nocheck)
export async function POST(req) {
  const body = await req.json()
  const { email, password } = body
  // ... no type checking
}

// ✅ AFTER
import type { NextRequest, NextResponse } from 'next/server'

interface SignupRequest {
  email: string
  password: string
  workshopName: string
  // ... other fields
}

interface SignupResponse {
  success: boolean
  organizationId?: string
  error?: string
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<SignupResponse>> {
  const body: SignupRequest = await req.json()
  const { email, password } = body

  // Type-safe code...

  return NextResponse.json({
    success: true,
    organizationId: 'abc123'
  })
}
```

**Example 2: React Component Type Safety**
```typescript
// ❌ BEFORE (@ts-nocheck)
export default function SignupPage() {
  const [formData, setFormData] = useState({})
  const handleSubmit = async (e) => {
    // ... no types
  }
}

// ✅ AFTER
import type { FormEvent, ChangeEvent } from 'react'

interface WorkshopSignupData {
  workshopName: string
  email: string
  // ... other fields
}

export default function SignupPage() {
  const [formData, setFormData] = useState<WorkshopSignupData>({
    workshopName: '',
    email: '',
    // ... initialize all fields
  })

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    // Type-safe code...
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
}
```

### Appendix B: Email Template Examples

**Workshop Confirmation Email:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welcome to TheAutoDoctor</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to TheAutoDoctor</h1>
    </div>
    <div class="content">
      <p>Dear {{contactName}},</p>
      <p>Thank you for applying to join TheAutoDoctor's workshop network.</p>
      <p><strong>Your Application Status:</strong> Under Review</p>
      <p>Our team will review your application within 2-3 business days.</p>
      <p><strong>What's Next?</strong></p>
      <ul>
        <li>We'll verify your business registration and credentials</li>
        <li>Once approved, you'll receive login instructions</li>
        <li>You can then invite mechanics and start accepting sessions</li>
      </ul>
      <p>If you have questions, reply to this email or contact support@theautodoctor.ca</p>
    </div>
    <div class="footer">
      <p>&copy; 2025 TheAutoDoctor. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
```

### Appendix C: Database Queries

**Query 1: Find workshops without commission rate**
```sql
SELECT id, name, email, commission_rate
FROM organizations
WHERE organization_type = 'workshop'
  AND commission_rate IS NULL;
```

**Query 2: Update missing commission rates**
```sql
UPDATE organizations
SET commission_rate = 10.0
WHERE organization_type = 'workshop'
  AND commission_rate IS NULL;
```

**Query 3: Audit all commission rates**
```sql
SELECT
  commission_rate,
  COUNT(*) as workshop_count,
  ARRAY_AGG(name) as workshop_names
FROM organizations
WHERE organization_type = 'workshop'
GROUP BY commission_rate
ORDER BY commission_rate;
```

**Query 4: Performance check**
```sql
EXPLAIN ANALYZE
SELECT
  o.id,
  o.name,
  o.commission_rate,
  COUNT(ds.id) as total_sessions,
  SUM(rq.provider_receives) as total_earnings
FROM organizations o
LEFT JOIN diagnostic_sessions ds ON ds.workshop_id = o.id
LEFT JOIN repair_quotes rq ON rq.workshop_id = o.id
WHERE o.organization_type = 'workshop'
GROUP BY o.id, o.name, o.commission_rate
ORDER BY total_earnings DESC
LIMIT 10;
```

### Appendix D: Testing Checklist Template

**Copy this for each test session:**

```markdown
# Batch 3 Test Session

**Date:** _____________
**Tester:** _____________
**Environment:** [ ] Local [ ] Staging [ ] Production
**Browser:** _____________

## Signup Flow Test
- [ ] Navigate to /workshop/signup
- [ ] Complete Step 1 (Basic Info)
- [ ] Complete Step 2 (Business Details)
- [ ] Complete Step 3 (Coverage)
- [ ] Complete Step 4 (Review)
- [ ] Verify commission rate displays from config
- [ ] Submit application
- [ ] Verify success page shows
- [ ] Check email received (confirmation)
- [ ] Check admin email received (notification)
- [ ] Verify database record created

**Issues Found:**
-

## Dashboard Test
- [ ] Login as workshop admin
- [ ] Navigate to /workshop/dashboard
- [ ] Verify metrics display
- [ ] Verify no console errors
- [ ] Check TypeScript types respected

**Issues Found:**
-

## Quote Creation Test
- [ ] Select completed diagnostic session
- [ ] Create quote with sample data
- [ ] Submit quote
- [ ] Verify customer email sent
- [ ] Verify commission calculated correctly
- [ ] Check quote in database

**Issues Found:**
-

## Overall Assessment
- [ ] PASS - All tests successful
- [ ] FAIL - Issues found (see above)

**Notes:**
-
```

---

**Plan Status:** ✅ COMPLETE — Ready for Review

**Next Steps:**
1. Review plan with team
2. Obtain approval from stakeholders:
   - Security Lead
   - Engineering Manager
   - Product Owner
3. Create implementation branch: `git checkout -b remediate/batch-3`
4. Begin Phase 1 (@ts-nocheck removal)
5. Follow checklist in Section 8

**Estimated Start Date:** TBD (pending approval)
**Estimated Completion Date:** 5-7 business days after start

---

**Approval Required From:**
- [ ] Security Lead — Approved by: _________________ Date: _________
- [ ] Engineering Manager — Approved by: _________________ Date: _________
- [ ] Product Owner — Approved by: _________________ Date: _________
- [ ] Database Admin (for Phase 4) — Approved by: _________________ Date: _________

---

**Plan Created:** 2025-11-01
**Created By:** Claude Code (Anthropic)
**Plan Version:** 1.0
**Review Status:** Pending
**Implementation Status:** Not Started

---

*This plan is a living document. Update as implementation progresses.*
