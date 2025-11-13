# WORKSHOP SPECIALIST CONTROL - DEPLOYMENT GUIDE
**Date:** November 12, 2025
**Status:** ✅ READY FOR DEPLOYMENT

---

## 📋 OVERVIEW

This guide provides step-by-step instructions for deploying the workshop specialist control system with admin oversight. The system ensures:

1. ✅ Workshop employees cannot self-designate as specialists
2. ✅ Workshop owners control team specialist designations
3. ✅ Platform admins have oversight and moderation capabilities
4. ✅ Independent mechanics retain self-designation (with admin approval)
5. ✅ Owner/operators get full workshop management access
6. ✅ Hourly rate field hidden for virtual/workshop employees

---

## 🚀 DEPLOYMENT STEPS

### STEP 1: Apply Database Migration

**File:** `supabase/migrations/20251112000001_lock_specialist_fields.sql`

**Command:**
```bash
npx supabase db push
```

**What it does:**
- Drops old permissive policies on `mechanics` table
- Creates 3 new RLS policies:
  1. Workshop employees cannot edit specialist fields
  2. Workshop owners can manage employee specialists
  3. Platform admins can manage all specialists

**Expected Output:**
```
Applying migration 20251112000001_lock_specialist_fields.sql...
✓ Applied migration successfully
```

**Rollback (if needed):**
```sql
-- Drop new policies
DROP POLICY IF EXISTS "Mechanics can update own profile with restrictions" ON mechanics;
DROP POLICY IF EXISTS "Workshop owners manage employee specialists" ON mechanics;
DROP POLICY IF EXISTS "Platform admins manage all specialists" ON mechanics;

-- Restore old policy
CREATE POLICY "Mechanics can update own profile"
  ON mechanics FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

### STEP 2: Verify Migration Success

**Test 1: Workshop Employee Restriction**

1. Login as workshop employee (David)
2. Go to `/mechanic/profile`
3. Click "Specializations" tab
4. **Expected:** See read-only specialist status banner
5. **Expected:** Cannot click tier buttons (alert shows)

**Test 2: Independent Mechanic Self-Designation**

1. Login as independent mechanic (no workshop_id)
2. Go to `/mechanic/profile`
3. Click "Specializations" tab
4. **Expected:** Can select specialist tier
5. **Expected:** Can choose brands
6. **Expected:** Can save changes

**SQL Verification:**
```sql
-- Check policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'mechanics'
  AND policyname LIKE '%specialist%';

-- Should return 3 policies
```

---

### STEP 3: Deploy Frontend Code

**Files Changed:**
1. ✅ `src/app/mechanic/profile/MechanicProfileClient.tsx` (MODIFIED)
2. ✅ `src/app/mechanic/profile/page.tsx` (MODIFIED)
3. ✅ `src/app/workshop/team/page.tsx` (NEW)
4. ✅ `src/app/api/workshop/team/mechanics/route.ts` (NEW)
5. ✅ `src/app/api/workshop/team/mechanics/[mechanicId]/specialist/route.ts` (NEW)
6. ✅ `src/components/workshop/WorkshopSidebar.tsx` (MODIFIED)
7. ✅ `src/app/admin/(shell)/mechanics/specialists/page.tsx` (NEW)
8. ✅ `src/app/api/admin/mechanics/specialists/route.ts` (NEW)
9. ✅ `src/app/api/admin/mechanics/[mechanicId]/specialist/route.ts` (NEW)

**Deployment Command:**
```bash
# Build and deploy (adjust for your deployment method)
pnpm build
# Deploy to your hosting platform (Vercel, etc.)
```

**Environment Check:**
- ✅ NEXT_PUBLIC_SUPABASE_URL set
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY set
- ✅ SUPABASE_SERVICE_ROLE_KEY set (for admin operations)

---

### STEP 4: Test Workshop Owner Controls

**Scenario: Workshop Owner Managing Team**

1. **Login as Workshop Owner** (John - owner/operator)
   ```
   Email: john@torontoautoexperts.com
   Password: [workshop owner password]
   ```

2. **Access Workshop Dashboard**
   - Navigate to `/workshop/dashboard`
   - Verify navigation shows "Team" option
   - Click "Team" to go to `/workshop/team`

3. **View Team Mechanics**
   - Should see list of all team members
   - Specialists shown separately from general mechanics
   - Owner/operators shown with badge

4. **Designate Employee as Specialist**
   - Find general mechanic (e.g., Mike Brown)
   - Click "⭐ Designate as Specialist"
   - Select brands (e.g., "BMW", "Mercedes-Benz")
   - Choose tier ("Brand Specialist")
   - Click "Save"
   - **Expected:** Success message
   - **Expected:** Mechanic moves to "Brand Specialists" section

5. **Edit Specialist Brands**
   - Find specialist mechanic (e.g., David)
   - Click "Edit" next to their name
   - Change brands (add/remove)
   - Click "Save"
   - **Expected:** Success message
   - **Expected:** Updated brands displayed

6. **Remove Specialist Status**
   - Click "Remove" on a specialist
   - Confirm removal
   - **Expected:** Mechanic moves to "General Mechanics" section

---

### STEP 5: Test Admin Controls

**Scenario: Admin Managing All Specialists**

1. **Login as Platform Admin**
   ```
   Email: admin@theautodoctor.com
   Password: [admin password]
   ```

2. **Access Admin Specialist Management**
   - Navigate to `/admin/mechanics`
   - Click on "Specialists" or go directly to `/admin/mechanics/specialists`

3. **View All Specialists**
   - Should see stats dashboard:
     - Total Specialists
     - Brand Specialists count
     - Master Technicians count
     - Independent count
     - Workshop count
     - Pending approvals count

4. **Filter Specialists**
   - Test search by name/email/brand
   - Filter by tier (Brand/Master)
   - Filter by account type (Independent/Workshop)
   - Filter by approval status (Approved/Pending)

5. **Approve Independent Mechanic Specialist**
   - Find mechanic with "Pending" status
   - Click "Approve"
   - **Expected:** Status changes to "Approved"
   - **Expected:** Success message

6. **Revoke Specialist Status (Moderation)**
   - Find any specialist
   - Click "Revoke"
   - Confirm action
   - **Expected:** Specialist status removed
   - **Expected:** Mechanic demoted to general tier

7. **View Specialist Details**
   - Click "Details" on any specialist
   - Navigate to mechanic detail page
   - Verify all specialist info displayed

---

### STEP 6: Test Hourly Rate Visibility

**Test 1: Virtual-Only Mechanic**

1. Login as virtual-only mechanic (no workshop_id)
2. Go to `/mechanic/profile`
3. Click "Basic Information" tab
4. **Expected:** No hourly rate input field
5. **Expected:** Blue info box explaining: "As a virtual mechanic, you earn 70% of the session price..."

**Test 2: Workshop Employee**

1. Login as workshop employee (has workshop_id, account_type='workshop_mechanic')
2. Go to `/mechanic/profile`
3. Click "Basic Information" tab
4. **Expected:** No hourly rate input field
5. **Expected:** Blue info box explaining: "As a workshop employee, rates are managed by your workshop..."

**Test 3: Independent Workshop Owner**

1. Login as independent mechanic with workshop (owner/operator)
2. Go to `/mechanic/profile`
3. Click "Basic Information" tab
4. **Expected:** Hourly rate input field visible
5. **Expected:** Help text: "Required for in-person visits at your workshop"
6. Can edit hourly rate

---

## 🧪 COMPREHENSIVE TEST CHECKLIST

### Database Layer Tests

- [ ] Migration applied successfully
- [ ] All 3 RLS policies exist
- [ ] Workshop employee CANNOT update specialist fields directly
- [ ] Workshop owner CAN update employee specialist fields
- [ ] Platform admin CAN update any specialist fields
- [ ] Independent mechanic CAN update own specialist fields

### Workshop Owner UI Tests

- [ ] Workshop sidebar shows "Team" navigation
- [ ] Team page loads successfully
- [ ] Lists all mechanics in workshop (including owner)
- [ ] Shows specialists vs general mechanics correctly
- [ ] Owner/operator badge displays correctly
- [ ] Can designate general mechanic as specialist
- [ ] BrandSelector opens and allows brand selection
- [ ] Can save specialist designation
- [ ] Can edit existing specialist brands
- [ ] Can remove specialist status
- [ ] Error handling works (invalid data)
- [ ] Success messages display correctly
- [ ] List refreshes after changes

### Workshop Employee UI Tests

- [ ] Employee profile loads correctly
- [ ] Specializations tab shows read-only status
- [ ] Cannot click tier selector buttons (alert shows)
- [ ] Workshop name displayed in banner
- [ ] Clear message directing to contact workshop owner
- [ ] Hourly rate field hidden
- [ ] Info box explains rate management

### Admin UI Tests

- [ ] Admin specialists page loads
- [ ] Stats dashboard shows correct counts
- [ ] Search works (name, email, brand)
- [ ] Tier filter works
- [ ] Account type filter works
- [ ] Approval status filter works
- [ ] Reset filters works
- [ ] Can approve pending specialists
- [ ] Can revoke specialist status
- [ ] Can view mechanic details
- [ ] Success/error messages display
- [ ] List refreshes after actions

### API Tests

- [ ] `GET /api/workshop/team/mechanics` returns team mechanics
- [ ] `PATCH /api/workshop/team/mechanics/[id]/specialist` updates specialist status
- [ ] Workshop owner can only update own workshop employees
- [ ] Non-owner cannot access workshop team APIs
- [ ] `GET /api/admin/mechanics/specialists` returns all specialists
- [ ] `PATCH /api/admin/mechanics/[id]/specialist` updates specialist status (admin only)
- [ ] Admin can approve/revoke any specialist
- [ ] Non-admin cannot access admin specialist APIs
- [ ] Audit logs created for admin actions

### Hourly Rate Tests

- [ ] Virtual-only mechanic: hourly rate hidden
- [ ] Workshop employee: hourly rate hidden
- [ ] Independent workshop owner: hourly rate visible
- [ ] Info box displays correct message for each type
- [ ] Independent can edit hourly rate
- [ ] Hourly rate saves correctly

### Edge Cases

- [ ] Owner/operator can manage team AND self-designate
- [ ] Owner/operator sees editable profile for self
- [ ] Empty workshop (no employees) shows correctly
- [ ] Workshop with only owner shows correctly
- [ ] Mechanic with no brands shows correctly
- [ ] Very long brand list truncates properly
- [ ] Multiple workshops don't interfere
- [ ] Mechanic leaving workshop (cooling period) handled

---

## 📊 MONITORING & VERIFICATION

### Database Queries to Run

**Check Workshop Employees Cannot Edit Specialists:**
```sql
-- Run as workshop employee's user
-- This should FAIL with RLS violation
UPDATE mechanics
SET is_brand_specialist = true
WHERE user_id = auth.uid();
```

**Check Workshop Owner CAN Edit Employee Specialists:**
```sql
-- Run as workshop owner
-- This should SUCCEED
UPDATE mechanics m
SET is_brand_specialist = true
WHERE m.workshop_id IN (
  SELECT organization_id FROM organization_members
  WHERE user_id = auth.uid() AND role = 'owner'
)
AND m.id = '[employee-id]';
```

**Check Admin CAN Edit Any Specialist:**
```sql
-- Run as admin user
-- This should SUCCEED
UPDATE mechanics
SET specialist_tier = 'brand'
WHERE id = '[any-mechanic-id]';
```

### Application Logs to Monitor

**Workshop Team API:**
```bash
# Watch for successful team fetches
[Workshop Team] User [owner-id] fetched [N] mechanics

# Watch for specialist updates
[Workshop Team] Owner [owner-id] updated specialist status for mechanic [mechanic-id]
```

**Admin Specialist API:**
```bash
# Watch for admin actions
[Admin Specialist] Admin [admin-id] approved specialist [mechanic-id]
[Admin Specialist] Admin [admin-id] revoked specialist [mechanic-id]
```

**Profile API:**
```bash
# Watch for profile updates
[Mechanic Profile] Successfully updated profile for [mechanic-id]
```

---

## 🔄 ROLLBACK PROCEDURE

If issues occur, follow these steps in order:

### 1. Revert Frontend Code
```bash
git revert [commit-hash]
pnpm build
# Deploy to hosting platform
```

### 2. Revert Database Migration
```bash
# Create new migration to rollback
npx supabase migration new rollback_specialist_control

# In the migration file:
DROP POLICY IF EXISTS "Mechanics can update own profile with restrictions" ON mechanics;
DROP POLICY IF EXISTS "Workshop owners manage employee specialists" ON mechanics;
DROP POLICY IF EXISTS "Platform admins manage all specialists" ON mechanics;

CREATE POLICY "Mechanics can update own profile"
  ON mechanics FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

# Apply rollback
npx supabase db push
```

### 3. Verify Rollback
- Workshop employees can edit specialist fields again (old behavior)
- Workshop owners lose team specialist controls
- Admin specialist page returns 404
- Hourly rate field visible for all mechanic types

---

## 🎯 SUCCESS CRITERIA

The deployment is successful when:

1. ✅ **Database Migration Applied**
   - All 3 RLS policies active
   - Old policy dropped
   - No database errors

2. ✅ **Workshop Owner Controls Working**
   - Can access team page
   - Can designate employees as specialists
   - Can edit specialist brands
   - Can remove specialist status
   - Changes persist after refresh

3. ✅ **Workshop Employee Restrictions Working**
   - Cannot edit specialist fields in profile
   - See read-only specialist status
   - Clear messaging about workshop management

4. ✅ **Admin Controls Working**
   - Can access specialist management page
   - Can approve independent specialists
   - Can revoke any specialist status
   - Can filter and search specialists

5. ✅ **Hourly Rate Visibility Correct**
   - Hidden for virtual-only mechanics
   - Hidden for workshop employees
   - Visible only for independent workshop owners

6. ✅ **Owner/Operators Working**
   - Get workshop dashboard access
   - Can manage team specialist status
   - Can self-designate as specialist

7. ✅ **No Regressions**
   - Independent mechanics can still self-designate
   - Existing specialists maintain status
   - Session matching still works
   - Brand specialist pricing still applies

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues

**Issue 1: Migration Fails**
```
Error: policy "Mechanics can update own profile" does not exist
```
**Solution:** Old policy already dropped. Continue with migration, it's safe.

---

**Issue 2: Workshop Owner Cannot Update Employees**
```
Error: Failed to update specialist status
```
**Checks:**
1. Verify owner has `role='owner'` in organization_members
2. Verify employee has correct workshop_id
3. Check API endpoint authorization logic
4. Review supabaseAdmin client usage (bypasses RLS)

---

**Issue 3: Admin Specialist Page Shows Empty**
```
No specialists found
```
**Checks:**
1. Verify `is_brand_specialist=true` mechanics exist
2. Check API endpoint fetches correctly
3. Review frontend data transformation
4. Check browser console for errors

---

**Issue 4: Hourly Rate Still Visible for Workshop Employees**
```
Hourly rate field showing when it shouldn't
```
**Checks:**
1. Verify `mechanicType` prop passed correctly from server component
2. Check `account_type` and `workshop_id` in database
3. Review `showHourlyRate` logic in BasicInfoTab
4. Clear browser cache

---

**Issue 5: Owner/Operator Cannot Access Workshop Dashboard**
```
Access denied or 403 error
```
**Checks:**
1. Verify mechanic has `workshop_id` set
2. Verify `created_by` in organizations table matches mechanic's `user_id`
3. Check organization_members record exists with `role='owner'`
4. Review auto-membership creation trigger

---

### Debug SQL Queries

**Check Mechanic Type:**
```sql
SELECT
  id,
  name,
  email,
  account_type,
  workshop_id,
  is_brand_specialist,
  specialist_tier
FROM mechanics
WHERE email = '[mechanic-email]';
```

**Check Workshop Membership:**
```sql
SELECT
  om.user_id,
  om.organization_id,
  om.role,
  om.status,
  o.name as workshop_name
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = '[user-id]';
```

**Check Specialist Status:**
```sql
SELECT
  m.name,
  m.email,
  m.is_brand_specialist,
  m.brand_specializations,
  m.specialist_tier,
  m.specialist_approved_at,
  m.specialist_approved_by,
  o.name as workshop_name
FROM mechanics m
LEFT JOIN organizations o ON o.id = m.workshop_id
WHERE m.is_brand_specialist = true
ORDER BY m.created_at DESC;
```

**Check RLS Policies:**
```sql
SELECT
  policyname,
  cmd,
  roles,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'mechanics'
ORDER BY policyname;
```

---

## 📝 POST-DEPLOYMENT TASKS

### Immediate (Day 1)

- [ ] Monitor error logs for any RLS violations
- [ ] Check workshop owner feedback
- [ ] Verify admin can access new specialist page
- [ ] Confirm no regressions in existing features
- [ ] Test with real workshop owner account
- [ ] Test with real workshop employee account

### Short-Term (Week 1)

- [ ] Gather feedback from workshop owners
- [ ] Monitor specialist designation changes
- [ ] Track admin approvals/revocations
- [ ] Verify session matching still works correctly
- [ ] Confirm brand specialist pricing applies
- [ ] Check for any performance issues

### Medium-Term (Month 1)

- [ ] Review audit logs for admin actions
- [ ] Analyze specialist designation patterns
- [ ] Identify any workflow improvements
- [ ] Consider adding bulk operations for admins
- [ ] Plan Phase 6 enhancements if needed

---

## 🔒 SECURITY CONSIDERATIONS

### Access Control Verification

1. **Workshop Employees** - Can ONLY:
   - View own profile
   - Edit basic info (name, phone, about_me)
   - View specialist status (read-only)
   - CANNOT edit specialist fields

2. **Workshop Owners** - Can:
   - View all team mechanics
   - Designate employees as specialists
   - Edit employee specialist brands
   - Remove employee specialist status
   - CANNOT edit other workshops' mechanics

3. **Independent Mechanics** - Can:
   - Edit own profile fully
   - Self-designate as specialist
   - Choose specialist tier and brands
   - Requires admin approval

4. **Platform Admins** - Can:
   - View all specialists across all workshops
   - Approve/reject specialist applications
   - Revoke specialist status (moderation)
   - Override any specialist designation

### RLS Policy Enforcement

All database operations go through RLS policies. Even if API has bug, database enforces:
- Workshop employees cannot UPDATE specialist fields
- Workshop owners can only UPDATE own workshop employees
- Admins can UPDATE any mechanic (via admin role check)

### API Security

- All workshop APIs use `requireWorkshopAPI()` guard
- All admin APIs use `requireAdmin()` guard
- Supabase Admin client used only for privileged operations
- Audit logs track all admin specialist changes

---

## 📈 METRICS TO TRACK

### Business Metrics

- Total specialists before/after deployment
- Workshop-designated specialists count
- Independent specialists count
- Specialist applications (pending/approved/rejected)
- Admin specialist actions (approvals/revocations)

### Technical Metrics

- API response times (workshop team, admin specialists)
- Database query performance
- RLS policy violations (should be 0)
- Error rates on specialist endpoints
- Page load times for team/specialists pages

### User Experience Metrics

- Workshop owner adoption of team management
- Time to designate employee as specialist
- Admin time to approve/revoke specialists
- User complaints about specialist controls

---

## ✅ FINAL CHECKLIST

Before marking deployment as complete:

- [ ] Database migration applied successfully
- [ ] All RLS policies active
- [ ] Workshop owner tested team management
- [ ] Workshop employee sees read-only specialist status
- [ ] Admin tested specialist management page
- [ ] Independent mechanic can still self-designate
- [ ] Owner/operator has full access
- [ ] Hourly rate visibility correct for all types
- [ ] No errors in application logs
- [ ] No regressions in existing features
- [ ] Documentation updated
- [ ] Team notified of new features
- [ ] Support team briefed on new workflows

---

## 📚 RELATED DOCUMENTATION

- [src/app/mechanic/profile/MechanicProfileClient.tsx:214](src/app/mechanic/profile/MechanicProfileClient.tsx#L214) - Profile UI with read-only specialist status
- [src/app/workshop/team/page.tsx:1](src/app/workshop/team/page.tsx#L1) - Workshop team management UI
- [src/app/admin/(shell)/mechanics/specialists/page.tsx:1](src/app/admin/(shell)/mechanics/specialists/page.tsx#L1) - Admin specialist management
- [supabase/migrations/20251112000001_lock_specialist_fields.sql:1](supabase/migrations/20251112000001_lock_specialist_fields.sql#L1) - RLS policies

**Implementation Status:** [IMPLEMENTATION_STATUS_2025-11-12.md](IMPLEMENTATION_STATUS_2025-11-12.md)
**Final Plan:** [FINAL_WORKSHOP_SPECIALIST_PLAN_2025-11-12.md](FINAL_WORKSHOP_SPECIALIST_PLAN_2025-11-12.md)

---

**Document Status:** ✅ COMPLETE
**Deployment Status:** 🟡 READY FOR DEPLOYMENT
**Last Updated:** 2025-11-12

---

*This guide covers the complete deployment of workshop specialist control system. Follow each step carefully and verify success criteria before marking as complete.*
