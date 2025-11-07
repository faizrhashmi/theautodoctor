# MANUAL TESTING GUIDE
## Database Integrity Fixes - Phases 1-3

**Version:** 1.0
**Date:** 2025-10-27
**Purpose:** Comprehensive manual testing checklist for database fixes

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1 Testing: RLS Policies & Constraints](#phase-1-testing)
3. [Phase 2 Testing: Policy Fixes & Validation](#phase-2-testing)
4. [Phase 3 Testing: Data Integrity](#phase-3-testing)
5. [End-to-End Workflow Tests](#end-to-end-workflow-tests)
6. [Regression Testing](#regression-testing)
7. [Performance Testing](#performance-testing)
8. [Security Testing](#security-testing)

---

## Prerequisites

### Test Accounts Required

- [ ] **Admin Account**
  - Email: _____________
  - Role: `admin` in profiles table
  - Access: Admin panel at `/admin`

- [ ] **Customer Account 1**
  - Email: _____________
  - Role: `customer`
  - Has: Active sessions, intakes

- [ ] **Customer Account 2**
  - Email: _____________
  - Role: `customer`
  - Purpose: Test isolation between customers

- [ ] **Mechanic Account 1**
  - Email: _____________
  - Account Type: `independent`
  - Has: Mechanic token authentication

- [ ] **Workshop Account**
  - Organization: _____________
  - Members: 2+ users
  - Has: Workshop-specific data

### Test Data Requirements

- [ ] At least 3 active sessions in database
- [ ] At least 2 organizations with members
- [ ] At least 5 chat messages in different sessions
- [ ] At least 2 repair quotes
- [ ] At least 1 diagnostic session

### Tools & Access

- [ ] Database access via Supabase dashboard
- [ ] Browser DevTools open (Console + Network tabs)
- [ ] Postgres client (optional, for direct SQL queries)
- [ ] Test environment deployed with ALL migrations applied

---

## Phase 1 Testing: RLS Policies & Constraints

### Test 1.1: Missing RLS Policies (9 Tables)

**Tables Fixed:** repair_quotes, diagnostic_sessions, in_person_visits, quote_modifications, platform_fee_rules, repair_payments, platform_chat_messages, customer_favorites, workshop_roles

#### Test 1.1.1: Repair Quotes Access

**Objective:** Verify workshops can only see their own quotes

**Steps:**
1. [ ] Login as Workshop Admin
2. [ ] Navigate to repair quotes page
3. [ ] Attempt to view quotes
4. [ ] **Expected:** Can see own quotes only
5. [ ] **Expected:** Cannot see quotes from other workshops

**SQL Verification:**
```sql
-- Should return 0 (RLS blocks other workshops)
SELECT COUNT(*) FROM repair_quotes
WHERE workshop_id != '<current_workshop_id>';
```

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

**Notes:**
___________________________________________________________________

#### Test 1.1.2: Diagnostic Sessions Access

**Objective:** Verify RLS policies allow proper access to diagnostic sessions

**Steps:**
1. [ ] Login as Customer 1
2. [ ] Navigate to diagnostic sessions
3. [ ] **Expected:** Can see own diagnostic sessions
4. [ ] Login as Customer 2
5. [ ] **Expected:** Cannot see Customer 1's sessions

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

### Test 1.2: Chat Messages Foreign Key (Polymorphic)

**Fixed:** chat_messages.sender_id validation

#### Test 1.2.1: Valid User Sender

**Steps:**
1. [ ] Login as Customer
2. [ ] Open any chat session
3. [ ] Send a message
4. [ ] Check browser console for errors
5. [ ] **Expected:** Message sent successfully
6. [ ] **Expected:** sender_id populated in database

**SQL Verification:**
```sql
SELECT sender_id, content
FROM chat_messages
WHERE session_id = '<test_session_id>'
ORDER BY created_at DESC LIMIT 1;
```

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

#### Test 1.2.2: Invalid Sender Rejected

**Steps:**
1. [ ] Open browser DevTools console
2. [ ] Run the following code:
```javascript
// This should fail validation
await supabase.from('chat_messages').insert({
  session_id: '<valid_session_id>',
  sender_id: '00000000-0000-0000-0000-000000000001', // Invalid
  content: 'Test message'
})
```
3. [ ] **Expected:** Error returned (foreign key violation)
4. [ ] **Expected:** Error code: 23503

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

### Test 1.3: Admin Recursive Policies

**Fixed:** Profiles table admin policies with SECURITY DEFINER function

#### Test 1.3.1: Admin Can View All Profiles

**Steps:**
1. [ ] Login as Admin
2. [ ] Navigate to `/admin/users`
3. [ ] **Expected:** Page loads without timeout
4. [ ] **Expected:** Can see list of all users
5. [ ] **Expected:** Query completes in < 2 seconds

**SQL Verification:**
```sql
-- Should complete without timeout
SELECT id, email, role
FROM profiles
LIMIT 100;
```

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

#### Test 1.3.2: Non-Admin Cannot View All Profiles

**Steps:**
1. [ ] Login as Customer
2. [ ] Attempt to navigate to `/admin/users`
3. [ ] **Expected:** Redirected or access denied
4. [ ] **Expected:** Cannot see other users' profiles

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

## Phase 2 Testing: Policy Fixes & Validation

### Test 2.1: Session Files RLS

**Fixed:** File upload/download blocked by missing policies

#### Test 2.1.1: File Upload to Own Session

**Steps:**
1. [ ] Login as Customer
2. [ ] Open an active chat session
3. [ ] Click file attachment button
4. [ ] Select a test image (< 10MB)
5. [ ] **Expected:** File uploads successfully
6. [ ] **Expected:** File appears in chat
7. [ ] **Expected:** No console errors

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

#### Test 2.1.2: File Download from Own Session

**Steps:**
1. [ ] In same session as above
2. [ ] Click download link on uploaded file
3. [ ] **Expected:** File downloads successfully
4. [ ] **Expected:** File contents match uploaded file

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

#### Test 2.1.3: File Access Blocked for Other Users

**Steps:**
1. [ ] As Customer 1, upload file to session
2. [ ] Note the file URL
3. [ ] Logout
4. [ ] Login as Customer 2
5. [ ] Try to access the file URL directly
6. [ ] **Expected:** Access denied or 403 error

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

### Test 2.2: Mechanic Time Off (Custom Auth)

**Fixed:** Policy used auth.uid() instead of mechanic_sessions auth

#### Test 2.2.1: Mechanic Can Manage Time Off

**Steps:**
1. [ ] Login as Mechanic (via mechanic dashboard)
2. [ ] Navigate to Time Off settings
3. [ ] Add a new time off period
4. [ ] **Expected:** Time off created successfully
5. [ ] Edit the time off period
6. [ ] **Expected:** Edit successful
7. [ ] Delete the time off period
8. [ ] **Expected:** Deletion successful

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

### Test 2.3: Service Plans Security Fix

**Fixed:** CRITICAL - USING (true) allowed anyone to modify

#### Test 2.3.1: Non-Admin Cannot Modify Service Plans

**Steps:**
1. [ ] Login as Customer
2. [ ] Open browser console
3. [ ] Run:
```javascript
await supabase.from('service_plans').update({
  is_active: false
}).eq('id', '<any_service_plan_id>')
```
4. [ ] **Expected:** Error returned (permission denied)
5. [ ] **Expected:** Service plan not modified

**SQL Verification:**
```sql
-- Verify service plan unchanged
SELECT is_active
FROM service_plans
WHERE id = '<test_plan_id>';
```

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

#### Test 2.3.2: Admin Can Modify Service Plans

**Steps:**
1. [ ] Login as Admin
2. [ ] Navigate to admin service plans page
3. [ ] Toggle a service plan active/inactive
4. [ ] **Expected:** Update successful
5. [ ] Refresh page
6. [ ] **Expected:** Change persisted

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

### Test 2.4: Organization Members Recursion

**Fixed:** Recursive policy causing performance issues

#### Test 2.4.1: Organization Members Query Performance

**Steps:**
1. [ ] Login as Workshop Admin
2. [ ] Navigate to organization members page
3. [ ] Time how long page takes to load
4. [ ] **Expected:** Page loads in < 3 seconds
5. [ ] **Expected:** No browser console errors
6. [ ] **Expected:** No "query timeout" errors

**SQL Verification:**
```sql
-- Should complete quickly (< 1 second)
EXPLAIN ANALYZE
SELECT * FROM organization_members
WHERE organization_id = '<test_org_id>';
```

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

### Test 2.5: Missing DELETE Policies

**Fixed:** 9 tables lacked DELETE policies

#### Test 2.5.1: Delete Own Intake

**Steps:**
1. [ ] Login as Customer
2. [ ] Navigate to intakes/history
3. [ ] Find an old intake
4. [ ] Click delete button
5. [ ] **Expected:** Deletion successful
6. [ ] **Expected:** Intake removed from list

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

#### Test 2.5.2: Delete Own Session Request

**Steps:**
1. [ ] Login as Customer
2. [ ] Create a pending session request
3. [ ] Before mechanic accepts, cancel/delete it
4. [ ] **Expected:** Deletion successful

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

### Test 2.6: Type Mismatches

**Fixed:** Enum validation for sessions.status and mechanics.account_type

#### Test 2.6.1: Invalid Session Status Rejected

**Steps:**
1. [ ] Open browser console
2. [ ] Run:
```javascript
await supabase.from('sessions').insert({
  type: 'chat',
  status: 'invalid_status',
  plan: 'chat10'
})
```
3. [ ] **Expected:** Error returned
4. [ ] **Expected:** Error mentions "sessions_status_check"

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

#### Test 2.6.2: Valid Session Statuses Work

**Steps:**
1. [ ] Test each valid status: pending, waiting, live, scheduled, completed, cancelled, expired, unattended
2. [ ] For each status, verify sessions can be created/updated
3. [ ] **Expected:** All valid statuses work

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

## Phase 3 Testing: Data Integrity

### Test 3.1: JSONB Validation

**Fixed:** No validation on JSONB structure

#### Test 3.1.1: Repair Quote line_items Must Be Array

**Steps:**
1. [ ] Open browser console
2. [ ] Run:
```javascript
await supabase.from('repair_quotes').insert({
  session_id: '<valid_session_id>',
  workshop_id: '<valid_workshop_id>',
  line_items: { wrong: 'type' }, // Should be array
  labor_hours: 2,
  labor_rate: 100
})
```
3. [ ] **Expected:** Error returned
4. [ ] **Expected:** Error mentions "line_items_is_array"

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

#### Test 3.1.2: Organization permissions Must Be Object

**Steps:**
1. [ ] Similar test for organization_members.permissions
2. [ ] Try inserting array instead of object
3. [ ] **Expected:** Error about "permissions_is_object"

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

### Test 3.2: Pre-Insert Validation

**Fixed:** Added validation before database operations

#### Test 3.2.1: Invalid Customer ID in Fulfillment

**Steps:**
1. [ ] Trigger a checkout with invalid customer_id
2. [ ] **Expected:** Clear error message about customer not existing
3. [ ] **Expected:** No orphaned records created

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

#### Test 3.2.2: Chat Message with Invalid Session

**Steps:**
1. [ ] Login as Customer
2. [ ] Open chat with valid session
3. [ ] In another tab, delete that session from database
4. [ ] Return to chat, try to send message
5. [ ] **Expected:** Error message: "Cannot send message: session is invalid"
6. [ ] **Expected:** User-friendly error, not cryptic database error

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

#### Test 3.2.3: Admin Reassign to Invalid Mechanic

**Steps:**
1. [ ] Login as Admin
2. [ ] Try to reassign session to non-existent mechanic ID
3. [ ] **Expected:** Error: "Mechanic validation failed"
4. [ ] **Expected:** Session not modified

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

### Test 3.3: Admin Table Policies

**Fixed:** 9 admin tables had RLS enabled but no policies

#### Test 3.3.1: Admin Can Access Logs

**Steps:**
1. [ ] Login as Admin
2. [ ] Navigate to `/admin/logs`
3. [ ] **Expected:** Logs page loads successfully
4. [ ] **Expected:** Can see admin_logs table data

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

#### Test 3.3.2: Non-Admin Cannot Access Logs

**Steps:**
1. [ ] Login as Customer
2. [ ] Try to access `/admin/logs`
3. [ ] **Expected:** Access denied or redirected
4. [ ] In console, try:
```javascript
await supabase.from('admin_logs').select('*')
```
5. [ ] **Expected:** Empty result (RLS blocks)

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

### Test 3.4: NULL Uniqueness

**Fixed:** Duplicate pending invites allowed

#### Test 3.4.1: Duplicate Pending Invite Blocked

**Steps:**
1. [ ] Login as Workshop Admin
2. [ ] Invite user with email: test@example.com
3. [ ] Before they accept, try to invite same email again
4. [ ] **Expected:** Error: "User with email test@example.com already has a pending invite"
5. [ ] **Expected:** Second invite not created

**SQL Verification:**
```sql
SELECT COUNT(*) FROM organization_members
WHERE invite_email = 'test@example.com'
AND status = 'pending';
-- Should be 1, not 2
```

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

#### Test 3.4.2: Multiple Active Members Allowed

**Steps:**
1. [ ] Add multiple active members to same organization
2. [ ] **Expected:** All members added successfully
3. [ ] **Expected:** No unique constraint violations

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

## End-to-End Workflow Tests

### E2E Test 1: Complete Session Workflow

**Objective:** Verify database fixes don't break normal workflows

**Steps:**
1. [ ] Customer creates intake
2. [ ] Customer purchases session (Stripe checkout)
3. [ ] Fulfillment creates session_request
4. [ ] **Verify:** All foreign keys valid
5. [ ] Mechanic accepts request
6. [ ] **Verify:** Session participant created
7. [ ] Both join chat
8. [ ] Send messages back and forth
9. [ ] **Verify:** Chat messages have valid sender_id
10. [ ] Upload file
11. [ ] **Verify:** File upload successful
12. [ ] Mechanic completes session
13. [ ] Customer receives summary
14. [ ] **Verify:** All data persisted correctly

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

**Notes:**
___________________________________________________________________

---

### E2E Test 2: Workshop Quote Workflow

**Steps:**
1. [ ] Customer requests repair quote
2. [ ] Workshop creates quote with line_items array
3. [ ] **Verify:** JSONB validation passes
4. [ ] Customer views quote
5. [ ] Workshop modifies quote
6. [ ] Customer accepts quote
7. [ ] **Verify:** All operations succeed
8. [ ] **Verify:** Workshop cannot see quotes from other workshops

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

## Regression Testing

### Regression Test 1: Existing Features Still Work

**Areas to Test:**
- [ ] User registration
- [ ] User login
- [ ] Password reset
- [ ] Profile editing
- [ ] Session scheduling
- [ ] Payment processing
- [ ] Video sessions
- [ ] Mechanic dashboard
- [ ] Admin panel

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

## Performance Testing

### Performance Test 1: Query Response Times

**Objective:** Verify fixes didn't degrade performance

**Queries to Benchmark:**
1. [ ] `SELECT * FROM sessions WHERE customer_user_id = X` (< 100ms)
2. [ ] `SELECT * FROM organization_members WHERE organization_id = X` (< 50ms)
3. [ ] `SELECT * FROM profiles WHERE role = 'admin'` (< 100ms)
4. [ ] `SELECT * FROM chat_messages WHERE session_id = X` (< 200ms)

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

## Security Testing

### Security Test 1: RLS Bypass Attempts

**Objective:** Verify RLS cannot be bypassed

**Tests:**
1. [ ] Try to access other users' data via API
2. [ ] Try SQL injection in query parameters
3. [ ] Try to modify service_plans as non-admin
4. [ ] Try to access admin tables as customer

**Status:** ☐ Pass  ☐ Fail  ☐ Skipped

---

## Test Summary

**Date Completed:** _______________
**Tested By:** _______________
**Environment:** ☐ Development  ☐ Staging  ☐ Production

### Results Summary

| Phase | Total Tests | Passed | Failed | Skipped |
|-------|------------|--------|--------|---------|
| Phase 1 | _____ | _____ | _____ | _____ |
| Phase 2 | _____ | _____ | _____ | _____ |
| Phase 3 | _____ | _____ | _____ | _____ |
| E2E | _____ | _____ | _____ | _____ |
| Regression | _____ | _____ | _____ | _____ |
| **TOTAL** | _____ | _____ | _____ | _____ |

### Critical Issues Found

1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

### Recommendations

1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

### Sign-Off

**QA Lead:** _______________  **Date:** _______________
**Tech Lead:** _______________  **Date:** _______________
**Product Owner:** _______________  **Date:** _______________

---

**Document Version:** 1.0
**Last Updated:** 2025-10-27
**Maintained By:** Development Team
