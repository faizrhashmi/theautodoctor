# Phase 3: Privacy & Consent - Implementation Plan

**Status:** 🚧 IN PROGRESS
**Start Date:** 2025-11-01

---

## Overview

Phase 3 implements comprehensive privacy and consent management infrastructure to comply with PIPEDA (Canadian federal privacy law) and CASL (Canada's Anti-Spam Legislation).

---

## 🎯 Phase 3 Components

### 1. Consent Management System

#### 1.1 Database Schema
**Migration:** `20251201000001_consent_management_system.sql`

**Tables to Create:**
- `customer_consents` - Track all customer consent decisions
- `marketing_consent_log` - CASL marketing consent tracking
- `data_sharing_consent_log` - PIPEDA consent for sharing with workshops
- `consent_withdrawal_log` - Track when customers withdraw consent

**Features:**
- IP address and timestamp for audit trail
- Consent version tracking
- Granular consent types (marketing, data sharing, analytics)
- Withdrawal mechanism

#### 1.2 Consent Collection UI
**Files to Create/Modify:**
- `src/app/customer/signup/page.tsx` - Add consent checkboxes
- `src/app/customer/settings/privacy/page.tsx` - Manage consents
- `src/components/consent/ConsentManager.tsx` - Reusable consent component

**Consent Types:**
1. **Required Consents:**
   - Terms of Service acceptance
   - Privacy Policy acceptance
   - Marketplace understanding (not a repair shop)

2. **Optional Consents:**
   - Marketing emails (CASL)
   - Analytics cookies
   - Product improvement data

3. **Situational Consents:**
   - Data sharing with workshop (before escalation)
   - Referral fee disclosure (before accepting quote)

---

### 2. Data Access Request System (PIPEDA Right to Access)

#### 2.1 Customer Data Download
**Files to Create:**
- `src/app/customer/settings/privacy/download-data/page.tsx`
- `src/app/api/customer/privacy/download-data/route.ts`

**Features:**
- Generate JSON/CSV export of all customer data
- Include: profile, vehicles, sessions, quotes, chat messages
- Exclude: encrypted passwords, admin notes
- 30-day response requirement (PIPEDA)

#### 2.2 Data Correction Request
**Files to Create:**
- `src/app/customer/settings/privacy/correct-data/page.tsx`
- `src/app/api/customer/privacy/correction-request/route.ts`

**Features:**
- Submit correction request form
- Admin review queue
- Email notification when corrected

---

### 3. Account Deletion System (PIPEDA Right to Erasure)

#### 3.1 Account Deletion with Legal Retention
**Files to Create:**
- `src/app/customer/settings/privacy/delete-account/page.tsx`
- `src/app/api/customer/privacy/delete-account/route.ts`
- Migration: `20251201000002_account_deletion_system.sql`

**Features:**
- Soft delete with legal retention rules
- Immediate deletion: Profile info, vehicles, preferences
- 7-year retention: Tax records (CRA requirement), payment history
- 2-year retention: Session data (anonymized)
- Deletion confirmation email
- Admin audit trail

**Deletion Process:**
1. Customer requests deletion
2. System validates no active sessions
3. Immediate soft delete (sets `deleted_at` timestamp)
4. Schedule data anonymization after retention period
5. Email confirmation sent

#### 3.2 Data Anonymization
**Table:** `account_deletion_queue`

**Features:**
- Scheduled anonymization after retention periods
- Replace PII with generic values
- Keep statistical data for business analytics
- Irreversible process

---

### 4. Workshop Agreement Signing System

#### 4.1 Digital Agreement Flow
**Files to Create:**
- `src/app/workshop/onboarding/agreement/page.tsx`
- `src/app/api/workshop/agreement/sign/route.ts`
- Migration: `20251201000003_workshop_agreements.sql`

**Agreement Components:**
1. **Independent Contractor Acknowledgment**
   - Not an employee
   - Responsible for own taxes
   - Can refuse work
   - Sets own pricing

2. **Insurance Verification**
   - $2M liability insurance required
   - WSIB if employing workers
   - Upload certificate of insurance
   - Expiry date tracking

3. **OCPA Compliance Acknowledgment**
   - Must provide written estimates
   - 10% variance rule
   - Warranty disclosure
   - Customer vehicle return

4. **Privacy Acknowledgment**
   - Use customer data only for service
   - No marketing without separate consent
   - Report data breaches

**Signing Process:**
1. Display full agreement text
2. Checkboxes for each section
3. Electronic signature (typed name)
4. IP address and timestamp recorded
5. PDF copy generated and emailed
6. Workshop status updated to 'active'

---

### 5. Privacy Audit Logging

#### 5.1 Audit Trail System
**Migration:** `20251201000004_privacy_audit_log.sql`

**Table:** `privacy_audit_log`

**Events to Log:**
- Consent granted/withdrawn
- Data access request
- Data correction request
- Account deletion request
- Data downloaded
- Marketing email sent
- Data shared with workshop
- Privacy policy updated

**Audit Fields:**
- Timestamp
- Customer ID
- Event type
- IP address
- User agent
- Details (JSON)
- Performed by (customer, admin, system)

---

## 🔐 PIPEDA Compliance Checklist

### Consent (Principle 3)
- [x] Obtain meaningful consent before collecting personal info
- [ ] Implement consent management UI
- [ ] Track consent versions
- [ ] Allow easy withdrawal of consent
- [ ] Separate marketing consent from service consent

### Limiting Collection (Principle 4)
- [x] Only collect necessary information
- [ ] Document purpose for each data field
- [ ] Minimize data collection where possible

### Purpose Specification (Principle 2)
- [x] Privacy policy specifies purposes
- [ ] Consent forms explain why data is needed
- [ ] No repurposing without new consent

### Limiting Use, Disclosure, Retention (Principles 5 & 7)
- [x] Retention periods defined
- [ ] Automated deletion after retention
- [ ] No disclosure without consent
- [ ] Data sharing logged

### Accuracy (Principle 6)
- [ ] Data correction mechanism
- [ ] Regular data validation

### Individual Access (Principle 9)
- [ ] Data download functionality
- [ ] 30-day response requirement
- [ ] Free access (no fees)

### Safeguards (Principle 7)
- [x] Encryption in transit (TLS)
- [x] Encryption at rest (Supabase)
- [x] Row-level security (RLS)
- [ ] Access logs
- [ ] Data breach notification

### Accountability (Principle 1)
- [ ] Privacy officer designated
- [ ] Privacy policy published
- [ ] Training for staff
- [ ] Compliance monitoring

---

## 🚀 Implementation Priority

### Week 1: Consent Management
1. Create consent management migration
2. Build consent collection UI (signup)
3. Build consent management page (settings)
4. Test consent tracking and withdrawal

### Week 2: Data Access Rights
1. Implement data download API
2. Build data download UI
3. Implement data correction request
4. Test 30-day response workflow

### Week 3: Account Deletion
1. Create account deletion migration
2. Build deletion request UI
3. Implement soft delete logic
4. Build anonymization scheduler
5. Test deletion workflow

### Week 4: Workshop Agreements
1. Create workshop agreement migration
2. Build agreement signing UI
3. Implement insurance verification
4. Generate PDF copies
5. Test onboarding flow

---

## 📊 Success Metrics

### Technical
- All consents tracked in database
- Data download generates complete export
- Account deletion respects retention rules
- Workshop agreements digitally signed
- Audit logs capture all privacy events

### Legal
- PIPEDA compliance achieved
- CASL compliance for marketing
- Right to access implemented
- Right to erasure implemented
- Consent withdrawal functional

### User Experience
- Simple consent management interface
- Easy data download (1-click)
- Clear deletion process
- Workshop onboarding < 10 minutes

---

## 🔄 Integration with Existing Systems

### Phase 2 Integration
- Consent required before quote acceptance
- Data sharing consent before workshop escalation
- Marketing consent separate from service

### Admin Dashboard
- View consent statistics
- Data access request queue
- Account deletion queue
- Workshop agreement status

---

## 📝 Next Steps

1. Create consent management migration
2. Update customer signup with consent checkboxes
3. Build privacy settings page
4. Implement data download API
5. Build account deletion system
6. Create workshop agreement signing flow

---

**Phase 3 Start:** Let's begin with the consent management migration!
