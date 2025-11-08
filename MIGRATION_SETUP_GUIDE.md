# How to Apply Voice Transcripts Migration

**Migration:** `20251107000001_add_voice_transcripts_to_session_files.sql`

**Problem:** Supabase CLI wants to apply 109 migrations, but most are already applied manually to your database.

---

## ✅ OPTION 1: Supabase Dashboard (EASIEST) ⭐

### Steps:

1. **Go to Supabase Dashboard**
   - Open https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "+ New query"

3. **Copy & Paste this SQL:**
   ```sql
   -- Apply Voice Transcripts Migration
   BEGIN;

   -- Add file_category column
   ALTER TABLE public.session_files
   ADD COLUMN IF NOT EXISTS file_category TEXT DEFAULT 'upload';

   -- Add check constraint
   DO $$
   BEGIN
       IF NOT EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conname = 'session_files_file_category_check'
           AND conrelid = 'public.session_files'::regclass
       ) THEN
           ALTER TABLE public.session_files
           ADD CONSTRAINT session_files_file_category_check
           CHECK (file_category IN ('upload', 'voice_transcript', 'screenshot'));
       END IF;
   END $$;

   -- Add transcript field
   ALTER TABLE public.session_files
   ADD COLUMN IF NOT EXISTS transcript TEXT;

   -- Add tags array
   ALTER TABLE public.session_files
   ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

   -- Add indexes
   CREATE INDEX IF NOT EXISTS idx_session_files_category
   ON public.session_files(file_category);

   CREATE INDEX IF NOT EXISTS idx_session_files_transcript
   ON public.session_files
   USING gin(to_tsvector('english', transcript));

   -- Update comments
   COMMENT ON COLUMN public.session_files.file_category IS 'Category: upload (file upload), voice_transcript (voice note), screenshot (captured image)';
   COMMENT ON COLUMN public.session_files.transcript IS 'Text transcription for voice notes';
   COMMENT ON COLUMN public.session_files.tags IS 'Array of tags for categorizing files (Engine, Brakes, etc.)';

   COMMIT;
   ```

4. **Click "Run"** (or press Ctrl+Enter)

5. **Verify Success:**
   - Should see "Success. No rows returned"
   - Run this to verify columns were added:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'session_files'
   AND column_name IN ('file_category', 'transcript', 'tags');
   ```

---

## ⚡ OPTION 2: Use psql (IF YOU HAVE IT)

### Steps:

1. **Get your database connection string:**
   - Supabase Dashboard → Settings → Database
   - Copy "Connection string" (Direct connection)
   - Should look like: `postgres://postgres.[PROJECT]:[PASSWORD]@[HOST]:5432/postgres`

2. **Run the migration:**
   ```bash
   psql "YOUR_CONNECTION_STRING" -f apply_voice_transcripts_migration.sql
   ```

3. **Or run inline:**
   ```bash
   psql "YOUR_CONNECTION_STRING" -c "ALTER TABLE public.session_files ADD COLUMN IF NOT EXISTS file_category TEXT DEFAULT 'upload'; ALTER TABLE public.session_files ADD COLUMN IF NOT EXISTS transcript TEXT; ALTER TABLE public.session_files ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];"
   ```

---

## 🔧 OPTION 3: Fix Supabase CLI Migration Tracking

This is more complex but fixes the root issue.

### Problem:
Your database has tables created manually/outside migrations, so Supabase CLI doesn't know what's already applied.

### Solution - Baseline the migrations:

1. **Update Supabase CLI:**
   ```bash
   pnpm add -g supabase@latest
   ```

2. **Pull current schema:**
   ```bash
   pnpm exec supabase db pull
   ```
   This will create a new migration with your current schema.

3. **Delete old migrations** (BACKUP FIRST):
   ```bash
   # Move old migrations to backup folder
   mkdir supabase/migrations_backup
   move supabase/migrations/*.sql supabase/migrations_backup/
   ```

4. **Keep only the new ones:**
   - Keep the pulled schema migration
   - Keep `20251107000001_add_voice_transcripts_to_session_files.sql`

5. **Push:**
   ```bash
   pnpm exec supabase db push
   ```

**⚠️ This is risky** - only do if you understand git and can restore if needed.

---

## ✅ RECOMMENDED: Option 1 (Dashboard)

**Just use the Supabase Dashboard SQL Editor.** It's:
- ✅ Safest (transactions)
- ✅ Fastest (2 minutes)
- ✅ Visual feedback
- ✅ No CLI issues

After you run it, voice notes will work! 🎤

---

## 🧪 After Migration - Test Voice Notes

1. Start a video session
2. Click voice note button (microphone)
3. Speak: "Test transcript"
4. Click button again to stop
5. Check database:
   ```sql
   SELECT * FROM session_files
   WHERE file_category = 'voice_transcript'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

Should see your test transcript!

---

## 📝 Files Created

I've created these helper files for you:

1. **`apply_voice_transcripts_migration.sql`**
   - Standalone SQL script
   - Can run in any SQL editor
   - Safe with transactions

2. **`MIGRATION_SETUP_GUIDE.md`** (this file)
   - Full instructions
   - 3 different methods
   - Testing guide

---

## Need Help?

If Option 1 doesn't work, let me know:
- What error you see
- Screenshot if possible
- I'll help debug!
