# Dev Server Cache Management

**Date Documented:** January 2025
**Status:** Recurring Issue
**Category:** Troubleshooting

## Overview

Next.js dev server caching issues can cause stale module errors, incorrect route detection, and component mismatches. This document provides comprehensive troubleshooting steps and prevention strategies.

## Common Symptoms

### 1. Module Not Found Errors
```
Error: Cannot find module '../MechanicDashboardRedesigned'
Caused by: The system cannot find the file specified.
```

**Cause:** Dev server cached old import paths that no longer exist.

### 2. Webpack Runtime Errors
```
TypeError: __webpack_modules__[moduleId] is not a function
TypeError: Cannot read properties of null (reading 'useContext')
```

**Cause:** Webpack trying to load stale chunks that were deleted or renamed.

### 3. API Route 404 Errors
```
GET /api/mechanics/me 404
```

**Cause:** New API route files not detected by dev server after creation.

### 4. Fast Refresh Failures
```
[Fast Refresh] rebuilding
[Fast Refresh] done in 30ms
(But changes not reflected)
```

**Cause:** Dev server rebuilt but serving cached version.

## Root Causes

### 1. Next.js Build Cache (.next directory)
The `.next` directory contains:
- Compiled pages and components
- Webpack chunks
- Server bundles
- Route manifests

When files are:
- Renamed
- Moved
- Deleted
- Have imports changed

The cache can become stale.

### 2. Turbo Cache (.turbo directory)
If using Turbopack (Next.js 13+), the `.turbo` directory caches:
- Module resolutions
- TypeScript compilations
- Transformed files

### 3. Node Modules Cache
Sometimes `node_modules/.cache` contains stale data.

### 4. Hot Module Replacement State
HMR maintains in-memory state that can become inconsistent.

## Solutions

### Quick Fix (Most Common)

**Step 1: Stop Dev Server**
```bash
# In terminal where dev server is running
Ctrl + C
```

**Step 2: Clear Build Cache**
```bash
rm -rf .next .turbo
```

**Step 3: Restart Dev Server**
```bash
npm run dev
```

**Success Indicators:**
```
- ready started server on 0.0.0.0:3000
✓ Compiled in XXXms
```

### Deep Clean (If Quick Fix Fails)

```bash
# 1. Stop dev server (Ctrl+C)

# 2. Clear all caches
rm -rf .next .turbo node_modules/.cache

# 3. Clear node modules (if needed)
rm -rf node_modules
npm install

# 4. Clear package manager cache
npm cache clean --force

# 5. Restart
npm run dev
```

### Nuclear Option (Last Resort)

```bash
# Full reset
rm -rf .next .turbo node_modules package-lock.json
npm install
npm run dev
```

## Specific Issue Solutions

### Issue: New API Route Not Found

**Scenario:**
```
Created: src/app/api/mechanics/me/route.ts
Result: GET /api/mechanics/me 404
```

**Solution 1: Touch the file**
```bash
touch src/app/api/mechanics/me/route.ts
```

Wait 2-3 seconds for HMR to detect the change.

**Solution 2: Restart dev server**
```bash
# Ctrl+C to stop
rm -rf .next
npm run dev
```

**Solution 3: Create a temporary change**
```typescript
// Add a comment to trigger HMR
export async function GET(req: NextRequest) {
  // Trigger reload
  ...
}
```

### Issue: Component Import Errors

**Scenario:**
```
Error: Module not found: Can't resolve './MechanicDashboardRedesigned'
```

**Verification Steps:**
```bash
# 1. Check file exists
ls -la src/app/mechanic/dashboard/MechanicDashboardRedesigned.tsx

# 2. Check import in page.tsx
cat src/app/mechanic/dashboard/page.tsx | grep import
```

**If file exists but error persists:**
```bash
# Clear cache and restart
rm -rf .next
npm run dev
```

**If file doesn't exist:**
Update the import to correct file name.

### Issue: Webpack Module Errors

**Scenario:**
```
TypeError: __webpack_modules__[moduleId] is not a function
```

**This indicates stale webpack chunks.**

**Solution:**
```bash
# Must fully restart
Ctrl + C
rm -rf .next .turbo
npm run dev
```

**Note:** HMR/Fast Refresh cannot fix webpack chunk mismatches - full restart required.

### Issue: Changes Not Reflecting

**Scenario:**
- Make code change
- Save file
- See "[Fast Refresh] done"
- But browser shows old code

**Solution 1: Hard refresh browser**
```
Chrome/Edge: Ctrl + Shift + R
Firefox: Ctrl + F5
Safari: Cmd + Shift + R
```

**Solution 2: Clear browser cache**
```
DevTools > Network tab > Disable cache (checkbox)
Refresh page
```

**Solution 3: Restart dev server**
```bash
Ctrl + C
npm run dev
```

## Prevention Strategies

### 1. Clean Imports on File Rename

**When renaming a file:**
```bash
# 1. Search for all imports of old filename
grep -r "OldFileName" src/

# 2. Update all imports
# 3. Delete old file
# 4. Clear cache
rm -rf .next

# 5. Restart
npm run dev
```

### 2. Use Absolute Imports

**Instead of:**
```typescript
import { Component } from '../../../components/Component'
```

**Use:**
```typescript
import { Component } from '@/components/Component'
```

**Benefits:**
- Less fragile during refactoring
- Easier to track imports
- Better for code search

### 3. Avoid Manual .next Edits

**Never edit files in:**
- `.next/`
- `.turbo/`
- `node_modules/`

These are generated directories - always regenerate them.

### 4. Git Ignore Build Artifacts

**Ensure .gitignore includes:**
```
.next/
.turbo/
node_modules/
*.log
.env.local
```

### 5. Regular Cache Clearing

**Add npm script:**
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:clean": "rm -rf .next .turbo && next dev",
    "clean": "rm -rf .next .turbo node_modules/.cache"
  }
}
```

**Usage:**
```bash
# Start with clean cache
npm run dev:clean

# Manual clean
npm run clean
npm run dev
```

## Troubleshooting Checklist

When experiencing cache issues:

- [ ] Stop dev server (Ctrl+C)
- [ ] Run `rm -rf .next .turbo`
- [ ] Restart with `npm run dev`
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Check browser DevTools console for errors
- [ ] Verify file paths are correct
- [ ] Check imports match actual file names
- [ ] If still failing: `rm -rf node_modules && npm install`
- [ ] If still failing: Check for TypeScript errors
- [ ] If still failing: Try different port `PORT=3001 npm run dev`

## Cache-Related Error Patterns

### Pattern 1: Immediate Redirect Loop

**Symptoms:**
- Page loads
- Immediately redirects
- Loop continues

**Likely Cause:** Stale authentication check

**Solution:**
```bash
rm -rf .next
npm run dev
# Clear browser cookies
# Try again
```

### Pattern 2: 404 on Existing Route

**Symptoms:**
- Route file exists
- Dev server returns 404

**Likely Cause:** Route not registered in manifest

**Solution:**
```bash
rm -rf .next
npm run dev
```

### Pattern 3: Component Not Updating

**Symptoms:**
- Edit component
- Save file
- No changes in browser

**Likely Cause:** HMR boundary issue

**Solution:**
```bash
# Add/remove a comment to force reload
export default function MyComponent() {
  // Force reload
  return <div>...</div>
}
```

## Browser-Specific Issues

### Chrome/Edge

**Issue:** Aggressive caching

**Solution:**
```
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Keep DevTools open while developing
```

### Firefox

**Issue:** Service worker cache

**Solution:**
```
1. Open DevTools (F12)
2. Go to Application tab
3. Clear Service Workers
4. Clear Storage
```

### Safari

**Issue:** WebSocket disconnect

**Solution:**
```
1. Develop > Disable Caches
2. Restart Safari
3. Restart dev server
```

## Production Build Verification

After fixing cache issues, verify production build:

```bash
# Clean everything
rm -rf .next .turbo

# Production build
npm run build

# Expected output:
# ✓ Compiled successfully
# Route list with sizes

# If build fails:
# - Check TypeScript errors
# - Check import paths
# - Check for missing dependencies
```

## Monitoring & Logging

### Enable Verbose Logging

```bash
# Windows PowerShell
$env:DEBUG="*"
npm run dev

# Linux/Mac
DEBUG=* npm run dev
```

### Check Dev Server Output

Look for:
```
✓ Compiled /mechanic/dashboard in XXXms
⚠ Fast refresh boundaries
⚡ Updated /api/mechanics/me
```

### Check Browser Console

Look for:
```
[HMR] Waiting for update signal
[Fast Refresh] rebuilding
[Fast Refresh] done
```

## Related Issues

### Multiple GoTrueClient Warning

```
Multiple GoTrueClient instances detected in the same browser context.
```

**Cause:** Supabase client created multiple times

**Not critical** but indicates multiple client instances.

**Solution:** Use `useMemo` for client creation:
```typescript
const supabase = useMemo(() => createClient(), [])
```

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Windows
taskkill /F /IM node.exe

# Linux/Mac
pkill -9 node

# Or use different port
PORT=3001 npm run dev
```

## Best Practices

### 1. Always Use Version Control

```bash
# Before major changes
git add .
git commit -m "Working state before refactor"

# If things break
git reset --hard HEAD
rm -rf .next
npm run dev
```

### 2. Test After Refactoring

```bash
# After file renames/moves
rm -rf .next
npm run build

# Verify no errors
npm run dev
# Test all routes
```

### 3. Document Cache Clears

When reporting issues, include:
```
Steps taken:
1. Cleared .next cache (rm -rf .next)
2. Restarted dev server
3. Hard refreshed browser
4. Still seeing error: [error message]
```

## Quick Reference

| Issue | Command | Time |
|-------|---------|------|
| New file not detected | `touch file.ts` | ~2s |
| Import error | `rm -rf .next && npm run dev` | ~30s |
| Webpack error | `rm -rf .next .turbo && npm run dev` | ~30s |
| Complete reset | `rm -rf .next .turbo node_modules && npm install && npm run dev` | ~2min |

## Related Documentation

- [Comprehensive Mechanic Dashboard](../features/comprehensive-mechanic-dashboard.md)
- [Supabase Import Pattern Migration](../fixes/supabase-import-pattern-migration.md)
- [Authentication System Migration](../architecture/authentication-system-migration.md)

---

**Last Updated:** January 2025
**Maintained By:** Development Team
