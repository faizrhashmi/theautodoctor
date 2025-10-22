# Chat Testing Guide

## What Was Fixed

### 1. **Real-time Messaging Issue**
**Problem**: Messages were being sent but not appearing on the other side.

**Root Cause**:
- Messages were inserted using `supabaseAdmin` (bypasses RLS)
- Real-time subscriptions were using `postgres_changes` which are subject to RLS policies
- Clients couldn't receive broadcasts for messages inserted by admin client

**Solution**:
- Switched from `postgres_changes` to Supabase **broadcast** feature
- After API inserts message, client broadcasts it to all connected clients
- All clients subscribe to the same broadcast channel and receive messages in real-time

### 2. **Role Detection Issue**
**Problem**: Chat component couldn't detect if user was mechanic or customer properly.

**Solution**:
- Page now passes `userRole` prop directly from server-side auth
- Component uses explicit role instead of trying to infer from participants table

### 3. **Added Debug Logging**
Console logs added to track:
- When subscription is set up
- When messages are sent
- When broadcasts are received
- Message deduplication

## How to Test

### Step 1: Open Two Browser Windows

1. **Window 1 - Customer**:
   - Open browser in normal mode
   - Log in as customer (Faiz Hashmi)
   - Navigate to active chat session

2. **Window 2 - Mechanic**:
   - Open browser in incognito/private mode (or different browser)
   - Log in as mechanic
   - Go to mechanic dashboard
   - Accept/join the customer's session

### Step 2: Test Messaging

1. **From Customer**: Type "Hello from customer" and press Enter
2. **Check Mechanic**: Should see "Hello from customer" appear immediately
3. **From Mechanic**: Type "Hi, how can I help?" and press Enter
4. **Check Customer**: Should see mechanic's message appear immediately

### Step 3: Check Browser Console

Open Developer Tools (F12) in both windows and check console for:

**Expected logs when sending a message**:
```
[ChatRoom] Message sent successfully: {message object}
[ChatRoom] Broadcasted message: {message-id}
```

**Expected logs when receiving a message**:
```
[ChatRoom] Received broadcast message: {payload}
[ChatRoom] Adding new message to state: {message-id}
```

**If you see duplicate messages**:
```
[ChatRoom] Message already exists, skipping: {message-id}
```

### Step 4: Check Names Display

**Customer should see**:
- Header: "○ Waiting for mechanic..." (before mechanic joins)
- Header: "● [Mechanic Name] has joined" (after mechanic joins)

**Mechanic should see**:
- Header: "● Chat with Faiz Hashmi" (or customer name)
- "Mechanic" badge displayed

## Debug Endpoints

If messages still don't appear, use these endpoints to debug:

### 1. Check messages in database:
```
GET /api/chat/debug-messages?sessionId={session-id}
```

This shows all messages stored in database for the session.

### 2. Check session info:
```
GET /api/chat/session-info?sessionId={session-id}
```

Shows session status, mechanic name, and customer name.

## Common Issues

### Issue: Messages appear on sender side but not receiver side

**Check**:
1. Open browser console on receiver side
2. Look for subscription status log: `[ChatRoom] Subscription status: SUBSCRIBED`
3. If status is not `SUBSCRIBED`, the real-time connection failed

**Fix**:
- Refresh the receiver's browser
- Check Supabase project settings → API → Realtime is enabled

### Issue: Both sides show "Faiz Hashmi"

**Cause**: Mechanic row in database might not have a name set.

**Check**:
```sql
SELECT id, name, email FROM mechanics WHERE id = 'mechanic-id';
```

**Fix**:
```sql
UPDATE mechanics SET name = 'Test Mechanic' WHERE id = 'mechanic-id';
```

Then refresh the chat page.

### Issue: Messages duplicate

**Cause**: Multiple subscriptions or stale connections.

**Fix**:
- Refresh both browser windows
- Check console for multiple subscription messages

## Next Steps

If chat still doesn't work after these fixes:

1. Share the browser console logs from both windows
2. Share the response from `/api/chat/debug-messages?sessionId=XXX`
3. Check Supabase Dashboard → Table Editor → chat_messages to verify messages are being inserted
4. Check Supabase Dashboard → Realtime → Enable table replication for `chat_messages`
