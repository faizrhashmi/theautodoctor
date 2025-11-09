# Database Schema & RLS Analysis - PART 1: Executive Summary

**Analysis Date:** November 8, 2025
**Scope:** Sign-up related tables, RLS policies, foreign keys, security

## EXECUTIVE SUMMARY

The database schema has significant security infrastructure for sign-up flows, including PIPEDA-compliant consent management and RLS policies. However, **critical vulnerabilities prevent proper functionality**.

### KEY FINDINGS

#### Strengths:
- RLS policies broadly implemented
- PIPEDA/CASL compliance frameworks created
- Foreign key constraints mostly correct
- Audit trails for sensitive operations

#### Critical Issues:
1. **MISSING INSERT POLICIES** - Users cannot create organizations/accounts
2. **BROKEN mechanic_documents RLS** - Circular logic prevents any access
3. **Missing email INDEX** - Signup lookups will be slow
4. **Race conditions** - organization_members unique constraints incomplete
5. **No RLS on mechanics table** - RLS enabled but no policies defined

## AFFECTED TABLES

### 1. PROFILES TABLE (Customer Sign-Up)
- **Issues:**
  - ❌ NO EMAIL INDEX - signup lookups slow
  - ✅ Basic RLS policies working
  - ⚠️ Soft delete fields not indexed properly
  - ⚠️ JSONB fields unvalidated

### 2. MECHANICS TABLE (Professional Sign-Up)
- **Critical:** RLS enabled but NO POLICIES DEFINED
- Cannot view own profiles
- Cannot update credentials
- Needs urgent policies

### 3. ORGANIZATIONS TABLE (Workshop/Corporate Sign-Up)
- **Critical:** NO INSERT POLICY
- Users cannot create organizations via RLS
- Service role only workaround

### 4. ORGANIZATION_MEMBERS TABLE (Team Invitations)
- **Critical:** NO INSERT POLICY for invitations
- Race conditions in unique constraints
- Allows duplicate pending invites

### 5. MECHANIC_DOCUMENTS TABLE (Credential Upload)
- **Critical:** Broken RLS policies - circular logic
- `WHERE id = mechanic_id` always evaluates incorrectly
- Users cannot upload/view documents

### 6. CORPORATE_BUSINESSES TABLE (B2B Sign-Up)
- **Critical:** NO INSERT POLICY
- Users cannot create corporate accounts
- Foreign keys could fail

### 7. CUSTOMER_CONSENTS TABLE (PIPEDA Compliance)
- ✅ RLS policies mostly correct
- ⚠️ Missing UPDATE policy for consent withdrawal
- Well-designed PIPEDA compliance

### 8. ACCOUNT_DELETION_QUEUE TABLE (Right to Erasure)
- ✅ RLS policies correct
- ⚠️ Missing UPDATE policy for processing

## SIGN-UP FLOW BLOCKING ISSUES

### Issue #1: No INSERT Policies
Tables with missing INSERT policies that block sign-up:
- organizations
- organization_members
- corporate_businesses
- corporate_employees
- corporate_invoices

### Issue #2: Broken mechanic_documents RLS
```sql
-- BROKEN:
CREATE POLICY "Mechanics can view own documents"
  ON public.mechanic_documents
  FOR SELECT
  USING (mechanic_id IN (
    SELECT id FROM public.mechanics WHERE id = mechanic_id  -- ❌ ALWAYS TRUE!
  ));
```

This returns true for ANY mechanic_id from mechanic_documents, making policy useless.

### Issue #3: Missing Email Index
```sql
-- profiles table has NO email index
-- Lookup: SELECT * FROM profiles WHERE email = 'test@example.com'
-- Will do FULL TABLE SCAN - O(n) performance
```

### Issue #4: Race Conditions in organization_members
```sql
-- Current constraint allows duplicates:
UNIQUE(organization_id, user_id)  -- Can be (org, NULL) twice!

-- Also allows:
user_id IS NULL, status = 'pending'  -- Same email, same org
```

### Issue #5: No Mechanics RLS Policies
```sql
ALTER TABLE IF EXISTS public.mechanics ENABLE ROW LEVEL SECURITY;
-- But NO policies exist!
-- Result: RLS denies all access (unless service role used)
```

## PERFORMANCE CONCERNS

| Issue | Impact | Severity |
|-------|--------|----------|
| No profiles.email index | Signup email lookup is O(n) | HIGH |
| No mechanics.user_id index | User->mechanic mapping slow | HIGH |
| Recursive admin policies | N+1 subqueries for every row | MEDIUM |
| Unindexed JSONB fields | Full table scans on vehicle_info, communication_preferences | MEDIUM |
| No coverage_postal_codes optimization | Workshop search slow | MEDIUM |

## DATA INTEGRITY ISSUES

1. **Email reuse after deletion:** Soft deleted profiles block new signups with same email
2. **Organization slug collisions:** Race condition in slug generation
3. **Cascading deletes:** Deleting users cascades to delete all historical data
4. **Invitation duplicates:** Can create multiple pending invites with same email

## SECURITY ISSUES

1. **SIN stored in plaintext:** sin_or_business_number not encrypted
2. **DOB in plaintext:** date_of_birth not encrypted
3. **54 SECURITY DEFINER functions:** Some lack permission checks
4. **Missing validation:** Emails, phones, postal codes have no format validation
5. **Storage URLs unvalidated:** Could contain malicious links

## RECOMMENDATIONS BY PRIORITY

### CRITICAL (Deploy within 24 hours):
1. Add INSERT policies for organizations, organization_members, corporate_businesses
2. Fix mechanic_documents RLS policies
3. Add email uniqueness index (profiles.email WHERE deleted_at IS NULL)
4. Add mechanics RLS policies
5. Test waiver_acceptances INSERT policy

### HIGH (Deploy within 1 week):
1. Fix organization_members unique constraints (race conditions)
2. Add missing indexes (mechanics.user_id, organization_members.invite_code)
3. Replace recursive admin policies with JWT checks
4. Add validation constraints (email, phone, postal code)
5. Encrypt sensitive fields (SIN, DOB)

### MEDIUM (Deploy within 2 weeks):
1. Add JSONB indexes (GIN)
2. Add consent withdrawal UPDATE policies
3. Fix soft-delete cascading issues
4. Improve sluggeneration atomicity
5. Add audit logging for sensitive access

---

See SCHEMA_ANALYSIS_PART2.md for detailed table analysis and SQL fixes.
