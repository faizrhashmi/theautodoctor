# Manual Sync Procedure - Local to Remote

**Date**: 2025-01-09
**Purpose**: Sync local database changes to remote Supabase when pooler is down

---

## 🎯 OVERVIEW

Since the Supabase pooler is currently down, we'll work locally and sync to remote later using one of these methods:

1. **Automatic Sync** (when pooler recovers) - EASIEST
2. **Supabase Dashboard SQL Editor** - MANUAL BUT SAFE
3. **Direct Database Connection** - ADVANCED

---

## ✅ METHOD 1: Automatic Sync (RECOMMENDED - When Pooler Recovers)

This is the cleanest approach once Supabase pooler is back online.

### **Step 1: Check if Pooler is Back**

```bash
# Test connection
pnpm supabase migration list

# If it works without errors, pooler is back!
```

### **Step 2: Push Local Changes to Remote**

```bash
# This will apply all local migrations to remote
pnpm supabase db push

# Confirm when prompted
# Output should show: "Applying migration XXXXX..."
```

### **Step 3: Verify Sync**

```bash
# Check migration history
pnpm supabase migration list

# All migrations should show in both Local and Remote columns
```

### **Step 4: Verify Data (Optional)**

```bash
# Pull remote schema to verify
pnpm supabase db pull --schema public

# This creates a new migration with any differences
# If no differences, you're in sync!
```

**When to use**: When pooler is back online (usually within a few hours)

---

## 🔧 METHOD 2: Supabase Dashboard SQL Editor (MANUAL)

If pooler stays down or you need to sync immediately.

### **Step 1: Export Local Schema**

```bash
# Dump your local database schema
docker exec supabase_db_theautodoctor pg_dump -U postgres -d postgres --schema-only > local_schema_export.sql

# This creates a file with all your table structures
```

### **Step 2: Export Local Data (Test Users)**

```bash
# Export only test user data
docker exec supabase_db_theautodoctor pg_dump -U postgres -d postgres \
  --data-only \
  --table=auth.users \
  --table=mechanics \
  --table=profiles \
  --table=vehicles \
  > local_test_data.sql
```

### **Step 3: Login to Supabase Dashboard**

1. Open: https://supabase.com/dashboard/project/qtkouemogsymqrzkysar
2. Click "SQL Editor" in left sidebar
3. Click "New query"

### **Step 4: Apply Schema Changes**

1. Open `local_schema_export.sql` in text editor
2. Copy relevant CREATE TABLE or ALTER TABLE statements
3. Paste into SQL Editor
4. Click "Run"

**Example**:
```sql
-- If you added a new column to mechanics table
ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS some_new_column TEXT;

-- If you created a new table
CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
);
```

### **Step 5: Apply Data Changes (Test Users)**

1. Open `local_test_data.sql`
2. Copy INSERT statements
3. Paste into SQL Editor
4. Click "Run"

**Example**:
```sql
-- Insert test users
INSERT INTO auth.users (id, email, ...)
VALUES (...)
ON CONFLICT (id) DO NOTHING;

-- Insert test mechanics
INSERT INTO mechanics (id, user_id, email, account_type, ...)
VALUES (...)
ON CONFLICT (id) DO UPDATE SET ...;
```

### **Step 6: Verify in Dashboard**

1. Go to "Table Editor"
2. Check your tables
3. Verify data is there

**When to use**: When pooler is down for extended period (>24 hours)

---

## 🚀 METHOD 3: Direct Database Connection (ADVANCED)

Bypass the pooler entirely and connect directly to database.

### **Step 1: Get Direct Database URL**

1. Go to: https://supabase.com/dashboard/project/qtkouemogsymqrzkysar/settings/database
2. Scroll to "Connection string"
3. Select "URI" tab
4. Copy the connection string
5. Replace `[YOUR-PASSWORD]` with your actual database password

**Format**:
```
postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Change to direct connection**:
```
postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
```

### **Step 2: Set Environment Variable**

```bash
# Windows PowerShell
$env:SUPABASE_DB_URL="postgresql://postgres.[project-ref]:[password]@db.qtkouemogsymqrzkysar.supabase.co:5432/postgres"

# Or add to .env.local
echo "SUPABASE_DB_URL=postgresql://..." >> .env.local
```

### **Step 3: Use psql Directly**

```bash
# Connect directly
psql "postgresql://postgres.[project-ref]:[password]@db.qtkouemogsymqrzkysar.supabase.co:5432/postgres"

# Or apply migrations
psql "..." < supabase/migrations/XXXXX.sql
```

### **Step 4: Sync Migrations**

```bash
# Apply each migration file manually
for file in supabase/migrations/*.sql; do
  echo "Applying $file..."
  psql "$SUPABASE_DB_URL" < "$file"
done
```

**When to use**: When you need immediate sync and pooler is down

---

## 📋 RECOMMENDED WORKFLOW

Here's what I recommend for your situation:

### **TODAY (While Pooler is Down)**:

**Step 1**: Work Locally
```bash
# Apply schema to local database
docker exec -i supabase_db_theautodoctor psql -U postgres -d postgres < supabase/schema.sql

# Start dev server
pnpm dev

# Create test users via application UI
# Go to: http://localhost:3000/mechanic/signup
```

**Step 2**: Test Phase 1 Locally
- Login with different mechanic types
- Verify access control works
- Confirm sidebar filtering
- Test earnings/analytics blocking

**Step 3**: Document What Changed
Keep track of:
- Which migrations you applied
- Which test users you created
- Any schema changes made

### **LATER (When Pooler Recovers - Usually <24 Hours)**:

**Step 1**: Test Pooler
```bash
pnpm supabase migration list
```

**Step 2**: Auto-Sync
```bash
# Push local changes to remote
pnpm supabase db push

# Verify
pnpm supabase migration list
```

**Step 3**: Verify Production
- Check Supabase Dashboard
- Verify tables updated
- Test application against remote database

### **IF POOLER STAYS DOWN >24 Hours**:

Use Method 2 (Supabase Dashboard SQL Editor):
1. Export local schema changes
2. Apply manually via Dashboard
3. Verify in Table Editor

---

## 🎯 SYNC CHECKLIST

When you're ready to sync, use this checklist:

### **Pre-Sync Checklist**:
- [ ] Local database has all migrations applied
- [ ] Local database has test users
- [ ] Phase 1 tested locally and working
- [ ] You know what changed (migrations, data)
- [ ] Remote pooler is accessible (or using alternative method)

### **Sync Process**:
- [ ] Backup remote database first (Supabase Dashboard → Database → Backups)
- [ ] Apply migrations to remote
- [ ] Verify tables exist
- [ ] Verify RLS policies applied
- [ ] Test application with remote database
- [ ] Verify test users exist (if needed in production)

### **Post-Sync Verification**:
- [ ] `pnpm supabase migration list` shows sync
- [ ] Application connects to remote successfully
- [ ] Test logins work
- [ ] Phase 1 access control works in production

---

## 🔐 SAFETY TIPS

**Before Syncing to Remote**:

1. **Always Backup First**
   - Go to Supabase Dashboard
   - Database → Backups
   - Click "Create backup"
   - Wait for confirmation

2. **Test Locally First**
   - Never apply untested migrations to production
   - Always test on local database first
   - Verify no errors

3. **Apply During Low Traffic**
   - Sync during off-peak hours
   - Notify users if needed
   - Have rollback plan ready

4. **Monitor for Errors**
   - Watch Supabase logs
   - Check application error logs
   - Test critical functionality

---

## 📊 MIGRATION STATUS TRACKING

To track what needs syncing, use this:

```bash
# See what's different between local and remote
pnpm supabase migration list

# Example output:
#   Local          | Remote         | Status
#   ---------------|----------------|--------
#   20251108020831 | 20251108020831 | ✅ Synced
#   20251109XXXXXX | (missing)      | ⚠️ Needs sync
```

Create a file `PENDING_SYNC.md` with:
```markdown
# Pending Sync to Remote

## Migrations to Apply:
- [ ] 20251109020756_add_test_users_data.sql

## Data to Sync:
- [ ] Test user: virtual.mechanic@test.com
- [ ] Test user: workshop.employee@test.com
- [ ] Test user: independent.workshop@test.com

## Verification Steps:
- [ ] Check mechanics table has test users
- [ ] Verify account_type values
- [ ] Test login for each type
```

---

## ❓ WHICH METHOD SHOULD YOU USE?

**Use Method 1 (Automatic)** if:
- ✅ Pooler recovers within 24 hours
- ✅ You're comfortable waiting
- ✅ You want the cleanest approach

**Use Method 2 (Dashboard)** if:
- ✅ Pooler stays down >24 hours
- ✅ You need to sync immediately
- ✅ You prefer visual interface
- ✅ You want manual control

**Use Method 3 (Direct Connection)** if:
- ✅ You're comfortable with command line
- ✅ You have database password
- ✅ You need automation
- ✅ You have many migrations to apply

---

**My Recommendation**: Start with local development now, then use Method 1 (automatic) when pooler recovers. It's the safest and cleanest approach.

**Want me to help you get started with local setup?**

