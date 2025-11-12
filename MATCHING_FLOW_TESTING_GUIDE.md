# MATCHING FLOW - TESTING & VALIDATION GUIDE

**Date:** 2025-11-10
**Version:** 1.0
**Status:** Phase 7 - Testing Documentation

---

## 📋 TABLE OF CONTENTS

1. [Testing Overview](#testing-overview)
2. [Manual Testing Checklist](#manual-testing-checklist)
3. [Test Scenarios](#test-scenarios)
4. [Database Validation Queries](#database-validation-queries)
5. [Unit Test Specifications](#unit-test-specifications)
6. [Integration Test Specifications](#integration-test-specifications)
7. [E2E Test Scenarios](#e2e-test-scenarios)
8. [Performance Testing](#performance-testing)
9. [Edge Cases](#edge-cases)
10. [Deployment Checklist](#deployment-checklist)

---

## 🎯 TESTING OVERVIEW

### What We're Testing

The smart matching system with the following components:

1. **Customer Location Capture** - Location flows from profile → wizard → API → database
2. **Smart Matching Algorithm** - Scores mechanics based on 10+ criteria
3. **Targeted Assignments** - Top 3 mechanics get individual assignments
4. **Broadcast Fallback** - Remaining mechanics see general queue
5. **Priority Display** - Mechanics see match scores and reasons
6. **Offline Handling** - Graceful fallback when all mechanics offline

### Success Criteria

- ✅ Customer location captured and stored correctly
- ✅ Matching algorithm returns scores 0-200+
- ✅ Top 3 mechanics receive targeted assignments
- ✅ Broadcast assignment created for remaining mechanics
- ✅ Priority badges display correctly in dashboard
- ✅ Match reasons are accurate and helpful
- ✅ Offline card shows when all mechanics offline
- ✅ No performance degradation (<500ms matching time)

---

## ✅ MANUAL TESTING CHECKLIST

### Pre-Test Setup

- [ ] **Test Users Created**:
  - [ ] 1 customer account with complete profile (location set)
  - [ ] 5 mechanic accounts with varying profiles:
    - [ ] Mechanic A: Online, Toronto M5V, Red Seal, 5 years exp, 4.8 rating
    - [ ] Mechanic B: Online, Toronto M6K (different FSA), 3 years exp, 4.5 rating
    - [ ] Mechanic C: Online, Vancouver, 10 years exp, 4.9 rating
    - [ ] Mechanic D: Offline, Toronto M5V, 2 years exp, 4.2 rating
    - [ ] Mechanic E: Offline, Montreal, 8 years exp, 4.6 rating

- [ ] **Test Data**:
  - [ ] Customer location: Toronto, ON, M5V 1A1, Canada
  - [ ] Vehicle: 2020 Honda Civic
  - [ ] Test concern: "Check engine light on, rough idle, need diagnostics"

### Phase 1: Customer Booking Flow

- [ ] **Step 1: Location Capture**
  - [ ] Customer profile shows location correctly
  - [ ] Booking wizard pre-fills location from profile
  - [ ] Location can be changed in MechanicStep
  - [ ] Postal code validation works (format: A1A 1A1)
  - [ ] City/province autofill works correctly

- [ ] **Step 2: Mechanic Selection**
  - [ ] Mechanics list loads successfully
  - [ ] Online mechanics appear first (green dot)
  - [ ] Offline mechanics appear with gray dot
  - [ ] Filter "Online Now" works correctly
  - [ ] AllMechanicsOfflineCard shows when all mechanics offline
  - [ ] Location-based sorting works (nearest first)

- [ ] **Step 3: Session Creation**
  - [ ] Submit booking wizard successfully
  - [ ] Redirected to waiver page
  - [ ] After waiver, session created in database
  - [ ] No errors in browser console

### Phase 2: Matching Algorithm Execution

- [ ] **Matching Triggers**
  - [ ] Open browser console (F12)
  - [ ] Check for logs: `[sessionFactory] Running smart matching for session {id}`
  - [ ] Verify log shows extracted keywords
  - [ ] Verify log shows matching criteria (location, urgency)
  - [ ] Verify log shows match count: `Found X matching mechanics`

- [ ] **Match Results**
  - [ ] Top 3 matches logged with scores
  - [ ] Verify scores make sense (online + location = high score)
  - [ ] Check log: `Created X total assignments (3 targeted, 1 broadcast)`
  - [ ] Verify broadcast assignment created

### Phase 3: Database Validation

Run these SQL queries in Supabase SQL Editor:

#### Query 1: Check Session Created
```sql
SELECT
  id,
  customer_user_id,
  type,
  status,
  plan,
  intake_id,
  metadata->>'customer_country' as country,
  metadata->>'customer_city' as city,
  metadata->>'customer_postal_code' as postal_code,
  metadata->>'matching_results' as matching_results,
  created_at
FROM sessions
WHERE customer_user_id = '<YOUR_CUSTOMER_USER_ID>'
ORDER BY created_at DESC
LIMIT 1;
```

**Verify**:
- [ ] Location fields populated in metadata
- [ ] matching_results contains top 3 matches with scores

#### Query 2: Check Targeted Assignments
```sql
SELECT
  sa.id,
  sa.session_id,
  sa.mechanic_id,
  sa.status,
  sa.match_score,
  sa.match_reasons,
  sa.priority,
  sa.metadata->>'match_type' as match_type,
  sa.metadata->>'is_brand_specialist' as is_brand_specialist,
  sa.metadata->>'is_local_match' as is_local_match,
  m.full_name as mechanic_name
FROM session_assignments sa
LEFT JOIN mechanics mech ON sa.mechanic_id = mech.id
LEFT JOIN profiles m ON mech.user_id = m.id
WHERE sa.session_id = '<YOUR_SESSION_ID>'
  AND sa.mechanic_id IS NOT NULL
ORDER BY sa.match_score DESC;
```

**Verify**:
- [ ] 3 targeted assignments created
- [ ] mechanic_id populated for each
- [ ] match_score ranges from 100-200+ for high matches
- [ ] match_reasons array populated with 3-5 reasons
- [ ] status = 'offered'
- [ ] match_type = 'targeted'

#### Query 3: Check Broadcast Assignment
```sql
SELECT
  id,
  session_id,
  mechanic_id,
  status,
  match_score,
  metadata->>'match_type' as match_type,
  metadata->>'reason' as reason
FROM session_assignments
WHERE session_id = '<YOUR_SESSION_ID>'
  AND mechanic_id IS NULL;
```

**Verify**:
- [ ] 1 broadcast assignment exists
- [ ] mechanic_id IS NULL
- [ ] status = 'queued'
- [ ] match_type = 'broadcast'

### Phase 4: Mechanic Dashboard Display

Login as **Mechanic A** (should be in top 3 matches):

- [ ] **Queue Display**
  - [ ] Navigate to mechanic dashboard
  - [ ] Check "Available Sessions" section
  - [ ] Verify session appears in "mine" list (targeted)
  - [ ] **Priority Badge** displayed above SessionCard
  - [ ] Badge shows correct priority level (High Match / Good Match)
  - [ ] Match score displayed (e.g., "165")

- [ ] **Priority Badge Interaction**
  - [ ] Hover over badge to see tooltip
  - [ ] Tooltip shows match reasons list
  - [ ] Icons displayed for each reason:
    - [ ] 🗺️ MapPin for location matches
    - [ ] 🏆 Award for certifications
    - [ ] ⚡ Zap for availability
  - [ ] Metadata badges show (Brand Specialist, Local)

- [ ] **Accept Assignment**
  - [ ] Click "Accept Request" button
  - [ ] Redirected to session page
  - [ ] Session removed from queue after acceptance

Login as **Mechanic C** (should NOT be in top 3 - different city):

- [ ] **Broadcast Queue**
  - [ ] Navigate to mechanic dashboard
  - [ ] Session appears in "unassigned" list (broadcast queue)
  - [ ] Priority badge shows "General Queue" (gray)
  - [ ] No match score displayed
  - [ ] Can still accept assignment

### Phase 5: Offline Mechanic Handling

**Setup**: Clock out all mechanics (set `currently_on_shift = false`)

- [ ] **AllMechanicsOfflineCard Display**
  - [ ] Navigate to booking wizard as customer
  - [ ] Reach MechanicStep
  - [ ] Verify AllMechanicsOfflineCard displayed
  - [ ] Card header shows: "All Mechanics Are Currently Offline"

- [ ] **Option 1: Browse Mechanics**
  - [ ] Click "Browse All Mechanics" button
  - [ ] Verify onlineOnly filter disabled
  - [ ] Offline mechanics shown with gray status dot
  - [ ] Can still select offline mechanic

- [ ] **Option 2: Join Waitlist**
  - [ ] Click "Join Waitlist" button
  - [ ] Verify loading state ("Joining Waitlist...")
  - [ ] Verify success message: "You're on the Waitlist!"
  - [ ] Check browser console for log:
    ```
    [Waitlist] Customer joined waitlist: { userId, email, ... }
    ```

---

## 🧪 TEST SCENARIOS

### Scenario 1: High Match (Score 150+)

**Setup**:
- Customer: Toronto, M5V 1A1
- Mechanic: Toronto, M5V 2B2, Online, Red Seal, 8 years exp, 4.8 rating
- Concern: "Engine diagnostics needed"

**Expected Match Score Breakdown**:
- Available now: +50
- Same FSA (M5V): +40
- Same city: +35
- Red Seal certified: +10
- 8 years experience: +10
- Rating 4.8: +15
- Keyword match (diagnostics): +15
- **Total: 175 points** ✅

**Verification**:
```sql
SELECT match_score, match_reasons
FROM session_assignments
WHERE session_id = '<SESSION_ID>' AND mechanic_id = '<MECHANIC_ID>';
```

**Expected match_reasons**:
- "Available now"
- "Local match - Toronto FSA M5V"
- "Professionally Certified"
- "Keyword match: diagnostics"
- "Extensive experience (8+ years)"
- "High rating (4.8/5.0)"

**Dashboard Display**:
- Priority badge: Orange/red gradient "High Match 175"
- Tooltip shows all 6 match reasons
- Glow effect on badge

---

### Scenario 2: Good Match (Score 100-149)

**Setup**:
- Customer: Toronto, M5V 1A1
- Mechanic: Toronto, M6K 1B1, Online, 3 years exp, 4.5 rating
- Concern: "Brake pads replacement"

**Expected Match Score Breakdown**:
- Available now: +50
- Same city: +35
- Rating 4.5: +10
- Keyword match (brake): +15
- **Total: 110 points** ✅

**Expected match_reasons**:
- "Available now"
- "City match - Toronto"
- "Keyword match: brake"
- "Good rating (4.5/5.0)"

**Dashboard Display**:
- Priority badge: Green gradient "Good Match 110"
- Tooltip shows 4 match reasons

---

### Scenario 3: Standard Match (Score <100)

**Setup**:
- Customer: Toronto, M5V 1A1
- Mechanic: Montreal, Offline, 2 years exp, 4.2 rating
- Concern: "General inspection"

**Expected Match Score Breakdown**:
- Offline: +20
- Different city penalty: -20
- **Total: ~30 points** (may vary)

**Expected match_reasons**:
- "Available when scheduled"
- "Province match - Ontario"

**Dashboard Display**:
- Shows in broadcast queue (unassigned)
- Priority badge: Gray "General Queue"

---

### Scenario 4: Brand Specialist Match

**Setup**:
- Customer: Request BMW specialist
- Mechanic: BMW specialist, Online, 5 years exp
- Concern: "BMW iDrive coding issue"

**Expected Match Score Breakdown**:
- Available now: +50
- Brand specialist: +25
- Keyword match (BMW, coding): +30 (2 matches × 15)
- **Total: ~105+ points**

**Expected match_reasons**:
- "Available now"
- "Brand specialist - BMW"
- "Keyword match: BMW"
- "Keyword match: coding"

**Dashboard Display**:
- "Brand Specialist" badge in tooltip
- Match score 105+

---

## 🗄️ DATABASE VALIDATION QUERIES

### Query: All Assignments for a Session
```sql
WITH session_assignments_detail AS (
  SELECT
    sa.id,
    sa.session_id,
    sa.mechanic_id,
    sa.status,
    sa.match_score,
    sa.match_reasons,
    sa.priority,
    sa.metadata,
    p.full_name as mechanic_name,
    m.currently_on_shift
  FROM session_assignments sa
  LEFT JOIN mechanics m ON sa.mechanic_id = m.id
  LEFT JOIN profiles p ON m.user_id = p.id
  WHERE sa.session_id = '<SESSION_ID>'
)
SELECT * FROM session_assignments_detail
ORDER BY match_score DESC NULLS LAST;
```

### Query: Verify Match Score Distribution
```sql
SELECT
  CASE
    WHEN match_score >= 150 THEN 'High Match (150+)'
    WHEN match_score >= 100 THEN 'Good Match (100-149)'
    WHEN match_score >= 50 THEN 'Standard (50-99)'
    WHEN match_score IS NULL THEN 'Broadcast (no score)'
    ELSE 'Low (<50)'
  END as match_category,
  COUNT(*) as count,
  AVG(match_score) as avg_score,
  MIN(match_score) as min_score,
  MAX(match_score) as max_score
FROM session_assignments
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY match_category
ORDER BY avg_score DESC NULLS LAST;
```

### Query: Targeted vs Broadcast Assignments
```sql
SELECT
  metadata->>'match_type' as match_type,
  COUNT(*) as total_assignments,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(match_score) as avg_score
FROM session_assignments
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY match_type;
```

---

## 🔬 UNIT TEST SPECIFICATIONS

### Test File: `src/lib/mechanicMatching.test.ts`

#### Test 1: Keyword Extraction

```typescript
describe('extractKeywordsFromDescription', () => {
  it('should extract diagnostic keywords', () => {
    const description = "Check engine light on, need diagnostics"
    const keywords = extractKeywordsFromDescription(description)
    expect(keywords).toContain('diagnostics')
    expect(keywords).toContain('check engine')
  })

  it('should extract multiple keywords', () => {
    const description = "Brake pads worn, suspension noise, oil change needed"
    const keywords = extractKeywordsFromDescription(description)
    expect(keywords).toContain('brake')
    expect(keywords).toContain('suspension')
    expect(keywords).toContain('oil change')
  })

  it('should handle empty description', () => {
    const keywords = extractKeywordsFromDescription('')
    expect(keywords).toEqual([])
  })

  it('should be case insensitive', () => {
    const description = "CHECK ENGINE LIGHT ON"
    const keywords = extractKeywordsFromDescription(description)
    expect(keywords).toContain('check engine')
  })
})
```

#### Test 2: Match Score Calculation

```typescript
describe('findMatchingMechanics', () => {
  it('should prioritize online mechanics', async () => {
    const criteria = {
      requestType: 'general',
      customerCountry: 'Canada',
      customerCity: 'Toronto',
      urgency: 'immediate'
    }

    const matches = await findMatchingMechanics(criteria)

    // First mechanic should be online
    expect(matches[0].availability).toBe('online')
    expect(matches[0].matchScore).toBeGreaterThanOrEqual(50)
  })

  it('should score local mechanics higher', async () => {
    const criteria = {
      requestType: 'general',
      customerCountry: 'Canada',
      customerCity: 'Toronto',
      customerPostalCode: 'M5V 1A1',
      preferLocalMechanic: true
    }

    const matches = await findMatchingMechanics(criteria)

    // Top match should be local (FSA M5V)
    expect(matches[0].isLocalMatch).toBe(true)
    expect(matches[0].matchScore).toBeGreaterThanOrEqual(100)
  })

  it('should match brand specialists correctly', async () => {
    const criteria = {
      requestType: 'brand_specialist',
      requestedBrand: 'BMW',
      extractedKeywords: ['bmw', 'coding']
    }

    const matches = await findMatchingMechanics(criteria)

    expect(matches[0].isBrandSpecialist).toBe(true)
    expect(matches[0].matchReasons).toContain('Brand specialist - BMW')
  })

  it('should handle no matches gracefully', async () => {
    const criteria = {
      requestType: 'general',
      customerCountry: 'Antarctica', // No mechanics here
    }

    const matches = await findMatchingMechanics(criteria)

    expect(matches).toEqual([])
  })
})
```

---

## 🔄 INTEGRATION TEST SPECIFICATIONS

### Test File: `src/app/api/intake/start/route.test.ts`

#### Test 1: Location Flow

```typescript
describe('POST /api/intake/start', () => {
  it('should pass customer location to sessionFactory', async () => {
    const payload = {
      plan: 'standard',
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '416-555-0123',
      customer_country: 'Canada',
      customer_province: 'Ontario',
      customer_city: 'Toronto',
      customer_postal_code: 'M5V 1A1',
      concern: 'Engine light on',
      vin: '1HGCM82633A123456'
    }

    const response = await fetch('/api/intake/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.sessionId).toBeDefined()

    // Verify session has location in metadata
    const session = await getSession(data.sessionId)
    expect(session.metadata.customer_city).toBe('Toronto')
    expect(session.metadata.customer_postal_code).toBe('M5V 1A1')
  })
})
```

---

## 🎭 E2E TEST SPECIFICATIONS

### Test File: `e2e/matching-flow.spec.ts` (Playwright/Cypress)

```typescript
test('Customer books session → Mechanic sees targeted assignment', async ({ page }) => {
  // Step 1: Customer logs in
  await page.goto('/login')
  await page.fill('[name="email"]', 'customer@test.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  // Step 2: Navigate to booking wizard
  await page.goto('/customer/book-session')

  // Step 3: Select vehicle
  await page.click('text=2020 Honda Civic')
  await page.click('button:has-text("Continue")')

  // Step 4: Select plan
  await page.click('text=Standard Plan')
  await page.click('button:has-text("Continue")')

  // Step 5: Select mechanic
  // Verify location pre-filled
  await expect(page.locator('text=Toronto, Ontario, Canada')).toBeVisible()

  // See available mechanics
  await expect(page.locator('.mechanic-card')).toHaveCount(5)

  // Skip mechanic selection (no preference)
  await page.click('button:has-text("Continue")')

  // Step 6: Enter concern
  await page.fill('[name="concern"]', 'Check engine light on, rough idle')
  await page.click('button:has-text("Review & Submit")')

  // Step 7: Accept waiver
  await expect(page).toHaveURL(/\/intake\/waiver/)
  await page.check('[type="checkbox"]')
  await page.click('button:has-text("Accept & Continue")')

  // Step 8: Verify session created
  await expect(page).toHaveURL(/\/customer\/dashboard/)
  await expect(page.locator('text=Session created successfully')).toBeVisible()

  // Step 9: Login as mechanic (in new page)
  const mechanicPage = await browser.newPage()
  await mechanicPage.goto('/mechanic/login')
  await mechanicPage.fill('[name="email"]', 'mechanic-toronto@test.com')
  await mechanicPage.fill('[name="password"]', 'password123')
  await mechanicPage.click('button[type="submit"]')

  // Step 10: Verify targeted assignment
  await mechanicPage.goto('/mechanic/dashboard')
  await expect(mechanicPage.locator('text=Available Sessions')).toBeVisible()

  // Verify priority badge
  await expect(mechanicPage.locator('text=High Match')).toBeVisible()
  await expect(mechanicPage.locator('text=165')).toBeVisible() // Match score

  // Hover to see match reasons
  await mechanicPage.hover('text=High Match')
  await expect(mechanicPage.locator('text=Available now')).toBeVisible()
  await expect(mechanicPage.locator('text=Local match - Toronto FSA M5V')).toBeVisible()
})
```

---

## ⚡ PERFORMANCE TESTING

### Matching Algorithm Performance

**Target**: <500ms for matching + assignment creation

**Test**:
```typescript
const start = performance.now()
const matches = await findMatchingMechanics(criteria)
const end = performance.now()
const duration = end - start

expect(duration).toBeLessThan(500) // 500ms threshold
expect(matches.length).toBeGreaterThan(0)
```

### Database Query Performance

```sql
-- Query execution time for targeted assignments
EXPLAIN ANALYZE
SELECT sa.*, m.full_name
FROM session_assignments sa
LEFT JOIN mechanics m ON sa.mechanic_id = m.id
WHERE sa.session_id = '<SESSION_ID>'
  AND sa.status = 'offered'
ORDER BY sa.match_score DESC;
```

**Expected**: <50ms execution time

---

## 🔧 EDGE CASES

### Edge Case 1: No Online Mechanics

**Setup**: All mechanics offline

**Expected**:
- AllMechanicsOfflineCard displayed
- Session still created successfully
- Broadcast assignment created
- No targeted assignments (0 mechanics available)

**Verification**:
```sql
SELECT COUNT(*) as targeted_count
FROM session_assignments
WHERE session_id = '<SESSION_ID>'
  AND mechanic_id IS NOT NULL;
-- Expected: 0

SELECT COUNT(*) as broadcast_count
FROM session_assignments
WHERE session_id = '<SESSION_ID>'
  AND mechanic_id IS NULL;
-- Expected: 1
```

### Edge Case 2: No Location Data

**Setup**: Customer has no location in profile

**Expected**:
- Matching still runs
- No location-based scoring
- Mechanics sorted by availability, rating, experience

### Edge Case 3: Special Characters in Concern

**Setup**: Concern with emojis, symbols: "Check 🔧 engine!! @#$%"

**Expected**:
- Keyword extraction handles special characters
- Extracts "check engine" correctly
- No errors in matching

### Edge Case 4: Very Long Concern (1000+ words)

**Setup**: Paste 1000-word concern description

**Expected**:
- Keyword extraction completes successfully
- Performance <500ms
- Extracts top relevant keywords

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] E2E tests passing
- [ ] Performance tests passing
- [ ] Database migration applied (`20251110_add_matching_fields.sql`)
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] No console errors in browser

### Deployment Steps

1. [ ] **Database Migration**
   ```bash
   pnpm supabase db push
   ```

2. [ ] **Build and Deploy**
   ```bash
   pnpm build
   pnpm deploy
   ```

3. [ ] **Verify Environment Variables**
   - [ ] `NEXT_PUBLIC_SUPABASE_URL` set
   - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set

4. [ ] **Post-Deployment Smoke Tests**
   - [ ] Create test session as customer
   - [ ] Verify mechanic dashboard shows assignment
   - [ ] Verify priority badge displays
   - [ ] Accept assignment successfully

### Monitoring

- [ ] Set up logging for matching algorithm
- [ ] Monitor match score distribution (Supabase Dashboard)
- [ ] Track targeted assignment acceptance rate
- [ ] Monitor API performance (<500ms)

### Rollback Plan

If issues occur:

1. **Revert Code Deployment**
   ```bash
   git revert <commit-hash>
   pnpm deploy
   ```

2. **Database Rollback** (if needed)
   ```sql
   -- Remove matching fields
   ALTER TABLE session_assignments
   DROP COLUMN IF EXISTS match_score,
   DROP COLUMN IF EXISTS match_reasons,
   DROP COLUMN IF EXISTS priority,
   DROP COLUMN IF EXISTS expires_at;
   ```

3. **Verify System Stability**
   - [ ] Sessions still create successfully
   - [ ] Mechanics can accept assignments
   - [ ] No errors in logs

---

## ✅ TESTING SIGN-OFF

**Tester Name**: _________________
**Date**: _________________

**Test Results**:
- [ ] All manual tests passed
- [ ] All database validation queries passed
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Performance tests passing
- [ ] Edge cases handled correctly

**Issues Found**: _________________

**Ready for Deployment**: ☐ Yes  ☐ No

**Notes**:
_____________________________________________
_____________________________________________

---

**End of Testing Guide**

*For implementation details, see [MATCHING_FLOW_ANALYSIS.md](MATCHING_FLOW_ANALYSIS.md)*
