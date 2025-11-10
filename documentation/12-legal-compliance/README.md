# 12-legal-compliance

**Purpose:** Legal analysis, workshop policies, compliance documentation, and contractual frameworks

---

## Overview

This folder contains all legal and compliance documentation for the AskAutoDoctor platform, including:
- Legal analysis of customer ownership
- Workshop mechanic policies
- Revenue sharing agreements
- Account separation rules
- Compliance with Canadian law

---

## Contents

### Customer Ownership & Legal Framework

#### CUSTOMER_OWNERSHIP_LEGAL_ANALYSIS.md
**Critical Question:** Who owns the customers? Can mechanics "steal" them?

**Key Legal Principle:**
Customers acquired through a PLATFORM belong to the PLATFORM, not the workshop or mechanic.

**Why?**
- Platform brought the customer through marketing/SEO
- Customer pays the platform (via Stripe)
- Customer has account on platform
- Platform controls the relationship

**Scenario Covered:**
```
1. Customer Sarah books through platform
2. Matched with Mike (working for AutoFix Workshop)
3. Session during Mike's work hours → Revenue to AutoFix
4. Mike quits AutoFix after 6 months
5. After 30-day cooling period → Mike is independent
6. Sarah needs help again → Matched with Mike (now independent)
7. Revenue goes to Mike (not AutoFix)

VERDICT: Mike did NOT "steal" the customer.
Sarah is the PLATFORM'S customer.
```

### Workshop Policies

#### VIRTUAL_VS_WORKSHOP_MECHANICS_POLICY.md
Defines the multi-tier mechanic classification system:

**Three Mechanic Types:**
1. **Independent Virtual Mechanics**
   - Own business
   - Keep 70% of session revenue
   - Platform keeps 30%
   - Can refer customers for physical work (earn referral fee)

2. **Workshop Mechanics (On-Shift)**
   - Work during workshop hours
   - Revenue goes to WORKSHOP (not mechanic)
   - Workshop keeps 70%, platform keeps 30%
   - Cannot take sessions outside work hours

3. **Workshop Owners**
   - Can take virtual sessions when not managing
   - Personal revenue (70%) separate from workshop revenue
   - Can manage workshop analytics and team

#### WORKSHOP_MECHANIC_BUSINESS_MODEL.md
Details the workshop revenue model:

**Revenue Streams for Workshops:**
1. **Virtual Sessions** (mechanic on-shift): 70/30 split
2. **Referral Fees**: Variable based on referral type
   - Workshop referral: Workshop earns fee
   - Independent mechanic referral: Mechanic earns 2-5%
3. **Subscription Plans** (future): Monthly revenue

**Revenue Distribution:**
- Platform handles all payments via Stripe Connect
- Automatic splits to workshop accounts
- Workshop pays mechanics from their share (internal matter)

#### WORKSHOP_MECHANICS_EXECUTIVE_REPORT.md
Executive summary of workshop integration:

**Key Points:**
- Workshops pay mechanics (salary/hourly) - internal matter
- Platform pays workshops 70% of session revenue
- Workshops can refer customers for physical repairs
- 30-day cooling period for mechanics leaving workshops
- No customer "theft" - customers belong to platform

### Account Separation

#### ACCOUNT_SEPARATION_EXPLANATION.md
Explains why mechanics need separate accounts for virtual vs. workshop work:

**Why Separate Accounts?**
1. **Revenue Tracking:** Virtual income vs. workshop income
2. **Tax Reporting:** Different tax entities
3. **Legal Clarity:** Clear ownership boundaries
4. **Conflict Prevention:** No confusion about who earned what

**Implementation:**
- Single Supabase user can have multiple mechanic profiles
- Each profile has role: 'independent' or 'workshop_member'
- Sessions track which profile was used
- Revenue routed to correct Stripe account

### Legal Solutions

#### LEGAL_COMPLIANT_DUAL_MODE_SOLUTION.md
Describes how mechanics can work both independently AND for workshops:

**Dual-Mode Mechanic:**
- Mike has TWO mechanic profiles:
  1. "Mike's Independent Service" (independent)
  2. "Mike @ AutoFix Workshop" (workshop_member)

**Rules:**
- During workshop hours (9am-5pm Mon-Fri):
  - Uses workshop profile
  - Revenue → Workshop
  - Appears as "AutoFix Workshop" to customers

- Outside workshop hours:
  - Uses independent profile
  - Revenue → Mike personally
  - Appears as "Mike's Independent Service"

**When Leaving Workshop:**
- Disable workshop profile
- 30-day cooling period (optional grace period)
- Independent profile remains active
- No customer "theft" issue

---

## Critical Legal Principles

### 1. Platform Owns Customer Relationship
- Customer signs up on PLATFORM
- Customer pays PLATFORM (Stripe)
- Customer data stored on PLATFORM
- Mechanics are SERVICE PROVIDERS, not business owners

### 2. 30-Day Cooling Period
- When mechanic leaves workshop
- Cannot immediately take sessions as independent (optional)
- Prevents immediate revenue diversion
- Protects workshop investment

### 3. Contact Privacy
- Platform does NOT share customer phone/email with mechanics
- All communication through platform chat
- Prevents off-platform poaching
- Critical for business model

### 4. Revenue Split Transparency
- 70/30 split clearly disclosed
- Mechanics know what they earn
- Workshops know what they earn
- No hidden fees

### 5. Canadian Law Compliance
- Independent contractor classification
- GST/HST collection
- Tax reporting requirements
- Business registration requirements

---

## For Workshop Owners

### What You Need to Know:
1. **You DON'T own the customers**
   - Customers belong to the platform
   - You provide services through the platform
   - You earn 70% of session revenue

2. **How You Make Money:**
   - Virtual sessions: 70% of session fee
   - Referral fees: Variable based on referral type
   - Future subscriptions: Monthly recurring revenue

3. **Your Mechanics:**
   - You pay them (salary/hourly) - your choice
   - Platform pays YOU, you pay them
   - They work under your workshop account during shifts

4. **When Mechanics Leave:**
   - They may work independently after 30 days
   - Customers may book them independently
   - This is NOT theft - customers belong to platform
   - Your workshop revenue continues with other mechanics

### Recommended Reading:
1. WORKSHOP_MECHANICS_EXECUTIVE_REPORT.md (complete overview)
2. CUSTOMER_OWNERSHIP_LEGAL_ANALYSIS.md (understand customer ownership)
3. LEGAL_COMPLIANT_DUAL_MODE_SOLUTION.md (dual-mode mechanics)

---

## For Independent Mechanics

### What You Need to Know:
1. **You're an Independent Contractor:**
   - Responsible for your own taxes
   - Need business registration
   - Collect GST/HST if applicable

2. **Revenue:**
   - You keep 70% of session fees
   - Platform keeps 30%
   - Direct deposit via Stripe Connect

3. **Working for Workshops:**
   - Can work for workshops AND independently
   - Need separate mechanic profiles
   - Workshop sessions during their hours → Workshop gets revenue
   - Independent sessions outside hours → You get revenue

4. **Referral Fees:**
   - Refer customers for physical work
   - Earn 2-5% referral fee
   - Paid monthly via Stripe Connect

### Recommended Reading:
1. VIRTUAL_VS_WORKSHOP_MECHANICS_POLICY.md (mechanic types)
2. ACCOUNT_SEPARATION_EXPLANATION.md (why separate accounts)
3. LEGAL_COMPLIANT_DUAL_MODE_SOLUTION.md (dual-mode work)

---

## For Platform Administrators

### Policy Enforcement:
1. **Customer Ownership:**
   - Never share customer contact info with mechanics
   - All communication through platform
   - Monitor for off-platform solicitation

2. **Revenue Distribution:**
   - Verify Stripe Connect setup for each mechanic/workshop
   - Monitor 70/30 splits
   - Handle disputes fairly

3. **Account Separation:**
   - Enforce separate profiles for dual-mode mechanics
   - Verify workshop membership claims
   - Monitor for policy violations

4. **Cooling Period:**
   - Track mechanic departures from workshops
   - Enforce 30-day cooling period (if policy enabled)
   - Document all transitions

### Legal Risk Mitigation:
- See LEGAL_TEMPLATES/ for contract templates
- Consult legal counsel for specific situations
- Document all policy decisions
- Maintain audit trail

---

## Related Documentation

- **Business Logic:** See [00-summaries-analysis/BUSINESS_LOGIC_FINAL_REPORT.md](../00-summaries-analysis/BUSINESS_LOGIC_FINAL_REPORT.md)
- **Workshop Features:** See [02-feature-documentation/workshop-management](../02-feature-documentation/workshop-management/)
- **Revenue System:** See [02-feature-documentation/pricing-system](../02-feature-documentation/pricing-system/)
- **Legal Templates:** See [LEGAL_TEMPLATES](../LEGAL_TEMPLATES/)

---

## Legal Disclaimer

**IMPORTANT:** This documentation is for operational guidance only and does not constitute legal advice. Always consult with qualified legal counsel regarding:
- Contract terms
- Tax obligations
- Business structure
- Regulatory compliance
- Dispute resolution

The platform operates under Canadian law. Mechanics and workshops are responsible for compliance with all applicable federal, provincial, and local regulations.

---

**Last Updated:** 2025-11-09
**Maintained By:** Legal & Compliance Team
**Legal Review Required:** Annually or when policies change
