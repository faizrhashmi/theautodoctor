# Admin Login Troubleshooting Guide

## Current Situation
Based on the debug output, you ARE successfully authenticated but the redirect isn't working properly.

## Debug Output Analysis

```json
{
  "auth": {
    "userFound": true,
    "userId": "f4d90392-118c-4738-ab16-94689f039f2a",
    "userEmail": "faizhashmi@me.com",
    "userRole": "authenticated"
  }
}
```

**✅ Authentication is working** - You're logged in
**❌ Redirect issue** - After login, not redirecting to admin panel

## Testing Steps

### 1. Test Login Endpoint
Visit: `https://www.askautodoctor.com/api/admin/test-login`
- Enter your credentials
- Check the response for session details
- It should auto-redirect after 2 seconds if successful

### 2. Direct Access Test
After logging in, try directly visiting:
- `https://www.askautodoctor.com/admin`
- `https://www.askautodoctor.com/admin/intakes`

### 3. Check Browser Console
Open DevTools (F12) and check:
```javascript
// Run in console after login attempt
document.cookie
```

### 4. Verify Cookies Domain
The cookies might be set for `askautodoctor.com` but you're accessing `www.askautodoctor.com`

## Potential Issues & Solutions

### Issue 1: Domain Mismatch (www vs non-www)
**Symptom:** Cookies set for `askautodoctor.com` but accessing `www.askautodoctor.com`

**Solution:** Ensure cookies are set with proper domain:
```javascript
// Cookies should be set with:
domain: '.askautodoctor.com'  // Note the leading dot
```

### Issue 2: Role Verification
**Symptom:** User authenticated but not recognized as admin

**Solution:** Check user's role in Supabase:
```sql
-- Run this in Supabase SQL Editor
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'faizhashmi@me.com';
```

If role is not 'admin', update it:
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'faizhashmi@me.com';
```

### Issue 3: Middleware Blocking
**Symptom:** Authenticated but middleware redirects away

**Check:** The middleware at line 101 has `TODO: Add admin role verification`
This means any authenticated user can access admin panel currently.

### Issue 4: Cookie Security Settings
**Symptom:** Cookies not persisting in production

**Solution:** Already fixed in the code, but verify deployment has:
- `secure: true` for HTTPS
- `sameSite: 'lax'`
- Proper domain setting

## Quick Fixes to Try

### Fix 1: Clear Everything and Retry
```javascript
// Run in browser console
document.cookie.split(";").forEach(function(c) {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
localStorage.clear();
sessionStorage.clear();
// Then try logging in again
```

### Fix 2: Use Test Login Page
1. Visit: `https://www.askautodoctor.com/api/admin/test-login`
2. Enter credentials
3. Check the JSON response for any errors
4. Should auto-redirect if successful

### Fix 3: Manual Navigation
After successful login (even if no redirect):
1. Manually go to `https://www.askautodoctor.com/admin/intakes`
2. If you see the page, redirect is the issue
3. If redirected to login, authentication is the issue

## Environment Variables Check

Ensure in Render you have:
```env
NEXT_PUBLIC_APP_URL=https://www.askautodoctor.com
NEXT_PUBLIC_SITE_URL=https://www.askautodoctor.com
NEXT_PUBLIC_BASE_URL=https://www.askautodoctor.com
NODE_ENV=production
```

## If Nothing Works

1. **Check Supabase Dashboard:**
   - Go to Authentication > Users
   - Verify user exists and is confirmed
   - Check last sign in time

2. **Check Render Logs:**
   - Look for any error messages during login
   - Check for redirect loops

3. **Try Different Browser:**
   - Sometimes browser extensions interfere
   - Try incognito/private mode

4. **Check Network Tab:**
   - Open DevTools > Network
   - Try login
   - Look for 303 redirects
   - Check where they're going

## Success Indicators

When working correctly, you should see:
1. POST to `/api/admin/login` returns 303
2. Redirect to `/admin/intakes`
3. Cookies set with names like `sb-[project-id]-auth-token`
4. Admin panel loads without redirecting back to login

## Contact for Debug Info

If still not working, share:
1. Browser console errors
2. Network tab showing login request
3. Result from `/api/admin/debug-auth`
4. Result from `/api/admin/test-login`