import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check if user denied authorization
    if (error) {
      return NextResponse.redirect(
        new URL(`/seller/connections?error=${error}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/seller/connections?error=missing_code', request.url)
      );
    }

    // Extract user ID from state parameter
    // State format: {userId}.{randomString}
    if (!state) {
      return NextResponse.redirect(
        new URL('/login?error=missing_state', request.url)
      );
    }

    const userId = state.split('.')[0];

    if (!userId || userId.length !== 36) { // UUID is 36 chars
      return NextResponse.redirect(
        new URL('/login?error=invalid_state', request.url)
      );
    }

    // Create Supabase client for server-side
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Exchange authorization code for access token
    const clientId = process.env.EBAY_CLIENT_ID!;
    const clientSecret = process.env.EBAY_CLIENT_SECRET!;
    const ruName = process.env.EBAY_RU_NAME!;

    const isSandbox = process.env.EBAY_ENVIRONMENT?.toLowerCase() === 'sandbox';
    const tokenEndpoint = isSandbox
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
      : 'https://api.ebay.com/identity/v1/oauth2/token';

    // Prepare request body
    // Note: eBay requires the RuName (not the actual URL) in the redirect_uri parameter
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: ruName,
    });

    // Make token exchange request
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: body.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('eBay token exchange error:', errorData);
      return NextResponse.redirect(
        new URL('/seller/connections?error=token_exchange_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();

    // Calculate token expiration
    const expiresIn = tokenData.expires_in; // seconds
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Get eBay user information using the access token
    const apiDomain = isSandbox ? 'api.sandbox.ebay.com' : 'api.ebay.com';
    let platformUserId: string | null = null;
    let platformUsername: string | null = null;

    try {
      const userInfoResponse = await fetch(`https://${apiDomain}/commerce/identity/v1/user/`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        platformUserId = userInfo.userId || null;
        platformUsername = userInfo.username || null;
        console.log('eBay user info retrieved:', { userId: platformUserId, username: platformUsername });
      } else {
        console.error('Failed to get eBay user info:', await userInfoResponse.text());
      }
    } catch (userInfoError) {
      console.error('Error fetching eBay user info:', userInfoError);
      // Continue anyway - user info is nice to have but not critical
    }

    // Store in platform_connections table
    const { error: dbError } = await supabase
      .from('platform_connections')
      .upsert({
        user_id: userId,
        platform: 'ebay',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        platform_user_id: platformUserId,
        platform_username: platformUsername,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform',
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(
        new URL('/seller/connections?error=database_error', request.url)
      );
    }

    // Success! Redirect back to connections page
    return NextResponse.redirect(
      new URL('/seller/connections?success=ebay_connected', request.url)
    );
  } catch (error) {
    console.error('eBay callback error:', error);
    return NextResponse.redirect(
      new URL('/seller/connections?error=unknown', request.url)
    );
  }
}
