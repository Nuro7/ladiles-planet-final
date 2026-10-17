-- Create videos table for storing both generated and uploaded videos
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Common fields for all videos
    video_url TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'generated', -- 'generated' or 'uploaded'
    title TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Fields specific to generated videos (nullable for uploaded videos)
    thumbnail_url TEXT,
    bride_image_url TEXT,
    dress_image_url TEXT,
    jewellery_image_url TEXT,
    logo_url TEXT,
    jewellery_style TEXT,
    appearance_mode TEXT,
    background TEXT,
    makeup TEXT,
    show_branding BOOLEAN DEFAULT false,
    duration INTEGER,
    aspect_ratio TEXT,
    quality TEXT,
    status TEXT DEFAULT 'completed',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_type ON public.videos(type);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth requirements)
-- For now, allow all operations (you can restrict this later)
CREATE POLICY "Allow all operations on videos" ON public.videos
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add comments
COMMENT ON TABLE public.videos IS 'Stores both AI-generated and boutique owner uploaded videos';
COMMENT ON COLUMN public.videos.type IS 'Type of video: generated (AI) or uploaded (boutique owner)';
COMMENT ON COLUMN public.videos.metadata IS 'Flexible JSON field for additional metadata';
