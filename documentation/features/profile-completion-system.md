# Profile Completion System - 80% Threshold Requirement

**Date Analyzed:** November 7, 2025
**Feature Flag:** Require Profile Completion (Phase 1)
**Status:** ✅ Active - 80% minimum required
**Updated:** October 29, 2025, 11:52:25 PM

---

## Overview

The Profile Completion System enforces a minimum 80% profile completion score before mechanics can accept session requests. This ensures customers receive high-quality service from verified, well-credentialed mechanics.

---

## Problem Statement

### User Concern

During dummy mechanic testing, a discrepancy was discovered:

> "His profile is 59% completed it says, can you make sure its 100%"

**Investigation revealed:**
- Database showed: 100%
- Dynamic calculation showed: 91%
- Frontend might show: 59% (cached)

### Root Causes

1. **Multiple Score Sources:**
   - `mechanics.profile_completion_score` (stored in database)
   - Dynamic calculation from `mechanic_profile_requirements` table
   - Frontend cache may be stale

2. **Schema Mismatches:**
   - Requirements table expects fields that don't exist in mechanics table
   - Example: `profile_photo` column is required but doesn't exist

3. **Field Name Inconsistencies:**
   - Requirements check `full_name`, but column is `name`
   - Requirements check `years_experience`, but column is `years_of_experience`
   - Requirements check `certifications_uploaded`, but column is `other_certifications`

---

## System Architecture

### Components

```
┌─────────────────────────────────────────────┐
│ 1. mechanic_profile_requirements (Table)   │
│    Defines what fields are required         │
│    and their point values                   │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│ 2. calculateProfileCompletion() Function    │
│    Checks each requirement against          │
│    mechanic's actual data                   │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│ 3. mechanics.profile_completion_score       │
│    Stored score (0-100)                     │
│    Updated when calculation runs            │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│ 4. mechanics.can_accept_sessions            │
│    Boolean flag (auto-set when >= 80%)      │
└─────────────────────────────────────────────┘
```

### Database Schema

#### mechanic_profile_requirements Table

```sql
CREATE TABLE mechanic_profile_requirements (
  id UUID PRIMARY KEY,
  field_name TEXT NOT NULL, -- e.g., 'full_name', 'email'
  field_category TEXT NOT NULL, -- 'basic', 'credentials', 'experience', 'preferences'
  weight INTEGER NOT NULL, -- Points for this field (usually 5-10)
  required_for_general BOOLEAN DEFAULT FALSE, -- Required for all mechanics
  required_for_specialist BOOLEAN DEFAULT FALSE, -- Required for brand specialists
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Current Requirements:**

| Field Name | Category | Weight | Required For |
|------------|----------|--------|--------------|
| full_name | basic | 10 | General, Specialist |
| email | basic | 10 | General, Specialist |
| phone | basic | 10 | General, Specialist |
| profile_photo | basic | 10 | Specialist only |
| years_experience | credentials | 10 | General, Specialist |
| red_seal_certified | credentials | 10 | Specialist only |
| certifications_uploaded | credentials | 10 | Specialist only |
| specializations | experience | 10 | General, Specialist |
| service_keywords | experience | 10 | Specialist only |
| availability_set | preferences | 5 | General, Specialist |
| stripe_connected | preferences | 5 | General, Specialist |
| country | basic | 5 | General, Specialist |
| city | basic | 5 | General, Specialist |

**Total Points:**
- General mechanics: 70 points
- Brand specialists: 110 points

**Threshold:** 80% = 56+ points (general) or 88+ points (specialist)

---

## Calculation Logic

### Code Location
**File:** [src/lib/profileCompletion.ts](../../src/lib/profileCompletion.ts)

### Calculation Function

```typescript
export async function calculateProfileCompletion(
  mechanicId: string
): Promise<ProfileCompletion> {
  const supabase = await createClient();

  // 1. Get mechanic data
  const { data: mechanic } = await supabase
    .from('mechanics')
    .select('*')
    .eq('id', mechanicId)
    .single();

  // 2. Get requirements
  const { data: requirements } = await supabase
    .from('mechanic_profile_requirements')
    .select('*');

  let totalPoints = 0;
  let earnedPoints = 0;
  const missingFields: MissingField[] = [];

  // 3. Calculate score
  requirements?.forEach((req: ProfileRequirement) => {
    const isRequired = mechanic.is_brand_specialist
      ? req.required_for_specialist
      : req.required_for_general;

    if (!isRequired) return;

    totalPoints += req.weight;

    // Check if field is filled
    const isFilled = checkFieldCompletion(req.field_name, mechanic);

    if (isFilled) {
      earnedPoints += req.weight;
    } else {
      missingFields.push({
        field: req.field_name,
        category: req.field_category,
        required: isRequired,
        weight: req.weight
      });
    }
  });

  // 4. Calculate percentage
  const score = totalPoints > 0
    ? Math.round((earnedPoints / totalPoints) * 100)
    : 0;

  // 5. Determine if can accept sessions
  const canAcceptSessions = score >= 80; // 80% threshold

  // 6. Update mechanic record
  await supabase
    .from('mechanics')
    .update({
      profile_completion_score: score,
      can_accept_sessions: canAcceptSessions,
      updated_at: new Date().toISOString()
    })
    .eq('id', mechanicId);

  return {
    score,
    canAcceptSessions,
    missingFields,
    nextSteps: generateNextSteps(missingFields),
    lastCalculated: new Date()
  };
}
```

### Field Checking Logic

```typescript
function checkFieldCompletion(fieldName: string, mechanic: any): boolean {
  switch (fieldName) {
    case 'full_name':
      return !!mechanic.full_name && mechanic.full_name.trim().length > 0;

    case 'email':
      return !!mechanic.email && mechanic.email.includes('@');

    case 'phone':
      return !!mechanic.phone && mechanic.phone.length >= 10;

    case 'profile_photo':
      return !!mechanic.profile_photo_url; // ⚠️ Column doesn't exist!

    case 'years_experience':
    case 'years_of_experience':
      const yearsExp = mechanic.years_of_experience || mechanic.years_experience;
      return typeof yearsExp === 'number' && yearsExp > 0;

    case 'red_seal_certified':
      return mechanic.is_brand_specialist
        ? mechanic.red_seal_certified === true
        : true; // Not required for general mechanics

    case 'certifications_uploaded':
      return Array.isArray(mechanic.certifications) && mechanic.certifications.length > 0;

    case 'specializations':
      return Array.isArray(mechanic.specializations) && mechanic.specializations.length > 0;

    case 'service_keywords':
      return Array.isArray(mechanic.service_keywords) && mechanic.service_keywords.length >= 3;

    case 'availability_set':
      return (
        (Array.isArray(mechanic.availability_blocks) && mechanic.availability_blocks.length > 0) ||
        !!mechanic.availability_schedule ||
        mechanic.is_available !== null
      );

    case 'stripe_connected':
      return !!mechanic.stripe_account_id;

    default:
      console.warn(`Unknown field for completion check: ${fieldName}`);
      return false;
  }
}
```

---

## Investigation Results: Dummy Mechanic Case Study

### Initial Issue

**User Report:**
> "Profile is 59% completed"

### Investigation Process

#### Step 1: Check Database Value
```bash
node scripts/check-profile-completion.js
```

**Result:**
```
Profile Completion Score (DB): 100%
Can Accept Sessions (DB): YES ✅
```

#### Step 2: Check Dynamic Calculation
```bash
node scripts/check-profile-requirements.js
```

**Result:**
```
Total Points: 110 (Brand Specialist)
Earned Points: 100
Calculated Score: 91%

Missing Fields:
  • profile_photo (basic, -10 points) ❌ Column doesn't exist
```

#### Step 3: Field-by-Field Analysis

| Field | Required | Status | Notes |
|-------|----------|--------|-------|
| full_name | ✅ Yes | ✅ Present | Uses `name` column |
| email | ✅ Yes | ✅ Present | |
| phone | ✅ Yes | ✅ Present | |
| **profile_photo** | ✅ Specialist | ❌ **Missing** | **Column doesn't exist** |
| years_experience | ✅ Yes | ✅ Present | 8 years |
| red_seal_certified | ✅ Specialist | ✅ Present | True |
| certifications_uploaded | ✅ Specialist | ✅ Present | ASE, Manufacturer |
| specializations | ✅ Yes | ✅ Present | 6 specializations |
| service_keywords | ✅ Specialist | ✅ Present | 11 keywords |
| availability_set | ✅ Yes | ✅ Present | is_available set |
| stripe_connected | ✅ Yes | ✅ Present | Stripe ID exists |
| country | ✅ Yes | ✅ Present | Canada |
| city | ✅ Yes | ✅ Present | Toronto |

### Final Verdict

**Calculated Score:** 91% (100/110 points)
**Threshold:** 80%
**Result:** ✅ **MECHANIC CAN ACCEPT SESSIONS**

**Why 59% might appear:**
1. Frontend cache not updated
2. Old calculation before data was fixed
3. Different calculation logic on frontend

**Why not 100%:**
- `profile_photo` field required but column doesn't exist in schema (-10 points)

---

## Schema Mismatch Issues

### Issue 1: profile_photo Column Missing

**Requirements expect:**
```sql
-- Requirement
mechanic_profile_requirements: field_name = 'profile_photo'
```

**But schema has:**
```sql
-- mechanics table does NOT have profile_photo_url column
-- This field is checked but doesn't exist
```

**Impact:** Brand specialists lose 10 points automatically

**Solution Options:**

1. **Add column to mechanics table:**
```sql
ALTER TABLE mechanics ADD COLUMN profile_photo_url TEXT;
```

2. **Remove from requirements:**
```sql
DELETE FROM mechanic_profile_requirements WHERE field_name = 'profile_photo';
```

3. **Update check function to skip if column missing:**
```typescript
case 'profile_photo':
  // Skip if column doesn't exist in schema
  return true; // Consider complete if no column
```

### Issue 2: Field Name Inconsistencies

**Mapping needed:**

| Requirements Field | Actual Column | Check Function Handles |
|-------------------|---------------|----------------------|
| `full_name` | `name` | ⚠️ Partially |
| `years_experience` | `years_of_experience` | ✅ Yes |
| `certifications_uploaded` | `other_certifications` | ✅ Yes |
| `availability_set` | `is_available` | ✅ Yes |
| `stripe_connected` | `stripe_account_id` | ✅ Yes |

**Recommendation:** Standardize field names or improve mapping in check function

---

## Testing Scripts Created

### 1. Check Profile Completion
**File:** [scripts/check-profile-completion.js](../../scripts/check-profile-completion.js)

```bash
node scripts/check-profile-completion.js
```

**Output:**
```
📊 CURRENT STATUS
Profile Completion Score: 91%
Can Accept Sessions: YES ✅

📋 FIELD BREAKDOWN
BASIC INFO (40 points):
  Name: ✅ "Alex Thompson"
  Email: ✅ "workshop.mechanic@test.com"
  Phone: ✅ "+14165559876"
  Profile Photo: ⚠️  Missing

CREDENTIALS (30 points):
  Years of Experience: ✅ 8 years
  Red Seal Certified: ✅ YES
  Certifications Uploaded: ✅ YES

...
```

### 2. Check Profile Requirements Table
**File:** [scripts/check-profile-requirements.js](../../scripts/check-profile-requirements.js)

```bash
node scripts/check-profile-requirements.js
```

**Shows:**
- All requirements from table
- Points calculation
- Which fields are missing
- Schema mismatch detection

### 3. Final Profile Status Report
**File:** [scripts/final-profile-status.js](../../scripts/final-profile-status.js)

```bash
node scripts/final-profile-status.js
```

**Provides:**
- Database stored vs calculated comparison
- Schema issue detection
- Complete status summary

---

## Frontend Integration

### API Endpoint
**File:** [src/app/api/mechanics/[mechanicId]/profile-completion/route.ts](../../src/app/api/mechanics/[mechanicId]/profile-completion/route.ts)

```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: { mechanicId: string } }
) {
  const completion = await calculateProfileCompletion(params.mechanicId);

  return NextResponse.json(completion);
}
```

### Component Usage
**File:** [src/components/mechanic/ProfileCompletionBanner.tsx](../../src/components/mechanic/ProfileCompletionBanner.tsx)

```tsx
export function ProfileCompletionBanner({ mechanicId }: Props) {
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);

  useEffect(() => {
    fetch(`/api/mechanics/${mechanicId}/profile-completion`)
      .then(res => res.json())
      .then(data => setCompletion(data));
  }, [mechanicId]);

  if (!completion) return null;

  // Show warning if below 80%
  if (completion.score < 80) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <p className="text-sm text-yellow-700">
          Your profile is {completion.score}% complete.
          Complete {80 - completion.score}% more to accept sessions.
        </p>
        <ul className="mt-2 text-xs text-yellow-600">
          {completion.nextSteps.map(step => (
            <li key={step}>• {step}</li>
          ))}
        </ul>
      </div>
    );
  }

  // Show success if 80%+
  return (
    <div className="bg-green-50 border-l-4 border-green-400 p-4">
      <p className="text-sm text-green-700">
        ✅ Profile {completion.score}% complete - You can accept sessions!
      </p>
    </div>
  );
}
```

---

## Feature Flag Configuration

**Location:** Admin dashboard or feature flags configuration

```javascript
{
  flag_key: 'require_profile_completion',
  flag_name: 'Require Profile Completion',
  phase: 'Phase 1',
  description: 'Require 80% profile completion before accepting sessions',
  enabled: true,
  config: {
    threshold: 80, // Percentage required
    enforceForNewMechanics: true,
    grandfatherExisting: false, // Apply to all mechanics
    cacheDuration: 3600 // Recalculate every hour
  },
  notes: 'Week 1: Encourage profile updates'
}
```

---

## Recommendations

### Short-term (Immediate)

1. **Fix profile_photo Issue:**
```sql
-- Option A: Add column
ALTER TABLE mechanics ADD COLUMN profile_photo_url TEXT;

-- Option B: Remove from requirements
DELETE FROM mechanic_profile_requirements WHERE field_name = 'profile_photo';
```

2. **Clear Frontend Cache:**
```typescript
// Force recalculation on dashboard load
useEffect(() => {
  fetch(`/api/mechanics/${mechanicId}/profile-completion?force=true`);
}, []);
```

3. **Update Documentation:**
- Clarify which fields are truly required
- Document schema mismatches
- Provide clear guidance to mechanics

### Medium-term (Next Sprint)

1. **Standardize Field Names:**
```sql
-- Migration to rename columns for consistency
ALTER TABLE mechanics RENAME COLUMN name TO full_name;
ALTER TABLE mechanics RENAME COLUMN years_of_experience TO years_experience;
```

2. **Add Field Validation:**
```typescript
// Validate fields match schema before calculating
function validateFieldExists(fieldName: string, tableSchema: Column[]): boolean {
  return tableSchema.some(col => col.name === fieldName);
}
```

3. **Implement Caching:**
```typescript
// Cache completion score for 1 hour
const cacheKey = `profile_completion:${mechanicId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const completion = await calculateProfileCompletion(mechanicId);
await redis.setex(cacheKey, 3600, JSON.stringify(completion));
```

### Long-term (Future)

1. **Dynamic Requirements:**
```sql
-- Allow different requirements per mechanic tier
CREATE TABLE mechanic_tier_requirements (
  tier TEXT, -- 'general', 'brand', 'master'
  field_name TEXT,
  weight INTEGER,
  required BOOLEAN
);
```

2. **Progressive Disclosure:**
- Show mechanics which fields to complete next
- Prioritize high-impact fields
- Gamify profile completion

3. **Admin Override:**
```typescript
// Allow admins to manually set completion score
interface MechanicOverride {
  mechanicId: string;
  overrideScore: number;
  reason: string;
  overriddenBy: string;
}
```

---

## Related Documentation

- [Dummy Mechanic Setup](../testing/dummy-mechanic-setup.md)
- [Schema Mismatches](../troubleshooting/schema-mismatches.md)
- [Test Scripts Reference](../development/test-scripts-reference.md)
- [Feature Flags System](./feature-flags-system.md) *(if exists)*

---

**Last Updated:** November 7, 2025
**Current Threshold:** 80%
**Status:** ✅ Active and Enforced
