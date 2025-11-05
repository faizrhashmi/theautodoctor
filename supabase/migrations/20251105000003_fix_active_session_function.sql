-- Fix type mismatch in get_active_session_for_customer function
-- The function returns TEXT but was selecting ENUM values without casting

CREATE OR REPLACE FUNCTION get_active_session_for_customer(p_customer_id UUID)
RETURNS TABLE (
  session_id UUID,
  session_status TEXT,
  session_type TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.status::TEXT,  -- Cast status enum to text
    s.type::TEXT,    -- Cast type enum to text
    s.created_at
  FROM sessions s
  WHERE s.customer_user_id = p_customer_id
    AND s.status IN ('pending', 'waiting', 'live', 'scheduled')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_active_session_for_customer IS
'Returns the most recent active session for a customer. Used by ActiveSessionBanner to prevent duplicate session creation.';
