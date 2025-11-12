import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addCrosslistingJob } from '@/lib/queue-client';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const { listingId, userId } = await request.json();

    if (!listingId || !userId) {
      return NextResponse.json(
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
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // 2. Fetch Poshmark platform connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'poshmark')
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Poshmark account not connected. Please connect your account in Settings.' },
        { status: 400 }
      );
    }

    // 3. Check if encrypted_credentials exists
    if (!connection.encrypted_credentials) {
      return NextResponse.json(
        { error: 'Poshmark credentials not found. Please reconnect your account.' },
        { status: 400 }
      );
    }

    // 4. Check if already posted to Poshmark
    const { data: existingListing } = await supabase
      .from('platform_listings')
      .select('*')
      .eq('listing_id', listingId)
      .eq('platform', 'poshmark')
      .single();

    if (existingListing) {
      return NextResponse.json(
        { error: 'This listing is already posted to Poshmark' },
        { status: 400 }
      );
    }

    // 5. Create job ID
    const jobId = randomUUID();

    // 6. Create job record in database
    const { error: jobError } = await supabase
      .from('crosslisting_jobs')
      .insert({
        job_id: jobId,
        user_id: userId,
        listing_id: listingId,
        platform: 'poshmark',
        status: 'queued',
      });

    if (jobError) {
      console.error('Failed to create job record:', jobError);
      return NextResponse.json(
        { error: 'Failed to create crosslisting job' },
        { status: 500 }
      );
    }

    // 7. Add job to Redis queue
    try {
      await addCrosslistingJob({
        jobId,
        userId,
        listingId,
        platform: 'poshmark',
        listingData: {
          title: listing.title,
          description: listing.description,
          price: listing.price,
          category: listing.category,
          brand: listing.brand,
          size: listing.size,
          color: listing.color,
          condition: listing.condition,
          photo_urls: listing.photo_urls || [],
        },
        encryptedCredentials: connection.encrypted_credentials,
      });
    } catch (queueError) {
      console.error('Failed to add job to queue:', queueError);

      // Update job status to failed
      await supabase
        .from('crosslisting_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to queue job',
        })
        .eq('job_id', jobId);

      return NextResponse.json(
        { error: 'Failed to queue crosslisting job. Please try again.' },
        { status: 500 }
      );
    }

    // 8. Return success
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Crosslisting job queued successfully',
    });
  } catch (error) {
    console.error('Error in publish-to-poshmark:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
