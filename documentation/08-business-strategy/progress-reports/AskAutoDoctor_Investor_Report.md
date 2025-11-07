# **AskAutoDoctor**
## Real-Time Automotive Diagnostic Consultation Platform

### Investor Report
**Confidential - For Investment Consideration Only**

---

**Prepared:** January 2025
**Market:** Canada
**Development Stage:** MVP+ (85% Complete)
**Website:** askautodoctor.com

---

<div style="page-break-after: always;"></div>

## **1. BUSINESS DESCRIPTION**

### Executive Summary

AskAutoDoctor is a real-time automotive diagnostic consultation platform connecting vehicle owners with certified mechanics through HD video calls and text chat. We eliminate the need for in-person visits, providing instant expert diagnosis from home, office, or roadside.

> **"Instant mechanic advice at 70% lower cost than traditional diagnostics"**

### Core Value Proposition

- **Instant Expert Access:** Connect with certified mechanics in minutes
- **Cost Transparency:** Avoid dealership markups and unnecessary repairs
- **Maximum Convenience:** Diagnose from anywhere via video call
- **Second Opinions:** Validate quotes from local repair shops
- **DIY Guidance:** Step-by-step troubleshooting for simple repairs
- **Pre-Purchase Inspections:** Expert evaluation before buying used vehicles

### How It Works

**For Customers:**
Select service tier (Free Trial → Standard → Full Diagnostic) → Connect with available certified mechanic → Receive real-time diagnosis → Get automated session summary → Request competitive repair quotes → Track repair jobs with status updates

**For Mechanics:**
Set availability schedule → Accept incoming session requests → Conduct video/chat diagnostic sessions → Send direct repair quotes → Bid on RFQ marketplace opportunities → Receive 80% of session fees via Stripe Connect

### Target Market Segments

**Primary - B2C Customers (Individual Vehicle Owners):**
- 23 million registered vehicles in Canada (2024)
- Price-conscious owners seeking affordable expert advice
- DIY enthusiasts needing professional guidance
- Used car buyers requiring pre-purchase inspections

**Secondary - Workshop Partners:**
- Independent mechanics earning supplemental income
- Certified technicians working remotely
- Workshop-affiliated mechanics accepting repair jobs

---

<div style="page-break-after: always;"></div>

## **2. REVENUE MODEL**

### A. Pay-Per-Session Pricing (Primary Revenue)

| Tier | Price | Duration | Platform Fee (20%) |
|------|-------|----------|-------------------|
| Free Trial | $0 | 5 min | Loss leader |
| Quick Chat | $9.99 | 30 min | $2.00 |
| Standard Video | $29.99 | 45 min | $6.00 |
| Full Diagnostic | $49.99 | 60 min | $10.00 |

**Revenue split:** Platform keeps 20%, Mechanic receives 80% via automated Stripe Connect payouts

### B. Additional Revenue Streams

**1. Subscription Model (In Implementation):**
Credit-based monthly plans - 5 sessions/month for $39 CAD (22% savings). Target: $10K MRR within 6 months.

**2. Session Extensions:**
Mid-session time purchases at $10 per 15 minutes. Estimated 15-20% conversion rate = $1.50-$3 additional revenue per session.

**3. RFQ Marketplace Fees:**
Customers post repair requests, workshops bid competitively. Platform fee: 5-8% of accepted bid value. Target GMV: $50K-$100K monthly.

**4. Brand Specialist Premium:**
Premium mechanics for specific brands (BMW, Mercedes, Tesla) with +30% surcharge. Same 20% platform split on higher base.

**5. Corporate Accounts (Enterprise):**
Fleet management contracts with volume pricing. Target ACV: $5K-$25K per client.

### Year 1 Revenue Projections (CAD)

| Quarter | Sessions | Session Revenue | Platform Revenue |
|---------|----------|-----------------|------------------|
| Q1 (Mo 1-3) | 150 | $4,500 | $900 |
| Q2 (Mo 4-6) | 500 | $15,000 | $3,000 |
| Q3 (Mo 7-9) | 1,000 | $30,000 | $6,000 |
| Q4 (Mo 10-12) | 1,500 | $45,000 | $9,000 |

> **Year 1 Target Revenue: $100K-$150K CAD | Gross Profit: $25K-$35K**

---

<div style="page-break-after: always;"></div>

## **3. MARKET STUDY (COMPETITION)**

### Canadian Market Overview

The Canadian automotive aftermarket is valued at **$21.6 billion annually** (2024), with diagnostic services representing approximately **$1.8-$2.2 billion**. With 23 million registered vehicles and rising repair costs (average $450-$650 per visit), consumers increasingly seek cost-effective alternatives to traditional dealership diagnostics.

### Competitive Landscape (Canada)

**1. JustAnswer.com (International - Operates in Canada)**
- **Model:** Text-based Q&A with mechanics ($5-$50 CAD/question)
- **Weakness:** No real-time video, slow response times (hours to days)
- **Our Advantage:** Instant HD video sessions, live interactive diagnostics

**2. BCAA Auto Advice (BC-specific)**
- **Model:** Phone-based advice for BCAA members only
- **Weakness:** Audio only, geographic restriction, membership required
- **Our Advantage:** Video diagnostics, nationwide coverage, pay-as-you-go

**3. Canadian Tire Auto Service**
- **Model:** In-person diagnostics at 500+ locations ($89.99+ diagnostic fee)
- **Weakness:** Requires vehicle transport, appointment delays, high cost
- **Our Advantage:** Remote-first, 65% cheaper, instant availability

**4. Mobile Mechanics (Fiix, YourMechanic Canada)**
- **Model:** On-site mobile mechanics ($80-$150/hour + travel fees)
- **Weakness:** High cost, scheduling delays, limited urban coverage
- **Our Advantage:** Instant access, 70% cheaper, nationwide coverage

**5. Traditional Repair Shops**
- **Model:** In-person diagnostics ($100-$150 CAD diagnostic fees)
- **Weakness:** Vehicle transport required, time-consuming, opaque pricing
- **Our Advantage:** No transport needed, transparent pricing, second opinion capability

### Market Positioning

AskAutoDoctor occupies a unique white space in the Canadian market: more interactive than JustAnswer, more accessible than mobile mechanics, faster than traditional shops, and more affordable than dealership diagnostics. **We are the only platform offering live HD video diagnostics with instant mechanic matching across Canada.**

### Total Addressable Market (TAM)

| Metric | Value |
|--------|-------|
| **Canadian Registered Vehicles (2024)** | 23 million vehicles |
| **Annual Diagnostic Services Market (Canada)** | $1.8 - $2.2 billion CAD |
| **Serviceable Addressable Market (Tech-savvy owners: 15%)** | $270 - $330 million CAD |
| **Target Market Share (Year 3: 0.3%)** | $800K - $1M CAD annual revenue |

---

<div style="page-break-after: always;"></div>

## **4. COSTING & UNIT ECONOMICS**

### Technology Infrastructure (Monthly Costs CAD)

| Service | Purpose | Cost/Month |
|---------|---------|------------|
| Vercel | Serverless Hosting | $25-$250 |
| Supabase | Database + Auth | $32 (Pro) |
| LiveKit Cloud | Video Infrastructure | $130-$650 |
| Stripe | Payments | 2.9% + $0.30/txn |
| Resend | Email Notifications | $26 |

**Total Monthly Infrastructure:** $213-$958 CAD (scales with session volume)
**Annual Infrastructure:** $2,600-$11,500 CAD

### Customer Acquisition & Operations

- **Organic SEO & Content Marketing:** $650-$1,300/month
- **Google Ads (Canada):** $1,300-$3,900/month (CPC $2-$5 CAD)
- **Target CAC:** $13-$26 CAD per customer
- **Customer Support:** Founder-led initially, then $2,000/mo (part-time)
- **Liability Insurance:** $2,600-$6,500/year (critical requirement)

### Unit Economics - Per Session Analysis (Standard Video @ $29.99 CAD)

| Item | Amount (CAD) |
|------|--------------|
| Gross Revenue | $29.99 |
| Mechanic Payout (80%) | -$24.00 |
| Stripe Fee (2.9% + $0.30) | -$1.17 |
| LiveKit Cost (45 min) | -$0.24 |
| Infrastructure (allocated) | -$0.65 |
| **Net Profit per Session** | **$3.93 (13.1%)** |

### Break-Even Analysis

- **Monthly Fixed Costs:** $3,250 CAD (infrastructure + marketing + support)
- **Sessions Required to Break Even:** 827 sessions/month
- **Target Volume:** 1,000 sessions/month = $680 monthly profit
- **Path to Profitability:** Month 6-8 with sustained customer acquisition

> **Key Insight:** RFQ marketplace (5-8% platform fee on repair jobs) offers significantly higher margins than sessions. A $2,000 repair bid generates $100-$160 in platform fees vs. $6 for a video session.

---

<div style="page-break-after: always;"></div>

## **5. SWOT ANALYSIS**

### STRENGTHS

✓ **Technical Sophistication:** Production-grade video infrastructure (LiveKit), 85% complete MVP, 200+ API endpoints, type-safe TypeScript codebase

✓ **Dual Revenue Streams:** Session fees (immediate) + RFQ marketplace (high-value) + subscription model (recurring)

✓ **Network Effects:** More mechanics → faster response → happier customers → more mechanics

✓ **Low Marginal Costs:** Serverless infrastructure scales automatically, no physical locations, automated payouts

✓ **Regulatory Compliance:** PIPEDA compliant (Canadian privacy law), consent management, audit trails

✓ **First-Mover Advantage:** Only platform offering live HD video mechanic diagnostics in Canada

✓ **Competitive Pricing:** 65-70% cheaper than traditional in-person diagnostics

### WEAKNESSES

⚠ **Mechanic Supply Risk:** Success depends on recruiting certified mechanics with consistent availability

⚠ **Customer Education Required:** New concept requires trust-building and market education

⚠ **Video Quality Dependency:** Requires stable internet, good lighting, some issues need in-person inspection

⚠ **Thin Unit Economics:** $3.93 profit/session vulnerable to cost increases (LiveKit, Stripe fees)

⚠ **Retention Features Incomplete:** Subscription upsells, referral programs, maintenance reminders in development

### OPPORTUNITIES

★ **Market Tailwinds:** Post-COVID comfort with video consultations, rising repair costs, mechanic shortage, EV adoption

★ **Partnership Opportunities:** Auto parts retailers (Canadian Tire, NAPA), insurance companies (Intact, Desjardins), fleet management

★ **Provincial Expansion:** Launch Ontario/BC first, expand to AB, QC, MB with localized marketing

★ **B2B Vertical:** Fleet operators, car rental companies, corporate vehicle programs

★ **Data Monetization:** Anonymized diagnostic data for manufacturers, predictive maintenance algorithms

★ **White-Label Platform:** License technology to workshop networks and dealership chains

### THREATS

✕ **Competitor Response:** Established players (Canadian Tire, BCAA) could add video diagnostics

✕ **Regulatory Risk:** Mechanic licensing varies by province, liability concerns, insurance requirements

✕ **Technology Cost Escalation:** LiveKit pricing changes could erode margins

✕ **Reputation Risk:** Negative reviews from bad mechanic experiences or misdiagnoses

✕ **Seasonal Demand:** Lower demand in summer, higher in winter (requires mechanic supply balancing)

---

<div style="page-break-after: always;"></div>

## **6. TIMELINES & DEVELOPMENT ROADMAP**

### Development Timeline Completed

**Phase 1: Core Platform (Months 1-3) - ✓ COMPLETE**
- Multi-role authentication system (customers, mechanics, admins)
- Live HD video/chat sessions (LiveKit integration)
- Session lifecycle management (FSM-based state machine)
- Stripe payment integration with automated payouts
- **Status:** Production-ready

**Phase 2: Advanced Features (Months 4-6) - ✓ COMPLETE**
- Auto-generated session summaries with AI-ready infrastructure
- PIPEDA compliance system (consent management, audit trails)
- Vehicle management with VIN decoding (NHTSA API)
- Brand specialist matching (premium mechanics)
- Customer onboarding system with progress tracking
- **Status:** Production-ready

**Phase 3: Marketplace (Months 7-9) - ✓ 90% COMPLETE**
- RFQ marketplace with competitive bidding
- Direct quote system from mechanics
- Repair job tracking (9 status types)
- Escrow payment system with admin controls
- **Status:** Backend complete, UI polish pending

**Phase 4: Unification (Month 10) - ✓ 80% COMPLETE**
- Unified "Quotes & Jobs" customer view
- 18 production API endpoints (all complete)
- Admin control center (escrow release, refunds)
- **Status:** APIs ready, frontend UI pending

> **Current Development Stage: 85% MVP+ Complete**
> • Total Development Investment: 800-1,000 hours ($52K-$130K CAD value)
> • Lines of Code: ~20,000 (TypeScript + SQL)
> • Breaking Changes: 0 (all additive architecture)

### Roadmap to 100% Launch (Next 6-8 Weeks)

**Weeks 1-2: Customer Experience Polish - ✓ COMPLETE**
- Quote acceptance payment flow (implemented)
- RFQ bid payment flow (implemented)
- Automated refund webhooks (implemented)

**Weeks 3-4: UI Enhancement**
- Customer-facing repair tracker UI
- Subscription upsell prompts
- Improved login page with social auth
- Session summary email automation

**Weeks 5-6: Retention Features**
- Referral program UI implementation
- Maintenance reminder cron jobs
- Customer analytics dashboard

**Weeks 7-8: Launch Preparation**
- End-to-end QA testing
- Security audit
- Performance optimization
- Beta launch (100 users - ON/BC)

---

<div style="page-break-after: always;"></div>

## **7. GO-TO-MARKET STRATEGY & MILESTONES**

### Launch Timeline

| Milestone | Target Date | Success Metric |
|-----------|-------------|----------------|
| Beta Launch (ON/BC) | Week 4 | 100 registered users |
| Public Launch | Week 10 | 500 registered users |
| First 100 Customers | Month 4 | $2,500 revenue |
| Break-Even | Month 6-8 | 827 sessions/month |
| Profitability | Month 9-12 | 1,000+ sessions/month |

### Customer Acquisition Strategy

**1. Organic SEO:**
Target high-intent keywords ("car diagnostic help Canada", "mechanic video call", "second opinion car repair"). Content marketing via blog (100+ automotive troubleshooting guides).

**2. Paid Acquisition:**
Google Ads ($1,300-$3,900/month) targeting Ontario and BC initially. Facebook/Instagram ads showcasing customer testimonials and cost savings vs. dealerships.

**3. Strategic Partnerships:**
Canadian Tire (referral program for pre-purchase inspections), insurance companies (Intact, Desjardins - bundled with policies), auto parts retailers (NAPA, AutoZone Canada - "Ask before you buy").

**4. Community Engagement:**
Reddit (r/MechanicAdvice, r/PersonalFinanceCanada), automotive forums, Facebook groups, mechanic communities.

### Mechanic Recruitment Strategy

- **Target:** 15-20 certified mechanics (Red Seal or provincial certification)
- **Coverage:** Ontario (8-10), BC (5-7), Alberta (3-5) in Phase 1
- **Channels:** LinkedIn outreach, mechanic forums, trade schools, workshop partnerships
- **Value Proposition:** Supplemental income, flexible hours, 80% revenue share
- **Onboarding:** Automated certification verification, video quality check, trial session

### Key Success Metrics (First 6 Months)

| Metric | Target |
|--------|--------|
| Customer Acquisition Cost (CAC) | $13-$26 CAD |
| Customer Lifetime Value (LTV) | $150-$200 CAD (5-7 sessions) |
| LTV:CAC Ratio | 5:1 or higher |
| Repeat Customer Rate | 30-40% |
| Net Promoter Score (NPS) | 50+ (excellent) |
| Mechanic Satisfaction | 4.5+ star average |

### Risk Mitigation Strategies

- **Liability Insurance:** Secured before public launch ($2,600-$6,500/year)
- **Quality Control:** Customer rating system, mechanic performance monitoring
- **Customer Trust:** Money-back guarantee for first session, transparent pricing
- **Technology Risk:** Multi-cloud strategy, LiveKit fallback options
- **Regulatory Compliance:** Legal review in each province before expansion

---

<div style="page-break-after: always;"></div>

## **8. INVESTMENT OPPORTUNITY**

### Funding Requirements

We are seeking **$325,000 - $650,000 CAD in seed funding** to accelerate customer acquisition, complete product development, and establish market leadership in Canadian automotive remote diagnostics.

### Use of Funds

| Category | Allocation | Purpose |
|----------|-----------|---------|
| Customer Acquisition | $195K (60%) | Paid ads, SEO, partnerships (12 months) |
| Product Development | $65K (20%) | Complete remaining 15%, QA, mobile app |
| Operations | $49K (15%) | Support staff, insurance, infrastructure |
| Contingency | $16K (5%) | Risk buffer |

### Financial Projections (3-Year)

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Total Sessions | 3,150 | 12,000 | 30,000 |
| Gross Revenue | $94K | $360K | $900K |
| Platform Revenue | $19K | $72K | $180K |
| Marketplace GMV | $200K | $800K | $2M |
| Marketplace Fees (7%) | $14K | $56K | $140K |
| **Total Platform Revenue** | **$33K** | **$128K** | **$320K** |

### Investment Highlights

✓ **First-Mover Advantage:** Only live HD video automotive diagnostic platform in Canada

✓ **Proven Technical Execution:** 85% complete MVP, $52K-$130K development value already invested

✓ **Scalable Business Model:** Dual revenue streams (sessions + marketplace), low marginal costs

✓ **Large Market Opportunity:** $270-$330M SAM in Canada, potential for international expansion

✓ **Strong Unit Economics:** Path to profitability within 9-12 months

✓ **Network Effects:** Platform value increases with both customer and mechanic growth

### Exit Opportunities

- Acquisition by automotive aftermarket players (Canadian Tire, NAPA Auto Parts)
- Insurance company acquisition (Intact, Desjardins, CAA)
- Technology licensing to dealership networks and OEMs
- International expansion and strategic partnerships
- **Target Exit:** 3-5 years at $10M-$20M valuation

---

> **Investment Ask: $325K-$650K CAD Seed Funding**
> **Use:** Customer acquisition, product completion, 12-month runway
> **Projected Valuation:** $2.5M-$3.5M pre-money (pending beta traction)
> **Expected ROI:** 5-10x in 3-5 years

### Contact Information

**Website:** askautodoctor.com
**Status:** Beta launch scheduled Week 4
**Development Stage:** 85% MVP+ Complete

---

*AskAutoDoctor - Investor Report | Confidential | Thank you for your consideration*
