# AUTHENTICATION CLEANUP EXECUTION PLAN
## Generated: 2025-10-29

---

## SCOPE
- **7 files** using `hashPassword/verifyPassword/makeSessionToken`
- **50 files** using `aad_mech` cookie references
- **49 files** using `mechanic_sessions` table queries

**Total: 106 files requiring cleanup**

---

## STRATEGY

### Phase 1: DELETE Test & Debug Files (Can be deleted entirely)
These files are for testing only and should be removed:

1. ✅ `src/app/api/test/check-mechanic-auth/route.ts` - DELETE
2. ✅ `src/app/api/test/mechanic-password-test/route.ts` - DELETE
3. ✅ `src/app/api/test/check-mechanics-tables/route.ts` - DELETE
4. ✅ `src/app/api/debug/check-mechanic/route.ts` - DELETE
5. ✅ `src/app/api/debug/auth-status/route.ts` - DELETE
6. ✅ `src/app/api/debug/mechanic-requests/route.ts` - DELETE
7. ✅ `src/app/api/admin/create-test-users/route.ts` - DELETE
8. ✅ `src/app/api/admin/delete-user/route.ts` - AUDIT & UPDATE
9. ✅ `src/app/api/admin/cleanup-all-users/route.ts` - AUDIT & UPDATE

### Phase 2: DELETE/REWRITE Production Auth Files Using Old System

10. ✅ `src/app/api/mechanics/refresh/route.ts` - **DELETE** (Supabase handles refresh)
11. ⚠️ `src/app/api/mechanic/workshop-signup/route.ts` - **REWRITE** (uses hashPassword)
12. ⚠️ `src/app/api/workshop/signup/route.ts` - **AUDIT** (may use hashPassword)

### Phase 3: UPDATE Logout Routes (Remove aad_mech references)

13. ✅ `src/app/api/auth/logout/route.ts` - Remove aad_mech cookie reference (line 37)
14. ✅ `src/app/api/auth/clear-session/route.ts` - Audit & update

### Phase 4: UPDATE Middleware (Comments only)

15. ✅ `src/middleware.ts` - Remove aad_mech comments

### Phase 5: UPDATE All Other API Routes

These files likely use `requireMechanicAPI()` auth guard correctly, but may have:
- Old aad_mech cookie checks in comments
- Old mechanic_sessions table queries in comments or dead code
- Need to audit and remove traces

**API Routes to Clean:**
```
src/app/api/sessions/[id]/end/route.ts
src/app/api/mechanic/dashboard/stats/route.ts
src/app/chat/[id]/page.tsx
src/app/api/uploads/sign/route.ts
src/app/api/livekit/token/route.ts
src/app/api/mechanic/clock/route.ts
src/app/api/mechanics/analytics/route.ts
src/app/api/workshop/escalation-queue/route.ts
src/app/api/mechanic/sessions/[sessionId]/route.ts
src/app/api/mechanic/escalate-session/route.ts
src/app/api/mechanic/accept/route.ts
src/app/api/mechanic/availability/route.ts
src/app/api/mechanics/sessions/virtual/route.ts
src/app/api/mechanic/active-sessions/route.ts
src/app/diagnostic/[id]/page.tsx
src/app/api/mechanics/clients/[clientId]/route.ts
src/app/api/mechanics/clients/route.ts
src/app/api/mechanics/statements/route.ts
src/app/api/mechanics/jobs/route.ts
src/app/api/mechanics/bay-bookings/route.ts
src/app/api/mechanics/partnerships/applications/route.ts
src/app/api/mechanics/partnerships/programs/route.ts
src/app/api/mechanics/earnings/route.ts
src/app/api/mechanics/availability/route.ts
src/app/api/mechanics/dashboard/stats/route.ts
src/app/api/mechanics/onboarding/virtual-only/route.ts
src/app/api/mechanics/onboarding/service-tier/route.ts
src/app/api/mechanic/reviews/route.ts
src/app/api/mechanic/time-off/[id]/route.ts
src/app/api/mechanic/time-off/route.ts
src/app/api/mechanic/sessions/history/route.ts
src/app/api/mechanic/documents/[id]/route.ts
src/app/api/mechanic/documents/route.ts
src/app/api/mechanic/earnings/route.ts
src/app/api/mechanic/collect-sin/route.ts
src/app/api/mechanics/requests/[id]/cancel/route.ts
src/app/video/[id]/page.tsx
src/app/api/chat/send-message/route.ts
src/app/api/mechanics/requests/history/route.ts
src/app/api/mechanics/stripe/onboard/route.ts
```

**Client Pages to Clean:**
```
src/app/mechanic/profile/page.tsx
src/app/mechanic/onboarding/stripe/complete/page.tsx
```

### Phase 6: DEPRECATE Old Auth Functions

16. `src/lib/auth.ts` - Add deprecation warnings to hashPassword, verifyPassword, makeSessionToken

---

## EXECUTION ORDER

### IMMEDIATE (Now):
1. Delete all test/debug files
2. Delete mechanics/refresh route
3. Remove aad_mech from auth/logout
4. Rewrite mechanic/workshop-signup
5. Audit workshop/signup

### SHORT TERM (Next 30 min):
6. Clean up middleware comments
7. Audit and clean top 10 most-used API routes
8. Clean up client pages

### MEDIUM TERM (Next session):
9. Systematically clean remaining 30+ API routes
10. Deprecate old auth functions
11. Create database migration to drop mechanic_sessions table

---

## VERIFICATION CHECKLIST

After cleanup:
- [ ] No references to `hashPassword` outside of deprecation warnings
- [ ] No references to `verifyPassword` outside of deprecation warnings
- [ ] No references to `makeSessionToken` outside of deprecation warnings
- [ ] No references to `aad_mech` cookie
- [ ] No references to `aad_mech_refresh` cookie
- [ ] No queries to `mechanic_sessions` table
- [ ] All auth uses Supabase Auth
- [ ] Login/logout/signup flows tested
- [ ] No redirect loops
- [ ] Database ready for mechanic_sessions table drop

---

## NOTES

- Keep `lib/auth.ts` for now with deprecation warnings
- Keep `mechanic_sessions` table in database until data migration complete
- All new code must use Supabase Auth only
- Test thoroughly after each phase

