# Mechanic Dashboard Setup Guide

## What's Been Created

### 1. Mechanic Dashboard (`/admin/sessions`)
- **Location**: [src/app/admin/(shell)/sessions/page.tsx](src/app/admin/(shell)/sessions/page.tsx)
- Shows two sections:
  - **Your Active Sessions**: Sessions you're currently in
  - **Available Sessions**: Pending sessions waiting for a mechanic
- Real-time updates when new sessions are created

### 2. Join Session API
- **Location**: [src/app/api/admin/sessions/join/route.ts](src/app/api/admin/sessions/join/route.ts)
- Allows mechanics to join chat/video sessions
- Prevents multiple mechanics from joining the same session
- Updates session status to 'active'

### 3. Navigation
- Added "Sessions" link to admin header
- Easy access from any admin page

## Setup Steps

### Step 1: Enable Realtime for Tables

Go to Supabase Dashboard → **Database → Replication** and enable Realtime for:

1. ✅ **chat_messages** (you may have already done this)
2. ✅ **sessions** (NEW - needed for mechanic dashboard)
3. ✅ **session_participants** (NEW - needed for live participant updates)

### Step 2: Test the Flow

#### A. Customer Creates a Session

1. Go to: `http://localhost:3000/api/checkout?plan=chat10`
2. Use test card: `4242 4242 4242 4242`
3. Complete checkout
4. Customer lands in `/chat/[sessionId]`
5. Sees: "Waiting for a mechanic to join"

#### B. Mechanic Joins the Session

1. Log in to admin: `http://localhost:3000/admin/login`
2. Go to Sessions: `http://localhost:3000/admin/sessions`
3. You should see the new session in "Available Sessions"
4. Click **"Join Session"**
5. You'll be redirected to `/chat/[sessionId]`

#### C. Both See Each Other

- Customer's UI updates to show "1 mechanic connected"
- Both can now send messages in real-time
- Messages appear instantly for both parties

## How It Works

### Customer Flow

```
Checkout → Webhook → Create Session → Add Customer as Participant → Redirect to /chat/[id]
```

### Mechanic Flow

```
Visit /admin/sessions → See Available Sessions → Click Join → API adds mechanic as participant → Redirect to /chat/[id]
```

### Real-time Updates

1. **New Session Created**:
   - Webhook fires → Session inserted into DB
   - Mechanic dashboard subscribes to `sessions` table INSERTs
   - New session appears automatically in "Available Sessions"

2. **Mechanic Joins**:
   - Join API → Insert mechanic into `session_participants`
   - Chat page subscribes to `session_participants` INSERTs
   - Customer's UI updates to show mechanic count

3. **Messages Sent**:
   - Either party sends message
   - `chat_messages` INSERT triggers Realtime
   - Other party sees message instantly

## Video Sessions (TODO)

For video sessions, you'll need to:

1. Create `/video/[id]/page.tsx` for mechanics
2. Use LiveKit to generate mechanic token
3. Join the same LiveKit room as the customer
4. The existing video infrastructure should work, just needs mechanic access

### Quick Video Implementation

Create `src/app/video/[id]/page.tsx`:

```typescript
import { getSupabaseServer } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import { generateLiveKitToken } from '@/lib/livekit' // You'll need this helper

export default async function VideoSessionPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  // Verify user is a participant
  const { data: participant } = await supabase
    .from('session_participants')
    .select('role')
    .eq('session_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!participant) redirect('/admin/sessions')

  // Generate LiveKit token
  const token = await generateLiveKitToken(params.id, user.id, participant.role)

  return <VideoRoom sessionId={params.id} token={token} />
}
```

## Troubleshooting

### "No sessions appear in dashboard"
- Check that webhook is running: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Complete a test checkout
- Check browser console for errors
- Verify Realtime is enabled for `sessions` table

### "Can't join session"
- Check browser console for API errors
- Verify you're logged in as admin
- Check that session still exists and is pending
- Look at server logs for join API errors

### "Messages don't appear in real-time"
- Verify Realtime is enabled for `chat_messages` in Supabase
- Check browser console for WebSocket connection
- Make sure both users are in the same session

### "Customer can't see mechanic joined"
- Verify Realtime is enabled for `session_participants`
- Check that mechanic was successfully added (query DB)
- Refresh customer's page to force re-subscribe

## Database Queries for Testing

### Check Session Participants
```sql
SELECT
  s.id,
  s.type,
  s.status,
  sp.role,
  au.email
FROM sessions s
JOIN session_participants sp ON sp.session_id = s.id
JOIN auth.users au ON au.id = sp.user_id
WHERE s.id = 'YOUR_SESSION_ID'
ORDER BY sp.created_at;
```

### View All Active Sessions
```sql
SELECT
  s.id,
  s.type,
  s.plan,
  s.status,
  COUNT(sp.id) as participant_count,
  COUNT(sp.id) FILTER (WHERE sp.role = 'mechanic') as mechanic_count
FROM sessions s
LEFT JOIN session_participants sp ON sp.session_id = s.id
WHERE s.status != 'completed'
GROUP BY s.id
ORDER BY s.created_at DESC;
```

### Manually Assign Mechanic (for testing)
```sql
-- Get your mechanic user ID first
SELECT id, email FROM auth.users WHERE email = 'your-mechanic-email@example.com';

-- Add as mechanic
INSERT INTO session_participants (session_id, user_id, role)
VALUES (
  'SESSION_ID_HERE',
  'MECHANIC_USER_ID_HERE',
  'mechanic'
);
```

## Next Steps

1. ✅ Enable Realtime for `sessions` and `session_participants`
2. ✅ Test chat session flow end-to-end
3. Create video session page for mechanics
4. Add session timer (auto-complete after 10/15 min)
5. Add session summary/notes feature
6. Add mechanic availability system (online/offline status)
7. Add push notifications for new sessions

---

**Ready to test!** Enable Realtime for the tables, then try the complete flow.
