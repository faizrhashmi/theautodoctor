-- ============================================================================
-- REMOVE PARTNERSHIP SYSTEM
-- ============================================================================
-- Partnerships are obsolete with the 3-tier mechanic model:
-- - Virtual-only: Escalate to workshops via RFQ (no physical work)
-- - Independent workshop owners: Have their own shop (don't need to rent)
-- - Workshop-affiliated: Already work at a workshop (don't need partnerships)
--
-- The RFQ system handles all workshop escalations correctly.
-- ============================================================================

-- Drop partnership-related tables in correct order (respecting foreign keys)

-- 1. Drop bay bookings (references partnership agreements)
DROP TABLE IF EXISTS partnership_bay_bookings CASCADE;

-- 2. Drop partnership agreements (references programs and mechanics)
DROP TABLE IF EXISTS partnership_agreements CASCADE;

-- 3. Drop partnership applications (references programs and mechanics)
DROP TABLE IF EXISTS partnership_applications CASCADE;

-- 4. Drop partnership programs (references workshops)
DROP TABLE IF EXISTS workshop_partnership_programs CASCADE;

-- Drop any partnership-related functions
DROP FUNCTION IF EXISTS calculate_partnership_revenue_split(UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS get_active_partnership(UUID) CASCADE;

-- Note: We keep the partnership_type field in mechanics table for backward compatibility
-- It will be NULL for all mechanics going forward (only account_type matters now)

COMMENT ON SCHEMA public IS 'Partnership system removed 2025-11-08. Use RFQ system for workshop escalations.';
