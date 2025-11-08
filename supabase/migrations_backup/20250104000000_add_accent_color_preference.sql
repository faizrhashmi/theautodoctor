-- =====================================================
-- ADD ACCENT COLOR TO CUSTOMER PREFERENCES
-- =====================================================
-- Created: 2025-01-04
-- Purpose: Add accent_color column to customer_preferences for theme customization
-- Supports: orange (default), blue, green, red, purple

-- Add accent_color column to customer_preferences table
ALTER TABLE public.customer_preferences
ADD COLUMN IF NOT EXISTS accent_color TEXT
  CHECK (accent_color IN ('orange', 'blue', 'green', 'red', 'purple'))
  DEFAULT 'orange';

-- Create index for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_customer_preferences_accent_color
  ON public.customer_preferences(accent_color);

-- Set default for existing rows
UPDATE public.customer_preferences
SET accent_color = 'orange'
WHERE accent_color IS NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
