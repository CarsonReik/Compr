/**
 * Extension connection endpoint
 * Extension registers itself and receives pending crosslisting jobs
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, authToken, platformStatuses } = await request.json();

    if (!userId || !authToken) {
      return Response.json({ error: 'Missing authentication' }, { status: 401 });
    }

    // Validate user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return Response.json({ error: 'Invalid user' }, { status: 401 });
    }

    // Update extension connection status
    await supabase
      .from('users')
      .update({
        extension_connected: true,
        extension_last_seen: new Date().toISOString(),
      })
      .eq('id', userId);

    // Get any pending crosslisting jobs for this user
    const { data: pendingJobs, error: jobsError } = await supabase
      .from('crosslisting_jobs')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'queued')
      .in('platform', ['poshmark', 'mercari', 'depop'])
      .order('created_at', { ascending: true })
      .limit(10);

    if (jobsError) {
      console.error('Error fetching pending jobs:', jobsError);
      return Response.json(
        { error: 'Failed to fetch pending jobs' },
        { status: 500 }
      );
    }

    // Filter jobs to only include those with active platform connections
    let validJobs = pendingJobs || [];
    if (validJobs.length > 0) {
      const { data: connections } = await supabase
        .from('platform_connections')
        .select('platform, is_active, encrypted_credentials')
        .eq('user_id', userId)
        .eq('is_active', true)
        .in('platform', ['poshmark', 'mercari', 'depop']);

      const connectedPlatforms = new Set(
        (connections || [])
          .filter(c => c.encrypted_credentials) // Must have credentials
          .map(c => c.platform)
      );

      // Filter out jobs for platforms that aren't properly connected
      validJobs = validJobs.filter(job => connectedPlatforms.has(job.platform));

      // Mark filtered-out jobs as failed
      const invalidJobs = (pendingJobs || []).filter(job => !connectedPlatforms.has(job.platform));
      if (invalidJobs.length > 0) {
        const invalidJobIds = invalidJobs.map(j => j.job_id);
        await supabase
          .from('crosslisting_jobs')
          .update({
            status: 'failed',
            error_message: 'Platform not connected. Please connect your account in Settings.',
          })
          .in('job_id', invalidJobIds);
      }
    }

    // Mark valid jobs as "processing" to prevent duplicate processing
    if (validJobs.length > 0) {
      const jobIds = validJobs.map((job) => job.job_id);
      await supabase
        .from('crosslisting_jobs')
        .update({ status: 'processing' })
        .in('job_id', jobIds);
    }

    // Get listing data for each valid job
    const jobs = await Promise.all(
      validJobs.map(async (job) => {
        const { data: listing } = await supabase
          .from('listings')
          .select('*')
          .eq('id', job.listing_id)
          .single();

        return {
          jobId: job.job_id,
          platform: job.platform,
          listingData: listing,
        };
      })
    );

    return Response.json({
      connected: true,
      pendingJobs: jobs,
      message: jobs.length > 0 ? `${jobs.length} pending jobs` : 'No pending jobs',
    });
  } catch (error) {
    console.error('Extension connect error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
