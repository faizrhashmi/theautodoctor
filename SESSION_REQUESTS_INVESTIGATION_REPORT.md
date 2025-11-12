# SESSION_REQUESTS INVESTIGATION REPORT
**Date:** November 12, 2025
**Issue:** Discrepancy between schema discovery (43 records) and audit script (0 records)

---

## THE SOURCE OF TRUTH

### ✅ CONFIRMED: 43 SESSION REQUESTS EXIST

The database **DOES contain 43 session_requests** records. The schema discovery was correct.

---

## ROOT CAUSE OF AUDIT FAILURE

### The Problem: FOREIGN KEY RELATIONSHIP NOT FOUND

The audit script failed because it tried to join with the **wrong tables**:

**What the audit script tried:**
```typescript
.select(`
  *,
  customer:profiles!session_requests_customer_id_fkey (id, email, full_name),
  mechanic:mechanics!session_requests_mechanic_id_fkey (id, email, name)
`)
```

**Error received:**
```
❌ Could not find a relationship between 'session_requests' and 'profiles'
   in the schema cache

Code: PGRST200
Details: Searched for a foreign key relationship between 'session_requests'
         and 'profiles' using the hint 'session_requests_customer_id_fkey'
         but no matches were found.
```

### Why This Failed

The `session_requests` table **DOES NOT have a foreign key** to `profiles` table for the customer relationship!

Looking at the actual columns in `session_requests`:
- ✅ Has: `customer_id` (UUID)
- ✅ Has: `customer_name` (TEXT)
- ✅ Has: `customer_email` (TEXT)
- ✅ Has: `mechanic_id` (UUID)
- ❌ Missing: Foreign key constraint to `profiles` table

**The `customer_id` column exists but has NO foreign key relationship defined!**

This means:
1. `session_requests.customer_id` contains UUIDs
2. These UUIDs likely match `profiles.id` values
3. BUT there's no database-level foreign key constraint
4. Supabase's automatic join feature doesn't work without the FK

---

## SESSION REQUESTS DATA SUMMARY

### Status Breakdown
| Status | Count |
|--------|-------|
| Cancelled | 36 |
| Completed | 6 |
| Pending | 1 |
| **TOTAL** | **43** |

### Assignment Status
- **With mechanic assigned:** 13 sessions
- **Without mechanic (unassigned):** 30 sessions

### Session Types
- Mix of `chat` and `video` sessions
- Majority are chat sessions

### Sample Session IDs (First 10)
1. 29026e3d... (cancelled, chat)
2. 5086115b... (cancelled, chat)
3. 3b22dd87... (cancelled, video)
4. ed99907c... (completed, chat)
5. 3b884909... (cancelled, chat)
6. fd1e4bcb... (cancelled, chat)
7. b3dc74a1... (cancelled, chat)
8. c3206121... (cancelled, chat)
9. f1370a3b... (cancelled, chat)
10. 119b4c3f... (cancelled, chat)

### Key Observations
- **High cancellation rate:** 36/43 sessions cancelled (84%)
- **Low completion rate:** 6/43 completed (14%)
- **Mostly unassigned:** 30/43 sessions never got a mechanic (70%)
- This suggests potential issues with mechanic matching or customer drop-off

---

## ACTUAL TABLE STRUCTURE

### session_requests columns (discovered)
```typescript
{
  id: UUID,
  customer_id: UUID,                    // ⚠️ NO FK to profiles!
  customer_name: TEXT,                  // Denormalized
  customer_email: TEXT,                 // Denormalized
  session_type: 'chat' | 'video',
  plan_code: TEXT,
  status: 'pending' | 'cancelled' | 'completed',
  mechanic_id: UUID,                    // ⚠️ FK relationship unclear
  created_at: TIMESTAMP,
  accepted_at: TIMESTAMP,
  parent_session_id: UUID,
  is_follow_up: BOOLEAN,
  follow_up_type: TEXT,
  workshop_id: UUID,
  preferred_workshop_id: UUID,
  routing_type: TEXT,
  request_type: TEXT,
  requested_brand: TEXT,
  extracted_keywords: TEXT[],
  matching_score: NUMERIC,
  customer_country: TEXT,
  customer_city: TEXT,
  prefer_local_mechanic: BOOLEAN,
  expires_at: TIMESTAMP,
  vehicle_id: UUID,
  is_urgent: BOOLEAN,
  preferred_mechanic_id: UUID,
  priority_window_minutes: INTEGER,
  priority_notified_at: TIMESTAMP,
  session_id: UUID,
  customer_postal_code: TEXT,
  // ... possibly more columns
}
```

### Design Pattern: Denormalized Data

The table uses **denormalized data** for customer information:
- `customer_name` and `customer_email` are stored directly
- This avoids JOIN requirements for common queries
- Trade-off: Data might become stale if customer updates their profile

---

## WHY THE AUDIT SCRIPT RETURNED 0

### Sequence of Events

1. Audit script queries `session_requests` WITH joins
2. Supabase tries to find foreign key relationship: `session_requests_customer_id_fkey`
3. **FK doesn't exist** - Supabase returns error
4. Error causes query to fail
5. Audit script receives `error` + `null` data
6. Script reports: 0 records

### The Fix

To query session_requests correctly, we need to:

**Option 1: Query without joins (use denormalized data)**
```typescript
const { data } = await supabase
  .from('session_requests')
  .select('*');

// customer_name and customer_email are already in the results!
```

**Option 2: Manual joins in application code**
```typescript
const { data: sessions } = await supabase
  .from('session_requests')
  .select('*');

// Then manually fetch related data if needed
const customerIds = sessions.map(s => s.customer_id);
const { data: customers } = await supabase
  .from('profiles')
  .select('*')
  .in('id', customerIds);
```

**Option 3: Create the missing foreign keys (migration required)**
```sql
-- Add foreign key constraints
ALTER TABLE session_requests
ADD CONSTRAINT session_requests_customer_id_fkey
FOREIGN KEY (customer_id) REFERENCES profiles(id);

ALTER TABLE session_requests
ADD CONSTRAINT session_requests_mechanic_id_fkey
FOREIGN KEY (mechanic_id) REFERENCES mechanics(id);
```

---

## IMPACT ON TESTING

### Good News ✅
- **43 session requests exist** - We have real test data!
- **Multiple statuses** - Can test pending, completed, cancelled flows
- **Mix of assigned/unassigned** - Can test mechanic matching
- **Real customer IDs** - Can verify customer associations

### Concerns ⚠️
- **84% cancellation rate** - Suggests UX or matching issues
- **70% unassigned** - Mechanic matching might not be working
- **Only 6 completed sessions** - Very low success rate
- **Most sessions are chat** - Need more video sessions for testing

### Recommendations
1. Investigate why 36 sessions were cancelled
2. Improve mechanic matching (30 sessions never got assigned)
3. Create more diverse test data:
   - More video sessions
   - More completed sessions
   - Sessions with different mechanics
   - Sessions from different time periods

---

## CORRECTED AUDIT APPROACH

### ❌ OLD (Broken) Query
```typescript
const { data } = await supabase
  .from('session_requests')
  .select(`
    *,
    customer:profiles!session_requests_customer_id_fkey (id, email, full_name),
    mechanic:mechanics!session_requests_mechanic_id_fkey (id, email, name)
  `);
```

### ✅ NEW (Working) Query
```typescript
const { data: sessionRequests } = await supabase
  .from('session_requests')
  .select('*');

// Customer info is already denormalized in session_requests:
// - customer_name
// - customer_email
// - customer_id (for manual lookup if needed)
```

---

## FINAL ANSWER: WHICH IS THE SOURCE OF TRUTH?

### ✅ SCHEMA DISCOVERY WAS CORRECT

**Source of Truth: 43 session_requests exist in the database**

The audit script returned 0 because:
1. It tried to use Supabase's automatic join feature
2. The foreign key relationships don't exist or aren't named as expected
3. Without FK, the join fails and returns an error
4. The error was interpreted as "no data"

**Lesson Learned:**
- Always query the table directly first (without joins)
- Verify foreign key relationships exist before using join syntax
- Denormalized data means joins aren't always necessary
- Error handling should distinguish between "no data" and "query failed"

---

## UPDATED REQUIREMENTS

### What We Actually Have for Testing

| Requirement | Target | Actual | Status |
|-------------|--------|--------|--------|
| Session Requests | 15 | 43 | ✅ Exceeds target |
| Completed Sessions | - | 6 | ℹ️ Low success rate |
| Pending Sessions | - | 1 | ⚠️ Very few active |
| Assigned to Mechanics | - | 13 | ⚠️ Only 30% assigned |

### What We Need

1. **More mechanics** - 43 sessions but only 13 got assigned (need more mechanics available)
2. **Better matching** - 70% of sessions never got a mechanic
3. **Reduce cancellations** - 84% cancellation rate is concerning
4. **More diverse test data** - Need sessions in different states for comprehensive testing

---

## NEXT STEPS

1. ✅ **Source of truth confirmed:** 43 session requests exist
2. **Update audit script** to query session_requests without joins
3. **Investigate cancellations** - Why are 84% of sessions cancelled?
4. **Improve mechanic matching** - Why are 70% unassigned?
5. **Consider adding foreign keys** - Would make joins easier in future
6. **Create more test mechanics** - 7 mechanics for 43 sessions may not be enough

