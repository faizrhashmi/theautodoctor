# Environment URL Configuration Guide

## Current Situation
Your app uses multiple URL environment variables with fallbacks:
- `NEXT_PUBLIC_APP_URL` (primary)
- `NEXT_PUBLIC_SITE_URL` (fallback)
- `NEXT_PUBLIC_BASE_URL` (fallback)

## Recommended Configuration

### For PRODUCTION (Render/Vercel):
```env
NEXT_PUBLIC_APP_URL=https://www.askautodoctor.com
NEXT_PUBLIC_SITE_URL=https://www.askautodoctor.com
NEXT_PUBLIC_BASE_URL=https://www.askautodoctor.com
NODE_ENV=production
```

### For LOCAL DEVELOPMENT (.env.local):
```env
# Option 1: Don't set them at all (uses localhost:3000 automatically)
# Just leave them unset - the code has fallbacks

# Option 2: Explicitly set to localhost
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Is It Backward Compatible?

**YES! ✅** It's completely backward compatible because:

1. **Code has fallbacks:** Your code already uses:
   ```javascript
   process.env.NEXT_PUBLIC_BASE_URL ||
   process.env.NEXT_PUBLIC_SITE_URL ||
   'http://localhost:3000'
   ```

2. **Development auto-fallback:** If these aren't set, it defaults to `http://localhost:3000`

3. **No breaking changes:** Setting these in production won't affect development

## Safe for Development?

**YES! ✅** It's safe because:

1. **Local .env.local overrides production:** Your local `.env.local` takes precedence
2. **Automatic fallback:** Even if you don't set anything locally, it uses `localhost:3000`
3. **No conflicts:** Production URLs in Render don't affect local development

## Where These URLs Are Used

| Location | Purpose |
|----------|---------|
| `/api/workshop/invite-mechanic/route.ts` | Generating invite URLs |
| `/api/admin/login/route.ts` | Admin login redirects |
| `/lib/email/templates/*` | Email template links |
| `/app/signup/SignupGate.tsx` | OAuth redirect URLs |

## Implementation Steps

### 1. In Render Dashboard:
```bash
# Add these environment variables:
NEXT_PUBLIC_APP_URL=https://www.askautodoctor.com
NEXT_PUBLIC_SITE_URL=https://www.askautodoctor.com
NEXT_PUBLIC_BASE_URL=https://www.askautodoctor.com
```

### 2. Local Development (Optional):
Your `.env.local` can stay as is, or you can add:
```bash
# This is OPTIONAL - works without it
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Test After Deployment:
```bash
# Check configuration
curl https://www.askautodoctor.com/api/admin/debug-auth

# Should show:
# "baseUrl": "https://www.askautodoctor.com"
# "environment.NEXT_PUBLIC_APP_URL": "https://www.askautodoctor.com"
```

## Common Questions

**Q: Do I need to change my local .env.local?**
A: No, you don't need to change anything locally.

**Q: What if I forget to set one in production?**
A: The code has fallbacks, but admin login might not work properly without NEXT_PUBLIC_APP_URL.

**Q: Should all three be the same URL?**
A: Yes, for consistency set them all to your production domain.

**Q: Will this affect my development workflow?**
A: No, local development will continue to work exactly the same.

## Quick Checklist

- [ ] Set all three URL variables in Render to `https://www.askautodoctor.com`
- [ ] Deploy the new code with admin login fixes
- [ ] Test admin login in production
- [ ] Verify emails have correct links
- [ ] Check workshop invites work

## Summary

✅ **Safe for development** - No changes needed locally
✅ **Backward compatible** - Code has fallbacks
✅ **Production ready** - Just add the env vars to Render
✅ **Best practice** - Using consistent URLs across all variables