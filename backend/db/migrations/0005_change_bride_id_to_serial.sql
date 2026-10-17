-- Migration: Change bride tables from UUID to SERIAL (auto-incrementing integers)
-- This will drop and recreate the tables with new ID types

-- Drop existing tables (cascade will drop dependent objects)
DROP TABLE IF EXISTS bride_image CASCADE;
DROP TABLE IF EXISTS bride CASCADE;

-- Create bride table with SERIAL id
CREATE TABLE bride (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create bride_image table with SERIAL id and INTEGER foreign key
CREATE TABLE bride_image (
    id SERIAL PRIMARY KEY,
    bride_id INTEGER NOT NULL REFERENCES bride(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type TEXT NOT NULL,
    angle TEXT NOT NULL DEFAULT 'unknown',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_bride_status ON bride(status);
CREATE INDEX idx_bride_name ON bride(name);
CREATE INDEX idx_bride_image_bride_id ON bride_image(bride_id);
CREATE INDEX idx_bride_image_type_angle ON bride_image(image_type, angle);

-- Verify tables
SELECT 'Bride tables recreated with SERIAL IDs' AS status;
