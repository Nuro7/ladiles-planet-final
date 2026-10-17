-- Migration: Create Bride and Bride Image Tables
-- Description: Tables for managing bride profiles and their images with multiple angles
-- Created: 2026-02-04

-- Create bride table
CREATE TABLE IF NOT EXISTS bride (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT bride_status_check CHECK (status IN ('draft', 'active', 'archived'))
);

-- Create bride_image table
CREATE TABLE IF NOT EXISTS bride_image (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bride_id UUID NOT NULL,
    image_url TEXT NOT NULL,
    image_type TEXT NOT NULL,
    angle TEXT NOT NULL DEFAULT 'unknown',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign Key
    CONSTRAINT fk_bride_image_bride 
        FOREIGN KEY (bride_id) 
        REFERENCES bride(id) 
        ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT bride_image_type_check CHECK (image_type IN ('identity', 'worn_dress')),
    CONSTRAINT bride_image_angle_check CHECK (angle IN ('front', 'left', 'right', 'back', 'unknown'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bride_name ON bride(name);
CREATE INDEX IF NOT EXISTS idx_bride_status ON bride(status);
CREATE INDEX IF NOT EXISTS idx_bride_created_at ON bride(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bride_image_bride_id ON bride_image(bride_id);
CREATE INDEX IF NOT EXISTS idx_bride_image_type ON bride_image(image_type);
CREATE INDEX IF NOT EXISTS idx_bride_image_angle ON bride_image(angle);
CREATE INDEX IF NOT EXISTS idx_bride_image_type_angle ON bride_image(bride_id, image_type, angle);

-- Add comments for documentation
COMMENT ON TABLE bride IS 'Stores bride profiles for the AI Wall system';
COMMENT ON TABLE bride_image IS 'Stores multiple images for each bride with different angles and types';

COMMENT ON COLUMN bride.status IS 'Status of bride profile: draft, active, or archived';
COMMENT ON COLUMN bride_image.image_type IS 'Type of image: identity (original) or worn_dress (with dress)';
COMMENT ON COLUMN bride_image.angle IS 'Angle of the photo: front, left, right, back, or unknown';
