# RFQ Issue Report

**Date**: 2025-11-02
**Status**: ❌ BROKEN - Database function missing

---

## Issue #1: Infinite Recursion Error ❌ CRITICAL

### What's Happening

```
RFQs fetch error: {
  code: '42P17',
  message: 'infinite recursion detected in policy for relation "organization_members"'
}
```

### Root Cause

Your database is **missing a helper function** called `user_organizations()`.

**Why it causes recursion**:
1. Customer tries to view RFQs
2. Database checks RLS policy on `workshop_rfq_marketplace`
3. That policy queries `workshop_roles` table
4. `workshop_roles` RLS policies query `organization_members`
5. `organization_members` RLS policies query `organization_members` again → **INFINITE LOOP**

### The Fix

A migration file exists but was **never applied**:
- File: `supabase/migrations/99990007_phase2_fix_organization_members_recursion.sql`
- Creates: `user_organizations()` function with `SECURITY DEFINER`
- Purpose: Breaks the recursion loop

### What You Must Do (2 Minutes)

**Option 1: Manual SQL (Recommended)**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor"
4. Run this SQL:

```sql
CREATE OR REPLACE FUNCTION user_organizations(user_id UUID)
RETURNS TABLE(organization_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM organization_members
  WHERE user_id = $1 AND status = 'active';
$$;

GRANT EXECUTE ON FUNCTION user_organizations(UUID) TO authenticated, anon;

COMMENT ON FUNCTION user_organizations(UUID) IS 'SECURITY DEFINER: Returns active organization IDs for a user without recursive RLS checks';
```

5. Verify success:
```sql
SELECT user_organizations('00000000-0000-0000-0000-000000000000');
-- Should return empty result with NO ERROR
```

**Option 2: Supabase CLI**

```bash
cd "c:\Users\Faiz Hashmi\theautodoctor"

# Apply just the recursion fix migration
cat supabase/migrations/99990007_phase2_fix_organization_members_recursion.sql | npx supabase db execute
```

### After Fix

1. Refresh `/customer/rfq/my-rfqs`
2. Should load without recursion error
3. Will show empty list (see Issue #2 below)

---

## Issue #2: No Customer RFQ Creation UI ⚠️ BY DESIGN

### What You're Seeing

- Customer dashboard has "My RFQs" link
- Clicking it shows a page that tries to fetch RFQs
- **But there's no "Create RFQ" button anywhere**

### Why This Happens

According to the RFQ implementation plan, **customers don't create RFQs directly**.

### How RFQ Creation Actually Works

**The Intended Flow**:

1. **Customer books diagnostic session** with mechanic
2. **Mechanic diagnoses** the issue during video session
3. **Mechanic finds issue too complex** (needs workshop equipment)
4. **Mechanic clicks "Escalate to Workshop"** during session
5. **System creates RFQ on customer's behalf**:
   - Prefills vehicle info from customer profile
   - Adds diagnostic findings from mechanic
   - Uploads photos/videos from session
   - Sets budget range based on diagnostic
6. **Customer gets notification**: "Your repair has been posted to RFQ marketplace"
7. **Workshops bid** on the RFQ
8. **Customer reviews bids** at `/customer/rfq/my-rfqs`
9. **Customer accepts winning bid**

### What's Implemented

**Phase 0**: ✅ Database schema (tables, columns, RLS)
**Phase 1**: ✅ Feature flag infrastructure
**Phase 2**: ❌ **MISSING** - Mechanic RFQ creation wizard
**Phase 3**: ✅ Workshop browse & bid (but can't test without Phase 2)
**Phase 4**: ✅ Customer compare bids & accept
**Phase 5**: ✅ Notifications + auto-expiration
**Phase 6**: ✅ Admin analytics

### The Missing Piece: Phase 2

**What Phase 2 Should Have**:
- Mechanic dashboard button: "Escalate to RFQ"
- 3-step wizard during/after diagnostic session:
  1. Vehicle & Issue details
  2. Budget & urgency settings
  3. Review & submit to marketplace
- Creates both:
  - `workshop_escalation_queue` entry (mechanic couldn't fix)
  - `workshop_rfq_marketplace` entry (open for bids)

**Where it should be**:
- File: `src/app/mechanic/sessions/[sessionId]/escalate/page.tsx` (doesn't exist)
- Or: Button in `src/app/mechanic/dashboard/page.tsx` (doesn't exist)

### Why Customer Dashboard Shows "My RFQs"

The **viewing** functionality was implemented (Phase 4), but the **creation** functionality (Phase 2) was skipped.

So:
- ✅ Customer CAN view/compare/accept bids (if RFQs existed)
- ❌ Customer CANNOT create RFQs (mechanic should do it)
- ❌ Mechanic CANNOT create RFQs (wizard not built)

---

## Current State Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Database Schema | ✅ Complete | All tables exist |
| RLS Policies | ❌ Broken | Missing helper function |
| Feature Flag | ✅ Working | Can toggle on/off |
| Customer View RFQs | ⚠️ Works after DB fix | No RFQs to view yet |
| Customer Create RFQs | ❌ Not intended | Mechanic should create |
| Mechanic Create RFQs | ❌ Not built | Phase 2 never implemented |
| Workshop Browse RFQs | ⚠️ Ready | Can't test without RFQs |
| Workshop Submit Bids | ⚠️ Ready | Can't test without RFQs |
| Customer Accept Bids | ⚠️ Ready | Can't test without RFQs |

---

## What Needs to Happen

### Immediate (Fix Broken Parts)

1. **Apply Database Fix** (2 minutes)
   - Run SQL from Issue #1 above
   - Fixes infinite recursion error
   - Allows RFQ pages to load

2. **Test After Fix**:
   - Visit `/customer/rfq/my-rfqs`
   - Should load with message: "You haven't created any RFQs yet"
   - No errors in console

### Next Steps (Make RFQ Functional)

**Option A: Build Phase 2 (Mechanic Creation)**
- Estimated time: 5-7 days
- Build mechanic escalation wizard
- Allows mechanics to create RFQs during sessions
- Follows original plan

**Option B: Build Customer Direct Creation (Simpler)**
- Estimated time: 2-3 days
- Add "Create RFQ" button to `/customer/rfq/my-rfqs`
- Build simple RFQ creation form
- Bypass mechanic diagnostic flow
- Easier to test end-to-end

**Option C: Create Test RFQs Manually**
- Estimated time: 10 minutes
- I can create SQL to insert test RFQs
- Allows testing bid submission/acceptance
- Quick way to demo the feature

---

## Recommendation

**Step 1**: Fix the infinite recursion error (2 minutes)
- Run the SQL from Issue #1
- This unblocks everything

**Step 2**: Decide on creation flow
- Do you want mechanics to create RFQs? (Option A)
- Do you want customers to create RFQs? (Option B)
- Do you just want to test with fake data? (Option C)

**Step 3**: I'll implement whichever you choose

---

## Quick Test (After DB Fix)

**Verify RFQ System Works**:

1. Apply SQL fix
2. Visit `/customer/rfq/my-rfqs`
3. Should see: Empty state with no errors
4. Visit `/api/rfq/my-rfqs` directly
5. Should return: `{"rfqs":[],"summary":{...},"pagination":{...}}`

If those work, the system is functional - just needs RFQs to be created.

---

## Questions for You

1. **Did you apply the SQL fix?** (From Issue #1)
2. **Which creation flow do you prefer?** (Mechanic, Customer, or Test Data)
3. **Do you want me to proceed with building it?** (Will ask before starting)

---

**Next Action**: Please apply the SQL fix first, then tell me which creation approach you want.
