-- Quick Migration: Change Bride IDs from UUID to SERIAL
-- Run this in your Supabase SQL Editor

-- Step 1: Drop existing tables (this will delete all bride data!)
DROP TABLE IF EXISTS bride_image CASCADE;
DROP TABLE IF EXISTS bride CASCADE;

-- Step 2: Create bride table with SERIAL id (auto-incrementing 1, 2, 3...)
CREATE TABLE bride (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Create bride_image table with SERIAL id
CREATE TABLE bride_image (
    id SERIAL PRIMARY KEY,
    bride_id INTEGER NOT NULL REFERENCES bride(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type TEXT NOT NULL,
    angle TEXT NOT NULL DEFAULT 'unknown',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 4: Create indexes for performance
CREATE INDEX idx_bride_status ON bride(status);
CREATE INDEX idx_bride_name ON bride(name);
CREATE INDEX idx_bride_image_bride_id ON bride_image(bride_id);
CREATE INDEX idx_bride_image_type_angle ON bride_image(image_type, angle);

-- Done! Now bride IDs will be 1, 2, 3, 4... instead of UUIDs
SELECT 'Migration complete! Bride tables now use SERIAL IDs' AS message;
