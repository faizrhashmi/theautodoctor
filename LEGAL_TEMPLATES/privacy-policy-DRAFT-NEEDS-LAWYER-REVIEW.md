# PRIVACY POLICY - DRAFT FOR LAWYER REVIEW

**⚠️ CRITICAL: This is a TEMPLATE ONLY. It MUST be reviewed and approved by an Ontario privacy lawyer before publication.**

**Company:** The Auto Doctor Inc.
**Last Updated:** [DATE - To be set by lawyer]
**Effective Date:** [DATE - To be set by lawyer]

---

## INTRODUCTION

The Auto Doctor Inc. ("we", "our", or "us") operates a digital platform connecting vehicle owners with automotive mechanics and repair workshops in Ontario, Canada. We are committed to protecting your personal information and your right to privacy.

This Privacy Policy explains:
- What personal information we collect
- Why we collect it
- How we use it
- Who we share it with
- Your rights regarding your personal information

**By using The Auto Doctor platform, you consent to the collection, use, and disclosure of your personal information as described in this Privacy Policy.**

---

## 1. INFORMATION WE COLLECT

### 1.1 Personal Information You Provide Directly

When you create an account or use our services, we collect:

**Account Information:**
- Full name
- Email address
- Phone number
- Password (encrypted)
- Profile photo (optional)

**Contact & Location Information:**
- Street address
- City, province, postal code
- Geographic coordinates (latitude/longitude) for mechanic matching
- Preferred language

**Vehicle Information:**
- Make, model, year, VIN
- Mileage
- Service history
- Photos of your vehicle (if uploaded)

**Payment Information:**
- Payment is processed by Stripe Inc. (PCI-DSS Level 1 compliant)
- We store only: customer ID, payment intent IDs, transaction history
- We DO NOT store credit card numbers, CVV, or banking credentials

**Service Interaction Data:**
- Diagnostic session notes
- Photos/videos uploaded during sessions
- Chat messages with mechanics
- Video session recordings (stored for 90 days)
- Repair quotes received
- Reviews and ratings you provide

**For Mechanics & Workshops:**
- Business information (business name, license number)
- Certifications (Red Seal, ASE, manufacturer certifications)
- Insurance certificates
- WSIB account number (workshops with employees)
- Social Insurance Number (encrypted, collected for tax reporting - T4A)
- Banking information for payouts

### 1.2 Information We Collect Automatically

**Usage Data:**
- Device type, operating system, browser type
- IP address
- Pages visited, features used
- Time spent on platform
- Click patterns and navigation paths

**Location Data:**
- We collect precise location data (GPS coordinates) when you:
  - Search for mechanics near you
  - Request mobile mechanic services
  - Book a diagnostic session
- You can disable location services in your device settings, but this may limit functionality

**Cookies & Similar Technologies:**
- Session cookies (essential for login)
- Analytics cookies (Google Analytics - can be opted out)
- Preference cookies (language, theme settings)

### 1.3 Information We Receive from Third Parties

**Stripe (Payment Processor):**
- Payment confirmation status
- Fraud detection signals
- Payout processing status (for workshops)

**Email Service Provider (Resend):**
- Email delivery status (delivered, bounced, opened)

**Video Platform (LiveKit):**
- Video session quality metrics
- Connection status

---

## 2. HOW WE USE YOUR INFORMATION

We use your personal information for the following purposes:

### 2.1 To Provide Our Services (PIPEDA Purpose: Service Fulfillment)

- Match you with nearby mechanics and workshops
- Facilitate diagnostic sessions (video, chat)
- Process payments securely
- Send service confirmations and receipts
- Provide customer support
- Manage disputes and complaints

### 2.2 To Improve Our Platform (PIPEDA Purpose: Business Operations)

- Analyze usage patterns to improve features
- Conduct quality assurance testing
- Develop new features based on user needs
- Monitor platform performance and reliability

### 2.3 To Communicate with You (PIPEDA Purpose: Customer Relations)

**Transactional Communications (You cannot opt out):**
- Booking confirmations
- Session reminders
- Payment receipts
- Important account updates
- Security alerts

**Marketing Communications (You can opt out):**
- Newsletter with automotive tips
- New feature announcements
- Special promotions
- Referral program invitations

### 2.4 For Legal & Safety Purposes (PIPEDA Purpose: Legal Compliance)

- Comply with Canadian and Ontario laws
- Respond to legal requests (subpoenas, court orders)
- Detect and prevent fraud
- Protect platform security
- Enforce our Terms of Service
- Resolve disputes

### 2.5 For Tax Reporting (PIPEDA Purpose: Legal Obligation)

- Issue T4A slips to contractors earning >$500/year
- Report to Canada Revenue Agency as required by law
- Maintain records for CRA audits (7 years)

---

## 3. HOW WE SHARE YOUR INFORMATION

We share your personal information in the following circumstances:

### 3.1 With Service Providers (Mechanics & Workshops)

**When you book a diagnostic session, we share with the assigned mechanic:**
- Your name, phone number, email
- Your vehicle information
- Your location (city, postal code, or exact address if mobile service)
- Photos/videos you uploaded
- Any notes you provided about the issue

**Important:** Mechanics and workshops are independent businesses. They must use your information ONLY to provide the requested service. They cannot use your information for their own marketing without your separate consent.

### 3.2 With Payment Processors

**Stripe Inc. (Payment Processing):**
- Customer name, email
- Payment amount
- Transaction metadata

Stripe has its own privacy policy: https://stripe.com/privacy

### 3.3 With Communication Services

**Resend (Email Service):**
- Email address
- Email content (service notifications, marketing if opted in)

**Twilio (SMS Service - if applicable):**
- Phone number
- SMS message content

**LiveKit (Video Platform):**
- Session participant names
- Video/audio streams (encrypted in transit)
- Session duration

### 3.4 For Legal Reasons

We may disclose your information when required by law:
- In response to subpoenas or court orders
- To comply with tax reporting obligations (CRA)
- To report suspected fraud to authorities
- To protect our legal rights in disputes
- To comply with data breach notification requirements

### 3.5 In Business Transactions

If The Auto Doctor is acquired, merged, or sells assets, your information may be transferred to the new owner. You will be notified of any such change.

### 3.6 With Your Consent

We may share your information with third parties when you explicitly consent (e.g., sharing your review on social media).

---

## 4. DATA RETENTION

We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law.

**Retention Periods:**

| Data Type | Active Period | Anonymization | Deletion |
|-----------|--------------|---------------|----------|
| Account information | While account is active | N/A | Upon account deletion request |
| Diagnostic session data | 1 year | After 2 years | After 7 years |
| Payment records | 7 years (CRA requirement) | N/A | After 7 years |
| Video recordings | 90 days | N/A | After 90 days |
| Chat messages | 1 year | After 2 years | After 7 years |
| Tax records (SIN, T4A) | 7 years (CRA requirement) | N/A | After 7 years |
| Inactive accounts | 3 years of inactivity | N/A | After 3 years |

**Anonymization:** After the active period, we may anonymize your data (remove all personally identifiable information) for statistical analysis.

---

## 5. DATA SECURITY

We implement industry-standard security measures to protect your personal information:

**Encryption:**
- All data transmitted over the internet is encrypted using TLS 1.3
- Sensitive data (SIN numbers) is encrypted at rest using AES-256-GCM
- Passwords are hashed using bcrypt with salt

**Access Controls:**
- Role-based access control (RBAC)
- Multi-factor authentication for admin accounts
- Row-level security in database (users can only access their own data)

**Infrastructure Security:**
- Database hosted on Supabase (SOC 2 Type II certified)
- Regular security audits
- Automated vulnerability scanning

**However, no method of transmission over the Internet or electronic storage is 100% secure.** While we strive to protect your personal information, we cannot guarantee absolute security.

---

## 6. YOUR PRIVACY RIGHTS (PIPEDA)

Under Canadian federal privacy law (PIPEDA), you have the following rights:

### 6.1 Right to Access

You have the right to request a copy of all personal information we hold about you.

**How to exercise:** Visit your account settings > "Download My Data" or email privacy@theautodoctor.ca

**Response time:** We will respond within 30 days.

### 6.2 Right to Correction

You have the right to request correction of inaccurate or incomplete personal information.

**How to exercise:** Update your profile in account settings or contact privacy@theautodoctor.ca

### 6.3 Right to Deletion

You have the right to request deletion of your personal information, subject to certain legal exceptions (e.g., we must retain tax records for 7 years).

**How to exercise:** Visit your account settings > "Delete My Account" or email privacy@theautodoctor.ca

**Important:** Deleting your account will permanently erase:
- Your profile information
- Your service history (after legal retention period)
- Your saved vehicles
- Your reviews and ratings

We will retain anonymized statistical data and records required by law (tax records, fraud prevention).

### 6.4 Right to Withdraw Consent

You can withdraw your consent for marketing communications at any time.

**How to exercise:** Click "Unsubscribe" in any marketing email or update preferences in your account settings.

**Note:** You cannot withdraw consent for transactional communications necessary to provide our service (e.g., booking confirmations).

### 6.5 Right to Portability

You have the right to receive your personal information in a structured, commonly used format (JSON or CSV).

**How to exercise:** Visit your account settings > "Download My Data"

### 6.6 Right to Lodge a Complaint

If you believe we have mishandled your personal information, you have the right to file a complaint with:

**Office of the Privacy Commissioner of Canada**
Phone: 1-800-282-1376
Website: https://www.priv.gc.ca/en/report-a-concern/file-a-formal-privacy-complaint/

---

## 7. CHILDREN'S PRIVACY

The Auto Doctor is not intended for users under 18 years of age. We do not knowingly collect personal information from children.

If we become aware that we have collected personal information from a child under 18, we will delete it immediately.

If you are a parent or guardian and believe your child has provided us with personal information, please contact privacy@theautodoctor.ca

---

## 8. INTERNATIONAL DATA TRANSFERS

Your personal information is stored on servers located in Canada and the United States.

**Data Processors:**
- Supabase (Database): US-based, SOC 2 compliant
- Stripe (Payments): US-based, PCI-DSS Level 1 compliant
- Resend (Email): US-based
- LiveKit (Video): Cloud infrastructure in Canada/US

These third-party processors have contractual obligations to protect your data in accordance with Canadian privacy standards.

---

## 9. COOKIES POLICY

We use cookies and similar technologies to enhance your experience on our platform.

**Types of Cookies We Use:**

1. **Essential Cookies** (Cannot be disabled)
   - Session management (keep you logged in)
   - Security features (CSRF protection)

2. **Analytics Cookies** (Can be opted out)
   - Google Analytics (anonymized IP)
   - Usage statistics for platform improvement

3. **Preference Cookies**
   - Language selection
   - Theme (light/dark mode)
   - Saved filters and settings

**How to Manage Cookies:**
- Most browsers allow you to refuse cookies or delete existing cookies
- Visit your browser settings to manage cookie preferences
- Note: Disabling essential cookies may prevent you from using certain features

**Google Analytics Opt-Out:**
Install the Google Analytics Opt-out Browser Add-on: https://tools.google.com/dlpage/gaoptout

---

## 10. MARKETING COMMUNICATIONS & CASL COMPLIANCE

The Auto Doctor complies with Canada's Anti-Spam Legislation (CASL).

**Consent for Marketing Emails:**
- During account creation, you can opt in to marketing emails (checkbox, not pre-checked)
- We will NOT send marketing emails unless you explicitly consent
- Each marketing email includes an "Unsubscribe" link

**Transactional Emails (CASL Exempt):**
These emails are necessary for the service and do not require marketing consent:
- Booking confirmations
- Session reminders
- Payment receipts
- Password reset emails
- Account security alerts

**How to Unsubscribe:**
Click the "Unsubscribe" link at the bottom of any marketing email.

---

## 11. DATA BREACH NOTIFICATION

In the unlikely event of a data breach involving your personal information, we will:

1. **Investigate** the breach immediately
2. **Contain** the breach to prevent further unauthorized access
3. **Notify** you within 72 hours if the breach poses a "real risk of significant harm"
4. **Report** the breach to the Privacy Commissioner of Canada (if required by law)
5. **Provide guidance** on steps you can take to protect yourself

**What constitutes "significant harm"?**
- Identity theft risk
- Financial loss risk
- Reputational damage
- Loss of employment opportunities
- Sensitive information exposure (SIN, health information)

---

## 12. REFERRAL FEE DISCLOSURE (Competition Act Compliance)

**Important Transparency Notice:**

When a virtual mechanic diagnoses your vehicle and recommends a workshop for repairs, that mechanic may receive a 5% referral bonus from the workshop if you proceed with the repair.

**This does NOT increase your price.** Workshops compete for your business by submitting competing quotes. The referral bonus is paid by the workshop from their portion of the revenue.

**Why we disclose this:**
Canadian competition law requires transparency when referral fees may influence recommendations. We want you to know that mechanics may have a financial incentive when referring you to workshops.

**Your protection:**
- You always see competing quotes from multiple workshops
- You choose which workshop to use
- Referral fees are capped at 5%
- Mechanics who consistently refer to poor-quality workshops will be removed from our platform

---

## 13. THIRD-PARTY LINKS

Our platform may contain links to third-party websites (e.g., workshop websites, parts suppliers).

**We are not responsible for the privacy practices of third-party websites.** We encourage you to read their privacy policies before providing any personal information.

---

## 14. UPDATES TO THIS PRIVACY POLICY

We may update this Privacy Policy from time to time to reflect:
- Changes in our business practices
- New legal requirements
- User feedback

**We will notify you of material changes by:**
- Email notification (to your registered email address)
- Prominent notice on our platform
- Requiring re-acceptance of updated policy

**Your continued use of The Auto Doctor after the updated Privacy Policy takes effect constitutes your acceptance of the changes.**

---

## 15. CONTACT INFORMATION

**Privacy Officer:**
The Auto Doctor Inc.
[STREET ADDRESS - To be added]
Toronto, ON [POSTAL CODE - To be added]

**Email:** privacy@theautodoctor.ca
**Phone:** [PHONE NUMBER - To be added]

**For privacy-related inquiries:**
- Data access requests: privacy@theautodoctor.ca
- Data deletion requests: privacy@theautodoctor.ca
- Privacy complaints: privacy@theautodoctor.ca
- General questions: support@theautodoctor.ca

**Response Time:** We will respond to all privacy requests within 30 days as required by PIPEDA.

---

## 16. GOVERNING LAW

This Privacy Policy is governed by the laws of Ontario and Canada, including:
- Personal Information Protection and Electronic Documents Act (PIPEDA)
- Canada's Anti-Spam Legislation (CASL)
- Ontario Consumer Protection Act

---

## ⚠️ LAWYER REVIEW CHECKLIST

**Before publishing this privacy policy, ensure your Ontario privacy lawyer reviews:**

- [ ] Accuracy of legal citations and compliance claims
- [ ] Adequacy of consent language
- [ ] Data retention periods align with legal requirements
- [ ] Breach notification procedures meet PIPEDA standards
- [ ] Third-party processor agreements are in place
- [ ] International data transfer compliance (US-based processors)
- [ ] Marketing consent language meets CASL requirements
- [ ] Children's privacy protection (age verification)
- [ ] Dispute resolution procedures
- [ ] Contact information for Privacy Officer (must be valid)
- [ ] Effective date and version control
- [ ] Language clarity for average consumer (plain language requirement)

**Estimated Legal Review Cost:** $2,000 - $5,000 CAD

**Recommended Law Firms:**
- McCarthy Tétrault LLP (Toronto) - Privacy & Data Protection
- Borden Ladner Gervais LLP (Toronto) - Technology Law
- Osler, Hoskin & Harcourt LLP (Toronto) - Privacy & Cybersecurity

---

**Document Status:** DRAFT - NOT APPROVED FOR PUBLICATION
**Created:** October 31, 2025
**Next Step:** Send to Ontario privacy lawyer for review
