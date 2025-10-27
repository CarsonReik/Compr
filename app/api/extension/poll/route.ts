/**
 * Extension polling endpoint
 * Extension polls this endpoint every few seconds to check for new jobs
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const authToken = request.nextUrl.searchParams.get('authToken');

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

    // Update last seen
    await supabase
      .from('users')
      .update({
        extension_last_seen: new Date().toISOString(),
      })
      .eq('id', userId);

    // Check for new jobs (created in the last 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

    const { data: newJobs, error: jobsError } = await supabase
      .from('crosslisting_jobs')
      .select('*, listings(*)')
      .eq('user_id', userId)
      .eq('status', 'queued')
      .in('platform', ['poshmark', 'mercari', 'depop'])
      .gte('created_at', thirtySecondsAgo)
      .order('created_at', { ascending: true });

    if (jobsError) {
      console.error('Error fetching new jobs:', jobsError);
      return Response.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Mark jobs as "processing" to prevent duplicate processing
    if (newJobs && newJobs.length > 0) {
      const jobIds = newJobs.map((job) => job.job_id);
      await supabase
        .from('crosslisting_jobs')
        .update({ status: 'processing' })
        .in('job_id', jobIds);
    }

    const jobs = (newJobs || []).map((job) => ({
      jobId: job.job_id,
      platform: job.platform,
      listingData: job.listings,
    }));

    return Response.json({
      hasNewJobs: jobs.length > 0,
      jobs,
    });
  } catch (error) {
    console.error('Extension poll error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
