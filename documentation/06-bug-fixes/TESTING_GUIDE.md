# Testing Guide - Phase 1 Access Control
**Date**: 2025-01-09
**Status**: Ready for Manual Testing

---

## 🚨 IMPORTANT: Database Migration Issue Detected

Before testing, you need to resolve migration sync issues:

```
Local migrations out of sync with remote:
- Migration 99999999999 exists on remote but not locally
- Migration 99999999999999 exists locally but not on remote
```

**Recommended Action:**
1. Open Supabase Studio: http://127.0.0.1:54323
2. Go to SQL Editor
3. Use the Studio UI to create test users (instructions below)

---

## 📝 TEST USER CREATION (Manual Method)

Since there are migration sync issues, please create test users manually via Supabase Studio.

### **Access Supabase Studio:**
- URL: http://127.0.0.1:54323
- Navigate to: SQL Editor
- Create a new query

### **SQL Script for Test Users:**

The complete SQL script is available at: [scripts/create-test-users.sql](scripts/create-test-users.sql)

**Note:** The script may need adjustments based on your actual database schema. Here's a simplified version:

---

## 🧪 SIMPLIFIED TEST USER CREATION

### Option 1: Use Your Existing Mechanics

If you already have mechanics in your database, you can modify them for testing:

```sql
-- Make an existing mechanic a workshop employee
UPDATE mechanics
SET
  workshop_id = (SELECT id FROM organizations WHERE name = 'Some Workshop' LIMIT 1),
  account_type = 'workshop'
WHERE email = 'existing.mechanic@example.com';

-- Make another mechanic virtual-only
UPDATE mechanics
SET
  workshop_id = NULL,
  account_type = NULL
WHERE email = 'another.mechanic@example.com';
```

### Option 2: Create via Application UI

1. **Create Virtual-Only Mechanic:**
   - Go to mechanic signup
   - Complete signup (don't link to any workshop)
   - This creates a virtual-only mechanic automatically

2. **Create Workshop Employee:**
   - First, create a workshop account
   - Then, workshop invites mechanic
   - Mechanic accepts invite
   - This creates workshop employee automatically

---

## ✅ PHASE 1 TESTING CHECKLIST

### **Test 1: Workshop Employee Access Control (CRITICAL)**

**Setup:**
- Need a mechanic with `account_type = 'workshop'` and `workshop_id` set

**Test Steps:**
1. Login to mechanic dashboard with workshop employee credentials
2. Check sidebar navigation

**Expected Results:**
- ✅ Sidebar shows: Dashboard, Sessions, Quotes, CRM, Reviews, Documents, Availability, Profile
- ✅ Sidebar **HIDES**: Earnings, Analytics
- ✅ Direct navigation to `/mechanic/earnings` →  403 Forbidden
- ✅ Direct navigation to `/mechanic/analytics` → 403 Forbidden
- ✅ Error message: "Workshop employees cannot access earnings. Contact your workshop admin for payment details."

**Screenshots Needed:**
1. Sidebar (showing missing Earnings/Analytics)
2. 403 error page when accessing `/mechanic/earnings`

---

### **Test 2: Virtual-Only Mechanic (Unchanged Functionality)**

**Setup:**
- Need a mechanic with `workshop_id = NULL`

**Test Steps:**
1. Login to mechanic dashboard
2. Check sidebar navigation
3. Navigate to Earnings page
4. Navigate to Analytics page

**Expected Results:**
- ✅ Sidebar shows **ALL** items including Earnings and Analytics
- ✅ `/mechanic/earnings` loads successfully
- ✅ `/mechanic/analytics` loads successfully
- ✅ Revenue data displays correctly

---

### **Test 3: Independent Workshop Owner (Unchanged Functionality)**

**Setup:**
- Need a mechanic with `account_type = 'independent'` and `workshop_id` pointing to their own workshop

**Test Steps:**
1. Login to mechanic dashboard
2. Check sidebar navigation
3. Navigate to Earnings page
4. Navigate to Analytics page
5. Navigate to Quotes page

**Expected Results:**
- ✅ Sidebar shows **ALL** items
- ✅ `/mechanic/earnings` loads successfully
- ✅ `/mechanic/analytics` loads successfully
- ✅ `/mechanic/quotes` works (can create quotes)
- ✅ Revenue data displays correctly

---

## 🔍 DEBUGGING QUERIES

If you need to check mechanic types in your database:

```sql
-- View all mechanics with their types
SELECT
  name,
  email,
  account_type,
  workshop_id,
  CASE
    WHEN workshop_id IS NULL THEN 'VIRTUAL_ONLY'
    WHEN account_type = 'workshop' THEN 'WORKSHOP_AFFILIATED'
    WHEN account_type = 'independent' THEN 'INDEPENDENT_WORKSHOP'
    ELSE 'UNKNOWN'
  END as mechanic_type
FROM mechanics
ORDER BY mechanic_type;
```

```sql
-- Check if a specific mechanic can access earnings
SELECT
  m.name,
  m.email,
  m.account_type,
  m.workshop_id,
  CASE
    WHEN m.workshop_id IS NOT NULL AND m.account_type = 'workshop'
    THEN 'BLOCKED from earnings/analytics'
    ELSE 'CAN access earnings/analytics'
  END as access_level
FROM mechanics m
WHERE m.email = 'your.mechanic@email.com';
```

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue 1: Sidebar Still Shows Earnings/Analytics for Workshop Employee

**Possible Causes:**
1. Browser cache not cleared
2. Mechanic type not detected correctly

**Solutions:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Check browser console for errors
3. Verify mechanic type in database:
   ```sql
   SELECT account_type, workshop_id FROM mechanics WHERE email = 'employee@example.com';
   ```
4. Check `/api/mechanics/me` response in Network tab

---

### Issue 2: 403 Error Not Showing

**Possible Causes:**
1. Code changes not deployed
2. API route not updated

**Solutions:**
1. Restart development server:
   ```bash
   pnpm dev
   ```
2. Check API file was saved: `src/app/api/mechanics/earnings/route.ts`
3. Verify import statement exists:
   ```typescript
   import { getMechanicType, MechanicType } from '@/types/mechanic'
   ```

---

### Issue 3: Type Detection Not Working

**Possible Causes:**
1. `/api/mechanics/me` not returning required fields
2. Type detection logic error

**Debug Steps:**
1. Check API response in browser DevTools:
   - Open Network tab
   - Navigate to dashboard
   - Find `/api/mechanics/me` request
   - Check response includes: `account_type`, `workshop_id`, `service_tier`

2. Test type detection:
   ```typescript
   // In browser console (on mechanic dashboard):
   fetch('/api/mechanics/me')
     .then(r => r.json())
     .then(data => {
       console.log('Mechanic data:', data)
       console.log('Account type:', data.account_type)
       console.log('Workshop ID:', data.workshop_id)
     })
   ```

---

## 📊 TESTING REPORT TEMPLATE

After testing, please provide feedback in this format:

```markdown
## Phase 1 Testing Results

**Test Date:** YYYY-MM-DD
**Tested By:** Your Name

### Test 1: Workshop Employee
- [ ] Sidebar hides Earnings/Analytics
- [ ] 403 error on /mechanic/earnings
- [ ] 403 error on /mechanic/analytics
- [ ] Error message displayed correctly
- **Issues Found:** (describe any issues)
- **Screenshots:** (attach if available)

### Test 2: Virtual-Only Mechanic
- [ ] Sidebar shows all items
- [ ] Earnings page loads
- [ ] Analytics page loads
- **Issues Found:** (describe any issues)

### Test 3: Independent Workshop
- [ ] Sidebar shows all items
- [ ] Earnings page loads
- [ ] Analytics page loads
- [ ] Quotes functionality works
- **Issues Found:** (describe any issues)

### Overall Assessment
- **Phase 1 Status:** ✅ PASS / ❌ FAIL
- **Ready for Phase 2:** YES / NO
- **Additional Comments:**
```

---

## 🚀 NEXT STEPS AFTER TESTING

### If Tests Pass ✅
1. Phase 1 is complete and working
2. Ready to proceed to Phase 2: Workshop Admin Availability Control
3. I will implement:
   - Workshop admin controls for employee schedules
   - Database table for schedules
   - API endpoints
   - UI components

### If Tests Fail ❌
1. Report issues found
2. I will debug and fix
3. Re-test until all tests pass
4. Then proceed to Phase 2

---

## 📞 NEED HELP?

If you encounter issues:

1. **Check browser console** for JavaScript errors
2. **Check Network tab** for failed API requests
3. **Provide screenshots** of the issue
4. **Share mechanic email** you're testing with
5. **Run debugging queries** above and share results

I'm ready to help debug and fix any issues you find!

---

**Files to Check if Issues Occur:**
- [src/app/api/mechanics/earnings/route.ts](src/app/api/mechanics/earnings/route.ts#L23-L31)
- [src/app/api/mechanics/analytics/route.ts](src/app/api/mechanics/analytics/route.ts#L21-L29)
- [src/components/mechanic/MechanicSidebar.tsx](src/components/mechanic/MechanicSidebar.tsx#L197-L216)
- [src/types/mechanic.ts](src/types/mechanic.ts#L94-L103) (Type definitions)
