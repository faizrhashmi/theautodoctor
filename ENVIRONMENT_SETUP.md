# Environment Setup Guide

## Quick Start (Phase 0 Requirements)

These are the **minimum required** environment variables to run the updated signup flows:

### 1. Generate Encryption Key

Run this command to generate a secure encryption key:

```bash
openssl rand -hex 32
```

Copy the output and add to `.env.local`:
```env
ENCRYPTION_KEY=<your-generated-key>
```

**Why needed:** Encrypts mechanic SIN/Business Numbers using AES-256-GCM (PIPEDA/GDPR compliance)

---

### 2. Set Up Upstash Redis (Free Tier)

**Why needed:** Rate limiting for signup/login endpoints (prevents brute force attacks)

#### Steps:

1. Go to [https://upstash.com](https://upstash.com)
2. Sign up (free tier includes 10,000 requests/day)
3. Click "Create Database"
4. Choose:
   - **Type:** Redis
   - **Name:** theautodoctor-ratelimit
   - **Region:** Choose closest to your users (e.g., US East)
   - **Eviction:** Enable (recommended)

5. After creation, go to database details and copy:
   - **REST URL** → `UPSTASH_REDIS_REST_URL`
   - **REST Token** → `UPSTASH_REDIS_REST_TOKEN`

6. Add to `.env.local`:
```env
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

---

### 3. Verify Existing Supabase Variables

Make sure these are already in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

---

## Phase 1 Requirements (Optional for now)

### Twilio (Phone Verification)

**When needed:** Before launching workshop beta (Q1 2026)

1. Sign up at [https://www.twilio.com](https://www.twilio.com)
2. Create a Verify Service:
   - Go to **Verify** → **Services** → **Create new Service**
   - Name: "TheAutoDoctor Verification"
   - Copy the **Service SID**

3. Get credentials:
   - **Account SID** → Dashboard
   - **Auth Token** → Dashboard
   - **Phone Number** → Buy a number (or use trial number)

4. Add to `.env.local`:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid
```

---

## Complete .env.local Template

Create a `.env.local` file with the following (copy from `.env.example`):

```env
# ============================================================================
# Supabase Configuration
# ============================================================================
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ============================================================================
# Security & Encryption (REQUIRED - Phase 0)
# ============================================================================
ENCRYPTION_KEY=<run: openssl rand -hex 32>

# Upstash Redis (REQUIRED - Phase 0)
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# ============================================================================
# Payment Processing (Already configured)
# ============================================================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# ============================================================================
# Twilio (OPTIONAL - Phase 1)
# ============================================================================
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_VERIFY_SERVICE_SID=

# ============================================================================
# Feature Flags (Phase 1+)
# ============================================================================
NEXT_PUBLIC_ENABLE_WORKSHOPS=false
NEXT_PUBLIC_ENABLE_CORPORATE=false
NEXT_PUBLIC_BETA_MODE=false

# ============================================================================
# Application Settings
# ============================================================================
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=development
```

---

## Verification

After setting up environment variables, verify they're loaded:

```bash
# Check if encryption key is set
node -e "console.log(process.env.ENCRYPTION_KEY ? 'ENCRYPTION_KEY: Set ✓' : 'ENCRYPTION_KEY: Missing ✗')"

# Check if Upstash is set
node -e "console.log(process.env.UPSTASH_REDIS_REST_URL ? 'UPSTASH_REDIS_REST_URL: Set ✓' : 'UPSTASH_REDIS_REST_URL: Missing ✗')"
```

Or create a test API route to verify:

```typescript
// app/api/test-env/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    encryptionKey: !!process.env.ENCRYPTION_KEY,
    upstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
    upstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  })
}
```

Then visit: `http://localhost:3000/api/test-env`

Expected response:
```json
{
  "encryptionKey": true,
  "upstashUrl": true,
  "upstashToken": true,
  "supabaseUrl": true
}
```

---

## Security Notes

⚠️ **NEVER commit `.env.local` to git**

The `.env.local` file is already in `.gitignore`. Double-check:

```bash
cat .gitignore | grep env
```

Should show:
```
.env*.local
.env
```

⚠️ **Rotate keys regularly**

- Encryption key: Rotate every 90 days (requires re-encrypting data)
- Upstash token: Can regenerate in Upstash dashboard
- Twilio credentials: Rotate in Twilio console

---

## Troubleshooting

### "Cannot find module '@upstash/ratelimit'"

```bash
npm install @upstash/ratelimit @upstash/redis
```

### "ENCRYPTION_KEY is not defined"

Make sure `.env.local` is in the project root and restart your dev server:

```bash
# Stop server (Ctrl+C)
npm run dev
```

### Redis connection errors

Check that your Upstash URL and token are correct:
- URL should start with `https://`
- Token is the **REST Token**, not the Redis password

---

## Next Steps

After environment setup:

1. ✅ Run database migrations (see [MIGRATION_FIX_SUMMARY.md](MIGRATION_FIX_SUMMARY.md))
2. ✅ Test signup flows
3. ✅ Continue to Phase 1 (Workshop Features)
