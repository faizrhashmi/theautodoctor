-- ============================================
-- Rollback: Session Summaries System
-- Purpose: Remove session_summaries table and related objects
-- ============================================

-- Drop RLS policies
DROP POLICY IF EXISTS "Customers can view their session summaries" ON public.session_summaries;
DROP POLICY IF EXISTS "Mechanics can view assigned session summaries" ON public.session_summaries;
DROP POLICY IF EXISTS "Mechanics can create summaries" ON public.session_summaries;
DROP POLICY IF EXISTS "Mechanics can update their summaries" ON public.session_summaries;

-- Drop trigger and function
DROP TRIGGER IF EXISTS update_session_summaries_updated_at_trigger ON public.session_summaries;
DROP FUNCTION IF EXISTS update_session_summaries_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_session_summaries_type;
DROP INDEX IF EXISTS idx_session_summaries_created;

-- Drop table
DROP TABLE IF EXISTS public.session_summaries CASCADE;

-- Revoke permissions (defensive)
REVOKE ALL ON public.session_summaries FROM authenticated;

SELECT 'session_summaries table and related objects dropped successfully' AS status;
