-- Fix end_session_with_semantics function conflict
-- Drop all versions and recreate cleanly

-- Step 1: Drop ALL versions to start fresh
DROP FUNCTION IF EXISTS public.end_session_with_semantics(text, text, uuid);
DROP FUNCTION IF EXISTS public.end_session_with_semantics(uuid, text, text, uuid);

-- Step 2: The 4-arg base version with full logic should already exist from migration
-- This is the one with signature: (uuid, uuid, text, text) - OID 54651
-- We'll verify it exists and keep it

-- Step 3: Create clean 3-arg wrapper
CREATE FUNCTION public.end_session_with_semantics(
  p_actor_role text,
  p_reason text,
  p_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result record;
  v_actor_id uuid := auth.uid();
BEGIN
  -- Call the 4-arg base version (p_session_id, p_actor_id, p_actor_role, p_reason)
  -- Using positional arguments to avoid ambiguity
  SELECT * INTO v_result
  FROM public.end_session_with_semantics(
    p_session_id,    -- 1st arg
    v_actor_id,       -- 2nd arg
    p_actor_role,     -- 3rd arg
    p_reason          -- 4th arg
  );

  -- Return as JSONB
  RETURN jsonb_build_object(
    'final_status', v_result.final_status,
    'started', v_result.started,
    'duration_seconds', v_result.duration_seconds,
    'message', v_result.message
  );
END;
$$;

COMMENT ON FUNCTION public.end_session_with_semantics(text, text, uuid) IS
  '3-arg wrapper for end_session_with_semantics that uses auth.uid() for actor_id';

-- Step 4: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify functions
SELECT
  proname,
  pronargs,
  pg_get_function_identity_arguments(oid) as args,
  prosrc LIKE '%_end_session_apply_semantics%' as is_wrapper
FROM pg_proc
WHERE proname = 'end_session_with_semantics'
ORDER BY pronargs;
