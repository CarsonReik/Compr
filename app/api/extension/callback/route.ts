/**
 * Extension callback endpoint
 * Extension sends results back to this endpoint
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, authToken, result } = await request.json();

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

    const { success, listingId, platform, platformListingId, platformUrl, error } = result;

    if (success) {
      // Create or update platform_listing record
      const { error: upsertError } = await supabase.from('platform_listings').upsert({
        listing_id: listingId,
        user_id: userId,
        platform,
        platform_listing_id: platformListingId,
        platform_url: platformUrl,
        status: 'active',
      });

      if (upsertError) {
        console.error('Error creating platform_listing:', upsertError);
        console.error('Upsert data was:', { listingId, userId, platform, platformListingId, platformUrl });
        // Don't fail the request - job was successful even if we couldn't save the record
      }

      // Update job status
      await supabase
        .from('crosslisting_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('listing_id', listingId)
        .eq('platform', platform)
        .eq('user_id', userId);

      return Response.json({ success: true });
    } else {
      // Update job as failed
      await supabase
        .from('crosslisting_jobs')
        .update({
          status: 'failed',
          error_message: error || 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('listing_id', listingId)
        .eq('platform', platform)
        .eq('user_id', userId);

      return Response.json({ success: true });
    }
  } catch (error) {
    console.error('Extension callback error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
