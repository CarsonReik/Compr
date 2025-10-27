/**
 * Extension job status update endpoint
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, authToken, jobId, status } = await request.json();

    if (!userId || !authToken || !jobId || !status) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
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

    // Update job status
    const { error: updateError } = await supabase
      .from('crosslisting_jobs')
      .update({ status })
      .eq('job_id', jobId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating job status:', updateError);
      return Response.json({ error: 'Failed to update job status' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Job status update error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
