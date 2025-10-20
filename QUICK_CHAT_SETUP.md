# Quick Chat, Video & Diagnostic Sessions - Setup Guide

## Overview

The system now supports three session types:
- **Quick Chat (chat10)**: $9.99 - Real-time text chat with mechanic
- **Live Video (video15)**: $29.99 - Video consultation
- **Diagnostic Session (diagnostic)**: $49.99 - Full diagnostic workflow

## What Codex Already Implemented

### 1. Database Schema ✅
- Created `sessions`, `session_participants`, and `chat_messages` tables
- Set up RLS policies for participant-only access
- Added indexes for performance

### 2. Stripe Webhook ✅
- Webhook creates session records on `checkout.session.completed`
- Automatically creates `session_participants` for the customer
- Stores metadata (intake_id, customer_email, etc.)

### 3. Chat UI ✅
- Real-time chat interface at `/chat/[id]`
- Live message updates via Supabase Realtime
- Participant tracking (shows when mechanic joins)
- Message history and scrolling

### 4. Fulfillment Logic ✅
- Routes chat10 → `/chat/[sessionId]`
- Routes video15/diagnostic → `/thank-you` (existing flow)
- Handles session creation with correct type

### 5. Type Definitions ✅
- Created TypeScript types for Session, SessionParticipant, ChatMessage

## Required Setup Steps

### Step 1: Enable Supabase Realtime

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/qtkouemogsymqrzkysar
2. Navigate to **Database → Replication**
3. Find the `chat_messages` table
4. Toggle **Realtime** to ON
5. Save changes

### Step 2: Verify Environment Variables

Your `.env.local` already has the correct Stripe prices:

```bash
STRIPE_PRICE_CHAT10=price_1SJjtiPYMTLR5ZJ5RuoPUkA3
STRIPE_PRICE_VIDEO15=price_1SJjy2PYMTLR5ZJ5vcC3rBAm
STRIPE_PRICE_DIAGNOSTIC=price_1SJjzaPYMTLR5ZJ5dfJ33O0g
```

✅ These match your requirements - no changes needed!

### Step 3: Restart Your Application

After enabling Realtime, restart your Next.js server:

```bash
# Stop the server (Ctrl+C)
npm run dev
```

## Testing Checklist

### Test 1: Quick Chat Checkout Flow

1. **Start checkout**:
   ```
   http://localhost:3000/api/checkout?plan=chat10
   ```

2. **Use Stripe test card**:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

3. **After payment**:
   - Should redirect to `/checkout/success?session_id=...`
   - Should then redirect to `/chat/[sessionId]`
   - Should see "Waiting for a mechanic to join"

4. **Verify in Supabase**:
   - Check `sessions` table for new row with `type='chat'`
   - Check `session_participants` table for customer row

### Test 2: Real-time Chat Messaging

1. **Open chat room** (from Test 1)

2. **Send a message**:
   - Type in the textarea
   - Press Enter or click Send
   - Message should appear on the right (blue bubble)

3. **Test realtime** (open in two tabs):
   - Tab 1: Send a message as customer
   - Tab 2: Should see message appear immediately

4. **Verify in Supabase**:
   - Check `chat_messages` table for your messages
   - `sender_id` should be your user ID

### Test 3: Mechanic Assignment (Manual)

For now, mechanics are assigned manually. Use Supabase SQL Editor:

```sql
-- Get the session ID from your test
SELECT id, type, plan, status FROM sessions
WHERE type = 'chat'
ORDER BY created_at DESC
LIMIT 1;

-- Get a mechanic user ID (or create one)
SELECT id, email FROM auth.users LIMIT 5;

-- Add mechanic as participant
INSERT INTO session_participants (session_id, user_id, role)
VALUES (
  'YOUR_SESSION_ID_HERE',
  'MECHANIC_USER_ID_HERE',
  'mechanic'
);
```

After inserting:
- Chat UI should update to show "1 mechanic connected"
- Mechanic can log in and see messages

### Test 4: Video & Diagnostic Still Work

1. **Test Video**:
   ```
   http://localhost:3000/api/checkout?plan=video15
   ```
   - Should create session with `type='video'`
   - Should redirect to `/thank-you` after payment

2. **Test Diagnostic**:
   ```
   http://localhost:3000/api/checkout?plan=diagnostic
   ```
   - Should create session with `type='diagnostic'`
   - Should redirect to `/thank-you` after payment

### Test 5: RLS Policies Work

1. **Test unauthorized access**:
   - Copy your chat session ID
   - Log out
   - Try to visit `/chat/[sessionId]`
   - Should redirect to `/start?redirect=...`

2. **Test different user**:
   - Create another user account
   - Try to visit someone else's chat session
   - Should get 404 (not found)

3. **Test message insert**:
   - Only participants should be able to send messages
   - Non-participants should get RLS error

## Common Issues & Solutions

### Issue: "Realtime not working"
**Solution**:
- Verify Realtime is enabled for `chat_messages` in Supabase Dashboard
- Check browser console for WebSocket connection errors
- Ensure `NEXT_PUBLIC_SUPABASE_URL` starts with `https://`

### Issue: "Webhook not creating sessions"
**Solution**:
- Check webhook is configured in Stripe Dashboard
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check server logs for webhook errors
- For local testing, use Stripe CLI:
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  ```

### Issue: "404 when accessing /chat/[id]"
**Solution**:
- Verify session exists in Supabase `sessions` table
- Check `type='chat'` (not 'video' or 'diagnostic')
- Verify you're a participant in `session_participants`

### Issue: "Can't send messages"
**Solution**:
- Check RLS policies are created (run SQL migration again if needed)
- Verify you're logged in (`auth.uid()` should return your ID)
- Check you're a participant in the session

## Architecture Notes

### How Fulfillment Works

```typescript
// In webhook handler (route.ts)
checkout.session.completed → fulfillCheckout(plan, options)

// In fulfillment.ts
fulfillCheckout() {
  1. Determine session type: chat10→'chat', video15→'video', etc.
  2. Create/update sessions row
  3. Add customer to session_participants
  4. Return route: /chat/[id] or /thank-you
}
```

### How Chat Works

```typescript
// In page.tsx (server component)
1. Verify user is logged in
2. Fetch session from DB
3. Verify user is a participant
4. Fetch initial messages
5. Render <ChatRoom /> with SSR data

// In ChatRoom.tsx (client component)
1. Display initial messages
2. Subscribe to Realtime for new messages
3. Subscribe to Realtime for participant changes
4. Handle send message with RLS
```

### RLS Security Model

```sql
-- Users can only see sessions they participate in
sessions: WHERE EXISTS (SELECT 1 FROM session_participants ...)

-- Users can only see participants for their sessions
session_participants: WHERE EXISTS (SELECT 1 FROM session_participants ...)

-- Users can only read/write messages for their sessions
chat_messages: WHERE EXISTS (SELECT 1 FROM session_participants ...)
  AND sender_id = auth.uid()
```

## Next Steps (Future Enhancements)

1. **Auto-assign mechanics**:
   - Add mechanic availability system
   - Auto-match on session creation
   - Send email/SMS notifications

2. **Chat features**:
   - File/image attachments
   - Typing indicators
   - Read receipts
   - Message reactions

3. **Session management**:
   - Time limits (10 min for chat)
   - Auto-close after timeout
   - Session ratings/feedback

4. **Admin dashboard**:
   - View active chat sessions
   - Manually assign mechanics
   - Join sessions as observer

## File Reference

Key files modified/created:

- [supabase/2025-10-19_sessions_chat.sql](supabase/2025-10-19_sessions_chat.sql) - Database schema
- [src/lib/fulfillment.ts](src/lib/fulfillment.ts) - Session creation logic
- [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts) - Stripe webhook
- [src/app/chat/[id]/page.tsx](src/app/chat/[id]/page.tsx) - Chat page (server)
- [src/app/chat/[id]/ChatRoom.tsx](src/app/chat/[id]/ChatRoom.tsx) - Chat UI (client)
- [src/app/checkout/success/page.tsx](src/app/checkout/success/page.tsx) - Post-checkout redirect
- [src/app/api/sessions/resolve-by-stripe/route.ts](src/app/api/sessions/resolve-by-stripe/route.ts) - Session lookup
- [src/types/supabase.ts](src/types/supabase.ts) - TypeScript types
- [src/config/pricing.ts](src/config/pricing.ts) - Pricing configuration

---

**Ready to test!** Start with the Supabase Realtime setup, then run through the testing checklist above.
