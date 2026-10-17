-- Quick Setup Script for Bride Management System
-- Run this in your Supabase SQL Editor

-- Step 1: Create the tables
\i 'backend/db/migrations/0004_create_bride_tables.sql'

-- Step 2: Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('bride', 'bride_image');

-- Step 3: Check constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name IN ('bride', 'bride_image')
ORDER BY tc.table_name, tc.constraint_type;

-- Step 4: Check indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('bride', 'bride_image')
ORDER BY tablename, indexname;

-- Step 5: Create a test bride (optional)
INSERT INTO bride (name, status) 
VALUES ('Test Bride', 'draft')
RETURNING *;

-- Step 6: Verify the test bride was created
SELECT * FROM bride WHERE name = 'Test Bride';

-- Clean up test data (optional)
-- DELETE FROM bride WHERE name = 'Test Bride';
