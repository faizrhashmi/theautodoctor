# Final Implementation Plan - Three-Mechanic Model
**Date**: 2025-01-09
**Status**: Ready to Implement

---

## 🎯 EXECUTIVE SUMMARY

**What We're Building:**
A complete three-mechanic-type system with proper access controls, location-based matching, and improved UX.

**Three Mechanic Types:**
1. **Virtual-Only** - Remote diagnostics, 70/30 split, can escalate to RFQ
2. **Independent Workshop Owner/Operator** - Own shop, dual dashboard access, full control
3. **Workshop Employee** - Controlled by workshop admin, restricted access, payments to workshop

**Timeline**: 3-4 weeks
**Effort**: ~120-150 hours
**Risk**: Low (backward compatible)

---

## 📋 IMPLEMENTATION TASKS

### **PHASE 1: ACCESS CONTROL & PERMISSIONS (Week 1)**

#### Task 1.1: Block Workshop Employees from Earnings/Analytics
**Priority**: CRITICAL
**Files**:
- `src/app/api/mechanics/earnings/route.ts`
- `src/app/api/mechanics/analytics/route.ts`
- `src/app/mechanic/earnings/page.tsx`
- `src/app/mechanic/analytics/page.tsx`

**Changes**:
1. Add mechanic type check in earnings API (after line 20)
2. Add mechanic type check in analytics API (after line 20)
3. Add frontend access guard in earnings page
4. Add frontend access guard in analytics page

**Acceptance Criteria**:
- ✅ Workshop employee accessing `/mechanic/earnings` → 403 Forbidden
- ✅ Workshop employee accessing `/mechanic/analytics` → 403 Forbidden
- ✅ Virtual-only mechanic → Can access both ✅
- ✅ Independent mechanic → Can access both ✅

---

#### Task 1.2: Filter Sidebar Based on Mechanic Type
**Priority**: HIGH
**Files**:
- `src/components/mechanic/MechanicSidebar.tsx`

**Changes**:
1. Fetch mechanic type from profile
2. Filter navigation items based on type
3. Hide "Earnings" and "Analytics" for workshop employees
4. Optionally hide "Quotes" for virtual-only mechanics

**Acceptance Criteria**:
- ✅ Workshop employee sidebar: NO earnings, NO analytics
- ✅ Virtual-only sidebar: NO quotes (or greyed out)
- ✅ Independent sidebar: All items visible
- ✅ Owner/operator sidebar: All items visible

---

#### Task 1.3: Differentiate Dashboard by Mechanic Type
**Priority**: MEDIUM
**Files**:
- `src/app/mechanic/dashboard/page.tsx`

**Changes**:
1. Detect mechanic type on dashboard load
2. Show different stats/widgets based on type:
   - Virtual-only: Sessions, referrals, escalations
   - Independent: Sessions, quotes, revenue
   - Workshop employee: Sessions only, no revenue

**Acceptance Criteria**:
- ✅ Workshop employee dashboard: NO revenue widgets
- ✅ Virtual-only dashboard: Referral widget visible
- ✅ Independent dashboard: Full revenue widgets

---

### **PHASE 2: WORKSHOP ADMIN CONTROLS (Week 1-2)**

#### Task 2.1: Workshop Admin Availability Control
**Priority**: CRITICAL (Legal protection)
**Files**:
- NEW: `src/app/workshop/mechanics/[mechanicId]/availability/page.tsx`
- NEW: `src/app/api/workshop/mechanics/[mechanicId]/availability/route.ts`
- MODIFY: `src/app/workshop/dashboard/page.tsx` (add availability tab)

**Changes**:
1. Create API endpoint for workshop admin to set employee availability
2. Create UI for workshop admin to manage availability schedules
3. Add weekly schedule editor (Mon-Sun, start/end times)
4. Update matching algorithm to respect workshop-set availability
5. Prevent employee mechanics from overriding workshop-set availability

**Database Schema**:
```sql
-- New table for workshop-controlled availability
CREATE TABLE workshop_mechanic_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID REFERENCES organizations(id) NOT NULL,
  mechanic_id UUID REFERENCES mechanics(id) NOT NULL,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workshop_id, mechanic_id, day_of_week, start_time)
);

-- Index for fast lookups
CREATE INDEX idx_workshop_schedules_lookup
ON workshop_mechanic_schedules(mechanic_id, day_of_week, is_active);
```

**Acceptance Criteria**:
- ✅ Workshop admin can set employee schedule (9am-5pm Mon-Fri)
- ✅ Platform only shows employee during those hours
- ✅ Customer cannot book employee outside workshop-set hours
- ✅ Employee mechanic cannot override workshop schedule
- ✅ Legal protection: Platform respects employment contract

---

#### Task 2.2: Workshop Admin Dashboard - Team Availability Tab
**Priority**: HIGH
**Files**:
- `src/app/workshop/dashboard/page.tsx`

**Changes**:
1. Add "Team Availability" tab to workshop dashboard
2. Show all mechanics with current availability status
3. Quick toggle: "Set Mike as Available/Unavailable"
4. Link to detailed schedule editor

**UI Design**:
```
┌─────────────────────────────────────────────────────┐
│ Team Availability                                   │
├─────────────────────────────────────────────────────┤
│ Mike Johnson                    🟢 Available Now    │
│ Monday-Friday: 9:00 AM - 5:00 PM                   │
│ [Edit Schedule] [Set Unavailable]                  │
├─────────────────────────────────────────────────────┤
│ Sarah Smith                     🔴 Off Shift        │
│ Monday-Friday: 8:00 AM - 4:00 PM                   │
│ [Edit Schedule] [Set Available]                    │
└─────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- ✅ Workshop admin sees all employee mechanics
- ✅ Quick availability toggle works
- ✅ Current status reflects actual availability
- ✅ "Edit Schedule" opens detailed editor

---

### **PHASE 3: LOCATION & MATCHING (Week 2)**

#### Task 3.1: Add Postal Code to Mechanic Profiles
**Priority**: HIGH
**Files**:
- `src/components/mechanic/LocationSelector.tsx`
- `src/app/mechanic/profile/MechanicProfileClient.tsx`
- `src/app/api/mechanics/[mechanicId]/profile/route.ts`

**Changes**:
1. Add postal code field to LocationSelector component
2. Update profile update API to accept postal_code
3. Add postal code validation (Canadian format: A1A 1A1)
4. Update mechanic profile edit page to include postal code

**Acceptance Criteria**:
- ✅ Mechanic can enter postal code in profile
- ✅ Postal code saved to database (mechanics.postal_code)
- ✅ Postal code validation works (Canadian format)
- ✅ FSA (first 3 chars) used for location matching

---

#### Task 3.2: Replace City Dropdown with Province + Free-Text
**Priority**: HIGH
**Files**:
- `src/components/mechanic/LocationSelector.tsx`
- `src/app/mechanic/signup/page.tsx`

**Changes**:
1. Replace city dropdown with:
   - Province dropdown (all Canadian provinces)
   - Free-text city input with autocomplete suggestions
   - Postal code input (already exists in signup)
2. Update LocationSelector to accept all three fields
3. Remove dependency on cities API endpoint

**UI Design**:
```
Province: [Ontario ▼]
City: [Toronto___________] (autocomplete suggestions)
Postal Code: [M5H 2N2________] (format: A1A 1A1)
```

**Acceptance Criteria**:
- ✅ Province dropdown shows all Canadian provinces
- ✅ City is free-text with optional autocomplete
- ✅ Postal code enforces Canadian format
- ✅ No dependency on cities API
- ✅ Works in both signup and profile edit

---

#### Task 3.3: Fix Availability Sync (Clock-in Updates is_available)
**Priority**: MEDIUM
**Files**:
- `src/app/api/mechanics/clock-in/route.ts`
- `src/app/api/mechanics/clock-out/route.ts`
- Database trigger or backend logic

**Changes**:
1. When mechanic clocks in → Set `mechanics.is_available = true`
2. When mechanic clocks out → Set `mechanics.is_available = false`
3. Add real-time sync to matching algorithm
4. Update mechanic presence in SessionWizard

**Acceptance Criteria**:
- ✅ Mechanic clocks in → Shows as available in SessionWizard
- ✅ Mechanic clocks out → Disappears from available mechanics
- ✅ Real-time updates (within 5 seconds)
- ✅ Works for all three mechanic types

---

### **PHASE 4: CUSTOMER UX IMPROVEMENTS (Week 2-3)**

#### Task 4.1: Workshop Badge in SessionWizard
**Priority**: HIGH
**Files**:
- `src/components/customer/MechanicSelectionCard.tsx`
- `src/components/customer/SessionWizard.tsx`

**Changes**:
1. Add workshop affiliation display to mechanic cards
2. Show badge: "Mike Johnson (AutoFix Workshop)"
3. Add workshop filter: "Show only independent" or "Show workshop-affiliated"
4. Update booking confirmation to show workshop name

**UI Design**:
```
┌─────────────────────────────────────────────┐
│ Mike Johnson ★★★★★ (4.9)                   │
│ 🏢 AutoFix Workshop                         │
│ Honda, Toyota Specialist                   │
│ 📍 Toronto, ON                              │
│ 🟢 Available now                            │
│ 💰 $50/session                              │
│ [Book with Mike]                            │
└─────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- ✅ Customer sees workshop affiliation before booking
- ✅ Workshop badge clearly visible
- ✅ Independent mechanics show "Independent" badge
- ✅ Filter by mechanic type works

---

#### Task 4.2: Auto-Match Preview in SessionWizard
**Priority**: HIGH
**Files**:
- `src/components/customer/SessionWizard.tsx`

**Changes**:
1. When "First Available" selected → Show top matched mechanic
2. Display match score and reasons
3. Beautiful preview card with mechanic info
4. "See other mechanics" button to browse alternatives

**UI Design**:
```
┌─────────────────────────────────────────────┐
│ 🎯 We Found Your Perfect Match!            │
├─────────────────────────────────────────────┤
│ Mike Johnson ★★★★★ (4.9)                   │
│ Match Score: 95%                            │
│                                             │
│ Why Mike?                                   │
│ ✓ Honda specialist (your car: 2015 Civic) │
│ ✓ Red Seal certified                       │
│ ✓ Available now                             │
│ ✓ 4.9 average rating (127 reviews)        │
│                                             │
│ [Continue with Mike] [See Other Mechanics] │
└─────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- ✅ Auto-match preview shows immediately
- ✅ Match score and reasons displayed
- ✅ Customer can accept or browse alternatives
- ✅ Beautiful UI with loading states

---

#### Task 4.3: Improve SessionWizard UI (Reduce Clutter)
**Priority**: MEDIUM
**Files**:
- `src/components/customer/SessionWizard.tsx`

**Changes**:
1. Simplify step progression (reduce visual noise)
2. Use accordions/collapsible sections
3. Better spacing and typography
4. Loading states with skeleton screens
5. Clear CTA buttons with better hierarchy

**Before/After**:
```
BEFORE: Cluttered, information overload
- All options visible at once
- Overwhelming text
- Poor visual hierarchy

AFTER: Clean, progressive disclosure
- One section focus at a time
- Clear next steps
- Visual breathing room
- Smooth transitions
```

**Acceptance Criteria**:
- ✅ Visual clutter reduced by 50%
- ✅ Clear step progression
- ✅ Mobile-friendly layout
- ✅ Faster perceived performance

---

### **PHASE 5: VIRTUAL MECHANIC FEATURES (Week 3)**

#### Task 5.1: Virtual Mechanic Escalation to RFQ
**Priority**: MEDIUM
**Files**:
- NEW: `src/components/mechanic/EscalateToRFQButton.tsx`
- NEW: `src/app/api/sessions/[sessionId]/escalate/route.ts`
- MODIFY: `src/app/mechanic/sessions/[sessionId]/page.tsx`

**Changes**:
1. Add "Escalate to RFQ" button in virtual session interface
2. Auto-populate RFQ from session data:
   - Customer info
   - Vehicle details
   - Issue description
   - Diagnostic notes/findings
3. Create RFQ in marketplace
4. Notify customer: "Issue escalated to local workshops"
5. Track referral fee (2%) when quote accepted

**Workflow**:
```
Virtual Session → Mechanic Diagnosis → "Needs Physical Repair"
                                              ↓
                                    [Escalate to RFQ]
                                              ↓
                         RFQ Posted to Marketplace
                                              ↓
                              Workshops Submit Bids
                                              ↓
                         Customer Accepts Best Bid
                                              ↓
                    Virtual Mechanic Earns 2% Referral Fee
```

**Acceptance Criteria**:
- ✅ Virtual mechanic can escalate during session
- ✅ RFQ auto-created with session data
- ✅ Customer notified of escalation
- ✅ Referral tracking works
- ✅ 2% fee paid when quote accepted

---

### **PHASE 6: TESTING & DOCUMENTATION (Week 3-4)**

#### Task 6.1: Create Test Users for All Three Types
**Priority**: HIGH

**Test Users Required**:

1. **Virtual-Only Mechanic**
   - Email: `virtual.mechanic@test.com`
   - Password: `Test1234!`
   - Type: VIRTUAL_ONLY
   - Features: Sessions, Earnings, Analytics, RFQ Escalation
   - Restrictions: Cannot create quotes

2. **Independent Workshop Owner/Operator**
   - Email: `independent.workshop@test.com`
   - Password: `Test1234!`
   - Type: INDEPENDENT_WORKSHOP
   - Features: Dual dashboard, Sessions, Quotes, Full earnings
   - Restrictions: None

3. **Workshop Employee Mechanic**
   - Email: `workshop.employee@test.com`
   - Password: `Test1234!`
   - Type: WORKSHOP_AFFILIATED
   - Workshop: Test Auto Shop
   - Features: Sessions only
   - Restrictions: NO earnings, NO analytics, NO quotes

4. **Workshop Admin**
   - Email: `workshop.admin@test.com`
   - Password: `Test1234!`
   - Type: Workshop account
   - Features: Employee management, Availability control, Earnings
   - Restrictions: Cannot perform sessions

5. **Test Customer**
   - Email: `test.customer@test.com`
   - Password: `Test1234!`
   - Vehicle: 2015 Honda Civic
   - Purpose: Book sessions, test matching, test RFQ

**Script**: Create SQL script to generate all test users with proper data

---

#### Task 6.2: End-to-End Testing Scenarios
**Priority**: HIGH

**Test Scenarios**:

1. **Scenario 1: Virtual Mechanic Escalation**
   - Customer books virtual session
   - Virtual mechanic diagnoses issue
   - Mechanic escalates to RFQ
   - Workshops submit bids
   - Customer accepts bid
   - Verify 2% referral fee to virtual mechanic

2. **Scenario 2: Workshop Employee Availability**
   - Workshop admin sets employee schedule (9am-5pm)
   - Customer tries to book at 8am → Employee NOT shown
   - Customer tries to book at 2pm → Employee shown
   - Employee tries to override schedule → Blocked
   - Verify legal compliance

3. **Scenario 3: Independent Workshop Quote**
   - Customer books with independent mechanic
   - Mechanic creates quote
   - Customer accepts quote
   - Work order created
   - Payment to mechanic's Stripe account
   - Verify 70/30 split

4. **Scenario 4: Workshop Badge Display**
   - Customer opens SessionWizard
   - Sees both independent and workshop-affiliated mechanics
   - Workshop mechanics show "(Workshop Name)" badge
   - Customer filters by type
   - Booking confirmation shows workshop name

5. **Scenario 5: Access Control**
   - Workshop employee logs in
   - Sidebar: NO earnings, NO analytics
   - Tries to access `/mechanic/earnings` → 403 Forbidden
   - Dashboard: NO revenue widgets
   - Verify restrictions work

---

#### Task 6.3: Update Documentation
**Priority**: MEDIUM
**Files**:
- `IMPLEMENTATION_SUMMARY.md`
- `FINAL_IMPLEMENTATION_PLAN.md` (this file)
- `README.md`

**Changes**:
1. Document all three mechanic types
2. Update business model explanation
3. Document API endpoints
4. Add testing guide
5. Update deployment checklist

---

## 📊 COMPLETION CHECKLIST

### Phase 1: Access Control (Week 1)
- [ ] Block workshop employees from earnings API
- [ ] Block workshop employees from analytics API
- [ ] Filter sidebar by mechanic type
- [ ] Differentiate dashboard by type
- [ ] Add frontend access guards

### Phase 2: Workshop Admin (Week 1-2)
- [ ] Create workshop_mechanic_schedules table
- [ ] Build availability control API
- [ ] Build availability control UI
- [ ] Add team availability tab to dashboard
- [ ] Update matching algorithm

### Phase 3: Location & Matching (Week 2)
- [ ] Add postal code to profile
- [ ] Replace city dropdown with province + free-text
- [ ] Fix clock-in/out availability sync
- [ ] Test location-based matching

### Phase 4: Customer UX (Week 2-3)
- [ ] Add workshop badges to mechanic cards
- [ ] Build auto-match preview
- [ ] Improve SessionWizard UI
- [ ] Test end-to-end booking flow

### Phase 5: Virtual Features (Week 3)
- [ ] Build RFQ escalation flow
- [ ] Create escalation API
- [ ] Add escalation button to session UI
- [ ] Track referral fees
- [ ] Test escalation workflow

### Phase 6: Testing (Week 3-4)
- [ ] Create 5 test users (script)
- [ ] Test scenario 1: Virtual escalation
- [ ] Test scenario 2: Availability control
- [ ] Test scenario 3: Independent quote
- [ ] Test scenario 4: Workshop badges
- [ ] Test scenario 5: Access control
- [ ] Update documentation

---

## 🚀 DEPLOYMENT PLAN

### Pre-Deployment
1. ✅ All tests passing
2. ✅ Test users validated
3. ✅ Documentation updated
4. ✅ Database migrations tested
5. ✅ Stripe test mode working

### Deployment Steps
1. Create database migration for `workshop_mechanic_schedules`
2. Deploy backend changes (API routes)
3. Deploy frontend changes (UI components)
4. Test in staging environment
5. Legal review of Terms of Service updates
6. Production deployment (off-peak hours)
7. Monitor for 48 hours
8. Gradual rollout (enable feature flags)

### Rollback Plan
1. Feature flags disable new features
2. Database rollback script ready
3. Previous version tagged in git
4. Stripe webhooks unchanged (backward compatible)

---

## 📈 SUCCESS METRICS

### Technical Metrics
- [ ] All API endpoints return < 500ms
- [ ] Zero 500 errors in production
- [ ] Database queries optimized (< 100ms)
- [ ] Frontend load time < 2 seconds

### Business Metrics
- [ ] Workshop adoption rate > 20%
- [ ] Virtual escalation conversion > 15%
- [ ] Customer satisfaction maintained (4.5+)
- [ ] Revenue increase > 25%

### Legal Metrics
- [ ] Zero employment liability claims
- [ ] Terms of Service approved by lawyer
- [ ] Privacy compliance verified
- [ ] Platform remains broker-only

---

## 🎯 FINAL DELIVERABLES

1. ✅ Three mechanic types fully functional
2. ✅ Access control and permissions working
3. ✅ Workshop admin controls implemented
4. ✅ Location-based matching with postal codes
5. ✅ Improved SessionWizard UX
6. ✅ Virtual escalation to RFQ
7. ✅ Complete test suite
8. ✅ Updated documentation
9. ✅ Test users for all scenarios
10. ✅ Legal protection verified

---

**Status**: Ready to begin implementation
**Start Date**: 2025-01-09
**Target Completion**: 2025-02-06 (4 weeks)
**Risk Level**: Low
**Confidence**: High (85-90% of code already exists)
