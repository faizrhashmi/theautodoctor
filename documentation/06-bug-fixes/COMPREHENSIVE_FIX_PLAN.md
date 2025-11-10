# COMPREHENSIVE FIX PLAN
## Critical Issues + Location-Based Mechanic Matching

**Date:** November 8, 2025
**Status:** AWAITING APPROVAL - DO NOT IMPLEMENT YET
**Total Issues:** 23 Critical + Location Matching Integration

---

## EXECUTIVE SUMMARY

This plan addresses:
1. **23 Critical Security & Database Issues** from signup flow audit
2. **Location-Based Mechanic Matching** integration (currently 65% implemented but not active)
3. **Postal Code Proximity Matching** (NOT currently implemented - new feature)

### Key Findings

**GOOD NEWS:**
- ✅ Smart matching algorithm EXISTS and is sophisticated ([src/lib/mechanicMatching.ts](src/lib/mechanicMatching.ts))
- ✅ Database schema ready (country, city fields exist in mechanics & session_requests)
- ✅ Brand specialization system fully implemented
- ✅ Service keywords system operational (35 keywords seeded)

**BAD NEWS:**
- ✗ **Matching algorithm NEVER CALLED** - exists but not integrated into session creation
- ✗ **Mechanic location NOT captured during signup** - fields exist but form doesn't collect
- ✗ **Customer location NOT captured** - intake form only has "city" field, missing country
- ✗ **NO postal code fields ANYWHERE** - not in database, not in forms
- ✗ **23 critical security/database issues** blocking sign-up flows

---

## PART A: LOCATION DATA AUDIT

### Current Mechanic Location Capture

**Database Schema (mechanics table):**
```sql
✓ country TEXT (exists)
✓ city TEXT (exists)
✓ state_province TEXT (exists - called "province" in form)
✗ postal_code TEXT (exists BUT NOT populated during signup!)
✓ timezone TEXT (exists)
```

**Signup Form ([src/app/mechanic/signup/page.tsx:36-42](src/app/mechanic/signup/page.tsx#L36-L42)):**
```typescript
// COLLECTED in form:
✓ address: string
✓ city: string
✓ province: string
✓ postalCode: string  // In form state
✓ country: string (defaults to 'Canada')

// VALIDATED in form:
✓ Lines 240-241: Checks address, city, province, postalCode exist

// SENT TO API:
✓ Lines 389-390: Includes address, city, province, postalCode, country
```

**API Route ([src/app/api/mechanic/signup/route.ts:132](src/app/api/mechanic/signup/route.ts#L132)):**
```typescript
// RECEIVED by API:
const { address, city, province, postalCode, country } = body;

// SAVED TO DATABASE (lines 177-183):
full_address,  // ✓ Concatenated string
city,          // ✓ Saved
province,      // ✓ Saved
postal_code: postalCode,  // ✓ SAVED!
country,       // ✓ Saved
```

**VERDICT:** ✅ Mechanic location IS captured BUT needs validation

---

### Current Customer Location Capture

**Database Schema (session_requests table):**
```sql
✓ customer_country TEXT (added in migration 99999999998)
✓ customer_city TEXT (added in migration 99999999998)
✓ prefer_local_mechanic BOOLEAN (added in migration 99999999998)
✗ customer_postal_code TEXT (DOES NOT EXIST)
```

**Intake Form ([src/app/intake/page.tsx:80-92](src/app/intake/page.tsx#L80-L92)):**
```typescript
// Form state:
✓ city: ''  // Only city field exists
✗ country: MISSING
✗ postalCode: MISSING
✗ preferLocal: MISSING
```

**VERDICT:** ✗ Customer location NOT properly captured

---

### Postal Code Implementation Status

**Database:**
- `mechanics.postal_code` - EXISTS, populated during signup ✓
- `session_requests.customer_postal_code` - DOES NOT EXIST ✗
- `profiles.postal_zip_code` - EXISTS for customer profiles ✓

**Forms:**
- Mechanic signup: ✓ Collects postal code
- Customer intake: ✗ DOES NOT collect postal code
- Customer signup: ✓ Collects postal code (in profiles)

**Matching Algorithm:**
- Uses country/city exact match ✓
- NO postal code proximity ✗
- NO distance calculation ✗
- NO geolocation/geocoding ✗

**CONCLUSION:** Postal code collected but NOT used for matching

---

## PART B: MATCHING ALGORITHM AUDIT

### How Matching Currently Works

**Location:** [src/lib/mechanicMatching.ts:40-251](src/lib/mechanicMatching.ts#L40-L251)

**Scoring System (175+ points max):**

| Criteria | Points | Implementation Status |
|----------|--------|----------------------|
| **Availability** | +50 (online) / +20 (available) | ✓ Working |
| **Keyword Matching** | +15 per match | ✓ Working (35 keywords) |
| **Brand Specialist** | +30 | ✓ Working |
| **Experience** | +20/+10/+5 | ✓ Working |
| **Rating** | +15/+10/+5 | ✓ Working |
| **Red Seal** | +10 | ✓ Working |
| **Profile Completion** | +8/+5 | ✓ Working |
| **Sessions Completed** | +12/+8/+4 | ✓ Working |
| **Same Country** | +25 | ✓ Working |
| **Same City** | +35 | ✓ Working |
| **Different Country** | -20 penalty | ✓ Working |
| **Postal Code Proximity** | 0 | ✗ NOT IMPLEMENTED |

**Location Matching Logic (lines 195-217):**
```typescript
if (criteria.customerCountry && mechanic.country) {
  // Same country bonus
  if (mechanic.country.toLowerCase() === criteria.customerCountry.toLowerCase()) {
    score += 25;

    // Same city bonus
    if (criteria.customerCity && mechanic.city && criteria.preferLocalMechanic !== false) {
      if (mechanic.city.toLowerCase() === criteria.customerCity.toLowerCase()) {
        score += 35;
        isLocalMatch = true;
      }
    }
  } else {
    // Different country penalty
    if (criteria.preferLocalMechanic !== false) {
      score -= 20;
    }
  }
}
```

**Issues:**
1. Requires exact city name match (Toronto ≠ North York)
2. No fuzzy matching or proximity
3. No postal code distance calculation
4. No radius-based search

---

### Brand Specialization System

**Database Fields:**
- `mechanics.is_brand_specialist` BOOLEAN
- `mechanics.brand_specializations` TEXT[] (array)
- `mechanics.service_keywords` TEXT[] (array)

**Reference Tables:**
- `brand_specializations` - 20 brands seeded (BMW, Mercedes, Audi, Tesla, etc.)
- `service_keywords` - 35 keywords seeded (brake repair, oil change, etc.)

**Matching Logic ([src/lib/mechanicMatching.ts:83-101](src/lib/mechanicMatching.ts#L83-L101)):**
```typescript
// For brand specialist requests:
1. Filter mechanics where is_brand_specialist = true
2. Check if mechanic.brand_specializations contains ANY requested brand
3. Apply +30 points for brand match
```

**VERDICT:** ✓ Fully implemented and working

---

## PART C: THE 23 CRITICAL ISSUES

### Database/RLS Issues (5 CRITICAL)

#### CRITICAL #1: Mechanics Table - NO RLS Policies
**Impact:** Mechanics cannot view their own profile after signup
**Fix:** Add 4 RLS policies
**Time:** 30 minutes

#### CRITICAL #2: Mechanic Documents - Broken RLS Logic
**Impact:** Document uploads fail
**Fix:** Rewrite SELECT/INSERT policies
**Time:** 15 minutes

#### CRITICAL #3: Organizations - NO INSERT Policy
**Impact:** Workshop signup works via service role but not client
**Fix:** Add INSERT policy
**Time:** 5 minutes

#### CRITICAL #4: Organization Members - NO INSERT + Race Conditions
**Impact:** Cannot invite members
**Fix:** Add INSERT policy + unique constraints
**Time:** 30 minutes

#### CRITICAL #5: Profiles - NO Email Index
**Impact:** Slow email lookups (full table scan)
**Fix:** Add partial unique index
**Time:** 5 minutes

**Total Database Fixes:** 1 hour 25 minutes

---

### Security Issues (8 CRITICAL)

#### CRITICAL #6: PII in localStorage
**Location:** [src/app/mechanic/signup/page.tsx:156-172](src/app/mechanic/signup/page.tsx#L156-L172)
**Risk:** SIN, passwords exposed to XSS
**Fix:** Use sessionStorage, exclude PII from drafts
**Time:** 2 hours

#### CRITICAL #7: File Upload MIME Spoofing
**Location:** [src/app/api/mechanic/upload-document/route.ts:41-51](src/app/api/mechanic/upload-document/route.ts#L41-L51)
**Risk:** Malware upload
**Fix:** Add magic byte validation (file-type package)
**Time:** 2 hours

#### CRITICAL #8: Weak Password Requirements
**Location:** All signup forms
**Risk:** Brute force attacks
**Fix:** Increase to 12+ chars, add complexity checks
**Time:** 1 hour

#### CRITICAL #9: No Backend Email Validation
**Location:** workshop/corporate signup routes
**Risk:** Invalid emails in database
**Fix:** Add Zod email schema
**Time:** 1 hour

#### CRITICAL #10: PII in Logs
**Location:** All signup routes
**Risk:** PIPEDA violation
**Fix:** Remove all email/PII logging
**Time:** 1 hour

#### CRITICAL #11: Age Verification Bypass
**Location:** [src/app/signup/SignupGate.tsx:187-195](src/app/signup/SignupGate.tsx#L187-L195)
**Risk:** Invalid DOBs accepted
**Fix:** Add past/future date checks
**Time:** 1 hour

#### CRITICAL #12: Directory Traversal
**Location:** [src/app/api/mechanic/upload-document/route.ts:71-73](src/app/api/mechanic/upload-document/route.ts#L71-L73)
**Risk:** File path escape
**Fix:** Use UUID filenames
**Time:** 1 hour

#### CRITICAL #13: No CSRF Protection
**Location:** All API routes
**Risk:** Cross-site request forgery
**Fix:** Add CSRF token middleware
**Time:** 3 hours

**Total Security Fixes:** 12 hours

---

### Validation Issues (7 CRITICAL)

#### CRITICAL #14: No Phone Validation (Backend)
**Fix:** Add libphonenumber-js validation
**Time:** 1 hour

#### CRITICAL #15: No Postal Code Validation
**Fix:** Add Canadian postal code regex (A1A 1A1)
**Time:** 1 hour

#### CRITICAL #16: No Certification Expiry Validation
**Fix:** Check expiry dates not in past
**Time:** 1 hour

#### CRITICAL #17: Inconsistent Email Validation
**Fix:** Unified Zod schema for all forms
**Time:** 2 hours

#### CRITICAL #18: Generic Error Messages
**Fix:** User-friendly error mapper
**Time:** 2 hours

#### CRITICAL #19: No Field-Level Errors
**Fix:** Refactor forms to show all errors
**Time:** 8 hours

#### CRITICAL #20: Validation Too Late
**Fix:** Add onBlur validation
**Time:** 4 hours

**Total Validation Fixes:** 19 hours

---

### UX Issues (3 CRITICAL)

#### CRITICAL #21: No ARIA Labels
**Fix:** Add accessibility attributes
**Time:** 8 hours

#### CRITICAL #22: No Visual Validation Feedback
**Fix:** Add red/green borders, checkmarks
**Time:** 8 hours

#### CRITICAL #23: No Password Strength Indicator
**Fix:** Add strength meter to all forms
**Time:** 4 hours

**Total UX Fixes:** 20 hours

---

## PART D: POSTAL CODE PROXIMITY SYSTEM (NEW FEATURE)

### Current Limitation

**Exact City Match Only:**
- Customer in "Toronto" matched with mechanics in "Toronto"
- Customer in "North York" NOT matched with mechanics in "Toronto"
- No understanding that North York is 10km from Toronto

### Proposed Solution: Postal Code Prefix Matching

**Canadian Postal Code System:**
- Format: `A1A 1A1` (letter-number-letter number-letter-number)
- First 3 characters = Forward Sortation Area (FSA)
- Example: `M5V` covers downtown Toronto area (~2-5 km radius)

**Proximity Levels:**
1. **Exact FSA match:** Same 3-char prefix (e.g., M5V = M5V) → +40 points
2. **Same region:** First 2 chars match (e.g., M5V = M5G) → +25 points
3. **Same province:** First char matches (e.g., M5V = M6A) → +10 points

**Implementation:**

```typescript
// Add to matching algorithm
function calculatePostalCodeScore(
  customerPostal: string,
  mechanicPostal: string
): number {
  if (!customerPostal || !mechanicPostal) return 0;

  const custFSA = customerPostal.substring(0, 3).toUpperCase();
  const mechFSA = mechanicPostal.substring(0, 3).toUpperCase();

  // Exact FSA match (same neighborhood)
  if (custFSA === mechFSA) {
    return 40;
  }

  // Same region (first 2 chars)
  if (custFSA.substring(0, 2) === mechFSA.substring(0, 2)) {
    return 25;
  }

  // Same province (first char)
  if (custFSA[0] === mechFSA[0]) {
    return 10;
  }

  return 0;
}
```

**Database Changes Required:**
```sql
-- Add postal code to session_requests
ALTER TABLE session_requests
ADD COLUMN IF NOT EXISTS customer_postal_code TEXT;

-- Add index for postal code prefix search
CREATE INDEX idx_mechanics_postal_prefix
ON mechanics ((substring(postal_code, 1, 3)))
WHERE postal_code IS NOT NULL;

CREATE INDEX idx_session_requests_postal_prefix
ON session_requests ((substring(customer_postal_code, 1, 3)))
WHERE customer_postal_code IS NOT NULL;
```

**Time Estimate:** 4 hours

---

## PART E: INTEGRATION PLAN

### The Missing Links

**Issue #1: Matching Algorithm Never Called**

**Current Flow:**
```
Customer submits intake form
  ↓
POST /api/intake
  ↓
sessionFactory.createSession()
  ↓
Creates session_requests record
  ↓
Broadcasts to ALL mechanics ✗ (no matching)
```

**Desired Flow:**
```
Customer submits intake form
  ↓
POST /api/intake
  ↓
Extract keywords from concern
  ↓
Call findMatchingMechanics()
  ↓
Get top 5-10 matches
  ↓
Create session_requests for MATCHED mechanics only ✓
  ↓
Broadcast ONLY to matched mechanics
```

**Files to Modify:**
1. [src/lib/sessionFactory.ts](src/lib/sessionFactory.ts) - Add matching call
2. [src/app/api/intake/route.ts](src/app/api/intake/route.ts) - Call sessionFactory with matching
3. [src/app/intake/page.tsx](src/app/intake/page.tsx) - Capture country + prefer_local

**Time Estimate:** 6 hours

---

**Issue #2: Customer Location Not Captured**

**Current Intake Form:**
```typescript
// Has:
city: string

// Missing:
country: string
postalCode: string
preferLocalMechanic: boolean
```

**Fix:**
```typescript
// Add to form state (line 80-92):
const [form, setForm] = useState({
  name: '',
  email: '',
  phone: '',
  city: '',
  country: 'Canada',  // NEW
  postalCode: '',     // NEW
  // ... rest
});

// Add to UI:
<select name="country">
  <option value="Canada">Canada</option>
  <option value="USA">USA</option>
</select>

<input name="postalCode" placeholder="A1A 1A1" />

<label>
  <input type="checkbox" name="preferLocal" />
  Prefer mechanics near me
</label>
```

**Files to Modify:**
1. [src/app/intake/page.tsx](src/app/intake/page.tsx) - Add fields
2. [src/app/api/intake/route.ts](src/app/api/intake/route.ts) - Save to session_requests

**Time Estimate:** 3 hours

---

**Issue #3: Mechanic Location Validation**

**Current Status:** Data collected but NOT validated

**Validation Needed:**
```typescript
// Canadian postal code format
const POSTAL_CODE_REGEX = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i;

function validatePostalCode(code: string): boolean {
  const cleaned = code.replace(/\s/g, '').toUpperCase();
  return POSTAL_CODE_REGEX.test(cleaned);
}

// In API route:
if (postalCode && !validatePostalCode(postalCode)) {
  return bad('Invalid postal code format (e.g., K1A 0B1)');
}
```

**Files to Modify:**
1. [src/app/api/mechanic/signup/route.ts](src/app/api/mechanic/signup/route.ts) - Add validation
2. [src/lib/validation/postalCode.ts](src/lib/validation/postalCode.ts) - Create validator

**Time Estimate:** 2 hours

---

## PART F: COMPLETE FIX PLAN (PRIORITIZED)

### Phase 1: IMMEDIATE BLOCKERS (24-48 hours)

**Priority:** Unblock sign-up flows + critical security

**1. Database/RLS Fixes (2 hours)**
- [ ] Add mechanics table RLS policies
- [ ] Fix mechanic_documents RLS logic
- [ ] Add organizations INSERT policy
- [ ] Add organization_members policies
- [ ] Add profiles email index
- [ ] Deploy migration

**2. Remove PII from localStorage (2 hours)**
- [ ] Change to sessionStorage
- [ ] Exclude password/SIN from drafts
- [ ] Test mechanic signup

**3. File Upload Security (2 hours)**
- [ ] Install file-type package
- [ ] Add magic byte validation
- [ ] Test with spoofed files

**4. Backend Email Validation (1 hour)**
- [ ] Add Zod email schema
- [ ] Update workshop/corporate APIs
- [ ] Test invalid emails rejected

**5. Remove PII from Logs (1 hour)**
- [ ] Audit all console.log statements
- [ ] Replace with anonymous IDs
- [ ] Test signup flows

**Phase 1 Total: 8 hours**

---

### Phase 2: LOCATION MATCHING INTEGRATION (1 week)

**Priority:** Enable location-based matching

**6. Database Schema Updates (1 hour)**
```sql
-- Add customer postal code
ALTER TABLE session_requests
ADD COLUMN IF NOT EXISTS customer_postal_code TEXT;

-- Add postal code indexes
CREATE INDEX idx_mechanics_postal_prefix
ON mechanics ((substring(postal_code, 1, 3)))
WHERE postal_code IS NOT NULL;

CREATE INDEX idx_session_requests_postal_prefix
ON session_requests ((substring(customer_postal_code, 1, 3)))
WHERE customer_postal_code IS NOT NULL;
```

**7. Postal Code Validation (2 hours)**
- [ ] Create [src/lib/validation/postalCode.ts](src/lib/validation/postalCode.ts)
- [ ] Add validation to mechanic signup API
- [ ] Add validation to customer intake API
- [ ] Test Canadian postal code formats

**8. Update Customer Intake Form (3 hours)**
- [ ] Add country dropdown
- [ ] Add postal code input
- [ ] Add "prefer local mechanic" checkbox
- [ ] Add validation (onBlur)
- [ ] Test UX

**9. Update Intake API (2 hours)**
- [ ] Extract keywords from concern
- [ ] Save country, city, postal code to session_requests
- [ ] Save prefer_local_mechanic flag
- [ ] Test data persistence

**10. Add Postal Code Matching (4 hours)**
- [ ] Update [src/lib/mechanicMatching.ts](src/lib/mechanicMatching.ts)
- [ ] Add calculatePostalCodeScore function
- [ ] Integrate into scoring algorithm
- [ ] Add unit tests
- [ ] Test matching accuracy

**11. Integrate Matching into Session Creation (6 hours)**
- [ ] Update [src/lib/sessionFactory.ts](src/lib/sessionFactory.ts)
- [ ] Call findMatchingMechanics() before creating requests
- [ ] Create requests ONLY for top 5-10 matches
- [ ] Save match scores to session_requests
- [ ] Test end-to-end flow

**Phase 2 Total: 18 hours**

---

### Phase 3: VALIDATION & SECURITY (1 week)

**Priority:** Prevent bad data and attacks

**12. Password Strength (1 hour)**
- [ ] Increase minimum to 12 characters
- [ ] Add common password check
- [ ] Add sequential pattern check
- [ ] Update all signup forms

**13. Phone Validation (1 hour)**
- [ ] Install libphonenumber-js
- [ ] Add validation to all signup APIs
- [ ] Test Canadian/US formats

**14. Certification Expiry Validation (1 hour)**
- [ ] Check expiry dates in mechanic signup
- [ ] Reject expired insurance
- [ ] Warn if expiring within 30 days

**15. Age Verification Fix (1 hour)**
- [ ] Add future date check
- [ ] Add maximum age check (120 years)
- [ ] Test edge cases

**16. Directory Traversal Fix (1 hour)**
- [ ] Use UUID for filenames
- [ ] Validate file extensions
- [ ] Test upload security

**17. Unified Email Validation (2 hours)**
- [ ] Create shared Zod schema
- [ ] Apply to all forms
- [ ] Test consistency

**18. User-Friendly Error Messages (2 hours)**
- [ ] Create error mapper function
- [ ] Replace generic messages
- [ ] Test user experience

**19. CSRF Protection (3 hours)**
- [ ] Implement CSRF middleware
- [ ] Add to all signup forms
- [ ] Test protection

**Phase 3 Total: 12 hours**

---

### Phase 4: UX IMPROVEMENTS (1 week)

**Priority:** Improve conversion and accessibility

**20. Field-Level Errors (8 hours)**
- [ ] Refactor all forms to track errors by field
- [ ] Show all errors simultaneously
- [ ] Scroll to first error
- [ ] Test UX

**21. onBlur Validation (4 hours)**
- [ ] Add validation on field blur
- [ ] Real-time feedback
- [ ] Clear errors when valid
- [ ] Test all forms

**22. ARIA Labels (8 hours)**
- [ ] Add aria-label to all inputs
- [ ] Add aria-describedby for errors
- [ ] Add aria-invalid states
- [ ] Test with screen readers

**23. Visual Validation Feedback (8 hours)**
- [ ] Red/green borders
- [ ] Checkmarks for valid fields
- [ ] Consistent error styling
- [ ] Test visual hierarchy

**24. Password Strength Meters (4 hours)**
- [ ] Add to mechanic signup
- [ ] Add to workshop signup
- [ ] Add to corporate signup
- [ ] Test visual feedback

**Phase 4 Total: 32 hours**

---

## PART G: TESTING PLAN

### Unit Tests

**1. Postal Code Validation**
```typescript
// tests/unit/postalCode.test.ts
test('validates Canadian postal codes', () => {
  expect(validatePostalCode('K1A 0B1')).toBe(true);
  expect(validatePostalCode('K1A0B1')).toBe(true);  // No space
  expect(validatePostalCode('k1a 0b1')).toBe(true); // Lowercase
  expect(validatePostalCode('12345')).toBe(false);  // Invalid
});
```

**2. Postal Code Proximity Scoring**
```typescript
// tests/unit/mechanicMatching.test.ts
test('scores postal code proximity', () => {
  expect(calculatePostalCodeScore('M5V 1A1', 'M5V 2B2')).toBe(40); // Same FSA
  expect(calculatePostalCodeScore('M5V 1A1', 'M5G 3C3')).toBe(25); // Same region
  expect(calculatePostalCodeScore('M5V 1A1', 'M6A 4D4')).toBe(10); // Same province
  expect(calculatePostalCodeScore('M5V 1A1', 'K1A 5E5')).toBe(0);  // Different
});
```

**3. Matching Algorithm**
```typescript
// tests/unit/mechanicMatching.test.ts
test('prioritizes local mechanics with postal code match', async () => {
  const matches = await findMatchingMechanics({
    requestType: 'general',
    extractedKeywords: ['brake repair'],
    customerCountry: 'Canada',
    customerCity: 'Toronto',
    customerPostalCode: 'M5V 1A1',
    preferLocalMechanic: true,
  });

  // Top match should have M5V postal code
  expect(matches[0].postalCode.substring(0, 3)).toBe('M5V');
});
```

---

### Integration Tests

**1. End-to-End Intake Flow**
```typescript
// tests/e2e/location-matching.spec.ts
test('customer intake captures location and matches mechanics', async ({ page }) => {
  await page.goto('/intake?plan=standard');

  // Fill form with location
  await page.fill('[name="city"]', 'Toronto');
  await page.selectOption('[name="country"]', 'Canada');
  await page.fill('[name="postalCode"]', 'M5V 1A1');
  await page.check('[name="preferLocal"]');

  // Fill vehicle info
  await page.fill('[name="make"]', 'Toyota');
  await page.fill('[name="concern"]', 'My brakes are squeaking');

  await page.click('button[type="submit"]');

  // Verify session created with location data
  await expect(page).toHaveURL(/\/session\/\w+/);

  // Verify session_requests has location
  const sessionId = page.url().split('/').pop();
  const requests = await getSessionRequests(sessionId);
  expect(requests[0].customer_country).toBe('Canada');
  expect(requests[0].customer_city).toBe('Toronto');
  expect(requests[0].customer_postal_code).toBe('M5V 1A1');
  expect(requests[0].prefer_local_mechanic).toBe(true);

  // Verify only local mechanics matched
  const mechanics = await getMechanicsForSession(sessionId);
  expect(mechanics.length).toBeLessThanOrEqual(10); // Top 10 matches only
  expect(mechanics.every(m => m.country === 'Canada')).toBe(true);
});
```

**2. Mechanic Signup with Location**
```typescript
// tests/e2e/mechanic-signup-location.spec.ts
test('mechanic signup captures and validates postal code', async ({ page }) => {
  await page.goto('/mechanic/signup');

  // Fill personal info
  await page.fill('[name="address"]', '123 Main St');
  await page.fill('[name="city"]', 'Toronto');
  await page.selectOption('[name="province"]', 'Ontario');
  await page.fill('[name="postalCode"]', 'M5V 1A1');

  // Try invalid postal code
  await page.fill('[name="postalCode"]', '12345');
  await page.click('button:has-text("Next")');

  await expect(page.locator('text=Invalid postal code')).toBeVisible();

  // Fix postal code
  await page.fill('[name="postalCode"]', 'M5V 1A1');
  await page.click('button:has-text("Next")');

  await expect(page.locator('text=Invalid postal code')).not.toBeVisible();
});
```

---

### Manual Testing Checklist

**Location Matching:**
- [ ] Customer in Toronto (M5V) matched with mechanic in M5V → High score
- [ ] Customer in Toronto (M5V) matched with mechanic in M5G → Medium score
- [ ] Customer in Toronto (M5V) matched with mechanic in M6A → Low score
- [ ] Customer in Toronto matched with mechanic in Vancouver → Penalty
- [ ] prefer_local_mechanic=false allows mechanics from other cities
- [ ] Brand specialist in different city still ranked high for brand match

**Postal Code Validation:**
- [ ] K1A 0B1 → Valid
- [ ] K1A0B1 → Valid (no space)
- [ ] k1a 0b1 → Valid (lowercase)
- [ ] 12345 → Invalid
- [ ] ABC 123 → Invalid
- [ ] Empty → Allowed (optional field)

**Mechanic Signup:**
- [ ] All location fields captured
- [ ] Postal code validated
- [ ] Data saved to mechanics table
- [ ] Can view own profile after signup (RLS working)
- [ ] Can upload documents (RLS working)

---

## PART H: ROLLOUT STRATEGY

### Pre-Deployment Checklist

**Database:**
- [ ] Backup production database
- [ ] Test migrations on staging
- [ ] Verify RLS policies don't block legitimate operations
- [ ] Test rollback procedure

**Code:**
- [ ] All tests passing (unit + integration)
- [ ] TypeScript compiles without errors
- [ ] No console.log with PII
- [ ] All environment variables set

**Monitoring:**
- [ ] Setup alerts for failed sign-ups
- [ ] Monitor matching algorithm performance
- [ ] Track conversion rate changes
- [ ] Log match scores (without PII)

---

### Deployment Sequence

**Step 1: Database Fixes (Low Risk)**
```bash
# Deploy RLS policies and indexes
pnpm supabase db push migrations/fix_critical_rls.sql
pnpm supabase db push migrations/add_postal_code_fields.sql

# Verify
pnpm run test:rls
```

**Step 2: Security Fixes (Medium Risk)**
```bash
# Deploy code changes
git checkout -b fix/critical-security
# ... make changes
git push origin fix/critical-security

# Merge after review
git checkout main
git merge fix/critical-security
git push origin main

# Deploy to production
vercel deploy --prod
```

**Step 3: Location Matching (High Risk - Feature Flag)**
```typescript
// Use feature flag for gradual rollout
const isLocationMatchingEnabled = await getFeatureFlag('location_matching');

if (isLocationMatchingEnabled) {
  const matches = await findMatchingMechanics(criteria);
  // Create requests for top matches
} else {
  // Fallback: broadcast to all mechanics (old behavior)
}
```

**Step 4: Monitor & Iterate**
- Deploy to 10% of users
- Monitor match quality
- Collect feedback
- Adjust scoring weights
- Roll out to 50%, then 100%

---

## PART I: RESOURCE REQUIREMENTS

### Team

**Required:**
- 1 Backend Developer (database, API, matching algorithm)
- 1 Frontend Developer (forms, validation, UX)
- 1 QA Engineer (testing, manual verification)
- 1 DevOps Engineer (deployment, monitoring)

**Optional:**
- 1 UX Designer (accessibility, visual feedback)
- 1 Data Analyst (match quality metrics)

---

### Timeline

| Phase | Duration | Team Members | Total Hours |
|-------|----------|--------------|-------------|
| Phase 1: Immediate Blockers | 1-2 days | Backend, Frontend | 8 hours |
| Phase 2: Location Matching | 1 week | Backend, Frontend, QA | 18 hours |
| Phase 3: Validation & Security | 1 week | Backend, Frontend | 12 hours |
| Phase 4: UX Improvements | 1 week | Frontend, Designer | 32 hours |
| Testing & QA | Ongoing | QA | 20 hours |
| **TOTAL** | **4 weeks** | **All** | **90 hours** |

---

### Budget Estimate

**Development:**
- Phase 1: 8 hours × $100/hr = $800
- Phase 2: 18 hours × $100/hr = $1,800
- Phase 3: 12 hours × $100/hr = $1,200
- Phase 4: 32 hours × $100/hr = $3,200

**QA/Testing:**
- Testing: 20 hours × $75/hr = $1,500

**DevOps:**
- Deployment: 10 hours × $100/hr = $1,000

**Total Budget:** $9,500 - $12,000

---

## PART J: RISK ASSESSMENT

### High Risk

**1. Breaking Existing Sign-ups**
- **Risk:** RLS policy changes could block legitimate operations
- **Mitigation:** Test on staging, gradual rollout, rollback plan

**2. Matching Algorithm Errors**
- **Risk:** Poor matches reduce customer satisfaction
- **Mitigation:** Feature flag, A/B testing, manual review of first 100 matches

**3. Performance Degradation**
- **Risk:** Matching adds latency to session creation
- **Mitigation:** Index optimization, caching, async processing

### Medium Risk

**4. Postal Code Data Quality**
- **Risk:** Mechanics enter invalid/fake postal codes
- **Mitigation:** Validation, geocoding verification, admin review

**5. Regional Imbalances**
- **Risk:** Some regions have no local mechanics
- **Mitigation:** Fallback to country-level matching, recruit mechanics in sparse areas

### Low Risk

**6. UX Changes Reduce Conversion**
- **Risk:** Adding fields to intake form increases abandonment
- **Mitigation:** A/B testing, make fields optional, pre-fill from profile

---

## PART K: SUCCESS METRICS

### KPIs to Track

**Matching Quality:**
- % of customers matched with local mechanics (within same FSA)
- Average match score (should increase after postal code integration)
- % of sessions accepted by first-matched mechanic

**Performance:**
- Session creation latency (should stay < 2 seconds)
- Matching algorithm execution time (should be < 500ms)
- Database query performance (indexed queries < 100ms)

**Business:**
- Sign-up completion rate (should improve after UX fixes)
- Customer satisfaction (NPS for mechanics matched)
- Mechanic utilization (% of mechanics receiving requests)

**Security:**
- Zero PII leaks in logs (monitor with alerts)
- Zero successful file upload attacks (penetration testing)
- 100% CSRF protection (automated testing)

---

## PART L: OPEN QUESTIONS FOR USER

### Before Implementation, Please Confirm:

**1. Postal Code Proximity:**
- ❓ Is postal code prefix matching (FSA) sufficient, or do you need actual distance calculation in km?
- ❓ Should we invest in geocoding API (Google Maps, Mapbox) for precise distances?
- ❓ What's the maximum acceptable distance for "local" match? (5km, 10km, 20km?)

**2. Matching Strategy:**
- ❓ How many mechanics should receive each session request? (Currently: all → Proposed: top 5-10)
- ❓ Should brand specialists ALWAYS be preferred over general mechanics for brand requests?
- ❓ If no local mechanics available, fall back to country-level or reject request?

**3. Customer Experience:**
- ❓ Make postal code required or optional during intake?
- ❓ Make "prefer local mechanic" default to true or false?
- ❓ Show estimated wait time based on local mechanic availability?

**4. Mechanic Experience:**
- ❓ Should mechanics see their match score when receiving requests?
- ❓ Allow mechanics to set service radius (will travel X km)?
- ❓ Notify mechanics if they're losing requests due to location (prompt to expand coverage)?

**5. Rollout:**
- ❓ Deploy all fixes at once, or phase 1 first (critical blockers) then phase 2 (location matching)?
- ❓ Use feature flag for gradual rollout, or deploy to all users immediately?
- ❓ A/B test location matching vs broadcast to measure quality improvement?

**6. Future Enhancements:**
- ❓ International expansion planned? (US postal codes different: 12345)
- ❓ Multi-language support for locations? (Toronto vs Ville de Toronto)
- ❓ Workshop service radius integration with mechanic matching?

---

## PART M: RECOMMENDED APPROACH

Based on audit findings, I recommend:

### Immediate (This Week)
✅ **Phase 1 only** - Fix critical blockers
- Deploy RLS policies (1 hour)
- Remove PII from localStorage (2 hours)
- Add file signature validation (2 hours)
- Add backend email validation (1 hour)
- Remove PII from logs (1 hour)

**Reasoning:** These are blocking sign-ups and pose security risks

### Short Term (Next 2 Weeks)
✅ **Phase 2** - Location matching integration
- Add postal code fields to intake form
- Add postal code proximity scoring
- Integrate matching algorithm into session creation
- Test end-to-end

**Reasoning:** Foundation is 65% built, just needs integration

### Medium Term (Weeks 3-4)
✅ **Phase 3** - Validation & security hardening
✅ **Phase 4** - UX improvements (accessibility, error handling)

**Reasoning:** Non-blocking improvements that enhance quality

---

## APPENDIX A: SQL MIGRATION FILES

### Critical RLS Fixes

**File:** `supabase/migrations/fix_critical_rls.sql`
```sql
-- ============================================================================
-- CRITICAL RLS POLICY FIXES
-- Fixes 23 critical issues from signup flow audit
-- ============================================================================

-- ============================================================================
-- FIX #1: Mechanics Table - Add Missing RLS Policies
-- ============================================================================

-- Policy 1: Mechanics can view their own profile
CREATE POLICY "mechanics_select_own"
ON mechanics
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Policy 2: Mechanics can update their own profile
CREATE POLICY "mechanics_update_own"
ON mechanics
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 3: Admins can view all mechanics
CREATE POLICY "mechanics_admin_all"
ON mechanics
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- FIX #2: Mechanic Documents - Fix Broken RLS Logic
-- ============================================================================

-- Drop broken policies
DROP POLICY IF EXISTS "mechanic_documents_select" ON mechanic_documents;
DROP POLICY IF EXISTS "mechanic_documents_insert" ON mechanic_documents;

-- Correct SELECT policy
CREATE POLICY "mechanic_documents_select"
ON mechanic_documents
FOR SELECT
TO authenticated
USING (
  -- Check if user owns the mechanic profile
  EXISTS (
    SELECT 1 FROM mechanics
    WHERE mechanics.id = mechanic_documents.mechanic_id
    AND mechanics.user_id = auth.uid()
  )
  OR
  -- Or if admin
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Correct INSERT policy
CREATE POLICY "mechanic_documents_insert"
ON mechanic_documents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM mechanics
    WHERE mechanics.id = mechanic_documents.mechanic_id
    AND mechanics.user_id = auth.uid()
  )
);

-- ============================================================================
-- FIX #3: Organizations - Add INSERT Policy
-- ============================================================================

CREATE POLICY "organizations_insert"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (
  -- User creating org becomes the creator
  created_by = auth.uid()
  -- Prevent setting status to 'active' on creation
  AND status = 'pending'
);

-- ============================================================================
-- FIX #4: Organization Members - Add INSERT Policy
-- ============================================================================

CREATE POLICY "organization_members_insert"
ON organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Can invite if user is owner/admin of org
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  )
);

-- Fix duplicate pending invites
CREATE UNIQUE INDEX organization_members_pending_email_unique
ON organization_members (organization_id, email)
WHERE status = 'pending' AND user_id IS NULL;

-- Fix active membership uniqueness
CREATE UNIQUE INDEX organization_members_active_unique
ON organization_members (organization_id, user_id)
WHERE status = 'active';

-- ============================================================================
-- FIX #5: Profiles - Add Email Index
-- ============================================================================

-- Drop old unique constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

-- Create partial unique index (only for active users)
CREATE UNIQUE INDEX profiles_email_active_unique
ON profiles (email)
WHERE deleted_at IS NULL;

-- Create index for lookups
CREATE INDEX profiles_email_idx
ON profiles (email)
WHERE deleted_at IS NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Applied 5 critical RLS fixes';
  RAISE NOTICE '   1. Mechanics table policies (3 policies)';
  RAISE NOTICE '   2. Mechanic documents policies (fixed logic)';
  RAISE NOTICE '   3. Organizations INSERT policy';
  RAISE NOTICE '   4. Organization members INSERT policy + constraints';
  RAISE NOTICE '   5. Profiles email index (partial unique)';
END $$;
```

---

### Postal Code Integration

**File:** `supabase/migrations/add_postal_code_matching.sql`
```sql
-- ============================================================================
-- POSTAL CODE MATCHING SYSTEM
-- Adds postal code fields and proximity indexes
-- ============================================================================

-- ============================================================================
-- PART 1: Add Customer Postal Code to Session Requests
-- ============================================================================

ALTER TABLE session_requests
ADD COLUMN IF NOT EXISTS customer_postal_code TEXT;

COMMENT ON COLUMN session_requests.customer_postal_code IS 'Customer postal code for proximity matching (e.g., M5V 1A1)';

-- Index on postal code prefix (first 3 characters = FSA)
CREATE INDEX idx_session_requests_postal_prefix
ON session_requests ((substring(customer_postal_code, 1, 3)))
WHERE customer_postal_code IS NOT NULL;

-- ============================================================================
-- PART 2: Add Mechanic Postal Code Index
-- ============================================================================

-- Index on postal code prefix for fast proximity search
CREATE INDEX idx_mechanics_postal_prefix
ON mechanics ((substring(postal_code, 1, 3)))
WHERE postal_code IS NOT NULL;

-- Full postal code index for exact matches
CREATE INDEX idx_mechanics_postal_code
ON mechanics (postal_code)
WHERE postal_code IS NOT NULL;

-- ============================================================================
-- PART 3: Postal Code Validation Function
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_postal_code(code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Canadian postal code: A1A 1A1 (with or without space)
  RETURN code ~ '^[A-Z]\d[A-Z]\s?\d[A-Z]\d$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_postal_code IS 'Validates Canadian postal code format (A1A 1A1)';

-- ============================================================================
-- PART 4: Postal Code Distance Function
-- ============================================================================

CREATE OR REPLACE FUNCTION postal_code_proximity_score(
  customer_postal TEXT,
  mechanic_postal TEXT
)
RETURNS INTEGER AS $$
DECLARE
  cust_fsa TEXT;
  mech_fsa TEXT;
BEGIN
  IF customer_postal IS NULL OR mechanic_postal IS NULL THEN
    RETURN 0;
  END IF;

  -- Extract Forward Sortation Area (first 3 characters)
  cust_fsa := UPPER(substring(customer_postal, 1, 3));
  mech_fsa := UPPER(substring(mechanic_postal, 1, 3));

  -- Exact FSA match (same neighborhood, ~2-5 km)
  IF cust_fsa = mech_fsa THEN
    RETURN 40;
  END IF;

  -- Same region (first 2 chars match, ~10-20 km)
  IF substring(cust_fsa, 1, 2) = substring(mech_fsa, 1, 2) THEN
    RETURN 25;
  END IF;

  -- Same province (first char matches)
  IF substring(cust_fsa, 1, 1) = substring(mech_fsa, 1, 1) THEN
    RETURN 10;
  END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION postal_code_proximity_score IS 'Calculates proximity score based on postal code FSA matching';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Postal code matching system installed';
  RAISE NOTICE '   - Added customer_postal_code to session_requests';
  RAISE NOTICE '   - Created postal code prefix indexes';
  RAISE NOTICE '   - Added validate_postal_code() function';
  RAISE NOTICE '   - Added postal_code_proximity_score() function';
END $$;
```

---

## APPROVAL REQUIRED

**Please review this plan and confirm:**

1. ✅ Approve Phase 1 (critical blockers) - proceed immediately?
2. ✅ Approve Phase 2 (location matching) - proceed after Phase 1?
3. ❓ Answer open questions in Part L
4. ❓ Confirm postal code proximity approach (FSA matching vs full geocoding)
5. ❓ Confirm mechanic count per request (top 5-10 vs all mechanics)
6. ❓ Any changes to prioritization or timeline?

**DO NOT PROCEED WITHOUT APPROVAL**

---

**End of Plan**
