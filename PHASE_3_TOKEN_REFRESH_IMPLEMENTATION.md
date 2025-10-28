# Phase 3: Token Refresh & Database Cleanup Implementation

## Overview

Implemented enhanced security improvements for the mechanic authentication system, including token refresh mechanism and database session cleanup.

## Date
2025-10-27

## Implemented Features

### 1. Token Refresh Mechanism (Priority 5) ✅

**Problem**: Mechanic tokens were valid for 30 days with no refresh mechanism, creating an extended unauthorized access window if stolen.

**Solution**: Implemented OAuth 2.0-style token refresh pattern with:
- **Access tokens**: 2 hours (short-lived)
- **Refresh tokens**: 30 days (long-lived)
- **Automatic token rotation**: New access tokens obtained via refresh endpoint

#### Files Modified/Created:

**A. Refresh Endpoint** - [src/app/api/mechanics/refresh/route.ts](src/app/api/mechanics/refresh/route.ts)
```typescript
export async function POST(req: NextRequest) {
  // Get refresh token from cookie
  const refreshToken = req.cookies.get('aad_mech_refresh')?.value;

  // Validate refresh token against database
  const { data: session } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('*')
    .eq('refresh_token', refreshToken)
    .maybeSingle();

  // Check expiration
  if (new Date(session.refresh_expires_at) < new Date()) {
    // Clean up expired session
    await supabaseAdmin
      .from('mechanic_sessions')
      .delete()
      .eq('id', session.id);

    return bad('Refresh token expired', 401);
  }

  // Generate new access token (2 hours)
  const newAccessToken = makeSessionToken();
  const newAccessExpires = new Date(Date.now() + 1000 * 60 * 60 * 2);

  // Update session with new access token
  await supabaseAdmin
    .from('mechanic_sessions')
    .update({
      token: newAccessToken,
      expires_at: newAccessExpires.toISOString(),
      last_activity: new Date().toISOString(),
    })
    .eq('id', session.id);

  // Return new access token cookie
  res.cookies.set('aad_mech', newAccessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 2, // 2 hours
  });

  return res;
}
```

**B. Updated Login** - [src/app/api/mechanics/login/route.ts](src/app/api/mechanics/login/route.ts)
```typescript
// Generate both access and refresh tokens
const accessToken = makeSessionToken();
const refreshToken = makeSessionToken();
const accessExpires = new Date(Date.now() + 1000 * 60 * 60 * 2); // 2 hours
const refreshExpires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

// Store both tokens in database
await supabaseAdmin.from('mechanic_sessions').insert({
  mechanic_id: mech.id,
  token: accessToken,
  expires_at: accessExpires.toISOString(),
  refresh_token: refreshToken,
  refresh_expires_at: refreshExpires.toISOString(),
  last_activity: new Date().toISOString(),
});

// Set both cookies
res.cookies.set('aad_mech', accessToken, {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 2, // 2 hours
});

res.cookies.set('aad_mech_refresh', refreshToken, {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
});
```

**C. Database Migration** - [supabase/migrations/20251027000002_add_token_refresh_to_mechanic_sessions.sql](supabase/migrations/20251027000002_add_token_refresh_to_mechanic_sessions.sql)
```sql
-- Add refresh token columns
ALTER TABLE mechanic_sessions
ADD COLUMN IF NOT EXISTS refresh_token TEXT;

ALTER TABLE mechanic_sessions
ADD COLUMN IF NOT EXISTS refresh_expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE mechanic_sessions
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient refresh token lookups
CREATE INDEX IF NOT EXISTS idx_mechanic_sessions_refresh_token
ON mechanic_sessions(refresh_token)
WHERE refresh_token IS NOT NULL;

-- Update existing sessions
UPDATE mechanic_sessions
SET last_activity = COALESCE(created_at, NOW())
WHERE last_activity IS NULL;
```

### 2. Database Session Cleanup (Priority 6) ✅

**Problem**: When mechanics logged out, sessions were removed from cookies but remained in the database, causing:
- Database bloat over time
- Difficulty auditing active sessions
- Potential security risk if tokens leaked

**Solution**: Updated logout endpoint to delete sessions from database.

#### Files Modified:

**A. Updated Logout** - [src/app/api/mechanics/logout/route.ts](src/app/api/mechanics/logout/route.ts)
```typescript
export async function POST(req: NextRequest) {
  // Get the token from the cookie
  const token = req.cookies.get('aad_mech')?.value;

  // ✅ Delete session from database (NEW)
  if (token && supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin
        .from('mechanic_sessions')
        .delete()
        .eq('token', token);

      if (error) {
        console.error('[MECHANIC LOGOUT] Failed to delete session from database:', error);
        // Continue with logout even if database cleanup fails
      } else {
        console.log('[MECHANIC LOGOUT] Session deleted from database');
      }
    } catch (err) {
      console.error('[MECHANIC LOGOUT] Exception during database cleanup:', err);
      // Continue with logout even if exception occurs
    }
  }

  // Clear both access and refresh token cookies
  const res = NextResponse.json({ ok: true });

  res.cookies.set('aad_mech', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });

  res.cookies.set('aad_mech_refresh', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });

  return res;
}
```

## Security Benefits

### Token Refresh Mechanism:
1. **Reduced Risk Window**: Access tokens only valid for 2 hours (vs 30 days)
2. **Stolen Token Mitigation**: If access token stolen, only works for remaining time in 2-hour window
3. **Refresh Token Security**: Refresh tokens stored in HTTP-only cookies, not accessible to JavaScript
4. **Automatic Cleanup**: Expired refresh tokens automatically deleted from database
5. **Activity Tracking**: `last_activity` column enables session monitoring

### Database Cleanup:
1. **No Orphaned Sessions**: Database stays clean and auditable
2. **Accurate Session Tracking**: Easy to see truly active sessions
3. **Performance**: Reduced database bloat improves query performance
4. **Security Auditing**: Clear view of current active sessions for security monitoring

## Implementation Flow

### Login Flow (New):
```
1. User enters credentials
2. API validates password
3. API generates access token (2hr) + refresh token (30 days)
4. Both tokens stored in database
5. Both tokens set as HTTP-only cookies
6. User authenticated with short-lived access token
```

### Refresh Flow (New):
```
1. Access token expires after 2 hours
2. Client calls /api/mechanics/refresh with refresh token
3. API validates refresh token from database
4. API checks refresh token expiration (30 days)
5. API generates new access token (2hr)
6. API updates database with new access token
7. API returns new access token cookie
8. User continues with new access token
```

### Logout Flow (Enhanced):
```
1. User clicks logout
2. Client calls /api/mechanics/logout
3. API deletes session from database (NEW)
4. API clears both access and refresh token cookies
5. User redirected to login page
```

## Token Lifetimes Comparison

### Before Phase 3:
| Token Type | Lifetime | Refresh | Security Risk |
|------------|----------|---------|---------------|
| Access Token | 30 days | None | High - long exposure window |

### After Phase 3:
| Token Type | Lifetime | Refresh | Security Risk |
|------------|----------|---------|---------------|
| Access Token | 2 hours | Via refresh token | Low - short exposure window |
| Refresh Token | 30 days | Not refreshable | Medium - but requires cookie access |

## Database Schema Changes

### mechanic_sessions Table (New Columns):
```sql
-- Existing columns:
- id (PK)
- mechanic_id (FK to mechanics.id)
- token (access token - now 2 hours)
- expires_at (access token expiration)
- created_at

-- New columns:
- refresh_token (long-lived refresh token - 30 days)
- refresh_expires_at (refresh token expiration)
- last_activity (tracks last token refresh/use)
```

## Migration Instructions

1. **Apply Database Migration**:
   ```bash
   npx supabase db push
   ```

2. **Existing Sessions**:
   - Old sessions (without refresh_token) will continue to work until they expire
   - New logins will use the new 2hr/30day token system
   - Consider manually expiring old sessions for immediate security:
     ```sql
     -- Optional: Force re-login for all mechanics
     DELETE FROM mechanic_sessions WHERE refresh_token IS NULL;
     ```

3. **Client-Side Changes**:
   - No changes needed - token refresh can be implemented client-side later
   - Currently, mechanics will need to re-login every 2 hours
   - Future enhancement: Auto-refresh in middleware or client-side interceptor

## Future Enhancements

### 1. Automatic Token Refresh (Client-Side)
```typescript
// In mechanic layout or API interceptor
useEffect(() => {
  const interval = setInterval(async () => {
    // Refresh access token every 1.5 hours (before expiration)
    await fetch('/api/mechanics/refresh', { method: 'POST' });
  }, 90 * 60 * 1000); // 90 minutes

  return () => clearInterval(interval);
}, []);
```

### 2. Middleware-Based Token Refresh
```typescript
// In src/middleware.ts
if (isAccessTokenExpiringSoon && hasRefreshToken) {
  // Attempt refresh before continuing
  await refreshMechanicToken(request);
}
```

### 3. Session Monitoring Dashboard
```typescript
// Admin page showing active sessions
- mechanic_id
- last_activity
- expires_at
- IP address (future enhancement)
- User agent (future enhancement)
```

## Testing

### Test Token Refresh:
1. Log in as mechanic
2. Wait 2 hours (or manually expire access token in database)
3. Call `/api/mechanics/refresh` endpoint
4. Verify new access token issued
5. Verify access token works for authenticated requests

### Test Database Cleanup:
1. Log in as mechanic
2. Check database - session record should exist
3. Log out
4. Check database - session record should be deleted
5. Verify both cookies cleared

## Related Documentation

- [AUTHENTICATION_SESSION_AUDIT.md](AUTHENTICATION_SESSION_AUDIT.md) - Complete authentication audit
- [ACTIVITY_TIMEOUT_IMPLEMENTATION.md](ACTIVITY_TIMEOUT_IMPLEMENTATION.md) - Activity-based session timeout (Phase 2)

## Summary

Phase 3 successfully implements:
- ✅ **Priority 5**: Token refresh mechanism (2hr access + 30 day refresh)
- ✅ **Priority 6**: Database session cleanup on logout

**Security Impact**: Reduces unauthorized access window from 30 days to 2 hours, with proper session lifecycle management.

**Next Steps**: Consider implementing automatic token refresh to improve UX (mechanics won't need to manually re-login every 2 hours).

---

**Implementation Status**: ✅ Complete
**Build Status**: ✅ Successful
**Ready for Testing**: ✅ Yes (after database migration)
