-- =============================================================================
-- Crosslisting Automation Schema Updates
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- Add encrypted_credentials column to platform_connections
-- This will store username/password for platforms without OAuth (Poshmark, Mercari, Depop)
ALTER TABLE public.platform_connections
ADD COLUMN IF NOT EXISTS encrypted_credentials TEXT;

-- Add session_cookies column to store browser cookies for automation
-- This allows reusing sessions without re-logging in every time
-- Cookies are stored as encrypted JSON
ALTER TABLE public.platform_connections
ADD COLUMN IF NOT EXISTS session_cookies TEXT;

-- Make access_token nullable since credential-based platforms won't use OAuth tokens
ALTER TABLE public.platform_connections
ALTER COLUMN access_token DROP NOT NULL;

-- Create crosslisting_jobs table to track automation job status
CREATE TABLE IF NOT EXISTS public.crosslisting_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('poshmark', 'mercari', 'depop', 'ebay', 'etsy')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'pending_verification')),
  job_id TEXT NOT NULL UNIQUE, -- BullMQ job ID
  platform_listing_id TEXT, -- Returned after success
  platform_url TEXT, -- Returned after success
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for crosslisting_jobs
ALTER TABLE public.crosslisting_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crosslisting_jobs table
CREATE POLICY "Users can read own jobs"
  ON public.crosslisting_jobs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own jobs"
  ON public.crosslisting_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own jobs"
  ON public.crosslisting_jobs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own jobs"
  ON public.crosslisting_jobs
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crosslisting_jobs_user_listing
  ON public.crosslisting_jobs(user_id, listing_id);

CREATE INDEX IF NOT EXISTS idx_crosslisting_jobs_job_id
  ON public.crosslisting_jobs(job_id);

CREATE INDEX IF NOT EXISTS idx_crosslisting_jobs_status
  ON public.crosslisting_jobs(status);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_crosslisting_jobs_updated_at
  BEFORE UPDATE ON public.crosslisting_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.crosslisting_jobs TO authenticated;

-- Comment on the table
COMMENT ON TABLE public.crosslisting_jobs IS 'Tracks the status of automated crosslisting jobs processed by the Puppeteer worker service';

-- =============================================================================
-- NOTES
-- =============================================================================
-- After running this migration:
-- 1. Update .env.local with ENCRYPTION_KEY (generate with: openssl rand -hex 16)
-- 2. Deploy automation worker to VPS
-- 3. Test credential storage by adding Poshmark connection
-- 4. Test crosslisting job flow
