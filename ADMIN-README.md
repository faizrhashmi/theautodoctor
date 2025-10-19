# Admin Dashboard (Password-gated)

## What this adds
- `middleware.ts` — protects all `/admin/*` routes (redirects to `/admin/login` if not authed)
- `/admin/login` — password form (client)
- `/api/admin/login` — checks `ADMIN_DASH_PASSWORD` and sets cookie `aad_admin=1`
- `/api/admin/logout` — clears cookie
- `/admin/intakes` — lists latest intakes and provides **signed, time-limited links** to uploaded files

## Env
Set in `.env.local` (server only):
```
ADMIN_DASH_PASSWORD=choose-a-strong-password
```
You already need Supabase server creds:
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=intakes   # optional if not 'intakes'
```

## Notes
- This is a simple dev-grade gate. For production, use a proper auth provider (Clerk, Auth.js, etc.) and role-based policies.
- The files are in a private Supabase bucket. The dashboard generates 1-hour signed URLs so mechanics can open them.
