-- Add specialist premium column to brand_specializations table
-- This allows dynamic pricing for brand specialists (e.g., $15 for BMW, $25 for Porsche)

ALTER TABLE brand_specializations
ADD COLUMN IF NOT EXISTS specialist_premium DECIMAL(10,2) DEFAULT 15.00;

-- Add comment for documentation
COMMENT ON COLUMN brand_specializations.specialist_premium IS 'Additional charge for booking a specialist for this brand (e.g., $15 for standard brands, $25 for luxury brands)';

-- Set default for existing brands (standard brands)
UPDATE brand_specializations
SET specialist_premium = 15.00
WHERE specialist_premium IS NULL;

-- Set higher premium for luxury brands
UPDATE brand_specializations
SET specialist_premium = 25.00
WHERE is_luxury = true;

-- Add constraint to ensure positive values
ALTER TABLE brand_specializations
ADD CONSTRAINT specialist_premium_positive CHECK (specialist_premium >= 0);
