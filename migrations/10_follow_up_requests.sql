-- Migration 10: Follow-up Questions
-- Enables customers to ask follow-up questions tied to previous sessions

-- Extend session_requests table to support follow-ups
ALTER TABLE public.session_requests
  ADD COLUMN IF NOT EXISTS parent_session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_follow_up boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS follow_up_type text;
  -- Follow-up types: 'quick_question', 'mini_extension', 'new_issue'

-- Create index for follow-up lookups
CREATE INDEX IF NOT EXISTS idx_session_requests_parent_session ON public.session_requests(parent_session_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_is_follow_up ON public.session_requests(is_follow_up) WHERE is_follow_up = true;

-- Extend sessions table to track follow-ups
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS parent_session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_follow_up boolean DEFAULT false;

-- Create index for session follow-up lookups
CREATE INDEX IF NOT EXISTS idx_sessions_parent_session ON public.sessions(parent_session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_follow_up ON public.sessions(is_follow_up) WHERE is_follow_up = true;

-- Function to create follow-up request
CREATE OR REPLACE FUNCTION create_follow_up_request(
  p_parent_session_id uuid,
  p_customer_id uuid,
  p_follow_up_type text,
  p_description text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_parent_session record;
  v_request_id uuid;
BEGIN
  -- Get parent session details
  SELECT id, mechanic_id, plan
  INTO v_parent_session
  FROM public.sessions
  WHERE id = p_parent_session_id
  AND customer_user_id = p_customer_id; -- Ensure customer owns the session

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent session not found or unauthorized';
  END IF;

  -- Create follow-up request
  INSERT INTO public.session_requests (
    customer_id,
    customer_name,
    customer_email,
    description,
    plan_code,
    session_type,
    status,
    parent_session_id,
    is_follow_up,
    follow_up_type,
    metadata,
    created_at
  )
  SELECT
    p_customer_id,
    users.full_name,
    users.email,
    p_description,
    v_parent_session.plan,
    'diagnostic',
    'pending',
    p_parent_session_id,
    true,
    p_follow_up_type,
    jsonb_build_object(
      'parent_session_id', p_parent_session_id,
      'follow_up_type', p_follow_up_type
    ) || p_metadata,
    now()
  FROM auth.users
  WHERE users.id = p_customer_id
  RETURNING id INTO v_request_id;

  -- Track CRM interaction
  INSERT INTO public.crm_interactions (customer_id, interaction_type, session_id, metadata)
  VALUES (
    p_customer_id,
    'follow_up_created',
    p_parent_session_id,
    jsonb_build_object('request_id', v_request_id, 'follow_up_type', p_follow_up_type)
  );

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if customer can create follow-up (rate limiting)
CREATE OR REPLACE FUNCTION can_create_follow_up(
  p_parent_session_id uuid,
  p_customer_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_parent_session record;
  v_follow_up_count int;
  v_days_since_completion int;
BEGIN
  -- Get parent session
  SELECT
    id,
    customer_user_id,
    ended_at,
    status
  INTO v_parent_session
  FROM public.sessions
  WHERE id = p_parent_session_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if customer owns session
  IF v_parent_session.customer_user_id != p_customer_id THEN
    RETURN false;
  END IF;

  -- Check if session is completed
  IF v_parent_session.status != 'completed' THEN
    RETURN false;
  END IF;

  -- Check if session ended within last 30 days
  v_days_since_completion := EXTRACT(DAY FROM (now() - v_parent_session.ended_at));
  IF v_days_since_completion > 30 THEN
    RETURN false;
  END IF;

  -- Check follow-up count (limit to 3 follow-ups per session)
  SELECT COUNT(*)
  INTO v_follow_up_count
  FROM public.session_requests
  WHERE parent_session_id = p_parent_session_id
  AND is_follow_up = true;

  IF v_follow_up_count >= 3 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON COLUMN public.session_requests.parent_session_id IS 'Reference to the original session if this is a follow-up request';
COMMENT ON COLUMN public.session_requests.is_follow_up IS 'Indicates if this request is a follow-up to a previous session';
COMMENT ON COLUMN public.session_requests.follow_up_type IS 'Type of follow-up: quick_question, mini_extension, or new_issue';
COMMENT ON COLUMN public.sessions.parent_session_id IS 'Reference to the original session if this is a follow-up session';
COMMENT ON COLUMN public.sessions.is_follow_up IS 'Indicates if this session is a follow-up to a previous session';
COMMENT ON FUNCTION create_follow_up_request IS 'Creates a follow-up request tied to a previous completed session';
COMMENT ON FUNCTION can_create_follow_up IS 'Checks if customer can create a follow-up (rate limiting and validation)';