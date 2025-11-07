# Stripe Webhook Setup for Local Development

## The Problem

When you complete a checkout in local development, Stripe can't automatically send webhooks to `localhost`. This means:
- Payment completes ✅
- But the webhook never fires ❌
- So the session record is never created ❌
- The success page spins forever trying to find it ❌

## Solution: Use Stripe CLI

### Step 1: Login to Stripe CLI

Open a **new terminal** and run:

```bash
stripe login
```

This will open your browser to authorize the CLI.

### Step 2: Forward Webhooks to Localhost

In the same terminal, run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

You should see output like:

```
> Ready! You are using Stripe API Version [2024-xx-xx]. Your webhook signing secret is whsec_xxxxx...
```

### Step 3: Update Your .env.local

Copy the webhook signing secret from the output above and update your `.env.local`:

```bash
# Replace this line:
STRIPE_WEBHOOK_SECRET=whsec_local_stub

# With the secret from stripe listen:
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

### Step 4: Restart Your Dev Server

Stop your Next.js server (Ctrl+C) and restart:

```bash
npm run dev
```

### Step 5: Test the Flow

1. Visit: `http://localhost:3000/api/checkout?plan=chat10`
2. Use test card: `4242 4242 4242 4242`
3. Complete checkout
4. Watch the `stripe listen` terminal - you should see the webhook event!
5. The success page should now redirect you to `/chat/[sessionId]`

## Keeping It Running

You need to keep **TWO terminals** open:

**Terminal 1**: Stripe CLI
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Terminal 2**: Next.js Dev Server
```bash
npm run dev
```

## Troubleshooting

### "stripe: command not found"
You already have Stripe CLI installed at `C:\Users\Faiz Hashmi\scoop\shims\stripe.exe`, so this shouldn't happen.

### Webhook secret doesn't work
- Make sure you copied the FULL secret starting with `whsec_`
- Make sure you restarted the dev server after updating `.env.local`
- Check there are no extra spaces in the `.env.local` file

### Events aren't showing in stripe listen
- Make sure you're testing in the same Stripe account
- The event will only fire AFTER you complete checkout
- Check the terminal output for any errors

### Session still not found
- Check the `stripe listen` terminal for any errors
- Open browser console and check for API errors
- Verify the webhook endpoint is responding: check your Next.js terminal for webhook logs

## Alternative: Manual Session Creation (Quick Test)

If you just want to test the chat UI without setting up webhooks, you can manually create a session in Supabase:

```sql
-- 1. Get your user ID
SELECT id, email FROM auth.users LIMIT 1;

-- 2. Create a session manually
INSERT INTO sessions (
  stripe_session_id,
  type,
  plan,
  status,
  customer_user_id
) VALUES (
  'cs_test_manual_' || gen_random_uuid()::text,
  'chat',
  'chat10',
  'pending',
  'YOUR_USER_ID_HERE'  -- Replace with your actual user ID from step 1
)
RETURNING id;

-- 3. Add yourself as a participant
INSERT INTO session_participants (
  session_id,
  user_id,
  role
) VALUES (
  'SESSION_ID_FROM_STEP_2',  -- Replace with the ID returned above
  'YOUR_USER_ID_HERE',  -- Same user ID from step 1
  'customer'
);

-- 4. Now visit: http://localhost:3000/chat/SESSION_ID_FROM_STEP_2
```

This lets you test the chat interface without going through Stripe checkout!

## For Production

In production, you'll set up a real webhook in the Stripe Dashboard:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select event: `checkout.session.completed`
4. Copy the signing secret to your production env vars
