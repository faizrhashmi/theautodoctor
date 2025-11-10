# Supabase Quick Start Guide

## ✅ Setup Complete!

Your Supabase development environment is now configured:

- **Local Database**: Running in Docker
- **Baseline Migration**: Created from your production database
- **Supabase Studio**: Available at http://127.0.0.1:54323

---

## 🚀 Daily Workflow

### Starting Your Day

```bash
# Start Supabase (starts Docker containers)
db-dev start

# Or manually:
pnpm supabase start
```

### Making Database Changes

**Option 1: Create migration manually (recommended)**

```bash
# Create new migration file
db-dev new add_user_feature

# Edit the file in supabase/migrations/
# Add your SQL changes

# Test locally
db-dev reset
```

**Option 2: Use Studio UI**

```bash
# Open Studio
db-dev studio

# Make changes in the UI at http://127.0.0.1:54323

# Generate migration from changes
pnpm supabase db diff -f my_changes
```

### Testing Your Changes

```bash
# Reset local DB (reapplies all migrations from scratch)
db-dev reset

# Start your app
pnpm dev
```

### Deploying to Production

```bash
# IMPORTANT: Test locally first!
db-dev reset
pnpm dev

# Deploy to production
db-dev push
```

---

## 📋 Helper Commands

I created a `db-dev.cmd` script for you:

```bash
db-dev start    # Start local Supabase
db-dev stop     # Stop local Supabase
db-dev reset    # Reset DB and reapply migrations
db-dev new NAME # Create new migration
db-dev push     # Deploy to production
db-dev studio   # Open Supabase Studio
db-dev status   # Check status
```

---

## 🔑 Important URLs

- **Supabase Studio**: http://127.0.0.1:54323
- **API URL**: http://127.0.0.1:54321
- **Database URL**: postgresql://postgres:postgres@127.0.0.1:54322/postgres

---

## ⚠️ The Golden Rules

1. **NEVER** manually copy-paste SQL into production dashboard
2. **ALWAYS** create migration files
3. **ALWAYS** test locally with `db-dev reset` before deploying
4. **ALWAYS** commit migration files to git
5. Keep Docker Desktop running when developing

---

## 🛠️ Common Tasks

### See all migrations

```bash
pnpm supabase migration list
```

### Check what's running

```bash
db-dev status
```

### View logs

```bash
pnpm supabase logs
```

### Stop and delete all data

```bash
pnpm supabase stop --no-backup
```

---

## 🆘 Troubleshooting

### "Cannot connect to Docker"
- Make sure Docker Desktop is running

### "Port already in use"
- Run `db-dev stop` then `db-dev start`

### "Migration failed"
- Check the error message
- Fix the migration file
- Run `db-dev reset`

### "Local and remote out of sync"
- This shouldn't happen anymore!
- If it does: `pnpm supabase db pull`

---

## 📝 Example Workflow

```bash
# 1. Start your day
db-dev start

# 2. Create a new feature
db-dev new add_comments_table

# 3. Edit supabase/migrations/TIMESTAMP_add_comments_table.sql
# Add your SQL:
# CREATE TABLE comments (...);

# 4. Test locally
db-dev reset
pnpm dev

# 5. Commit
git add supabase/migrations/
git commit -m "Add comments table"

# 6. Deploy to production
db-dev push

# 7. Done! 🎉
```

---

## 🗂️ Migration Files

Your migrations are in: `supabase/migrations/`

- **20251108020831_remote_schema.sql** - Your baseline (current prod state)
- Future migrations will appear here

Old migrations are archived in: `supabase/migrations_backup/` (for reference only)

---

## 🎯 Next Steps

1. Try creating a test migration: `db-dev new test_migration`
2. Open Supabase Studio: `db-dev studio`
3. Explore your database schema
4. Start building! 🚀
