# Docker + Supabase Setup Guide - Step by Step

**Goal:** Set up local Supabase, baseline your migrations, and fix migration tracking forever.

**Time Needed:** 30-45 minutes

---

## Step 1: Install & Start Docker Desktop

### 1.1 Install Docker Desktop

You mentioned you downloaded it. If not installed yet:

1. **Run the installer** you downloaded
2. **Follow the installation wizard**
3. **Restart your computer** if prompted

### 1.2 Start Docker Desktop

1. **Open Docker Desktop** from Start Menu
2. **Wait for "Docker Desktop is running"** message (bottom left)
3. **Accept any terms/conditions** if first time

### 1.3 Verify Docker is Running

Open your terminal and run:

```powershell
docker --version
```

**Expected output:**
```
Docker version 24.x.x, build xxxxx
```

If you see this, Docker is ready! ✅

---

## Step 2: Update Supabase CLI (Recommended)

You're on v2.51.0, latest is v2.54.11. Update for better features:

```powershell
pnpm add -g supabase@latest
```

Verify:

```powershell
pnpm exec supabase --version
```

Should show `2.54.11` or newer.

---

## Step 3: Initialize Supabase (If Not Already Done)

Check if you have `supabase/config.toml`:

```powershell
dir supabase\config.toml
```

**If file exists:** Skip to Step 4

**If file NOT found:**

```powershell
pnpm exec supabase init
```

This creates the `supabase` folder with config.

---

## Step 4: Start Local Supabase

This downloads and starts Docker containers for a local Supabase instance:

```powershell
pnpm exec supabase start
```

**What happens:**
- Downloads Docker images (first time: ~5-10 minutes)
- Starts PostgreSQL, API, Studio, etc.
- Shows connection details when done

**Expected output (when done):**
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
        anon key: eyJ...
service_role key: eyJ...
```

**Copy and save these details!** You'll need them.

---

## Step 5: Backup Current Migrations

Before we baseline, let's backup your 109 migrations:

```powershell
mkdir supabase\migrations_backup_$(Get-Date -Format "yyyyMMdd_HHmmss")
move supabase\migrations\*.sql supabase\migrations_backup_$(Get-Date -Format "yyyyMMdd_HHmmss")\
```

This moves all `.sql` files to a backup folder with timestamp.

**Verify migrations folder is empty:**

```powershell
dir supabase\migrations
```

Should show "0 File(s)".

---

## Step 6: Pull Baseline Migration from Production

This creates a migration that matches your current production database:

```powershell
pnpm exec supabase db pull
```

**What this does:**
1. Connects to your remote Supabase database
2. Reads the entire schema (tables, columns, policies, functions, etc.)
3. Creates a new migration file with everything
4. This migration file represents your "baseline" - the current state

**Expected output:**
```
Connecting to remote database...
Introspecting schema...
Creating migration file...
Created migration: supabase/migrations/20251107xxxxxx_baseline.sql
```

**Verify the baseline file was created:**

```powershell
dir supabase\migrations
```

Should show 1 file: `202511xxxxxxxx_baseline.sql` (or similar).

---

## Step 7: Add Back the Voice Transcripts Migration

Now copy your voice transcripts migration back:

```powershell
copy supabase\migrations_backup_*\20251107000001_add_voice_transcripts_to_session_files.sql supabase\migrations\
```

**Verify you now have 2 migrations:**

```powershell
dir supabase\migrations
```

Should show:
1. `202511xxxxxxxx_baseline.sql` (from pull)
2. `20251107000001_add_voice_transcripts_to_session_files.sql` (voice transcripts)

---

## Step 8: Test Locally

Let's apply these migrations to your local database and test:

```powershell
pnpm exec supabase db reset
```

**What this does:**
1. Drops local database
2. Recreates it
3. Applies baseline migration
4. Applies voice transcripts migration
5. Seeds data (if you have seed files)

**Expected output:**
```
Resetting local database...
Applying migration 202511xxxxxxxx_baseline.sql...
Applying migration 20251107000001_add_voice_transcripts_to_session_files.sql...
Finished supabase db reset.
```

**If you see errors here, STOP and tell me what the error is. We'll fix it before pushing to production.**

---

## Step 9: Verify Voice Transcripts Schema Locally

Let's check if the columns were added:

1. **Open Supabase Studio** in your browser:
   ```
   http://localhost:54323
   ```

2. **Go to Table Editor** (left sidebar)

3. **Click on `session_files` table**

4. **Verify these columns exist:**
   - `file_category` (text, default: 'upload')
   - `transcript` (text, nullable)
   - `tags` (text array, default: {})

**If you see all 3 columns, perfect! ✅**

---

## Step 10: Push Baseline to Production

Now we'll tell your remote database which migrations are already applied:

```powershell
pnpm exec supabase db push --dry-run
```

**What to expect:**
- Should say it will apply the **voice transcripts migration only**
- Should NOT try to apply 109 migrations
- Should NOT try to apply the baseline (because it matches production)

**If dry-run looks good, run the real push:**

```powershell
pnpm exec supabase db push
```

**Expected output:**
```
Applying migration 20251107000001_add_voice_transcripts_to_session_files.sql...
Finished supabase db push.
```

---

## Step 11: Verify in Production

1. **Go to Supabase Dashboard:**
   https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **Navigate to:** Table Editor → session_files

3. **Verify columns exist:**
   - file_category
   - transcript
   - tags

4. **Check migration history:**
   ```powershell
   pnpm exec supabase migration list
   ```

   Should now show your baseline + voice transcripts migration as applied remotely.

---

## Step 12: Test Voice Notes in Your App

1. **Start your dev server:**
   ```powershell
   pnpm dev
   ```

2. **Open your app** in browser

3. **Start a video session** (as mechanic)

4. **Try recording a voice note:**
   - Click microphone button
   - Speak: "Test voice transcript"
   - Stop recording

5. **Check database:**
   - Go to Supabase Dashboard → Table Editor → session_files
   - Look for new row with `file_category = 'voice_transcript'`
   - Should have your transcript text

**If you see the transcript, SUCCESS! 🎉**

---

## ✅ What You've Accomplished

- ✅ Docker running locally
- ✅ Local Supabase development environment
- ✅ Baseline migration created (matches production)
- ✅ Old migrations archived safely
- ✅ Migration tracking fixed
- ✅ Voice transcripts migration applied
- ✅ Can test migrations locally before production
- ✅ Proper workflow established

---

## 🔄 Future Workflow (When You Need to Create Migrations)

### Creating New Migration:

```powershell
pnpm exec supabase migration new your_migration_name
```

Edits the new file, add your SQL.

### Test Locally:

```powershell
pnpm exec supabase db reset
```

### Check Changes:

```powershell
pnpm exec supabase db diff
```

### Push to Production:

```powershell
pnpm exec supabase db push --dry-run  # Check first
pnpm exec supabase db push            # Actually push
```

---

## 🆘 Troubleshooting

### "Docker is not running"

1. Open Docker Desktop
2. Wait for it to fully start
3. Try command again

### "Port already in use"

Stop your local dev server first, then `supabase start`.

### Migration fails during `db reset`

1. Read the error message carefully
2. Fix the SQL in the migration file
3. Run `pnpm exec supabase db reset` again
4. Repeat until it works

### "Cannot connect to remote database"

Check your `.env.local` has correct `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

Also verify you're logged in:

```powershell
pnpm exec supabase login
```

---

## 📝 Quick Reference Commands

```powershell
# Start local Supabase
pnpm exec supabase start

# Stop local Supabase
pnpm exec supabase stop

# Reset local database (re-run all migrations)
pnpm exec supabase db reset

# Check migration status
pnpm exec supabase migration list

# Create new migration
pnpm exec supabase migration new migration_name

# See what would be pushed (dry run)
pnpm exec supabase db push --dry-run

# Actually push migrations
pnpm exec supabase db push

# Pull schema changes from production
pnpm exec supabase db pull

# Open Studio
http://localhost:54323
```

---

## Ready to Start?

**Let's begin with Step 1!**

Open your terminal and run:

```powershell
docker --version
```

Tell me what you see, and we'll go from there! 🚀
