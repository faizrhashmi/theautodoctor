# ADR-02: One-Active-Session Database Constraint

**Date:** 2025-01-01
**Status:** PROPOSED (For Future Batch)
**Related:** Batch 2 - Phase 3 (Soft Check Implementation)

---

## Context

Currently, mechanics can technically accept multiple virtual consultation sessions simultaneously. While the platform shows session lists and mechanics can manage their queue, there's no hard database constraint preventing concurrent active sessions.

**Current State (Phase 3):**
- ✅ Soft, non-blocking front-end warning when accepting with active sessions
- ✅ User can proceed if they choose to
- ✅ Telemetry logs acceptance decisions: `[MECH SESSION] {"action":"accept_cancelled|accept_proceeded","active_count":N}`
- ❌ No database-level enforcement

**Business Rationale for One-Active-Session:**
1. **Customer Experience:** Divided attention degrades consultation quality
2. **Response Time:** Multiple sessions lead to delayed responses
3. **Platform Reputation:** Poor service quality reflects on the platform
4. **Mechanic Earnings:** Better service → better ratings → more bookings

---

## Decision

**PROPOSED:** Add a database-level constraint ensuring mechanics have at most ONE active (accepted/in-progress) session at any time.

### Implementation Approach

#### Option A: Unique Partial Index (Recommended)
```sql
-- Partial unique index on sessions table
CREATE UNIQUE INDEX idx_one_active_session_per_mechanic
ON public.sessions (mechanic_id)
WHERE status IN ('accepted', 'in_progress', 'active');

COMMENT ON INDEX idx_one_active_session_per_mechanic IS
'Enforces one-active-session rule: mechanics can only have one non-completed session at a time';
```

**Pros:**
- Zero-cost when session is completed (partial index not applied)
- Database-enforced atomicity
- Simple to understand
- Easy to rollback (DROP INDEX)

**Cons:**
- Requires backfill of existing multi-session mechanics
- May need grace period before enforcement

#### Option B: Check Constraint with Function
```sql
CREATE OR REPLACE FUNCTION check_mechanic_active_sessions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('accepted', 'in_progress', 'active') THEN
    IF EXISTS (
      SELECT 1 FROM public.sessions
      WHERE mechanic_id = NEW.mechanic_id
        AND id != NEW.id
        AND status IN ('accepted', 'in_progress', 'active')
    ) THEN
      RAISE EXCEPTION 'Mechanic % already has an active session', NEW.mechanic_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_one_active_session
  BEFORE INSERT OR UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION check_mechanic_active_sessions();
```

**Pros:**
- More flexible (can add custom logic)
- Better error messages

**Cons:**
- Performance overhead (function call on every INSERT/UPDATE)
- More complex to maintain
- Harder to rollback (need to drop trigger + function)

**Recommendation:** Use Option A (Partial Index) for simplicity and performance.

---

## Consequences

### Positive
- **Data Integrity:** Impossible to have concurrent sessions at DB level
- **Customer Experience:** Guaranteed focused attention
- **Clear Contract:** API will fail-fast with constraint violation
- **Backpressure:** Forces mechanics to complete sessions before accepting new ones

### Negative
- **Breaking Change:** Requires migration of existing multi-session mechanics
- **Deployment Complexity:** Need backfill script before constraint
- **Edge Cases:** What if mechanic accidentally clicks "Accept" twice? (Need idempotency)

---

## Migration Plan (For Future Batch)

### Pre-Deployment Checklist

1. **Data Audit:**
   ```sql
   -- Find mechanics with multiple active sessions
   SELECT mechanic_id, COUNT(*) as active_count
   FROM public.sessions
   WHERE status IN ('accepted', 'in_progress', 'active')
   GROUP BY mechanic_id
   HAVING COUNT(*) > 1
   ORDER BY active_count DESC;
   ```

2. **Backfill Strategy:**
   - Option A: Force-complete older sessions (risky)
   - Option B: Create `status = 'paused'` for excess sessions
   - Option C: Manual review + mechanic contact for resolution

3. **Deployment Steps:**
   ```sql
   -- Step 1: Backfill (using chosen strategy)
   -- (Script TBD based on audit results)

   -- Step 2: Add constraint
   CREATE UNIQUE INDEX idx_one_active_session_per_mechanic
   ON public.sessions (mechanic_id)
   WHERE status IN ('accepted', 'in_progress', 'active');

   -- Step 3: Verify
   -- Attempt to insert duplicate should fail
   ```

4. **Rollback Plan:**
   ```sql
   -- Emergency rollback if issues arise
   DROP INDEX IF EXISTS idx_one_active_session_per_mechanic;
   ```

### API Error Handling

Update session accept endpoint to handle constraint violations gracefully:

```typescript
// src/app/api/mechanics/sessions/virtual/route.ts
try {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .update({ mechanic_id: mechanicId, status: 'accepted' })
    .eq('id', sessionId)
    .single()

  if (error) {
    // Check for unique constraint violation
    if (error.code === '23505' && error.message.includes('idx_one_active_session')) {
      return NextResponse.json({
        error: 'You already have an active session. Please complete it before accepting another.'
      }, { status: 409 }) // 409 Conflict
    }
    throw error
  }
} catch (err) {
  // Handle error
}
```

---

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Mechanics have legitimate multi-session workflows | Medium | High | User research before implementation |
| Backfill breaks existing sessions | Low | Critical | Staging environment testing + rollback plan |
| Constraint blocks emergency scenarios | Low | Medium | Add admin override capability |
| Double-click causes constraint error | Medium | Low | Add client-side debouncing + idempotency keys |

---

## Alternatives Considered

### 1. Application-Level Lock (No DB Constraint)
**Rejected:** Doesn't prevent race conditions or direct DB manipulation.

### 2. Soft Limit with Admin Dashboard Alert
**Rejected:** Doesn't actually prevent the issue, just monitors it.

### 3. Queue System (Only 1 Session at a Time)
**Rejected:** Too restrictive; prevents pending sessions from queueing.

---

## Next Steps

1. **User Research (Required Before Implementation):**
   - Interview 5-10 mechanics: Do they ever legitimately need multiple concurrent sessions?
   - Analyze session overlap patterns in production data
   - Determine if "paused" status is needed

2. **Batch Assignment:**
   - Assign to **Batch 5** or later (after other priorities)
   - Requires full PM approval due to behavior change

3. **Documentation:**
   - Update API docs with new error code (409 Conflict)
   - Add mechanic-facing help article explaining one-active-session rule

---

## References

- Phase 3 Soft Check Implementation: [src/app/mechanic/sessions/virtual/page.tsx:65-90](../../../src/app/mechanic/sessions/virtual/page.tsx)
- Telemetry Logs: `[MECH SESSION] {"action":"accept_cancelled|accept_proceeded"}`
- PostgreSQL Partial Indexes: https://www.postgresql.org/docs/current/indexes-partial.html

---

**Decision Maker:** Product Team + Engineering Lead
**Review Required:** YES - UX Research + Staging Testing
**Estimated Effort:** 2-3 days (audit, backfill, testing, deployment)
