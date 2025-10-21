import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * eBay Marketplace Account Deletion Notification Endpoint
 *
 * This endpoint is REQUIRED for eBay API compliance (GDPR).
 * When an eBay user requests account deletion, eBay notifies us
 * so we can delete their data from our system.
 *
 * Documentation: https://developer.ebay.com/marketplace-account-deletion
 */

// Handle GET requests for endpoint validation (challenge code)
export async function GET(request: NextRequest) {
  const challengeCode = request.nextUrl.searchParams.get('challenge_code');

  if (!challengeCode) {
    return NextResponse.json(
      { error: 'Missing challenge_code parameter' },
      { status: 400 }
    );
  }

  // Get verification token from environment
  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN;
  const endpoint = process.env.EBAY_DELETION_ENDPOINT || 'https://compr.co/api/ebay/marketplace-account-deletion';

  if (!verificationToken) {
    console.error('EBAY_VERIFICATION_TOKEN not set in environment variables');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  // Create challenge response hash: SHA-256(challengeCode + verificationToken + endpoint)
  const hashString = challengeCode + verificationToken + endpoint;
  const challengeResponse = crypto
    .createHash('sha256')
    .update(hashString)
    .digest('hex');

  console.log('eBay endpoint validation successful');

  return NextResponse.json(
    { challengeResponse },
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Handle POST requests for actual deletion notifications
export async function POST(request: NextRequest) {
  try {
    const notification = await request.json();

    console.log('Received eBay marketplace account deletion notification:', notification);

    // Validate notification structure
    if (
      !notification?.metadata?.topic ||
      notification.metadata.topic !== 'MARKETPLACE_ACCOUNT_DELETION'
    ) {
      console.error('Invalid notification topic');
      return new NextResponse(null, { status: 400 });
    }

    const { username, userId, eiasToken } = notification.notification?.data || {};

    if (!username && !userId && !eiasToken) {
      console.error('Missing user identification data in notification');
      return new NextResponse(null, { status: 400 });
    }

    console.log('Processing deletion for eBay user:', { username, userId });

    // Delete user data from database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find and delete platform connections for this eBay user
    const { data: connections, error: fetchError } = await supabase
      .from('platform_connections')
      .select('id, user_id, platform_username, platform_user_id')
      .eq('platform', 'ebay')
      .or(`platform_username.eq.${username},platform_user_id.eq.${userId}`);

    if (fetchError) {
      console.error('Error fetching connections:', fetchError);
      return new NextResponse(null, { status: 500 });
    }

    if (!connections || connections.length === 0) {
      console.log('No matching eBay connections found for deletion');
      // Still return 200 - we've processed the request successfully
      return new NextResponse(null, { status: 200 });
    }

    // Delete the connections
    const { error: deleteError } = await supabase
      .from('platform_connections')
      .delete()
      .eq('platform', 'ebay')
      .or(`platform_username.eq.${username},platform_user_id.eq.${userId}`);

    if (deleteError) {
      console.error('Error deleting connections:', deleteError);
      return new NextResponse(null, { status: 500 });
    }

    console.log(`Successfully deleted ${connections.length} eBay connection(s)`);

    // Log the deletion for audit purposes
    // You might want to create a separate audit log table for this
    console.log('AUDIT: eBay account deletion processed', {
      ebayUsername: username,
      ebayUserId: userId,
      connectionsDeleted: connections.length,
      timestamp: new Date().toISOString(),
    });

    // Acknowledge the notification with 200 OK
    return new NextResponse(null, { status: 200 });

  } catch (error) {
    console.error('Error processing marketplace account deletion:', error);
    // Still return 200 to prevent retries for unrecoverable errors
    // eBay will retry failed deliveries, which could cause issues
    return new NextResponse(null, { status: 200 });
  }
}
