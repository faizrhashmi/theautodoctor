# Contact Information Privacy Audit & Remediation Plan

**Business Context**: AskAutoDoctor is a marketplace platform connecting customers with mechanics/workshops. To protect platform revenue and prevent disintermediation, contact information (phone/email) must NEVER be shared between parties.

**Date**: 2025-11-08
**Status**: 🚨 CRITICAL - Active Privacy Violations Found

---

## Executive Summary

### ✅ What's Working
- Phone collection at signup (required field) ✓
- Phone used for platform notifications ✓
- Session API ([sessions/[id]/route.ts:104-110](src/app/api/sessions/[id]/route.ts#L104-L110)) has privacy comments

### 🚨 CRITICAL PRIVACY VIOLATIONS

| # | Violation | Location | Impact | Severity |
|---|-----------|----------|--------|----------|
| 1 | **Mechanics see customer phone** | [VirtualSessionCard.tsx:142-144](src/components/mechanic/VirtualSessionCard.tsx#L142-L144) | Mechanics can bypass platform | 🔴 CRITICAL |
| 2 | **Mechanics API exposes customer phone** | [mechanics/sessions/virtual/route.ts:74,96](src/app/api/mechanics/sessions/virtual/route.ts#L74) | Backend leaks customer contact | 🔴 CRITICAL |
| 3 | **Workshops see customer phone** | [workshop/diagnostics/route.ts:62,96](src/app/api/workshop/diagnostics/route.ts#L62) | Workshops can bypass platform | 🔴 CRITICAL |
| 4 | **Workshop quotes page shows phone** | [workshop/quotes/create/page.tsx:265](src/app/workshop/quotes/create/[sessionId]/page.tsx#L265) | Direct customer contact exposed | 🔴 CRITICAL |
| 5 | **Customer email exposed to mechanics** | [mechanics/sessions/virtual/route.ts:95](src/app/api/mechanics/sessions/virtual/route.ts#L95) | Email bypass risk | 🟡 HIGH |
| 6 | **Workshop diagnostics shows email** | [workshop/diagnostics/route.ts:95](src/app/api/workshop/diagnostics/route.ts#L95) | Email bypass risk | 🟡 HIGH |

---

## Detailed Findings

### 1. Mechanic Virtual Sessions API
**File**: [src/app/api/mechanics/sessions/virtual/route.ts](src/app/api/mechanics/sessions/virtual/route.ts)

**Issue (Lines 70-76)**:
```typescript
profiles!diagnostic_sessions_customer_id_fkey (
  id,
  full_name,
  email,      // ❌ EXPOSED
  phone       // ❌ EXPOSED
)
```

**Issue (Lines 91-96)**:
```typescript
customer_name: s.profiles?.full_name || 'Unknown',
customer_email: s.profiles?.email,     // ❌ EXPOSED TO MECHANIC
customer_phone: s.profiles?.phone,     // ❌ EXPOSED TO MECHANIC
```

**Impact**: Mechanic can contact customer directly, bypass platform for follow-up work.

---

### 2. Mechanic Virtual Session Card UI
**File**: [src/components/mechanic/VirtualSessionCard.tsx](src/components/mechanic/VirtualSessionCard.tsx)

**Issue (Lines 12, 142-146)**:
```typescript
interface VirtualSessionCardProps {
  session: {
    customer_phone?: string  // ❌ TYPE ALLOWS IT
  }
}

// UI Display:
{session.customer_phone && (
  <div className="text-sm text-gray-600">
    📞 {session.customer_phone}  // ❌ DISPLAYS TO MECHANIC
  </div>
)}
```

**Impact**: Mechanic sees customer phone number before accepting session.

---

### 3. Workshop Diagnostics API
**File**: [src/app/api/workshop/diagnostics/route.ts](src/app/api/workshop/diagnostics/route.ts)

**Issue (Lines 58-63, 94-96)**:
```typescript
profiles!diagnostic_sessions_customer_id_fkey (
  id,
  full_name,
  email,      // ❌ EXPOSED
  phone       // ❌ EXPOSED
)

// Transformed response:
customer_email: session.profiles?.email,   // ❌ EXPOSED TO WORKSHOP
customer_phone: session.profiles?.phone,   // ❌ EXPOSED TO WORKSHOP
```

**Impact**: Workshop can contact customer directly for quote follow-ups.

---

### 4. Workshop Quote Creation Page
**File**: [src/app/workshop/quotes/create/[sessionId]/page.tsx](src/app/workshop/quotes/create/[sessionId]/page.tsx)

**Issue (Line 21, 265)**:
```typescript
type Session = {
  customer_phone: string  // ❌ TYPE INCLUDES PHONE
}

// UI Display:
<p className="text-gray-900">{session.customer_phone}</p>  // ❌ SHOWS PHONE
```

**Impact**: Workshop sees customer phone when creating quotes.

---

### 5. Workshop Diagnostics Page
**File**: [src/app/workshop/diagnostics/page.tsx](src/app/workshop/diagnostics/page.tsx)

**Issue (Lines 29, 262-265)**:
```typescript
type DiagnosticSession = {
  customer_phone?: string  // ❌ TYPE ALLOWS IT
}

// UI Display:
{session.customer_phone && (
  <span>{session.customer_phone}</span>  // ❌ DISPLAYS PHONE
)}
```

---

## What Contact Info SHOULD Be Used For

### ✅ Legitimate Platform Uses (Keep These)

```typescript
// Platform → Customer communications
- SMS: Session starting in 10 minutes
- SMS: Payment receipt
- SMS: Mechanic assigned to your session
- Email: Session summary with invoice
- Email: Password reset / 2FA
- Email: Dispute resolution

// Platform → Mechanic/Workshop communications
- SMS: New session request available
- SMS: Customer rated your service
- Email: Weekly earnings summary
- Email: Account verification
```

### ❌ NEVER Share Between Users

```typescript
// Customer NEVER sees:
- Mechanic personal phone
- Mechanic personal email
- Workshop direct contact

// Mechanic/Workshop NEVER sees:
- Customer personal phone
- Customer personal email
```

---

## Remediation Plan

### Phase 1: Emergency Contact Info Removal (HIGH PRIORITY)

#### Task 1.1: Fix Mechanic Virtual Sessions API
**File**: `src/app/api/mechanics/sessions/virtual/route.ts`

**Changes**:
```typescript
// Line 70-76: Remove email/phone from SELECT
profiles!diagnostic_sessions_customer_id_fkey (
  id,
  full_name
  // ✅ REMOVED: email, phone
)

// Line 91-106: Remove from response transformation
const transformedSessions = sessions?.map(s => ({
  id: s.id,
  customer_id: s.customer_id,
  customer_name: s.profiles?.full_name || 'Unknown',
  // ✅ REMOVED: customer_email, customer_phone
  session_type: s.session_type,
  // ... rest of fields
}))
```

#### Task 1.2: Fix Workshop Diagnostics API
**File**: `src/app/api/workshop/diagnostics/route.ts`

**Changes**:
```typescript
// Line 58-63: Remove email/phone
profiles!diagnostic_sessions_customer_id_fkey (
  id,
  full_name
  // ✅ REMOVED: email, phone
)

// Line 91-111: Remove from formatted response
customer_name: session.profiles?.full_name || 'Unknown Customer',
// ✅ REMOVED: customer_email, customer_phone
```

#### Task 1.3: Fix VirtualSessionCard Component
**File**: `src/components/mechanic/VirtualSessionCard.tsx`

**Changes**:
```typescript
// Line 8-22: Remove from interface
interface VirtualSessionCardProps {
  session: {
    id: string
    customer_name: string
    // ✅ REMOVED: customer_email, customer_phone
    session_type: 'chat' | 'video' | 'upgraded_from_chat'
    // ... rest
  }
}

// Line 134-147: Remove phone display section entirely
// ✅ DELETE THIS BLOCK:
{session.customer_phone && (
  <div className="text-sm text-gray-600">
    📞 {session.customer_phone}
  </div>
)}
```

#### Task 1.4: Fix Workshop Quote Creation Page
**File**: `src/app/workshop/quotes/create/[sessionId]/page.tsx`

**Changes**:
```typescript
// Line 15-25: Remove from Session type
type Session = {
  id: string
  customer_name: string
  // ✅ REMOVED: customer_phone, customer_email
  // ... rest
}

// Line 265: Remove phone display
// ✅ DELETE: <p className="text-gray-900">{session.customer_phone}</p>
```

#### Task 1.5: Fix Workshop Diagnostics Page
**File**: `src/app/workshop/diagnostics/page.tsx`

**Changes**:
```typescript
// Line 24-32: Remove from type
type DiagnosticSession = {
  id: string
  customer_name: string
  // ✅ REMOVED: customer_phone, customer_email
  // ... rest
}

// Line 262-266: Remove phone display
// ✅ DELETE phone display block
```

---

### Phase 2: Database Security (MEDIUM PRIORITY)

#### Task 2.1: Create Row Level Security Policies

**New File**: `supabase/migrations/[timestamp]_contact_privacy_rls.sql`

```sql
-- Prevent mechanics from accessing customer contact info
CREATE POLICY "mechanics_no_customer_contact"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Mechanics can only see their own contact info, not customers'
  CASE
    WHEN auth.uid() IN (SELECT user_id FROM mechanics WHERE id = auth.uid())
    THEN id = auth.uid()
    ELSE true
  END
);

-- Prevent customers from accessing mechanic personal contact info
CREATE POLICY "customers_no_mechanic_contact"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Customers can only see their own contact info
  CASE
    WHEN (SELECT role FROM profiles WHERE id = auth.uid()) = 'customer'
    THEN id = auth.uid()
    ELSE true
  END
);
```

#### Task 2.2: Create Secure Views for Cross-User Data

```sql
-- View for mechanics to see customer info (without contact)
CREATE OR REPLACE VIEW mechanic_customer_sessions AS
SELECT
  ds.id,
  ds.customer_id,
  p.full_name as customer_name,
  -- ✅ NO email, NO phone
  ds.session_type,
  ds.status,
  ds.vehicle_info,
  ds.issue_description
FROM diagnostic_sessions ds
JOIN profiles p ON ds.customer_id = p.id;

-- View for customers to see mechanic info (without contact)
CREATE OR REPLACE VIEW customer_mechanic_sessions AS
SELECT
  s.id,
  s.mechanic_id,
  m.name as mechanic_name,
  -- ✅ NO email, NO phone
  s.status,
  s.type
FROM sessions s
JOIN mechanics m ON s.mechanic_id = m.id;
```

---

### Phase 3: TypeScript Type Safety (MEDIUM PRIORITY)

#### Task 3.1: Create Privacy-Safe Types

**New File**: `src/types/privacy.ts`

```typescript
/**
 * Privacy-safe types for cross-user data sharing
 * NEVER include phone/email in these types
 */

// What mechanics see about customers
export interface CustomerPublicProfile {
  id: string
  full_name: string
  // ✅ NO phone, NO email
}

// What customers see about mechanics
export interface MechanicPublicProfile {
  id: string
  name: string
  // ✅ NO phone, NO email
  certifications?: string[]
  rating?: number
}

// What workshops see about customers
export interface CustomerForWorkshop {
  id: string
  full_name: string
  // ✅ NO phone, NO email
}

// Private types (only for platform use)
export interface CustomerPrivateContact {
  id: string
  phone: string
  email: string
  // ⚠️ ONLY for platform notifications, NEVER share
}
```

#### Task 3.2: Update Existing Types

**File**: `src/types/supabase.ts` (or wherever session types are)

```typescript
// Before (WRONG):
export interface SessionForMechanic {
  customer_name: string
  customer_phone?: string  // ❌ REMOVE THIS
  customer_email?: string  // ❌ REMOVE THIS
}

// After (CORRECT):
export interface SessionForMechanic {
  customer_id: string
  customer_name: string
  // ✅ Contact info removed
}
```

---

### Phase 4: In-Platform Communication (LONG-TERM)

#### Task 4.1: Ensure Chat System is Used
- Verify real-time chat works in sessions ✓
- Ensure file sharing works ✓
- Log all messages for dispute resolution ✓

#### Task 4.2: Platform-Initiated Contact Only

**When platform should contact users**:

```typescript
// Platform sends SMS to customer:
- "Your session with ${mechanicName} starts in 10 min"
- "Payment of $XX processed for session with ${mechanicName}"

// Platform sends SMS to mechanic:
- "New session request from ${customerName}"
- "Customer rated your session 5 stars"

// NEVER: Give mechanic the customer's phone to call directly
// NEVER: Give customer the mechanic's phone to call directly
```

---

### Phase 5: Optional Post-Session Contact Exchange (FUTURE)

#### Task 5.1: Implement Opt-In Contact Sharing

**Only after session completed + payment received**:

```typescript
// New table: contact_sharing_requests
CREATE TABLE contact_sharing_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  requester_id UUID NOT NULL REFERENCES profiles(id),
  requester_type TEXT NOT NULL CHECK (requester_type IN ('customer', 'mechanic', 'workshop')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP,
  platform_notified BOOLEAN DEFAULT false
);

// Business logic:
// 1. Both parties must opt-in
// 2. Only available after session status = 'completed'
// 3. Platform logs the exchange
// 4. Show warning: "Transactions outside platform are not protected"
```

**UI Flow**:
```
Customer Session Completed Page:
┌─────────────────────────────────────────────┐
│ ✅ Session Completed                        │
│                                             │
│ Mechanic: John Smith ⭐⭐⭐⭐⭐             │
│                                             │
│ [ ] Share my contact info with mechanic    │
│     (for follow-up questions about my car) │
│                                             │
│ ⚠️  Warning: The platform cannot protect   │
│     transactions made outside our system   │
└─────────────────────────────────────────────┘
```

---

## Testing Checklist

### Phase 1 Testing (After Contact Info Removal)

- [ ] **Mechanic cannot see customer phone** in virtual session list
- [ ] **Mechanic cannot see customer email** in virtual session list
- [ ] **Workshop cannot see customer phone** in diagnostics list
- [ ] **Workshop cannot see customer email** in quote creation
- [ ] **Customer cannot see mechanic phone** in session view
- [ ] **Customer cannot see mechanic email** in session view
- [ ] **TypeScript compilation passes** (no type errors after field removal)
- [ ] **API responses validated** (use Postman/browser dev tools to check JSON)
- [ ] **Database queries tested** (check SQL queries don't return phone/email)

### Integration Testing

```bash
# Test as mechanic
1. Login as mechanic
2. Go to /mechanic/sessions/virtual
3. Inspect network tab → Check API response
4. ✅ Verify: customer_phone and customer_email are missing

# Test as workshop
1. Login as workshop
2. Go to /workshop/diagnostics
3. Inspect network tab → Check API response
4. ✅ Verify: customer_phone and customer_email are missing

# Test as customer
1. Login as customer
2. View active session
3. Inspect session details
4. ✅ Verify: Can see mechanic name but NOT phone/email
```

---

## Implementation Priority

### 🔴 **IMMEDIATE** (This Week)
- [ ] Task 1.1: Fix Mechanic Virtual Sessions API
- [ ] Task 1.2: Fix Workshop Diagnostics API
- [ ] Task 1.3: Fix VirtualSessionCard Component
- [ ] Task 1.4: Fix Workshop Quote Creation Page
- [ ] Task 1.5: Fix Workshop Diagnostics Page
- [ ] Phase 1 Testing

### 🟡 **HIGH** (Next 2 Weeks)
- [ ] Task 2.1: Create Row Level Security Policies
- [ ] Task 2.2: Create Secure Views
- [ ] Task 3.1: Create Privacy-Safe Types
- [ ] Task 3.2: Update Existing Types

### 🟢 **MEDIUM** (Next Month)
- [ ] Task 4.1: Audit In-Platform Chat System
- [ ] Task 4.2: Review Platform Notification Templates

### 🔵 **FUTURE** (Backlog)
- [ ] Task 5.1: Implement Opt-In Contact Sharing (if business decides this is needed)

---

## Estimated Impact

### Business Protection
- **Prevents**: Mechanics bypassing platform for repeat customers
- **Prevents**: Workshops poaching customers for direct quotes
- **Preserves**: Platform transaction fees (15-30% per session)
- **Protects**: Customer trust and platform reputation

### Technical Effort
- **Phase 1**: ~4-6 hours (high impact, immediate)
- **Phase 2**: ~6-8 hours (database security)
- **Phase 3**: ~3-4 hours (type safety)
- **Total**: ~13-18 hours for complete remediation

---

## Related Files to Audit

Files that MAY also expose contact info (need review):

```
✅ Already audited:
- src/app/api/mechanics/sessions/virtual/route.ts
- src/app/api/workshop/diagnostics/route.ts
- src/components/mechanic/VirtualSessionCard.tsx
- src/app/workshop/quotes/create/[sessionId]/page.tsx
- src/app/workshop/diagnostics/page.tsx

🔍 Need to check:
- src/app/api/workshop/jobs/route.ts (line 164: customerPhone)
- src/app/api/workshop/jobs/[id]/route.ts (line 184: customerPhone)
- src/app/api/admin/jobs/route.ts (admin should see contact info - OK)
- src/app/admin/(shell)/customers/[id]/page.tsx (admin view - OK)
- src/lib/rfq/notifications.ts (platform notifications - OK)
```

---

## Sign-Off

**Prepared by**: Claude (AI Assistant)
**Reviewed by**: ___________________
**Approved by**: ___________________
**Date**: 2025-11-08

**Next Action**: Start Phase 1 implementation immediately to protect marketplace revenue.
