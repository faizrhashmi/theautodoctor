-- =====================================================
-- UNIFIED QUOTES VIEW ROLLBACK
-- =====================================================

-- Drop the unified view
DROP VIEW IF EXISTS customer_quote_offers_v CASCADE;

-- Drop indexes (only if they were created by this migration and not used elsewhere)
-- Note: We keep indexes as they may be useful for other queries

DO $$
BEGIN
  RAISE NOTICE '⚠️  Unified Quotes View rolled back';
  RAISE NOTICE '   - Dropped customer_quote_offers_v';
  RAISE NOTICE '   - Kept indexes (may be used by other queries)';
END $$;
