import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get job status from database
    const { data: job, error } = await supabase
      .from('crosslisting_jobs')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error) {
      console.error('Error fetching job status:', error);
      return NextResponse.json(
        { error: 'Failed to fetch job status' },
        { status: 500 }
      );
    }

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      jobId: job.job_id,
      status: job.status,
      platformListingId: job.platform_listing_id,
      platformUrl: job.platform_url,
      errorMessage: job.error_message,
      createdAt: job.created_at,
      completedAt: job.completed_at,
    });
  } catch (error) {
    console.error('Job status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
