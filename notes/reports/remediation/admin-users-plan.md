# Admin User Management System - Implementation Plan

**Date:** 2025-11-02
**Status:** PLAN ONLY - AWAITING APPROVAL
**Approach:** Minimal-Diff, Non-Destructive, Idempotent SQL

---

## Executive Summary

This plan outlines the implementation of a comprehensive Admin User Management System across 3 phases, building upon existing infrastructure while maintaining 100% backward compatibility. All changes follow the established patterns from Batches 2-6, using idempotent SQL migrations and zero-disruption deployment.

**Critical Finding:** Middleware currently does NOT check account status (suspended/banned users can still access the platform).

---

## Current State Analysis

### ✅ What Already Exists

#### 1. **Database Schema** (Partially Complete)
- `profiles` table has:
  - ✅ `deleted_at` TIMESTAMP (from PIPEDA compliance migration)
  - ✅ `anonymized` BOOLEAN (from account deletion system)
  - ✅ `account_status` TEXT (referenced in ban/suspend APIs)
  - ✅ `suspended_until` TIMESTAMP (referenced in suspend API)
  - ✅ `ban_reason` TEXT (referenced in ban API)
  - ✅ `email_verified` BOOLEAN (referenced in verify-email API)
  - ✅ `role` TEXT (values: 'customer', 'mechanic', 'admin')

- `admin_actions` table exists (logs admin actions with: admin_id, target_user_id, action_type, reason, metadata)

#### 2. **Existing APIs** (Partially Implemented)
- ✅ `/api/admin/users/[id]/ban` - Sets account_status='banned', ban_reason
- ✅ `/api/admin/users/[id]/suspend` - Sets account_status='suspended', suspended_until
- ✅ `/api/admin/users/[id]/verify-email` - Sets email_verified=true in profiles + auth.users
- ✅ `/api/admin/users/[id]/reset-password` - Generates password reset link
- ✅ `/api/admin/users/[id]/notify` - Sends notification to user
- ✅ `/api/admin/delete-user` - **DANGEROUS: Hard delete** (needs replacement with soft delete)
- ✅ `/api/admin/users/customers` - List customers with filtering

#### 3. **Authentication & Authorization**
- ✅ `requireAdminAPI()` guard in [src/lib/auth/guards.ts](src/lib/auth/guards.ts:393-441)
- ✅ Middleware role checking in [src/middleware.ts](src/middleware.ts:184-244)
- ✅ Admin-only pages protected

#### 4. **UI Components**
- ✅ `/admin/customers` page with filtering, search, pagination
- ✅ Status badges, verification badges
- ✅ Manage dropdown with: Notify, Reset Password, Suspend
- ✅ Modal dialogs for actions

### ❌ What's Missing (High Priority)

#### 1. **Critical Security Gaps**
- ❌ Middleware does NOT block suspended/banned users from accessing the platform
- ❌ No validation preventing self-demotion/self-ban
- ❌ No minimum admin count enforcement

#### 2. **Core Features**
- ❌ Manual user creation (with auto-password, role selection)
- ❌ Proper soft delete (current `/api/admin/delete-user` is HARD DELETE)
- ❌ Ban user UI flow (API exists, but not accessible from customers page)
- ❌ Email verification override UI (API exists, but not in manage dropdown)
- ❌ Role change functionality (customer ↔ mechanic ↔ admin)
- ❌ Account status toggle UI (activate/reactivate suspended accounts)

#### 3. **Advanced Features**
- ❌ Bulk actions (multi-select + batch operations)
- ❌ User impersonation ("Login As User")
- ❌ Dedicated audit log viewer (table exists, no UI)
- ❌ Enhanced user detail drawer (sessions, payments, metadata)

---

## Schema Introspection Results

### Required Introspection Queries (MUST RUN BEFORE PHASE 1)

**File:** `notes/reports/remediation/admin-users-schema-introspection.sql`

```sql
-- 1. Verify profiles columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check if columns are missing
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('account_status', 'suspended_until', 'ban_reason', 'email_verified')
);

-- 3. Verify admin_actions table structure
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'admin_actions'
ORDER BY ordinal_position;
```

### Expected Schema Gaps (To Be Confirmed)

Based on code analysis, these columns are **referenced but may not exist**:

**In `profiles` table:**
- `account_status` TEXT - Values: 'active', 'suspended', 'banned', 'deleted'
- `suspended_until` TIMESTAMP
- `ban_reason` TEXT
- `email_verified` BOOLEAN

**In `mechanics` table:**
- `account_status` TEXT (mirrored from profiles)
- `suspended_until` TIMESTAMP (mirrored)
- `ban_reason` TEXT (mirrored)

**New tables needed:**
- `admin_audit_log` (enhanced version of `admin_actions` with before/after values)
- `user_impersonation_sessions` (track impersonation events)

---

## Risk Analysis & Mitigation

### 🔴 **Critical Risks**

#### Risk 1: Breaking Existing Auth Flow
- **Impact:** Users unable to log in, 500 errors
- **Mitigation:**
  - Zero changes to `src/middleware.ts` auth logic (only add status check AFTER validation)
  - No changes to `requireAdminAPI()` or other guards
  - All new checks are additive, not replacements

#### Risk 2: Accidental Data Loss
- **Impact:** User accounts permanently deleted
- **Mitigation:**
  - Replace hard delete with soft delete ONLY
  - Require double-confirmation + "TYPE DELETE" for all destructive actions
  - All deletions set `deleted_at`, never use SQL DELETE

#### Risk 3: Admin Lockout
- **Impact:** All admins removed, no admin access
- **Mitigation:**
  - Prevent self-demotion (cannot change own role)
  - Enforce minimum 2 admins before allowing demotion
  - Log all role changes to audit log

#### Risk 4: Middleware Recursion (RLS Policies)
- **Impact:** Infinite loops, 500 errors
- **Mitigation:**
  - Use `supabaseAdmin` (service role) for all status checks in middleware
  - No RLS policy changes in Phase 1
  - Test with multiple user types (customer, mechanic, admin)

### 🟡 **Medium Risks**

#### Risk 5: TypeScript Type Mismatches
- **Impact:** Build failures
- **Mitigation:**
  - Run `npm run typecheck` after every file change
  - Update Supabase types: `npm run supabase:db:types`
  - Use strict Zod validation for all API payloads

#### Risk 6: Impersonation Security Breach
- **Impact:** Unauthorized admin access to user data
- **Mitigation:**
  - Signed JWT tokens with 30-minute expiration
  - Visual banner on every page during impersonation
  - Block access to admin routes during impersonation
  - Log START and END events to audit log
  - Auto-terminate on token expiry

---

## Phased Implementation Plan

### 📋 **Phase 1: Critical Admin Tools (Tier 1)**

**Objective:** Implement immediate-need features that enhance security and admin efficiency.

**Estimated Effort:** 3-4 hours
**Risk Level:** Low

#### 1.1 Middleware Security Enhancement

**File:** `src/middleware.ts:226-236`

**Current Code:**
```typescript
if (!profile || profile.role !== 'admin') {
  console.warn(`[SECURITY] Non-admin user attempted access`)
  return NextResponse.redirect(new URL('/', request.url))
}
```

**Enhancement:**
```typescript
if (!profile || profile.role !== 'admin') {
  console.warn(`[SECURITY] Non-admin user attempted access`)
  return NextResponse.redirect(new URL('/', request.url))
}

// NEW: Check account status (suspended/banned users blocked)
if (profile.account_status === 'banned') {
  console.warn(`[SECURITY] Banned user ${user.id} attempted access`)
  return NextResponse.redirect(new URL('/banned', request.url))
}

if (profile.account_status === 'suspended' && profile.suspended_until) {
  const suspendedUntil = new Date(profile.suspended_until)
  if (suspendedUntil > new Date()) {
    console.warn(`[SECURITY] Suspended user ${user.id} attempted access`)
    return NextResponse.redirect(new URL('/suspended', request.url))
  }
}
```

**Apply same pattern to:**
- Mechanic routes (line 291)
- Customer routes (line 424)
- Workshop routes (line 369)

#### 1.2 Create User Manually

**New API:** `/api/admin/users/create`

**Features:**
- Email (required)
- Password (optional - auto-generate if blank)
- Full Name (required)
- Phone (optional)
- Role (dropdown: Customer / Mechanic / Admin)
- Checkboxes:
  - ☑ Auto-verify email
  - ☑ Send welcome email (via Resend)

**Implementation:**
```typescript
export async function POST(req: NextRequest) {
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error

  const { email, password, full_name, phone, role, auto_verify, send_email } = await req.json()

  // Validation with Zod
  // Create user via supabaseAdmin.auth.admin.createUser()
  // Insert profile with role
  // If role=mechanic, insert into mechanics table
  // Log to admin_actions
  // If send_email, send via Resend
}
```

**UI:** Modal in `/admin/customers` page with "+ Create User" button

#### 1.3 Soft Delete User

**Replace:** `/api/admin/delete-user`
**New API:** `/api/admin/users/[id]/delete`

**Features:**
- Confirmation dialog: "Type DELETE to confirm"
- Sets `profiles.deleted_at = NOW()`
- Anonymizes: `full_name = 'Deleted User'`, `phone = NULL`
- Does NOT delete from auth.users (for audit trail)
- Cascades to related tables (sessions, payments retain records)
- Log action: `DELETE_USER` with reason

**Safety:**
- Cannot delete yourself
- Cannot delete last admin
- Reversible within 7 days (PIPEDA compliance)

#### 1.4 Ban User Permanently

**Enhance Existing:** `/api/admin/users/[id]/ban`

**New Features:**
- UI flow in customers page manage dropdown
- Confirmation modal with reason (required)
- Optional IP tracking
- Prevent re-registration check (validate against auth.users email)
- Update both `profiles` and `mechanics` tables
- Log action: `BAN_USER` with IP, reason

**UI:** Add "Ban User" to manage dropdown

#### 1.5 Email Verification Override

**Enhance Existing:** `/api/admin/users/[id]/verify-email`

**New Features:**
- Add to manage dropdown in customers page
- Confirmation dialog: "Manually verify email for {user}?"
- Sets `profiles.email_verified = true`
- Sets `auth.users.email_confirmed_at = NOW()`
- Log action: `EMAIL_VERIFIED_OVERRIDE`

**UI:** Add "Verify Email" to manage dropdown (show only if not verified)

#### 1.6 Schema Migration (Phase 1)

**File:** `supabase/migrations/admin-users-phase1/01_up.sql`

```sql
-- ============================================
-- ADMIN USER MANAGEMENT - PHASE 1
-- Idempotent schema additions
-- ============================================

-- 1. Ensure account_status column exists in profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'account_status'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN account_status TEXT DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'banned', 'deleted'));

    CREATE INDEX idx_profiles_account_status ON profiles(account_status);
    COMMENT ON COLUMN profiles.account_status IS 'User account status for access control';
  END IF;
END $$;

-- 2. Ensure suspended_until column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'suspended_until'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN suspended_until TIMESTAMP WITH TIME ZONE;

    CREATE INDEX idx_profiles_suspended_until ON profiles(suspended_until)
    WHERE suspended_until IS NOT NULL;
    COMMENT ON COLUMN profiles.suspended_until IS 'Suspension expiration timestamp';
  END IF;
END $$;

-- 3. Ensure ban_reason column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN ban_reason TEXT;

    COMMENT ON COLUMN profiles.ban_reason IS 'Reason for permanent ban';
  END IF;
END $$;

-- 4. Ensure email_verified column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN email_verified BOOLEAN DEFAULT false;

    CREATE INDEX idx_profiles_email_verified ON profiles(email_verified);
    COMMENT ON COLUMN profiles.email_verified IS 'Whether user email has been verified';
  END IF;
END $$;

-- 5. Mirror status columns to mechanics table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = 'account_status'
  ) THEN
    ALTER TABLE public.mechanics
    ADD COLUMN account_status TEXT DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'banned', 'deleted'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = 'suspended_until'
  ) THEN
    ALTER TABLE public.mechanics
    ADD COLUMN suspended_until TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE public.mechanics
    ADD COLUMN ban_reason TEXT;
  END IF;
END $$;

-- Verification output
DO $$
BEGIN
  RAISE NOTICE 'Phase 1 schema migration complete. Run 03_verify.sql to confirm.';
END $$;
```

**File:** `supabase/migrations/admin-users-phase1/02_down.sql`

```sql
-- Rollback Phase 1 (only if columns were added by this migration)
-- WARNING: This does NOT drop columns to prevent data loss
-- Columns are left in place but can be ignored

DO $$
BEGIN
  RAISE NOTICE 'Phase 1 rollback: Columns remain for safety. Manual cleanup required if needed.';
END $$;
```

**File:** `supabase/migrations/admin-users-phase1/03_verify.sql`

```sql
-- Verify Phase 1 schema
SELECT
  'profiles' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('account_status', 'suspended_until', 'ban_reason', 'email_verified')
ORDER BY column_name;

SELECT
  'mechanics' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mechanics'
  AND column_name IN ('account_status', 'suspended_until', 'ban_reason')
ORDER BY column_name;
```

#### Phase 1 Deliverables

- ✅ Middleware status checks (suspended/banned users blocked)
- ✅ Manual user creation API + UI
- ✅ Soft delete API + UI (replaces hard delete)
- ✅ Ban user UI flow
- ✅ Email verification override UI
- ✅ Idempotent SQL migration (01_up, 02_down, 03_verify)
- ✅ Documentation: `notes/reports/remediation/admin-users-phase1.md`

---

### 📋 **Phase 2: Role & Status Management (Tier 2)**

**Objective:** Enable flexible user role management and status workflows.

**Estimated Effort:** 2-3 hours
**Risk Level:** Medium (role changes affect permissions)

#### 2.1 Role Management

**New API:** `/api/admin/users/[id]/change-role`

**Features:**
- Change role: customer ↔ mechanic ↔ admin
- Validations:
  - ❌ Cannot change your own role
  - ❌ Cannot demote if you're the last admin (min 2 admins required)
  - ✅ Confirmation modal: "Change {user} from {old_role} to {new_role}?"
- Side effects:
  - If promoting to mechanic: create record in `mechanics` table
  - If demoting from mechanic: soft-delete mechanic record
  - If promoting to admin: send notification email
- Log action: `ROLE_CHANGE` with before/after values

**UI:** Dropdown in user detail drawer

#### 2.2 Account Status Toggle

**New API:** `/api/admin/users/[id]/set-status`

**Features:**
- Dropdown: Active / Suspended / Banned / Deleted
- One-click status update (confirmation modal)
- Auto-clear `suspended_until` if changing from Suspended → Active
- Auto-clear `ban_reason` if changing from Banned → Active
- Real-time UI update (React Query refetch)
- Log action: `STATUS_CHANGE`

**UI:** Status dropdown in customers table row

#### 2.3 Enhanced User Detail Drawer

**New Component:** `src/components/admin/users/UserDetailDrawer.tsx`

**Features:**
- **Profile Section:**
  - Full name, email, phone, role
  - Account status with visual indicator
  - Email verified badge
  - Join date, last active

- **Activity Metrics:**
  - Total sessions (with link to filter sessions page)
  - Total spent (from payments table)
  - Last login timestamp
  - Device info (from sessions)

- **Quick Actions:**
  - 🔄 Reset Password
  - ⏸️ Suspend Account
  - 🚫 Ban User
  - ✉️ Verify Email
  - 🗑️ Delete User
  - 🔐 Change Role

**UI:** Slide-out drawer (right side) triggered from "View Details" in manage dropdown

#### Phase 2 Deliverables

- ✅ Role change API + UI
- ✅ Status toggle dropdown
- ✅ Enhanced user detail drawer
- ✅ Validation logic (self-protection, min admins)
- ✅ Documentation: `notes/reports/remediation/admin-users-phase2.md`

---

### 📋 **Phase 3: Advanced Admin Features (Tier 3)**

**Objective:** Implement power-user features for efficient admin workflows.

**Estimated Effort:** 4-5 hours
**Risk Level:** High (impersonation requires strict security)

#### 3.1 Bulk Actions

**New Component:** `src/components/admin/users/BulkActionBar.tsx`

**Features:**
- Multi-select checkboxes (up to 100 users)
- Actions:
  - 📧 Bulk Verify Emails
  - ⏸️ Bulk Suspend (with shared reason)
  - 🚫 Bulk Ban (with shared reason)
  - 📥 Bulk Export (CSV)
  - 🗑️ Bulk Delete (high-risk, double confirmation)

**Implementation:**
- Single Supabase RPC function for efficiency:
  ```sql
  CREATE FUNCTION bulk_update_users(
    user_ids UUID[],
    action TEXT,
    params JSONB
  ) RETURNS JSONB
  ```
- Progress indicator (X of Y processed)
- Error handling (partial success reporting)

**UI:** Sticky action bar at bottom when >0 users selected

#### 3.2 User Impersonation

**New APIs:**
- `/api/admin/users/[id]/impersonate` - Start impersonation
- `/api/admin/impersonate/end` - End impersonation

**Security Model:**
- Generate signed JWT token with:
  - `admin_id` (who is impersonating)
  - `impersonated_user_id` (target user)
  - `expires_at` (30 minutes)
  - `scope` (restricted - no admin routes)
- Store in HTTP-only cookie: `impersonation_token`
- Middleware checks for impersonation and restricts access:
  - ❌ Cannot access `/admin/*` routes
  - ❌ Cannot access `/api/admin/*` endpoints
  - ❌ Cannot perform destructive actions (delete, payments)
  - ✅ Can view customer/mechanic dashboards
  - ✅ Can navigate as user

**UI:**
- "Login As User" button in user detail drawer
- Banner across top of every page:
  ```
  ⚠️ You are impersonating [user.email] | [End Impersonation]
  ```
- Auto-expires after 30 minutes (redirects to admin dashboard)

**Audit Log:**
- `IMPERSONATION_START`: admin_id, user_id, start_time, ip
- `IMPERSONATION_END`: admin_id, user_id, end_time, duration
- `IMPERSONATION_ACTION`: Any actions performed during session

**Table:** `user_impersonation_sessions`

```sql
CREATE TABLE user_impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id),
  impersonated_user_id UUID NOT NULL REFERENCES profiles(id),
  token_hash TEXT NOT NULL, -- SHA-256 hash of JWT
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  actions_performed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.3 Admin Audit Log Viewer

**New Page:** `/admin/audit-log`

**Features:**
- **Filters:**
  - Admin (who performed action)
  - Target user (who was affected)
  - Action type (dropdown: BAN, SUSPEND, DELETE, ROLE_CHANGE, etc.)
  - Date range (from/to)

- **Table Columns:**
  - Timestamp
  - Admin (name + email)
  - Action
  - Target user
  - Before/After values (JSON diff)
  - Reason (if applicable)
  - IP address
  - Status (success/failure)

- **Export:** CSV download with all filters applied

**Data Source:** Enhance existing `admin_actions` table OR create new `admin_audit_log` table with:

```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id),
  target_user_id UUID REFERENCES profiles(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'CREATE_USER', 'DELETE_USER', 'BAN_USER', 'SUSPEND_USER',
    'ROLE_CHANGE', 'EMAIL_VERIFIED_OVERRIDE', 'STATUS_CHANGE',
    'IMPERSONATION_START', 'IMPERSONATION_END', 'BULK_ACTION'
  )),
  before_state JSONB, -- User state before action
  after_state JSONB,  -- User state after action
  reason TEXT,
  metadata JSONB,     -- IP, user_agent, etc.
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failure')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX idx_audit_log_target ON admin_audit_log(target_user_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON admin_audit_log(action_type, created_at DESC);
CREATE INDEX idx_audit_log_created ON admin_audit_log(created_at DESC);
```

#### Phase 3 Deliverables

- ✅ Bulk actions (select + batch operations)
- ✅ User impersonation with security restrictions
- ✅ Impersonation audit trail
- ✅ Admin audit log viewer page
- ✅ Enhanced logging with before/after state
- ✅ SQL migration for impersonation sessions + audit log
- ✅ Documentation: `notes/reports/remediation/admin-users-phase3.md`

---

## Testing Strategy

### Manual Smoke Tests (Per Phase)

#### Phase 1 Tests
1. ✅ Create customer user → verify in database + auth.users
2. ✅ Create mechanic user → verify mechanics table entry
3. ✅ Create admin user → verify cannot access if not verified
4. ✅ Soft delete user → verify deleted_at set, user cannot login
5. ✅ Ban user → verify cannot login, redirect to /banned
6. ✅ Verify email → verify email_confirmed_at set in auth
7. ✅ Suspended user tries to login → redirect to /suspended
8. ✅ Suspension expires → user can login again

#### Phase 2 Tests
1. ✅ Change customer → mechanic → verify mechanics record created
2. ✅ Change mechanic → customer → verify mechanics record soft-deleted
3. ✅ Promote to admin → verify minimum 2 admins enforced
4. ✅ Try to demote self → verify rejection
5. ✅ Change status Active → Suspended → verify immediate access block
6. ✅ View user detail drawer → verify all metrics displayed

#### Phase 3 Tests
1. ✅ Bulk verify 10 emails → verify all updated
2. ✅ Bulk suspend 5 users → verify all blocked from login
3. ✅ Start impersonation → verify banner displayed
4. ✅ During impersonation, try /admin → verify blocked
5. ✅ Impersonation expires → verify auto-redirect
6. ✅ View audit log → verify all actions logged
7. ✅ Filter audit log by admin → verify results

### Build & Type Safety
- Run `npm run typecheck` after every phase
- Run `npm run build` to verify production build
- Update Supabase types: `npm run supabase:db:types`

---

## Rollback Plan

### Phase 1 Rollback
- Remove middleware status checks (revert to original)
- Disable create user endpoint (return 503)
- Revert soft delete to hard delete (NOT RECOMMENDED)
- Schema: Columns remain for safety (no DROP)

### Phase 2 Rollback
- Disable role change endpoint (return 503)
- Hide status toggle UI
- Remove user detail drawer

### Phase 3 Rollback
- Disable impersonation endpoints (return 503)
- Remove bulk action UI
- Hide audit log page

**Important:** SQL schema changes are NOT rolled back to prevent data loss. Columns remain but are unused.

---

## Documentation Deliverables

1. ✅ `notes/reports/remediation/admin-users-plan.md` (this file)
2. ✅ `notes/reports/remediation/admin-users-schema-introspection.sql` (already created)
3. 📋 `notes/reports/remediation/admin-users-phase1.md` (after Phase 1)
4. 📋 `notes/reports/remediation/admin-users-phase2.md` (after Phase 2)
5. 📋 `notes/reports/remediation/admin-users-phase3.md` (after Phase 3)

---

## Non-Functional Requirements

### Performance
- User creation: < 500ms
- Soft delete: < 200ms
- Bulk actions: < 5s for 100 users
- Audit log query: < 1s with filters

### Security
- All destructive actions require confirmation
- Audit log entries are immutable (insert-only)
- Impersonation tokens expire in 30 minutes
- No password hashing in frontend (use Supabase Auth)

### Compliance (PIPEDA/CASL)
- All deletions are soft delete by default
- Audit log retention: 7 years
- PII protection: Emails redacted in logs (show first 3 chars only)
- Consent tracking: Log email sends

### Accessibility
- All modals keyboard-navigable
- ARIA labels on all actions
- Focus management in drawers

---

## Implementation Order (Recommended)

1. **Pre-Flight:**
   - Run schema introspection SQL
   - Verify columns exist
   - Review output with team

2. **Phase 1 (Day 1):**
   - SQL migration (01_up.sql)
   - Middleware security enhancement
   - Create user API + UI
   - Soft delete API + UI
   - Test suite

3. **Phase 2 (Day 2):**
   - Role change API + UI
   - Status toggle UI
   - User detail drawer
   - Test suite

4. **Phase 3 (Day 3-4):**
   - Bulk actions API + UI
   - Impersonation system
   - Audit log viewer
   - Test suite

5. **Final Review:**
   - Full regression test
   - Security audit
   - Documentation review

---

## Approval Required

**Status:** ⏸️ **AWAITING APPROVAL**

No code, migrations, or commits will be made until explicit approval with:

**APPROVE ADMIN USERS PLAN — PROCEED TO PHASE 1**

---

## Questions for Clarification

1. Should we create a new `admin_audit_log` table or enhance the existing `admin_actions` table?
2. Impersonation scope: Should admins be able to impersonate other admins?
3. Bulk action limit: 100 users per batch okay, or increase to 500?
4. Email templates: Use existing Resend service or create new templates?
5. Soft delete retention: 7 days (PIPEDA) or 30 days?

---

**End of Plan**
