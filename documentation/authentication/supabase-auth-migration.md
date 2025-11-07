# Supabase Auth Migration - Unified Authentication System

**Date Implemented:** October 29, 2025
**Migration Status:** ✅ Completed
**Impact:** All mechanics now use Supabase Auth (no legacy authentication)

---

## Overview

The Auto Doctor platform has migrated from a custom authentication system to Supabase Auth for unified, secure authentication across all user types (mechanics, customers, admins). This document details the migration process, verification steps, and the new authentication architecture.

---

## Problem Statement

### Legacy Authentication System Issues

**Before Migration:**
```javascript
// Old system issues
❌ Custom password hashing with password_hash column
❌ Manual session management via mechanic_sessions table
❌ Cookie-based authentication (aad_mech cookie)
❌ Separate auth logic for each user type
❌ Manual token generation and validation
❌ No built-in email verification
❌ No password reset flows
❌ Difficult to maintain and secure
```

### User Feedback
During testing, the request was made to create a dummy mechanic for end-to-end testing. Upon investigation, it was discovered that:

> "I recently moved all my platform codebase to Supabase Auth, will this user work for that?"

This revealed that the platform had undergone a significant authentication migration that required updating the dummy data creation process.

---

## Root Cause Analysis

### Investigation Process

1. **Reviewed Migration Files:**
   - Found `20251029000004_unify_auth_system.sql` - Added `user_id` to mechanics
   - Found `20251029000011_drop_mechanic_sessions_table.sql` - Dropped legacy table
   - Found `20251029000012_drop_password_hash_column.sql` - Removed legacy column

2. **Checked Database Schema:**
```bash
node scripts/check-mechanics-schema.js
```

**Found:**
- `user_id` column exists in mechanics table ✅
- `password_hash` column is nullable (deprecated) ⚠️
- `mechanic_sessions` table no longer exists ✅

3. **Tested Existing Dummy Mechanic:**
```javascript
// Old mechanic only had:
{
  email: 'workshop.mechanic@test.com',
  password_hash: '$2a$10$...' // Legacy bcrypt hash
  // ❌ No user_id
  // ❌ No auth.users entry
  // ❌ No profiles entry
}
```

**Result:** Would NOT work with new Supabase Auth system

---

## Solution: Unified Auth Architecture

### New Authentication Flow

```
┌─────────────────────────────────────────┐
│ 1. User Login (Email + Password)       │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│ 2. Supabase Auth Validates              │
│    - Checks auth.users table            │
│    - Verifies password (hashed)         │
│    - Generates JWT token                │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│ 3. RLS Policies Check                   │
│    - auth.uid() from JWT token          │
│    - Checks profiles.role               │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│ 4. Access Granted                       │
│    - mechanics table via user_id        │
│    - sessions via mechanic_id           │
└─────────────────────────────────────────┘
```

### Three-Layer Architecture

#### Layer 1: Authentication (`auth.users`)
**Purpose:** Secure credential storage and JWT token generation

```sql
-- Table: auth.users (managed by Supabase)
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  encrypted_password TEXT, -- Supabase managed
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- ... other Supabase Auth fields
);
```

**Managed by Supabase:**
- Password hashing (bcrypt)
- Email verification
- Password reset flows
- Session tokens (JWT)
- Refresh tokens
- Multi-factor authentication (future)

#### Layer 2: Authorization (`profiles`)
**Purpose:** Role-based access control

```sql
-- Table: public.profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('mechanic', 'customer', 'admin')),
  email TEXT NOT NULL,
  full_name TEXT,
  account_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies use profiles.role for authorization
CREATE POLICY "Mechanics can view own profile"
  ON mechanics FOR SELECT
  USING (user_id = auth.uid());
```

#### Layer 3: Data (`mechanics`, `customers`, etc.)
**Purpose:** User-specific data storage

```sql
-- Table: public.mechanics
CREATE TABLE public.mechanics (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE, -- ✅ NEW
  email TEXT,
  name TEXT,
  -- ... mechanic-specific fields
  password_hash TEXT, -- ⚠️ DEPRECATED, nullable
  -- ... other fields
);
```

**Key Changes:**
- Added `user_id` column linking to `auth.users`
- `password_hash` is now nullable (deprecated)
- RLS policies check `user_id = auth.uid()`

---

## Migration Steps Completed

### 1. Add user_id to mechanics Table
**File:** `supabase/migrations/20251029000004_unify_auth_system.sql`

```sql
-- Add user_id column if it doesn't exist
ALTER TABLE public.mechanics
  ADD COLUMN user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make password_hash nullable (deprecated)
ALTER TABLE public.mechanics ALTER COLUMN password_hash DROP NOT NULL;

-- Make email nullable (will come from auth.users)
ALTER TABLE public.mechanics ALTER COLUMN email DROP NOT NULL;
```

### 2. Update RLS Policies
**File:** Same migration

```sql
-- Mechanics can view their own profile
CREATE POLICY "Mechanics can view own profile"
  ON public.mechanics FOR SELECT
  USING (user_id = auth.uid());

-- Mechanics can update their own profile
CREATE POLICY "Mechanics can update own profile"
  ON public.mechanics FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can view all mechanics
CREATE POLICY "Admin can view all mechanics"
  ON public.mechanics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 3. Drop Legacy mechanic_sessions Table
**File:** `supabase/migrations/20251029000011_drop_mechanic_sessions_table.sql`

```sql
-- Archive existing data
CREATE TABLE IF NOT EXISTS mechanic_sessions_archive (
  id UUID PRIMARY KEY,
  mechanic_id UUID,
  token TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- Copy to archive
INSERT INTO mechanic_sessions_archive (id, mechanic_id, token, created_at, expires_at)
SELECT id, mechanic_id, token, created_at, expires_at
FROM mechanic_sessions;

-- Drop table
DROP TABLE IF EXISTS mechanic_sessions CASCADE;
```

### 4. Drop password_hash Column (Optional)
**File:** `supabase/migrations/20251029000012_drop_password_hash_column.sql`

```sql
-- This migration drops the deprecated password_hash column
-- Only run after confirming all mechanics are migrated to Supabase Auth
ALTER TABLE public.mechanics DROP COLUMN IF EXISTS password_hash;
```

**Note:** This may not have been applied yet, as the column still exists but is nullable.

---

## Implementation for Dummy Mechanic

### Script Created
**File:** [scripts/create-dummy-mechanic-supabase-auth.js](../../scripts/create-dummy-mechanic-supabase-auth.js)

### Process Flow

```javascript
// Step 1: Create Supabase Auth User
const { data: authUser, error } = await supabase.auth.admin.createUser({
  email: 'workshop.mechanic@test.com',
  password: '1234',
  email_confirm: true,
  user_metadata: {
    name: 'Alex Thompson',
    role: 'mechanic'
  }
});

// Result:
// ✅ auth.users: id = 8019ea82-9eb3-4df8-b97a-3079d589fe7a
// ✅ Password stored securely in Supabase
// ✅ Email confirmed automatically

// Step 2: Create Profile
await supabase
  .from('profiles')
  .insert({
    id: authUser.id, // Same as auth user
    role: 'mechanic',
    email: 'workshop.mechanic@test.com',
    full_name: 'Alex Thompson',
    account_type: 'mechanic'
  });

// Result:
// ✅ profiles: id = 8019ea82-... (same as auth)
// ✅ role = 'mechanic' (for RLS)

// Step 3: Create/Update Mechanic
await supabase
  .from('mechanics')
  .insert({
    user_id: authUser.id, // ✅ LINKED TO AUTH
    email: 'workshop.mechanic@test.com',
    name: 'Alex Thompson',
    // ... all other mechanic fields
    // ❌ No password_hash needed
  });

// Result:
// ✅ mechanics: user_id = 8019ea82-... (linked)
// ✅ Can access via auth.uid()
```

---

## Verification

### Script Created
**File:** [scripts/verify-supabase-auth-integration.js](../../scripts/verify-supabase-auth-integration.js)

### Verification Checklist

```bash
node scripts/verify-supabase-auth-integration.js
```

**Checks:**
1. ✅ Auth user exists in `auth.users`
2. ✅ Profile exists with `role='mechanic'`
3. ✅ Mechanic has `user_id` linked
4. ✅ `auth.users.id` ←→ `profiles.id` match
5. ✅ `auth.users.id` ←→ `mechanics.user_id` match
6. ✅ Login works with email/password
7. ✅ RLS policies compatible

### Verification Output

```
========================================
VERIFYING SUPABASE AUTH INTEGRATION
========================================

1️⃣  Checking auth.users table...
   ✅ Auth user exists
      ID: 8019ea82-9eb3-4df8-b97a-3079d589fe7a
      Email: workshop.mechanic@test.com
      Email Confirmed: YES

2️⃣  Checking profiles table...
   ✅ Profile exists
      ID: 8019ea82-9eb3-4df8-b97a-3079d589fe7a
      Role: mechanic

3️⃣  Checking mechanics table...
   ✅ Mechanic exists
      Mechanic ID: c62837da-8ff1-4218-afbe-3da2e940dfd7
      User ID: 8019ea82-9eb3-4df8-b97a-3079d589fe7a

4️⃣  Verifying linkages...
   auth.users.id ←→ mechanics.user_id: ✅ LINKED
   auth.users.id ←→ profiles.id: ✅ LINKED

5️⃣  Testing authentication...
   ✅ Login SUCCESSFUL
   ✅ Sign out successful

6️⃣  Checking RLS compatibility...
   ✅ Compatible with requireMechanicAPI: YES

========================================
✅ ALL CHECKS PASSED!
========================================
```

---

## Code Changes Required

### Before: Legacy Auth Middleware

```typescript
// ❌ OLD WAY - Don't use
// Checked mechanic_sessions table and aad_mech cookie

export async function requireMechanicAuth(req: NextRequest) {
  const cookie = req.cookies.get('aad_mech');
  if (!cookie) return null;

  // Check mechanic_sessions table
  const { data: session } = await supabase
    .from('mechanic_sessions')
    .select('mechanic_id')
    .eq('token', cookie.value)
    .single();

  return session?.mechanic_id;
}
```

### After: Supabase Auth Middleware

```typescript
// ✅ NEW WAY - Use this
// Checks Supabase Auth JWT token

import { createClient } from '@/lib/supabase/server';

export async function requireMechanicAPI(req: NextRequest) {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check profile role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'mechanic') {
    return NextResponse.json(
      { error: 'Forbidden - Not a mechanic' },
      { status: 403 }
    );
  }

  // Get mechanic record
  const { data: mechanic } = await supabase
    .from('mechanics')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return mechanic;
}
```

**File Location:** [src/lib/middleware/requireMechanicAPI.ts](../../src/lib/middleware/requireMechanicAPI.ts)

---

## Benefits of Supabase Auth

### Security
- ✅ Industry-standard password hashing (bcrypt)
- ✅ JWT tokens (stateless, secure)
- ✅ Built-in rate limiting
- ✅ Automatic token rotation
- ✅ XSS and CSRF protection
- ✅ Secure password reset flows

### Developer Experience
- ✅ No custom session management
- ✅ Built-in email verification
- ✅ Password reset out-of-the-box
- ✅ OAuth providers ready (Google, GitHub, etc.)
- ✅ Admin API for user management
- ✅ Comprehensive documentation

### Performance
- ✅ No database queries for session validation (JWT)
- ✅ Token-based auth (scalable)
- ✅ Built-in caching
- ✅ Edge-ready (works with CDN)

### Maintenance
- ✅ Managed by Supabase (automatic updates)
- ✅ No security patches needed
- ✅ Built-in monitoring and logs
- ✅ Unified auth for all user types

---

## Breaking Changes

### API Routes
**Before:**
```typescript
// Checked aad_mech cookie
const mechanicId = req.cookies.get('aad_mech')?.value;
```

**After:**
```typescript
// Use auth.uid() via Supabase
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
const mechanicId = user?.id;
```

### RLS Policies
**Before:**
```sql
-- Old policies might have checked mechanic_sessions
-- or used custom auth logic
```

**After:**
```sql
-- All policies now use auth.uid()
CREATE POLICY "policy_name"
  ON table_name
  USING (user_id = auth.uid());
```

### Frontend Login
**Before:**
```typescript
// Custom login API
const res = await fetch('/api/mechanic/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
// Set custom cookie
```

**After:**
```typescript
// Use Supabase Auth client
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});
// JWT token set automatically
```

---

## Testing

### Manual Testing

```bash
# 1. Login test
curl -X POST http://localhost:3000/mechanic/login \
  -H "Content-Type: application/json" \
  -d '{"email": "workshop.mechanic@test.com", "password": "1234"}'

# Expected: JWT token in response

# 2. Authenticated request
curl http://localhost:3000/api/mechanic/profile \
  -H "Authorization: Bearer <jwt_token>"

# Expected: Mechanic profile data

# 3. RLS policy test
# Should only see own data
curl http://localhost:3000/api/sessions \
  -H "Authorization: Bearer <jwt_token>"

# Expected: Only sessions for authenticated mechanic
```

### Automated Testing

**File:** Create test file for auth flow

```typescript
// tests/auth/supabase-auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Supabase Auth Integration', () => {
  test('mechanic can login with Supabase Auth', async ({ page }) => {
    await page.goto('/mechanic/login');

    await page.fill('input[name="email"]', 'workshop.mechanic@test.com');
    await page.fill('input[name="password"]', '1234');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/mechanic/dashboard');
  });

  test('RLS policies protect mechanic data', async ({ page }) => {
    // Login as mechanic
    await loginAsMechanic(page);

    // Try to access another mechanic's profile
    const response = await page.request.get('/api/mechanics/other-mechanic-id');

    expect(response.status()).toBe(403);
  });
});
```

---

## Migration Checklist for Existing Mechanics

If migrating existing mechanics from legacy auth:

```sql
-- For each existing mechanic:

-- 1. Create Supabase Auth user
-- (Use Supabase Admin API)

-- 2. Create profile
INSERT INTO profiles (id, role, email, full_name)
VALUES (
  '<auth_user_id>',
  'mechanic',
  '<mechanic_email>',
  '<mechanic_name>'
);

-- 3. Link mechanic to auth user
UPDATE mechanics
SET user_id = '<auth_user_id>'
WHERE email = '<mechanic_email>';

-- 4. Verify linkage
SELECT
  m.id as mechanic_id,
  m.user_id,
  m.email,
  p.role,
  u.email as auth_email
FROM mechanics m
JOIN profiles p ON m.user_id = p.id
JOIN auth.users u ON m.user_id = u.id
WHERE m.email = '<mechanic_email>';
```

---

## Rollback Plan

If issues arise with Supabase Auth:

### 1. Restore mechanic_sessions Table
```sql
-- Restore from archive
CREATE TABLE mechanic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Restore data
INSERT INTO mechanic_sessions (id, mechanic_id, token, created_at, expires_at)
SELECT id, mechanic_id, token, created_at, expires_at
FROM mechanic_sessions_archive;
```

### 2. Revert RLS Policies
```sql
-- Drop Supabase Auth policies
DROP POLICY "Mechanics can view own profile" ON mechanics;

-- Restore old policies (if backed up)
```

### 3. Re-enable password_hash
```sql
-- If column was dropped, re-add it
ALTER TABLE mechanics ADD COLUMN password_hash TEXT;

-- Restore from backup
```

**Note:** Rollback should be avoided. Supabase Auth is more secure and maintainable.

---

## Related Documentation

- [Dummy Mechanic Setup](../testing/dummy-mechanic-setup.md)
- [Profile Completion System](../features/profile-completion-system.md)
- [Test Scripts Reference](../development/test-scripts-reference.md)
- [RLS Policies Documentation](./rls-policies.md) *(if exists)*

---

## External Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [JWT.io - Token Debugger](https://jwt.io/)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

---

**Last Updated:** November 7, 2025
**Migration Status:** ✅ Complete
**Production Ready:** ✅ Yes
