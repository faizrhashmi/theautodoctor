# Mechanic Profile Retrieval Fix

## Problem Identified

When customers clicked on a mechanic's name in chat/video sessions to view their profile, no information was displayed. This was caused by **inconsistent database field names** across different API endpoints.

## Root Cause

There were **TWO different API routes** using **different field names** for the same database columns:

### API Route 1: `/api/mechanics/[mechanicId]/profile` (Used for SAVING)
**OLD - INCORRECT Field Names:**
- `bio` ❌
- `years_experience` ❌
- `is_red_seal` ❌

### API Route 2: `/api/mechanic/profile/[mechanicId]` (Used for VIEWING)
**CORRECT Field Names:**
- `about_me` ✅
- `years_of_experience` ✅
- `red_seal_certified` ✅

### The Issue
1. Mechanic edits profile → Saves using incorrect field names → Data goes to wrong columns
2. Customer clicks profile in session → Queries correct field names → Finds no data

## Files Fixed

### 1. [src/app/api/mechanics/[mechanicId]/profile/route.ts](src/app/api/mechanics/[mechanicId]/profile/route.ts)

**Changed:**
- ✅ Updated `ProfileUpdateData` interface to use correct field names
- ✅ Updated GET query to fetch correct columns
- ✅ Updated allowed fields list for PATCH operations
- ✅ Added missing fields: `red_seal_number`, `red_seal_province`, `red_seal_expiry_date`, `shop_affiliation`, `rating`, `completed_sessions`

**Before:**
```typescript
interface ProfileUpdateData {
  bio?: string
  years_experience?: number
  is_red_seal?: boolean
}
```

**After:**
```typescript
interface ProfileUpdateData {
  about_me?: string
  years_of_experience?: number
  red_seal_certified?: boolean
  red_seal_number?: string
  red_seal_province?: string
  red_seal_expiry_date?: string
  shop_affiliation?: string
}
```

### 2. [src/lib/profileCompletion.ts](src/lib/profileCompletion.ts)

**Changed:**
- ✅ Added backward compatibility for `years_experience` field check
- ✅ Now supports both `years_of_experience` and `years_experience`

**Before:**
```typescript
case 'years_experience':
  return typeof mechanic.years_experience === 'number' && mechanic.years_experience > 0
```

**After:**
```typescript
case 'years_experience':
case 'years_of_experience':  // Support both field names
  const yearsExp = mechanic.years_of_experience || mechanic.years_experience
  return typeof yearsExp === 'number' && yearsExp > 0
```

## Database Schema (Correct Column Names)

The `mechanics` table has these columns:
```sql
- about_me TEXT
- years_of_experience INTEGER
- red_seal_certified BOOLEAN
- red_seal_number TEXT
- red_seal_province TEXT
- red_seal_expiry_date DATE
- shop_affiliation TEXT
- rating DECIMAL
- completed_sessions INTEGER
- specializations TEXT[]
- brand_specializations TEXT[]
- service_keywords TEXT[]
```

## Testing Instructions

### Test 1: Save Mechanic Profile
1. Login as a mechanic at `/mechanic/login`
2. Navigate to `/mechanic/profile`
3. Fill out the profile form:
   - ✅ Name
   - ✅ Phone
   - ✅ About Me (bio)
   - ✅ Years of Experience
   - ✅ Red Seal Certified checkbox
   - ✅ Shop Affiliation
   - ✅ Specializations
4. Click "Save"
5. **Verify in database:**
```sql
SELECT
  id,
  name,
  about_me,
  years_of_experience,
  red_seal_certified,
  shop_affiliation
FROM mechanics
WHERE email = 'mechanic@example.com';
```

### Test 2: View Mechanic Profile in Session
1. Login as a customer
2. Start a chat or video session with a mechanic
3. Click on the mechanic's name in the header
4. **Expected Result:**
   - ✅ Modal opens
   - ✅ Shows mechanic's name
   - ✅ Shows rating and experience
   - ✅ Shows "About Me" section
   - ✅ Shows specializations
   - ✅ Shows Red Seal badge (if certified)
   - ✅ Shows completed sessions count

### Test 3: Verify API Response
```bash
# Test the customer-facing profile endpoint
curl -X GET 'https://your-app.com/api/mechanic/profile/MECHANIC_ID' \
  -H 'Cookie: your-session-cookie'
```

**Expected Response:**
```json
{
  "profile": {
    "id": "...",
    "name": "John Doe",
    "aboutMe": "Experienced mechanic...",
    "rating": 4.8,
    "yearsOfExperience": 10,
    "specializations": ["Brakes", "Engine"],
    "isBrandSpecialist": true,
    "brandSpecializations": ["Honda", "Toyota"],
    "redSealCertified": true,
    "shopAffiliation": "ABC Motors",
    "completedSessions": 145
  }
}
```

## Impact

### Before Fix
- ❌ Mechanic profiles appeared empty to customers
- ❌ Data was saved to non-existent columns
- ❌ Profile completion calculations failed
- ❌ Customers couldn't see mechanic credentials

### After Fix
- ✅ Mechanic profiles display correctly
- ✅ Data saves to proper database columns
- ✅ Profile completion works correctly
- ✅ Customers can see mechanic credentials and expertise
- ✅ Better trust and transparency in the platform

## Related Components

These components display mechanic profiles and should now work correctly:

1. **[src/components/MechanicProfileModal.tsx](src/components/MechanicProfileModal.tsx)**
   - Displays profile in chat/video sessions
   - Shows rating, experience, certifications
   - Shows brand specializations

2. **[src/app/chat/[id]/ChatRoomV3.tsx](src/app/chat/[id]/ChatRoomV3.tsx)**
   - Chat room with clickable mechanic name
   - Opens profile modal

3. **[src/app/video/[id]/VideoSessionClient.tsx](src/app/video/[id]/VideoSessionClient.tsx)**
   - Video session with mechanic profile access

## Notes

- All changes are **backward compatible**
- No database migration required (columns already exist with correct names)
- Profile completion system now supports both old and new field names
- Existing mechanics will need to re-save their profiles to populate the correct fields

## Recommended: Data Cleanup Script

If you have existing mechanics with data in wrong fields, run this cleanup:

```sql
-- Check for mechanics with data in old fields (if any exist)
SELECT
  id,
  name,
  CASE
    WHEN about_me IS NULL OR about_me = '' THEN 'Missing about_me'
    ELSE 'Has about_me'
  END as about_status,
  CASE
    WHEN years_of_experience IS NULL OR years_of_experience = 0 THEN 'Missing years'
    ELSE 'Has years: ' || years_of_experience
  END as years_status
FROM mechanics
WHERE email IS NOT NULL;

-- Note: No old columns exist to migrate from since the field names
-- were just mismatched in the API, not in the database
```

---

**Status:** ✅ FIXED
**Date:** October 28, 2025
**Priority:** HIGH - Critical for customer trust and platform functionality
