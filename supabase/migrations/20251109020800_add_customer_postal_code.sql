-- ============================================================================
-- Add customer_postal_code to session_requests Table
-- ============================================================================
-- This migration adds the missing postal code field for location-based matching
-- Date: 2025-11-08
-- ============================================================================

-- Add customer_postal_code for FSA (Forward Sortation Area) matching
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS customer_postal_code TEXT;

-- Create index for postal code searches (FSA prefix matching)
CREATE INDEX IF NOT EXISTS session_requests_postal_code_idx
ON public.session_requests(customer_postal_code)
WHERE customer_postal_code IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.session_requests.customer_postal_code IS 'Customer postal code for FSA-based location matching (e.g., M5V 3A8)';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Added customer_postal_code column to session_requests table';
  RAISE NOTICE '   - Indexed for FSA prefix matching';
  RAISE NOTICE '   - Enables location-based mechanic routing';
END $$;
