-- End Session Semantics Fix: 3-arg RPC wrapper
-- Resolves PGRST202 error by creating a 3-arg wrapper that calls the 4-arg function with auth.uid()

-- Step 1: Drop any existing 3-arg versions to avoid conflicts
drop function if exists public.end_session_with_semantics(text, text, uuid);

-- Step 2: Ensure the 4-arg base function exists (from previous migration)
-- This should already exist from 20251105000005_fix_end_session_semantics.sql
-- We're just ensuring it's there

-- Step 3: Create 3-arg wrapper function that calls the 4-arg version
create function public.end_session_with_semantics(
  p_actor_role text,
  p_reason text,
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_result record;
  v_actor_id uuid := auth.uid();
begin
  -- Call the 4-arg version using positional arguments to avoid ambiguity
  select * into v_result
  from public.end_session_with_semantics(
    p_session_id,
    v_actor_id,
    p_actor_role,
    p_reason
  );

  -- Return as JSONB
  return jsonb_build_object(
    'final_status', v_result.final_status,
    'started', v_result.started,
    'duration_seconds', v_result.duration_seconds,
    'message', v_result.message
  );
end;
$$;

comment on function public.end_session_with_semantics(text, text, uuid) is
  '3-arg wrapper for end_session_with_semantics that uses auth.uid() for actor_id';

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
