-- Query to check mechanic_availability table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'mechanic_availability'
ORDER BY
    ordinal_position;

-- Also check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'mechanic_availability'
) as table_exists;

-- Check actual data if any exists
SELECT COUNT(*) as total_records FROM public.mechanic_availability;

-- Sample a few records to see the structure
SELECT * FROM public.mechanic_availability LIMIT 5;
