# Unified Session Creation Architecture
**State-of-the-Art Solution for Free and Paid Sessions**

## Current Problem

**TWO different code paths for session creation:**
1. **FREE sessions** → Created in `/api/intake/start` (lines 239-355)
2. **PAID sessions** → Created in `fulfillCheckout()` function (line 207)

This leads to:
- Code duplication
- Inconsistent session creation logic
- Risk of bugs when one path is updated but not the other
- Harder to maintain and test

---

## Perfect Solution: Unified Session Factory

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Customer Submits Intake                   │
│                    (/api/intake/start)                      │
└───────────────┬──────────────────────┬──────────────────────┘
                │                      │
        ┌───────▼────────┐    ┌───────▼────────┐
        │  FREE Session  │    │  PAID Session  │
        │  (trial/free)  │    │  (all others)  │
        └───────┬────────┘    └───────┬────────┘
                │                      │
                │                      ▼
                │             ┌────────────────┐
                │             │ Create Stripe  │
                │             │ Checkout       │
                │             └───────┬────────┘
                │                     │
                │                     ▼
                │             ┌────────────────┐
                │             │ Customer Pays  │
                │             └───────┬────────┘
                │                     │
                │                     ▼
                │             ┌────────────────┐
                │             │ Stripe Webhook │
                │             │ (checkout.     │
                │             │  completed)    │
                │             └───────┬────────┘
                │                     │
                └──────────┬──────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │  UNIFIED SESSION      │
               │  CREATION FUNCTION    │
               │  createSessionRecord()│
               └───────────┬───────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌──────────────┐  ┌────────────────┐
│ Create        │  │ Create       │  │ Create         │
│ session       │  │ participant  │  │ assignment     │
│ record        │  │ record       │  │ (queued)       │
└───────────────┘  └──────────────┘  └────────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │ Log session_events    │
               │ (created)             │
               └───────────┬───────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │ Return session ID     │
               │ and redirect URL      │
               └───────────────────────┘
```

---

## Implementation Plan

### 1. Create Unified Session Factory (`src/lib/sessionFactory.ts`)

```typescript
/**
 * SINGLE SOURCE OF TRUTH for session creation
 * Used by both free and paid session flows
 */
export interface CreateSessionParams {
  // Customer info
  customerId: string
  customerEmail?: string

  // Session type and plan
  type: 'chat' | 'video' | 'diagnostic'
  plan: string

  // Intake data
  intakeId: string

  // Payment info
  stripeSessionId?: string | null
  paymentMethod: 'free' | 'stripe' | 'credits'
  amountPaid?: number | null

  // Additional metadata
  urgent?: boolean
  isSpecialist?: boolean
  preferredMechanicId?: string | null
  routingType?: 'broadcast' | 'workshop_only' | 'hybrid' | 'priority_broadcast'
}

export interface CreateSessionResult {
  sessionId: string
  sessionType: 'chat' | 'video' | 'diagnostic'
  status: 'pending'
  redirectUrl: string
}

export async function createSessionRecord(
  params: CreateSessionParams
): Promise<CreateSessionResult> {
  const {
    customerId,
    customerEmail,
    type,
    plan,
    intakeId,
    stripeSessionId,
    paymentMethod,
    amountPaid,
    urgent = false,
    isSpecialist = false,
    preferredMechanicId = null,
    routingType = 'broadcast'
  } = params

  // 1. Validate no active sessions exist (409 check)
  const activeSession = await checkActiveSession(customerId)
  if (activeSession) {
    throw new Error('ACTIVE_SESSION_EXISTS')
  }

  // 2. Create session record
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .insert({
      customer_user_id: customerId,
      type,
      status: 'pending',
      plan,
      intake_id: intakeId,
      stripe_session_id: stripeSessionId || null,
      metadata: {
        payment_method: paymentMethod,
        amount_paid: amountPaid,
        urgent,
        is_specialist: isSpecialist,
        preferred_mechanic_id: preferredMechanicId,
        routing_type: routingType,
        source: 'intake'
      }
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    throw new Error(`Failed to create session: ${sessionError?.message}`)
  }

  const sessionId = session.id

  // 3. Create session participant (customer)
  await supabaseAdmin
    .from('session_participants')
    .upsert({
      session_id: sessionId,
      user_id: customerId,
      role: 'customer'
    }, {
      onConflict: 'session_id,user_id'
    })

  // 4. Create session assignment (queued for mechanics)
  await supabaseAdmin
    .from('session_assignments')
    .insert({
      session_id: sessionId,
      status: 'queued',
      offered_at: new Date().toISOString(),
      // If preferred mechanic, add to metadata
      ...(preferredMechanicId && {
        metadata: { preferred_mechanic_id: preferredMechanicId }
      })
    })

  // 5. Log session creation event
  await supabaseAdmin
    .from('session_events')
    .insert({
      session_id: sessionId,
      event_type: 'created',
      user_id: customerId,
      metadata: {
        type,
        plan,
        payment_method: paymentMethod,
        amount_paid: amountPaid,
        urgent,
        source: 'intake'
      }
    })

  // 6. Determine redirect URL
  const redirectUrl = `/intake/waiver?session=${sessionId}&plan=${plan}&intake_id=${intakeId}`

  return {
    sessionId,
    sessionType: type,
    status: 'pending',
    redirectUrl
  }
}
```

### 2. Update `/api/intake/start` to Use Factory

```typescript
// BEFORE (lines 239-355): Inline session creation
if (plan === 'trial' || plan === 'free' || plan === 'trial-free') {
  // ... 100+ lines of session creation code ...
}

// AFTER: Use unified factory
import { createSessionRecord } from '@/lib/sessionFactory'

if (plan === 'trial' || plan === 'free' || plan === 'trial-free') {
  try {
    const result = await createSessionRecord({
      customerId: user.id,
      customerEmail: user.email,
      type: sessionType,  // determined from plan
      plan,
      intakeId,
      paymentMethod: 'free',
      urgent: isUrgent,
      isSpecialist,
      preferredMechanicId,
      routingType
    })

    return NextResponse.json({ redirect: result.redirectUrl })
  } catch (error) {
    if (error.message === 'ACTIVE_SESSION_EXISTS') {
      // Return 409 with active session details
      const activeSession = await getActiveSession(user.id)
      return NextResponse.json({
        error: 'You already have an active session',
        activeSessionId: activeSession.id,
        activeSessionType: activeSession.type,
        activeSessionStatus: activeSession.status
      }, { status: 409 })
    }
    throw error
  }
}
```

### 3. Update `fulfillCheckout()` to Use Factory

```typescript
// BEFORE (line 207): Inline session creation
const insert = await supabaseAdmin.from('sessions').insert(insertPayload).select('id').single()

// AFTER: Use unified factory
import { createSessionRecord } from '@/lib/sessionFactory'

const result = await createSessionRecord({
  customerId: supabaseUserId,
  customerEmail,
  type: sessionType,
  plan,
  intakeId,
  stripeSessionId,
  paymentMethod: 'stripe',
  amountPaid: amountTotal,
  preferredMechanicId: (metadataPatch as any).preferred_mechanic_id,
  routingType: (metadataPatch as any).routing_type || routingType
})
```

---

## Benefits of This Architecture

### ✅ 1. Single Source of Truth
- **ONE** function creates ALL sessions
- Easier to maintain and debug
- Consistent behavior across free and paid flows

### ✅ 2. Type Safety
- TypeScript interfaces ensure all required data is provided
- Compile-time validation of session creation

### ✅ 3. Consistent Event Logging
- All sessions log the same events
- Easier to audit and track session lifecycle

### ✅ 4. Easier Testing
- Test ONE function instead of TWO code paths
- Mock once, test everywhere

### ✅ 5. Better Error Handling
- Centralized 409 conflict detection
- Consistent error responses

### ✅ 6. Future-Proof
- Adding new session types? Update ONE function
- Adding new payment methods? Update ONE function
- Adding new metadata? Update ONE interface

---

## Flow Comparison

### FREE Session Flow
```
Customer → Intake Form → Submit
  ↓
/api/intake/start
  ↓
createSessionRecord() ← UNIFIED FACTORY
  ├── Create session (status: pending)
  ├── Create participant
  ├── Create assignment (queued)
  └── Log event
  ↓
Redirect to waiver
```

### PAID Session Flow
```
Customer → Intake Form → Submit
  ↓
/api/intake/start
  ↓
Redirect to waiver
  ↓
Customer signs waiver
  ↓
Redirect to Stripe Checkout
  ↓
Customer pays
  ↓
Stripe Webhook (checkout.session.completed)
  ↓
fulfillCheckout()
  ↓
createSessionRecord() ← SAME UNIFIED FACTORY
  ├── Create session (status: pending)
  ├── Create participant
  ├── Create assignment (queued)
  └── Log event
  ↓
Session ready for mechanic assignment
```

**Key Difference:** FREE sessions create immediately, PAID sessions create after payment. But BOTH use the SAME factory function!

---

## Implementation Checklist

- [ ] Create `src/lib/sessionFactory.ts` with unified function
- [ ] Update `/api/intake/start` to use factory for free sessions
- [ ] Update `fulfillCheckout()` to use factory for paid sessions
- [ ] Add comprehensive tests for sessionFactory
- [ ] Test free session creation end-to-end
- [ ] Test paid session creation end-to-end
- [ ] Test 409 conflict handling
- [ ] Verify session_events are logged correctly
- [ ] Verify session_assignments are created correctly
- [ ] Deploy and monitor

---

## Testing Strategy

### Unit Tests (sessionFactory.test.ts)
```typescript
describe('createSessionRecord', () => {
  it('creates free session with all required records', async () => {
    const result = await createSessionRecord({
      customerId: 'user-123',
      type: 'chat',
      plan: 'free',
      intakeId: 'intake-123',
      paymentMethod: 'free'
    })

    expect(result.sessionId).toBeDefined()
    expect(result.status).toBe('pending')

    // Verify session record exists
    const session = await getSession(result.sessionId)
    expect(session.customer_user_id).toBe('user-123')

    // Verify participant exists
    const participant = await getParticipant(result.sessionId, 'user-123')
    expect(participant.role).toBe('customer')

    // Verify assignment exists
    const assignment = await getAssignment(result.sessionId)
    expect(assignment.status).toBe('queued')

    // Verify event logged
    const events = await getEvents(result.sessionId)
    expect(events[0].event_type).toBe('created')
  })

  it('throws error if active session exists', async () => {
    // Create active session
    await createActiveSession('user-123')

    // Attempt to create another
    await expect(
      createSessionRecord({
        customerId: 'user-123',
        type: 'chat',
        plan: 'free',
        intakeId: 'intake-456',
        paymentMethod: 'free'
      })
    ).rejects.toThrow('ACTIVE_SESSION_EXISTS')
  })

  it('creates paid session with Stripe metadata', async () => {
    const result = await createSessionRecord({
      customerId: 'user-123',
      type: 'video',
      plan: 'standard',
      intakeId: 'intake-123',
      stripeSessionId: 'cs_test_123',
      paymentMethod: 'stripe',
      amountPaid: 2999
    })

    const session = await getSession(result.sessionId)
    expect(session.stripe_session_id).toBe('cs_test_123')
    expect(session.metadata.payment_method).toBe('stripe')
    expect(session.metadata.amount_paid).toBe(2999)
  })
})
```

### Integration Tests
1. **Free Session E2E**
   - Submit intake form with free plan
   - Verify session created immediately
   - Verify redirect to waiver
   - Verify session appears in mechanic queue

2. **Paid Session E2E**
   - Submit intake form with paid plan
   - Verify NO session created yet
   - Verify redirect to waiver → checkout
   - Complete Stripe payment (test mode)
   - Verify webhook creates session
   - Verify session appears in mechanic queue

3. **409 Conflict E2E**
   - Create active session for customer
   - Attempt to create another
   - Verify 409 response
   - Verify modal shows "Return to Active Session"

---

## Conclusion

This unified architecture provides:
- **Consistency:** Same logic for all session types
- **Maintainability:** One place to update session creation
- **Reliability:** Centralized validation and error handling
- **Scalability:** Easy to add new payment methods or session types

**The key principle:** Separate WHEN a session is created (free vs paid) from HOW it's created (unified factory). This gives us flexibility in timing while maintaining consistency in implementation.
