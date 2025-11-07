# Frontend Implementation Roadmap
## Brand Specialist & Workshop System

**Created:** 2025-10-25
**Status:** Backend 100% Complete | Frontend ~40% Complete

---

## 📊 Gap Analysis: Backend vs Frontend

### ✅ Backend Complete (100%)
- Brand specialist matching system (all tables, columns)
- Location matching (countries: 2, cities: 52)
- Smart 10-factor matching algorithm
- Profile completion calculation engine
- Workshop/organization system with analytics
- Keyword extraction (40+ patterns)
- Revenue split system (migration ready)
- Smart session routing (migration ready)
- Feature flags (5 toggles for gradual rollout)

### ⚠️ Frontend Status (~40% Complete)

#### ✅ What Exists:
1. **Admin Dashboard:**
   - `/admin/profile-completion` - Monitor mechanic profiles
   - `/admin/feature-flags` - Toggle features
   - `/admin/brands` - Manage brands & keywords
   - `/admin/mechanics` - View/filter mechanics

2. **Customer Features:**
   - `EnhancedIntakeForm` - 5-step intake with brand specialist selection
   - Location picker (country + city)
   - Real-time keyword extraction
   - Smart mechanic matching display

3. **Reusable Components:**
   - `BrandSelector` - Multi-select brand picker
   - `ServiceKeywordsSelector` - Category-based keyword picker
   - `LocationSelector` - Country/city picker
   - `ProfileCompletionBanner` - Progress tracker

4. **Workshop Features:**
   - Workshop signup flow (4 steps)
   - Workshop dashboard page (exists)

5. **Mechanic Features:**
   - Mechanic dashboard (exists)
   - Session management
   - Availability calendar

#### ❌ What's Missing (Critical Gaps):

### 🚨 CRITICAL: Components Not Integrated
- **BrandSelector** exists but NOT used in mechanic profile
- **ServiceKeywordsSelector** exists but NOT used in mechanic profile
- **LocationSelector** exists but NOT used in mechanic profile
- **ProfileCompletionBanner** exists but may not show all new fields

### 🚫 Missing Frontend Features:

1. **Mechanic Profile Management:**
   - ❌ No profile edit page for mechanics
   - ❌ No UI to select brand specializations
   - ❌ No UI to select service keywords
   - ❌ No UI to set location (country/city)
   - ❌ No UI to view/improve profile completion
   - ❌ No specialist tier selection/display

2. **Workshop Admin Dashboard:**
   - ❌ Workshop management is placeholder only
   - ❌ No mechanic invitation UI
   - ❌ No workshop analytics visualization
   - ❌ No revenue split configuration
   - ❌ No mechanic roster management
   - ❌ No workshop performance metrics

3. **Pricing & Tier Display:**
   - ❌ No pricing differentiation display ($29.99 vs $49.99)
   - ❌ No specialist tier badges/indicators
   - ❌ No revenue split transparency for workshops
   - ❌ No earnings breakdown by tier

4. **Session Assignment:**
   - ❌ No smart routing UI for mechanics
   - ❌ No match score explanation for mechanics
   - ❌ No "why was I matched" transparency

5. **Onboarding Flows:**
   - ❌ Mechanic onboarding doesn't collect brand specializations
   - ❌ Mechanic onboarding doesn't collect location
   - ❌ Mechanic onboarding doesn't set specialist tier
   - ❌ Workshop onboarding doesn't explain revenue splits

---

## 🎯 Phased Frontend Implementation Plan

### **PHASE 1: Mechanic Profile Completion System**
**Priority:** 🔴 CRITICAL (Blocks brand specialist matching)
**Estimated Time:** 3-4 hours
**Feature Flag:** `require_profile_completion`

#### Tasks:
1. **Create Mechanic Profile Edit Page** (`/mechanic/profile/page.tsx`)
   - Route: `/mechanic/profile` or `/mechanic/settings/profile`
   - Tabbed interface: Basic Info | Specializations | Location | Credentials

2. **Integrate Brand Specialization Selection**
   - Use existing `BrandSelector` component
   - Save to `mechanics.brand_specializations` array
   - Auto-update `mechanics.is_brand_specialist` boolean
   - Show luxury brand badges

3. **Integrate Service Keywords Selection**
   - Use existing `ServiceKeywordsSelector` component
   - Save to `mechanics.service_keywords` array
   - Category-based selection (diagnostic, repair, installation, maintenance)
   - Minimum 3 keywords recommended

4. **Integrate Location Selection**
   - Use existing `LocationSelector` component
   - Save to `mechanics.country`, `mechanics.city`, `mechanics.state_province`, `mechanics.timezone`
   - Show 52 major cities + custom entry option

5. **Update Profile Completion Banner**
   - Ensure it shows brand, keywords, and location fields
   - Add actionable links to profile edit page
   - Show estimated completion time

6. **Add Specialist Tier Selection**
   - Radio buttons: General | Brand Specialist | Master Technician
   - Save to `mechanics.specialist_tier`
   - Show tier benefits and pricing

#### Acceptance Criteria:
- ✅ Mechanic can edit all brand specialist fields
- ✅ Profile completion score updates in real-time
- ✅ Can't accept sessions until 80% complete
- ✅ All components are mobile-responsive
- ✅ Data persists to database correctly

#### Files to Create/Modify:
- **NEW:** `src/app/mechanic/profile/page.tsx`
- **NEW:** `src/app/mechanic/profile/layout.tsx`
- **MODIFY:** `src/components/mechanic/ProfileCompletionBanner.tsx`
- **NEW:** `src/app/api/mechanics/[id]/profile/route.ts` (GET/PATCH)

---

### **PHASE 2: Pricing & Tier Transparency**
**Priority:** 🟠 HIGH (Revenue differentiation)
**Estimated Time:** 2-3 hours
**Feature Flags:** `show_specialist_pricing`, `enable_brand_specialist_matching`

#### Tasks:
1. **Update Customer Intake Form Pricing Display**
   - Show $29.99 for General Service
   - Show $49.99 for Brand Specialist Service
   - Visual tier badges (General vs Specialist)
   - Explain value proposition for each tier

2. **Create Specialist Tier Badges**
   - Reusable component: `SpecialistTierBadge`
   - Colors: Gray (General) | Orange (Brand) | Purple (Master)
   - Show on mechanic cards, profiles, session details

3. **Add Earnings Breakdown for Mechanics**
   - Show mechanic's specialist tier
   - Display pricing tier they qualify for
   - Show potential earnings difference
   - Add to mechanic dashboard stats

4. **Workshop Revenue Split Display**
   - Show revenue split % in workshop dashboard
   - Transparent breakdown: Platform | Workshop | Mechanic
   - Historical earnings by tier

#### Acceptance Criteria:
- ✅ Customers see clear pricing differentiation
- ✅ Mechanics understand their tier and earnings
- ✅ Tier badges consistent across all pages
- ✅ Feature flag can toggle pricing display

#### Files to Create/Modify:
- **NEW:** `src/components/SpecialistTierBadge.tsx`
- **MODIFY:** `src/components/intake/EnhancedIntakeForm.tsx`
- **MODIFY:** `src/app/mechanic/dashboard/page.tsx`
- **NEW:** `src/components/mechanic/EarningsBreakdown.tsx`

---

### **PHASE 3: Workshop Admin Dashboard**
**Priority:** 🟡 MEDIUM (B2B feature)
**Estimated Time:** 5-6 hours
**Feature Flags:** Workshop-specific (new flags needed)

#### Tasks:
1. **Replace Workshop Management Placeholder**
   - Route: `/admin/workshops/page.tsx`
   - Workshop list with filters (active, pending, suspended)
   - Approval workflow UI
   - Workshop detail view

2. **Create Workshop Dashboard for Owners**
   - Route: `/workshop/dashboard/page.tsx`
   - Stats: Total mechanics, active sessions, revenue
   - Mechanic roster table
   - Performance metrics charts

3. **Build Mechanic Invitation System**
   - Route: `/workshop/invite/page.tsx`
   - Email invitation form
   - Invite link generation
   - Pending invitations list
   - Acceptance tracking

4. **Workshop Analytics Visualization**
   - Use `workshop_events` and `workshop_metrics` tables
   - Charts: Invites sent/accepted, revenue over time
   - Mechanic performance leaderboard
   - Session completion rates

5. **Revenue Split Configuration UI**
   - Route: `/workshop/settings/revenue/page.tsx`
   - Display current split percentages
   - Show estimated earnings calculator
   - Explain split tiers (based on volume)

#### Acceptance Criteria:
- ✅ Workshop owners can invite mechanics
- ✅ Workshop owners see analytics dashboard
- ✅ Admin can approve/reject workshop signups
- ✅ Revenue splits are transparent and configurable
- ✅ Workshop events are tracked and displayed

#### Files to Create/Modify:
- **MODIFY:** `src/app/admin/(shell)/workshops/page.tsx`
- **NEW:** `src/app/workshop/dashboard/page.tsx`
- **NEW:** `src/app/workshop/invite/page.tsx`
- **NEW:** `src/app/workshop/settings/revenue/page.tsx`
- **NEW:** `src/components/workshop/InviteForm.tsx`
- **NEW:** `src/components/workshop/AnalyticsCharts.tsx`
- **NEW:** `src/components/workshop/MechanicRoster.tsx`

---

### **PHASE 4: Smart Session Routing & Match Transparency**
**Priority:** 🟡 MEDIUM (User experience)
**Estimated Time:** 3-4 hours
**Feature Flags:** `smart_matching_enabled`, `keyword_extraction_enabled`

#### Tasks:
1. **Session Assignment UI for Mechanics**
   - Route: `/mechanic/sessions/available/page.tsx`
   - Show available session requests
   - Display match score and reasons
   - "Why was I matched?" explanation panel
   - Accept/decline with reasoning

2. **Match Score Breakdown Component**
   - Reusable: `MatchScoreBreakdown`
   - Show 10-factor scoring:
     - Availability: +30
     - Keywords: +25
     - Location: +25 (country) +35 (city)
     - Brand specialist: +20
     - Experience: +15
     - Rating: +15
     - Certifications: +10
     - Response time: +10
     - Pricing: +5
     - Language: +5
   - Visual bar chart per factor

3. **Enhanced Session Request Cards**
   - Show customer's requested brand (if specialist)
   - Show extracted keywords
   - Show customer location
   - Highlight matching factors

4. **Smart Routing Notifications**
   - Real-time notifications when matched
   - Email notifications for high-score matches (>80)
   - Push notifications (future)

#### Acceptance Criteria:
- ✅ Mechanics see why they were matched to sessions
- ✅ Match scores are transparent and actionable
- ✅ Session routing prioritizes best matches
- ✅ Notifications work for high-priority matches
- ✅ Feature flags can disable smart routing

#### Files to Create/Modify:
- **NEW:** `src/app/mechanic/sessions/available/page.tsx`
- **NEW:** `src/components/mechanic/MatchScoreBreakdown.tsx`
- **MODIFY:** `src/components/mechanic/RequestDetailModal.tsx`
- **NEW:** `src/lib/notifications/matchNotifications.ts`

---

### **PHASE 5: Enhanced Onboarding Flows**
**Priority:** 🟢 LOW (Optimization)
**Estimated Time:** 2-3 hours
**Feature Flags:** All existing flags

#### Tasks:
1. **Update Mechanic Signup/Onboarding**
   - Add brand specialization step
   - Add location selection step
   - Add service keywords step
   - Show profile completion progress during onboarding

2. **Workshop Onboarding Enhancements**
   - Add revenue split explanation
   - Add mechanic invitation during signup
   - Show estimated earnings calculator
   - Add workshop benefits page

3. **Welcome Tours & Tooltips**
   - Interactive tour for new mechanics
   - Highlight brand specialist benefits
   - Explain profile completion requirements
   - Show pricing tier benefits

4. **Progressive Disclosure**
   - Show basic fields first
   - Unlock advanced fields at 50% completion
   - Gamify profile completion (badges/achievements)

#### Acceptance Criteria:
- ✅ New mechanics complete profiles faster
- ✅ Onboarding clearly explains brand specialist benefits
- ✅ Profile completion rate improves
- ✅ Time-to-first-session decreases

#### Files to Create/Modify:
- **MODIFY:** `src/app/mechanic/signup/page.tsx`
- **NEW:** `src/components/onboarding/MechanicWelcomeTour.tsx`
- **NEW:** `src/components/onboarding/WorkshopBenefitsPage.tsx`
- **MODIFY:** `src/app/workshop/signup/page.tsx`

---

## 📋 Implementation Summary by Phase

| Phase | Focus Area | Priority | Time | Frontend % Increase |
|-------|-----------|----------|------|---------------------|
| **Phase 1** | Mechanic Profile System | 🔴 CRITICAL | 3-4h | +30% (70% total) |
| **Phase 2** | Pricing & Tiers | 🟠 HIGH | 2-3h | +15% (85% total) |
| **Phase 3** | Workshop Dashboard | 🟡 MEDIUM | 5-6h | +10% (95% total) |
| **Phase 4** | Match Transparency | 🟡 MEDIUM | 3-4h | +3% (98% total) |
| **Phase 5** | Enhanced Onboarding | 🟢 LOW | 2-3h | +2% (100% total) |

**Total Estimated Time:** 15-20 hours
**Current Frontend Completion:** ~40%
**After Phase 1:** ~70% (System operational)
**After Phase 2:** ~85% (Revenue differentiation working)
**After All Phases:** 100% (Feature parity with backend)

---

## 🎯 Business Model Alignment

### Your B2B2C Model:
1. **B2B:** Workshops sign up and invite mechanics
2. **B2C:** Customers book sessions with mechanics
3. **Revenue Split:** Platform | Workshop (if applicable) | Mechanic

### Feature Flag Strategy (Recall):
```javascript
1. require_profile_completion (Phase 1) - Gate session acceptance
2. smart_matching_enabled (Phase 2) - 10-factor algorithm
3. keyword_extraction_enabled (Phase 3) - Auto-extract from descriptions
4. enable_brand_specialist_matching (Phase 4) - Brand-specific matching
5. show_specialist_pricing (Phase 4) - $29.99 vs $49.99 display
```

### Pricing Tiers:
- **General Service:** $29.99 - Any approved mechanic
- **Brand Specialist:** $49.99 - Certified brand specialists only
- **Master Technician:** (Future) Premium tier

### Location Matching:
- Same country: +25 points
- Same city: +35 points
- Different country: -20 penalty
- 2 countries supported: Canada, USA
- 52 major cities pre-loaded

---

## 🚀 Recommended Implementation Order

### Sprint 1 (Week 1): Critical Path
**Goal:** Get brand specialist system operational end-to-end

1. **Day 1-2:** Phase 1 - Mechanic Profile Edit Page
   - Create `/mechanic/profile` page
   - Integrate BrandSelector, ServiceKeywordsSelector, LocationSelector
   - Build profile update API

2. **Day 3:** Phase 2 - Pricing Display
   - Update EnhancedIntakeForm with pricing tiers
   - Create SpecialistTierBadge component
   - Add earnings breakdown to mechanic dashboard

3. **Day 4-5:** Testing & Polish
   - Test full customer → mechanic flow
   - Enable feature flags in staging
   - Fix bugs and edge cases

**Deliverable:** Customers can book brand specialists, mechanics can set specializations

### Sprint 2 (Week 2): Workshop Features
**Goal:** Enable B2B workshop system

1. **Day 1-3:** Phase 3 - Workshop Dashboard
   - Build workshop admin dashboard
   - Create mechanic invitation system
   - Add analytics visualization

2. **Day 4-5:** Phase 4 - Match Transparency
   - Build match score breakdown UI
   - Add session routing interface
   - Create notifications system

**Deliverable:** Workshops can invite mechanics and track performance

### Sprint 3 (Week 3): Optimization
**Goal:** Improve onboarding and user experience

1. **Day 1-2:** Phase 5 - Enhanced Onboarding
   - Update mechanic signup flow
   - Add welcome tours
   - Create progressive disclosure

2. **Day 3-5:** Polish & Launch Prep
   - Bug fixes
   - Performance optimization
   - Documentation
   - Prepare for production rollout

**Deliverable:** Production-ready brand specialist system

---

## 📊 Success Metrics

### Phase 1 Success:
- ✅ 80%+ mechanics complete profile within 7 days
- ✅ Average profile completion score > 85%
- ✅ Brand specialists set up within onboarding

### Phase 2 Success:
- ✅ 30%+ customers choose brand specialist tier
- ✅ Average session price increases to $35+
- ✅ Specialist tier mechanics earn 40%+ more

### Phase 3 Success:
- ✅ 5+ workshops sign up in first month
- ✅ Workshops invite average 10+ mechanics each
- ✅ 60%+ invite acceptance rate

### Phase 4 Success:
- ✅ Match scores average 75+
- ✅ Session acceptance rate improves by 20%
- ✅ Customer satisfaction with matches > 4.5/5

### Phase 5 Success:
- ✅ Onboarding completion rate > 90%
- ✅ Time to first session < 48 hours
- ✅ Profile completion during onboarding > 70%

---

## 🔧 Technical Notes

### Existing Components to Reuse:
- ✅ `BrandSelector` - Already built, just needs integration
- ✅ `ServiceKeywordsSelector` - Already built, just needs integration
- ✅ `LocationSelector` - Already built, just needs integration
- ✅ `ProfileCompletionBanner` - May need updates for new fields

### API Endpoints Already Available:
- ✅ `GET /api/brands`
- ✅ `GET /api/service-keywords`
- ✅ `GET /api/countries`
- ✅ `GET /api/cities?country=CA`
- ✅ `GET /api/mechanics/[id]/profile-completion`
- ✅ `POST /api/keywords/extract`
- ✅ `POST /api/matching/find-mechanics`

### New API Endpoints Needed:
- ❌ `PATCH /api/mechanics/[id]/profile` - Update mechanic profile
- ❌ `GET /api/workshop/[id]/dashboard` - Workshop stats
- ❌ `POST /api/workshop/[id]/invite` - Send mechanic invite
- ❌ `GET /api/workshop/[id]/analytics` - Workshop analytics data

---

## 📝 Next Steps

1. **Review this roadmap** - Validate phases and priorities align with business goals
2. **Choose Phase 1 implementation date** - Block time for mechanic profile system
3. **Set up feature flag toggles** - Prepare for gradual rollout
4. **Create task breakdown** - Break Phase 1 into specific tickets/tasks
5. **Begin Phase 1 implementation** - Start with mechanic profile edit page

---

**Questions to Consider:**
- Do you want to implement all phases, or just Phase 1-2 first?
- Should we prioritize workshop features (Phase 3) or match transparency (Phase 4)?
- Are there any additional frontend features you need that aren't listed?
- What's your target launch date for the brand specialist system?

---

**Document Status:** Draft for Review
**Next Update:** After Phase 1 completion
