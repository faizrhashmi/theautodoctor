# Implementation Plan: B2C → B2B2C Transition (Revised)

**Date**: 2025-10-24
**Workshop Launch Target**: Late Q1 2026 (March-April)
**Current Date**: October 2024
**Time to Workshop Launch**: ~5 months

---

## Strategic Decisions (Confirmed)

### 1. Timeline
- **B2C Public Release**: Q4 2024 - Q1 2025
- **First 3-5 Workshops Onboarding**: Late Q1 2026 (March-April)
- **Workshop Beta Period**: 60 days
- **Full Workshop Rollout**: Q2 2026

**Rationale**: Validate customer traction and payment reliability before scaling Phase 2

---

### 2. Corporate Accounts Strategy
- **Initial Approach**: Sales-led with manual onboarding
- **Workflow**: Manual account creation with contracts, billing, data-sharing clauses
- **Self-Serve Trigger**: After 3-5 enterprise clients successfully onboarded
- **Admin Review**: Required for all corporate signups

**Rationale**: Maintains enterprise-grade trust and compliance while scaling gradually

---

### 3. Mechanic SIN Collection Policy
- **Workshop-Affiliated Mechanics**: EXEMPT from SIN collection
  - Workshop (employer) is the tax remitter
  - Workshop handles CRA reporting
- **Independent Mechanics**: REQUIRED to provide SIN
  - Can sign up without SIN initially
  - **Prompt before first paid session**: "To receive payouts, please provide your SIN or Business Number"
  - Cannot accept paid sessions until SIN provided
  - T4A/T5018 filing requirements

**Rationale**: Reduces friction for workshop employees, maintains CRA compliance for independent contractors

---

### 4. Workshop Commission Split
- **Default Split**: Platform 15% / Workshop 10% / Mechanic 75%
- **Platform Fee**: Fixed at 15% (non-negotiable)
- **Workshop Flexibility**: Can adjust internal split with mechanics (workshop 10% + mechanic 75% = 85% total)
- **Transparency**: All parties see full breakdown

**Example** ($100 session):
- Platform: $15
- Workshop: $10 (default, can be 0-20%)
- Mechanic: $75 (default, can be 65-85%)

**Rationale**: Fair economics, rewards mechanics directly, keeps workshops invested in quality

---

### 5. Beta Testing Workshops
- **Confirmed Beta Partners**: 3-5 Ontario workshops
- **Beta Duration**: 60 days
- **Beta Scope**:
  - Multi-mechanic routing
  - Stripe Connect payouts
  - Workshop admin dashboard
  - Feedback loops
  - Customer experience

**Rationale**: Real-world validation before full rollout, investor confidence in adoption proof

---

## Revised Implementation Roadmap

### Phase 0: Current State → B2C Launch (Now - Q4 2024)

**Focus**: Security hardening, B2C feature completion

**Tasks** (From AUTH_STRATEGY_BEST_PRACTICES.md):
- [x] Encrypt SIN/Business Numbers (CRITICAL)
- [x] Implement rate limiting
- [x] Add phone verification for mechanics
- [x] Enable Google OAuth
- [x] Strengthen password policy
- [ ] Launch B2C publicly

**Timeline**: 4-6 weeks
**Status**: In progress

---

### Phase 1: B2B2C Foundation (Q4 2024 - Q1 2025)

**Goal**: Build workshop infrastructure BEHIND feature toggles while B2C runs

**Timeline**: November 2024 - January 2025 (8-10 weeks)

#### Week 1-2: Database Foundation
**Tasks**:
1. Run database migrations:
   ```sql
   -- Add account type tracking
   ALTER TABLE profiles ADD COLUMN account_type TEXT;
   ALTER TABLE mechanics ADD COLUMN account_type TEXT;
   ALTER TABLE mechanics ADD COLUMN workshop_id UUID;
   ALTER TABLE mechanics ADD COLUMN requires_sin_collection BOOLEAN DEFAULT TRUE;

   -- Create organizations table
   CREATE TABLE organizations (...);

   -- Create organization_members table
   CREATE TABLE organization_members (...);
   ```

2. Backfill existing data:
   ```sql
   UPDATE profiles SET account_type = 'individual_customer' WHERE account_type IS NULL;
   UPDATE mechanics SET account_type = 'individual_mechanic' WHERE account_type IS NULL;
   ```

3. Update existing signup flows to set account_type:
   - Customer signup: `account_type = 'individual_customer'`
   - Mechanic signup: `account_type = 'individual_mechanic'`

**Validation**:
- [ ] All existing signups work unchanged
- [ ] All users have account_type set
- [ ] No production errors

**Feature Toggles Added**:
```sql
INSERT INTO feature_toggles (feature_key, display_name, enabled) VALUES
  ('workshop_signup', 'Workshop Account Signup', false),
  ('workshop_mechanic_invites', 'Workshop Mechanic Invitations', false),
  ('workshop_referrals', 'Workshop Customer Referrals', false),
  ('workshop_routing', 'Workshop Smart Routing', false),
  ('workshop_payments', 'Workshop Payment Splitting', false);
```

---

#### Week 3-4: SIN Collection Flow (Independent Mechanics)

**Goal**: Implement "SIN before first paid session" prompt

**New Flow**:
```
1. Mechanic signs up WITHOUT SIN (skip step in signup)
2. Mechanic profile: requires_sin_collection = true, sin_encrypted = null
3. Mechanic browses available sessions (can see but can't accept paid sessions)
4. Mechanic clicks "Accept Session" on paid session
5. IF requires_sin_collection AND sin_encrypted IS NULL:
   → Show SIN collection modal:
     "To receive payouts for paid sessions, please provide your SIN or Business Number"
     [Input field for SIN]
     [Encrypt and save]
   → After saving: Allow session acceptance
6. IF workshop mechanic (account_type = 'workshop_mechanic'):
   → requires_sin_collection = false
   → No SIN prompt, accept sessions immediately
```

**Files to Update**:
- `/src/app/mechanic/signup/page.tsx` - Make SIN optional during signup
- `/src/app/mechanic/dashboard/page.tsx` - Show "Complete tax info" banner if SIN missing
- `/src/app/api/sessions/accept/route.ts` - Check SIN before accepting paid sessions
- `/src/components/mechanic/SINCollectionModal.tsx` - NEW modal component

**Database Update**:
```sql
ALTER TABLE mechanics ADD COLUMN sin_collection_completed_at TIMESTAMPTZ;

-- Workshop mechanics don't need SIN
UPDATE mechanics
SET requires_sin_collection = false
WHERE account_type = 'workshop_mechanic';
```

**Validation**:
- [ ] Independent mechanics can sign up without SIN
- [ ] Prompt appears when accepting first paid session
- [ ] Workshop mechanics never see SIN prompt
- [ ] SIN properly encrypted when collected

---

#### Week 5-6: Workshop Signup Flow

**Goal**: Create `/workshop/signup` page (DISABLED by toggle)

**New Page**: `/src/app/workshop/signup/page.tsx`

**Flow** (6 steps):
```
1. Business Information
   - Workshop name
   - Business email
   - Business phone
   - Website (optional)
   - Business registration number
   - Tax ID

2. Coverage Area
   - Address
   - City, Province, Postal Code
   - Service radius (km)
   - Postal codes served (multi-select)

3. Certifications & Insurance
   - Business liability insurance
   - Policy number
   - Expiry date
   - Upload insurance certificate
   - Business certifications (optional)

4. Payout Setup
   - Stripe Connect onboarding (redirect)
   - Bank account verification

5. Primary Admin Account
   - Admin name
   - Admin email
   - Admin phone
   - Password

6. Review & Submit
   - Application submitted
   - Admin review (1-2 days)
   - Approval email
```

**API Endpoint**: `/src/app/api/workshop/signup/route.ts`

**Code Snippet**:
```typescript
export async function POST(req: NextRequest) {
  // Check toggle
  const enabled = await isFeatureEnabled('workshop_signup')
  if (!enabled) {
    return Response.json({ error: 'Workshop signups not available yet' }, { status: 403 })
  }

  const formData = await req.json()

  // Create organization
  const { data: org } = await supabase.from('organizations').insert({
    organization_type: 'workshop',
    name: formData.businessName,
    slug: slugify(formData.businessName),
    email: formData.businessEmail,
    phone: formData.businessPhone,
    website: formData.website,
    address: formData.address,
    city: formData.city,
    province: formData.province,
    postal_code: formData.postalCode,
    country: 'Canada',
    business_registration_number: formData.businessRegNumber,
    tax_id: formData.taxId,
    coverage_postal_codes: formData.postalCodes,
    mechanic_capacity: 10, // Default
    commission_rate: 10.00, // Default 10%
    subscription_status: null, // Workshops don't pay subscription
  }).select().single()

  // Create admin user
  const { data: authUser } = await supabase.auth.signUp({
    email: formData.adminEmail,
    password: formData.password,
    options: {
      data: {
        role: 'workshop_admin',
        full_name: formData.adminName,
        organization_id: org.id
      },
      emailRedirectTo: `${origin}/workshop/onboarding`
    }
  })

  // Link admin to workshop
  await supabase.from('organization_members').insert({
    organization_id: org.id,
    user_id: authUser.user.id,
    role: 'owner',
    status: 'active',
    joined_at: new Date().toISOString()
  })

  // Upload documents
  // ...

  return Response.json({
    success: true,
    message: 'Workshop application submitted. You will receive an email within 1-2 business days.'
  })
}
```

**Validation**:
- [ ] Page exists but shows "Coming soon" (toggle disabled)
- [ ] Toggle check prevents API access
- [ ] Ready to enable for beta testing

---

#### Week 7-8: Workshop Admin Dashboard

**Goal**: Create workshop admin interface (DISABLED by toggle)

**New Pages**:
- `/src/app/workshop/dashboard/page.tsx` - Overview
- `/src/app/workshop/mechanics/page.tsx` - Mechanic list + invite
- `/src/app/workshop/sessions/page.tsx` - All sessions
- `/src/app/workshop/payouts/page.tsx` - Payment history
- `/src/app/workshop/settings/page.tsx` - Workshop settings

**Key Features**:
1. **Dashboard Overview**:
   - Active mechanics count
   - Sessions this month
   - Revenue this month
   - Pending payouts

2. **Mechanic Management**:
   - List all affiliated mechanics
   - Invite new mechanics (generate invite codes)
   - View mechanic performance
   - Suspend/remove mechanics

3. **Invite Code Generator**:
```typescript
async function generateMechanicInvite(workshopId: string, adminUserId: string) {
  const inviteCode = crypto.randomBytes(16).toString('hex')

  await supabase.from('organization_members').insert({
    organization_id: workshopId,
    user_id: null, // Not yet joined
    role: 'member',
    status: 'pending',
    invite_code: inviteCode,
    invited_at: new Date().toISOString(),
    invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
  })

  const inviteLink = `${origin}/mechanic/signup/${inviteCode}`

  // Send email to mechanic
  await sendMechanicInviteEmail({
    workshopName: 'ABC Auto Shop',
    inviteLink,
    expiresAt: '7 days'
  })

  return inviteLink
}
```

**Validation**:
- [ ] Dashboard accessible only to workshop admins
- [ ] Invite codes generate correctly
- [ ] Email notifications sent

---

#### Week 9-10: Workshop Mechanic Signup (Simplified)

**Goal**: Create `/mechanic/signup/:inviteCode` (2-step flow)

**New Page**: `/src/app/mechanic/signup/[inviteCode]/page.tsx`

**Flow** (2 steps only):
```
Step 1: Personal Information
- Full name
- Email
- Phone
- Password
- Address (for service area matching)

Step 2: Accept Terms
- Review workshop affiliation agreement
- Accept terms
- Submit
```

**What's SKIPPED** (compared to independent mechanic signup):
- ❌ SIN/Business Number (workshop handles taxes)
- ❌ Document uploads (workshop pre-verified)
- ❌ Insurance upload (covered by workshop)
- ❌ Criminal record check (done by workshop)
- ❌ Red Seal certification (uploaded by workshop admin)
- ❌ Admin review (auto-approved)

**API Endpoint**: `/src/app/api/mechanic/signup/invited/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const { inviteCode, ...formData } = await req.json()

  // Verify invite code
  const { data: invite } = await supabase
    .from('organization_members')
    .select('*, organizations(*)')
    .eq('invite_code', inviteCode)
    .eq('status', 'pending')
    .gt('invite_expires_at', new Date().toISOString())
    .single()

  if (!invite) {
    return Response.json({ error: 'Invalid or expired invitation' }, { status: 400 })
  }

  // Create auth user
  const { data: authUser } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        role: 'mechanic',
        full_name: formData.fullName,
        organization_id: invite.organization_id
      }
    }
  })

  // Create mechanic profile
  const { data: mechanic } = await supabase.from('mechanics').insert({
    email: formData.email,
    full_name: formData.fullName,
    phone: formData.phone,
    address: formData.address,
    city: formData.city,
    province: formData.province,
    postal_code: formData.postalCode,
    workshop_id: invite.organization_id, // ← Link to workshop
    account_type: 'workshop_mechanic',
    source: 'workshop_invitation',
    requires_sin_collection: false, // ← Workshop handles taxes
    auto_approved: true, // ← No admin review needed
    application_status: 'approved',
    background_check_status: 'verified_by_workshop'
  }).select().single()

  // Update invite status
  await supabase.from('organization_members').update({
    user_id: authUser.user.id,
    status: 'active',
    joined_at: new Date().toISOString()
  }).eq('id', invite.id)

  return Response.json({
    success: true,
    mechanic,
    message: 'Welcome to ' + invite.organizations.name + '! You can start accepting sessions immediately.'
  })
}
```

**Validation**:
- [ ] Invite code verification works
- [ ] 2-step signup completes successfully
- [ ] Mechanic linked to workshop
- [ ] No SIN collection required
- [ ] Auto-approved, no admin review

---

### Phase 2: Beta Workshop Testing (February - March 2026)

**Goal**: Onboard 3-5 Ontario workshops for 60-day beta test

**Timeline**: 8 weeks

#### Week 1: Beta Preparation
**Tasks**:
1. Enable feature toggles for beta workshops (whitelist):
   ```sql
   UPDATE feature_toggles
   SET enabled = true,
       rollout_strategy = 'whitelist',
       target_config = '{"workshop_ids": ["workshop-uuid-1", "workshop-uuid-2", "workshop-uuid-3"]}'
   WHERE feature_key IN ('workshop_signup', 'workshop_mechanic_invites', 'workshop_routing', 'workshop_payments');
   ```

2. Create beta workshop accounts manually
3. Train workshop admins on platform
4. Provide support documentation

**Validation**:
- [ ] Beta workshops can log in
- [ ] Workshop dashboards accessible
- [ ] Invite codes generate correctly

---

#### Week 2-8: Active Beta Testing
**Focus Areas**:

1. **Multi-Mechanic Routing**:
   - Test session assignment to workshop mechanics
   - Verify priority routing (workshop mechanics first)
   - Monitor response times

2. **Stripe Connect Payouts**:
   - Test payment splits (15% platform, 10% workshop, 75% mechanic)
   - Verify Stripe Connect transfers
   - Monitor failed payouts

3. **Workshop Admin Dashboard**:
   - Track admin activity
   - Collect UX feedback
   - Fix bugs immediately

4. **Feedback Loops**:
   - Weekly check-ins with workshop admins
   - Survey mechanics about onboarding experience
   - Collect customer feedback about workshop mechanics

**Metrics to Track**:
- [ ] # of mechanics invited by workshops
- [ ] Mechanic invitation acceptance rate
- [ ] Session completion rate (workshop vs independent)
- [ ] Customer satisfaction (workshop vs independent)
- [ ] Payment processing time
- [ ] Payout success rate

**Beta Success Criteria**:
- 80%+ mechanic invitation acceptance rate
- 90%+ session completion rate
- 95%+ payment success rate
- 4.5+ star average customer rating
- Zero critical bugs

---

### Phase 3: Full Workshop Rollout (April 2026)

**Goal**: Open workshop signups to all qualified workshops

**Timeline**: 2 weeks

#### Week 1: Public Launch Preparation
**Tasks**:
1. Enable all workshop toggles globally:
   ```sql
   UPDATE feature_toggles
   SET enabled = true,
       rollout_strategy = 'all'
   WHERE feature_key LIKE 'workshop_%';
   ```

2. Update marketing website to promote workshop program
3. Create workshop landing page
4. Set up customer support for workshop inquiries
5. Prepare workshop application review process

**Validation**:
- [ ] Workshop signup page live at `/workshop/signup`
- [ ] Application review workflow ready
- [ ] Support team trained

---

#### Week 2: Launch & Monitor
**Tasks**:
1. Announce workshop program publicly
2. Monitor application volume
3. Review and approve workshop applications within 24 hours
4. Onboard approved workshops
5. Track workshop growth metrics

**Metrics**:
- [ ] # of workshop applications/week
- [ ] Application approval rate
- [ ] Time to onboard approved workshops
- [ ] Workshop retention rate (30 days)

---

### Phase 4: Corporate Self-Serve (Q2 2026 - After 3-5 Enterprise Clients)

**Trigger**: After successfully onboarding 3-5 enterprise clients via sales

**Timeline**: 4 weeks

#### Prerequisites (Sales-Led Corporate Onboarding)
**Before enabling self-serve**:
1. ✅ 3-5 enterprise clients onboarded manually
2. ✅ Contracts, billing, data-sharing clauses finalized
3. ✅ Corporate account workflows validated
4. ✅ Team management tested with real corporate users

**Corporate Account Manual Setup Process** (Current):
```
1. Sales team qualifies lead
2. Legal team drafts contract
3. Admin manually creates:
   - Organization record
   - Primary contact auth user
   - Organization member (owner role)
4. Send login credentials to primary contact
5. Primary contact:
   - Logs in
   - Invites team members
   - Sets up billing
   - Starts using platform
```

---

#### Week 1-2: Corporate Self-Serve Signup
**Goal**: Allow corporate accounts to sign up without sales call

**Tasks**:
1. Update `/corporate/signup` to create accounts (not leads):
   ```typescript
   const selfServeEnabled = await isFeatureEnabled('corporate_self_serve')

   if (selfServeEnabled) {
     // Create organization + auth user + member
     await createCorporateAccount(formData)
     router.push('/corporate/onboarding')
   } else {
     // Old flow: create sales lead
     await createSalesLead(formData)
     router.push('/corporate/signup/success')
   }
   ```

2. Create corporate onboarding wizard:
   - Upload logo
   - Invite team members
   - Set up billing (Stripe subscription)
   - Configure settings
   - Activate 14-day free trial

3. Add admin review step (required):
   - All corporate signups require manual approval
   - Admin reviews business registration, tax ID
   - Approves/rejects within 24 hours

**Validation**:
- [ ] Corporate signup creates functional account
- [ ] Primary contact can log in immediately
- [ ] Onboarding wizard completes successfully
- [ ] Admin review workflow works

---

#### Week 3-4: Corporate Team Management
**Goal**: Allow corporate admins to manage team members

**Features**:
1. **Team Member Invitation**:
   ```typescript
   async function inviteTeamMember(orgId: string, email: string, role: 'admin' | 'member') {
     const inviteCode = crypto.randomBytes(16).toString('hex')

     await supabase.from('organization_members').insert({
       organization_id: orgId,
       user_id: null,
       role,
       status: 'pending',
       invite_code: inviteCode,
       invited_at: new Date().toISOString(),
       invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
     })

     const inviteLink = `${origin}/corporate/join/${inviteCode}`
     await sendTeamInviteEmail(email, inviteLink)
   }
   ```

2. **Team Member Management**:
   - List all team members
   - View member activity
   - Change roles (admin ↔ member)
   - Suspend/remove members

3. **Permissions**:
   - Owner: Full control
   - Admin: Can invite/remove members, manage billing
   - Member: Can book sessions, view fleet data
   - Viewer: Read-only access

**Validation**:
- [ ] Team invitations sent successfully
- [ ] Invited members can join via link
- [ ] Role permissions enforced correctly
- [ ] Team member list accurate

---

## Implementation Checklist

### Phase 0: B2C Launch (Now - Q4 2024)
- [ ] Encrypt SIN/Business Numbers (CRITICAL)
- [ ] Implement rate limiting
- [ ] Add phone verification for mechanics
- [ ] Enable Google OAuth
- [ ] Strengthen password policy
- [ ] Launch B2C publicly

---

### Phase 1: B2B2C Foundation (Q4 2024 - Q1 2025)

**Database & Foundation** (Week 1-2):
- [ ] Run account_type migrations
- [ ] Create organizations table
- [ ] Create organization_members table
- [ ] Backfill existing data
- [ ] Update signup flows to set account_type
- [ ] Add feature toggles (all disabled)

**SIN Collection Flow** (Week 3-4):
- [ ] Make SIN optional during mechanic signup
- [ ] Create SIN collection modal component
- [ ] Add SIN check before accepting paid sessions
- [ ] Create "Complete tax info" banner
- [ ] Encrypt and store SIN when collected
- [ ] Test independent vs workshop mechanic flows

**Workshop Signup** (Week 5-6):
- [ ] Create `/workshop/signup` page (toggle-disabled)
- [ ] Create workshop signup API endpoint
- [ ] Implement Stripe Connect onboarding flow
- [ ] Add document upload for insurance/certs
- [ ] Create admin review workflow
- [ ] Test end-to-end signup flow

**Workshop Dashboard** (Week 7-8):
- [ ] Create workshop admin dashboard pages
- [ ] Build mechanic invitation generator
- [ ] Create mechanic management interface
- [ ] Add session monitoring dashboard
- [ ] Build payout tracking interface
- [ ] Test all dashboard features

**Workshop Mechanic Signup** (Week 9-10):
- [ ] Create `/mechanic/signup/[inviteCode]` page
- [ ] Build 2-step simplified signup form
- [ ] Create invited mechanic signup API
- [ ] Auto-approve workshop mechanics
- [ ] Link mechanics to workshops
- [ ] Test invite code verification

---

### Phase 2: Beta Workshop Testing (February - March 2026)

**Beta Preparation** (Week 1):
- [ ] Enable toggles for beta workshops (whitelist)
- [ ] Create beta workshop accounts manually
- [ ] Train workshop admins
- [ ] Prepare support documentation
- [ ] Set up monitoring dashboards

**Beta Testing** (Week 2-8):
- [ ] Monitor multi-mechanic routing
- [ ] Test Stripe Connect payouts
- [ ] Track payment splits accuracy
- [ ] Collect workshop admin feedback
- [ ] Survey mechanics about onboarding
- [ ] Measure customer satisfaction
- [ ] Fix bugs immediately
- [ ] Weekly check-ins with workshops

**Beta Metrics**:
- [ ] Track mechanic invitation acceptance rate (target: 80%+)
- [ ] Monitor session completion rate (target: 90%+)
- [ ] Measure payment success rate (target: 95%+)
- [ ] Track customer ratings (target: 4.5+ stars)
- [ ] Count critical bugs (target: 0)

---

### Phase 3: Full Workshop Rollout (April 2026)

**Launch Preparation** (Week 1):
- [ ] Enable all workshop toggles globally
- [ ] Update marketing website
- [ ] Create workshop landing page
- [ ] Train customer support team
- [ ] Set up application review workflow
- [ ] Prepare onboarding materials

**Launch & Monitor** (Week 2):
- [ ] Announce workshop program publicly
- [ ] Review applications within 24 hours
- [ ] Onboard approved workshops
- [ ] Monitor application volume
- [ ] Track workshop growth metrics
- [ ] Respond to workshop inquiries

---

### Phase 4: Corporate Self-Serve (Q2 2026 - After 3-5 Enterprise Clients)

**Prerequisites**:
- [ ] 3-5 enterprise clients onboarded via sales
- [ ] Contracts finalized and tested
- [ ] Corporate workflows validated
- [ ] Team management tested

**Self-Serve Signup** (Week 1-2):
- [ ] Update corporate signup to create accounts
- [ ] Build corporate onboarding wizard
- [ ] Add admin review step
- [ ] Integrate Stripe subscriptions
- [ ] Test account creation flow
- [ ] Enable corporate_self_serve toggle

**Team Management** (Week 3-4):
- [ ] Build team invitation system
- [ ] Create team member management UI
- [ ] Implement role permissions
- [ ] Add team activity tracking
- [ ] Test all team management features
- [ ] Enable corporate_team_management toggle

---

## Success Metrics

### Phase 1 Success Criteria (Foundation)
- ✅ Zero breaking changes to existing B2C signups
- ✅ All existing users have account_type set
- ✅ Workshop signup flow built (toggle-disabled)
- ✅ Workshop dashboard built (toggle-disabled)
- ✅ SIN collection flow working for independent mechanics
- ✅ All feature toggles in place and tested

---

### Phase 2 Success Criteria (Beta)
- ✅ 3-5 beta workshops onboarded
- ✅ 80%+ mechanic invitation acceptance rate
- ✅ 90%+ session completion rate
- ✅ 95%+ payment success rate
- ✅ 4.5+ star average customer rating
- ✅ Zero critical bugs
- ✅ Positive feedback from workshop admins and mechanics

---

### Phase 3 Success Criteria (Full Rollout)
- ✅ 20+ workshops onboarded in first month
- ✅ 50+ workshops onboarded in first quarter
- ✅ <24 hour application review time
- ✅ 85%+ workshop retention rate (30 days)
- ✅ Platform commission revenue from workshops

---

### Phase 4 Success Criteria (Corporate Self-Serve)
- ✅ 3-5 enterprise clients successfully onboarded manually
- ✅ Corporate self-serve signup live
- ✅ Admin review workflow functioning
- ✅ Team management features working
- ✅ 10+ corporate signups in first month
- ✅ 90%+ corporate account activation rate

---

## Risk Mitigation

### Risk 1: Workshop Payment Splits Fail
**Mitigation**:
- Extensive testing in beta with real money (small amounts)
- Manual payout verification for first 50 transactions
- Monitor Stripe Connect webhooks closely
- Have fallback: Manual payment splitting if automated fails

---

### Risk 2: Workshop Mechanic Quality Lower Than Independent
**Mitigation**:
- Workshop pre-verification of mechanics
- Customer ratings tracked separately (workshop vs independent)
- Workshop can suspend underperforming mechanics
- Platform can suspend entire workshop if quality issues

---

### Risk 3: Beta Workshops Drop Out
**Mitigation**:
- Weekly check-ins during beta
- Immediate bug fixes (24-hour SLA)
- Incentives for beta workshops (reduced commission for first 90 days)
- Clear communication about roadmap and improvements

---

### Risk 4: SIN Collection Friction
**Mitigation**:
- Allow signup without SIN
- Only prompt when mechanic accepts first PAID session
- Clear explanation of why SIN is needed (tax reporting)
- Option to provide Business Number instead (for incorporated mechanics)
- Support team available to answer tax questions

---

### Risk 5: Corporate Accounts Overwhelm Support
**Mitigation**:
- Keep initial corporate signups sales-led (manual review)
- Require admin review even after self-serve enabled
- Limit self-serve to <100 employees initially
- Enterprise (100+ employees) still goes through sales
- Dedicated corporate support tier

---

## Next Immediate Steps (This Week)

### 1. Phase 0 Completion (If Not Done)
**Priority**: CRITICAL
- [ ] Encrypt SIN/Business Numbers
- [ ] Implement rate limiting
- [ ] Add phone verification for mechanics

**Estimated Time**: 2-3 days

---

### 2. Phase 1 Week 1-2 (Database Foundation)
**Priority**: HIGH
- [ ] Review and approve database migration scripts
- [ ] Test migrations on staging environment
- [ ] Run migrations on production during low-traffic window
- [ ] Backfill existing data
- [ ] Update signup flows to set account_type
- [ ] Monitor for errors

**Estimated Time**: 1 week

---

### 3. Planning & Documentation
**Priority**: MEDIUM
- [ ] Review this implementation plan with team
- [ ] Assign owners to each phase
- [ ] Set up project tracking (Jira/Linear/etc.)
- [ ] Create detailed technical specs for each feature
- [ ] Schedule weekly progress reviews

**Estimated Time**: 2-3 days

---

## Timeline Overview

```
Q4 2024 (Oct-Dec)
├── Phase 0: B2C Launch Preparation
├── Phase 1 Start: Database Foundation (Week 1-2)
└── Phase 1 Continue: SIN Collection Flow (Week 3-4)

Q1 2025 (Jan-Mar)
├── Phase 1 Continue: Workshop Signup (Week 5-6)
├── Phase 1 Continue: Workshop Dashboard (Week 7-8)
├── Phase 1 Complete: Workshop Mechanic Signup (Week 9-10)
└── B2C Public Release + Validation

Q1 2026 (Jan-Mar)
├── B2C Traction Validation
└── Phase 2: Beta Workshop Testing (Feb-Mar)

Q2 2026 (Apr-Jun)
├── Phase 3: Full Workshop Rollout (April)
└── Phase 4: Corporate Self-Serve (May-Jun, after 3-5 enterprise clients)
```

---

## Conclusion

This revised plan aligns with your strategic timeline:
- **B2C First**: Focus on customer traction and payment reliability
- **Workshop Beta Q1 2026**: 3-5 Ontario workshops for 60-day test
- **Sales-Led Corporate**: Manual onboarding with contracts, then self-serve after validation
- **SIN Collection**: Independent mechanics only, with post-signup collection
- **Commission Split**: Fair 15/10/75 split with workshop flexibility

**Ready to start?** Begin with Phase 0 completion (SIN encryption, rate limiting, phone verification), then move to Phase 1 Week 1-2 (Database Foundation).
