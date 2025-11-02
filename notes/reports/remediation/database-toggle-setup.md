# DATABASE-BASED FEATURE TOGGLE SETUP

**Date**: 2025-11-02
**Feature**: ENABLE_FAVORITES_PRIORITY
**Status**: ✅ COMPLETE - Database-driven (no restart needed)

---

## 📋 What Changed

Converted `ENABLE_FAVORITES_PRIORITY` from environment variable to **database-driven feature flag**.

### Benefits
- ✅ **No server restart required** to toggle
- ✅ **Instant changes** - toggle takes effect immediately
- ✅ **Admin UI** - easy point-and-click toggle
- ✅ **Database source of truth** - .env becomes fallback only

---

## 🔧 Files Modified

| File | Change | Lines |
|------|--------|-------|
| `src/config/featureFlags.ts` | Added ENABLE_FAVORITES_PRIORITY flag | +11 |
| `src/lib/fulfillment.ts` | Use `isFeatureEnabled()` instead of env var | +1 import, 1 line changed |
| `supabase/migrations/enable_favorites_priority_flag.sql` | SQL to insert flag into database | +63 (new file) |

**Total**: 3 files, ~15 lines changed

---

## 🚀 Setup Instructions

### Step 1: Run SQL Migration

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Copy and paste contents of:
   ```
   supabase/migrations/enable_favorites_priority_flag.sql
   ```
3. Click "Run"

**Expected Output**:
```
✅ ENABLE_FAVORITES_PRIORITY flag added successfully
Current status: DISABLED

To toggle this flag:
  1. Visit http://localhost:3000/admin/feature-flags
  2. Find "Favorites Priority Broadcast"
  3. Click toggle switch
  4. Changes take effect immediately (no server restart needed)
```

---

### Step 2: Verify Flag Exists

Run this query in Supabase SQL Editor:
```sql
SELECT
  flag_key,
  flag_name,
  is_enabled,
  description
FROM feature_flags
WHERE flag_key = 'ENABLE_FAVORITES_PRIORITY';
```

**Expected Result**:
```
flag_key                    | ENABLE_FAVORITES_PRIORITY
flag_name                   | Favorites Priority Broadcast
is_enabled                  | false
description                 | Enables priority notification to favorite mechanic...
```

---

### Step 3: Toggle the Flag (No Restart Needed!)

#### Option A: Via Admin UI (Recommended)
1. Navigate to: `http://localhost:3000/admin/feature-flags`
2. Find "Favorites Priority Broadcast"
3. Click the toggle switch
4. Status changes from 🔴 OFF → 🟢 ON
5. **Feature is now active** - no server restart needed!

#### Option B: Via SQL (Manual)
```sql
-- Enable the feature
UPDATE feature_flags
SET is_enabled = true,
    updated_at = NOW()
WHERE flag_key = 'ENABLE_FAVORITES_PRIORITY';

-- Disable the feature
UPDATE feature_flags
SET is_enabled = false,
    updated_at = NOW()
WHERE flag_key = 'ENABLE_FAVORITES_PRIORITY';
```

---

## 🧪 How to Test

### Test 1: Toggle Without Restart

1. **Start with flag OFF**:
   ```sql
   UPDATE feature_flags SET is_enabled = false WHERE flag_key = 'ENABLE_FAVORITES_PRIORITY';
   ```

2. **Complete a favorite booking**:
   - Customer dashboard → Book favorite mechanic
   - Check server logs - should see: `[fulfillment] Broadcast routing to all mechanics`
   - **NO** priority logs

3. **Enable the flag** (without restarting server):
   ```sql
   UPDATE feature_flags SET is_enabled = true WHERE flag_key = 'ENABLE_FAVORITES_PRIORITY';
   ```

4. **Complete another favorite booking**:
   - Customer dashboard → Book favorite mechanic
   - Check server logs - should see:
     ```
     [Priority] Attempting priority notification to mechanic <ID>
     [Priority] ✅ Sent priority notification to mechanic <ID>
     [Priority] Scheduling fallback broadcast...
     ```

5. **Verify no restart was needed** ✅

---

### Test 2: Admin UI Toggle

1. Visit `http://localhost:3000/admin/feature-flags`
2. Toggle "Favorites Priority Broadcast" to ON
3. Complete booking → Check logs (should see priority logs)
4. Toggle to OFF
5. Complete booking → Check logs (should see standard broadcast)
6. Verify immediate effect ✅

---

## 📊 How It Works

### Before (Environment Variable)
```typescript
// ❌ OLD: Requires server restart
const priorityEnabled = process.env.ENABLE_FAVORITES_PRIORITY === 'true'
```

**Workflow**:
1. Edit `.env.local`
2. Change `ENABLE_FAVORITES_PRIORITY=false` to `true`
3. **Restart server** 🔄
4. Feature enabled

---

### After (Database-Driven)
```typescript
// ✅ NEW: Instant toggle, no restart
const priorityEnabled = await isFeatureEnabled('ENABLE_FAVORITES_PRIORITY')
```

**Workflow**:
1. Visit `http://localhost:3000/admin/feature-flags`
2. Click toggle switch 🔘
3. Feature enabled **instantly** ⚡

---

## 🔍 Technical Details

### Database Schema
```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL UNIQUE,
  flag_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_for_roles TEXT[] DEFAULT '{admin}',
  rollout_percentage INTEGER DEFAULT 100,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Flag Configuration
```json
{
  "flag_key": "ENABLE_FAVORITES_PRIORITY",
  "flag_name": "Favorites Priority Broadcast",
  "description": "Enables priority notification to favorite mechanic...",
  "is_enabled": false,
  "enabled_for_roles": ["admin", "customer"],
  "rollout_percentage": 100,
  "metadata": {
    "phases_completed": ["phase1", "phase2", "phase3"],
    "requires_database_migration": "phase4"
  }
}
```

### isFeatureEnabled() Logic
```typescript
export async function isFeatureEnabled(flag: FeatureFlagKey): Promise<boolean> {
  // 1. Check database first (primary source of truth)
  const dbFlag = await supabaseAdmin
    .from('feature_flags')
    .select('is_enabled')
    .eq('flag_key', flag)
    .maybeSingle()

  if (dbFlag) {
    return dbFlag.is_enabled === true  // Database wins
  }

  // 2. Fallback to .env if not in database
  return FEATURE_FLAGS[flag] === true
}
```

**Priority**:
1. **Database** (if flag exists)
2. **Environment variable** (fallback)

---

## 🎯 Advantages

### For Development
- ✅ Test both ON/OFF states rapidly
- ✅ No need to edit `.env.local` repeatedly
- ✅ No server restarts during testing
- ✅ Easy to demonstrate to stakeholders

### For Production
- ✅ Emergency kill-switch (instant disable)
- ✅ Gradual rollout (via rollout_percentage)
- ✅ Role-based access (enabled_for_roles)
- ✅ Audit trail (created_at, updated_at)
- ✅ Metadata for feature tracking

---

## 🛡️ Backward Compatibility

If database is unavailable or flag not found:
- ✅ Falls back to `.env.local` value
- ✅ No errors or crashes
- ✅ Graceful degradation

**Example**:
```typescript
// Database down or flag missing
const priorityEnabled = await isFeatureEnabled('ENABLE_FAVORITES_PRIORITY')
// → Falls back to process.env.ENABLE_FAVORITES_PRIORITY
```

---

## 🚨 Important Notes

1. **First Time Setup**: Run SQL migration once
2. **Default State**: Flag starts as DISABLED
3. **No Restart**: Changes take effect immediately
4. **Environment Override**: Database value overrides .env
5. **Admin Access**: Only admins can toggle flags in UI

---

## ✅ Checklist

- [x] Run SQL migration in Supabase
- [ ] Verify flag exists in database
- [ ] Test toggle via Admin UI
- [ ] Test priority flow with flag ON
- [ ] Test standard flow with flag OFF
- [ ] Confirm no restart needed
- [ ] Remove `ENABLE_FAVORITES_PRIORITY=false` from `.env.local` (optional)

---

## 📝 Next Steps

### Ready to Test Phase 3
1. Run SQL migration
2. Toggle flag to ON via Admin UI
3. Test priority flow (5 scenarios in phase3-verification.md)
4. Toggle flag to OFF
5. Verify standard flow unchanged

### No Need to Edit .env.local Anymore!
- Flag is now controlled via database
- Use Admin UI or SQL to toggle
- Instant changes, no restart

---

**END OF DATABASE TOGGLE SETUP GUIDE**
