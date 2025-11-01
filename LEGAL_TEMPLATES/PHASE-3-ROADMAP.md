# PHASE 3: UI IMPLEMENTATION - ROADMAP

**Status:** 📋 PLANNED (Not Yet Started)
**Estimated Duration:** 2-3 weeks
**Purpose:** Build customer-facing UI for compliance systems built in Phase 2

---

## OVERVIEW

Phase 2 built the database infrastructure and backend logic for OCPA compliance. Phase 3 will build the user-facing UI components that customers and workshops interact with.

**Key Principle:** "Compliance First, Convenience Second"
- User cannot proceed without completing required compliance steps
- Clear, prominent disclosures (not buried in fine print)
- Multiple touchpoints for reinforcement

---

## PHASE 3A: QUOTE ACCEPTANCE UI

### Task 3A.1: Quote Details Page Enhancement
**File:** `src/app/customer/quotes/[id]/page.tsx`

**Requirements:**
- Display itemized quote breakdown (parts + labor)
- Show warranty information clearly
- Display workshop contact information
- Show OCPA-required disclosures

**Implementation:**
```tsx
// BEFORE "Accept Quote" button, show disclosure:
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
</div>

// Itemized breakdown
<div className="mb-6">
  <h3 className="font-semibold mb-3">Quote Breakdown</h3>

  <div className="space-y-2">
    <div className="flex justify-between">
      <span>Parts Cost</span>
      <span className="font-semibold">${quote.total_parts_cost.toFixed(2)}</span>
    </div>
    <div className="flex justify-between">
      <span>Labor Cost</span>
      <span className="font-semibold">${quote.total_labor_cost.toFixed(2)}</span>
    </div>
    <div className="flex justify-between">
      <span>Tax (HST 13%)</span>
      <span className="font-semibold">${quote.total_tax.toFixed(2)}</span>
    </div>
    <div className="flex justify-between border-t pt-2 text-lg">
      <span className="font-bold">Total</span>
      <span className="font-bold">${quote.total_cost_with_tax.toFixed(2)}</span>
    </div>
  </div>
</div>

// Warranty disclosure
<div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
  <h4 className="font-semibold text-blue-900 mb-2">Warranty Information</h4>

  <ul className="text-sm text-blue-800 space-y-1">
    <li>Parts Warranty: {quote.warranty_parts_months} months</li>
    <li>Labor Warranty: {quote.warranty_labor_months} months</li>
    <li>Exclusions: {quote.warranty_exclusions}</li>
  </ul>
</div>

// Required acknowledgments
<div className="space-y-3 mb-6">
  <label className="flex items-start gap-3">
    <input type="checkbox" required className="mt-1" onChange={...} />
    <span className="text-sm">
      I have reviewed the itemized parts and labor breakdown *
    </span>
  </label>

  <label className="flex items-start gap-3">
    <input type="checkbox" required className="mt-1" onChange={...} />
    <span className="text-sm">
      I understand the warranty terms and exclusions *
    </span>
  </label>

  <label className="flex items-start gap-3">
    <input type="checkbox" required className="mt-1" onChange={...} />
    <span className="text-sm">
      I acknowledge that the final cost may exceed this estimate by up to 10%
      under Ontario law (O. Reg. 17/05). If the cost exceeds this estimate by
      more than 10%, the workshop must obtain my written approval before continuing. *
    </span>
  </label>

  <label className="flex items-start gap-3">
    <input type="checkbox" required className="mt-1" onChange={...} />
    <span className="text-sm">
      I understand that {workshop.name} is an independent business and The Auto
      Doctor facilitates the connection but does not perform repairs. *
    </span>
  </label>
</div>

<Button
  onClick={handleAcceptQuote}
  disabled={!allCheckboxesChecked}
  className="w-full"
>
  Accept Quote from {workshop.name}
</Button>
```

**API Integration:**
```typescript
// src/app/api/customer/quotes/[id]/accept/route.ts
async function handleAcceptQuote(quoteId: string) {
  const response = await fetch(`/api/customer/quotes/${quoteId}/accept`, {
    method: 'POST',
    body: JSON.stringify({
      quote_id: quoteId,
      customer_id: session.user.id,
      acceptance_method: 'digital_signature',
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      user_agent: req.headers['user-agent'],
      confirmed_parts: true,
      confirmed_labor: true,
      acknowledged_warranty: true,
      acknowledged_10_percent: true
    })
  });

  // Calls: record_quote_acceptance() database function
}
```

**Testing:**
- [ ] All checkboxes required (cannot submit without all checked)
- [ ] Disclosure text displays correctly
- [ ] Itemized breakdown displays correctly
- [ ] Warranty information displays correctly
- [ ] Quote acceptance logs to `quote_acceptance_log` table
- [ ] Quote status updates to "accepted"
- [ ] Work is authorized after acceptance

---

### Task 3A.2: Workshop Quote Creation Enhancement
**File:** `src/app/workshop/quotes/create/page.tsx`

**Requirements:**
- Force workshops to provide itemized parts and labor breakdown
- Require warranty information
- Validate total = parts + labor + tax

**Implementation:**
```tsx
// Parts breakdown section
<div className="mb-6">
  <h3 className="font-semibold mb-3">Parts Breakdown (Required)</h3>
  {parts.map((part, index) => (
    <div key={index} className="flex gap-3 mb-2">
      <input type="text" placeholder="Part name" required />
      <input type="number" placeholder="Quantity" required />
      <input type="number" placeholder="Price per unit" required />
      <button onClick={() => removePart(index)}>Remove</button>
    </div>
  ))}
  <button onClick={addPart}>+ Add Part</button>
  <div className="mt-2 font-semibold">
    Total Parts: ${totalParts.toFixed(2)}
  </div>
</div>

// Labor breakdown section
<div className="mb-6">
  <h3 className="font-semibold mb-3">Labor Breakdown (Required)</h3>
  {laborItems.map((item, index) => (
    <div key={index} className="flex gap-3 mb-2">
      <input type="text" placeholder="Labor description" required />
      <input type="number" placeholder="Hours" required />
      <input type="number" placeholder="Rate per hour" required />
      <button onClick={() => removeLaborItem(index)}>Remove</button>
    </div>
  ))}
  <button onClick={addLaborItem}>+ Add Labor Item</button>
  <div className="mt-2 font-semibold">
    Total Labor: ${totalLabor.toFixed(2)}
  </div>
</div>

// Warranty section (MANDATORY)
<div className="mb-6">
  <h3 className="font-semibold mb-3">Warranty Information (Required)</h3>

  <div className="grid grid-cols-2 gap-4 mb-4">
    <div>
      <label className="block text-sm mb-1">Parts Warranty (months) *</label>
      <input type="number" required min="0" max="120" />
    </div>
    <div>
      <label className="block text-sm mb-1">Labor Warranty (months) *</label>
      <input type="number" required min="0" max="120" />
    </div>
  </div>

  <div className="mb-4">
    <label className="block text-sm mb-1">Warranty Exclusions *</label>
    <textarea
      required
      placeholder="List any parts or services not covered by warranty..."
      rows={3}
    />
  </div>

  <div className="mb-4">
    <label className="block text-sm mb-1">How to File a Warranty Claim *</label>
    <textarea
      required
      placeholder="Explain how customers should contact you if they need warranty service..."
      rows={3}
    />
  </div>
</div>

// Quote summary
<div className="bg-gray-100 p-4 rounded-lg mb-6">
  <h3 className="font-semibold mb-3">Quote Summary</h3>
  <div className="space-y-2">
    <div className="flex justify-between">
      <span>Parts</span>
      <span>${totalParts.toFixed(2)}</span>
    </div>
    <div className="flex justify-between">
      <span>Labor</span>
      <span>${totalLabor.toFixed(2)}</span>
    </div>
    <div className="flex justify-between">
      <span>Subtotal</span>
      <span>${(totalParts + totalLabor).toFixed(2)}</span>
    </div>
    <div className="flex justify-between">
      <span>HST (13%)</span>
      <span>${(totalParts + totalLabor * 0.13).toFixed(2)}</span>
    </div>
    <div className="flex justify-between border-t pt-2 font-bold text-lg">
      <span>Total</span>
      <span>${totalWithTax.toFixed(2)}</span>
    </div>
  </div>
</div>

<Button type="submit" className="w-full">
  Send Quote to Customer
</Button>
```

**Validation:**
- All parts have name, quantity, price
- All labor items have description, hours, rate
- Warranty fields are not empty
- Total calculated correctly
- Workshop has valid insurance (check before allowing quote submission)

---

## PHASE 3B: VARIANCE APPROVAL UI

### Task 3B.1: Workshop Variance Request Form
**File:** `src/app/workshop/quotes/[id]/request-variance/page.tsx`

**Scenario:** Workshop discovers additional work needed during repair

**Implementation:**
```tsx
<div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
  <h3 className="font-semibold text-yellow-900 mb-2">
    ⚠️ Cost Increase Detected
  </h3>
  <p className="text-sm text-yellow-800">
    The actual repair cost exceeds the original estimate. Ontario law requires
    customer approval if the increase is more than 10%.
  </p>
</div>

<div className="mb-6">
  <h4 className="font-semibold mb-3">Original Quote</h4>
  <div className="bg-gray-100 p-4 rounded-lg">
    <div className="flex justify-between">
      <span>Original Total</span>
      <span className="font-semibold">${originalQuote.total_cost_with_tax.toFixed(2)}</span>
    </div>
  </div>
</div>

<div className="mb-6">
  <h4 className="font-semibold mb-3">Revised Cost</h4>

  <div className="mb-4">
    <label className="block text-sm mb-1">Additional Parts Cost *</label>
    <input type="number" required min="0" onChange={...} />
  </div>

  <div className="mb-4">
    <label className="block text-sm mb-1">Additional Labor Cost *</label>
    <input type="number" required min="0" onChange={...} />
  </div>

  <div className="bg-gray-100 p-4 rounded-lg">
    <div className="flex justify-between">
      <span>Revised Total</span>
      <span className="font-semibold">${revisedTotal.toFixed(2)}</span>
    </div>
    <div className="flex justify-between text-sm mt-2">
      <span>Increase</span>
      <span className={variancePercent > 10 ? 'text-red-600 font-semibold' : ''}>
        ${varianceAmount.toFixed(2)} ({variancePercent.toFixed(1)}%)
      </span>
    </div>
  </div>

  {variancePercent > 10 && (
    <div className="bg-red-50 border border-red-200 p-3 rounded-lg mt-4">
      <p className="text-sm text-red-800">
        ⚠️ This increase exceeds 10%. You MUST obtain written customer approval
        before continuing work (O. Reg. 17/05, s. 56(3)).
      </p>
    </div>
  )}
</div>

<div className="mb-6">
  <label className="block text-sm mb-1">Reason for Cost Increase *</label>
  <select required>
    <option value="">Select reason...</option>
    <option value="additional_parts_needed">Additional Parts Needed</option>
    <option value="additional_labor_required">Additional Labor Required</option>
    <option value="unforeseen_damage_discovered">Unforeseen Damage Discovered</option>
    <option value="part_price_increase">Part Price Increased</option>
    <option value="customer_requested_additional_work">Customer Requested Additional Work</option>
    <option value="diagnostic_revealed_more_issues">Diagnostic Revealed More Issues</option>
    <option value="other">Other</option>
  </select>
</div>

<div className="mb-6">
  <label className="block text-sm mb-1">Detailed Explanation *</label>
  <textarea
    required
    rows={4}
    placeholder="Explain to the customer why the additional work is necessary..."
  />
</div>

<Button type="submit" className="w-full">
  Request Customer Approval
</Button>
```

**API:**
```typescript
// Creates record in quote_variance_requests table
// Sends email/SMS to customer with approval link
```

---

### Task 3B.2: Customer Variance Approval Page
**File:** `src/app/customer/quotes/variance/[varianceRequestId]/page.tsx`

**Scenario:** Customer receives notification of cost increase

**Implementation:**
```tsx
<div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
  <h3 className="font-semibold text-blue-900 mb-2">
    Cost Increase Requires Your Approval
  </h3>
  <p className="text-sm text-blue-800">
    {workshop.name} has discovered additional work needed on your vehicle.
    Review the details below and decide whether to approve the additional cost.
  </p>
</div>

<div className="grid grid-cols-2 gap-6 mb-6">
  <div className="bg-gray-100 p-4 rounded-lg">
    <h4 className="font-semibold mb-2">Original Quote</h4>
    <div className="text-2xl font-bold">${variance.original_total_cost.toFixed(2)}</div>
  </div>

  <div className="bg-yellow-100 p-4 rounded-lg">
    <h4 className="font-semibold mb-2">Revised Quote</h4>
    <div className="text-2xl font-bold">${variance.revised_total_cost.toFixed(2)}</div>
    <div className="text-sm text-yellow-800 mt-1">
      +${variance.variance_amount.toFixed(2)} ({variance.variance_percent.toFixed(1)}% increase)
    </div>
  </div>
</div>

<div className="mb-6">
  <h4 className="font-semibold mb-2">Reason for Increase</h4>
  <p className="text-sm text-gray-700">{variance.detailed_explanation}</p>
</div>

<div className="mb-6">
  <h4 className="font-semibold mb-2">Additional Work Breakdown</h4>
  {/* Show parts and labor breakdown changes */}
</div>

<div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
  <h4 className="font-semibold text-blue-900 mb-2">Your Options</h4>
  <ul className="text-sm text-blue-800 space-y-2">
    <li><strong>Approve:</strong> Workshop will complete the additional work</li>
    <li><strong>Decline:</strong> Workshop will stop work and return your vehicle</li>
    <li><strong>Questions?</strong> Contact {workshop.name} at {workshop.phone}</li>
  </ul>
</div>

<div className="flex gap-4">
  <Button
    onClick={handleApprove}
    className="flex-1 bg-green-600"
  >
    Approve Additional Cost
  </Button>

  <Button
    onClick={handleDecline}
    className="flex-1 bg-red-600"
  >
    Decline - Stop Work
  </Button>
</div>
```

**API Integration:**
- Approve: Calls `approve_quote_variance()` function
- Decline: Calls `decline_quote_variance()` function

---

## PHASE 3C: WARRANTY CLAIM UI

### Task 3C.1: Customer Warranty Claim Form
**File:** `src/app/customer/warranty/claim/page.tsx`

**Implementation:**
```tsx
<div className="mb-6">
  <h3 className="font-semibold mb-3">Select Repair</h3>
  <select onChange={handleQuoteSelect}>
    <option value="">Select a completed repair...</option>
    {completedRepairs.map(repair => (
      <option key={repair.id} value={repair.id}>
        {repair.workshop_name} - {repair.service_description} - {formatDate(repair.completed_date)}
      </option>
    ))}
  </select>
</div>

{selectedQuote && (
  <>
    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
      <h4 className="font-semibold text-blue-900 mb-2">Warranty Information</h4>
      <ul className="text-sm text-blue-800 space-y-1">
        <li>Parts Warranty: {selectedQuote.warranty_parts_months} months
          (expires {formatDate(selectedQuote.warranty_end_date_parts)})</li>
        <li>Labor Warranty: {selectedQuote.warranty_labor_months} months
          (expires {formatDate(selectedQuote.warranty_end_date_labor)})</li>
        <li>Status: {warrantyStatus === 'valid' ? '✓ Within warranty period' : '⚠️ Warranty expired'}</li>
      </ul>
    </div>

    <div className="mb-6">
      <label className="block text-sm mb-1">What type of issue are you experiencing? *</label>
      <select required>
        <option value="">Select issue type...</option>
        <option value="part_failure">Part Failure</option>
        <option value="labor_defect">Labor Defect (Poor Workmanship)</option>
        <option value="incomplete_repair">Incomplete Repair</option>
        <option value="same_problem_recurring">Same Problem Recurring</option>
        <option value="other">Other</option>
      </select>
    </div>

    <div className="mb-6">
      <label className="block text-sm mb-1">Describe the issue *</label>
      <textarea
        required
        rows={4}
        placeholder="Please describe the problem in detail..."
      />
    </div>

    <div className="mb-6">
      <label className="block text-sm mb-1">When did you first notice this issue? *</label>
      <input type="date" required />
    </div>

    <div className="mb-6">
      <label className="block text-sm mb-1">Upload Photos/Videos (Optional)</label>
      <input type="file" multiple accept="image/*,video/*" />
    </div>

    <Button type="submit" className="w-full">
      Submit Warranty Claim
    </Button>
  </>
)}
```

**API Integration:**
- Calls `file_warranty_claim()` function
- Sends email notification to workshop
- Auto-validates warranty claim

---

### Task 3C.2: Workshop Warranty Claim Response Page
**File:** `src/app/workshop/warranty-claims/[claimId]/page.tsx`

**Implementation:**
```tsx
<div className="mb-6">
  <h3 className="font-semibold mb-3">Claim Details</h3>
  <div className="bg-gray-100 p-4 rounded-lg space-y-2">
    <div><strong>Customer:</strong> {claim.customer_name}</div>
    <div><strong>Original Repair Date:</strong> {formatDate(claim.repair_completion_date)}</div>
    <div><strong>Days Since Repair:</strong> {claim.days_since_repair}</div>
    <div><strong>Issue Type:</strong> {claim.claim_type}</div>
    <div><strong>Warranty Status:</strong>
      {claim.warranty_valid ?
        <span className="text-green-600"> ✓ Valid</span> :
        <span className="text-red-600"> ⚠️ Outside warranty period</span>
      }
    </div>
  </div>
</div>

<div className="mb-6">
  <h4 className="font-semibold mb-2">Customer Description</h4>
  <p className="text-sm text-gray-700">{claim.issue_description}</p>
</div>

{claim.issue_photos.length > 0 && (
  <div className="mb-6">
    <h4 className="font-semibold mb-2">Photos/Videos</h4>
    {/* Display uploaded media */}
  </div>
)}

<div className="mb-6">
  <h4 className="font-semibold mb-3">Your Response</h4>

  <div className="mb-4">
    <label className="block text-sm mb-1">Resolution Type *</label>
    <select required>
      <option value="">Select resolution...</option>
      <option value="free_repair">Free Repair (Honor Warranty)</option>
      <option value="partial_cost_repair">Partial Cost Repair</option>
      <option value="full_refund">Full Refund</option>
      <option value="partial_refund">Partial Refund</option>
      <option value="replacement_part">Replacement Part</option>
      <option value="declined">Decline Claim</option>
      <option value="referred_to_manufacturer">Refer to Manufacturer</option>
    </select>
  </div>

  {resolutionType === 'declined' && (
    <>
      <div className="mb-4">
        <label className="block text-sm mb-1">Reason for Decline *</label>
        <select required>
          <option value="">Select reason...</option>
          <option value="outside_warranty_period">Outside Warranty Period</option>
          <option value="customer_caused_damage">Customer-Caused Damage</option>
          <option value="normal_wear_and_tear">Normal Wear and Tear</option>
          <option value="not_covered_by_warranty">Not Covered by Warranty</option>
          <option value="different_problem">Different Problem</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-1">Explanation for Customer *</label>
        <textarea
          required
          rows={4}
          placeholder="Explain why this claim is being declined..."
        />
      </div>
    </>
  )}

  <div className="mb-4">
    <label className="block text-sm mb-1">Response Notes *</label>
    <textarea
      required
      rows={4}
      placeholder="Provide details about how you will resolve this claim..."
    />
  </div>

  <Button type="submit" className="w-full">
    Submit Response to Customer
  </Button>
</div>
```

---

## PHASE 3D: COMPLIANCE DASHBOARD UI

### Task 3D.1: Workshop Compliance Dashboard
**File:** `src/app/workshop/compliance/page.tsx`

**Implementation:**
```tsx
// Compliance score widget
<div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-lg mb-6">
  <h2 className="text-2xl font-bold mb-2">Compliance Score</h2>
  <div className="text-5xl font-bold mb-2">
    {complianceScore}/100
  </div>
  <div className="text-sm opacity-90">
    {complianceStatus === 'compliant' ?
      '✓ All requirements met' :
      '⚠️ Action required'
    }
  </div>
</div>

// Score breakdown
<div className="grid grid-cols-3 gap-4 mb-6">
  <ScoreCard
    title="Insurance"
    score={20}
    maxScore={20}
    status={insuranceStatus}
  />
  <ScoreCard
    title="Registration"
    score={15}
    maxScore={15}
    status="valid"
  />
  <ScoreCard
    title="WSIB"
    score={15}
    maxScore={15}
    status={wsibStatus}
  />
  <ScoreCard
    title="Quote Compliance"
    score={quoteComplianceScore}
    maxScore={30}
    status={quoteComplianceRate > 90 ? 'good' : 'needs_improvement'}
  />
  <ScoreCard
    title="Variance Compliance"
    score={varianceScore}
    maxScore={10}
    status={violations === 0 ? 'good' : 'violations'}
  />
  <ScoreCard
    title="Warranty Handling"
    score={warrantyScore}
    maxScore={10}
    status={warrantySatisfactionRate > 80 ? 'good' : 'needs_improvement'}
  />
</div>

// Alerts section
{unresolved Alerts.length > 0 && (
  <div className="mb-6">
    <h3 className="font-semibold mb-3">⚠️ Compliance Alerts</h3>
    {unresolvedAlerts.map(alert => (
      <div
        key={alert.id}
        className={`p-4 rounded-lg mb-2 ${
          alert.severity === 'critical' ? 'bg-red-50 border border-red-200' :
          alert.severity === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
          'bg-blue-50 border border-blue-200'
        }`}
      >
        <div className="font-semibold">{alert.alert_type}</div>
        <div className="text-sm">{alert.alert_message}</div>
        <div className="text-xs text-gray-600 mt-1">
          {formatDate(alert.created_at)}
        </div>
      </div>
    ))}
  </div>
)}

// Action items
<div className="mb-6">
  <h3 className="font-semibold mb-3">Action Items</h3>
  {actionItems.map(item => (
    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2">
      <div className="flex-1">
        <div className="font-semibold">{item.title}</div>
        <div className="text-sm text-gray-600">{item.description}</div>
      </div>
      <Button size="sm">Fix</Button>
    </div>
  ))}
</div>

// Stats
<div className="grid grid-cols-3 gap-4">
  <StatCard
    title="Total Quotes"
    value={totalQuotes}
    trend="+12% this month"
  />
  <StatCard
    title="Quote Compliance Rate"
    value={`${quoteComplianceRate.toFixed(1)}%`}
    trend={quoteComplianceRate > 95 ? 'Excellent' : 'Needs improvement'}
  />
  <StatCard
    title="Warranty Claim Rate"
    value={`${warrantyClaimRate.toFixed(1)}%`}
    trend={warrantyClaimRate < 5 ? 'Low (Good)' : 'High'}
  />
</div>
```

**Data Source:**
- Query `workshop_compliance_dashboard` view
- Query `compliance_alert_dashboard` view filtered by workshop

---

### Task 3D.2: Platform Admin Compliance Dashboard
**File:** `src/app/admin/compliance/page.tsx`

**Requirements:**
- Platform-wide compliance summary
- List of workshops requiring attention
- Drill-down into specific workshop compliance

**Implementation:**
```tsx
// Platform-wide summary
<div className="grid grid-cols-4 gap-4 mb-6">
  <StatCard
    title="Total Workshops"
    value={totalWorkshops}
    subtitle={`${compliantWorkshops} compliant`}
  />
  <StatCard
    title="Platform Compliance Rate"
    value={`${platformComplianceRate.toFixed(1)}%`}
    trend={trend}
  />
  <StatCard
    title="Critical Alerts"
    value={criticalAlerts}
    highlight={criticalAlerts > 0}
  />
  <StatCard
    title="OCPA Violations"
    value={ocpaViolations}
    highlight={ocpaViolations > 0}
  />
</div>

// Workshops requiring attention
<div className="mb-6">
  <h3 className="font-semibold mb-3">⚠️ Workshops Requiring Attention</h3>
  <table className="w-full">
    <thead>
      <tr>
        <th>Workshop</th>
        <th>Compliance Score</th>
        <th>Issues</th>
        <th>Priority</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      {workshopsRequiringAttention.map(workshop => (
        <tr key={workshop.id}>
          <td>{workshop.name}</td>
          <td>{workshop.compliance_score}/100</td>
          <td>{workshop.attention_reasons.join(', ')}</td>
          <td>
            <Badge color={
              workshop.priority_level === 'critical' ? 'red' :
              workshop.priority_level === 'high' ? 'orange' :
              'yellow'
            }>
              {workshop.priority_level}
            </Badge>
          </td>
          <td>
            <Button size="sm" href={`/admin/workshops/${workshop.id}/compliance`}>
              Review
            </Button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

// Compliance trends chart
<div className="mb-6">
  <h3 className="font-semibold mb-3">Compliance Trends (12 Months)</h3>
  <LineChart data={complianceTrends} />
</div>
```

**Data Source:**
- Query `platform_compliance_summary` view
- Query `workshops_requiring_attention` view
- Query `compliance_trend_monthly` view

---

## PHASE 3E: CUSTOMER DISCLOSURES

### Task 3E.1: Homepage Disclaimer
**File:** `src/app/page.tsx`

**Implementation:**
```tsx
<div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
  <p className="text-sm text-blue-900">
    <strong>The Auto Doctor</strong> connects you with licensed, insured automotive
    workshops in Ontario. Workshops are independent businesses responsible for their
    repair work and quotes. We facilitate the connection but do not perform repairs.
  </p>
</div>
```

---

### Task 3E.2: Customer Signup Terms Acceptance
**File:** `src/app/customer/signup/page.tsx`

**Implementation:**
```tsx
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

### Task 3E.3: Footer Disclaimer
**File:** `src/components/Footer.tsx`

**Implementation:**
```tsx
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

## PHASE 3F: EMAIL TEMPLATES

### Task 3F.1: Add Unsubscribe Links (CASL Compliance)
**Files:** All email templates in `src/lib/email/templates/`

**Requirements:**
- Every marketing email MUST have unsubscribe link
- Transactional emails don't need unsubscribe link
- Unsubscribe must be one-click (no login required)

**Implementation:**
```typescript
// src/lib/email/send.ts
export async function sendEmail({
  to,
  subject,
  html,
  isTransactional = false // NEW PARAMETER
}: EmailParams) {

  // Add unsubscribe footer to marketing emails
  if (!isTransactional) {
    html += `
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
        <p>
          Don't want to receive these emails?
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?token=${generateUnsubscribeToken(to)}"
             style="color: #3b82f6; text-decoration: underline;">
            Unsubscribe
          </a>
        </p>
        <p style="margin-top: 8px;">
          The Auto Doctor Inc.<br/>
          123 Main St, Toronto, ON M5V 1A1<br/>
          Canada
        </p>
      </div>
    `;
  }

  // Send via Resend
  await resend.emails.send({
    from: 'The Auto Doctor <noreply@theautodoctor.ca>',
    to,
    subject,
    html
  });
}
```

**Transactional vs Marketing:**
- Transactional (no unsubscribe): Quote acceptance confirmation, session booking, password reset
- Marketing (needs unsubscribe): New features, promotions, newsletters

---

### Task 3F.2: Variance Approval Email
**File:** `src/lib/email/templates/variance-approval-request.ts`

**Implementation:**
```typescript
export function varianceApprovalRequestEmail(data: VarianceData): string {
  return `
    <h2>Cost Increase Requires Your Approval</h2>

    <p>Hi ${data.customer_name},</p>

    <p>
      While repairing your ${data.vehicle_year} ${data.vehicle_make} ${data.vehicle_model},
      ${data.workshop_name} has discovered additional work that needs to be completed.
    </p>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
      <h3 style="margin-top: 0;">Cost Summary</h3>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td>Original Quote:</td>
          <td style="text-align: right; font-weight: bold;">$${data.original_cost.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Revised Quote:</td>
          <td style="text-align: right; font-weight: bold;">$${data.revised_cost.toFixed(2)}</td>
        </tr>
        <tr style="border-top: 1px solid #d97706; padding-top: 8px;">
          <td>Increase:</td>
          <td style="text-align: right; font-weight: bold; color: #dc2626;">
            +$${data.variance_amount.toFixed(2)} (${data.variance_percent.toFixed(1)}%)
          </td>
        </tr>
      </table>
    </div>

    <p><strong>Reason for increase:</strong></p>
    <p>${data.detailed_explanation}</p>

    <p><strong>Ontario law requires your approval for this cost increase.</strong></p>

    <div style="margin: 32px 0;">
      <a href="${data.approval_link}"
         style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px;
                text-decoration: none; border-radius: 6px; font-weight: bold;">
        Review and Approve/Decline
      </a>
    </div>

    <p>Questions? Contact ${data.workshop_name} directly at ${data.workshop_phone}.</p>

    <p style="font-size: 12px; color: #6b7280; margin-top: 32px;">
      This is a transactional email related to your active repair service.
    </p>
  `;
}
```

---

## TESTING CHECKLIST

### Phase 3A: Quote Acceptance
- [ ] Customer cannot accept quote without checking all boxes
- [ ] Quote acceptance logs to database with IP address
- [ ] Workshop cannot start work without accepted quote (database trigger blocks it)
- [ ] Itemized breakdown displays correctly
- [ ] Warranty information displays correctly

### Phase 3B: Variance Approval
- [ ] Workshop can request variance
- [ ] Customer receives email notification
- [ ] Customer can approve/decline variance
- [ ] Database trigger blocks work completion if >10% variance without approval
- [ ] Variance approval logs to database

### Phase 3C: Warranty Claims
- [ ] Customer can file warranty claim
- [ ] Warranty validation works (within period, claim type matches coverage)
- [ ] Workshop receives notification
- [ ] Workshop can respond to claim
- [ ] Customer receives workshop response

### Phase 3D: Compliance Dashboard
- [ ] Workshop compliance score calculates correctly
- [ ] Alerts display correctly
- [ ] Action items are actionable
- [ ] Admin dashboard shows platform-wide stats
- [ ] Workshops requiring attention list is accurate

### Phase 3E: Disclosures
- [ ] Homepage disclaimer displays
- [ ] Signup terms require checkboxes
- [ ] Footer disclaimer on all pages
- [ ] Quote acceptance disclosure displays

### Phase 3F: Emails
- [ ] Marketing emails have unsubscribe link
- [ ] Transactional emails don't have unsubscribe
- [ ] Unsubscribe link works (one-click)
- [ ] Variance approval email sends correctly

---

## ESTIMATED TIMELINE

**Week 1:**
- Phase 3A: Quote Acceptance UI (3 days)
- Phase 3B: Variance Approval UI (2 days)

**Week 2:**
- Phase 3C: Warranty Claim UI (3 days)
- Phase 3D: Compliance Dashboard (2 days)

**Week 3:**
- Phase 3E: Customer Disclosures (2 days)
- Phase 3F: Email Templates (2 days)
- Testing and bug fixes (3 days)

**Total:** ~15-20 days (3-4 weeks)

---

## DOCUMENT STATUS

**Phase 3 Status:** 📋 PLANNED (Not Yet Started)
**Prerequisites:** Phase 1 (Legal Templates) and Phase 2 (Database Infrastructure) must be completed
**Next Steps:** Begin Phase 3A (Quote Acceptance UI)
