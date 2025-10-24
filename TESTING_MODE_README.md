# ⚠️ TESTING MODE - REMOVE BEFORE PRODUCTION DEPLOYMENT

## Overview
This document tracks temporary testing features that **MUST BE REMOVED** before deploying to production.

---

## 🔧 Testing Features Currently Active

### 1. **URL Parameter: Skip Preflight Checks**

**Purpose:** Allows testing video sessions on the same laptop with two browsers

**How to use:**
```
http://localhost:3000/video/[session-id]?skipPreflight=true
```

**What it does:**
- Bypasses camera/microphone access checks
- Bypasses network RTT requirements
- Shows prominent red warning banner
- Instantly passes all device checks

**Files affected:**
- `src/components/video/DevicePreflight.tsx` (lines 10, 22-29, 87-96)
- `src/app/video/[id]/VideoSessionClient.tsx` (lines 447-452, 691)

---

## ⚠️ CRITICAL: BEFORE PRODUCTION CHECKLIST

Run this search to find all testing code:

```bash
# Search for testing comments
grep -r "⚠️ TESTING ONLY" src/

# Search for skipPreflight
grep -r "skipPreflight" src/
```

### Files to Clean Before Production:

#### 1. `src/components/video/DevicePreflight.tsx`
```typescript
// ❌ REMOVE this prop from interface
skipPreflight?: boolean // ⚠️ TESTING ONLY - REMOVE BEFORE PRODUCTION

// ❌ REMOVE from function signature
export function DevicePreflight({ onComplete, skipPreflight = false }: DevicePreflightProps)

// ❌ REMOVE this entire if block (lines 22-29)
if (skipPreflight) {
  setCameraStatus('passed')
  setMicStatus('passed')
  setNetworkStatus('passed')
  setNetworkRTT(50)
  return
}

// ❌ REMOVE warning banner JSX (lines 87-96)
{skipPreflight && (
  <div className="mb-6 flex items-center gap-3...">
    ...
  </div>
)}
```

**After cleanup, the function should be:**
```typescript
export function DevicePreflight({ onComplete }: DevicePreflightProps) {
  // ... rest of code without skipPreflight logic
}
```

---

#### 2. `src/app/video/[id]/VideoSessionClient.tsx`
```typescript
// ❌ REMOVE URL parameter parsing (lines 447-452)
const skipPreflight = useMemo(() => {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.get('skipPreflight') === 'true'
}, [])

// ❌ REMOVE skipPreflight prop (line 691)
<DevicePreflight
  onComplete={() => {
    setPreflightPassed(true)
    setShowPreflight(false)
  }}
  skipPreflight={skipPreflight} // ⚠️ REMOVE THIS LINE
/>
```

**After cleanup:**
```typescript
<DevicePreflight
  onComplete={() => {
    setPreflightPassed(true)
    setShowPreflight(false)
  }}
/>
```

---

## 🧪 Why This Exists

These features were added to enable testing on a single laptop with two browsers, which has limitations:
- **Camera conflict**: Two browsers can't share the same camera
- **Network latency**: Localhost adds artificial delays (857ms RTT vs required <300ms)

**Production behavior:**
- Full device checks enforced
- Camera/mic must be accessible
- Network must be <300ms RTT
- No bypass options available

---

## 🚨 Production Deployment Steps

1. **Search and remove all testing code:**
   ```bash
   grep -r "⚠️ TESTING ONLY" src/
   grep -r "skipPreflight" src/
   ```

2. **Run type check:**
   ```bash
   npm run typecheck
   ```

3. **Test in staging with real devices:**
   - Two different physical devices
   - OR laptop + mobile phone
   - Verify all preflight checks work

4. **Delete this file:**
   ```bash
   rm TESTING_MODE_README.md
   ```

5. **Commit clean code:**
   ```bash
   git add .
   git commit -m "Remove testing features before production"
   ```

---

## 📋 Quick Cleanup Script

Save this as `cleanup-testing-mode.sh`:

```bash
#!/bin/bash
echo "🧹 Removing testing features..."

# Remove skipPreflight from DevicePreflight
echo "Cleaning DevicePreflight.tsx..."
# (Manual cleanup recommended - see checklist above)

# Remove skipPreflight from VideoSessionClient
echo "Cleaning VideoSessionClient.tsx..."
# (Manual cleanup recommended - see checklist above)

echo "✅ Manual cleanup required - see TESTING_MODE_README.md"
echo "⚠️ Don't forget to delete TESTING_MODE_README.md after cleanup!"
```

---

## 🎯 Summary

**DO NOT DEPLOY TO PRODUCTION WITH THESE FEATURES ENABLED**

These features exist solely for local testing convenience and bypass critical security/UX checks that protect the production user experience.

**Last Updated:** $(date)
**Developer:** Document all testing features here before adding them
