-- Simple cleanup script to delete all users and related data

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Delete in order (respecting dependencies)
DELETE FROM public.chat_messages;
DELETE FROM public.session_files;
DELETE FROM public.session_requests;
DELETE FROM public.diagnostic_sessions;
DELETE FROM public.customer_vehicles;
DELETE FROM public.mechanic_documents;
DELETE FROM public.mechanic_time_off;
DELETE FROM public.workshop_mechanics;
DELETE FROM public.customers;
DELETE FROM public.mechanics;
DELETE FROM public.organizations;
DELETE FROM auth.users;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Show counts
SELECT 'Auth users remaining:' as info, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'Customers remaining:', COUNT(*) FROM public.customers
UNION ALL
SELECT 'Mechanics remaining:', COUNT(*) FROM public.mechanics
UNION ALL
SELECT 'Organizations remaining:', COUNT(*) FROM public.organizations;
