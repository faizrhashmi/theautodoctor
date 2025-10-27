# Migration Plan: Current System → Legally Compliant Model
## The Auto Doctor Platform

**Issue:** Phase 3 enables illegal driveway repairs
**Solution:** Transition to workshop-centric model
**Timeline:** 4 weeks
**Risk Level:** 🟡 Medium (requires stakeholder communication)

---

## Current State vs. Target State

### Current System Architecture
```
Customer
    ↓
Books Session
    ↓
    ├─ Workshop Flow ✅ (Legal - Keep)
    │  ├─ Mechanic diagnoses (no pricing)
    │  ├─ Service advisor creates quote
    │  └─ Work at workshop facility
    │
    └─ Independent Flow ⚠️ (Illegal - Modify)
       ├─ Mechanic diagnoses + quotes
       ├─ Includes trip fees for "mobile visit"
       └─ Assumes work at customer location ❌
```

### Target System Architecture
```
Customer
    ↓
Service Selection
    ↓
    ├─ Virtual Consultation Only
    │  ├─ Chat ($15) or Video ($35)
    │  ├─ Any certified mechanic
    │  └─ No physical work ✅
    │
    ├─ Workshop Diagnosis + Repair
    │  ├─ Workshop-affiliated mechanic only
    │  ├─ Virtual or in-person diagnosis
    │  ├─ Quote from service advisor
    │  └─ Work at licensed facility ✅
    │
    └─ Licensed Mobile Service (Future)
       ├─ Properly licensed company only
       ├─ Premium pricing
       └─ Legal on-site work ✅
```

---

## Week 1: Legal & Communication

### Day 1-2: Legal Review
- [ ] **Lawyer consultation** on updated Terms of Service
- [ ] **Review** mechanic certification agreement
- [ ] **Verify** provincial compliance requirements (ON, BC, AB, QC)
- [ ] **Draft** customer communication plan
- [ ] **Prepare** FAQ document

**Deliverables:**
- ✓ Legal approval on updated agreements
- ✓ Province-specific compliance checklist
- ✓ Communication templates

### Day 3-4: Stakeholder Communication
- [ ] **Email existing mechanics** about upcoming changes
- [ ] **Explain** workshop affiliation requirement
- [ ] **Offer** 90-day transition period
- [ ] **Provide** workshop partnership resources
- [ ] **Schedule** Q&A webinar for mechanics

**Email Template:**
```
Subject: Important Update: Workshop Affiliation Requirement

Dear [Mechanic Name],

We're writing to inform you of an important compliance update to The Auto Doctor platform.

What's Changing:
To ensure full legal compliance with Canadian municipal and provincial regulations,
all physical automotive repair work must now be performed at licensed workshop facilities.

What This Means for You:

Option 1: Virtual Consultations Only
- Continue offering chat/video diagnostics immediately
- Earn $12.75-$29.75 per session
- No additional requirements

Option 2: Workshop-Affiliated (Recommended)
- Offer both consultations AND physical repair work
- Must be affiliated with a licensed automotive workshop
- Higher earning potential
- We'll help connect you with partner workshops

Timeline:
- Effective: [Date + 90 days]
- Transition period: 90 days
- Support available: Partnership coordination team

Next Steps:
1. Choose your service tier by [Date + 30 days]
2. If workshop-affiliated: Submit verification documents
3. Attend our transition webinar: [Date/Time]

Questions? Reply to this email or call our support line.

Thank you for being part of The Auto Doctor community.

Best regards,
The Auto Doctor Team
```

### Day 5: Update Public-Facing Materials
- [ ] **Update** website copy (remove "mobile" language)
- [ ] **Revise** marketing materials
- [ ] **Update** app store descriptions
- [ ] **Modify** social media messaging
- [ ] **Update** FAQ and help docs

**Website Copy Changes:**

**Before:**
> "Get certified mechanics to come to you. Book mobile automotive repairs at your home or office."

**After:**
> "Expert automotive advice instantly. Connect with certified mechanics for virtual consultations and quality repairs at verified workshops."

---

## Week 2: Database & Backend

### Day 6-8: Database Migration

**Create Migration File:**
```sql
-- File: supabase/migrations/20250127100000_add_compliance_system.sql

-- 1. Add service tier to mechanics
ALTER TABLE mechanics
ADD COLUMN service_tier TEXT DEFAULT 'virtual_only'
  CHECK (service_tier IN ('virtual_only', 'workshop_affiliated', 'licensed_mobile')),
ADD COLUMN workshop_verified BOOLEAN DEFAULT false,
ADD COLUMN can_perform_physical_work BOOLEAN DEFAULT false,
ADD COLUMN business_license_number TEXT,
ADD COLUMN insurance_policy_number TEXT,
ADD COLUMN insurance_expiry_date DATE,
ADD COLUMN compliance_status TEXT DEFAULT 'pending'
  CHECK (compliance_status IN ('pending', 'approved', 'rejected', 'expired'));

-- 2. Update organizations (workshops) with compliance fields
ALTER TABLE organizations
ADD COLUMN business_license_verified BOOLEAN DEFAULT false,
ADD COLUMN business_license_number TEXT,
ADD COLUMN business_license_expiry DATE,
ADD COLUMN zoning_compliance_verified BOOLEAN DEFAULT false,
ADD COLUMN liability_insurance_amount DECIMAL(12,2),
ADD COLUMN liability_insurance_expiry DATE,
ADD COLUMN environmental_compliance_verified BOOLEAN DEFAULT false,
ADD COLUMN mvis_license_number TEXT,
ADD COLUMN allows_physical_repairs BOOLEAN DEFAULT true;

-- 3. Create compliance verifications table
CREATE TABLE IF NOT EXISTS compliance_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mechanic', 'workshop', 'mobile_service')),
  entity_id UUID NOT NULL,
  verification_type TEXT NOT NULL CHECK (verification_type IN (
    'business_license',
    'insurance',
    'zoning',
    'certification',
    'employment',
    'ownership'
  )),
  document_url TEXT,
  document_name TEXT,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  expiry_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_compliance_entity ON compliance_verifications(entity_type, entity_id);
CREATE INDEX idx_compliance_status ON compliance_verifications(status);
CREATE INDEX idx_compliance_expiry ON compliance_verifications(expiry_date);

-- 4. Update diagnostic_sessions session types
ALTER TABLE diagnostic_sessions
DROP CONSTRAINT IF EXISTS diagnostic_sessions_session_type_check;

ALTER TABLE diagnostic_sessions
ADD CONSTRAINT diagnostic_sessions_session_type_check
  CHECK (session_type IN ('chat', 'video', 'upgraded_from_chat', 'workshop_visit'));

-- 5. Add compliance check to diagnostic_sessions
ALTER TABLE diagnostic_sessions
ADD COLUMN requires_physical_work BOOLEAN DEFAULT false,
ADD COLUMN workshop_verified BOOLEAN DEFAULT true;

-- 6. Migrate existing data
-- Set all current workshop mechanics to workshop_affiliated
UPDATE mechanics
SET service_tier = 'workshop_affiliated',
    workshop_verified = true,
    can_perform_physical_work = true
WHERE workshop_id IS NOT NULL;

-- Set all current independent mechanics to virtual_only temporarily
UPDATE mechanics
SET service_tier = 'virtual_only',
    workshop_verified = false,
    can_perform_physical_work = false
WHERE workshop_id IS NULL;

-- Rename mobile_visit to workshop_visit
UPDATE diagnostic_sessions
SET session_type = 'workshop_visit'
WHERE session_type = 'mobile_visit';

-- 7. Create notification for mechanics needing verification
CREATE TABLE IF NOT EXISTS mechanic_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notify all virtual_only mechanics about workshop affiliation option
INSERT INTO mechanic_notifications (mechanic_id, notification_type, title, message, action_url)
SELECT
  id,
  'compliance_update',
  'Workshop Affiliation Now Available',
  'Increase your earnings by affiliating with a workshop to offer physical repair services. Click to learn more and submit your workshop details.',
  '/mechanic/upgrade-to-workshop'
FROM mechanics
WHERE service_tier = 'virtual_only';

-- 8. Update fee rules to reflect new provider types
UPDATE platform_fee_rules
SET applies_to = 'workshop'
WHERE applies_to = 'independent' OR applies_to = 'mobile';

-- Add new virtual consultation fee rule
INSERT INTO platform_fee_rules (
  rule_name,
  rule_type,
  description,
  applies_to,
  fee_percentage,
  priority,
  is_active
) VALUES (
  'Virtual Consultation Fee',
  'percentage',
  'Flat 15% fee for all virtual consultation sessions (chat/video)',
  'all',
  15.00,
  100,
  true
);

COMMENT ON TABLE compliance_verifications IS 'Tracks verification status of mechanic/workshop compliance documents';
COMMENT ON COLUMN mechanics.service_tier IS 'virtual_only: consultations only; workshop_affiliated: consultations + repairs at workshop; licensed_mobile: licensed mobile repair company';
COMMENT ON COLUMN mechanics.can_perform_physical_work IS 'True only if workshop_verified and service_tier = workshop_affiliated or licensed_mobile';
```

**Tasks:**
- [ ] Create migration file
- [ ] Test migration on local database
- [ ] Test migration on staging database
- [ ] Verify data integrity post-migration
- [ ] Create rollback script
- [ ] Document migration process

### Day 9-10: Backend API Updates

**Create New Endpoints:**

1. **Mechanic Service Tier Selection**
```typescript
// src/app/api/mechanic/service-tier/route.ts
export async function POST(req: NextRequest) {
  const { mechanic_id, service_tier } = await req.json()

  if (service_tier === 'workshop_affiliated') {
    // Require workshop details
    return NextResponse.json({
      success: false,
      message: 'Workshop affiliation details required',
      redirect: '/mechanic/onboarding/workshop-details'
    })
  }

  // Update mechanic to virtual_only
  await supabase
    .from('mechanics')
    .update({ service_tier: 'virtual_only' })
    .eq('id', mechanic_id)

  return NextResponse.json({ success: true })
}
```

2. **Workshop Verification Submission**
```typescript
// src/app/api/mechanic/workshop-verification/route.ts
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const mechanic_id = formData.get('mechanic_id')
  const workshop_id = formData.get('workshop_id')
  const business_license = formData.get('business_license') // File
  const insurance_cert = formData.get('insurance_cert') // File
  const employment_proof = formData.get('employment_proof') // File

  // Upload documents to Supabase Storage
  const documents = []

  for (const [type, file] of [
    ['business_license', business_license],
    ['insurance', insurance_cert],
    ['employment', employment_proof]
  ]) {
    if (file) {
      const filePath = `compliance/${mechanic_id}/${type}_${Date.now()}.pdf`
      const { data, error } = await supabaseAdmin.storage
        .from('mechanic-documents')
        .upload(filePath, file)

      if (!error) {
        // Create compliance verification record
        await supabaseAdmin
          .from('compliance_verifications')
          .insert({
            entity_type: 'mechanic',
            entity_id: mechanic_id,
            verification_type: type,
            document_url: filePath,
            status: 'pending'
          })
      }
    }
  }

  // Update mechanic status
  await supabaseAdmin
    .from('mechanics')
    .update({
      workshop_id: workshop_id,
      compliance_status: 'pending'
    })
    .eq('id', mechanic_id)

  return NextResponse.json({
    success: true,
    message: 'Verification submitted. We\'ll review within 2-3 business days.'
  })
}
```

3. **Admin Verification Endpoint**
```typescript
// src/app/api/admin/compliance/verify/route.ts
export async function POST(req: NextRequest) {
  const { verification_id, status, notes } = await req.json()
  const admin_id = await getAdminId(req)

  // Update verification status
  await supabaseAdmin
    .from('compliance_verifications')
    .update({
      status,
      verified_by: admin_id,
      verified_at: new Date().toISOString(),
      notes
    })
    .eq('id', verification_id)

  // If all verifications approved, activate mechanic
  if (status === 'approved') {
    const { data: verifications } = await supabaseAdmin
      .from('compliance_verifications')
      .select('*')
      .eq('entity_id', mechanic_id)
      .eq('entity_type', 'mechanic')

    const allApproved = verifications.every(v => v.status === 'approved')

    if (allApproved) {
      await supabaseAdmin
        .from('mechanics')
        .update({
          workshop_verified: true,
          can_perform_physical_work: true,
          compliance_status: 'approved',
          service_tier: 'workshop_affiliated'
        })
        .eq('id', mechanic_id)
    }
  }

  return NextResponse.json({ success: true })
}
```

4. **Session Booking Validation**
```typescript
// src/app/api/sessions/book/route.ts
export async function POST(req: NextRequest) {
  const { mechanic_id, session_type, requires_physical_work } = await req.json()

  if (requires_physical_work) {
    // Check mechanic can perform physical work
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('can_perform_physical_work, workshop_id, service_tier')
      .eq('id', mechanic_id)
      .single()

    if (!mechanic.can_perform_physical_work) {
      return NextResponse.json({
        error: 'This mechanic can only provide virtual consultations. Please select a workshop-affiliated mechanic for physical repairs.',
        code: 'MECHANIC_NOT_AUTHORIZED_PHYSICAL_WORK'
      }, { status: 400 })
    }

    if (!mechanic.workshop_id) {
      return NextResponse.json({
        error: 'Physical repairs require a workshop location. This mechanic is not affiliated with a workshop.',
        code: 'NO_WORKSHOP_AFFILIATION'
      }, { status: 400 })
    }
  }

  // Proceed with booking...
}
```

**Tasks:**
- [ ] Create service tier selection endpoint
- [ ] Create workshop verification endpoints
- [ ] Create admin compliance review endpoint
- [ ] Update session booking validation
- [ ] Update mechanic profile endpoint
- [ ] Add compliance status checks to all physical work APIs

---

## Week 3: Frontend & UX

### Day 11-13: Mechanic Onboarding Flow

**Create Service Tier Selection Page:**
```tsx
// src/app/mechanic/onboarding/service-tier/page.tsx
'use client'

export default function ServiceTierSelection() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Choose Your Service Level</h1>
      <p className="text-gray-600 mb-8">
        Select how you want to serve customers on The Auto Doctor platform
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Virtual Only Card */}
        <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500">
          <div className="text-blue-600 text-4xl mb-3">💬</div>
          <h2 className="text-xl font-bold mb-2">Virtual Consultations Only</h2>
          <p className="text-gray-600 mb-4">
            Provide expert advice via chat and video. No physical work.
          </p>

          <div className="bg-green-50 p-4 rounded mb-4">
            <div className="text-sm font-semibold text-green-800">Start Earning Today</div>
            <div className="text-2xl font-bold text-green-900">$12.75 - $29.75</div>
            <div className="text-sm text-green-700">per consultation</div>
          </div>

          <ul className="space-y-2 mb-6">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm">No workshop required</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm">Start immediately after verification</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm">Work from anywhere</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm">Flexible hours</span>
            </li>
          </ul>

          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold">
            Choose Virtual Only
          </button>
        </div>

        {/* Workshop Affiliated Card */}
        <div className="border-2 border-blue-500 rounded-lg p-6 relative">
          <div className="absolute -top-3 left-4 bg-blue-500 text-white px-3 py-1 text-sm font-semibold rounded">
            RECOMMENDED
          </div>

          <div className="text-blue-600 text-4xl mb-3">🔧</div>
          <h2 className="text-xl font-bold mb-2">Workshop-Affiliated</h2>
          <p className="text-gray-600 mb-4">
            Offer consultations AND physical repairs at a licensed workshop.
          </p>

          <div className="bg-blue-50 p-4 rounded mb-4">
            <div className="text-sm font-semibold text-blue-800">Higher Earnings</div>
            <div className="text-2xl font-bold text-blue-900">$500 - $2,000+</div>
            <div className="text-sm text-blue-700">per week potential</div>
          </div>

          <ul className="space-y-2 mb-6">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              <span className="text-sm">Virtual consultations + physical repairs</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              <span className="text-sm">Full-service offering</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              <span className="text-sm">Professional workshop facility</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              <span className="text-sm">Fully insured and compliant</span>
            </li>
          </ul>

          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold">
            Choose Workshop-Affiliated
          </button>

          <div className="mt-4 text-center">
            <a href="#" className="text-sm text-blue-600 underline">
              Need help finding a workshop partner?
            </a>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <span className="text-yellow-600 mr-2">ℹ️</span>
          <div>
            <p className="text-sm text-yellow-800 font-semibold mb-1">
              Legal Compliance Requirement
            </p>
            <p className="text-sm text-yellow-700">
              Canadian municipal regulations require all physical automotive repairs to be
              performed at properly licensed and insured workshop facilities. Virtual consultations
              can be provided from anywhere.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Create Workshop Details Form:**
```tsx
// src/app/mechanic/onboarding/workshop-details/page.tsx
// (Full form for workshop affiliation, business license upload, etc.)
```

**Tasks:**
- [ ] Create service tier selection page
- [ ] Create workshop details form
- [ ] Create document upload interface
- [ ] Create compliance status dashboard
- [ ] Add onboarding progress indicator
- [ ] Create workshop partnership matchmaking page

### Day 14-15: Customer Booking Flow

**Update Booking Page:**
```tsx
// src/app/book/page.tsx - Service selection step
<div className="mb-8">
  <h2 className="text-2xl font-bold mb-4">What do you need?</h2>

  <div className="grid md:grid-cols-2 gap-4">
    <button
      onClick={() => setServiceType('virtual')}
      className={`border-2 p-6 rounded-lg text-left ${
        serviceType === 'virtual' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div className="text-3xl mb-2">💬</div>
      <h3 className="font-bold text-lg mb-2">Quick Advice or Second Opinion</h3>
      <p className="text-gray-600 text-sm mb-3">
        Get expert guidance via chat or video. Perfect for diagnosis, second opinions,
        or pre-purchase inspections.
      </p>
      <div className="text-blue-600 font-semibold">$15 - $35</div>
    </button>

    <button
      onClick={() => setServiceType('repair')}
      className={`border-2 p-6 rounded-lg text-left ${
        serviceType === 'repair' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div className="text-3xl mb-2">🔧</div>
      <h3 className="font-bold text-lg mb-2">Diagnosis + Repair</h3>
      <p className="text-gray-600 text-sm mb-3">
        Professional diagnosis and repair at a licensed workshop. All work
        performed by certified mechanics.
      </p>
      <div className="text-blue-600 font-semibold">$50+</div>
    </button>
  </div>

  {serviceType === 'repair' && (
    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
      <p className="text-sm text-green-800">
        ✓ All repairs performed at licensed, insured workshop facilities
        <br />
        ✓ Professional equipment and proper environmental compliance
        <br />
        ✓ Work covered by workshop warranty
      </p>
    </div>
  )}
</div>
```

**Tasks:**
- [ ] Update booking flow with service type selection
- [ ] Filter mechanics by service_tier
- [ ] Show workshop location for workshop-affiliated mechanics
- [ ] Add "Virtual Only" badge to virtual-only mechanics
- [ ] Update mechanic profile cards
- [ ] Add workshop information section

---

## Week 4: Testing, Launch & Monitoring

### Day 16-18: Testing

**Test Cases:**

1. **Virtual-Only Mechanic Flow**
   - [ ] Mechanic selects virtual-only tier
   - [ ] Profile shows "Virtual Consultations Only" badge
   - [ ] Cannot accept physical repair bookings
   - [ ] Can accept chat/video bookings
   - [ ] Earnings calculated correctly (15% fee)

2. **Workshop-Affiliated Mechanic Flow**
   - [ ] Mechanic uploads workshop documents
   - [ ] Admin receives verification request
   - [ ] Admin approves/rejects documents
   - [ ] Mechanic status updates correctly
   - [ ] Can accept both virtual and physical bookings
   - [ ] Workshop location displays correctly

3. **Customer Booking Flow**
   - [ ] Service type selection works
   - [ ] Virtual-only mechanics shown for consultations
   - [ ] Workshop-affiliated mechanics shown for repairs
   - [ ] Workshop location displayed
   - [ ] Booking confirmation includes location details
   - [ ] Cannot book physical work with virtual-only mechanic

4. **Admin Compliance Dashboard**
   - [ ] Pending verifications listed
   - [ ] Can view uploaded documents
   - [ ] Can approve/reject/request more info
   - [ ] Mechanic notifications sent correctly
   - [ ] Status updates in real-time

5. **Migration Testing**
   - [ ] Existing workshop mechanics migrated correctly
   - [ ] Existing independent mechanics set to virtual-only
   - [ ] All sessions updated (mobile_visit → workshop_visit)
   - [ ] Fee rules updated correctly
   - [ ] No data loss

### Day 19: Soft Launch

- [ ] Deploy to staging environment
- [ ] Run full test suite
- [ ] Invite 5-10 beta mechanics to test
- [ ] Monitor for issues
- [ ] Collect feedback
- [ ] Fix critical bugs

### Day 20: Production Launch

- [ ] Final legal review
- [ ] Deploy to production
- [ ] Run database migration
- [ ] Send communication to all mechanics
- [ ] Monitor error logs
- [ ] Track key metrics
- [ ] Provide live support

### Day 21-28: Monitoring & Support

**Metrics to Track:**
- Mechanic service tier selection (virtual vs. workshop)
- Workshop verification submission rate
- Admin verification turnaround time
- Customer booking completion rate
- Session type distribution
- Revenue by service tier
- Mechanic satisfaction scores

**Support Plan:**
- Daily check of compliance verification queue
- 24-hour response time for mechanic questions
- Weekly Q&A session for transitioning mechanics
- Workshop partnership coordination
- Feedback collection and iteration

---

## Risk Mitigation

### Risk 1: Mechanic Pushback
**Risk:** Mechanics resist workshop affiliation requirement
**Mitigation:**
- Clear communication about legal reasons
- 90-day transition period
- Workshop partnership assistance
- Virtual-only option available immediately
- Competitive earnings for virtual consultations

### Risk 2: Low Workshop Verification Rate
**Risk:** Mechanics don't complete verification process
**Mitigation:**
- Simplified document upload process
- Clear checklist and progress tracking
- Admin support for questions
- Partnership matchmaking service
- Incentives for early completion

### Risk 3: Customer Confusion
**Risk:** Customers don't understand new service options
**Mitigation:**
- Clear UI with service type selection
- Helpful tooltips and explanations
- FAQ updates
- Customer support training
- Educational content

### Risk 4: Revenue Impact
**Risk:** Loss of mobile/independent mechanics reduces revenue
**Mitigation:**
- Workshop partnerships increase available mechanics
- Virtual consultations are new revenue stream
- Higher quality service increases conversion
- Professional positioning allows higher pricing
- Market size actually increases (all workshop mechanics)

---

## Success Criteria

### Week 1:
- ✓ Legal agreements approved
- ✓ All existing mechanics notified
- ✓ Communication plan executed

### Week 2:
- ✓ Database migration successful
- ✓ No data loss
- ✓ All APIs updated and tested

### Week 3:
- ✓ New onboarding flow live
- ✓ Customer booking flow updated
- ✓ Admin dashboard functional

### Week 4:
- ✓ System launched
- ✓ >80% mechanic retention
- ✓ >50 workshop verifications submitted
- ✓ Zero legal compliance issues

### Month 2-3:
- ✓ >100 workshop-affiliated mechanics
- ✓ >500 virtual consultations/month
- ✓ >4.5/5 customer satisfaction
- ✓ Zero municipal complaints

---

## Rollback Plan

If critical issues arise:

**Immediate Actions:**
1. Revert database migration (use rollback script)
2. Restore previous API endpoints
3. Re-enable independent mechanic flow temporarily
4. Display maintenance message

**Rollback Script:**
```sql
-- Restore original session types
ALTER TABLE diagnostic_sessions
DROP CONSTRAINT diagnostic_sessions_session_type_check;

ALTER TABLE diagnostic_sessions
ADD CONSTRAINT diagnostic_sessions_session_type_check
  CHECK (session_type IN ('chat', 'video', 'upgraded_from_chat', 'mobile_visit'));

-- Remove compliance tables
DROP TABLE IF EXISTS compliance_verifications;
DROP TABLE IF EXISTS mechanic_notifications;

-- Remove added columns
ALTER TABLE mechanics
DROP COLUMN IF EXISTS service_tier,
DROP COLUMN IF EXISTS workshop_verified,
DROP COLUMN IF EXISTS can_perform_physical_work;

-- Restore fee rules
UPDATE platform_fee_rules
SET applies_to = 'independent'
WHERE rule_name LIKE '%Independent%';
```

---

## Post-Launch Checklist

**Week 5-8:**
- [ ] Analyze mechanic tier selection data
- [ ] Review workshop verification process efficiency
- [ ] Collect customer feedback on new booking flow
- [ ] Optimize conversion funnel
- [ ] Expand workshop partnership program
- [ ] Plan province-by-province expansion

**Month 3+:**
- [ ] Launch workshop partnership marketplace
- [ ] Introduce mechanic training program
- [ ] Add licensed mobile services (Tier 3)
- [ ] Expand to additional provinces
- [ ] Launch mechanic mobile app

---

## Contact & Support

**Migration Team:**
- Technical Lead: [Email]
- Legal Counsel: [Email]
- Customer Success: [Email]
- Mechanic Support: [Email]

**Emergency Contacts:**
- Critical Issues: [Phone]
- Legal Questions: [Phone]
- Technical Support: [Phone]

---

**Status:** 📋 Ready for Execution
**Next Step:** Stakeholder approval to begin Week 1
**Timeline:** 4 weeks to full implementation
**Risk Level:** 🟡 Medium (manageable with proper communication)

---

**Document Version:** 1.0
**Last Updated:** January 27, 2025
**Owner:** Product & Engineering Team
