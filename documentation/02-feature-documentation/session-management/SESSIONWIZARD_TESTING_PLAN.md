# SessionWizard Testing Plan - Comprehensive Guide

## Overview

This document provides a bulletproof testing plan for the redesigned SessionWizard component. Follow these steps to verify that mechanic matching, filtering, and smart recommendations work perfectly.

---

## Prerequisites

### Database Migration Required

**IMPORTANT**: Before testing, run the new suspension fields migration:

```bash
# Apply the new migration that adds account_status, suspended_until, ban_reason fields
pnpm supabase db push
```

This migration file: `supabase/migrations/20251109000001_1_add_suspension_fields.sql`

---

## Test Mechanic Profiles Setup

Create the following test mechanic profiles in your database. Each profile is designed to test specific matching scenarios.

### Test Mechanic A: BMW Specialist - Toronto (Perfect Match Scenario)

**Profile Fields:**
- **Name**: `Test Mechanic A - BMW Specialist`
- **Email**: `mechanic.a.bmw@test.com`
- **Status**: `approved`
- **Can Accept Sessions**: `true`
- **Profile Completion Score**: `95`
- **Account Status**: `active`
- **Is Available**: `true` (online now)
- **Is Brand Specialist**: `true`
- **Brand Specializations**: `["BMW", "Mercedes-Benz"]`
- **Service Keywords**: `["engine_diagnostics", "brake_repair", "suspension"]`
- **Country**: `Canada`
- **City**: `Toronto`
- **Postal Code**: `M5V 3A8`
- **Years of Experience**: `12`
- **Rating**: `4.8`
- **Completed Sessions**: `75`
- **Red Seal Certified**: `true`
- **Certification Type**: `red_seal`
- **Certification Expiry Date**: `2026-12-31` (future date - not expired)

**Expected Behavior**:
- Should appear for BMW vehicles
- Should appear as TOP match for Toronto M5V postal code
- Should show as "Available now" (green indicator)
- Should score highest due to: online, same FSA, BMW specialist, high experience, high rating

---

### Test Mechanic B: General Mechanic - Toronto (Local Match)

**Profile Fields:**
- **Name**: `Test Mechanic B - General`
- **Email**: `mechanic.b.general@test.com`
- **Status**: `approved`
- **Can Accept Sessions**: `true`
- **Profile Completion Score**: `85`
- **Account Status**: `active`
- **Is Available**: `false`
- **Last Seen At**: `5 hours ago`
- **Is Brand Specialist**: `false`
- **Brand Specializations**: `[]`
- **Service Keywords**: `["oil_change", "tire_rotation", "brake_repair"]`
- **Country**: `Canada`
- **City**: `Toronto`
- **Postal Code**: `M5J 2N8` (different FSA but same city)
- **Years of Experience**: `8`
- **Rating**: `4.5`
- **Completed Sessions**: `45`
- **Red Seal Certified**: `false`
- **Certification Type**: `provincial`
- **Certification Expiry Date**: `2025-06-30`

**Expected Behavior**:
- Should appear for standard plan
- Should appear for Toronto customers
- Should show as "5h ago" (offline)
- Should rank lower than Mechanic A (offline, not specialist, different FSA)

---

### Test Mechanic C: Audi Specialist - Mississauga (Nearby Match)

**Profile Fields:**
- **Name**: `Test Mechanic C - Audi Specialist`
- **Email**: `mechanic.c.audi@test.com`
- **Status**: `approved`
- **Can Accept Sessions**: `true`
- **Profile Completion Score**: `90`
- **Account Status**: `active`
- **Is Available**: `true`
- **Last Seen At**: `now`
- **Is Brand Specialist**: `true`
- **Brand Specializations**: `["Audi", "Volkswagen", "Porsche"]`
- **Service Keywords**: `["engine_diagnostics", "transmission", "electrical"]`
- **Country**: `Canada`
- **City**: `Mississauga`
- **Postal Code**: `L5B 3C1`
- **Years of Experience**: `15`
- **Rating**: `4.9`
- **Completed Sessions**: `120`
- **Red Seal Certified**: `true`
- **Certification Type**: `red_seal`
- **Certification Expiry Date**: `2027-03-15`

**Expected Behavior**:
- Should appear for Audi vehicles
- Should appear as available (green indicator)
- Should NOT appear for BMW specialist searches
- Should rank high for Mississauga postal codes
- Should show as specialist when customer selects Audi

---

### Test Mechanic D: Low Profile Completion (Should NOT Appear)

**Profile Fields:**
- **Name**: `Test Mechanic D - Incomplete Profile`
- **Email**: `mechanic.d.incomplete@test.com`
- **Status**: `approved`
- **Can Accept Sessions**: `true`
- **Profile Completion Score**: `65` ⚠️ (below 80% threshold)
- **Account Status**: `active`
- **Is Available**: `true`
- **Country**: `Canada`
- **City**: `Toronto`
- **Postal Code**: `M5V 1A1`

**Expected Behavior**:
- Should **NOT** appear in any search results (profile completion < 80%)
- API should filter out this mechanic

---

### Test Mechanic E: Expired Certification (Should NOT Appear)

**Profile Fields:**
- **Name**: `Test Mechanic E - Expired Cert`
- **Email**: `mechanic.e.expired@test.com`
- **Status**: `approved`
- **Can Accept Sessions**: `true`
- **Profile Completion Score**: `95`
- **Account Status**: `active`
- **Is Available**: `true`
- **Certification Type**: `red_seal`
- **Certification Expiry Date**: `2024-01-15` ⚠️ (expired date)
- **Country**: `Canada`
- **City**: `Toronto`
- **Postal Code**: `M5V 2K3`

**Expected Behavior**:
- Should **NOT** appear in any search results (expired certification)
- API should filter out this mechanic in JavaScript filter

---

### Test Mechanic F: Suspended (Cooling Period) (Should NOT Appear)

**Profile Fields:**
- **Name**: `Test Mechanic F - Suspended`
- **Email**: `mechanic.f.suspended@test.com`
- **Status**: `approved`
- **Can Accept Sessions**: `true`
- **Profile Completion Score**: `92`
- **Account Status**: `suspended` ⚠️
- **Suspended Until**: `2025-12-09` (30 days from workshop removal)
- **Ban Reason**: `Cooling period after workshop termination. You can resume work in 30 days.`
- **Country**: `Canada`
- **City**: `Toronto`
- **Postal Code**: `M5V 1H1`

**Expected Behavior**:
- Should **NOT** appear in any search results (account_status = suspended)
- API should filter out at database level (`.eq('account_status', 'active')`)

---

### Test Mechanic G: Mercedes Specialist - Vancouver (Different City)

**Profile Fields:**
- **Name**: `Test Mechanic G - Mercedes Vancouver`
- **Email**: `mechanic.g.mercedes@test.com`
- **Status**: `approved`
- **Can Accept Sessions**: `true`
- **Profile Completion Score**: `88`
- **Account Status**: `active`
- **Is Available**: `true`
- **Is Brand Specialist**: `true`
- **Brand Specializations**: `["Mercedes-Benz", "BMW"]`
- **Service Keywords**: `["diagnostics", "luxury_repair"]`
- **Country**: `Canada`
- **City**: `Vancouver`
- **Postal Code**: `V6B 4Y8`
- **Years of Experience**: `10`
- **Rating**: `4.6`
- **Completed Sessions**: `60`
- **Red Seal Certified**: `true`
- **Certification Type**: `red_seal`
- **Certification Expiry Date**: `2026-08-20`

**Expected Behavior**:
- Should appear for BMW specialist searches
- Should appear for Mercedes specialist searches
- Should rank LOWER for Toronto customers (different city penalty)
- Should rank HIGH for Vancouver customers
- Should show as available

---

## Customer Test Scenarios

### Scenario 1: BMW Owner in Toronto - Specialist Recommended

**Customer Actions:**
1. Navigate to SessionWizard
2. **Step 1 - Vehicle Selection**:
   - Select existing vehicle: `2022 BMW X5`
   - OR add new vehicle:
     - Year: `2022`
     - Make: `BMW`
     - Model: `X5`
     - VIN: `WBABC123456789012`

**Expected UI Behavior:**
- After selecting BMW, plan selection should appear
- Should see yellow badge: "✓ Recommended for your BMW" on Specialist plan card
- Specialist plan should be visually highlighted

**Customer Continues:**
3. **Select Plan**: Choose "Specialist" (recommended)
4. Click "Continue"
5. **Step 2 - Postal Code**:
   - Enter: `M5V 3A8`
6. Click "Find Best Match"

**Expected API Call:**
```
GET /api/mechanics/available?request_type=brand_specialist&requested_brand=BMW&customer_postal_code=M5V%203A8&customer_country=Canada&customer_city=Toronto&limit=10
```

**Expected Result:**
- **Top Match**: Test Mechanic A - BMW Specialist
- **Match Score**: ~250+ points
- **Match Reasons**:
  - ✓ Available now (50 pts)
  - ✓ Same area (M5V) (40 pts)
  - ✓ Local to Toronto (35 pts)
  - ✓ BMW specialist (30 pts)
  - ✓ Located in Canada (25 pts)
  - ✓ 10+ years experience (20 pts)
  - ✓ Highly rated (4.5+) (15 pts)
  - ✓ Red Seal Certified (10 pts)
  - ✓ 50+ sessions (12 pts)
- **Presence Indicator**: Green (online)
- **Card Shows**: "Perfect Match Found! 🎯"

**Mechanics NOT Shown:**
- Test Mechanic D (profile < 80%)
- Test Mechanic E (expired cert)
- Test Mechanic F (suspended)

**Mechanics in "Browse" Modal** (if user clicks "See Other Options"):
- Test Mechanic A (top)
- Test Mechanic G (available but Vancouver - ranked lower)
- Test Mechanic C (available but Audi specialist, not BMW match - should not appear)

---

### Scenario 2: Honda Owner in Toronto - Standard Plan

**Customer Actions:**
1. Navigate to SessionWizard
2. **Step 1 - Vehicle Selection**:
   - Add new vehicle:
     - Year: `2020`
     - Make: `Honda`
     - Model: `Civic`
     - VIN: `2HGFC2F50LH123456`

**Expected UI Behavior:**
- After selecting Honda, plan selection appears
- Should **NOT** see "Recommended for your Honda" badge (not a premium brand)
- Both plans shown equally

**Customer Continues:**
3. **Select Plan**: Choose "Standard"
4. Click "Continue"
5. **Step 2 - Postal Code**:
   - Enter: `M5J 2N8`
6. Click "Find Best Match"

**Expected API Call:**
```
GET /api/mechanics/available?request_type=general&customer_postal_code=M5J%202N8&customer_country=Canada&customer_city=Toronto&limit=10
```

**Expected Result:**
- **Top Match**: Test Mechanic B - General
- **Match Score**: ~140+ points
- **Match Reasons**:
  - ✓ Available soon (20 pts - offline)
  - ✓ Same area (M5J) (40 pts)
  - ✓ Local to Toronto (35 pts)
  - ✓ Located in Canada (25 pts)
  - ✓ 5+ years experience (10 pts)
  - ✓ Highly rated (4.5+) (15 pts)
- **Presence Indicator**: Gray (offline - "5h ago")

**Mechanics Also Shown** (in Browse modal):
- Test Mechanic A (if online, but general search - no specialist bonus)
- Test Mechanic B (top match)

---

### Scenario 3: Audi Owner in Mississauga - Specialist Recommended

**Customer Actions:**
1. Navigate to SessionWizard
2. **Step 1 - Vehicle Selection**:
   - Add new vehicle:
     - Year: `2023`
     - Make: `Audi`
     - Model: `Q5`
     - VIN: `WA1AAAF39PD123456`

**Expected UI Behavior:**
- After selecting Audi, should see "✓ Recommended for your Audi" badge (Audi is premium brand)

**Customer Continues:**
3. **Select Plan**: Choose "Specialist"
4. Click "Continue"
5. **Step 2 - Postal Code**:
   - Enter: `L5B 3C1`
6. Click "Find Best Match"

**Expected API Call:**
```
GET /api/mechanics/available?request_type=brand_specialist&requested_brand=Audi&customer_postal_code=L5B%203C1&customer_country=Canada&customer_city=Mississauga&limit=10
```

**Expected Result:**
- **Top Match**: Test Mechanic C - Audi Specialist
- **Match Score**: ~250+ points
- **Match Reasons**:
  - ✓ Available now (50 pts)
  - ✓ Same area (L5B) (40 pts)
  - ✓ Local to Mississauga (35 pts)
  - ✓ Audi specialist (30 pts)
  - ✓ Located in Canada (25 pts)
  - ✓ 10+ years experience (20 pts)
  - ✓ Highly rated (4.5+) (15 pts)
  - ✓ Red Seal Certified (10 pts)
  - ✓ 50+ sessions (12 pts)
- **Presence Indicator**: Green (online)

**Mechanics NOT Shown:**
- Test Mechanic A (BMW specialist, not Audi)
- Test Mechanic G (Mercedes specialist, not Audi)

---

### Scenario 4: Mercedes Owner in Toronto - Multiple Specialists Available

**Customer Actions:**
1. Navigate to SessionWizard
2. **Step 1 - Vehicle Selection**:
   - Add new vehicle:
     - Year: `2021`
     - Make: `Mercedes-Benz`
     - Model: `C-Class`
     - VIN: `55SWF4KB8MU123456`

**Expected UI Behavior:**
- Should see "✓ Recommended for your Mercedes-Benz" badge

**Customer Continues:**
3. **Select Plan**: Choose "Specialist"
4. Click "Continue"
5. **Step 2 - Postal Code**:
   - Enter: `M5V 1A1`
6. Click "Find Best Match"

**Expected API Call:**
```
GET /api/mechanics/available?request_type=brand_specialist&requested_brand=Mercedes-Benz&customer_postal_code=M5V%201A1&customer_country=Canada&customer_city=Toronto&limit=10
```

**Expected Result:**
- **Top Match**: Test Mechanic A (Toronto, online, same FSA M5V)
  - Score: ~265 pts (local + available)
- **Also Available** (in Browse modal):
  - Test Mechanic G (Vancouver, online but different city)
  - Score: ~170 pts (available but different city penalty)

**Ranking Reason:**
- Mechanic A wins due to same FSA (M5V) + same city + online
- Mechanic G loses points for being in Vancouver

---

### Scenario 5: Edge Case - No Postal Code Entered

**Customer Actions:**
1. Select vehicle: `2022 BMW X5`
2. Select plan: `Specialist`
3. **Step 2**: Leave postal code empty
4. Click "Find Best Match"

**Expected Behavior:**
- Validation error: "Please enter your postal code"
- OR auto-fetch mechanics without location scoring
- Mechanics sorted by: availability > rating > experience

**Expected Top Match** (no location scoring):
- Test Mechanic A or C (whichever has higher base score from availability + rating)

---

### Scenario 6: Edge Case - No Mechanics Match

**Customer Actions:**
1. Select vehicle: `2018 Ferrari 488`
2. Select plan: `Specialist`
3. Enter postal code: `M5V 3A8`
4. Click "Find Best Match"

**Expected API Call:**
```
GET /api/mechanics/available?request_type=brand_specialist&requested_brand=Ferrari&customer_postal_code=M5V%203A8...
```

**Expected Result:**
- No mechanics with Ferrari specialization exist
- Empty state message: "No mechanics found matching your criteria"
- OR fallback to general mechanics

---

## API Filtering Verification Checklist

Use these SQL queries to manually verify filtering logic:

### ✅ Check Profile Completion Filter

```sql
SELECT id, name, email, profile_completion_score, status, can_accept_sessions
FROM mechanics
WHERE status = 'approved'
  AND can_accept_sessions = true
  AND profile_completion_score >= 80
ORDER BY profile_completion_score DESC;
```

**Expected**: Should include Mechanics A, B, C, E (before expiry check), F (before suspension check), G
**Should EXCLUDE**: Mechanic D (65% profile)

---

### ✅ Check Certification Expiry Filter

```sql
SELECT id, name, email, certification_expiry_date,
       CASE
         WHEN certification_expiry_date < NOW() THEN 'EXPIRED'
         WHEN certification_expiry_date IS NULL THEN 'NO_EXPIRY'
         ELSE 'VALID'
       END as cert_status
FROM mechanics
WHERE status = 'approved'
  AND can_accept_sessions = true
  AND profile_completion_score >= 80;
```

**Expected**:
- Mechanic E shows `EXPIRED`
- API JavaScript filter should exclude Mechanic E

---

### ✅ Check Account Status Filter

```sql
SELECT id, name, email, account_status, suspended_until, ban_reason
FROM mechanics
WHERE status = 'approved'
  AND can_accept_sessions = true
  AND profile_completion_score >= 80
ORDER BY account_status;
```

**Expected**:
- Mechanic F shows `account_status = 'suspended'`
- Database query `.eq('account_status', 'active')` should exclude Mechanic F

---

### ✅ Check Brand Specialist Filtering

```sql
SELECT id, name, email, is_brand_specialist, brand_specializations
FROM mechanics
WHERE status = 'approved'
  AND can_accept_sessions = true
  AND profile_completion_score >= 80
  AND account_status = 'active'
  AND is_brand_specialist = true
  AND 'BMW' = ANY(brand_specializations);
```

**Expected**: Should return Mechanics A and G (both have BMW in specializations)

---

## Browser Console Testing

Open browser console and test API endpoints directly:

### Test BMW Specialist Search

```javascript
fetch('/api/mechanics/available?request_type=brand_specialist&requested_brand=BMW&customer_postal_code=M5V%203A8&customer_country=Canada&customer_city=Toronto&limit=10')
  .then(r => r.json())
  .then(data => {
    console.log('Mechanics found:', data.mechanics.length);
    console.log('Top match:', data.mechanics[0]);
    console.log('Match reasons:', data.mechanics[0]?.matchReasons);
    console.log('Score:', data.mechanics[0]?.matchScore);
  });
```

**Expected Output:**
```json
{
  "mechanics": [...],
  "count": 2,
  "total": 2
}
```

Top mechanic should be Mechanic A with score ~265+.

---

### Test General Search

```javascript
fetch('/api/mechanics/available?request_type=general&customer_postal_code=M5J%202N8&customer_country=Canada&customer_city=Toronto&limit=10')
  .then(r => r.json())
  .then(data => {
    console.log('General mechanics:', data.mechanics);
    data.mechanics.forEach(m => {
      console.log(`${m.name}: ${m.matchScore} pts - ${m.matchReasons.join(', ')}`);
    });
  });
```

---

## UI/UX Testing Checklist

### Step 1: Vehicle + Plan Selection

- [ ] Vehicle grid displays all customer vehicles
- [ ] "Add Vehicle" button opens modal
- [ ] Adding new vehicle updates list immediately (optimistic update)
- [ ] After selecting vehicle, plan selection appears smoothly
- [ ] Premium brands show "✓ Recommended" badge on Specialist plan
- [ ] Standard brands show both plans equally
- [ ] "Continue" button disabled until vehicle + plan selected

### Step 2: Postal Code + Mechanic Selection

- [ ] Postal code input accepts Canadian format (A1A 1A1)
- [ ] "Find Best Match" button triggers API call
- [ ] Loading spinner shows during API call
- [ ] Top match card displays with all details:
  - [ ] Mechanic name
  - [ ] Presence indicator (green/yellow/gray)
  - [ ] Last seen text
  - [ ] Rating stars
  - [ ] Years of experience
  - [ ] Completed sessions count
  - [ ] Red Seal badge (if applicable)
  - [ ] Match reasons list
  - [ ] Match score
- [ ] "See Other Options" button opens MechanicBrowserModal
- [ ] "Continue with This Mechanic" button proceeds to intake

### MechanicBrowserModal

- [ ] Modal opens as full-screen overlay
- [ ] Lists all available mechanics sorted by match score
- [ ] Each mechanic card shows same info as top match
- [ ] Clicking mechanic selects them
- [ ] "Back to Best Match" returns to original selection
- [ ] "Continue with Selection" proceeds with selected mechanic
- [ ] Modal closes with X button or clicking outside

---

## Performance Testing

### API Response Time

```javascript
const start = performance.now();
fetch('/api/mechanics/available?request_type=brand_specialist&requested_brand=BMW&customer_postal_code=M5V%203A8&customer_country=Canada&customer_city=Toronto&limit=10')
  .then(r => r.json())
  .then(data => {
    const end = performance.now();
    console.log(`API response time: ${(end - start).toFixed(2)}ms`);
  });
```

**Expected**: < 500ms for typical queries

---

### Scoring Algorithm Verification

Create a spreadsheet to verify scoring manually:

| Mechanic | Availability | FSA Match | City Match | Country Match | Specialist | Experience | Rating | Red Seal | Sessions | **Total** |
|----------|-------------|-----------|------------|---------------|------------|------------|---------|----------|----------|-----------|
| A        | 50          | 40        | 35         | 25            | 30         | 20         | 15      | 10       | 12       | **237**   |
| B        | 20          | 0         | 35         | 25            | 0          | 10         | 15      | 0        | 8        | **113**   |
| C        | 50          | 0         | 0          | 25            | 30         | 20         | 15      | 10       | 12       | **162**   |

---

## Regression Testing

After any code changes, re-run all scenarios to ensure:

1. [ ] Profile completion filter still works (Mechanic D excluded)
2. [ ] Certification expiry filter still works (Mechanic E excluded)
3. [ ] Account status filter still works (Mechanic F excluded)
4. [ ] Brand specialist matching works (correct specialists appear)
5. [ ] Location scoring prioritizes same FSA > same city > same country
6. [ ] Availability scoring prioritizes online > away > offline
7. [ ] Smart plan recommendation shows for premium brands

---

## Success Criteria

All tests pass if:

✅ Mechanic A appears as top match for BMW + Toronto + M5V
✅ Mechanic B appears for general + Toronto + M5J
✅ Mechanic C appears for Audi + Mississauga + L5B
✅ Mechanic D never appears (profile < 80%)
✅ Mechanic E never appears (expired cert)
✅ Mechanic F never appears (suspended)
✅ Mechanic G appears for Mercedes + Vancouver + V6B
✅ Smart recommendation badge shows for BMW, Audi, Mercedes, Tesla, etc.
✅ UI shows correct presence indicators (green/yellow/gray)
✅ Scoring algorithm ranks correctly
✅ API response time < 500ms

---

## Troubleshooting

### Issue: Mechanic D (low profile) still appears

**Fix**: Check database query includes:
```sql
.gte('profile_completion_score', 80)
```

---

### Issue: Mechanic E (expired cert) still appears

**Fix**: Check JavaScript filter in route.ts:
```typescript
if (mechanic.certification_expiry_date) {
  const expiryDate = new Date(mechanic.certification_expiry_date)
  if (expiryDate < new Date()) {
    return false // Exclude expired
  }
}
```

---

### Issue: Mechanic F (suspended) still appears

**Fix**:
1. Ensure migration ran: `pnpm supabase db push`
2. Check database query includes: `.eq('account_status', 'active')`
3. Verify Mechanic F has `account_status = 'suspended'` in database

---

### Issue: Wrong mechanic appears as top match

**Debug**:
1. Check browser console for API response
2. Verify `matchScore` values
3. Check `matchReasons` array
4. Ensure postal codes match expected FSA patterns

---

## Database Seeding Script

Use this SQL to quickly seed test mechanics:

```sql
-- Insert Test Mechanic A
INSERT INTO mechanics (
  email, name, status, can_accept_sessions, profile_completion_score,
  account_status, is_available, is_brand_specialist, brand_specializations,
  service_keywords, country, city, postal_code, years_of_experience,
  rating, completed_sessions, red_seal_certified, certification_type,
  certification_expiry_date
) VALUES (
  'mechanic.a.bmw@test.com',
  'Test Mechanic A - BMW Specialist',
  'approved',
  true,
  95,
  'active',
  true,
  true,
  ARRAY['BMW', 'Mercedes-Benz'],
  ARRAY['engine_diagnostics', 'brake_repair', 'suspension'],
  'Canada',
  'Toronto',
  'M5V 3A8',
  12,
  4.8,
  75,
  true,
  'red_seal',
  '2026-12-31'::date
);

-- Repeat for other test mechanics (B, C, D, E, F, G)...
```

---

## Final Notes

- Run all tests in both local dev and staging environments
- Test with real customer accounts
- Monitor API logs for any errors
- Check Supabase dashboard for query performance
- Verify RLS policies don't interfere with mechanic fetching

**This testing plan ensures bulletproof verification of the SessionWizard redesign! 🎯**
