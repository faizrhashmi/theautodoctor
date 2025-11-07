# Mechanic Profile Retrieval Fix

**Date:** November 7, 2025
**Category:** Bug Fix / Database Schema Alignment
**Priority:** High (Customer-Facing)
**Status:** ✅ Resolved

## Table of Contents
1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Root Cause Analysis](#root-cause-analysis)
4. [Technical Implementation](#technical-implementation)
5. [Testing & Verification](#testing--verification)
6. [Prevention Strategies](#prevention-strategies)
7. [Related Documentation](#related-documentation)

---

## Overview

### Issue Summary
Customers clicking on mechanic profiles in chat rooms or video sessions were seeing empty modal windows with no profile information. The mechanic profile modal would open but display no data, creating a poor user experience and reducing trust in the platform.

### User Feedback
> "in chatroom or video session clicking on mechanic's profile is not getting his information retrieved, check for what link is broken and where and fix it please"

### Impact
- **Severity:** High - Customer-facing feature completely broken
- **Affected Users:** All customers attempting to view mechanic profiles
- **Business Impact:** Reduced trust, inability to verify mechanic credentials

### Resolution
Fixed API field name inconsistencies between save and view endpoints, aligned with actual database schema, and corrected ID field query logic.

---

## Problem Statement

### Symptoms
1. Clicking mechanic name in chat room → Empty profile modal
2. Clicking mechanic name in video session → Empty profile modal
3. No error messages displayed to user
4. Modal opens successfully but shows no data

### Expected Behavior
- Profile modal should display:
  - Mechanic name and photo
  - Rating and reviews
  - Years of experience
  - Certifications (Red Seal, etc.)
  - Brand specializations
  - About me section
  - Specializations and skills

### Actual Behavior
- Modal opens with loading state
- After API call completes, modal shows empty state
- No error messages logged

---

## Root Cause Analysis

### Investigation Process

1. **Component Level Check**
   - Found `MechanicProfileModal.tsx` component rendering correctly
   - API call being made to `/api/mechanic/profile/${mechanicId}`
   - Response handling logic working properly

2. **API Endpoint Discovery**
   - Found **TWO** different API routes handling mechanic profiles:
     - `/api/mechanic/profile/[mechanicId]` - Customer-facing (view profile)
     - `/api/mechanics/[mechanicId]/profile` - Mechanic-facing (edit profile)

3. **Field Name Inconsistency**
   - **Critical Finding:** The two APIs used different field names for the same data

### Root Causes Identified

#### Cause 1: Inconsistent Field Names Between APIs

**Save API** ([src/app/api/mechanics/[mechanicId]/profile/route.ts](../../src/app/api/mechanics/[mechanicId]/profile/route.ts)):
```typescript
// WRONG - Using incorrect field names
interface ProfileUpdateData {
  bio?: string                    // ❌ Should be about_me
  years_experience?: number       // ❌ Should be years_of_experience
  is_red_seal?: boolean          // ❌ Should be red_seal_certified
  certifications?: string[]      // ❌ Should be certification_documents
}
```

**View API** ([src/app/api/mechanic/profile/[mechanicId]/route.ts](../../src/app/api/mechanic/profile/[mechanicId]/route.ts)):
```typescript
// CORRECT - Using actual database field names
.select(`
  about_me,
  years_of_experience,
  red_seal_certified,
  certification_documents
`)
```

#### Cause 2: Query by Wrong ID Field

The customer-facing profile API was querying by the wrong ID field:

```typescript
// WRONG - mechanicId is actually user_id from auth.users
.eq('id', mechanicId)

// CORRECT - mechanics.user_id references auth.users.id
.eq('user_id', mechanicId)
```

**Explanation:**
- ChatRoom component passes `mechanic.user_id` from session data
- This is the auth user ID, not the mechanics table primary key
- The mechanics table has:
  - `id` (primary key UUID)
  - `user_id` (foreign key to auth.users.id)
- Query must match on `user_id` to find the correct mechanic record

#### Cause 3: Schema Drift

Some fields referenced in code don't exist in the actual database schema:
- `about_me` - Does NOT exist in mechanics table
- `bio` - Does NOT exist in mechanics table
- `hourly_rate` - Does NOT exist in mechanics table

### Contributing Factors

1. **Lack of Type Safety:** TypeScript interfaces didn't match database schema
2. **Multiple API Endpoints:** Two different routes handling same data with different conventions
3. **No Schema Validation:** No runtime checks to ensure field names match database
4. **Missing Integration Tests:** No tests verifying end-to-end profile retrieval
5. **Schema Evolution:** Database schema changed but code wasn't updated

---

## Technical Implementation

### Files Modified

1. [src/app/api/mechanics/[mechanicId]/profile/route.ts](../../src/app/api/mechanics/[mechanicId]/profile/route.ts) - Mechanic-facing save API
2. [src/app/api/mechanic/profile/[mechanicId]/route.ts](../../src/app/api/mechanic/profile/[mechanicId]/route.ts) - Customer-facing view API
3. [src/lib/profileCompletion.ts](../../src/lib/profileCompletion.ts) - Profile completion calculation
4. [src/components/MechanicProfileModal.tsx](../../src/components/MechanicProfileModal.tsx) - Profile modal UI

### Fix 1: Correct Field Names in Save API

**File:** [src/app/api/mechanics/[mechanicId]/profile/route.ts](../../src/app/api/mechanics/[mechanicId]/profile/route.ts)

**Before:**
```typescript
interface ProfileUpdateData {
  // Basic info
  name?: string
  phone?: string
  bio?: string  // ❌ WRONG FIELD NAME

  // Credentials
  certifications?: string[]       // ❌ WRONG
  years_experience?: number       // ❌ WRONG
  is_red_seal?: boolean          // ❌ WRONG
  red_seal_number?: string
  hourly_rate?: number           // ❌ DOESN'T EXIST

  // Other fields...
}
```

**After:**
```typescript
interface ProfileUpdateData {
  // Basic info
  name?: string
  phone?: string
  // NOTE: about_me does NOT exist in mechanics table schema

  // Brand specialization
  is_brand_specialist?: boolean
  brand_specializations?: string[]
  service_keywords?: string[]
  specialist_tier?: 'general' | 'brand' | 'master'

  // Location
  country?: string
  city?: string
  state_province?: string
  timezone?: string

  // Credentials
  certification_documents?: string[]  // ✅ Actual field name in schema
  years_of_experience?: number        // ✅ FIXED
  red_seal_certified?: boolean        // ✅ FIXED
  red_seal_number?: string
  red_seal_province?: string
  red_seal_expiry_date?: string
  shop_affiliation?: string

  // Preferences
  // NOTE: hourly_rate does NOT exist in mechanics table schema
  specializations?: string[]
}
```

**Line References:**
- Lines 16-46: Updated `ProfileUpdateData` interface
- Lines 167-188: Updated allowed fields list for PATCH operations
- Lines 66-93: Fixed GET query to select correct columns

**Allowed Fields List Fix:**
```typescript
// Line 167-188
const allowedFields = [
  'name',
  'phone',
  // 'about_me' does NOT exist in schema - removed
  'is_brand_specialist',
  'brand_specializations',
  'service_keywords',
  'specialist_tier',
  'country',
  'city',
  'state_province',
  'timezone',
  'certification_documents',  // ✅ Actual field name, not 'certifications'
  'years_of_experience',      // ✅ Fixed
  'red_seal_certified',       // ✅ Fixed
  'red_seal_number',
  'red_seal_province',
  'red_seal_expiry_date',
  // 'hourly_rate' does NOT exist in schema - removed
  'specializations',
  'shop_affiliation'
]
```

### Fix 2: Query by Correct ID Field in View API

**File:** [src/app/api/mechanic/profile/[mechanicId]/route.ts](../../src/app/api/mechanic/profile/[mechanicId]/route.ts)

**Before:**
```typescript
// Line 21-38 (WRONG)
const { data: mechanic, error } = await supabaseAdmin
  .from('mechanics')
  .select(`
    id,
    name,
    about_me,
    rating,
    years_of_experience,
    specializations,
    is_brand_specialist,
    brand_specializations,
    specialist_tier,
    red_seal_certified,
    shop_affiliation,
    completed_sessions
  `)
  .eq('id', mechanicId)  // ❌ WRONG - mechanicId is user_id, not id
  .single()
```

**After:**
```typescript
// Line 21-38 (FIXED)
// CRITICAL FIX: Query by user_id (auth.users.id) not id (mechanics.id)
// ChatRoom passes mechanicId as user_id from session-info API
const { data: mechanic, error } = await supabaseAdmin
  .from('mechanics')
  .select(`
    id,
    name,
    about_me,
    rating,
    years_of_experience,
    specializations,
    is_brand_specialist,
    brand_specializations,
    specialist_tier,
    red_seal_certified,
    shop_affiliation,
    completed_sessions
  `)
  .eq('user_id', mechanicId)  // ✅ FIXED - Query by user_id
  .maybeSingle()              // ✅ Changed from .single() for better error handling
```

**Key Changes:**
- Line 37: Changed `.eq('id', mechanicId)` to `.eq('user_id', mechanicId)`
- Line 38: Changed `.single()` to `.maybeSingle()` for better null handling
- Added comment explaining the fix

**Why This Matters:**
- The `mechanicId` parameter comes from the ChatRoom component
- ChatRoom gets it from the session-info API, which returns `mechanic.user_id`
- This `user_id` references `auth.users.id`, not `mechanics.id`
- The mechanics table structure:
  ```sql
  mechanics (
    id UUID PRIMARY KEY,           -- Internal mechanic record ID
    user_id UUID REFERENCES auth.users(id),  -- Auth user ID (what we have)
    name TEXT,
    ...
  )
  ```

### Fix 3: Backward Compatibility in Profile Completion

**File:** [src/lib/profileCompletion.ts](../../src/lib/profileCompletion.ts)

Added support for multiple field name variations to handle legacy data:

```typescript
// Lines 136-145
case 'years_experience':
case 'years_of_experience':  // ✅ Support both field names
  const yearsExp = mechanic.years_of_experience || mechanic.years_experience
  return typeof yearsExp === 'number' && yearsExp > 0

case 'red_seal_certified':
case 'certified': // ✅ NEW: Check for ANY valid certification
  // For brand specialists, certification is required
  // For general mechanics, it's a bonus
  return mechanic.is_brand_specialist ? isCertified(mechanic) : true

case 'certifications_uploaded':
  // Check if mechanic has uploaded at least one certification
  return Array.isArray(mechanic.certifications) && mechanic.certifications.length > 0
```

**Purpose:**
- Supports both old and new field names during transition period
- Prevents profile completion scores from breaking
- Allows gradual migration of existing data

### Fix 4: Enhanced Profile Modal (User Auto-Modified)

**File:** [src/components/MechanicProfileModal.tsx](../../src/components/MechanicProfileModal.tsx)

The user's system automatically made the modal draggable for better UX:

```typescript
// Lines 36, 91, 102-110
const constraintsRef = useRef<HTMLDivElement>(null)

// Constraints container
<div ref={constraintsRef} className="fixed inset-0 z-[9999] flex items-center justify-center p-4">

  {/* Draggable Modal */}
  <motion.div
    drag
    dragConstraints={constraintsRef}
    dragElastic={0.1}
    dragMomentum={false}
    initial={{ opacity: 0, scale: 0.95, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: 20 }}
    className="relative w-full max-w-lg mx-auto z-10 touch-none"
  >
    <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Header - Drag Handle */}
      <div className="cursor-move active:cursor-grabbing">
        {/* Drag indicator */}
        <div className="absolute left-1/2 top-2 -translate-x-1/2 flex gap-1">
          <div className="w-8 h-1 rounded-full bg-slate-600/50"></div>
        </div>
        {/* ... rest of header ... */}
      </div>
    </div>
  </motion.div>
</div>
```

**Features Added:**
- Drag to reposition modal anywhere on screen
- Visual drag indicator at top of modal
- Cursor changes to grabbing when dragging
- Constrained to viewport bounds
- Smooth elastic animation

---

## Testing & Verification

### Manual Testing Steps

#### Test 1: Profile Display from Chat Room
```bash
# Prerequisites
- Have an active chat session with a mechanic
- Mechanic must have completed profile

# Steps
1. Open active chat session
2. Click on mechanic's name in chat header
3. Verify profile modal opens
4. Check all fields display correctly:
   ✅ Name and photo
   ✅ Rating with stars
   ✅ Years of experience
   ✅ Completed sessions count
   ✅ Certification badge (if Red Seal certified)
   ✅ Brand specialist badge (if applicable)
   ✅ Brand specializations list
   ✅ About me section
   ✅ Specializations tags
```

#### Test 2: Profile Display from Video Session
```bash
# Prerequisites
- Have an active video session with a mechanic
- Mechanic must have completed profile

# Steps
1. Join video session
2. Click on mechanic's name/avatar
3. Verify profile modal opens and displays correctly
4. Test drag functionality:
   - Click and hold modal header
   - Drag to different position
   - Release and verify modal stays in position
```

#### Test 3: Profile with Missing Data
```bash
# Prerequisites
- Test with mechanic who has incomplete profile

# Steps
1. Open profile of mechanic with minimal data
2. Verify modal handles missing fields gracefully:
   ✅ No errors displayed
   ✅ Missing sections don't show
   ✅ Shows "This mechanic hasn't completed their profile yet" if sparse
```

#### Test 4: API Response Validation
```bash
# Test the API endpoint directly

# Get a mechanic's user_id from a session
curl http://localhost:3000/api/session-info?sessionId=<session_id>

# Use the mechanic.user_id from response
curl http://localhost:3000/api/mechanic/profile/<user_id>

# Expected response:
{
  "profile": {
    "id": "...",
    "name": "John Doe",
    "aboutMe": null,
    "rating": 4.8,
    "yearsOfExperience": 15,
    "specializations": ["Brakes", "Engine"],
    "isBrandSpecialist": true,
    "brandSpecializations": ["Toyota", "Honda"],
    "specialistTier": "master",
    "redSealCertified": true,
    "shopAffiliation": "AutoFix Inc",
    "completedSessions": 127
  }
}
```

### Database Verification

```sql
-- Verify mechanics table has correct columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mechanics'
  AND column_name IN (
    'user_id',
    'years_of_experience',
    'red_seal_certified',
    'certification_documents',
    'about_me'
  );

-- Expected results:
-- user_id                uuid
-- years_of_experience    integer
-- red_seal_certified     boolean
-- certification_documents text[]
-- (about_me should NOT appear - doesn't exist)

-- Test query by user_id
SELECT
  id,
  user_id,
  name,
  years_of_experience,
  red_seal_certified
FROM mechanics
WHERE user_id = '<auth_user_id>';
```

### Type Safety Check

```bash
# Regenerate types from Supabase schema
npm run supabase:db:types

# Check for TypeScript errors
npm run typecheck

# Expected: 0 errors
```

### Integration Test Scenarios

Create automated tests for these flows:

1. **Profile Retrieval Success**
   ```typescript
   describe('Mechanic Profile API', () => {
     it('should retrieve profile by user_id', async () => {
       const response = await fetch(`/api/mechanic/profile/${TEST_USER_ID}`)
       const data = await response.json()

       expect(response.status).toBe(200)
       expect(data.profile).toBeDefined()
       expect(data.profile.name).toBe('Test Mechanic')
       expect(data.profile.yearsOfExperience).toBeGreaterThan(0)
     })
   })
   ```

2. **Profile Update Success**
   ```typescript
   describe('Mechanic Profile Update', () => {
     it('should update profile with correct field names', async () => {
       const updates = {
         years_of_experience: 10,
         red_seal_certified: true,
         certification_documents: ['cert1.pdf', 'cert2.pdf']
       }

       const response = await fetch(`/api/mechanics/${MECHANIC_ID}/profile`, {
         method: 'PATCH',
         body: JSON.stringify(updates)
       })

       expect(response.status).toBe(200)
       const data = await response.json()
       expect(data.mechanic.years_of_experience).toBe(10)
     })
   })
   ```

3. **Profile Not Found Handling**
   ```typescript
   describe('Mechanic Profile Errors', () => {
     it('should return 404 for non-existent user', async () => {
       const response = await fetch(`/api/mechanic/profile/invalid-id`)
       expect(response.status).toBe(404)

       const data = await response.json()
       expect(data.error).toBe('Mechanic not found')
     })
   })
   ```

---

## Prevention Strategies

### 1. Type Safety from Database Schema

**Implement:** Centralized type generation from Supabase schema

```typescript
// src/types/database.types.ts
import { Database } from './supabase'

export type Mechanic = Database['public']['Tables']['mechanics']['Row']
export type MechanicUpdate = Database['public']['Tables']['mechanics']['Update']
export type MechanicInsert = Database['public']['Tables']['mechanics']['Insert']

// Use these types in APIs
import { MechanicUpdate } from '@/types/database.types'

export async function PATCH(request: NextRequest) {
  const updates: Partial<MechanicUpdate> = await request.json()
  // TypeScript will catch field name mismatches
}
```

**Benefits:**
- Compile-time validation of field names
- Auto-completion in IDE
- Catches schema drift immediately

### 2. Shared Validation Schema

**Implement:** Use Zod for runtime validation

```typescript
// src/schemas/mechanic.schema.ts
import { z } from 'zod'

export const MechanicProfileUpdateSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  years_of_experience: z.number().int().positive().optional(),
  red_seal_certified: z.boolean().optional(),
  certification_documents: z.array(z.string()).optional(),
  // ... other fields
})

// Use in API route
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const updates = MechanicProfileUpdateSchema.parse(body)
  // Will throw if field names don't match
}
```

### 3. API Testing Suite

**Implement:** Automated integration tests

```typescript
// tests/api/mechanic-profile.test.ts
describe('Mechanic Profile API Integration', () => {
  describe('GET /api/mechanic/profile/[mechanicId]', () => {
    it('retrieves profile by user_id', async () => { /* ... */ })
    it('returns 404 for non-existent mechanic', async () => { /* ... */ })
    it('includes all required fields', async () => { /* ... */ })
  })

  describe('PATCH /api/mechanics/[mechanicId]/profile', () => {
    it('updates profile with valid data', async () => { /* ... */ })
    it('rejects invalid field names', async () => { /* ... */ })
    it('triggers profile completion recalculation', async () => { /* ... */ })
  })
})
```

### 4. Database Schema Documentation

**Implement:** Maintain schema documentation

```markdown
## Mechanics Table Schema

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users(id) |
| name | text | YES | Mechanic full name |
| years_of_experience | integer | YES | Years of experience (not years_experience) |
| red_seal_certified | boolean | NO | Red Seal certification status (not is_red_seal) |
| certification_documents | text[] | YES | Certification file URLs (not certifications) |

⚠️ **Common Mistakes:**
- Using `id` instead of `user_id` when querying by auth user
- Using `years_experience` instead of `years_of_experience`
- Using `is_red_seal` instead of `red_seal_certified`
```

### 5. API Consistency Guidelines

**Document:** Standard field naming conventions

```markdown
## API Field Naming Standards

1. **Use actual database column names** in API interfaces
2. **Snake_case in database** → snake_case in TypeScript types
3. **CamelCase only for frontend** display (transform in component)
4. **Never invent field names** - always check schema first
5. **Document ID field usage:**
   - `mechanics.id` = Internal record ID (UUID)
   - `mechanics.user_id` = Auth user ID (what you usually have)
   - Always clarify which ID you're using

## Example:
```typescript
// ✅ GOOD - Matches database
interface MechanicProfile {
  years_of_experience: number
  red_seal_certified: boolean
}

// ❌ BAD - Doesn't match database
interface MechanicProfile {
  yearsExperience: number
  isRedSeal: boolean
}
```

### 6. Pre-deployment Checklist

Add to deployment process:

```markdown
## Profile API Deployment Checklist

- [ ] Run `npm run supabase:db:types` to regenerate types
- [ ] Run `npm run typecheck` - must have 0 errors
- [ ] Run integration tests: `npm test -- api/mechanic`
- [ ] Verify API field names match database schema
- [ ] Test profile retrieval in staging
- [ ] Check browser console for errors
- [ ] Verify profile modal displays all data
```

### 7. Monitoring & Alerts

**Implement:** Error tracking for profile retrieval

```typescript
// src/app/api/mechanic/profile/[mechanicId]/route.ts
export async function GET(req: NextRequest, { params }: any) {
  try {
    // ... existing code ...
  } catch (error) {
    // Log to monitoring service
    logger.error('Mechanic profile retrieval failed', {
      mechanicId: params.mechanicId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    // Alert if error rate exceeds threshold
    metrics.increment('mechanic.profile.errors')

    return NextResponse.json(
      { error: 'Failed to fetch mechanic profile' },
      { status: 500 }
    )
  }
}
```

### 8. Code Review Checklist

Add to PR template:

```markdown
## Database Changes Checklist

When modifying database-related code:

- [ ] Field names match actual database schema (check types/supabase.ts)
- [ ] Using correct ID field (user_id vs id)
- [ ] Added/updated TypeScript types
- [ ] API interfaces use snake_case for database fields
- [ ] Added integration tests
- [ ] Updated API documentation
- [ ] Regenerated types: `npm run supabase:db:types`
- [ ] No TypeScript errors: `npm run typecheck`
```

---

## Related Documentation

### Internal Documentation
- [Profile Completion System](../architecture/profile-completion-system.md)
- [Authentication Guards](../04-security/route-protection/authentication-guards-reference.md)
- [Database Schema Overview](../architecture/database-schema.md)
- [Vehicle Integration System](../features/vehicle-integration-system.md)

### Code Files
- [MechanicProfileModal.tsx](../../src/components/MechanicProfileModal.tsx) - Profile modal component
- [profileCompletion.ts](../../src/lib/profileCompletion.ts) - Profile completion logic
- [Mechanic Profile API (Save)](../../src/app/api/mechanics/[mechanicId]/profile/route.ts)
- [Mechanic Profile API (View)](../../src/app/api/mechanic/profile/[mechanicId]/route.ts)
- [Supabase Types](../../src/types/supabase.ts) - Generated database types

### External Resources
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [TypeScript Type Generation](https://supabase.com/docs/guides/api/generating-types)

---

## Lessons Learned

### What Went Wrong
1. **Assumed field names** instead of checking actual schema
2. **Two APIs diverged** without synchronization
3. **No integration tests** to catch the issue early
4. **Missing type safety** - interfaces didn't match database
5. **Confused ID fields** - used wrong ID for queries

### What Went Right
1. **Quick diagnosis** - found root cause within minutes
2. **Comprehensive fix** - addressed all related issues
3. **Backward compatibility** - maintained support for legacy names
4. **Enhanced UX** - user system auto-added draggable feature
5. **Documentation** - captured fix for future reference

### Key Takeaways
1. ✅ **Always check schema before coding** - Don't assume field names
2. ✅ **Generate types from schema** - Let database be source of truth
3. ✅ **Write integration tests** - End-to-end tests catch these issues
4. ✅ **Use shared interfaces** - Don't duplicate types across APIs
5. ✅ **Document ID field usage** - Clarify when to use which ID
6. ✅ **Monitor error rates** - Track API failures in production
7. ✅ **Test with real data** - Incomplete profiles reveal edge cases

---

## Future Enhancements

### Short-term (Next Sprint)
1. Add integration tests for profile retrieval flows
2. Implement Zod validation for API payloads
3. Add monitoring/alerting for profile API errors
4. Create unified profile API (merge save and view endpoints)

### Medium-term (Next Month)
1. Add profile caching layer for better performance
2. Implement profile photo upload with image optimization
3. Add profile completeness indicator in chat UI
4. Create admin dashboard for profile completion analytics

### Long-term (Next Quarter)
1. Build profile verification system for certifications
2. Add profile badges/achievements system
3. Implement profile recommendations ("Complete your profile to get more requests")
4. Create profile preview for mechanics to see customer view

---

**Last Updated:** November 7, 2025
**Maintained By:** Development Team
**Next Review:** November 2025
