/**
 * Publish to Mercari via Chrome Extension
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

    // 2. Fetch Mercari platform connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'mercari')
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      return Response.json(
        { error: 'Mercari account not connected. Please connect your account in Settings.' },
        { status: 400 }
      );
    }

    // 3. Check if encrypted_credentials exists
    if (!connection.encrypted_credentials) {
      return Response.json(
        { error: 'Mercari credentials not found. Please reconnect your account.' },
        { status: 400 }
      );
    }

    // 4. Check if already posted to Mercari
    const { data: existingListing } = await supabase
      .from('platform_listings')
      .select('*')
      .eq('listing_id', listingId)
      .eq('platform', 'mercari')
      .single();

    if (existingListing) {
      return Response.json(
        { error: 'This listing is already posted to Mercari' },
        { status: 400 }
      );
    }

    // 5. Check if user has extension connected
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
          error: 'Chrome extension not active',
          message:
            'The extension was last seen more than 2 minutes ago. Please ensure the extension is running.',
        },
        { status: 400 }
      );
    }

    // 6. Create a crosslisting job
    const jobId = randomUUID();

    const { error: jobError } = await supabase.from('crosslisting_jobs').insert({
      job_id: jobId,
      user_id: userId,
      listing_id: listingId,
      platform: 'mercari',
      status: 'queued',
      created_at: new Date().toISOString(),
    });

    if (jobError) {
      console.error('Failed to create crosslisting job:', jobError);
      return Response.json(
        { error: 'Failed to create crosslisting job' },
        { status: 500 }
      );
    }

    // Return the job ID so frontend can poll for status
    return Response.json({
      success: true,
      jobId,
      message: 'Mercari crosslisting job created. Extension will process it shortly.',
    });
  } catch (error) {
    console.error('Error in publish-to-mercari:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
