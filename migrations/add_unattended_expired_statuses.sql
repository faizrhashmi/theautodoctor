-- Migration: Add 'unattended' and 'expired' statuses to session_requests
-- Date: 2025-10-23
-- Purpose: Implement two-tier timeout system for session request management

-- Add new enum values to session_request_status type
-- Note: PostgreSQL doesn't allow ALTER TYPE directly in all cases
-- We need to add values one at a time

-- Add 'unattended' status (requests not accepted within 5 minutes)
ALTER TYPE session_request_status ADD VALUE IF NOT EXISTS 'unattended';

-- Add 'expired' status (requests older than 2 hours with expired Stripe tokens)
ALTER TYPE session_request_status ADD VALUE IF NOT EXISTS 'expired';

-- Verify the enum now includes all statuses:
-- SELECT enum_range(NULL::session_request_status);
-- Expected: {pending,accepted,cancelled,unattended,expired}

-- Note: After running this migration, you need to regenerate TypeScript types:
-- Run: npx supabase gen types typescript --local > src/types/supabase.ts
-- Or if using cloud: npx supabase gen types typescript --project-id <your-project-ref> > src/types/supabase.ts
