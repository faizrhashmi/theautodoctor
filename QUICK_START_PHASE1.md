# Quick Start: Phase 1 Implementation

## ✅ Completed

- [x] Security infrastructure (encryption.ts, ratelimit.ts)
- [x] Database migrations created and fixed
- [x] Signup flows updated (mechanic & customer)
- [x] Encryption key generated and added to .env.local

---

## 🚀 Immediate Next Steps

### Step 1: Set Up Upstash Redis (5 minutes)

**Why:** Rate limiting for signup/login (prevents brute force attacks)

1. Go to **https://upstash.com** → Sign up (free)
2. Click **"Create Database"**
3. Configure:
   - Type: **Redis**
   - Name: `theautodoctor-ratelimit`
   - Region: **US East (or closest to you)**
   - Eviction: **Enable**
4. Click **"Create"**
5. On the database page, click **"REST API"** tab
6. Copy:
   - **UPSTASH_REDIS_REST_URL** (starts with `https://`)
   - **UPSTASH_REDIS_REST_TOKEN** (long string)
7. Add to `.env.local`:
   ```env
   UPSTASH_REDIS_REST_URL=https://your-db-xxxxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AY...your-token-here
   ```

---

### Step 2: Run Database Migrations (5 minutes)

**Why:** Creates organizations and account tracking tables

1. Open **Supabase Dashboard**: https://supabase.com/dashboard/project/qtkouemogsymqrzkysar
2. Go to **SQL Editor**
3. Run migrations **in order**:

#### Migration 1: Create Organizations Table
- Open: `supabase/migrations/20250124000001_create_organizations.sql`
- Copy all contents
- Paste in SQL Editor → Click **"Run"**
- ✅ Expected: "Success. No rows returned"

#### Migration 2: Create Organization Members Table
- Open: `supabase/migrations/20250124000002_create_organization_members.sql`
- Copy all contents
- Paste in SQL Editor → Click **"Run"**
- ✅ Expected: "Success. No rows returned"

#### Migration 3: Add Account Types
- Open: `supabase/migrations/20250124000003_add_account_types.sql`
- Copy all contents
- Paste in SQL Editor → Click **"Run"**
- ✅ Expected: "Success. No rows returned" (or UPDATE count)

#### Verify Success
Run this in SQL Editor:
```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('organizations', 'organization_members')
ORDER BY table_name;
```

Expected result:
```
organization_members
organizations
```

---

### Step 3: Install Missing Dependencies (1 minute)

```bash
npm install @upstash/ratelimit @upstash/redis
```

---

### Step 4: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

---

## 🎯 What's Next (Phase 1 Features)

After completing the above steps, we'll implement:

### 1. Workshop Signup Flow
- `/workshop/signup` page
- Multi-step form: Basic Info → Business Details → Coverage Area → Review
- Auto-generates organization slug
- Stripe Connect onboarding integration

### 2. Workshop Admin Dashboard
- `/workshop/dashboard` page
- Overview: Mechanics, Coverage, Earnings
- Invite mechanics (generate invite codes)
- Manage organization settings

### 3. Mechanic Invitation System
- `/mechanic/signup/:inviteCode` page
- Simplified 2-step signup (no SIN required for workshop mechanics)
- Auto-approval (skips admin review)
- Automatically links to workshop

### 4. SIN Collection Modal
- Shown before mechanic's first paid session
- "You need to provide your SIN before joining a paid session"
- Encrypts and stores SIN
- Updates `sin_collection_completed_at` timestamp

---

## 📊 Implementation Timeline

| Feature | Estimated Time | Priority |
|---------|----------------|----------|
| Upstash Redis setup | 5 min | 🔴 Critical |
| Run migrations | 5 min | 🔴 Critical |
| Install dependencies | 1 min | 🔴 Critical |
| Workshop signup flow | 2-3 hours | 🟡 High |
| Workshop dashboard | 3-4 hours | 🟡 High |
| Mechanic invitation | 1-2 hours | 🟡 High |
| SIN collection modal | 1 hour | 🟢 Medium |

---

## 🧪 Testing Plan

After implementation:

### Test 1: Customer Signup
1. Go to `/signup`
2. Create customer account
3. Check database: `account_type = 'individual_customer'`

### Test 2: Mechanic Signup
1. Go to `/mechanic/signup`
2. Complete all steps (including SIN)
3. Check database:
   - `account_type = 'individual_mechanic'`
   - `sin_encrypted` is populated (not plain text)
   - `requires_sin_collection = true`

### Test 3: Workshop Signup (after implementing)
1. Go to `/workshop/signup`
2. Complete workshop registration
3. Check database:
   - `organizations` table has new entry
   - `organization_type = 'workshop'`
   - Stripe Connect account created

### Test 4: Workshop Mechanic Invitation (after implementing)
1. Workshop admin generates invite code
2. Go to `/mechanic/signup/:inviteCode`
3. Complete simplified signup (no SIN)
4. Check database:
   - `account_type = 'workshop_mechanic'`
   - `workshop_id` links to workshop
   - `requires_sin_collection = false`
   - `auto_approved = true`

---

## 🚨 Troubleshooting

### Error: "ENCRYPTION_KEY is not defined"
**Fix:** Restart dev server (Ctrl+C, then `npm run dev`)

### Error: "Cannot connect to Redis"
**Fix:** Double-check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in `.env.local`

### Error: "relation 'organizations' does not exist"
**Fix:** Run migrations in correct order (001 → 002 → 003)

### Error: "Module not found: @upstash/ratelimit"
**Fix:** `npm install @upstash/ratelimit @upstash/redis`

---

## 📚 Documentation Reference

- [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) - Full environment setup guide
- [MIGRATION_FIX_SUMMARY.md](MIGRATION_FIX_SUMMARY.md) - Migration details
- [MIGRATION_EXECUTION_GUIDE.md](MIGRATION_EXECUTION_GUIDE.md) - Step-by-step migration guide

---

## 🎉 Ready to Build!

Once you've completed Steps 1-4 above, let me know and I'll start implementing the workshop signup flow and other Phase 1 features!
