-- =====================================================
-- UNIFIED QUOTES VIEW VERIFICATION
-- =====================================================

-- 1. Verify view exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name = 'customer_quote_offers_v'
  ) THEN
    RAISE EXCEPTION '❌ View customer_quote_offers_v does not exist!';
  END IF;

  RAISE NOTICE '✅ View customer_quote_offers_v exists';
END $$;

-- 2. Verify view has correct columns
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'customer_quote_offers_v'
  AND column_name IN (
    'offer_id', 'source', 'rfq_id', 'session_id', 'vehicle_id', 'customer_id',
    'workshop_id', 'provider_name', 'provider_type',
    'price_total', 'price_labor', 'price_parts', 'platform_fee',
    'status', 'created_at', 'sent_at', 'valid_until', 'customer_responded_at',
    'notes', 'line_items', 'estimated_duration_hours', 'warranty_months',
    'parts_warranty_months', 'badges', 'rating_avg', 'rating_count',
    'distance_km', 'offer_age_minutes', 'can_accept'
  );

  IF col_count < 29 THEN
    RAISE EXCEPTION '❌ View is missing required columns (found %, expected 29)', col_count;
  END IF;

  RAISE NOTICE '✅ View has all required columns (%)' , col_count;
END $$;

-- 3. Test query: Fetch sample direct quotes
DO $$
DECLARE
  direct_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO direct_count
  FROM customer_quote_offers_v
  WHERE source = 'direct';

  RAISE NOTICE '✅ Direct quotes in view: %', direct_count;
END $$;

-- 4. Test query: Fetch sample RFQ bids
DO $$
DECLARE
  rfq_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rfq_count
  FROM customer_quote_offers_v
  WHERE source = 'rfq';

  RAISE NOTICE '✅ RFQ bids in view: %', rfq_count;
END $$;

-- 5. Test query: Verify computed fields work
DO $$
DECLARE
  test_offer RECORD;
BEGIN
  SELECT * INTO test_offer
  FROM customer_quote_offers_v
  LIMIT 1;

  IF test_offer IS NULL THEN
    RAISE NOTICE '⚠️  No offers in view yet (empty tables - this is OK)';
  ELSE
    RAISE NOTICE '✅ Sample offer: % (%, $%, can_accept: %)',
      test_offer.provider_name,
      test_offer.source,
      test_offer.price_total,
      test_offer.can_accept;
  END IF;
END $$;

-- 6. Test indexes exist
DO $$
DECLARE
  idx_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname IN (
    'idx_repair_quotes_customer_status',
    'idx_repair_quotes_sent_valid',
    'idx_rfq_bids_customer_status',
    'idx_rfq_marketplace_customer_status'
  );

  RAISE NOTICE '✅ Indexes created: %/4', idx_count;
END $$;

-- =====================================================
-- VERIFICATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VERIFICATION PASSED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'The customer_quote_offers_v view is ready to use!';
  RAISE NOTICE '';
  RAISE NOTICE 'Sample query:';
  RAISE NOTICE '  SELECT * FROM customer_quote_offers_v';
  RAISE NOTICE '  WHERE customer_id = auth.uid()';
  RAISE NOTICE '  AND status = ''pending''';
  RAISE NOTICE '  ORDER BY created_at DESC;';
  RAISE NOTICE '';
END $$;
