# Supabase Migration Workflow Guide

This guide will help you manage your Supabase database properly using Docker and the Supabase CLI, avoiding the manual copy-paste issues you've been having.

## Current Situation

- You have 100+ migration files in `supabase/migrations_backup/`
- These were manually copied/pasted into Supabase dashboard
- Your local migrations are out of sync with your remote database
- This causes confusion and errors

## The Solution

Use **Supabase CLI + Docker** to manage everything automatically.

---

## Prerequisites

### 1. Install Docker Desktop

Download and install from: https://www.docker.com/products/docker-desktop/

**Important**: Make sure Docker Desktop is running before using Supabase CLI commands.

### 2. Verify Supabase CLI

You already have it installed. To update to the latest version:

```bash
pnpm add -D supabase@latest
```

---

## How Supabase Migrations Work

### The Three Environments

1. **Local Database** (Docker) - Your development environment
2. **Migration Files** (`supabase/migrations/`) - Source of truth
3. **Remote Database** (Supabase Cloud) - Production

### The Workflow

```
┌─────────────────┐
│  Make Changes   │
│   (SQL/Code)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Migration│  ← pnpm supabase db diff
│      File       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Test Locally   │  ← pnpm supabase db reset
│   (Docker)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Deploy to Prod  │  ← pnpm supabase db push
│  (Supabase)     │
└─────────────────┘
```

---

## Step-by-Step Setup

### Step 1: Start Fresh

Since your migrations are out of sync, we'll create a baseline from your current production database.

```bash
# 1. Start Docker Desktop (manually)

# 2. Link to your Supabase project
pnpm supabase link --project-ref qtkouemogsymqrzkysar

# 3. Pull your CURRENT production schema as a baseline migration
pnpm supabase db pull

# This creates a migration file with your entire current schema
```

This creates a **single migration file** that represents your current production state.

### Step 2: Clean Up Old Migrations

```bash
# Move all old migrations to an archive folder (already done - they're in migrations_backup/)
# Keep them for reference but don't use them anymore
```

### Step 3: Start Local Development Environment

```bash
# Start local Supabase (Docker containers)
pnpm supabase start

# This will:
# - Start PostgreSQL database
# - Start Supabase Studio (UI)
# - Start Auth, Storage, Realtime services
# - Apply all migrations from supabase/migrations/
```

After starting, you'll see:

```
API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
```

### Step 4: Access Supabase Studio

Open http://127.0.0.1:54323 in your browser.

This is your **local Supabase dashboard** - same as the cloud one, but running in Docker!

---

## Daily Development Workflow

### Making Database Changes

**Option 1: Create Migration Manually** (Recommended for complex changes)

```bash
# 1. Create a new migration file
pnpm supabase migration new add_new_feature

# 2. Edit the file in supabase/migrations/
# Add your SQL

# 3. Apply to local database
pnpm supabase db reset

# 4. Test your changes
```

**Option 2: Use Studio Then Generate Migration** (Quick for simple changes)

```bash
# 1. Make changes in Studio (http://127.0.0.1:54323)

# 2. Generate migration from changes
pnpm supabase db diff -f add_new_feature

# This creates a migration file with your changes
```

### Testing Changes Locally

```bash
# Reset local database and reapply all migrations
pnpm supabase db reset

# Run your app locally
pnpm dev
```

### Deploying to Production

```bash
# 1. Make sure your migrations work locally
pnpm supabase db reset

# 2. Push to production
pnpm supabase db push

# This applies all new migrations to your remote database
```

---

## Important Commands

### Starting/Stopping

```bash
pnpm supabase start        # Start local Supabase (Docker)
pnpm supabase stop         # Stop local Supabase
pnpm supabase stop --no-backup  # Stop and delete data
```

### Database Operations

```bash
pnpm supabase db reset     # Reset local DB, reapply migrations
pnpm supabase db push      # Push migrations to remote
pnpm supabase db pull      # Pull schema from remote
pnpm supabase db diff -f name  # Generate migration from changes
```

### Inspection

```bash
pnpm supabase status       # Check what's running
pnpm supabase migration list  # See all migrations
```

---

## Common Scenarios

### 1. "I made changes in production manually"

**DON'T DO THIS!** But if you did:

```bash
# Pull the changes as a migration
pnpm supabase db pull
```

### 2. "My local database is messed up"

```bash
# Nuke it and start fresh
pnpm supabase stop --no-backup
pnpm supabase start
```

### 3. "I want to make a schema change"

```bash
# Option A: Create migration manually
pnpm supabase migration new my_change
# Edit the file, then:
pnpm supabase db reset

# Option B: Use Studio
# Make changes in Studio at http://127.0.0.1:54323
pnpm supabase db diff -f my_change
```

### 4. "I want to deploy to production"

```bash
# Test locally first
pnpm supabase db reset
pnpm dev  # Test your app

# Then deploy
pnpm supabase db push
```

---

## The Golden Rules

1. **NEVER copy-paste SQL into production dashboard**
2. **ALWAYS create migration files**
3. **ALWAYS test locally with `pnpm supabase db reset` before deploying**
4. **Migration files are your source of truth**
5. **Keep Docker Desktop running when developing**

---

## Troubleshooting

### "Cannot connect to Docker"

- Make sure Docker Desktop is running
- Check system tray for Docker icon

### "Port already in use"

```bash
pnpm supabase stop
# Then start again
pnpm supabase start
```

### "Migrations failed to apply"

```bash
# Check which migration failed
pnpm supabase migration list

# Fix the migration file
# Then reset
pnpm supabase db reset
```

### "Local and remote are out of sync"

```bash
# Pull remote schema
pnpm supabase db pull

# This creates a migration representing remote state
# Review it, then continue working
```

---

## Next Steps

1. Start Docker Desktop
2. Run `pnpm supabase link --project-ref qtkouemogsymqrzkysar`
3. Run `pnpm supabase db pull` (creates baseline)
4. Run `pnpm supabase start` (starts local environment)
5. Open http://127.0.0.1:54323 (Supabase Studio)
6. Start developing with migrations!

---

## Additional Resources

- Supabase CLI Docs: https://supabase.com/docs/guides/cli
- Local Development: https://supabase.com/docs/guides/local-development
- Migrations Guide: https://supabase.com/docs/guides/cli/local-development#database-migrations
