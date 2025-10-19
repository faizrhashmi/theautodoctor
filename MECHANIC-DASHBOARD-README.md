# Mechanic Dashboard + Filters

## What this adds
- Secure, hashed password sign-up/login for mechanics
- Cookie session `aad_mech` (30 days)
- Protected route namespace: `/dashboard/*`
- Filters on `/dashboard/intakes`:
  - Search (name/email/phone/city/VIN/make/model/concern)
  - Plan (trial/chat10/video15/diagnostic)
  - Date range (from/to)
  - Pagination (25 per page)
- Signed file links (1-hour) for private bucket files

## Env
```
# Keep existing Supabase creds
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Optional (if not 'intakes')
# SUPABASE_STORAGE_BUCKET=intake
```

## DB setup
Run this SQL in Supabase SQL Editor:
- `supabase/2025-10-18_mechanics.sql` (creates tables public.mechanics, public.mechanic_sessions)

## Routes
- `/mechanic/signup` — create mechanic account
- `/mechanic/login` — login mechanic
- `/api/mechanics/signup|login|logout` — server endpoints
- `/dashboard/intakes` — main list (requires cookie set by signup/login or admin)

## Notes
- This uses PBKDF2 (sha512) with a random salt for password hashing; no external deps.
- For production, consider moving to Supabase Auth or an auth provider and adding RLS policies for per-mechanic resources.
