# RFQ Marketplace Implementation Plan
**Feature: Multi-Workshop Competitive Bidding System**

## Executive Summary

**Goal:** Enable customers to receive competitive bids from multiple workshops instead of single direct quotes

**Approach:** Phased rollout with feature flag, zero-downtime, default OFF

**Timeline:** 6 phases, ~6-8 weeks total development

**Risk:** VERY LOW - Feature flag ensures existing Direct Quote system unaffected

---

## Business Context

### Current System (Direct Quote - System 1)
- ✅ Fully functional
- Mechanic chooses ONE specific workshop
- Workshop sends single quote
- Customer accepts/declines
- **Flow:** Diagnostic → Direct Assignment → Single Quote → Accept/Decline

### New System (RFQ Marketplace - System 2)
- ❌ Database exists, no UI
- Mechanic posts to marketplace
- MULTIPLE workshops compete with bids
- Customer compares and selects winner
- **Flow:** Diagnostic → RFQ Posting → Multiple Bids → Compare → Select Winner → Formal Quote

### Key Difference
**Direct Quote:** Fast, single option, trusted relationship
**RFQ Marketplace:** Slower, multiple options, price shopping

---

## Architecture Overview

### Database Tables (Already Exist)

#### 1. `workshop_rfq_marketplace`
**Purpose:** RFQ postings that workshops can bid on

**Key Fields:**
- `escalation_queue_id` (links to escalation system)
- `customer_id`, `diagnostic_session_id`, `escalating_mechanic_id`
- `title`, `description`, `issue_category`, `urgency`
- Vehicle snapshot: `vehicle_make`, `vehicle_model`, `vehicle_year`, `vehicle_mileage`
- Location: `customer_city`, `customer_province`, `latitude`, `longitude`
- Budget: `budget_min`, `budget_max` (optional)
- Bidding: `bid_deadline`, `max_bids`, `auto_expire_hours`
- Status: `draft`, `open`, `under_review`, `bid_accepted`, `quote_sent`, `converted`, `expired`, `cancelled`
- Metrics: `view_count`, `bid_count`, `total_workshops_viewed`
- Winner: `accepted_bid_id`, `accepted_at`
- Legal: `customer_consent_to_share_info`, `referral_fee_disclosed`

#### 2. `workshop_rfq_bids`
**Purpose:** Workshop bids on RFQ postings

**Key Fields:**
- `rfq_marketplace_id`, `workshop_id`
- Workshop snapshot: `workshop_name`, `workshop_city`, `workshop_rating`, `workshop_certifications`
- Pricing: `quote_amount`, `parts_cost`, `labor_cost`, `shop_supplies_fee`, `environmental_fee`
- Warranty: `warranty_months`, `warranty_mileage`, `warranty_terms`
- Timeline: `estimated_completion_hours`, `available_start_date`
- Status: `draft`, `submitted`, `under_review`, `accepted`, `declined`, `expired`, `withdrawn`
- Platform fee: `platform_fee_percent`, `platform_fee_amount`
- Message: `message_to_customer`, `detailed_breakdown`

#### 3. `workshop_escalation_queue` (Extended)
**Purpose:** Unified escalation system supporting both Direct Quote and RFQ

**RFQ-Specific Fields:**
- `escalation_type`: `'direct_assignment'` OR `'rfq_marketplace'`
- `rfq_marketplace_id`: Links to RFQ if marketplace type
- `rfq_posted_at`, `rfq_bid_deadline`, `rfq_bid_count`
- `winning_workshop_id`, `winning_bid_amount`, `customer_selected_bid_at`

---

## Feature Flag Strategy

### Configuration

**Environment Variable:**
```bash
ENABLE_WORKSHOP_RFQ=false  # Default OFF in production
```

**Config File:** `src/config/featureFlags.ts`
```typescript
export const FEATURE_FLAGS = {
  ENABLE_WORKSHOP_RFQ: process.env.ENABLE_WORKSHOP_RFQ === 'true',
} as const
```

**Utility:** `src/lib/flags.ts`
```typescript
// Server-side
export function isRfqEnabled(): boolean {
  return FEATURE_FLAGS.ENABLE_WORKSHOP_RFQ
}

// Client-side (from API or server component)
export function useRfqEnabled(): boolean {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    fetch('/api/feature-flags/rfq')
      .then(r => r.json())
      .then(data => setEnabled(data.enabled))
  }, [])
  return enabled
}
```

### Kill-Switch Behavior

**When Disabled (Default):**
- ❌ UI components hidden (no RFQ buttons/pages)
- ❌ API routes return 404 or feature disabled error
- ❌ No RFQ data writes
- ✅ Direct Quote system works normally
- ✅ Existing RFQ data readable (for rollback scenarios)

**When Enabled:**
- ✅ RFQ UI components visible
- ✅ API routes active
- ✅ RFQ data writes allowed
- ✅ Direct Quote system still available (coexistence)

---

## Zero-Downtime Rollout Plan

### Stage 1: Dark Launch (Phases 0-1)
- Feature flag infrastructure added
- Code deployed with flag OFF
- No user-facing changes
- **Duration:** 1 week

### Stage 2: Internal Testing (Phase 2-4 with flag ON internally)
- Enable flag in staging environment
- Internal QA tests full RFQ flow
- Performance/load testing
- **Duration:** 2 weeks

### Stage 3: Beta Rollout (5-10 workshops)
- Enable flag for 5-10 selected workshops (canary)
- Monitor metrics: bid submission rate, customer acceptance rate
- Gather feedback
- **Duration:** 2 weeks

### Stage 4: Gradual Rollout
- 25% of workshops (flag enabled by workshop ID whitelist)
- 50% of workshops
- 100% of workshops
- **Duration:** 2-3 weeks

### Stage 5: General Availability
- Flag ON by default for all users
- Keep kill-switch available for emergencies
- **Duration:** Ongoing

---

## Security Model

### Authentication & Authorization

#### Role-Based Access Control

**Mechanics (RFQ Creation):**
```typescript
// Eligibility rules by mechanic type:
// - Employee (partnership_type='employee'): ❌ Cannot create RFQ (only direct assignment)
// - Partnership Contractor (service_tier='workshop_partner'): ✅ Can create RFQ OR direct assign
// - Independent Virtual (service_tier='virtual_only'): ✅ Can create RFQ OR direct assign

async function canMechanicCreateRfq(mechanicId: string): Promise<boolean> {
  const mechanic = await getMechanic(mechanicId)

  // Employees cannot use RFQ marketplace
  if (mechanic.partnership_type === 'employee') {
    return false
  }

  // Contractors and independents can use RFQ
  return ['workshop_partner', 'virtual_only'].includes(mechanic.service_tier)
}
```

**Workshops (Bidding):**
```typescript
// All workshops can bid on RFQs
// But must meet minimum requirements:
// - Active/approved status
// - Location within range (if specified)
// - Rating meets minimum (if specified)
// - Has required certifications (if specified)

async function canWorkshopBid(workshopId: string, rfqId: string): Promise<boolean> {
  const workshop = await getWorkshop(workshopId)
  const rfq = await getRfq(rfqId)

  // Must be active
  if (workshop.status !== 'active') return false

  // Check location filter
  if (rfq.max_distance_km) {
    const distance = calculateDistance(workshop.location, rfq.location)
    if (distance > rfq.max_distance_km) return false
  }

  // Check rating filter
  if (rfq.min_workshop_rating && workshop.rating < rfq.min_workshop_rating) {
    return false
  }

  // Check certifications
  if (rfq.required_certifications?.length > 0) {
    const hasCerts = rfq.required_certifications.every(cert =>
      workshop.certifications?.includes(cert)
    )
    if (!hasCerts) return false
  }

  return true
}
```

**Customers (Bid Selection):**
```typescript
// Customer can only view/accept bids for their own RFQs
async function canCustomerAccessRfq(customerId: string, rfqId: string): Promise<boolean> {
  const rfq = await getRfq(rfqId)
  return rfq.customer_id === customerId
}
```

### Row-Level Security (RLS)

**Assumed Existing Policies:**
```sql
-- workshop_rfq_marketplace RLS
-- Read: Workshops can see open RFQs matching their criteria; customers see their own
-- Write: Only mechanics can create; only customers can update status

-- workshop_rfq_bids RLS
-- Read: Workshop sees own bids; customer sees bids for their RFQs
-- Write: Only workshops can create bids; only customers can accept/decline

-- workshop_escalation_queue RLS
-- Read: Mechanic/workshop/customer involved can read
-- Write: Mechanic creates; system updates on bid acceptance
```

**Verification Required:** Phase 0 will introspect actual RLS policies

### Input Validation (Zod Schemas)

**RFQ Creation:**
```typescript
const CreateRfqSchema = z.object({
  diagnostic_session_id: z.string().uuid(),
  title: z.string().min(10).max(200),
  description: z.string().min(50).max(2000),
  issue_category: z.enum(['engine', 'brakes', 'electrical', 'suspension', 'transmission', 'other']),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  budget_min: z.number().positive().optional(),
  budget_max: z.number().positive().optional(),
  bid_deadline_hours: z.number().int().min(24).max(168).default(72), // 1-7 days
  max_bids: z.number().int().min(3).max(20).default(10),
  min_workshop_rating: z.number().min(0).max(5).optional(),
  required_certifications: z.array(z.string()).optional(),
  customer_consent_to_share_info: z.literal(true), // PIPEDA compliance
})
```

**Bid Submission:**
```typescript
const CreateBidSchema = z.object({
  rfq_marketplace_id: z.string().uuid(),
  quote_amount: z.number().positive().min(50).max(50000),
  parts_cost: z.number().nonnegative(),
  labor_cost: z.number().nonnegative(),
  warranty_months: z.number().int().min(0).max(60).default(12),
  estimated_completion_hours: z.number().positive().max(200),
  available_start_date: z.string().datetime(),
  message_to_customer: z.string().max(500).optional(),
  detailed_breakdown: z.string().max(2000).optional(),
})
.refine(data => data.parts_cost + data.labor_cost <= data.quote_amount, {
  message: 'Parts + Labor cannot exceed total quote amount'
})
```

### DoS & Rate Limiting

**API Rate Limits:**
```typescript
// Per IP/user limits
const RATE_LIMITS = {
  createRfq: { max: 10, window: '1h' },      // 10 RFQs per hour
  createBid: { max: 50, window: '1h' },      // 50 bids per hour
  listRfqs: { max: 100, window: '1m' },      // 100 list requests per minute
  viewRfq: { max: 200, window: '1m' },       // 200 detail views per minute
}
```

**Implementation:**
```typescript
// Using Vercel rate limiting or upstash/redis
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: redisClient,
  limiter: Ratelimit.slidingWindow(10, '1h'),
})

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // ... handle request
}
```

### PII Protection

**Customer Data Redaction:**
```typescript
// When showing RFQ to workshops, redact sensitive customer info
function sanitizeRfqForWorkshop(rfq: RfqMarketplace): RfqMarketplacePublic {
  return {
    id: rfq.id,
    title: rfq.title,
    description: rfq.description,
    issue_category: rfq.issue_category,
    urgency: rfq.urgency,
    vehicle: {
      make: rfq.vehicle_make,
      model: rfq.vehicle_model,
      year: rfq.vehicle_year,
      mileage: rfq.vehicle_mileage,
      // ❌ NO VIN exposed
    },
    location: {
      city: rfq.customer_city,          // ✅ City OK
      province: rfq.customer_province,   // ✅ Province OK
      // ❌ NO exact address/lat/long
      // ❌ NO customer name/email/phone
    },
    budget_range: {
      min: rfq.budget_min,
      max: rfq.budget_max,
    },
    bid_deadline: rfq.bid_deadline,
    bid_count: rfq.bid_count,
    // ❌ NO customer_id exposed
  }
}
```

### Audit Logging

**Security Events to Log:**
```typescript
const SECURITY_EVENTS = {
  RFQ_CREATED: 'rfq.created',
  RFQ_VIEWED: 'rfq.viewed',
  BID_SUBMITTED: 'bid.submitted',
  BID_ACCEPTED: 'bid.accepted',
  RFQ_EXPIRED: 'rfq.expired',
  UNAUTHORIZED_ACCESS: 'security.unauthorized_access',
  RATE_LIMIT_HIT: 'security.rate_limit_hit',
}

// Log to security_events table or external service
async function logSecurityEvent(event: string, metadata: any) {
  await supabase.from('security_events').insert({
    event_type: event,
    user_id: metadata.userId,
    ip_address: metadata.ip,
    metadata: metadata,
    created_at: new Date().toISOString(),
  })
}
```

---

## SQL Safety Protocol

### Assumption
**The schema ALREADY EXISTS.** Tables created via:
- `20250127000001_add_repair_quote_system.sql`
- `20251027000001_add_workshop_escalation.sql`
- `20251206000002_phase6_workshop_rfq_marketplace.sql`

### Introspection First

**Before ANY migration, we MUST:**

1. **Verify Tables Exist:**
```sql
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'workshop_rfq_marketplace',
    'workshop_rfq_bids',
    'workshop_escalation_queue'
  );
```

2. **Verify Columns:**
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workshop_rfq_marketplace'
ORDER BY ordinal_position;
```

3. **Verify Foreign Keys:**
```sql
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
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('workshop_rfq_marketplace', 'workshop_rfq_bids');
```

4. **Verify RLS Policies:**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('workshop_rfq_marketplace', 'workshop_rfq_bids');
```

### Migration Process (If Required)

**Only if introspection reveals missing columns/tables:**

**Step 1: Document Gap**
```markdown
# Migration Required: <reason>

## Introspection Results
<paste actual query results>

## Gap Identified
Missing column: `workshop_rfq_marketplace.new_field`

## Impact
Cannot implement Feature X without this field
```

**Step 2: Propose Idempotent Migration**

**File:** `supabase/migrations/rfq/01_up.sql`
```sql
-- =====================================================
-- RFQ Marketplace - Missing Field Addition
-- Created: 2025-01-XX
-- Purpose: Add missing field identified during Phase 0
-- =====================================================

DO $$
BEGIN
  -- Only add if not exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workshop_rfq_marketplace'
      AND column_name = 'new_field'
  ) THEN
    ALTER TABLE workshop_rfq_marketplace
    ADD COLUMN new_field TEXT;

    COMMENT ON COLUMN workshop_rfq_marketplace.new_field IS 'Description of what this field does';

    RAISE NOTICE 'Added new_field to workshop_rfq_marketplace';
  ELSE
    RAISE NOTICE 'new_field already exists, skipping';
  END IF;
END $$;
```

**File:** `supabase/migrations/rfq/02_down.sql`
```sql
-- Rollback script
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workshop_rfq_marketplace'
      AND column_name = 'new_field'
  ) THEN
    ALTER TABLE workshop_rfq_marketplace
    DROP COLUMN new_field;

    RAISE NOTICE 'Removed new_field from workshop_rfq_marketplace';
  END IF;
END $$;
```

**File:** `supabase/migrations/rfq/03_verify.sql`
```sql
-- Verification script
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workshop_rfq_marketplace'
      AND column_name = 'new_field'
  ) THEN
    RAISE EXCEPTION 'Verification failed: new_field does not exist';
  ELSE
    RAISE NOTICE '✅ Verification passed: new_field exists';
  END IF;
END $$;
```

**Step 3: STOP and Wait for Approval**
Do NOT apply migration. Present proposal and wait for:
```
APPROVE MIGRATION — apply rfq/01_up.sql
```

---

## Test Matrix

### Phase 0: Schema Verification
| Test | Expected Result | Status |
|------|----------------|--------|
| Tables exist | 3 tables found | ⏳ Pending |
| Columns match spec | All required columns present | ⏳ Pending |
| Foreign keys valid | All FKs point to existing tables | ⏳ Pending |
| RLS policies exist | Read/write policies per role | ⏳ Pending |
| Indexes exist | Performance indexes created | ⏳ Pending |

### Phase 1: Feature Flag
| Test | Expected Result | Status |
|------|----------------|--------|
| Flag OFF by default | ENABLE_WORKSHOP_RFQ=false | ⏳ Pending |
| Flag reads from env | Can override with env var | ⏳ Pending |
| Server util works | isRfqEnabled() returns correct value | ⏳ Pending |
| Client util works | useRfqEnabled() hook functional | ⏳ Pending |
| Kill-switch effective | UI hidden, APIs reject when OFF | ⏳ Pending |

### Phase 2: Mechanic RFQ Creation
| Test | Expected Result | Status |
|------|----------------|--------|
| Employee blocked | Cannot create RFQ | ⏳ Pending |
| Contractor allowed | Can create RFQ | ⏳ Pending |
| Independent allowed | Can create RFQ | ⏳ Pending |
| Zod validation | Invalid input rejected | ⏳ Pending |
| RLS enforced | Can only create for own sessions | ⏳ Pending |
| Rate limit works | 10 RFQs/hour max | ⏳ Pending |
| Audit log created | Event logged | ⏳ Pending |

### Phase 3: Workshop Bidding
| Test | Expected Result | Status |
|------|----------------|--------|
| Workshop sees RFQs | List filtered by location/rating | ⏳ Pending |
| PII redacted | No customer contact info shown | ⏳ Pending |
| Bid submission | Valid bid accepted | ⏳ Pending |
| Duplicate bid blocked | Cannot bid twice on same RFQ | ⏳ Pending |
| Rate limit works | 50 bids/hour max | ⏳ Pending |
| RLS enforced | Can only bid on eligible RFQs | ⏳ Pending |

### Phase 4: Customer Bid Selection
| Test | Expected Result | Status |
|------|----------------|--------|
| Customer sees bids | All bids for their RFQ | ⏳ Pending |
| Side-by-side compare | Price/warranty/ETA visible | ⏳ Pending |
| Accept bid | Creates formal quote in repair_quotes | ⏳ Pending |
| Double-accept blocked | Transaction prevents race condition | ⏳ Pending |
| RLS enforced | Can only view own RFQ bids | ⏳ Pending |
| Direct Quote unaffected | Existing quotes still work | ⏳ Pending |

### Phase 5: Notifications
| Test | Expected Result | Status |
|------|----------------|--------|
| New bid email | Customer notified | ⏳ Pending |
| Bid accepted email | Workshop notified | ⏳ Pending |
| Expiration email | Mechanic/customer notified | ⏳ Pending |
| Cron job runs | RFQs expire at deadline | ⏳ Pending |

### Phase 6: Admin & Analytics
| Test | Expected Result | Status |
|------|----------------|--------|
| Admin sees RFQ stats | Volume, acceptance rate visible | ⏳ Pending |
| Kill-switch toggle | Admin can disable feature instantly | ⏳ Pending |
| Analytics accurate | Bid counts, avg prices correct | ⏳ Pending |

---

## Rollback Steps

### Emergency Rollback (Production Issue)

**Step 1: Kill-Switch (Immediate)**
```bash
# Set env var to disable feature
ENABLE_WORKSHOP_RFQ=false

# Restart application (Vercel auto-deploys on env change)
# OR manually redeploy
```

**Step 2: Verify Rollback**
```bash
# Check UI hidden
curl https://app.com/mechanic/rfq/create/123
# Should return 404 or redirect

# Check API disabled
curl -X POST https://app.com/api/rfq/create
# Should return 404 or feature disabled error
```

**Step 3: Monitor**
- Check error logs for RFQ-related errors
- Verify Direct Quote system still working
- Monitor customer complaints

### Partial Rollback (Database Issue)

**If migration caused data corruption:**

**Step 1: Apply Down Migration**
```bash
psql $DATABASE_URL -f supabase/migrations/rfq/02_down.sql
```

**Step 2: Verify**
```bash
psql $DATABASE_URL -f supabase/migrations/rfq/03_verify.sql
# Should show original state restored
```

**Step 3: Code Rollback**
```bash
git revert <rfq-commit-sha>
git push origin main
```

### Data Preservation

**Even with feature OFF, preserve RFQ data:**
- Existing RFQs remain in database (status: `expired` or `cancelled`)
- Existing bids remain readable
- Analytics/reporting still accessible
- Can re-enable feature without data loss

---

## Success Criteria

### Phase 0
- ✅ All 3 tables exist in database
- ✅ All required columns present
- ✅ RLS policies documented
- ✅ No schema gaps OR gaps documented with migration plan

### Phase 1
- ✅ Feature flag infrastructure deployed
- ✅ Flag OFF by default
- ✅ Kill-switch effective (UI hidden, APIs reject)
- ✅ No behavior change to Direct Quote system

### Phase 2
- ✅ Mechanics can create RFQ (UI + API functional)
- ✅ Employee mechanics blocked
- ✅ Zod validation working
- ✅ RLS enforced
- ✅ Audit logs created

### Phase 3
- ✅ Workshops can browse RFQs
- ✅ Workshops can submit bids
- ✅ PII redacted correctly
- ✅ Rate limiting working
- ✅ Bid validation functional

### Phase 4
- ✅ Customers can view bids
- ✅ Side-by-side comparison working
- ✅ Bid acceptance creates formal quote
- ✅ Integration with Direct Quote flow seamless
- ✅ Transaction safety (no double-accept)

### Phase 5
- ✅ Email notifications working
- ✅ Auto-expiration job running
- ✅ Cron schedule reliable

### Phase 6
- ✅ Admin analytics dashboard functional
- ✅ Kill-switch verified end-to-end
- ✅ Performance acceptable (<2s page loads)
- ✅ Zero impact on Direct Quote system

---

## Timeline Estimate

| Phase | Description | Duration | Risk |
|-------|-------------|----------|------|
| 0 | Read-only verification | 2-3 days | VERY LOW |
| 1 | Feature flag infrastructure | 3-5 days | VERY LOW |
| 2 | Mechanic RFQ creation | 5-7 days | LOW |
| 3 | Workshop browse/bid | 7-10 days | MEDIUM |
| 4 | Customer bid selection | 5-7 days | MEDIUM |
| 5 | Notifications + cron | 5-7 days | LOW |
| 6 | Admin + analytics | 3-5 days | LOW |
| **Total** | | **6-8 weeks** | **LOW** |

---

## Dependencies

### External Services
- ✅ Supabase (database)
- ✅ Vercel (hosting, env vars)
- ⚠️ Resend (email notifications - Phase 5)
- ⚠️ Vercel Cron or similar (auto-expiration - Phase 5)
- ⚠️ Upstash/Redis (rate limiting - optional)

### Internal Systems
- ✅ Direct Quote system (coexistence required)
- ✅ Diagnostic sessions (RFQ source)
- ✅ Workshop escalation queue (integration point)
- ✅ Mechanic authentication (eligibility checks)
- ✅ Workshop authentication (bid access)
- ✅ Customer authentication (bid selection)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Schema mismatch | LOW | HIGH | Phase 0 introspection catches early |
| Direct Quote breaks | VERY LOW | CRITICAL | Feature flag ensures isolation |
| RLS policy gaps | MEDIUM | HIGH | Phase 0 verification + manual audit |
| Performance issues | LOW | MEDIUM | Pagination, indexes, caching |
| Double-bid acceptance | LOW | HIGH | Database transaction + unique constraint |
| PII leakage | LOW | CRITICAL | Sanitization function + code review |
| Rate limit bypass | MEDIUM | MEDIUM | Server-side enforcement + IP tracking |
| Email deliverability | MEDIUM | LOW | Resend reliability + fallback notifications |

---

## Open Questions (To Answer in Phase 0)

1. **RLS Policies:** Do they exist? Are they correct for our use case?
2. **Indexes:** Are performance indexes in place for pagination/filtering?
3. **Missing Fields:** Any columns referenced in code but missing from schema?
4. **Trigger Functions:** Are there auto-update triggers for bid_count, view_count, etc.?
5. **Email Integration:** Do we have Resend API key configured?
6. **Cron Setup:** Does Vercel cron work or do we need external scheduler?

---

## Next Steps

**STOP HERE - AWAITING APPROVAL**

After reviewing this plan, approve with:
```
APPROVE RFQ PLAN — proceed to PHASE 0 (READ-ONLY VERIFICATION)
```

Then Phase 0 will:
1. Introspect database schema
2. Verify RLS policies
3. Document any gaps
4. Propose migrations if needed (with STOP for approval)
5. Create `rfq-verification-Phase0.md`

**No code changes in Phase 0 - READ-ONLY ONLY.**
