-- ============================================================================
-- ADD MECHANIC ALERT SYSTEM FEATURE FLAGS
-- Enables the multi-layer notification system for mechanics
-- ============================================================================

-- Insert mechanic alert feature flags (idempotent)
INSERT INTO feature_flags (flag_key, flag_name, description, enabled_for_roles, metadata)
VALUES
  (
    'mech_new_request_alerts',
    'Mechanic New Request Alerts',
    'Enable multi-layer alert system for mechanics when new session requests arrive',
    ARRAY['mechanic'],
    '{"tier": "all"}'::jsonb
  ),
  (
    'mech_audio_alerts',
    'Mechanic Audio Alerts',
    'Play audio notification sound when new session requests arrive',
    ARRAY['mechanic'],
    '{"tier": "all"}'::jsonb
  ),
  (
    'mech_browser_notifications',
    'Mechanic Browser Notifications',
    'Show browser notifications when tab is in background',
    ARRAY['mechanic'],
    '{"tier": "all"}'::jsonb
  ),
  (
    'mech_visual_indicators',
    'Mechanic Visual Indicators',
    'Show badge count and tab title indicators for new requests',
    ARRAY['mechanic'],
    '{"tier": "all"}'::jsonb
  )
ON CONFLICT (flag_key) DO UPDATE SET
  flag_name = EXCLUDED.flag_name,
  description = EXCLUDED.description,
  enabled_for_roles = EXCLUDED.enabled_for_roles,
  metadata = EXCLUDED.metadata;

-- Log the result
DO $$
BEGIN
  RAISE NOTICE '✅ Mechanic alert feature flags added/updated';
END $$;
