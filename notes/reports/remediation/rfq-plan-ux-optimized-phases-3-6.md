# RFQ Implementation Plan - Phases 3-6 (Continuation)

**This document continues from `rfq-plan-ux-optimized.md` Phase 2**

---

## Phase 3: Workshop Browse RFQs + Submit Bids (7-10 days)

**Goal:** Build workshop-facing RFQ marketplace with professional DMS-style bid submission interface.

**User Stories:**
- **As a workshop owner**, I want to browse available RFQs filtered by location, service type, and budget range
- **As a workshop**, I want to see sanitized customer data (no PII until bid accepted)
- **As a workshop**, I want to submit competitive bids with pricing breakdown, warranty, and timeline
- **As a workshop**, I want to track my bid status (submitted, under review, accepted, declined)

### 3.1 Workshop RFQ Marketplace Listing Page

**Route:** `/workshop/rfq/marketplace`

**UI Specification:**

**Desktop Layout (≥1024px):**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 RFQ Marketplace                    [🔔 New: 3] [Filter ▼]│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐  ┌──────────────────────────────────────┐   │
│ │ FILTERS     │  │ 🚗 Engine Diagnostic - 2019 Honda... │   │
│ │             │  │ Posted 2h ago • Ends in 46h          │   │
│ │ Location    │  │ 📍 Toronto, ON • Budget: $500-$800   │   │
│ │ [________]  │  │ Urgency: 🔴 High                     │   │
│ │             │  │ [View Details] [Quick Bid]           │   │
│ │ Service Type│  └──────────────────────────────────────┘   │
│ │ ☐ Brakes    │  ┌──────────────────────────────────────┐   │
│ │ ☐ Engine    │  │ 🛠️ Brake System Inspection           │   │
│ │ ☐ Electrical│  │ Posted 5h ago • Ends in 19h          │   │
│ │             │  │ 📍 Mississauga, ON • Budget: $200-$400│  │
│ │ Budget Range│  │ Urgency: 🟡 Normal                   │   │
│ │ [$___-$___] │  │ [View Details] [Quick Bid]           │   │
│ │             │  └──────────────────────────────────────┘   │
│ │ Distance    │  ... (pagination)                           │
│ │ [< 25km ▼]  │                                             │
│ └─────────────┘                                             │
└─────────────────────────────────────────────────────────────┘
```

**Mobile Layout (<768px):**
```
┌──────────────────────┐
│ 🎯 RFQ Marketplace   │
│ [Filter ▼] [🔔 3]    │
├──────────────────────┤
│ ┌──────────────────┐ │
│ │ 🚗 Engine Diag..│ │
│ │ 2h ago • 46h left│ │
│ │ 📍 Toronto, ON   │ │
│ │ $500-$800        │ │
│ │ 🔴 High          │ │
│ │ [View] [Bid]     │ │
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │ 🛠️ Brake Insp... │ │
│ │ 5h ago • 19h left│ │
│ │ 📍 Mississauga   │ │
│ │ $200-$400        │ │
│ │ 🟡 Normal        │ │
│ │ [Select This]    │ │
│ └──────────────────┘ │
└──────────────────────┘
```

### Success Criteria (Phase 3)

- ✅ Workshop marketplace listing page with filters functional
- ✅ RFQ cards show sanitized customer data (no PII)
- ✅ Distance filtering works (if PostGIS available)
- ✅ Bid submission 2-step wizard functional
- ✅ Platform fee (5%) calculated and displayed
- ✅ Workshop snapshot captured at bid submission
- ✅ Duplicate bid prevention (one bid per workshop per RFQ)
- ✅ Max bids limit enforced
- ✅ Bid deadline validation
- ✅ Mobile-responsive design
- ✅ Feature-gated behind ENABLE_WORKSHOP_RFQ

### Commit Message (Phase 3)

```
feat(rfq): add workshop RFQ browse and bid submission (Phase 3)

- Add workshop marketplace listing page with filters
- Location, service type, budget, distance filtering
- RFQ detail view with sanitized customer data
- 2-step bid submission wizard (pricing + review)
- Platform fee calculation (5%)
- Workshop snapshot capture
- Duplicate bid prevention
- Max bids and deadline enforcement
- Mobile-first responsive design
- Feature-gated behind ENABLE_WORKSHOP_RFQ

Relates to: RFQ Phase 3
```

**STOP after Phase 3 commit. Await approval for Phase 4.**

---

## Phase 4: Customer Compare Bids + Accept Winner (5-7 days)

**Goal:** Build customer-facing bid comparison interface with table/card toggle views and one-click bid acceptance.

**User Stories:**
- **As a customer**, I want to see all workshop bids side-by-side
- **As a customer**, I want to compare pricing, timeline, warranty, and ratings
- **As a customer**, I want to toggle between table view (desktop) and card view (mobile)
- **As a customer**, I want to accept a winning bid and convert it to a formal quote
- **As a customer**, I want to see which workshop I'm choosing before accepting

### 4.1 Customer Bid Comparison Page

**Route:** `/customer/rfq/[id]/bids`

**UI Specification:**

**Desktop Table View (≥1024px):**
```
┌────────────────────────────────────────────────────────────────┐
│ Compare Bids for: Engine Diagnostic                           │
│ [Table View] [Card View]                         Sort: [Price▼]│
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ┌──────────┬──────┬────────┬────────┬────────┬─────────────┐  │
│ │ Workshop │ Price│Timeline│Warranty│ Rating │   Action    │  │
│ ├──────────┼──────┼────────┼────────┼────────┼─────────────┤  │
│ │ ABC Auto │ $650 │ 24h    │12mo P&L│ 4.8⭐  │ [Select] ✓  │  │
│ │ Downtown │      │        │        │(127)   │             │  │
│ ├──────────┼──────┼────────┼────────┼────────┼─────────────┤  │
│ │ QuickFix │ $720 │ 48h    │6mo P&L │ 4.5⭐  │ [Select]    │  │
│ │ Garage   │      │        │        │(89)    │             │  │
│ ├──────────┼──────┼────────┼────────┼────────┼─────────────┤  │
│ │ Pro Shop │ $580 │ 72h    │12mo P  │ 4.2⭐  │ [Select]    │  │
│ │ Motors   │      │        │        │(45)    │             │  │
│ └──────────┴──────┴────────┴────────┴────────┴─────────────┘  │
│                                                                │
│ Legend: P=Parts, L=Labor, P&L=Parts & Labor                    │
└────────────────────────────────────────────────────────────────┘
```

**Mobile Card View (<768px):**
```
┌────────────────────────┐
│ Compare Bids (3)       │
│ [Cards] [Table]        │
│ Sort: [Price ▼]        │
├────────────────────────┤
│ ┌────────────────────┐ │
│ │ ABC Auto Downtown  │ │
│ │ 4.8⭐ (127 reviews)│ │
│ │ ──────────────────│ │
│ │ Price: $650       │ │
│ │ Timeline: 24 hours│ │
│ │ Warranty: 12mo P&L│ │
│ │                   │ │
│ │ [✓ Select This]   │ │
│ └────────────────────┘ │
│ ┌────────────────────┐ │
│ │ QuickFix Garage    │ │
│ │ 4.5⭐ (89 reviews) │ │
│ │ ──────────────────│ │
│ │ Price: $720       │ │
│ │ Timeline: 48 hours│ │
│ │ Warranty: 6mo P&L │ │
│ │                   │ │
│ │ [Select This]     │ │
│ └────────────────────┘ │
└────────────────────────┘
```

### Success Criteria (Phase 4)

- ✅ Bid comparison page with table + card toggle views
- ✅ Sort by price, timeline, or rating
- ✅ Workshop info displayed (name, rating, address)
- ✅ Bid details displayed (price breakdown, timeline, warranty)
- ✅ One-click bid acceptance
- ✅ Atomic transaction (accept bid + create quote + close RFQ + decline other bids)
- ✅ Customer ownership verification
- ✅ Auto-redirect to formal quote after acceptance
- ✅ Mobile-responsive design
- ✅ Feature-gated behind ENABLE_WORKSHOP_RFQ

### Commit Message (Phase 4)

```
feat(rfq): add customer bid comparison and acceptance (Phase 4)

- Add bid comparison page with table/card toggle views
- Sort bids by price, timeline, or rating
- Display workshop info and bid details
- One-click bid acceptance with confirmation
- Atomic transaction: accept bid + create formal quote
- Auto-decline other bids when one is accepted
- Close RFQ and update escalation queue
- Customer ownership verification
- Mobile-first responsive design
- Feature-gated behind ENABLE_WORKSHOP_RFQ

Relates to: RFQ Phase 4
```

**STOP after Phase 4 commit. Await approval for Phase 5.**

---

## Phase 5: Notifications + Auto-Expiration (5-7 days)

**Goal:** Implement email notifications and automated RFQ expiration with cron jobs.

**User Stories:**
- **As a customer**, I want email notifications when workshops submit bids
- **As a workshop**, I want email notifications when new RFQs match my criteria
- **As a workshop**, I want email notifications when my bid is accepted/declined
- **As the system**, I want to auto-expire RFQs that pass their deadline
- **As the system**, I want to auto-decline bids for expired RFQs

### 5.1 Email Notification System

**Notifications to Implement:**

1. **Customer: New Bid Received**
   - Trigger: Workshop submits bid
   - Content: RFQ title, workshop name, current bid count
   - CTA: "View Bids" button

2. **Workshop: New RFQ Available**
   - Trigger: RFQ created matching workshop filters
   - Content: Vehicle info, issue summary, budget range, location
   - CTA: "Submit Bid" button

3. **Workshop: Bid Accepted**
   - Trigger: Customer accepts workshop's bid
   - Content: RFQ title, quote amount, next steps
   - CTA: "View Quote" button

4. **Workshop: Bid Declined**
   - Trigger: Customer accepts different workshop's bid OR RFQ expires
   - Content: RFQ title, thank you message
   - CTA: "Browse More RFQs" button

### 5.2 Auto-Expiration Cron Job

**File:** `src/app/api/cron/expire-rfqs/route.ts`

**Logic:**
1. Find all RFQs with `status = 'open'` and `bid_deadline < NOW()`
2. Update RFQ status to `'expired'`
3. Update all pending bids to `status = 'expired'`
4. Update escalation queue to `status = 'expired_no_bids'`
5. Send notification emails to workshops with expired bids

**Cron Schedule:** Runs every hour

**Vercel Configuration:**
```json
{
  "crons": [{
    "path": "/api/cron/expire-rfqs",
    "schedule": "0 * * * *"
  }]
}
```

### Success Criteria (Phase 5)

- ✅ Email sent to customer when workshop submits bid
- ✅ Email sent to workshops when new RFQ matches their criteria
- ✅ Email sent to workshop when bid is accepted
- ✅ Email sent to workshop when bid is declined
- ✅ Cron job expires RFQs past deadline (runs hourly)
- ✅ Expired RFQs automatically decline pending bids
- ✅ Email templates are mobile-responsive
- ✅ Cron endpoint secured with secret token
- ✅ Service role key used for cron operations

### Commit Message (Phase 5)

```
feat(rfq): add email notifications and auto-expiration (Phase 5)

- Add email templates for bid notifications
- Send email to customer when bid received
- Send email to workshops for new RFQs
- Send email to workshop when bid accepted/declined
- Add hourly cron job to expire RFQs past deadline
- Auto-decline bids for expired RFQs
- Secure cron endpoint with secret token
- Mobile-responsive email templates
- Integration with Resend email service

Relates to: RFQ Phase 5
```

**STOP after Phase 5 commit. Await approval for Phase 6.**

---

## Phase 6: Admin Analytics + Kill-Switch Verification (3-5 days)

**Goal:** Build admin dashboard for RFQ analytics and verify kill-switch functionality.

**User Stories:**
- **As an admin**, I want to see total RFQs, bids, and conversion rates
- **As an admin**, I want to see average bid count per RFQ
- **As an admin**, I want to see top-performing workshops
- **As an admin**, I want to disable the RFQ feature instantly (kill-switch)
- **As the platform**, I want to ensure disabling the flag hides all RFQ UI

### 6.1 Admin RFQ Analytics Page

**Route:** `/admin/analytics/rfq`

**Key Metrics:**

1. **Overview Cards:**
   - Total RFQs (all time)
   - Total Bids (all time)
   - Average Bids per RFQ
   - Conversion Rate (RFQs with accepted bid / total RFQs)

2. **Status Breakdown:**
   - Open RFQs (currently accepting bids)
   - Completed RFQs (bid accepted)
   - Expired RFQs (no bid accepted before deadline)

3. **Top Workshops Table:**
   - Workshop Name
   - Total Bids Submitted
   - Bids Accepted (wins)
   - Win Rate (%)
   - Sorted by win rate DESC

4. **Time Range Filter:**
   - Last 7 days
   - Last 30 days
   - Last 90 days
   - Last year
   - All time

### 6.2 Kill-Switch Test Plan

**Test Checklist:**

1. **Feature Flag Disabled (ENABLE_WORKSHOP_RFQ=false)**
   - ✅ Mechanic RFQ creation page returns 404
   - ✅ Workshop RFQ marketplace page returns 404
   - ✅ Customer bid comparison page returns 404
   - ✅ All RFQ API endpoints return 404
   - ✅ Feature gate component hides RFQ UI elements
   - ✅ Navigation links to RFQ pages hidden
   - ✅ Direct Quote system remains functional

2. **Feature Flag Enabled (ENABLE_WORKSHOP_RFQ=true)**
   - ✅ All RFQ pages accessible
   - ✅ All RFQ APIs functional
   - ✅ Navigation links visible
   - ✅ No impact on Direct Quote system

**E2E Test Script:**

```typescript
// tests/e2e/rfq-kill-switch.spec.ts
import { test, expect } from '@playwright/test'

test.describe('RFQ Kill-Switch', () => {
  test('Feature disabled - all RFQ pages return 404', async ({ page }) => {
    process.env.ENABLE_WORKSHOP_RFQ = 'false'

    await page.goto('/mechanic/rfq/create/some-session-id')
    await expect(page.locator('text=Feature not enabled')).toBeVisible()

    await page.goto('/workshop/rfq/marketplace')
    await expect(page.locator('text=Feature not enabled')).toBeVisible()

    await page.goto('/customer/rfq/some-id/bids')
    await expect(page.locator('text=Feature not enabled')).toBeVisible()
  })

  test('Feature enabled - RFQ pages accessible', async ({ page }) => {
    process.env.ENABLE_WORKSHOP_RFQ = 'true'

    await page.goto('/workshop/rfq/marketplace')
    const isLoginOrMarketplace =
      (await page.locator('text=Login').count()) > 0 ||
      (await page.locator('text=RFQ Marketplace').count()) > 0

    expect(isLoginOrMarketplace).toBe(true)
  })

  test('Direct Quote system unaffected by RFQ flag', async ({ page }) => {
    process.env.ENABLE_WORKSHOP_RFQ = 'false'

    await page.goto('/customer/quotes')
    await expect(page).not.toHaveURL(/.*error/)
  })
})
```

### Success Criteria (Phase 6)

- ✅ Admin analytics page shows RFQ metrics
- ✅ Key metrics: total RFQs, bids, avg bids/RFQ, conversion rate
- ✅ Status breakdown (open, completed, expired)
- ✅ Top performing workshops table
- ✅ Date range filter (7/30/90/365 days)
- ✅ Kill-switch test passes (feature flag disables all RFQ access)
- ✅ Direct Quote system unaffected by RFQ flag
- ✅ E2E tests verify kill-switch behavior

### Commit Message (Phase 6)

```
feat(rfq): add admin analytics and kill-switch verification (Phase 6)

- Add admin RFQ analytics dashboard
- Display total RFQs, bids, avg bids/RFQ, conversion rate
- Show RFQ status breakdown (open, completed, expired)
- Top performing workshops leaderboard
- Date range filtering (7/30/90/365 days)
- E2E tests for kill-switch functionality
- Verify feature flag disables all RFQ access
- Confirm Direct Quote system unaffected

Relates to: RFQ Phase 6
```

**STOP after Phase 6 commit. RFQ marketplace implementation COMPLETE.**

---

## Final Rollout Plan

### Pre-Launch Checklist

- ✅ All 6 phases committed and tested
- ✅ Feature flag `ENABLE_WORKSHOP_RFQ` exists in all environments
- ✅ Database migrations applied to production
- ✅ RLS policies verified
- ✅ Cron job configured (Vercel Crons or pg_cron)
- ✅ Resend API key configured
- ✅ Email templates tested
- ✅ Kill-switch tested
- ✅ Load testing completed (100+ concurrent RFQs)
- ✅ Security audit completed
- ✅ Legal review (PIPEDA/CASL compliance)

### Gradual Rollout Strategy

**Week 1: Internal Alpha (flag=true, invite-only)**
- Enable for 10 pilot mechanics + 5 pilot workshops
- Monitor analytics daily
- Fix critical bugs immediately

**Week 2-3: Closed Beta (flag=true, 100 users)**
- Enable for 50 mechanics + 50 workshops
- Collect user feedback
- Iterate on UX issues

**Week 4: Public Beta (flag=true, all users)**
- Enable for all users
- Monitor server load
- Watch for performance issues

**Week 6: General Availability**
- Announce publicly
- Monitor conversion rates
- Measure platform fee revenue

### Rollback Plan

**If Critical Bug Found:**

1. **Immediate:** Set `ENABLE_WORKSHOP_RFQ=false` (30 seconds)
2. **Investigate:** Review logs and error reports (1-2 hours)
3. **Fix:** Deploy hotfix to staging (2-4 hours)
4. **Test:** Verify fix works (1 hour)
5. **Deploy:** Push to production (15 minutes)
6. **Re-enable:** Set `ENABLE_WORKSHOP_RFQ=true` (30 seconds)

**Total downtime:** 4-8 hours maximum

---

## Monitoring & Success Metrics

### KPIs to Track

**Business Metrics:**
- RFQ creation rate (daily)
- Bid submission rate (bids per RFQ)
- Conversion rate (RFQs → accepted bids)
- Platform fee revenue
- Customer satisfaction (post-RFQ survey)

**Technical Metrics:**
- API response times (<200ms p95)
- Error rates (<0.1%)
- Database query performance
- Email delivery rate (>99%)
- Cron job success rate (100%)

**User Engagement:**
- % mechanics using RFQ vs. Direct Quote
- % workshops actively bidding
- Average time to first bid
- Average time to bid acceptance

### Alerts to Configure

- API error rate > 1% (PagerDuty)
- RFQ creation fails (Slack #alerts)
- Cron job fails (Email + Slack)
- Database query > 1s (Sentry)
- Email delivery < 95% (Resend webhook)

---

## Documentation & Training

**User Guides:**
- ✅ Mechanic: "How to create an RFQ"
- ✅ Workshop: "How to bid on RFQs"
- ✅ Customer: "How to compare and accept bids"

**Admin Guides:**
- ✅ "How to monitor RFQ analytics"
- ✅ "How to disable RFQ feature (kill-switch)"
- ✅ "How to debug RFQ issues"

**Developer Docs:**
- ✅ RFQ database schema
- ✅ API reference
- ✅ Feature flag system
- ✅ Email notification system
- ✅ Cron job setup

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|-------------|
| Phase 0: Read-only verification | 1 day | None |
| Phase 1: Feature flags | 2 days | Phase 0 |
| Phase 2: Mechanic RFQ creation | 5-7 days | Phase 1 |
| Phase 3: Workshop browse/bid | 7-10 days | Phase 2 |
| Phase 4: Customer bid comparison | 5-7 days | Phase 3 |
| Phase 5: Notifications + cron | 5-7 days | Phase 4 |
| Phase 6: Admin analytics | 3-5 days | Phase 5 |
| **Total** | **6-8 weeks** | - |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Bugs in production | Medium | High | Feature flag kill-switch, thorough testing |
| Poor bid quality | Low | Medium | Workshop verification, rating system |
| Low adoption | Medium | Medium | User education, incentives |
| Performance issues | Low | High | Load testing, query optimization |
| Privacy breach | Very Low | Critical | RLS policies, PII sanitization |
| CASL violations | Low | High | Explicit consent, unsubscribe links |

---

**END OF PHASES 3-6**

**To view the complete plan, read both files:**
1. `rfq-plan-ux-optimized.md` (Phases 0-2)
2. `rfq-plan-ux-optimized-phases-3-6.md` (This file: Phases 3-6)

**Next Steps:**
1. Review the complete 6-phase plan
2. Approve to proceed with Phase 0 (READ-ONLY VERIFICATION)
3. Execute phases sequentially with approval gates

**APPROVE RFQ PLAN** to continue! 🚀
