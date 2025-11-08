# CUSTOMER DISCLOSURES - TO IMPLEMENT IN UI

**Purpose:** Protect The Auto Doctor from liability by making it crystal clear that:
1. We are a marketplace, not a repair shop
2. Workshops are independent businesses
3. Workshops are responsible for repair quality

---

## 1. HOMEPAGE DISCLOSURE

**Location:** Homepage hero section or prominent banner

```tsx
// FILE: src/app/page.tsx

<div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
  <p className="text-sm text-blue-900">
    <strong>The Auto Doctor</strong> connects you with licensed, insured automotive
    workshops in Ontario. Workshops are independent businesses responsible for their
    repair work and quotes. We facilitate the connection but do not perform repairs.
  </p>
</div>
```

---

## 2. BEFORE QUOTE ACCEPTANCE

**Location:** Quote details page, above "Accept Quote" button

```tsx
// FILE: src/app/customer/quotes/[id]/page.tsx

<div className="border border-gray-300 bg-gray-50 p-4 rounded-lg mb-4">
  <h4 className="font-semibold text-gray-900 mb-2">
    Important Information About This Quote
  </h4>

  <ul className="text-sm text-gray-700 space-y-2">
    <li>✓ This quote is provided by <strong>{workshop.name}</strong>, an independent automotive repair business</li>
    <li>✓ The Auto Doctor facilitates the connection but does not perform repair work</li>
    <li>✓ {workshop.name} is responsible for the quality and accuracy of this quote</li>
    <li>✓ Ontario law protects you: final cost cannot exceed this quote by more than 10% without your written approval</li>
    <li>✓ Questions about this quote? Contact {workshop.name} directly at {workshop.phone}</li>
  </ul>

  <p className="text-xs text-gray-600 mt-3">
    By accepting this quote, you agree to {workshop.name}'s terms and authorize them to
    perform the described services. <a href="/terms" className="text-blue-600 underline">View Terms</a>
  </p>
</div>

<Button onClick={handleAcceptQuote}>
  Accept Quote from {workshop.name}
</Button>
```

---

## 3. REFERRAL FEE DISCLOSURE

**Location:** When mechanic escalates to workshop OR customer posts RFQ

**Scenario A: Mechanic Escalating to Workshop**

```tsx
// FILE: src/app/mechanic/sessions/[id]/escalate/page.tsx

<div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
  <h4 className="font-semibold text-yellow-900 mb-2">
    ⚠️ Referral Fee Disclosure (Competition Act Requirement)
  </h4>

  <p className="text-sm text-yellow-800 mb-3">
    If the customer proceeds with repairs at the workshop you recommend, you will
    earn a <strong>5% referral bonus</strong> from the workshop.
  </p>

  <p className="text-sm text-yellow-800">
    <strong>This does NOT increase the customer's price.</strong> The referral fee
    is paid by the workshop from their portion of the revenue.
  </p>

  <label className="flex items-center gap-2 mt-3">
    <input type="checkbox" required />
    <span className="text-sm">
      I acknowledge the referral fee and confirm the customer will be informed
    </span>
  </label>
</div>
```

**Scenario B: Customer Sees Disclosure**

```tsx
// FILE: src/app/customer/sessions/[id]/complete/page.tsx

<div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
  <h4 className="font-semibold text-blue-900 mb-2">
    💡 Transparency Notice
  </h4>

  <p className="text-sm text-blue-800">
    Your mechanic may receive a <strong>5% referral bonus</strong> from the workshop
    if you proceed with repairs. This is disclosed for transparency as required by
    Canadian competition law.
  </p>

  <p className="text-sm text-blue-800 mt-2">
    <strong>This does NOT affect your price.</strong> Workshops compete for your
    business by submitting quotes. You choose which workshop to use.
  </p>
</div>
```

---

## 4. RFQ MARKETPLACE DISCLOSURE

**Location:** When customer posts RFQ for multiple workshop bids

```tsx
// FILE: src/app/customer/rfq/new/page.tsx

<div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
  <h4 className="font-semibold text-green-900 mb-2">
    How the RFQ Marketplace Works
  </h4>

  <ol className="text-sm text-green-800 space-y-2 list-decimal ml-5">
    <li>Multiple independent workshops will see your repair request</li>
    <li>Workshops submit competing quotes (parts + labor breakdown)</li>
    <li>You review quotes and choose the best option</li>
    <li>Selected workshop contacts you to schedule service</li>
    <li>The workshop you choose is responsible for the repair quality</li>
  </ol>

  <p className="text-sm text-green-800 mt-3">
    <strong>Your Protection:</strong> Ontario law requires workshops to provide
    written estimates and limits cost overruns to 10% without your approval.
  </p>
</div>
```

---

## 5. TERMS OF SERVICE ACCEPTANCE

**Location:** Customer signup page

```tsx
// FILE: src/app/customer/signup/page.tsx

<div className="border-t pt-6 mt-6">
  <h3 className="font-semibold mb-4">Terms & Agreements</h3>

  <label className="flex items-start gap-3 mb-3">
    <input type="checkbox" required className="mt-1" />
    <span className="text-sm">
      I agree to The Auto Doctor's{' '}
      <a href="/terms" className="text-blue-600 underline" target="_blank">
        Terms of Service
      </a>{' '}
      and{' '}
      <a href="/privacy-policy" className="text-blue-600 underline" target="_blank">
        Privacy Policy
      </a>
      *
    </span>
  </label>

  <label className="flex items-start gap-3 mb-3">
    <input type="checkbox" required className="mt-1" />
    <span className="text-sm">
      I understand that The Auto Doctor is a marketplace connecting me with
      independent repair workshops. Workshops are responsible for their work
      quality and quotes. *
    </span>
  </label>

  <label className="flex items-start gap-3">
    <input type="checkbox" className="mt-1" />
    <span className="text-sm">
      I would like to receive promotional emails about new features and special
      offers (optional)
    </span>
  </label>
</div>
```

---

## 6. FOOTER DISCLAIMER

**Location:** Site-wide footer

```tsx
// FILE: src/components/Footer.tsx

<footer className="bg-gray-100 border-t border-gray-300 py-8">
  <div className="container mx-auto px-4">
    {/* ... other footer content ... */}

    <div className="text-xs text-gray-600 mt-6 border-t border-gray-300 pt-4">
      <p>
        The Auto Doctor Inc. is a technology platform connecting vehicle owners with
        independent automotive repair workshops in Ontario. We do not perform repair
        services. Workshops are independent businesses responsible for their work quality,
        quotes, and customer service. Workshops must comply with the Ontario Consumer
        Protection Act and maintain proper licensing and insurance.
      </p>
      <p className="mt-2">
        <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a> |
        <a href="/terms" className="text-blue-600 hover:underline ml-3">Terms of Service</a> |
        <a href="/customer/rights" className="text-blue-600 hover:underline ml-3">Your Rights</a> |
        <a href="/customer/disputes/new" className="text-blue-600 hover:underline ml-3">File a Complaint</a>
      </p>
    </div>
  </div>
</footer>
```

---

## 7. SESSION BOOKING CONFIRMATION

**Location:** Booking confirmation email and page

```tsx
// FILE: src/lib/email/templates/booking-confirmation.ts

export function bookingConfirmationEmail(data: BookingData): string {
  return `
    <h2>Booking Confirmed</h2>

    <p>Your diagnostic session with {mechanic.name} is confirmed for {sessionDate}.</p>

    <div style="background: #f3f4f6; padding: 16px; border-left: 4px solid #3b82f6; margin: 24px 0;">
      <h3 style="margin-top: 0;">Important Information</h3>
      <ul style="font-size: 14px; line-height: 1.6;">
        <li>{mechanic.name} is an independent automotive professional</li>
        <li>The Auto Doctor facilitates the connection but does not perform diagnostics</li>
        <li>If repairs are recommended, you will receive a written quote from a licensed workshop</li>
        <li>You are not obligated to proceed with any recommended repairs</li>
      </ul>
    </div>

    <p>Questions? Contact {mechanic.name} at {mechanic.phone}</p>

    <p style="font-size: 12px; color: #6b7280; margin-top: 32px;">
      The Auto Doctor is a marketplace connecting vehicle owners with independent
      automotive professionals and repair workshops. We do not perform repair services.
    </p>
  `
}
```

---

## 8. DISPUTE FILING PAGE

**Location:** When customer files a complaint

```tsx
// FILE: src/app/customer/disputes/new/page.tsx

<div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
  <h4 className="font-semibold text-yellow-900 mb-2">
    Before You File a Dispute
  </h4>

  <ol className="text-sm text-yellow-800 space-y-2 list-decimal ml-5">
    <li>
      <strong>Try contacting the workshop first:</strong> Most issues can be
      resolved directly. Call {workshop.name} at {workshop.phone}
    </li>
    <li>
      <strong>Review your rights:</strong> Ontario law provides specific protections
      for automotive repairs. <a href="/customer/rights" className="underline">Learn more</a>
    </li>
    <li>
      <strong>The Auto Doctor's role:</strong> We mediate between you and the workshop
      but cannot force refunds or determine fault in technical matters
    </li>
    <li>
      <strong>Unresolved disputes:</strong> Can be escalated to Consumer Protection
      Ontario or small claims court
    </li>
  </ol>
</div>

<p className="text-sm text-gray-600 mb-6">
  The workshop is responsible for the quality of their work. The Auto Doctor will
  help facilitate communication and seek a fair resolution, but we do not assume
  liability for repair work quality.
</p>
```

---

## IMPLEMENTATION CHECKLIST

**Pages that MUST have disclosures:**

- [ ] Homepage (marketplace disclaimer)
- [ ] Customer signup (terms acceptance + marketplace understanding)
- [ ] Quote acceptance page (workshop responsibility)
- [ ] Mechanic escalation page (referral fee disclosure to mechanic)
- [ ] Session confirmation page/email (independent contractor notice)
- [ ] RFQ posting page (how marketplace works)
- [ ] Dispute filing page (workshop responsibility + Platform's role)
- [ ] Site footer (disclaimer on all pages)

**Legal Protection Strategy:**

1. **Repetition:** Show disclosure multiple times (signup, quote, booking, email)
2. **Clarity:** Use plain language, not legal jargon
3. **Checkboxes:** Require affirmative consent for key points
4. **Visibility:** Don't hide in fine print - make prominent
5. **Consistency:** Same message across all touchpoints

---

## LEGAL REASONING

**Why These Disclosures Protect The Platform:**

1. **Agency Law:** If customers believe Platform is the workshop's agent, Platform could be liable. Disclosures make it clear workshops are independent.

2. **Misrepresentation:** If Platform doesn't disclose referral fees, could violate Competition Act. Disclosures provide transparency.

3. **Consumer Protection:** If customers think Platform is the repair shop, could sue Platform for defective work. Disclosures clarify responsibility.

4. **Contract Law:** Disclosures become part of customer agreement, limiting Platform liability.

5. **Evidence:** In litigation, repeated disclosures show Platform made good-faith effort to inform customers.

---

**Document Status:** IMPLEMENTATION GUIDE
**Next Steps:**
1. Review with lawyer
2. Implement in UI components
3. Test that disclosures appear correctly
4. Train customer support on explaining Platform's role
