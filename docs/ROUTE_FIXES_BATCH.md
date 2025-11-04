# Hardcoded Route Fixes - Batch Update

## Files Fixed

### ✅ Already Fixed
- [x] src/app/customer/vehicles/[id]/history/page.tsx (4 instances)
- [x] src/components/notifications/NotificationCenter.tsx (multiple instances - using routeFor)

### 🔧 To Fix

1. **src/app/customer/vehicles/page.tsx**
   - Line 194: `href="/customer/dashboard"` → `href={routeFor.customerDashboard()}`

2. **src/app/customer/sessions/page.tsx**
   - Line 333: `href="/customer/dashboard?focus=session"` → `href={routeFor.customerDashboard()}` (remove query param or add to routeFor)

3. **src/components/customer/SessionLauncher.tsx**
   - Line 516, 525: `href="/customer/plans"` → `href={routeFor.pricing()}`

4. **src/components/customer/SessionJoinCard.tsx**
   - Line 147: `href="/customer/schedule"` → `href={routeFor.customerDashboard()}` (schedule doesn't exist in routes.ts - needs adding or redirect to dashboard)

5. **src/components/customer/RecommendationsWidget.tsx**
   - Line 131: `href="/customer/dashboard"` → `href={routeFor.customerDashboard()}`

6. **src/app/customer/settings/privacy/**
   - download-data/page.tsx: `href="/customer/settings/privacy"` → Create routeFor.customerSettings()
   - delete-account/page.tsx: `href="/customer/settings/privacy"` → Create routeFor.customerSettings()
   - page.tsx: Two routes to download-data and delete-account → Create specific helpers

7. **src/app/customer/rfq/** files
   - Multiple instances - need to check each file

## Missing Route Helpers to Add

Add to src/lib/routes.ts:

```typescript
// Customer routes to add
customerSettings: () => `/customer/settings`,
customerPrivacySettings: () => `/customer/settings/privacy`,
customerDataDownload: () => `/customer/settings/privacy/download-data`,
customerDeleteAccount: () => `/customer/settings/privacy/delete-account`,
customerSchedule: () => `/customer/schedule`,
customerPlans: () => `/customer/plans`,
```

## Verification

After fixes, run:
```bash
# Should return 0 results (except in routes.ts itself)
grep -r "href=\"/customer/" src/app src/components --exclude-dir=node_modules | grep -v routes.ts
```
