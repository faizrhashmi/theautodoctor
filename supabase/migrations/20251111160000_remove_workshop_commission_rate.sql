/**
 * Remove workshop commission_rate column
 *
 * CONTEXT:
 * Workshop business model changed - workshops receive 70% of session payments (fixed),
 * platform keeps 30%. Workshop-to-mechanic split is internal, not tracked by platform.
 *
 * The commission_rate field in organizations table is now unused and misleading.
 * All pricing is managed via platform_fee_settings table.
 *
 * UPDATED: 2025-11-11
 */

-- Drop the commission_rate column from organizations table
-- This column is no longer part of the business model
ALTER TABLE organizations
DROP COLUMN IF EXISTS commission_rate;

-- Add comment to table for documentation
COMMENT ON TABLE organizations IS 'Workshop organizations. Revenue split is fixed 70/30 (workshop/platform) managed via platform_fee_settings table.';
