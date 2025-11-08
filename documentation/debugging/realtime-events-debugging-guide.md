# Realtime Events Debugging Guide

**Last Updated:** January 6, 2025
**Category:** Debugging, Realtime, Troubleshooting

---

## Overview

This guide provides systematic approaches to debugging Supabase postgres_changes and broadcast channel issues. Based on real debugging sessions from January 2025.

---

## Quick Diagnosis Checklist

When realtime events aren't firing, check these in order:

### Level 1: Basic Configuration

- [ ] **Realtime enabled in Supabase dashboard?**
  - Go to Database → Replication
  - Check if table has Realtime toggle ON

- [ ] **Table in publication?**
  ```sql
  SELECT tablename
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'your_table';
  ```

- [ ] **Replica identity set?**
  ```sql
  SELECT c.relname, c.relreplident
  FROM pg_class c
  WHERE c.relname = 'your_table';
  -- Should show: relreplident = 'f' (FULL)
  ```

- [ ] **Subscription shows SUBSCRIBED?**
  ```typescript
  .subscribe((status) => {
    console.log('Status:', status) // Should show: SUBSCRIBED
  })
  ```

### Level 2: RLS and Permissions

- [ ] **RLS policy allows SELECT?**
  ```sql
  -- Test as the authenticated user
  SELECT * FROM your_table LIMIT 1;
  -- If this fails, RLS is blocking
  ```

- [ ] **Policy is simple (not complex OR conditions)?**
  ```sql
  -- Good
  USING (user_id = auth.uid())

  -- Can cause issues
  USING (user_id = auth.uid() OR status = 'public')
  ```

- [ ] **Client is authenticated (not anonymous)?**
  ```typescript
  const { data: { user } } = await supabase.auth.getUser()
  console.log('Authenticated as:', user?.email)
  ```

### Level 3: Event Delivery

- [ ] **Database change actually occurring?**
  ```sql
  -- Check updated_at timestamp
  SELECT id, updated_at FROM your_table
  ORDER BY updated_at DESC LIMIT 5;
  ```

- [ ] **Event handler not throwing errors?**
  ```typescript
  .on('postgres_changes', (payload) => {
    try {
      // Your code
    } catch (err) {
      console.error('Handler error:', err)
      // Don't let errors break subscription
    }
  })
  ```

- [ ] **Subscription cleanup not removing channel prematurely?**
  ```typescript
  useEffect(() => {
    const channel = supabase.channel('...')
    // ...

    return () => {
      supabase.removeChannel(channel)
    }
  }, [/* Check dependencies! */])
  ```

---

## Debugging Tools

### Tool 1: Test Page (Authenticated)

**File:** `public/test-realtime-authenticated.html`

Use this to isolate realtime issues from application code:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
  <h1>Realtime Test</h1>
  <button onclick="signIn()">Sign In</button>
  <button onclick="testUpdate()">Trigger Update</button>
  <pre id="log"></pre>

  <script>
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    async function signIn() {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password'
      })

      if (!error) {
        log('✅ Signed in')
        setupSubscription()
      }
    }

    function setupSubscription() {
      supabase
        .channel('test')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'your_table',
        }, (payload) => {
          log('🔔 EVENT RECEIVED!')
          log(JSON.stringify(payload, null, 2))
        })
        .subscribe((status) => {
          log('Subscription status: ' + status)
        })
    }

    async function testUpdate() {
      const { data, error } = await supabase
        .from('your_table')
        .update({ some_field: 'new_value' })
        .eq('id', 'some-id')

      log(error ? '❌ Update failed' : '✅ Update successful')
    }

    function log(msg) {
      document.getElementById('log').textContent += msg + '\n'
    }
  </script>
</body>
</html>
```

**Usage:**
1. Open page in browser
2. Click "Sign In"
3. Watch for "Subscription status: SUBSCRIBED"
4. Click "Trigger Update"
5. Check if event appears

**What This Tests:**
- Authentication working
- Subscription connecting
- RLS policies allowing SELECT
- Events being delivered

### Tool 2: SQL Diagnostic Queries

**Check Publication Configuration:**

```sql
-- Tables in publication
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY schemaname, tablename;

-- Replica identity
SELECT
  c.relname AS table_name,
  CASE c.relreplident
    WHEN 'f' THEN 'FULL'
    WHEN 'd' THEN 'DEFAULT'
    WHEN 'n' THEN 'NOTHING'
    WHEN 'i' THEN 'INDEX'
  END AS replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;
```

**Check RLS Policies:**

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'your_table'
ORDER BY policyname;
```

**Verify Data Changes:**

```sql
-- Recent changes to table
SELECT *
FROM your_table
ORDER BY updated_at DESC
LIMIT 10;

-- Count recent changes (last hour)
SELECT COUNT(*)
FROM your_table
WHERE updated_at > NOW() - INTERVAL '1 hour';
```

### Tool 3: Browser Console Debugging

**Enable Debug Logging:**

```typescript
// In your application
localStorage.setItem('supabase.realtime.debug', 'true')

// Reload page, check console for detailed logs
```

**Monitor Subscription State:**

```typescript
const channel = supabase.channel('my-channel')

// Log all state changes
setInterval(() => {
  console.log('[Realtime Health]', {
    state: channel.state,
    timestamp: new Date().toISOString()
  })
}, 10000) // Every 10 seconds
```

**Track Event Timing:**

```typescript
let lastEventTime = null

.on('postgres_changes', (payload) => {
  const now = Date.now()

  if (lastEventTime) {
    const timeSinceLastEvent = now - lastEventTime
    console.log('[Event Timing] ms since last:', timeSinceLastEvent)
  }

  lastEventTime = now
  console.log('[Event] Received at:', new Date(now).toISOString())
})
```

---

## Common Issues and Solutions

### Issue 1: "Subscription shows SUBSCRIBED but no events"

**Most Likely Cause:** RLS policy blocking events

**Diagnosis:**
```sql
-- Test if you can SELECT the row that changed
SET role authenticated;
SET request.jwt.claim.sub = 'user-uuid-here';

SELECT * FROM your_table WHERE id = 'changed-row-id';
```

If SELECT fails, RLS is blocking.

**Solution:** Simplify RLS policy

```sql
-- Before (complex, can fail)
CREATE POLICY "complex" ON your_table FOR SELECT
USING (owner_id = auth.uid() OR status = 'public');

-- After (simple, reliable)
CREATE POLICY "simple" ON your_table FOR SELECT
USING (owner_id = auth.uid());
```

### Issue 2: "Events fire in development but not production"

**Possible Causes:**
1. Different Supabase projects (separate databases)
2. Realtime not enabled in production dashboard
3. Different RLS policies
4. Production using service role (bypasses RLS)

**Diagnosis:**
```typescript
// Check which Supabase URL is being used
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

// Check authentication
const { data: { user } } = await supabase.auth.getUser()
console.log('User:', user?.email)
```

**Solution:** Verify configuration matches between environments

### Issue 3: "Events delayed by several seconds"

**Causes:**
1. Additional data fetches in handler
2. Network latency
3. Database under load
4. Large payload sizes

**Diagnosis:**
```typescript
.on('postgres_changes', async (payload) => {
  const start = performance.now()

  // Your code here

  const duration = performance.now() - start
  console.log('[Event Processing] Took ms:', duration)
})
```

**Solution:** Optimize handler

```typescript
// Before (slow - 2 fetches)
.on('postgres_changes', async (payload) => {
  const session = await fetchSession(payload.new.session_id)
  const intake = await fetchIntake(session.intake_id)
  // Process...
})

// After (fast - 1 fetch with join)
.on('postgres_changes', async (payload) => {
  const data = await supabase
    .from('sessions')
    .select(`*, intakes(*)`)
    .eq('id', payload.new.session_id)
    .single()
  // Process...
})
```

### Issue 4: "Events stop firing after a while"

**Causes:**
1. Channel cleaned up by useEffect
2. Supabase client recreated
3. Network connection lost
4. Error in handler breaking subscription

**Diagnosis:**
```typescript
// Add subscription health check
useEffect(() => {
  const healthCheck = setInterval(() => {
    if (channel.state !== 'joined') {
      console.error('[Realtime] Not joined! State:', channel.state)
      // Reconnect
    }
  }, 30000)

  return () => clearInterval(healthCheck)
}, [channel])
```

**Solution:** Implement reconnection logic

```typescript
function setupReliableSubscription() {
  let channel = null
  let reconnectAttempts = 0

  function connect() {
    channel = supabase
      .channel('my-channel')
      .on('postgres_changes', {...})
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          reconnectAttempts = 0
          console.log('[Realtime] Connected')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Error, reconnecting...')
          reconnect()
        }
      })
  }

  function reconnect() {
    if (reconnectAttempts < 5) {
      reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)

      setTimeout(() => {
        supabase.removeChannel(channel)
        connect()
      }, delay)
    }
  }

  connect()
  return () => supabase.removeChannel(channel)
}
```

### Issue 5: "Old values not included in UPDATE events"

**Cause:** Replica identity not set to FULL

**Diagnosis:**
```sql
SELECT
  c.relname,
  CASE c.relreplident
    WHEN 'f' THEN 'FULL'
    WHEN 'd' THEN 'DEFAULT'
  END AS replica_identity
FROM pg_class c
WHERE c.relname = 'your_table';
```

**Solution:**
```sql
ALTER TABLE your_table REPLICA IDENTITY FULL;
```

---

## Testing Checklist

When implementing realtime features:

### Setup Phase
- [ ] Enable Realtime in Supabase dashboard
- [ ] Add table to publication (`ALTER PUBLICATION supabase_realtime ADD TABLE your_table`)
- [ ] Set replica identity (`ALTER TABLE your_table REPLICA IDENTITY FULL`)
- [ ] Create RLS policies (keep them simple!)

### Development Phase
- [ ] Test with test page (isolated from app code)
- [ ] Test with authenticated user
- [ ] Test with different user roles
- [ ] Test INSERT, UPDATE, DELETE events separately
- [ ] Test with slow network (Chrome DevTools throttling)
- [ ] Test error handling in event handler

### Production Phase
- [ ] Verify Realtime enabled in production dashboard
- [ ] Test end-to-end in production environment
- [ ] Monitor subscription health
- [ ] Check Supabase Realtime logs for errors
- [ ] Test with multiple concurrent users

---

## Performance Monitoring

### Client-Side Metrics

```typescript
const metrics = {
  eventsReceived: 0,
  avgLatency: 0,
  errors: 0
}

.on('postgres_changes', (payload) => {
  metrics.eventsReceived++

  // Calculate latency (if timestamp in payload)
  if (payload.commit_timestamp) {
    const latency = Date.now() - new Date(payload.commit_timestamp).getTime()
    metrics.avgLatency = (metrics.avgLatency + latency) / 2
  }
})

// Report to monitoring service
setInterval(() => {
  analytics.track('realtime_metrics', metrics)
}, 60000) // Every minute
```

### Server-Side Monitoring

Check Supabase dashboard:
- Database → Logs → Realtime logs
- Look for errors, warnings
- Monitor connection count
- Check event delivery rate

---

## Emergency Debugging

### When Nothing Works

1. **Restart Supabase project** (Settings → General → Restart project)
   - Forces Realtime server to reload configuration
   - Takes 1-2 minutes

2. **Test with service role key**
   ```typescript
   const adminClient = createClient(url, SERVICE_ROLE_KEY)
   // If this works, problem is RLS
   ```

3. **Test with simple table**
   ```sql
   CREATE TABLE test_realtime (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     value TEXT,
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   ALTER TABLE test_realtime REPLICA IDENTITY FULL;
   ALTER PUBLICATION supabase_realtime ADD TABLE test_realtime;
   ```

4. **Check Supabase status** (https://status.supabase.com)
   - May be platform-wide issue

---

## Related Documentation

- [RLS Blocking postgres_changes Events](../troubleshooting/rls-blocking-postgres-changes-events.md)
- [Broadcast to postgres_changes Migration](../features/broadcast-to-postgres-changes-migration.md)
- [Realtime Notifications Diagnostic Report](../REALTIME_NOTIFICATIONS_DIAGNOSTIC_REPORT.md)

---

## References

- Supabase Realtime Docs: https://supabase.com/docs/guides/realtime
- PostgreSQL Replication: https://www.postgresql.org/docs/current/logical-replication.html
- Test Pages: `public/test-realtime-*.html`

---

**Last Updated:** January 6, 2025
