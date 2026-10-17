-- Dress Catalog Table for Ladies Planet Bridal AI Wall
-- This table stores the boutique's dress catalog

CREATE TABLE IF NOT EXISTS dresses (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    
    -- Image URLs
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- Status Flags
    is_available BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_category CHECK (category IN (
        'Bridal Gown',
        'Evening Gown',
        'Cocktail Dress',
        'Traditional',
        'Contemporary',
        'Lehenga',
        'Saree',
        'Anarkali',
        'Other'
    ))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dresses_category ON dresses(category);
CREATE INDEX IF NOT EXISTS idx_dresses_is_available ON dresses(is_available);
CREATE INDEX IF NOT EXISTS idx_dresses_is_archived ON dresses(is_archived);
CREATE INDEX IF NOT EXISTS idx_dresses_sku ON dresses(sku);
CREATE INDEX IF NOT EXISTS idx_dresses_created_at ON dresses(created_at DESC);

-- Create full-text search index
CREATE INDEX IF NOT EXISTS idx_dresses_search ON dresses USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dresses_updated_at
    BEFORE UPDATE ON dresses
    FOR EACH ROW
    EXECUTE FUNCTION update_dresses_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE dresses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role has full access to dresses"
    ON dresses
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create policy for authenticated users (read-only)
CREATE POLICY "Authenticated users can view non-archived dresses"
    ON dresses
    FOR SELECT
    TO authenticated
    USING (is_archived = false);

-- Create policy for anonymous users (read-only, available dresses only)
CREATE POLICY "Anonymous users can view available dresses"
    ON dresses
    FOR SELECT
    TO anon
    USING (is_archived = false AND is_available = true);

-- Insert sample data (optional)
INSERT INTO dresses (name, description, category, sku, image_url, is_available) VALUES
    ('Royal Elegance Bridal Gown', 'Stunning white bridal gown with intricate lace details', 'Bridal Gown', 'BRI-ROYAL-001', 'https://example.com/sample1.jpg', true),
    ('Golden Lehenga Set', 'Traditional golden lehenga with heavy embroidery', 'Lehenga', 'LEH-GOLDE-002', 'https://example.com/sample2.jpg', true),
    ('Modern Cocktail Dress', 'Contemporary cocktail dress in emerald green', 'Cocktail Dress', 'COC-MODER-003', 'https://example.com/sample3.jpg', true)
ON CONFLICT (sku) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON dresses TO service_role;
GRANT SELECT ON dresses TO authenticated;
GRANT SELECT ON dresses TO anon;
