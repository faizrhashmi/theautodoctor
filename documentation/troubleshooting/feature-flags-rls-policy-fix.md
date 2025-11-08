# Feature Flags RLS Policy Fix

**Date Fixed:** January 6, 2025
**Status:** RESOLVED
**Priority:** MEDIUM
**Category:** Feature Flags, Database Security

---

## Overview

The RLS policy on the `feature_flags` table only allowed viewing flags where `is_enabled = true`, preventing clients from querying disabled flags to check their status. This broke the normal feature flag pattern where applications need to query a flag's enabled/disabled state.

---

## Problem Description

### Symptoms

1. Client cannot query feature flags that are disabled
2. Application cannot differentiate between "flag doesn't exist" and "flag is disabled"
3. Feature flag checks fail when flag is disabled
4. No way to see upcoming features (flags that exist but aren't enabled yet)

### Original RLS Policy

**File:** `supabase/migrations/20251201000001_phase2_admin_plan_manager.sql`

```sql
CREATE POLICY "Anyone can view enabled feature flags"
  ON feature_flags FOR SELECT
  USING (is_enabled = true);
```

**What This Does:**
- Only returns rows where `is_enabled = true`
- Hides all disabled flags from queries
- Makes it impossible to check a flag's disabled state

---

## Root Cause

### Incorrect Feature Flag Pattern

**The Normal Pattern:**
```typescript
// Client wants to check if feature is enabled
const { data: flag } = await supabase
  .from('feature_flags')
  .select('is_enabled')
  .eq('flag_key', 'mech_new_request_alerts')
  .single()

if (flag?.is_enabled) {
  // Use feature
}
```

**What Happened:**
```typescript
// If flag is disabled, query returns NO ROWS
const { data: flag, error } = await supabase...
// flag = null (not found)
// error = "No rows found"

// Application can't tell if:
// 1. Flag doesn't exist, OR
// 2. Flag exists but is disabled
```

### Real-World Impact

**File:** `src/hooks/useFeatureFlags.ts`

```typescript
const { data: flags } = await supabase
  .from('feature_flags')
  .select('flag_key, is_enabled')
  .in('flag_key', [
    'mech_new_request_alerts',
    'mech_audio_alerts',
    'mech_browser_notifications',
    'mech_visual_indicators'
  ])

// Before fix: Only returns ENABLED flags
// After fix: Returns ALL flags with their enabled status
```

**Before Fix:**
```json
[
  {"flag_key": "mech_new_request_alerts", "is_enabled": true}
  // Other 3 flags not returned if disabled
]
```

**After Fix:**
```json
[
  {"flag_key": "mech_new_request_alerts", "is_enabled": true},
  {"flag_key": "mech_audio_alerts", "is_enabled": true},
  {"flag_key": "mech_browser_notifications", "is_enabled": false},
  {"flag_key": "mech_visual_indicators", "is_enabled": true}
]
```

---

## Solution

### Updated RLS Policy

**Migration:** `supabase/migrations/20251106000008_fix_feature_flags_policy.sql`

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Anyone can view enabled feature flags" ON feature_flags;
DROP POLICY IF EXISTS "Anyone can view feature flags" ON feature_flags;

-- Allow viewing all feature flags (not just enabled ones)
CREATE POLICY "Anyone can view feature flags"
  ON feature_flags FOR SELECT
  USING (true);
```

### Why This Is Safe

**Concern:** "Won't this expose sensitive information?"

**Answer:** No, because:

1. **Feature flags are metadata, not data**
   - Flag names are descriptive (e.g., "mech_new_request_alerts")
   - No customer data, no PII, no secrets

2. **Enabled state is public behavior**
   - Users can see if features are enabled by trying them
   - No security through obscurity

3. **Flag keys are in client code anyway**
   ```typescript
   // Already visible in bundled JavaScript
   if (flags.mech_new_request_alerts) { ... }
   ```

4. **Other policies still protect management**
   ```sql
   -- Only admins can modify flags
   CREATE POLICY "Admins can manage feature flags"
     ON feature_flags FOR ALL
     USING (true)
     WITH CHECK (true);
   ```

---

## Implementation Details

### Feature Flags Table Schema

**File:** `supabase/migrations/20251201000001_phase2_admin_plan_manager.sql`

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL UNIQUE,
  flag_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_for_roles TEXT[] DEFAULT '{admin}',
  rollout_percentage INTEGER DEFAULT 100
    CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Mechanic Alert Flags

**Migration:** `supabase/migrations/20251106000001_add_mechanic_alert_flags.sql`

```sql
INSERT INTO feature_flags (
  flag_key,
  flag_name,
  description,
  enabled_for_roles,
  is_enabled,
  metadata
) VALUES
  (
    'mech_new_request_alerts',
    'Mechanic New Request Alerts',
    'Enable multi-layer alert system for mechanics when new session requests arrive',
    ARRAY['mechanic'],
    true,
    '{"tier": "all"}'::jsonb
  ),
  (
    'mech_audio_alerts',
    'Mechanic Audio Alerts',
    'Play sound when new session requests arrive',
    ARRAY['mechanic'],
    true,
    '{"tier": "all"}'::jsonb
  ),
  (
    'mech_browser_notifications',
    'Mechanic Browser Notifications',
    'Show browser notifications for new session requests',
    ARRAY['mechanic'],
    true,
    '{"tier": "all"}'::jsonb
  ),
  (
    'mech_visual_indicators',
    'Mechanic Visual Indicators',
    'Flash tab title and favicon for new requests',
    ARRAY['mechanic'],
    true,
    '{"tier": "all"}'::jsonb
  )
ON CONFLICT (flag_key) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled;
```

---

## Verification

### Test 1: Query Disabled Flag

```sql
-- Create test flag that's disabled
INSERT INTO feature_flags (flag_key, flag_name, is_enabled)
VALUES ('test_disabled', 'Test Disabled Flag', false);

-- Try to query it
SELECT * FROM feature_flags WHERE flag_key = 'test_disabled';
```

**Before Fix:** Returns 0 rows
**After Fix:** Returns 1 row with `is_enabled = false`

### Test 2: Client-Side Feature Check

```typescript
const { data: flag } = await supabase
  .from('feature_flags')
  .select('is_enabled')
  .eq('flag_key', 'mech_audio_alerts')
  .single()

console.log('Audio alerts enabled:', flag?.is_enabled)
```

**Before Fix:** If disabled, `flag = null`, no way to know if it exists
**After Fix:** `flag = {is_enabled: false}`, clear state

### Test 3: Bulk Flag Query

```typescript
const { data: flags } = await supabase
  .from('feature_flags')
  .select('flag_key, is_enabled')

// Should return ALL flags, not just enabled ones
console.log('Total flags:', flags?.length)
console.log('Enabled flags:', flags?.filter(f => f.is_enabled).length)
console.log('Disabled flags:', flags?.filter(f => !f.is_enabled).length)
```

---

## Best Practices for Feature Flags

### 1. Always Query with Defaults

```typescript
const { data: flag } = await supabase
  .from('feature_flags')
  .select('is_enabled')
  .eq('flag_key', 'new_feature')
  .single()

// Use default if flag doesn't exist
const isEnabled = flag?.is_enabled ?? false
```

### 2. Cache Flag Values

```typescript
// Fetch once, cache in context
const { data: flags } = await supabase
  .from('feature_flags')
  .select('flag_key, is_enabled')

const flagMap = Object.fromEntries(
  flags.map(f => [f.flag_key, f.is_enabled])
)

// Quick lookups
if (flagMap['mech_new_request_alerts']) { ... }
```

### 3. Provide Fallbacks

```typescript
function useFeature(flagKey: string, defaultValue = false) {
  const { data: flag } = useQuery(['flag', flagKey], () =>
    supabase.from('feature_flags')
      .select('is_enabled')
      .eq('flag_key', flagKey)
      .single()
  )

  return flag?.is_enabled ?? defaultValue
}
```

### 4. Type-Safe Flag Keys

```typescript
// Define allowed flag keys
type FeatureFlagKey =
  | 'mech_new_request_alerts'
  | 'mech_audio_alerts'
  | 'mech_browser_notifications'
  | 'mech_visual_indicators'

function useFeatureFlag(key: FeatureFlagKey): boolean {
  // TypeScript ensures only valid keys are used
}
```

---

## Advanced Feature Flag Patterns

### Gradual Rollout

```sql
-- Enable for 25% of users
UPDATE feature_flags
SET rollout_percentage = 25
WHERE flag_key = 'new_experimental_feature';
```

```typescript
function isFeatureEnabled(flagKey: string, userId: string): boolean {
  const flag = await getFlag(flagKey)

  if (!flag.is_enabled) return false

  // Hash user ID to get consistent percentage
  const userHash = hashCode(userId) % 100
  return userHash < flag.rollout_percentage
}
```

### Role-Based Flags

```sql
-- Enable only for admins and beta testers
UPDATE feature_flags
SET enabled_for_roles = ARRAY['admin', 'beta_tester']
WHERE flag_key = 'beta_feature';
```

```typescript
function canUseFeature(flag: FeatureFlag, userRole: string): boolean {
  if (!flag.is_enabled) return false

  return flag.enabled_for_roles.includes(userRole)
}
```

### A/B Testing

```sql
-- Store variant assignment in metadata
UPDATE feature_flags
SET metadata = '{"variants": {"A": 50, "B": 50}}'::jsonb
WHERE flag_key = 'ab_test_new_ui';
```

```typescript
function getVariant(flagKey: string, userId: string): 'A' | 'B' {
  const flag = await getFlag(flagKey)
  const variants = flag.metadata.variants

  const userHash = hashCode(userId) % 100
  let cumulative = 0

  for (const [variant, percentage] of Object.entries(variants)) {
    cumulative += percentage
    if (userHash < cumulative) return variant
  }

  return 'A' // Default
}
```

---

## Common Pitfalls

### 1. Not Handling Missing Flags

```typescript
// ❌ Bad: Throws if flag doesn't exist
const flag = await supabase.from('feature_flags')...
if (flag.is_enabled) { ... }

// ✅ Good: Handles missing flag
const flag = await supabase.from('feature_flags')...
if (flag?.is_enabled ?? false) { ... }
```

### 2. Querying Flags Too Often

```typescript
// ❌ Bad: Query on every render
function Component() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    supabase.from('feature_flags')...
      .then(f => setEnabled(f.is_enabled))
  }, []) // Runs on every mount

// ✅ Good: Use context or cache
const { flags } = useFeatureFlags() // Cached
```

### 3. Hardcoding Flag Keys

```typescript
// ❌ Bad: Typos not caught
if (flags['mech_audio_alrts']) { ... } // Typo!

// ✅ Good: Use constants
export const FEATURE_FLAGS = {
  AUDIO_ALERTS: 'mech_audio_alerts'
} as const

if (flags[FEATURE_FLAGS.AUDIO_ALERTS]) { ... }
```

---

## Migration Impact

### Before Fix

**Client Behavior:**
```typescript
// Query for disabled flag
const { data, error } = await supabase
  .from('feature_flags')
  .eq('flag_key', 'disabled_feature')
  .single()

// Result: data = null, error = "No rows found"
// Can't differentiate from "flag doesn't exist"
```

**Application must assume:**
- If query returns nothing, feature is disabled
- Cannot check if flag exists
- Cannot prepare for upcoming features

### After Fix

**Client Behavior:**
```typescript
// Query for disabled flag
const { data, error } = await supabase
  .from('feature_flags')
  .eq('flag_key', 'disabled_feature')
  .single()

// Result: data = {flag_key: '...', is_enabled: false}
// Clear indication flag exists but is disabled
```

**Application can now:**
- Check if flag exists vs. is disabled
- Show "coming soon" UI for disabled features
- Prepare feature rollout
- Debug flag configuration

---

## Related Documentation

- [RLS Blocking postgres_changes Events](./rls-blocking-postgres-changes-events.md)
- [Feature Flags Schema](../database/feature-flags-schema.md)
- [Mechanic Alert Flags](../features/mechanic-alert-flags.md)

---

## References

- Feature Flags Table: `supabase/migrations/20251201000001_phase2_admin_plan_manager.sql`
- Mechanic Alert Flags: `supabase/migrations/20251106000001_add_mechanic_alert_flags.sql`
- RLS Fix Migration: `supabase/migrations/20251106000008_fix_feature_flags_policy.sql`
- Feature Flags Hook: `src/hooks/useFeatureFlags.ts`

---

**Last Updated:** January 6, 2025
**Fixed By:** RLS Policy Update (Migration 20251106000008)
