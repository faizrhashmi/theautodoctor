-- ============================================================================
-- SESSION END LOGIC TEST SCENARIOS
-- ============================================================================
-- Purpose: Comprehensive test suite for session end logic
-- WARNING: Run in TEST/STAGING environment only - creates test data
-- Date: 2025-11-08
-- ============================================================================

-- ============================================================================
-- SETUP: Create Test Data
-- ============================================================================

-- Create test customer
DO $$
DECLARE
    v_test_customer_id uuid;
    v_test_mechanic_id uuid;
    v_test_session_1 uuid;
    v_test_session_2 uuid;
    v_test_session_3 uuid;
    v_test_session_4 uuid;
    v_test_session_5 uuid;
    v_result jsonb;
BEGIN
    -- Create test customer
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
        gen_random_uuid(),
        'test_customer@example.com',
        'Test Customer',
        'customer'
    )
    ON CONFLICT (email) DO UPDATE SET full_name = 'Test Customer'
    RETURNING id INTO v_test_customer_id;

    -- Create test mechanic
    INSERT INTO mechanics (id, name, email, is_active, stripe_payouts_enabled)
    VALUES (
        gen_random_uuid(),
        'Test Mechanic',
        'test_mechanic@example.com',
        true,
        false  -- No payouts for test
    )
    ON CONFLICT (email) DO UPDATE SET name = 'Test Mechanic'
    RETURNING id INTO v_test_mechanic_id;

    RAISE NOTICE 'Test customer ID: %', v_test_customer_id;
    RAISE NOTICE 'Test mechanic ID: %', v_test_mechanic_id;

    -- ========================================================================
    -- TEST SCENARIO 1: Normal Completed Session (Both Joined, Duration > 60s)
    -- ========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST 1: Normal Completed Session ===';

    INSERT INTO sessions (
        id,
        customer_user_id,
        mechanic_id,
        status,
        plan,
        type,
        started_at,
        ended_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_test_customer_id,
        v_test_mechanic_id,
        'live',  -- Start as live
        'video15',
        'video',
        NOW() - INTERVAL '10 minutes',
        NULL,
        NOW() - INTERVAL '15 minutes',
        NOW()
    )
    RETURNING id INTO v_test_session_1;

    -- Simulate both participants joining
    INSERT INTO session_events (session_id, event_type, user_id, metadata)
    VALUES
        (v_test_session_1, 'customer_joined', v_test_customer_id, '{"role": "customer"}'::jsonb),
        (v_test_session_1, 'mechanic_joined', v_test_mechanic_id, '{"role": "mechanic"}'::jsonb);

    -- Test ending the session
    SELECT * FROM end_session_with_semantics(
        v_test_session_1,
        v_test_customer_id,
        'customer',
        'user_ended'
    ) INTO v_result;

    RAISE NOTICE 'Test 1 Result: %', v_result;

    -- Verify result
    ASSERT (v_result->>'final_status') = 'completed',
        'Test 1 Failed: Expected completed, got ' || (v_result->>'final_status');
    ASSERT (v_result->>'started')::boolean = true,
        'Test 1 Failed: Expected started=true';
    ASSERT (v_result->>'duration_seconds')::integer >= 60,
        'Test 1 Failed: Expected duration >= 60 seconds';

    RAISE NOTICE '✅ Test 1 PASSED: Session correctly marked as completed';

    -- ========================================================================
    -- TEST SCENARIO 2: Cancelled Session (Never Started, No-Show)
    -- ========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST 2: Cancelled Session (No-Show) ===';

    INSERT INTO sessions (
        id,
        customer_user_id,
        mechanic_id,
        status,
        plan,
        type,
        started_at,
        ended_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_test_customer_id,
        v_test_mechanic_id,
        'waiting',  -- Never progressed to live
        'chat10',
        'chat',
        NULL,  -- Never started
        NULL,
        NOW() - INTERVAL '5 minutes',
        NOW()
    )
    RETURNING id INTO v_test_session_2;

    -- No participant join events (no-show scenario)

    -- Test ending the session
    SELECT * FROM end_session_with_semantics(
        v_test_session_2,
        v_test_customer_id,
        'customer',
        'user_cancelled'
    ) INTO v_result;

    RAISE NOTICE 'Test 2 Result: %', v_result;

    -- Verify result
    ASSERT (v_result->>'final_status') = 'cancelled',
        'Test 2 Failed: Expected cancelled, got ' || (v_result->>'final_status');
    ASSERT (v_result->>'started')::boolean = false,
        'Test 2 Failed: Expected started=false';
    ASSERT (v_result->>'duration_seconds')::integer = 0,
        'Test 2 Failed: Expected duration=0 seconds';

    RAISE NOTICE '✅ Test 2 PASSED: No-show correctly marked as cancelled';

    -- ========================================================================
    -- TEST SCENARIO 3: Cancelled Session (Started But Duration < 60s)
    -- ========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST 3: Cancelled Session (Too Short) ===';

    INSERT INTO sessions (
        id,
        customer_user_id,
        mechanic_id,
        status,
        plan,
        type,
        started_at,
        ended_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_test_customer_id,
        v_test_mechanic_id,
        'live',
        'diagnostic',
        'video',
        NOW() - INTERVAL '30 seconds',  -- Only 30 seconds
        NULL,
        NOW() - INTERVAL '2 minutes',
        NOW()
    )
    RETURNING id INTO v_test_session_3;

    -- Simulate both participants joining
    INSERT INTO session_events (session_id, event_type, user_id, metadata)
    VALUES
        (v_test_session_3, 'customer_joined', v_test_customer_id, '{"role": "customer"}'::jsonb),
        (v_test_session_3, 'mechanic_joined', v_test_mechanic_id, '{"role": "mechanic"}'::jsonb);

    -- Test ending the session
    SELECT * FROM end_session_with_semantics(
        v_test_session_3,
        v_test_mechanic_id,
        'mechanic',
        'user_ended'
    ) INTO v_result;

    RAISE NOTICE 'Test 3 Result: %', v_result;

    -- Verify result
    ASSERT (v_result->>'final_status') = 'cancelled',
        'Test 3 Failed: Expected cancelled, got ' || (v_result->>'final_status');
    ASSERT (v_result->>'started')::boolean = true,
        'Test 3 Failed: Expected started=true';
    ASSERT (v_result->>'duration_seconds')::integer < 60,
        'Test 3 Failed: Expected duration < 60 seconds';

    RAISE NOTICE '✅ Test 3 PASSED: Too-short session correctly marked as cancelled';

    -- ========================================================================
    -- TEST SCENARIO 4: Edge Case - Exactly 60 Seconds
    -- ========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST 4: Edge Case (Exactly 60 Seconds) ===';

    INSERT INTO sessions (
        id,
        customer_user_id,
        mechanic_id,
        status,
        plan,
        type,
        started_at,
        ended_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_test_customer_id,
        v_test_mechanic_id,
        'live',
        'video15',
        'video',
        NOW() - INTERVAL '60 seconds',  -- Exactly 60 seconds
        NULL,
        NOW() - INTERVAL '2 minutes',
        NOW()
    )
    RETURNING id INTO v_test_session_4;

    -- Simulate both participants joining
    INSERT INTO session_events (session_id, event_type, user_id, metadata)
    VALUES
        (v_test_session_4, 'customer_joined', v_test_customer_id, '{"role": "customer"}'::jsonb),
        (v_test_session_4, 'mechanic_joined', v_test_mechanic_id, '{"role": "mechanic"}'::jsonb);

    -- Test ending the session
    SELECT * FROM end_session_with_semantics(
        v_test_session_4,
        v_test_customer_id,
        'customer',
        'user_ended'
    ) INTO v_result;

    RAISE NOTICE 'Test 4 Result: %', v_result;

    -- Verify result
    ASSERT (v_result->>'final_status') = 'completed',
        'Test 4 Failed: Expected completed at 60s threshold, got ' || (v_result->>'final_status');
    ASSERT (v_result->>'duration_seconds')::integer >= 60,
        'Test 4 Failed: Expected duration >= 60 seconds';

    RAISE NOTICE '✅ Test 4 PASSED: 60-second threshold correctly triggers completed status';

    -- ========================================================================
    -- TEST SCENARIO 5: Idempotency Test (Calling End Twice)
    -- ========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST 5: Idempotency Test ===';

    INSERT INTO sessions (
        id,
        customer_user_id,
        mechanic_id,
        status,
        plan,
        type,
        started_at,
        ended_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_test_customer_id,
        v_test_mechanic_id,
        'live',
        'chat10',
        'chat',
        NOW() - INTERVAL '5 minutes',
        NULL,
        NOW() - INTERVAL '10 minutes',
        NOW()
    )
    RETURNING id INTO v_test_session_5;

    -- Simulate both participants joining
    INSERT INTO session_events (session_id, event_type, user_id, metadata)
    VALUES
        (v_test_session_5, 'customer_joined', v_test_customer_id, '{"role": "customer"}'::jsonb),
        (v_test_session_5, 'mechanic_joined', v_test_mechanic_id, '{"role": "mechanic"}'::jsonb);

    -- First call to end session
    SELECT * FROM end_session_with_semantics(
        v_test_session_5,
        v_test_customer_id,
        'customer',
        'user_ended'
    ) INTO v_result;

    RAISE NOTICE 'Test 5 First Call: %', v_result;

    DECLARE
        v_first_status text := v_result->>'final_status';
        v_first_duration integer := (v_result->>'duration_seconds')::integer;
        v_result_2 jsonb;
    BEGIN
        -- Wait a moment to ensure timestamp difference
        PERFORM pg_sleep(1);

        -- Second call to end session (should be idempotent)
        SELECT * FROM end_session_with_semantics(
            v_test_session_5,
            v_test_mechanic_id,
            'mechanic',
            'user_ended'
        ) INTO v_result_2;

        RAISE NOTICE 'Test 5 Second Call: %', v_result_2;

        -- Verify idempotency
        ASSERT (v_result_2->>'final_status') = v_first_status,
            'Test 5 Failed: Status changed on second call';

        RAISE NOTICE '✅ Test 5 PASSED: Function is idempotent';
    END;

    -- ========================================================================
    -- TEST SUMMARY
    -- ========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ALL TESTS PASSED';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Test sessions created:';
    RAISE NOTICE '  - Test 1 (Completed): %', v_test_session_1;
    RAISE NOTICE '  - Test 2 (No-show): %', v_test_session_2;
    RAISE NOTICE '  - Test 3 (Too short): %', v_test_session_3;
    RAISE NOTICE '  - Test 4 (Edge case): %', v_test_session_4;
    RAISE NOTICE '  - Test 5 (Idempotency): %', v_test_session_5;
    RAISE NOTICE '';
    RAISE NOTICE 'Run the following to clean up test data:';
    RAISE NOTICE 'DELETE FROM sessions WHERE customer_user_id = %', quote_literal(v_test_customer_id);
    RAISE NOTICE 'DELETE FROM session_events WHERE user_id IN (%, %)', quote_literal(v_test_customer_id), quote_literal(v_test_mechanic_id);
    RAISE NOTICE 'DELETE FROM profiles WHERE id = %', quote_literal(v_test_customer_id);
    RAISE NOTICE 'DELETE FROM mechanics WHERE id = %', quote_literal(v_test_mechanic_id);

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ TEST FAILED: % - %', SQLERRM, SQLSTATE;
END $$;

-- ============================================================================
-- ADDITIONAL TEST: Race Condition Simulation
-- ============================================================================

-- Test concurrent end session calls (run in multiple connections)
/*
-- Connection 1:
BEGIN;
SELECT * FROM end_session_with_semantics(
    '<session_id>',
    '<actor_id>',
    'customer',
    'user_ended'
);
-- Keep transaction open for 5 seconds
SELECT pg_sleep(5);
COMMIT;

-- Connection 2 (run simultaneously):
BEGIN;
SELECT * FROM end_session_with_semantics(
    '<session_id>',  -- Same session ID
    '<actor_id>',
    'mechanic',
    'user_ended'
);
COMMIT;

-- Expected: One should succeed, other should fail with lock error or wait
*/

-- ============================================================================
-- PERFORMANCE TEST: Measure Function Execution Time
-- ============================================================================

EXPLAIN ANALYZE
SELECT * FROM end_session_with_semantics(
    (SELECT id FROM sessions WHERE status = 'live' LIMIT 1),
    (SELECT customer_user_id FROM sessions WHERE status = 'live' LIMIT 1),
    'customer',
    'test_performance'
);

-- Expected: < 100ms execution time

-- ============================================================================
-- END OF TEST SCENARIOS
-- ============================================================================
