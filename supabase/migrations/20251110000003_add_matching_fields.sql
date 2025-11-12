-- Migration: Add matching-related fields to session_assignments
-- Created: 2025-11-10
-- Purpose: Support smart matching algorithm with targeted assignments

-- Add matching-related columns
ALTER TABLE session_assignments
ADD COLUMN IF NOT EXISTS match_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS match_reasons TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_assignments_priority
ON session_assignments(priority, status, offered_at);

CREATE INDEX IF NOT EXISTS idx_session_assignments_expires_at
ON session_assignments(expires_at)
WHERE expires_at IS NOT NULL;

-- Add index for mechanic_id queries (targeted assignments)
CREATE INDEX IF NOT EXISTS idx_session_assignments_mechanic_offered
ON session_assignments(mechanic_id, status, offered_at)
WHERE mechanic_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN session_assignments.match_score IS 'Matching algorithm score (0-200+) - higher means better match';
COMMENT ON COLUMN session_assignments.match_reasons IS 'Why this mechanic was matched (e.g., ["Local to Toronto", "BMW specialist", "High rating"])';
COMMENT ON COLUMN session_assignments.priority IS 'Assignment priority: high (targeted match), normal (broadcast), low (fallback)';
COMMENT ON COLUMN session_assignments.expires_at IS 'When this targeted assignment expires (typically 2-5 minutes for high-priority offers)';

-- Grant permissions (if needed)
-- RLS policies should already cover these columns
