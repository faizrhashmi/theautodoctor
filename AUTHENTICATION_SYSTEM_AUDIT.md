# AUTHENTICATION SYSTEM AUDIT

**Date:** 2025-10-27
**Status:** Analysis Complete
**Issue:** Multiple Authentication Systems Causing Confusion

---

## Executive Summary

Your website currently uses **4 DIFFERENT AUTHENTICATION SYSTEMS**, which is causing confusion and potential security issues. This document explains each system, why they exist, and recommendations for improvement.

---

## Current Authentication Systems

### 1. **Customer Authentication (Supabase Auth)**

**Used By:** Regular customers
**Location:** `/api/customer/*`
**Login:** Via Supabase built-in auth
**Storage:** `auth.users` table + `profiles` table
**Cookie:** Supabase session cookie

**How It Works:**
```typescript
// Uses Supabase's built-in authentication
import { createClient } from '@supabase/supabase-js'

// Login automatically handled by Supabase
await supabase.auth.signInWithPassword({
  email,
  password
})

// Session stored in Supabase cookie
// User data in auth.users + profiles table
```

**Tables:**
- `auth.users` (managed by Supabase)
- `profiles` (custom table with role, full_name, etc.)

---

### 2. **Mechanic Authentication (Custom Token System)**

**Used By:** Independent mechanics
**Location:** `/api/mechanics/login`
**Login:** Custom password hash verification
**Storage:** `mechanics` table + `mechanic_sessions` table
**Cookie:** `aad_mech` (custom cookie)

**How It Works:**
```typescript
// Custom authentication from src/lib/auth.ts
import { verifyPassword, makeSessionToken } from '@/lib/auth'

// 1. Look up mechanic in mechanics table
const { data: mech } = await supabaseAdmin
  .from('mechanics')
  .select('id, password_hash')
  .eq('email', email)
  .maybeSingle()

// 2. Verify password using scrypt
const ok = verifyPassword(password, mech.password_hash)

// 3. Create custom session token
const token = makeSessionToken()
await supabaseAdmin.from('mechanic_sessions').insert({
  mechanic_id: mech.id,
  token,
  expires_at: new Date(Date.now() + 30 days)
})

// 4. Set custom cookie
res.cookies.set('aad_mech', token, { httpOnly: true })
```

**Tables:**
- `mechanics` (id, email, password_hash, account_type)
- `mechanic_sessions` (mechanic_id, token, expires_at)

**Why Custom?**
- Mechanics are separate from regular users
- Need different permissions and features
- Independent session management

---

### 3. **Workshop Authentication (Custom Token System)**

**Used By:** Workshop organizations
**Location:** `/api/workshop/login`
**Login:** Custom password hash verification
**Storage:** `organizations` table + unknown session storage
**Cookie:** Likely custom (need to verify)

**How It Works:**
Similar to mechanic auth but for workshops. Workshops can have multiple members.

**Tables:**
- `organizations` (workshop details)
- `organization_members` (who belongs to which workshop)
- Workshop session storage (TBD)

---

### 4. **Admin Authentication (Supabase Auth + Role Check)**

**Used By:** Platform administrators
**Location:** `/api/admin/login`
**Login:** Supabase auth + role verification
**Storage:** `auth.users` + `profiles.role = 'admin'`
**Cookie:** Supabase session cookie

**How It Works:**
```typescript
// src/lib/auth.ts
export async function ensureAdmin() {
  const supabase = getSupabaseServer()

  // 1. Check Supabase auth
  const { data: { user }, error } = await supabase.auth.getUser()

  // 2. Verify role = 'admin' in profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile.role !== 'admin') {
    return { ok: false, status: 403 }
  }

  return { ok: true, user }
}
```

**Tables:**
- `auth.users` (Supabase)
- `profiles` (role = 'admin')

---

## Why Multiple Systems?

### Historical Reasons:

1. **Started with Supabase Auth** for customers
2. **Added Custom Mechanic Auth** because:
   - Mechanics needed different permissions
   - Wanted separate database table
   - Different onboarding flow
3. **Added Workshop Auth** for business accounts
4. **Reused Supabase Auth** for admins with role check

### Technical Reasons:

- **Separation of Concerns:** Customers, mechanics, and workshops have different data models
- **Different Session Lifecycles:** Mechanics might need longer sessions
- **Custom Business Logic:** Each type has unique authentication flow

---

## Problems with Current System

### 1. **Complexity**
- 4 different authentication flows
- Developers must remember which system to use
- Easy to make mistakes

### 2. **Password Issues** ⚠️
Your current issue: **mechanic passwords not working**

**Root Cause:**
```typescript
// src/lib/auth.ts uses scrypt for password hashing
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${salt}:${derived}`  // Format: "salt:hash"
}
```

**The password "12345678" doesn't match** because:
1. Either the password was hashed with a different value
2. Or the password was never set properly during signup
3. Or there's a bug in the verification logic

### 3. **Inconsistent Security**
- Supabase auth uses industry-standard security
- Custom auth uses scrypt (good) but manually implemented
- Different session expiry times
- Different cookie security settings

### 4. **Maintenance Overhead**
- Must maintain custom auth code
- Two separate session systems
- More attack surface

---

## Current Database Schema

### Authentication-Related Tables:

```sql
-- Supabase managed (customers + admins)
auth.users (
  id UUID PRIMARY KEY,
  email TEXT,
  encrypted_password TEXT,
  -- managed by Supabase
)

-- Customer/Admin profiles
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT, -- 'customer' or 'admin'
  full_name TEXT,
  -- ...
)

-- Mechanic custom auth
mechanics (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,  -- custom scrypt hash
  account_type TEXT,   -- 'independent' or 'workshop'
  -- ...
)

-- Mechanic sessions
mechanic_sessions (
  id UUID PRIMARY KEY,
  mechanic_id UUID REFERENCES mechanics(id),
  token TEXT UNIQUE,
  expires_at TIMESTAMP
)

-- Workshop organizations
organizations (
  id UUID PRIMARY KEY,
  name TEXT,
  -- likely has password_hash
)

-- Workshop members
organization_members (
  organization_id UUID REFERENCES organizations(id),
  user_id UUID, -- could reference auth.users OR mechanics
  role TEXT,
  -- ...
)
```

---

## Fixing Your Immediate Issue

### Problem: mech1@test.com / mech2@test.com login failing

**Issue 1:** `mech1@test.com` doesn't exist
- Only `mech@test.com` exists (without the "1")

**Issue 2:** Password "12345678" doesn't match hash
- The password hash in database doesn't match "12345678"

**Solution:**

```javascript
// Create script to reset mechanic password
import { hashPassword } from '@/lib/auth'

const newPassword = '12345678'
const hash = hashPassword(newPassword)

await supabaseAdmin
  .from('mechanics')
  .update({ password_hash: hash })
  .eq('email', 'mech@test.com')
```

---

## Recommendations

### Short-Term (Immediate Fixes)

#### 1. Fix Mechanic Passwords
Create password reset utility:

```typescript
// reset-mechanic-password.mjs
import { hashPassword } from './src/lib/auth.ts'

async function resetMechanicPassword(email, newPassword) {
  const hash = hashPassword(newPassword)

  const { error } = await supabaseAdmin
    .from('mechanics')
    .update({ password_hash: hash })
    .eq('email', email)

  if (error) {
    console.error('Failed:', error.message)
  } else {
    console.log(`✅ Password reset for ${email}`)
  }
}

// Reset your test accounts
await resetMechanicPassword('mech@test.com', '12345678')
await resetMechanicPassword('mech2@test.com', '12345678')
await resetMechanicPassword('mech3@test.com', '12345678')
await resetMechanicPassword('mech4@test.com', '12345678')
```

#### 2. Document Each Auth System
Create clear docs for developers on which auth to use when

#### 3. Add Auth Type to Login Pages
Make it clear which auth system each login page uses

### Mid-Term (Next Quarter)

#### 1. Consolidate to 2 Systems
- **Option A:** Migrate mechanics to Supabase auth with custom roles
- **Option B:** Keep custom mechanic auth but improve it

#### 2. Implement Single Sign-On (SSO)
- Allow mechanics to also have customer accounts
- Link accounts across systems

#### 3. Standardize Session Management
- Same cookie names
- Same expiry times
- Same security settings

### Long-Term (Ideal State)

#### Unified Authentication System
```typescript
// Everyone uses Supabase auth
auth.users (
  id UUID,
  email TEXT,
  encrypted_password TEXT
)

profiles (
  id UUID REFERENCES auth.users(id),
  role TEXT, -- 'customer', 'mechanic', 'workshop', 'admin'
  account_type TEXT, -- for mechanics: 'independent', 'workshop'
  organization_id UUID, -- for workshop members
  -- ...
)

// Benefits:
// - One auth system to maintain
// - Industry-standard security
// - Built-in features (password reset, email verification, etc.)
// - Supabase handles the hard stuff
```

---

## Security Considerations

### Current Issues:

1. **Custom Password Hashing**
   - Your scrypt implementation is good
   - But Supabase's is better (bcrypt with proper salt rounds)

2. **Session Storage**
   - Custom sessions in `mechanic_sessions` table
   - No automatic cleanup of expired sessions
   - Potential for session hijacking

3. **Cookie Security**
   - Custom cookies may not have proper security flags
   - Supabase cookies are more secure

### Recommendations:

1. **Audit Custom Auth Code**
   - Review `src/lib/auth.ts`
   - Add tests for password verification
   - Implement proper session cleanup

2. **Add Rate Limiting**
   - Prevent brute force attacks
   - Current system has no rate limiting

3. **Add 2FA (Two-Factor Authentication)**
   - Critical for mechanics and admins
   - Supabase supports this natively

---

## Migration Plan (If You Want to Consolidate)

### Phase 1: Analysis (1 week)
- Audit all authentication code
- Document dependencies
- Identify breaking changes

### Phase 2: Mechanic Migration (2 weeks)
- Migrate mechanics table to auth.users
- Update all mechanic endpoints
- Test thoroughly

### Phase 3: Workshop Migration (2 weeks)
- Migrate workshops to unified system
- Update organization permissions
- Test multi-tenant features

### Phase 4: Cleanup (1 week)
- Remove custom auth code
- Delete mechanic_sessions table
- Update documentation

**Total Time:** ~6 weeks
**Risk:** Medium (requires careful testing)

---

## Immediate Action Items

### For You:
1. ✅ Use `mech@test.com` instead of `mech1@test.com`
2. ⚠️ Reset mechanic passwords (I'll create script)
3. 📖 Document which auth system to use for each role

### For Development Team:
1. Review this document
2. Decide: Keep 4 systems or consolidate?
3. If consolidate: Follow migration plan
4. If keep: Improve documentation and testing

---

## Testing Auth Systems

### Test Each System:

```bash
# 1. Test Customer Auth (Supabase)
curl -X POST http://localhost:3000/api/customer/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "customer@test.com", "password": "password123"}'

# 2. Test Mechanic Auth (Custom)
curl -X POST http://localhost:3000/api/mechanics/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "mech@test.com", "password": "12345678"}'

# 3. Test Workshop Auth (Custom)
curl -X POST http://localhost:3000/api/workshop/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "workshop@test.com", "password": "password123"}'

# 4. Test Admin Auth (Supabase + Role)
curl -X POST http://localhost:3000/api/admin/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "admin@test.com", "password": "password123"}'
```

---

## Conclusion

You have **4 different authentication systems** because:
1. Different user types (customers, mechanics, workshops, admins)
2. Historical development decisions
3. Different technical requirements

**Your immediate issue:**
- `mech1@test.com` doesn't exist (use `mech@test.com`)
- Password doesn't match (needs to be reset)

**Long-term recommendation:**
- Consider consolidating to 2 systems (Supabase auth + custom if needed)
- Or fully migrate to Supabase auth with role-based access

---

**Next Steps:**
1. I'll create a password reset script for you
2. You decide: keep 4 systems or consolidate
3. If consolidate: I can help with migration plan

**Document Version:** 1.0
**Last Updated:** 2025-10-27
