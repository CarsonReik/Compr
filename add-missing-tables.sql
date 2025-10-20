-- Add missing tables for Compr listings functionality
-- Run this in your Supabase SQL Editor

-- Platform connections table (OAuth tokens for eBay, Etsy, etc.)
CREATE TABLE IF NOT EXISTS public.platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ebay', 'etsy', 'poshmark', 'mercari', 'depop')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  platform_user_id TEXT,
  platform_username TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Listings table (master listing data)
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
  category TEXT,
  brand TEXT,
  size TEXT,
  color TEXT,
  material TEXT,
  weight_oz DECIMAL(10,2),
  tags TEXT[],
  sku TEXT,
  upc TEXT,
  original_price DECIMAL(10,2),
  floor_price DECIMAL(10,2),
  platform_metadata JSONB,
  photo_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'sold', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform listings table (tracks where each listing is posted)
CREATE TABLE IF NOT EXISTS public.platform_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ebay', 'etsy', 'poshmark', 'mercari', 'depop')),
  platform_listing_id TEXT NOT NULL,
  platform_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'removed', 'error')),
  sync_enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(listing_id, platform)
);

-- Enable Row Level Security
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_connections table
CREATE POLICY "Users can read own connections"
  ON public.platform_connections
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own connections"
  ON public.platform_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own connections"
  ON public.platform_connections
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own connections"
  ON public.platform_connections
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for listings table
CREATE POLICY "Users can read own listings"
  ON public.listings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own listings"
  ON public.listings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own listings"
  ON public.listings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own listings"
  ON public.listings
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for platform_listings table
CREATE POLICY "Users can read own platform listings"
  ON public.platform_listings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own platform listings"
  ON public.platform_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own platform listings"
  ON public.platform_listings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own platform listings"
  ON public.platform_listings
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Triggers to auto-update updated_at (reuse existing function)
CREATE TRIGGER update_platform_connections_updated_at
  BEFORE UPDATE ON public.platform_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_listings_updated_at
  BEFORE UPDATE ON public.platform_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_connections_user_platform
  ON public.platform_connections(user_id, platform);

CREATE INDEX IF NOT EXISTS idx_listings_user_status
  ON public.listings(user_id, status);

CREATE INDEX IF NOT EXISTS idx_platform_listings_listing_platform
  ON public.platform_listings(listing_id, platform);

CREATE INDEX IF NOT EXISTS idx_platform_listings_user_status
  ON public.platform_listings(user_id, status);

-- Grant permissions
GRANT ALL ON public.platform_connections TO authenticated;
GRANT ALL ON public.listings TO authenticated;
GRANT ALL ON public.platform_listings TO authenticated;
