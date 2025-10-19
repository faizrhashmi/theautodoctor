# AskAutoDoctor — Intake + Session Flow Pack

## 1) Copy files into your Next.js app (App Router)
Drop the `src/` folder into your project and merge. Add `.env.local` using `.env.local.example` as a template.

## 2) Install deps
```bash
npm i stripe @livekit/components-react livekit-client livekit-server-sdk @livekit/components-styles @supabase/supabase-js
```

## 3) Env vars
Set these in `.env.local` (local) and in Render (production):
- NEXT_PUBLIC_APP_URL
- STRIPE_SECRET_KEY, STRIPE_PRICE_* (3), STRIPE_WEBHOOK_SECRET
- LIVEKIT_API_KEY, LIVEKIT_API_SECRET, NEXT_PUBLIC_LIVEKIT_URL
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (optional but recommended)

## 4) Database (optional for now)
Run `supabase/schema.sql` on your Supabase project (SQL editor).

## 5) Flow
- `/pricing` → user selects a plan → **/intake?plan=...**
- `/intake` → collects vehicle info, VIN decode, uploads → submit
  - **trial** → `/start?trial=1&intake_id=...` → token → `/video`
  - **paid** → `/api/checkout?plan=...&intake_id=...` → Stripe → `/thank-you?session_id=...`
- `/thank-you` → Start session + **Mechanic invite link** (copy)
- `/start` → verifies + mints token → redirects to `/video`
- `/video` → LiveKit prefab UI (video + controls + chat)

You're ready to test and iterate. 🎉
