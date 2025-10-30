# AutoDoctor Business Model & Access Control Analysis

**Date:** 2025-10-30
**Purpose:** Complete analysis of user roles, access control, and business relationships

---

## Business Model Overview

Your platform operates as a **multi-sided marketplace** connecting:

1. **Customers (B2C)** - Car owners needing help
2. **Independent Mechanics (B2C)** - Freelance mechanics offering virtual/in-person services
3. **Workshop-Affiliated Mechanics (B2B2C)** - Mechanics employed by workshops
4. **Workshops (B2B)** - Physical repair shops using the platform for customer acquisition

---

## User Types & Access Hierarchy

### 1. **Customers** (`profiles.role = 'customer'`)

**Portal:** `/customer/*`

**Access Requirements:**
- Supabase Auth user account
- Entry in `profiles` table with `role = 'customer'`

**What They Can Do:**
- Request diagnostic sessions (chat, video, in-person)
- View session history
- Rate mechanics
- End active sessions
- Manage their profile

**Authentication:**
- Middleware checks: `profiles.role = 'customer'`
- API guard: `requireCustomerAPI()`

---

### 2. **Independent Mechanics** (`profiles.role = 'mechanic'` + `mechanics.account_type = 'independent'`)

**Portal:** `/mechanic/*`

**Database Structure:**
```sql
-- auth.users table
id: UUID (Supabase Auth)
email: TEXT

-- profiles table
id: UUID (= auth.users.id)
role: 'mechanic'
full_name: TEXT
email: TEXT

-- mechanics table
id: UUID
user_id: UUID (= auth.users.id) ⭐ CRITICAL LINK
email: TEXT
service_tier: 'virtual_only' | 'hybrid' | 'in_person'
account_type: 'independent' ⭐
workshop_id: NULL ⭐ (independent means no workshop)
can_accept_sessions: BOOLEAN
```

**Access Requirements:**
1. Supabase Auth user account
2. Entry in `profiles` with `role = 'mechanic'`
3. Entry in `mechanics` with:
   - `user_id` linked to auth user
   - `account_type = 'independent'`
   - `workshop_id IS NULL`

**Which Dashboard They See:**
- **Virtual-only:** → `/mechanic/dashboard/virtual`
  - If `service_tier = 'virtual_only'`
- **All others:** → `/mechanic/dashboard`
  - If `service_tier IN ('hybrid', 'in_person')`

**What They Can Do:**
- Accept session requests
- Manage availability (clock in/out)
- View earnings
- Connect Stripe for payouts
- Apply for partnership programs
- Manage their profile

**Authentication:**
- Middleware checks: `profiles.role = 'mechanic'` ([middleware.ts:281](src/middleware.ts#L281))
- API guard: `requireMechanicAPI()` ([guards.ts:234](src/lib/auth/guards.ts#L234))

---

### 3. **Workshop-Affiliated Mechanics** (`profiles.role = 'mechanic'` + `mechanics.account_type = 'workshop'`)

**Portal:** `/mechanic/*` ⚠️ **SAME AS INDEPENDENT MECHANICS**

**Database Structure:**
```sql
-- auth.users table
id: UUID (Supabase Auth)
email: TEXT

-- profiles table
id: UUID (= auth.users.id)
role: 'mechanic'
full_name: TEXT

-- mechanics table
id: UUID
user_id: UUID (= auth.users.id)
email: TEXT
service_tier: 'virtual_only' | 'hybrid' | 'in_person'
account_type: 'workshop' ⭐
workshop_id: UUID (= organizations.id) ⭐ LINKS TO WORKSHOP
invited_by: UUID (= organizations.id)
invite_accepted_at: TIMESTAMP
can_accept_sessions: BOOLEAN
```

**Access Requirements:**
- Same as independent mechanics PLUS
- `workshop_id` is set (links to `organizations.id`)
- `account_type = 'workshop'`
- `invited_by` shows which workshop invited them

**Which Dashboard They See:**
- **Same routing as independent mechanics:**
  - Virtual-only → `/mechanic/dashboard/virtual`
  - Others → `/mechanic/dashboard`

**⚠️ CRITICAL: Workshop-Affiliated Mechanics DO NOT Access Workshop Portal**

They use the **MECHANIC portal** (`/mechanic/*`), NOT the workshop portal (`/workshop/*`).

**How They're Linked to Workshops:**
1. Workshop admin sends invite via `/workshop/dashboard` → "Invite Mechanic" button
2. System creates entry in `mechanics` table with:
   - `invited_by = workshop_organization_id`
   - `account_type = 'workshop'`
3. Mechanic accepts invite
4. System sets:
   - `workshop_id = invited_by`
   - `invite_accepted_at = NOW()`

**What They Can Do:**
- Same as independent mechanics
- Sessions may be routed through their workshop
- Earnings split with workshop based on `organizations.commission_rate`

**Authentication:**
- Middleware checks: `profiles.role = 'mechanic'`
- API guard: `requireMechanicAPI()`
- **NO access to workshop portal**

---

### 4. **Workshop Administrators** (`organization_members` table)

**Portal:** `/workshop/*` ⭐

**Database Structure:**
```sql
-- auth.users table
id: UUID (Supabase Auth)
email: TEXT

-- profiles table
id: UUID (= auth.users.id)
role: Could be 'customer', 'mechanic', or NO ROLE ⭐
  (Workshop admin access is independent of profile role)

-- organization_members table ⭐ THIS IS THE KEY TABLE
id: UUID
organization_id: UUID (= organizations.id)
user_id: UUID (= auth.users.id) ⭐ CRITICAL LINK
role: 'owner' | 'admin' | 'member' | 'viewer'
status: 'active' | 'pending' | 'suspended' | 'removed'
invite_code: TEXT
invite_email: TEXT
joined_at: TIMESTAMP

-- organizations table
id: UUID
name: TEXT
organization_type: 'workshop' ⭐
email: TEXT
address: TEXT
mechanic_capacity: INTEGER
commission_rate: NUMERIC
stripe_account_id: TEXT
```

**Access Requirements:**
1. Supabase Auth user account
2. Entry in `organization_members` with:
   - `user_id` = auth user ID
   - `status = 'active'`
   - `organization_id` → organization with `type = 'workshop'`

**⚠️ IMPORTANT: Profile Role Does NOT Matter**

Workshop access is determined by `organization_members` table, NOT `profiles.role`.

This means:
- ❌ A mechanic with `profiles.role = 'mechanic'` **CANNOT** access workshop portal unless they're in `organization_members`
- ✅ A user with `profiles.role = 'customer'` **CAN** access workshop portal if they're in `organization_members` as 'owner' or 'admin'
- ✅ A user with NO profile role **CAN** access workshop portal if they're in `organization_members`

**How They Get Access (Invitation System):**

**Method 1: Owner Creates Workshop** (Initial Setup)
1. User signs up via `/workshop/signup`
2. System creates:
   - Auth user in `auth.users`
   - Organization in `organizations` with `type = 'workshop'`
   - Organization member in `organization_members` with `role = 'owner'`
3. User can now access `/workshop/dashboard`

**Method 2: Owner/Admin Invites Team Member**
1. Existing owner/admin goes to `/workshop/dashboard` → "Invite Member" (hypothetical feature)
2. System creates entry in `organization_members`:
   ```sql
   INSERT INTO organization_members (
     organization_id,
     role,
     status,
     invite_email,
     invite_code,
     invited_by,
     invite_expires_at
   ) VALUES (
     'workshop-org-id',
     'admin', -- or 'member', 'viewer'
     'pending',
     'newadmin@example.com',
     'randomly-generated-code',
     'inviter-user-id',
     NOW() + INTERVAL '7 days'
   )
   ```
3. Invitee receives email with link: `/workshop/join/:invite_code`
4. They sign up or login
5. System updates `organization_members`:
   - Sets `user_id = auth.users.id`
   - Sets `status = 'active'`
   - Sets `joined_at = NOW()`
6. User can now access `/workshop/dashboard`

**What They Can Do:**

**All Roles:**
- View workshop dashboard
- View mechanics affiliated with workshop
- View session statistics
- View revenue reports

**Owner/Admin Roles:**
- Invite mechanics to join workshop
- Invite other admins/members
- Manage workshop settings
- View and manage quotes
- View analytics
- Manage partnerships
- Update workshop profile
- Connect Stripe account

**Member Role:**
- View-only access to most features
- May have limited editing capabilities

**Viewer Role:**
- Read-only access to reports and analytics

**Authentication:**
- Middleware checks: `organization_members` with `status = 'active'` and `organizations.type = 'workshop'` ([middleware.ts:326-355](src/middleware.ts#L326-L355))
- API guard: `requireWorkshopAPI()` ([guards.ts:447](src/lib/auth/guards.ts#L447))

---

### 5. **Platform Admins** (`profiles.role = 'admin'`)

**Portal:** `/admin/*`

**Access Requirements:**
- Supabase Auth user account
- Entry in `profiles` with `role = 'admin'`

**What They Can Do:**
- View all users, mechanics, workshops
- Approve/reject mechanic applications
- Manage platform settings
- View system-wide analytics
- Manage partnership programs
- Handle escalations

**Authentication:**
- Middleware checks: `profiles.role = 'admin'` ([middleware.ts:226](src/middleware.ts#L226))

---

## Access Control Summary Table

| User Type | Portal | Key Table | Role Check | Additional Check |
|-----------|--------|-----------|------------|------------------|
| **Customer** | `/customer/*` | `profiles` | `role = 'customer'` | None |
| **Independent Mechanic** | `/mechanic/*` | `profiles` + `mechanics` | `role = 'mechanic'` | `mechanics.user_id` set + `account_type = 'independent'` + `workshop_id IS NULL` |
| **Workshop Mechanic** | `/mechanic/*` | `profiles` + `mechanics` | `role = 'mechanic'` | `mechanics.user_id` set + `account_type = 'workshop'` + `workshop_id` set |
| **Workshop Admin** | `/workshop/*` | `organization_members` + `organizations` | None (role independent) | `organization_members.status = 'active'` + `organizations.type = 'workshop'` |
| **Platform Admin** | `/admin/*` | `profiles` | `role = 'admin'` | None |

---

## Answer to Your Question

> **"Is the mechanic affiliated with a workshop the one who has full dashboard access to workshop/dashboard?"**

### **NO.** ❌

**Workshop-affiliated mechanics DO NOT get access to `/workshop/dashboard`.**

Here's why:

### Two Separate Systems:

1. **Mechanic Affiliation** (via `mechanics.workshop_id`)
   - Links a mechanic to a workshop for **job routing and revenue sharing**
   - Mechanic still uses **mechanic portal** at `/mechanic/dashboard`
   - Mechanic sees their own sessions, earnings, schedule
   - Workshop gets commission from mechanic's earnings

2. **Workshop Administrator Access** (via `organization_members`)
   - Completely separate invitation system
   - User gets added to `organization_members` table
   - User can access **workshop portal** at `/workshop/dashboard`
   - Can manage workshop, view all mechanics, see analytics

### The Relationship:

```
Workshop Organization
    ↓
    ├─ Administrators (organization_members) → Access /workshop/dashboard ✅
    │    ├─ Owner
    │    ├─ Admin
    │    ├─ Member
    │    └─ Viewer
    │
    └─ Affiliated Mechanics (mechanics.workshop_id) → Access /mechanic/dashboard ✅
         ├─ Mechanic 1 (account_type = 'workshop')
         ├─ Mechanic 2 (account_type = 'workshop')
         └─ Mechanic 3 (account_type = 'workshop')
```

### Can a Mechanic Be BOTH?

**YES!** A mechanic can have:
1. Entry in `mechanics` table with `workshop_id` set (makes them a workshop mechanic)
2. Entry in `organization_members` table with `status = 'active'` (makes them a workshop admin)

In this case, they can access:
- `/mechanic/dashboard` (as a mechanic)
- `/workshop/dashboard` (as a workshop admin)

But these are **two separate roles**, not automatic.

---

## Invitation Flow

### Workshop Inviting a Mechanic to Work For Them:

**Flow:**
1. Workshop admin goes to `/workshop/dashboard`
2. Clicks "Invite Mechanic" button
3. Fills in mechanic email
4. System creates/updates entry in `mechanics` table:
   ```sql
   INSERT INTO mechanics (email, invited_by, account_type)
   VALUES ('mechanic@example.com', 'workshop-org-id', 'workshop')
   -- OR UPDATE if mechanic already exists
   UPDATE mechanics
   SET invited_by = 'workshop-org-id', account_type = 'workshop'
   WHERE email = 'mechanic@example.com'
   ```
5. Mechanic receives invite
6. Mechanic accepts → `workshop_id` and `invite_accepted_at` get set
7. **Result:** Mechanic can access `/mechanic/dashboard`, jobs route through workshop

### Workshop Inviting an Admin to Manage Portal:

**Flow:**
1. Workshop owner goes to `/workshop/settings/team` (hypothetical)
2. Clicks "Invite Admin" button
3. Fills in admin email and selects role (admin/member/viewer)
4. System creates entry in `organization_members`:
   ```sql
   INSERT INTO organization_members (
     organization_id, invite_email, role, status, invite_code
   ) VALUES (
     'workshop-org-id', 'admin@example.com', 'admin', 'pending', 'abc123xyz'
   )
   ```
5. Admin receives invite link: `/workshop/join/abc123xyz`
6. Admin signs up/logs in
7. System updates: `user_id` and `status = 'active'`
8. **Result:** Admin can access `/workshop/dashboard`, can manage workshop

---

## Database Migration Issue

Looking at your selected migration file [20251029000011_drop_mechanic_sessions_table.sql](supabase/migrations/20251029000011_drop_mechanic_sessions_table.sql), I can see you dropped the old `mechanic_sessions` table.

**⚠️ CRITICAL:** You still need to apply migration `99999999_fix_mechanic_auth_function.sql` to fix the `get_authenticated_mechanic_id()` function, which currently references the deleted `mechanic_sessions` table.

---

## Your Test User Issue

You mentioned `worksho.mechanic@test.com` isn't working. Based on the debug results:

```json
{
  "errors": ["Mechanic not found in database"]
}
```

**The mechanic doesn't exist.** To fix:

### Option 1: Create as Independent Mechanic
```sql
-- 1. Create auth user (via Supabase Auth dashboard or signup)
-- 2. Create profile
INSERT INTO profiles (id, email, role, full_name)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'worksho.mechanic@test.com'),
  'worksho.mechanic@test.com',
  'mechanic',
  'Workshop Mechanic Test'
);

-- 3. Create mechanic entry
INSERT INTO mechanics (
  user_id, email, name, service_tier, account_type,
  workshop_id, can_accept_sessions
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'worksho.mechanic@test.com'),
  'worksho.mechanic@test.com',
  'Workshop Mechanic Test',
  'hybrid', -- or 'virtual_only', 'in_person'
  'independent',
  NULL, -- Independent, not affiliated
  true
);
```

### Option 2: Create as Workshop-Affiliated Mechanic
```sql
-- Same as above, but with workshop_id set
INSERT INTO mechanics (
  user_id, email, name, service_tier, account_type,
  workshop_id, invited_by, can_accept_sessions
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'worksho.mechanic@test.com'),
  'worksho.mechanic@test.com',
  'Workshop Mechanic Test',
  'hybrid',
  'workshop',
  'your-workshop-org-id', -- Get from organizations table
  'your-workshop-org-id',
  true
);
```

### Option 3: Create as Workshop Admin (Access to /workshop/dashboard)
```sql
-- 1. Create auth user (via Supabase Auth dashboard or signup)
-- 2. Add to organization_members
INSERT INTO organization_members (
  organization_id, user_id, role, status, joined_at
) VALUES (
  'your-workshop-org-id',
  (SELECT id FROM auth.users WHERE email = 'worksho.mechanic@test.com'),
  'admin', -- or 'owner', 'member', 'viewer'
  'active',
  NOW()
);
```

---

## Summary

### Key Takeaways:

1. ✅ **Workshop-affiliated mechanics** have `mechanics.workshop_id` set but still use `/mechanic/dashboard`
2. ❌ **Workshop-affiliated mechanics DO NOT** automatically get access to `/workshop/dashboard`
3. ✅ **Workshop portal access** requires entry in `organization_members` table with `status = 'active'`
4. ✅ **Invitation system** is how users join workshops:
   - **Mechanic invitation** → Adds to `mechanics` table with `workshop_id`
   - **Admin invitation** → Adds to `organization_members` table
5. ✅ **A user CAN have both roles** (mechanic + workshop admin) but they're separate invitations
6. ⚠️ **Your test user** `worksho.mechanic@test.com` doesn't exist - needs to be created

### Who Can Access What:

| Access Level | Required Setup | Portal |
|-------------|----------------|--------|
| **Mechanic Portal** | `profiles.role = 'mechanic'` + `mechanics.user_id` set | `/mechanic/dashboard` or `/mechanic/dashboard/virtual` |
| **Workshop Portal** | `organization_members.status = 'active'` + `organizations.type = 'workshop'` | `/workshop/dashboard` |
| **Both Portals** | Both of the above | Both `/mechanic/*` and `/workshop/*` |

---

## Next Steps

1. ✅ Apply database migration `99999999_fix_mechanic_auth_function.sql`
2. ✅ Create test user `worksho.mechanic@test.com` with appropriate role
3. ✅ Verify user can access intended portal
4. ✅ Test session request flow end-to-end
