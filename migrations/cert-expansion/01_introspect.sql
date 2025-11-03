-- PHASE 1 MIGRATION: 01_introspect.sql
-- PURPOSE: Read-only introspection to check current state BEFORE migration
-- SAFETY: This file makes NO changes to the database
-- RUN THIS FIRST to verify current schema

-- ============================================================================
-- INTROSPECTION: Current certification columns in mechanics table
-- ============================================================================

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mechanics'
  AND (
    column_name LIKE '%red_seal%'
    OR column_name LIKE '%certif%'
    OR column_name = 'other_certifications'
  )
ORDER BY ordinal_position;

-- Expected output:
-- red_seal_certified (boolean, NOT NULL)
-- red_seal_number (text, NULL)
-- red_seal_province (text, NULL)
-- red_seal_expiry_date (date, NULL)
-- certification_documents (text, NULL)
-- other_certifications (jsonb, NULL)

-- ============================================================================
-- INTROSPECTION: Check if new columns already exist
-- ============================================================================

SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mechanics'
  AND column_name IN (
    'certification_type',
    'certification_number',
    'certification_authority',
    'certification_region',
    'certification_expiry_date'
  );

-- Expected output: 0 rows (columns don't exist yet)
-- If any rows returned, migration was already run

-- ============================================================================
-- INTROSPECTION: Current mechanic count by Red Seal status
-- ============================================================================

SELECT
  red_seal_certified,
  COUNT(*) as count
FROM mechanics
GROUP BY red_seal_certified;

-- Expected output:
-- red_seal_certified | count
-- -------------------+-------
-- true               | 1
-- false              | 3

-- ============================================================================
-- INTROSPECTION: Sample data for certification fields
-- ============================================================================

SELECT
  id,
  name,
  red_seal_certified,
  red_seal_number,
  red_seal_province,
  red_seal_expiry_date,
  other_certifications
FROM mechanics
LIMIT 5;

-- This shows current data structure before migration
