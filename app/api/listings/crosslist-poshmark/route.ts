/**
 * Crosslist to Poshmark via Chrome Extension
 * This replaces the VPS-based Poshmark crosslisting
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { listingId, userId } = await request.json();

    if (!listingId || !userId) {
      return Response.json(
        { error: 'Missing required fields: listingId, userId' },
        { status: 400 }
      );
    }

    // 1. Fetch listing data
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .eq('user_id', userId)
      .single();

    if (listingError || !listing) {
      return Response.json({ error: 'Listing not found' }, { status: 404 });
    }

    // 2. Check if already posted to Poshmark
    const { data: existingListing } = await supabase
      .from('platform_listings')
      .select('*')
      .eq('listing_id', listingId)
      .eq('platform', 'poshmark')
      .single();

    if (existingListing) {
      return Response.json(
        { error: 'This listing is already posted to Poshmark' },
        { status: 400 }
      );
    }

    // 3. Check if user has extension connected
    const { data: user } = await supabase
      .from('users')
      .select('extension_connected, extension_last_seen')
      .eq('id', userId)
      .single();

    if (!user?.extension_connected) {
      return Response.json(
        {
          error: 'Chrome extension not connected',
          message:
            'Please install the Compr Chrome Extension and ensure it is running.',
          installUrl: 'https://compr.co/extension',
        },
        { status: 400 }
      );
    }

    // Check if extension was seen recently (within last 2 minutes)
    const lastSeen = user.extension_last_seen
      ? new Date(user.extension_last_seen)
      : null;
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    if (!lastSeen || lastSeen < twoMinutesAgo) {
      return Response.json(
        {
          error: 'Extension not active',
          message:
            'Chrome extension appears to be offline. Please ensure it is running and try again.',
        },
        { status: 400 }
      );
    }

    // 4. Create job ID
    const jobId = randomUUID();

    // 5. Create job record (extension will pick this up via polling)
    const { error: jobError } = await supabase.from('crosslisting_jobs').insert({
      job_id: jobId,
      user_id: userId,
      listing_id: listingId,
      platform: 'poshmark',
      status: 'queued',
      created_at: new Date().toISOString(),
    });

    if (jobError) {
      console.error('Failed to create job record:', jobError);
      return Response.json(
        { error: 'Failed to create crosslisting job' },
        { status: 500 }
      );
    }

    // 6. Extension will pick up the job within 5 seconds via polling
    return Response.json({
      success: true,
      jobId,
      message:
        'Crosslisting job created. Your Chrome extension will process this shortly.',
      estimatedTime: '10-30 seconds',
    });
  } catch (error) {
    console.error('Error in crosslist-poshmark:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
