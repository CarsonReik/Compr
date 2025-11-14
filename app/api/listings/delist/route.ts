import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Create a job in the queue
    const { data: job, error: jobError } = await supabase
      .from('listing_jobs')
      .insert({
        listing_id: listingId,
        user_id: userId,
        platform,
        operation: 'DELETE',
        status: 'pending',
        payload: {
          platformListingId,
          reason: 'user_requested',
        },
      })
      .select()
      .single();

    if (jobError) {
      console.error('[Delist] Failed to create job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create delisting job' },
        { status: 500 }
      );
    }

    console.log(`[Delist] Created job ${job.id} for delisting`);

    return NextResponse.json({
      success: true,
      jobId: job.id,
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
