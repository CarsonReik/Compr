import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * API endpoint to delist/delete a listing from a specific platform
 * POST /api/listings/delist
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platformListingId, platform, userId } = body;

    if (!platformListingId || !platform || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: platformListingId, platform, userId' },
        { status: 400 }
      );
    }

    console.log(`[Delist] Delisting ${platform} listing ${platformListingId} for user ${userId}`);

    // Get the platform listing to find the listing_id
    const { data: platformListing, error: fetchError } = await supabase
      .from('platform_listings')
      .select('listing_id, platform_listing_id')
      .eq('platform_listing_id', platformListingId)
      .eq('platform', platform)
      .single();

    if (fetchError || !platformListing) {
      console.error('[Delist] Platform listing not found:', fetchError);
      return NextResponse.json(
        { error: 'Platform listing not found' },
        { status: 404 }
      );
    }

    const listingId = platformListing.listing_id;

    // Verify the listing belongs to this user
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id')
      .eq('id', listingId)
      .eq('user_id', userId)
      .single();

    if (listingError || !listing) {
      console.error('[Delist] Listing not found or unauthorized:', listingError);
      return NextResponse.json(
        { error: 'Listing not found or unauthorized' },
        { status: 403 }
      );
    }

    // Check if user has extension connected
    const { data: user } = await supabase
      .from('users')
      .select('extension_connected, extension_last_seen')
      .eq('id', userId)
      .single();

    if (!user?.extension_connected) {
      return NextResponse.json(
        {
          error: 'Chrome extension not connected',
          message: 'Please ensure the Compr Chrome Extension is running.',
        },
        { status: 400 }
      );
    }

    // Check if extension was seen recently (within last 2 minutes)
    const lastSeen = user.extension_last_seen ? new Date(user.extension_last_seen) : null;
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    if (!lastSeen || lastSeen < twoMinutesAgo) {
      return NextResponse.json(
        {
          error: 'Chrome extension not active',
          message: 'The extension was last seen more than 2 minutes ago. Please ensure it is running.',
        },
        { status: 400 }
      );
    }

    // Create a deletion job with operation type DELETE
    const jobId = randomUUID();

    const { error: jobError } = await supabase.from('crosslisting_jobs').insert({
      job_id: jobId,
      user_id: userId,
      listing_id: listingId,
      platform,
      status: 'queued',
      created_at: new Date().toISOString(),
      // Store the platform_listing_id in the job so the extension knows which one to delete
      platform_listing_id: platformListingId,
    });

    if (jobError) {
      console.error('[Delist] Failed to create job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create delisting job' },
        { status: 500 }
      );
    }

    console.log(`[Delist] Created job ${jobId} for delisting`);

    return NextResponse.json({
      success: true,
      jobId,
      message: `Delisting from ${platform}...`,
    });
  } catch (error) {
    console.error('[Delist] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
