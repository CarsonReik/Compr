-- Supabase Schema for Compr
-- Run this in your Supabase SQL Editor

-- Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('buyer', 'seller')),
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro', 'unlimited')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL, -- First day of the month (e.g., '2025-01-01')
  searches_used INTEGER DEFAULT 0, -- For buyers
  listings_added INTEGER DEFAULT 0, -- For sellers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

-- Platform connections table (OAuth tokens for eBay, Etsy, etc.)
CREATE TABLE IF NOT EXISTS public.platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ebay', 'etsy', 'poshmark', 'mercari', 'depop')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  platform_user_id TEXT, -- User ID on the platform (e.g., eBay seller ID)
  platform_username TEXT, -- Display name on platform
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
  weight_oz DECIMAL(10,2), -- Weight in ounces for shipping
  -- New crosslisting fields
  tags TEXT[], -- Keywords/tags (max 13 for Etsy)
  sku TEXT, -- Inventory tracking number
  upc TEXT, -- Product barcode
  original_price DECIMAL(10,2), -- Retail/MSRP price (required for Poshmark)
  floor_price DECIMAL(10,2), -- Minimum price for Mercari smart pricing
  -- Platform-specific metadata (JSONB for flexibility)
  platform_metadata JSONB, -- Stores Etsy who_made, when_made, etc.
  -- Photo URLs (stored in Supabase Storage)
  photo_urls TEXT[], -- Array of storage URLs
  -- Cross-listing status
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
  platform_listing_id TEXT NOT NULL, -- ID of the listing on the platform
  platform_url TEXT, -- Direct URL to the listing
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'removed', 'error')),
  sync_enabled BOOLEAN DEFAULT true, -- Auto-sync delisting when sold
  last_synced_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT, -- If there was an error posting/syncing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(listing_id, platform)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for usage_tracking table
CREATE POLICY "Users can read own usage"
  ON public.usage_tracking
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own usage"
  ON public.usage_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own usage"
  ON public.usage_tracking
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

-- Function to increment listings_added count for usage tracking
CREATE OR REPLACE FUNCTION increment_listings_added(p_user_id UUID, p_period_start DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.usage_tracking (user_id, period_start, listings_added)
  VALUES (p_user_id, p_period_start, 1)
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET listings_added = public.usage_tracking.listings_added + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_listings_added(UUID, DATE) TO authenticated;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period
  ON public.usage_tracking(user_id, period_start);

CREATE INDEX IF NOT EXISTS idx_platform_connections_user_platform
  ON public.platform_connections(user_id, platform);

CREATE INDEX IF NOT EXISTS idx_listings_user_status
  ON public.listings(user_id, status);

CREATE INDEX IF NOT EXISTS idx_platform_listings_listing_platform
  ON public.platform_listings(listing_id, platform);

CREATE INDEX IF NOT EXISTS idx_platform_listings_user_status
  ON public.platform_listings(user_id, status);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.usage_tracking TO authenticated;
GRANT ALL ON public.platform_connections TO authenticated;
GRANT ALL ON public.listings TO authenticated;
GRANT ALL ON public.platform_listings TO authenticated;

-- Storage bucket for listing photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-photos', 'listing-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for listing-photos bucket
CREATE POLICY "Allow authenticated users to upload listing photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow public to view listing photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listing-photos');

CREATE POLICY "Allow users to update their own listing photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to delete their own listing photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
