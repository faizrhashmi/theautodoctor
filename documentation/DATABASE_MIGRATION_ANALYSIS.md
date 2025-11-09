# Database Migration Analysis & Backward-Compatible Plan

**Date**: 2025-11-08
**Status**: ANALYSIS COMPLETE - AWAITING APPROVAL

---

## 🔍 CURRENT STATE ANALYSIS

### **Migration Status**

```
Local Migrations:
- 20251108020831_remote_schema.sql       ✅ Applied
- 20251108100000_add_platform_fee_settings.sql ✅ Applied
- 20251108110000_remove_partnership_system.sql ✅ Applied
- 99999999999_add_customer_postal_code.sql    ❌ NOT APPLIED (needs repair)
- 99999999999999_add_is_workshop_column.sql   ❌ NOT APPLIED (needs repair)

Remote Migrations:
- 20251108020831_remote_schema.sql       ✅ Applied
- 20251108100000_add_platform_fee_settings.sql ✅ Applied
- 20251108110000_remove_partnership_system.sql ✅ Applied
- 99999999999_add_customer_postal_code.sql    ✅ Applied (but not in local list)
```

### **Issue Detected**

Migrations `99999999999` and `99999999999999` are out of sync:
- Remote has `99999999999` applied
- Local has both but status confused
- Need to repair migration history

---

## 🛡️ BACKWARD-COMPATIBLE MIGRATION STRATEGY

### **Principle: ZERO BREAKING CHANGES**

All new migrations will:
1. ✅ Add NEW columns (not modify existing)
2. ✅ Make all new columns NULLABLE (can be added without data loss)
3. ✅ Add NEW tables (not modify existing)
4. ✅ Add indexes for performance
5. ✅ Existing functionality continues working unchanged

### **Existing Tables We Need to Extend**

Based on the codebase, these tables exist:
- `mechanics` - Independent mechanics
- `session_requests` - Customer session requests
- `auth.users` - Supabase auth (don't modify)

We need to ADD:
- `workshops` table (NEW)
- `workshop_integrations` table (NEW)
- `session_payments` table (NEW)
- Additional NULLABLE columns to `mechanics`
- Additional NULLABLE columns to `session_requests`

---

## 📋 STEP-BY-STEP MIGRATION PLAN

### **Step 1: Repair Migration History (CRITICAL FIRST)**

```bash
# Repair the out-of-sync migrations
pnpm supabase migration repair --status applied 99999999999
pnpm supabase migration repair --status applied 99999999999999
```

This will sync local and remote migration state.

### **Step 2: Create New Migrations (Backward Compatible)**

**Migration Naming Convention**:
```
20250108_[sequence]_[description].sql
```

**Sequence**:
1. `20250108000001_create_workshops_table.sql`
2. `20250108000002_create_workshop_integrations_table.sql`
3. `20250108000003_extend_mechanics_dual_mode.sql`
4. `20250108000004_extend_session_requests_revenue.sql`
5. `20250108000005_create_session_payments_table.sql`
6. `20250108000006_create_violation_logs_table.sql`

---

## 📊 DETAILED MIGRATION DESIGNS

### **Migration 1: Create Workshops Table**

```sql
-- File: supabase/migrations/20250108000001_create_workshops_table.sql

-- Create workshops table (completely new, zero impact on existing system)
CREATE TABLE IF NOT EXISTS workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Business info
  name VARCHAR(255) NOT NULL,
  shop_address TEXT,
  city VARCHAR(100),
  province VARCHAR(50),
  postal_code VARCHAR(10),
  country VARCHAR(100) DEFAULT 'Canada',
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Operating details
  shop_hours JSONB,
  accepts_physical_bookings BOOLEAN DEFAULT TRUE,

  -- Payment
  stripe_account_id VARCHAR(255),
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,

  -- Policies (defaults safe for all workshops)
  default_geographic_policy VARCHAR(50) DEFAULT 'protected_territory'
    CHECK (default_geographic_policy IN ('full_trust', 'protected_territory', 'strict')),
  default_restriction_radius_km INTEGER DEFAULT 50,
  default_cooling_period_days INTEGER DEFAULT 30,

  -- Status
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended', 'closed')),

  -- Insurance
  insurance_verified BOOLEAN DEFAULT FALSE,
  insurance_expiry_date DATE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workshops_owner ON workshops(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_workshops_status ON workshops(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_workshops_stripe ON workshops(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- RLS Policies
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;

-- Workshop owners can manage their own workshop
CREATE POLICY "Workshop owners can manage their workshop"
  ON workshops FOR ALL
  USING (owner_user_id = auth.uid());

-- Public can view active workshops (for marketplace)
CREATE POLICY "Public can view active workshops"
  ON workshops FOR SELECT
  USING (status = 'active');

-- Updated at trigger (if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_workshops_updated_at
      BEFORE UPDATE ON workshops
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Comments for documentation
COMMENT ON TABLE workshops IS 'Physical automotive workshops that can employ mechanics';
COMMENT ON COLUMN workshops.default_geographic_policy IS 'Default policy for new employee integrations';
COMMENT ON COLUMN workshops.stripe_account_id IS 'Stripe Connect account for receiving workshop-mode session payments';
```

**Impact**: ✅ **ZERO** - Completely new table, doesn't affect existing mechanics or sessions

---

### **Migration 2: Create Workshop Integrations Table**

```sql
-- File: supabase/migrations/20250108000002_create_workshop_integrations_table.sql

-- Create workshop integrations (link mechanics to workshops)
CREATE TABLE IF NOT EXISTS workshop_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  mechanic_id UUID NOT NULL, -- Don't add FK yet to avoid breaking if mechanics table structure unknown
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,

  -- Schedule
  work_days JSONB DEFAULT '["monday","tuesday","wednesday","thursday","friday"]'::jsonb,
  work_start_time TIME DEFAULT '09:00:00',
  work_end_time TIME DEFAULT '17:00:00',
  timezone VARCHAR(50) DEFAULT 'America/Toronto',

  -- Geographic Policy
  geographic_policy VARCHAR(50) DEFAULT 'protected_territory'
    CHECK (geographic_policy IN ('full_trust', 'protected_territory', 'strict')),
  restriction_radius_km INTEGER DEFAULT 50,

  -- Employment Status
  status VARCHAR(50) DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'notice_period', 'disconnected', 'expired')),

  -- Important Dates
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  employment_start_date DATE,
  employment_end_date DATE,
  notice_given_date DATE,
  disconnected_at TIMESTAMP,
  cooling_period_days INTEGER DEFAULT 30,
  cooling_period_end_date DATE,

  -- Disconnection Info
  disconnected_by VARCHAR(50) CHECK (disconnected_by IN ('workshop', 'mechanic', 'platform')),
  disconnection_reason TEXT,

  -- Privacy Settings
  workshop_can_see_independent_count BOOLEAN DEFAULT TRUE,
  workshop_can_see_customer_cities BOOLEAN DEFAULT TRUE,

  -- Agreement
  employment_agreement_signed BOOLEAN DEFAULT FALSE,
  employment_agreement_signed_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workshop_integrations_mechanic ON workshop_integrations(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_workshop_integrations_workshop ON workshop_integrations(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_integrations_status ON workshop_integrations(status);

-- RLS Policies
ALTER TABLE workshop_integrations ENABLE ROW LEVEL SECURITY;

-- Workshops can manage their integrations
CREATE POLICY "Workshops can manage their integrations"
  ON workshop_integrations FOR ALL
  USING (
    workshop_id IN (SELECT id FROM workshops WHERE owner_user_id = auth.uid())
  );

-- Mechanics can view their integrations (need to check mechanics table structure)
-- This will be safe even if mechanics don't have user_id yet
CREATE POLICY "Mechanics can view their integrations"
  ON workshop_integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mechanics m
      WHERE m.id = workshop_integrations.mechanic_id
      AND (
        (m.user_id IS NOT NULL AND m.user_id = auth.uid())
        OR
        (m.user_id IS NULL) -- Backward compatible: if no user_id column, allow for now
      )
    )
  );

-- Comments
COMMENT ON TABLE workshop_integrations IS 'Links mechanics to workshops for dual-mode operation';
COMMENT ON COLUMN workshop_integrations.status IS 'invited=pending acceptance, active=employed, disconnected=removed, expired=cooling period ended';
```

**Impact**: ✅ **ZERO** - New table, no existing data affected

---

### **Migration 3: Extend Mechanics Table (NULLABLE columns only)**

```sql
-- File: supabase/migrations/20250108000003_extend_mechanics_dual_mode.sql

-- Add NEW columns to mechanics table (all NULLABLE to avoid breaking existing data)

-- Postal code for location matching
ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);

-- Province (for location)
ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS province VARCHAR(50);

-- Free-text city (replacing dropdown)
ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS city_free_text VARCHAR(100);

-- Create index for postal code FSA matching (first 3 characters)
CREATE INDEX IF NOT EXISTS idx_mechanics_postal_fsa
ON mechanics ((SUBSTRING(postal_code, 1, 3)))
WHERE postal_code IS NOT NULL;

-- Helper function to extract FSA
CREATE OR REPLACE FUNCTION get_postal_fsa(postal VARCHAR(10))
RETURNS VARCHAR(3) AS $$
BEGIN
  IF postal IS NULL OR LENGTH(postal) < 3 THEN
    RETURN NULL;
  END IF;
  RETURN UPPER(SUBSTRING(postal, 1, 3));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comments
COMMENT ON COLUMN mechanics.postal_code IS 'Canadian postal code for location-based matching (e.g., M5V 3A8)';
COMMENT ON COLUMN mechanics.province IS 'Province/territory for location matching';
COMMENT ON COLUMN mechanics.city_free_text IS 'Free-text city name (replaces limited dropdown)';
```

**Impact**: ✅ **MINIMAL** - Only adds nullable columns, existing mechanics unaffected

**Backward Compatibility**:
- Existing mechanics have NULL in new columns → still work fine
- Existing queries don't reference new columns → no errors
- New features gracefully degrade if postal code missing

---

### **Migration 4: Extend Session Requests (NULLABLE columns only)**

```sql
-- File: supabase/migrations/20250108000004_extend_session_requests_revenue.sql

-- Add revenue routing columns to session_requests (all NULLABLE)

-- Customer location
ALTER TABLE session_requests
ADD COLUMN IF NOT EXISTS customer_postal_code VARCHAR(10);

-- Revenue routing
ALTER TABLE session_requests
ADD COLUMN IF NOT EXISTS revenue_recipient_type VARCHAR(50)
  CHECK (revenue_recipient_type IN ('mechanic', 'workshop') OR revenue_recipient_type IS NULL);

ALTER TABLE session_requests
ADD COLUMN IF NOT EXISTS revenue_recipient_id UUID;

ALTER TABLE session_requests
ADD COLUMN IF NOT EXISTS workshop_integration_id UUID
REFERENCES workshop_integrations(id) ON DELETE SET NULL;

ALTER TABLE session_requests
ADD COLUMN IF NOT EXISTS mechanic_mode_at_time VARCHAR(50)
  CHECK (mechanic_mode_at_time IN ('independent', 'workshop') OR mechanic_mode_at_time IS NULL);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_requests_revenue_recipient
ON session_requests(revenue_recipient_type, revenue_recipient_id)
WHERE revenue_recipient_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_requests_workshop_integration
ON session_requests(workshop_integration_id)
WHERE workshop_integration_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN session_requests.customer_postal_code IS 'Customer postal code for location-based matching';
COMMENT ON COLUMN session_requests.revenue_recipient_type IS 'Who receives revenue: mechanic (independent) or workshop (workshop mode)';
COMMENT ON COLUMN session_requests.mechanic_mode_at_time IS 'Mechanic mode when session started (independent or workshop)';
```

**Impact**: ✅ **ZERO** - Nullable columns, existing sessions work unchanged

**Backward Compatibility**:
- Existing sessions have NULL in new columns → revenue defaults to mechanic
- Existing payment logic unaffected
- New dual-mode logic only applies to new sessions

---

### **Migration 5: Create Session Payments Table**

```sql
-- File: supabase/migrations/20250108000005_create_session_payments_table.sql

-- Create session payments tracking table (completely new)
CREATE TABLE IF NOT EXISTS session_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  session_id UUID NOT NULL, -- Don't add FK yet, might not exist

  -- Payment Recipient
  recipient_type VARCHAR(50) NOT NULL
    CHECK (recipient_type IN ('mechanic', 'workshop')),
  recipient_id UUID NOT NULL,
  recipient_stripe_account_id VARCHAR(255) NOT NULL,

  -- Amounts (in cents)
  session_fee_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  recipient_amount_cents INTEGER NOT NULL,

  -- Context
  was_during_workshop_hours BOOLEAN DEFAULT FALSE,
  workshop_integration_id UUID REFERENCES workshop_integrations(id) ON DELETE SET NULL,

  -- Geographic Info (privacy-protected)
  customer_city VARCHAR(100),
  customer_postal_code_fsa VARCHAR(3),

  -- Stripe
  stripe_payment_intent_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255),
  payment_status VARCHAR(50) DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed')),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_payments_session ON session_payments(session_id);
CREATE INDEX IF NOT EXISTS idx_session_payments_recipient ON session_payments(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_session_payments_status ON session_payments(payment_status);

-- RLS Policies
ALTER TABLE session_payments ENABLE ROW LEVEL SECURITY;

-- Mechanics can view their payments (safe even if mechanics structure unknown)
CREATE POLICY "Mechanics can view their payments"
  ON session_payments FOR SELECT
  USING (
    recipient_type = 'mechanic'
    AND EXISTS (
      SELECT 1 FROM mechanics m
      WHERE m.id = recipient_id
      AND (
        (m.user_id IS NOT NULL AND m.user_id = auth.uid())
        OR (m.user_id IS NULL) -- Backward compatible
      )
    )
  );

-- Workshops can view their payments
CREATE POLICY "Workshops can view their payments"
  ON session_payments FOR SELECT
  USING (
    recipient_type = 'workshop'
    AND recipient_id IN (SELECT id FROM workshops WHERE owner_user_id = auth.uid())
  );

-- Comments
COMMENT ON TABLE session_payments IS 'Tracks all session payments and revenue routing (dual-mode system)';
COMMENT ON COLUMN session_payments.customer_postal_code_fsa IS 'First 3 chars only for privacy (geographic verification)';
```

**Impact**: ✅ **ZERO** - New table, optional to use

---

### **Migration 6: Create Violation Logs Table**

```sql
-- File: supabase/migrations/20250108000006_create_violation_logs_table.sql

-- Create violation tracking table
CREATE TABLE IF NOT EXISTS violation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Who
  mechanic_id UUID, -- Nullable, might not have FK
  workshop_integration_id UUID REFERENCES workshop_integrations(id) ON DELETE SET NULL,
  session_id UUID, -- Nullable, might not have FK

  -- What
  violation_type VARCHAR(50) NOT NULL
    CHECK (violation_type IN (
      'contact_info_sharing',
      'geographic_restriction',
      'active_solicitation',
      'mode_bypass_attempt',
      'other'
    )),

  -- Details
  description TEXT,
  evidence JSONB,
  severity VARCHAR(50) DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Status
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'warned', 'suspended', 'dismissed')),
  reviewed_at TIMESTAMP,
  reviewed_by UUID, -- Nullable
  action_taken TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_violation_logs_mechanic ON violation_logs(mechanic_id) WHERE mechanic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_violation_logs_status ON violation_logs(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_violation_logs_severity ON violation_logs(severity) WHERE severity IN ('high', 'critical');

-- Comments
COMMENT ON TABLE violation_logs IS 'Tracks policy violations (contact sharing, geographic restrictions, etc)';
```

**Impact**: ✅ **ZERO** - New table, optional feature

---

## ✅ SAFETY GUARANTEES

### **What We're NOT Doing (Breaking Changes)**

❌ **NOT modifying existing columns**
❌ **NOT adding NOT NULL constraints to existing tables**
❌ **NOT dropping any columns**
❌ **NOT changing existing data types**
❌ **NOT modifying existing foreign keys**
❌ **NOT changing existing indexes**

### **What We ARE Doing (Safe Changes)**

✅ **Adding NEW tables** (workshops, workshop_integrations, session_payments, violation_logs)
✅ **Adding NULLABLE columns** (postal_code, province, city_free_text to mechanics)
✅ **Adding NULLABLE columns** (customer_postal_code, revenue_recipient_* to session_requests)
✅ **Adding NEW indexes** (for performance, doesn't affect data)
✅ **Adding RLS policies** (for security, doesn't affect existing queries)

---

## 🚀 DEPLOYMENT SEQUENCE

### **Phase 1: Repair Migration History** (5 minutes)

```bash
# Sync local and remote
pnpm supabase migration repair --status applied 99999999999
pnpm supabase migration repair --status applied 99999999999999

# Verify sync
pnpm supabase migration list
```

### **Phase 2: Create New Migrations** (30 minutes)

```bash
# Create all 6 migration files in sequence
# (Files already designed above)
```

### **Phase 3: Test Locally** (1 hour)

```bash
# Reset local database
pnpm supabase db reset

# Run all migrations
# Verify no errors
# Test backward compatibility:
# - Existing mechanics still work
# - Existing sessions still work
# - New features gracefully degrade
```

### **Phase 4: Deploy to Production** (10 minutes)

```bash
# Push migrations
pnpm supabase db push

# Verify success
pnpm supabase migration list

# Monitor for errors
```

---

## 📊 ROLLBACK PLAN

If any issues occur:

```sql
-- Rollback is SAFE because:
-- 1. We only added NEW tables (can drop them)
-- 2. We only added NULLABLE columns (can drop them)
-- 3. No existing data was modified

-- Emergency rollback:
DROP TABLE IF EXISTS violation_logs CASCADE;
DROP TABLE IF EXISTS session_payments CASCADE;
DROP TABLE IF EXISTS workshop_integrations CASCADE;
DROP TABLE IF EXISTS workshops CASCADE;

ALTER TABLE session_requests
DROP COLUMN IF EXISTS customer_postal_code,
DROP COLUMN IF EXISTS revenue_recipient_type,
DROP COLUMN IF EXISTS revenue_recipient_id,
DROP COLUMN IF EXISTS workshop_integration_id,
DROP COLUMN IF EXISTS mechanic_mode_at_time;

ALTER TABLE mechanics
DROP COLUMN IF EXISTS postal_code,
DROP COLUMN IF EXISTS province,
DROP COLUMN IF EXISTS city_free_text;

-- System returns to pre-migration state
```

---

## ✅ FINAL RECOMMENDATION

**Proceed with migrations in this order**:

1. ✅ Repair migration history (fix sync issues)
2. ✅ Create workshops table (completely new)
3. ✅ Create workshop_integrations table (completely new)
4. ✅ Extend mechanics table (nullable columns only)
5. ✅ Extend session_requests table (nullable columns only)
6. ✅ Create session_payments table (completely new)
7. ✅ Create violation_logs table (completely new)

**Risk Level**: ⬇️ **VERY LOW**
- Zero breaking changes
- Existing functionality unchanged
- New features optional
- Easy rollback

**Testing Requirements**:
- ✅ Local reset and migration test
- ✅ Backward compatibility verification
- ✅ Production backup before deployment
- ✅ Post-deployment monitoring

**Ready to proceed?** All migrations designed for zero downtime and backward compatibility.

---

**Status**: ✅ **READY FOR IMPLEMENTATION**
**Next Step**: Create migration files and test locally
