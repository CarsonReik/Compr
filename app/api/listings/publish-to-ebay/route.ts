import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createEbayListing, getEbayListingUrl } from '@/lib/ebay-inventory-api';

// Force Node.js runtime instead of Edge
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/listings/publish-to-ebay
 * Publishes a draft listing to eBay
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { listingId, userId, categoryId } = await request.json();

    if (!listingId || !userId) {
      return NextResponse.json(
        { error: 'Missing listingId or userId' },
        { status: 400 }
      );
    }

    // Fetch the listing from database
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Check if user has eBay connected
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'ebay')
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'eBay account not connected. Please connect your eBay account first.' },
        { status: 400 }
      );
    }

    // Generate SKU if not provided
    const sku = listing.sku || `COMPR-${listingId.substring(0, 8).toUpperCase()}`;

    // Prepare listing data for eBay
    const ebayListingData = {
      title: listing.title,
      description: listing.description,
      price: parseFloat(listing.price),
      quantity: listing.quantity || 1,
      condition: listing.condition || 'good',
      brand: listing.brand || 'Unbranded', // eBay requires brand for most categories
      sku,
      upc: listing.upc,
      photoUrls: listing.photo_urls || [],
      returnPolicy: listing.platform_metadata?.ebay?.returnPolicy,
      shippingService: listing.platform_metadata?.ebay?.shippingService,
      weight: listing.weight_oz,
    };

    // Create the listing on eBay
    // Pass undefined to categoryId to trigger eBay Category Suggestion API
    const result = await createEbayListing(
      userId,
      ebayListingData,
      categoryId // Will be undefined, triggering auto-detection via Category Suggestion API
    );

    if (!result.success) {
      // Store error in platform_listings table
      await supabase.from('platform_listings').insert({
        listing_id: listingId,
        user_id: userId,
        platform: 'ebay',
        platform_listing_id: 'ERROR',
        status: 'error',
        error_message: result.error,
      });

      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Update the listing SKU if it was auto-generated or changed during retry
    if (!listing.sku || result.newSku) {
      await supabase
        .from('listings')
        .update({ sku: result.newSku || sku })
        .eq('id', listingId);
    }

    // Create platform_listings record
    const platformUrl = result.listingId
      ? getEbayListingUrl(result.listingId)
      : null;

    const { error: platformError } = await supabase
      .from('platform_listings')
      .insert({
        listing_id: listingId,
        user_id: userId,
        platform: 'ebay',
        platform_listing_id: result.listingId || result.offerId || 'UNKNOWN',
        platform_url: platformUrl,
        status: 'active',
        last_synced_at: new Date().toISOString(),
      });

    if (platformError) {
      console.error('Error creating platform_listings record:', platformError);
      // Continue anyway - the listing was created on eBay successfully
    }

    // Update listing status to active
    await supabase
      .from('listings')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId);

    return NextResponse.json({
      success: true,
      listingId: result.listingId,
      offerId: result.offerId,
      platformUrl,
    });
  } catch (error) {
    console.error('Error publishing to eBay:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
