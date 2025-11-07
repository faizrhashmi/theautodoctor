# Workshop Analytics & Monitoring Plan

**Created:** 2025-10-25
**Phase:** Phase 1 - Workshop B2B2C Launch
**Target Launch:** Q1 2026 (March-April)
**Beta Period:** 60 days with 3-5 Ontario workshops

---

## Executive Summary

This plan outlines the analytics and monitoring strategy for TheAutoDoctor workshop features. The goal is to provide actionable insights to optimize the workshop onboarding funnel, monitor platform health, and prepare for scaling from 3-5 beta workshops to full Ontario coverage.

---

## Current State Analysis

### ✅ What We Have (Already Implemented)

1. **Admin Actions Logging**
   - Table: `admin_actions`
   - Captures: workshop_approved, workshop_rejected
   - Includes: admin_id, timestamp, notes, metadata

2. **Console Logging**
   - Workshop signup events
   - Workshop dashboard access
   - Mechanic invitation creation
   - Email sending attempts
   - Admin approval/rejection actions

3. **Database Tables with Timestamps**
   - `organizations` (created_at, updated_at)
   - `organization_members` (invited_at, joined_at)
   - `mechanics` (created_at for workshop mechanics)
   - `admin_actions` (created_at)

### ❌ What We're Missing (Gaps)

1. **No structured event tracking system**
2. **No analytics dashboard for monitoring**
3. **No email delivery tracking (success/failure)**
4. **No funnel drop-off analysis**
5. **No workshop health scoring**
6. **No automated alerts for issues**
7. **No time-to-approval tracking**
8. **No mechanic invitation acceptance rate tracking**

---

## Analytics Architecture

### Three-Tier Approach

```
┌─────────────────────────────────────────────────┐
│         TIER 1: EVENT TRACKING                  │
│  (Capture every meaningful action)              │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│         TIER 2: METRICS AGGREGATION             │
│  (Daily/Weekly summaries & KPIs)                │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│         TIER 3: DASHBOARDS & ALERTS             │
│  (Visual monitoring & notifications)            │
└─────────────────────────────────────────────────┘
```

---

## TIER 1: Event Tracking System

### New Database Table: `workshop_events`

```sql
CREATE TABLE workshop_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Event identification
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL, -- 'signup', 'approval', 'invitation', 'email', 'activity'

  -- Entity references
  workshop_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  mechanic_id UUID,
  admin_id UUID REFERENCES auth.users(id),

  -- Event metadata
  metadata JSONB,

  -- Session tracking
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,

  -- Outcome tracking
  success BOOLEAN DEFAULT true,
  error_message TEXT,

  -- Performance
  duration_ms INTEGER,

  -- Indexes for fast querying
  INDEX idx_workshop_events_type (event_type),
  INDEX idx_workshop_events_category (event_category),
  INDEX idx_workshop_events_workshop (workshop_id),
  INDEX idx_workshop_events_created (created_at DESC)
);
```

### Event Types to Track

#### 1. **Signup Funnel Events**
```typescript
- 'workshop_signup_started'      // User lands on signup page
- 'workshop_signup_step_1'       // Basic info completed
- 'workshop_signup_step_2'       // Business details completed
- 'workshop_signup_step_3'       // Service details completed
- 'workshop_signup_submitted'    // Form submitted
- 'workshop_signup_success'      // Workshop created
- 'workshop_signup_failed'       // Signup error
```

#### 2. **Approval Process Events**
```typescript
- 'workshop_application_viewed'  // Admin views application
- 'workshop_approved'            // Admin approves
- 'workshop_rejected'            // Admin rejects
- 'workshop_approval_time'       // Time from submit to decision
```

#### 3. **Email Events**
```typescript
- 'email_approval_sent'          // Approval email sent
- 'email_approval_failed'        // Email send failed
- 'email_rejection_sent'         // Rejection email sent
- 'email_rejection_failed'       // Email send failed
- 'email_invite_sent'            // Mechanic invite sent
- 'email_invite_failed'          // Invite send failed
```

#### 4. **Mechanic Invitation Events**
```typescript
- 'mechanic_invited'             // Workshop sends invite
- 'mechanic_invite_viewed'       // Invite code accessed
- 'mechanic_invite_accepted'     // Mechanic signs up
- 'mechanic_invite_expired'      // Invite expired unused
```

#### 5. **Workshop Activity Events**
```typescript
- 'workshop_dashboard_accessed'  // Owner logs in to dashboard
- 'workshop_profile_updated'     // Workshop edits profile
- 'workshop_first_mechanic'      // First mechanic joins
- 'workshop_capacity_reached'    // Hit mechanic capacity
```

---

## TIER 2: Metrics & KPIs

### New Database Table: `workshop_metrics`

```sql
CREATE TABLE workshop_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Time period
  metric_date DATE NOT NULL,
  metric_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'

  -- Signup funnel metrics
  signups_started INTEGER DEFAULT 0,
  signups_completed INTEGER DEFAULT 0,
  signups_failed INTEGER DEFAULT 0,
  signup_conversion_rate DECIMAL(5,2),

  -- Approval metrics
  applications_pending INTEGER DEFAULT 0,
  applications_approved INTEGER DEFAULT 0,
  applications_rejected INTEGER DEFAULT 0,
  avg_approval_time_hours DECIMAL(10,2),

  -- Invitation metrics
  invites_sent INTEGER DEFAULT 0,
  invites_accepted INTEGER DEFAULT 0,
  invites_expired INTEGER DEFAULT 0,
  invite_acceptance_rate DECIMAL(5,2),

  -- Email metrics
  emails_sent INTEGER DEFAULT 0,
  emails_failed INTEGER DEFAULT 0,
  email_success_rate DECIMAL(5,2),

  -- Workshop health
  active_workshops INTEGER DEFAULT 0,
  workshops_with_mechanics INTEGER DEFAULT 0,
  total_mechanics_invited INTEGER DEFAULT 0,
  total_mechanics_active INTEGER DEFAULT 0,

  -- Performance
  avg_page_load_ms INTEGER,
  api_errors INTEGER DEFAULT 0,

  UNIQUE(metric_date, metric_type)
);
```

### Key Performance Indicators (KPIs)

#### Business KPIs
1. **Workshop Acquisition**
   - Signups per week
   - Approval rate
   - Time to first approval
   - Beta target: 3-5 workshops in 60 days

2. **Workshop Engagement**
   - % workshops with >0 mechanics
   - % workshops with >3 mechanics
   - Average mechanics per workshop
   - Dashboard login frequency

3. **Mechanic Network Growth**
   - Invitations sent per workshop
   - Invitation acceptance rate
   - Target: 70%+ acceptance rate
   - Average time from invite to signup

4. **Operational Efficiency**
   - Average approval time (target: <24 hours)
   - % applications approved
   - Admin workload (applications per day)

#### Technical KPIs
1. **System Health**
   - API error rate (target: <1%)
   - Email delivery rate (target: >98%)
   - Page load times (target: <3s)

2. **Data Quality**
   - % complete workshop profiles
   - % verified business registrations
   - % workshops with valid tax IDs

---

## TIER 3: Dashboards & Alerts

### Dashboard 1: Admin Workshop Overview

**Location:** `/admin/workshops/analytics`

**Widgets:**
```
┌─────────────────────────────────────────────────┐
│  WORKSHOP FUNNEL (Last 30 Days)                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Started:     25  ████████████████████████  100%│
│  Completed:   18  ████████████████░░░░░░░░   72%│
│  Approved:    15  ██████████████░░░░░░░░░░   60%│
│  Active:      12  ████████████░░░░░░░░░░░░   48%│
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  PENDING APPLICATIONS                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Total Pending:           3                     │
│  Oldest Application:      2 days ago            │
│  Avg Wait Time:          18 hours               │
│  🔴 ALERT: 1 app > 24hrs                        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  APPROVAL STATS (Last 7 Days)                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Approved:    12     ████████████████  85.7%    │
│  Rejected:     2     ██░░░░░░░░░░░░░░  14.3%    │
│  Avg Decision Time:  14 hours                   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  MECHANIC INVITATIONS                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Sent (7d):       45                            │
│  Accepted (7d):   32                            │
│  Acceptance Rate: 71.1%  ✅ Above 70% target    │
│  Expired (7d):     5                            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  EMAIL DELIVERY HEALTH                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Sent Today:      28                            │
│  Failed Today:     1                            │
│  Success Rate:   96.4%  ⚠️ Below 98% target     │
│  Last Failure:   15 mins ago (Resend API error) │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  ACTIVE WORKSHOPS MAP                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  [Map of Ontario showing workshop locations]    │
│  Total Active: 12                               │
│  GTA: 8   Ottawa: 2   Hamilton: 1   London: 1   │
└─────────────────────────────────────────────────┘
```

### Dashboard 2: Workshop Health Scorecard

**Location:** `/admin/workshops/health`

**Per-Workshop Metrics:**
```
Workshop: Toronto Auto Specialists
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Health Score: 85/100  🟢 Healthy

┌─────────────────────┬──────────┬────────────┐
│ Metric              │ Value    │ Status     │
├─────────────────────┼──────────┼────────────┤
│ Mechanics           │ 7/10     │ 🟢 Good    │
│ Active Mechanics    │ 6/7      │ 🟢 Good    │
│ Profile Complete    │ 95%      │ 🟢 Good    │
│ Invite Accept Rate  │ 80%      │ 🟢 Excellent│
│ Last Login          │ 2h ago   │ 🟢 Active  │
│ Sessions (30d)      │ 45       │ 🟢 Good    │
│ Revenue (30d)       │ $3,450   │ 🟢 Growing │
└─────────────────────┴──────────┴────────────┘

Recent Activity:
• 2 hours ago: Dashboard accessed
• 1 day ago: Invited mechanic (accepted)
• 3 days ago: Completed 3 sessions
```

### Dashboard 3: Beta Program Tracker

**Location:** `/admin/workshops/beta`

**For Q1 2026 Launch:**
```
┌─────────────────────────────────────────────────┐
│  BETA PROGRAM STATUS                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Start Date:   March 15, 2026                   │
│  End Date:     May 15, 2026 (60 days)           │
│  Days Elapsed: 23 / 60                          │
│  Progress:     ████████░░░░░░░░░░░░░  38%       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  BETA WORKSHOP TARGET                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Target:  3-5 workshops                         │
│  Current: 4 workshops  ✅ In target range       │
│                                                 │
│  1. Toronto Auto Specialists  (Day 1)           │
│  2. Mississauga Car Care      (Day 8)           │
│  3. Ottawa Auto Experts       (Day 15)          │
│  4. Hamilton Motor Works      (Day 20)          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  BETA SUCCESS METRICS                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Total Mechanics Onboarded:  28                 │
│  Total Sessions Completed:   156                │
│  Avg Workshop Satisfaction:  4.6/5  ⭐⭐⭐⭐⭐   │
│  Platform Uptime:           99.8%  ✅           │
│  Email Delivery:            98.5%  ✅           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  READINESS FOR SCALE                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  ✅ Avg approval time < 24h                     │
│  ✅ Invite acceptance > 70%                     │
│  ✅ Email delivery > 98%                        │
│  ✅ All beta workshops active                   │
│  ⚠️  Need to document common issues             │
│  ⏳ Corporate features pending (Phase 2)        │
└─────────────────────────────────────────────────┘
```

---

## Automated Alerts

### Alert System Configuration

**Table:** `workshop_alerts`

```sql
CREATE TABLE workshop_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'critical', 'warning', 'info'

  title TEXT NOT NULL,
  message TEXT NOT NULL,

  workshop_id UUID REFERENCES organizations(id),

  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,

  metadata JSONB,

  INDEX idx_alerts_unacknowledged (acknowledged, created_at DESC),
  INDEX idx_alerts_severity (severity, created_at DESC)
);
```

### Alert Rules

#### CRITICAL Alerts (Immediate Action Required)

1. **Application Stuck**
   ```
   Trigger: Application pending > 48 hours
   Action: Email admin team
   Message: "Workshop application #{id} has been pending for 48+ hours"
   ```

2. **Email System Down**
   ```
   Trigger: >5 email failures in 1 hour
   Action: Email tech team + Slack
   Message: "Email system experiencing high failure rate"
   ```

3. **Workshop Churned**
   ```
   Trigger: Active workshop inactive for 14 days (no logins, no invites)
   Action: Email account manager
   Message: "Workshop {name} showing signs of churn"
   ```

#### WARNING Alerts (Monitor Closely)

1. **Low Invite Acceptance**
   ```
   Trigger: Workshop invite acceptance < 50% (min 5 invites)
   Action: Dashboard notification
   Message: "Workshop {name} has low invite acceptance (need support?)"
   ```

2. **Approval Backlog**
   ```
   Trigger: >5 pending applications
   Action: Email admin team
   Message: "Workshop approval backlog building up"
   ```

3. **Slow Approval Time**
   ```
   Trigger: Avg approval time > 36 hours (rolling 7 days)
   Action: Dashboard notification
   Message: "Average approval time exceeding target"
   ```

#### INFO Alerts (Good News!)

1. **Beta Milestone**
   ```
   Trigger: Beta workshop count reaches target
   Action: Dashboard celebration banner
   Message: "🎉 Beta target achieved! {count} workshops onboarded"
   ```

2. **Workshop Thriving**
   ```
   Trigger: Workshop reaches 80% capacity with high activity
   Action: Email workshop owner (upsell opportunity)
   Message: "Consider increasing mechanic capacity?"
   ```

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2) ⏳

**Tasks:**
1. Create `workshop_events` table
2. Create `workshop_metrics` table
3. Create `workshop_alerts` table
4. Build event tracking service
5. Add event tracking to all workshop endpoints

**Deliverables:**
- Database migrations
- Event tracking library
- Documentation

### Phase 2: Data Collection (Week 3-4) ⏳

**Tasks:**
1. Instrument all workshop signup flow
2. Instrument admin approval flow
3. Instrument mechanic invitation flow
4. Add email tracking (success/failure)
5. Build daily metrics aggregation job

**Deliverables:**
- All events being captured
- Daily metrics populating
- Test data validation

### Phase 3: Dashboards (Week 5-6) ⏳

**Tasks:**
1. Build Admin Workshop Overview dashboard
2. Build Workshop Health Scorecard
3. Build Beta Program Tracker
4. Create alert notification system
5. Set up email/Slack notifications

**Deliverables:**
- 3 functional dashboards
- Alert system active
- Admin team trained

### Phase 4: Optimization (Week 7-8) ⏳

**Tasks:**
1. Add advanced filtering/search
2. Build custom report generator
3. Add data export capabilities
4. Performance optimization
5. Documentation completion

**Deliverables:**
- Production-ready analytics
- User documentation
- Performance benchmarks

---

## Technical Architecture

### Event Tracking Service

**File:** `src/lib/analytics/workshopEvents.ts`

```typescript
type WorkshopEventType =
  | 'workshop_signup_started'
  | 'workshop_signup_submitted'
  | 'workshop_approved'
  | 'email_sent'
  // ... all event types

interface TrackEventParams {
  eventType: WorkshopEventType
  workshopId?: string
  userId?: string
  metadata?: Record<string, any>
  success?: boolean
  errorMessage?: string
  durationMs?: number
}

export async function trackWorkshopEvent(params: TrackEventParams) {
  // Insert into workshop_events table
  // Handle errors gracefully (don't break main flow)
  // Log failures for investigation
}
```

### Metrics Aggregation Job

**File:** `src/app/api/cron/aggregate-workshop-metrics/route.ts`

```typescript
// Runs daily at 1 AM
// Aggregates yesterday's events into workshop_metrics
// Calculates KPIs
// Triggers alerts if thresholds exceeded
```

### Alert Engine

**File:** `src/lib/analytics/workshopAlerts.ts`

```typescript
// Checks alert rules
// Creates alert records
// Sends notifications (email/Slack)
// Updates dashboard
```

---

## Success Metrics for Analytics System

### We'll know the analytics system is working when:

1. ✅ **Admin can answer in <30 seconds:**
   - How many workshops signed up this week?
   - What's our current approval time?
   - Which workshops need attention?
   - Are emails being delivered?

2. ✅ **Proactive Issue Detection:**
   - Stuck applications flagged automatically
   - Email issues detected before user complaints
   - Workshop churn risk identified early

3. ✅ **Data-Driven Decisions:**
   - Know which signup steps cause drop-off
   - Understand why workshops get rejected
   - Optimize invite acceptance rates

4. ✅ **Beta Program Visibility:**
   - Track progress toward 3-5 workshop goal
   - Monitor beta workshop health
   - Identify scaling readiness

---

## Future Enhancements (Post-Beta)

1. **Predictive Analytics**
   - Workshop churn prediction
   - Mechanic acceptance likelihood
   - Revenue forecasting

2. **A/B Testing Framework**
   - Test different signup flows
   - Test email templates
   - Test approval criteria

3. **Workshop Segmentation**
   - By size (small/medium/large)
   - By activity level
   - By geography
   - By performance

4. **Automated Insights**
   - Weekly email digest to admins
   - Anomaly detection
   - Trend analysis

---

## Cost Estimation

### Database Storage
- Events: ~1000 events/day × 365 days = 365K rows/year
- Metrics: ~365 rows/year (daily aggregation)
- Alerts: ~100 rows/month = 1.2K rows/year
- **Total:** ~367K rows/year ≈ Minimal cost on Supabase

### Processing
- Daily aggregation: <5 min/day
- Real-time event inserts: <10ms each
- **Cost:** Negligible (fits in free tier)

### External Services
- Slack webhooks: Free
- Email alerts via Resend: <100 emails/month (free tier)
- **Total External Cost:** $0/month

---

## Next Steps

### Immediate (This Session)
1. ✅ Review and approve this analytics plan
2. ⏳ Create database migration for new tables
3. ⏳ Build event tracking service
4. ⏳ Instrument workshop signup flow

### This Week
5. ⏳ Instrument admin approval flow
6. ⏳ Instrument mechanic invitation flow
7. ⏳ Build metrics aggregation job
8. ⏳ Create basic admin dashboard

### Before Beta Launch (Pre-March 2026)
9. ⏳ Complete all 3 dashboards
10. ⏳ Set up alert system
11. ⏳ Test with sample data
12. ⏳ Train admin team

---

**Ready to implement?** Let's start with Phase 1: Foundation!
