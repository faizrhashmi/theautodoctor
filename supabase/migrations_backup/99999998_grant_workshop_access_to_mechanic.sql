-- Grant workshop dashboard access to workshop.mechanic@test.com
-- This adds them to organization_members so they can access /workshop/dashboard
-- Date: 2025-10-30

-- ============================================================================
-- Step 1: Verify the user and workshop exist
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_workshop_id UUID;
  v_mechanic_id UUID;
  v_existing_membership UUID;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'workshop.mechanic@test.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User workshop.mechanic@test.com not found in auth.users';
  END IF;

  RAISE NOTICE 'Found user: workshop.mechanic@test.com with ID: %', v_user_id;

  -- Get the mechanic record to find their workshop
  SELECT id, workshop_id INTO v_mechanic_id, v_workshop_id
  FROM mechanics
  WHERE user_id = v_user_id;

  IF v_mechanic_id IS NULL THEN
    RAISE EXCEPTION 'Mechanic record not found for user %', v_user_id;
  END IF;

  IF v_workshop_id IS NULL THEN
    RAISE EXCEPTION 'Mechanic is not affiliated with any workshop (workshop_id is NULL)';
  END IF;

  RAISE NOTICE 'Mechanic ID: %, Workshop ID: %', v_mechanic_id, v_workshop_id;

  -- Verify the workshop exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM organizations
    WHERE id = v_workshop_id
    AND organization_type = 'workshop'
  ) THEN
    RAISE EXCEPTION 'Workshop organization % not found or is not a workshop type', v_workshop_id;
  END IF;

  RAISE NOTICE 'Workshop organization verified';

  -- Check if they already have membership
  SELECT id INTO v_existing_membership
  FROM organization_members
  WHERE organization_id = v_workshop_id
  AND user_id = v_user_id;

  IF v_existing_membership IS NOT NULL THEN
    RAISE NOTICE 'User already has membership in this workshop (ID: %). Updating to active admin...', v_existing_membership;

    -- Update existing membership to active admin
    UPDATE organization_members
    SET
      status = 'active',
      role = 'admin',
      joined_at = COALESCE(joined_at, NOW()),
      updated_at = NOW()
    WHERE id = v_existing_membership;

    RAISE NOTICE '✅ Updated existing membership to active admin';
  ELSE
    -- Create new membership
    INSERT INTO organization_members (
      organization_id,
      user_id,
      role,
      status,
      joined_at,
      invited_by,
      invited_at,
      created_at,
      updated_at
    ) VALUES (
      v_workshop_id,
      v_user_id,
      'admin', -- Give them admin access
      'active', -- Active immediately (no pending invite)
      NOW(),
      v_user_id, -- Self-invited for this upgrade
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE '✅ Created new admin membership for workshop.mechanic@test.com';
  END IF;

  -- Verify the membership was created/updated
  SELECT id INTO v_existing_membership
  FROM organization_members
  WHERE organization_id = v_workshop_id
  AND user_id = v_user_id
  AND status = 'active';

  IF v_existing_membership IS NULL THEN
    RAISE EXCEPTION 'Failed to create/update membership';
  END IF;

  RAISE NOTICE '✅ SUCCESS: workshop.mechanic@test.com can now access /workshop/dashboard';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Workshop ID: %', v_workshop_id;
  RAISE NOTICE 'Membership ID: %', v_existing_membership;
  RAISE NOTICE 'Role: admin';
  RAISE NOTICE 'Status: active';

END $$;

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Run this to verify the access was granted
SELECT
  u.email as user_email,
  om.role as workshop_role,
  om.status as membership_status,
  o.name as workshop_name,
  o.organization_type,
  om.joined_at,
  m.email as mechanic_email,
  m.service_tier,
  m.account_type
FROM auth.users u
INNER JOIN organization_members om ON om.user_id = u.id
INNER JOIN organizations o ON o.id = om.organization_id
LEFT JOIN mechanics m ON m.user_id = u.id
WHERE u.email = 'workshop.mechanic@test.com';

-- ============================================================================
-- Expected Result
-- ============================================================================

-- After running this migration, workshop.mechanic@test.com will have:
-- 1. Access to /mechanic/dashboard (existing - from mechanics table)
-- 2. Access to /workshop/dashboard (NEW - from organization_members table)
--
-- They will be able to:
-- - View and manage mechanics in their workshop
-- - View workshop analytics
-- - Manage workshop settings
-- - Invite other mechanics
-- - View quotes and sessions

-- ============================================================================
-- Rollback Instructions
-- ============================================================================

-- To remove workshop dashboard access (if needed):
-- DELETE FROM organization_members
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'workshop.mechanic@test.com');
