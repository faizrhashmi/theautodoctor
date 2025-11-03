-- Add Certification Expansion Feature Flags
-- These flags control the gradual rollout of multi-certification support

-- Insert certification flags (idempotent - ON CONFLICT DO NOTHING)
INSERT INTO feature_flags (
  flag_key,
  flag_name,
  description,
  is_enabled,
  enabled_for_roles,
  rollout_percentage,
  metadata,
  created_at,
  updated_at
) VALUES
  (
    'enable_multi_cert_copy',
    'Multi-Certification Copy',
    'Updates homepage and UI copy from "Red Seal" to inclusive language for all certified mechanics (Red Seal, Provincial, ASE, CPA Quebec, Manufacturer Specialists)',
    false,
    ARRAY['admin']::TEXT[],
    0,
    '{"category": "certification_expansion", "phase": "phase_4", "safe_to_enable": true}'::JSONB,
    NOW(),
    NOW()
  ),
  (
    'enable_multi_cert_badges',
    'Multi-Certification Badges',
    'Enables the new CertificationBadge component that displays all 6 certification types with proper styling and icons',
    false,
    ARRAY['admin']::TEXT[],
    0,
    '{"category": "certification_expansion", "phase": "phase_5", "safe_to_enable": true}'::JSONB,
    NOW(),
    NOW()
  ),
  (
    'enable_multi_cert_forms',
    'Multi-Certification Forms',
    'Updates signup and profile forms to allow mechanics to select and input any certification type (not just Red Seal)',
    false,
    ARRAY['admin']::TEXT[],
    0,
    '{"category": "certification_expansion", "phase": "phase_6", "safe_to_enable": false, "note": "Requires form updates - Phase 6 not yet implemented"}'::JSONB,
    NOW(),
    NOW()
  )
ON CONFLICT (flag_key) DO NOTHING;

-- Verification
SELECT
  flag_key,
  flag_name,
  is_enabled,
  rollout_percentage
FROM feature_flags
WHERE flag_key LIKE '%cert%'
ORDER BY flag_key;
