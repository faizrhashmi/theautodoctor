# Database Cleanup Guide - Legacy Authentication Artifacts
**Created:** October 29, 2025
**Version:** 1.0
**Status:** Ready for Execution
**Estimated Time:** 14-180 days (phased approach)

---

## Overview

This guide provides step-by-step procedures for safely removing deprecated authentication artifacts from TheAutoDoctor database following the migration to Supabase Auth. The cleanup will remove:

1. **mechanic_sessions table** - Legacy session tracking
2. **password_hash column** - Old password storage in mechanics table

### Purpose

**Why Clean Up?**
- Remove security liabilities (old password hashes)
- Reduce database complexity
- Prevent confusion about which auth system is active
- Eliminate 2+ years of legacy technical debt
- Ensure single source of truth (Supabase Auth)

**What This Achieves:**
- ✅ Simplified authentication architecture
- ✅ Reduced attack surface
- ✅ Cleaner codebase (no dual auth support)
- ✅ Improved maintainability
- ✅ Better developer experience

---

## Prerequisites Checklist

Before proceeding with cleanup, ALL of these conditions must be met:

### Database Prerequisites ✅
- [x] All mechanics have `user_id` linked to `auth.users`
- [x] All `user_id` values point to valid Supabase Auth users
- [x] No mechanics have `user_id IS NULL`
- [x] Test mechanics (mech@test.com, mech1@test.com) migrated

### Code Prerequisites ✅
- [x] All mechanic API routes use `requireMechanicAPI` guard
- [x] No code references `aad_mech` cookie
- [x] No code queries `mechanic_sessions` table
- [x] No code uses `password_hash` column
- [x] Frontend login uses Supabase Auth

### Testing Prerequisites ⏳
- [ ] All mechanics can login successfully
- [ ] All sidebar pages load without 401 errors
- [ ] Session management works correctly
- [ ] No auth loops or infinite redirects
- [ ] Manual testing completed by QA

### Production Prerequisites ⏳
- [ ] Code deployed to production
- [ ] Production running on Supabase Auth for 7+ days
- [ ] No increase in auth-related errors
- [ ] No user complaints about login issues
- [ ] Database backup taken within 24 hours

### Safety Prerequisites 📋
- [ ] Full database backup completed
- [ ] Rollback procedure documented and tested
- [ ] Team notified of maintenance window
- [ ] Monitoring alerts configured
- [ ] Emergency contact list prepared

---

## Migration Timeline

### Recommended Phased Approach

This cleanup uses a conservative, safety-first approach with multiple checkpoints:

```
Day 0: Verification
  └─> Run verification queries
  └─> Confirm all prerequisites met
  └─> Take database backup

Day 0-7: Monitoring Period
  └─> Monitor auth error rates
  └─> Track user feedback
  └─> Verify no regressions

Day 7: Drop mechanic_sessions Table
  └─> Archive session data
  └─> Drop deprecated table
  └─> Verify functionality

Day 7-14: Extended Monitoring
  └─> Monitor for issues
  └─> Confirm stability
  └─> Prepare for final cleanup

Day 14: Drop password_hash Column
  └─> Archive password hashes
  └─> Drop deprecated column
  └─> Verify security

Day 14-180: Archive Retention
  └─> Keep archives for rollback
  └─> Monitor long-term stability
  └─> Plan archive deletion

Day 180: Delete Archives (Optional)
  └─> Permanently delete sensitive data
  └─> Complete cleanup
```

### Accelerated Timeline (Not Recommended)

If you must accelerate, the minimum timeline is:
- **Day 0:** Verification
- **Day 7:** Drop both table and column
- **Day 180:** Delete archives

**Warning:** This approach increases risk and reduces rollback window.

---

## Migration Files

### File 1: Verification Migration
**File:** `supabase/migrations/20251029000010_verify_mechanics_user_id.sql`
**Purpose:** Pre-flight safety checks before cleanup
**Execution Time:** 2-5 seconds
**Safe to Run:** Yes (read-only queries)

### File 2: Drop mechanic_sessions Table
**File:** `supabase/migrations/20251029000011_drop_mechanic_sessions_table.sql`
**Purpose:** Remove deprecated session tracking table
**Execution Time:** 5-10 seconds
**Rollback:** Yes (via archive table)

### File 3: Drop password_hash Column
**File:** `supabase/migrations/20251029000012_drop_password_hash_column.sql`
**Purpose:** Remove old password storage column
**Execution Time:** 10-30 seconds
**Rollback:** Yes (via archive table)

---

## Step-by-Step Execution

### Phase 1: Verification (Day 0)

#### Step 1.1: Take Database Backup

**Critical:** Always backup before making schema changes!

**Option A: Supabase Dashboard**
```
1. Go to Supabase Dashboard
2. Navigate to Database → Backups
3. Click "Create Manual Backup"
4. Wait for completion
5. Verify backup exists
```

**Option B: Command Line**
```bash
# Using pg_dump
pg_dump -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  --clean --if-exists \
  --format=custom \
  --file=backup_$(date +%Y%m%d_%H%M%S).dump

# Verify backup
ls -lh backup_*.dump
```

**Backup Checklist:**
- [ ] Backup completed successfully
- [ ] Backup file size looks reasonable (>10MB)
- [ ] Backup file downloaded locally
- [ ] Backup stored in secure location
- [ ] Backup timestamp noted

#### Step 1.2: Run Verification Queries

**Execute File:** `20251029000010_verify_mechanics_user_id.sql`

**Via Supabase Dashboard:**
```
1. Go to SQL Editor
2. Open new query
3. Paste verification migration content
4. Click "Run"
5. Review results
```

**Expected Results:**

**Query 1 - Mechanics Without user_id:**
```
mechanics_without_user_id | note
--------------------------|------
0                        | CRITICAL: These mechanics need migration before cleanup
```
✅ **Pass Criteria:** 0 mechanics without user_id

**Query 2 - Invalid user_id Links:**
```
mechanics_with_invalid_user_id | note
-------------------------------|------
0                             | CRITICAL: These mechanics have invalid user_id links
```
✅ **Pass Criteria:** 0 invalid links

**Query 3 - Valid user_id Links:**
```
mechanics_with_valid_user_id | note
----------------------------|------
42                         | These mechanics are ready for cleanup
```
✅ **Pass Criteria:** Count matches total mechanics

**Query 4 - Migration Summary:**
```
without_user_id | with_user_id | total_mechanics | migration_percentage
----------------|-------------|-----------------|--------------------
0              | 42          | 42              | 100.00
```
✅ **Pass Criteria:** 100% migration

**Query 5 - Active Sessions Check:**
```
NOTICE: mechanic_sessions table exists
active_sessions | note
----------------|------
0              | WARNING: These sessions are still active
```
✅ **Pass Criteria:** 0 active sessions

**Query 6 - Password Hash Check:**
```
mechanics_with_password_hash | total_mechanics | note
----------------------------|-----------------|------
0                          | 42              | These mechanics have legacy password hashes that should be NULL
```
✅ **Pass Criteria:** 0 mechanics with password_hash

#### Step 1.3: Document Verification Results

Create a verification report:

```markdown
## Verification Report - [Date]

### Prerequisites Status
- [x] All mechanics have user_id: 42/42 (100%)
- [x] All user_id links valid: 42/42 (100%)
- [x] No active sessions in mechanic_sessions: 0
- [x] No password hashes remaining: 0

### Database Backup
- Backup File: backup_20251107_120000.dump
- Backup Size: 156 MB
- Backup Location: s3://backups/prod/
- Backup Verified: Yes

### Readiness Assessment
All prerequisites met ✅
Safe to proceed with Phase 2 on [Day 7 Date]

Verified By: [Name]
Date: [Date]
Signature: [Sign]
```

---

### Phase 2: Drop mechanic_sessions Table (Day 7)

#### Step 2.1: Final Pre-Drop Checks

**24 Hours Before:**
- [ ] Review error logs for auth issues
- [ ] Check for any reported login problems
- [ ] Verify all tests passing
- [ ] Confirm backup is recent (<24 hours)
- [ ] Notify team of upcoming change

**1 Hour Before:**
- [ ] Take fresh database backup
- [ ] Put system in maintenance mode (optional)
- [ ] Clear cache
- [ ] Verify no active deploys

#### Step 2.2: Execute Migration

**Execute File:** `20251029000011_drop_mechanic_sessions_table.sql`

**Via Supabase Dashboard:**
```
1. Go to SQL Editor
2. Open new query
3. Paste migration content
4. Review migration carefully
5. Click "Run"
6. Monitor execution (5-10 seconds)
```

**Expected Output:**
```
NOTICE: SAFE: No active sessions found in mechanic_sessions table
NOTICE: Archived 1847 sessions to mechanic_sessions_archive
NOTICE: mechanic_sessions table dropped successfully
NOTICE: Legacy mechanic authentication system removed
NOTICE: All mechanics now use Supabase Auth exclusively
NOTICE: ✅ VERIFIED: mechanic_sessions table successfully removed
NOTICE: ✅ VERIFIED: mechanic_sessions_archive table created with 1847 records
```

✅ **Success Indicators:**
- No error messages
- Archive table created
- Archive record count matches expected
- Verification checks pass

❌ **Failure Indicators:**
- Error during DROP TABLE
- Archive creation failed
- Verification fails

#### Step 2.3: Immediate Verification

**Run These Queries Immediately:**

**1. Verify Table Dropped:**
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'mechanic_sessions'
) as table_exists;
```
Expected: `false`

**2. Verify Archive Created:**
```sql
SELECT COUNT(*) as archived_sessions
FROM mechanic_sessions_archive;
```
Expected: Count of previously active sessions

**3. Test Mechanic Login:**
```
1. Log out of mechanic account
2. Log in with test mechanic
3. Access dashboard
4. Navigate to CRM
5. Check for 401 errors
```
Expected: All pages load successfully

#### Step 2.4: Monitor Post-Drop (Days 7-14)

**Daily Checks:**
- [ ] Check error logs for auth failures
- [ ] Monitor 401/403 error rates
- [ ] Review user feedback channels
- [ ] Verify mechanic logins working
- [ ] Check session creation/management

**Monitoring Queries:**

**Auth Error Rate:**
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as error_count
FROM logs
WHERE status_code IN (401, 403)
  AND path LIKE '/api/mechanic%'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Failed Logins:**
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as failed_logins
FROM auth.audit_log_entries
WHERE event_type = 'login_failed'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Health Indicators:**
- ✅ Error rates stable or decreasing
- ✅ No increase in failed logins
- ✅ No user complaints
- ✅ All functionality working

---

### Phase 3: Drop password_hash Column (Day 14)

#### Step 3.1: Pre-Drop Assessment

**Evaluate Stability:**
- [ ] No auth-related incidents in past 7 days
- [ ] Error rates normal
- [ ] User feedback positive
- [ ] All tests passing
- [ ] Team confidence high

**If ANY of these are false, DELAY this phase!**

#### Step 3.2: Final Backup

**Critical:** Take a fresh backup before dropping column with sensitive data!

```bash
# Full backup with verification
pg_dump -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  --clean --if-exists \
  --format=custom \
  --file=backup_before_password_hash_drop_$(date +%Y%m%d).dump

# Verify backup contains mechanics table
pg_restore --list backup_before_password_hash_drop_*.dump | grep mechanics
```

#### Step 3.3: Execute Migration

**Execute File:** `20251029000012_drop_password_hash_column.sql`

**SECURITY NOTE:** This migration handles sensitive password hash data. The hashes are:
1. Copied to secure archive table
2. Cleared from mechanics table
3. Column dropped
4. Archive access restricted to service role only

**Via Supabase Dashboard:**
```
1. Go to SQL Editor
2. Open new query
3. Paste migration content
4. Triple-check you're on correct database
5. Review security implications
6. Click "Run"
7. Monitor execution (10-30 seconds)
```

**Expected Output:**
```
NOTICE: SAFE: All 42 mechanics have user_id linked
NOTICE: INFO: Found 0 mechanics with password_hash data (will be archived)
NOTICE: Archived 0 password hashes to mechanics_password_hash_archive
NOTICE: VERIFIED: All password hashes cleared before column drop
NOTICE: password_hash column dropped from mechanics table
NOTICE: Legacy password authentication system removed
NOTICE: All mechanics now use Supabase Auth passwords exclusively
NOTICE: ✅ VERIFIED: password_hash column successfully removed from mechanics table
NOTICE: ✅ VERIFIED: mechanics_password_hash_archive table created with 0 records
NOTICE: SECURITY: Access to mechanics_password_hash_archive restricted to service role only
```

#### Step 3.4: Verify Column Dropped

**1. Check Schema:**
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mechanics'
  AND column_name = 'password_hash';
```
Expected: 0 rows (column doesn't exist)

**2. Verify Archive Security:**
```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'mechanics_password_hash_archive';
```
Expected: Only service_role has access

**3. Test Mechanic Operations:**
```
1. Create new mechanic signup
2. Login with new mechanic
3. Change password
4. Login with new password
5. Access all dashboard pages
```
Expected: All operations work normally

#### Step 3.5: Long-Term Monitoring (Days 14-180)

**Weekly Checks:**
- [ ] Review auth error trends
- [ ] Check for any rollback requests
- [ ] Verify no regressions
- [ ] Assess archive retention needs

**Monthly Review:**
- [ ] Evaluate cleanup success
- [ ] Plan archive deletion (Day 180)
- [ ] Document lessons learned
- [ ] Update procedures

---

## Rollback Procedures

### When to Rollback

**Immediate Rollback Required If:**
- Critical auth functionality broken
- Large increase in 401/403 errors
- Unable to create new sessions
- Data integrity issues discovered
- User-reported widespread login failures

**Consider Rollback If:**
- Unexpected behavior in auth flows
- Edge cases not working
- Performance degradation
- Team lacks confidence

### Rollback: mechanic_sessions Table

**If dropped within last 7 days:**

```sql
-- Recreate the table
CREATE TABLE mechanic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Recreate indexes
CREATE INDEX idx_mechanic_sessions_token ON mechanic_sessions(token);
CREATE INDEX idx_mechanic_sessions_mechanic_id ON mechanic_sessions(mechanic_id);
CREATE INDEX idx_mechanic_sessions_expires_at ON mechanic_sessions(expires_at);

-- Restore data from archive
INSERT INTO mechanic_sessions (id, mechanic_id, token, created_at, expires_at)
SELECT id, mechanic_id, token, created_at, expires_at
FROM mechanic_sessions_archive;

-- Verify restoration
SELECT COUNT(*) FROM mechanic_sessions;
```

**After Rollback:**
1. Notify team of rollback
2. Investigate root cause
3. Fix issues
4. Plan retry attempt
5. Update procedures

### Rollback: password_hash Column

**If dropped within last 14 days:**

```sql
-- Recreate the column
ALTER TABLE mechanics
ADD COLUMN password_hash TEXT;

-- Restore data from archive
UPDATE mechanics m
SET password_hash = a.password_hash
FROM mechanics_password_hash_archive a
WHERE m.id = a.mechanic_id;

-- Verify restoration
SELECT
  COUNT(*) as total_mechanics,
  COUNT(password_hash) as with_password_hash
FROM mechanics;
```

**Critical:** After rollback, you must:
1. Revert mechanic route code to support dual auth
2. Update login flow to create `aad_mech` cookies
3. Test extensively before production deploy
4. Document why rollback was needed

### Rollback from Database Backup

**If archives are corrupted or missing:**

```bash
# Restore full database from backup
pg_restore -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  --clean --if-exists \
  backup_[date].dump

# Verify restoration
psql -h db.xxx.supabase.co -U postgres -d postgres -c "
  SELECT
    COUNT(*) as mechanics,
    COUNT(user_id) as with_user_id
  FROM mechanics;
"
```

**Warning:** This will restore ALL database changes since backup, not just mechanic auth!

---

## Safety Features

### Data Archiving

**mechanic_sessions_archive Table:**
- Stores all session data from deprecated table
- Retains: id, mechanic_id, token, created_at, expires_at
- Adds: archived_at, archive_reason
- Access: Public (read-only for investigation)
- Retention: 180 days

**mechanics_password_hash_archive Table:**
- Stores password hashes from mechanics table
- Retains: mechanic_id, password_hash, email, name, user_id
- Adds: archived_at, archive_reason
- Access: **Service role ONLY** (sensitive data)
- Retention: 180 days minimum

### Access Restrictions

**Archive Security:**
```sql
-- Revoke all public access
REVOKE ALL ON mechanics_password_hash_archive FROM PUBLIC;
REVOKE ALL ON mechanics_password_hash_archive FROM anon, authenticated;

-- Only service role can access (automatic)
```

**Why Restrict Access?**
- Password hashes are sensitive even if deprecated
- Prevents unauthorized hash analysis
- Reduces attack surface
- Compliance with security best practices

### Verification Checkpoints

Each migration includes:
- **Pre-migration checks** - Abort if conditions not met
- **Archiving step** - Create backups before drop
- **Drop operation** - Remove deprecated artifact
- **Post-drop verification** - Confirm success
- **Logging** - Record all actions

---

## Post-Cleanup Monitoring

### Day 1-7 After Each Phase

**Monitor These Metrics:**

**1. Authentication Success Rate**
```sql
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) FILTER (WHERE event_type = 'login_success') as successful,
  COUNT(*) FILTER (WHERE event_type = 'login_failed') as failed,
  ROUND(
    COUNT(*) FILTER (WHERE event_type = 'login_success')::numeric /
    COUNT(*)::numeric * 100,
    2
  ) as success_rate
FROM auth.audit_log_entries
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour DESC;
```

**2. API Error Rates**
```sql
SELECT
  path,
  status_code,
  COUNT(*) as error_count
FROM api_logs
WHERE status_code IN (401, 403)
  AND created_at > NOW() - INTERVAL '1 day'
GROUP BY path, status_code
ORDER BY error_count DESC
LIMIT 10;
```

**3. Session Creation Rate**
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as sessions_created
FROM sessions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;
```

### Health Indicators

**✅ Healthy System:**
- Auth success rate >98%
- API error rate stable or decreasing
- Session creation rate normal
- No user complaints
- All features functional

**⚠️ Warning Signs:**
- Auth success rate <95%
- Spike in 401/403 errors
- Drop in session creation
- User complaints increasing
- New error patterns

**❌ Critical Issues:**
- Auth success rate <90%
- Widespread login failures
- No session creation
- Multiple user complaints
- Data integrity problems

### Incident Response

**If Issues Detected:**

1. **Assess Severity**
   - Is core functionality broken?
   - How many users affected?
   - Is data at risk?

2. **Immediate Actions**
   - Check rollback archives exist
   - Review error logs
   - Test auth flows
   - Contact team

3. **Decision Point**
   - Can be fixed quickly? → Fix forward
   - Widespread impact? → Rollback
   - Data integrity risk? → Rollback immediately

4. **Communication**
   - Notify affected users
   - Update status page
   - Post in team channels
   - Document incident

---

## Archive Deletion (Day 180+)

### When to Delete Archives

**Delete Archives After 180 Days If:**
- ✅ No rollback requests
- ✅ System stable for 6 months
- ✅ All tests passing consistently
- ✅ No auth-related incidents
- ✅ Team approval obtained

**Do NOT Delete Archives If:**
- ❌ Any uncertainty about stability
- ❌ Recent auth-related issues
- ❌ Pending investigations
- ❌ Team hesitation
- ❌ Compliance requirements mandate retention

### Deletion Procedure

**Final Checks Before Deletion:**
```sql
-- 1. Verify tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'mechanic_sessions_archive',
    'mechanics_password_hash_archive'
  );

-- 2. Check archive age
SELECT
  'mechanic_sessions_archive' as table_name,
  MIN(archived_at) as oldest_record,
  MAX(archived_at) as newest_record,
  COUNT(*) as record_count
FROM mechanic_sessions_archive
UNION ALL
SELECT
  'mechanics_password_hash_archive' as table_name,
  MIN(archived_at) as oldest_record,
  MAX(archived_at) as newest_record,
  COUNT(*) as record_count
FROM mechanics_password_hash_archive;
```

**Execute Deletion:**
```sql
-- Final backup of archives (optional)
CREATE TABLE mechanic_sessions_archive_final_backup AS
SELECT * FROM mechanic_sessions_archive;

CREATE TABLE mechanics_password_hash_archive_final_backup AS
SELECT * FROM mechanics_password_hash_archive;

-- Drop archive tables
DROP TABLE IF EXISTS mechanic_sessions_archive CASCADE;
DROP TABLE IF EXISTS mechanics_password_hash_archive CASCADE;

-- Verify deletion
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%archive%';
```

**Post-Deletion:**
- [ ] Confirm tables dropped
- [ ] Update documentation
- [ ] Remove references in code
- [ ] Celebrate cleanup completion! 🎉

---

## Troubleshooting

### Common Issues

#### Issue 1: Verification Fails - Mechanics Without user_id

**Symptom:**
```
mechanics_without_user_id | note
--------------------------|------
3                        | CRITICAL: These mechanics need migration before cleanup
```

**Cause:** Some mechanics not migrated to Supabase Auth

**Solution:**
```sql
-- Identify unmigrated mechanics
SELECT id, email, name, created_at
FROM mechanics
WHERE user_id IS NULL;

-- Run mechanic migration script
npx ts-node scripts/migrate-test-mechanics.ts

-- Or manually migrate each:
-- (See migration script for full procedure)
```

**Prevention:** Always migrate ALL mechanics before cleanup

---

#### Issue 2: Active Sessions Found

**Symptom:**
```
EXCEPTION: Found 42 active sessions in mechanic_sessions table
```

**Cause:** Mechanics still using legacy session system

**Solution:**
```sql
-- Check active sessions
SELECT
  ms.id,
  ms.mechanic_id,
  ms.expires_at,
  m.email
FROM mechanic_sessions ms
JOIN mechanics m ON m.id = ms.mechanic_id
WHERE ms.expires_at > NOW();

-- Option 1: Wait for natural expiration (24 hours)
-- Option 2: Force expire all sessions
UPDATE mechanic_sessions
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE expires_at > NOW();

-- Option 3: Notify mechanics to re-login
```

**Prevention:** Deploy Supabase Auth code 7+ days before cleanup

---

#### Issue 3: Migration Fails - Permission Denied

**Symptom:**
```
ERROR: permission denied for table mechanic_sessions
```

**Cause:** Using wrong database role

**Solution:**
```sql
-- Check current role
SELECT current_user, current_database();

-- Switch to service role or postgres user
-- (Via Supabase Dashboard or connection string)
```

**Prevention:** Always use service role for migrations

---

#### Issue 4: Archive Restoration Fails

**Symptom:**
```
ERROR: duplicate key value violates unique constraint
```

**Cause:** Data already exists in target table

**Solution:**
```sql
-- Check for existing data
SELECT COUNT(*) FROM mechanic_sessions;

-- Clear existing data if safe
TRUNCATE mechanic_sessions CASCADE;

-- Then retry restoration
INSERT INTO mechanic_sessions (...)
SELECT ... FROM mechanic_sessions_archive;
```

**Prevention:** Verify tables are empty before restoration

---

#### Issue 5: Unable to Login After Cleanup

**Symptom:** Mechanics can't login, getting auth errors

**Cause:** Code still references legacy auth

**Solution:**
1. Check deployed code version
2. Verify all routes use `requireMechanicAPI`
3. Check for `aad_mech` cookie references
4. Review login flow implementation

**Emergency Fix:**
```bash
# Rollback database changes
# (See Rollback Procedures section)

# Revert code to previous version
git revert <commit-hash>
git push origin main

# Notify team and investigate
```

**Prevention:** Extensive testing before cleanup

---

## Best Practices

### Before Cleanup
- ✅ Migrate all mechanics to Supabase Auth
- ✅ Deploy new auth code to production
- ✅ Monitor for 7+ days without issues
- ✅ Take fresh database backup (<24 hours)
- ✅ Test rollback procedures in staging
- ✅ Document current state
- ✅ Prepare team for changes

### During Cleanup
- ✅ Execute during low-traffic period
- ✅ Have team available for support
- ✅ Monitor error rates in real-time
- ✅ Keep rollback procedures accessible
- ✅ Test immediately after each phase
- ✅ Document any issues encountered
- ✅ Communicate status to stakeholders

### After Cleanup
- ✅ Monitor closely for 7 days
- ✅ Review error logs daily
- ✅ Track user feedback
- ✅ Verify all functionality
- ✅ Update documentation
- ✅ Plan next phase or completion
- ✅ Conduct retrospective

### General Principles
- **Safety First** - Always favor caution over speed
- **Backup Everything** - Can't rollback without backups
- **Monitor Closely** - Watch for issues immediately
- **Communicate Clearly** - Keep team informed
- **Document Thoroughly** - Future you will thank you
- **Test Extensively** - Before, during, and after

---

## Related Documentation

### Authentication Migration
- [Authentication Migration Project Overview](../authentication/authentication-migration-project-overview.md)
- [Mechanic Auth Loop Resolution](../04-troubleshooting/mechanic-auth-loop-resolution.md)
- [Authentication Guards Reference](../07-technical-documentation/authentication-guards-reference.md)

### Security
- [API Security Audit (Oct 29, 2025)](../04-security/api-security-audit-2025-10-29.md)
- [Security Implementation Summary](../04-security/audit-reports/SECURITY_IMPLEMENTATION_SUMMARY.md)

### Migration Scripts
- [Verification Migration](../../supabase/migrations/20251029000010_verify_mechanics_user_id.sql)
- [Drop Sessions Table](../../supabase/migrations/20251029000011_drop_mechanic_sessions_table.sql)
- [Drop Password Hash](../../supabase/migrations/20251029000012_drop_password_hash_column.sql)

### Master Reports
- [AUTHENTICATION_MIGRATION_COMPLETE.md](../../AUTHENTICATION_MIGRATION_COMPLETE.md)
- [PHASE_1_COMPLETION_REPORT.md](../../PHASE_1_COMPLETION_REPORT.md)
- [MECHANIC_AUTH_MIGRATION_COMPLETE.md](../../MECHANIC_AUTH_MIGRATION_COMPLETE.md)

---

## Success Criteria

### Phase 2 Success (Drop mechanic_sessions)
- ✅ Table dropped successfully
- ✅ Archive created with all data
- ✅ No auth errors increase
- ✅ All mechanics can login
- ✅ Session management works
- ✅ 7 days stable operation

### Phase 3 Success (Drop password_hash)
- ✅ Column dropped successfully
- ✅ Archive created and secured
- ✅ No sensitive data leaked
- ✅ All mechanics can login
- ✅ Password changes work
- ✅ 14+ days stable operation

### Overall Cleanup Success
- ✅ All legacy artifacts removed
- ✅ Archives secured properly
- ✅ Zero rollback required
- ✅ No user complaints
- ✅ System performance maintained
- ✅ Team confident in changes
- ✅ Documentation complete

---

## Conclusion

This database cleanup safely removes deprecated authentication artifacts while maintaining comprehensive rollback capabilities. By following the phased approach with 7-14 day monitoring periods between each step, we minimize risk and ensure system stability.

**Key Principles:**
- **Phased execution** - Never rush database changes
- **Comprehensive backups** - Multiple layers of safety
- **Close monitoring** - Catch issues early
- **Easy rollback** - Archive tables for 180 days
- **Clear documentation** - This guide and verification reports

**Timeline Summary:**
- Day 0: Verification and backup
- Day 7: Drop mechanic_sessions table
- Day 14: Drop password_hash column
- Day 180: Delete archives (optional)

**Next Steps:**
1. Complete prerequisites checklist
2. Schedule cleanup phases
3. Execute verification (Day 0)
4. Monitor and proceed to Phase 2
5. Continue phased approach

---

**Document Status:** ✅ **COMPLETE**
**Cleanup Status:** ⏳ **PENDING EXECUTION**
**Risk Level:** 🟢 **LOW** (with proper procedures)

---

*Last Updated: October 29, 2025*
*Document Version: 1.0*
*Next Review: November 7, 2025 (execution day)*
*Owner: Development Team*
