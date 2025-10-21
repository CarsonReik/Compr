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

    // Get user from cookie session
    const cookieHeader = request.headers.get('cookie') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          cookie: cookieHeader,
        },
      },
    });

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.redirect(
        new URL('/login?error=unauthorized', request.url)
      );
    }

    const userId = session.user.id;

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
      console.error('Token endpoint:', tokenEndpoint);
      console.error('RuName used:', ruName);
      console.error('Response status:', tokenResponse.status);
      return NextResponse.redirect(
        new URL('/seller/connections?error=token_exchange_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();

    // Calculate token expiration
    const expiresIn = tokenData.expires_in; // seconds
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Store in platform_connections table
    const { error: dbError } = await supabase
      .from('platform_connections')
      .upsert({
        user_id: userId,
        platform: 'ebay',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt.toISOString(),
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
