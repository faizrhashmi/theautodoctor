import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';
import fs from 'fs';
import path from 'path';

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  coverPage: {
    padding: 60,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 16,
    color: '#16a085',
    marginBottom: 30,
    textAlign: 'center',
  },
  coverInfo: {
    fontSize: 12,
    color: '#cccccc',
    marginTop: 60,
    textAlign: 'center',
  },
  section: {
    marginBottom: 15,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
    borderBottom: '2pt solid #16a085',
    paddingBottom: 4,
  },
  subheader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 10,
    marginBottom: 6,
  },
  text: {
    fontSize: 10,
    marginBottom: 6,
    textAlign: 'justify',
    color: '#333333',
  },
  bulletPoint: {
    fontSize: 10,
    marginBottom: 4,
    marginLeft: 15,
    color: '#333333',
  },
  table: {
    display: 'table',
    width: 'auto',
    marginTop: 8,
    marginBottom: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  tableHeader: {
    backgroundColor: '#16a085',
    color: '#ffffff',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 6,
    fontSize: 9,
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#cccccc',
  },
  highlightBox: {
    backgroundColor: '#f0f9ff',
    padding: 10,
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 8,
    borderLeft: '3pt solid #16a085',
  },
  highlightText: {
    fontSize: 10,
    color: '#1a1a2e',
    fontWeight: 'bold',
  },
  metricBox: {
    backgroundColor: '#e8f5e9',
    padding: 8,
    marginBottom: 6,
    borderRadius: 4,
  },
  metricLabel: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#16a085',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#999999',
    textAlign: 'center',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: '#999999',
  },
  strengthIcon: {
    color: '#16a085',
    fontWeight: 'bold',
  },
  weaknessIcon: {
    color: '#e67e22',
    fontWeight: 'bold',
  },
  opportunityIcon: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  threatIcon: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
});

// Document component
const InvestorReport = () => (
  <Document>
    {/* Cover Page */}
    <Page size="A4" style={styles.coverPage}>
      <Text style={styles.coverTitle}>AskAutoDoctor</Text>
      <Text style={styles.coverSubtitle}>Real-Time Automotive Diagnostic Consultation Platform</Text>
      <View style={{ marginTop: 40 }}>
        <Text style={{ fontSize: 14, color: '#ffffff', marginBottom: 8, textAlign: 'center' }}>
          Investor Report
        </Text>
        <Text style={{ fontSize: 12, color: '#cccccc', textAlign: 'center' }}>
          Confidential - For Investment Consideration Only
        </Text>
      </View>
      <View style={styles.coverInfo}>
        <Text>Prepared: January 2025</Text>
        <Text>Market: Canada</Text>
        <Text>Development Stage: MVP+ (85% Complete)</Text>
        <Text style={{ marginTop: 20, fontSize: 10 }}>askautodoctor.com</Text>
      </View>
    </Page>

    {/* Page 1: Business Description */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>1. BUSINESS DESCRIPTION</Text>

      <View style={styles.section}>
        <Text style={styles.subheader}>Executive Summary</Text>
        <Text style={styles.text}>
          AskAutoDoctor is a real-time automotive diagnostic consultation platform connecting vehicle owners
          with certified mechanics through HD video calls and text chat. We eliminate the need for in-person
          visits, providing instant expert diagnosis from home, office, or roadside.
        </Text>
      </View>

      <View style={styles.highlightBox}>
        <Text style={styles.highlightText}>
          "Instant mechanic advice at 70% lower cost than traditional diagnostics"
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Core Value Proposition</Text>
        <Text style={styles.bulletPoint}>• Instant Expert Access: Connect with certified mechanics in minutes</Text>
        <Text style={styles.bulletPoint}>• Cost Transparency: Avoid dealership markups and unnecessary repairs</Text>
        <Text style={styles.bulletPoint}>• Maximum Convenience: Diagnose from anywhere via video call</Text>
        <Text style={styles.bulletPoint}>• Second Opinions: Validate quotes from local repair shops</Text>
        <Text style={styles.bulletPoint}>• DIY Guidance: Step-by-step troubleshooting for simple repairs</Text>
        <Text style={styles.bulletPoint}>• Pre-Purchase Inspections: Expert evaluation before buying used vehicles</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>How It Works</Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>For Customers:</Text> Select service tier (Free Trial → Standard →
          Full Diagnostic) → Connect with available certified mechanic → Receive real-time diagnosis → Get automated
          session summary → Request competitive repair quotes → Track repair jobs with status updates.
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>For Mechanics:</Text> Set availability schedule → Accept incoming
          session requests → Conduct video/chat diagnostic sessions → Send direct repair quotes → Bid on RFQ
          marketplace opportunities → Receive 80% of session fees via Stripe Connect.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Target Market Segments</Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>Primary - B2C Customers (Individual Vehicle Owners):</Text>
        </Text>
        <Text style={styles.bulletPoint}>• 23 million registered vehicles in Canada (2024)</Text>
        <Text style={styles.bulletPoint}>• Price-conscious owners seeking affordable expert advice</Text>
        <Text style={styles.bulletPoint}>• DIY enthusiasts needing professional guidance</Text>
        <Text style={styles.bulletPoint}>• Used car buyers requiring pre-purchase inspections</Text>

        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>Secondary - Workshop Partners:</Text>
        </Text>
        <Text style={styles.bulletPoint}>• Independent mechanics earning supplemental income</Text>
        <Text style={styles.bulletPoint}>• Certified technicians working remotely</Text>
        <Text style={styles.bulletPoint}>• Workshop-affiliated mechanics accepting repair jobs</Text>
      </View>

      <Text style={styles.footer}>
        AskAutoDoctor - Investor Report | Confidential
      </Text>
      <Text style={styles.pageNumber}>1</Text>
    </Page>

    {/* Page 2: Revenue Model */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>2. REVENUE MODEL</Text>

      <View style={styles.section}>
        <Text style={styles.subheader}>A. Pay-Per-Session Pricing (Primary Revenue)</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Tier</Text>
            <Text style={styles.tableCell}>Price</Text>
            <Text style={styles.tableCell}>Duration</Text>
            <Text style={styles.tableCell}>Platform Fee (20%)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Free Trial</Text>
            <Text style={styles.tableCell}>$0</Text>
            <Text style={styles.tableCell}>5 min</Text>
            <Text style={styles.tableCell}>Loss leader</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Quick Chat</Text>
            <Text style={styles.tableCell}>$9.99</Text>
            <Text style={styles.tableCell}>30 min</Text>
            <Text style={styles.tableCell}>$2.00</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Standard Video</Text>
            <Text style={styles.tableCell}>$29.99</Text>
            <Text style={styles.tableCell}>45 min</Text>
            <Text style={styles.tableCell}>$6.00</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Full Diagnostic</Text>
            <Text style={styles.tableCell}>$49.99</Text>
            <Text style={styles.tableCell}>60 min</Text>
            <Text style={styles.tableCell}>$10.00</Text>
          </View>
        </View>
        <Text style={styles.text}>
          Revenue split: Platform keeps 20%, Mechanic receives 80% via automated Stripe Connect payouts.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>B. Additional Revenue Streams</Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>1. Subscription Model (In Implementation):</Text> Credit-based
          monthly plans - 5 sessions/month for $39 CAD (22% savings). Target: $10K MRR within 6 months.
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>2. Session Extensions:</Text> Mid-session time purchases at
          $10 per 15 minutes. Estimated 15-20% conversion rate = $1.50-$3 additional revenue per session.
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>3. RFQ Marketplace Fees:</Text> Customers post repair requests,
          workshops bid competitively. Platform fee: 5-8% of accepted bid value. Target GMV: $50K-$100K monthly.
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>4. Brand Specialist Premium:</Text> Premium mechanics for specific
          brands (BMW, Mercedes, Tesla) with +30% surcharge. Same 20% platform split on higher base.
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>5. Corporate Accounts (Enterprise):</Text> Fleet management
          contracts with volume pricing. Target ACV: $5K-$25K per client.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Year 1 Revenue Projections (CAD)</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Quarter</Text>
            <Text style={styles.tableCell}>Sessions</Text>
            <Text style={styles.tableCell}>Session Revenue</Text>
            <Text style={styles.tableCell}>Platform Revenue</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Q1 (Mo 1-3)</Text>
            <Text style={styles.tableCell}>150</Text>
            <Text style={styles.tableCell}>$4,500</Text>
            <Text style={styles.tableCell}>$900</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Q2 (Mo 4-6)</Text>
            <Text style={styles.tableCell}>500</Text>
            <Text style={styles.tableCell}>$15,000</Text>
            <Text style={styles.tableCell}>$3,000</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Q3 (Mo 7-9)</Text>
            <Text style={styles.tableCell}>1,000</Text>
            <Text style={styles.tableCell}>$30,000</Text>
            <Text style={styles.tableCell}>$6,000</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Q4 (Mo 10-12)</Text>
            <Text style={styles.tableCell}>1,500</Text>
            <Text style={styles.tableCell}>$45,000</Text>
            <Text style={styles.tableCell}>$9,000</Text>
          </View>
        </View>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightText}>
            Year 1 Target Revenue: $100K-$150K CAD | Gross Profit: $25K-$35K
          </Text>
        </View>
      </View>

      <Text style={styles.footer}>
        AskAutoDoctor - Investor Report | Confidential
      </Text>
      <Text style={styles.pageNumber}>2</Text>
    </Page>

    {/* Page 3: Market Study */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>3. MARKET STUDY (COMPETITION)</Text>

      <View style={styles.section}>
        <Text style={styles.subheader}>Canadian Market Overview</Text>
        <Text style={styles.text}>
          The Canadian automotive aftermarket is valued at $21.6 billion annually (2024), with diagnostic
          services representing approximately $1.8-$2.2 billion. With 23 million registered vehicles and
          rising repair costs (average $450-$650 per visit), consumers increasingly seek cost-effective
          alternatives to traditional dealership diagnostics.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Competitive Landscape (Canada)</Text>

        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>1. JustAnswer.com (International - Operates in Canada)</Text>
        </Text>
        <Text style={styles.bulletPoint}>• Model: Text-based Q&A with mechanics ($5-$50 CAD/question)</Text>
        <Text style={styles.bulletPoint}>• Weakness: No real-time video, slow response times (hours to days)</Text>
        <Text style={styles.bulletPoint}>• Our Advantage: Instant HD video sessions, live interactive diagnostics</Text>

        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>2. BCAA Auto Advice (BC-specific)</Text>
        </Text>
        <Text style={styles.bulletPoint}>• Model: Phone-based advice for BCAA members only</Text>
        <Text style={styles.bulletPoint}>• Weakness: Audio only, geographic restriction, membership required</Text>
        <Text style={styles.bulletPoint}>• Our Advantage: Video diagnostics, nationwide coverage, pay-as-you-go</Text>

        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>3. Canadian Tire Auto Service</Text>
        </Text>
        <Text style={styles.bulletPoint}>• Model: In-person diagnostics at 500+ locations ($89.99+ diagnostic fee)</Text>
        <Text style={styles.bulletPoint}>• Weakness: Requires vehicle transport, appointment delays, high cost</Text>
        <Text style={styles.bulletPoint}>• Our Advantage: Remote-first, 65% cheaper, instant availability</Text>

        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>4. Mobile Mechanics (Fiix, YourMechanic Canada)</Text>
        </Text>
        <Text style={styles.bulletPoint}>• Model: On-site mobile mechanics ($80-$150/hour + travel fees)</Text>
        <Text style={styles.bulletPoint}>• Weakness: High cost, scheduling delays, limited urban coverage</Text>
        <Text style={styles.bulletPoint}>• Our Advantage: Instant access, 70% cheaper, nationwide coverage</Text>

        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>5. Traditional Repair Shops</Text>
        </Text>
        <Text style={styles.bulletPoint}>• Model: In-person diagnostics ($100-$150 CAD diagnostic fees)</Text>
        <Text style={styles.bulletPoint}>• Weakness: Vehicle transport required, time-consuming, opaque pricing</Text>
        <Text style={styles.bulletPoint}>• Our Advantage: No transport needed, transparent pricing, second opinion capability</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Market Positioning</Text>
        <Text style={styles.text}>
          AskAutoDoctor occupies a unique white space in the Canadian market: more interactive than
          JustAnswer, more accessible than mobile mechanics, faster than traditional shops, and more
          affordable than dealership diagnostics. We're the only platform offering live HD video diagnostics
          with instant mechanic matching across Canada.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Total Addressable Market (TAM)</Text>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Canadian Registered Vehicles (2024)</Text>
          <Text style={styles.metricValue}>23 million vehicles</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Annual Diagnostic Services Market (Canada)</Text>
          <Text style={styles.metricValue}>$1.8 - $2.2 billion CAD</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Serviceable Addressable Market (Tech-savvy owners: 15%)</Text>
          <Text style={styles.metricValue}>$270 - $330 million CAD</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Target Market Share (Year 3: 0.3%)</Text>
          <Text style={styles.metricValue}>$800K - $1M CAD annual revenue</Text>
        </View>
      </View>

      <Text style={styles.footer}>
        AskAutoDoctor - Investor Report | Confidential
      </Text>
      <Text style={styles.pageNumber}>3</Text>
    </Page>

    {/* Page 4: Costing & Unit Economics */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>4. COSTING & UNIT ECONOMICS</Text>

      <View style={styles.section}>
        <Text style={styles.subheader}>Technology Infrastructure (Monthly Costs CAD)</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Service</Text>
            <Text style={styles.tableCell}>Purpose</Text>
            <Text style={styles.tableCell}>Cost/Month</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Vercel</Text>
            <Text style={styles.tableCell}>Serverless Hosting</Text>
            <Text style={styles.tableCell}>$25-$250</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Supabase</Text>
            <Text style={styles.tableCell}>Database + Auth</Text>
            <Text style={styles.tableCell}>$32 (Pro)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>LiveKit Cloud</Text>
            <Text style={styles.tableCell}>Video Infrastructure</Text>
            <Text style={styles.tableCell}>$130-$650</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Stripe</Text>
            <Text style={styles.tableCell}>Payments</Text>
            <Text style={styles.tableCell}>2.9% + $0.30/txn</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Resend</Text>
            <Text style={styles.tableCell}>Email Notifications</Text>
            <Text style={styles.tableCell}>$26</Text>
          </View>
        </View>
        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>Total Monthly Infrastructure:</Text> $213-$958 CAD
          (scales with session volume)
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>Annual Infrastructure:</Text> $2,600-$11,500 CAD
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Customer Acquisition & Operations</Text>
        <Text style={styles.bulletPoint}>• Organic SEO & Content Marketing: $650-$1,300/month</Text>
        <Text style={styles.bulletPoint}>• Google Ads (Canada): $1,300-$3,900/month (CPC $2-$5 CAD)</Text>
        <Text style={styles.bulletPoint}>• Target CAC: $13-$26 CAD per customer</Text>
        <Text style={styles.bulletPoint}>• Customer Support: Founder-led initially, then $2,000/mo (part-time)</Text>
        <Text style={styles.bulletPoint}>• Liability Insurance: $2,600-$6,500/year (critical requirement)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Unit Economics - Per Session Analysis (Standard Video @ $29.99 CAD)</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Item</Text>
            <Text style={styles.tableCell}>Amount (CAD)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Gross Revenue</Text>
            <Text style={styles.tableCell}>$29.99</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Mechanic Payout (80%)</Text>
            <Text style={styles.tableCell}>-$24.00</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Stripe Fee (2.9% + $0.30)</Text>
            <Text style={styles.tableCell}>-$1.17</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>LiveKit Cost (45 min)</Text>
            <Text style={styles.tableCell}>-$0.24</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Infrastructure (allocated)</Text>
            <Text style={styles.tableCell}>-$0.65</Text>
          </View>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Net Profit per Session</Text>
            <Text style={styles.tableCell}>$3.93 (13.1%)</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Break-Even Analysis</Text>
        <Text style={styles.bulletPoint}>• Monthly Fixed Costs: $3,250 CAD (infrastructure + marketing + support)</Text>
        <Text style={styles.bulletPoint}>• Sessions Required to Break Even: 827 sessions/month</Text>
        <Text style={styles.bulletPoint}>• Target Volume: 1,000 sessions/month = $680 monthly profit</Text>
        <Text style={styles.bulletPoint}>• Path to Profitability: Month 6-8 with sustained customer acquisition</Text>
      </View>

      <View style={styles.highlightBox}>
        <Text style={styles.highlightText}>
          Key Insight: RFQ marketplace (5-8% platform fee on repair jobs) offers significantly higher
          margins than sessions. A $2,000 repair bid generates $100-$160 in platform fees vs. $6 for
          a video session.
        </Text>
      </View>

      <Text style={styles.footer}>
        AskAutoDoctor - Investor Report | Confidential
      </Text>
      <Text style={styles.pageNumber}>4</Text>
    </Page>

    {/* Page 5: SWOT Analysis */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>5. SWOT ANALYSIS</Text>

      <View style={styles.section}>
        <Text style={styles.subheader}>STRENGTHS</Text>
        <Text style={[styles.bulletPoint, styles.strengthIcon]}>
          ✓ Technical Sophistication: Production-grade video infrastructure (LiveKit), 85% complete MVP,
          200+ API endpoints, type-safe TypeScript codebase
        </Text>
        <Text style={[styles.bulletPoint, styles.strengthIcon]}>
          ✓ Dual Revenue Streams: Session fees (immediate) + RFQ marketplace (high-value) + subscription
          model (recurring)
        </Text>
        <Text style={[styles.bulletPoint, styles.strengthIcon]}>
          ✓ Network Effects: More mechanics → faster response → happier customers → more mechanics
        </Text>
        <Text style={[styles.bulletPoint, styles.strengthIcon]}>
          ✓ Low Marginal Costs: Serverless infrastructure scales automatically, no physical locations,
          automated payouts
        </Text>
        <Text style={[styles.bulletPoint, styles.strengthIcon]}>
          ✓ Regulatory Compliance: PIPEDA compliant (Canadian privacy law), consent management,
          audit trails
        </Text>
        <Text style={[styles.bulletPoint, styles.strengthIcon]}>
          ✓ First-Mover Advantage: Only platform offering live HD video mechanic diagnostics in Canada
        </Text>
        <Text style={[styles.bulletPoint, styles.strengthIcon]}>
          ✓ Competitive Pricing: 65-70% cheaper than traditional in-person diagnostics
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>WEAKNESSES</Text>
        <Text style={[styles.bulletPoint, styles.weaknessIcon]}>
          ⚠ Mechanic Supply Risk: Success depends on recruiting certified mechanics with consistent availability
        </Text>
        <Text style={[styles.bulletPoint, styles.weaknessIcon]}>
          ⚠ Customer Education Required: New concept requires trust-building and market education
        </Text>
        <Text style={[styles.bulletPoint, styles.weaknessIcon]}>
          ⚠ Video Quality Dependency: Requires stable internet, good lighting, some issues need in-person inspection
        </Text>
        <Text style={[styles.bulletPoint, styles.weaknessIcon]}>
          ⚠ Thin Unit Economics: $3.93 profit/session vulnerable to cost increases (LiveKit, Stripe fees)
        </Text>
        <Text style={[styles.bulletPoint, styles.weaknessIcon]}>
          ⚠ Retention Features Incomplete: Subscription upsells, referral programs, maintenance reminders
          in development
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>OPPORTUNITIES</Text>
        <Text style={[styles.bulletPoint, styles.opportunityIcon]}>
          ★ Market Tailwinds: Post-COVID comfort with video consultations, rising repair costs,
          mechanic shortage, EV adoption
        </Text>
        <Text style={[styles.bulletPoint, styles.opportunityIcon]}>
          ★ Partnership Opportunities: Auto parts retailers (Canadian Tire, NAPA), insurance companies
          (Intact, Desjardins), fleet management
        </Text>
        <Text style={[styles.bulletPoint, styles.opportunityIcon]}>
          ★ Provincial Expansion: Launch Ontario/BC first, expand to AB, QC, MB with localized marketing
        </Text>
        <Text style={[styles.bulletPoint, styles.opportunityIcon]}>
          ★ B2B Vertical: Fleet operators, car rental companies, corporate vehicle programs
        </Text>
        <Text style={[styles.bulletPoint, styles.opportunityIcon]}>
          ★ Data Monetization: Anonymized diagnostic data for manufacturers, predictive maintenance algorithms
        </Text>
        <Text style={[styles.bulletPoint, styles.opportunityIcon]}>
          ★ White-Label Platform: License technology to workshop networks and dealership chains
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>THREATS</Text>
        <Text style={[styles.bulletPoint, styles.threatIcon]}>
          ✕ Competitor Response: Established players (Canadian Tire, BCAA) could add video diagnostics
        </Text>
        <Text style={[styles.bulletPoint, styles.threatIcon]}>
          ✕ Regulatory Risk: Mechanic licensing varies by province, liability concerns, insurance requirements
        </Text>
        <Text style={[styles.bulletPoint, styles.threatIcon]}>
          ✕ Technology Cost Escalation: LiveKit pricing changes could erode margins
        </Text>
        <Text style={[styles.bulletPoint, styles.threatIcon]}>
          ✕ Reputation Risk: Negative reviews from bad mechanic experiences or misdiagnoses
        </Text>
        <Text style={[styles.bulletPoint, styles.threatIcon]}>
          ✕ Seasonal Demand: Lower demand in summer, higher in winter (requires mechanic supply balancing)
        </Text>
      </View>

      <Text style={styles.footer}>
        AskAutoDoctor - Investor Report | Confidential
      </Text>
      <Text style={styles.pageNumber}>5</Text>
    </Page>

    {/* Page 6: Timelines & Development Stage */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>6. TIMELINES & DEVELOPMENT ROADMAP</Text>

      <View style={styles.section}>
        <Text style={styles.subheader}>Development Timeline Completed</Text>

        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>Phase 1: Core Platform (Months 1-3) - ✓ COMPLETE</Text>
        </Text>
        <Text style={styles.bulletPoint}>• Multi-role authentication system (customers, mechanics, admins)</Text>
        <Text style={styles.bulletPoint}>• Live HD video/chat sessions (LiveKit integration)</Text>
        <Text style={styles.bulletPoint}>• Session lifecycle management (FSM-based state machine)</Text>
        <Text style={styles.bulletPoint}>• Stripe payment integration with automated payouts</Text>
        <Text style={styles.bulletPoint}>• Status: Production-ready</Text>

        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>Phase 2: Advanced Features (Months 4-6) - ✓ COMPLETE</Text>
        </Text>
        <Text style={styles.bulletPoint}>• Auto-generated session summaries with AI-ready infrastructure</Text>
        <Text style={styles.bulletPoint}>• PIPEDA compliance system (consent management, audit trails)</Text>
        <Text style={styles.bulletPoint}>• Vehicle management with VIN decoding (NHTSA API)</Text>
        <Text style={styles.bulletPoint}>• Brand specialist matching (premium mechanics)</Text>
        <Text style={styles.bulletPoint}>• Customer onboarding system with progress tracking</Text>
        <Text style={styles.bulletPoint}>• Status: Production-ready</Text>

        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>Phase 3: Marketplace (Months 7-9) - ✓ 90% COMPLETE</Text>
        </Text>
        <Text style={styles.bulletPoint}>• RFQ marketplace with competitive bidding</Text>
        <Text style={styles.bulletPoint}>• Direct quote system from mechanics</Text>
        <Text style={styles.bulletPoint}>• Repair job tracking (9 status types)</Text>
        <Text style={styles.bulletPoint}>• Escrow payment system with admin controls</Text>
        <Text style={styles.bulletPoint}>• Status: Backend complete, UI polish pending</Text>

        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>Phase 4: Unification (Month 10) - ✓ 80% COMPLETE</Text>
        </Text>
        <Text style={styles.bulletPoint}>• Unified "Quotes & Jobs" customer view</Text>
        <Text style={styles.bulletPoint}>• 18 production API endpoints (all complete)</Text>
        <Text style={styles.bulletPoint}>• Admin control center (escrow release, refunds)</Text>
        <Text style={styles.bulletPoint}>• Status: APIs ready, frontend UI pending</Text>
      </View>

      <View style={styles.highlightBox}>
        <Text style={styles.highlightText}>
          Current Development Stage: 85% MVP+ Complete
        </Text>
        <Text style={[styles.text, { marginTop: 4 }]}>
          • Total Development Investment: 800-1,000 hours ($52K-$130K CAD value)
          {'\n'}• Lines of Code: ~20,000 (TypeScript + SQL)
          {'\n'}• Breaking Changes: 0 (all additive architecture)
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Roadmap to 100% Launch (Next 6-8 Weeks)</Text>

        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>Weeks 1-2: Customer Experience Polish - ✓ COMPLETE</Text>
        </Text>
        <Text style={styles.bulletPoint}>• Quote acceptance payment flow (implemented)</Text>
        <Text style={styles.bulletPoint}>• RFQ bid payment flow (implemented)</Text>
        <Text style={styles.bulletPoint}>• Automated refund webhooks (implemented)</Text>

        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>Weeks 3-4: UI Enhancement</Text>
        </Text>
        <Text style={styles.bulletPoint}>• Customer-facing repair tracker UI</Text>
        <Text style={styles.bulletPoint}>• Subscription upsell prompts</Text>
        <Text style={styles.bulletPoint}>• Improved login page with social auth</Text>
        <Text style={styles.bulletPoint}>• Session summary email automation</Text>

        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>Weeks 5-6: Retention Features</Text>
        </Text>
        <Text style={styles.bulletPoint}>• Referral program UI implementation</Text>
        <Text style={styles.bulletPoint}>• Maintenance reminder cron jobs</Text>
        <Text style={styles.bulletPoint}>• Customer analytics dashboard</Text>

        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>Weeks 7-8: Launch Preparation</Text>
        </Text>
        <Text style={styles.bulletPoint}>• End-to-end QA testing</Text>
        <Text style={styles.bulletPoint}>• Security audit</Text>
        <Text style={styles.bulletPoint}>• Performance optimization</Text>
        <Text style={styles.bulletPoint}>• Beta launch (100 users - ON/BC)</Text>
      </View>

      <Text style={styles.footer}>
        AskAutoDoctor - Investor Report | Confidential
      </Text>
      <Text style={styles.pageNumber}>6</Text>
    </Page>

    {/* Page 7: Go-to-Market Strategy */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>7. GO-TO-MARKET STRATEGY & MILESTONES</Text>

      <View style={styles.section}>
        <Text style={styles.subheader}>Launch Timeline</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Milestone</Text>
            <Text style={styles.tableCell}>Target Date</Text>
            <Text style={styles.tableCell}>Success Metric</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Beta Launch (ON/BC)</Text>
            <Text style={styles.tableCell}>Week 4</Text>
            <Text style={styles.tableCell}>100 registered users</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Public Launch</Text>
            <Text style={styles.tableCell}>Week 10</Text>
            <Text style={styles.tableCell}>500 registered users</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>First 100 Customers</Text>
            <Text style={styles.tableCell}>Month 4</Text>
            <Text style={styles.tableCell}>$2,500 revenue</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Break-Even</Text>
            <Text style={styles.tableCell}>Month 6-8</Text>
            <Text style={styles.tableCell}>827 sessions/month</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Profitability</Text>
            <Text style={styles.tableCell}>Month 9-12</Text>
            <Text style={styles.tableCell}>1,000+ sessions/month</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Customer Acquisition Strategy</Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>1. Organic SEO:</Text> Target high-intent keywords ("car diagnostic
          help Canada", "mechanic video call", "second opinion car repair"). Content marketing via blog
          (100+ automotive troubleshooting guides).
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>2. Paid Acquisition:</Text> Google Ads ($1,300-$3,900/month)
          targeting Ontario and BC initially. Facebook/Instagram ads showcasing customer testimonials and
          cost savings vs. dealerships.
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>3. Strategic Partnerships:</Text> Canadian Tire (referral program
          for pre-purchase inspections), insurance companies (Intact, Desjardins - bundled with policies),
          auto parts retailers (NAPA, AutoZone Canada - "Ask before you buy").
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: 'bold' }}>4. Community Engagement:</Text> Reddit (r/MechanicAdvice,
          r/PersonalFinanceCanada), automotive forums, Facebook groups, mechanic communities.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Mechanic Recruitment Strategy</Text>
        <Text style={styles.bulletPoint}>• Target: 15-20 certified mechanics (Red Seal or provincial certification)</Text>
        <Text style={styles.bulletPoint}>• Coverage: Ontario (8-10), BC (5-7), Alberta (3-5) in Phase 1</Text>
        <Text style={styles.bulletPoint}>• Channels: LinkedIn outreach, mechanic forums, trade schools, workshop partnerships</Text>
        <Text style={styles.bulletPoint}>• Value Proposition: Supplemental income, flexible hours, 80% revenue share</Text>
        <Text style={styles.bulletPoint}>• Onboarding: Automated certification verification, video quality check, trial session</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Key Success Metrics (First 6 Months)</Text>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Customer Acquisition Cost (CAC)</Text>
          <Text style={styles.metricValue}>Target: $13-$26 CAD</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Customer Lifetime Value (LTV)</Text>
          <Text style={styles.metricValue}>Target: $150-$200 CAD (5-7 sessions)</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>LTV:CAC Ratio</Text>
          <Text style={styles.metricValue}>Target: 5:1 or higher</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Repeat Customer Rate</Text>
          <Text style={styles.metricValue}>Target: 30-40%</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Net Promoter Score (NPS)</Text>
          <Text style={styles.metricValue}>Target: 50+ (excellent)</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Mechanic Satisfaction</Text>
          <Text style={styles.metricValue}>Target: 4.5+ star average</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Risk Mitigation Strategies</Text>
        <Text style={styles.bulletPoint}>• Liability Insurance: Secured before public launch ($2,600-$6,500/year)</Text>
        <Text style={styles.bulletPoint}>• Quality Control: Customer rating system, mechanic performance monitoring</Text>
        <Text style={styles.bulletPoint}>• Customer Trust: Money-back guarantee for first session, transparent pricing</Text>
        <Text style={styles.bulletPoint}>• Technology Risk: Multi-cloud strategy, LiveKit fallback options</Text>
        <Text style={styles.bulletPoint}>• Regulatory Compliance: Legal review in each province before expansion</Text>
      </View>

      <Text style={styles.footer}>
        AskAutoDoctor - Investor Report | Confidential
      </Text>
      <Text style={styles.pageNumber}>7</Text>
    </Page>

    {/* Page 8: Investment Opportunity */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>8. INVESTMENT OPPORTUNITY</Text>

      <View style={styles.section}>
        <Text style={styles.subheader}>Funding Requirements</Text>
        <Text style={styles.text}>
          We are seeking $325,000 - $650,000 CAD in seed funding to accelerate customer acquisition,
          complete product development, and establish market leadership in Canadian automotive remote diagnostics.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Use of Funds</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Category</Text>
            <Text style={styles.tableCell}>Allocation</Text>
            <Text style={styles.tableCell}>Purpose</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Customer Acquisition</Text>
            <Text style={styles.tableCell}>$195K (60%)</Text>
            <Text style={styles.tableCell}>Paid ads, SEO, partnerships (12 months)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Product Development</Text>
            <Text style={styles.tableCell}>$65K (20%)</Text>
            <Text style={styles.tableCell}>Complete remaining 15%, QA, mobile app</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Operations</Text>
            <Text style={styles.tableCell}>$49K (15%)</Text>
            <Text style={styles.tableCell}>Support staff, insurance, infrastructure</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Contingency</Text>
            <Text style={styles.tableCell}>$16K (5%)</Text>
            <Text style={styles.tableCell}>Risk buffer</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Financial Projections (3-Year)</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Metric</Text>
            <Text style={styles.tableCell}>Year 1</Text>
            <Text style={styles.tableCell}>Year 2</Text>
            <Text style={styles.tableCell}>Year 3</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Total Sessions</Text>
            <Text style={styles.tableCell}>3,150</Text>
            <Text style={styles.tableCell}>12,000</Text>
            <Text style={styles.tableCell}>30,000</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Gross Revenue</Text>
            <Text style={styles.tableCell}>$94K</Text>
            <Text style={styles.tableCell}>$360K</Text>
            <Text style={styles.tableCell}>$900K</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Platform Revenue</Text>
            <Text style={styles.tableCell}>$19K</Text>
            <Text style={styles.tableCell}>$72K</Text>
            <Text style={styles.tableCell}>$180K</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Marketplace GMV</Text>
            <Text style={styles.tableCell}>$200K</Text>
            <Text style={styles.tableCell}>$800K</Text>
            <Text style={styles.tableCell}>$2M</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Marketplace Fees (7%)</Text>
            <Text style={styles.tableCell}>$14K</Text>
            <Text style={styles.tableCell}>$56K</Text>
            <Text style={styles.tableCell}>$140K</Text>
          </View>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Total Platform Revenue</Text>
            <Text style={styles.tableCell}>$33K</Text>
            <Text style={styles.tableCell}>$128K</Text>
            <Text style={styles.tableCell}>$320K</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Investment Highlights</Text>
        <Text style={[styles.bulletPoint, styles.strengthIcon]}>
          ✓ First-Mover Advantage: Only live HD video automotive diagnostic platform in Canada
        </Text>
        <Text style={[styles.bulletPoint, styles.strengthIcon]}>
          ✓ Proven Technical Execution: 85% complete MVP, $52K-$130K development value already invested
        </Text>
        <Text style={[styles.bulletPoint, styles.strengthIcon]}>
          ✓ Scalable Business Model: Dual revenue streams (sessions + marketplace), low marginal costs
        </Text>
        <Text style={[styles.bulletPoint, styles.strengthIcon]}>
          ✓ Large Market Opportunity: $270-$330M SAM in Canada, potential for international expansion
        </Text>
        <Text style={[styles.bulletPoint, styles.strengthIcon]}>
          ✓ Strong Unit Economics: Path to profitability within 9-12 months
        </Text>
        <Text style={[styles.bulletPoint, styles.strengthIcon]}>
          ✓ Network Effects: Platform value increases with both customer and mechanic growth
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Exit Opportunities</Text>
        <Text style={styles.bulletPoint}>• Acquisition by automotive aftermarket players (Canadian Tire, NAPA Auto Parts)</Text>
        <Text style={styles.bulletPoint}>• Insurance company acquisition (Intact, Desjardins, CAA)</Text>
        <Text style={styles.bulletPoint}>• Technology licensing to dealership networks and OEMs</Text>
        <Text style={styles.bulletPoint}>• International expansion and strategic partnerships</Text>
        <Text style={styles.bulletPoint}>• Target Exit: 3-5 years at $10M-$20M valuation</Text>
      </View>

      <View style={styles.highlightBox}>
        <Text style={styles.highlightText}>
          Investment Ask: $325K-$650K CAD Seed Funding
        </Text>
        <Text style={[styles.text, { marginTop: 4 }]}>
          Use: Customer acquisition, product completion, 12-month runway
          {'\n'}Projected Valuation: $2.5M-$3.5M pre-money (pending beta traction)
          {'\n'}Expected ROI: 5-10x in 3-5 years
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Contact Information</Text>
        <Text style={styles.text}>
          Website: askautodoctor.com
          {'\n'}Status: Beta launch scheduled Week 4
          {'\n'}Development Stage: 85% MVP+ Complete
        </Text>
      </View>

      <Text style={styles.footer}>
        AskAutoDoctor - Investor Report | Confidential | Thank you for your consideration
      </Text>
      <Text style={styles.pageNumber}>8</Text>
    </Page>
  </Document>
);

// Generate PDF
async function generatePDF() {
  try {
    console.log('Generating investor report PDF...');
    const blob = await pdf(React.createElement(InvestorReport)).toBlob();
    const buffer = await blob.arrayBuffer();

    const outputPath = path.join(process.cwd(), 'AskAutoDoctor_Investor_Report.pdf');
    fs.writeFileSync(outputPath, Buffer.from(buffer));

    console.log(`✓ PDF generated successfully: ${outputPath}`);
    console.log(`✓ File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    process.exit(1);
  }
}

generatePDF();
