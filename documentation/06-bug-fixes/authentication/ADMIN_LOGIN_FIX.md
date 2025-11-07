# Admin Login Production Fix

## Problem
Admin login works in development but fails to redirect after successful authentication in production.

## Root Causes Identified
1. **Cookie Security Issues**: Production cookies need `secure: true` flag for HTTPS
2. **URL Construction**: Using `request.url` creates HTTP URLs when production uses HTTPS
3. **Missing Environment Variable**: `NEXT_PUBLIC_APP_URL` not set in production

## Changes Made

### 1. Updated `/src/app/api/admin/login/route.ts`
- Added proper base URL detection using headers
- Implemented production cookie settings with secure flag
- Added session verification after login
- Improved error handling and logging

### 2. Created Debug Endpoint
- `/api/admin/debug-auth` - Check authentication configuration
- Access it at: `https://www.askautodoctor.com/api/admin/debug-auth`

## Production Deployment Checklist

### Environment Variables
✅ **Required in Production:**
```env
NEXT_PUBLIC_APP_URL=https://www.askautodoctor.com
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
NODE_ENV=production
```

### Vercel/Deployment Platform Settings
1. **Add Environment Variables:**
   - Go to your Vercel project settings
   - Navigate to Environment Variables
   - Add `NEXT_PUBLIC_APP_URL` with your production URL (must include https://)
   - Ensure all Supabase variables are set

2. **Verify HTTPS:**
   - Ensure your domain has SSL certificate
   - Check that all requests use HTTPS

3. **Cookie Settings:**
   - The updated code now handles this automatically
   - Sets `secure: true` for production
   - Uses `sameSite: lax` for CSRF protection

### Testing Steps

1. **Clear Browser Data:**
   ```
   - Clear all cookies for your domain
   - Clear local storage
   - Clear session storage
   ```

2. **Test Debug Endpoint:**
   ```
   Visit: https://www.askautodoctor.com/api/admin/debug-auth

   Check for:
   - environment.NEXT_PUBLIC_APP_URL should be set
   - request.isProduction should be true
   - request.baseUrl should start with https://
   ```

3. **Test Login Flow:**
   ```
   1. Go to https://www.askautodoctor.com/admin/login
   2. Enter credentials
   3. Check browser console for any errors
   4. Should redirect to /admin/intakes
   ```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Redirect loops | Clear cookies and try again |
| "Invalid login credentials" | Verify user exists in production database |
| No redirect after login | Check NEXT_PUBLIC_APP_URL is set |
| Cookie not persisting | Ensure HTTPS is enabled |
| 404 on redirect | Verify /admin/intakes page exists |

### Debug Information

Run this in browser console on the login page:
```javascript
// Check if cookies are enabled
console.log('Cookies enabled:', navigator.cookieEnabled);

// Check current protocol
console.log('Protocol:', window.location.protocol);

// Check for secure context
console.log('Secure context:', window.isSecureContext);
```

### Quick Test Script

Create a test admin user (if needed):
```sql
-- Run in Supabase SQL Editor
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@askautodoctor.com',
    crypt('your_password_here', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "admin", "name": "Admin User"}',
    NOW(),
    NOW()
);
```

### Rollback Plan

If issues persist after deployment:
1. The changes are backward compatible
2. No database changes required
3. Can revert to previous version if needed

### Monitoring

After deployment, monitor:
1. **Server Logs:** Check for any authentication errors
2. **Browser Console:** Look for redirect or cookie issues
3. **Network Tab:** Verify 303 redirects are happening

### Next Steps

1. **Deploy the changes** to production
2. **Set NEXT_PUBLIC_APP_URL** in your deployment platform
3. **Test the debug endpoint** first
4. **Try logging in** with valid credentials
5. **Monitor logs** for any issues

## Contact for Support

If issues persist:
1. Check the debug endpoint response
2. Review server logs
3. Verify all environment variables are set
4. Ensure cookies are enabled in browser
5. Check for any browser extensions blocking cookies

## Success Criteria

✅ Admin can log in successfully
✅ Redirect to /admin/intakes works
✅ Session persists across page refreshes
✅ Logout functionality works
✅ No console errors in production